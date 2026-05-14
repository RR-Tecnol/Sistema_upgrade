import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MailScheduler } from './mail.scheduler';
import { MailService } from './mail.service';

/**
 * Endpoint temporário para disparar os cron jobs manualmente durante testes.
 * ⚠️  REMOVER antes do deploy em produção oficial.
 */
@ApiTags('mail-test')
@Controller('mail/test')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class MailTestController {
    constructor(
        private readonly scheduler: MailScheduler,
        private readonly mail: MailService,
    ) {}

    // ── Fase 2: Cron Jobs ────────────────────────────────────────────────────

    @Post('cron/:job')
    @ApiOperation({ summary: 'Dispara um cron job de email manualmente (apenas ADMIN — remover em produção)' })
    async triggerCron(@Param('job') job: string) {
        switch (job) {
            case 'class-reminder':
                await this.scheduler.sendClassReminders();
                return { triggered: 'sendClassReminders', ok: true };

            case 'absence-alert':
                await this.scheduler.sendAbsenceAlerts();
                return { triggered: 'sendAbsenceAlerts', ok: true };

            case 'maintenance-alert':
                await this.scheduler.sendMaintenanceAlerts();
                return { triggered: 'sendMaintenanceAlerts', ok: true };

            case 'weekly-summary':
                await this.scheduler.sendWeeklySummary();
                return { triggered: 'sendWeeklySummary', ok: true };

            default:
                return {
                    error: 'Job não encontrado',
                    available: ['class-reminder', 'absence-alert', 'maintenance-alert', 'weekly-summary'],
                };
        }
    }

    // ── Fase 3: Emails Financeiros ───────────────────────────────────────────

    @Post('send-pix')
    @ApiOperation({ summary: '[TESTE Fase 3] Dispara email de PIX aprovado para destinatário informado' })
    async sendTestPix(@Body() body: {
        to: string; name: string;
        pixAmount: number; courseName: string;
        pixKey: string; pixKeyType: string;
    }) {
        await this.mail.sendFeedbackPixApproved(
            body.to, body.name,
            body.pixAmount, body.courseName,
            body.pixKey, body.pixKeyType,
        );
        return { triggered: 'sendFeedbackPixApproved', ok: true };
    }

    @Post('send-reimbursement-approved')
    @ApiOperation({ summary: '[TESTE Fase 3] Dispara email de reembolso aprovado' })
    async sendTestReimbApproved(@Body() body: {
        to: string; name: string;
        amount: number; description: string; approverName: string;
    }) {
        await this.mail.sendReimbursementApproved(
            body.to, body.name,
            body.amount, body.description, body.approverName,
        );
        return { triggered: 'sendReimbursementApproved', ok: true };
    }

    @Post('send-reimbursement-rejected')
    @ApiOperation({ summary: '[TESTE Fase 3] Dispara email de reembolso rejeitado' })
    async sendTestReimbRejected(@Body() body: {
        to: string; name: string;
        amount: number; description: string;
        reason: string; approverName: string;
    }) {
        await this.mail.sendReimbursementRejected(
            body.to, body.name,
            body.amount, body.description,
            body.reason, body.approverName,
        );
        return { triggered: 'sendReimbursementRejected', ok: true };
    }
}
