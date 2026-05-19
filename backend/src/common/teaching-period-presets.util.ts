import { hoursBetweenTimes } from './course-workload-audit.util';

export type TeachingPeriodKey = 'MORNING' | 'AFTERNOON' | 'EVENING';

export type TeachingPeriodPreset = {
  period: TeachingPeriodKey;
  label: string;
  startTime: string;
  endTime: string;
};

export const TEACHING_PERIOD_PRESETS: Record<TeachingPeriodKey, TeachingPeriodPreset> = {
  MORNING: {
    period: 'MORNING',
    label: 'Manhã',
    startTime: '07:00',
    endTime: '12:00',
  },
  AFTERNOON: {
    period: 'AFTERNOON',
    label: 'Tarde',
    startTime: '13:00',
    endTime: '18:00',
  },
  EVENING: {
    period: 'EVENING',
    label: 'Noite',
    startTime: '19:00',
    endTime: '22:00',
  },
};

export const TEACHING_PERIOD_LIST = Object.values(TEACHING_PERIOD_PRESETS);

export function getTeachingPeriodPreset(period: TeachingPeriodKey): TeachingPeriodPreset {
  return TEACHING_PERIOD_PRESETS[period];
}

/** Horas por encontro = diferença real entre início e fim (ex. 07:00–12:00 → 5h). */
export function hoursPerSessionFromTimes(startTime: string, endTime: string): number {
  return hoursBetweenTimes(startTime, endTime);
}

export function hoursPerSessionForPreset(period: TeachingPeriodKey): number {
  const p = TEACHING_PERIOD_PRESETS[period];
  return hoursPerSessionFromTimes(p.startTime, p.endTime);
}

export function formatHoursPerSession(h: number): string {
  const n = Math.round(h * 10) / 10;
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}
