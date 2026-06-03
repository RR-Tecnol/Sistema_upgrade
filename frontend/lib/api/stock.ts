import api from './client';
import { unwrapListData } from './pagination';

/** Chamadas sem page/limit precisam de array; o hub passa page/limit e recebe o objeto paginado. */
function wantsPaginatedStockQuery(filters?: { page?: number; limit?: number }) {
    return filters?.page != null || filters?.limit != null;
}

// ═══════════════════════════════════════════════════════════════════
//   TYPES
// ═══════════════════════════════════════════════════════════════════

export type StockItemCategory =
    | 'CONSUMIVEL'
    | 'DIDATICO'
    | 'LIMPEZA'
    | 'EQUIPAMENTO'
    | 'EPI'
    | 'ALIMENTACAO'
    | 'ESCRITORIO'
    | 'MATERIAL_FABRICACAO'
    | 'OUTRO';

export type StockMovementType =
    | 'ENTRADA'
    | 'SAIDA'
    | 'TRANSFERENCIA'
    | 'DEVOLUCAO'
    | 'AJUSTE'
    | 'PERDA'
    | 'REPOSICAO'
    | 'ENCOMENDA';

export type StockPurchaseRequestStatus =
    | 'PENDENTE'
    | 'APROVADA'
    | 'RECEBIDA'
    | 'REJEITADA'
    | 'CANCELADA';

// ── Reservas planejadas (kit de insumos por ação) ───────────────
export type ReservationStatus = 'ATENDIDA' | 'PARCIAL' | 'PLANEJADA' | 'INSUFICIENTE';
export type ReservationPrioridade = 'BAIXA' | 'NORMAL' | 'CRITICA';

export interface AcaoStockReservation {
    id: string;
    acaoId: string;
    stockItemId: string;
    truckId?: string | null;
    quantidadePrevista: number;
    quantidadeConsumida: number;
    quantidadeRestante?: number;
    prioridade: ReservationPrioridade;
    observacao?: string | null;
    createdAt: string;
    updatedAt: string;
    cobertura?: ReservationStatus;
    valorEstimado?: number;
    saldoCentralDisponivel?: number;
    stockItem?: {
        id: string;
        nome: string;
        codigoInterno?: string | null;
        unidade: string;
        quantidadeAtual: number | string;
        quantidadeMinima: number | string;
        quantidadeEmTransito?: number | string;
        precoUnitario?: number | string | null;
        fotoUrl?: string | null;
        active: boolean;
        categoria: StockItemCategory;
        customCategory?: { id: string; nome: string; icon: string; color: string } | null;
    };
    truck?: { id: string; identifier: string; licensePlate?: string } | null;
    acao?: {
        id: string; nome: string; status: string;
        dataInicio?: string | null; dataFim?: string | null; cidadeNome?: string | null;
    };
}

export interface ReservationsByAcaoResponse {
    acao: { id: string; nome: string; status: string; dataInicio?: string; dataFim?: string; carretaId?: string | null };
    total: number;
    valorEstimadoTotal: number;
    reservations: AcaoStockReservation[];
}

export interface ReservationsByItemResponse {
    item: { id: string; nome: string; unidade: string; quantidadeAtual: number | string };
    totalAcoesFuturas: number;
    totalReservadoPendente: number;
    reservations: AcaoStockReservation[];
}

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
    ATENDIDA:     'Atendida',
    PARCIAL:      'Consumo parcial',
    PLANEJADA:    'Planejada (saldo cobre)',
    INSUFICIENTE: 'Saldo insuficiente',
};

export const RESERVATION_STATUS_COLOR: Record<ReservationStatus, string> = {
    ATENDIDA:     '#10B981',
    PARCIAL:      '#F59E0B',
    PLANEJADA:    '#3B82F6',
    INSUFICIENTE: '#DC2626',
};

export interface ConsumptionByItemRow {
    acao: {
        id: string;
        nome: string;
        status: string;
        dataInicio?: string | null;
        dataFim?: string | null;
        cidadeNome?: string | null;
    };
    totalConsumido: number;
    ultimoConsumoAt: string;
    movimentacoes: Array<{
        id: string;
        quantidade: number | string;
        createdAt: string;
        fromTruck?: { id: string; identifier: string } | null;
        registrar?: { id: string; name: string } | null;
        observacao?: string | null;
    }>;
}

export interface ConsumptionByItemResponse {
    item: { id: string; nome: string; unidade: string };
    totalAcoes: number;
    totalConsumidoGeral: number;
    acoes: ConsumptionByItemRow[];
}

// ── Fechamento de ciclo: baixa de estoque por ação ──────────────
export type BaixaItemStatus = 'ATENDIDA' | 'PARCIAL' | 'PRONTA' | 'INSUFICIENTE' | 'SEM_SALDO';

