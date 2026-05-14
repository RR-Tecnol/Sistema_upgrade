import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { ContaPagarStatus, FeedbackRewardStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { CreateContaPagarDto } from './dto/create-conta-pagar.dto';
import { StockService } from '../stock/stock.service';

@Injectable()
export class ContasPagarService {
    constructor(
        private prisma: PrismaService,
        private readonly notifications: NotificationsGateway,
        @Inject(forwardRef(() => StockService))
        private readonly stockService: StockService,
    ) { }

    /**
     * Quando uma ContaPagar de tipo `estoque_reposicao` é marcada como paga,
     * dispara o recebimento da Solicitação de Compra vinculada (idempotente).
     *
     * Roda em "best-effort": qualquer falha NÃO derruba o pagamento. A operação é
     * idempotente: se já foi recebida, retorna sem alterar nada.
     */
    private async triggerStockReceiptIfApplicable(contaPagarId: string, actorUserId: string) {
        try {
            const pr = await this.prisma.stockPurchaseRequest.findFirst({
                where: { contaPagarId, active: true },
                select: { id: true, status: true },
            });
            if (!pr) return; // conta não está ligada a estoque (ex.: pneu_furado)
            if (pr.status !== 'APROVADA') return; // já foi recebida ou está em outro estado

            // Para o trigger automático, o actor pode ser qualquer um — o serviço
            // valida `MANUAL_RECEIPT` × admin, mas aqui usamos `PAYMENT` que ignora a role.
            await this.stockService.confirmReceiptOfPurchase(
                pr.id,
                { id: actorUserId, role: 'ADMIN' as UserRole },
                'PAYMENT',
            );
        } catch (e) {
            console.error('[ContasPagar] Falha ao disparar recebimento de estoque automático:', e);
        }
    }

    private emitFinanceiroListagemRefresh(source: string, extra: Record<string, unknown> = {}) {
        try {
            this.notifications.notifyFinanceiroListagemRefresh({ source, ...extra });
        } catch { /* WS nunca bloqueia */ }
    }

    /** Alinha CourseFeedback quando a conta é paga pela UI financeira (evita divergência com feedbacks.service). */
    private async syncCourseFeedbackRewardPaidForConta(
        contaPagarId: string,
        tx?: Prisma.TransactionClient,
    ) {
        const client = tx ?? this.prisma;
        const fb = await client.courseFeedback.findFirst({
            where: { contaPagarId, active: true },
            select: { id: true, rewardStatus: true },
        });
        if (!fb || fb.rewardStatus !== FeedbackRewardStatus.PENDING) return;
        await client.courseFeedback.update({
            where: { id: fb.id },
            data: {
                rewardStatus: FeedbackRewardStatus.PAID,
                rewardPaidAt: new Date(),
                rewardPaymentReference: `conta_pagar:${contaPagarId}`,
            },
        });
    }

    async create(dto: CreateContaPagarDto) {
        const created = await this.prisma.contaPagar.create({
            data: {
                tipo_conta: dto.tipo_conta,
                tipo_espontaneo: dto.tipo_espontaneo,
                descricao: dto.descricao,
                valor: dto.valor,
                data_vencimento: new Date(dto.data_vencimento),
                status: dto.status || 'pendente',
                recorrente: dto.recorrente ?? false,
                observacoes: dto.observacoes,
                cidade: dto.cidade,
                acaoId: dto.acao_id || undefined,
            },
            include: {
                acao: { select: { id: true, nome: true } },
                courseFeedback: { select: { currentPhotoUrl: true, socialPostProofUrl: true } },
            },
        });
        this.emitFinanceiroListagemRefresh('contas_pagar_create', { contaPagarId: created.id });
        return created;
    }

    async findAll(filters?: {
        tipo_conta?: string;
        status?: string;
        cidade?: string;
        data_inicio?: string;
        data_fim?: string;
        search?: string;
        includeDeleted?: boolean; // PASSO 3.9: aba excluídos
    }) {
        const where: any = {};
        // PASSO 3.9: por padrão filtra apenas activos; includeDeleted mostra só os excluídos
        where.active = filters?.includeDeleted ? false : true;
        if (filters?.tipo_conta) where.tipo_conta = filters.tipo_conta;
        if (filters?.status) where.status = filters.status as ContaPagarStatus;
        if (filters?.cidade) where.cidade = { contains: filters.cidade, mode: 'insensitive' };
        if (filters?.data_inicio || filters?.data_fim) {
            where.data_vencimento = {};
            if (filters.data_inicio) where.data_vencimento.gte = new Date(filters.data_inicio);
            if (filters.data_fim) where.data_vencimento.lte = new Date(filters.data_fim + 'T23:59:59');
        }
        if (filters?.search) {
            where.OR = [
                { descricao: { contains: filters.search, mode: 'insensitive' } },
                { cidade: { contains: filters.search, mode: 'insensitive' } },
                { observacoes: { contains: filters.search, mode: 'insensitive' } },
                { tipo_conta: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        const [contas, total] = await Promise.all([
            this.prisma.contaPagar.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include: {
                    acao: { select: { id: true, nome: true } },
                    courseFeedback: {
                        select: {
                            id: true,
                            status: true,
                            resubmittedAfterReject: true,
                            rejectionReason: true,
                            studentSubmitSequence: true,
                            currentPhotoUrl: true,
                            socialPostProofUrl: true,
                            student: { select: { user: { select: { name: true, email: true } } } },
                        },
                    },
                    // ESTOQUE: vinculo 1:1 — usado no modal de rastreio para mostrar
                    // item, fornecedor, requester/reviewer e justificativa sem precisar
                    // parsear texto da descrição.
                    stockPurchaseRequest: {
                        select: {
                            id: true,
                            status: true,
                            quantidade: true,
                            precoUnitario: true,
                            valorTotal: true,
                            justificativa: true,
                            fornecedor: true,
                            urgente: true,
                            createdAt: true,
                            reviewedAt: true,
                            reviewNote: true,
                            stockItem: {
                                select: {
                                    id: true,
                                    nome: true,
                                    codigoInterno: true,
                                    categoria: true,
                                    unidade: true,
                                    fotoUrl: true,
                                    quantidadeAtual: true,
                                },
                            },
                            requester: { select: { id: true, name: true, role: true } },
                            reviewer: { select: { id: true, name: true, role: true } },
                        },
                    },
                },
            }),
            this.prisma.contaPagar.count({ where }),
        ]);

        // KPIs por status — só contas ativas (excluídas não entram nos totais)
        const kpis = await this.prisma.contaPagar.groupBy({
            by: ['status'],
            where: { active: true },
            _sum: { valor: true },
            _count: { _all: true },
        });

        const totaisPorStatus = {
            pendente: 0, paga: 0, vencida: 0, cancelada: 0,
        };
        kpis.forEach(k => {
            totaisPorStatus[k.status] = Number(k._sum.valor ?? 0);
        });

        return { contas, total, totaisPorStatus };
    }

    async findOne(id: string) {
        const conta = await this.prisma.contaPagar.findUnique({
            where: { id },
            include: {
                acao: { select: { id: true, nome: true } },
                courseFeedback: {
                    select: {
                        id: true,
                        status: true,
                        resubmittedAfterReject: true,
                        rejectionReason: true,
                        studentSubmitSequence: true,
                        currentPhotoUrl: true,
                        socialPostProofUrl: true,
                        student: { select: { user: { select: { name: true, email: true } } } },
                    },
                },
                stockPurchaseRequest: {
                    select: {
                        id: true,
                        status: true,
                        quantidade: true,
                        precoUnitario: true,
                        valorTotal: true,
                        justificativa: true,
                        fornecedor: true,
                        urgente: true,
                        createdAt: true,
                        reviewedAt: true,
                        reviewNote: true,
                        stockItem: {
                            select: {
                                id: true,
                                nome: true,
                                codigoInterno: true,
                                categoria: true,
                                unidade: true,
                                fotoUrl: true,
                                quantidadeAtual: true,
                            },
                        },
                        requester: { select: { id: true, name: true, role: true } },
                        reviewer: { select: { id: true, name: true, role: true } },
                    },
                },
            },
        });
        if (!conta) throw new NotFoundException('Conta não encontrada');
        return conta;
    }

    async update(id: string, dto: Partial<CreateContaPagarDto> & { data_pagamento?: string; status?: ContaPagarStatus }) {
        await this.findOne(id);
        const result = await this.prisma.contaPagar.update({
            where: { id },
            data: {
                ...(dto.tipo_conta !== undefined && { tipo_conta: dto.tipo_conta }),
                ...(dto.tipo_espontaneo !== undefined && { tipo_espontaneo: dto.tipo_espontaneo }),
                ...(dto.descricao !== undefined && { descricao: dto.descricao }),
                ...(dto.valor !== undefined && { valor: dto.valor }),
                ...(dto.data_vencimento !== undefined && { data_vencimento: new Date(dto.data_vencimento) }),
                ...(dto.data_pagamento !== undefined && { data_pagamento: new Date(dto.data_pagamento) }),
                ...(dto.status !== undefined && { status: dto.status }),
                ...(dto.recorrente !== undefined && { recorrente: dto.recorrente }),
                ...(dto.observacoes !== undefined && { observacoes: dto.observacoes }),
                ...(dto.cidade !== undefined && { cidade: dto.cidade }),
                ...(dto.acao_id !== undefined && { acaoId: dto.acao_id || null }),
            },
            include: {
                acao: { select: { id: true, nome: true } },
                courseFeedback: { select: { currentPhotoUrl: true, socialPostProofUrl: true } },
            },
        });
        if (result.status === 'paga') {
            await this.syncCourseFeedbackRewardPaidForConta(id);
            // 🔗 HOOK ESTOQUE — se a conta paga estiver ligada a uma PR APROVADA, dispara recebimento
            await this.triggerStockReceiptIfApplicable(id, /* actorUserId */ 'system');
        }
        this.emitFinanceiroListagemRefresh('contas_pagar_update', { contaPagarId: id });
        return result;
    }

    async marcarComoPaga(id: string, actorUserId?: string) {
        await this.findOne(id);
        const updated = await this.prisma.$transaction(async (tx) => {
            const conta = await tx.contaPagar.update({
                where: { id },
                data: { status: 'paga', data_pagamento: new Date() },
            });
            await this.syncCourseFeedbackRewardPaidForConta(id, tx);
            return conta;
        });
        // 🔗 HOOK ESTOQUE — se a conta paga estiver ligada a uma PR APROVADA, dispara recebimento
        await this.triggerStockReceiptIfApplicable(id, actorUserId ?? 'system');
        this.emitFinanceiroListagemRefresh('contas_pagar_marcar_paga', { contaPagarId: id });
        return updated;
    }

    // PASSO 3.9: soft delete — nunca apaga fisicamente
    async remove(id: string) {
        await this.findOne(id);
        const out = await this.prisma.contaPagar.update({
            where: { id },
            data: { active: false },
        });
        this.emitFinanceiroListagemRefresh('contas_pagar_remove', { contaPagarId: id });
        return out;
    }

    // PASSO 3.9: restaurar conta excluída
    async restore(id: string) {
        const conta = await this.prisma.contaPagar.findUnique({ where: { id } });
        if (!conta) throw new NotFoundException('Conta não encontrada');
        const out = await this.prisma.contaPagar.update({
            where: { id },
            data: { active: true },
            include: {
                acao: { select: { id: true, nome: true } },
                courseFeedback: { select: { currentPhotoUrl: true, socialPostProofUrl: true } },
            },
        });
        this.emitFinanceiroListagemRefresh('contas_pagar_restore', { contaPagarId: id });
        return out;
    }

    async updateAnexo(id: string, comprovante_url: string) {
        await this.findOne(id);
        const out = await this.prisma.contaPagar.update({
            where: { id },
            data: { comprovante_url },
        });
        this.emitFinanceiroListagemRefresh('contas_pagar_update_anexo', { contaPagarId: id });
        return out;
    }
}
