/**
 * Rótulos em português para AuditLog (ação, módulo/tabela, perfil).
 * Usado em admin/historico e reutilizado pelo módulo de estoque.
 */

export type AuditActionMeta = { label: string; color: string; icon: string };

/** Ações de estoque e demais módulos — chave = valor gravado no banco. */
export const AUDIT_ACTION_META: Record<string, AuditActionMeta> = {
    // —— Estoque: itens ——
    STOCK_ITEM_CREATE: { label: 'Item cadastrado', color: '#0891B2', icon: '📦' },
    STOCK_ITEM_UPDATE: { label: 'Item editado', color: '#6366F1', icon: '✏️' },
    STOCK_ITEM_DEACTIVATE: { label: 'Item desativado', color: '#6B7280', icon: '🚫' },
    STOCK_ITEM_REACTIVATE: { label: 'Item reativado', color: '#10B981', icon: '♻️' },
    // —— Estoque: categorias ——
    STOCK_CATEGORY_CREATE: { label: 'Categoria criada', color: '#7C3AED', icon: '🏷️' },
    STOCK_CATEGORY_UPDATE: { label: 'Categoria editada', color: '#7C3AED', icon: '🏷️' },
    // —— Estoque: movimentações ——
    STOCK_MOVEMENT_ENTRADA: { label: 'Entrada (central → carreta)', color: '#0891B2', icon: '⬇️' },
    STOCK_MOVEMENT_SAIDA: { label: 'Saída (consumo)', color: '#EA580C', icon: '➡️' },
    STOCK_MOVEMENT_TRANSFERENCIA: { label: 'Transferência entre carretas', color: '#7C3AED', icon: '🔄' },
    STOCK_MOVEMENT_DEVOLUCAO: { label: 'Devolução (carreta → central)', color: '#059669', icon: '⬆️' },
    STOCK_MOVEMENT_AJUSTE: { label: 'Ajuste de inventário', color: '#D97706', icon: '⚖️' },
    STOCK_MOVEMENT_PERDA: { label: 'Perda / baixa', color: '#DC2626', icon: '⚠️' },
    STOCK_MOVEMENT_REPOSICAO: { label: 'Reposição (compra)', color: '#10B981', icon: '🛒' },
    STOCK_MOVEMENT_ENCOMENDA: { label: 'Encomenda aguardando recebimento', color: '#3B82F6', icon: '📦' },
    // —— Estoque: solicitações de compra ——
    STOCK_PURCHASE_REQUEST_CREATE: { label: 'Solicitação de compra criada', color: '#FFD600', icon: '📝' },
    STOCK_PURCHASE_REQUEST_APPROVE: { label: 'Solicitação de compra aprovada', color: '#10B981', icon: '✅' },
    STOCK_PURCHASE_REQUEST_RECEIVE: { label: 'Compra recebida no estoque', color: '#10B981', icon: '📥' },
    STOCK_PURCHASE_REQUEST_REJECT: { label: 'Solicitação de compra rejeitada', color: '#EF4444', icon: '❌' },
    STOCK_PURCHASE_REQUEST_CANCEL: { label: 'Solicitação de compra cancelada', color: '#6B7280', icon: '🚫' },
    STOCK_RESERVATION_KEPT: { label: 'Sobra mantida na carreta', color: '#7C3AED', icon: '🚛' },
    STOCK_RESERVATION_UPSERT: { label: 'Reserva de estoque atualizada', color: '#7C3AED', icon: '📋' },
    // —— Inscrições ——
    APPROVE_ENROLLMENT: { label: 'Inscrição aprovada', color: '#059669', icon: '✅' },
    REJECT_ENROLLMENT: { label: 'Inscrição rejeitada', color: '#DC2626', icon: '❌' },
    CONFIRM_ENROLLMENT: { label: 'Inscrição confirmada', color: '#0891B2', icon: '📋' },
    // —— Frequência ——
    ATTENDANCE_TEACHER_RETROACTIVE_SLOT: {
        label: 'Frequência retroativa (horário)',
        color: '#D97706',
        icon: '📅',
    },
    ATTENDANCE_TEACHER_RETROACTIVE_BULK: {
        label: 'Frequência retroativa (lote)',
        color: '#D97706',
        icon: '📅',
    },
};

