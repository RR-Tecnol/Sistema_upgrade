import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClassWeekendPolicy, PrismaClient } from '@prisma/client';
import { fetchHolidayEntriesForClass, fetchMergedHolidayDatesForClass } from './holiday-catalog.util';
import { buildCourseContractSlice, type CourseStateRuleInput } from './course-contract.util';
import { suggestPaymentDaysFromWorkload } from './payment-days-suggestion.util';
import {
  calcularDataFimPorDiasLetivos,
  countCalendarDaysInclusive,
  countTeachingDaysBetween,
  parseHolidayOrExtraKeysFromArray,
  calendarDateKey,
  parseIsoDateOnly,
  toDateStrLocal,
  type TeachingDayParams,
} from './teaching-calendar.util';
import { auditCourseWorkload, type CourseWorkloadAudit } from './course-workload-audit.util';
import { resolveTeachingDaysTarget } from './teaching-days-target.util';
import { TEACHING_PERIOD_PRESETS } from './teaching-period-presets.util';

export type OperationalHolidayEntry = {
  date: string;
  reason: string;
  source: 'catalog_national' | 'catalog_state' | 'class_occurrence';
};

export type OperationalSummary = {
  courseName: string;
  stateCode: string;
  workloadHoursTarget: number;
  workloadScopeNote?: string;
  teachingDaysTarget: number;
  hoursPerSession: number;
  teachingDaysInRange: number;
  teachingDaysRemaining: number;
  projectedHours: number;
  suggestedEndDate: string;
  holidaysExcluded: OperationalHolidayEntry[];
  weekendPolicy: ClassWeekendPolicy;
  weekendPolicyLabel: string;
  calendarDaysInRange: number;
  paymentNote: string;
  suggestedDiasPagamento?: number;
  paymentAdjustmentNote?: string;
  applyPaymentSuggestionRecommended?: boolean;
  teachingDaysTargetSource?: string;
  formulaLabel?: string;
  messages: string[];
};

export type TeachingEndDatePreview = {
  endDate: string;
  teachingDaysCount: number;
  teachingDaysTarget: number;
  calendarDays: number;
  weekendPolicy: ClassWeekendPolicy;
  manualEndDate?: string | null;
  manualMismatch?: boolean;
  teachingDaysInRange?: number;
  workload?: CourseWorkloadAudit | null;
  operationalSummary?: OperationalSummary | null;
};

const WEEKEND_POLICY_LABEL: Record<ClassWeekendPolicy, string> = {
  WEEKDAYS_ONLY: 'Só dias úteis (seg–sex) — fins de semana não contam',
  FOLLOW_SCHEDULE: 'Seguir horário cadastrado da turma',
  ALL_WEEKENDS: 'Todos os sábados e domingos contam',
  SELECT_WEEKENDS: 'Fins de semana em datas específicas',
};

export async function resolveTeachingDaysCount(
  prisma: PrismaClient,
  courseId: string,
  groupId: string,
  override?: number,
  opts?: {
    startTime?: string;
    endTime?: string;
    stateConfig?: Record<string, CourseStateRuleInput> | null;
  },
): Promise<number> {
  const [course, group] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId },
      select: {
        workloadHours: true,
        durationDaysMA: true,
        durationDaysPI: true,
        availableInMA: true,
        availableInPI: true,
      },
    }),
    prisma.group.findUnique({ where: { id: groupId }, select: { state: true } }),
  ]);
  if (!course) throw new NotFoundException('Curso não encontrado');
  if (!group) throw new NotFoundException('Grupo não encontrado');

  const contract = buildCourseContractSlice(course, group.state || 'MA', opts?.stateConfig);
  const startTime = opts?.startTime?.trim() || TEACHING_PERIOD_PRESETS.MORNING.startTime;
  const endTime = opts?.endTime?.trim() || TEACHING_PERIOD_PRESETS.MORNING.endTime;

  try {
    const resolved = resolveTeachingDaysTarget({
      workloadHours: contract.workloadHours,
      startTime,
      endTime,
      override,
      durationDaysFallback: contract.durationDays,
    });
    return resolved.target;
  } catch {
    if (override != null && Number.isFinite(override) && override > 0) {
      return Math.floor(override);
    }
    const days = contract.durationDays;
    if (!Number.isFinite(days) || days < 1) {
      throw new BadRequestException('Duração do curso inválida para o estado do grupo');
    }
    return Math.floor(days);
  }
}

