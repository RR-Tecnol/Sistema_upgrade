import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import puppeteer from 'puppeteer'; // REQ-11/12: geração real de PDF

/**
 * PdfService — REQ-11 e REQ-12
 *
 * MODELO PROVISÓRIO — quando Robert enviar o template visual oficial,
 * substituir apenas a função `buildFrequencyHtml()` e `buildConcludentsHtml()`
 * mantendo toda a lógica de dados intacta.
 *
 * REQ-11 (00:25:29 — 00:27:40):
 * "Dia 20 a gente precisa do PDF de frequência com logo... o professor consegue
 * gerar esse PDF pela interface dele."
 *
 * REQ-12 (00:40:59 — 00:42:00):
 * "Na 3ª semana o professor emite a lista de concludentes — aprovados (≥80%)
 * e desistentes (<80%) — a secretaria exige antes do final do curso."
 *
 * REQ-02: Critério de aprovação = frequência ≥ 80% das aulas realizadas.
 * 02_LIVRO_DE_REGRAS.md §5.3: na 3ª semana, critério = ≥75% das aulas até o momento.
 *
 * Geração: HTML → Puppeteer (Chromium headless) → PDF em memória → MinIO → Presigned URL
 * O NestJS não serve o arquivo — apenas a URL assinada (sem consumo de banda).
 */
@Injectable()
export class PdfService {
  constructor(private prisma: PrismaService) {}

  private readonly APPROVAL_THRESHOLD = 0.8;    // 80% para aprovação final (REQ-02)
  private readonly WEEK3_THRESHOLD = 0.75;       // 75% para lista da 3ª semana (LIVRO_REGRAS §5.3)
  private readonly LOGO_URL = '/assets/logo-upgrade.png'; // Substituir pela URL real do MinIO

  // ============================================================
  // REQ-11: LISTA DE FREQUÊNCIA — Modelo Governamental
  // ============================================================

