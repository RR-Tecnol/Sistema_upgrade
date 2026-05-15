'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
    stockApi,
    StockItem,
    StockMovement,
    StockPurchaseRequest,
    StockDashboard,
    resolveCategoria,
    MOV_TYPE_LABEL,
    MOV_TYPE_COLOR,
    MOV_TYPE_ICON,
} from '@/lib/api/stock';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';

export type EstoqueKpiKey =
    | 'totalAtivos'
    | 'saldoCarretas'
    | 'estoqueCritico'
    | 'estoqueBaixo'
    | 'vencendo'
    | 'solicitacoesPendentes'
    | 'emTransito'
    | 'movimentacoesMes';

type SidebarMeta = {
    title: string;
    icon: string;
    color: string;
    description: string;
    rationale: string;
    quickActions: { href: string; label: string; icon: string; }[];
};

const META: Record<EstoqueKpiKey, SidebarMeta> = {
    totalAtivos: {
        title: 'Itens cadastrados',
        icon: '📦',
        color: '#0891B2',
        description:
            'Total de insumos ativos no catálogo (não inclui itens desativados via soft delete).',
        rationale:
            'Cada item aqui pode ser usado em movimentações e solicitações de compra. ' +
            'Editar valores cadastrais (nome, fornecedor, preço, validade) não altera saldo — ' +
            'toda variação numérica passa por movimentação para garantir rastreabilidade.',
        quickActions: [
            { href: '/admin/estoque?tab=central',       label: 'Ver lista completa',      icon: '📋' },
            { href: '/admin/estoque/itens/novo',  label: 'Cadastrar novo item',     icon: '➕' },
            { href: '/admin/estoque?tab=movimentacoes&audit=1&action=STOCK_ITEM', label: 'Auditoria de itens', icon: '📜' },
        ],
    },
    saldoCarretas: {
        title: 'Saldo em carretas',
        icon: '🚛',
        color: '#7C3AED',
        description:
            'Quantidade total que está fisicamente nas carretas (soma das quantidades atuais por item, por carreta).',
        rationale:
            'Cada Entrada (central → carreta) e cada Transferência aumenta este número; ' +
            'Saídas (consumo em ação) e Devoluções (carreta → central) o reduzem. ' +
            'Use o histórico para investigar variações inesperadas.',
        quickActions: [
            { href: '/admin/carretas',            label: 'Abrir carretas',         icon: '🚚' },
            { href: '/admin/estoque?tab=movimentacoes', label: 'Movimentações entre carretas', icon: '🔄' },
            { href: '/admin/estoque?tab=movimentacoes&audit=1&action=TRANSFERENCIA', label: 'Histórico de transferências', icon: '📜' },
        ],
    },
    estoqueCritico: {
        title: 'Estoque crítico',
        icon: '🚨',
        color: '#DC2626',
        description:
            'Itens cuja quantidade atual caiu para 50% ou menos da quantidade mínima cadastrada — risco iminente de ruptura.',
        rationale:
            'Prioridade máxima. Esses itens devem virar Solicitação de Compra URGENTE ou ' +
            'receber transferência de outra carreta o mais rápido possível. ' +
            'Itens críticos são um subconjunto dos "estoque baixo".',
        quickActions: [
            { href: '/admin/estoque?tab=central&onlyLow=true', label: 'Ver itens com alerta', icon: '🚨' },
            { href: '/admin/estoque?tab=solicitacoes',       label: 'Abrir solicitações urgentes', icon: '🔥' },
            { href: '/admin/estoque?tab=movimentacoes&audit=1&action=REPOSICAO', label: 'Histórico de reposições', icon: '📜' },
        ],
    },
    estoqueBaixo: {
        title: 'Estoque baixo',
        icon: '⚠️',
        color: '#F59E0B',
        description:
            'Itens com quantidade entre 50% e 100% da quantidade mínima cadastrada. Alerta amarelo: ainda dá tempo de planejar a reposição.',
        rationale:
            'Esses itens devem virar Solicitação de Compra (reposição) o quanto antes — antes que escalem para CRÍTICO. ' +
            'A quantidade mínima é definida no cadastro do item e pode ser ajustada via edição.',
        quickActions: [
            { href: '/admin/estoque?tab=central&onlyLow=true', label: 'Ver itens com alerta', icon: '🚨' },
            { href: '/admin/estoque?tab=solicitacoes',       label: 'Solicitações de compra', icon: '🛒' },
            { href: '/admin/estoque?tab=movimentacoes&audit=1&action=REPOSICAO', label: 'Histórico de reposições', icon: '📜' },
        ],
    },
    vencendo: {
        title: 'Vencendo em 30 dias',
        icon: '⏰',
        color: '#EA580C',
        description:
            'Itens cuja validade cadastrada cai dentro dos próximos 30 dias.',
        rationale:
            'Investigue se ainda há estoque destes itens em carretas e se podem ser consumidos a tempo, ' +
            'ou se precisam de baixa por PERDA com observação descritiva.',
        quickActions: [
            { href: '/admin/estoque?tab=central&onlyExpiring=true', label: 'Ver itens vencendo', icon: '⏰' },
            { href: '/admin/estoque?tab=movimentacoes&audit=1&action=PERDA',  label: 'Histórico de perdas', icon: '📜' },
        ],
    },
    solicitacoesPendentes: {
        title: 'Solicitações pendentes',
        icon: '🛒',
        color: '#FFD600',
        description:
            'Solicitações de compra (reposição) ainda aguardando análise de um administrador ou administrador de TI.',
        rationale:
            'Cada aprovação cria automaticamente: 1) uma movimentação de encomenda no histórico, 2) quantidade em trânsito no item, ' +
            '3) uma conta a pagar com situação “pendente” para o financeiro. O saldo real só sobe quando a conta é paga ' +
            'OU quando o admin clica em "Marcar como recebido". Tudo na mesma transação atômica.',
        quickActions: [
            { href: '/admin/estoque?tab=solicitacoes', label: 'Analisar solicitações', icon: '🛒' },
            { href: '/admin/estoque?tab=movimentacoes&audit=1&action=PURCHASE_REQUEST', label: 'Histórico de aprovações', icon: '📜' },
            { href: '/admin/contas-a-pagar?tipo=estoque_reposicao', label: 'Contas a pagar geradas', icon: '💰' },
        ],
    },
    emTransito: {
        title: 'Em trânsito',
        icon: '📦',
        color: '#3B82F6',
        description:
            'Itens com solicitações de compra já aprovadas aguardando recebimento físico OU pagamento da conta a pagar — ' +
            'já comprometidos com fornecedor mas ainda não disponíveis no estoque real.',
        rationale:
            'O saldo real só sobe quando: (a) a conta a pagar vinculada é marcada como paga, ou ' +
            '(b) o admin clica em "Marcar como recebido" na solicitação. ' +
            'O que vier primeiro dispara a entrada — pode ser clicado mais de uma vez sem risco de duplicar.',
        quickActions: [
            { href: '/admin/estoque?tab=solicitacoes&status=APROVADA', label: 'Ver encomendas em trânsito', icon: '📦' },
            { href: '/admin/contas-a-pagar?tipo=estoque_reposicao', label: 'Pagar contas a pagar de estoque', icon: '💰' },
            { href: '/admin/estoque?tab=movimentacoes&audit=1&action=ENCOMENDA',   label: 'Histórico de encomendas',   icon: '📜' },
        ],
    },
    movimentacoesMes: {
        title: 'Movimentações no mês',
        icon: '🔄',
        color: '#059669',
        description:
            'Contagem de movimentações (todos os tipos) registradas desde o dia 1 do mês corrente.',
        rationale:
            'Inclui Entrada, Saída, Transferência, Devolução, Ajuste, Perda e Reposição. ' +
            'Cada movimentação registra item, quantidade, carretas envolvidas, ação consumidora, ' +
            'observação e quem registrou — informação completa para auditoria.',
        quickActions: [
            { href: '/admin/estoque?tab=movimentacoes', label: 'Ver movimentações', icon: '🔄' },
            { href: '/admin/estoque?tab=movimentacoes&audit=1',     label: 'Auditoria completa', icon: '📜' },
        ],
    },
};

