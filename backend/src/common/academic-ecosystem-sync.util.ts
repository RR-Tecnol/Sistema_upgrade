/**
 * Sincronização Curso ↔ Período (Acao) ↔ Turma ↔ Motorista/Carreta/Viagens.
 */
import { BadRequestException } from '@nestjs/common';
import { ClassWeekendPolicy, EmployeeRole, Period, Prisma, TripStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { syncCourseTeachersToClass } from './teacher-academic-link.util';
import { resolveTeacherOrThrow } from './resolve-teacher.util';
import { ensureClassScheduleFromPolicy } from './class-schedule-from-policy.util';
import type { TripsService } from '../trips/trips.service';

export type TurmaAcaoSyncResult = {
    inheritedClassTeachers: number;
    truckSynced: boolean;
    locationSynced: boolean;
    datesSynced: boolean;
};

/** Turma entrou no período: professores do curso + carreta/local do período. */
export async function syncTurmaLinkedToAcao(
    prisma: PrismaService,
    acaoId: string,
    classId: string,
): Promise<TurmaAcaoSyncResult> {
    const [acao, cls] = await Promise.all([
        prisma.acao.findUnique({ where: { id: acaoId } }),
        prisma.class.findUnique({ where: { id: classId } }),
    ]);
    if (!acao) throw new BadRequestException('Período não encontrado');
    if (!cls) throw new BadRequestException('Turma não encontrada');

    const inherited = await syncCourseTeachersToClass(prisma, classId);

    const extraRaw = acao.weekendExtraDates as string[] | null | undefined;
    const classPatch: Prisma.ClassUpdateInput = {
        startDate: acao.dataInicio,
        endDate: acao.dataFim,
        period: (acao.period as Period) ?? Period.MORNING,
        startTime: acao.startTime ?? '07:00',
        endTime: acao.endTime ?? '12:00',
        weekendPolicy: (acao.weekendPolicy as ClassWeekendPolicy) ?? ClassWeekendPolicy.WEEKDAYS_ONLY,
        weekendExtraDates:
            Array.isArray(extraRaw) && extraRaw.length
                ? extraRaw.filter(x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x))
                : Prisma.JsonNull,
    };
    if (acao.carretaId) {
        classPatch.truck = { connect: { id: acao.carretaId } };
    }
    if (acao.localExecucao) {
        classPatch.locationName = acao.localExecucao;
    }
    if (acao.localEndereco) {
        classPatch.locationAddress = acao.localEndereco;
    }
    if (acao.localReferencia) {
        classPatch.locationReference = acao.localReferencia;
    }
    if (acao.localLatitude != null) {
        classPatch.locationLatitude = acao.localLatitude;
    }
    if (acao.localLongitude != null) {
        classPatch.locationLongitude = acao.localLongitude;
    }
    if (acao.cidadeId && cls.cityId !== acao.cidadeId) {
        classPatch.city = { connect: { id: acao.cidadeId } };
    }

    await prisma.class.update({ where: { id: classId }, data: classPatch });
    await ensureClassScheduleFromPolicy(prisma, classId);

    return {
        inheritedClassTeachers: inherited.classLinks,
        truckSynced: !!acao.carretaId,
        locationSynced: !!(acao.localExecucao || acao.localEndereco),
        datesSynced: true,
    };
}

export type TripGenPerClass = {
    classId: string;
    classIdentifier?: string;
    generated: number;
    message: string;
};

