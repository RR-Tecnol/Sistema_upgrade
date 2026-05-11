import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, NotificationChannel, Prisma } from '@prisma/client';

export interface SendNotificationDto {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    channel?: NotificationChannel;
    /** Mesclado em `data` junto com `link` (ex.: chaves para deduplicação). */
    extraData?: Record<string, unknown>;
    /** Persistido em `data` — mesmo contrato que o WS (`actorName` / `actorUserId`). */
    actorUserId?: string;
    actorDisplayName?: string | null;
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

    private async resolveActorName(actorUserId?: string, actorName?: string): Promise<string | null> {
        const direct = actorName?.trim();
        if (direct) return direct;
        if (!actorUserId) return null;
        const user = await this.prisma.user.findUnique({
            where: { id: actorUserId },
            select: { name: true },
        });
        const fromDb = user?.name?.trim();
        return fromDb || null;
    }

    /** Devolve o id da linha — para alinhar payload WS com notificação persistida (UX-11). */
    async send(dto: SendNotificationDto): Promise<{ id: string }> {
        const dataPayload: Record<string, unknown> = { ...(dto.extraData || {}) };
        if (dto.link) dataPayload.link = dto.link;
        if (dto.actorUserId) dataPayload.actorUserId = dto.actorUserId;
        const actorLabel = dto.actorDisplayName?.trim();
        if (actorLabel) dataPayload.actorName = actorLabel;
        const row = await this.prisma.notification.create({
            data: {
                userId: dto.userId,
                type: dto.type,
                title: dto.title,
                message: dto.message,
                channel: dto.channel ?? NotificationChannel.IN_APP,
                data: Object.keys(dataPayload).length ? (dataPayload as Prisma.InputJsonValue) : undefined,
            },
        });
        return { id: row.id };
    }

    async sendToMany(
        userIds: string[],
        payload: Omit<SendNotificationDto, 'userId'>,
    ): Promise<void> {
        if (!userIds.length) return;
        await this.prisma.notification.createMany({
            data: userIds.map((userId) => {
                const dataPayload: Record<string, unknown> = { ...(payload.extraData || {}) };
                if (payload.link) dataPayload.link = payload.link;
                if (payload.actorUserId) dataPayload.actorUserId = payload.actorUserId;
                const actorLabel = payload.actorDisplayName?.trim();
                if (actorLabel) dataPayload.actorName = actorLabel;
                return {
                    userId,
                    type: payload.type,
                    title: payload.title,
                    message: payload.message,
                    channel: payload.channel ?? NotificationChannel.IN_APP,
                    data: Object.keys(dataPayload).length ? (dataPayload as Prisma.InputJsonValue) : undefined,
                };
            }),
        });
    }

    // ── Templates por evento ─────────────────────────────────────

    async enrollmentApproved(userId: string, courseName: string, reviewedByUserId?: string, reviewedByName?: string) {
        const actor = await this.resolveActorName(reviewedByUserId, reviewedByName);
        await this.send({
            userId,
            type: NotificationType.ENROLLMENT_APPROVED,
            title: 'Inscrição Aprovada! 🎉',
            message: `Sua inscrição no curso "${courseName}" foi aprovada${actor ? ` por ${actor}` : ''}. Bom aprendizado!`,
            link: '/student/enrollments',
            actorUserId: reviewedByUserId,
            actorDisplayName: actor,
        });
    }

