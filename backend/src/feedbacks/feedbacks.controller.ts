import {
    Controller, Get, Patch, Post, Body, Param, Query, Req, Res, Header,
    UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FeedbacksService } from './feedbacks.service';
import { FeedbacksMinioService } from './feedbacks-minio.service';
import { FeedbacksInvitationService } from './feedbacks-invitation.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { ApproveFeedbackDto } from './dto/approve-feedback.dto';
import { RejectFeedbackDto } from './dto/reject-feedback.dto';
import { RevertFeedbackDto } from './dto/revert-feedback.dto';
import { MarkRewardPaidDto } from './dto/mark-reward-paid.dto';
import { FeedbackStatus } from '@prisma/client';

@ApiTags('Feedbacks')
@ApiBearerAuth()
@Controller('feedbacks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeedbacksController {
    constructor(
        private readonly service: FeedbacksService,
        private readonly minio: FeedbacksMinioService,
        private readonly invitation: FeedbacksInvitationService,
    ) {}

    // ── STUDENT ──────────────────────────────────────────────

    @Post('presigned-url')
    @Roles('STUDENT')
    @ApiOperation({ summary: 'Gera Presigned URL para upload de foto de feedback' })
    @HttpCode(HttpStatus.OK)
    async presignedUrl(
        @Body() body: { filename: string; contentType: string },
        @Req() req: any,
    ) {
        const ext = body.filename?.split('.').pop() ?? 'jpg';
        const fileKey = `${req.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const uploadUrl = await this.minio.presignedPutUrl(fileKey);
        return { uploadUrl, fileKey };
    }

    @Get('my')
    @Roles('STUDENT')
    @ApiOperation({ summary: 'Lista feedbacks do aluno logado' })
    async listMine(@Req() req: any) {
        return this.service.listMine(req.user.id);
    }

    @Get('my/:id')
    @Roles('STUDENT')
    @ApiOperation({ summary: 'Detalhe de um feedback do aluno logado' })
    async findOneMine(@Param('id') id: string, @Req() req: any) {
        return this.service.findOneMine(id, req.user.id);
    }

    @Patch(':id/submit')
    @Roles('STUDENT')
    @ApiOperation({ summary: 'Envia respostas do feedback' })
    async submit(
        @Param('id') id: string,
        @Body() dto: SubmitFeedbackDto,
        @Req() req: any,
    ) {
        return this.service.submit(id, req.user.id, dto);
    }

    // ── ADMIN / COORDINATOR / FINANCIAL ──────────────────────

    @Get('kpis')
    @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
    @ApiOperation({ summary: 'KPIs de feedbacks' })
    async kpis() {
        return this.service.kpis();
    }

    /*
     * FUTURE_DEPLOY — PIX em lote (CSV, filas bulk, export):
     * rotas mantidas para não quebrar integrações; UI admin desligada neste deploy.
     * Ver também `approve-for-batch` abaixo.
     */
    @Get('admin/pix-rewards')
    @Roles('ADMIN', 'FINANCIAL')
    @ApiOperation({ summary: 'Elegíveis a PIX em lote (feedback concluído, divulgação social, recompensa pendente, sem ContaPagar)' })
    async listPixRewards() {
        return this.service.listPixRewardsEligible();
    }

    @Get('admin/pix-rewards/paid')
    @Roles('ADMIN', 'FINANCIAL')
    @ApiOperation({ summary: 'Histórico de recompensas PIX (lote) já pagas' })
    async listPixRewardsPaid() {
        return this.service.listPixRewardsPaid();
    }

    @Get('admin/pix-rewards/cancelled')
    @Roles('ADMIN', 'FINANCIAL')
    @ApiOperation({ summary: 'Recompensas PIX (lote) canceladas (admin marcou como suspeitas)' })
    async listPixRewardsCancelled() {
        return this.service.listPixRewardsCancelled();
    }

    @Get('admin/pix-rewards/export')
    @Roles('ADMIN', 'FINANCIAL')
    @Header('Content-Type', 'text/csv; charset=utf-8')
    @ApiOperation({ summary: 'Gera ficheiro CSV de pagamento em massa (chave, nome, 50.00, id referência)' })
    async exportPixRewardsCsv(@Res({ passthrough: true }) res: Response) {
        const { filename, body, rowCount } = await this.service.getPixBatchPaymentExport();
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('X-Row-Count', String(rowCount));
        return '\ufeff' + body;
    }

    @Patch('admin/pix-rewards/bulk-mark-paid')
    @Roles('ADMIN', 'FINANCIAL')
    @ApiOperation({ summary: 'Marca múltiplas recompensas PIX (lote) como pagas em uma única transação' })
    async bulkMarkRewardPaid(
        @Body() dto: { ids: string[]; paymentReference?: string },
        @Req() req: any,
    ) {
        return this.service.bulkMarkRewardPaid(dto.ids, req.user.id, dto.paymentReference);
    }

    @Get()
    @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
    @ApiOperation({ summary: 'Lista todos os feedbacks (admin)' })
    @ApiQuery({ name: 'status', required: false, enum: FeedbackStatus })
    @ApiQuery({
        name: 'lifecycle',
        required: false,
        enum: ['WAITING_TRIAGE', 'TRIAGE_OK', 'PENDING_PAYMENT', 'PAID', 'REJECTED'],
        description: 'Filtro de pipeline (tem precedência sobre status)',
    })
    @ApiQuery({ name: 'classId', required: false })
    @ApiQuery({ name: 'rewardStatus', required: false, enum: ['PENDING', 'PAID', 'CANCELLED'] })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    async findAllAdmin(
        @Query('status') status?: FeedbackStatus,
        @Query('lifecycle')
        lifecycle?: 'WAITING_TRIAGE' | 'TRIAGE_OK' | 'PENDING_PAYMENT' | 'PAID' | 'REJECTED',
        @Query('classId') classId?: string,
        @Query('rewardStatus') rewardStatus?: 'PENDING' | 'PAID' | 'CANCELLED',
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.service.findAllAdmin({
            status,
            lifecycle,
            classId,
            rewardStatus: rewardStatus as any,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
    }

    @Get(':id/media-url')
    @Roles('STUDENT', 'ADMIN', 'COORDINATOR', 'FINANCIAL')
    @ApiOperation({ summary: 'Gera presigned GET URL do MinIO para foto, vídeo ou screenshot do post social' })
    @ApiQuery({ name: 'kind', required: true, enum: ['photo', 'video', 'postProof'] })
    @ApiQuery({ name: 'download', required: false, description: 'Se "1" ou "true", URL força download com filename legível' })
    async getMediaUrl(
        @Param('id') id: string,
        @Query('kind') kind: 'photo' | 'video' | 'postProof',
        @Query('download') download: string | undefined,
        @Req() req: any,
    ) {
        if (kind !== 'photo' && kind !== 'video' && kind !== 'postProof') {
            return { url: null };
        }
        const isDownload = download === '1' || download === 'true';
        return this.service.getMediaUrl(
            id, kind,
            { userId: req.user.id, role: req.user.role },
            { download: isDownload },
        );
    }

    @Get(':id')
    @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
    @ApiOperation({ summary: 'Detalhe completo de um feedback (admin)' })
    async findOneAdmin(@Param('id') id: string) {
        return this.service.findOneAdmin(id);
    }

    @Patch(':id/approve-content')
    @Roles('ADMIN', 'FINANCIAL')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Triagem administrativa — aceitar o feedback enviado (sem gerar conta ainda)' })
    async approveContent(@Param('id') id: string, @Req() req: any) {
        return this.service.approveContent(id, req.user.id);
    }

    @Patch(':id/approve')
    @Roles('ADMIN', 'FINANCIAL')
    @ApiOperation({
        summary: 'Confirma valor PIX após triagem aceite — gera ContaPagar (requer CONTENT_APPROVED)',
    })
    async approve(
        @Param('id') id: string,
        @Body() dto: ApproveFeedbackDto,
        @Req() req: any,
    ) {
        return this.service.approve(id, req.user.id, dto.pixAmount);
    }

    @Patch(':id/create-conta-pagar')
    @Roles('ADMIN', 'FINANCIAL')
    @ApiOperation({
        summary: 'Gera Conta a Pagar em feedback APPROVED sem lançamento (legado / lote)',
    })
    async createContaPagarMissing(
        @Param('id') id: string,
        @Body() dto: ApproveFeedbackDto,
        @Req() req: any,
    ) {
        return this.service.createMissingContaPagar(id, req.user.id, dto.pixAmount);
    }

    // FUTURE_DEPLOY: reserva para lote — UI stand-by; endpoint mantido.
    @Patch(':id/approve-for-batch')
    @Roles('ADMIN', 'FINANCIAL')
    @ApiOperation({ summary: 'Aprova feedback para o fluxo de pagamento em lote (R$50 fixo via CSV, sem ContaPagar)' })
    async approveForBatch(
        @Param('id') id: string,
        @Req() req: any,
    ) {
        return this.service.approveForBatch(id, req.user.id);
    }

    @Patch(':id/reject')
    @Roles('ADMIN', 'FINANCIAL')
    @ApiOperation({ summary: 'Rejeita feedback' })
    async reject(
        @Param('id') id: string,
        @Body() dto: RejectFeedbackDto,
        @Req() req: any,
    ) {
        return this.service.reject(id, req.user.id, dto.rejectionReason);
    }

    @Patch(':id/revert')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Reverte aprovação de feedback (somente ADMIN)' })
    async revert(
        @Param('id') id: string,
        @Body() dto: RevertFeedbackDto,
        @Req() req: any,
    ) {
        return this.service.revert(id, req.user.id, dto.revertReason);
    }

    @Patch(':id/reward/mark-paid')
    @Roles('ADMIN', 'FINANCIAL')
    @ApiOperation({ summary: 'Marca recompensa PIX (lote) como paga — regista data e referência' })
    async markRewardPaid(
        @Param('id') id: string,
        @Body() dto: MarkRewardPaidDto,
        @Req() req: any,
    ) {
        return this.service.markRewardPaid(id, req.user.id, dto.paymentReference);
    }

    @Patch(':id/reward/cancel')
    @Roles('ADMIN', 'FINANCIAL')
    @ApiOperation({ summary: 'Cancela recompensa PIX (lote) — admin marca como suspeita/fraude' })
    async cancelReward(
        @Param('id') id: string,
        @Body() dto: { reason?: string },
        @Req() req: any,
    ) {
        return this.service.cancelReward(id, req.user.id, dto?.reason);
    }

    @Post('admin/sync-orphans')
    @Roles('ADMIN', 'COORDINATOR')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Sincroniza certificados órfãos',
        description: 'Cria convites de feedback para certificados ACTIVE sem CourseFeedback associado. Idempotente. Útil após seeds ou falha do hook de emissão.',
    })
    async syncOrphanedCertificates() {
        return this.invitation.backfillOrphanedCertificates();
    }
}
