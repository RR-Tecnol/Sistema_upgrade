/**
 * Recalcula o período (Acao) e as turmas vinculadas com base na carga horária de cada curso.
 */
import { NotFoundException } from '@nestjs/common';
import { ClassWeekendPolicy, PrismaClient } from '@prisma/client';
import { buildCourseContractSlice, type CourseStateRuleInput } from './course-contract.util';
import {
  calcularDataFimPorDiasLetivos,
  countTeachingDaysBetween,
  parseHolidayOrExtraKeysFromArray,
  calendarDateKey,
  parseIsoDateOnly,
  toDateStrLocal,
  type TeachingDayParams,
} from './teaching-calendar.util';
import { fetchMergedHolidayDatesForClass } from './holiday-catalog.util';
import { resolveTeachingDaysTarget } from './teaching-days-target.util';
import { suggestPaymentDaysFromWorkload } from './payment-days-suggestion.util';
import { auditCourseWorkload } from './course-workload-audit.util';
import { TEACHING_PERIOD_PRESETS } from './teaching-period-presets.util';

export type TurmaMotorPreview = {
  classId: string;
  classIdentifier: string;
  courseId: string;
  courseName: string;
  workloadHours: number;
  teachingDaysTarget: number;
  formulaLabel: string;
  suggestedEndDate: string;
  suggestedDiasPagamento: number;
};

export type RecalcularMotorPeriodoResult = {
  previousDataFim: string;
  newDataFim: string;
  motorCourseId: string | null;
  motorCourseName: string | null;
  turmas: TurmaMotorPreview[];
  message: string;
};

export type InstructorDiasPreviewTurma = {
  classId: string;
  classIdentifier: string;
  courseName: string;
  workloadHours: number;
  teachingDaysTarget: number;
  suggestedDiasPagamento: number;
  formulaLabel: string;
};

export type InstructorDiasPreview = {
  suggestedDiasPagamento: number;
  teachingDaysTarget: number | null;
  formulaLabel: string;
  workloadHours: number;
  courseNames: string[];
  note: string;
  turmas: InstructorDiasPreviewTurma[];
};

export type CourseForMotorConfig = {
  id: string;
  name: string;
  workloadHours: number;
  durationDaysMA: number;
  durationDaysPI: number;
  availableInMA: boolean;
  availableInPI: boolean;
};

/** Configuração por UF de cada curso — nunca reutilizar o stateConfig de outro curso do período. */
export type ResolveCourseStateConfig = (
  course: CourseForMotorConfig,
) => Record<string, CourseStateRuleInput> | null | undefined;

async function buildAcaoTeachingContext(prisma: PrismaClient, acaoId: string) {
  const acao = await prisma.acao.findUnique({
    where: { id: acaoId },
    select: {
      id: true,
      dataInicio: true,
      dataFim: true,
      weekendPolicy: true,
      weekendExtraDates: true,
      startTime: true,
      endTime: true,
      teachingDaysOverride: true,
      motorCourseId: true,
      cidadeId: true,
      cidade: { select: { state: true } },
      grupo: { select: { state: true } },
      motorCourse: {
        select: {
          id: true,
          name: true,
          workloadHours: true,
          durationDaysMA: true,
          durationDaysPI: true,
          availableInMA: true,
          availableInPI: true,
        },
      },
    },
  });
  if (!acao) throw new NotFoundException('Período não encontrado');

  const acaoTurmas = await prisma.acaoTurma.findMany({
    where: { acaoId },
    include: {
      turma: {
        select: {
          id: true,
          classIdentifier: true,
          status: true,
          courseId: true,
          city: { select: { state: true } },
          schedules: { select: { weekday: true } },
          course: {
            select: {
              id: true,
              name: true,
              workloadHours: true,
              durationDaysMA: true,
              durationDaysPI: true,
              availableInMA: true,
              availableInPI: true,
            },
          },
        },
      },
    },
  });

  const dataInicio = new Date(acao.dataInicio);
  const startTime = acao.startTime?.trim() || TEACHING_PERIOD_PRESETS.MORNING.startTime;
  const endTime = acao.endTime?.trim() || TEACHING_PERIOD_PRESETS.MORNING.endTime;
  const weekendPolicy = acao.weekendPolicy ?? ClassWeekendPolicy.WEEKDAYS_ONLY;
  const extraKeys = parseHolidayOrExtraKeysFromArray(
    Array.isArray(acao.weekendExtraDates) ? (acao.weekendExtraDates as string[]) : [],
  );
  const stateCode = acao.cidade?.state ?? acao.grupo?.state ?? 'MA';

  return { acao, acaoTurmas, dataInicio, startTime, endTime, weekendPolicy, extraKeys, stateCode };
}

