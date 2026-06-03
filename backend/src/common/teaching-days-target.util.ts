import { hoursBetweenTimes } from './course-workload-audit.util';
import { formatHoursPerSession } from './teaching-period-presets.util';

export type TeachingDaysTargetSource =
  | 'hours_div_session'
  | 'override'
  | 'fallback_duration_days';

export type TeachingDaysTargetResult = {
  target: number;
  source: TeachingDaysTargetSource;
  hoursPerSession: number;
  formulaLabel: string;
};

export function buildTeachingDaysFormulaLabel(
  workloadHours: number,
  hoursPerSession: number,
  target: number,
): string {
  return `${workloadHours}h ÷ ${formatHoursPerSession(hoursPerSession)}h = ${target} encontros`;
}

/**
 * N encontros letivos = ceil(horas do contrato ÷ horas por encontro do turno).
 * Override admin ou fallback durationDays só quando horas/turno inválidos.
 */
export function resolveTeachingDaysTarget(input: {
  workloadHours: number;
  startTime: string;
  endTime: string;
  override?: number | null;
  durationDaysFallback?: number | null;
}): TeachingDaysTargetResult {
  const hoursPerSession = hoursBetweenTimes(
    input.startTime?.trim() || '07:00',
    input.endTime?.trim() || '12:00',
  );

  if (input.override != null && Number.isFinite(input.override) && input.override > 0) {
    const target = Math.floor(input.override);
    return {
      target,
      source: 'override',
      hoursPerSession,
      formulaLabel: `Override: ${target} encontros${
        hoursPerSession > 0
          ? ` (${buildTeachingDaysFormulaLabel(input.workloadHours, hoursPerSession, Math.ceil(input.workloadHours / hoursPerSession))} seria o automático)`
          : ''
      }`,
    };
  }

  const workload = Number(input.workloadHours);
  if (!Number.isFinite(workload) || workload <= 0) {
    throw new Error('Carga horária do curso inválida para calcular encontros letivos.');
  }

  if (hoursPerSession <= 0) {
    const fb = input.durationDaysFallback;
    if (fb != null && Number.isFinite(fb) && fb > 0) {
      const target = Math.floor(fb);
      return {
        target,
        source: 'fallback_duration_days',
        hoursPerSession: 0,
        formulaLabel: `${target} encontros (referência do curso — horário de turno inválido)`,
      };
    }
    throw new Error(
      'Horário de aula inválido. Informe início e fim do turno (ex. 07:00 e 12:00).',
    );
  }

  const target = Math.max(1, Math.ceil(workload / hoursPerSession));
  return {
    target,
    source: 'hours_div_session',
    hoursPerSession,
    formulaLabel: buildTeachingDaysFormulaLabel(workload, hoursPerSession, target),
  };
}
