import { Injectable, NotFoundException } from '@nestjs/common';
import { AbsenceType, AbsenceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class AbsencesService {
    constructor(
        private prisma: PrismaService,
        private notifications: NotificationsGateway,
    ) {}

    // Driver: lista suas próprias ausências
    async findByUser(userId: string) {
        return this.prisma.absence.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
        });
    }

    // Driver: registra imprevisto
    async create(userId: string, data: { type: string; date: string; description: string; documentUrl?: string }) {
        return this.prisma.absence.create({
            data: {
                userId,
                type: data.type as AbsenceType,
                date: new Date(data.date),
                description: data.description,
                documentUrl: data.documentUrl ?? null,
                status: AbsenceStatus.PENDING,
            },
        }).then(absence => {
            // PASSO 3.1: notificar admins — WS em try/catch SEPARADO
            try {
                this.notifications.notifyAdmins('imprevisto_cadastrado', {
                    absenceId: absence.id,
                    userId,
                    type: data.type,
                    date: data.date,
                    timestamp: new Date().toISOString(),
                });
            } catch { /* WS nunca causa rollback */ }
            return absence;
        });
    }

    // Admin: lista todas as ausências com filtros (apenas activas por padrão)
    async findAll(status?: string, userId?: string) {
        const where: any = { active: true };
        if (status) where.status = status;
        if (userId) where.userId = userId;

        return this.prisma.absence.findMany({
            where,
            orderBy: { date: 'desc' },
            include: {
                user: { select: { id: true, name: true, role: true, email: true } },
            },
        });
    }

    // Admin: cria imprevisto manualmente (PASSO 3.6)
    async createByAdmin(
        targetUserId: string,
        data: { type: string; date: string; description: string; documentUrl?: string },
    ) {
        return this.prisma.absence.create({
            data: {
                userId: targetUserId,
                type: data.type as AbsenceType,
                date: new Date(data.date),
                description: data.description,
                documentUrl: data.documentUrl ?? null,
                status: AbsenceStatus.PENDING,
            },
            include: {
                user: { select: { id: true, name: true, role: true, email: true } },
            },
        });
    }

    // Admin: edita dados de um imprevisto (PASSO 3.6)
    async update(
        id: string,
        data: { type?: string; date?: string; description?: string },
    ) {
        const absence = await this.prisma.absence.findUnique({ where: { id } });
        if (!absence) throw new NotFoundException('Imprevisto não encontrado');
        return this.prisma.absence.update({
            where: { id },
            data: {
                ...(data.type && { type: data.type as AbsenceType }),
                ...(data.date && { date: new Date(data.date) }),
                ...(data.description && { description: data.description }),
            },
            include: {
                user: { select: { id: true, name: true, role: true, email: true } },
            },
        });
    }

    // Admin: soft delete (PASSO 3.6 + LIVRO_DE_REGRAS §3)
    async remove(id: string) {
        const absence = await this.prisma.absence.findUnique({ where: { id } });
        if (!absence) throw new NotFoundException('Imprevisto não encontrado');
        return this.prisma.absence.update({
            where: { id },
            data: { active: false },
        });
    }
    async review(
        id: string,
        adminId: string,
        data: {
            status: 'VALIDATED' | 'REJECTED' | 'PENALIZED';
            adminNote?: string;
            penalty?: number;
        },
    ) {
        const absence = await this.prisma.absence.findUnique({ where: { id } });
        if (!absence) throw new NotFoundException('Imprevisto não encontrado');

        return this.prisma.absence.update({
            where: { id },
            data: {
                status: data.status as AbsenceStatus,
                adminNote: data.adminNote ?? null,
                penalty: data.penalty ?? null,
                reviewedBy: adminId,
                reviewedAt: new Date(),
            },
        });
    }
}
