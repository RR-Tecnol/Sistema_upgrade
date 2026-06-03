export type TeachingPeriodKey = 'MORNING' | 'AFTERNOON' | 'EVENING';

export type TeachingPeriodPreset = {
  period: TeachingPeriodKey;
  label: string;
  startTime: string;
  endTime: string;
  timeRange: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
};

function hoursBetweenTimes(startTime: string, endTime: string): number {
  const parse = (t: string) => {
    const m = String(t || '').trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    return Number(m[1]) + Number(m[2]) / 60;
  };
  const start = parse(startTime);
  const end = parse(endTime);
  if (start == null || end == null || end <= start) return 0;
  return Math.round((end - start) * 100) / 100;
}

export const TEACHING_PERIOD_PRESETS: Record<TeachingPeriodKey, TeachingPeriodPreset> = {
  MORNING: {
    period: 'MORNING',
    label: 'Manhã',
    startTime: '07:00',
    endTime: '12:00',
    timeRange: '07:00 – 12:00',
    icon: '🌅',
    color: '#F59E0B',
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  AFTERNOON: {
    period: 'AFTERNOON',
    label: 'Tarde',
    startTime: '13:00',
    endTime: '18:00',
    timeRange: '13:00 – 18:00',
    icon: '☀️',
    color: '#EA580C',
    bg: '#FFF7ED',
    border: '#FED7AA',
  },
  EVENING: {
    period: 'EVENING',
    label: 'Noite',
    startTime: '19:00',
    endTime: '22:00',
    timeRange: '19:00 – 22:00',
    icon: '🌙',
    color: '#6366F1',
    bg: '#EEF2FF',
    border: '#C7D2FE',
  },
};

export const TEACHING_PERIOD_LIST = Object.values(TEACHING_PERIOD_PRESETS);

export function hoursPerSessionFromTimes(startTime: string, endTime: string): number {
  return hoursBetweenTimes(startTime, endTime);
}

export function teachingDaysFromWorkload(workloadHours: number, startTime: string, endTime: string): number {
  const hps = hoursPerSessionFromTimes(startTime, endTime);
  if (hps <= 0 || workloadHours <= 0) return 0;
  return Math.max(1, Math.ceil(workloadHours / hps));
}

export function buildFormulaLabel(workloadHours: number, startTime: string, endTime: string): string {
  const hps = hoursPerSessionFromTimes(startTime, endTime);
  const n = teachingDaysFromWorkload(workloadHours, startTime, endTime);
  const fmt = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(1).replace('.', ','));
  return `${workloadHours}h ÷ ${fmt(hps)}h = ${n} encontros`;
}
