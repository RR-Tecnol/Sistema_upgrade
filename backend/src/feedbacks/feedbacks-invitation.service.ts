import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsSenderService } from '../notifications/notifications-sender.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NoopEmailProvider, NoopSmsProvider, NoopWhatsappProvider } from './providers/noop-notification.provider';
import { MIN_CERTIFICATE_ATTENDANCE_PCT } from '../common/certificate-attendance.util';
import { evaluateCertificateEligibilityForEnrollment } from '../common/certificate-enrollment-evaluation.helper';

/**
 * FeedbacksInvitationService
 * Cria o convite de feedback quando um certificado é emitido.
 * Chamado pelo CertificateService.issueCertificate() via try/catch.
 */
@Injectable()
export class FeedbacksInvitationService {
    private readonly logger = new Logger(FeedbacksInvitationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notifSender: NotificationsSenderService,
        private readonly notifications: NotificationsGateway,
        private readonly emailProvider: NoopEmailProvider,
        private readonly smsProvider: NoopSmsProvider,
        private readonly whatsappProvider: NoopWhatsappProvider,
    ) {}

    /**
     * Chamado imediatamente após emissão de certificado.
     * Idempotente: se já existe feedback para este certificateId, não recria.
     */
    async onCertificateIssued(certificate: {
        id: string;
        studentId: string;
        classId: string;
    }): Promise<void> {
        // Idempotência
        const existing = await this.prisma.courseFeedback.findUnique({
            where: { certificateId: certificate.id },
        });
        if (existing) {
            this.logger.debug(`Feedback já existe para certificado ${certificate.id}`);
            return;
        }

        // Buscar dados do aluno para notificação
        const student = await this.prisma.student.findUnique({
            where: { id: certificate.studentId },
            include: {
                user: { select: { id: true, name: true } },
                contact: { select: { hasWhatsapp: true, allowWhatsappContact: true, allowEmailContact: true } },
            },
        });
        if (!student) {
            this.logger.warn(`Student ${certificate.studentId} não encontrado`);
            return;
        }

        // Mesmo critério do motor de elegibilidade (frequência + calendário + penalidades PENALIZED).
        const evaluation = await evaluateCertificateEligibilityForEnrollment(
            this.prisma,
            certificate.studentId,
            certificate.classId,
        );
        if (evaluation && evaluation.totalSessions > 0 && !evaluation.certificateEligible) {
            this.logger.warn(
                `Convite de feedback não criado: critério de frequência/penalidades não satisfeito ` +
                    `(presença efectiva após penalidades ${evaluation.attendanceRateAfterPenaltyPct}%, ` +
                    `mínimo ${MIN_CERTIFICATE_ATTENDANCE_PCT}%) — certificado ${certificate.id}, aluno ${certificate.studentId}.`,
            );
            return;
        }

        // Buscar nome do curso
        const cls = await this.prisma.class.findUnique({
            where: { id: certificate.classId },
            include: { course: { select: { name: true } } },
        });

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90);

        // Canais
        const channels: string[] = ['IN_APP'];
        if (student.contact?.allowEmailContact) channels.push('EMAIL');
        if (student.contact?.hasWhatsapp && student.contact?.allowWhatsappContact) channels.push('WHATSAPP');

        // Criar feedback
        const feedback = await this.prisma.courseFeedback.create({
            data: {
                studentId: certificate.studentId,
                classId: certificate.classId,
                certificateId: certificate.id,
                status: 'PENDING_STUDENT_RESPONSE',
                invitedChannels: channels,
                expiresAt,
            },
        });

        const courseName = cls?.course?.name ?? 'Curso';

        // Persistir notificação in-app
        try {
            await this.notifSender.feedbackInvitation(
                student.user.id,
                courseName,
                feedback.id,
            );
        } catch (err) {
            this.logger.warn(`Falha ao persistir notificação IN_APP: ${err}`);
        }

