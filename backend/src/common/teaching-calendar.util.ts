/**
 * Calendário letivo — fonte única para contar dias de aula e calcular data fim.
 * Usado por turma (S5B), período, pagamento de funcionários e certificados.
 */
import { ClassWeekendPolicy } from '@prisma/client';
import { dateKeyUTC, startOfUTCDay } from './class-teaching-days.util';

export type TeachingDayParams = {
  weekendPolicy?: ClassWeekendPolicy;
  scheduleDays?: number[];
  holidayDateKeys?: Set<string>;
  extraWeekendDateKeys?: Set<string>;
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Chave YYYY-MM-DD estável (UTC) — alinha catálogo de feriados e dias letivos. */
export function calendarDateKey(d: Date): string {
  return dateKeyUTC(startOfUTCDay(d));
}

/** Alias legado: mesma semântica de calendário que `calendarDateKey`. */
export function toDateStrLocal(d: Date): string {
  return calendarDateKey(d);
}

export function parseIsoDateOnly(iso: string): Date {
  const day = iso.trim().split('T')[0];
  if (ISO_DAY.test(day)) {
    const [y, m, dd] = day.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, dd, 12, 0, 0));
  }
  return startOfUTCDay(new Date(iso));
}

export function parseHolidayOrExtraKeysFromArray(raw?: string[] | null): Set<string> {
  const out = new Set<string>();
  if (!Array.isArray(raw)) return out;
  for (const v of raw) {
    if (typeof v === 'string' && ISO_DAY.test(v)) out.add(v);
  }
  return out;
}

function resolveActiveWeekdays(
  policy: ClassWeekendPolicy,
  scheduleDays: number[],
): Set<number> {
  const fromSched = scheduleDays.length
    ? new Set(scheduleDays)
    : new Set([1, 2, 3, 4, 5]);
  if (policy === ClassWeekendPolicy.WEEKDAYS_ONLY) {
    return new Set([...fromSched].filter((w) => w >= 1 && w <= 5));
  }
  if (policy === ClassWeekendPolicy.ALL_WEEKENDS) {
    const s = new Set(fromSched);
    s.add(0);
    s.add(6);
    return s;
  }
  return fromSched;
}

/** Indica se `date` é um dia letivo (antes de excluir feriados). */
export function isTeachingWeekday(
  date: Date,
  policy: ClassWeekendPolicy,
  scheduleDays: number[],
  extraWeekendDateKeys: Set<string>,
): boolean {
  const key = calendarDateKey(date);
  const dow = date.getUTCDay();
  const isWeekend = dow === 0 || dow === 6;

  switch (policy) {
    case ClassWeekendPolicy.FOLLOW_SCHEDULE: {
      const active = resolveActiveWeekdays(policy, scheduleDays);
      return active.has(dow);
    }
    case ClassWeekendPolicy.WEEKDAYS_ONLY:
      return !isWeekend;
    case ClassWeekendPolicy.ALL_WEEKENDS:
      return true;
    case ClassWeekendPolicy.SELECT_WEEKENDS:
      return !isWeekend || extraWeekendDateKeys.has(key);
    default:
      return !isWeekend;
  }
}

/** Dia letivo = regra de FDS + não é feriado. */
export function isTeachingDay(date: Date, p: TeachingDayParams): boolean {
  const policy = p.weekendPolicy ?? ClassWeekendPolicy.WEEKDAYS_ONLY;
  const holidays = p.holidayDateKeys ?? new Set<string>();
  const extras = p.extraWeekendDateKeys ?? new Set<string>();
  const key = calendarDateKey(date);
  if (holidays.has(key)) return false;
  return isTeachingWeekday(date, policy, p.scheduleDays ?? [], extras);
}

export function countTeachingDaysBetween(
  dataInicio: Date,
  dataFim: Date,
  p: TeachingDayParams,
): number {
  if (dataFim < dataInicio) return 0;
  const start = parseIsoDateOnly(toDateStrLocal(dataInicio));
  const end = parseIsoDateOnly(toDateStrLocal(dataFim));
  let count = 0;
  const cur = new Date(start);
  while (calendarDateKey(cur) <= calendarDateKey(end)) {
    if (isTeachingDay(cur, p)) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return Math.max(0, count);
}

export function countCalendarDaysInclusive(dataInicio: Date, dataFim: Date): number {
  const start = parseIsoDateOnly(toDateStrLocal(dataInicio));
  const end = parseIsoDateOnly(toDateStrLocal(dataFim));
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(diff / 86400000) + 1);
}

export type TeachingEndDateResult = {
  endDate: Date;
  teachingDaysTarget: number;
  teachingDaysCounted: number;
  calendarDays: number;
};

/**
 * Avança a partir de `startDate` até acumular `teachingDaysTarget` dias letivos.
 * Personalização: `maxCalendarDays` evita loop infinito (padrão ~3 anos).
 */
export function calcularDataFimPorDiasLetivos(
  startDate: Date,
  teachingDaysTarget: number,
  p: TeachingDayParams,
  maxCalendarDays = 1100,
): TeachingEndDateResult {
  const target = Math.max(1, Math.floor(teachingDaysTarget));
  const start = parseIsoDateOnly(toDateStrLocal(startDate));
  const cur = new Date(start);
  let teachingFound = 0;
  let lastTeaching: Date = new Date(start);

  for (let i = 0; i < maxCalendarDays; i++) {
    if (isTeachingDay(cur, p)) {
      teachingFound++;
      lastTeaching = new Date(cur);
      if (teachingFound >= target) break;
    }
    if (teachingFound >= target) break;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  if (teachingFound < target) {
    lastTeaching = new Date(cur);
  }

  const calendarDays = countCalendarDaysInclusive(start, lastTeaching);
  return {
    endDate: lastTeaching,
    teachingDaysTarget: target,
    teachingDaysCounted: teachingFound,
    calendarDays,
  };
}
