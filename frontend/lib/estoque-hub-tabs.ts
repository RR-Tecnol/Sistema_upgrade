import type { StockPurchaseRequestStatus } from '@/lib/api/stock';

/**
 * Tabs canónicas do hub /admin/estoque (layout Gestão sobre Rodas).
 */
export const ESTOQUE_HUB_TABS = [
    'solicitacoes',
    'central',
    'caminhao',
    'movimentacoes',
    'financeiro',
    
] as const;

export type EstoqueHubTab = (typeof ESTOQUE_HUB_TABS)[number];

export function normalizeEstoqueHubTab(raw: string | null | undefined): EstoqueHubTab {
    const v = (raw || '').toLowerCase();
    if (ESTOQUE_HUB_TABS.includes(v as EstoqueHubTab)) return v as EstoqueHubTab;
    return 'central';
}

const PR_TAB_STATUSES: readonly StockPurchaseRequestStatus[] = [
    'PENDENTE',
    'APROVADA',
    'RECEBIDA',
    'REJEITADA',
    'CANCELADA',
];

/** `?status=` na aba Solicitações do hub (ex.: APROVADA). */
export function parseEstoqueHubPrStatus(raw: string | null | undefined): StockPurchaseRequestStatus | undefined {
    if (!raw) return undefined;
    const v = raw.toUpperCase();
    return PR_TAB_STATUSES.includes(v as StockPurchaseRequestStatus) ? (v as StockPurchaseRequestStatus) : undefined;
}
