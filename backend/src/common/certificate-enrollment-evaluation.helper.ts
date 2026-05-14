import { AbsenceStatus, type ClassWeekendPolicy } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CertificateEligibilityBreakdown } from './certificate-eligibility.util';
import {
    absenceDateOverlapsClassUtcPeriod,
    applyImprevistoPenaltiesAndEvaluateEligibility,
} from './certificate-eligibility.util';
import { buildStudentCertificateRiskState, type ClassCalendarForRisk } from './student-certificate-risk.util';

type ClassForCertEval = {
    startDate: Date;
    endDate: Date;
    weekendPolicy: ClassWeekendPolicy;
    weekendExtraDates: unknown;
    schedules: { weekday: number; active: boolean }[];
    holidays: { date: Date }[];
};

function evaluateWithClsRowsPenal(
    cls: ClassForCertEval,
    rows: { present: boolean; justified: boolean }[],
    penalRows: { date: Date; penalty: unknown }[],
    asOf: Date,
): CertificateEligibilityBreakdown {
    let penaltySum = 0;
    for (const p of penalRows) {
        if (!absenceDateOverlapsClassUtcPeriod(p.date, cls.startDate, cls.endDate)) continue;
        penaltySum += Number(p.penalty);
    }
    penaltySum = Math.round(penaltySum * 100) / 100;

    const classCal: ClassCalendarForRisk = {
        startDate: cls.startDate,
        endDate: cls.endDate,
        weekendPolicy: cls.weekendPolicy,
        weekendExtraDates: cls.weekendExtraDates,
        schedules: cls.schedules,
        holidayDates: cls.holidays.map((h) => h.date),
    };

    const enriched = buildStudentCertificateRiskState(rows, classCal, asOf);
    return applyImprevistoPenaltiesAndEvaluateEligibility(enriched, penaltySum);
}

/**
 * Motor único: frequência + calendário + soma única das penalidades `PENALIZED` no período da turma.
 */
export async function evaluateCertificateEligibilityForEnrollment(
    prisma: PrismaService,
    studentId: string,
    classId: string,
    asOf: Date = new Date(),
): Promise<CertificateEligibilityBreakdown | null> {
    const [student, cls] = await Promise.all([
        prisma.student.findUnique({ where: { id: studentId }, select: { userId: true } }),
        prisma.class.findUnique({
            where: { id: classId },
            include: {
                schedules: { where: { active: true } },
                holidays: { where: { active: true }, select: { date: true } },
            },
        }),
    ]);

    if (!student?.userId || !cls) return null;

    const [rows, penalRows] = await Promise.all([
        prisma.attendance.findMany({
            where: { classId, studentId },
            select: { present: true, justified: true },
        }),
        prisma.absence.findMany({
            where: {
                userId: student.userId,
                status: AbsenceStatus.PENALIZED,
                active: true,
                penalty: { not: null },
            },
            select: { date: true, penalty: true },
        }),
    ]);

    return evaluateWithClsRowsPenal(cls, rows, penalRows, asOf);
}

/**
 * Avalia elegibilidade ao certificado para vários alunos da mesma turma com consultas agregadas
 * (usado em relatórios PDF / lista de concludentes).
 */
export async function evaluateCertificateEligibilityMapForClass(
    prisma: PrismaService,
    classId: string,
    studentIds: string[],
    asOf: Date = new Date(),
): Promise<Map<string, CertificateEligibilityBreakdown | null>> {
    const out = new Map<string, CertificateEligibilityBreakdown | null>();
    if (studentIds.length === 0) return out;

    const cls = await prisma.class.findUnique({
        where: { id: classId },
        include: {
            schedules: { where: { active: true } },
            holidays: { where: { active: true }, select: { date: true } },
        },
    });

    if (!cls) {
        for (const id of studentIds) out.set(id, null);
        return out;
    }

    const students = await prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, userId: true },
    });
    const userIdByStudent = new Map(students.map((s) => [s.id, s.userId]));

    const userIds = [...new Set(students.map((s) => s.userId))];

    const [allAtt, penalAll] = await Promise.all([
        prisma.attendance.findMany({
            where: { classId, studentId: { in: studentIds } },
            select: { studentId: true, present: true, justified: true },
        }),
        userIds.length
            ? prisma.absence.findMany({
                  where: {
                      userId: { in: userIds },
                      status: AbsenceStatus.PENALIZED,
                      active: true,
                      penalty: { not: null },
                  },
                  select: { userId: true, date: true, penalty: true },
              })
            : Promise.resolve([] as { userId: string; date: Date; penalty: unknown }[]),
    ]);

    const attByStudent = new Map<string, { present: boolean; justified: boolean }[]>();
    for (const sid of studentIds) attByStudent.set(sid, []);
    for (const a of allAtt) {
        attByStudent.get(a.studentId)?.push({ present: a.present, justified: a.justified });
    }

    const penalByUser = new Map<string, { date: Date; penalty: unknown }[]>();
    for (const p of penalAll) {
        const arr = penalByUser.get(p.userId) ?? [];
        arr.push({ date: p.date, penalty: p.penalty });
        penalByUser.set(p.userId, arr);
    }

    for (const sid of studentIds) {
        const uid = userIdByStudent.get(sid);
        if (!uid) {
            out.set(sid, null);
            continue;
        }
        const rows = attByStudent.get(sid) ?? [];
        const penalRows = penalByUser.get(uid) ?? [];
        out.set(sid, evaluateWithClsRowsPenal(cls, rows, penalRows, asOf));
    }
    return out;
}
