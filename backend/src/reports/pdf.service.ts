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
          select: { studentId: true, date: true, present: true },
        },
      },
    });

    if (!classData) throw new NotFoundException(`Turma ${classId} não encontrada`);

    // Total de dias de aula registrados (todos os registros, presenças ou não)
    const uniqueDates = new Set(
      classData.attendances.map((a: any) => a.date.toISOString().slice(0, 10))
    );
    const allDates = Array.from(uniqueDates).sort();
    const totalAulas = allDates.length;

    // Mapa de presenças por aluno: studentId -> Map<dateStr, boolean>
    const presencaMap = new Map<string, Map<string, boolean>>();
    classData.attendances.forEach((a: any) => {
      const ds = a.date.toISOString().slice(0, 10);
      if (!presencaMap.has(a.studentId)) presencaMap.set(a.studentId, new Map());
      presencaMap.get(a.studentId)!.set(ds, a.present);
    });

    // Lista de alunos com frequência
    const alunos = classData.enrollments.map((e: any, idx: number) => {
      const alunoMap = presencaMap.get(e.studentId) ?? new Map<string, boolean>();
      const presencas = Array.from(alunoMap.values()).filter(Boolean).length;
      const percentual = totalAulas > 0 ? (presencas / totalAulas) : 0;
      const aprovado = percentual >= this.APPROVAL_THRESHOLD;
      return {
        seq: idx + 1,
        nome: e.student.user.name,
        studentId: e.studentId,
        presencas,
        faltas: totalAulas - presencas,
        percentual: (percentual * 100).toFixed(1),
        status: aprovado ? 'Aprovado' : (totalAulas > 0 ? 'Em risco' : 'Aguardando'),
      };
    });

    const professores = classData.teachers
      .map((t: any) => t.teacher.user.name)
      .join(', ');

    const summary = {
      totalAlunos: alunos.length,
      totalAulas,
      aprovados: alunos.filter((a: any) => parseFloat(a.percentual) >= 80).length,
      emRisco: alunos.filter((a: any) => parseFloat(a.percentual) < 80 && totalAulas > 0).length,
    };

    const html = this.buildFrequencyHtml({
      classData,
      alunos,
      professores,
      totalAulas,
      summary,
      allDates,
      presencaMap,
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
    allDates: string[];
    presencaMap: Map<string, Map<string, boolean>>;
  }): string {
    const { classData, alunos, professores, totalAulas, summary, allDates, presencaMap } = data;
    const estado = classData.city?.state || classData.group?.state || 'MA';
    const dataInicio = classData.startDate ? new Date(classData.startDate).toLocaleDateString('pt-BR') : '';
    const dataFim = classData.endDate ? new Date(classData.endDate).toLocaleDateString('pt-BR') : '';
    // Cabeçalho de colunas de datas: exibe dia/mês abreviado
    const colHeaders = allDates.map((d: string) => {
      const [, m, dia] = d.split('-');
      return `${dia}/${m}`;
    });

    const rows = alunos.map((a: any) => {
      const alunoMap = presencaMap.get(a.studentId) ?? new Map<string, boolean>();
      const cells = allDates.map((d: string) => {
        if (!alunoMap.has(d)) return `<td style="background:#fff;border:1px solid #ccc"></td>`;
        const presente = alunoMap.get(d);
        return presente
          ? `<td style="background:#1a3a6a;color:#fff;font-weight:bold;text-align:center;border:1px solid #ccc">P</td>`
          : `<td style="background:#fff;color:#000;text-align:center;border:1px solid #ccc">F</td>`;
      }).join('');
      return `<tr>
        <td style="border:1px solid #ccc;padding:4px 6px;text-align:center">${a.seq}</td>
        <td style="border:1px solid #ccc;padding:4px 8px">${a.nome}</td>
        ${cells}
      </tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Lista de Frequência — ${classData.course.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #000; padding: 15px; }
    .logos { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; }
    .logo-box { width: 80px; height: 45px; border: 1px dashed #aaa; display: flex; align-items: center; justify-content: center; font-size: 7px; color: #aaa; text-align: center; }
    .address { text-align: right; font-size: 8px; color: #555; line-height: 1.4; }
    .header-row { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1a3a6a; padding-bottom: 6px; margin-bottom: 8px; }
    .titulo { font-size: 13px; font-weight: bold; color: #1a3a6a; text-align: center; margin-bottom: 3px; }
    .subtitulo { font-size: 10px; text-align: center; color: #333; margin-bottom: 6px; }
    .faixa { background: #FFD600; padding: 5px 12px; font-weight: bold; font-size: 11px; text-align: center; margin-bottom: 10px; border-radius: 3px; }
    table { width: 100%; border-collapse: collapse; font-size: 9px; }
    thead th { background: #1a3a6a; color: #fff; padding: 4px 5px; border: 1px solid #ccc; text-align: center; }
    thead th.nome-col { text-align: left; }
    .footer { margin-top: 30px; display: flex; justify-content: space-between; }
    .assinatura { text-align: center; }
    .linha-assinatura { border-top: 1px solid #000; width: 200px; margin: 0 auto 3px; padding-top: 3px; font-size: 8px; }
  </style>
</head>
<body>
  <div class="header-row">
    <div class="logos">
      <div class="logo-box">SETRE</div>
      <div class="logo-box">GOV.<br>ESTADO</div>
      <div class="logo-box">UPGRADE</div>
      <div class="logo-box">BRASÃO</div>
    </div>
    <div class="address">
      Qualifica ${estado} — CNPJ: 00.000.000/0001-00<br>
      Av. Principal, 100 — São Luís, MA<br>
      qualifica@upgrade.ma.gov.br
    </div>
  </div>

  <div class="titulo">PROJETO QUALIFICA ${estado}</div>
  <div class="subtitulo">${classData.city?.name || ''} — ${estado}, DE ${dataInicio} À ${dataFim}</div>
  <div class="faixa">${classData.course.name} (${classData.classIdentifier}) ${classData.startTime || ''} às ${classData.endTime || ''}</div>

  <table>
    <thead>
      <tr>
        <th style="width:30px">Nº</th>
        <th class="nome-col" style="min-width:180px">NOME</th>
        ${colHeaders.map((h: string) => `<th style="width:32px">${h}</th>`).join('')}
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    <div class="assinatura">
      <div class="linha-assinatura">${professores || 'Instrutor'}</div>
      <div style="font-size:8px;color:#555">Instrutor(a) Responsável</div>
    </div>
    <div style="font-size:8px;color:#aaa;align-self:flex-end">Total: ${summary.totalAlunos} alunos · ${totalAulas} aulas</div>
  </div>
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
    const estado = classData.city?.state || classData.group?.state || 'MA';
    const hoje = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    const turno = classData.startTime ? `${classData.startTime} às ${classData.endTime || ''}` : '';

    const rowsAprovados = aprovados.map((a: any, i: number) =>
      `<tr>
        <td style="border:1px solid #ccc;padding:5px 6px;text-align:center">${i + 1}</td>
        <td style="border:1px solid #ccc;padding:5px 10px">${a.nome}</td>
        <td style="border:1px solid #ccc;padding:5px 10px;min-width:180px"></td>
      </tr>`
    ).join('');

    const rowsDesistentes = desistentes.map((a: any, i: number) =>
      `<tr>
        <td style="border:1px solid #ccc;padding:5px 6px;text-align:center">${i + 1}</td>
        <td style="border:1px solid #ccc;padding:5px 10px">${a.nome}</td>
      </tr>`
    ).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Lista de Concludentes — ${classData.course.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #000; padding: 15px; }
    .logos { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; }
    .logo-box { width: 80px; height: 45px; border: 1px dashed #aaa; display: flex; align-items: center; justify-content: center; font-size: 7px; color: #aaa; text-align: center; }
    .address { text-align: right; font-size: 8px; color: #555; line-height: 1.4; }
    .header-row { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1a3a6a; padding-bottom: 6px; margin-bottom: 8px; }
    .faixa-cidade { background: #1a3a6a; color: #fff; padding: 6px 12px; font-weight: bold; font-size: 12px; text-align: center; margin-bottom: 4px; }
    .subtitulo { font-size: 10px; text-align: center; color: #333; margin-bottom: 6px; }
    .titulo-lista { font-size: 13px; font-weight: bold; color: #1a3a6a; text-align: center; margin-bottom: 3px; }
    .faixa-curso { background: #FFD600; padding: 5px 12px; font-weight: bold; font-size: 11px; text-align: center; margin-bottom: 10px; border-radius: 3px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 10px; }
    thead th { background: #1a3a6a; color: #fff; padding: 5px 8px; border: 1px solid #ccc; }
    .page-break { page-break-before: always; margin-top: 20px; }
    .footer { margin-top: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .assinatura { text-align: center; }
    .linha-assinatura { border-top: 1px solid #000; width: 220px; margin: 0 auto 3px; padding-top: 3px; font-size: 8px; }
  </style>
</head>
<body>
  <div class="header-row">
    <div class="logos">
      <div class="logo-box">SETRE</div>
      <div class="logo-box">GOV.<br>ESTADO</div>
      <div class="logo-box">UPGRADE</div>
      <div class="logo-box">BRASÃO</div>
    </div>
    <div class="address">
      Qualifica ${estado} — CNPJ: 00.000.000/0001-00<br>
      Av. Principal, 100 — São Luís, MA<br>
      qualifica@upgrade.ma.gov.br
    </div>
  </div>

  <div class="faixa-cidade">${classData.city?.name?.toUpperCase() || ''}</div>
  <div class="subtitulo">QUALIFICA ${estado}</div>
  <div class="titulo-lista">LISTA DE CONCLUDENTES</div>
  <div class="faixa-curso">${classData.course.name} (${turno})</div>

  <table>
    <thead>
      <tr>
        <th style="width:40px">Nº</th>
        <th style="text-align:left">NOME</th>
        <th style="min-width:200px">ASSINATURA</th>
      </tr>
    </thead>
    <tbody>
      ${aprovados.length > 0 ? rowsAprovados : '<tr><td colspan="3" style="padding:10px;text-align:center;color:#999">Nenhum concludente</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <div style="font-size:9px;color:#555">${hoje}</div>
    <div class="assinatura">
      <div class="linha-assinatura">${professores || 'Instrutor'}</div>
      <div style="font-size:8px;color:#555">Instrutor(a) Responsável</div>
    </div>
  </div>

  <!-- DESISTENTES — página separada -->
  <div class="page-break">
    <div class="header-row" style="margin-top:0">
      <div class="logos">
        <div class="logo-box">SETRE</div>
        <div class="logo-box">GOV.<br>ESTADO</div>
        <div class="logo-box">UPGRADE</div>
        <div class="logo-box">BRASÃO</div>
      </div>
      <div class="address">Qualifica ${estado}</div>
    </div>
    <div class="titulo-lista" style="margin-bottom:8px">LISTA DE DESISTENTES</div>
    <div class="faixa-curso">${classData.course.name} (${turno})</div>

    <table>
      <thead>
        <tr>
          <th style="width:40px">Nº</th>
          <th style="text-align:left">NOME</th>
        </tr>
      </thead>
      <tbody>
        ${desistentes.length > 0 ? rowsDesistentes : '<tr><td colspan="2" style="padding:10px;text-align:center;color:#999">Nenhum desistente</td></tr>'}
      </tbody>
    </table>

    <div class="footer">
      <div style="font-size:9px;color:#555">${hoje}</div>
      <div class="assinatura">
        <div class="linha-assinatura">${professores || 'Instrutor'}</div>
        <div style="font-size:8px;color:#555">Instrutor(a) Responsável</div>
      </div>
    </div>
  </div>
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
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
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

  // EXEC-05: Retorna IDs das turmas mais recentes para endpoints /all
  async getAllClassIds(): Promise<string[]> {
    const classes = await this.prisma.class.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true },
    });
    return classes.map(c => c.id);
  }
}
