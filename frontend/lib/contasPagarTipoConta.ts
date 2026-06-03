/**
 * Catálogo de `tipo_conta` no UPGRADE — custos de estrada, habituais, integrações e geração automática.
 * Manter alinhado com backend (strings em Prisma são livres; estes slugs são os usados no código).
 */

export type TipoContaVisual = {
    value: string;
    label: string;
    icon: string;
    color: string;
};

/** Dedupe mantendo a primeira ocorrência (evita `manutencao` duplicado entre integrações e TIPOS_ESTRADA). */
function dedupePreserveOrder(slugs: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of slugs) {
        if (!seen.has(s)) {
            seen.add(s);
            out.push(s);
        }
    }
    return out;
}

/** Custos de estrada / operação rodoviária — entrada manual típica no admin. */
export const TIPOS_ESTRADA: TipoContaVisual[] = [
    { value: 'pneu_furado', label: 'Pneu furado', icon: '🛞', color: '#DC3545' },
    { value: 'troca_oleo', label: 'Troca de óleo', icon: '🛢️', color: '#F97316' },
    { value: 'abastecimento', label: 'Combustível (abastecimento)', icon: '⛽', color: '#10B981' },
    { value: 'manutencao_mecanica', label: 'Manutenção mecânica', icon: '🔧', color: '#6366F1' },
    { value: 'manutencao', label: 'Manutenção carreta', icon: '🛠️', color: '#7C3AED' },
    { value: 'reboque', label: 'Reboque', icon: '🚛', color: '#EC4899' },
    { value: 'lavagem', label: 'Lavagem', icon: '🧼', color: '#06B6D4' },
    { value: 'pedagio', label: 'Pedágio', icon: '🛣️', color: '#84CC16' },
    { value: 'alimentacao', label: 'Alimentação (rota)', icon: '🍽️', color: '#EA580C' },
    { value: 'hospedagem', label: 'Hospedagem', icon: '🛏️', color: '#7C2D12' },
    { value: 'estacionamento', label: 'Estacionamento', icon: '🅿️', color: '#475569' },
    { value: 'seguro_veiculo', label: 'Seguro veículo', icon: '📋', color: '#0D9488' },
    { value: 'material_pedagogico', label: 'Material pedagógico', icon: '📚', color: '#7C3AED' },
];

/** Contas habituais — manual. */
export const TIPOS_HABITUAL: TipoContaVisual[] = [
    { value: 'agua', label: 'Água', icon: '💧', color: '#3B82F6' },
    { value: 'energia', label: 'Energia', icon: '⚡', color: '#F59E0B' },
    { value: 'aluguel', label: 'Aluguel', icon: '🏠', color: '#8B5CF6' },
    { value: 'internet', label: 'Internet', icon: '🌐', color: '#10B981' },
    { value: 'telefone', label: 'Telefone', icon: '📱', color: '#06B6D4' },
];

/** Outros + tipos que o backend gera automaticamente. */
export const TIPOS_OUTROS: TipoContaVisual[] = [
    { value: 'funcionario', label: 'Funcionário / RH / reembolso', icon: '👤', color: '#2563EB' },
    { value: 'feedback_pix', label: 'Feedback / PIX', icon: '✨', color: '#EC4899' },
    { value: 'diaria_funcionario', label: 'Diária (ação)', icon: '📄', color: '#64748B' },
    { value: 'estoque_reposicao', label: 'Reposição de estoque', icon: '🛒', color: '#F59E0B' },
    { value: 'espontaneo', label: 'Personalizado', icon: '✨', color: '#A855F7' },
    { value: 'outros', label: 'Outros', icon: '📦', color: '#64748B' },
];

export const TODOS_TIPOS: TipoContaVisual[] = [...TIPOS_ESTRADA, ...TIPOS_HABITUAL, ...TIPOS_OUTROS];

/**
 * Origem no código — tooltips nos KPIs.
 * Integrações automáticas: feedback_pix, diaria_funcionario, manutencao (manutenção carreta), funcionario (reembolso aprovado).
 */
