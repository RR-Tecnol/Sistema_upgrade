import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, NotificationChannel } from '@prisma/client';

export interface SendNotificationDto {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    channel?: NotificationChannel;
}

/**
 * NotificationsSenderService
 * Serviço centralizado para PERSISTIR notificações no banco (tabela Notification).
 * Módulo NotificationsModule é @Global — pode ser injetado em qualquer controller/service.
 *
 * O campo 'link' do DTO é armazenado dentro do campo Json 'data' do schema Prisma.
 */
@Injectable()
export class NotificationsSenderService {
    constructor(private readonly prisma: PrismaService) {}

    async send(dto: SendNotificationDto): Promise<void> {
        await this.prisma.notification.create({
            data: {
                userId: dto.userId,
                type: dto.type,
                title: dto.title,
                message: dto.message,
                channel: dto.channel ?? NotificationChannel.IN_APP,
                data: dto.link ? { link: dto.link } : undefined,
            },
        });
    }

    async sendToMany(
        userIds: string[],
        payload: Omit<SendNotificationDto, 'userId'>,
    ): Promise<void> {
        if (!userIds.length) return;
        await this.prisma.notification.createMany({
            data: userIds.map((userId) => ({
                userId,
                type: payload.type,
                title: payload.title,
                message: payload.message,
                channel: payload.channel ?? NotificationChannel.IN_APP,
                data: payload.link ? { link: payload.link } : undefined,
            })),
        });
    }

    // ── Templates por evento ─────────────────────────────────────

    async enrollmentApproved(userId: string, courseName: string) {
        await this.send({
            userId,
            type: NotificationType.ENROLLMENT_APPROVED,
            title: 'Inscrição Aprovada! 🎉',
            message: `Sua inscrição no curso "${courseName}" foi aprovada. Bom aprendizado!`,
            link: '/student/enrollments',
        });
    }

    async enrollmentRejected(userId: string, courseName: string, reason?: string) {
        await this.send({
            userId,
            type: NotificationType.ENROLLMENT_REJECTED,
            title: 'Inscrição não aprovada',
            message: `Sua inscrição no curso "${courseName}" não foi aprovada.${reason ? ` Motivo: ${reason}` : ''}`,
            link: '/student/enrollments',
        });
    }

    async certificateIssued(userId: string, courseName: string) {
        await this.send({
            userId,
            type: NotificationType.CERTIFICATE_AVAILABLE,
            title: 'Certificado Disponível! 🏆',
            message: `Seu certificado do curso "${courseName}" está disponível para download.`,
            link: '/student/certificates',
        });
    }

    async reimbursementStatusChanged(userId: string, approved: boolean, amount: number, reason?: string) {
        await this.send({
            userId,
            type: NotificationType.GENERAL_ANNOUNCEMENT,
            title: approved ? 'Reembolso Aprovado ✅' : 'Reembolso não aprovado',
            message: approved
                ? `Seu reembolso de R$ ${Number(amount).toFixed(2)} foi aprovado.`
                : `Seu reembolso de R$ ${Number(amount).toFixed(2)} não foi aprovado.${reason ? ` Motivo: ${reason}` : ''}`,
            link: '/teacher/reembolsos',
        });
    }

    async newRegistrationPending(adminUserIds: string[], candidateName: string, role: string) {
        const roleLabel = role === 'TEACHER' ? 'professor' : 'motorista';
        await this.sendToMany(adminUserIds, {
            type: NotificationType.GENERAL_ANNOUNCEMENT,
            title: 'Novo cadastro aguardando aprovação 🔔',
            message: `${candidateName} se cadastrou como ${roleLabel} e aguarda sua aprovação.`,
            link: '/admin/funcionarios',
        });
    }

    async absenceRegistered(studentUserId: string, courseName: string, date: string) {
        await this.send({
            userId: studentUserId,
            type: NotificationType.ABSENCE_REGISTERED,
            title: 'Falta registrada ⚠️',
            message: `Uma falta foi registrada para o curso "${courseName}" em ${date}.`,
            link: '/student/attendance',
        });
    }
}
