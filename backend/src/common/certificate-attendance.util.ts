/** Regra institucional: certificado exige frequência mínima de 75% (dias efetivos / dias lançados). */
export const MIN_CERTIFICATE_ATTENDANCE_PCT = 75;
/** Abaixo deste % (e ≥ mínimo) consideramos zona de atenção para alertas. */
export const WARN_ATTENDANCE_PCT = 80;

export type CertificateAttendanceRisk = 'ok' | 'watch' | 'risk' | 'critical';

export interface CertificateAttendanceRow {
    present: boolean;
    justified: boolean;
}

export interface CertificateAttendanceStats {
    totalSessions: number;
    /** Presença física (não justificada como falta). */
    presentCount: number;
    /** Faltas sem justificativa aceite. */
    unjustifiedAbsenceCount: number;
    /** Faltas com justificativa (contam como “presença” para o % do certificado). */
    justifiedCount: number;
    /** Dias que contam para o mínimo de 75%: presente OU justificado. */
    effectivePresentCount: number;
    /** Percentual 0–100 com uma casa decimal. */
    attendanceRatePct: number;
    /** Limite de faltas injustificadas permitidas nos dias já lançados (piso de 25%). */
    maxUnjustifiedAllowed: number;
    /** Quantas faltas injustificadas ainda “cabe” no limite atual (nunca negativo). */
    remainingUnjustifiedSlots: number;
    /** Dias efetivos mínimos necessários nos registos atuais para atingir 75%. */
    minEffectiveDaysRequired: number;
    riskLevel: CertificateAttendanceRisk;
}

/**
 * Calcula estatísticas de frequência para elegibilidade ao certificado.
 * Justificativa aprovada conta como presença para o percentual mínimo.
 */
export function computeCertificateAttendanceStats(
    rows: CertificateAttendanceRow[],
): CertificateAttendanceStats {
    const total = rows.length;
    if (total === 0) {
        return {
            totalSessions: 0,
            presentCount: 0,
            unjustifiedAbsenceCount: 0,
            justifiedCount: 0,
            effectivePresentCount: 0,
            attendanceRatePct: 100,
            maxUnjustifiedAllowed: 0,
            remainingUnjustifiedSlots: 0,
            minEffectiveDaysRequired: 0,
            riskLevel: 'ok',
        };
    }

    const unjustifiedAbsenceCount = rows.filter(r => !r.present && !r.justified).length;
    const justifiedCount = rows.filter(r => r.justified).length;
    const presentCount = rows.filter(r => r.present && !r.justified).length;
    const effectivePresentCount = rows.filter(r => r.present || r.justified).length;

    const attendanceRatePct = Math.round((effectivePresentCount / total) * 1000) / 10;

    const maxUnjustifiedAllowed = Math.floor(total * (1 - MIN_CERTIFICATE_ATTENDANCE_PCT / 100));
    const remainingUnjustifiedSlots = Math.max(0, maxUnjustifiedAllowed - unjustifiedAbsenceCount);
    const minEffectiveDaysRequired = Math.ceil(total * (MIN_CERTIFICATE_ATTENDANCE_PCT / 100));

    let riskLevel: CertificateAttendanceRisk = 'ok';
    if (attendanceRatePct < MIN_CERTIFICATE_ATTENDANCE_PCT) {
        riskLevel = 'critical';
    } else if (attendanceRatePct < WARN_ATTENDANCE_PCT || remainingUnjustifiedSlots === 0) {
        riskLevel = 'risk';
    } else if (remainingUnjustifiedSlots === 1 || attendanceRatePct < WARN_ATTENDANCE_PCT + 5) {
        riskLevel = 'watch';
    }

    return {
        totalSessions: total,
        presentCount,
        unjustifiedAbsenceCount,
        justifiedCount,
        effectivePresentCount,
        attendanceRatePct,
        maxUnjustifiedAllowed,
        remainingUnjustifiedSlots,
        minEffectiveDaysRequired,
        riskLevel,
    };
}

export interface CalendarEnrichmentInput {
    expectedTeachingDaysSoFar: number;
    beforeCourseStart: boolean;
}

/** Metadados de calendário + taxa só por dias lançados (para comparação na UI). */
export interface CalendarEnrichmentResult extends CertificateAttendanceStats {
    expectedTeachingDaysSoFar: number;
    beforeCourseStart: boolean;
    calendarCoverageRatio: number;
    attendanceRateByRecords: number;
    usingCalendarDenominator: boolean;
    /** Curso já começou mas ainda não há nenhum lançamento de frequência para o aluno. */
    awaitsAttendanceRoll: boolean;
    /** Poucos lançamentos vs. dias letivos previstos — não usar calendário completo como denominador. */
    calendarLowCoverage: boolean;
}