/**
 * Teto de encontros do período = maior carga horária entre **todas** as turmas vinculadas
 * (não só motorCourseId, que pode continuar apontando para o curso de 60h).
 */
async function getPeriodPaymentCap(
  prisma: PrismaClient,
  _acaoId: string,
  ctx: Awaited<ReturnType<typeof buildAcaoTeachingContext>>,
  resolveStateConfig?: ResolveCourseStateConfig,
): Promise<{
  cap: number;
  teachingDaysTarget: number | null;
  workloadHours: number;
  formulaLabel?: string;
}> {
  const active = ctx.acaoTurmas.filter((at) => at.turma && at.turma.status !== 'CANCELLED');
  if (!active.length) {
    return { cap: 1, teachingDaysTarget: null, workloadHours: 0, formulaLabel: undefined };
  }

  let cap = 1;
  let teachingDaysTarget: number | null = null;
  let workloadHours = 0;
  let formulaLabel: string | undefined;

  for (const at of active) {
    const turma = at.turma!;
    const stateConfig = resolveStateConfig?.(turma.course) ?? null;
    const p = await previewTurmaMotorInAcao(
      prisma,
      ctx.acao,
      turma,
      turma.city?.state ?? ctx.stateCode,
      stateConfig,
      { usePeriodTeachingDaysOverride: false },
    );
    const candidate = Math.max(p.teachingDaysTarget, p.suggestedDiasPagamento);
    if (candidate > cap) {
      cap = candidate;
      teachingDaysTarget = p.teachingDaysTarget;
      workloadHours = p.workloadHours;
      formulaLabel = p.formulaLabel;
    }
  }

  return {
    cap: Math.max(1, Math.floor(cap)),
    teachingDaysTarget,
    workloadHours,
    formulaLabel,
  };
}

function teachingParamsForTurma(
  weekendPolicy: ClassWeekendPolicy,
  scheduleDays: number[],
  holidayDateKeys: Set<string>,
  extraKeys: Set<string>,
): TeachingDayParams {
  return {
    weekendPolicy,
    scheduleDays:
      weekendPolicy === ClassWeekendPolicy.FOLLOW_SCHEDULE && scheduleDays.length
        ? scheduleDays
        : [],
    holidayDateKeys,
    extraWeekendDateKeys: extraKeys,
  };
}

export type PreviewTurmaMotorOptions = {
  /** Período: usa override de encontros. Instrutor: só carga horária do curso da turma. */
  usePeriodTeachingDaysOverride?: boolean;
};