/** Gera viagens para uma turma e todos os motoristas DRIVER já no período. */
export async function tryGenerateTripsForNewTurmaOnAcao(
    prisma: PrismaService,
    tripsService: TripsService,
    acaoId: string,
    turmaId: string,
): Promise<{ perClass: TripGenPerClass[]; totalGenerated: number; warnings: string[] }> {
    await ensureClassScheduleFromPolicy(prisma, turmaId);

    const turma = await prisma.class.findUnique({
        where: { id: turmaId },
        select: { classIdentifier: true },
    });

    const drivers = await prisma.acaoFuncionario.findMany({
        where: { acaoId, employee: { role: EmployeeRole.DRIVER, userId: { not: null } } },
        include: { employee: { select: { userId: true, name: true } } },
    });

    const warnings: string[] = [];
    let totalGenerated = 0;
    const perClass: TripGenPerClass[] = [];

    if (!drivers.length) {
        return {
            perClass: [{
                classId: turmaId,
                classIdentifier: turma?.classIdentifier,
                generated: 0,
                message: 'Nenhum motorista vinculado ao período — viagens não geradas.',
            }],
            totalGenerated: 0,
            warnings: [],
        };
    }

    for (const d of drivers) {
        const userId = d.employee.userId!;
        try {
            const gen = await tripsService.generateTripsForClass(turmaId, userId, acaoId);
            totalGenerated += gen.generated ?? 0;
            perClass.push({
                classId: turmaId,
                classIdentifier: turma?.classIdentifier,
                generated: gen.generated ?? 0,
                message: gen.message,
            });
        } catch (e: any) {
            const msg = e?.message || 'Erro ao gerar viagens';
            warnings.push(`${d.employee.name}: ${msg}`);
            perClass.push({
                classId: turmaId,
                classIdentifier: turma?.classIdentifier,
                generated: 0,
                message: msg,
            });
        }
    }

    return { perClass, totalGenerated, warnings };
}