    async enrollmentRejected(
        userId: string,
        courseName: string,
        reason?: string,
        reviewedByUserId?: string,
        reviewedByName?: string,
    ) {
        const actor = await this.resolveActorName(reviewedByUserId, reviewedByName);
        await this.send({
            userId,
            type: NotificationType.ENROLLMENT_REJECTED,
            title: 'Inscrição não aprovada',
            message: `Sua inscrição no curso "${courseName}" não foi aprovada${actor ? ` por ${actor}` : ''}.${reason ? ` Motivo: ${reason}` : ''}`,
            link: '/student/enrollments',
            actorUserId: reviewedByUserId,
            actorDisplayName: actor,
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

    /** Id da `Notification` criada — repasse em WS como `notificationId` (UX-11). */
    async reimbursementStatusChanged(
        userId: string,
        approved: boolean,
        amount: number,
        reason?: string,
        reviewedByUserId?: string,
        reviewedByName?: string,
    ): Promise<string> {
        const actor = await this.resolveActorName(reviewedByUserId, reviewedByName);
        const { id } = await this.send({
            userId,
            type: NotificationType.GENERAL_ANNOUNCEMENT,
            title: approved ? 'Reembolso Aprovado ✅' : 'Reembolso não aprovado',
            message: approved
                ? `Seu reembolso de R$ ${Number(amount).toFixed(2)} foi aprovado${actor ? ` por ${actor}` : ''}.`
                : `Seu reembolso de R$ ${Number(amount).toFixed(2)} não foi aprovado${actor ? ` por ${actor}` : ''}.${reason ? ` Motivo: ${reason}` : ''}`,
            link: '/teacher/reembolsos',
            actorUserId: reviewedByUserId,
            actorDisplayName: actor,
        });
        return id;
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

    async absenceRegistered(studentUserId: string, courseName: string, date: string, registeredByUserId?: string, registeredByName?: string) {
        const actor = await this.resolveActorName(registeredByUserId, registeredByName);
        await this.send({
            userId: studentUserId,
            type: NotificationType.ABSENCE_REGISTERED,
            title: 'Falta registrada ⚠️',
            message: `Uma falta foi registrada para o curso "${courseName}" em ${date}${actor ? ` por ${actor}` : ''}.`,
            link: '/student/attendance',
            actorUserId: registeredByUserId,
            actorDisplayName: actor,
        });
    }

    /**
     * Alerta de frequência vs. elegibilidade ao certificado (75%).
     * Deduplica por turma + tipo de alerta nas últimas 72h para não spammar a cada lançamento.
     */
    async maybeNotifyCertificateAttendanceRisk(
        userId: string,
        classId: string,
        courseName: string,
        stats: {
            attendanceRatePct: number;
            remainingUnjustifiedSlots: number;
            unjustifiedAbsenceCount: number;
            totalSessions: number;
            riskLevel: 'ok' | 'watch' | 'risk' | 'critical';
        },
    ): Promise<void> {
        if (stats.riskLevel === 'ok' || stats.riskLevel === 'watch' || stats.totalSessions === 0) return;

        const since = new Date(Date.now() - 72 * 3600 * 1000);
        const isCritical = stats.riskLevel === 'critical';

        const notifyKey = isCritical
            ? `attendance_cert_critical_${classId}`
            : `attendance_cert_risk_${classId}`;

        const dup = await this.prisma.notification.findFirst({
            where: {
                userId,
                createdAt: { gte: since },
                data: { path: ['notifyKey'], equals: notifyKey },
            },
        });
        if (dup) return;

        const pctLabel = `${stats.attendanceRatePct}%`.replace('.', ',');
        const rem = stats.remainingUnjustifiedSlots;

        if (isCritical) {
            await this.send({
                userId,
                type: NotificationType.EXCESSIVE_ABSENCES,
                title: 'Frequência abaixo do mínimo do certificado 🚨',
                message:
                    `No curso «${courseName}» sua presença efetiva está em ${pctLabel} (mínimo ${75}%). ` +
                    'Entre em contacto com a administração/coordenação para regularizar faltas ou justificativas. ' +
                    `Acompanhe o detalhe em Certificados e Frequência.`,
                link: '/student/certificates',
                extraData: { notifyKey, attendanceClassId: classId },
            });
            return;
        }

        const riskMsg =
            stats.attendanceRatePct < 80
                ? `Presença efetiva ${pctLabel} — zona de risco para o certificado (mín. 75%).`
                : rem === 0
                    ? 'Você atingiu o limite de faltas injustificadas permitidas nos dias já lançados para manter 75%.'
                    : `Resta apenas ${rem} falta(s) injustificada(s) “no orçamento” até o limite atual dos dias registrados.`;

        await this.send({
            userId,
            type: NotificationType.GENERAL_ANNOUNCEMENT,
            title: 'Atenção: frequência e certificado ⚠️',
            message: `«${courseName}»: ${riskMsg} Veja o progresso em Certificados.`,
            link: '/student/certificates',
            extraData: { notifyKey, attendanceClassId: classId, kind: 'attendance_certificate_risk' },
        });
    }

    /** Link do portal de imprevistos conforme o papel do destinatário (UX-6 / UX-7). */
    imprevistoPortalLinkForRole(role: string): string {
        if (role === 'STUDENT') return '/student/imprevistos';
        if (role === 'TEACHER') return '/teacher/imprevistos';
        return '/driver/imprevistos';
    }

    /** UX-6: admin revisou imprevisto — notificação in-app persistida. */
    async absenceReviewedForUser(
        targetUserId: string,
        userRole: string,
        status: 'VALIDATED' | 'REJECTED' | 'PENALIZED',
        absenceDescription: string,
        adminNote?: string,
        reviewedByUserId?: string,
        reviewedByName?: string,
        /** Resumo opcional da penalidade (aluno: % e dias; colaborador: R$). */
        penalidadeExtra?: string,
    ): Promise<string> {
        const link = this.imprevistoPortalLinkForRole(userRole);
        const snippet = (absenceDescription || '').slice(0, 120);
        const noteSuffix = adminNote ? ` Motivo da equipa: ${adminNote.slice(0, 200)}` : '';
        const actor = await this.resolveActorName(reviewedByUserId, reviewedByName);

        if (status === 'VALIDATED') {
            const { id } = await this.send({
                userId: targetUserId,
                type: NotificationType.JUSTIFICATION_APPROVED,
                title: 'Imprevisto validado ✅',
                message: `Seu registo foi validado${actor ? ` por ${actor}` : ' pela equipa'}.${noteSuffix}${snippet ? ` — ${snippet}` : ''}`,
                link,
                actorUserId: reviewedByUserId,
                actorDisplayName: actor,
            });
            return id;
        }
        if (status === 'REJECTED') {
            const { id } = await this.send({
                userId: targetUserId,
                type: NotificationType.JUSTIFICATION_REJECTED,
                title: 'Imprevisto não aprovado',
                message: `Seu registo não foi aprovado${actor ? ` por ${actor}` : ''}.${noteSuffix}${snippet ? ` — ${snippet}` : ''}`,
                link,
                actorUserId: reviewedByUserId,
                actorDisplayName: actor,
            });
            return id;
        }
        const extra = penalidadeExtra ? ` ${penalidadeExtra}` : '';
        const { id } = await this.send({
            userId: targetUserId,
            type: NotificationType.GENERAL_ANNOUNCEMENT,
            title: 'Imprevisto penalizado ⚠️',
            message: `Foi aplicada penalidade ao seu registo${actor ? ` por ${actor}` : ''}.${noteSuffix}${extra}${snippet ? ` — ${snippet}` : ''}`,
            link,
            actorUserId: reviewedByUserId,
            actorDisplayName: actor,
        });
        return id;
    }

    /** UX-7: admin criou imprevisto em nome do utilizador. */
    async absenceCreatedByAdminForUser(
        targetUserId: string,
        userRole: string,
        description: string,
        dateIso: string,
        adminUserId?: string,
        adminName?: string,
    ): Promise<string> {
        const link = this.imprevistoPortalLinkForRole(userRole);
        const dateLabel = dateIso ? new Date(dateIso).toLocaleDateString('pt-BR') : '';
        const actor = await this.resolveActorName(adminUserId, adminName);
        const { id } = await this.send({
            userId: targetUserId,
            type: NotificationType.GENERAL_ANNOUNCEMENT,
            title: 'Imprevisto registado em seu nome',
            message: `${actor || 'A equipa'} registou um imprevisto${dateLabel ? ` em ${dateLabel}` : ''}: ${(description || '').slice(0, 150)}`,
            link,
            actorUserId: adminUserId,
            actorDisplayName: actor,
        });
        return id;
    }

    /** UX-16: data de término da turma alterada por feriado/imprevisto — persistência + id para WS. */
    async classEndDateChanged(
        userId: string,
        courseLabel: string,
        prevIsoDate: string,
        nextIsoDate: string,
        link: string,
    ): Promise<string> {
        const { id } = await this.send({
            userId,
            type: NotificationType.CLASS_REMINDER,
            title: 'Data de término da turma atualizada',
            message: `«${courseLabel}»: término alterado de ${prevIsoDate} para ${nextIsoDate}.`,
            link,
        });
        return id;
    }

    // ── Feedback Pós-Curso + PIX ─────────────────────────────

    async feedbackInvitation(userId: string, courseName: string, feedbackId: string) {
        await this.send({
            userId,
            type: NotificationType.FEEDBACK_INVITATION,
            title: 'Conte como foi o curso e ganhe um PIX! 🎁',
            message: `Seu certificado do curso "${courseName}" foi emitido. Responda nossa pesquisa rápida e receba uma recompensa em PIX.`,
            link: `/student/feedback/${feedbackId}`,
        });
    }

    async feedbackReminder(userId: string, courseName: string, feedbackId: string, reminderNum: number) {
        await this.send({
            userId,
            type: NotificationType.FEEDBACK_REMINDER,
            title: `Lembrete: seu feedback do curso "${courseName}" ⏰`,
            message: `Ainda não recebemos sua avaliação. Leva menos de 3 minutos e você ganha um PIX de recompensa.`,
            link: `/student/feedback/${feedbackId}`,
        });
    }

    async feedbackContentApproved(
        userId: string,
        feedbackId: string,
        courseName: string,
        reviewedByUserId?: string,
        reviewedByName?: string,
    ) {
        const actor = await this.resolveActorName(reviewedByUserId, reviewedByName);
        await this.send({
            userId,
            type: NotificationType.FEEDBACK_CONTENT_APPROVED,
            title: 'Feedback aprovado na análise',
            message: `O seu envio para "${courseName}" foi aceite na revisão administrativa${actor ? ` (${actor})` : ''}. O próximo passo é registar o pagamento PIX.`,
            link: `/student/feedback/${feedbackId}`,
            actorUserId: reviewedByUserId,
            actorDisplayName: actor,
        });
    }

    async feedbackPixStatusChanged(
        userId: string,
        event: 'APPROVED' | 'REJECTED' | 'REVERTED',
        amount: number,
        reason?: string,
        reviewedByUserId?: string,
        reviewedByName?: string,
    ) {
        const actor = await this.resolveActorName(reviewedByUserId, reviewedByName);
        const map = {
            APPROVED: {
                type: NotificationType.FEEDBACK_PIX_APPROVED,
                title: 'PIX de feedback aprovado! ✅',
                message: `Seu PIX de R$ ${Number(amount).toFixed(2)} foi aprovado${actor ? ` por ${actor}` : ''} e será enviado em até 5 dias úteis.`,
            },
            REJECTED: {
                type: NotificationType.FEEDBACK_PIX_REJECTED,
                title: 'Feedback não aprovado',
                message: `Seu feedback não foi aprovado${actor ? ` por ${actor}` : ''}.${reason ? ` Motivo: ${reason}` : ''}`,
            },
            REVERTED: {
                type: NotificationType.FEEDBACK_PIX_REVERTED,
                title: 'Aprovação revertida',
                message: `A aprovação do seu PIX foi revertida${actor ? ` por ${actor}` : ''}.${reason ? ` Motivo: ${reason}` : ''}`,
            },
        }[event];

        await this.send({
            userId,
            type: map.type,
            title: map.title,
            message: map.message,
            link: '/student/feedback',
            actorUserId: reviewedByUserId,
            actorDisplayName: actor,
        });
    }

    // ── Broadcasters to Admins & Coordinators ────────────────
    
    async getAdminAndCoordinatorIds(): Promise<string[]> {
        const users = await this.prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'COORDINATOR'] }, active: true },
            select: { id: true },
        });
        return users.map(u => u.id);
    }

    async newStudentRegistration(studentName: string) {
        const adminIds = await this.getAdminAndCoordinatorIds();
        await this.sendToMany(adminIds, {
            type: NotificationType.NEW_STUDENT_REGISTRATION,
            title: 'Novo aluno cadastrado 🎓',
            message: `${studentName} acabou de se cadastrar no sistema.`,
            link: '/admin/inscricoes',
        });
    }

    async reimbursementRequested(teacherName: string, amount: number) {
        const adminIds = await this.getAdminAndCoordinatorIds();
        await this.sendToMany(adminIds, {
            type: NotificationType.REIMBURSEMENT_REQUESTED,
            title: 'Nova solicitação de reembolso 💰',
            message: `${teacherName} solicitou um reembolso de R$ ${Number(amount).toFixed(2)}.`,
            link: '/admin/reembolsos',
        });
    }

    // ── Logistics (Motoristas & Admins) ──────────────────────

    async truckMaintenanceAlert(truckIdentifier: string, title: string, adminOnly = false, driverId?: string) {
        // Notifica coordenadores
        const adminIds = await this.getAdminAndCoordinatorIds();
        await this.sendToMany(adminIds, {
            type: NotificationType.TRUCK_MAINTENANCE_ALERT,
            title: 'Alerta de Manutenção 🚛',
            message: `Atenção para a manutenção do caminhão ${truckIdentifier}: ${title}`,
            link: '/admin/imprevistos',
        });

        if (!adminOnly && driverId) {
            await this.send({
                userId: driverId,
                type: NotificationType.TRUCK_MAINTENANCE_ALERT,
                title: 'Manutenção Agendada 🛠️',
                message: `O caminhão ${truckIdentifier} tem uma manutenção programada: ${title}.`,
                link: '/driver/manutencao',
            });
        }
    }

    async tripScheduled(driverId: string, origin: string, destination: string, date: string) {
        await this.send({
            userId: driverId,
            type: NotificationType.TRIP_SCHEDULED,
            title: 'Nova Viagem Agendada 🗺️',
            message: `Você foi escalado para a rota ${origin} → ${destination} no dia ${date}.`,
            link: '/driver/rota',
        });
    }
}