/** Calcula data fim e dias sugeridos para uma turma no contexto do período (turno/FDS do período). */
export async function previewTurmaMotorInAcao(
  prisma: PrismaClient,
  acao: {
    dataInicio: Date;
    startTime: string | null;
    endTime: string | null;
    weekendPolicy: ClassWeekendPolicy | null;
    weekendExtraDates: unknown;
    teachingDaysOverride: number | null;
  },
  turma: {
    id: string;
    classIdentifier: string;
    courseId: string;
    city: { state: string | null } | null;
    schedules: { weekday: number }[];
    course: {
      id: string;
      name: string;
      workloadHours: number;
      durationDaysMA: number;
      durationDaysPI: number;
      availableInMA: boolean;
      availableInPI: boolean;
    };
  },
  stateCode: string,
  stateConfig?: Record<string, CourseStateRuleInput> | null,
  opts?: PreviewTurmaMotorOptions,
): Promise<TurmaMotorPreview> {
  const startTime = acao.startTime?.trim() || TEACHING_PERIOD_PRESETS.MORNING.startTime;
  const endTime = acao.endTime?.trim() || TEACHING_PERIOD_PRESETS.MORNING.endTime;
  const weekendPolicy = acao.weekendPolicy ?? ClassWeekendPolicy.WEEKDAYS_ONLY;
  const extraKeys = parseHolidayOrExtraKeysFromArray(
    Array.isArray(acao.weekendExtraDates) ? (acao.weekendExtraDates as string[]) : [],
  );
  const contract = buildCourseContractSlice(turma.course, stateCode, stateConfig);
  const usePeriodOverride = opts?.usePeriodTeachingDaysOverride !== false;
  const resolved = resolveTeachingDaysTarget({
    workloadHours: contract.workloadHours,
    startTime,
    endTime,
    durationDaysFallback: contract.durationDays,
    override:
      usePeriodOverride && acao.teachingDaysOverride != null
        ? acao.teachingDaysOverride
        : undefined,
  });

  const start = parseIsoDateOnly(toDateStrLocal(acao.dataInicio));
  const holidays = await fetchMergedHolidayDatesForClass(prisma, {
    classId: turma.id,
    stateCode: turma.city?.state ?? stateCode,
    rangeStart: start,
    rangeEnd: new Date(start.getTime() + resolved.target * 4 * 86400000),
  });
  const holidayDateKeys = new Set(holidays.map((d) => calendarDateKey(d)));
  const scheduleDays = (turma.schedules || []).map((s) => s.weekday);
  const params = teachingParamsForTurma(weekendPolicy, scheduleDays, holidayDateKeys, extraKeys);

  const { endDate } = calcularDataFimPorDiasLetivos(start, resolved.target, params);
  const teachingDaysInRange = countTeachingDaysBetween(start, endDate, params);
  const workload = auditCourseWorkload({
    workloadHours: contract.workloadHours,
    startDate: start,
    endDate,
    startTime,
    endTime,
    teachingParams: params,
  });
  const payment = suggestPaymentDaysFromWorkload(
    Math.max(1, teachingDaysInRange),
    workload,
    resolved.target,
  );

  return {
    classId: turma.id,
    classIdentifier: turma.classIdentifier,
    courseId: turma.course.id,
    courseName: turma.course.name,
    workloadHours: contract.workloadHours,
    teachingDaysTarget: resolved.target,
    formulaLabel: resolved.formulaLabel,
    suggestedEndDate: toDateStrLocal(endDate),
    suggestedDiasPagamento: payment.suggestedDiasPagamento,
  };
}

/** Estende dataFim do período ao maior fim entre turmas; atualiza motorCourseId para o curso de maior carga. */
export async function recalcularPeriodoPelasTurmas(
  prisma: PrismaClient,
  acaoId: string,
  resolveStateConfig?: ResolveCourseStateConfig,
): Promise<RecalcularMotorPeriodoResult> {
  const ctx = await buildAcaoTeachingContext(prisma, acaoId);
  const active = ctx.acaoTurmas.filter((at) => at.turma && at.turma.status !== 'CANCELLED');
  if (!active.length) {
    throw new NotFoundException('Vincule pelo menos uma turma ao período antes de recalcular.');
  }

  const previousDataFim = toDateStrLocal(ctx.acao.dataFim);
  const turmas: TurmaMotorPreview[] = [];
  let maxEnd = parseIsoDateOnly(previousDataFim);
  let motorCourseId: string | null = ctx.acao.motorCourseId;
  let motorCourseName: string | null = null;
  let maxWorkload = -1;

  for (const at of active) {
    const turma = at.turma!;
    const course = turma.course;
    const stateConfig = resolveStateConfig?.(course) ?? null;
    const preview = await previewTurmaMotorInAcao(
      prisma,
      ctx.acao,
      turma,
      turma.city?.state ?? ctx.stateCode,
      stateConfig,
    );
    turmas.push(preview);

    const end = parseIsoDateOnly(preview.suggestedEndDate);
    if (end.getTime() > maxEnd.getTime()) maxEnd = end;

    const wh = preview.workloadHours;
    if (wh > maxWorkload) {
      maxWorkload = wh;
      motorCourseId = preview.courseId;
      motorCourseName = preview.courseName;
    }

    await prisma.class.update({
      where: { id: turma.id },
      data: { endDate: end, startDate: ctx.dataInicio },
    });
  }

  const newDataFim = toDateStrLocal(maxEnd);
  await prisma.acao.update({
    where: { id: acaoId },
    data: { dataFim: maxEnd, motorCourseId },
  });

  const diariasResumo = turmas
    .map((t) => `${t.classIdentifier}: ${t.suggestedDiasPagamento} diária(s), fim ${t.suggestedEndDate}`)
    .join('; ');

  return {
    previousDataFim,
    newDataFim,
    motorCourseId,
    motorCourseName,
    turmas,
    message:
      previousDataFim === newDataFim
        ? `Datas mantidas (o período já cobria as turmas). ${diariasResumo}. Motor: ${motorCourseName ?? '—'} (${maxWorkload}h).`
        : `Data fim do período: ${previousDataFim} → ${newDataFim}. ${diariasResumo}. Motor: ${motorCourseName ?? '—'} (${maxWorkload}h).`,
  };
}

