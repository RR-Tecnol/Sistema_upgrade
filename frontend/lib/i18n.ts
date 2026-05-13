/**
 * Catálogo central de traduções compartilhadas pela UI.
 *
 * Antes desse arquivo, cada página tinha o seu próprio dicionário de enums →
 * label. Isso causava divergências (mesma role aparecia como "Admin" numa tela
 * e "Administrador" em outra). Centralizando aqui garantimos um único nome para
 * cada termo em todo o sistema.
 *
 * Use os helpers (`roleLabel`, `prStatusLabel`, etc.) em vez de acessar o map
 * direto — assim cobrimos o caso "valor inesperado" com um fallback amigável.
 */

export const ROLE_LABEL: Record<string, string> = {
    ADMIN: 'Administrador',
    IT_ADMIN: 'Admin TI',
    COORDINATOR: 'Coordenador',
    FINANCIAL: 'Financeiro',
    DRIVER: 'Motorista',
    TEACHER: 'Professor',
    STUDENT: 'Aluno',
};

export function roleLabel(role?: string | null): string {
    if (!role) return '—';
    return ROLE_LABEL[role] ?? role;
}

// ── Solicitação de Compra ──────────────────────────────────────────────
export const PURCHASE_REQUEST_STATUS_LABEL: Record<string, string> = {
    PENDENTE: 'Pendente de análise',
    APROVADA: 'Aprovada (em trânsito)',
    RECEBIDA: 'Recebida no estoque',
    REJEITADA: 'Rejeitada',
    CANCELADA: 'Cancelada',
};

export function prStatusLabel(status?: string | null): string {
    if (!status) return '—';
    return PURCHASE_REQUEST_STATUS_LABEL[status] ?? status;
}

// ── Movimentações de estoque ──────────────────────────────────────────
export const STOCK_MOVEMENT_TYPE_LABEL: Record<string, string> = {
    ENTRADA: 'Entrada (central → carreta)',
    SAIDA: 'Saída (consumo em ação)',
    TRANSFERENCIA: 'Transferência (carreta → carreta)',
    DEVOLUCAO: 'Devolução (carreta → central)',
    AJUSTE: 'Ajuste manual',
    PERDA: 'Perda / descarte',
    REPOSICAO: 'Reposição (compra aprovada)',
    ENCOMENDA: 'Encomenda interna',
};

export function movementTypeLabel(type?: string | null): string {
    if (!type) return '—';
    return STOCK_MOVEMENT_TYPE_LABEL[type] ?? type;
}

// ── Conta a pagar ─────────────────────────────────────────────────────
export const CONTA_PAGAR_STATUS_LABEL: Record<string, string> = {
    pendente: 'Pendente',
    paga: 'Paga',
    vencida: 'Vencida',
    cancelada: 'Cancelada',
};

export function contaPagarStatusLabel(status?: string | null): string {
    if (!status) return '—';
    return CONTA_PAGAR_STATUS_LABEL[status] ?? status;
}

// ── Status de Ação ────────────────────────────────────────────────────
export const ACAO_STATUS_LABEL: Record<string, string> = {
    PLANEJADA: 'Planejada',
    EM_ANDAMENTO: 'Em andamento',
    CONCLUIDA: 'Concluída',
    CANCELADA: 'Cancelada',
};

export function acaoStatusLabel(status?: string | null): string {
    if (!status) return '—';
    return ACAO_STATUS_LABEL[status] ?? status;
}

// ── Status de Carreta ─────────────────────────────────────────────────
export const TRUCK_STATUS_LABEL: Record<string, string> = {
    AVAILABLE: 'Disponível',
    IN_USE: 'Em uso',
    MAINTENANCE: 'Em manutenção',
    INACTIVE: 'Inativa',
};

export function truckStatusLabel(status?: string | null): string {
    if (!status) return '—';
    return TRUCK_STATUS_LABEL[status] ?? status;
}