export interface BaixaKitItem {
    id: string;                       // reservationId
    stockItemId: string;
    stockItem: {
        id: string;
        nome: string;
        codigoInterno?: string | null;
        unidade: string;
        precoUnitario?: number | string | null;
        active: boolean;
        fotoUrl?: string | null;
        truckStocks: Array<{
            id: string;
            truckId: string;
            quantidadeAtual: number | string;
            truck?: { id: string; identifier: string; licensePlate: string } | null;
        }>;
    };
    truckPrevisto?: { id: string; identifier: string; licensePlate: string } | null;
    prioridade: ReservationPrioridade;
    observacao?: string | null;
    quantidadePrevista: number;
    quantidadeConsumida: number;
    quantidadeRestante: number;
    saldoTotalDisponivelCarretas: number;
    sugestaoTruckId: string | null;
    truckStocks: Array<{
        id: string;
        truckId: string;
        quantidadeAtual: number | string;
        truck?: { id: string; identifier: string; licensePlate: string } | null;
    }>;
    status: BaixaItemStatus;
}

export interface BaixaStatusResponse {
    acao: {
        id: string;
        nome: string;
        status: string;
        carreta?: { id: string; identifier: string; licensePlate: string } | null;
        carretaId?: string | null;
        dataInicio?: string | null;
        dataFim?: string | null;
    };
    kit: BaixaKitItem[];
    totalPrevisto: number;
    totalConsumido: number;
    totalRestante: number;
    saidas: Array<{
        id: string;
        quantidade: number | string;
        createdAt: string;
        observacao?: string | null;
        stockItem: { id: string; nome: string; unidade: string };
        fromTruck?: { id: string; identifier: string } | null;
        registrar?: { id: string; name: string } | null;
    }>;
    consumosForaDoKit: Array<{
        stockItem: { id: string; nome: string; unidade: string };
        totalConsumido: number;
        movimentacoes: Array<any>;
    }>;
    temSobra: boolean;
    sobra: BaixaKitItem[];
}

export interface BaixaItemPayload {
    stockItemId: string;
    quantidade: number;
    fromTruckId: string;
    observacao?: string;
}

export interface TratarSobraItemPayload {
    stockItemId: string;
    fromTruckId: string;
    quantidade: number;
    decisao: 'DEVOLVER' | 'MANTER' | 'PERDA';
    motivo?: string;
}

const DEFAULT_CATEGORY_ENUMS: StockItemCategory[] = [
    'CONSUMIVEL',
    'DIDATICO',
    'LIMPEZA',
    'EQUIPAMENTO',
    'EPI',
    'ALIMENTACAO',
    'ESCRITORIO',
    'MATERIAL_FABRICACAO',
    'OUTRO',
];

export function defaultStockCategories(): StockCategory[] {
    return DEFAULT_CATEGORY_ENUMS.map((key) => ({
        id: `default-${key}`,
        nome: CATEGORIA_LABEL[key],
        slug: key.toLowerCase(),
        icon: CATEGORIA_ICON[key],
        color: CATEGORIA_COLOR[key],
        description: null,
        isDefault: true,
        defaultEnum: key,
        active: true,
        createdBy: null,
        createdAt: '',
        updatedAt: '',
    }));
}

function mergeWithDefaultCategories(rows: StockCategory[]): StockCategory[] {
    const customs = rows.filter((c) => !c.isDefault);
    return [...defaultStockCategories(), ...customs];
}

export const BAIXA_STATUS_LABEL: Record<BaixaItemStatus, string> = {
    ATENDIDA:     'Atendida',
    PARCIAL:      'Parcial',
    PRONTA:       'Pronta',
    INSUFICIENTE: 'Saldo insuficiente',
    SEM_SALDO:    'Sem saldo nas carretas',
};

export const BAIXA_STATUS_COLOR: Record<BaixaItemStatus, string> = {
    ATENDIDA:     '#10B981',
    PARCIAL:      '#F59E0B',
    PRONTA:       '#3B82F6',
    INSUFICIENTE: '#DC2626',
    SEM_SALDO:    '#6B7280',
};

export interface DashboardCategoryRow {
    key: string;                              // 'enum:CONSUMIVEL' ou 'custom:<uuid>'
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
}

export interface DashboardTruckRow {
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
}

export interface StockCategory {
    id: string;
    nome: string;
    slug: string;
    icon: string;
    color: string;
    description?: string | null;
    isDefault: boolean;
    defaultEnum?: StockItemCategory | null;
    active: boolean;
    createdBy?: string | null;
    createdAt: string;
    updatedAt: string;
    _count?: { stockItems: number };
}

