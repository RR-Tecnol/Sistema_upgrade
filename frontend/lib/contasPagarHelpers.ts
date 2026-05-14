/**
 * Helpers compartilhados pela UI de Contas a Pagar (lista, modal de criação,
 * modal de rastreio/detalhe). Antes esses helpers viviam apenas na page.tsx
 * — extraídos aqui para reuso e para evitar dependência circular.
 */
import type { ContaPagar } from './api/contasPagar';

export const STATUS_CFG = {
    pendente: { label: 'Pendente', icon: '⏳', color: '#D97706', bg: 'rgba(251,191,36,.12)', border: 'rgba(251,191,36,.35)' },
    paga: { label: 'Paga', icon: '✅', color: '#059669', bg: 'rgba(16,185,129,.1)', border: 'rgba(16,185,129,.35)' },
    vencida: { label: 'Vencida', icon: '🔴', color: '#DC2626', bg: 'rgba(239,68,68,.1)', border: 'rgba(239,68,68,.35)' },
    cancelada: { label: 'Cancelada', icon: '🚫', color: '#6B7280', bg: 'rgba(107,114,128,.1)', border: 'rgba(107,114,128,.3)' },
} as const;

export type ContaStatus = keyof typeof STATUS_CFG;

export const REIMBURSEMENT_CATEGORY_LABELS: Record<string, string> = {
    CLASSROOM_MATERIAL: 'Material de aula',
    CLEANING_MATERIAL: 'Material de limpeza',
    EMERGENCY_REPAIR: 'Reparo emergencial',
    FOOD: 'Alimentação',
    OTHER: 'Outro',
};

export type ReimbursementMeta = {
    isReimbursement: boolean;
    reimbursementId?: string;
    category?: string;
    reason?: string;
};

/**
 * Lê a observação da conta e tenta extrair metadados estruturados de uma
 * solicitação de reembolso. Suporta formato legado e formato novo (key=value).
 * Não acessa o backend — toda info já vem em `conta.observacoes`.
 */
export function parseReimbursementMeta(conta: Pick<ContaPagar, 'observacoes' | 'descricao'>): ReimbursementMeta {
    const raw = conta.observacoes || '';
    const markerMatch = raw.match(/reimbursementId:([a-f0-9-]{8,})/i);
    const normalizedIdMatch = raw.match(/reimbursementId=([a-f0-9-]{8,})/i);
    const reimbursementId = markerMatch?.[1] || normalizedIdMatch?.[1];

    const legacy = raw.match(/Categoria:\s*([^|]+)\s*\|\s*Motivo:\s*([^|]+)\s*\|\s*reimbursementId:([a-f0-9-]+)/i);
    if (legacy) {
        return {
            isReimbursement: true,
            category: legacy[1]?.trim(),
            reason: legacy[2]?.trim(),
            reimbursementId: legacy[3]?.trim(),
        };
    }

    const looksLikeReimbursement =
        /origem\s*=\s*reembolso/i.test(raw) ||
        /Reembolso de Despesas/i.test(conta.descricao || '') ||
        !!reimbursementId;
    if (!looksLikeReimbursement) return { isReimbursement: false };

    const categoryMatch = raw.match(/categoria\s*=\s*([^|]+)/i);
    const reasonMatch = raw.match(/motivo\s*=\s*([^|]+)/i);
    const reasonFromDescription = (conta.descricao || '').includes(' — ')
        ? (conta.descricao || '').split(' — ').slice(1).join(' — ').trim()
        : undefined;
    return {
        isReimbursement: true,
        reimbursementId,
        category: categoryMatch?.[1]?.trim(),
        reason: reasonMatch?.[1]?.trim() || reasonFromDescription,
    };
}

export const fmtCur = (v: number | string) =>
    Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (d?: string | null) =>
    d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

/**
 * Remove blocos técnicos da observação que estão lá só para parsing
 * (reimbursementId=…, origem=…, categoria=…, motivo=…). Devolve só o
 * texto livre que faz sentido para um auditor humano ler.
 */
export function humanizeObservacoes(raw?: string | null): string {
    if (!raw) return '';
    const semChaves = raw
        .replace(/reimbursementId[:=]\s*[a-f0-9-]+/gi, '')
        .replace(/origem\s*=\s*[^|]+/gi, '')
        .replace(/categoria\s*=\s*[^|]+/gi, '')
        .replace(/motivo\s*=\s*[^|]+/gi, '')
        .replace(/\|\s*\|+/g, '|')
        .replace(/^\s*\|+|\|+\s*$/g, '')
        .trim();
    return semChaves;
}

/**
 * Detecta chips estruturados nas observações ("Fornecedor: X | Solicitante: id").
 * Devolve uma lista de pares legíveis SEM UUIDs (substituídos por placeholder).
 */
export function extractObservacoesChips(raw?: string | null): Array<{ label: string; value: string }> {
    if (!raw) return [];
    const chips: Array<{ label: string; value: string }> = [];
    raw.split('|').forEach((part) => {
        const m = part.match(/^\s*([A-Za-zÀ-ÿ ]+)\s*:\s*(.+?)\s*$/);
        if (!m) return;
        const label = m[1].trim();
        let value = m[2].trim();
        // Substitui UUID nu por marcador legível
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
            value = '(identificador interno omitido)';
        }
        if (label && value && !/^reimbursementId$/i.test(label) && !/^origem$/i.test(label) && !/^categoria$/i.test(label) && !/^motivo$/i.test(label)) {
            chips.push({ label, value });
        }
    });
    return chips;
}
