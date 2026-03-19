import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AbsencesService {
    constructor(private prisma: PrismaService) {}

    // Driver: lista suas próprias ausências
    async findByUser(userId: string) {
        return (this.prisma as any).absence.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
        });
    }

    // Driver: registra imprevisto
    async create(userId: string, data: { type: string; date: string; description: string; documentUrl?: string }) {
        return (this.prisma as any).absence.create({
            data: {
                userId,
                type: data.type,
                date: new Date(data.date),
                description: data.description,
                documentUrl: data.documentUrl ?? null,
                status: 'PENDING',
            },
        });
    }

    // Admin: lista todas as ausências com filtros
    async findAll(status?: string, userId?: string) {
        const where: any = {};
        if (status) where.status = status;
        if (userId) where.userId = userId;

        return (this.prisma as any).absence.findMany({
            where,
            orderBy: { date: 'desc' },
            include: {
                user: { select: { id: true, name: true, role: true, email: true } },
            },
        });
    }

    // Admin: valida ou rejeita imprevisto
    async review(
        id: string,
        adminId: string,
        data: {
            status: 'VALIDATED' | 'REJECTED' | 'PENALIZED';
            adminNote?: string;
            penalty?: number;
        },
    ) {
        const absence = await (this.prisma as any).absence.findUnique({ where: { id } });
        if (!absence) throw new NotFoundException('Imprevisto não encontrado');

        return (this.prisma as any).absence.update({
            where: { id },
            data: {
                status: data.status,
                adminNote: data.adminNote ?? null,
                penalty: data.penalty ?? null,
                reviewedBy: adminId,
                reviewedAt: new Date(),
            },
        });
    }
}