/** Módulos (tableName do Prisma) → nome legível. */
export const AUDIT_TABLE_LABELS: Record<string, string> = {
    stock_items: 'Itens de estoque',
    stock_movements: 'Movimentações de estoque',
    stock_purchase_requests: 'Solicitações de compra',
    stock_categories: 'Categorias de estoque',
    acao_stock_reservations: 'Reservas do período (kit)',
    users: 'Usuários',
    enrollments: 'Inscrições',
    employees: 'Funcionários',
    trips: 'Viagens',
    classes: 'Turmas',
    courses: 'Cursos',
    reimbursements: 'Reembolsos',
    certificates: 'Certificados',
    notifications: 'Notificações',
    acoes: 'Períodos de curso',
    contas_pagar: 'Contas a pagar',
    trucks: 'Carretas',
    groups: 'Grupos',
    cities: 'Cidades',
};

/** Perfis de usuário → português. */
export const USER_ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Administrador',
    COORDINATOR: 'Coordenador',
    FINANCIAL: 'Financeiro',
    TEACHER: 'Professor',
    DRIVER: 'Motorista',
    STUDENT: 'Aluno',
};

/** Opções do filtro por módulo (histórico global). */
export const AUDIT_MODULE_FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'Todos os módulos' },
    { value: 'stock_items', label: AUDIT_TABLE_LABELS.stock_items },
    { value: 'stock_movements', label: AUDIT_TABLE_LABELS.stock_movements },
    { value: 'stock_purchase_requests', label: AUDIT_TABLE_LABELS.stock_purchase_requests },
    { value: 'stock_categories', label: AUDIT_TABLE_LABELS.stock_categories },
    { value: 'acao_stock_reservations', label: AUDIT_TABLE_LABELS.acao_stock_reservations },
    { value: 'enrollments', label: AUDIT_TABLE_LABELS.enrollments },
    { value: 'classes', label: AUDIT_TABLE_LABELS.classes },
    { value: 'trips', label: AUDIT_TABLE_LABELS.trips },
    { value: 'employees', label: AUDIT_TABLE_LABELS.employees },
    { value: 'users', label: AUDIT_TABLE_LABELS.users },
    { value: 'reimbursements', label: AUDIT_TABLE_LABELS.reimbursements },
    { value: 'certificates', label: AUDIT_TABLE_LABELS.certificates },
    { value: 'notifications', label: AUDIT_TABLE_LABELS.notifications },
];

function humanizeActionKey(action: string): string {
    return (
        action
            .replace(/^STOCK_/, '')
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, c => c.toUpperCase()) || 'Evento registrado'
    );
}

export function resolveAuditActionMeta(action: string): AuditActionMeta {
    if (AUDIT_ACTION_META[action]) return AUDIT_ACTION_META[action];
    return {
        label: humanizeActionKey(action),
        color: '#6B7280',
        icon: '📌',
    };
}

/** @deprecated Use resolveAuditActionMeta — alias para compatibilidade com estoque. */
export function auditActionMeta(action: string): AuditActionMeta {
    return resolveAuditActionMeta(action);
}

export function formatAuditAction(action: string): string {
    return resolveAuditActionMeta(action).label;
}

export function formatAuditTable(tableName: string): string {
    if (!tableName) return '—';
    return AUDIT_TABLE_LABELS[tableName] ?? tableName.replace(/_/g, ' ');
}

export function formatUserRole(role: string | undefined | null): string {
    if (!role) return '';
    return USER_ROLE_LABELS[role] ?? role;
}

export function getAuditActionStyle(action: string): { bg: string; color: string } {
    const meta = resolveAuditActionMeta(action);
    return { bg: `${meta.color}22`, color: meta.color };
}
