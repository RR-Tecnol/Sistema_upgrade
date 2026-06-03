/**
 * Compara horas previstas no calendário da turma (dias letivos × horas/dia do turno)
 * com a carga horária total do curso (Course.workloadHours).
 */
import { countTeachingDaysBetween, parseIsoDateOnly, type TeachingDayParams } from './teaching-calendar.util';

const TIME_RE = /^(\d{1,2}):(\d{2})$/;

/** Horas decimais entre dois horários HH:mm no mesmo dia. */
export function hoursBetweenTimes(startTime: string, endTime: string): number {
  const parse = (t: string) => {
    const m = String(t || '').trim().match(TIME_RE);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) {
      return null;
    }
    return h + min / 60;
  };
  const start = parse(startTime);
  const end = parse(endTime);
  if (start == null || end == null) return 0;
  const diff = end - start;
  return diff > 0 ? Math.round(diff * 100) / 100 : 0;
}

export type CourseWorkloadAuditStatus = 'ok' | 'short' | 'surplus';

export type CourseWorkloadAudit = {
  targetHours: number;
  hoursPerSession: number;
  teachingDaysInRange: number;
  projectedHours: number;
  deltaHours: number;
  status: CourseWorkloadAuditStatus;
  message: string;
};

const TOLERANCE_HOURS = 0.5;

export function buildWorkloadAuditMessage(
  status: CourseWorkloadAuditStatus,
  targetHours: number,
  projectedHours: number,
  deltaHours: number,
  teachingDaysInRange: number,
  hoursPerSession: number,
): string {
  const fmt = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',');
  if (status === 'short') {
    const falta = Math.abs(deltaHours);
    return (
      `Atenção: com ${teachingDaysInRange} dia(s) letivo(s) de ${fmt(hoursPerSession)}h/dia, ` +
      `são previstas ${fmt(projectedHours)}h — faltam ${fmt(falta)}h para a meta de ${fmt(targetHours)}h do curso.`
    );
  }
  if (status === 'surplus') {
    return (
      `Atenção: com ${teachingDaysInRange} dia(s) letivo(s) de ${fmt(hoursPerSession)}h/dia, ` +
      `são previstas ${fmt(projectedHours)}h — ${fmt(deltaHours)}h acima da meta de ${fmt(targetHours)}h do curso.`
    );
  }
  return (
    `Carga horária alinhada: ${fmt(projectedHours)}h previstas (${teachingDaysInRange} × ${fmt(hoursPerSession)}h) ` +
    `≈ meta de ${fmt(targetHours)}h do curso.`
  );
}

export function auditCourseWorkload(input: {
  workloadHours: number;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  teachingParams: TeachingDayParams;
}): CourseWorkloadAudit | null {
  const targetHours = Number(input.workloadHours);
  if (!Number.isFinite(targetHours) || targetHours <= 0) return null;

  const hoursPerSession = hoursBetweenTimes(input.startTime, input.endTime);
  if (hoursPerSession <= 0) {
    return {
      targetHours,
      hoursPerSession: 0,
      teachingDaysInRange: 0,
      projectedHours: 0,
      deltaHours: -targetHours,
      status: 'short',
      message:
        'Horário de aula inválido ou término antes do início — não é possível calcular horas previstas. Verifique início e fim do turno.',
    };
  }

  const start = parseIsoDateOnly(
    input.startDate instanceof Date
      ? input.startDate.toISOString().slice(0, 10)
      : String(input.startDate).slice(0, 10),
  );
  const end = parseIsoDateOnly(
    input.endDate instanceof Date
      ? input.endDate.toISOString().slice(0, 10)
      : String(input.endDate).slice(0, 10),
  );

  const teachingDaysInRange = countTeachingDaysBetween(start, end, input.teachingParams);
  const projectedHours = Math.round(teachingDaysInRange * hoursPerSession * 10) / 10;
  const deltaHours = Math.round((projectedHours - targetHours) * 10) / 10;

  let status: CourseWorkloadAuditStatus = 'ok';
  if (deltaHours < -TOLERANCE_HOURS) status = 'short';
  else if (deltaHours > TOLERANCE_HOURS) status = 'surplus';

  return {
    targetHours,
    hoursPerSession,
    teachingDaysInRange,
    projectedHours,
    deltaHours,
    status,
    message: buildWorkloadAuditMessage(
      status,
      targetHours,
      projectedHours,
      deltaHours,
      teachingDaysInRange,
      hoursPerSession,
    ),
  };
}