type LoadedPayload = {
    items?: StockItem[];
    movements?: StockMovement[];
    pending?: StockPurchaseRequest[];
};

export function EstoqueKpiSidebar({
    kpi,
    dash,
    onClose,
}: {
    kpi: EstoqueKpiKey | null;
    dash: StockDashboard | null;
    onClose: () => void;
}) {
    const [payload, setPayload] = useState<LoadedPayload>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!kpi) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                if (kpi === 'totalAtivos') {
                    const items = await stockApi.items.getAll();
                    if (!cancelled) setPayload({ items: items.slice(0, 8) });
                } else if (kpi === 'estoqueBaixo') {
                    // baixo (não-críticos): qtd entre 50% e 100% do mínimo
                    const all = await stockApi.alerts.low();
                    const filtered = all.filter(i => {
                        const min = Number(i.quantidadeMinima);
                        const atual = Number(i.quantidadeAtual);
                        return min > 0 && atual > min * 0.5 && atual <= min;
                    });
                    if (!cancelled) setPayload({ items: filtered });
                } else if (kpi === 'estoqueCritico') {
                    // crítico: qtd ≤ 50% do mínimo
                    const all = await stockApi.alerts.low();
                    const filtered = all.filter(i => {
                        const min = Number(i.quantidadeMinima);
                        return min > 0 && Number(i.quantidadeAtual) <= min * 0.5;
                    });
                    if (!cancelled) setPayload({ items: filtered });
                } else if (kpi === 'vencendo') {
                    const items = await stockApi.alerts.expiring(30);
                    if (!cancelled) setPayload({ items });
                } else if (kpi === 'solicitacoesPendentes') {
                    const pending = await stockApi.purchaseRequests.list({ status: 'PENDENTE' });
                    if (!cancelled) setPayload({ pending });
                } else if (kpi === 'emTransito') {
                    // Itens com quantidadeEmTransito > 0
                    const all = await stockApi.items.getAll();
                    const filtered = all.filter(i => Number(i.quantidadeEmTransito ?? 0) > 0);
                    if (!cancelled) setPayload({ items: filtered });
                } else if (kpi === 'movimentacoesMes') {
                    const movements = await stockApi.movements.list({ limit: 12 });
                    if (!cancelled) setPayload({ movements });
                } else if (kpi === 'saldoCarretas') {
                    // mostra itens com mais saldo no central (não temos endpoint específico para “mais distribuído”)
                    const items = await stockApi.items.getAll();
                    if (!cancelled) setPayload({ items: items.slice(0, 8) });
                }
            } catch (e) {
                console.error('[Estoque sidebar] erro ao carregar dados', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [kpi]);

    if (!kpi) return null;

    const meta = META[kpi];
    const valor = (() => {
        if (!dash) return null;
        switch (kpi) {
            case 'totalAtivos':           return dash.totalAtivos;
            case 'saldoCarretas':         return Math.floor(dash.saldoCarretas);
            case 'estoqueCritico':        return dash.alertasEstoqueCritico ?? 0;
            case 'estoqueBaixo':          return dash.alertasEstoqueBaixoNaoCritico ?? Math.max(0, dash.alertasEstoqueBaixo - (dash.alertasEstoqueCritico ?? 0));
            case 'vencendo':              return dash.alertasVencendo;
            case 'solicitacoesPendentes': return dash.solicitacoesPendentes;
            case 'emTransito':            return dash.itensEmTransito ?? 0;
            case 'movimentacoesMes':      return dash.movimentacoesMes;
        }
    })();

    return (
        <ModalPortal>
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: MODAL_PORTAL_Z_INDEX,
                    background: 'rgba(2, 6, 23, 0.45)',
                    display: 'flex', justifyContent: 'flex-start',
                    animation: 'fade-in 0.2s ease',
                }}
            >
                <aside
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: 'min(540px, 96vw)',
                        height: '100vh',
                        background: '#FFFFFF',
                        borderRight: '1px solid #E5E7EB',
                        boxShadow: '8px 0 30px rgba(15, 23, 42, 0.16)',
                        display: 'flex', flexDirection: 'column',
                        animation: 'slide-in-left 0.25s cubic-bezier(.2,.7,.3,1)',
                    }}
                >
                    {/* HEADER */}
                    <div style={{
                        padding: '1rem 1.2rem',
                        borderBottom: '1px solid #F1F5F9',
                        background: `linear-gradient(135deg, ${meta.color}EE, ${meta.color}AA)`,
                        display: 'flex', alignItems: 'center', gap: 14,
                    }}>
                        <div style={{
                            width: 50, height: 50, borderRadius: 14, flexShrink: 0,
                            background: 'rgba(255,255,255,0.18)',
                            border: '1px solid rgba(255,255,255,0.35)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.6rem',
                        }}>{meta.icon}</div>
                        <div style={{ flex: 1, minWidth: 0, color: '#fff' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85 }}>
                                Indicador
                            </div>
                            <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.05rem', letterSpacing: '0.04em' }}>
                                {meta.title}
                            </div>
                            {valor !== null && (
                                <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.4rem', marginTop: 2, lineHeight: 1 }}>
                                    {valor}
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Fechar"
                            style={{
                                border: '1px solid rgba(255,255,255,0.4)',
                                background: 'rgba(255,255,255,0.15)',
                                color: '#fff', borderRadius: 8,
                                padding: '0.35rem 0.7rem', cursor: 'pointer',
                                fontWeight: 800, fontSize: '0.78rem',
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* BODY */}
                    <div className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1, padding: '1.1rem 1.2rem', background: '#F8FAFC' }}>
                        {/* Descrição + racional */}
                        <div style={{
                            background: '#FFFFFF', borderRadius: 12,
                            border: '1px solid #E5E7EB', padding: '0.95rem 1rem',
                            marginBottom: '1rem',
                        }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: meta.color, marginBottom: 6 }}>
                                O que é este indicador
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.5 }}>
                                {meta.description}
                            </div>
                            <div style={{ height: 10 }} />
                            <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: meta.color, marginBottom: 6 }}>
                                Por que importa
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.55 }}>
                                {meta.rationale}
                            </div>
                        </div>

                        {/* Lista relacionada */}
                        <div style={{
                            background: '#FFFFFF', borderRadius: 12,
                            border: '1px solid #E5E7EB', padding: '0.95rem 1rem',
                            marginBottom: '1rem',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: meta.color }}>
                                    {kpi === 'movimentacoesMes' ? 'Últimas movimentações'
                                        : kpi === 'solicitacoesPendentes' ? 'Solicitações pendentes'
                                        : 'Itens relacionados'}
                                </div>
                                <span style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 700 }}>
                                    {loading ? 'Carregando...' : (
                                        kpi === 'movimentacoesMes' ? `${payload.movements?.length ?? 0}`
                                        : kpi === 'solicitacoesPendentes' ? `${payload.pending?.length ?? 0}`
                                        : `${payload.items?.length ?? 0}`
                                    )}
                                </span>
                            </div>

                            {loading ? (
                                <div style={{ padding: '1.4rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem' }}>Buscando...</div>
                            ) : (
                                <>
                                    {(kpi === 'totalAtivos' || kpi === 'estoqueBaixo' || kpi === 'vencendo' || kpi === 'saldoCarretas') && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {(payload.items?.length ?? 0) === 0 ? (
                                                <div style={{ padding: '0.9rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.78rem' }}>
                                                    Nada por aqui ✨
                                                </div>
                                            ) : payload.items!.map(it => (
                                                <Link key={it.id} href={`/admin/estoque/itens/${it.id}`} style={{
                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                    padding: '8px 10px', borderRadius: 9,
                                                    background: '#FAFBFC', border: '1px solid #F3F4F6',
                                                    textDecoration: 'none', color: 'inherit',
                                                }}>
                                                    <div style={{
                                                        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                                        background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.9rem',
                                                    }}>📦</div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {it.nome}
                                                        </div>
                                                        <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                                                            {resolveCategoria(it).label} · {Number(it.quantidadeAtual)}/{Number(it.quantidadeMinima)} {it.unidade}
                                                        </div>
                                                    </div>
                                                    {kpi === 'estoqueBaixo' && (
                                                        <span style={{ fontSize: '0.62rem', padding: '0.18rem 0.45rem', borderRadius: 100, background: '#FEE2E2', color: '#B91C1C', fontWeight: 800 }}>
                                                            BAIXO
                                                        </span>
                                                    )}
                                                    {kpi === 'vencendo' && it.validade && (
                                                        <span style={{ fontSize: '0.62rem', padding: '0.18rem 0.45rem', borderRadius: 100, background: '#FFEDD5', color: '#9A3412', fontWeight: 800 }}>
                                                            {new Date(it.validade).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    )}
                                                </Link>
                                            ))}
                                        </div>
                                    )}

                                    {kpi === 'solicitacoesPendentes' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {(payload.pending?.length ?? 0) === 0 ? (
                                                <div style={{ padding: '0.9rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.78rem' }}>
                                                    ✅ Nenhuma solicitação pendente
                                                </div>
                                            ) : payload.pending!.map(req => (
                                                <Link key={req.id} href={`/admin/estoque?tab=solicitacoes&highlight=${encodeURIComponent(req.id)}`} style={{
                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                    padding: '8px 10px', borderRadius: 9,
                                                    background: req.urgente ? 'rgba(239,68,68,0.06)' : '#FAFBFC',
                                                    border: `1px solid ${req.urgente ? 'rgba(239,68,68,0.25)' : '#F3F4F6'}`,
                                                    textDecoration: 'none', color: 'inherit',
                                                }}>
                                                    <div style={{
                                                        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.95rem',
                                                        background: 'rgba(255,214,0,0.15)',
                                                        border: '1px solid rgba(255,214,0,0.4)',
                                                    }}>{req.urgente ? '🔥' : '🛒'}</div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {req.stockItem?.nome ?? 'Item'}
                                                        </div>
                                                        <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                                                            {Number(req.quantidade).toFixed(0)} un · {req.requester?.name ?? '—'}
                                                        </div>
                                                    </div>
                                                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: '0.78rem', color: '#B89B00' }}>
                                                        R$ {Number(req.valorTotal).toFixed(2).replace('.', ',')}
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}

                                    {kpi === 'movimentacoesMes' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {(payload.movements?.length ?? 0) === 0 ? (
                                                <div style={{ padding: '0.9rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.78rem' }}>
                                                    Nenhuma movimentação registrada
                                                </div>
                                            ) : payload.movements!.map(mov => {
                                                const color = MOV_TYPE_COLOR[mov.type];
                                                const icon = MOV_TYPE_ICON[mov.type];
                                                return (
                                                    <div key={mov.id} style={{
                                                        display: 'flex', alignItems: 'center', gap: 10,
                                                        padding: '8px 10px', borderRadius: 9,
                                                        background: '#FAFBFC', border: '1px solid #F3F4F6',
                                                    }}>
                                                        <div style={{
                                                            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '0.95rem',
                                                            background: `${color}15`, border: `1px solid ${color}35`,
                                                        }}>{icon}</div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {mov.stockItem?.nome ?? '—'}
                                                            </div>
                                                            <div style={{ fontSize: '0.66rem', color: '#94A3B8' }}>
                                                                {MOV_TYPE_LABEL[mov.type]}
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: '0.78rem', color }}>
                                                                {Number(mov.quantidade).toFixed(2).replace('.', ',')}
                                                            </div>
                                                            <div style={{ fontSize: '0.6rem', color: '#94A3B8' }}>
                                                                {new Date(mov.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Ações rápidas */}
                        <div style={{
                            background: '#FFFFFF', borderRadius: 12,
                            border: '1px solid #E5E7EB', padding: '0.95rem 1rem',
                        }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: meta.color, marginBottom: 10 }}>
                                Ações rápidas
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                {meta.quickActions.map(a => (
                                    <Link key={a.href} href={a.href} onClick={onClose} style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '0.65rem 0.85rem', borderRadius: 10,
                                        background: '#F8FAFC', border: '1px solid #E5E7EB',
                                        textDecoration: 'none', color: '#0F172A',
                                        fontWeight: 700, fontSize: '0.82rem',
                                        transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLElement).style.background = `${meta.color}10`;
                                        (e.currentTarget as HTMLElement).style.borderColor = `${meta.color}55`;
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLElement).style.background = '#F8FAFC';
                                        (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB';
                                    }}>
                                        <span style={{ fontSize: '1rem' }}>{a.icon}</span>
                                        {a.label}
                                        <span style={{ marginLeft: 'auto', color: meta.color, fontWeight: 800 }}>→</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>

                <style>{`
                    @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
                    @keyframes slide-in-left { from { transform: translateX(-12px); opacity: 0.85 } to { transform: translateX(0); opacity: 1 } }
                `}</style>
            </div>
        </ModalPortal>
    );
}