export interface StockItem {
    id: string;
    nome: string;
    codigoInterno?: string | null;
    categoria: StockItemCategory;
    customCategoryId?: string | null;
    customCategory?: {
        id: string;
        nome: string;
        icon: string;
        color: string;
    } | null;
    unidade: string;
    quantidadeAtual: number | string; // Decimal vem como string no JSON (saldo REAL — já recebido)
    quantidadeEmTransito?: number | string; // saldo ENCOMENDADO (PR aprovada aguardando recebimento)
    quantidadeMinima: number | string;
    validade?: string | null;
    fornecedor?: string | null;
    precoUnitario?: number | string | null;
    localizacao?: string | null;
    fotoUrl?: string | null;
    observacoes?: string | null;
    active: boolean;
    createdAt: string;
    updatedAt: string;
    /**
     * Resumo das carretas que distribuem este item (vem em `findAllItems`).
     * Páginas que precisam dos campos completos de TruckStockItem (truckId, updatedAt etc.)
     * devem usar `findOneItem` que retorna `TruckStockItem[]` separadamente.
     */
    truckStocks?: Array<{
        id: string;
        quantidadeAtual: number | string;
        truck?: { id: string; identifier: string; licensePlate: string };
    }>;
    _count?: {
        truckStocks: number;
        movimentacoes: number;
        purchaseRequests: number;
    };
    /**
     * Contagem de Solicitações de Compra com status PENDENTE para este item.
     * Anexada pelo backend em `findAllItems` e `findOneItem`. Usada para destacar
     * itens "aguardando 1ª solicitação" (saldo 0, sem trânsito, sem PR pendente).
     */
    pendingPurchaseRequestsCount?: number;
}

export interface TruckStockItem {
    id: string;
    truckId: string;
    stockItemId: string;
    quantidadeAtual: number | string;
    quantidadeMinima?: number | string;
    updatedAt: string;
    createdAt: string;
    truck?: {
        id: string;
        identifier: string;
        licensePlate: string;
        status: string;
    };
    stockItem?: {
        id: string;
        nome: string;
        codigoInterno?: string | null;
        categoria: StockItemCategory;
        customCategory?: { id: string; nome: string; icon: string; color: string } | null;
        unidade: string;
        quantidadeMinima: number | string;
        precoUnitario?: number | string | null;
        validade?: string | null;
        fotoUrl?: string | null;
    };
}

export interface StockMovement {
    id: string;
    type: StockMovementType;
    stockItemId: string;
    quantidade: number | string;
    fromTruckId?: string | null;
    toTruckId?: string | null;
    acaoId?: string | null;
    purchaseRequestId?: string | null;
    observacao?: string | null;
    createdAt: string;
    stockItem?: { id: string; nome: string; unidade: string; precoUnitario?: number | string };
    fromTruck?: { id: string; identifier: string } | null;
    toTruck?: { id: string; identifier: string } | null;
    acao?: { id: string; nome: string } | null;
    registrar?: { id: string; name: string; role: string };
}

/** Mesma regra do cadastro de insumo: quantidade × preço unitário do item. */
export function stockMovementLineValue(
    m: Pick<StockMovement, 'quantidade' | 'stockItem'>,
): number | null {
    const preco = Number(m.stockItem?.precoUnitario ?? 0);
    if (!Number.isFinite(preco) || preco <= 0) return null;
    const qtd = Number(m.quantidade);
    if (!Number.isFinite(qtd) || qtd <= 0) return null;
    return qtd * preco;
}

export function formatStockCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export interface StockPurchaseRequest {
    id: string;
    stockItemId: string;
    quantidade: number | string;
    precoUnitario: number | string;
    valorTotal: number | string;
    fornecedor?: string | null;
    urgente: boolean;
    justificativa: string;
    comprovanteUrl?: string | null;
    status: StockPurchaseRequestStatus;
    requestedBy: string;
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    reviewNote?: string | null;
    contaPagarId?: string | null;
    movementId?: string | null;
    active: boolean;
    createdAt: string;
    updatedAt: string;
    stockItem?: StockItem;
    stockBudget?: any;
    requester?: { id: string; name: string; role: string; email?: string };
    reviewer?: { id: string; name: string } | null;
    contaPagar?: { id: string; status: string } | null;
    movement?: StockMovement | null;
}

export type StockBudget = any;

export interface StockDashboard {
    totalItens: number;
    totalAtivos: number;
    saldoCentral: number;
    saldoCarretas: number;
    /** Soma de quantidadeEmTransito de todos os itens ativos (PR aprovada aguardando recebimento) */
    saldoEmTransito?: number;
    /** Quantos itens distintos têm quantidadeEmTransito > 0 */
    itensEmTransito?: number;
    /** Valor financeiro pendente de recebimento (qtdEmTransito × precoUnitario) */
    valorEmTransito?: number;
    /** Total em alerta (qtd ≤ mínimo) — inclui os críticos */
    alertasEstoqueBaixo: number;
    /** Apenas os "baixos não-críticos" (entre 50% e 100% do mínimo) */
    alertasEstoqueBaixoNaoCritico?: number;
    /** Apenas os críticos (qtd ≤ 50% do mínimo) */
    alertasEstoqueCritico?: number;
    alertasVencendo: number;
    movimentacoesMes: number;
    solicitacoesPendentes: number;
    valorTotalEstimado: number;
}

