import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { Prisma, StockItemCategory, StockMovementType, StockPurchaseRequestStatus, UserRole } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateStockItemDto } from './dto/create-stock-item.dto';
import { UpdateStockItemDto } from './dto/update-stock-item.dto';
import { CreateMovementDto } from './dto/create-movement.dto';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { CreateItemWithPurchaseRequestDto } from './dto/create-item-with-purchase-request.dto';
import {
    ApprovePurchaseRequestDto,
    RejectPurchaseRequestDto,
} from './dto/review-purchase-request.dto';
import { CreateStockBudgetDto, UpdateStockBudgetDto } from './dto/stock-budget.dto';
import { UpsertAcaoStockBudgetDto } from './dto/acao-stock-budget.dto';

/**
 * Roles autorizadas a registrar movimentações.
 * Restrições adicionais por TIPO de movimentação são aplicadas dentro do método.
 */
const ROLES_AUTORIZADAS_MOVIMENTACAO: UserRole[] = [
    'ADMIN',
    'IT_ADMIN',
    'COORDINATOR',
    'DRIVER',
    'TEACHER',
];

/**
 * Roles que podem aprovar/rejeitar solicitações de compra.
 */
const ROLES_REVISOR_COMPRA: UserRole[] = ['ADMIN', 'IT_ADMIN'];

@Injectable()
export class StockService {
    constructor(
        private prisma: PrismaService,
        private mailService: MailService,
        private auditLog: AuditLogService,
    ) {}