async function loadHolidayKeys(
  prisma: PrismaClient,
  opts: {
    stateCode: string;
    classId?: string | null;
    startDate: Date;
    teachingDaysCount: number;
  },
): Promise<Set<string>> {
  const rangeStart = parseIsoDateOnly(calendarDateKey(opts.startDate));
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + Math.max(opts.teachingDaysCount * 3, 120));

  const holidays = await fetchMergedHolidayDatesForClass(prisma, {
    classId: opts.classId ?? null,
    stateCode: opts.stateCode,
    rangeStart,
    rangeEnd,
  });
  return new Set(holidays.map((d) => calendarDateKey(d)));
}

export async function previewClassEndDate(
  prisma: PrismaClient,
  input: {
    startDate: string;
    courseId: string;
    groupId: string;
    cityId: string;
    weekendPolicy: ClassWeekendPolicy;
    teachingDaysCount?: number;
    weekendExtraDates?: string[];
    scheduleDays?: number[];
    manualEndDate?: string;
    classId?: string | null;
    startTime?: string;
    endTime?: string;
    stateConfig?: Record<string, CourseStateRuleInput> | null;
  },
): Promise<TeachingEndDatePreview> {
  const [course, group, city] = await Promise.all([
    prisma.course.findUnique({
      where: { id: input.courseId },
      select: {
        name: true,
        workloadHours: true,
        durationDaysMA: true,
        durationDaysPI: true,
        availableInMA: true,
        availableInPI: true,
      },
    }),
    prisma.group.findUnique({ where: { id: input.groupId }, select: { state: true } }),
    prisma.city.findUnique({ where: { id: input.cityId }, select: { state: true } }),
  ]);
  if (!course) throw new NotFoundException('Curso não encontrado');
  if (!group) throw new NotFoundException('Grupo não encontrado');
  if (!city) throw new NotFoundException('Cidade não encontrada');

  const stateCode = group.state || city.state || 'MA';
  const contract = buildCourseContractSlice(course, stateCode, input.stateConfig);
  const startTime = input.startTime?.trim() || TEACHING_PERIOD_PRESETS.MORNING.startTime;
  const endTime = input.endTime?.trim() || TEACHING_PERIOD_PRESETS.MORNING.endTime;

  const daysTargetResolved = resolveTeachingDaysTarget({
    workloadHours: contract.workloadHours,
    startTime,
    endTime,
    override:
      input.teachingDaysCount != null &&
      Number.isFinite(input.teachingDaysCount) &&
      input.teachingDaysCount > 0
        ? Math.floor(input.teachingDaysCount)
        : undefined,
    durationDaysFallback: contract.durationDays,
  });
  const teachingDaysCount = daysTargetResolved.target;

  const start = parseIsoDateOnly(input.startDate);
  const holidayDateKeys = await loadHolidayKeys(prisma, {
    stateCode,
    classId: input.classId,
    startDate: start,
    teachingDaysCount,
  });
  const extraWeekendDateKeys = parseHolidayOrExtraKeysFromArray(input.weekendExtraDates);

  const params: TeachingDayParams = {
    weekendPolicy: input.weekendPolicy,
    scheduleDays: input.scheduleDays ?? [],
    holidayDateKeys,
    extraWeekendDateKeys,
  };

  const { endDate: suggestedEnd, teachingDaysTarget, calendarDays } = calcularDataFimPorDiasLetivos(
    start,
    teachingDaysCount,
    params,
  );

  const effectiveEnd =
    input.manualEndDate && /^\d{4}-\d{2}-\d{2}$/.test(input.manualEndDate)
      ? parseIsoDateOnly(input.manualEndDate)
      : suggestedEnd;

  let manualMismatch: boolean | undefined;
  if (input.manualEndDate && /^\d{4}-\d{2}-\d{2}$/.test(input.manualEndDate)) {
    manualMismatch = toDateStrLocal(effectiveEnd) !== toDateStrLocal(suggestedEnd);
  }

  const teachingDaysInRange = countTeachingDaysBetween(start, effectiveEnd, params);

  const workload = auditCourseWorkload({
    workloadHours: contract.workloadHours,
    startDate: start,
    endDate: effectiveEnd,
    startTime,
    endTime,
    teachingParams: params,
  });

  const holidaysExcluded = await fetchHolidayEntriesForClass(prisma, {
    classId: input.classId ?? null,
    stateCode,
    rangeStart: start,
    rangeEnd: effectiveEnd,
  });

  const teachingDaysRemaining = Math.max(0, teachingDaysTarget - teachingDaysInRange);
  const hoursPerSession = workload?.hoursPerSession ?? 0;
  const projectedHours = workload?.projectedHours ?? teachingDaysInRange * hoursPerSession;

  const messages: string[] = [];
  if (holidaysExcluded.length > 0) {
    messages.push(
      `${holidaysExcluded.length} dia(s) no intervalo não contam como aula (feriados/ocorrências) — o término no calendário alonga em relação a ${teachingDaysTarget} dias letivos.`,
    );
  }
  if (manualMismatch) {
    messages.push(
      `A data digitada (${toDateStrLocal(effectiveEnd)}) difere da sugerida pelo motor (${toDateStrLocal(suggestedEnd)}).`,
    );
  }
  if (workload?.message) messages.push(workload.message);

  const paymentSuggestion = suggestPaymentDaysFromWorkload(
    teachingDaysInRange,
    workload,
    teachingDaysCount,
  );
  if (paymentSuggestion.paymentAdjustmentNote) messages.push(paymentSuggestion.paymentAdjustmentNote);
  if (daysTargetResolved.formulaLabel) messages.push(daysTargetResolved.formulaLabel);

  const operationalSummary: OperationalSummary = {
    courseName: course.name,
    stateCode,
    workloadHoursTarget: contract.workloadHours,
    workloadScopeNote: contract.workloadScopeNote,
    teachingDaysTarget,
    hoursPerSession: daysTargetResolved.hoursPerSession || hoursPerSession,
    teachingDaysInRange,
    teachingDaysRemaining,
    projectedHours,
    suggestedEndDate: toDateStrLocal(suggestedEnd),
    holidaysExcluded,
    weekendPolicy: input.weekendPolicy,
    weekendPolicyLabel: WEEKEND_POLICY_LABEL[input.weekendPolicy] ?? input.weekendPolicy,
    calendarDaysInRange: countCalendarDaysInclusive(start, effectiveEnd),
    paymentNote: paymentSuggestion.paymentAdjustmentNote,
    suggestedDiasPagamento: paymentSuggestion.suggestedDiasPagamento,
    paymentAdjustmentNote: paymentSuggestion.paymentAdjustmentNote,
    applyPaymentSuggestionRecommended: paymentSuggestion.applySuggestionRecommended,
    teachingDaysTargetSource: daysTargetResolved.source,
    formulaLabel: daysTargetResolved.formulaLabel,
    messages,
  };

  return {
    endDate: toDateStrLocal(effectiveEnd),
    teachingDaysCount,
    teachingDaysTarget,
    calendarDays: countCalendarDaysInclusive(start, effectiveEnd),
    weekendPolicy: input.weekendPolicy,
    manualEndDate: input.manualEndDate ?? null,
    manualMismatch,
    teachingDaysInRange,
    workload,
    operationalSummary,
  };
}

