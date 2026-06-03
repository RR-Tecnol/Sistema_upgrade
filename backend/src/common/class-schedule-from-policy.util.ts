/**
 * Grade de aula derivada de weekendPolicy — alinha motor letivo e geração de viagens.
 */
import { ClassWeekendPolicy } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { resolveAllowedWeekdays } from './class-teaching-days.util';

export type ClassScheduleSource = {
    weekendPolicy: ClassWeekendPolicy;
    schedules: { weekday: number; active: boolean }[];
};

/** Dias da semana (0=Dom … 6=Sáb) em que há aula, conforme política + grade opcional. */
export function weekdaysFromClass(cls: ClassScheduleSource): Set<number> {
    return resolveAllowedWeekdays(
        cls.weekendPolicy ?? ClassWeekendPolicy.WEEKDAYS_ONLY,
        cls.schedules ?? [],
    );
}

/** Persiste class_schedules quando vazio — idempotente (não altera grade manual existente). */
export async function ensureClassScheduleFromPolicy(
    prisma: PrismaService,
    classId: string,
): Promise<{ created: number; weekdays: number[] }> {
    const cls = await prisma.class.findUnique({
        where: { id: classId },
        select: {
            weekendPolicy: true,
            schedules: { select: { weekday: true, active: true } },
        },
    });
    if (!cls) return { created: 0, weekdays: [] };

    const existing = cls.schedules.filter(s => s.active !== false);
    if (existing.length > 0) {
        return {
            created: 0,
            weekdays: existing.map(s => s.weekday).sort((a, b) => a - b),
        };
    }

    const allowed = weekdaysFromClass(cls);
    const weekdays = [...allowed].sort((a, b) => a - b);
    if (weekdays.length === 0) {
        return { created: 0, weekdays: [] };
    }

    await prisma.classSchedule.createMany({
        data: weekdays.map(weekday => ({
            classId,
            weekday,
            active: true,
        })),
    });

    return { created: weekdays.length, weekdays };
}