    /** Serializa um StockItem para o campo Json do AuditLog (Decimal → string). */
    private snapshotItem(item: any): Record<string, any> {
        if (!item) return {};
        return {
            id: item.id,
            nome: item.nome,
            codigoInterno: item.codigoInterno,
            categoria: item.categoria,
            unidade: item.unidade,
            quantidadeAtual: item.quantidadeAtual?.toString?.() ?? item.quantidadeAtual,
            quantidadeMinima: item.quantidadeMinima?.toString?.() ?? item.quantidadeMinima,
            validade: item.validade?.toISOString?.() ?? item.validade ?? null,
            fornecedor: item.fornecedor ?? null,
            precoUnitario: item.precoUnitario?.toString?.() ?? item.precoUnitario ?? null,
            localizacao: item.localizacao ?? null,
            fotoUrl: item.fotoUrl ?? null,
            observacoes: item.observacoes ?? null,
            active: item.active,
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    //   ITENS (CRUD do estoque central)
    // ═══════════════════════════════════════════════════════════════════

    async findAllItems(filters?: {
        categoria?: string;
        customCategoryId?: string;
        search?: string;
        onlyLow?: boolean;
        onlyExpiring?: boolean;
        diasAteVencer?: number;
        includeInactive?: boolean;
    }) {
        const where: Prisma.StockItemWhereInput = {};

        if (!filters?.includeInactive) {
            where.active = true;
        }

        if (filters?.categoria) {
            where.categoria = filters.categoria as any;
        }

        if (filters?.customCategoryId) {
            where.customCategoryId = filters.customCategoryId;
        }

        if (filters?.search?.trim()) {
            const q = filters.search.trim();
            where.OR = [
                { nome: { contains: q, mode: 'insensitive' } },
                { codigoInterno: { contains: q, mode: 'insensitive' } },
                { fornecedor: { contains: q, mode: 'insensitive' } },
            ];
        }

        const items = await this.prisma.stockItem.findMany({
            where,
            orderBy: { nome: 'asc' },
            include: {
                customCategory: { select: { id: true, nome: true, icon: true, color: true } },
                truckStocks: {
                    select: {
                        id: true,
                        quantidadeAtual: true,
                        truck: { select: { id: true, identifier: true, licensePlate: true } },
                    },
                    orderBy: { quantidadeAtual: 'desc' },
                },
                _count: {
                    select: {
                        truckStocks: true,
                        movimentacoes: true,
                        purchaseRequests: true,
                    },
                },
            },
        });

        // Filtros derivados (estoque baixo / vencendo) — feitos em memória porque
        // dependem de comparações Decimal + Date que não são triviais via where.
        let filtered = items;

        if (filters?.onlyLow) {
            filtered = filtered.filter(
                (i) => Number(i.quantidadeAtual) <= Number(i.quantidadeMinima),
            );
        }

        if (filters?.onlyExpiring) {
            const dias = filters.diasAteVencer ?? 30;
            const limite = new Date();
            limite.setDate(limite.getDate() + dias);
            filtered = filtered.filter(
                (i) => i.validade && new Date(i.validade) <= limite,
            );
        }

        // Anexar contagem de Solicitações de Compra PENDENTES por item.
        // Usado pelo frontend (lista, dashboard, visões) para destacar quem precisa
        // de uma 1ª Solicitação (sem saldo, sem trânsito, sem PR pendente).
        if (filtered.length === 0) return filtered;

        const pendingByItem = await this.prisma.stockPurchaseRequest.groupBy({
            by: ['stockItemId'],
            where: {
                active: true,
                status: 'PENDENTE',
                stockItemId: { in: filtered.map((i) => i.id) },
            },
            _count: { _all: true },
        });
        const pendingMap = new Map<string, number>(
            pendingByItem.map((p) => [p.stockItemId, p._count._all]),
        );

        return filtered.map((it) => ({
            ...it,
            pendingPurchaseRequestsCount: pendingMap.get(it.id) ?? 0,
        }));
    }

    async findOneItem(id: string) {
        const item = await this.prisma.stockItem.findUnique({
            where: { id },
            include: {
                customCategory: true,
                truckStocks: {
                    include: {
                        truck: {
                            select: {
                                id: true,
                                identifier: true,
                                licensePlate: true,
                                status: true,
                            },
                        },
                    },
                    orderBy: { quantidadeAtual: 'desc' },
                },
                movimentacoes: {
                    take: 30,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        fromTruck: { select: { id: true, identifier: true } },
                        toTruck: { select: { id: true, identifier: true } },
                        acao: { select: { id: true, nome: true } },
                        registrar: { select: { id: true, name: true, role: true } },
                    },
                },
                _count: {
                    select: {
                        movimentacoes: true,
                        purchaseRequests: true,
                    },
                },
            },
        });

        if (!item) throw new NotFoundException('Item de estoque não encontrado');

        // Mesma estratégia de findAllItems: anexa contagem de PRs pendentes para
        // o frontend conseguir decidir entre "aguardando 1ª solicitação" e "em fluxo".
        const pendingCount = await this.prisma.stockPurchaseRequest.count({
            where: { active: true, status: 'PENDENTE', stockItemId: id },
        });

        return { ...item, pendingPurchaseRequestsCount: pendingCount };
    }

    async createItem(data: CreateStockItemDto, actor?: { id: string; role: UserRole }) {
        if (data.codigoInterno) {
            const existing = await this.prisma.stockItem.findUnique({
                where: { codigoInterno: data.codigoInterno },
            });
            if (existing) {
                if (existing.active) {
                    // ATIVO com mesmo código → conflito real
                    throw new ConflictException({
                        statusCode: 409,
                        code: 'ACTIVE_ITEM_WITH_SAME_CODE',
                        message: 'Já existe um item ATIVO com este código interno. Use outro código ou edite o item existente.',
                        existingItemId: existing.id,
                        existingItemNome: existing.nome,
                    });
                }
                // INATIVO com mesmo código → oferecer REATIVAR (mantém auditoria histórica)
                throw new ConflictException({
                    statusCode: 409,
                    code: 'INACTIVE_ITEM_WITH_SAME_CODE',
                    message: `Existe um item DESATIVADO com o código "${data.codigoInterno}" (nome anterior: "${existing.nome}"). ` +
                        `Você pode REATIVAR esse item (mantém histórico ligado e atualiza com os dados novos) ` +
                        `ou escolher outro código para um item totalmente novo.`,
                    existingItemId: existing.id,
                    existingItemNome: existing.nome,
                    canReactivate: true,
                });
            }
        }

        // REGRA DE COERÊNCIA (REQ 2026-05): saldo inicial SEMPRE = 0.
        // Estoque só entra via StockPurchaseRequest aprovada e recebida — garante rastreio
        // contábil 100% (cada unidade tem uma ContaPagar de origem).
        // Itens legados podem ter qty > 0; isso é só para CRIAÇÃO nova.
        if (data.quantidadeAtual !== undefined && Number(data.quantidadeAtual) !== 0) {
            throw new BadRequestException(
                'Saldo inicial deve ser zero. Para registrar entrada de estoque, gere uma Solicitação de Compra ' +
                '(que vai gerar ContaPagar e dar entrada rastreada). Isso evita "estoque fantasma" sem origem financeira.',
            );
        }

        // Validar customCategoryId se preenchido
        if (data.customCategoryId) {
            const cat = await this.prisma.stockCategory.findUnique({
                where: { id: data.customCategoryId },
            });
            if (!cat || !cat.active) {
                throw new BadRequestException('Categoria customizada não encontrada ou inativa');
            }
            // Se vier custom, força o enum para OUTRO (a UI cuida do label custom)
            if (!cat.isDefault) {
                data.categoria = 'OUTRO' as any;
            }
        }

        const { validade, ...rest } = data;

        const created = await this.prisma.stockItem.create({
            data: {
                ...rest,
                quantidadeAtual: 0, // força 0 mesmo se vier algo
                ...(validade ? { validade: new Date(validade) } : {}),
            },
        });

        await this.auditLog.log({
            userId: actor?.id,
            action: 'STOCK_ITEM_CREATE',
            tableName: 'stock_items',
            recordId: created.id,
            newData: this.snapshotItem(created),
        });

        return created;
    }

    /**
     * Cria o item + uma Solicitação de Compra PENDENTE em uma única transação.
     * Garante a "regra de ciclo financeiro coerente": se a PR falhar (validação,
     * permissão, regra de negócio) o item NÃO é criado. Isso evita o estado
     * "item órfão sem origem financeira" que acontecia quando o frontend
     * encadeava 2 chamadas separadas.
     */
    async createItemWithPurchaseRequest(
        dto: CreateItemWithPurchaseRequestDto,
        actor: { id: string; role: UserRole },
    ) {
        if (!ROLES_AUTORIZADAS_MOVIMENTACAO.includes(actor.role)) {
            throw new ForbiddenException('Você não tem permissão para solicitar compras');
        }

        const itemData = dto.item;
        const prData = dto.purchaseRequest;

        // Pré-validações (mesmas regras do createItem isolado — falham cedo, antes da transação)
        if (itemData.codigoInterno) {
            const existing = await this.prisma.stockItem.findUnique({
                where: { codigoInterno: itemData.codigoInterno },
            });
            if (existing) {
                if (existing.active) {
                    throw new ConflictException({
                        statusCode: 409,
                        code: 'ACTIVE_ITEM_WITH_SAME_CODE',
                        message: 'Já existe um item ATIVO com este código interno.',
                        existingItemId: existing.id,
                        existingItemNome: existing.nome,
                    });
                }
                throw new ConflictException({
                    statusCode: 409,
                    code: 'INACTIVE_ITEM_WITH_SAME_CODE',
                    message:
                        `Existe um item DESATIVADO com o código "${itemData.codigoInterno}" (nome anterior: "${existing.nome}"). ` +
                        `Você pode REATIVAR esse item ou escolher outro código.`,
                    existingItemId: existing.id,
                    existingItemNome: existing.nome,
                    canReactivate: true,
                });
            }
        }

        if (itemData.quantidadeAtual !== undefined && Number(itemData.quantidadeAtual) !== 0) {
            throw new BadRequestException(
                'Saldo inicial deve ser zero. A quantidade entra via Solicitação de Compra (que vai gerar a conta a pagar e dar entrada rastreada).',
            );
        }

        if (itemData.customCategoryId) {
            const cat = await this.prisma.stockCategory.findUnique({
                where: { id: itemData.customCategoryId },
            });
            if (!cat || !cat.active) {
                throw new BadRequestException('Categoria customizada não encontrada ou inativa');
            }
            if (!cat.isDefault) {
                itemData.categoria = 'OUTRO' as any;
            }
        }

        const { validade, ...itemRest } = itemData;

        const quantidade = new Prisma.Decimal(prData.quantidade);
        const precoUnitario = new Prisma.Decimal(prData.precoUnitario);
        const valorTotal = quantidade.mul(precoUnitario).toDecimalPlaces(2);

        // Tudo dentro do mesmo $transaction: ou os 2 nascem, ou nenhum.
        const result = await this.prisma.$transaction(async (tx) => {
            const createdItem = await tx.stockItem.create({
                data: {
                    ...itemRest,
                    quantidadeAtual: 0,
                    ...(validade ? { validade: new Date(validade) } : {}),
                },
            });

            const createdPr = await tx.stockPurchaseRequest.create({
                data: {
                    stockItemId: createdItem.id,
                    quantidade,
                    precoUnitario,
                    valorTotal,
                    fornecedor: prData.fornecedor ?? null,
                    urgente: prData.urgente ?? false,
                    justificativa: prData.justificativa,
                    comprovanteUrl: prData.comprovanteUrl ?? null,
                    requestedBy: actor.id,
                },
                include: {
                    stockItem: { select: { id: true, nome: true, unidade: true } },
                    requester: { select: { id: true, name: true, role: true } },
                },
            });

            return { createdItem, createdPr };
        });

        // Auditoria fora da transação (não bloqueia o cadastro se o audit falhar)
        await this.auditLog.log({
            userId: actor.id,
            action: 'STOCK_ITEM_CREATE',
            tableName: 'stock_items',
            recordId: result.createdItem.id,
            newData: this.snapshotItem(result.createdItem),
        });
        await this.auditLog.log({
            userId: actor.id,
            action: 'STOCK_PURCHASE_REQUEST_CREATE',
            tableName: 'stock_purchase_requests',
            recordId: result.createdPr.id,
            newData: {
                id: result.createdPr.id,
                stockItemId: result.createdPr.stockItemId,
                stockItemNome: result.createdPr.stockItem?.nome,
                unidade: result.createdPr.stockItem?.unidade,
                quantidade: result.createdPr.quantidade?.toString?.() ?? result.createdPr.quantidade,
                precoUnitario: result.createdPr.precoUnitario?.toString?.() ?? result.createdPr.precoUnitario,
                valorTotal: result.createdPr.valorTotal?.toString?.() ?? result.createdPr.valorTotal,
                fornecedor: result.createdPr.fornecedor,
                urgente: result.createdPr.urgente,
                justificativa: result.createdPr.justificativa,
                status: result.createdPr.status,
                requestedBy: result.createdPr.requestedBy,
                requesterName: result.createdPr.requester?.name ?? null,
                requesterRole: result.createdPr.requester?.role ?? null,
                originatedFromItemCreation: true,
            },
        });

        return { item: result.createdItem, purchaseRequest: result.createdPr };
    }

    async updateItem(id: string, data: UpdateStockItemDto, actor?: { id: string; role: UserRole }) {
        const current = await this.findOneItem(id);

        // Conflito de código interno se alterado
        if (data.codigoInterno && data.codigoInterno !== current.codigoInterno) {
            const existing = await this.prisma.stockItem.findFirst({
                where: { codigoInterno: data.codigoInterno, NOT: { id } },
            });
            if (existing) {
                throw new ConflictException('Já existe um item com este código interno');
            }
        }

        // IMPORTANTE: quantidadeAtual NÃO pode ser editada diretamente aqui.
        // Toda variação de saldo deve passar por createMovement (AJUSTE) para ter auditoria.
        if (data.quantidadeAtual !== undefined && Number(data.quantidadeAtual) !== Number(current.quantidadeAtual)) {
            throw new BadRequestException(
                'A quantidade atual não pode ser alterada diretamente. Use a movimentação de tipo AJUSTE para garantir auditoria.',
            );
        }

        const { validade, quantidadeAtual: _ignored, ...rest } = data;

        const updated = await this.prisma.stockItem.update({
            where: { id },
            data: {
                ...rest,
                ...(validade !== undefined ? { validade: validade ? new Date(validade) : null } : {}),
            },
        });

        await this.auditLog.log({
            userId: actor?.id,
            action: 'STOCK_ITEM_UPDATE',
            tableName: 'stock_items',
            recordId: id,
            oldData: this.snapshotItem(current),
            newData: this.snapshotItem(updated),
        });

        return updated;
    }

    /** Soft delete — só se não houver saldo em carretas e não houver solicitação pendente. */
    async deleteItem(id: string, actor?: { id: string; role: UserRole }) {
        const item = await this.findOneItem(id);

        const saldoEmCarretas = item.truckStocks.reduce(
            (acc, ts) => acc + Number(ts.quantidadeAtual),
            0,
        );
        if (saldoEmCarretas > 0) {
            throw new ConflictException(
                'Não é possível desativar: ainda existe saldo deste item em carretas. Faça devoluções primeiro.',
            );
        }

        const pendentes = await this.prisma.stockPurchaseRequest.count({
            where: { stockItemId: id, status: 'PENDENTE', active: true },
        });
        if (pendentes > 0) {
            throw new ConflictException(
                'Existem solicitações de compra PENDENTES para este item. Analise-as antes de desativar.',
            );
        }

        const deactivated = await this.prisma.stockItem.update({
            where: { id },
            data: { active: false },
        });

        await this.auditLog.log({
            userId: actor?.id,
            action: 'STOCK_ITEM_DEACTIVATE',
            tableName: 'stock_items',
            recordId: id,
            oldData: this.snapshotItem(item),
            newData: this.snapshotItem(deactivated),
        });

        return deactivated;
    }

    /**
     * REATIVA um item soft-deletado, opcionalmente atualizando seus dados cadastrais
     * com os valores enviados (nome, categoria, preço etc.). Saldo e quantidadeEmTransito
     * NÃO são alterados aqui (zera-os explicitamente se quiser do zero).
     *
     * Usado quando o admin tenta criar um item com `codigoInterno` que existe como inativo:
     * o frontend pode oferecer "Reativar" em vez de bloquear a operação, mantendo
     * o histórico de movimentações antigas ligado ao mesmo `id`.
     */
    async reactivateItem(
        id: string,
        data: Partial<CreateStockItemDto> | undefined,
        actor?: { id: string; role: UserRole },
    ) {
        const current = await this.prisma.stockItem.findUnique({
            where: { id },
            include: { truckStocks: true },
        });
        if (!current) throw new NotFoundException('Item não encontrado');
        if (current.active) {
            throw new ConflictException('Item já está ativo — não há nada para reativar');
        }

        // Se vier `codigoInterno` diferente, garante que o NOVO código também não conflita
        if (data?.codigoInterno && data.codigoInterno !== current.codigoInterno) {
            const conflict = await this.prisma.stockItem.findFirst({
                where: { codigoInterno: data.codigoInterno, NOT: { id } },
            });
            if (conflict) {
                throw new ConflictException('O novo código interno já está em uso por outro item');
            }
        }

        // Saldo nunca volta ao reativar — se quiser saldo, gere PR depois (regra REQ 2026-05)
        const { validade, quantidadeAtual: _saldoIgnorado, ...rest } = data ?? {};

        const reactivated = await this.prisma.stockItem.update({
            where: { id },
            data: {
                ...rest,
                active: true,
                quantidadeAtual: 0, // sempre nasce zerado ao reativar
                quantidadeEmTransito: 0,
                ...(validade !== undefined ? { validade: validade ? new Date(validade) : null } : {}),
            },
        });

        await this.auditLog.log({
            userId: actor?.id,
            action: 'STOCK_ITEM_REACTIVATE',
            tableName: 'stock_items',
            recordId: id,
            oldData: this.snapshotItem(current),
            newData: this.snapshotItem(reactivated),
        });

        return reactivated;
    }

    // ═══════════════════════════════════════════════════════════════════
    //   DASHBOARD AGRUPADO — por categoria e por carreta
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Agregado por categoria: une os 8 enums default + as categorias customizadas
     * num único array. Cada elemento traz contagens e valor estimado.
     * Itens com `customCategoryId` preenchido aparecem na linha da categoria custom,
     * NÃO na linha do enum (mesmo que `categoria` esteja como OUTRO).
     */
    async dashboardByCategory() {
        const items = await this.prisma.stockItem.findMany({
            where: { active: true },
            select: {
                categoria: true,
                customCategoryId: true,
                customCategory: { select: { id: true, nome: true, icon: true, color: true, isDefault: true } },
                quantidadeAtual: true,
                quantidadeEmTransito: true,
                quantidadeMinima: true,
                precoUnitario: true,
            },
        });

        // Buckets: chave = `enum:VAL` ou `custom:UUID`
        type Bucket = {
            key: string;
            tipo: 'enum' | 'custom';
            categoriaEnum: StockItemCategory | null;
            customCategoryId: string | null;
            nome: string;
            icon: string;
            color: string;
            totalItens: number;
            saldoCentral: number;
            saldoEmTransito: number;
            qtdCritica: number;
            qtdBaixa: number;
            valorEstimado: number;
        };
        const buckets = new Map<string, Bucket>();

        // Defaults: garante linha para todas as 8 categorias (mesmo sem item)
        const defaultCats = await this.prisma.stockCategory.findMany({
            where: { isDefault: true, active: true },
            orderBy: { nome: 'asc' },
        });
        for (const dc of defaultCats) {
            const key = `enum:${dc.defaultEnum}`;
            buckets.set(key, {
                key,
                tipo: 'enum',
                categoriaEnum: dc.defaultEnum,
                customCategoryId: null,
                nome: dc.nome,
                icon: dc.icon,
                color: dc.color,
                totalItens: 0, saldoCentral: 0, saldoEmTransito: 0,
                qtdCritica: 0, qtdBaixa: 0, valorEstimado: 0,
            });
        }

        for (const it of items) {
            const isCustom = !!it.customCategoryId && it.customCategory && !it.customCategory.isDefault;
            const key = isCustom
                ? `custom:${it.customCategoryId}`
                : `enum:${it.categoria}`;

            if (!buckets.has(key)) {
                if (isCustom) {
                    buckets.set(key, {
                        key,
                        tipo: 'custom',
                        categoriaEnum: null,
                        customCategoryId: it.customCategoryId!,
                        nome: it.customCategory!.nome,
                        icon: it.customCategory!.icon,
                        color: it.customCategory!.color,
                        totalItens: 0, saldoCentral: 0, saldoEmTransito: 0,
                        qtdCritica: 0, qtdBaixa: 0, valorEstimado: 0,
                    });
                } else {
                    // Fallback raro (item com enum inexistente em defaultCats)
                    buckets.set(key, {
                        key,
                        tipo: 'enum',
                        categoriaEnum: it.categoria,
                        customCategoryId: null,
                        nome: it.categoria,
                        icon: '❔',
                        color: '#6B7280',
                        totalItens: 0, saldoCentral: 0, saldoEmTransito: 0,
                        qtdCritica: 0, qtdBaixa: 0, valorEstimado: 0,
                    });
                }
            }

            const b = buckets.get(key)!;
            b.totalItens += 1;
            const qtd = Number(it.quantidadeAtual);
            const qmin = Number(it.quantidadeMinima);
            const trans = Number(it.quantidadeEmTransito);
            const preco = it.precoUnitario != null ? Number(it.precoUnitario) : 0;
            b.saldoCentral += qtd;
            b.saldoEmTransito += trans;
            b.valorEstimado += qtd * preco;
            if (qmin > 0) {
                if (qtd <= qmin * 0.5) b.qtdCritica += 1;
                else if (qtd <= qmin) b.qtdBaixa += 1;
            }
        }

        const result = Array.from(buckets.values()).map(b => ({
            ...b,
            saldoCentral: Number(b.saldoCentral.toFixed(3)),
            saldoEmTransito: Number(b.saldoEmTransito.toFixed(3)),
            valorEstimado: Number(b.valorEstimado.toFixed(2)),
        }));

        // Ordena: defaults primeiro (por nome), depois customs (por nome)
        result.sort((a, b) => {
            if (a.tipo !== b.tipo) return a.tipo === 'enum' ? -1 : 1;
            return a.nome.localeCompare(b.nome);
        });

        return result;
    }

    /**
     * Agregado por carreta: para cada carreta ativa, retorna quantos itens distintos
     * estão estocados, quantidade total e valor estimado (usa precoUnitario do StockItem central).
     */
    async dashboardByTruck() {
        const stocks = await this.prisma.truckStockItem.findMany({
            where: { quantidadeAtual: { gt: 0 } },
            include: {
                truck: {
                    select: {
                        id: true, identifier: true, licensePlate: true, status: true,
                    },
                },
                stockItem: {
                    select: {
                        id: true, nome: true, precoUnitario: true, unidade: true,
                        active: true, categoria: true,
                        customCategory: { select: { id: true, nome: true, icon: true, color: true } },
                    },
                },
            },
        });

        type TruckBucket = {
            truckId: string;
            identifier: string;
            licensePlate: string;
            status: string;
            totalItensDistintos: number;
            quantidadeTotal: number;
            valorEstimado: number;
            itens: Array<{
                id: string;
                nome: string;
                unidade: string;
                quantidade: number;
                valor: number;
                categoria: string;
                icon: string;
            }>;
        };
        const buckets = new Map<string, TruckBucket>();

        for (const s of stocks) {
            if (!s.truck) continue;
            if (!s.stockItem?.active) continue;

            if (!buckets.has(s.truckId)) {
                buckets.set(s.truckId, {
                    truckId: s.truckId,
                    identifier: s.truck.identifier,
                    licensePlate: s.truck.licensePlate,
                    status: s.truck.status,
                    totalItensDistintos: 0,
                    quantidadeTotal: 0,
                    valorEstimado: 0,
                    itens: [],
                });
            }
            const b = buckets.get(s.truckId)!;
            const qtd = Number(s.quantidadeAtual);
            const preco = s.stockItem.precoUnitario != null ? Number(s.stockItem.precoUnitario) : 0;
            b.totalItensDistintos += 1;
            b.quantidadeTotal += qtd;
            b.valorEstimado += qtd * preco;
            b.itens.push({
                id: s.stockItem.id,
                nome: s.stockItem.nome,
                unidade: s.stockItem.unidade,
                quantidade: qtd,
                valor: Number((qtd * preco).toFixed(2)),
                categoria: s.stockItem.customCategory?.nome ?? s.stockItem.categoria,
                icon: s.stockItem.customCategory?.icon ?? '📦',
            });
        }

        // Buscar TODAS as carretas em operação (exceto INACTIVE) para mostrar linhas com 0 itens também
        const allTrucks = await this.prisma.truck.findMany({
            where: { status: { not: 'INACTIVE' } },
            select: { id: true, identifier: true, licensePlate: true, status: true },
        });
        for (const t of allTrucks) {
            if (!buckets.has(t.id)) {
                buckets.set(t.id, {
                    truckId: t.id,
                    identifier: t.identifier,
                    licensePlate: t.licensePlate,
                    status: t.status,
                    totalItensDistintos: 0,
                    quantidadeTotal: 0,
                    valorEstimado: 0,
                    itens: [],
                });
            }
        }

        const result = Array.from(buckets.values())
            .map(b => ({
                ...b,
                quantidadeTotal: Number(b.quantidadeTotal.toFixed(3)),
                valorEstimado: Number(b.valorEstimado.toFixed(2)),
                itens: b.itens.sort((a, b) => b.quantidade - a.quantidade).slice(0, 12),
            }))
            .sort((a, b) => b.totalItensDistintos - a.totalItensDistintos);

        return result;
    }

    // ═══════════════════════════════════════════════════════════════════
    //   CATEGORIAS CUSTOMIZADAS — admin pode criar além dos 8 enums default
    // ═══════════════════════════════════════════════════════════════════

    async listCategories(opts?: { includeInactive?: boolean }) {
        return this.prisma.stockCategory.findMany({
            where: opts?.includeInactive ? {} : { active: true },
            orderBy: [{ isDefault: 'desc' }, { nome: 'asc' }],
            include: {
                _count: { select: { stockItems: { where: { active: true } } } },
            },
        });
    }

    async createCategory(
        data: { nome: string; icon: string; color: string; description?: string },
        actor: { id: string; role: UserRole },
    ) {
        if (!['ADMIN', 'IT_ADMIN'].includes(actor.role)) {
            throw new ForbiddenException('Apenas ADMIN pode criar categorias customizadas');
        }
        const slug = data.nome
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        if (!slug) throw new BadRequestException('Nome inválido para gerar slug');

        const dup = await this.prisma.stockCategory.findFirst({
            where: { OR: [{ slug }, { nome: data.nome }] },
        });
        if (dup) throw new ConflictException('Já existe uma categoria com este nome');

        const created = await this.prisma.stockCategory.create({
            data: {
                nome: data.nome,
                slug,
                icon: data.icon,
                color: data.color,
                description: data.description ?? null,
                isDefault: false,
                createdBy: actor.id,
            },
        });

        await this.auditLog.log({
            userId: actor.id,
            action: 'STOCK_CATEGORY_CREATE',
            tableName: 'stock_categories',
            recordId: created.id,
            newData: { nome: created.nome, slug: created.slug, icon: created.icon, color: created.color },
        });

        return created;
    }

    async updateCategory(
        id: string,
        data: { nome?: string; icon?: string; color?: string; description?: string; active?: boolean },
        actor: { id: string; role: UserRole },
    ) {
        if (!['ADMIN', 'IT_ADMIN'].includes(actor.role)) {
            throw new ForbiddenException('Apenas ADMIN pode editar categorias');
        }
        const current = await this.prisma.stockCategory.findUnique({ where: { id } });
        if (!current) throw new NotFoundException('Categoria não encontrada');

        // Defaults não podem ser renomeadas/desativadas (preserva enum + integridade)
        if (current.isDefault && (data.nome !== undefined || data.active === false)) {
            throw new BadRequestException(
                'Categorias padrão não podem ser renomeadas ou desativadas — apenas customizadas',
            );
        }

        // Se vai desativar uma custom: bloquear se houver items ativos usando
        if (data.active === false && !current.isDefault) {
            const inUse = await this.prisma.stockItem.count({
                where: { customCategoryId: id, active: true },
            });
            if (inUse > 0) {
                throw new ConflictException(
                    `Não é possível desativar: ${inUse} item(s) de estoque ativos ainda usam esta categoria. ` +
                    `Mude a categoria deles primeiro.`,
                );
            }
        }

        const updated = await this.prisma.stockCategory.update({
            where: { id },
            data: {
                ...(data.nome !== undefined && { nome: data.nome }),
                ...(data.icon !== undefined && { icon: data.icon }),
                ...(data.color !== undefined && { color: data.color }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.active !== undefined && { active: data.active }),
            },
        });

        await this.auditLog.log({
            userId: actor.id,
            action: 'STOCK_CATEGORY_UPDATE',
            tableName: 'stock_categories',
            recordId: id,
            oldData: { nome: current.nome, icon: current.icon, color: current.color, active: current.active },
            newData: { nome: updated.nome, icon: updated.icon, color: updated.color, active: updated.active },
        });

        return updated;
    }

    // ═══════════════════════════════════════════════════════════════════
    //   SALDO POR CARRETA
    // ═══════════════════════════════════════════════════════════════════

    async findStockByTruck(truckId: string) {
        const truck = await this.prisma.truck.findUnique({
            where: { id: truckId },
            select: { id: true, identifier: true, licensePlate: true, status: true },
        });
        if (!truck) throw new NotFoundException('Carreta não encontrada');

        const stocks = await this.prisma.truckStockItem.findMany({
            where: { truckId },
            include: {
                stockItem: {
                    select: {
                        id: true,
                        nome: true,
                        codigoInterno: true,
                        categoria: true,
                        customCategory: { select: { id: true, nome: true, icon: true, color: true } },
                        unidade: true,
                        quantidadeMinima: true,
                        precoUnitario: true,
                        validade: true,
                        fotoUrl: true,
                    },
                },
            },
            orderBy: { stockItem: { nome: 'asc' } },
        });

        return { truck, stocks };
    }

    // ═══════════════════════════════════════════════════════════════════
    //   MOVIMENTAÇÕES — toda escrita de saldo passa POR AQUI dentro de $transaction
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Cria uma movimentação atômica.
     * Faz, em uma única transação Prisma:
     *  1. Valida regras por tipo
     *  2. Cria o registro de StockMovement (auditoria)
     *  3. Ajusta StockItem.quantidadeAtual (central)
     *  4. Ajusta/cria TruckStockItem (saldo da carreta)
     */
    async createMovement(
        dto: CreateMovementDto,
        actor: { id: string; role: UserRole },
    ) {
        // ── Autorização por role ─────────────────────────────────────
        if (!ROLES_AUTORIZADAS_MOVIMENTACAO.includes(actor.role)) {
            throw new ForbiddenException('Você não tem permissão para registrar movimentações');
        }

        // REPOSICAO e ENCOMENDA são bloqueadas: só podem ser criadas pelo ciclo de PurchaseRequest
        if (dto.type === 'REPOSICAO' || dto.type === 'ENCOMENDA') {
            throw new BadRequestException(
                `Movimentações de ${dto.type} só são geradas pelo ciclo de Solicitação de Compra (aprovação → ENCOMENDA → pagamento/recebimento → REPOSICAO)`,
            );
        }

        // Restrições por role × tipo
        const tipoVsRole: Record<StockMovementType, UserRole[]> = {
            ENTRADA:       ['ADMIN', 'IT_ADMIN', 'COORDINATOR'],
            SAIDA:         ['ADMIN', 'IT_ADMIN', 'COORDINATOR', 'DRIVER', 'TEACHER'],
            TRANSFERENCIA: ['ADMIN', 'IT_ADMIN', 'COORDINATOR'],
            DEVOLUCAO:     ['ADMIN', 'IT_ADMIN', 'COORDINATOR', 'DRIVER'],
            AJUSTE:        ['ADMIN', 'IT_ADMIN', 'COORDINATOR'],
            PERDA:         ['ADMIN', 'IT_ADMIN', 'COORDINATOR'],
            REPOSICAO:     [], // bloqueado acima — só via recebimento de PR
            ENCOMENDA:     [], // bloqueado — só via aprovação de PR
        };
        if (!tipoVsRole[dto.type].includes(actor.role)) {
            throw new ForbiddenException(
                `Seu perfil (${actor.role}) não pode registrar movimentações do tipo ${dto.type}`,
            );
        }

        const quantidade = new Prisma.Decimal(dto.quantidade);
        if (quantidade.lte(0)) {
            throw new BadRequestException('Quantidade deve ser maior que zero');
        }

        // ── Validações estruturais por tipo ──────────────────────────
        this.validateMovementShape(dto);

        // ── Verifica existência do item ──────────────────────────────
        const item = await this.prisma.stockItem.findUnique({
            where: { id: dto.stockItemId },
        });
        if (!item || !item.active) {
            throw new NotFoundException('Item de estoque não encontrado ou inativo');
        }

        // ── Verifica carretas envolvidas ─────────────────────────────
        if (dto.fromTruckId) {
            const t = await this.prisma.truck.findUnique({ where: { id: dto.fromTruckId } });
            if (!t) throw new NotFoundException('Carreta de origem não encontrada');
        }
        if (dto.toTruckId) {
            const t = await this.prisma.truck.findUnique({ where: { id: dto.toTruckId } });
            if (!t) throw new NotFoundException('Carreta de destino não encontrada');
        }
        if (dto.acaoId) {
            const a = await this.prisma.acao.findUnique({ where: { id: dto.acaoId } });
            if (!a) throw new NotFoundException('Ação não encontrada');
        }

        // ── TRANSAÇÃO ATÔMICA ────────────────────────────────────────
        // Para AJUSTE em modo SET precisamos ajustar antes de gravar a movimentação,
        // gravando o |delta| e enriquecendo a observação com "antes → depois".
        let movQuantidade = quantidade;
        let movObservacao = dto.observacao ?? null;
        const ajusteSnapshot: { antes?: number; depois?: number; modo?: 'SET' | 'DELTA' } = {};

        return this.prisma.$transaction(async (tx) => {
            // 1) Aplicar variações de saldo conforme o tipo
            switch (dto.type) {
                case 'ENTRADA':
                    await this.debitCentral(tx, dto.stockItemId, quantidade);
                    await this.creditTruck(tx, dto.toTruckId!, dto.stockItemId, quantidade);
                    break;

                case 'SAIDA':
                    await this.debitTruck(tx, dto.fromTruckId!, dto.stockItemId, quantidade);
                    // SAIDA não credita ninguém — é consumo.
                    // Se houver acaoId e reserva planejada para (acao, item), atualiza quantidadeConsumida.
                    if (dto.acaoId) {
                        const reserva = await tx.acaoStockReservation.findUnique({
                            where: {
                                acaoId_stockItemId: {
                                    acaoId: dto.acaoId,
                                    stockItemId: dto.stockItemId,
                                },
                            },
                        });
                        if (reserva) {
                            await tx.acaoStockReservation.update({
                                where: { id: reserva.id },
                                data: {
                                    quantidadeConsumida: { increment: quantidade },
                                },
                            });
                        }
                    }
                    break;

                case 'TRANSFERENCIA':
                    await this.debitTruck(tx, dto.fromTruckId!, dto.stockItemId, quantidade);
                    await this.creditTruck(tx, dto.toTruckId!, dto.stockItemId, quantidade);
                    break;

                case 'DEVOLUCAO':
                    await this.debitTruck(tx, dto.fromTruckId!, dto.stockItemId, quantidade);
                    await this.creditCentral(tx, dto.stockItemId, quantidade);
                    break;

                case 'AJUSTE': {
                    // Modo padrão: SET (quantidade vira o NOVO saldo — semântica de contagem física).
                    // Modo DELTA: decrementa quantidade do saldo (comportamento histórico).
                    const modo: 'SET' | 'DELTA' = dto.ajusteMode ?? 'SET';
                    ajusteSnapshot.modo = modo;

                    if (modo === 'SET') {
                        // Lê saldo atual no escopo correto (carreta se fromTruckId; senão central)
                        const novoSaldoAbs = quantidade; // valor absoluto solicitado pelo usuário
                        if (dto.fromTruckId) {
                            const ts = await tx.truckStockItem.findUnique({
                                where: { truckId_stockItemId: { truckId: dto.fromTruckId, stockItemId: dto.stockItemId } },
                            });
                            const saldoAntes = ts ? new Prisma.Decimal(ts.quantidadeAtual) : new Prisma.Decimal(0);
                            ajusteSnapshot.antes = Number(saldoAntes);
                            ajusteSnapshot.depois = Number(novoSaldoAbs);

                            if (ts) {
                                await tx.truckStockItem.update({
                                    where: { id: ts.id },
                                    data: { quantidadeAtual: novoSaldoAbs },
                                });
                            } else {
                                await tx.truckStockItem.create({
                                    data: {
                                        truckId: dto.fromTruckId,
                                        stockItemId: dto.stockItemId,
                                        quantidadeAtual: novoSaldoAbs,
                                    },
                                });
                            }
                            // |delta| que será registrado em StockMovement.quantidade
                            movQuantidade = new Prisma.Decimal(novoSaldoAbs).sub(saldoAntes).abs();
                        } else {
                            const itemAtual = await tx.stockItem.findUnique({
                                where: { id: dto.stockItemId },
                                select: { quantidadeAtual: true },
                            });
                            const saldoAntes = itemAtual ? new Prisma.Decimal(itemAtual.quantidadeAtual) : new Prisma.Decimal(0);
                            ajusteSnapshot.antes = Number(saldoAntes);
                            ajusteSnapshot.depois = Number(novoSaldoAbs);

                            await tx.stockItem.update({
                                where: { id: dto.stockItemId },
                                data: { quantidadeAtual: novoSaldoAbs },
                            });
                            movQuantidade = new Prisma.Decimal(novoSaldoAbs).sub(saldoAntes).abs();
                        }

                        // Enriquece observação com snapshot legível
                        const escopo = dto.fromTruckId ? 'carreta' : 'central';
                        const userObs = (dto.observacao ?? '').trim();
                        movObservacao =
                            `AJUSTE (${escopo}) ${ajusteSnapshot.antes} → ${ajusteSnapshot.depois}` +
                            (userObs ? ` | ${userObs}` : '');
                    } else {
                        // DELTA (legado): decrementa
                        if (dto.fromTruckId) {
                            await this.debitTruck(tx, dto.fromTruckId, dto.stockItemId, quantidade);
                        } else {
                            await this.debitCentral(tx, dto.stockItemId, quantidade);
                        }
                        const userObs = (dto.observacao ?? '').trim();
                        movObservacao = `AJUSTE (delta -${Number(quantidade)})` + (userObs ? ` | ${userObs}` : '');
                    }
                    break;
                }

                case 'PERDA': {
                    if (dto.fromTruckId) {
                        await this.debitTruck(tx, dto.fromTruckId, dto.stockItemId, quantidade);
                    } else {
                        await this.debitCentral(tx, dto.stockItemId, quantidade);
                    }
                    break;
                }
            }

            // 2) Registrar a movimentação (auditoria imutável)
            const mov = await tx.stockMovement.create({
                data: {
                    type: dto.type,
                    stockItemId: dto.stockItemId,
                    quantidade: movQuantidade,
                    fromTruckId: dto.fromTruckId ?? null,
                    toTruckId: dto.toTruckId ?? null,
                    acaoId: dto.acaoId ?? null,
                    observacao: movObservacao,
                    registeredBy: actor.id,
                },
                include: {
                    stockItem: { select: { id: true, nome: true, unidade: true, quantidadeAtual: true, quantidadeMinima: true } },
                    fromTruck: { select: { id: true, identifier: true } },
                    toTruck: { select: { id: true, identifier: true } },
                    acao: { select: { id: true, nome: true } },
                    registrar: { select: { id: true, name: true, role: true } },
                },
            });

            return mov;
        }).then(async (mov) => {
            // ── Audit trail cross-cutting (fora da $transaction, best-effort) ──
            const auditPayload: Record<string, any> = {
                id: mov.id,
                type: mov.type,
                stockItemId: mov.stockItemId,
                stockItemNome: mov.stockItem?.nome,
                quantidade: mov.quantidade?.toString?.() ?? mov.quantidade,
                unidade: mov.stockItem?.unidade,
                fromTruckId: mov.fromTruckId,
                fromTruckIdentifier: mov.fromTruck?.identifier ?? null,
                toTruckId: mov.toTruckId,
                toTruckIdentifier: mov.toTruck?.identifier ?? null,
                acaoId: mov.acaoId,
                acaoNome: mov.acao?.nome ?? null,
                observacao: mov.observacao,
                registeredBy: mov.registeredBy,
                registeredByName: mov.registrar?.name ?? null,
                registeredByRole: mov.registrar?.role ?? null,
            };

            const auditOldData: Record<string, any> | undefined =
                dto.type === 'AJUSTE' && ajusteSnapshot.modo
                    ? { saldoAnterior: ajusteSnapshot.antes ?? null, ajusteMode: ajusteSnapshot.modo }
                    : undefined;

            if (dto.type === 'AJUSTE' && ajusteSnapshot.modo) {
                auditPayload.ajusteMode = ajusteSnapshot.modo;
                auditPayload.saldoNovo = ajusteSnapshot.depois ?? null;
            }

            await this.auditLog.log({
                userId: actor.id,
                action: `STOCK_MOVEMENT_${dto.type}`,
                tableName: 'stock_movements',
                recordId: mov.id,
                oldData: auditOldData,
                newData: auditPayload,
            });

            // Disparo de E-mail: Estoque Crítico
            // Verifica se afetou o estoque central (fromTruckId nulo em perda/ajuste)
            if (!mov.fromTruckId && mov.stockItem && mov.stockItem.quantidadeAtual !== null && mov.stockItem.quantidadeMinima !== null) {
                const current = Number(mov.stockItem.quantidadeAtual);
                const min = Number(mov.stockItem.quantidadeMinima);
                // Dispara se ficou menor ou igual ao mínimo E se o tipo é uma saída real da central
                if (current <= min && (mov.type === 'AJUSTE' || mov.type === 'PERDA')) {
                    const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN', active: true }, select: { email: true, name: true } });
                    for (const admin of admins) {
                        if (admin.email) {
                            this.mailService.sendLowStockAlert(admin.email, admin.name, mov.stockItem.nome, current, min).catch(console.error);
                        }
                    }
                }
            }

            return mov;
        });
    }

    /** Validação cross-field por tipo de movimentação. */
    private validateMovementShape(dto: CreateMovementDto): void {
        switch (dto.type) {
            case 'ENTRADA':
                if (!dto.toTruckId) {
                    throw new BadRequestException('ENTRADA requer toTruckId (carreta de destino)');
                }
                break;

            case 'SAIDA':
                if (!dto.fromTruckId) {
                    throw new BadRequestException('SAIDA requer fromTruckId (carreta de origem)');
                }
                // REQ-FECHA-CICLO: SAIDA agora SEMPRE precisa de acaoId — consumo só faz sentido
                // se vinculado a uma ação. Garante rastreabilidade 100% (quem, quando, pra qual ação).
                if (!dto.acaoId) {
                    throw new BadRequestException(
                        'SAIDA requer acaoId — todo consumo precisa estar vinculado a uma ação. ' +
                        'Para registrar uma saída sem ação (situação rara), use AJUSTE ou PERDA.',
                    );
                }
                break;

            case 'TRANSFERENCIA':
                if (!dto.fromTruckId || !dto.toTruckId) {
                    throw new BadRequestException('TRANSFERENCIA requer fromTruckId E toTruckId');
                }
                if (dto.fromTruckId === dto.toTruckId) {
                    throw new BadRequestException('TRANSFERENCIA: carreta de origem e destino devem ser diferentes');
                }
                break;

            case 'DEVOLUCAO':
                if (!dto.fromTruckId) {
                    throw new BadRequestException('DEVOLUCAO requer fromTruckId (carreta de origem)');
                }
                break;

            case 'AJUSTE':
            case 'PERDA':
                if (!dto.observacao || dto.observacao.trim().length < 3) {
                    throw new BadRequestException(`${dto.type} requer uma observação descritiva (mín. 3 caracteres)`);
                }
                break;
        }
    }

    // ── Helpers transacionais de saldo (sempre dentro de tx) ────────────

    private async debitCentral(
        tx: Prisma.TransactionClient,
        stockItemId: string,
        quantidade: Prisma.Decimal,
    ) {
        const item = await tx.stockItem.findUnique({
            where: { id: stockItemId },
            select: { quantidadeAtual: true },
        });
        if (!item) throw new NotFoundException('Item não encontrado durante transação');
        if (new Prisma.Decimal(item.quantidadeAtual).lt(quantidade)) {
            throw new ConflictException(
                `Saldo insuficiente no estoque central (disponível: ${item.quantidadeAtual}, necessário: ${quantidade})`,
            );
        }
        await tx.stockItem.update({
            where: { id: stockItemId },
            data: { quantidadeAtual: { decrement: quantidade } },
        });
    }

    private async creditCentral(
        tx: Prisma.TransactionClient,
        stockItemId: string,
        quantidade: Prisma.Decimal,
    ) {
        await tx.stockItem.update({
            where: { id: stockItemId },
            data: { quantidadeAtual: { increment: quantidade } },
        });
    }

    private async debitTruck(
        tx: Prisma.TransactionClient,
        truckId: string,
        stockItemId: string,
        quantidade: Prisma.Decimal,
    ) {
        const ts = await tx.truckStockItem.findUnique({
            where: { truckId_stockItemId: { truckId, stockItemId } },
        });
        if (!ts) {
            throw new ConflictException('Esta carreta não possui saldo deste item');
        }
        if (new Prisma.Decimal(ts.quantidadeAtual).lt(quantidade)) {
            throw new ConflictException(
                `Saldo insuficiente na carreta (disponível: ${ts.quantidadeAtual}, necessário: ${quantidade})`,
            );
        }
        await tx.truckStockItem.update({
            where: { id: ts.id },
            data: { quantidadeAtual: { decrement: quantidade } },
        });
    }

    private async creditTruck(
        tx: Prisma.TransactionClient,
        truckId: string,
        stockItemId: string,
        quantidade: Prisma.Decimal,
    ) {
        // upsert: cria com saldo inicial se ainda não existir
        await tx.truckStockItem.upsert({
            where: { truckId_stockItemId: { truckId, stockItemId } },
            create: { truckId, stockItemId, quantidadeAtual: quantidade },
            update: { quantidadeAtual: { increment: quantidade } },
        });
    }

    async listMovements(filters?: {
        type?: StockMovementType;
        stockItemId?: string;
        truckId?: string;
        acaoId?: string;
        from?: string;
        to?: string;
        limit?: number;
    }) {
        const where: Prisma.StockMovementWhereInput = {};
        if (filters?.type) where.type = filters.type;
        if (filters?.stockItemId) where.stockItemId = filters.stockItemId;
        if (filters?.acaoId) where.acaoId = filters.acaoId;
        if (filters?.truckId) {
            where.OR = [{ fromTruckId: filters.truckId }, { toTruckId: filters.truckId }];
        }
        if (filters?.from || filters?.to) {
            where.createdAt = {};
            if (filters.from) (where.createdAt as any).gte = new Date(filters.from);
            if (filters.to) (where.createdAt as any).lte = new Date(filters.to);
        }

        return this.prisma.stockMovement.findMany({
            where,
            take: Math.min(filters?.limit ?? 100, 500),
            orderBy: { createdAt: 'desc' },
            include: {
                stockItem: { select: { id: true, nome: true, unidade: true } },
                fromTruck: { select: { id: true, identifier: true } },
                toTruck: { select: { id: true, identifier: true } },
                acao: { select: { id: true, nome: true } },
                registrar: { select: { id: true, name: true, role: true } },
            },
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    //   SOLICITAÇÕES DE COMPRA (workflow de aprovação)
    // ═══════════════════════════════════════════════════════════════════

    async createPurchaseRequest(
        dto: CreatePurchaseRequestDto,
        actor: { id: string; role: UserRole },
    ) {
        if (!ROLES_AUTORIZADAS_MOVIMENTACAO.includes(actor.role)) {
            throw new ForbiddenException('Você não tem permissão para solicitar compras');
        }

        const item = await this.prisma.stockItem.findUnique({
            where: { id: dto.stockItemId },
            select: { id: true, active: true, nome: true },
        });
        if (!item || !item.active) {
            throw new NotFoundException('Item de estoque não encontrado ou inativo');
        }

        const quantidade = new Prisma.Decimal(dto.quantidade);
        const precoUnitario = new Prisma.Decimal(dto.precoUnitario);
        const valorTotal = quantidade.mul(precoUnitario).toDecimalPlaces(2);

        const created = await this.prisma.stockPurchaseRequest.create({
            data: {
                stockItemId: dto.stockItemId,
                quantidade,
                precoUnitario,
                valorTotal,
                fornecedor: dto.fornecedor ?? null,
                urgente: dto.urgente ?? false,
                justificativa: dto.justificativa,
                comprovanteUrl: dto.comprovanteUrl ?? null,
                requestedBy: actor.id,
            },
            include: {
                stockItem: { select: { id: true, nome: true, unidade: true } },
                requester: { select: { id: true, name: true, role: true } },
            },
        });

        await this.auditLog.log({
            userId: actor.id,
            action: 'STOCK_PURCHASE_REQUEST_CREATE',
            tableName: 'stock_purchase_requests',
            recordId: created.id,
            newData: {
                id: created.id,
                stockItemId: created.stockItemId,
                stockItemNome: created.stockItem?.nome,
                unidade: created.stockItem?.unidade,
                quantidade: created.quantidade?.toString?.() ?? created.quantidade,
                precoUnitario: created.precoUnitario?.toString?.() ?? created.precoUnitario,
                valorTotal: created.valorTotal?.toString?.() ?? created.valorTotal,
                fornecedor: created.fornecedor,
                urgente: created.urgente,
                justificativa: created.justificativa,
                status: created.status,
                requestedBy: created.requestedBy,
                requesterName: created.requester?.name ?? null,
                requesterRole: created.requester?.role ?? null,
            },
        });
        // Disparo de e-mail para os Administradores
        const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN', active: true }, select: { email: true, name: true } });
        for (const admin of admins) {
            if (admin.email) {
                this.mailService.sendPurchaseRequestCreated(
                    admin.email,
                    admin.name,
                    created.requester?.name || 'Sistema',
                    item.nome,
                    Number(quantidade)
                ).catch(console.error);
            }
        }

        return created;
    }

    async listPurchaseRequests(
        actor: { id: string; role: UserRole },
        filters?: {
            status?: StockPurchaseRequestStatus;
            stockItemId?: string;
            onlyMine?: boolean;
        },
    ) {
        const where: Prisma.StockPurchaseRequestWhereInput = { active: true };

        if (filters?.status) where.status = filters.status;
        if (filters?.stockItemId) where.stockItemId = filters.stockItemId;

        // Roles não-revisor só veem as próprias por padrão
        const isReviewer = ROLES_REVISOR_COMPRA.includes(actor.role);
        if (!isReviewer || filters?.onlyMine) {
            where.requestedBy = actor.id;
        }

        return this.prisma.stockPurchaseRequest.findMany({
            where,
            orderBy: [{ urgente: 'desc' }, { createdAt: 'desc' }],
            include: {
                stockItem: { select: { id: true, nome: true, unidade: true, fotoUrl: true } },
                requester: { select: { id: true, name: true, role: true } },
                reviewer: { select: { id: true, name: true } },
                contaPagar: { select: { id: true, status: true } },
            },
        });
    }

    async findOnePurchaseRequest(id: string, actor: { id: string; role: UserRole }) {
        const req = await this.prisma.stockPurchaseRequest.findUnique({
            where: { id },
            include: {
                stockItem: true,
                requester: { select: { id: true, name: true, role: true, email: true } },
                reviewer: { select: { id: true, name: true } },
                contaPagar: true,
                movement: true,
            },
        });
        if (!req) throw new NotFoundException('Solicitação não encontrada');

        // Solicitante normal só vê as próprias
        const isReviewer = ROLES_REVISOR_COMPRA.includes(actor.role);
        if (!isReviewer && req.requestedBy !== actor.id) {
            throw new ForbiddenException('Você não tem permissão para visualizar esta solicitação');
        }

        return req;
    }

    /**
     * APROVAR: cria StockMovement(REPOSICAO) + atualiza saldo central + cria ContaPagar.
     * Tudo dentro de um único $transaction.
     */
    async approvePurchaseRequest(
        id: string,
        dto: ApprovePurchaseRequestDto,
        actor: { id: string; role: UserRole },
    ) {
        if (!ROLES_REVISOR_COMPRA.includes(actor.role)) {
            throw new ForbiddenException('Apenas ADMIN pode aprovar solicitações de compra');
        }

        const req = await this.prisma.stockPurchaseRequest.findUnique({
            where: { id },
            include: { stockItem: { select: { id: true, nome: true } } },
        });
        if (!req) throw new NotFoundException('Solicitação não encontrada');
        if (req.status !== 'PENDENTE') {
            throw new ConflictException(`Solicitação já está com status ${req.status}`);
        }

        return this.prisma.$transaction(async (tx) => {
            const finalQty = new Prisma.Decimal(dto.quantidadeAprovada ?? req.quantidade);
            const finalPrice = new Prisma.Decimal(dto.precoUnitarioAprovado ?? req.precoUnitario ?? 0);
            const finalTotal = finalQty.mul(finalPrice).toDecimalPlaces(2);

            // 1) Criar ContaPagar (PENDENTE) — saldo real NÃO sobe ainda.
            const dataVencimento = new Date();
            dataVencimento.setDate(dataVencimento.getDate() + 30); // 30 dias por padrão

            const conta = await tx.contaPagar.create({
                data: {
                    tipo_conta: 'estoque_reposicao',
                    descricao: `Reposição de estoque: ${req.stockItem.nome} — ${finalQty} un (solicitação ${req.id.slice(0, 8)})`,
                    valor: finalTotal,
                    data_vencimento: dataVencimento,
                    status: 'pendente',
                    observacoes: `Solicitante: ${req.requestedBy} | Fornecedor: ${req.fornecedor ?? '—'} | Aprovado por: ${actor.id}`,
                },
            });

            // 2) Lançar em "EM TRÂNSITO" — saldo real só sobe quando a conta for paga
            //    OU o admin clicar em "Marcar como recebido" (idempotente, ver confirmReceiptOfPurchase).
            await tx.stockItem.update({
                where: { id: req.stockItemId },
                data: { quantidadeEmTransito: { increment: finalQty } },
            });

            // 3) Criar a movimentação ENCOMENDA (auditoria do pedido)
            const movement = await tx.stockMovement.create({
                data: {
                    type: 'ENCOMENDA',
                    stockItemId: req.stockItemId,
                    quantidade: req.quantidade,
                    purchaseRequestId: req.id,
                    registeredBy: actor.id,
                    observacao: `Encomenda aprovada. Aguardando recebimento/pagamento da ContaPagar ${conta.id.slice(0, 8)}. ${dto.reviewNote ?? ''}`.trim(),
                },
            });

            // 4) Atualizar a solicitação
            const updated = await tx.stockPurchaseRequest.update({
                where: { id },
                data: {
                    status: 'APROVADA',
                    reviewedBy: actor.id,
                    reviewedAt: new Date(),
                    reviewNote: dto.reviewNote ?? null,
                    contaPagarId: conta.id,
                    movementId: movement.id,
                    quantidade: finalQty,
                    precoUnitario: finalPrice,
                    valorTotal: finalTotal,
                },
                include: {
                    stockItem: { select: { id: true, nome: true, unidade: true } },
                    requester: { select: { id: true, name: true, email: true } },
                    reviewer: { select: { id: true, name: true } },
                    contaPagar: true,
                    movement: true,
                },
            });

            return updated;
        }).then(async (updated) => {
            await this.auditLog.log({
                userId: actor.id,
                action: 'STOCK_PURCHASE_REQUEST_APPROVE',
                tableName: 'stock_purchase_requests',
                recordId: updated.id,
                oldData: { status: 'PENDENTE' },
                newData: {
                    id: updated.id,
                    stockItemId: updated.stockItemId,
                    stockItemNome: updated.stockItem?.nome,
                    quantidade: updated.quantidade?.toString?.() ?? updated.quantidade,
                    valorTotal: updated.valorTotal?.toString?.() ?? updated.valorTotal,
                    fornecedor: updated.fornecedor,
                    justificativa: updated.justificativa,
                    status: 'APROVADA',
                    enviadoParaEmTransito: true,
                    requesterName: updated.requester?.name ?? null,
                    reviewerName: updated.reviewer?.name ?? null,
                    reviewedBy: updated.reviewedBy,
                    reviewNote: updated.reviewNote,
                    contaPagarId: updated.contaPagarId,
                    movementId: updated.movementId,
                },
            });

            // Disparo de e-mail para o Solicitante
            if (updated.requester?.email) {
                this.mailService.sendPurchaseRequestReviewed(
                    updated.requester.email,
                    updated.requester.name,
                    updated.stockItem?.nome ?? 'Item Desconhecido',
                    'APROVADA',
                    updated.reviewNote ?? undefined
                ).catch(console.error);
            }

            return updated;
        });
    }

    /**
     * Confirma o RECEBIMENTO de uma Solicitação de Compra APROVADA.
     * Pode ser disparado por:
     *   • Pagamento da ContaPagar (automático, via ContasPagarService.marcarComoPaga / update)
     *   • Ação manual do admin (botão "Marcar como recebido")
     *
     * EFEITO (em $transaction):
     *   1. Decrementa stockItem.quantidadeEmTransito
     *   2. Incrementa stockItem.quantidadeAtual (saldo REAL)
     *   3. Cria StockMovement type=REPOSICAO (vinculado à mesma PR)
     *   4. Atualiza PR.status = RECEBIDA
     *
     * IDEMPOTENTE: se a PR já está RECEBIDA, retorna sem fazer nada (não erra).
     */
    async confirmReceiptOfPurchase(
        prId: string,
        actor: { id: string; role: UserRole },
        trigger: 'PAYMENT' | 'MANUAL_RECEIPT' = 'MANUAL_RECEIPT',
    ) {
        const req = await this.prisma.stockPurchaseRequest.findUnique({
            where: { id: prId },
            include: {
                stockItem: { select: { id: true, nome: true } },
                contaPagar: { select: { id: true, status: true } },
            },
        });
        if (!req) throw new NotFoundException('Solicitação não encontrada');

        // IDEMPOTÊNCIA: se já está RECEBIDA, retorna o estado atual sem alteração.
        if (req.status === 'RECEBIDA') {
            return req;
        }
        if (req.status !== 'APROVADA') {
            throw new ConflictException(
                `Só é possível confirmar recebimento de solicitações APROVADAS. Status atual: ${req.status}`,
            );
        }

        // Trigger MANUAL: precisa ser ADMIN
        if (trigger === 'MANUAL_RECEIPT' && !ROLES_REVISOR_COMPRA.includes(actor.role)) {
            throw new ForbiddenException('Apenas ADMIN pode marcar uma solicitação como recebida');
        }

        // Para trigger automático (PAYMENT), o actor é 'system' — usamos o admin que aprovou a PR
        // como registrante do StockMovement, garantindo FK válida e rastreabilidade.
        let registrarId = actor.id;
        if (actor.id === 'system') {
            registrarId = req.reviewedBy ?? req.requestedBy;
        }

        const updated = await this.prisma.$transaction(async (tx) => {
            // 1) Decrementa em trânsito + 2) Incrementa saldo real (atômico)
            await tx.stockItem.update({
                where: { id: req.stockItemId },
                data: {
                    quantidadeAtual: { increment: req.quantidade },
                    quantidadeEmTransito: { decrement: req.quantidade },
                },
            });

            // 3) Cria StockMovement REPOSICAO (entrada real no estoque)
            // OBS: a PR ainda referencia o movement antigo (ENCOMENDA). Criamos um SEGUNDO
            // movement (REPOSICAO) que também referencia a mesma PR — mas como o campo é @unique,
            // só pode haver UM. Solução: o REPOSICAO vai sem purchaseRequestId (já que ENCOMENDA
            // está ocupando) e mencionamos a PR na observação. Auditoria continua íntegra
            // porque ambos têm o mesmo stockItemId e quantidade.
            const movReposicao = await tx.stockMovement.create({
                data: {
                    type: 'REPOSICAO',
                    stockItemId: req.stockItemId,
                    quantidade: req.quantidade,
                    purchaseRequestId: null,
                    registeredBy: registrarId,
                    observacao:
                        trigger === 'PAYMENT'
                            ? `Recebimento automático — ContaPagar ${req.contaPagarId?.slice(0, 8) ?? ''} paga. PR ${prId.slice(0, 8)}.`
                            : `Recebimento confirmado manualmente. PR ${prId.slice(0, 8)}.`,
                },
            });

            // 4) Atualiza status da PR para RECEBIDA
            const pr = await tx.stockPurchaseRequest.update({
                where: { id: prId },
                data: { status: 'RECEBIDA' },
                include: {
                    stockItem: { select: { id: true, nome: true, unidade: true } },
                    requester: { select: { id: true, name: true } },
                    reviewer: { select: { id: true, name: true } },
                    contaPagar: true,
                    movement: true,
                },
            });

            return { pr, movReposicaoId: movReposicao.id };
        });

        await this.auditLog.log({
            // 'system' é usado por trigger automático (pagamento de ContaPagar); evita FK inválida
            userId: actor.id === 'system' ? undefined : actor.id,
            action: 'STOCK_PURCHASE_REQUEST_RECEIVE',
            tableName: 'stock_purchase_requests',
            recordId: prId,
            oldData: { status: 'APROVADA' },
            newData: {
                id: prId,
                stockItemId: updated.pr.stockItemId,
                stockItemNome: updated.pr.stockItem?.nome,
                quantidade: updated.pr.quantidade?.toString?.() ?? updated.pr.quantidade,
                status: 'RECEBIDA',
                trigger,
                triggeredBy: actor.id === 'system' ? 'system (automatic — payment)' : actor.id,
                reposicaoMovementId: updated.movReposicaoId,
                contaPagarId: updated.pr.contaPagarId,
                contaPagarStatus: updated.pr.contaPagar?.status ?? null,
            },
        });

        return updated.pr;
    }

    async rejectPurchaseRequest(
        id: string,
        dto: RejectPurchaseRequestDto,
        actor: { id: string; role: UserRole },
    ) {
        if (!ROLES_REVISOR_COMPRA.includes(actor.role)) {
            throw new ForbiddenException('Apenas ADMIN pode rejeitar solicitações de compra');
        }

        const req = await this.prisma.stockPurchaseRequest.findUnique({ where: { id } });
        if (!req) throw new NotFoundException('Solicitação não encontrada');
        if (req.status !== 'PENDENTE') {
            throw new ConflictException(`Solicitação já está com status ${req.status}`);
        }

        const rejected = await this.prisma.stockPurchaseRequest.update({
            where: { id },
            data: {
                status: 'REJEITADA',
                reviewedBy: actor.id,
                reviewedAt: new Date(),
                reviewNote: dto.reviewNote,
            },
            include: {
                stockItem: { select: { id: true, nome: true } },
                requester: { select: { id: true, name: true, email: true } },
                reviewer: { select: { id: true, name: true } },
            },
        });

        await this.auditLog.log({
            userId: actor.id,
            action: 'STOCK_PURCHASE_REQUEST_REJECT',
            tableName: 'stock_purchase_requests',
            recordId: rejected.id,
            oldData: { status: 'PENDENTE' },
            newData: {
                id: rejected.id,
                stockItemId: rejected.stockItemId,
                stockItemNome: rejected.stockItem?.nome,
                status: 'REJEITADA',
                reviewedBy: rejected.reviewedBy,
                reviewerName: rejected.reviewer?.name ?? null,
                reviewNote: rejected.reviewNote,
            },
        });

        if (rejected.requester?.email) {
            this.mailService.sendPurchaseRequestReviewed(
                rejected.requester.email,
                rejected.requester.name,
                rejected.stockItem?.nome ?? 'Item Desconhecido',
                'REJEITADA',
                rejected.reviewNote ?? undefined
            ).catch(console.error);
        }

        return rejected;
    }

    /** Solicitante cancela própria solicitação (apenas se ainda PENDENTE). */
    async cancelPurchaseRequest(id: string, actor: { id: string; role: UserRole }) {
        const req = await this.prisma.stockPurchaseRequest.findUnique({
            where: { id },
            include: { stockItem: { select: { id: true, nome: true } } },
        });
        if (!req) throw new NotFoundException('Solicitação não encontrada');
        if (req.requestedBy !== actor.id && !ROLES_REVISOR_COMPRA.includes(actor.role)) {
            throw new ForbiddenException('Você só pode cancelar suas próprias solicitações');
        }
        if (req.status !== 'PENDENTE') {
            throw new ConflictException('Apenas solicitações PENDENTES podem ser canceladas');
        }

        const cancelled = await this.prisma.stockPurchaseRequest.update({
            where: { id },
            data: { status: 'CANCELADA' },
        });

        await this.auditLog.log({
            userId: actor.id,
            action: 'STOCK_PURCHASE_REQUEST_CANCEL',
            tableName: 'stock_purchase_requests',
            recordId: id,
            oldData: { status: 'PENDENTE' },
            newData: {
                id: cancelled.id,
                stockItemId: cancelled.stockItemId,
                stockItemNome: req.stockItem?.nome,
                status: 'CANCELADA',
                cancelledBy: actor.id,
            },
        });

        return cancelled;
    }

    // ═══════════════════════════════════════════════════════════════════
    //   ALERTAS + DASHBOARD
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Retorna itens em alerta de saldo. `severity` define o filtro:
     *  • 'low'     → atual ≤ mínimo (inclui crítico)
     *  • 'critical'→ atual ≤ 50% do mínimo (apenas crítico)
     */
    async lowStockAlerts(severity: 'low' | 'critical' = 'low') {
        const items = await this.prisma.stockItem.findMany({
            where: { active: true },
            select: {
                id: true, nome: true, codigoInterno: true, categoria: true,
                unidade: true, quantidadeAtual: true, quantidadeMinima: true,
                fotoUrl: true,
            },
        });
        return items.filter((i) => {
            const atual = Number(i.quantidadeAtual);
            const minimo = Number(i.quantidadeMinima);
            if (minimo <= 0) return false; // sem mínimo definido, não há alerta
            if (severity === 'critical') return atual <= minimo * 0.5;
            return atual <= minimo;
        });
    }

    async expiringStockAlerts(diasAteVencer = 30) {
        const limite = new Date();
        limite.setDate(limite.getDate() + diasAteVencer);

        return this.prisma.stockItem.findMany({
            where: {
                active: true,
                validade: { not: null, lte: limite },
            },
            orderBy: { validade: 'asc' },
            select: {
                id: true, nome: true, categoria: true, unidade: true,
                quantidadeAtual: true, validade: true, fotoUrl: true,
            },
        });
    }

    async dashboard() {
        const [
            totalItens,
            totalAtivos,
            saldoCentral,
            saldoEmTransitoAgg,
            itensComTransito,
            saldoCarretas,
            alertasBaixoLista,
            alertasCriticoLista,
            alertasVencendoLista,
            movimentacoesMes,
            solicitacoesPendentes,
            valorTotalEstimado,
            valorEmTransitoLista,
        ] = await Promise.all([
            this.prisma.stockItem.count(),
            this.prisma.stockItem.count({ where: { active: true } }),
            this.prisma.stockItem.aggregate({
                where: { active: true },
                _sum: { quantidadeAtual: true },
            }),
            this.prisma.stockItem.aggregate({
                where: { active: true },
                _sum: { quantidadeEmTransito: true },
            }),
            this.prisma.stockItem.count({
                where: { active: true, quantidadeEmTransito: { gt: 0 } },
            }),
            this.prisma.truckStockItem.aggregate({
                _sum: { quantidadeAtual: true },
            }),
            this.lowStockAlerts('low'),
            this.lowStockAlerts('critical'),
            this.expiringStockAlerts(30),
            this.prisma.stockMovement.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setDate(1)), // primeiro dia do mês corrente
                    },
                },
            }),
            this.prisma.stockPurchaseRequest.count({
                where: { status: 'PENDENTE', active: true },
            }),
            this.prisma.stockItem.findMany({
                where: { active: true, precoUnitario: { not: null } },
                select: { quantidadeAtual: true, precoUnitario: true },
            }),
            this.prisma.stockItem.findMany({
                where: { active: true, quantidadeEmTransito: { gt: 0 }, precoUnitario: { not: null } },
                select: { quantidadeEmTransito: true, precoUnitario: true },
            }),
        ]);

