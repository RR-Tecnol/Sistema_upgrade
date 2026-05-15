import type { ClassWeekendPolicy } from '@prisma/client';

/** weekday JS/BD: 0=Dom … 6=Sáb (Date.getUTCDay). */

export function startOfUTCDay(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function dateKeyUTC(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function addDaysUTC(d: Date, n: number): Date {
    const x = new Date(d.getTime());
    x.setUTCDate(x.getUTCDate() + n);
    return x;
}

export function parseHolidayOrExtraKeys(raw: unknown): Set<string> {
    const out = new Set<string>();
    if (!Array.isArray(raw)) return out;
    for (const v of raw) {
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) out.add(v);
    }
    return out;
}

export function resolveAllowedWeekdays(
    policy: ClassWeekendPolicy,
    schedules: { weekday: number; active: boolean }[],
): Set<number> {
    const fromSched = new Set(
        schedules.filter(s => s.active !== false).map(s => s.weekday),
    );
    if (fromSched.size === 0) {
        [1, 2, 3, 4, 5].forEach(w => fromSched.add(w));
    }
    if (policy === 'WEEKDAYS_ONLY') {
        return new Set([...fromSched].filter(w => w >= 1 && w <= 5));
    }
    if (policy === 'ALL_WEEKENDS') {
        const s = new Set(fromSched);
        s.add(0);
        s.add(6);
        return s;
    }
    return fromSched;
}

export interface ExpectedTeachingDaysParams {
    classStart: Date;
    classEnd: Date;
    /** Normalmente “hoje” em UTC; dias futuros não entram na contagem. */
    asOf: Date;
    schedules: { weekday: number; active: boolean }[];
    weekendPolicy: ClassWeekendPolicy;
    /** SELECT_WEEKENDS: datas YYYY-MM-DD com aula em fim de semana (ou exceção). */
    weekendExtraDates: unknown;
    /** Datas YYYY-MM-DD sem aula (ClassHoliday). */
    holidayDateKeys: Set<string>;
}

/**
 * Conta dias letivos previstos entre o início da turma e `asOf` (ou fim da turma),
 * respeitando horário (class_schedules), política de fins de semana e feriados da turma.
 */
export function countExpectedTeachingDaysSoFar(p: ExpectedTeachingDaysParams): {
    expectedTeachingDaysSoFar: number;
    beforeCourseStart: boolean;
    courseEnded: boolean;
} {
    const start = startOfUTCDay(p.classStart);
    const end = startOfUTCDay(p.classEnd);
    const today = startOfUTCDay(p.asOf);
    if (today.getTime() < start.getTime()) {
        return { expectedTeachingDaysSoFar: 0, beforeCourseStart: true, courseEnded: false };
    }
    const last = today.getTime() <= end.getTime() ? today : end;
    const allowed = resolveAllowedWeekdays(p.weekendPolicy, p.schedules);
    const extras = parseHolidayOrExtraKeys(p.weekendExtraDates);

    let count = 0;
    for (let d = new Date(start.getTime()); d.getTime() <= last.getTime(); d = addDaysUTC(d, 1)) {
        const key = dateKeyUTC(d);
        if (p.holidayDateKeys.has(key)) continue;
        const wd = d.getUTCDay();
        let isTeaching = allowed.has(wd);
        if (p.weekendPolicy === 'SELECT_WEEKENDS' && extras.has(key)) {
            isTeaching = true;
        }
        if (isTeaching) count++;
    }

    return {
        expectedTeachingDaysSoFar: count,
        beforeCourseStart: false,
        courseEnded: today.getTime() > end.getTime(),
    };
}