export type StockStatus = 'CRITICO' | 'BAIXO' | 'OK' | 'SEM_MINIMO';

export const STOCK_STATUS_META: Record<StockStatus, { label: string; color: string; bg: string; border: string }> = {
    CRITICO:     { label: 'CRÍTICO',     color: '#991B1B', bg: '#FEE2E2', border: '#FCA5A5' },
    BAIXO:       { label: 'BAIXO',       color: '#92400E', bg: '#FEF3C7', border: '#FDE68A' },
    OK:          { label: 'OK',          color: '#065F46', bg: '#D1FAE5', border: '#A7F3D0' },
    SEM_MINIMO:  { label: 'SEM MÍNIMO',  color: '#475569', bg: '#F1F5F9', border: '#CBD5E1' },
};

export interface StockHistoryEntry {
    id: string;
    userId: string | null;
    action: string;
    tableName: string;
    recordId: string | null;
    oldData: Record<string, any> | null;
    newData: Record<string, any> | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
    } | null;
}

export interface StockHistoryResponse {
    data: StockHistoryEntry[];
    total: number;
    page: number;
    totalPages: number;
    scope: 'estoque';
}

// ═══════════════════════════════════════════════════════════════════
//   DTOs
// ═══════════════════════════════════════════════════════════════════

export interface CreateStockItemDto {
    nome: string;
    codigoInterno?: string;
    categoria: StockItemCategory;
    customCategoryId?: string | null;
    unidade: string;
    quantidadeAtual?: number;
    quantidadeMinima?: number;
    validade?: string;
    fornecedor?: string;
    precoUnitario?: number;
    localizacao?: string;
    fotoUrl?: string;
    observacoes?: string;
    conteudoQuantidade?: number | string;
    conteudoUnidade?: string;
}

export interface CreateStockCategoryDto {
    nome: string;
    icon: string;
    color: string;
    description?: string;
}

export type AjusteMode = 'SET' | 'DELTA';

export interface CreateMovementDto {
    type: StockMovementType;
    stockItemId: string;
    quantidade: number;
    fromTruckId?: string;
    toTruckId?: string;
    acaoId?: string;
    observacao?: string;
    /**
     * Apenas para AJUSTE:
     *  • SET (padrão): a quantidade vira o NOVO saldo (contagem física)
     *  • DELTA: a quantidade é decrementada do saldo atual
     */
    ajusteMode?: AjusteMode;
}

export interface CreatePurchaseRequestDto {
    stockItemId: string;
    quantidade: number;
    precoUnitario: number;
    fornecedor?: string;
    urgente?: boolean;
    justificativa: string;
    comprovanteUrl?: string;
}

/**
 * Dados de PR usados no endpoint combinado `/stock/items/with-purchase-request`.
 * Sem `stockItemId` porque o item ainda nem foi criado quando o request sai.
 */
export interface CreatePurchaseRequestInlineDto {
    quantidade: number;
    precoUnitario: number;
    fornecedor?: string;
    urgente?: boolean;
    justificativa: string;
    comprovanteUrl?: string;
}

export interface CreateItemWithPurchaseRequestDto {
    item: CreateStockItemDto;
    purchaseRequest: CreatePurchaseRequestInlineDto;
}

export interface CreateItemWithPurchaseRequestResponse {
    item: StockItem;
    purchaseRequest: StockPurchaseRequest;
}

export interface ReviewPurchaseRequestDto {
    reviewNote?: string;
    quantidadeAprovada?: number;
    precoUnitarioAprovado?: number;
}

// ═══════════════════════════════════════════════════════════════════
//   API CLIENT
// ═══════════════════════════════════════════════════════════════════