        const valorTotal = valorTotalEstimado.reduce(
            (acc, i) => acc + Number(i.quantidadeAtual) * Number(i.precoUnitario ?? 0),
            0,
        );
        const valorEmTransito = valorEmTransitoLista.reduce(
            (acc, i) => acc + Number(i.quantidadeEmTransito) * Number(i.precoUnitario ?? 0),
            0,
        );

        // "Baixo (não-crítico)" = total em alerta MENOS os que estão críticos
        const alertasBaixoNaoCritico = Math.max(0, alertasBaixoLista.length - alertasCriticoLista.length);

        return {
            totalItens,
            totalAtivos,
            saldoCentral: Number(saldoCentral._sum.quantidadeAtual ?? 0),
            saldoCarretas: Number(saldoCarretas._sum.quantidadeAtual ?? 0),
            saldoEmTransito: Number(saldoEmTransitoAgg._sum.quantidadeEmTransito ?? 0),
            itensEmTransito: itensComTransito,
            valorEmTransito: Number(valorEmTransito.toFixed(2)),
            alertasEstoqueBaixo: alertasBaixoLista.length,
            alertasEstoqueBaixoNaoCritico: alertasBaixoNaoCritico,
            alertasEstoqueCritico: alertasCriticoLista.length,
            alertasVencendo: alertasVencendoLista.length,
            movimentacoesMes,
            solicitacoesPendentes,
            valorTotalEstimado: Number(valorTotal.toFixed(2)),
        };
    }

    async financialDashboard() {
        const prs = await this.prisma.stockPurchaseRequest.findMany({
            where: { active: true },
            select: { status: true, quantidade: true, valorTotal: true }
        });

        let valorTotalGasto = 0;
        let quantidadeComprada = 0;
        let valorPendente = 0;
        let quantidadePendente = 0;

        for (const pr of prs) {
            if (pr.status === 'APROVADA' || pr.status === 'RECEBIDA') {
                valorTotalGasto += Number(pr.valorTotal ?? 0);
                quantidadeComprada += Number(pr.quantidade);
            } else if (pr.status === 'PENDENTE') {
                valorPendente += Number(pr.valorTotal ?? 0);
                quantidadePendente += Number(pr.quantidade);
            }
        }

        const stats = await this.dashboard();

        // 1. Patrimônio (Em Estoque)
        const items = await this.prisma.stockItem.findMany({
            where: { active: true },
            select: { id: true, precoUnitario: true, quantidadeAtual: true, nome: true, unidade: true },
        });
        
        let valorCentral = 0;
        items.forEach(it => {
            valorCentral += Number(it.quantidadeAtual) * (it.precoUnitario ? Number(it.precoUnitario) : 0);
        });
        
        const truckStocks = await this.prisma.truckStockItem.findMany({
            select: { quantidadeAtual: true, stockItem: { select: { precoUnitario: true } } },
        });
        
        let valorCarretas = 0;
        truckStocks.forEach(ts => {
            if (ts.stockItem) {
                valorCarretas += Number(ts.quantidadeAtual) * (ts.stockItem.precoUnitario ? Number(ts.stockItem.precoUnitario) : 0);
            }
        });

        // 2. Consumo Mês Atual (Distribuição Carretas)
        const now = new Date();
        const ano = now.getFullYear();
        const mes = now.getMonth() + 1;
        
        const movements = await this.prisma.stockMovement.findMany({
            where: {
                OR: [
                    { type: 'ENTRADA', toTruckId: { not: null } },
                    { type: 'DEVOLUCAO', fromTruckId: { not: null } },
                ],
                createdAt: {
                    gte: new Date(ano, mes - 1, 1),
                    lt: new Date(ano, mes, 1),
                },
            },
            include: { stockItem: true },
        });

        let totalConsumido = 0;
        const consumoPorItem: Record<string, { nome: string, unidade: string, valorTotal: number, quantidade: number }> = {};

        movements.forEach(m => {
            const preco = m.stockItem?.precoUnitario ? Number(m.stockItem.precoUnitario) : 0;
            const valBase = Number(m.quantidade) * preco;
            const sign = m.type === 'DEVOLUCAO' ? -1 : 1;
            const val = valBase * sign;
            totalConsumido += val;

            if (m.stockItem) {
                const id = m.stockItem.id;
                if (!consumoPorItem[id]) {
                    consumoPorItem[id] = { nome: m.stockItem.nome, unidade: m.stockItem.unidade, valorTotal: 0, quantidade: 0 };
                }
                consumoPorItem[id].valorTotal += val;
                consumoPorItem[id].quantidade += Number(m.quantidade) * sign;
            }
        });
        
        const topConsumoMes = Object.values(consumoPorItem)
            .sort((a, b) => b.valorTotal - a.valorTotal)
            .slice(0, 5);

        return {
            valorTotalGasto,
            quantidadeComprada,
            valorPendente,
            quantidadePendente,
            statusCounts: {
                critico: stats.alertasEstoqueCritico,
                baixo: stats.alertasEstoqueBaixoNaoCritico,
                ok: stats.totalAtivos - (stats.alertasEstoqueBaixoNaoCritico + stats.alertasEstoqueCritico),
            },
            valorEmEstoque: {
                central: valorCentral,
                carretas: valorCarretas,
            },
            verbaMensal: {
                total: 0,
                consumido: 0,
            },
            topConsumoMes,
        };
    }

    async itemFinancials(id: string) {
        const prs = await this.prisma.stockPurchaseRequest.findMany({
            where: { stockItemId: id, active: true },
            select: { status: true, quantidade: true, valorTotal: true }
        });

        let valorTotalGasto = 0;
        let valorPendente = 0;
        let quantidadeComprada = 0;

        for (const pr of prs) {
            if (pr.status === 'APROVADA' || pr.status === 'RECEBIDA') {
                valorTotalGasto += Number(pr.valorTotal ?? 0);
                quantidadeComprada += Number(pr.quantidade);
            } else if (pr.status === 'PENDENTE') {
                valorPendente += Number(pr.valorTotal ?? 0);
            }
        }

        return { valorTotalGasto, valorPendente, quantidadeComprada };
    }

    // ═══════════════════════════════════════════════════════════════════
    //   CONSUMO POR AÇÃO (agregação a partir de StockMovement com type=SAIDA)
    // ═══════════════════════════════════════════════════════════════════
    /**
     * Retorna o consumo total por item dentro de uma ação específica.
     * Fonte única da verdade: stock_movements (sem tabela duplicada AcaoInsumo).
     */
    /**
     * Agregado inverso: para um StockItem, mostra QUAIS AÇÕES consumiram esse item.
     * Útil no detalhe do item: lista "este item já foi para essas ações/cursos".
     */
    async consumptionByItem(stockItemId: string) {
        const item = await this.prisma.stockItem.findUnique({
            where: { id: stockItemId },
            select: { id: true, nome: true, unidade: true },
        });
        if (!item) throw new NotFoundException('Item não encontrado');

        const movimentacoes = await this.prisma.stockMovement.findMany({
            where: { stockItemId, type: 'SAIDA', acaoId: { not: null } },
            include: {
                acao: { select: { id: true, nome: true, status: true, dataInicio: true, dataFim: true, cidadeNome: true } },
                fromTruck: { select: { id: true, identifier: true } },
                registrar: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Agrega por ação
        const porAcao = new Map<string, {
            acao: any;
            totalConsumido: number;
            ultimoConsumoAt: string;
            movimentacoes: any[];
        }>();

        for (const m of movimentacoes) {
            if (!m.acaoId || !m.acao) continue;
            const key = m.acaoId;
            const qtd = Number(m.quantidade);
            const existing = porAcao.get(key);
            if (existing) {
                existing.totalConsumido += qtd;
                existing.movimentacoes.push(m);
                if (m.createdAt > new Date(existing.ultimoConsumoAt)) {
                    existing.ultimoConsumoAt = m.createdAt.toISOString();
                }
            } else {
                porAcao.set(key, {
                    acao: m.acao,
                    totalConsumido: qtd,
                    ultimoConsumoAt: m.createdAt.toISOString(),
                    movimentacoes: [m],
                });
            }
        }

        const result = Array.from(porAcao.values())
            .map(p => ({
                ...p,
                totalConsumido: Number(p.totalConsumido.toFixed(3)),
                movimentacoes: p.movimentacoes.slice(0, 10),
            }))
            .sort((a, b) => new Date(b.ultimoConsumoAt).getTime() - new Date(a.ultimoConsumoAt).getTime());

        return {
            item,
            totalAcoes: result.length,
            totalConsumidoGeral: Number(result.reduce((s, r) => s + r.totalConsumido, 0).toFixed(3)),
            acoes: result,
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    //   RESERVAS DE INSUMOS POR AÇÃO — kit previsto antes da execução
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Lista as reservas (kit de insumos previstos) de uma ação, enriquecidas
     * com saldo atual do item, valor estimado e status (atendido / parcial / não atendido).
     */
    async listReservationsByAcao(acaoId: string) {
        const acao = await this.prisma.acao.findUnique({
            where: { id: acaoId },
            select: { id: true, nome: true, status: true, dataInicio: true, dataFim: true, carretaId: true },
        });
        if (!acao) throw new NotFoundException('Ação não encontrada');

        const reservations = await this.prisma.acaoStockReservation.findMany({
            where: { acaoId },
            include: {
                stockItem: {
                    select: {
                        id: true, nome: true, codigoInterno: true, unidade: true,
                        quantidadeAtual: true, quantidadeMinima: true, quantidadeEmTransito: true,
                        precoUnitario: true, fotoUrl: true, active: true, categoria: true,
                        customCategory: { select: { id: true, nome: true, icon: true, color: true } },
                    },
                },
                truck: { select: { id: true, identifier: true, licensePlate: true } },
            },
            orderBy: [{ prioridade: 'desc' }, { createdAt: 'asc' }],
        });

        const enriched = reservations.map((r) => {
            const prevista = Number(r.quantidadePrevista);
            const consumida = Number(r.quantidadeConsumida);
            const restante = Math.max(0, prevista - consumida);
            const preco = r.stockItem.precoUnitario != null ? Number(r.stockItem.precoUnitario) : 0;
            const saldoDisponivel = Number(r.stockItem.quantidadeAtual);
            // Status:
            //   - ATENDIDA: consumida >= prevista
            //   - PARCIAL: consumida > 0 mas < prevista
            //   - PLANEJADA: consumida == 0, saldo cobre restante
            //   - INSUFICIENTE: saldo (central+transito) NÃO cobre o restante
            let status: 'ATENDIDA' | 'PARCIAL' | 'PLANEJADA' | 'INSUFICIENTE';
            if (consumida >= prevista) status = 'ATENDIDA';
            else if (consumida > 0) status = 'PARCIAL';
            else {
                const cobertura = saldoDisponivel + Number(r.stockItem.quantidadeEmTransito);
                status = cobertura >= restante ? 'PLANEJADA' : 'INSUFICIENTE';
            }

            return {
                ...r,
                quantidadePrevista: prevista,
                quantidadeConsumida: consumida,
                quantidadeRestante: Number(restante.toFixed(3)),
                valorEstimado: Number((prevista * preco).toFixed(2)),
                saldoCentralDisponivel: saldoDisponivel,
                cobertura: status,
            };
        });

        return {
            acao,
            total: enriched.length,
            valorEstimadoTotal: Number(enriched.reduce((s, r) => s + r.valorEstimado, 0).toFixed(2)),
            reservations: enriched,
        };
    }

    /**
     * Upsert em lote do kit de insumos da ação.
     * Reservas existentes não citadas no payload são REMOVIDAS (sincronização).
     * Não permite remover itens que já tenham consumo registrado (quantidadeConsumida > 0).
     */
    async upsertReservationsForAcao(
        acaoId: string,
        items: Array<{
            stockItemId: string;
            quantidadePrevista: number;
            truckId?: string;
            prioridade?: 'BAIXA' | 'NORMAL' | 'CRITICA';
            observacao?: string;
        }>,
        actor: { id: string; role: UserRole },
    ) {
        if (!['ADMIN', 'IT_ADMIN', 'COORDINATOR'].includes(actor.role)) {
            throw new ForbiddenException('Apenas ADMIN ou coordenador pode editar o kit de insumos');
        }

        const acao = await this.prisma.acao.findUnique({ where: { id: acaoId } });
        if (!acao) throw new NotFoundException('Ação não encontrada');

        // Detecta duplicatas no payload
        const ids = items.map((i) => i.stockItemId);
        if (new Set(ids).size !== ids.length) {
            throw new BadRequestException('Itens duplicados no kit — cada StockItem aparece no máximo 1 vez');
        }

        // Quantidades devem ser positivas
        for (const it of items) {
            if (!(it.quantidadePrevista > 0)) {
                throw new BadRequestException(`Quantidade prevista deve ser > 0 para item ${it.stockItemId}`);
            }
        }

        const existing = await this.prisma.acaoStockReservation.findMany({ where: { acaoId } });
        const inPayload = new Set(ids);

        // Bloquear remoção de reservas com consumo registrado
        const toRemove = existing.filter((e) => !inPayload.has(e.stockItemId));
        const blocked = toRemove.filter((e) => Number(e.quantidadeConsumida) > 0);
        if (blocked.length > 0) {
            throw new BadRequestException(
                `Não é possível remover reservas com consumo já registrado (${blocked.length} item(s)). ` +
                `Cancele/devolva o consumo antes via Movimentação.`,
            );
        }

        // Transação: deleta removidos + upsert dos demais
        const result = await this.prisma.$transaction(async (tx) => {
            // Remove os que saíram do payload (e sem consumo)
            if (toRemove.length > 0) {
                await tx.acaoStockReservation.deleteMany({
                    where: { id: { in: toRemove.map((r) => r.id) } },
                });
            }

            // Upsert
            const upserts = [];
            for (const it of items) {
                const found = existing.find((e) => e.stockItemId === it.stockItemId);
                if (found) {
                    upserts.push(
                        tx.acaoStockReservation.update({
                            where: { id: found.id },
                            data: {
                                quantidadePrevista: it.quantidadePrevista,
                                truckId: it.truckId ?? null,
                                prioridade: it.prioridade ?? 'NORMAL',
                                observacao: it.observacao ?? null,
                            },
                        }),
                    );
                } else {
                    upserts.push(
                        tx.acaoStockReservation.create({
                            data: {
                                acaoId,
                                stockItemId: it.stockItemId,
                                quantidadePrevista: it.quantidadePrevista,
                                truckId: it.truckId ?? null,
                                prioridade: it.prioridade ?? 'NORMAL',
                                observacao: it.observacao ?? null,
                                createdBy: actor.id,
                            },
                        }),
                    );
                }
            }
            return Promise.all(upserts);
        });

        await this.auditLog.log({
            userId: actor.id,
            action: 'STOCK_RESERVATION_UPSERT',
            tableName: 'acao_stock_reservations',
            recordId: acaoId,
            newData: { totalReservas: result.length, itens: items },
        });

        return this.listReservationsByAcao(acaoId);
    }

    /**
     * Lista a quais ações futuras um item está alocado (planejamento).
     * Útil para o card do item: "este item está reservado para 3 ações futuras: 45un".
     */
    async reservationsByItem(stockItemId: string) {
        const item = await this.prisma.stockItem.findUnique({
            where: { id: stockItemId },
            select: { id: true, nome: true, unidade: true, quantidadeAtual: true },
        });
        if (!item) throw new NotFoundException('Item não encontrado');

        const reservations = await this.prisma.acaoStockReservation.findMany({
            where: {
                stockItemId,
                // Apenas reservas ainda não totalmente consumidas
                acao: { status: { in: ['PLANEJADA', 'EM_ANDAMENTO'] as any } },
            },
            include: {
                acao: { select: { id: true, nome: true, status: true, dataInicio: true, dataFim: true, cidadeNome: true } },
                truck: { select: { id: true, identifier: true } },
            },
            orderBy: [{ acao: { dataInicio: 'asc' } }],
        });

        const totalReservado = reservations.reduce((s, r) => {
            const prev = Number(r.quantidadePrevista);
            const cons = Number(r.quantidadeConsumida);
            return s + Math.max(0, prev - cons);
        }, 0);

        return {
            item,
            totalAcoesFuturas: reservations.length,
            totalReservadoPendente: Number(totalReservado.toFixed(3)),
            reservations: reservations.map((r) => ({
                ...r,
                quantidadePrevista: Number(r.quantidadePrevista),
                quantidadeConsumida: Number(r.quantidadeConsumida),
                quantidadeRestante: Number(Math.max(0, Number(r.quantidadePrevista) - Number(r.quantidadeConsumida)).toFixed(3)),
            })),
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    //   FECHAMENTO DE CICLO — Baixa de estoque por Ação (consumo)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Resumo consolidado da baixa de estoque de uma ação.
     * Retorna o kit previsto, o que já foi consumido, o saldo nas carretas
     * (com sugestão de carreta de origem por item), e identifica "sobra" para
     * o caso de a ação estar prestes a ser concluída.
     */
    async baixaStatusByAcao(acaoId: string) {
        const acao = await this.prisma.acao.findUnique({
            where: { id: acaoId },
            include: {
                carreta: { select: { id: true, identifier: true, licensePlate: true } },
            },
        });
        if (!acao) throw new NotFoundException('Ação não encontrada');

        // Reservas (kit)
        const reservations = await this.prisma.acaoStockReservation.findMany({
            where: { acaoId },
            include: {
                stockItem: {
                    select: {
                        id: true, nome: true, codigoInterno: true, unidade: true,
                        precoUnitario: true, active: true, fotoUrl: true,
                        truckStocks: {
                            select: {
                                id: true, truckId: true, quantidadeAtual: true,
                                truck: { select: { id: true, identifier: true, licensePlate: true } },
                            },
                            where: { quantidadeAtual: { gt: 0 } },
                        },
                    },
                },
                truck: { select: { id: true, identifier: true, licensePlate: true } },
            },
            orderBy: [{ prioridade: 'desc' }, { createdAt: 'asc' }],
        });

        // Saídas já realizadas (para alimentar histórico e auditoria visual)
        const saidas = await this.prisma.stockMovement.findMany({
            where: { acaoId, type: 'SAIDA' },
            include: {
                stockItem: { select: { id: true, nome: true, unidade: true } },
                fromTruck: { select: { id: true, identifier: true } },
                registrar: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const kit = reservations.map((r) => {
            const prevista = Number(r.quantidadePrevista);
            const consumida = Number(r.quantidadeConsumida);
            const restante = Math.max(0, prevista - consumida);

            // Sugestão de carreta: prioridade (1) carreta da reserva,
            // (2) carreta da ação, (3) carreta com maior saldo desse item.
            const stocksOrdenados = [...r.stockItem.truckStocks].sort(
                (a, b) => Number(b.quantidadeAtual) - Number(a.quantidadeAtual),
            );
            let sugestaoTruckId: string | null = null;
            if (r.truckId && stocksOrdenados.some((s) => s.truckId === r.truckId)) {
                sugestaoTruckId = r.truckId;
            } else if (acao.carretaId && stocksOrdenados.some((s) => s.truckId === acao.carretaId)) {
                sugestaoTruckId = acao.carretaId;
            } else if (stocksOrdenados[0]) {
                sugestaoTruckId = stocksOrdenados[0].truckId;
            }

            const saldoTotalDisponivel = stocksOrdenados.reduce(
                (sum, s) => sum + Number(s.quantidadeAtual), 0,
            );

            let status: 'ATENDIDA' | 'PARCIAL' | 'PRONTA' | 'INSUFICIENTE' | 'SEM_SALDO';
            if (consumida >= prevista) status = 'ATENDIDA';
            else if (saldoTotalDisponivel <= 0) status = 'SEM_SALDO';
            else if (saldoTotalDisponivel < restante) status = 'INSUFICIENTE';
            else if (consumida > 0) status = 'PARCIAL';
            else status = 'PRONTA';

            return {
                id: r.id,
                stockItemId: r.stockItemId,
                stockItem: r.stockItem,
                truckPrevisto: r.truck,
                prioridade: r.prioridade,
                observacao: r.observacao,
                quantidadePrevista: prevista,
                quantidadeConsumida: consumida,
                quantidadeRestante: Number(restante.toFixed(3)),
                saldoTotalDisponivelCarretas: Number(saldoTotalDisponivel.toFixed(3)),
                sugestaoTruckId,
                truckStocks: stocksOrdenados,
                status,
            };
        });

        // Sobra = itens com quantidadeConsumida < quantidadePrevista (após eventual conclusão)
        const sobra = kit.filter((k) => k.quantidadeRestante > 0);

        // Itens consumidos FORA do kit (saídas com stockItemId que não está na lista de reservas)
        const idsNoKit = new Set(kit.map((k) => k.stockItemId));
        const consumosForaDoKit = new Map<string, { stockItem: any; totalConsumido: number; movimentacoes: any[] }>();
        for (const m of saidas) {
            if (idsNoKit.has(m.stockItemId)) continue;
            const k = m.stockItemId;
            if (!consumosForaDoKit.has(k)) {
                consumosForaDoKit.set(k, { stockItem: m.stockItem, totalConsumido: 0, movimentacoes: [] });
            }
            const v = consumosForaDoKit.get(k)!;
            v.totalConsumido += Number(m.quantidade);
            v.movimentacoes.push(m);
        }

        return {
            acao: {
                id: acao.id, nome: acao.nome, status: acao.status,
                carreta: acao.carreta, carretaId: acao.carretaId,
                dataInicio: acao.dataInicio, dataFim: acao.dataFim,
            },
            kit,
            totalPrevisto: Number(kit.reduce((s, k) => s + k.quantidadePrevista, 0).toFixed(3)),
            totalConsumido: Number(kit.reduce((s, k) => s + k.quantidadeConsumida, 0).toFixed(3)),
            totalRestante: Number(kit.reduce((s, k) => s + k.quantidadeRestante, 0).toFixed(3)),
            saidas,
            consumosForaDoKit: Array.from(consumosForaDoKit.values()).map((v) => ({
                ...v,
                totalConsumido: Number(v.totalConsumido.toFixed(3)),
            })),
            temSobra: sobra.length > 0,
            sobra,
        };
    }

    /**
     * Baixa em LOTE de N itens para uma ação. Atômico: ou todas as SAIDAs entram,
     * ou nenhuma. Reaproveita a lógica de validação por item (saldo, perfil etc.)
     * e atualiza `AcaoStockReservation.quantidadeConsumida` quando há reserva.
     */
    async baixaEmLoteForAcao(
        acaoId: string,
        items: Array<{ stockItemId: string; quantidade: number; fromTruckId: string; observacao?: string }>,
        actor: { id: string; role: UserRole },
        observacaoGlobal?: string,
    ) {
        if (!ROLES_AUTORIZADAS_MOVIMENTACAO.includes(actor.role)) {
            throw new ForbiddenException('Você não tem permissão para registrar baixa de estoque');
        }
        if (!['ADMIN', 'IT_ADMIN', 'COORDINATOR', 'DRIVER', 'TEACHER'].includes(actor.role)) {
            throw new ForbiddenException('Apenas ADMIN, coordenador, motorista ou professor podem dar baixa de SAIDA');
        }

        const acao = await this.prisma.acao.findUnique({ where: { id: acaoId } });
        if (!acao) throw new NotFoundException('Ação não encontrada');
        if (acao.status === 'CANCELADA') {
            throw new BadRequestException('Não é possível dar baixa em uma ação CANCELADA');
        }
        // Permite EM_ANDAMENTO (uso normal) e CONCLUIDA (correção tardia) e PLANEJADA (pre-uso/lançamento adiantado).

        if (!items || items.length === 0) {
            throw new BadRequestException('Lote vazio — informe ao menos 1 item');
        }

        // Tudo numa única transação — falha de qualquer item desfaz tudo
        const created = await this.prisma.$transaction(async (tx) => {
            const movs = [];
            for (const it of items) {
                const movDto: CreateMovementDto = {
                    type: 'SAIDA',
                    stockItemId: it.stockItemId,
                    quantidade: it.quantidade,
                    fromTruckId: it.fromTruckId,
                    acaoId,
                    observacao: it.observacao ?? observacaoGlobal ?? `Baixa em lote — ação ${acao.nome}`,
                };

                // Reuso parcial de createMovement não é trivial dentro de tx; replicamos o essencial:
                const quantidade = new Prisma.Decimal(it.quantidade);
                if (quantidade.lte(0)) throw new BadRequestException(`Quantidade inválida para item ${it.stockItemId}`);

                // Saldo na carreta de origem
                const ts = await tx.truckStockItem.findUnique({
                    where: { truckId_stockItemId: { truckId: it.fromTruckId, stockItemId: it.stockItemId } },
                });
                if (!ts) {
                    throw new ConflictException(
                        `Carreta não tem este item registrado (item ${it.stockItemId} / carreta ${it.fromTruckId})`,
                    );
                }
                if (new Prisma.Decimal(ts.quantidadeAtual).lt(quantidade)) {
                    throw new ConflictException(
                        `Saldo insuficiente na carreta (disponível: ${ts.quantidadeAtual}, necessário: ${quantidade})`,
                    );
                }

                // Debita carreta
                await tx.truckStockItem.update({
                    where: { id: ts.id },
                    data: { quantidadeAtual: { decrement: quantidade } },
                });

                // Cria movimentação
                const m = await tx.stockMovement.create({
                    data: {
                        type: 'SAIDA',
                        stockItemId: it.stockItemId,
                        quantidade,
                        fromTruckId: it.fromTruckId,
                        acaoId,
                        observacao: movDto.observacao,
                        registeredBy: actor.id,
                    },
                });
                movs.push(m);

                // Atualiza reserva (se existir)
                const reserva = await tx.acaoStockReservation.findUnique({
                    where: { acaoId_stockItemId: { acaoId, stockItemId: it.stockItemId } },
                });
                if (reserva) {
                    await tx.acaoStockReservation.update({
                        where: { id: reserva.id },
                        data: { quantidadeConsumida: { increment: quantidade } },
                    });
                }
            }
            return movs;
        });

        // 1 log de auditoria por item baixado (granularidade fina para rastreio)
        for (const m of created) {
            await this.auditLog.log({
                userId: actor.id,
                action: 'STOCK_MOVEMENT_SAIDA',
                tableName: 'stock_movements',
                recordId: m.id,
                newData: {
                    acaoId,
                    acaoNome: acao.nome,
                    stockItemId: m.stockItemId,
                    quantidade: Number(m.quantidade),
                    fromTruckId: m.fromTruckId,
                    fonte: 'BAIXA_LOTE',
                },
            });
        }

        return {
            total: created.length,
            movimentacoes: created,
            mensagem: `${created.length} baixa(s) registrada(s) com sucesso para a ação "${acao.nome}"`,
        };
    }

    /**
     * Trata a "sobra" do kit após CONCLUIDA: para cada item, decide entre
     * DEVOLVER (Carreta → Central), MANTER (não faz nada) ou PERDA (com motivo).
     * Tudo numa transação. Auditável.
     */
    async tratarSobraDoKit(
        acaoId: string,
        items: Array<{
            stockItemId: string;
            fromTruckId: string;
            quantidade: number;
            decisao: 'DEVOLVER' | 'MANTER' | 'PERDA';
            motivo?: string;
        }>,
        actor: { id: string; role: UserRole },
    ) {
        if (!['ADMIN', 'IT_ADMIN', 'COORDINATOR'].includes(actor.role)) {
            throw new ForbiddenException('Apenas ADMIN/coordenador pode tratar sobra do kit');
        }
        const acao = await this.prisma.acao.findUnique({ where: { id: acaoId } });
        if (!acao) throw new NotFoundException('Ação não encontrada');
        if (!items || items.length === 0) {
            throw new BadRequestException('Lote vazio');
        }

        // PERDA exige motivo
        for (const it of items) {
            if (it.decisao === 'PERDA' && (!it.motivo || it.motivo.trim().length < 3)) {
                throw new BadRequestException(
                    `PERDA exige motivo descritivo (mín. 3 caracteres) — item ${it.stockItemId}`,
                );
            }
        }

        const created = await this.prisma.$transaction(async (tx) => {
            const movs: any[] = [];
            for (const it of items) {
                if (it.decisao === 'MANTER') {
                    // Não cria movimentação; só registra na auditoria depois
                    movs.push({ stockItemId: it.stockItemId, decisao: 'MANTER', mov: null });
                    continue;
                }

                const quantidade = new Prisma.Decimal(it.quantidade);
                if (quantidade.lte(0)) {
                    throw new BadRequestException(`Quantidade inválida para item ${it.stockItemId}`);
                }

                // Saldo
                const ts = await tx.truckStockItem.findUnique({
                    where: { truckId_stockItemId: { truckId: it.fromTruckId, stockItemId: it.stockItemId } },
                });
                if (!ts || new Prisma.Decimal(ts.quantidadeAtual).lt(quantidade)) {
                    throw new ConflictException(
                        `Saldo insuficiente para ${it.decisao} (disponível: ${ts?.quantidadeAtual ?? 0}, necessário: ${quantidade})`,
                    );
                }

                // Debita carreta
                await tx.truckStockItem.update({
                    where: { id: ts.id },
                    data: { quantidadeAtual: { decrement: quantidade } },
                });

                if (it.decisao === 'DEVOLVER') {
                    // Credita central
                    await tx.stockItem.update({
                        where: { id: it.stockItemId },
                        data: { quantidadeAtual: { increment: quantidade } },
                    });
                    const m = await tx.stockMovement.create({
                        data: {
                            type: 'DEVOLUCAO',
                            stockItemId: it.stockItemId,
                            quantidade,
                            fromTruckId: it.fromTruckId,
                            acaoId,
                            observacao: `Devolução de sobra da ação "${acao.nome}" (fechamento de ciclo)`,
                            registeredBy: actor.id,
                        },
                    });
                    movs.push({ stockItemId: it.stockItemId, decisao: 'DEVOLVER', mov: m });
                } else {
                    // PERDA
                    const m = await tx.stockMovement.create({
                        data: {
                            type: 'PERDA',
                            stockItemId: it.stockItemId,
                            quantidade,
                            fromTruckId: it.fromTruckId,
                            acaoId,
                            observacao: `Perda (sobra da ação "${acao.nome}"): ${it.motivo}`,
                            registeredBy: actor.id,
                        },
                    });
                    movs.push({ stockItemId: it.stockItemId, decisao: 'PERDA', mov: m });
                }
            }
            return movs;
        });

        // Auditoria — 1 log por decisão (mesmo MANTER, para rastrear que admin "viu e decidiu")
        for (const r of created) {
            await this.auditLog.log({
                userId: actor.id,
                action: r.decisao === 'DEVOLVER'
                    ? 'STOCK_MOVEMENT_DEVOLUCAO'
                    : (r.decisao === 'PERDA' ? 'STOCK_MOVEMENT_PERDA' : 'STOCK_RESERVATION_KEPT'),
                tableName: r.mov ? 'stock_movements' : 'acao_stock_reservations',
                recordId: r.mov?.id ?? acaoId,
                newData: {
                    acaoId,
                    acaoNome: acao.nome,
                    stockItemId: r.stockItemId,
                    decisao: r.decisao,
                    fonte: 'TRATAR_SOBRA_KIT',
                },
            });
        }

        return {
            total: created.length,
            decisoes: created,
            mensagem: `Sobra tratada: ${created.length} item(ns) processado(s)`,
        };
    }

    async consumptionByAcao(acaoId: string) {
        const acao = await this.prisma.acao.findUnique({
            where: { id: acaoId },
            select: { id: true, nome: true, status: true, dataInicio: true, dataFim: true },
        });
        if (!acao) throw new NotFoundException('Ação não encontrada');

        const movimentacoes = await this.prisma.stockMovement.findMany({
            where: { acaoId, type: 'SAIDA' },
            include: {
                stockItem: { select: { id: true, nome: true, unidade: true, categoria: true, fotoUrl: true } },
                fromTruck: { select: { id: true, identifier: true } },
                registrar: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Agrega por item
        const porItem = new Map<string, {
            stockItem: any;
            totalConsumido: number;
            movimentacoes: typeof movimentacoes;
        }>();

        for (const m of movimentacoes) {
            const key = m.stockItemId;
            const existing = porItem.get(key);
            const qtd = Number(m.quantidade);
            if (existing) {
                existing.totalConsumido += qtd;
                existing.movimentacoes.push(m);
            } else {
                porItem.set(key, {
                    stockItem: m.stockItem,
                    totalConsumido: qtd,
                    movimentacoes: [m],
                });
            }
        }

        return {
            acao,
            totalMovimentacoes: movimentacoes.length,
            itens: Array.from(porItem.values()).map((v) => ({
                ...v.stockItem,
                totalConsumido: v.totalConsumido,
                movimentacoes: v.movimentacoes.map((m) => ({
                    id: m.id,
                    quantidade: Number(m.quantidade),
                    fromTruck: m.fromTruck,
                    observacao: m.observacao,
                    registeredBy: m.registrar?.name,
                    createdAt: m.createdAt,
                })),
            })),
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    //   HISTÓRICO UNIFICADO DE AUDITORIA — toda a área de Estoque
    // ═══════════════════════════════════════════════════════════════════
    /**
     * Retorna uma timeline auditável unificada combinando:
     *  - audit_logs (criação/edição/desativação de itens, criações/aprovações/rejeições/cancelamentos de solicitações,
     *    movimentações replicadas com snapshot legível)
     *
     * Cada entry contém: quem fez, quando, o quê (action), em qual recurso, com dados antes/depois.
     */
    async getUnifiedHistory(filters?: {
        action?: string;
        tableName?: string;
        userId?: string;
        recordId?: string;
        stockItemId?: string;
        from?: string;
        to?: string;
        page?: number;
        limit?: number;
    }) {
        const page = Math.max(1, filters?.page ?? 1);
        const limit = Math.min(200, Math.max(1, filters?.limit ?? 50));
        const skip = (page - 1) * limit;

        const where: Prisma.AuditLogWhereInput = {
            // restringe ao escopo de estoque
            tableName: { in: ['stock_items', 'stock_movements', 'stock_purchase_requests'] },
        };

        if (filters?.tableName) where.tableName = filters.tableName;
        if (filters?.action) where.action = { contains: filters.action, mode: 'insensitive' };
        if (filters?.userId) where.userId = filters.userId;
        if (filters?.recordId) where.recordId = filters.recordId;
        if (filters?.from || filters?.to) {
            where.createdAt = {};
            if (filters.from) (where.createdAt as any).gte = new Date(filters.from);
            if (filters.to) (where.createdAt as any).lte = new Date(filters.to);
        }

        // Filtro por item específico: o ID do stockItem pode estar em recordId (logs de item)
        // OU dentro do JSON newData (logs de movimentação / purchase request).
        if (filters?.stockItemId) {
            const sid = filters.stockItemId;
            where.OR = [
                { tableName: 'stock_items', recordId: sid },
                { newData: { path: ['stockItemId'], equals: sid } as any },
            ];
        }

        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { id: true, name: true, email: true, role: true } },
                },
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return {
            data: logs,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            scope: 'estoque',
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    //   VERBAS — CRUD de StockBudget e AcaoStockBudget (REQ 2026-05)
    // ═══════════════════════════════════════════════════════════════════

    async listStockBudgets(filters?: { ano?: number; mes?: number; includeInactive?: boolean }) {
        const budgets = await this.prisma.stockBudget.findMany({
            where: {
                ...(filters?.ano != null ? { ano: filters.ano } : {}),
                ...(filters?.mes != null ? { mes: filters.mes } : {}),
                ...(!filters?.includeInactive ? { active: true } : {}),
            },
            include: {
                categoriaCustom: { select: { id: true, nome: true, icon: true, color: true } },
                creator: { select: { id: true, name: true } },
            },
            orderBy: [{ ano: 'desc' }, { mes: 'desc' }, { createdAt: 'asc' }],
        });

        if (budgets.length === 0) return [];

        const budgetsWithConsumed = await Promise.all(
            budgets.map(async (b) => {
                const movements = await this.prisma.stockMovement.findMany({
                    where: {
                        OR: [
                            { type: 'ENTRADA', toTruckId: { not: null } },
                            { type: 'DEVOLUCAO', fromTruckId: { not: null } },
                        ],
                        createdAt: {
                            gte: new Date(b.ano, b.mes - 1, 1),
                            lt: new Date(b.ano, b.mes, 1),
                        },
                        stockItem: b.categoriaEnum
                            ? { categoria: b.categoriaEnum }
                            : { customCategoryId: b.categoriaCustomId ?? undefined },
                    },
                    select: { type: true, quantidade: true, stockItem: { select: { precoUnitario: true } } },
                });

                const valorConsumido = movements.reduce((acc, m) => {
                    const preco = m.stockItem?.precoUnitario ? Number(m.stockItem.precoUnitario) : 0;
                    const valor = Number(m.quantidade) * preco;
                    return m.type === 'DEVOLUCAO' ? acc - valor : acc + valor;
                }, 0);

                const prePRs = await this.prisma.stockPurchaseRequest.findMany({
                    where: {
                        stockBudgetId: null,
                        status: { in: ['APROVADA', 'RECEBIDA'] },
                        createdAt: {
                            gte: new Date(b.ano, b.mes - 1, 1),
                            lt: b.createdAt,
                        },
                        stockItem: b.categoriaEnum
                            ? { categoria: b.categoriaEnum }
                            : { customCategoryId: b.categoriaCustomId ?? undefined },
                    },
                    select: { valorTotal: true },
                });

                const valorPreVerba = prePRs.reduce((acc, pr) => acc + Number(pr.valorTotal), 0);

                return { ...b, valorConsumido, valorPreVerba };
            }),
        );

        return budgetsWithConsumed;
    }

    async createStockBudget(dto: CreateStockBudgetDto, actor: { id: string; role: UserRole }) {
        if (!['ADMIN', 'IT_ADMIN'].includes(actor.role)) {
            throw new ForbiddenException('Apenas ADMIN pode criar verbas de estoque');
        }
        if (!dto.categoriaEnum && !dto.categoriaCustomId) {
            throw new BadRequestException('Informe categoriaEnum ou categoriaCustomId');
        }

        const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        const catLabel = dto.categoriaEnum ?? 'Categoria customizada';

        return this.prisma.$transaction(async (tx) => {
            let budget = await tx.stockBudget.findFirst({
                where: {
                    categoriaEnum: (dto.categoriaEnum as StockItemCategory) ?? null,
                    categoriaCustomId: dto.categoriaCustomId ?? null,
                    ano: dto.ano,
                    mes: dto.mes,
                    active: true,
                }
            });

            if (budget) {
                const novoTeto = Number(budget.valorTeto) + dto.valorTeto;
                budget = await tx.stockBudget.update({
                    where: { id: budget.id },
                    data: { valorTeto: new Prisma.Decimal(novoTeto) }
                });

                const mainPr = await tx.stockPurchaseRequest.findFirst({
                    where: { stockBudgetId: budget.id, status: 'PENDENTE' }
                });

                if (mainPr) {
                    await tx.stockPurchaseRequest.update({
                        where: { id: mainPr.id },
                        data: {
                            precoUnitario: new Prisma.Decimal(Number(mainPr.precoUnitario) + dto.valorTeto),
                            valorTotal: new Prisma.Decimal(Number(mainPr.valorTotal) + dto.valorTeto),
                            justificativa: mainPr.justificativa + ` [Adicional de R$ ${dto.valorTeto}]`
                        }
                    });
                } else {
                    await tx.stockPurchaseRequest.create({
                        data: {
                            stockItemId: (await tx.stockItem.findFirst({ where: { active: true }, select: { id: true } }))!.id,
                            stockBudgetId: budget.id,
                            quantidade: new Prisma.Decimal(1),
                            precoUnitario: new Prisma.Decimal(dto.valorTeto),
                            valorTotal: new Prisma.Decimal(dto.valorTeto),
                            justificativa: `Adicional de Verba ${catLabel} — ${MESES_PT[dto.mes - 1]}/${dto.ano}.`,
                            requestedBy: actor.id,
                            urgente: false,
                        },
                    });
                }
            } else {
                budget = await tx.stockBudget.create({
                    data: {
                        categoriaEnum: (dto.categoriaEnum as StockItemCategory) ?? null,
                        categoriaCustomId: dto.categoriaCustomId ?? null,
                        ano: dto.ano,
                        mes: dto.mes,
                        valorTeto: new Prisma.Decimal(dto.valorTeto),
                        observacao: dto.observacao ?? null,
                        createdBy: actor.id,
                    },
                });
            }

            return budget;
        });
    }

    async updateStockBudget(id: string, dto: UpdateStockBudgetDto, actor: { id: string; role: UserRole }) {
        if (!['ADMIN', 'IT_ADMIN'].includes(actor.role)) {
            throw new ForbiddenException('Apenas ADMIN pode alterar verbas');
        }
        const budget = await this.prisma.stockBudget.findUnique({ where: { id } });
        if (!budget || !budget.active) throw new NotFoundException('Verba não encontrada');
        return this.prisma.stockBudget.update({
            where: { id },
            data: {
                ...(dto.valorTeto != null ? { valorTeto: new Prisma.Decimal(dto.valorTeto) } : {}),
                ...(dto.observacao !== undefined ? { observacao: dto.observacao } : {}),
            },
        });
    }

    async deleteStockBudget(id: string, actor: { id: string; role: UserRole }) {
        if (!['ADMIN', 'IT_ADMIN'].includes(actor.role)) {
            throw new ForbiddenException('Apenas ADMIN pode remover verbas');
        }
        return this.prisma.stockBudget.update({ where: { id }, data: { active: false } });
    }

    async upsertAcaoStockBudget(dto: UpsertAcaoStockBudgetDto, actor: { id: string; role: UserRole }) {
        if (!['ADMIN', 'IT_ADMIN', 'COORDINATOR'].includes(actor.role)) {
            throw new ForbiddenException('Apenas ADMIN ou coordenador pode configurar verba de ação');
        }
        const acao = await this.prisma.acao.findUnique({ where: { id: dto.acaoId }, select: { id: true } });
        if (!acao) throw new NotFoundException('Ação não encontrada');
        return this.prisma.acaoStockBudget.upsert({
            where: { acaoId: dto.acaoId },
            create: {
                acaoId: dto.acaoId,
                valorTeto: new Prisma.Decimal(dto.valorTeto),
                observacao: dto.observacao ?? null,
                createdBy: actor.id,
            },
            update: {
                valorTeto: new Prisma.Decimal(dto.valorTeto),
                observacao: dto.observacao ?? null,
                active: true,
            },
        });
    }

    async getAcaoStockBudgetStatus(acaoId: string) {
        const budget = await this.prisma.acaoStockBudget.findUnique({
            where: { acaoId },
            include: { creator: { select: { id: true, name: true } } },
        });

        // Calcula o gasto baseado no consumo REAL da ação (StockMovements de SAIDA)
        const movements = await this.prisma.stockMovement.findMany({
            where: { acaoId, type: 'SAIDA' },
            include: { stockItem: { select: { precoUnitario: true } } }
        });
        
        let gasto = 0;
        for (const m of movements) {
            const preco = m.stockItem?.precoUnitario ? Number(m.stockItem.precoUnitario) : 0;
            gasto += Number(m.quantidade) * preco;
        }
        
        const decimalGasto = new Prisma.Decimal(gasto);

        return {
            acaoId,
            temVerba: budget != null,
            valorTeto: budget ? Number(budget.valorTeto) : null,
            valorGasto: gasto,
            valorDisponivel: budget ? Number(new Prisma.Decimal(budget.valorTeto).sub(decimalGasto)) : null,
            percentualUsado: budget && Number(budget.valorTeto) > 0
                ? Number(decimalGasto.div(new Prisma.Decimal(budget.valorTeto)).mul(100).toDecimalPlaces(1))
                : null,
        };
    }

    async deleteAcaoStockBudget(acaoId: string, actor: { id: string; role: UserRole }) {
        if (!['ADMIN', 'IT_ADMIN', 'COORDINATOR'].includes(actor.role)) {
            throw new ForbiddenException('Apenas ADMIN ou coordenador pode remover verba de ação');
        }
        const budget = await this.prisma.acaoStockBudget.findUnique({ where: { acaoId } });
        if (!budget) throw new NotFoundException('Verba da ação não encontrada');
        return this.prisma.acaoStockBudget.update({ where: { acaoId }, data: { active: false } });
    }
}
