/**
 * Contrato pedagógico do curso por UF (S5A) — usado pelo motor de calendário (S5B/S5C).
 */
export type CourseStateRuleInput = {
  available?: boolean;
  durationDays?: number;
  workloadHours?: number;
};

export type CourseContractSlice = {
  stateCode: string;
  durationDays: number;
  workloadHours: number;
  workloadScopeNote?: string;
};

export function resolveDurationDaysForState(
  course: { durationDaysMA: number; durationDaysPI: number },
  state: string,
  stateConfig?: Record<string, { available?: boolean; durationDays?: number }> | null,
): number {
  const uf = state?.trim().toUpperCase().slice(0, 2);
  const fromCfg = stateConfig?.[uf]?.durationDays;
  if (fromCfg != null && Number.isFinite(fromCfg) && fromCfg > 0) {
    return Math.floor(fromCfg);
  }
  if (uf === 'PI') return Math.floor(Number(course.durationDaysPI));
  return Math.floor(Number(course.durationDaysMA));
}

/** Horas na UF: prioriza `stateConfig[UF].workloadHours` (60h MA e 60h PI separados, sem somar). */
export function resolveWorkloadHoursForState(
  course: {
    workloadHours: number;
    availableInMA?: boolean;
    availableInPI?: boolean;
  },
  state: string,
  stateConfig?: Record<string, CourseStateRuleInput> | null,
): { hours: number; scopeNote?: string } {
  const uf = state?.trim().toUpperCase().slice(0, 2) || 'MA';
  const fromCfg = stateConfig?.[uf]?.workloadHours;
  if (fromCfg != null && Number.isFinite(fromCfg) && fromCfg > 0) {
    return { hours: Math.floor(fromCfg) };
  }
  return { hours: Math.floor(Number(course.workloadHours) || 0) };
}

export function buildCourseContractSlice(
  course: {
    name?: string;
    workloadHours: number;
    durationDaysMA: number;
    durationDaysPI: number;
    availableInMA?: boolean;
    availableInPI?: boolean;
  },
  state: string,
  stateConfig?: Record<string, CourseStateRuleInput> | null,
): CourseContractSlice {
  const stateCode = state?.trim().toUpperCase().slice(0, 2) || 'MA';
  const { hours, scopeNote } = resolveWorkloadHoursForState(course, stateCode, stateConfig);
  return {
    stateCode,
    durationDays: resolveDurationDaysForState(course, stateCode, stateConfig),
    workloadHours: hours,
    workloadScopeNote: scopeNote,
  };
}

/** Rótulo para listas (ex.: seleção de curso na turma). */
export function formatCourseHoursBadge(
  course: {
    workloadHours: number;
    durationDaysMA?: number;
    durationDaysPI?: number;
    availableInMA?: boolean;
    availableInPI?: boolean;
  },
  groupState?: string | null,
  stateConfig?: Record<string, CourseStateRuleInput> | null,
): string {
  if (groupState) {
    const c = buildCourseContractSlice(
      {
        workloadHours: course.workloadHours,
        durationDaysMA: course.durationDaysMA ?? 30,
        durationDaysPI: course.durationDaysPI ?? 30,
        availableInMA: course.availableInMA,
        availableInPI: course.availableInPI,
      },
      groupState,
      stateConfig,
    );
    return `${c.workloadHours}h`;
  }
  if (course.availableInMA && course.availableInPI) {
    const ma = stateConfig?.MA?.workloadHours;
    const pi = stateConfig?.PI?.workloadHours;
    if (ma && pi && ma === pi) return `${ma}h/UF`;
    if (ma && pi) return `${ma}h MA · ${pi}h PI`;
    const per = stateConfig?.MA?.workloadHours ?? course.workloadHours;
    return `${per}h/UF`;
  }
  return `${course.workloadHours}h`;
}
