import type { GlobalHolidayScope, PrismaClient } from '@prisma/client';
import { startOfUTCDay } from './class-teaching-days.util';
import { calendarDateKey } from './teaching-calendar.util';

function parseDayUtc(iso: string): Date {
  const d = new Date(iso + 'T12:00:00.000Z');
  return startOfUTCDay(d);
}

/**
 * Feriados do catálogo global (nacional + estadual por UF) + feriados/imprevistos da turma.
 */
export async function fetchMergedHolidayDatesForClass(
  prisma: PrismaClient,
  opts: {
    classId?: string | null;
    stateCode?: string | null;
    rangeStart?: Date;
    rangeEnd?: Date;
  },
): Promise<Date[]> {
  const dates: Date[] = [];
  const seen = new Set<string>();

  const push = (d: Date) => {
    const key = calendarDateKey(d);
    if (seen.has(key)) return;
    seen.add(key);
    dates.push(d);
  };

  const rangeStart = opts.rangeStart ? startOfUTCDay(opts.rangeStart) : undefined;
  const rangeEnd = opts.rangeEnd ? startOfUTCDay(opts.rangeEnd) : undefined;

  const inRange = (d: Date) => {
    if (rangeStart && d.getTime() < rangeStart.getTime()) return false;
    if (rangeEnd && d.getTime() > rangeEnd.getTime()) return false;
    return true;
  };

  const catalogWhere: {
    active: boolean;
    date?: { gte?: Date; lte?: Date };
    OR: Array<{ scope: GlobalHolidayScope; stateCode?: string }>;
  } = {
    active: true,
    OR: [{ scope: 'NATIONAL' }],
  };

  const uf = opts.stateCode?.trim().toUpperCase().slice(0, 2);
  if (uf && /^[A-Z]{2}$/.test(uf)) {
    catalogWhere.OR.push({ scope: 'STATE', stateCode: uf });
  }

  if (rangeStart || rangeEnd) {
    catalogWhere.date = {};
    if (rangeStart) catalogWhere.date.gte = rangeStart;
    if (rangeEnd) catalogWhere.date.lte = rangeEnd;
  }

  const globalRows = await prisma.globalHoliday.findMany({
    where: catalogWhere,
    select: { date: true },
  });
  for (const row of globalRows) {
    const d = startOfUTCDay(new Date(row.date));
    if (inRange(d)) push(d);
  }

  if (opts.classId) {
    const classWhere: { classId: string; active: boolean; date?: { gte?: Date; lte?: Date } } = {
      classId: opts.classId,
      active: true,
    };
    if (rangeStart || rangeEnd) {
      classWhere.date = {};
      if (rangeStart) classWhere.date.gte = rangeStart;
      if (rangeEnd) classWhere.date.lte = rangeEnd;
    }
    const classRows = await prisma.classHoliday.findMany({
      where: classWhere,
      select: { date: true },
    });
    for (const row of classRows) {
      const d = startOfUTCDay(new Date(row.date));
      if (inRange(d)) push(d);
    }
  }

  return dates;
}

export type HolidayCatalogEntry = {
  date: string;
  reason: string;
  source: 'catalog_national' | 'catalog_state' | 'class_occurrence';
};

/** Feriados no intervalo com motivo (para painel operacional S5C). */
export async function fetchHolidayEntriesForClass(
  prisma: PrismaClient,
  opts: {
    classId?: string | null;
    stateCode?: string | null;
    rangeStart: Date;
    rangeEnd: Date;
  },
): Promise<HolidayCatalogEntry[]> {
  const out: HolidayCatalogEntry[] = [];
  const seen = new Set<string>();
  const rangeStart = startOfUTCDay(opts.rangeStart);
  const rangeEnd = startOfUTCDay(opts.rangeEnd);

  const push = (date: Date, reason: string, source: HolidayCatalogEntry['source']) => {
    const key = calendarDateKey(date);
    if (seen.has(key)) return;
    seen.add(key);
    if (date.getTime() < rangeStart.getTime() || date.getTime() > rangeEnd.getTime()) return;
    out.push({ date: key, reason, source });
  };

  const uf = opts.stateCode?.trim().toUpperCase().slice(0, 2);
  const catalogWhere: {
    active: boolean;
    date: { gte: Date; lte: Date };
    OR: Array<{ scope: GlobalHolidayScope; stateCode?: string }>;
  } = {
    active: true,
    date: { gte: rangeStart, lte: rangeEnd },
    OR: [{ scope: 'NATIONAL' }],
  };
  if (uf && /^[A-Z]{2}$/.test(uf)) {
    catalogWhere.OR.push({ scope: 'STATE', stateCode: uf });
  }

  const globalRows = await prisma.globalHoliday.findMany({
    where: catalogWhere,
    select: { date: true, reason: true, scope: true, stateCode: true },
    orderBy: { date: 'asc' },
  });
  for (const row of globalRows) {
    const d = startOfUTCDay(new Date(row.date));
    push(
      d,
      row.reason,
      row.scope === 'STATE' ? 'catalog_state' : 'catalog_national',
    );
  }

  if (opts.classId) {
    const classRows = await prisma.classHoliday.findMany({
      where: {
        classId: opts.classId,
        active: true,
        date: { gte: rangeStart, lte: rangeEnd },
      },
      select: { date: true, reason: true },
      orderBy: { date: 'asc' },
    });
    for (const row of classRows) {
      push(startOfUTCDay(new Date(row.date)), row.reason, 'class_occurrence');
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export { parseDayUtc };