export const ORIGEM_TIPO_CONTA: Record<string, { modulo: string; notas: string }> = {
    feedback_pix: { modulo: 'feedbacks.service', notas: 'Aprovação PIX + createMissingContaPagar' },
    diaria_funcionario: { modulo: 'acoes.service', notas: 'EM_ANDAMENTO, vínculo e dias do funcionário' },
    estoque_reposicao: {
        modulo: 'stock.service',
        notas: 'Gerada automaticamente quando uma Solicitação de Compra é aprovada por administrador. Origem: /admin/estoque/solicitacoes.',
    },
    manutencao: { modulo: 'truck-maintenance.service', notas: 'Custo no registo de manutenção da carreta' },
    funcionario: {
        modulo: 'reimbursement.service | admin',
        notas: 'Reembolso aprovado (categoria em observações, ex. FOOD); lançamentos manuais RH',
    },
    pneu_furado: { modulo: 'admin / CRUD', notas: 'Manual ou seed' },
    troca_oleo: { modulo: 'admin / CRUD', notas: 'Manual ou seed' },
    abastecimento: {
        modulo: 'acoes.service',
        notas: 'Abastecimento no período (+ AcaoCusto) ou CRUD manual',
    },
    outros: {
        modulo: 'acoes.service | admin / CRUD',
        notas: 'Despesa geral do período ou lançamento manual',
    },
    manutencao_mecanica: { modulo: 'admin / CRUD', notas: 'Manual' },
    reboque: { modulo: 'admin / CRUD', notas: 'Manual' },
    lavagem: { modulo: 'admin / CRUD', notas: 'Manual' },
    pedagio: { modulo: 'admin / CRUD', notas: 'Manual' },
    alimentacao: { modulo: 'admin / CRUD', notas: 'Refeição em rota (sem reembolso)' },
    hospedagem: { modulo: 'admin / CRUD', notas: 'Hotel / pernoite' },
    estacionamento: { modulo: 'admin / CRUD', notas: 'Estacionamento / zona azul' },
    seguro_veiculo: { modulo: 'admin / CRUD', notas: 'Seguro da frota' },
    material_pedagogico: { modulo: 'admin / CRUD', notas: 'Material de aula / didático' },
    agua: { modulo: 'admin / CRUD', notas: 'Manual ou seed' },
    energia: { modulo: 'admin / CRUD', notas: 'Manual' },
    aluguel: { modulo: 'admin / CRUD', notas: 'Manual' },
    internet: { modulo: 'admin / CRUD', notas: 'Manual' },
    telefone: { modulo: 'admin / CRUD', notas: 'Manual' },
    espontaneo: { modulo: 'admin / CRUD', notas: 'Usa tipo_espontaneo' },
};

/** Ordem dos cartões KPI: integrações → estrada → habituais → genéricos (dedupe final). */
export const ORDEM_KPI_TIPOS: string[] = dedupePreserveOrder([
    'feedback_pix',
    'diaria_funcionario',
    'manutencao',
    'funcionario',
    'estoque_reposicao',
    ...TIPOS_ESTRADA.map(t => t.value),
    ...TIPOS_HABITUAL.map(t => t.value),
    'espontaneo',
    'outros',
]);

export function getTipo(v: string): TipoContaVisual {
    return TODOS_TIPOS.find(t => t.value === v) ?? {
        value: v,
        label: v.replace(/_/g, ' '),
        icon: '📄',
        color: '#6B7280',
    };
}

export type AgregadoTipo = {
    tipo: string;
    total: number;
    count: number;
    valorPendente: number;
    valorPago: number;
    countPendente: number;
    countPago: number;
};

export function agregadoVazio(slug: string): AgregadoTipo {
    return {
        tipo: slug,
        total: 0,
        count: 0,
        valorPendente: 0,
        valorPago: 0,
        countPendente: 0,
        countPago: 0,
    };
}

/** Agrega valores da lista actual (já filtrada pela API, exceto filtro de tipo — esse é client-side). */
export function agregarContasPorTipo(
    contas: { tipo_conta: string; valor: string | number; status: string }[],
): Map<string, AgregadoTipo> {
    const map = new Map<string, AgregadoTipo>();
    for (const c of contas) {
        const tipo = (c.tipo_conta || '—').trim() || '—';
        const valor = Number(c.valor);
        const st = c.status;
        let row = map.get(tipo);
        if (!row) {
            row = agregadoVazio(tipo);
            map.set(tipo, row);
        }
        row.total += valor;
        row.count += 1;
        if (st === 'paga') {
            row.valorPago += valor;
            row.countPago += 1;
        } else if (st === 'pendente' || st === 'vencida') {
            row.valorPendente += valor;
            row.countPendente += 1;
        }
    }
    return map;
}

/**
 * Lista completa de slugs para os cartões KPI: todo o catálogo + extras na BD (legado).
 */
export function slugsCatalogoKpiCompleto(agregados: Map<string, AgregadoTipo>): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of ORDEM_KPI_TIPOS) {
        if (!seen.has(v)) {
            seen.add(v);
            out.push(v);
        }
    }
    const extras = [...agregados.keys()]
        .filter(k => !seen.has(k))
        .sort((a, b) => a.localeCompare(b));
    return [...out, ...extras];
}

export function agregadoParaSlug(slug: string, agregados: Map<string, AgregadoTipo>): AgregadoTipo {
    return agregados.get(slug) ?? agregadoVazio(slug);
}