/**
 * Combina estatísticas por registos lançados com dias letivos previstos (início da turma,
 * horários, fins de semana e feriados) para % e risco mais justos.
 */
export function enrichCertificateAttendanceWithCalendar(
    base: CertificateAttendanceStats,
    cal: CalendarEnrichmentInput,
): CalendarEnrichmentResult {
    const R = base.totalSessions;
    const E = cal.expectedTeachingDaysSoFar;
    const P = base.effectivePresentCount;
    const unjustified = base.unjustifiedAbsenceCount;

    const attendanceRateByRecords = R > 0
        ? Math.round((P / R) * 1000) / 10
        : (cal.beforeCourseStart ? 100 : 0);

    if (cal.beforeCourseStart) {
        return {
            ...base,
            attendanceRatePct: 100,
            riskLevel: 'ok',
            maxUnjustifiedAllowed: 0,
            remainingUnjustifiedSlots: 0,
            minEffectiveDaysRequired: 0,
            expectedTeachingDaysSoFar: 0,
            beforeCourseStart: true,
            calendarCoverageRatio: 1,
            attendanceRateByRecords,
            usingCalendarDenominator: false,
            awaitsAttendanceRoll: false,
            calendarLowCoverage: false,
        };
    }

    if (R === 0 && E > 0) {
        return {
            ...base,
            attendanceRatePct: 100,
            riskLevel: 'watch',
            maxUnjustifiedAllowed: 0,
            remainingUnjustifiedSlots: 0,
            minEffectiveDaysRequired: 0,
            expectedTeachingDaysSoFar: E,
            beforeCourseStart: false,
            calendarCoverageRatio: 0,
            attendanceRateByRecords: 100,
            usingCalendarDenominator: false,
            awaitsAttendanceRoll: true,
            calendarLowCoverage: false,
        };
    }

    const coverage = E > 0 ? R / E : 1;
    const calendarLowCoverage = E >= 5 && coverage < 0.4;
    const useCalendar = E >= 3 && !calendarLowCoverage;

    let denom = Math.max(R, 1);
    let usingCalendarDenominator = false;
    if (useCalendar && E > 0) {
        denom = Math.max(E, R, 1);
        usingCalendarDenominator = true;
    }

    let attendanceRatePct = Math.round((P / denom) * 1000) / 10;
    let maxUnjustifiedAllowed = Math.floor(denom * (1 - MIN_CERTIFICATE_ATTENDANCE_PCT / 100));
    let remainingUnjustifiedSlots = Math.max(0, maxUnjustifiedAllowed - unjustified);
    let minEffectiveDaysRequired = Math.ceil(denom * (MIN_CERTIFICATE_ATTENDANCE_PCT / 100));

    let riskLevel: CertificateAttendanceRisk = 'ok';
    if (calendarLowCoverage) {
        attendanceRatePct = base.attendanceRatePct;
        maxUnjustifiedAllowed = base.maxUnjustifiedAllowed;
        remainingUnjustifiedSlots = base.remainingUnjustifiedSlots;
        minEffectiveDaysRequired = base.minEffectiveDaysRequired;
        riskLevel = base.riskLevel === 'critical' ? 'critical' : 'watch';
    } else if (attendanceRatePct < MIN_CERTIFICATE_ATTENDANCE_PCT) {
        riskLevel = 'critical';
    } else if (attendanceRatePct < WARN_ATTENDANCE_PCT || remainingUnjustifiedSlots === 0) {
        riskLevel = 'risk';
    } else if (remainingUnjustifiedSlots === 1 || attendanceRatePct < WARN_ATTENDANCE_PCT + 5) {
        riskLevel = 'watch';
    }

    return {
        ...base,
        attendanceRatePct,
        maxUnjustifiedAllowed,
        remainingUnjustifiedSlots,
        minEffectiveDaysRequired,
        riskLevel,
        expectedTeachingDaysSoFar: E,
        beforeCourseStart: false,
        calendarCoverageRatio: Math.round(coverage * 1000) / 1000,
        attendanceRateByRecords,
        usingCalendarDenominator,
        awaitsAttendanceRoll: false,
        calendarLowCoverage,
    };
}
