import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }
    async findAll(role?: string) {
        const where = role ? { role: role as any } : {};

        return this.prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                active: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                active: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async update(id: string, data: { name?: string; phone?: string; active?: boolean }) {
        const user = await this.findOne(id);

        return this.prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                active: true,
                updatedAt: true,
            },
        });
    }

    async deactivate(id: string) {
        return this.update(id, { active: false });
    }

    // ─── PASSO 1.3: Preferências do usuário ──────────────────────────────────

    async getPreferences(userId: string) {
        // upsert garante que sempre retorna com defaults, mesmo sem registro prévio
        return this.prisma.userPreferences.upsert({
            where: { userId },
            create: { userId },
            update: {},
        });
    }

    async updatePreferences(userId: string, data: {
        notifEmail?: boolean;
        notifCertificado?: boolean;
        notifInscricao?: boolean;
        notifFrequencia?: boolean;
        animacoes?: boolean;
        fonteGrande?: boolean;
    }) {
        return this.prisma.userPreferences.upsert({
            where: { userId },
            create: { userId, ...data },
            update: data,
        });
    }
}