/** Professores elegíveis no período = união dos TeacherCourse dos cursos das turmas vinculadas. */
export async function listTeacherPoolForAcao(prisma: PrismaService, acaoId: string) {
    const links = await prisma.acaoTurma.findMany({
        where: { acaoId },
        include: {
            turma: {
                select: {
                    courseId: true,
                    course: { select: { id: true, name: true } },
                },
            },
        },
    });
    const courseIds = [...new Set(links.map(l => l.turma?.courseId).filter(Boolean) as string[])];
    if (!courseIds.length) return [];

    const rows = await prisma.teacherCourse.findMany({
        where: { courseId: { in: courseIds } },
        include: {
            teacher: {
                include: {
                    user: { select: { id: true, name: true, email: true, role: true } },
                },
            },
            course: { select: { id: true, name: true } },
        },
    });

    const byUser = new Map<
        string,
        { userId: string; teacherId: string; name: string; email: string; courses: { id: string; name: string }[] }
    >();
    for (const row of rows) {
        const u = row.teacher?.user;
        if (!u) continue;
        const prev = byUser.get(u.id) || {
            userId: u.id,
            teacherId: row.teacherId,
            name: u.name,
            email: u.email,
            courses: [],
        };
        if (!prev.courses.some(c => c.id === row.course.id)) {
            prev.courses.push({ id: row.course.id, name: row.course.name });
        }
        byUser.set(u.id, prev);
    }
    return Array.from(byUser.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export type DriverAcaoSyncResult = {
    driverUserId?: string;
    driverName?: string;
    truckId?: string | null;
    truckSynced: boolean;
    turmasAtualizadas: number;
    totalGenerated: number;
    tripsWarning?: string;
    perClass?: TripGenPerClass[];
    skipped?: boolean;
    message: string;
};

/** Aplica carreta do período nas turmas vinculadas (não depende de viagens). */
export async function syncDriverTruckForAcao(
    prisma: PrismaService,
    acaoId: string,
): Promise<{ truckSynced: boolean; turmasAtualizadas: number; truckId?: string | null; message: string }> {
    const acao = await prisma.acao.findUnique({
        where: { id: acaoId },
        include: { turmas: { select: { turmaId: true } } },
    });
    if (!acao) throw new BadRequestException('Período não encontrado');
    if (!acao.turmas.length) {
        return {
            truckSynced: false,
            turmasAtualizadas: 0,
            message: 'Nenhuma turma vinculada ao período.',
        };
    }
    if (!acao.carretaId) {
        return {
            truckSynced: false,
            turmasAtualizadas: 0,
            truckId: null,
            message: 'Informe a carreta do período na Visão Geral para sincronizar nas turmas.',
        };
    }

    let turmasAtualizadas = 0;
    for (const link of acao.turmas) {
        await prisma.class.update({
            where: { id: link.turmaId },
            data: { truckId: acao.carretaId },
        });
        turmasAtualizadas += 1;
    }

    return {
        truckSynced: true,
        turmasAtualizadas,
        truckId: acao.carretaId,
        message: `Carreta aplicada em ${turmasAtualizadas} turma(s).`,
    };
}

/** Gera viagens por turma — falhas viram aviso, não exceção. */
export async function tryGenerateTripsForAcao(
    prisma: PrismaService,
    tripsService: TripsService,
    acaoId: string,
    driverUserId: string,
): Promise<{ totalGenerated: number; tripsWarning?: string; perClass: TripGenPerClass[] }> {
    const acao = await prisma.acao.findUnique({
        where: { id: acaoId },
        include: {
            turmas: {
                select: {
                    turmaId: true,
                    turma: { select: { classIdentifier: true } },
                },
            },
        },
    });
    if (!acao?.turmas.length) {
        return { totalGenerated: 0, tripsWarning: 'Sem turmas no período.', perClass: [] };
    }

    const driver = await prisma.user.findFirst({
        where: { id: driverUserId, role: 'DRIVER' },
    });
    if (!driver) {
        return {
            totalGenerated: 0,
            tripsWarning: 'Funcionário sem usuário DRIVER vinculado — viagens não geradas.',
            perClass: [],
        };
    }

    const perClass: TripGenPerClass[] = [];
    const warnings: string[] = [];
    let totalGenerated = 0;

    for (const link of acao.turmas) {
        const classIdentifier = link.turma?.classIdentifier;
        await ensureClassScheduleFromPolicy(prisma, link.turmaId);
        try {
            const gen = await tripsService.generateTripsForClass(link.turmaId, driver.id);
            totalGenerated += gen.generated ?? 0;
            perClass.push({
                classId: link.turmaId,
                classIdentifier,
                generated: gen.generated ?? 0,
                message: gen.message,
            });
        } catch (e: any) {
            const msg = e?.message || 'Erro ao gerar viagens';
            warnings.push(classIdentifier ? `${classIdentifier}: ${msg}` : msg);
            perClass.push({ classId: link.turmaId, classIdentifier, generated: 0, message: msg });
        }
    }

    return {
        totalGenerated,
        tripsWarning: warnings.length ? warnings.join(' | ') : undefined,
        perClass,
    };
}

/** Motorista no período → carreta + viagens best-effort (API legada e fluxo unificado). */
export async function assignDriverToAcaoPeriod(
    prisma: PrismaService,
    tripsService: TripsService,
    acaoId: string,
    driverUserIdOrAny: string,
    opts?: { throwWithoutCarreta?: boolean },
): Promise<DriverAcaoSyncResult> {
    const acao = await prisma.acao.findUnique({
        where: { id: acaoId },
        include: { turmas: { select: { turmaId: true } } },
    });
    if (!acao) throw new BadRequestException('Período não encontrado');
    if (!acao.turmas.length) {
        throw new BadRequestException('Vincule pelo menos uma turma ao período.');
    }
    if (!acao.carretaId && opts?.throwWithoutCarreta !== false) {
        throw new BadRequestException('Vincule uma carreta ao período antes de atribuir o motorista.');
    }

    const driver = await prisma.user.findFirst({
        where: { id: driverUserIdOrAny, role: 'DRIVER' },
    });
    if (!driver) {
        throw new BadRequestException('Utilizador não é motorista ou não foi encontrado.');
    }

    const truck = await syncDriverTruckForAcao(prisma, acaoId);
    const trips = await tryGenerateTripsForAcao(prisma, tripsService, acaoId, driver.id);

    const message =
        trips.totalGenerated > 0
            ? `Motorista vinculado: ${trips.totalGenerated} viagem(ns) gerada(s). ${truck.message}`
            : trips.tripsWarning
              ? `${truck.message} Viagens: ${trips.tripsWarning}`
              : `${truck.message} Viagens não geradas (já existiam ou sem grade na turma).`;

    return {
        driverUserId: driver.id,
        driverName: driver.name,
        truckId: truck.truckId,
        truckSynced: truck.truckSynced,
        turmasAtualizadas: truck.turmasAtualizadas,
        totalGenerated: trips.totalGenerated,
        tripsWarning: trips.tripsWarning,
        perClass: trips.perClass,
        message,
    };
}

/** Sincronização motorista ao vincular Employee DRIVER — nunca falha o card de diária. */
export async function syncDriverForEmployeeOnAcao(
    prisma: PrismaService,
    tripsService: TripsService,
    acaoId: string,
    employeeUserId: string | null | undefined,
): Promise<DriverAcaoSyncResult> {
    const truck = await syncDriverTruckForAcao(prisma, acaoId);
    if (!employeeUserId) {
        return {
            ...truck,
            totalGenerated: 0,
            skipped: true,
            message: `${truck.message} Viagens: cadastre login de motorista no funcionário.`,
        };
    }

    const trips = await tryGenerateTripsForAcao(prisma, tripsService, acaoId, employeeUserId);
    const driver = await prisma.user.findFirst({
        where: { id: employeeUserId, role: 'DRIVER' },
        select: { id: true, name: true },
    });

    const message = trips.totalGenerated > 0
        ? `${truck.message} ${trips.totalGenerated} viagem(ns) gerada(s).`
        : trips.tripsWarning
          ? `${truck.message} Viagens: ${trips.tripsWarning}`
          : `${truck.message} Viagens não geradas neste momento.`;

    return {
        driverUserId: driver?.id,
        driverName: driver?.name,
        truckId: truck.truckId,
        truckSynced: truck.truckSynced,
        turmasAtualizadas: truck.turmasAtualizadas,
        totalGenerated: trips.totalGenerated,
        tripsWarning: trips.tripsWarning,
        perClass: trips.perClass,
        message,
    };
}

/** Motorista numa turma (pode estar em várias turmas / viagens). */
export async function assignDriverToClass(
    prisma: PrismaService,
    tripsService: TripsService,
    classId: string,
    driverUserId: string,
    acaoId?: string,
) {
    let truckId: string | undefined;
    if (acaoId) {
        const acao = await prisma.acao.findUnique({ where: { id: acaoId } });
        truckId = acao?.carretaId ?? undefined;
    }
    if (!truckId) {
        const cls = await prisma.class.findUnique({ where: { id: classId }, select: { truckId: true } });
        truckId = cls?.truckId ?? undefined;
    }
    if (!truckId) {
        throw new BadRequestException('Vincule uma carreta à turma ou ao período antes do motorista.');
    }

    await prisma.class.update({
        where: { id: classId },
        data: { truckId },
    });

    await ensureClassScheduleFromPolicy(prisma, classId);

    const driver = await prisma.user.findFirst({
        where: { id: driverUserId, role: 'DRIVER' },
    });
    if (!driver) throw new BadRequestException('Motorista inválido');

    return tripsService.generateTripsForClass(classId, driver.id, acaoId);
}

const ACADEMICALLY_CLOSED_CLASS_STATUSES = ['COMPLETED', 'CANCELLED'] as const;
const ACTIVE_ACAO_STATUSES = ['PLANEJADA', 'EM_ANDAMENTO'] as const;

/** Turmas do grupo do período elegíveis para vínculo (sem exigir mesmo courseId do motor letivo). */
export async function findTurmasEligibleForAcao(prisma: PrismaService, acaoId: string) {
    const acao = await prisma.acao.findUnique({
        where: { id: acaoId },
        select: { id: true, grupoId: true, motorCourseId: true },
    });
    if (!acao) throw new BadRequestException('Período não encontrado');

    const classes = await prisma.class.findMany({
        where: {
            groupId: acao.grupoId,
            status: { notIn: [...ACADEMICALLY_CLOSED_CLASS_STATUSES] },
        },
        include: {
            course: { select: { id: true, name: true, workloadHours: true } },
            city: { select: { id: true, name: true, state: true } },
            group: { select: { id: true, name: true } },
            _count: { select: { enrollments: true } },
        },
        orderBy: { startDate: 'desc' },
        take: 200,
    });

    const busyLinks = await prisma.acaoTurma.findMany({
        where: {
            turmaId: { in: classes.map(c => c.id) },
            acao: { status: { in: [...ACTIVE_ACAO_STATUSES] } },
            acaoId: { not: acaoId },
        },
        select: { turmaId: true },
    });
    const busyTurmaIds = new Set(busyLinks.map(l => l.turmaId));

    const alreadyOnAcao = await prisma.acaoTurma.findMany({
        where: { acaoId },
        select: { turmaId: true },
    });
    const onAcaoIds = new Set(alreadyOnAcao.map(l => l.turmaId));

    const eligible = classes.filter(c => !busyTurmaIds.has(c.id) && !onAcaoIds.has(c.id));

    eligible.sort((a, b) => {
        const aMotor = a.courseId === acao.motorCourseId ? 0 : 1;
        const bMotor = b.courseId === acao.motorCourseId ? 0 : 1;
        if (aMotor !== bMotor) return aMotor - bMotor;
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });

    return eligible;
}

/** Turmas existentes elegíveis para novo vínculo (wizard / pós-criação). */
export async function findTurmasForCourseContext(
    prisma: PrismaService,
    courseId: string,
    opts?: { groupId?: string; excludeLinkedToAcaoId?: string },
) {
    const where: Record<string, unknown> = {
        courseId,
        status: { notIn: [...ACADEMICALLY_CLOSED_CLASS_STATUSES] },
    };
    if (opts?.groupId) where.groupId = opts.groupId;

    const classes = await prisma.class.findMany({
        where,
        include: {
            course: { select: { id: true, name: true, workloadHours: true } },
            city: { select: { id: true, name: true, state: true } },
            group: { select: { id: true, name: true } },
            _count: { select: { enrollments: true } },
        },
        orderBy: { startDate: 'desc' },
        take: 50,
    });

    const busyLinks = await prisma.acaoTurma.findMany({
        where: {
            turmaId: { in: classes.map(c => c.id) },
            acao: { status: { in: [...ACTIVE_ACAO_STATUSES] } },
            ...(opts?.excludeLinkedToAcaoId ? { acaoId: { not: opts.excludeLinkedToAcaoId } } : {}),
        },
        select: { turmaId: true },
    });
    const busyTurmaIds = new Set(busyLinks.map(l => l.turmaId));

    let eligible = classes.filter(c => !busyTurmaIds.has(c.id));

    if (opts?.excludeLinkedToAcaoId) {
        const alreadyOnAcao = await prisma.acaoTurma.findMany({
            where: { acaoId: opts.excludeLinkedToAcaoId },
            select: { turmaId: true },
        });
        const onAcaoIds = new Set(alreadyOnAcao.map(l => l.turmaId));
        eligible = eligible.filter(c => !onAcaoIds.has(c.id));
    }

    return eligible;
}

/** Ao concluir o período, encerra turmas vinculadas para não reaparecerem no wizard. */
export async function completeTurmasWhenAcaoConcluded(prisma: PrismaService, acaoId: string) {
    const links = await prisma.acaoTurma.findMany({
        where: { acaoId },
        select: { turmaId: true },
    });
    if (!links.length) return { updated: 0, turmaIds: [] as string[] };

    const turmaIds = links.map(l => l.turmaId);
    const result = await prisma.class.updateMany({
        where: {
            id: { in: turmaIds },
            status: { notIn: ['CANCELLED', 'COMPLETED'] },
        },
        data: { status: 'COMPLETED' },
    });

    return { updated: result.count, turmaIds };
}