  /**
   * Gera o PDF de lista de frequência para uma turma.
   * Retorna o HTML que será convertido para PDF via Puppeteer quando instalado.
   * Por enquanto retorna o HTML para validação visual.
   */
  async generateFrequencyReport(classId: string): Promise<{
    html: string;
    classInfo: any;
    summary: any;
  }> {
    const classData = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        course: { select: { name: true, workloadHours: true } },
        city: { select: { name: true, state: true } },
        group: { select: { name: true, state: true } },
        teachers: {
          include: { teacher: { include: { user: { select: { name: true } } } } },
        },
        enrollments: {
          where: { status: 'APPROVED' },
          include: {
            student: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
          orderBy: { student: { user: { name: 'asc' } } },
        },
        attendances: {
          where: { present: true },
          select: { studentId: true, date: true },
        },
      },
    });

    if (!classData) throw new NotFoundException(`Turma ${classId} não encontrada`);

    // Total de dias de aula registrados
    const uniqueDates = new Set(
      classData.attendances.map(a => a.date.toISOString().slice(0, 10))
    );
    const totalAulas = uniqueDates.size;

    // Mapa de presenças por aluno
    const presencasPorAluno = new Map<string, number>();
    classData.attendances.forEach(a => {
      presencasPorAluno.set(a.studentId, (presencasPorAluno.get(a.studentId) ?? 0) + 1);
    });

    // Lista de alunos com frequência
    const alunos = classData.enrollments.map((e, idx) => {
      const presencas = presencasPorAluno.get(e.studentId) ?? 0;
      const percentual = totalAulas > 0 ? (presencas / totalAulas) : 0;
      const aprovado = percentual >= this.APPROVAL_THRESHOLD;
      return {
        seq: idx + 1,
        nome: e.student.user.name,
        presencas,
        faltas: totalAulas - presencas,
        percentual: (percentual * 100).toFixed(1),
        status: aprovado ? 'Aprovado' : (totalAulas > 0 ? 'Em risco' : 'Aguardando'),
      };
    });

    const professores = classData.teachers
      .map(t => t.teacher.user.name)
      .join(', ');

    const summary = {
      totalAlunos: alunos.length,
      totalAulas,
      aprovados: alunos.filter(a => parseFloat(a.percentual) >= 80).length,
      emRisco: alunos.filter(a => parseFloat(a.percentual) < 80 && totalAulas > 0).length,
    };

    const html = this.buildFrequencyHtml({
      classData,
      alunos,
      professores,
      totalAulas,
      summary,
    });

    return { html, classInfo: classData, summary };
  }

  // ============================================================
  // REQ-12: LISTA DE CONCLUDENTES — 3ª Semana
  // ============================================================

  /**
   * Gera a lista de concludentes da 3ª semana.
   * Separa claramente: APROVADOS (≥75% das aulas até o momento) e DESISTENTES (<75%)
   * A secretaria exige este documento antes do final do curso.
   */
  async generateConcludentsList(classId: string): Promise<{
    html: string;
    classInfo: any;
    summary: any;
  }> {
    const classData = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        course: { select: { name: true, workloadHours: true } },
        city: { select: { name: true, state: true } },
        group: { select: { name: true } },
        teachers: {
          include: { teacher: { include: { user: { select: { name: true } } } } },
        },
        enrollments: {
          where: { status: 'APPROVED' },
          include: {
            student: { include: { user: { select: { name: true } } } },
          },
          orderBy: { student: { user: { name: 'asc' } } },
        },
        attendances: {
          where: { present: true },
          select: { studentId: true, date: true },
        },
      },
    });

    if (!classData) throw new NotFoundException(`Turma ${classId} não encontrada`);

    const uniqueDates = new Set(
      classData.attendances.map(a => a.date.toISOString().slice(0, 10))
    );
    const totalAulaAteAgora = uniqueDates.size;

    const presencasPorAluno = new Map<string, number>();
    classData.attendances.forEach(a => {
      presencasPorAluno.set(a.studentId, (presencasPorAluno.get(a.studentId) ?? 0) + 1);
    });

    const alunos = classData.enrollments.map((e, idx) => {
      const presencas = presencasPorAluno.get(e.studentId) ?? 0;
      const percentual = totalAulaAteAgora > 0 ? presencas / totalAulaAteAgora : 0;
      const aprovado = percentual >= this.WEEK3_THRESHOLD; // 75% na 3ª semana
      return {
        seq: idx + 1,
        nome: e.student.user.name,
        presencas,
        faltas: totalAulaAteAgora - presencas,
        percentual: (percentual * 100).toFixed(1),
        aprovado,
      };
    });

    const aprovados = alunos.filter(a => a.aprovado);
    const desistentes = alunos.filter(a => !a.aprovado);

    const summary = {
      totalAlunos: alunos.length,
      totalAulaAteAgora,
      aprovados: aprovados.length,
      desistentes: desistentes.length,
      taxaConclusao: ((aprovados.length / alunos.length) * 100).toFixed(1),
    };

    const professores = classData.teachers
      .map(t => t.teacher.user.name)
      .join(', ');

    const html = this.buildConcludentsHtml({
      classData,
      aprovados,
      desistentes,
      professores,
      totalAulaAteAgora,
      summary,
    });

    return { html, classInfo: classData, summary };
  }

  // ============================================================
  // TEMPLATES HTML — MODELO PROVISÓRIO
  // Substituir buildFrequencyHtml e buildConcludentsHtml pelo
  // template oficial quando Robert enviar o modelo.
  // ============================================================

  private buildFrequencyHtml(data: {
    classData: any;
    alunos: any[];
    professores: string;
    totalAulas: number;
    summary: any;
  }): string {
    const { classData, alunos, professores, totalAulas, summary } = data;
    const hoje = new Date().toLocaleDateString('pt-BR');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Lista de Frequência — ${classData.course.name}</title>
  <style>
    /* ─── MODELO PROVISÓRIO — aguarda template oficial do Robert ─── */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #000; }
    .header { display: flex; align-items: center; border-bottom: 2px solid #1a3a6a; padding-bottom: 10px; margin-bottom: 15px; }
    .logo-area { width: 120px; height: 60px; border: 1px dashed #999; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #999; margin-right: 20px; }
    .header-info h1 { font-size: 14px; color: #1a3a6a; }
    .header-info p { font-size: 10px; color: #555; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 15px; background: #f0f4fa; padding: 10px; border-radius: 4px; }
    .info-item span { font-weight: bold; }
    .summary-bar { display: flex; gap: 20px; background: #1a3a6a; color: #fff; padding: 8px 12px; border-radius: 4px; margin-bottom: 12px; font-size: 10px; }
    .summary-bar div { text-align: center; }
    .summary-bar strong { display: block; font-size: 16px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #1a3a6a; color: #fff; }
    thead th { padding: 6px 8px; text-align: left; font-size: 10px; }
    tbody tr:nth-child(even) { background: #f5f7fb; }
    tbody td { padding: 5px 8px; border-bottom: 1px solid #e0e6f0; }
    .status-ok { color: #1a7a1a; font-weight: bold; }
    .status-risk { color: #b22222; font-weight: bold; }
    .footer { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 15px; display: flex; justify-content: space-between; }
    .signature-line { width: 200px; border-top: 1px solid #000; text-align: center; padding-top: 4px; font-size: 9px; }
    .watermark { font-size: 8px; color: #aaa; text-align: center; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-area">LOGO PROVISÓRIO<br>[Substituir]</div>
    <div class="header-info">
      <h1>LISTA DE FREQUÊNCIA</h1>
      <p>Programa de Qualificação Profissional — Sistema Upgrade</p>
      <p>Gerado em: ${hoje}</p>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-item"><span>Curso:</span> ${classData.course.name}</div>
    <div class="info-item"><span>Turma:</span> ${classData.classIdentifier}</div>
    <div class="info-item"><span>Cidade:</span> ${classData.city.name} — ${classData.city.state}</div>
    <div class="info-item"><span>Grupo:</span> ${classData.group.name}</div>
    <div class="info-item"><span>Período:</span> ${new Date(classData.startDate).toLocaleDateString('pt-BR')} a ${new Date(classData.endDate).toLocaleDateString('pt-BR')}</div>
    <div class="info-item"><span>Professor(es):</span> ${professores || 'Não definido'}</div>
    <div class="info-item"><span>Carga Horária:</span> ${classData.course.workloadHours}h</div>
    <div class="info-item"><span>Aulas Realizadas:</span> ${totalAulas}</div>
  </div>

  <div class="summary-bar">
    <div><strong>${summary.totalAlunos}</strong>Alunos Inscritos</div>
    <div><strong>${summary.totalAulas}</strong>Aulas Realizadas</div>
    <div><strong>${summary.aprovados}</strong>Com Aprovação ≥80%</div>
    <div><strong>${summary.emRisco}</strong>Em Risco <80%</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Nome do Aluno</th>
        <th>Presenças</th>
        <th>Faltas</th>
        <th>Frequência</th>
        <th>Situação</th>
      </tr>
    </thead>
    <tbody>
      ${alunos.map(a => `
      <tr>
        <td>${a.seq}</td>
        <td>${a.nome}</td>
        <td style="text-align:center">${a.presencas}</td>
        <td style="text-align:center">${a.faltas}</td>
        <td style="text-align:center">${a.percentual}%</td>
        <td class="${parseFloat(a.percentual) >= 80 ? 'status-ok' : 'status-risk'}">${a.status}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="footer">
    <div class="signature-line">Professor(es)</div>
    <div class="signature-line">Coordenador de Campo</div>
    <div class="signature-line">Secretaria</div>
  </div>
  <p class="watermark">⚠️ MODELO PROVISÓRIO — aguarda template oficial — Sistema Upgrade v2.0</p>
</body>
</html>`;
  }

  private buildConcludentsHtml(data: {
    classData: any;
    aprovados: any[];
    desistentes: any[];
    professores: string;
    totalAulaAteAgora: number;
    summary: any;
  }): string {
    const { classData, aprovados, desistentes, professores, totalAulaAteAgora, summary } = data;
    const hoje = new Date().toLocaleDateString('pt-BR');

    const renderRows = (lista: any[], offset = 0) =>
      lista.map((a, i) => `
      <tr>
        <td>${offset + i + 1}</td>
        <td>${a.nome}</td>
        <td style="text-align:center">${a.presencas}</td>
        <td style="text-align:center">${a.faltas}</td>
        <td style="text-align:center">${a.percentual}%</td>
      </tr>`).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Lista de Concludentes — ${classData.course.name}</title>
  <style>
    /* ─── MODELO PROVISÓRIO — aguarda template oficial do Robert ─── */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #000; }
    .header { display: flex; align-items: center; border-bottom: 2px solid #1a3a6a; padding-bottom: 10px; margin-bottom: 15px; }
    .logo-area { width: 120px; height: 60px; border: 1px dashed #999; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #999; margin-right: 20px; }
    .header-info h1 { font-size: 14px; color: #1a3a6a; }
    .section-title { font-size: 12px; font-weight: bold; padding: 8px 12px; margin: 15px 0 8px; border-radius: 4px; }
    .section-aprovados { background: #d4edda; color: #155724; }
    .section-desistentes { background: #f8d7da; color: #721c24; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 15px; background: #f0f4fa; padding: 10px; border-radius: 4px; }
    .info-item span { font-weight: bold; }
    .summary-bar { display: flex; gap: 20px; background: #1a3a6a; color: #fff; padding: 8px 12px; border-radius: 4px; margin-bottom: 12px; font-size: 10px; }
    .summary-bar div { text-align: center; }
    .summary-bar strong { display: block; font-size: 16px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    thead tr { background: #1a3a6a; color: #fff; }
    thead th { padding: 6px 8px; text-align: left; font-size: 10px; }
    tbody tr:nth-child(even) { background: #f5f7fb; }
    tbody td { padding: 5px 8px; border-bottom: 1px solid #e0e6f0; }
    .footer { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 15px; display: flex; justify-content: space-between; }
    .signature-line { width: 200px; border-top: 1px solid #000; text-align: center; padding-top: 4px; font-size: 9px; }
    .watermark { font-size: 8px; color: #aaa; text-align: center; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-area">LOGO PROVISÓRIO<br>[Substituir]</div>
    <div class="header-info">
      <h1>LISTA DE CONCLUDENTES — 3ª SEMANA</h1>
      <p>Programa de Qualificação Profissional — Sistema Upgrade</p>
      <p>Gerado em: ${hoje} | Critério ≥75% de presença até o momento</p>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-item"><span>Curso:</span> ${classData.course.name}</div>
    <div class="info-item"><span>Turma:</span> ${classData.classIdentifier}</div>
    <div class="info-item"><span>Cidade:</span> ${classData.city.name} — ${classData.city.state}</div>
    <div class="info-item"><span>Grupo:</span> ${classData.group.name}</div>
    <div class="info-item"><span>Início:</span> ${new Date(classData.startDate).toLocaleDateString('pt-BR')}</div>
    <div class="info-item"><span>Professor(es):</span> ${professores || 'Não definido'}</div>
    <div class="info-item"><span>Aulas Realizadas até agora:</span> ${totalAulaAteAgora}</div>
    <div class="info-item"><span>Taxa de Conclusão:</span> ${summary.taxaConclusao}%</div>
  </div>

  <div class="summary-bar">
    <div><strong>${summary.totalAlunos}</strong>Total de Alunos</div>
    <div><strong>${summary.aprovados}</strong>Concludentes (≥75%)</div>
    <div><strong>${summary.desistentes}</strong>Desistentes (<75%)</div>
    <div><strong>${summary.taxaConclusao}%</strong>Taxa de Conclusão</div>
  </div>

  <!-- APROVADOS -->
  <div class="section-title section-aprovados">
    ✅ CONCLUDENTES — ${summary.aprovados} alunos com frequência ≥ 75%
  </div>
  <table>
    <thead>
      <tr><th>#</th><th>Nome do Aluno</th><th>Presenças</th><th>Faltas</th><th>Frequência</th></tr>
    </thead>
    <tbody>${aprovados.length > 0 ? renderRows(aprovados) : '<tr><td colspan="5" style="text-align:center;padding:10px;color:#999">Nenhum aluno concludente até o momento</td></tr>'}</tbody>
  </table>

  <!-- DESISTENTES -->
  <div class="section-title section-desistentes">
    ❌ DESISTENTES / EM RISCO — ${summary.desistentes} alunos com frequência < 75%
  </div>
  <table>
    <thead>
      <tr><th>#</th><th>Nome do Aluno</th><th>Presenças</th><th>Faltas</th><th>Frequência</th></tr>
    </thead>
    <tbody>${desistentes.length > 0 ? renderRows(desistentes, aprovados.length) : '<tr><td colspan="5" style="text-align:center;padding:10px;color:#999">Nenhum desistente registrado</td></tr>'}</tbody>
  </table>

  <div class="footer">
    <div class="signature-line">Professor(es)</div>
    <div class="signature-line">Coordenador de Campo</div>
    <div class="signature-line">Secretaria</div>
  </div>
  <p class="watermark">⚠️ MODELO PROVISÓRIO — aguarda template oficial — Sistema Upgrade v2.0</p>
</body>
</html>`;
  }

  // ============================================================
  // UTILITÁRIO: HTML → PDF real via Puppeteer (REQ-11 e REQ-12)
  // ============================================================

  /**
   * Converte HTML em Buffer PDF usando Chromium headless.
   * O controller chama este método e serve o buffer com Content-Type: application/pdf.
   *
   * Quando Robert enviar o template visual oficial:
   *   1. Substitua buildFrequencyHtml() e buildConcludentsHtml()
   *   2. htmlToPdf() não precisa mudar — a lógica de dados fica intacta.
   */
  async htmlToPdf(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