export async function resolveClassEndDateIso(
  prisma: PrismaClient,
  input: {
    startDate: string;
    endDate: string;
    courseId: string;
    groupId: string;
    cityId: string;
    weekendPolicy?: ClassWeekendPolicy;
    teachingDaysCount?: number;
    weekendExtraDates?: string[];
    scheduleDays?: number[];
    useAutoEndDate?: boolean;
    classId?: string | null;
    startTime?: string;
    endTime?: string;
    stateConfig?: Record<string, CourseStateRuleInput> | null;
  },
): Promise<string> {
  if (input.useAutoEndDate === false) {
    return input.endDate;
  }
  const preview = await previewClassEndDate(prisma, {
    startDate: input.startDate,
    courseId: input.courseId,
    groupId: input.groupId,
    cityId: input.cityId,
    weekendPolicy: input.weekendPolicy ?? ClassWeekendPolicy.WEEKDAYS_ONLY,
    teachingDaysCount: input.teachingDaysCount,
    weekendExtraDates: input.weekendExtraDates,
    scheduleDays: input.scheduleDays,
    manualEndDate: input.endDate,
    classId: input.classId,
    startTime: input.startTime,
    endTime: input.endTime,
    stateConfig: input.stateConfig,
  });
  return preview.endDate;
}

