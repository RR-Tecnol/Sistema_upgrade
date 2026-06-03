import { createHmac } from 'node:crypto';
import { BadRequestException, forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CertificateTemplateService } from '../certificates/certificate-template.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeesService } from '../employees/employees.service';
import puppeteer from 'puppeteer'; // REQ-11/12: geração real de PDF
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import { CertificateTemplateType, type CertificateTemplateVersion } from '@prisma/client';
import { getPrimaryFrontendUrl } from '../common/cors-origins';
import {
  type CertificateCoordinateOverrides,
  mergeCertificateCoordinateOverrides,
  parseCertificateCoordinateOverridesFromDb,
} from '../certificates/certificate-coordinate-overrides.schema';
import { CertificatePdfCacheService } from './certificate-pdf-cache.service';
import { CertificatePdfSigningService, type PadesInstitutionContext } from './certificate-pdf-signing.service';
import { CertificateMetricsService } from './certificate-metrics.service';
import { PuppeteerCertificateGate, getPuppeteerMaxConcurrentFromEnv } from './puppeteer-certificate.gate';
import { MIN_CERTIFICATE_ATTENDANCE_PCT } from '../common/certificate-attendance.util';
import { evaluateCertificateEligibilityMapForClass } from '../common/certificate-enrollment-evaluation.helper';

export type { CertificateCoordinateOverrides } from '../certificates/certificate-coordinate-overrides.schema';

const MM_TO_PT = 72 / 25.4;
/** Viewport CSS ≈ A4 em paisagem a 96px/in — usado com deviceScaleFactor para raster (fotos, sombras, QR no HTML) mais nítido no PDF. */
const CERTIFICATE_A4_LANDSCAPE_VIEWPORT = {
  width: Math.round((297 / 25.4) * 96),
  height: Math.round((210 / 25.4) * 96),
} as const;
type CertificateSigningMode = 'AUTO' | 'IMAGE' | 'PADES' | 'BOTH' | 'NONE';

/** Textos do parágrafo desenhado sobre o PDF base (ajustáveis por versão de modelo) */
type PdfTextOverrides = {
  courseName?: string;
  paragraphTemplate?: string;
  line1Prefix?: string;
  line1Suffix?: string;
  line2?: string;
  line3?: string;
  /** Template para a data (ex: {{CIDADE}} - {{UF}}, {{DATA_EXTENSO}}) */
  dateTemplate?: string;
  /** Se true, desenha retângulo branco no corpo (legado: cobria texto antigo do PDF — desfigurava o fundo do modelo) */
  useBodyWhiteMask?: boolean;
  /** Máscara branca no título do verso (pág. 2) */
  usePage2TitleWhiteMask?: boolean;
  /** Nome central e linha de detalhes no topo (pode conflitar com o arte do .pdf) */
  drawHeaderNameAndDetails?: boolean;
  /** Modo de assinatura final: imagem no arte, PAdES digital, ambos ou nenhum. */
  signatureMode?: 'AUTO' | 'IMAGE' | 'PADES' | 'BOTH' | 'NONE';
  /** Caminho local (absoluto/relativo) da assinatura manuscrita (PNG/JPG). */
  signatureImagePath?: string;
  /** Desenhar o texto de carga horária na página 2 (ex: {{CARGA_HORARIA}}H CARGA HORÁRIA) */
  page2WorkloadTemplate?: string;
  syllabusTitleContent?: string;
  syllabusWorkloadContent?: string;
  syllabusDescContent?: string;
  /** Se false, omite o QR da Pág. 1 (padrão: true). */
  qrPage1?: boolean;
  /** Se true, desenha o QR também na Pág. 2 (padrão: false). */
  qrPage2?: boolean;
};

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
 * Lista de concludentes — alinhada ao motor de certificado (presença efectiva,
 * calendário letivo, penalidades de imprevisto; ver `MIN_CERTIFICATE_ATTENDANCE_PCT`).
 *
 * REQ-02: Critério de aprovação em relatório de frequência = frequência ≥ 80% (PDF frequência).
 * Certificação: ver `certificate-enrollment-evaluation.helper.ts` e LIVRO_DE_REGRAS §5.3.
 *
 * Geração: HTML → Puppeteer (Chromium headless) → PDF em memória → MinIO → Presigned URL
 * O NestJS não serve o arquivo — apenas a URL assinada (sem consumo de banda).
 */
@Injectable()
export class PdfService {
  private readonly log = new Logger(PdfService.name);
  private readonly puppeteerCertificateGate: PuppeteerCertificateGate;

  constructor(
    private prisma: PrismaService,
    private readonly employeesService: EmployeesService,
    @Inject(forwardRef(() => CertificateTemplateService))
    private readonly templateService: CertificateTemplateService,
    private readonly certificatePdfCache: CertificatePdfCacheService,
    private readonly certificateMetrics: CertificateMetricsService,
    private readonly certificatePdfSigning: CertificatePdfSigningService,
  ) {
    this.puppeteerCertificateGate = new PuppeteerCertificateGate(
      getPuppeteerMaxConcurrentFromEnv(),
      () => this.certificateMetrics.recordPuppeteerGateBlock(),
    );
  }

  private readonly DEFAULT_BRAND_ACCENT = '#FFD600';
  private readonly execFileAsync = promisify(execFile);

  /**
   * Marca white-label a partir de `course.institution`, com fallbacks `CERT_*` e `.env` legado.
   */
  private resolveCertificateBranding(
    inst:
      | {
        id: string;
        slug: string;
        name: string;
        shortName: string | null;
        logoUrl: string | null;
        siteUrl: string | null;
        primaryColor: string | null;
        signPfxPath: string | null;
      }
      | null
      | undefined,
  ) {
    const name =
      inst?.name?.trim() ||
      process.env.CERT_PUBLIC_INSTITUTION_NAME?.trim() ||
      'Upgrade Tecnologia Educacional';
    const displayName = inst?.shortName?.trim() || inst?.name?.trim() || name;
    const logoUrl = inst?.logoUrl?.trim() || process.env.CERT_BRAND_LOGO_URL?.trim() || this.LOGO_URL;
    const primaryColor =
      inst?.primaryColor?.trim() || process.env.CERT_BRAND_PRIMARY_COLOR?.trim() || '#1a3a6a';
    const accentColor = process.env.CERT_BRAND_ACCENT_COLOR?.trim() || this.DEFAULT_BRAND_ACCENT;
    const siteUrl = inst?.siteUrl?.trim() || process.env.CERT_BRAND_SITE_URL?.trim() || 'https://cursos.upgrade';
    return {
      institutionId: inst?.id ?? 'env-fallback',
      slug: inst?.slug ?? 'upgrade',
      name,
      displayName,
      logoUrl,
      primaryColor,
      accentColor,
      siteUrl,
      signPfxPath: inst?.signPfxPath && inst.signPfxPath.trim() ? inst.signPfxPath.trim() : null,
    };
  }

  private padesContextFromBranding(
    b: ReturnType<typeof this.resolveCertificateBranding>,
  ): PadesInstitutionContext {
    return {
      slug: b.slug,
      signPfxPath: b.signPfxPath,
      displayName: b.name,
      siteUrl: b.siteUrl,
    };
  }

  private buildBrandingTemplateVars(b: ReturnType<typeof this.resolveCertificateBranding>): Record<string, string> {
    return {
      INSTITUICAO_NOME: b.displayName,
      INSTITUICAO_NOME_COMPLETO: b.name,
      INSTITUICAO_LOGO: b.logoUrl,
      COR_PRIMARIA: b.primaryColor,
      COR_DESTAQUE: b.accentColor,
      SITE_URL: b.siteUrl,
    };
  }

  private readonly DEFAULT_TEMPLATE_FILE = 'CERTIFICADO BARMAN - MA_20260410_050715_0000.pdf';

  private readonly APPROVAL_THRESHOLD = 0.8; // 80% para aprovação final (REQ-02)
  private readonly LOGO_URL = '/assets/logo-upgrade.png'; // fallback se instituição sem logoUrl (ou CERT_BRAND_LOGO_URL)

  /**
   * pdf-lib StandardFonts (Helvetica) só aceitam WinAnsi; símbolos como ≥ ou emoji fazem drawText lançar → 500 no API se o fallback falhar.
   */
  private pdfLibSafeText(text: string): string {
    return String(text ?? '')
      .replace(/\u2265/g, '>=')
      .replace(/\u2264/g, '<=')
      .replace(/[\u{10000}-\u{10FFFF}]/gu, '');
  }

  /** CPF apenas dígitos → máscara pt-BR (relatórios). */
  private formatCpfForReport(cpf: string | null | undefined): string {
    const d = String(cpf ?? '').replace(/\D/g, '');
    if (d.length !== 11) return d || '—';
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }

