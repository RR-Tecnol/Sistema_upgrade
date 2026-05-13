import type { ClassWeekendPolicy } from '@prisma/client';
import { computeCertificateAttendanceStats, enrichCertificateAttendanceWithCalendar } from './certificate-attendance.util';
import { countExpectedTeachingDaysSoFar, dateKeyUTC, startOfUTCDay } from './class-teaching-days.util';
import type { CalendarEnrichmentResult } from './certificate-attendance.util';

export interface ClassCalendarForRisk {
    startDate: Date;
    endDate: Date;
    weekendPolicy: ClassWeekendPolicy;
    weekendExtraDates: unknown;
    schedules: { weekday: number; active: boolean }[];
    holidayDates: Date[];
}

/**
 * Estatísticas de certificado + calendário letivo da turma (para API e notificações).
 */
export function buildStudentCertificateRiskState(
    rows: { present: boolean; justified: boolean }[],
    classCal: ClassCalendarForRisk,
    asOf: Date = new Date(),
): CalendarEnrichmentResult {
    const holidayKeys = new Set(
        classCal.holidayDates.map(d => dateKeyUTC(startOfUTCDay(d))),
    );
    const { expectedTeachingDaysSoFar, beforeCourseStart } = countExpectedTeachingDaysSoFar({
        classStart: classCal.startDate,
        classEnd: classCal.endDate,
        asOf,
        schedules: classCal.schedules,
        weekendPolicy: classCal.weekendPolicy,
        weekendExtraDates: classCal.weekendExtraDates,
        holidayDateKeys: holidayKeys,
    });
    const base = computeCertificateAttendanceStats(rows);
    return enrichCertificateAttendanceWithCalendar(base, {
        expectedTeachingDaysSoFar,
        beforeCourseStart,
    });
}
