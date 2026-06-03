import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Teacher } from '@prisma/client';

/**
 * Aceita Teacher.id ou User.id (BUG-19 / Sprint 3).
 * O admin envia frequentemente o userId do professor na UI.
 */
export async function resolveTeacher(
    prisma: PrismaService,
    teacherIdOrUserId: string,
): Promise<Teacher | null> {
    const id = String(teacherIdOrUserId || '').trim();
    if (!id) return null;

    const byPk = await prisma.teacher.findUnique({ where: { id } });
    if (byPk) return byPk;

    return prisma.teacher.findFirst({ where: { userId: id } });
}

export async function resolveTeacherOrThrow(
    prisma: PrismaService,
    teacherIdOrUserId: string,
): Promise<Teacher> {
    const teacher = await resolveTeacher(prisma, teacherIdOrUserId);
    if (!teacher) {
        throw new NotFoundException('Teacher not found');
    }
    return teacher;
}