export async function getAcaoCalendarioResumo(
  prisma: PrismaClient,
  acaoId: string,
  stateConfig?: Record<string, CourseStateRuleInput> | null,
): Promise<{
  temTurma: boolean;
  diasLetivos: number;
  diasCorridos: number;
  weekendPolicy?: ClassWeekendPolicy;
  aviso?: string;
  workload?: CourseWorkloadAudit | null;
  paymentNote?: string;
  workloadScopeNote?: string;
  suggestedDiasPagamento?: number;
  paymentAdjustmentNote?: string;
  applyPaymentSuggestionRecommended?: boolean;
  teachingDaysTarget?: number;
  formulaLabel?: string;
  teachingDaysTargetSource?: string;
  motorCourseName?: string;
  courseWorkloadHours?: number;
  hoursPerSession?: number;
  /** Texto único e objetivo para a aba Funcionários (evita alertas duplicados). */
  motorResumo?: string;
}> {
  const acao = await prisma.acao.findUnique({
    where: { id: acaoId },
    select: {
      dataInicio: true,
      dataFim: true,
      weekendPolicy: true,
      weekendExtraDates: true,
      startTime: true,
      endTime: true,
      teachingDaysOverride: true,
      cidadeId: true,
      cidade: { select: { state: true } },
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

  const dataInicio = new Date(acao.dataInicio);
  const dataFim = new Date(acao.dataFim);
  const diasCorridos = countCalendarDaysInclusive(dataInicio, dataFim);

  const turmaCount = await prisma.acaoTurma.count({ where: { acaoId } });

  const acaoTurma = await prisma.acaoTurma.findFirst({
    where: { acaoId },
    include: {
      turma: {
        select: {
          id: true,
          schedules: { select: { weekday: true } },
          city: { select: { state: true } },
          course: {
            select: {
              id: true,
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

  const weekendPolicy = acao.weekendPolicy ?? ClassWeekendPolicy.WEEKDAYS_ONLY;
  const scheduleDays =
    weekendPolicy === ClassWeekendPolicy.FOLLOW_SCHEDULE && acaoTurma?.turma
      ? (acaoTurma.turma.schedules || []).map((s) => s.weekday)
      : [];
  const stateCode = acao.cidade?.state ?? acaoTurma?.turma?.city?.state ?? null;
  const holidays = await fetchMergedHolidayDatesForClass(prisma, {
    classId: acaoTurma?.turma?.id ?? null,
    stateCode,
    rangeStart: dataInicio,
    rangeEnd: dataFim,
  });
  const extraRaw = acao.weekendExtraDates as string[] | null;
  const extraKeys = parseHolidayOrExtraKeysFromArray(Array.isArray(extraRaw) ? extraRaw : []);

  const teachingParams: TeachingDayParams = {
    weekendPolicy,
    scheduleDays,
    holidayDateKeys: new Set(holidays.map((d) => calendarDateKey(d))),
    extraWeekendDateKeys: extraKeys,
  };

  const diasLetivos = countTeachingDaysBetween(dataInicio, dataFim, teachingParams);

  const courseRow = acao.motorCourse ?? acaoTurma?.turma?.course ?? null;
  const contract = courseRow
    ? buildCourseContractSlice(
        {
          workloadHours: courseRow.workloadHours,
          durationDaysMA: courseRow.durationDaysMA,
          durationDaysPI: courseRow.durationDaysPI,
          availableInMA: courseRow.availableInMA,
          availableInPI: courseRow.availableInPI,
        },
        stateCode ?? 'MA',
        stateConfig,
      )
    : null;

  const workload = auditCourseWorkload({
    workloadHours: contract?.workloadHours ?? courseRow?.workloadHours ?? 0,
    startDate: dataInicio,
    endDate: dataFim,
    startTime: acao.startTime ?? '07:00',
    endTime: acao.endTime ?? '12:00',
    teachingParams,
  });

  const diasLetivosFinal = Math.max(1, diasLetivos);

  let teachingDaysTargetN: number | undefined;
  let formulaLabel: string | undefined;
  let teachingDaysTargetSource: string | undefined;
  if (contract && acao.startTime && acao.endTime) {
    try {
      const resolved = resolveTeachingDaysTarget({
        workloadHours: contract.workloadHours,
        startTime: acao.startTime,
        endTime: acao.endTime,
        durationDaysFallback: contract.durationDays,
        override: acao.teachingDaysOverride ?? undefined,
      });
      teachingDaysTargetN = resolved.target;
      formulaLabel = resolved.formulaLabel;
      teachingDaysTargetSource = resolved.source;
    } catch {
      /* mantém só workload */
    }
  }

  const paymentSuggestion = suggestPaymentDaysFromWorkload(
    diasLetivosFinal,
    workload,
    teachingDaysTargetN,
  );

  const hoursPerSession = workload?.hoursPerSession ?? 0;
  const courseWorkloadHours = contract?.workloadHours ?? courseRow?.workloadHours ?? 0;
  const motorCourseName = acao.motorCourse?.name ?? null;
  const cappedByContract = paymentSuggestion.cappedByContract === true;

  const motorResumoParts: string[] = [];
  if (courseWorkloadHours > 0) {
    motorResumoParts.push(`Meta do curso: ${courseWorkloadHours}h`);
  }
  if (teachingDaysTargetN != null && formulaLabel) {
    motorResumoParts.push(`${teachingDaysTargetN} encontro(s) (${formulaLabel})`);
  } else if (teachingDaysTargetN != null) {
    motorResumoParts.push(`${teachingDaysTargetN} encontro(s) no contrato`);
  }
  motorResumoParts.push(
    `${diasLetivosFinal} dia(s) letivo(s) no calendário do período (${diasCorridos} corridos; feriados do catálogo excluídos)`,
  );
  motorResumoParts.push(
    `Diárias sugeridas: ${paymentSuggestion.suggestedDiasPagamento} dia(s)`,
  );
  if (cappedByContract && teachingDaysTargetN != null) {
    motorResumoParts.push(
      `o pagamento segue o contrato (${teachingDaysTargetN} encontros), não os ${diasLetivosFinal} letivos do intervalo`,
    );
  }

  const motorResumo = motorResumoParts.join(' · ');

  return {
    temTurma: turmaCount > 0,
    diasLetivos: diasLetivosFinal,
    diasCorridos,
    weekendPolicy,
    workload: cappedByContract && workload
      ? {
          ...workload,
          status: 'ok' as const,
          teachingDaysInRange: teachingDaysTargetN ?? workload.teachingDaysInRange,
          projectedHours:
            Math.round((teachingDaysTargetN ?? 0) * hoursPerSession * 10) / 10,
          deltaHours: 0,
          message: `Carga para pagamento: ${teachingDaysTargetN} encontro(s) × ${hoursPerSession}h = ${courseWorkloadHours}h (contrato).`,
        }
      : workload,
    aviso:
      turmaCount === 0
        ? 'Nenhuma turma vinculada — diárias calculadas pelo motor do período. Vincule turmas para professores e matrículas.'
        : workload?.status === 'short'
          ? workload.message
          : undefined,
    paymentNote: cappedByContract ? undefined : paymentSuggestion.paymentAdjustmentNote,
    workloadScopeNote: contract?.workloadScopeNote,
    suggestedDiasPagamento: paymentSuggestion.suggestedDiasPagamento,
    paymentAdjustmentNote: cappedByContract ? undefined : paymentSuggestion.paymentAdjustmentNote,
    applyPaymentSuggestionRecommended: paymentSuggestion.applySuggestionRecommended,
    teachingDaysTarget: teachingDaysTargetN,
    formulaLabel,
    teachingDaysTargetSource,
    motorCourseName: motorCourseName ?? undefined,
    courseWorkloadHours: courseWorkloadHours > 0 ? courseWorkloadHours : undefined,
    hoursPerSession: hoursPerSession > 0 ? hoursPerSession : undefined,
    motorResumo,
  };
}

/** Recalcula `Class.endDate` com N fixo (horas÷turno) e feriados atuais. */
export async function recalculateClassEndDateMotor(
  prisma: PrismaClient,
  classId: string,
  stateConfig?: Record<string, CourseStateRuleInput> | null,
): Promise<{
  previousEndDate: Date;
  newEndDate: Date;
  teachingDaysTarget: number;
  formulaLabel: string;
}> {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      city: { select: { state: true } },
      schedules: { select: { weekday: true } },
      course: {
        select: {
          workloadHours: true,
          durationDaysMA: true,
          durationDaysPI: true,
          availableInMA: true,
          availableInPI: true,
        },
      },
    },
  });
  if (!cls?.course) throw new NotFoundException('Turma ou curso não encontrado');

  const stateCode = cls.city?.state ?? 'MA';
  const contract = buildCourseContractSlice(cls.course, stateCode, stateConfig);
  const startTime = cls.startTime?.trim() || TEACHING_PERIOD_PRESETS.MORNING.startTime;
  const endTime = cls.endTime?.trim() || TEACHING_PERIOD_PRESETS.MORNING.endTime;
  const { target: teachingDaysTarget, formulaLabel } = resolveTeachingDaysTarget({
    workloadHours: contract.workloadHours,
    startTime,
    endTime,
    durationDaysFallback: contract.durationDays,
  });

  const start = parseIsoDateOnly(toDateStrLocal(cls.startDate));
  const holidayDateKeys = await loadHolidayKeys(prisma, {
    stateCode,
    classId,
    startDate: start,
    teachingDaysCount: teachingDaysTarget,
  });
  const extraKeys = parseHolidayOrExtraKeysFromArray(
    Array.isArray(cls.weekendExtraDates) ? (cls.weekendExtraDates as string[]) : [],
  );
  const params: TeachingDayParams = {
    weekendPolicy: cls.weekendPolicy ?? ClassWeekendPolicy.WEEKDAYS_ONLY,
    scheduleDays: (cls.schedules || []).map((s) => s.weekday),
    holidayDateKeys,
    extraWeekendDateKeys: extraKeys,
  };

  const { endDate: newEndDate } = calcularDataFimPorDiasLetivos(
    start,
    teachingDaysTarget,
    params,
  );

  const previousEndDate = new Date(cls.endDate);
  await prisma.class.update({
    where: { id: classId },
    data: { endDate: newEndDate },
  });

  return { previousEndDate, newEndDate, teachingDaysTarget, formulaLabel };
}
