import type { Course } from '@/lib/api/courses';

export type CourseContractSlice = {
  stateCode: string;
  durationDays: number;
  workloadHours: number;
  workloadScopeNote?: string;
};

type StateRule = { available?: boolean; durationDays?: number; workloadHours?: number };

/** Espelha backend `course-contract.util.ts` — horas por UF na turma (sem somar MA+PI). */
type CourseContractInput = Pick<
  Course,
  'workloadHours' | 'availableInMA' | 'availableInPI' | 'stateConfig'
> &
  Partial<Pick<Course, 'durationDaysMA' | 'durationDaysPI'>>;

export function getCourseContractForState(
  course: CourseContractInput,
  state: string,
): CourseContractSlice {
  const stateCode = (state || 'MA').trim().toUpperCase().slice(0, 2);
  const cfg = course.stateConfig?.[stateCode] as StateRule | undefined;

  const fromCfg = cfg?.workloadHours;
  const workloadHours =
    fromCfg != null && fromCfg > 0
      ? Math.floor(fromCfg)
      : Math.floor(Number(course.workloadHours) || 0);

  const durationDays =
    cfg?.durationDays && cfg.durationDays > 1
      ? cfg.durationDays
      : stateCode === 'PI'
        ? (course.durationDaysPI ?? 1)
        : (course.durationDaysMA ?? 1);

  return {
    stateCode,
    durationDays: Math.max(1, durationDays),
    workloadHours,
    workloadScopeNote: undefined,
  };
}

/** Badge: horas da UF ou "60h/UF" quando MA+PI com mesma carga no stateConfig. */
export function formatCourseHoursBadge(
  course: Pick<Course, 'workloadHours' | 'availableInMA' | 'availableInPI' | 'stateConfig'>,
  groupState?: string | null,
): string {
  if (groupState) {
    return `${getCourseContractForState(course, groupState).workloadHours}h`;
  }
  if (course.availableInMA && course.availableInPI) {
    const ma = course.stateConfig?.MA?.workloadHours;
    const pi = course.stateConfig?.PI?.workloadHours;
    if (ma && pi && ma === pi) return `${ma}h/UF`;
    if (ma && pi) return `${ma}h MA · ${pi}h PI`;
    const per = course.stateConfig?.MA?.workloadHours ?? course.workloadHours;
    return `${per}h/UF`;
  }
  return `${course.workloadHours}h`;
}
