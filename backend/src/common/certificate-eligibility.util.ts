import type { CalendarEnrichmentResult, CertificateAttendanceRisk } from './certificate-attendance.util';
import {
    MIN_CERTIFICATE_ATTENDANCE_PCT,
    WARN_ATTENDANCE_PCT,
} from './certificate-attendance.util';

/** Verifica se o dia civil UTC da falta/imprevisto cai dentro do período inclusivo da turma. */
export function absenceDateOverlapsClassUtcPeriod(
    absenceDate: Date,
    classStart: Date,
    classEnd: Date,
): boolean {
    const stamp = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const a = stamp(absenceDate);
    const s = stamp(classStart);
    const e = stamp(classEnd);
    return a >= s && a <= e;
}

/** Alinha à chave única `[classId, studentId, date]` usada em `bulkAttendance` (meia-noite UTC). */
export function attendanceDateUtcMidnightFrom(absenceDate: Date): Date {
    return new Date(
        Date.UTC(absenceDate.getUTCFullYear(), absenceDate.getUTCMonth(), absenceDate.getUTCDate()),
    );
}

function riskLevelAfterPenaltyEffective(
    enriched: CalendarEnrichmentResult,
    afterPct: number,
): CertificateAttendanceRisk {
    if (enriched.beforeCourseStart) {
        return 'ok';
    }
    if (enriched.awaitsAttendanceRoll || enriched.totalSessions === 0) {
        return enriched.riskLevel;
    }

    const u = enriched.unjustifiedAbsenceCount;
    const maxU = enriched.maxUnjustifiedAllowed;

    if (enriched.calendarLowCoverage) {
        if (afterPct < MIN_CERTIFICATE_ATTENDANCE_PCT) return 'critical';
        if (u > maxU || afterPct < WARN_ATTENDANCE_PCT) return 'risk';
        return enriched.riskLevel === 'critical' ? 'critical' : 'watch';
    }

    const remaining = Math.max(0, maxU - u);

    if (afterPct < MIN_CERTIFICATE_ATTENDANCE_PCT) return 'critical';
    if (afterPct < WARN_ATTENDANCE_PCT || remaining === 0 || u > maxU) return 'risk';
    if (remaining === 1 || afterPct < WARN_ATTENDANCE_PCT + 5) return 'watch';
    return 'ok';
}

export interface CertificateEligibilityBreakdown extends CalendarEnrichmentResult {
    imprevistoPenaltyPctSum: number;
    attendanceRateBeforePenaltyPct: number;
    attendanceRateAfterPenaltyPct: number;
    certificateEligible: boolean;
    certificateBlockReasons: string[];
    /** Risco após penalidades explícitas (PENALIZED) sobre o mesmo % institucional. */
    riskLevelAfterPenalty: CertificateAttendanceRisk;
}

/**
 * Contrato institucional: só `Absence.status === PENALIZED` conta em `penalty` (% período turma).
 * `REJECTED` sem penalidade não acrescenta aqui — efecto apenas via `Attendance`.
 */
export function applyImprevistoPenaltiesAndEvaluateEligibility(
    enriched: CalendarEnrichmentResult,
    imprevistoPenaltyPctSum: number,
): CertificateEligibilityBreakdown {
    const roundedPenalty = Math.round(Math.max(0, imprevistoPenaltyPctSum) * 100) / 100;
    const before = enriched.attendanceRatePct;
    const after = Math.round(Math.max(0, before - roundedPenalty) * 10) / 10;

    const riskLevelAfterPenalty = riskLevelAfterPenaltyEffective(enriched, after);

    const reasons: string[] = [];

    if (enriched.beforeCourseStart) {
        reasons.push('O período letivo da turma ainda não começou para este cálculo.');
    }

    if (enriched.awaitsAttendanceRoll) {
        reasons.push(
            'Ainda não há lançamento de frequência para este aluno nesta turma; não é possível comprovar o mínimo exigível.',
        );
    }

    if (!enriched.beforeCourseStart && !enriched.awaitsAttendanceRoll) {
        if (enriched.unjustifiedAbsenceCount > enriched.maxUnjustifiedAllowed) {
            reasons.push(
                    `Faltas injustificadas (${enriched.unjustifiedAbsenceCount}) ultrapassam o permitido (${enriched.maxUnjustifiedAllowed}) para manter pelo menos ${MIN_CERTIFICATE_ATTENDANCE_PCT}% com o denominador atual.`,
            );
        }
        if (after < MIN_CERTIFICATE_ATTENDANCE_PCT) {
            if (roundedPenalty > 0) {
                reasons.push(
                    `Com desconto de penalidades de imprevisto (${roundedPenalty.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% sobre o período da turma), a presença efectiva ficou em ${after}% — abaixo do mínimo de ${MIN_CERTIFICATE_ATTENDANCE_PCT}% para certificação.`,
                );
            } else {
                reasons.push(
                    `A presença efectiva (${after}%) está abaixo do mínimo de ${MIN_CERTIFICATE_ATTENDANCE_PCT}% para certificação.`,
                );
            }
        }
    }

    const certificateEligible = reasons.length === 0;

    return {
        ...enriched,
        imprevistoPenaltyPctSum: roundedPenalty,
        attendanceRateBeforePenaltyPct: before,
        attendanceRateAfterPenaltyPct: after,
        certificateEligible,
        certificateBlockReasons: reasons,
        riskLevelAfterPenalty,
    };
}
