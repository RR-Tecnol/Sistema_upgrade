/**
 * Sincronização Curso ↔ Período (Acao) ↔ Turma (Class) para vínculo de professores.
 * Qualquer ponto de entrada (curso, período ou turma) alimenta os demais níveis.
 */
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { resolveTeacherOrThrow } from './resolve-teacher.util';

export type TeacherAcademicLinkResult = {
    teacherId: string;
    /** Novos vínculos TeacherCourse criados */
    courseLinks: number;
    /** Novos vínculos ClassTeacher criados */
    classLinks: number;
    courseIds: string[];
    classIds: string[];
};

export async function ensureTeacherCourseLink(
    prisma: PrismaService,
    courseId: string,
    teacherId: string,
): Promise<boolean> {
    const existing = await prisma.teacherCourse.findFirst({
        where: { courseId, teacherId },
    });
    if (existing) return false;
    await prisma.teacherCourse.create({ data: { courseId, teacherId } });
    return true;
}

export async function ensureClassTeacherLink(
    prisma: PrismaService,
    classId: string,
    teacherId: string,
    isSubstitute = false,
): Promise<boolean> {
    const existing = await prisma.classTeacher.findFirst({
        where: { classId, teacherId },
    });
    if (existing) return false;
    await prisma.classTeacher.create({
        data: { classId, teacherId, isSubstitute },
    });
    return true;
}

/** Curso → todas as turmas não canceladas + TeacherCourse */
export async function syncTeacherToCourse(
    prisma: PrismaService,
    courseId: string,
    teacherIdOrUserId: string,
): Promise<TeacherAcademicLinkResult> {
    const teacher = await resolveTeacherOrThrow(prisma, teacherIdOrUserId);

    let courseLinks = 0;
    if (await ensureTeacherCourseLink(prisma, courseId, teacher.id)) {
        courseLinks = 1;
    }

    const classes = await prisma.class.findMany({
        where: { courseId, status: { not: 'CANCELLED' } },
        select: { id: true },
    });

    let classLinks = 0;
    for (const cls of classes) {
        if (await ensureClassTeacherLink(prisma, cls.id, teacher.id)) {
            classLinks += 1;
        }
    }

    return {
        teacherId: teacher.id,
        courseLinks,
        classLinks,
        courseIds: [courseId],
        classIds: classes.map(c => c.id),
    };
}

/** Turma → curso pai + ClassTeacher */
export async function syncTeacherToClass(
    prisma: PrismaService,
    classId: string,
    teacherIdOrUserId: string,
    isSubstitute = false,
): Promise<TeacherAcademicLinkResult> {
    const teacher = await resolveTeacherOrThrow(prisma, teacherIdOrUserId);

    const cls = await prisma.class.findUnique({
        where: { id: classId },
        select: { id: true, courseId: true },
    });
    if (!cls) {
        throw new NotFoundException('Turma não encontrada');
    }

    let classLinks = 0;
    if (await ensureClassTeacherLink(prisma, classId, teacher.id, isSubstitute)) {
        classLinks = 1;
    }

    let courseLinks = 0;
    if (await ensureTeacherCourseLink(prisma, cls.courseId, teacher.id)) {
        courseLinks = 1;
    }

    return {
        teacherId: teacher.id,
        courseLinks,
        classLinks,
        courseIds: [cls.courseId],
        classIds: [classId],
    };
}

/** Período (Acao) → todas as turmas vinculadas + cursos dessas turmas */
export async function syncTeacherToAcao(
    prisma: PrismaService,
    acaoId: string,
    teacherIdOrUserId: string,
): Promise<TeacherAcademicLinkResult> {
    const teacher = await resolveTeacherOrThrow(prisma, teacherIdOrUserId);

    const acaoTurmas = await prisma.acaoTurma.findMany({
        where: { acaoId },
        include: {
            turma: { select: { id: true, courseId: true, status: true } },
        },
    });

    const courseIds = new Set<string>();
    const classIds: string[] = [];
    let classLinks = 0;
    let courseLinks = 0;

    for (const at of acaoTurmas) {
        if (!at.turma || at.turma.status === 'CANCELLED') continue;
        classIds.push(at.turma.id);
        courseIds.add(at.turma.courseId);
        if (await ensureClassTeacherLink(prisma, at.turma.id, teacher.id)) {
            classLinks += 1;
        }
    }

    for (const courseId of courseIds) {
        if (await ensureTeacherCourseLink(prisma, courseId, teacher.id)) {
            courseLinks += 1;
        }
    }

    return {
        teacherId: teacher.id,
        courseLinks,
        classLinks,
        courseIds: [...courseIds],
        classIds,
    };
}

/** Período → turmas selecionadas (instrutor vinculado só às turmas escolhidas). */
export async function syncTeacherToAcaoClasses(
    prisma: PrismaService,
    acaoId: string,
    teacherIdOrUserId: string,
    classIds: string[],
): Promise<TeacherAcademicLinkResult> {
    const teacher = await resolveTeacherOrThrow(prisma, teacherIdOrUserId);
    const uniqueIds = [...new Set(classIds.filter(Boolean))];
    if (!uniqueIds.length) {
        return syncTeacherToAcao(prisma, acaoId, teacherIdOrUserId);
    }

    const acaoTurmas = await prisma.acaoTurma.findMany({
        where: { acaoId, turmaId: { in: uniqueIds } },
        include: {
            turma: { select: { id: true, courseId: true, status: true } },
        },
    });

    const courseIds = new Set<string>();
    const linkedClassIds: string[] = [];
    let classLinks = 0;
    let courseLinks = 0;

    for (const at of acaoTurmas) {
        if (!at.turma || at.turma.status === 'CANCELLED') continue;
        linkedClassIds.push(at.turma.id);
        courseIds.add(at.turma.courseId);
        if (await ensureClassTeacherLink(prisma, at.turma.id, teacher.id)) {
            classLinks += 1;
        }
    }

    for (const courseId of courseIds) {
        if (await ensureTeacherCourseLink(prisma, courseId, teacher.id)) {
            courseLinks += 1;
        }
    }

    return {
        teacherId: teacher.id,
        courseLinks,
        classLinks,
        courseIds: [...courseIds],
        classIds: linkedClassIds,
    };
}

/** Ao vincular turma ao período: herda professores já cadastrados no curso base */
export async function syncCourseTeachersToClass(
    prisma: PrismaService,
    classId: string,
): Promise<{ classLinks: number }> {
    const cls = await prisma.class.findUnique({
        where: { id: classId },
        select: { courseId: true, status: true },
    });
    if (!cls || cls.status === 'CANCELLED') {
        return { classLinks: 0 };
    }

    const courseTeachers = await prisma.teacherCourse.findMany({
        where: { courseId: cls.courseId },
        select: { teacherId: true },
    });

    let classLinks = 0;
    for (const { teacherId } of courseTeachers) {
        if (await ensureClassTeacherLink(prisma, classId, teacherId)) {
            classLinks += 1;
        }
    }
    return { classLinks };
}

/** Garante registro Teacher para Employee INSTRUCTOR com userId (cadastro ou convite). */
export async function ensureTeacherForUserId(prisma: PrismaService, userId: string) {
    const existing = await prisma.teacher.findFirst({ where: { userId } });
    if (existing) return existing;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário do funcionário não encontrado');

    return prisma.teacher.create({
        data: {
            userId,
            cpf: '00000000000',
            birthDate: new Date('1990-01-01'),
            education: 'Não informada',
            specialties: 'Geral',
            contractType: 'CLT',
            hireDate: new Date(),
        },
    });
}