  private escapeHtmlAttr(text: string): string {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  // ============================================================
  // REQ-11: LISTA DE FREQUÊNCIA — Modelo Governamental
  // ============================================================

  /**
   * Core de dados REQ-11 (HTML, PDF fallback, endpoint /data).
   */
  private async loadFrequencyReportData(classId: string, startRaw?: string, endRaw?: string): Promise<{
    classData: any;
    alunos: Array<{
      seq: number;
      nome: string;
      studentId: string;
      cpf: string;
      presencas: number;
      faltas: number;
      percentual: string;
      status: string;
    }>;
    allDates: string[];
    totalAulas: number;
    presencaMap: Map<string, Map<string, boolean>>;
    professores: string;
    summary: { totalAlunos: number; totalAulas: number; aprovados: number; emRisco: number };
  }> {
    const hasCustomPeriod = Boolean(startRaw || endRaw);
    const period = this.normalizePeriodRange(startRaw, endRaw);
    const [sy, sm, sd] = period.start.split('-').map(Number);
    const [ey, em, ed] = period.end.split('-').map(Number);
    const start = new Date(Date.UTC(sy, sm - 1, sd));
    const end = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999));

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
          // Mantém o mesmo critério de elegibilidade visível na aba de frequência.
          where: { status: { in: ['ENROLLED', 'APPROVED', 'PENDING', 'DOCUMENT_PENDING'] } },
          include: {
            student: {
              select: {
                cpf: true,
                user: { select: { name: true } },
              },
            },
          },
          orderBy: { student: { user: { name: 'asc' } } },
        },
        attendances: {
          ...(hasCustomPeriod ? { where: { date: { gte: start, lte: end } } } : {}),
          select: { studentId: true, date: true, present: true },
        },
      },
    });

    if (!classData) throw new NotFoundException(`Turma ${classId} não encontrada`);

    const uniqueDates = new Set(
      classData.attendances.map((a: { date: Date }) => a.date.toISOString().slice(0, 10)),
    );
    const allDates = Array.from(uniqueDates).sort();
    const totalAulas = allDates.length;

    const presencaMap = new Map<string, Map<string, boolean>>();
    classData.attendances.forEach((a: { studentId: string; date: Date; present: boolean }) => {
      const ds = a.date.toISOString().slice(0, 10);
      if (!presencaMap.has(a.studentId)) presencaMap.set(a.studentId, new Map());
      presencaMap.get(a.studentId)!.set(ds, a.present);
    });

    const alunos = classData.enrollments.map((e: { studentId: string; student?: { cpf?: string; user?: { name?: string | null } | null } | null }, idx: number) => {
      const alunoMap = presencaMap.get(e.studentId) ?? new Map<string, boolean>();
      const presencas = Array.from(alunoMap.values()).filter(Boolean).length;
      const pct = totalAulas > 0 ? presencas / totalAulas : 0;
      const aprovado = pct >= this.APPROVAL_THRESHOLD;
      return {
        seq: idx + 1,
        nome: e.student?.user?.name?.trim() || '—',
        studentId: e.studentId,
        cpf: (e.student?.cpf ?? '').replace(/\D/g, '') || '—',
        presencas,
        faltas: totalAulas - presencas,
        percentual: (pct * 100).toFixed(1),
        status: aprovado ? 'Aprovado' : totalAulas > 0 ? 'Em risco' : 'Aguardando',
      };
    });

    const professores = classData.teachers
      .map((t: { teacher?: { user?: { name?: string | null } | null } }) => t.teacher?.user?.name)
      .filter((n: unknown): n is string => typeof n === 'string' && Boolean(n.trim()))
      .join(', ');

    const summary = {
      totalAlunos: alunos.length,
      totalAulas,
      aprovados: alunos.filter((a: { percentual: string }) => parseFloat(a.percentual) >= 80).length,
      emRisco: alunos.filter(
        (a: { percentual: string }) => parseFloat(a.percentual) < 80 && totalAulas > 0,
      ).length,
    };

    return { classData, alunos, allDates, totalAulas, presencaMap, professores, summary };
  }

  /**
   * Gera o PDF de lista de frequência para uma turma (Puppeteer; pdf-lib como fallback).
   */
  async generateFrequencyPdfBuffer(classId: string, startRaw?: string, endRaw?: string): Promise<{
    buffer: Buffer;
    summary: Record<string, number>;
    engine: 'puppeteer' | 'pdf-lib';
  }> {
    const data = await this.loadFrequencyReportData(classId, startRaw, endRaw);
    const html = this.buildFrequencyHtml({
      classData: data.classData,
      alunos: data.alunos,
      professores: data.professores,
      totalAulas: data.totalAulas,
      summary: data.summary,
      allDates: data.allDates,
      presencaMap: data.presencaMap,
    });
    try {
      const pdf = await this.htmlToPdf(html);
      return { buffer: Buffer.from(pdf), summary: data.summary as any, engine: 'puppeteer' };
    } catch (err) {
      this.log.warn(
        `PDF frequência via Puppeteer falhou (${(err as Error)?.message}); a usar pdf-lib.`,
      );
      const buf = await this.buildFrequencyPdfLibFallback(data);
      return { buffer: buf, summary: data.summary as any, engine: 'pdf-lib' };
    }
  }

  /**
   * Payload JSON expandido (dashboard Excel / BI no frontend).
   */
  async getFrequencyDashboardPayload(classId: string, startRaw?: string, endRaw?: string) {
    const period = this.normalizePeriodRange(startRaw, endRaw);
    const d = await this.loadFrequencyReportData(classId, period.start, period.end);
    const pctValues = d.alunos.map((a) => parseFloat(a.percentual));
    const mediaPct =
      pctValues.length > 0 ? pctValues.reduce((s, x) => s + x, 0) / pctValues.length : 0;
    const acima75 = d.alunos.filter((a) => parseFloat(a.percentual) >= 75).length;
    const abaixo75 = d.alunos.filter((a) => parseFloat(a.percentual) < 75 && d.totalAulas > 0).length;
    const studentsWithMarks = d.alunos.filter((a) => a.presencas + a.faltas > 0).length;
    const coveragePct = d.alunos.length ? (studentsWithMarks / d.alunos.length) * 100 : 0;
    return {
      classInfo: d.classData,
      summary: {
        ...d.summary,
        mediaPercentualTurma: Number(mediaPct.toFixed(2)),
        alunosAcimaOuIgual75Pct: acima75,
        alunosAbaixo75Pct: abaixo75,
        metaCertificacaoPct: 80,
        alunosComLancamentoNoPeriodo: studentsWithMarks,
        coberturaLancamentoAlunosPct: Number(coveragePct.toFixed(2)),
      },
      audit: {
        source: 'reports.frequency',
        periodStart: period.start,
        periodEnd: period.end,
        totalDiasComLancamento: d.totalAulas,
        totalAlunosElegiveis: d.alunos.length,
      },
      period,
      lessonDates: d.allDates,
      students: d.alunos.map((a) => ({
        ordem: a.seq,
        studentId: a.studentId,
        cpf: a.cpf,
        nome: a.nome,
        presencas: a.presencas,
        faltas: a.faltas,
        percentual: parseFloat(a.percentual),
        statusLinha: a.status,
      })),
      matrix: {
        dates: d.allDates,
        /** presença por aluno[data] — true/false; omitido se dia sem registo para o aluno */
        byStudent: Object.fromEntries(
          d.alunos.map((a) => {
            const m = d.presencaMap.get(a.studentId) ?? new Map<string, boolean>();
            return [a.studentId, Object.fromEntries(m.entries())] as const;
          }),
        ),
      },
    };
  }

  /**
   * Gera o PDF de lista de frequência para uma turma (HTML cru — testes ou pré-visualização).
   */
  async generateFrequencyReport(classId: string, startRaw?: string, endRaw?: string): Promise<{
    html: string;
    classInfo: any;
    summary: any;
  }> {
    const data = await this.loadFrequencyReportData(classId, startRaw, endRaw);
    const html = this.buildFrequencyHtml({
      classData: data.classData,
      alunos: data.alunos,
      professores: data.professores,
      totalAulas: data.totalAulas,
      summary: data.summary,
      allDates: data.allDates,
      presencaMap: data.presencaMap,
    });
    return { html, classInfo: data.classData, summary: data.summary };
  }

  // ============================================================
  // REQ-12: LISTA DE CONCLUDENTES — 3ª Semana
  // ============================================================

  /**
   * Dados para lista de concludentes — alinhados ao motor de certificado
   * (`MIN_CERTIFICATE_ATTENDANCE_PCT`, presença efectiva, calendário letivo, penalidades de imprevisto).
   */
  private async loadConcludentsReportData(classId: string): Promise<{
    classData: any;
    aprovados: Array<{
      seq: number;
      studentId: string;
      nome: string;
      cpf: string;
      presencas: number;
      faltas: number;
      percentual: string;
      percentualAntesPenalidades: string;
      penaltyPct: string;
      diasLancados: number;
      hasCertificate: boolean;
    }>;
    desistentes: Array<{
      seq: number;
      studentId: string;
      nome: string;
      cpf: string;
      presencas: number;
      faltas: number;
      percentual: string;
      percentualAntesPenalidades: string;
      penaltyPct: string;
      diasLancados: number;
      hasCertificate: boolean;
      motivoResumo: string;
    }>;
    professores: string;
    totalAulaAteAgora: number;
    summary: {
      totalAlunos: number;
      totalAulaAteAgora: number;
      aprovados: number;
      desistentes: number;
      taxaConclusao: string;
      certificadosAtivosNaTurma: number;
      alunosSemLancamentoFrequencia: number;
      bloqueadosComPctAcimaDoMinimo: number;
      mediaPctEfectivaAposPenalidades: string;
    };
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
          where: { status: { in: ['ENROLLED', 'APPROVED'] } },
          include: {
            student: { select: { cpf: true, user: { select: { name: true } } } },
          },
          orderBy: { student: { user: { name: 'asc' } } },
        },
        attendances: {
          select: { studentId: true, date: true, present: true },
        },
        certificates: {
          where: { status: 'ACTIVE' },
          select: { studentId: true },
        },
      },
    });

    if (!classData) throw new NotFoundException(`Turma ${classId} não encontrada`);

    const uniqueDates = new Set(classData.attendances.map((a: { date: Date }) => a.date.toISOString().slice(0, 10)));
    const totalAulaAteAgora = uniqueDates.size;

    const studentIds = classData.enrollments.map((e: { studentId: string }) => e.studentId);
    const eligMap = await evaluateCertificateEligibilityMapForClass(this.prisma, classId, studentIds);
    const certSet = new Set(
      (classData.certificates as { studentId: string }[]).map((c) => c.studentId),
    );

    type Row = {
      studentId: string;
      nome: string;
      cpf: string;
      presencas: number;
      faltas: number;
      percentual: string;
      percentualAntesPenalidades: string;
      penaltyPct: string;
      diasLancados: number;
      hasCertificate: boolean;
      motivoResumo?: string;
    };

    const aprovadosRaw: Row[] = [];
    const desistentesRaw: Row[] = [];

    for (const e of classData.enrollments) {
      const br = eligMap.get(e.studentId);
      if (!br) continue;

      const nome = e.student?.user?.name?.trim() || '—';
      const cpf = this.formatCpfForReport(e.student?.cpf);
      const motivoResumo = br.certificateBlockReasons?.[0] ?? 'Não elegível à certificação';
      const row: Row = {
        studentId: e.studentId,
        nome,
        cpf,
        presencas: br.effectivePresentCount,
        faltas: br.unjustifiedAbsenceCount,
        percentual: br.attendanceRateAfterPenaltyPct.toFixed(1),
        percentualAntesPenalidades: br.attendanceRateBeforePenaltyPct.toFixed(1),
        penaltyPct: br.imprevistoPenaltyPctSum.toFixed(2),
        diasLancados: br.totalSessions,
        hasCertificate: certSet.has(e.studentId),
        motivoResumo: br.certificateEligible ? undefined : motivoResumo,
      };

      if (br.certificateEligible) aprovadosRaw.push(row);
      else desistentesRaw.push(row);
    }

    const withSeq = (rows: Row[], includeMotivo: boolean) =>
      rows.map((r, i) => ({
        seq: i + 1,
        studentId: r.studentId,
        nome: r.nome,
        cpf: r.cpf,
        presencas: r.presencas,
        faltas: r.faltas,
        percentual: r.percentual,
        percentualAntesPenalidades: r.percentualAntesPenalidades,
        penaltyPct: r.penaltyPct,
        diasLancados: r.diasLancados,
        hasCertificate: r.hasCertificate,
        ...(includeMotivo ? { motivoResumo: r.motivoResumo ?? '—' } : {}),
      }));

    const byName = (a: Row, b: Row) => a.nome.localeCompare(b.nome, 'pt-BR');
    aprovadosRaw.sort(byName);
    desistentesRaw.sort(byName);

    const aprovados = withSeq(aprovadosRaw, false) as any;
    const desistentes = withSeq(desistentesRaw, true) as any;

    const totalAlunos = aprovadosRaw.length + desistentesRaw.length;
    let semLanc = 0;
    let bloqueadosPctOk = 0;
    const pctSamples: number[] = [];
    for (const e of classData.enrollments) {
      const br = eligMap.get(e.studentId);
      if (!br) continue;
      if (br.awaitsAttendanceRoll || br.totalSessions === 0) semLanc += 1;
      if (!br.certificateEligible && br.attendanceRateAfterPenaltyPct >= MIN_CERTIFICATE_ATTENDANCE_PCT) {
        bloqueadosPctOk += 1;
      }
      if (br.totalSessions > 0) pctSamples.push(br.attendanceRateAfterPenaltyPct);
    }
    const mediaPct =
      pctSamples.length > 0 ? pctSamples.reduce((a, b) => a + b, 0) / pctSamples.length : 0;

    const summary = {
      totalAlunos,
      totalAulaAteAgora,
      aprovados: aprovados.length,
      desistentes: desistentes.length,
      taxaConclusao: totalAlunos > 0 ? ((aprovados.length / totalAlunos) * 100).toFixed(1) : '0.0',
      certificadosAtivosNaTurma: certSet.size,
      alunosSemLancamentoFrequencia: semLanc,
      bloqueadosComPctAcimaDoMinimo: bloqueadosPctOk,
      mediaPctEfectivaAposPenalidades: mediaPct.toFixed(1),
    };

    const professores = classData.teachers
      .map((t: { teacher?: { user?: { name?: string | null } | null } }) => t.teacher?.user?.name)
      .filter((n: unknown): n is string => typeof n === 'string' && Boolean(n?.trim()))
      .join(', ');

    return { classData, aprovados, desistentes, professores, totalAulaAteAgora, summary };
  }

  /**
   * PDF de concludentes: Puppeteer quando Chromium disponível; senão pdf-lib (sem dependência de browser).
   */
  async generateConcludentsPdfBuffer(classId: string): Promise<{
    buffer: Buffer;
    summary: Record<string, unknown>;
    engine: 'puppeteer' | 'pdf-lib';
  }> {
    const data = await this.loadConcludentsReportData(classId);
    const html = this.buildConcludentsHtml({
      classData: data.classData,
      aprovados: data.aprovados,
      desistentes: data.desistentes,
      professores: data.professores,
      totalAulaAteAgora: data.totalAulaAteAgora,
      summary: data.summary,
    });
    try {
      const pdf = await this.htmlToPdf(html);
      return { buffer: Buffer.from(pdf), summary: data.summary as any, engine: 'puppeteer' };
    } catch (err) {
      this.log.warn(
        `PDF concludentes via Puppeteer falhou (${(err as Error)?.message}); a usar pdf-lib.`,
      );
      const buf = await this.buildConcludentsPdfLibFallback(data);
      return { buffer: buf, summary: data.summary as any, engine: 'pdf-lib' };
    }
  }

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
    const { classData, aprovados, desistentes, professores, totalAulaAteAgora, summary } =
      await this.loadConcludentsReportData(classId);

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

    const mediaPctNum =
      alunos.length > 0
        ? alunos.reduce((s: number, a: { percentual: string }) => s + parseFloat(a.percentual), 0) / alunos.length
        : 0;
    const turmaPctAprov =
      summary.totalAlunos > 0 ? ((summary.aprovados / summary.totalAlunos) * 100).toFixed(1) : '0';
    const turmaPctRisco =
      summary.totalAlunos > 0 ? ((summary.emRisco / summary.totalAlunos) * 100).toFixed(1) : '0';
    const bucket80 = alunos.filter((a: { percentual: string }) => parseFloat(a.percentual) >= 80).length;
    const bucket50 = alunos.filter(
      (a: { percentual: string }) => parseFloat(a.percentual) >= 50 && parseFloat(a.percentual) < 80,
    ).length;
    const bucketLow = alunos.filter((a: { percentual: string }) => parseFloat(a.percentual) < 50).length;
    const w80 = summary.totalAlunos ? (bucket80 / summary.totalAlunos) * 100 : 0;
    const w50 = summary.totalAlunos ? (bucket50 / summary.totalAlunos) * 100 : 0;
    const wLow = summary.totalAlunos ? (bucketLow / summary.totalAlunos) * 100 : 0;

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
    .kpi-wrap { display:flex; flex-wrap:wrap; gap:10px; margin: 12px 0 14px; justify-content: space-between; }
    .kpi { flex:1 1 120px; border:1px solid #1a3a6a; border-radius:8px; padding:10px 12px; background: linear-gradient(145deg,#fffef5,#fff8dc); box-shadow: 0 4px 14px rgba(26,58,106,0.08); }
    .kpi h4 { margin:0 0 4px; font-size:8px; letter-spacing:0.08em; color:#1a3a6a; text-transform:uppercase; }
    .kpi .big { font-size: 20px; font-weight: 800; color: #0f172a; }
    .kpi .hint { font-size:8px; color:#475569; margin-top:4px; line-height:1.35; }
    .bar-row { display:flex; align-items:center; gap:8px; margin:4px 0; font-size:8px; }
    .bar-bg { flex:1; height:14px; background:#e2e8f0; border-radius:20px; overflow:hidden; }
    .bar-fill { height:100%; border-radius:20px; transition: width 0.2s; }
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

  <div class="kpi-wrap">
    <div class="kpi">
      <h4>Média da turma</h4>
      <div class="big">${mediaPctNum.toFixed(1)}%</div>
      <div class="hint">Média aritmética dos percentuais individuais (${summary.totalAlunos} alunos).</div>
    </div>
    <div class="kpi">
      <h4>Meta ≥ 80% (cert.)</h4>
      <div class="big">${summary.aprovados} <span style="font-size:11px;color:#64748b">/ ${summary.totalAlunos}</span></div>
      <div class="hint">${turmaPctAprov}% da turma neste patamar · ${summary.emRisco} em risco (${turmaPctRisco}%)</div>
    </div>
    <div class="kpi">
      <h4>Janela de aulas registradas</h4>
      <div class="big">${totalAulas}</div>
      <div class="hint">Dias distintos com lançamento. Cada % individual = presenças ÷ dias com registo.</div>
    </div>
  </div>
  <div style="margin-bottom:14px;padding:12px;border:1px dashed #93c5fd;border-radius:10px;background:#f8fafc">
    <div style="font-size:10px;font-weight:800;color:#1e3a8a;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.06em;">Distribuição em faixas (sem necessidade de gráficos externos)</div>
    <div class="bar-row"><span style="width:118px;color:#065f46">≥ 80%</span><div class="bar-bg"><div class="bar-fill" style="width:${w80.toFixed(1)}%;background:linear-gradient(90deg,#10b981,#059669)"></div></div><span>${bucket80} (${w80.toFixed(0)}%)</span></div>
    <div class="bar-row"><span style="width:118px;color:#b45309">50–79%</span><div class="bar-bg"><div class="bar-fill" style="width:${w50.toFixed(1)}%;background:linear-gradient(90deg,#fbbf24,#d97706)"></div></div><span>${bucket50} (${w50.toFixed(0)}%)</span></div>
    <div class="bar-row"><span style="width:118px;color:#991b1b">&lt; 50%</span><div class="bar-bg"><div class="bar-fill" style="width:${wLow.toFixed(1)}%;background:linear-gradient(90deg,#f87171,#b91c1c)"></div></div><span>${bucketLow} (${wLow.toFixed(0)}%)</span></div>
  </div>

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
    const horaEmissao = new Date().toLocaleString('pt-BR');
    const turno = classData.startTime ? `${classData.startTime} às ${classData.endTime || ''}` : '';
    const di = classData.startDate ? new Date(classData.startDate).toLocaleDateString('pt-BR') : '—';
    const df = classData.endDate ? new Date(classData.endDate).toLocaleDateString('pt-BR') : '—';
    const cidadeLinha = [classData.city?.name, classData.city?.state].filter(Boolean).join('/');
    const esc = (s: string) => this.escapeHtmlAttr(s);

    const rowsAprovados = aprovados
      .map(
        (a: any) => `<tr>
        <td style="border:1px solid #cbd5e1;padding:4px 5px;text-align:center;font-weight:700">${a.seq}</td>
        <td style="border:1px solid #cbd5e1;padding:4px 6px;font-weight:700;color:#0f172a">${esc(a.nome)}</td>
        <td style="border:1px solid #cbd5e1;padding:4px 6px;font-size:8px;color:#475569">${esc(a.cpf)}</td>
        <td style="border:1px solid #cbd5e1;padding:4px 5px;text-align:center">${a.diasLancados}</td>
        <td style="border:1px solid #cbd5e1;padding:4px 5px;text-align:center;font-weight:800;color:#0e7490">${a.percentual}%</td>
        <td style="border:1px solid #cbd5e1;padding:4px 5px;text-align:center;font-size:8px;color:#64748b">${a.percentualAntesPenalidades}%</td>
        <td style="border:1px solid #cbd5e1;padding:4px 5px;text-align:center;font-size:8px">${a.penaltyPct}%</td>
        <td style="border:1px solid #cbd5e1;padding:4px 5px;text-align:center">${a.hasCertificate ? 'Sim' : 'Não'}</td>
        <td style="border:1px solid #cbd5e1;padding:4px 6px;min-width:100px;background:#fafafa"></td>
      </tr>`,
      )
      .join('');

    const rowsDesistentes = desistentes
      .map(
        (a: any) => `<tr>
        <td style="border:1px solid #cbd5e1;padding:4px 5px;text-align:center">${a.seq}</td>
        <td style="border:1px solid #cbd5e1;padding:4px 6px;font-weight:700;color:#0f172a">${esc(a.nome)}</td>
        <td style="border:1px solid #cbd5e1;padding:4px 6px;font-size:8px;color:#475569">${esc(a.cpf)}</td>
        <td style="border:1px solid #cbd5e1;padding:4px 5px;text-align:center">${a.percentual}%</td>
        <td style="border:1px solid #cbd5e1;padding:4px 5px;text-align:center;font-size:8px;color:#64748b">${a.percentualAntesPenalidades}%</td>
        <td style="border:1px solid #cbd5e1;padding:4px 6px;font-size:8px;color:#334155;line-height:1.35">${esc(a.motivoResumo || '—')}</td>
      </tr>`,
      )
      .join('');

    const metaPct = MIN_CERTIFICATE_ATTENDANCE_PCT;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Lista de Concludentes — ${esc(classData.course.name)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9.5px; color: #0f172a; padding: 14px 16px; background: #f1f5f9; }
    .doc-shell { background: #fff; border-radius: 12px; border: 2px solid #FFD600; box-shadow: 0 12px 32px rgba(10,31,61,0.12); padding: 14px 16px 18px; }
    .logos { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; }
    .logo-box { width: 72px; height: 40px; border: 1px dashed #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 6.5px; color: #94a3b8; text-align: center; border-radius: 4px; }
    .address { text-align: right; font-size: 7.5px; color: #475569; line-height: 1.45; }
    .header-row { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 8px; margin-bottom: 10px; border-bottom: 3px solid #0a1f3d; }
    .band { background: linear-gradient(135deg,#0a1f3d 0%,#133660 100%); color: #fff; padding: 12px 14px; border-radius: 10px 10px 0 0; position: relative; }
    .band::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: linear-gradient(90deg,#FFD600,#0891B2); border-radius: 0 0 8px 8px; }
    .band h1 { font-size: 14px; letter-spacing: 0.06em; margin-bottom: 4px; }
    .band .crit { font-size: 8.5px; opacity: 0.92; line-height: 1.45; }
    .band .curso { margin-top: 8px; font-size: 11px; font-weight: 800; color: #FFD600; }
    .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0 10px; }
    .meta-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; background: linear-gradient(180deg,#f8fafc,#fff); }
    .meta-card h3 { font-size: 7px; text-transform: uppercase; letter-spacing: 0.1em; color: #0891B2; margin-bottom: 4px; }
    .meta-card p { font-size: 8.5px; color: #334155; line-height: 1.4; }
    .resumo { border: 1px solid #bae6fd; background: #f0f9ff; border-radius: 10px; padding: 10px 12px; margin-bottom: 12px; }
    .resumo h2 { font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; color: #0e7490; margin-bottom: 6px; }
    .resumo ul { margin: 0; padding-left: 14px; color: #334155; font-size: 8.5px; line-height: 1.55; }
    .insight { margin-top: 8px; font-size: 8px; color: #64748b; font-style: italic; }
    table { width: 100%; border-collapse: collapse; font-size: 8.2px; margin-bottom: 8px; }
    thead th { background: #0a1f3d; color: #fff; padding: 6px 5px; border: 1px solid #0f172a; font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.04em; }
    thead th.left { text-align: left; }
    .page-break { page-break-before: always; margin-top: 18px; }
    .footer { margin-top: 18px; display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; }
    .assinatura { text-align: center; flex: 1; }
    .linha-assinatura { border-top: 1px solid #0f172a; width: 220px; margin: 0 auto 3px; padding-top: 4px; font-size: 8px; color: #0f172a; font-weight: 700; }
    .sec-title { font-size: 11px; font-weight: 800; color: #0a1f3d; margin: 14px 0 6px; letter-spacing: 0.04em; }
  </style>
</head>
<body>
  <div class="doc-shell">
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

    <div class="band">
      <h1>LISTA DE CONCLUDENTES</h1>
      <div class="crit">Critério: mesmo motor da certificação — presença efectiva (presença ou falta justificada aceite) ≥ ${metaPct}% após calendário letivo e penalidades de imprevisto (PENALIZED) no período da turma.</div>
      <div class="curso">${esc(classData.course.name)} · ${esc(classData.classIdentifier || '')} · ${esc(cidadeLinha)}</div>
    </div>

    <div class="meta-grid">
      <div class="meta-card">
        <h3>Período letivo</h3>
        <p>${di} a ${df}<br>Turno: ${esc(turno || '—')}</p>
      </div>
      <div class="meta-card">
        <h3>Lançamentos na turma</h3>
        <p>${totalAulaAteAgora} dia(s) distinto(s) com registo de frequência na turma.</p>
      </div>
      <div class="meta-card">
        <h3>Emissão</h3>
        <p>${hoje}<br>${horaEmissao}<br>Upgrade Tecnologia Educacional</p>
      </div>
    </div>

    <div class="resumo">
      <h2>Resumo executivo</h2>
      <ul>
        <li><strong>Matrículas consideradas</strong> (ENROLLED / APPROVED): ${summary.totalAlunos}</li>
        <li><strong>Concludentes / elegíveis à certificação</strong> neste critério: ${summary.aprovados} (${summary.taxaConclusao}% da turma)</li>
        <li><strong>Não elegíveis</strong> (bloqueio institucional ou frequência): ${summary.desistentes}</li>
        <li><strong>Certificados ativos</strong> já emitidos nesta turma: ${summary.certificadosAtivosNaTurma}</li>
        <li><strong>Sem lançamento de frequência</strong> (aguardando diário): ${summary.alunosSemLancamentoFrequencia}</li>
        <li><strong>Com % final ≥ ${metaPct}%</strong> mas ainda bloqueados (ex.: faltas injustificadas acima do permitido): ${summary.bloqueadosComPctAcimaDoMinimo}</li>
        <li><strong>Média da turma</strong> (% efectiva após penalidades, só quem tem dias lançados): ${summary.mediaPctEfectivaAposPenalidades}%</li>
      </ul>
      <div class="insight">Insight administrativo: compare &quot;Concludentes&quot; com &quot;Certificados ativos&quot; para detetar pendências de emissão; acompanhe alunos sem lançamento e os bloqueados com % alto até ao encerramento.</div>
    </div>

    <div class="sec-title">Concludentes — assinatura no original impresso</div>
    <table>
      <thead>
        <tr>
          <th style="width:28px">Nº</th>
          <th class="left" style="min-width:120px">Nome</th>
          <th style="width:88px">CPF</th>
          <th style="width:34px">Dias</th>
          <th style="width:40px">% após</th>
          <th style="width:40px">% antes</th>
          <th style="width:38px">Penal.</th>
          <th style="width:36px">Cert.</th>
          <th class="left" style="min-width:90px">Assinatura</th>
        </tr>
      </thead>
      <tbody>
        ${aprovados.length > 0 ? rowsAprovados : `<tr><td colspan="9" style="padding:12px;text-align:center;color:#64748b">Nenhum aluno elegível à certificação neste momento. Verifique lançamentos de frequência ou pendências de imprevisto.</td></tr>`}
      </tbody>
    </table>

    <div class="footer">
      <div style="font-size:8px;color:#64748b;max-width:45%">Professor(a) titular: <strong style="color:#0f172a">${esc(professores || '—')}</strong></div>
      <div class="assinatura">
        <div class="linha-assinatura">${esc(professores || 'Instrutor')}</div>
        <div style="font-size:7.5px;color:#64748b">Assinatura do instrutor</div>
      </div>
    </div>

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
      <div class="band" style="border-radius:10px">
        <h1 style="font-size:12px">NÃO ELEGÍVEIS À CERTIFICAÇÃO</h1>
        <div class="crit">Lista operacional para secretaria: alunos com matrícula ativa que não cumprem o pacote de regras (frequência mínima, tecto de faltas injustificadas ou penalidades).</div>
        <div class="curso">${esc(classData.course.name)} · ${esc(classData.classIdentifier || '')}</div>
      </div>

      <table style="margin-top:12px">
        <thead>
          <tr>
            <th style="width:28px">Nº</th>
            <th class="left" style="min-width:120px">Nome</th>
            <th style="width:88px">CPF</th>
            <th style="width:44px">% após</th>
            <th style="width:44px">% antes</th>
            <th class="left">Motivo (resumo)</th>
          </tr>
        </thead>
        <tbody>
          ${desistentes.length > 0 ? rowsDesistentes : `<tr><td colspan="6" style="padding:12px;text-align:center;color:#64748b">Todos os alunos elegíveis cumprem o critério de certificação.</td></tr>`}
        </tbody>
      </table>

      <div class="footer">
        <div style="font-size:8px;color:#64748b">${hoje} · ${horaEmissao}</div>
        <div class="assinatura">
          <div class="linha-assinatura">${esc(professores || 'Instrutor')}</div>
          <div style="font-size:7.5px;color:#64748b">Instrutor(a) responsável</div>
        </div>
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
    return this.puppeteerCertificateGate.use(async () => {
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
        // `networkidle0` é frágil com HTML estático (timeouts / hang); `load` basta para relatórios sem assets remotos.
        const timeout = this.getNumericEnv('PUPPETEER_SETCONTENT_TIMEOUT_MS', 60000);
        await page.setContent(html, { waitUntil: 'load', timeout });

        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
        });

        return Buffer.from(pdf);
      } finally {
        await browser.close();
      }
    });
  }

  private normalizePeriodRange(start?: string, end?: string) {
    const today = new Date().toISOString().slice(0, 10);
    const e = end || today;
    const s0 = start || (() => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - 30);
      return d.toISOString().slice(0, 10);
    })();
    const s = s0 <= e ? s0 : e;
    return { start: s, end: e };
  }

  private normalizeAttendanceRole(role?: string): 'TEACHER' | 'DRIVER' {
    return String(role || '').toUpperCase() === 'DRIVER' ? 'DRIVER' : 'TEACHER';
  }

  async getEmployeesAttendanceDashboardPayload(roleRaw?: string, startRaw?: string, endRaw?: string) {
    const role = this.normalizeAttendanceRole(roleRaw);
    const { start, end } = this.normalizePeriodRange(startRaw, endRaw);
    const rows = await this.employeesService.getAttendanceSummary(start, end, role);

    const totalFuncionarios = rows.length;
    const diasPeriodo = Math.max(
      1,
      Math.floor(
        (new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) /
          (24 * 60 * 60 * 1000),
      ) + 1,
    );
    const somaRate = rows.reduce((acc: number, r: any) => acc + Number(r.rate || 0), 0);
    const mediaPercentual = totalFuncionarios ? somaRate / totalFuncionarios : 0;
    const acima80 = rows.filter((r: any) => Number(r.rate || 0) >= 80).length;
    const emRisco = rows.filter((r: any) => Number(r.rate || 0) < 80).length;

    return {
      meta: {
        role,
        roleLabel: role === 'DRIVER' ? 'Motoristas' : 'Professores',
        start,
        end,
      },
      summary: {
        totalFuncionarios,
        diasPeriodo,
        mediaPercentual: Number(mediaPercentual.toFixed(2)),
        acima80,
        emRisco,
      },
      records: rows.map((r: any, idx: number) => ({
        ordem: idx + 1,
        employeeId: r.employee?.id,
        nome: r.employee?.name || '—',
        role: r.employee?.role || '—',
        presencas: Number(r.present || 0),
        faltas: Number(r.absent || 0),
        justificadas: Number(r.justified || 0),
        totalLancamentos: Number(r.total || 0),
        percentual: Number(r.rate || 0),
      })),
    };
  }

  private buildEmployeesAttendanceHtml(payload: {
    meta: { roleLabel: string; start: string; end: string };
    summary: {
      totalFuncionarios: number;
      diasPeriodo: number;
      mediaPercentual: number;
      acima80: number;
      emRisco: number;
    };
    records: Array<{
      ordem: number;
      nome: string;
      role: string;
      presencas: number;
      faltas: number;
      justificadas: number;
      totalLancamentos: number;
      percentual: number;
    }>;
  }) {
    const { meta, summary, records } = payload;
    const rows = records
      .map(
        (r) => `<tr>
      <td>${r.ordem}</td>
      <td>${r.nome}</td>
      <td>${r.role}</td>
      <td>${r.presencas}</td>
      <td>${r.faltas}</td>
      <td>${r.justificadas}</td>
      <td>${r.totalLancamentos}</td>
      <td>${r.percentual.toFixed(1)}%</td>
    </tr>`,
      )
      .join('');
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Painel de Frequência — ${meta.roleLabel}</title>
  <style>
    *{box-sizing:border-box} body{font-family:Arial,sans-serif;padding:14px;color:#0f172a}
    .title{font-size:18px;font-weight:800;color:#1e3a8a;margin-bottom:4px}
    .sub{font-size:11px;color:#475569;margin-bottom:12px}
    .kpi{display:flex;gap:10px;margin-bottom:14px}
    .card{flex:1;border:1px solid #dbeafe;border-radius:10px;padding:10px;background:#f8fafc}
    .card h4{font-size:10px;margin:0 0 4px;text-transform:uppercase;letter-spacing:.06em;color:#1e3a8a}
    .card .v{font-size:22px;font-weight:800}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th,td{border:1px solid #cbd5e1;padding:6px 7px;text-align:center}
    th{background:#1e3a8a;color:#fff}
    td:nth-child(2),th:nth-child(2){text-align:left}
  </style>
</head>
<body>
  <div class="title">DASHBOARD DE FREQUÊNCIA — ${meta.roleLabel.toUpperCase()}</div>
  <div class="sub">Período personalizado: ${meta.start} até ${meta.end} · Documento instalável (PDF)</div>
  <div class="kpi">
    <div class="card"><h4>Total</h4><div class="v">${summary.totalFuncionarios}</div></div>
    <div class="card"><h4>Média %</h4><div class="v">${summary.mediaPercentual.toFixed(1)}%</div></div>
    <div class="card"><h4>≥80%</h4><div class="v">${summary.acima80}</div></div>
    <div class="card"><h4>Risco</h4><div class="v">${summary.emRisco}</div></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Nome</th><th>Perfil</th><th>P</th><th>F</th><th>J</th><th>Total</th><th>%</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
  }

  private async buildEmployeesAttendancePdfLibFallback(payload: {
    meta: { roleLabel: string; start: string; end: string };
    summary: {
      totalFuncionarios: number;
      diasPeriodo: number;
      mediaPercentual: number;
      acima80: number;
      emRisco: number;
    };
    records: Array<{
      ordem: number;
      nome: string;
      percentual: number;
      presencas: number;
      faltas: number;
      justificadas: number;
      totalLancamentos: number;
    }>;
  }): Promise<Buffer> {
    const pdf = await PDFDocument.create();
    const f = await pdf.embedFont(StandardFonts.Helvetica);
    const fb = await pdf.embedFont(StandardFonts.HelveticaBold);
    const page = pdf.addPage([595.28, 841.89]);
    let y = 790;
    page.drawText(this.pdfLibSafeText(`Painel de Frequência — ${payload.meta.roleLabel}`), { x: 40, y, size: 15, font: fb });
    y -= 20;
    page.drawText(this.pdfLibSafeText(`Período: ${payload.meta.start} a ${payload.meta.end}`), { x: 40, y, size: 9, font: f });
    y -= 22;
    page.drawText(
      this.pdfLibSafeText(
        `Total: ${payload.summary.totalFuncionarios} | Média: ${payload.summary.mediaPercentual.toFixed(1)}% | >=80%: ${payload.summary.acima80} | Risco: ${payload.summary.emRisco}`,
      ),
      { x: 40, y, size: 9, font: f },
    );
    y -= 24;
    page.drawText('Nome', { x: 40, y, size: 9, font: fb });
    page.drawText('%', { x: 300, y, size: 9, font: fb });
    page.drawText('P/F/J', { x: 340, y, size: 9, font: fb });
    page.drawText('Total', { x: 420, y, size: 9, font: fb });
    y -= 12;
    for (const r of payload.records.slice(0, 40)) {
      page.drawText(this.pdfLibSafeText(`${r.ordem}. ${r.nome}`).slice(0, 48), { x: 40, y, size: 8, font: f });
      page.drawText(`${r.percentual.toFixed(1)}%`, { x: 300, y, size: 8, font: f });
      page.drawText(`${r.presencas}/${r.faltas}/${r.justificadas}`, { x: 340, y, size: 8, font: f });
      page.drawText(`${r.totalLancamentos}`, { x: 420, y, size: 8, font: f });
      y -= 11;
      if (y < 50) break;
    }
    return Buffer.from(await pdf.save());
  }

  async generateEmployeesAttendancePdfBuffer(roleRaw?: string, startRaw?: string, endRaw?: string) {
    const payload = await this.getEmployeesAttendanceDashboardPayload(roleRaw, startRaw, endRaw);
    const html = this.buildEmployeesAttendanceHtml(payload as any);
    try {
      const pdf = await this.htmlToPdf(html);
      return { buffer: Buffer.from(pdf), summary: payload.summary, engine: 'puppeteer' as const };
    } catch (err) {
      this.log.warn(
        `PDF funcionários via Puppeteer falhou (${(err as Error)?.message}); a usar pdf-lib.`,
      );
      const fallback = await this.buildEmployeesAttendancePdfLibFallback(payload as any);
      return { buffer: fallback, summary: payload.summary, engine: 'pdf-lib' as const };
    }
  }

  private async runAdvancedXlsxGenerator(kind: 'student' | 'employee', payload: unknown): Promise<Buffer> {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'qualifica-xlsx-'));
    const payloadPath = path.join(tmpRoot, `payload-${kind}.json`);
    const outPath = path.join(tmpRoot, `dashboard-${kind}.xlsx`);
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'generate_advanced_dashboard.py');
    try {
      await fs.writeFile(payloadPath, JSON.stringify(payload), 'utf8');
      await this.execFileAsync('python3', [scriptPath, kind, payloadPath, outPath], {
        timeout: 120000,
      });
      return await fs.readFile(outPath);
    } finally {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  }

  async generateFrequencyAdvancedXlsxBuffer(classId: string, startRaw?: string, endRaw?: string) {
    const current = await this.getFrequencyDashboardPayload(classId, startRaw, endRaw);
    const p = current.period || this.normalizePeriodRange(startRaw, endRaw);
    const rangeDays =
      Math.max(
        1,
        Math.floor(
          (new Date(`${p.end}T00:00:00Z`).getTime() - new Date(`${p.start}T00:00:00Z`).getTime()) / 86400000,
        ) + 1,
      );
    const prevStart = new Date(`${p.start}T00:00:00Z`);
    prevStart.setUTCDate(prevStart.getUTCDate() - rangeDays);
    const prevEnd = new Date(`${p.end}T00:00:00Z`);
    prevEnd.setUTCDate(prevEnd.getUTCDate() - rangeDays);
    const prevPayload = await this.getFrequencyDashboardPayload(
      classId,
      prevStart.toISOString().slice(0, 10),
      prevEnd.toISOString().slice(0, 10),
    );
    return this.runAdvancedXlsxGenerator('student', {
      ...current,
      prevSummary: prevPayload.summary,
    });
  }

  async generateEmployeesAdvancedXlsxBuffer(roleRaw?: string, startRaw?: string, endRaw?: string) {
    const payload = await this.getEmployeesAttendanceDashboardPayload(roleRaw, startRaw, endRaw);
    return this.runAdvancedXlsxGenerator('employee', payload);
  }

  /** Cores marca Upgrade (PDF nativo pdf-lib). */
  private readonly UG = {
    navy: rgb(0.102, 0.227, 0.416), // #1a3a6a
    navyDeep: rgb(0.063, 0.125, 0.231),
    yellow: rgb(1, 0.839, 0), // #FFD600
    cyan: rgb(0.035, 0.569, 0.698), // #0891B2
    green: rgb(0.02, 0.588, 0.412),
    red: rgb(0.863, 0.149, 0.149),
    paper: rgb(0.945, 0.953, 0.976),
    paper2: rgb(0.988, 0.992, 1),
    ink: rgb(0.12, 0.16, 0.23),
    muted: rgb(0.42, 0.45, 0.52),
  };

  /**
   * Fallback sem Chromium: PDF nativo com KPIs, insights e lista (REQ-11) — visual alinhado à marca Upgrade.
   */
  private async buildFrequencyPdfLibFallback(data: {
    classData: any;
    alunos: Array<{
      seq: number;
      nome: string;
      studentId: string;
      cpf: string;
      presencas: number;
      faltas: number;
      percentual: string;
      status: string;
    }>;
    professores: string;
    totalAulas: number;
    summary: { totalAlunos: number; totalAulas: number; aprovados: number; emRisco: number };
  }): Promise<Buffer> {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const W = 595.28;
    const H = 841.89;
    const margin = 44;
    let page = pdf.addPage([W, H]);
    let y = H - margin;

    const { classData, alunos, professores, totalAulas, summary } = data;
    const courseName = String(classData?.course?.name ?? 'Curso');
    const turmaId = String(classData?.classIdentifier ?? '');
    const cidade = `${classData?.city?.name ?? ''}/${classData?.city?.state ?? ''}`;

    const newPageIfNeeded = (need: number) => {
      if (y < need) {
        page = pdf.addPage([W, H]);
        page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: this.UG.paper2 });
        y = H - margin;
      }
    };

    const drawHeaderBand = () => {
      const bandTop = y;
      const bandH = 78;
      page.drawRectangle({
        x: 0,
        y: bandTop - bandH,
        width: W,
        height: bandH,
        color: this.UG.navyDeep,
      });
      page.drawRectangle({
        x: 0,
        y: bandTop - bandH,
        width: W,
        height: 5,
        color: this.UG.yellow,
      });
      page.drawText('DASHBOARD DE FREQUÊNCIA', {
        x: margin,
        y: bandTop - 38,
        size: 16,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
      page.drawText('RELATÓRIO COM INSIGHTS · QUALIFICA / UPGRADE', {
        x: margin,
        y: bandTop - 56,
        size: 8,
        font,
        color: rgb(0.82, 0.88, 0.96),
      });
      const sub = `${courseName} · ${turmaId} · ${cidade}`.slice(0, 90);
      page.drawText(sub, {
        x: margin,
        y: bandTop - 70,
        size: 9,
        font: fontBold,
        color: this.UG.yellow,
        maxWidth: W - margin * 2,
      });
      y = bandTop - bandH - 16;
    };

    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: this.UG.paper });
    drawHeaderBand();

    const write = (text: string, size: number, bold = false, col = this.UG.ink, lineGap = 11) => {
      newPageIfNeeded(margin + 28);
      const safe = this.pdfLibSafeText(text);
      const cut = safe.length > 98 ? `${safe.slice(0, 95)}...` : safe;
      page.drawText(cut, {
        x: margin,
        y,
        size,
        font: bold ? fontBold : font,
        color: col,
        maxWidth: W - margin * 2,
      });
      y -= lineGap + (size >= 11 ? 2 : 0);
    };

    const mediaPct = alunos.length
      ? alunos.reduce((s, a) => s + parseFloat(a.percentual), 0) / alunos.length
      : 0;
    const pctApr =
      summary.totalAlunos > 0 ? ((summary.aprovados / summary.totalAlunos) * 100).toFixed(1) : '0';
    const pctRisk =
      summary.totalAlunos > 0 ? ((summary.emRisco / summary.totalAlunos) * 100).toFixed(1) : '0';
    const bucket80 = alunos.filter(a => parseFloat(a.percentual) >= 80).length;
    const bucket50 = alunos.filter(a => parseFloat(a.percentual) >= 50 && parseFloat(a.percentual) < 80).length;
    const bucketLow = alunos.filter(a => parseFloat(a.percentual) < 50).length;
    const w80 = summary.totalAlunos ? (bucket80 / summary.totalAlunos) * 100 : 0;
    const w50 = summary.totalAlunos ? (bucket50 / summary.totalAlunos) * 100 : 0;
    const wLow = summary.totalAlunos ? (bucketLow / summary.totalAlunos) * 100 : 0;

    const insightsH = 68;
    newPageIfNeeded(insightsH + 120);
    page.drawRectangle({
      x: margin - 6,
      y: y - insightsH,
      width: W - 2 * (margin - 6),
      height: insightsH,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.78, 0.82, 0.9),
      borderWidth: 1,
    });
    page.drawRectangle({
      x: margin - 6,
      y: y - 4,
      width: 4,
      height: insightsH - 8,
      color: this.UG.cyan,
    });
    let iy = y - 14;
    page.drawText(this.pdfLibSafeText('LEITURA RÁPIDA (INSIGHTS AUTOMÁTICOS)'), {
      x: margin + 6,
      y: iy,
      size: 9,
      font: fontBold,
      color: this.UG.navy,
    });
    iy -= 14;
    const i1 =
      totalAulas > 0
        ? `• Média da turma ${mediaPct.toFixed(1)}% — meta institucional de certificação: ≥80% de frequência efetiva.`
        : '• Sem dias consolidados neste período: lance frequências antes de ler percentuais como definitivos.';
    const i2 = `• ${summary.aprovados} aluno(s) na faixa elegível (${pctApr}%); ${summary.emRisco} em risco (${pctRisk}%) com dias já registrados.`;
    const i3 =
      pctRisk !== '0' && Number(pctRisk) > 25
        ? '• Alerta: mais de um quarto da turma abaixo de 80% — priorizar recuperação antes da emissão de certificado.'
        : '• Distribuição em faixas ajuda o professor e a supervisão pedagógica a priorizar acompanhamentos.';
    for (const line of [i1, i2, i3]) {
      page.drawText(this.pdfLibSafeText(line).slice(0, 118), {
        x: margin + 6,
        y: iy,
        size: 7.5,
        font,
        color: this.UG.ink,
        maxWidth: W - margin * 2 - 8,
      });
      iy -= 16;
    }
    y -= insightsH + 18;

    const kpiW = (W - 2 * margin - 16) / 3;
    const kpiH = 52;
    const drawKpi = (ix: number, label: string, val: string, accent: ReturnType<typeof rgb>) => {
      page.drawRectangle({
        x: ix,
        y: y - kpiH,
        width: kpiW,
        height: kpiH,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.85, 0.89, 0.95),
        borderWidth: 0.75,
      });
      page.drawRectangle({ x: ix, y: y - 6, width: kpiW, height: 3, color: accent });
      page.drawText(this.pdfLibSafeText(label), { x: ix + 8, y: y - 20, size: 6.5, font: fontBold, color: this.UG.muted });
      page.drawText(this.pdfLibSafeText(val), {
        x: ix + 8,
        y: y - 40,
        size: val.length > 12 ? 11 : 14,
        font: fontBold,
        color: accent,
      });
    };
    newPageIfNeeded(kpiH + 100);
    drawKpi(margin, 'MÉDIA %', `${mediaPct.toFixed(2)}%`, this.UG.cyan);
    drawKpi(margin + kpiW + 8, '≥80% (CERT.)', `${summary.aprovados}/${summary.totalAlunos}`, this.UG.green);
    drawKpi(margin + 2 * (kpiW + 8), 'DIAS C/ REG.', String(totalAulas), this.UG.navy);
    y -= kpiH + 20;

    write('Faixas de desempenho', 10, true, this.UG.navy, 12);
    const barW = W - 2 * margin - 120;
    const drawBar = (label: string, pct: number, fill: ReturnType<typeof rgb>) => {
      newPageIfNeeded(36);
      page.drawText(this.pdfLibSafeText(label), { x: margin, y, size: 8, font: fontBold, color: this.UG.ink });
      page.drawRectangle({
        x: margin + 112,
        y: y - 10,
        width: barW,
        height: 12,
        color: rgb(0.93, 0.94, 0.96),
      });
      page.drawRectangle({
        x: margin + 112,
        y: y - 10,
        width: Math.max(0, (barW * pct) / 100),
        height: 12,
        color: fill,
      });
      y -= 26;
    };
    drawBar('≥80%', w80, this.UG.green);
    drawBar('50–79%', w50, rgb(0.94, 0.58, 0.06));
    drawBar('<50%', wLow, this.UG.red);

    write('DETALHE POR ALUNO', 10, true, this.UG.navy, 14);
    for (const a of alunos) {
      const row = `${String(a.seq).padStart(2, ' ')}  ${a.nome.slice(0, 52)}   P:${a.presencas} F:${a.faltas}   ${a.percentual}%   ${a.status}`;
      write(row, 7.8, false, parseFloat(a.percentual) >= 80 ? this.UG.green : this.UG.ink, 13);
    }

    y -= 12;
    write(`Professor(a) titular(es): ${professores || '—'}`, 9, false, this.UG.muted, 13);
    write(
      totalAulas > 0
        ? `Auditoria: percentual individual = presenças efectivas ÷ ${totalAulas} dia(s) com marcação registrada nesta turma.`
        : 'Sem dias consolidados — percentuais aguardando lançamentos do professor.',
      7.5,
      false,
      this.UG.muted,
      12,
    );
    write(`Emitido em ${new Date().toLocaleString('pt-BR')} · Upgrade Tecnologia Educacional`, 6.8, false, rgb(0.55, 0.58, 0.62), 10);

    const bytes = await pdf.save();
    return Buffer.from(bytes);
  }

  /**
   * Lista de concludentes sem Chromium (pdf-lib) — mantém legibilidade e marca.
   */
  private async buildConcludentsPdfLibFallback(data: {
    classData: any;
    aprovados: Array<Record<string, unknown> & { seq: number; nome: string; presencas: number; faltas: number; percentual: string }>;
    desistentes: Array<
      Record<string, unknown> & {
        seq: number;
        nome: string;
        presencas: number;
        faltas: number;
        percentual: string;
        motivoResumo?: string;
      }
    >;
    professores: string;
    totalAulaAteAgora: number;
    summary: {
      totalAlunos: number;
      totalAulaAteAgora: number;
      aprovados: number;
      desistentes: number;
      taxaConclusao: string;
      certificadosAtivosNaTurma?: number;
      alunosSemLancamentoFrequencia?: number;
      bloqueadosComPctAcimaDoMinimo?: number;
      mediaPctEfectivaAposPenalidades?: string;
    };
  }): Promise<Buffer> {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const W = 595.28;
    const H = 841.89;
    const margin = 44;
    let page = pdf.addPage([W, H]);
    let y = H - margin;
    const { classData, aprovados, desistentes, professores, totalAulaAteAgora, summary } = data;
    const courseName = String(classData?.course?.name ?? 'Curso');
    const cidade = `${classData?.city?.name ?? ''}/${classData?.city?.state ?? ''}`;

    const newPage = () => {
      page = pdf.addPage([W, H]);
      page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: this.UG.paper });
      y = H - margin;
    };

    const write = (text: string, size: number, bold = false, col = this.UG.ink) => {
      if (y < margin + 40) newPage();
      const safe = this.pdfLibSafeText(text);
      const truncated = safe.length > 100 ? `${safe.slice(0, 97)}...` : safe;
      page.drawText(truncated, {
        x: margin,
        y,
        size,
        font: bold ? fontBold : font,
        color: col,
        maxWidth: W - 2 * margin,
      });
      y -= size + 11;
    };

    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: this.UG.paper });
    const bandH = 72;
    page.drawRectangle({ x: 0, y: y - bandH, width: W, height: bandH, color: this.UG.navyDeep });
    page.drawRectangle({ x: 0, y: y - bandH, width: W, height: 5, color: this.UG.yellow });
    page.drawText(this.pdfLibSafeText('LISTA DE CONCLUDENTES'), {
      x: margin,
      y: y - 36,
      size: 15,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText(
      this.pdfLibSafeText(
        `Critério: motor de certificação (>= ${MIN_CERTIFICATE_ATTENDANCE_PCT}% efectivo após calendário e penalidades).`,
      ),
      {
        x: margin,
        y: y - 54,
        size: 8,
        font,
        color: rgb(0.88, 0.92, 1),
      },
    );
    page.drawText(
      this.pdfLibSafeText(`${courseName} · ${classData?.classIdentifier ?? ''} · ${cidade}`),
      {
        x: margin,
        y: y - 66,
        size: 9,
        font: fontBold,
        color: this.UG.yellow,
        maxWidth: W - 2 * margin,
      },
    );
    y -= bandH + 20;

    write('RESUMO', 10, true, this.UG.navy);
    write(`Matrículas (ENROLLED/APPROVED): ${summary.totalAlunos} · Dias distintos c/ registo na turma: ${totalAulaAteAgora}`, 9);
    write(
      `Elegíveis à certificação: ${summary.aprovados} (${summary.taxaConclusao}% da turma) · Não elegíveis: ${summary.desistentes}`,
      9,
    );
    write(
      `Certificados ativos na turma: ${summary.certificadosAtivosNaTurma ?? 0} · Sem lançamento de freq.: ${summary.alunosSemLancamentoFrequencia ?? 0} · Bloqueados c/ % final >= ${MIN_CERTIFICATE_ATTENDANCE_PCT}%: ${summary.bloqueadosComPctAcimaDoMinimo ?? 0}`,
      8.5,
      false,
      this.UG.muted,
    );
    write(`Média % efectiva (após penalidades): ${summary.mediaPctEfectivaAposPenalidades ?? '0.0'}%`, 8.5, false, this.UG.muted);
    write(
      'Insight: confrontar elegíveis com certificados emitidos; rever bloqueados com % alto e alunos sem diário.',
      8,
      false,
      this.UG.muted,
    );
    y -= 6;

    write('CONCLUDENTES (assinatura no original impresso)', 10, true, this.UG.navy);
    if (aprovados.length === 0) {
      write('Nenhum aluno elegível ao certificado neste momento.', 9, false, this.UG.muted);
    }
    for (const a of aprovados) {
      const cpf = typeof a.cpf === 'string' ? a.cpf : '';
      const cert = a.hasCertificate ? 'cert:sim' : 'cert:não';
      write(
        `${a.seq}. ${a.nome}  |  ${cpf || 'CPF —'}  |  %final ${a.percentual}% (antes ${String(a.percentualAntesPenalidades ?? '—')}%, penal ${String(a.penaltyPct ?? '0')}%)  |  ${cert}  |  ${a.presencas} efectivas / ${a.faltas} faltas injust.`,
        7.8,
      );
    }

    y -= 16;
    write(`Professor(a): ${professores || '—'}`, 9, false, this.UG.muted);

    newPage();
    const y0 = H - margin;
    y = y0;
    page.drawRectangle({ x: 0, y: y - 58, width: W, height: 58, color: this.UG.navy });
    page.drawText(this.pdfLibSafeText('LISTA — NÃO ELEGÍVEIS À CERTIFICAÇÃO'), {
      x: margin,
      y: y - 32,
      size: 12,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText(this.pdfLibSafeText(courseName), { x: margin, y: y - 48, size: 9, font, color: this.UG.yellow });
    y -= 70;

    if (desistentes.length === 0) {
      write('Todos os alunos matriculados cumprem o pacote de elegibilidade.', 9, false, this.UG.muted);
    }
    for (const a of desistentes) {
      const motivo = this.pdfLibSafeText(String(a.motivoResumo ?? '—').slice(0, 120));
      write(
        `${a.seq}. ${a.nome}  |  %final ${a.percentual}%  |  antes ${String(a.percentualAntesPenalidades ?? '—')}%  |  ${motivo}`,
        7.8,
      );
    }
    y -= 12;
    write(`Professor(a): ${professores || '—'}`, 9, false, this.UG.muted);
    write(`Emitido em ${new Date().toLocaleString('pt-BR')} · Upgrade`, 7, false, this.UG.muted);

    return Buffer.from(await pdf.save());
  }

  // ============================================================
  // CERTIFICADO DIGITAL — Template Representativo
  // Substituir buildCertificateHtml() pelo template oficial quando Robert enviar
  // ============================================================

  /**
   * Gera o PDF do certificado. `debug: true` desenha contornos vermelhos (só modelos PDF_BASE) para alinhar coordenadas.
   */
  async generateCertificatePdf(verificationCode: string, options?: { debug?: boolean }): Promise<Buffer> {
    const cert = await this.prisma.certificate.findFirst({
      where: { verificationCode },
      include: {
        student: { include: { user: { select: { name: true } } } },
        class: {
          select: {
            courseId: true,
            classIdentifier: true,
            course: {
              select: {
                name: true,
                workloadHours: true,
                syllabus: true,
                institution: {
                  select: {
                    id: true,
                    slug: true,
                    name: true,
                    shortName: true,
                    logoUrl: true,
                    siteUrl: true,
                    primaryColor: true,
                    signPfxPath: true,
                  },
                },
              },
            },
            city: { select: { name: true, state: true } },
          },
        },
        issuer: { select: { name: true } },
        templateVersion: true,
      },
    });

    if (!cert) throw new NotFoundException('Certificado nao encontrado');

    const studentName = cert.student?.user?.name ?? 'Aluno';
    const courseName = cert.class?.course?.name ?? 'Curso';
    const workload = cert.class?.course?.workloadHours ?? 40;
    const classId = cert.class?.classIdentifier ?? '--';
    const cityName = cert.class?.city?.name ?? 'Sao Luis';
    const cityState = cert.class?.city?.state ?? 'MA';
    const issuerName = cert.issuer?.name ?? 'Coordenador(a)';
    const issuedAt = new Date(cert.issuedAt).toLocaleDateString('pt-BR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const frontendUrl = getPrimaryFrontendUrl();
    const verifyUrl = `${frontendUrl}/certificado/verificar/${verificationCode}`;

    const branding = this.resolveCertificateBranding(cert.class?.course?.institution);

    const qrDataUrl = await this.buildCertificateQrDataUrl(verifyUrl);

    // Snapshot imutável (emissão) > resolução dinâmica (legado, certificados antigos)
    let selectedTemplate: CertificateTemplateVersion | null = cert.templateVersion;
    if (!selectedTemplate) {
      this.log.warn(`Certificado ${verificationCode} sem templateVersionId — a usar resolução dinâmica.`);
      selectedTemplate = await this.templateService.resolvePublishedTemplate(
        cert.class?.courseId ?? undefined,
        cityState,
      );
    }

    const cacheParts = this.getCertificateCacheParts(
      cert,
      selectedTemplate,
      {
        studentName,
        courseName,
        workload,
        classId,
        cityName,
        cityState,
        issuerName,
      },
      branding,
    );
    const metaForPdf = {
      studentName,
      courseName,
      issuedAtDisplay: issuedAt,
      verificationCode,
    };
    let signingMode: CertificateSigningMode = 'AUTO';

    if (!options?.debug && this.certificatePdfCache.isEnabled()) {
      const hit = await this.certificatePdfCache.get(verificationCode, {
        templateVersionId: cacheParts.templateVersionId,
        contentKey: cacheParts.contentKey,
      });
      if (hit) {
        this.certificateMetrics.recordCacheHit();
        return hit;
      }
      this.certificateMetrics.recordCacheMiss();
    }

    if (selectedTemplate?.templateType === CertificateTemplateType.HTML) {
      if (!selectedTemplate.htmlContent?.trim()) {
        throw new BadRequestException(
          'A versão do modelo de certificado (HTML) associada a este registo não tem conteúdo HTML.',
        );
      }
      const html = this.renderTemplateHtml(selectedTemplate.htmlContent, selectedTemplate.cssContent, {
        ALUNO_NOME: studentName,
        CURSO_NOME: courseName,
        CARGA_HORARIA: String(workload),
        CIDADE: cityName,
        ESTADO: cityState,
        DATA_EMISSAO: issuedAt,
        CODIGO_VERIFICACAO: verificationCode,
        QR_CODE_DATA_URL: qrDataUrl,
        TURMA: classId,
        EMISSOR: issuerName,
        ...this.buildBrandingTemplateVars(branding),
      });
      try {
        const t0 = performance.now();
        const out = await this.htmlToLandscapePdf(html);
        this.certificateMetrics.recordPuppeteerRun(performance.now() - t0);
        return this.finalizeCertificatePdfOutput(verificationCode, options, cacheParts, out, metaForPdf, branding, signingMode);
      } catch (e) {
        this.log.error(
          `Certificado HTML→PDF falhou (${verificationCode}): ${e instanceof Error ? e.message : String(e)}`,
        );
        throw new BadRequestException('Falha ao gerar PDF a partir do modelo HTML. Verifique o modelo e os assets.');
      }
    }

    if (selectedTemplate?.templateType === CertificateTemplateType.PDF_BASE) {
      const pdfTextOverrides = this.parsePdfTextOverrides(selectedTemplate.pdfTextOverrides);
      signingMode = this.resolveSigningMode(pdfTextOverrides);
      const rawCo = selectedTemplate.coordinateOverrides;
      const coordinateOverrides = parseCertificateCoordinateOverridesFromDb(rawCo);
      if (rawCo && typeof rawCo === 'object' && !Array.isArray(rawCo) && Object.keys(rawCo as object).length > 0 && !coordinateOverrides) {
        this.log.warn('coordinateOverrides com formato inválido no modelo; a usar variáveis de ambiente e defaults.');
      }
      const tPdf = performance.now();
      const templatePdf = await this.generateCertificateFromOfficialTemplate(
        {
          studentName,
          courseName,
          workload,
          syllabus: cert.class?.course?.syllabus ?? null,
          cityName,
          cityState,
          issuedAt,
          verificationCode,
          qrDataUrl,
        },
        selectedTemplate.pdfPath ?? undefined,
        pdfTextOverrides,
        coordinateOverrides,
        { debug: options?.debug === true },
      );
      this.certificateMetrics.recordPdfLibRun(performance.now() - tPdf);
      return this.finalizeCertificatePdfOutput(verificationCode, options, cacheParts, templatePdf, metaForPdf, branding, signingMode);
    }

    if (selectedTemplate) {
      throw new BadRequestException(`Tipo de modelo não suportado: ${selectedTemplate.templateType}`);
    }

    const html = this.buildCertificateHtml(
      {
        studentName,
        courseName,
        workload,
        classId,
        cityName,
        cityState,
        issuerName,
        issuedAt,
        verificationCode,
        qrDataUrl,
      },
      branding,
    );

    return this.puppeteerCertificateGate.use(async () => {
      const t0 = performance.now();
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox', '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', '--disable-gpu',
          '--no-first-run', '--no-zygote',
        ],
      });
      try {
        const page = await browser.newPage();
        await this.configureCertificatePdfPage(page);
        const htmlReady = this.absolutizePublicAssetUrls(html);
        const timeout = this.getNumericEnv('PUPPETEER_SETCONTENT_TIMEOUT_MS', 60000);
        await page.setContent(htmlReady, { waitUntil: 'load', timeout });
        await this.waitForCertificateFonts(page);
        const pdf = await page.pdf(this.getCertificatePuppeteerPdfOptions({ preferCSSPageSize: true }));
        this.certificateMetrics.recordPuppeteerRun(performance.now() - t0);
        return this.finalizeCertificatePdfOutput(verificationCode, options, cacheParts, Buffer.from(pdf), metaForPdf, branding, signingMode);
      } finally {
        await browser.close();
      }
    });
  }

  /**
   * Pré-visualização (sandbox): não grava certificado. Opcionalmente `templateVersionId` força uma versão concreta (rascunho ou publicada).
   */
  async generateCertificatePreviewPdf(
    studentId: string,
    classId: string,
    options?: {
      templateVersionId?: string;
      pdfPathOverride?: string;
      previewCourseId?: string;
      debug?: boolean;
      isVisualEditor?: boolean;
      coordinateOverrides?: Record<string, number>;
      pdfTextOverrides?: Record<string, string | boolean>;
    },
  ): Promise<Buffer> {
    let studentName = 'Aluno';
    let courseName = 'Curso';
    let workload = 40;
    let classIdStr = '--';
    let cityName = 'São Luís';
    let cityState = 'MA';
    let syllabus: string | null = null;
    let branding: any = this.resolveCertificateBranding(null);
    let courseId: string | undefined = undefined;

    // Mock UI data from frontend/app/admin/certificados/page.tsx
    if (studentId === '1' || studentId === '2' || studentId === '3') {
      if (studentId === '1') {
        studentName = 'Ana Silva';
        courseName = 'Informática Básica';
        classIdStr = 'INF-001/MA';
        workload = 40;
      } else if (studentId === '2') {
        studentName = 'Carlos Sousa';
        courseName = 'Informática Básica';
        classIdStr = 'INF-001/MA';
        workload = 40;
      } else {
        studentName = 'Maria Oliveira';
        courseName = 'Costura Industrial';
        classIdStr = 'COS-002/PI';
        workload = 60;
        cityState = 'PI';
      }
    } else {
      const row = await this.prisma.enrollment.findFirst({
        where: { studentId, classId, status: { in: ['ENROLLED', 'APPROVED'] } },
        include: {
          student: { include: { user: { select: { name: true } } } },
          class: {
            select: {
              courseId: true,
              classIdentifier: true,
              course: {
                select: {
                  name: true,
                  workloadHours: true,
                  syllabus: true,
                  institution: {
                    select: {
                      id: true,
                      slug: true,
                      name: true,
                      shortName: true,
                      logoUrl: true,
                      siteUrl: true,
                      primaryColor: true,
                      signPfxPath: true,
                    },
                  },
                },
              },
              city: { select: { name: true, state: true } },
            },
          },
        },
      });
      if (!row) {
        throw new NotFoundException('Matrícula ENROLLED/APPROVED não encontrada para este aluno e turma.');
      }

      branding = this.resolveCertificateBranding(row.class?.course?.institution);
      studentName = row.student?.user?.name ?? 'Aluno';
      courseName = row.class?.course?.name ?? 'Curso';
      workload = row.class?.course?.workloadHours ?? 40;
      syllabus = row.class?.course?.syllabus ?? null;
      classIdStr = row.class?.classIdentifier ?? '--';
      cityName = row.class?.city?.name ?? 'São Luís';
      cityState = row.class?.city?.state ?? 'MA';
      courseId = row.class?.courseId ?? undefined;
    }

    if (options?.previewCourseId?.trim()) {
      const pc = await this.prisma.course.findUnique({
        where: { id: options.previewCourseId.trim() },
        select: {
          name: true,
          workloadHours: true,
          syllabus: true,
          institution: {
            select: {
              id: true,
              slug: true,
              name: true,
              shortName: true,
              logoUrl: true,
              siteUrl: true,
              primaryColor: true,
              signPfxPath: true,
            },
          },
        },
      });
      if (pc) {
        courseName = pc.name ?? courseName;
        workload = pc.workloadHours ?? workload;
        syllabus = pc.syllabus ?? syllabus;
        branding = this.resolveCertificateBranding(pc.institution);
      }
    }

    const issuerName = 'Pré-visualização';
    const issuedAt = new Date().toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const previewCode = `PREVIEW-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const metaForPreview = {
      studentName,
      courseName,
      issuedAtDisplay: issuedAt,
      verificationCode: previewCode,
    };
    let signingMode: CertificateSigningMode = 'AUTO';
    const frontendUrl = getPrimaryFrontendUrl();
    const verifyUrl = `${frontendUrl}/certificado/verificar/${previewCode}`;
    const qrDataUrl = await this.buildCertificateQrDataUrl(verifyUrl);

    let selectedTemplate: CertificateTemplateVersion | null = null;
    let effectivePdfPath: string | undefined = options?.pdfPathOverride;

    if (options?.templateVersionId) {
      selectedTemplate = await this.prisma.certificateTemplateVersion.findUnique({
        where: { id: options.templateVersionId },
      });
      if (!selectedTemplate) {
        throw new NotFoundException('Versão de modelo (templateVersionId) não encontrada.');
      }
      if (!effectivePdfPath) {
        effectivePdfPath = selectedTemplate.pdfPath ?? undefined;
      }
    } else {
      selectedTemplate = await this.templateService.resolvePublishedTemplate(
        courseId,
        cityState,
      );
      if (selectedTemplate) {
        if (!effectivePdfPath) {
          effectivePdfPath = selectedTemplate.pdfPath ?? undefined;
        }
      }
    }

    // If we still have no template but DO have a pdfPathOverride,
    // create a virtual PDF_BASE template in memory so preview works
    // even before any template is saved to the database.
    if (!selectedTemplate && effectivePdfPath) {
      selectedTemplate = {
        id: 'virtual-preview',
        templateId: 'virtual',
        version: 0,
        title: 'Preview virtual',
        templateType: CertificateTemplateType.PDF_BASE,
        status: 'PUBLISHED' as any,
        htmlContent: null,
        cssContent: null,
        pdfPath: effectivePdfPath,
        pdfTextOverrides: options?.pdfTextOverrides ?? null,
        coordinateOverrides: options?.coordinateOverrides ?? null,
        placeholders: [],
        notes: null,
        createdById: null,
        approvedById: null,
        approvedAt: null,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as CertificateTemplateVersion;
    }

    if (!selectedTemplate) {
      throw new BadRequestException(
        `Não existe modelo publicado para este curso e UF (${(cityState ?? 'MA').trim().toUpperCase()}). ` +
        'Indique `templateVersionId`, use `pdfPathOverride`, ou publique um modelo.',
      );
    }

    if (selectedTemplate.templateType === CertificateTemplateType.HTML) {
      if (!selectedTemplate.htmlContent?.trim()) {
        throw new BadRequestException('Modelo HTML sem conteúdo.');
      }
      const html = this.renderTemplateHtml(selectedTemplate.htmlContent, selectedTemplate.cssContent, {
        ALUNO_NOME: studentName,
        CURSO_NOME: courseName,
        CARGA_HORARIA: String(workload),
        CIDADE: cityName,
        ESTADO: cityState,
        DATA_EMISSAO: issuedAt,
        CODIGO_VERIFICACAO: previewCode,
        QR_CODE_DATA_URL: qrDataUrl,
        TURMA: classIdStr,
        EMISSOR: issuerName,
        ...this.buildBrandingTemplateVars(branding),
      });
      const t0 = performance.now();
      const raw = await this.htmlToLandscapePdf(html);
      this.certificateMetrics.recordPuppeteerRun(performance.now() - t0);
      return this.finalizePreviewCertificatePdfOutput(raw, options, metaForPreview, branding, signingMode);
    }

    if (selectedTemplate.templateType === CertificateTemplateType.PDF_BASE) {
      const basePdfTextOverrides = this.parsePdfTextOverrides(selectedTemplate.pdfTextOverrides) ?? {};
      const mergedPdfTextOverrides = {
        ...basePdfTextOverrides,
        ...(options?.pdfTextOverrides ?? {}),
      };
      const pdfTextOverrides = this.parsePdfTextOverrides(mergedPdfTextOverrides) ?? basePdfTextOverrides;
      signingMode = this.resolveSigningMode(pdfTextOverrides);
      const rawCo = selectedTemplate.coordinateOverrides;
      const coordinateOverrides = mergeCertificateCoordinateOverrides(
        selectedTemplate.coordinateOverrides,
        options?.coordinateOverrides,
      );
      if (
        rawCo &&
        typeof rawCo === 'object' &&
        !Array.isArray(rawCo) &&
        Object.keys(rawCo as object).length > 0 &&
        !coordinateOverrides &&
        !options?.coordinateOverrides
      ) {
        this.log.warn('coordinateOverrides com formato inválido na versão; a usar ENV/defaults.');
      }
      const tPdf = performance.now();
      const templatePdf = await this.generateCertificateFromOfficialTemplate(
        {
          studentName,
          courseName,
          workload,
          syllabus,
          cityName,
          cityState,
          issuedAt,
          verificationCode: previewCode,
          qrDataUrl,
        },
        effectivePdfPath,
        pdfTextOverrides,
        coordinateOverrides,
        { debug: options?.debug === true, isVisualEditor: options?.isVisualEditor === true },
      );
      this.certificateMetrics.recordPdfLibRun(performance.now() - tPdf);
      return this.finalizePreviewCertificatePdfOutput(templatePdf, options, metaForPreview, branding, signingMode);
    }

    throw new BadRequestException(`Tipo de modelo não suportado na pré-visualização: ${selectedTemplate.templateType}`);
  }

  /**
   * Ordem: `coordinateOverrides` (versão) → `process.env` (`CERT_TEMPLATE_*`) → valor hardcoded.
   */
  private coord(
    o: CertificateCoordinateOverrides | null | undefined,
    key: keyof CertificateCoordinateOverrides,
    envName: string,
    fallback: number,
  ): number {
    const v = o?.[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    return this.getNumericEnv(envName, fallback);
  }

  /** Contorno de depuração (vermelho semitransparente) sobre a área indicada. */
  private drawDebugFieldRect(page: PDFPage, x: number, y: number, w: number, h: number) {
    page.drawRectangle({
      x,
      y,
      width: Math.max(w, 1),
      height: Math.max(h, 1),
      color: rgb(1, 0, 0),
      opacity: 0.12,
      borderColor: rgb(0.9, 0, 0),
      borderWidth: 0.75,
      borderOpacity: 0.9,
    });
  }

  /**
   * Grade 10 mm + régua indicativa (mm) nas bordas — por cima do conteúdo (modo debug).
   */
  private drawDebugMillimeterGrid(page: PDFPage, width: number, height: number, labelFont: PDFFont) {
    const step = 10 * MM_TO_PT;
    const lineColor = rgb(0.55, 0.6, 0.65);
    const lineOp = 0.3;
    for (let px = 0; px <= width; px += step) {
      page.drawLine({
        start: { x: px, y: 0 },
        end: { x: px, y: height },
        thickness: 0.3,
        color: lineColor,
        opacity: lineOp,
      });
    }
    for (let py = 0; py <= height; py += step) {
      page.drawLine({
        start: { x: 0, y: py },
        end: { x: width, y: py },
        thickness: 0.3,
        color: lineColor,
        opacity: lineOp,
      });
    }
    const labelSize = 5.2;
    const labelColor = rgb(0.45, 0.45, 0.5);
    for (let px = 0; px <= width; px += step) {
      const mm = Math.round(px / MM_TO_PT);
      if (mm % 50 !== 0) {
        continue;
      }
      try {
        page.drawText(`${mm}`, {
          x: Math.min(px + 0.6, width - 16),
          y: 3,
          size: labelSize,
          font: labelFont,
          color: labelColor,
          opacity: 0.55,
        });
      } catch {
        // ignore
      }
    }
    for (let py = 0; py <= height; py += step) {
      const mm = Math.round(py / MM_TO_PT);
      if (mm % 50 !== 0) {
        continue;
      }
      try {
        page.drawText(`${mm}`, {
          x: 2.2,
          y: Math.min(py + 2, height - 8),
          size: labelSize,
          font: labelFont,
          color: labelColor,
          opacity: 0.55,
        });
      } catch {
        // ignore
      }
    }
  }

  private getCertificateCacheEngine(
    st: CertificateTemplateVersion | null,
  ): 'HTML' | 'PDF_BASE' | 'BUILTIN_HTML' {
    if (!st) {
      return 'BUILTIN_HTML';
    }
    if (st.templateType === CertificateTemplateType.HTML) {
      return 'HTML';
    }
    if (st.templateType === CertificateTemplateType.PDF_BASE) {
      return 'PDF_BASE';
    }
    return 'BUILTIN_HTML';
  }

  private getCertificateCacheParts(
    cert: { issuedAt: Date; verificationCode: string },
    selectedTemplate: CertificateTemplateVersion | null,
    data: {
      studentName: string;
      courseName: string;
      workload: number;
      classId: string;
      cityName: string;
      cityState: string;
      issuerName: string;
    },
    branding: ReturnType<typeof this.resolveCertificateBranding>,
  ): { templateVersionId: string; contentKey: string } {
    const engine = this.getCertificateCacheEngine(selectedTemplate);
    const templateVersionId = selectedTemplate?.id ?? (engine === 'BUILTIN_HTML' ? 'builtin-fallback' : 'unresolved');
    const contentKey = this.certificatePdfCache.buildContentKey({
      templateVersionId,
      templatePdfFileHint: selectedTemplate?.pdfPath ?? null,
      studentName: data.studentName,
      courseName: data.courseName,
      workload: data.workload,
      classIdentifier: data.classId,
      cityName: data.cityName,
      cityState: data.cityState,
      issuedAtIso: new Date(cert.issuedAt).toISOString(),
      issuerName: data.issuerName,
      verificationCode: cert.verificationCode,
      engine,
      institutionId: branding.institutionId,
    });
    return { templateVersionId, contentKey };
  }

  /**
   * Metadados (título, autor, língua), palavras-chave e integridade (HMAC do código) — base para acessibilidade.
   * Não altera após assinatura (chamar antes de PAdES).
   */
  private async applyCertificatePdfMetadataAndIntegrity(
    buffer: Buffer,
    ctx: {
      studentName: string;
      courseName: string;
      issuedAtDisplay: string;
      verificationCode: string;
      /** Instituição emissora (sobrescreve CERT_PDF_METADATA_AUTHOR) */
      pdfAuthor?: string;
    },
  ): Promise<Buffer> {
    try {
      const doc = await PDFDocument.load(new Uint8Array(buffer), { updateMetadata: true });
      const author =
        ctx.pdfAuthor ||
        process.env.CERT_PDF_METADATA_AUTHOR ||
        'Upgrade Tecnologia Educacional LTDA';
      const title = `Certificado de conclusão — ${ctx.studentName}`;
      doc.setTitle(title, { showInWindowTitleBar: true });
      doc.setAuthor(author);
      doc.setSubject(
        `Certificado de conclusão de curso. Aluno: ${ctx.studentName}. ` +
        `Código de verificação: ${ctx.verificationCode}. Emitido em ${ctx.issuedAtDisplay}. ` +
        `Válido para comprovação perante a instituição emissora.`,
      );
      const secret =
        process.env.CERT_PDF_INTEGRITY_SECRET || process.env.JWT_SECRET || 'dev-integrity';
      const integrity = createHmac('sha256', secret).update(ctx.verificationCode, 'utf8').digest('hex');
      doc.setKeywords([
        'certificado',
        'conclusão',
        'qualificação profissional',
        `código:${ctx.verificationCode}`,
        `upg-integrity:${integrity}`,
      ]);
      doc.setCreator('Sistema Cursos Upgrade');
      doc.setProducer('Sistema Cursos Upgrade / Módulo de certificados');
      doc.setLanguage('pt-BR');
      const out = await doc.save({ useObjectStreams: true });
      return Buffer.from(out);
    } catch (e) {
      this.log.warn(
        `Metadados/integridade PDF: ${e instanceof Error ? e.message : String(e)} (buffer original devolvido)`,
      );
      return buffer;
    }
  }

  private async finalizeCertificatePdfOutput(
    verificationCode: string,
    options: { debug?: boolean } | undefined,
    cacheParts: { templateVersionId: string; contentKey: string },
    buffer: Buffer,
    metaCtx: {
      studentName: string;
      courseName: string;
      issuedAtDisplay: string;
      verificationCode: string;
    },
    branding: ReturnType<typeof this.resolveCertificateBranding>,
    signingMode: CertificateSigningMode,
  ): Promise<Buffer> {
    if (options?.debug === true) {
      return buffer;
    }
    let out = await this.applyCertificatePdfMetadataAndIntegrity(buffer, {
      ...metaCtx,
      pdfAuthor: process.env.CERT_PDF_METADATA_AUTHOR?.trim() || branding.name,
    });
    if (this.shouldApplyPades(signingMode)) {
      out = await this.certificatePdfSigning.signPadesIfConfigured(out, this.padesContextFromBranding(branding));
    }
    if (this.certificatePdfCache.isEnabled()) {
      await this.certificatePdfCache.set(verificationCode, cacheParts, out);
    }
    return out;
  }

  /** Pré-visualização: sem cache; mesmos metadados/assinatura que a emissão (código PREVIEW-...). */
  private async finalizePreviewCertificatePdfOutput(
    buffer: Buffer,
    options: { debug?: boolean } | undefined,
    metaCtx: {
      studentName: string;
      courseName: string;
      issuedAtDisplay: string;
      verificationCode: string;
    },
    branding: ReturnType<typeof this.resolveCertificateBranding>,
    signingMode: CertificateSigningMode,
  ): Promise<Buffer> {
    if (options?.debug === true) {
      return buffer;
    }
    let out = await this.applyCertificatePdfMetadataAndIntegrity(buffer, {
      ...metaCtx,
      pdfAuthor: process.env.CERT_PDF_METADATA_AUTHOR?.trim() || branding.name,
    });
    if (this.shouldApplyPades(signingMode)) {
      out = await this.certificatePdfSigning.signPadesIfConfigured(out, this.padesContextFromBranding(branding));
    }
    return out;
  }

  private async loadCertificateBodyFonts(
    pdf: PDFDocument,
  ): Promise<{ fontRegular: PDFFont; fontBold: PDFFont }> {
    const fallbackR = await pdf.embedFont(StandardFonts.Helvetica);
    const fallbackB = await pdf.embedFont(StandardFonts.HelveticaBold);
    const publicRoot = path.resolve(process.cwd(), '../public');
    const regularPath = path.join(
      publicRoot,
      'fonts',
      'Montserrat',
      'static',
      'Montserrat-Regular.ttf',
    );
    const boldPath = path.join(
      publicRoot,
      'fonts',
      'Montserrat',
      'static',
      'Montserrat-Bold.ttf',
    );
    let fontRegular: PDFFont = fallbackR;
    let fontBold: PDFFont = fallbackB;
    try {
      const bytes = await fs.readFile(regularPath);
      try {
        fontRegular = await pdf.embedFont(bytes, { subset: true });
      } catch {
        fontRegular = await pdf.embedFont(bytes);
      }
    } catch {
      this.log.debug('Montserrat Regular ausente; Helvetica no overlay do certificado.');
    }
    try {
      const bytesB = await fs.readFile(boldPath);
      try {
        fontBold = await pdf.embedFont(bytesB, { subset: true });
      } catch {
        fontBold = await pdf.embedFont(bytesB);
      }
    } catch {
      this.log.debug('Montserrat Bold ausente; Helvetica Bold no overlay do certificado.');
    }
    return { fontRegular, fontBold };
  }

  private absolutizePublicAssetUrls(html: string): string {
    const publicDir = path.resolve(process.cwd(), '../public');
    let out = html.replace(
      /(src|href)="\/(?!\/|\/\/)((?:(?!").)+)"/g,
      (_m, attr: string, relPath: string) => {
        const abs = path.join(publicDir, relPath);
        return `${attr}="${pathToFileURL(abs).href}"`;
      },
    );
    out = out.replace(/url\(\s*['"]?\/(?!\/)([^'")]+)['"]?\s*\)/gi, (_m, relPath: string) => {
      const abs = path.join(publicDir, relPath);
      return `url('${pathToFileURL(abs).href}')`;
    });
    return out;
  }

  private parsePdfTextOverrides(raw: unknown): Partial<PdfTextOverrides> | undefined {
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
    const o = raw as Record<string, unknown>;
    const str = (k: string) => (typeof o[k] === 'string' ? (o[k] as string) : undefined);
    const bool = (k: string) => (typeof o[k] === 'boolean' ? (o[k] as boolean) : undefined);
    const signatureModeRaw = str('signatureMode')?.trim().toUpperCase();
    const signatureMode =
      signatureModeRaw === 'AUTO' ||
        signatureModeRaw === 'IMAGE' ||
        signatureModeRaw === 'PADES' ||
        signatureModeRaw === 'BOTH' ||
        signatureModeRaw === 'NONE'
        ? (signatureModeRaw as CertificateSigningMode)
        : undefined;
    const out: Partial<PdfTextOverrides> = {
      courseName: str('courseName'),
      paragraphTemplate: str('paragraphTemplate'),
      line1Prefix: str('line1Prefix'),
      line1Suffix: str('line1Suffix'),
      line2: str('line2'),
      line3: str('line3'),
      dateTemplate: str('dateTemplate'),
      page2WorkloadTemplate: str('page2WorkloadTemplate'),
      useBodyWhiteMask: bool('useBodyWhiteMask'),
      usePage2TitleWhiteMask: bool('usePage2TitleWhiteMask'),
      drawHeaderNameAndDetails: bool('drawHeaderNameAndDetails'),
      syllabusTitleContent: str('syllabusTitleContent'),
      syllabusWorkloadContent: str('syllabusWorkloadContent'),
      syllabusDescContent: str('syllabusDescContent'),
      /** QR nas páginas: true = mostrar (default pág1=true, pág2=false) */
      qrPage1: bool('qrPage1'),
      qrPage2: bool('qrPage2'),
      signatureMode,
      signatureImagePath: str('signatureImagePath')?.trim() || undefined,
    };
    const hasText = !!(
      out.courseName?.trim() ||
      out.line1Prefix ||
      out.line1Suffix ||
      out.line2 ||
      out.line3 ||
      out.paragraphTemplate ||
      out.dateTemplate ||
      out.page2WorkloadTemplate ||
      out.syllabusTitleContent ||
      out.syllabusWorkloadContent ||
      out.syllabusDescContent
    );
    const hasBools = [
      'useBodyWhiteMask',
      'usePage2TitleWhiteMask',
      'drawHeaderNameAndDetails',
      'qrPage1',
      'qrPage2',
    ].some((k) => o[k] !== undefined && o[k] !== null);
    const hasSignatureConfig = !!(out.signatureMode || out.signatureImagePath);
    if (!hasText && !hasBools && !hasSignatureConfig) return undefined;
    return out;
  }

  private drawRichText(
    page: PDFPage,
    text: string,
    options: { x: number; y: number; maxWidth: number; size: number; lineHeight: number; fontRegular: any; fontBold: any; color: any }
  ) {
    const { x, y, maxWidth, size, lineHeight, fontRegular, fontBold, color } = options;
    const maxRight = x + maxWidth;
    const paragraphs = text.split('\n');
    let currentY = y;

    for (const paragraph of paragraphs) {
      // Split text by markdown bold `**text**` — currentX flui entre partes (antes cada parte reiniciava em x)
      const parts = paragraph.split(/(\*\*.*?\*\*)/g);
      let currentX = x;

      for (const part of parts) {
        if (!part) continue;
        const isBold = part.startsWith('**') && part.endsWith('**');
        const textToDraw = isBold ? part.slice(2, -2) : part;
        const font = isBold ? fontBold : fontRegular;

        const tokens = textToDraw.match(/(\S+|\s+)/g) || [];

        for (const token of tokens) {
          const wordWidth = font.widthOfTextAtSize(token, size);

          if (token.trim() && currentX + wordWidth > maxRight && currentX > x) {
            currentX = x;
            currentY -= lineHeight;
          }

          if (!token.trim()) {
            currentX += wordWidth;
            continue;
          }

          if (currentX + wordWidth <= maxRight) {
            page.drawText(token, { x: currentX, y: currentY, size, font, color });
            currentX += wordWidth;
          } else {
            for (let i = 0; i < token.length; i++) {
              const ch = token[i];
              const cw = font.widthOfTextAtSize(ch, size);
              if (ch.trim() && currentX + cw > maxRight && currentX > x) {
                currentX = x;
                currentY -= lineHeight;
              }
              page.drawText(ch, { x: currentX, y: currentY, size, font, color });
              currentX += cw;
            }
          }
        }
      }
      currentY -= lineHeight;
    }
    return currentY;
  }

  private async generateCertificateFromOfficialTemplate(
    data: {
      studentName: string;
      courseName: string;
      workload: number;
      syllabus: string | null;
      cityName: string;
      cityState: string;
      issuedAt: string;
      verificationCode: string;
      qrDataUrl: string;
    },
    preferredTemplatePath?: string,
    pdfTextOverrides?: Partial<PdfTextOverrides>,
    coordinateOverrides?: CertificateCoordinateOverrides | null,
    opts?: { debug?: boolean, isVisualEditor?: boolean },
  ): Promise<Buffer> {
    const debug = opts?.debug === true;
    const isVisualEditor = opts?.isVisualEditor === true;
    const c = coordinateOverrides ?? null;
    const templatePath = await this.resolveCertificateTemplatePath(preferredTemplatePath);
    if (!templatePath) {
      const msg = `PDF_BASE não encontrado. Preferido: ${preferredTemplatePath ?? '—'}`;
      this.log.error(msg);
      throw new BadRequestException(
        'PDF base do modelo não encontrado no disco. Verifique o ficheiro em public/ e o caminho configurado.',
      );
    }

    try {
      const source = await fs.readFile(templatePath);
      let pdf: PDFDocument;
      let firstPage: PDFPage;
      let pages: PDFPage[] = [];
      const ext = require('node:path').extname(templatePath).toLowerCase();

      if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
        pdf = await PDFDocument.create();
        // A4 landscape in points (11.69 * 72 x 8.27 * 72)
        const page = pdf.addPage([841.89, 595.28]);
        let image;
        if (ext === '.png') {
          image = await pdf.embedPng(source);
        } else {
          image = await pdf.embedJpg(source);
        }
        page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
        firstPage = page;
        pages = [page];

        // Try to find and append verso (back) image
        const basePath = templatePath.substring(0, templatePath.lastIndexOf('.'));
        const versoPathJpg = `${basePath}-verso.jpg`;
        const versoPathJpeg = `${basePath}-verso.jpeg`;
        const versoPathPng = `${basePath}-verso.png`;
        let versoSource: Buffer | null = null;
        let versoExt = '';

        try { versoSource = await fs.readFile(versoPathPng); versoExt = '.png'; } catch { }
        if (!versoSource) try { versoSource = await fs.readFile(versoPathJpg); versoExt = '.jpg'; } catch { }
        if (!versoSource) try { versoSource = await fs.readFile(versoPathJpeg); versoExt = '.jpeg'; } catch { }

        if (versoSource) {
          const versoPage = pdf.addPage([841.89, 595.28]);
          let versoImage;
          if (versoExt === '.png') {
            versoImage = await pdf.embedPng(versoSource);
          } else {
            versoImage = await pdf.embedJpg(versoSource);
          }
          versoPage.drawImage(versoImage, { x: 0, y: 0, width: versoPage.getWidth(), height: versoPage.getHeight() });
          pages.push(versoPage);
        }
      } else {
        pdf = await PDFDocument.load(source);
        pages = pdf.getPages();
        if (pages.length === 0) {
          throw new BadRequestException('O PDF base não contém páginas válidas.');
        }
        firstPage = pages[0];
      }
      const { width, height: page1Height } = firstPage.getSize();
      const { fontRegular, fontBold } = await this.loadCertificateBodyFonts(pdf);
      const qrImage = await pdf.embedPng(this.dataUrlToBytes(data.qrDataUrl));

      // Coordenadas: certificateTemplateVersion.coordinateOverrides > ENV
      const nameY = this.coord(c, 'nameY', 'CERT_TEMPLATE_NAME_Y', 255);
      const nameSize = this.coord(c, 'nameSize', 'CERT_TEMPLATE_NAME_SIZE', 24);
      const detailsY = this.coord(c, 'detailsY', 'CERT_TEMPLATE_DETAILS_Y', 212);
      const detailsSize = this.coord(c, 'detailsSize', 'CERT_TEMPLATE_DETAILS_SIZE', 11);
      const qrSize = this.coord(c, 'qrSize', 'CERT_TEMPLATE_QR_SIZE', 64);
      const defaultQrX = width - qrSize - 36;
      const qrX = c?.qrX != null && Number.isFinite(c.qrX) ? c.qrX : this.getNumericEnv('CERT_TEMPLATE_QR_X', defaultQrX);
      const qrY = this.coord(c, 'qrY', 'CERT_TEMPLATE_QR_Y', 28);

      const p = pdfTextOverrides;
      const effectiveCourseName =
        typeof p?.courseName === 'string' && p.courseName.trim().length > 0 ? p.courseName.trim() : data.courseName;
      const useBodyWhite = p?.useBodyWhiteMask === true;
      const useP2White = p?.usePage2TitleWhiteMask === true;
      const drawHeader = p?.drawHeaderNameAndDetails !== false;

      let nameBoxLeft = 0;
      let nameBoxW = 0;
      let detailsBoxLeft = 0;
      let detailsBoxW = 0;
      if (drawHeader && !isVisualEditor) {
        const studentNameUpper = data.studentName.toUpperCase();
        nameBoxW = fontBold.widthOfTextAtSize(studentNameUpper, nameSize);
        const centerX = c?.nameX != null && Number.isFinite(c.nameX) ? c.nameX : width / 2;
        nameBoxLeft = Math.max(centerX - nameBoxW / 2, 24);
        firstPage.drawText(studentNameUpper, {
          x: nameBoxLeft,
          y: nameY,
          size: nameSize,
          font: fontBold,
          color: rgb(0.09, 0.09, 0.09),
        });

        const details = `${data.courseName} • ${data.workload}h • ${data.cityName}/${data.cityState} • ${data.issuedAt}`;
        detailsBoxW = fontRegular.widthOfTextAtSize(details, detailsSize);
        detailsBoxLeft = Math.max((width - detailsBoxW) / 2, 24);
        firstPage.drawText(details, {
          x: detailsBoxLeft,
          y: detailsY,
          size: detailsSize,
          font: fontRegular,
          color: rgb(0.2, 0.2, 0.2),
        });
      }

      const paragraphX = this.coord(c, 'paragraphX', 'CERT_TEMPLATE_PARAGRAPH_X', 95);
      const paragraphY = this.coord(c, 'paragraphY', 'CERT_TEMPLATE_PARAGRAPH_Y', 220);
      const paragraphW = this.coord(c, 'paragraphW', 'CERT_TEMPLATE_PARAGRAPH_W', 700);
      const paragraphH = this.coord(c, 'paragraphH', 'CERT_TEMPLATE_PARAGRAPH_H', 165);
      if (useBodyWhite) {
        firstPage.drawRectangle({
          x: paragraphX,
          y: paragraphY,
          width: paragraphW,
          height: paragraphH,
          color: rgb(1, 1, 1),
        });
      }
      const bodySize = this.coord(c, 'bodyTextSize', 'CERT_TEMPLATE_BODY_TEXT_SIZE', 17);
      const bodyColor = rgb(0.1, 0.1, 0.1);
      const line1Y =
        c?.line1Y != null && Number.isFinite(c.line1Y)
          ? c.line1Y
          : this.getNumericEnv('CERT_TEMPLATE_LINE1_Y', paragraphY + 108);
      const line2Y =
        c?.line2Y != null && Number.isFinite(c.line2Y)
          ? c.line2Y
          : this.getNumericEnv('CERT_TEMPLATE_LINE2_Y', paragraphY + 78);
      const line3Y =
        c?.line3Y != null && Number.isFinite(c.line3Y)
          ? c.line3Y
          : this.getNumericEnv('CERT_TEMPLATE_LINE3_Y', paragraphY + 48);

      if (p?.paragraphTemplate && !isVisualEditor) {
        let text = p.paragraphTemplate;
        text = text.replace(/{{ALUNO_NOME}}/g, data.studentName);
        text = text.replace(/{{CURSO}}/g, `**${effectiveCourseName.toUpperCase()}**`);
        text = text.replace(/{{CARGA_HORARIA}}/g, String(data.workload));
        text = text.replace(/{{CIDADE}}/g, data.cityName);
        text = text.replace(/{{UF}}/g, data.cityState);

        this.drawRichText(firstPage, text, {
          x: paragraphX,
          y: line1Y,
          maxWidth: paragraphW - 20,
          size: bodySize,
          lineHeight: bodySize * 1.5,
          fontRegular,
          fontBold,
          color: bodyColor,
        });

        if (p?.dateTemplate) {
          let dateText = p.dateTemplate;
          dateText = dateText.replace(/{{CIDADE}}/g, data.cityName);
          dateText = dateText.replace(/{{UF}}/g, data.cityState);
          dateText = dateText.replace(/{{DATA_EXTENSO}}/g, data.issuedAt);

          const dateY = c?.dateY ?? line3Y - 40;
          const dateSize = c?.dateSize ?? 12;
          const dateX = c?.dateX ?? paragraphX;
          firstPage.drawText(dateText, {
            x: dateX,
            y: dateY,
            size: dateSize,
            font: fontBold,
            color: rgb(0.1, 0.1, 0.1),
          });
        }
      } else if ((p?.line1Prefix || p?.line1Suffix || p?.line2 || p?.line3) && !isVisualEditor) {
        const line1Prefix = p?.line1Prefix ?? '';
        const line1Course = `CURSO DE ${data.courseName.toUpperCase()}`;
        const line1Suffix = p?.line1Suffix ?? '';
        const defaultLine2 =
          data.cityState?.trim().toUpperCase() === 'PI'
            ? 'Piauí, por meio da Secretaria de Estado da Educação, executado'
            : 'Maranhão, por meio da Secretaria de Estado da Educação - SEDUC, executado';
        const line2 = p?.line2 ?? defaultLine2;
        const line3 =
          p?.line3 ??
          `pela Upgrade Tecnologia Educacional LTDA, com carga horária de ${data.workload}h/aulas`;

        firstPage.drawText(line1Prefix, {
          x: paragraphX,
          y: line1Y,
          size: bodySize,
          font: fontRegular,
          color: bodyColor,
        });
        const prefixWidth = fontRegular.widthOfTextAtSize(line1Prefix, bodySize);
        firstPage.drawText(line1Course, {
          x: paragraphX + prefixWidth,
          y: line1Y,
          size: bodySize,
          font: fontBold,
          color: bodyColor,
        });
        const courseWidth = fontBold.widthOfTextAtSize(line1Course, bodySize);
        firstPage.drawText(line1Suffix, {
          x: paragraphX + prefixWidth + courseWidth,
          y: line1Y,
          size: bodySize,
          font: fontRegular,
          color: bodyColor,
        });

        firstPage.drawText(line2, {
          x: paragraphX,
          y: line2Y,
          size: bodySize,
          font: fontRegular,
          color: bodyColor,
        });
        firstPage.drawText(line3, {
          x: paragraphX,
          y: line3Y,
          size: bodySize,
          font: fontRegular,
          color: bodyColor,
        });
      }

      // ── QR Code Pág. 1 ──────────────────────────────────────────────────
      // qrPage1 é true por defeito — só salta se explicitamente false
      if (p?.qrPage1 !== false) {
        firstPage.drawImage(qrImage, {
          x: qrX,
          y: qrY,
          width: qrSize,
          height: qrSize,
        });

        // Texto do código de verificação: apenas no PDF real (não no editor visual)
        const codeY = Math.max(qrY - 12, 8);
        if (!isVisualEditor) {
          firstPage.drawText(`Codigo: ${data.verificationCode}`, {
            x: qrX - 12,
            y: codeY,
            size: 8,
            font: fontRegular,
            color: rgb(0.18, 0.18, 0.18),
          });
        }

        if (debug) {
          this.drawDebugFieldRect(firstPage, qrX, qrY, qrSize, qrSize);
          const codeYdbg = Math.max(qrY - 12, 8);
          this.drawDebugFieldRect(firstPage, qrX - 14, codeYdbg - 2, 200, 9);
        }
      }

      const signMode = this.resolveSigningMode(p);
      if (this.shouldApplySignatureImage(signMode)) {
        const sign = await this.tryLoadSignatureImageBytes(p?.signatureImagePath);
        if (sign) {
          const signX = this.getNumericEnv('CERT_TEMPLATE_SIGNATURE_X', 130);
          const signY = this.getNumericEnv('CERT_TEMPLATE_SIGNATURE_Y', 54);
          const signW = this.getNumericEnv('CERT_TEMPLATE_SIGNATURE_W', 180);
          const signH = this.getNumericEnv('CERT_TEMPLATE_SIGNATURE_H', 52);
          try {
            const img =
              sign.ext === 'png' ? await pdf.embedPng(sign.bytes) : await pdf.embedJpg(sign.bytes);
            firstPage.drawImage(img, {
              x: signX,
              y: signY,
              width: signW,
              height: signH,
              opacity: 0.95,
            });
            if (debug) {
              this.drawDebugFieldRect(firstPage, signX, signY, signW, signH);
            }
          } catch (e) {
            this.log.warn(`Falha ao desenhar assinatura por imagem: ${e instanceof Error ? e.message : String(e)}`);
          }
        } else if (signMode === 'IMAGE' || signMode === 'BOTH') {
          this.log.warn('signatureMode requer assinatura por imagem, mas nenhum ficheiro foi carregado.');
        }
      }

      if (debug) {
        const lineColW = Math.max(Math.min(paragraphW - 20, width - paragraphX - 24), 8);
        if (drawHeader) {
          this.drawDebugFieldRect(firstPage, nameBoxLeft, nameY, nameBoxW, nameSize * 1.12);
          this.drawDebugFieldRect(firstPage, detailsBoxLeft, detailsY, detailsBoxW, detailsSize * 1.12);
        }
        this.drawDebugFieldRect(firstPage, paragraphX, paragraphY, paragraphW, paragraphH);
        this.drawDebugFieldRect(firstPage, paragraphX, line1Y, lineColW, bodySize * 1.2);
        this.drawDebugFieldRect(firstPage, paragraphX, line2Y, lineColW, bodySize * 1.2);
        this.drawDebugFieldRect(firstPage, paragraphX, line3Y, lineColW, bodySize * 1.2);
        this.drawDebugMillimeterGrid(firstPage, width, page1Height, fontRegular);
      }


      // Página 2: título do conteúdo programático também recebe o nome dinâmico do curso.
      if (pages.length > 1) {
        const secondPage = pages[1];
        const p2CourseBoxX = this.coord(c, 'p2CourseBoxX', 'CERT_TEMPLATE_P2_COURSE_BOX_X', 421);
        const p2CourseBoxY = this.coord(c, 'p2CourseBoxY', 'CERT_TEMPLATE_P2_COURSE_BOX_Y', 515);
        const p2CourseBoxW = this.coord(c, 'p2CourseBoxW', 'CERT_TEMPLATE_P2_COURSE_BOX_W', 350);
        const p2CourseBoxH = this.coord(c, 'p2CourseBoxH', 'CERT_TEMPLATE_P2_COURSE_BOX_H', 44);
        const p2CourseTextSize = this.coord(c, 'p2CourseTextSize', 'CERT_TEMPLATE_P2_COURSE_TEXT_SIZE', 15);

        if (useP2White) {
          secondPage.drawRectangle({
            x: p2CourseBoxX - (p2CourseBoxW / 2),
            y: p2CourseBoxY - 13,
            width: p2CourseBoxW,
            height: p2CourseBoxH,
            color: rgb(1, 1, 1),
          });
        }
        if (!isVisualEditor) {
          const p2CourseText = `CURSO DE ${effectiveCourseName.toUpperCase()}`;
          const p2CourseTextWidth = fontBold.widthOfTextAtSize(p2CourseText, p2CourseTextSize);
          const p2CourseLeftX = p2CourseBoxX - (p2CourseTextWidth / 2);
          secondPage.drawText(p2CourseText, {
            x: p2CourseLeftX,
            y: p2CourseBoxY,
            size: p2CourseTextSize,
            font: fontBold,
            color: rgb(0.08, 0.08, 0.08),
          });
        }

        // ── QR Code Pág. 2 ──────────────────────────────────────────────────
        if (p?.qrPage2 === true && !isVisualEditor) {
          const p2QrSize = c?.p2QrSize != null && Number.isFinite(c.p2QrSize) ? c.p2QrSize : 64;
          const p2QrX = c?.p2QrX != null && Number.isFinite(c.p2QrX) ? c.p2QrX : 40;
          const p2QrY = c?.p2QrY != null && Number.isFinite(c.p2QrY) ? c.p2QrY : 40;
          secondPage.drawImage(qrImage, {
            x: p2QrX,
            y: p2QrY,
            width: p2QrSize,
            height: p2QrSize,
          });
          const p2CodeY = Math.max(p2QrY - 12, 8);
          secondPage.drawText(`Codigo: ${data.verificationCode}`, {
            x: p2QrX - 12,
            y: p2CodeY,
            size: 8,
            font: fontRegular,
            color: rgb(0.18, 0.18, 0.18),
          });
          if (debug) {
            this.drawDebugFieldRect(secondPage, p2QrX, p2QrY, p2QrSize, p2QrSize);
          }
        }

        if ((p?.syllabusTitleContent || p?.syllabusWorkloadContent || p?.syllabusDescContent) && !isVisualEditor) {
          // ── Suporte a múltiplos blocos separados por \n§§§\n ──────────────────
          // Retrocompatível: strings sem '§§§' = 1 bloco (comportamento anterior)
          const BLOCK_SEP = '\n§§§\n';
          const splitBlocks = (raw: string) => raw.split(BLOCK_SEP);

          const titleBlocks = splitBlocks(p?.syllabusTitleContent ?? '');
          const workloadBlocks = splitBlocks(p?.syllabusWorkloadContent ?? '');
          const descBlocks = splitBlocks(p?.syllabusDescContent ?? '');
          const numBlocks = Math.max(titleBlocks.length, workloadBlocks.length, descBlocks.length);

          let startY = c?.syllabusY ?? 510;
          const col1X = c?.syllabusCol1X ?? 40;
          const col2X = c?.syllabusCol2X ?? 290;
          const col3X = c?.syllabusCol3X ?? 350;
          const col1W = c?.syllabusCol1W ?? 230;
          const col3W = c?.syllabusCol3W ?? 450;
          const globalTextSize = c?.syllabusTextSize ?? 10;
          // Limite inferior: não deixar texto encavalhar no rodapé
          const BOTTOM_LIMIT = 30;

          const baseY = c?.syllabusY ?? 510;

          for (let b = 0; b < numBlocks; b++) {
            const blockTitles = (titleBlocks[b] ?? '').split('\n');
            const blockWorkloads = (workloadBlocks[b] ?? '').split('\n');
            const blockDescs = (descBlocks[b] ?? '').split('\n');
            const maxLines = Math.max(blockTitles.length, blockWorkloads.length, blockDescs.length);

            const blockSizeKey = `syllabusBlock${b}Size` as keyof typeof c;
            const textSize =
              c && c[blockSizeKey] != null && Number.isFinite(Number(c[blockSizeKey]))
                ? Number(c[blockSizeKey])
                : globalTextSize;
            const lineHeight = textSize * 1.8;

            // Usa o Y arrastado pelo usuário no editor visual; senão calcula automaticamente
            const blockYKey = `syllabusBlock${b}Y` as keyof typeof c;
            const customBlockY = c && c[blockYKey] != null && Number.isFinite(Number(c[blockYKey]))
              ? Number(c[blockYKey])
              : null;
            let startY = customBlockY ?? Math.round(baseY - b * lineHeight * 3);

            for (let i = 0; i < maxLines; i++) {
              if (startY < BOTTOM_LIMIT) break; // proteção anti-rodapé
              let finalY1 = startY;
              let finalY3 = startY;

              if (blockTitles[i] && blockTitles[i].trim() !== '') {
                finalY1 = this.drawRichText(secondPage, blockTitles[i].trim(), {
                  x: col1X, y: startY, maxWidth: col1W, size: textSize,
                  lineHeight: textSize * 1.3, fontRegular, fontBold, color: rgb(0.2, 0.2, 0.2),
                });
              }
              if (blockWorkloads[i] && blockWorkloads[i].trim() !== '') {
                secondPage.drawText(blockWorkloads[i].trim(), {
                  x: col2X, y: startY, size: textSize + 1, font: fontBold, color: rgb(0.05, 0.05, 0.05),
                });
              }
              if (blockDescs[i] && blockDescs[i].trim() !== '') {
                finalY3 = this.drawRichText(secondPage, blockDescs[i].trim(), {
                  x: col3X, y: startY, maxWidth: col3W, size: textSize,
                  lineHeight: textSize * 1.3, fontRegular, fontBold, color: rgb(0.2, 0.2, 0.2),
                });
              }

              // avança Y pelo maior conteúdo da linha + padding entre linhas
              startY = Math.min(finalY1, finalY3) - (textSize * 0.5);
            }
          }
        }

        if (p?.page2WorkloadTemplate && !isVisualEditor) {
          let wlText = p.page2WorkloadTemplate;
          wlText = wlText.replace(/{{CARGA_HORARIA}}/g, String(data.workload));
          const { width: page2W } = secondPage.getSize();
          const p2WlW = c?.p2WorkloadW ?? 520;
          const p2WlSize = c?.p2WorkloadSize ?? 14;
          const p2WlX = c?.p2WorkloadX ?? Math.round((page2W - p2WlW) / 2);
          const p2WlY = c?.p2WorkloadY ?? 80;

          this.drawRichText(secondPage, wlText, {
            x: p2WlX,
            y: p2WlY,
            maxWidth: p2WlW,
            size: p2WlSize,
            lineHeight: p2WlSize * 1.35,
            fontRegular,
            fontBold,
            color: rgb(0.1, 0.1, 0.1),
          });
        }

        if (debug) {
          this.drawDebugFieldRect(secondPage, p2CourseBoxX, p2CourseBoxY, p2CourseBoxW, p2CourseBoxH);
          const { width: w2, height: h2 } = secondPage.getSize();
          this.drawDebugMillimeterGrid(secondPage, w2, h2, fontRegular);
        }
      }

      const output = await pdf.save({ useObjectStreams: true });
      return Buffer.from(output);
    } catch (e) {
      this.log.error(
        `Falha ao processar PDF_BASE (${templatePath}): ${e instanceof Error ? e.message : String(e)}`,
      );
      throw new BadRequestException(
        'Falha ao processar o PDF base. Verifique se o ficheiro é um PDF válido e se as coordenadas estão corretas.',
      );
    }
  }

  private async resolveCertificateTemplatePath(preferredTemplatePath?: string): Promise<string | null> {
    const configuredPath = process.env.CERTIFICATE_TEMPLATE_PATH;
    const configuredAbsolutePath = configuredPath
      ? path.isAbsolute(configuredPath)
        ? configuredPath
        : path.resolve(process.cwd(), configuredPath)
      : undefined;
    const resolvedPreferred = preferredTemplatePath
      ? path.isAbsolute(preferredTemplatePath)
        ? preferredTemplatePath
        : path.resolve(process.cwd(), '../public', preferredTemplatePath)
      : undefined;

    const candidates = [
      resolvedPreferred,
      configuredAbsolutePath,
      path.resolve(process.cwd(), 'public/templates/certificate-template.pdf'),
      path.resolve(process.cwd(), '../public/templates/certificate-template.pdf'),
      path.resolve(process.cwd(), `../public/${this.DEFAULT_TEMPLATE_FILE}`),
    ].filter((candidate): candidate is string => !!candidate && candidate.trim().length > 0);

    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        // tenta próximo caminho
      }
    }
    return null;
  }

  async getOfficialCertificateTemplatePath(state?: string): Promise<string> {
    const normalizedState = state?.trim().toUpperCase() || undefined;
    // Tenta resolver pelo estado específico primeiro; cai no GLOBAL se não encontrar
    const selected =
      normalizedState
        ? (await this.templateService.resolvePublishedTemplate(undefined, normalizedState)) ??
          (await this.templateService.resolvePublishedTemplate(undefined, undefined))
        : await this.templateService.resolvePublishedTemplate(undefined, undefined);
    const templatePath = await this.resolveCertificateTemplatePath(selected?.pdfPath ?? undefined);
    if (!templatePath) {
      throw new NotFoundException(
        normalizedState
          ? `Template oficial de certificado não encontrado para UF: ${normalizedState}`
          : 'Template oficial de certificado não encontrado',
      );
    }
    return templatePath;
  }

  private dataUrlToBytes(dataUrl: string): Uint8Array {
    const comma = dataUrl.indexOf(',');
    const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
    return Uint8Array.from(Buffer.from(base64, 'base64'));
  }

  private resolveSigningMode(overrides?: Partial<PdfTextOverrides>): CertificateSigningMode {
    return overrides?.signatureMode ?? 'AUTO';
  }

  private shouldApplyPades(mode: CertificateSigningMode): boolean {
    return mode === 'AUTO' || mode === 'PADES' || mode === 'BOTH';
  }

  private shouldApplySignatureImage(mode: CertificateSigningMode): boolean {
    return mode === 'AUTO' || mode === 'IMAGE' || mode === 'BOTH';
  }

  private async tryLoadSignatureImageBytes(
    configuredPath: string | undefined,
  ): Promise<{ bytes: Buffer; ext: 'png' | 'jpg' } | null> {
    const envPath = process.env.CERT_TEMPLATE_SIGNATURE_IMAGE_PATH?.trim();
    const p = configuredPath?.trim() || envPath;
    if (!p) return null;
    const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
    try {
      const bytes = await fs.readFile(abs);
      const l = abs.toLowerCase();
      const ext: 'png' | 'jpg' = l.endsWith('.png') ? 'png' : 'jpg';
      return { bytes, ext };
    } catch {
      this.log.warn(`Assinatura por imagem não encontrada em ${abs}; seguindo sem imagem.`);
      return null;
    }
  }

  private getNumericEnv(name: string, fallback: number): number {
    const raw = process.env[name];
    if (!raw) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  }

  /**
   * Largura em pixels do PNG do QR (antes de encaixar no PDF/HTML).
   * Valores maiores = mais nítido na impressão; default 520px (antes 120).
   * Override: `CERTIFICATE_QR_PNG_WIDTH` (180–900).
   */
  private getCertificateQrPngWidth(): number {
    return Math.min(900, Math.max(180, this.getNumericEnv('CERTIFICATE_QR_PNG_WIDTH', 520)));
  }

  /**
   * Escala de dispositivo no Chromium ao rasterizar o certificado (logos, QR no HTML, sombras).
   * Default 2 (≈ o dobro de amostras por CSS px). Override: `CERTIFICATE_PDF_DEVICE_SCALE_FACTOR` (1–3).
   */
  private getCertificatePdfDeviceScaleFactor(): number {
    return Math.min(3, Math.max(1, this.getNumericEnv('CERTIFICATE_PDF_DEVICE_SCALE_FACTOR', 2)));
  }

  private async buildCertificateQrDataUrl(verifyUrl: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const QRCode = require('qrcode');
    const width = this.getCertificateQrPngWidth();
    return QRCode.toDataURL(verifyUrl, {
      width,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#111827', light: '#FFFFFF' },
    });
  }

  /** Viewport alinhado a A4 paisagem + DPR para exportação com melhor qualidade de impressão. */
  private async configureCertificatePdfPage(page: import('puppeteer').Page): Promise<void> {
    await page.setViewport({
      width: CERTIFICATE_A4_LANDSCAPE_VIEWPORT.width,
      height: CERTIFICATE_A4_LANDSCAPE_VIEWPORT.height,
      deviceScaleFactor: this.getCertificatePdfDeviceScaleFactor(),
    });
  }

  private async waitForCertificateFonts(page: import('puppeteer').Page): Promise<void> {
    try {
      await page.evaluate(async () => {
        const fonts = (document as unknown as { fonts?: { ready?: Promise<void> } }).fonts;
        if (fonts?.ready) await fonts.ready;
      });
    } catch {
      /* Font Loading API opcional */
    }
  }

  /** Opções comuns de `page.pdf` para certificados (fundo, margens zero, PDF etiquetado). */
  private getCertificatePuppeteerPdfOptions(opts?: { preferCSSPageSize?: boolean }) {
    return {
      format: 'A4' as const,
      landscape: true,
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      tagged: true,
      ...(opts?.preferCSSPageSize ? { preferCSSPageSize: true as const } : {}),
    };
  }

  private renderTemplateHtml(htmlContent: string, cssContent: string | null | undefined, vars: Record<string, string>) {
    let content = htmlContent;
    Object.entries(vars).forEach(([key, value]) => {
      content = content.replaceAll(`{{${key}}}`, value ?? '');
    });
    if (!cssContent?.trim()) return content;
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><style>${cssContent}</style></head><body>${content}</body></html>`;
  }

  private async htmlToLandscapePdf(html: string): Promise<Buffer> {
    return this.puppeteerCertificateGate.use(async () => {
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
          '--no-first-run', '--no-zygote',
        ],
      });
      try {
        const page = await browser.newPage();
        await this.configureCertificatePdfPage(page);
        const htmlForRender = this.absolutizePublicAssetUrls(html);
        const timeout = this.getNumericEnv('PUPPETEER_SETCONTENT_TIMEOUT_MS', 60000);
        await page.setContent(htmlForRender, {
          waitUntil: 'load',
          timeout,
        });
        await this.waitForCertificateFonts(page);
        const pdf = await page.pdf(this.getCertificatePuppeteerPdfOptions({ preferCSSPageSize: true }));
        return Buffer.from(pdf);
      } finally {
        await browser.close();
      }
    });
  }

  private buildCertificateHtml(
    data: {
      studentName: string;
      courseName: string;
      workload: number;
      classId: string;
      cityName: string;
      cityState: string;
      issuerName: string;
      issuedAt: string;
      verificationCode: string;
      qrDataUrl: string;
    },
    branding: ReturnType<typeof this.resolveCertificateBranding>,
  ): string {
    const {
      studentName,
      courseName,
      workload,
      classId,
      cityName,
      cityState,
      issuerName,
      issuedAt,
      verificationCode,
      qrDataUrl,
    } = data;
    const { displayName, logoUrl, primaryColor, accentColor, siteUrl } = branding;
    const initials = (displayName.replace(/[^A-Za-zÀ-ÿ0-9 ]/g, '') || 'UG').slice(0, 2).toUpperCase() || 'UG';
    const wm = displayName.slice(0, 12).toUpperCase() || 'INSTITUIÇÃO';
    const instSite = siteUrl
      ? `<a href="${siteUrl}" style="color:inherit;text-decoration:none">${displayName}</a>`
      : displayName;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @font-face {
      font-family: 'Montserrat';
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: url('/fonts/Montserrat/static/Montserrat-Regular.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Montserrat';
      font-style: normal;
      font-weight: 700;
      font-display: swap;
      src: url('/fonts/Montserrat/static/Montserrat-Bold.ttf') format('truetype');
    }
    body {
      width: 297mm; height: 210mm;
      background: #fff;
      font-family: 'Montserrat', Arial, 'Helvetica Neue', sans-serif;
      overflow: hidden;
    }
    .cert {
      width: 297mm; height: 210mm;
      position: relative;
      background: linear-gradient(135deg, #FFFDE7 0%, #FFFFFF 50%, #F0F9FF 100%);
      display: flex; flex-direction: column;
    }
    .border-outer { position: absolute; inset: 6mm; border: 3px solid ${primaryColor}; border-radius: 4px; pointer-events: none; }
    .border-inner { position: absolute; inset: 9mm; border: 1px solid ${accentColor}; border-radius: 2px; pointer-events: none; }
    .corner { position: absolute; width: 20mm; height: 20mm; border-color: ${accentColor}; border-style: solid; }
    .corner-tl { top: 11mm; left: 11mm; border-width: 3px 0 0 3px; }
    .corner-tr { top: 11mm; right: 11mm; border-width: 3px 3px 0 0; }
    .corner-bl { bottom: 11mm; left: 11mm; border-width: 0 0 3px 3px; }
    .corner-br { bottom: 11mm; right: 11mm; border-width: 0 3px 3px 0; }
    .content { position: relative; z-index: 10; padding: 14mm 20mm 8mm; display: flex; flex-direction: column; height: 100%; }
    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-35deg); font-size: 80px; font-weight: 900; color: ${accentColor}0f; white-space: nowrap; letter-spacing: 8px; pointer-events: none; z-index: 1; }
    .logos-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5mm; }
    .logo-box { border: 1.5px solid ${primaryColor}40; border-radius: 6px; padding: 4px 10px; font-size: 8px; font-weight: 700; color: ${primaryColor}; letter-spacing: 1px; display: flex; align-items: center; gap: 6px; }
    .logo-circle { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 900; }
    .inst-logo { max-height: 40px; max-width: 150px; object-fit: contain; }
    .cert-title { text-align: center; font-size: 28px; font-weight: 900; color: ${primaryColor}; letter-spacing: 8px; text-transform: uppercase; margin-bottom: 1mm; }
    .cert-subtitle { text-align: center; font-size: 10px; font-weight: 600; color: #B89B00; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 4mm; }
    .divider { width: 80mm; height: 2px; background: linear-gradient(90deg, transparent, ${accentColor}, ${primaryColor}, ${accentColor}, transparent); margin: 0 auto 4mm; }
    .body-text { text-align: center; font-size: 11px; color: #374151; margin-bottom: 2mm; line-height: 1.6; }
    .student-name { text-align: center; font-size: 24px; font-weight: 700; color: ${primaryColor}; margin: 2mm 0; border-bottom: 1.5px solid ${primaryColor}33; padding-bottom: 2mm; }
    .course-name { text-align: center; font-size: 16px; font-weight: 700; color: #B89B00; margin: 2mm 0; }
    .details { text-align: center; font-size: 10px; color: #6B7280; margin-bottom: 3mm; }
    .footer-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; padding-top: 3mm; }
    .signature-block { text-align: center; flex: 1; }
    .signature-line { width: 50mm; height: 1px; background: ${primaryColor}; margin: 0 auto 2mm; }
    .signature-name { font-size: 9px; font-weight: 700; color: ${primaryColor}; }
    .signature-role { font-size: 8px; color: #9CA3AF; }
    .qr-block { display: flex; flex-direction: column; align-items: center; gap: 2mm; }
    .qr-block img { width: 22mm; height: 22mm; }
    .qr-text { font-size: 6px; color: #9CA3AF; font-family: 'Courier New', monospace; text-align: center; }
    .bottom-bar { height: 5px; background: linear-gradient(90deg, ${primaryColor}, ${accentColor}, ${primaryColor}); margin-top: 2mm; }
  </style>
</head>
<body>
<div class="cert">
  <div class="border-outer"></div>
  <div class="border-inner"></div>
  <div class="corner corner-tl"></div>
  <div class="corner corner-tr"></div>
  <div class="corner corner-bl"></div>
  <div class="corner corner-br"></div>
  <div class="watermark">${wm}</div>
  <div class="content">
    <div class="logos-bar">
      <div class="logo-box"><div class="logo-circle" style="background:${primaryColor};color:${accentColor}">SE</div><div>SECRETARIA DO<br>TRABALHO</div></div>
      <div style="text-align:center">
        <div style="font-size:8px;font-weight:700;color:#9CA3AF;letter-spacing:2px;margin-bottom:2px">PROGRAMA</div>
        <div style="font-size:14px;font-weight:900;color:${primaryColor};letter-spacing:4px">QUALIFICA</div>
        <div style="font-size:8px;color:#6B7280;letter-spacing:2px">${cityState}</div>
      </div>
      <div class="logo-box" style="flex-direction:column;min-width:120px;text-align:center">
        ${logoUrl
        ? `<img class="inst-logo" src="${logoUrl}" alt="" crossorigin="anonymous" />`
        : `<div class="logo-circle" style="background:${accentColor};color:${primaryColor}">${initials}</div>`
      }
        <div style="font-weight:900;font-size:11px;letter-spacing:2px;margin-top:4px;color:${primaryColor}">${instSite}</div>
      </div>
    </div>
    <div class="cert-title">CERTIFICADO</div>
    <div class="cert-subtitle">de conclusao de curso</div>
    <div class="divider"></div>
    <div class="body-text">Certificamos que</div>
    <div class="student-name">${studentName}</div>
    <div class="body-text">concluiu com aproveitamento o curso de</div>
    <div class="course-name">${courseName}</div>
    <div class="details">Turma ${classId} &nbsp;&middot;&nbsp; Carga Horaria: ${workload} horas &nbsp;&middot;&nbsp; ${cityName}/${cityState}</div>
    <div class="body-text" style="font-size:10px;color:#9CA3AF">Emitido em ${issuedAt}</div>
    <div class="footer-row">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-name">${issuerName}</div>
        <div class="signature-role">Emissor(a) do Certificado</div>
      </div>
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-name">Coordenacao Geral</div>
        <div class="signature-role">Qualifica ${cityState}</div>
      </div>
      <div class="qr-block">
        <img src="${qrDataUrl}" alt="QR de verificacao" />
        <div class="qr-text">Verificar autenticidade<br>${verificationCode}</div>
      </div>
    </div>
  </div>
  <div class="bottom-bar"></div>
</div>
</body>
</html>`;
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
