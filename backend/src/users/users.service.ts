import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private settingsService: SettingsService,
    ) { }
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
                cpf: true,
                role: true,
                active: true,
                createdAt: true,
                updatedAt: true,
                twoFactorEnabled: true,
                student: {
                    select: {
                        id: true,
                        cpf: true,
                        birthDate: true,
                        gender: true,
                        raceColor: true,
                        maritalStatus: true,
                        motherName: true,
                        fatherName: true,
                        nationality: true,
                        birthCity: true,
                        birthState: true,
                        socialName: true,
                        contact: true,
                        address: true,
                    },
                },
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

    // ─── PASSO 3.7: Registro de ponto professor ───────────────────────

    async registerCheckin(userId: string) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        const existing = await this.prisma.teacherCheckin.findFirst({
            where: { userId, date: today },
        });
        if (existing) {
            return { ...existing, alreadyRegistered: true };
        }

        let checkin;
        try {
            checkin = await this.prisma.teacherCheckin.create({
                data: { userId, date: today },
            });
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                const row = await this.prisma.teacherCheckin.findFirst({ where: { userId, date: today } });
                if (row) return { ...row, alreadyRegistered: true };
            }
            throw e;
        }

        // Sincronizar com EmployeeAttendance
        const employee = await this.prisma.employee.findFirst({
            where: { userId },
        });
        if (employee) {
            const dateObj = new Date(Date.UTC(
                Number(today.split('-')[0]),
                Number(today.split('-')[1]) - 1,
                Number(today.split('-')[2]),
            ));
            await this.prisma.employeeAttendance.upsert({
                where: { employeeId_date: { employeeId: employee.id, date: dateObj } },
                create: {
                    employeeId: employee.id,
                    date: dateObj,
                    present: true,
                    justified: false,
                    justification: '[AUTO_TEACHER_CHECKIN]',
                    registeredBy: userId,
                },
                update: {
                    present: true,
                    justification: '[AUTO_TEACHER_CHECKIN]',
                    registeredAt: new Date(),
                },
            });
        }
        return { ...checkin, alreadyRegistered: false };
    }

    async getCheckins(userId: string) {
        return this.prisma.teacherCheckin.findMany({
            where: { userId },
            orderBy: { checkedAt: 'desc' },
            take: 30,
        });
    }

    // MEL-07: Saída professor
    async registerCheckout(userId: string) {
        const today = new Date().toISOString().split('T')[0];
        const existing = await this.prisma.teacherCheckin.findFirst({
            where: { userId, date: today },
        });
        if (!existing) {
            throw new BadRequestException('Registre a entrada antes de registrar a saída.');
        }
        if (existing.checkoutAt) {
            return { ...existing, alreadyRegistered: true };
        }
        try {
            const updated = await this.prisma.teacherCheckin.update({
                where: { id: existing.id },
                data: { checkoutAt: new Date() },
            });
            return { ...updated, alreadyRegistered: false };
        } catch (e) {
            const msg = (e as { message?: string })?.message || '';
            if (msg.includes('checkoutAt') || msg.includes('checkout_at')) {
                throw new BadRequestException(
                    'Saída indisponível: execute a migration MEL-07 (checkoutAt) na base de dados.',
                );
            }
            throw e;
        }
    }

    // ─── PASSO 4.2: Registro de ponto motorista ───────────────────────

    async registerDriverCheckin(userId: string, note?: string) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Evitar duplicata no mesmo dia
        const existing = await this.prisma.driverCheckin.findFirst({
            where: { userId, date: today },
        });
        if (existing) {
            return { ...existing, alreadyRegistered: true };
        }

        let checkin;
        try {
            checkin = await this.prisma.driverCheckin.create({
                data: { userId, date: today, note },
            });
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                const row = await this.prisma.driverCheckin.findFirst({ where: { userId, date: today } });
                if (row) return { ...row, alreadyRegistered: true };
            }
            throw e;
        }

        // Sincronizar com EmployeeAttendance
        const employee = await this.prisma.employee.findFirst({
            where: { userId },
        });
        if (employee) {
            const dateObj = new Date(Date.UTC(
                Number(today.split('-')[0]),
                Number(today.split('-')[1]) - 1,
                Number(today.split('-')[2]),
            ));
            await this.prisma.employeeAttendance.upsert({
                where: { employeeId_date: { employeeId: employee.id, date: dateObj } },
                create: {
                    employeeId: employee.id,
                    date: dateObj,
                    present: true,
                    justified: false,
                    justification: '[AUTO_DRIVER_CHECKIN]',
                    registeredBy: userId,
                },
                update: {
                    present: true,
                    justification: '[AUTO_DRIVER_CHECKIN]',
                    registeredAt: new Date(),
                },
            });
        }

        return { ...checkin, alreadyRegistered: false };
    }

    async getDriverCheckins(userId: string) {
        return this.prisma.driverCheckin.findMany({
            where: { userId },
            orderBy: { checkedAt: 'desc' },
            take: 30,
        });
    }

    // MEL-07: Saída motorista
    async registerDriverCheckout(userId: string) {
        const today = new Date().toISOString().split('T')[0];
        const existing = await this.prisma.driverCheckin.findFirst({
            where: { userId, date: today },
        });
        if (!existing) {
            throw new BadRequestException('Registre a entrada antes de registrar a saída.');
        }
        if (existing.checkoutAt) {
            return { ...existing, alreadyRegistered: true };
        }
        try {
            const updated = await this.prisma.driverCheckin.update({
                where: { id: existing.id },
                data: { checkoutAt: new Date() },
            });
            return { ...updated, alreadyRegistered: false };
        } catch (e) {
            const msg = (e as { message?: string })?.message || '';
            if (msg.includes('checkoutAt') || msg.includes('checkout_at')) {
                throw new BadRequestException(
                    'Saída indisponível: execute a migration MEL-07 (checkoutAt) na base de dados.',
                );
            }
            throw e;
        }
    }

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

    /** Troca a senha do próprio utilizador (qualquer role autenticado). */
    async updateOwnPassword(userId: string, currentPassword: string, newPassword: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        let isPasswordValid = false;
        try {
            isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        } catch {
            throw new BadRequestException(
                'Não foi possível validar a senha atual. Se o problema persistir, use recuperação de senha ou contate o suporte.',
            );
        }
        if (!isPasswordValid) {
            throw new BadRequestException('Current password is incorrect');
        }
        const strength = this.settingsService.validatePasswordStrength(newPassword);
        if (!strength.valid) {
            throw new BadRequestException(strength.message ?? 'Nova senha não cumpre a política de complexidade');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        return { message: 'Password updated successfully' };
    }
}