export const stockApi = {
    // ── Dashboard + Alerts ──────────────────────────────────────────
    dashboard: async (): Promise<StockDashboard> => {
        const r = await api.get<StockDashboard>('/stock/dashboard');
        return r.data;
    },

    financialDashboard: async (): Promise<any> => {
        const r = await api.get<any>('/stock/financials');
        return r.data;
    },

    alerts: {
        low: async (): Promise<StockItem[]> => {
            const r = await api.get<StockItem[]>('/stock/alerts/low');
            return r.data;
        },
        expiring: async (diasAteVencer = 30): Promise<StockItem[]> => {
            const r = await api.get<StockItem[]>(`/stock/alerts/expiring?diasAteVencer=${diasAteVencer}`);
            return r.data;
        },
    },

    // ── Itens ───────────────────────────────────────────────────────
    items: {
        getAll: async (filters?: {
            categoria?: StockItemCategory;
            customCategoryId?: string;
            search?: string;
            onlyLow?: boolean;
            onlyExpiring?: boolean;
            diasAteVencer?: number;
            includeInactive?: boolean;
            page?: number;
            limit?: number;
        }) => {
            const params = new URLSearchParams();
            if (filters?.categoria) params.append('categoria', filters.categoria);
            if (filters?.customCategoryId) params.append('customCategoryId', filters.customCategoryId);
            if (filters?.search) params.append('search', filters.search);
            if (filters?.onlyLow) params.append('onlyLow', 'true');
            if (filters?.onlyExpiring) params.append('onlyExpiring', 'true');
            if (filters?.diasAteVencer != null) params.append('diasAteVencer', String(filters.diasAteVencer));
            if (filters?.includeInactive) params.append('includeInactive', 'true');
            const paginated = wantsPaginatedStockQuery(filters);
            if (paginated) {
                if (filters?.page) params.append('page', String(filters.page));
                if (filters?.limit) params.append('limit', String(filters.limit));
            } else {
                params.append('page', '1');
                params.append('limit', '500');
            }
            const r = await api.get(`/stock/items?${params.toString()}`);
            const raw = r.data;
            return paginated ? raw : unwrapListData<StockItem>(raw);
        },

        financials: async (id: string): Promise<any> => {
            const r = await api.get<any>(`/stock/items/${id}/financials`);
            return r.data;
        },

        getOne: async (id: string): Promise<StockItem & {
            truckStocks: TruckStockItem[];
            movimentacoes: StockMovement[];
        }> => {
            const r = await api.get(`/stock/items/${id}`);
            return r.data;
        },

        create: async (data: CreateStockItemDto): Promise<StockItem> => {
            const r = await api.post<StockItem>('/stock/items', data);
            return r.data;
        },

        /**
         * Cria o item + Solicitação de Compra inicial em uma única chamada transacional.
         * Se a PR falhar (validação, regra), o item NÃO é criado — evita "item órfão sem
         * origem financeira". Use esta variante sempre que o atalho "Já gerar Solicitação"
         * estiver marcado no wizard.
         */
        createWithPurchaseRequest: async (
            dto: CreateItemWithPurchaseRequestDto,
        ): Promise<CreateItemWithPurchaseRequestResponse> => {
            const r = await api.post<CreateItemWithPurchaseRequestResponse>(
                '/stock/items/with-purchase-request',
                dto,
            );
            return r.data;
        },

        update: async (id: string, data: Partial<CreateStockItemDto>): Promise<StockItem> => {
            const r = await api.patch<StockItem>(`/stock/items/${id}`, data);
            return r.data;
        },

        delete: async (id: string): Promise<StockItem> => {
            const r = await api.delete<StockItem>(`/stock/items/${id}`);
            return r.data;
        },

        /**
         * Reativa um item desativado. Saldo volta zerado — para inserir estoque,
         * gere Solicitação de Compra depois. Usado quando o admin tenta criar com
         * `codigoInterno` de um item inativo (backend retorna `INACTIVE_ITEM_WITH_SAME_CODE`).
         */
        reactivate: async (id: string, data?: Partial<CreateStockItemDto>): Promise<StockItem> => {
            const r = await api.post<StockItem>(`/stock/items/${id}/reactivate`, data ?? {});
            return r.data;
        },

        uploadPhoto: async (file: File): Promise<{ url: string }> => {
            const form = new FormData();
            form.append('photo', file);
            const r = await api.post<{ url: string }>('/stock/items/upload-photo', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return r.data;
        },
    },

    // ── Saldo por Carreta ───────────────────────────────────────────
    trucks: {
        getStock: async (truckId: string): Promise<{
            truck: { id: string; identifier: string; licensePlate: string; status: string };
            stocks: TruckStockItem[];
        }> => {
            const r = await api.get(`/stock/trucks/${truckId}`);
            return r.data;
        },
        updateMinimo: async (truckId: string, stockItemId: string, min: number): Promise<{ quantidadeMinima: number }> => {
            const r = await api.patch<{ quantidadeMinima: number }>(`/stock/trucks/${truckId}/items/${stockItemId}/minimo`, { quantidadeMinima: min });
            return r.data;
        },
    },

    // ── Movimentações ───────────────────────────────────────────────
    movements: {
        create: async (data: CreateMovementDto): Promise<StockMovement> => {
            const r = await api.post<StockMovement>('/stock/movements', data);
            return r.data;
        },

        list: async (filters?: {
            type?: StockMovementType;
            stockItemId?: string;
            truckId?: string;
            acaoId?: string;
            from?: string;
            to?: string;
            limit?: number;
        }): Promise<StockMovement[]> => {
            const params = new URLSearchParams();
            if (filters?.type) params.append('type', filters.type);
            if (filters?.stockItemId) params.append('stockItemId', filters.stockItemId);
            if (filters?.truckId) params.append('truckId', filters.truckId);
            if (filters?.acaoId) params.append('acaoId', filters.acaoId);
            if (filters?.from) params.append('from', filters.from);
            if (filters?.to) params.append('to', filters.to);
            if (filters?.limit) params.append('limit', String(filters.limit));
            const r = await api.get<StockMovement[]>(`/stock/movements?${params.toString()}`);
            return r.data;
        },
    },

    // ── Reservas (kit de insumos previstos por ação) ────────────────
    reservations: {
        listByAcao: async (acaoId: string): Promise<ReservationsByAcaoResponse> => {
            const r = await api.get<ReservationsByAcaoResponse>(`/stock/acoes/${acaoId}/reservations`);
            return r.data;
        },

        upsertForAcao: async (
            acaoId: string,
            items: Array<{
                stockItemId: string;
                quantidadePrevista: number;
                truckId?: string;
                prioridade?: ReservationPrioridade;
                observacao?: string;
            }>,
        ): Promise<ReservationsByAcaoResponse> => {
            const r = await api.post<ReservationsByAcaoResponse>(
                `/stock/acoes/${acaoId}/reservations`,
                { items },
            );
            return r.data;
        },

        listByItem: async (stockItemId: string): Promise<ReservationsByItemResponse> => {
            const r = await api.get<ReservationsByItemResponse>(`/stock/items/${stockItemId}/reservations`);
            return r.data;
        },
    },

    // ── Consumo por ação (vínculo histórico item↔ação) ──────────────
    consumptionByItem: async (stockItemId: string): Promise<ConsumptionByItemResponse> => {
        const r = await api.get<ConsumptionByItemResponse>(`/stock/consumption/by-item/${stockItemId}`);
        return r.data;
    },

    consumptionByAcao: async (acaoId: string): Promise<any> => {
        const r = await api.get(`/stock/consumption/by-acao/${acaoId}`);
        return r.data;
    },

    // ── Fechamento de ciclo: baixa de estoque por ação ──────────────
    baixa: {
        status: async (acaoId: string): Promise<BaixaStatusResponse> => {
            const r = await api.get<BaixaStatusResponse>(`/stock/acoes/${acaoId}/baixa-status`);
            return r.data;
        },

        emLote: async (
            acaoId: string,
            items: BaixaItemPayload[],
            observacaoGlobal?: string,
        ): Promise<{ total: number; movimentacoes: any[]; mensagem: string }> => {
            const r = await api.post(`/stock/acoes/${acaoId}/baixa`, { items, observacaoGlobal });
            return r.data;
        },

        tratarSobra: async (
            acaoId: string,
            items: TratarSobraItemPayload[],
        ): Promise<{ total: number; decisoes: any[]; mensagem: string }> => {
            const r = await api.post(`/stock/acoes/${acaoId}/tratar-sobra`, { items });
            return r.data;
        },
    },

    // ── Dashboard agrupado (por categoria e por carreta) ───────────
    dashboardByCategory: async (): Promise<DashboardCategoryRow[]> => {
        const r = await api.get<DashboardCategoryRow[]>('/stock/dashboard/by-category');
        return r.data;
    },

    dashboardByTruck: async (): Promise<DashboardTruckRow[]> => {
        const r = await api.get<DashboardTruckRow[]>('/stock/dashboard/by-truck');
        return r.data;
    },

    // ── Categorias customizadas ─────────────────────────────────────
    categories: {
        list: async (includeInactive = false): Promise<StockCategory[]> => {
            const params = new URLSearchParams();
            if (includeInactive) params.append('includeInactive', 'true');
            const r = await api.get<StockCategory[]>(`/stock/categories?${params.toString()}`);
            // Os 8 legados são enum do sistema e nunca devem depender da seed da tabela.
            // A tabela adiciona apenas categorias customizadas criadas pelo admin.
            return mergeWithDefaultCategories(r.data);
        },

        create: async (data: CreateStockCategoryDto): Promise<StockCategory> => {
            const r = await api.post<StockCategory>('/stock/categories', data);
            return r.data;
        },

        update: async (
            id: string,
            data: Partial<CreateStockCategoryDto> & { active?: boolean },
        ): Promise<StockCategory> => {
            const r = await api.patch<StockCategory>(`/stock/categories/${id}`, data);
            return r.data;
        },

        deactivate: async (id: string): Promise<StockCategory> => {
            const r = await api.patch<StockCategory>(`/stock/categories/${id}`, { active: false });
            return r.data;
        },
    },

    // ── Solicitações de Compra ──────────────────────────────────────
    purchaseRequests: {
        create: async (data: CreatePurchaseRequestDto): Promise<StockPurchaseRequest> => {
            const r = await api.post<StockPurchaseRequest>('/stock/purchase-requests', data);
            return r.data;
        },

        list: async (filters?: {
            status?: StockPurchaseRequestStatus;
            stockItemId?: string;
            onlyMine?: boolean;
            page?: number;
            limit?: number;
        }) => {
            const params = new URLSearchParams();
            if (filters?.status) params.append('status', filters.status);
            if (filters?.stockItemId) params.append('stockItemId', filters.stockItemId);
            if (filters?.onlyMine) params.append('onlyMine', 'true');
            const paginated = wantsPaginatedStockQuery(filters);
            if (paginated) {
                if (filters?.page) params.append('page', String(filters.page));
                if (filters?.limit) params.append('limit', String(filters.limit));
            } else {
                params.append('page', '1');
                params.append('limit', '500');
            }
            const r = await api.get(`/stock/purchase-requests?${params.toString()}`);
            const raw = r.data;
            return paginated ? raw : unwrapListData<StockPurchaseRequest>(raw);
        },

        getOne: async (id: string): Promise<StockPurchaseRequest> => {
            const r = await api.get<StockPurchaseRequest>(`/stock/purchase-requests/${id}`);
            return r.data;
        },

        approve: async (id: string, data: ReviewPurchaseRequestDto = {}): Promise<StockPurchaseRequest> => {
            const r = await api.patch<StockPurchaseRequest>(`/stock/purchase-requests/${id}/approve`, data);
            return r.data;
        },

        reject: async (id: string, reviewNote: string): Promise<StockPurchaseRequest> => {
            const r = await api.patch<StockPurchaseRequest>(`/stock/purchase-requests/${id}/reject`, { reviewNote });
            return r.data;
        },

        /**
         * Marca uma solicitação APROVADA como RECEBIDA fisicamente.
         * Dispara: decrementa quantidadeEmTransito + incrementa quantidadeAtual + cria REPOSICAO.
         * É idempotente — chamar de novo em uma PR já RECEBIDA retorna o estado atual sem erro.
         * Também é disparada automaticamente quando a ContaPagar vinculada é marcada como paga.
         */
        confirmReceipt: async (id: string): Promise<StockPurchaseRequest> => {
            const r = await api.post<StockPurchaseRequest>(`/stock/purchase-requests/${id}/confirm-receipt`);
            return r.data;
        },

        cancel: async (id: string): Promise<StockPurchaseRequest> => {
            const r = await api.delete<StockPurchaseRequest>(`/stock/purchase-requests/${id}`);
            return r.data;
        },
    },

    // ── Histórico unificado / Auditoria ────────────────────────────
    history: async (filters?: {
        action?: string;
        tableName?: string;
        userId?: string;
        recordId?: string;
        stockItemId?: string;
        from?: string;
        to?: string;
        page?: number;
        limit?: number;
    }): Promise<StockHistoryResponse> => {
        const params = new URLSearchParams();
        if (filters?.action) params.append('action', filters.action);
        if (filters?.tableName) params.append('tableName', filters.tableName);
        if (filters?.userId) params.append('userId', filters.userId);
        if (filters?.recordId) params.append('recordId', filters.recordId);
        if (filters?.stockItemId) params.append('stockItemId', filters.stockItemId);
        if (filters?.from) params.append('from', filters.from);
        if (filters?.to) params.append('to', filters.to);
        if (filters?.page) params.append('page', String(filters.page));
        if (filters?.limit) params.append('limit', String(filters.limit));
        const r = await api.get<StockHistoryResponse>(`/stock/history?${params.toString()}`);
        return r.data;
    },
};

// ═══════════════════════════════════════════════════════════════════
//   UI HELPERS
// ═══════════════════════════════════════════════════════════════════

export const CATEGORIA_LABEL: Record<StockItemCategory, string> = {
    CONSUMIVEL:           'Consumível',
    DIDATICO:             'Didático',
    LIMPEZA:              'Limpeza',
    EQUIPAMENTO:          'Equipamento',
    EPI:                  'EPI',
    ALIMENTACAO:          'Alimentação',
    ESCRITORIO:           'Escritório',
    MATERIAL_FABRICACAO:  'Materiais para Fabricação',
    OUTRO:                'Outro',
};

export const CATEGORIA_COLOR: Record<StockItemCategory, string> = {
    CONSUMIVEL:          '#0891B2',
    DIDATICO:            '#7C3AED',
    LIMPEZA:             '#059669',
    EQUIPAMENTO:         '#EA580C',
    EPI:                 '#DC2626',
    ALIMENTACAO:         '#D97706',
    ESCRITORIO:          '#6366F1',
    MATERIAL_FABRICACAO: '#B89B00',
    OUTRO:               '#6B7280',
};

export const CATEGORIA_ICON: Record<StockItemCategory, string> = {
    CONSUMIVEL:          '📦',
    DIDATICO:            '📘',
    LIMPEZA:             '🧴',
    EQUIPAMENTO:         '🔧',
    EPI:                 '🦺',
    ALIMENTACAO:         '🍱',
    ESCRITORIO:          '✏️',
    MATERIAL_FABRICACAO: '🏭',
    OUTRO:               '❔',
};

/**
 * Resolve a apresentação visual da categoria de um item.
 * Se o item tem `customCategory` (custom criada pelo admin), usa seus campos.
 * Caso contrário cai no enum default (CATEGORIA_LABEL/COLOR/ICON).
 */
export function resolveCategoria(item: Pick<StockItem, 'categoria' | 'customCategory'>): {
    label: string;
    icon: string;
    color: string;
    isCustom: boolean;
} {
    if (item.customCategory) {
        return {
            label: item.customCategory.nome,
            icon: item.customCategory.icon,
            color: item.customCategory.color,
            isCustom: true,
        };
    }
    return {
        label: CATEGORIA_LABEL[item.categoria],
        icon: CATEGORIA_ICON[item.categoria],
        color: CATEGORIA_COLOR[item.categoria],
        isCustom: false,
    };
}

export const MOV_TYPE_LABEL: Record<StockMovementType, string> = {
    ENTRADA: 'Entrada (Central → Carreta)',
    SAIDA: 'Saída (Consumo em Ação)',
    TRANSFERENCIA: 'Transferência entre Carretas',
    DEVOLUCAO: 'Devolução (Carreta → Central)',
    AJUSTE: 'Ajuste de Inventário',
    PERDA: 'Perda / Baixa',
    REPOSICAO: 'Reposição (Recebimento)',
    ENCOMENDA: 'Encomenda (Aguardando recebimento)',
};

export const MOV_TYPE_COLOR: Record<StockMovementType, string> = {
    ENTRADA:       '#0891B2',
    SAIDA:         '#EA580C',
    TRANSFERENCIA: '#7C3AED',
    DEVOLUCAO:     '#059669',
    AJUSTE:        '#D97706',
    PERDA:         '#DC2626',
    REPOSICAO:     '#10B981',
    ENCOMENDA:     '#3B82F6',
};

export const MOV_TYPE_ICON: Record<StockMovementType, string> = {
    ENTRADA:       '⬇️',
    SAIDA:         '➡️',
    TRANSFERENCIA: '🔄',
    DEVOLUCAO:     '⬆️',
    AJUSTE:        '⚖️',
    PERDA:         '⚠️',
    REPOSICAO:     '🛒',
    ENCOMENDA:     '📦',
};

export const PURCHASE_STATUS_LABEL: Record<StockPurchaseRequestStatus, string> = {
    PENDENTE: 'Pendente análise',
    APROVADA: 'Em trânsito (aguardando recebimento/pagamento)',
    RECEBIDA: 'Recebida (saldo aplicado)',
    REJEITADA: 'Rejeitada',
    CANCELADA: 'Cancelada',
};

export const PURCHASE_STATUS_COLOR: Record<StockPurchaseRequestStatus, string> = {
    PENDENTE:  '#FFD600',
    APROVADA:  '#3B82F6',
    RECEBIDA:  '#10B981',
    REJEITADA: '#EF4444',
    CANCELADA: '#6B7280',
};

export { AUDIT_ACTION_META, auditActionMeta } from '@/lib/auditLabels';

/** Helper para checar se item está com estoque baixo (inclui crítico) */
export function isLowStock(item: StockItem): boolean {
    const min = Number(item.quantidadeMinima);
    if (min <= 0) return false;
    return Number(item.quantidadeAtual) <= min;
}

/** Helper para checar se item está em estado CRÍTICO (≤ 50% do mínimo). */
export function isCriticalStock(item: StockItem): boolean {
    const min = Number(item.quantidadeMinima);
    if (min <= 0) return false;
    return Number(item.quantidadeAtual) <= min * 0.5;
}

/**
 * Retorna o status visual de um item baseado em qtd atual × qtd mínima.
 * Espelha exatamente a regra usada no backend (lowStockAlerts).
 */
export function getStockStatus(item: StockItem): StockStatus {
    const atual = Number(item.quantidadeAtual);
    const minimo = Number(item.quantidadeMinima);
    if (minimo <= 0) return 'SEM_MINIMO';
    if (atual <= minimo * 0.5) return 'CRITICO';
    if (atual <= minimo) return 'BAIXO';
    return 'OK';
}

/** Helper para checar dias até vencimento */
export function daysUntilExpiry(item: StockItem): number | null {
    if (!item.validade) return null;
    const v = new Date(item.validade);
    const now = new Date();
    return Math.floor((v.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getGlobalStockQuantity(item: any): number {
    const central = Number(item.quantidadeAtual || 0);
    const carretas = (item.truckStocks || []).reduce((acc: any, ts: any) => acc + Number(ts.quantidadeAtual || 0), 0);
    return central + carretas;
}