/** Dias de diária do instrutor conforme curso(s) das turmas selecionadas (não usa o motor global do período). */
export async function suggestInstructorDiasForClasses(
  prisma: PrismaClient,
  acaoId: string,
  classIds: string[],
  resolveStateConfig?: ResolveCourseStateConfig,
): Promise<InstructorDiasPreview> {
  if (!classIds.length) {
    return {
      suggestedDiasPagamento: 0,
      teachingDaysTarget: null,
      formulaLabel: '',
      workloadHours: 0,
      courseNames: [],
      turmas: [],
      note: 'Selecione ao menos uma turma.',
    };
  }

  const ctx = await buildAcaoTeachingContext(prisma, acaoId);
  const idSet = new Set(classIds);
  const selected = ctx.acaoTurmas.filter(
    (at) => at.turma && (idSet.has(at.turma.id) || idSet.has(at.turmaId)),
  );

  if (!selected.length) {
    throw new NotFoundException('Turma(s) não encontrada(s) neste período.');
  }

  const turmas: InstructorDiasPreviewTurma[] = [];
  for (const at of selected) {
    const turma = at.turma!;
    const stateConfig = resolveStateConfig?.(turma.course) ?? null;
    const p = await previewTurmaMotorInAcao(
      prisma,
      ctx.acao,
      turma,
      turma.city?.state ?? ctx.stateCode,
      stateConfig,
      { usePeriodTeachingDaysOverride: false },
    );
    turmas.push({
      classId: p.classId,
      classIdentifier: p.classIdentifier,
      courseName: p.courseName,
      workloadHours: p.workloadHours,
      teachingDaysTarget: p.teachingDaysTarget,
      suggestedDiasPagamento: p.suggestedDiasPagamento,
      formulaLabel: p.formulaLabel,
    });
  }

  const period = await getPeriodPaymentCap(prisma, acaoId, ctx, resolveStateConfig);

  // Uma turma = contrato daquele curso; várias = maior carga entre as turmas, limitado ao teto do período (mesmo calendário).
  const maiorEntreCursos =
    turmas.length === 1
      ? turmas[0].suggestedDiasPagamento
      : Math.max(...turmas.map((t) => t.suggestedDiasPagamento));

  const suggestedDiasPagamento = Math.min(maiorEntreCursos, period.cap);
  const teachingDaysTarget =
    turmas.length === 1
      ? Math.min(turmas[0].teachingDaysTarget, period.cap)
      : Math.min(
          Math.max(...turmas.map((t) => t.teachingDaysTarget)),
          period.teachingDaysTarget ?? period.cap,
        );
  const workloadHours =
    turmas.length === 1 ? turmas[0].workloadHours : Math.max(...turmas.map((t) => t.workloadHours));
  const courseNames = [...new Set(turmas.map((t) => t.courseName))];
  const formulaLabel = turmas.map((t) => `${t.classIdentifier}: ${t.formulaLabel}`).join(' · ');
  const porCurso = turmas.map((t) => `${t.classIdentifier}: ${t.suggestedDiasPagamento}`).join(', ');

  let note: string;
  if (turmas.length === 1) {
    note = `Diárias pelo curso ${courseNames[0]} (${turmas[0].workloadHours}h): ${suggestedDiasPagamento} dia(s) (${turmas[0].formulaLabel}).`;
  } else if (suggestedDiasPagamento < maiorEntreCursos) {
    note =
      `${turmas.length} turmas selecionadas: ${suggestedDiasPagamento} dia(s) ` +
      `(teto do período: ${period.cap} — ${period.formulaLabel ?? `${period.workloadHours}h`}; ` +
      `por curso: ${porCurso}). Recalcule o período pelas turmas se o calendário já foi estendido.`;
  } else {
    note =
      `${turmas.length} turmas selecionadas: ${suggestedDiasPagamento} dia(s) ` +
      `(maior entre os cursos marcados: ${porCurso}; teto do período: ${period.cap} — ` +
      `${period.formulaLabel ?? `${period.workloadHours}h`}). Mesmo calendário — não soma dias.`;
  }

  return {
    suggestedDiasPagamento,
    teachingDaysTarget,
    formulaLabel,
    workloadHours,
    courseNames,
    turmas,
    note,
  };
}