        // Noop providers para canais extras
        const payload = {
            userId: student.user.id,
            title: 'Conte como foi o curso e ganhe um PIX! 🎁',
            message: `Seu certificado do curso "${courseName}" foi emitido. Responda nossa pesquisa rápida e receba uma recompensa em PIX.`,
        };

        if (channels.includes('EMAIL')) {
            try { await this.emailProvider.send(payload); } catch {}
        }
        if (channels.includes('WHATSAPP')) {
            try { await this.whatsappProvider.send(payload); } catch {}
        }

        // WS — fora da transação, try/catch
        try {
            this.notifications.notifyUser(student.user.id, 'feedback_convite', {
                feedbackId: feedback.id,
                courseName,
                timestamp: new Date().toISOString(),
            });
        } catch {}

        this.logger.log(`Convite de feedback criado para certificado ${certificate.id}`);
    }

    /**
     * Envia lembrete para um feedback pendente.
     * Chamado pelo scheduler.
     */
    async sendReminder(feedbackId: string): Promise<void> {
        const fb = await this.prisma.courseFeedback.findUnique({
            where: { id: feedbackId },
            include: {
                student: { include: { user: { select: { id: true } } } },
                class: { include: { course: { select: { name: true } } } },
            },
        });
        if (!fb || fb.status !== 'PENDING_STUDENT_RESPONSE') return;

        const courseName = fb.class?.course?.name ?? 'Curso';
        const newCount = fb.reminderCount + 1;

        await this.prisma.courseFeedback.update({
            where: { id: feedbackId },
            data: { lastReminderAt: new Date(), reminderCount: newCount },
        });

        try {
            await this.notifSender.feedbackReminder(
                fb.student.user.id,
                courseName,
                feedbackId,
                newCount,
            );
        } catch (err) {
            this.logger.warn(`Falha ao enviar lembrete: ${err}`);
        }

        // Noop providers
        const payload = {
            userId: fb.student.user.id,
            title: `Lembrete: seu feedback do curso "${courseName}" ⏰`,
            message: 'Ainda não recebemos sua avaliação. Leva menos de 3 minutos e você ganha um PIX de recompensa.',
        };

        if (fb.invitedChannels.includes('EMAIL')) {
            try { await this.emailProvider.send(payload); } catch {}
        }
        if (fb.invitedChannels.includes('WHATSAPP')) {
            try { await this.whatsappProvider.send(payload); } catch {}
        }

        this.logger.log(`Lembrete #${newCount} enviado para feedback ${feedbackId}`);
    }

    /**
     * Backfill: varre certificados ACTIVE sem CourseFeedback e cria convites órfãos.
     * Aproveita a idempotência do onCertificateIssued.
     * Chamado pelo scheduler (cron 03:00) e pelo endpoint admin /feedbacks/admin/sync-orphans.
     * Útil após seeds (que pulam o CertificateService) ou falha do hook de emissão.
     */
    async backfillOrphanedCertificates(): Promise<{ scanned: number; created: number; skipped: number }> {
        this.logger.log('Iniciando backfill de certificados órfãos...');

        const orphaned = await this.prisma.certificate.findMany({
            where: {
                status: 'ACTIVE',
                courseFeedback: { is: null },
            },
            select: { id: true, studentId: true, classId: true },
            orderBy: { issuedAt: 'asc' },
        });

        let created = 0;
        let skipped = 0;

        for (const cert of orphaned) {
            try {
                await this.onCertificateIssued({
                    id: cert.id,
                    studentId: cert.studentId,
                    classId: cert.classId,
                });
                created++;
            } catch (err) {
                this.logger.warn(`Backfill falhou para certificate ${cert.id}: ${err}`);
                skipped++;
            }
        }

        const summary = { scanned: orphaned.length, created, skipped };
        this.logger.log(`Backfill concluído: ${JSON.stringify(summary)}`);
        return summary;
    }
}
