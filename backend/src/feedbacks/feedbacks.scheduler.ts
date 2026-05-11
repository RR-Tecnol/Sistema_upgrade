import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { FeedbacksInvitationService } from './feedbacks-invitation.service';

@Injectable()
export class FeedbacksScheduler {
    private readonly logger = new Logger(FeedbacksScheduler.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly invitation: FeedbacksInvitationService,
    ) {}

    /** Todo dia às 09:00 — envia lembretes para feedbacks pendentes */
    @Cron('0 9 * * *')
    async sendReminders() {
        const REMINDER_DAYS = Number(process.env.FEEDBACK_REMINDER_DAYS ?? 30);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - REMINDER_DAYS);

        const pending = await this.prisma.courseFeedback.findMany({
            where: {
                status: 'PENDING_STUDENT_RESPONSE',
                active: true,
                OR: [
                    { lastReminderAt: null, invitedAt: { lte: cutoff } },
                    { lastReminderAt: { lte: cutoff } },
                ],
            },
            take: 500,
        });

        for (const fb of pending) {
            try {
                await this.invitation.sendReminder(fb.id);
            } catch (err) {
                this.logger.error(`Erro ao reenviar feedback ${fb.id}: ${err}`);
            }
        }
        this.logger.log(`Reminder batch: ${pending.length} feedbacks processados`);
    }

    /** Todo dia às 02:00 — expira feedbacks após FEEDBACK_EXPIRE_DAYS dias */
    @Cron('0 2 * * *')
    async expireOldInvites() {
        const EXPIRE_DAYS = Number(process.env.FEEDBACK_EXPIRE_DAYS ?? 120);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - EXPIRE_DAYS);

        const { count } = await this.prisma.courseFeedback.updateMany({
            where: {
                status: 'PENDING_STUDENT_RESPONSE',
                active: true,
                invitedAt: { lte: cutoff },
            },
            data: { status: 'EXPIRED' },
        });

        this.logger.log(`Expiração: ${count} feedbacks movidos para EXPIRED`);
    }

    /** Todo dia às 03:00 — varre certificados sem feedback e cria convites órfãos (proteção contra seeds/hook falho) */
    @Cron('0 3 * * *')
    async backfillOrphanedCerts() {
        try {
            const summary = await this.invitation.backfillOrphanedCertificates();
            if (summary.created > 0) {
                this.logger.log(`Backfill automático criou ${summary.created} convites órfãos`);
            }
        } catch (err) {
            this.logger.error(`Falha no backfill automático: ${err}`);
        }
    }
}
