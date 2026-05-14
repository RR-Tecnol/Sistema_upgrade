'use client';

import Link from 'next/link';

export type EstoqueArea = 'dashboard' | 'itens' | 'movimentacoes' | 'solicitacoes' | 'historico' | 'carretas' | 'baixa-acao';

interface QuickAction {
    area: EstoqueArea;
    href: string;
    icon: string;
    title: string;
    subtitle: string;
    color: string;
    gradient: string;
    iconBg: string;
    borderColor: string;
}

const ACTIONS: QuickAction[] = [
    {
        area: 'dashboard',
        href: '/admin/estoque',
        icon: '🏠',
        title: 'DASHBOARD',
        subtitle: 'KPIs gerais, alertas, visão por categoria e carreta',
        color: '#7C5A00',
        gradient: 'linear-gradient(135deg, #FFFEF7 0%, #fff 100%)',
        iconBg: 'linear-gradient(135deg, #FCD34D, #F59E0B)',
        borderColor: '#FDE68A',
    },
    {
        area: 'itens',
        href: '/admin/estoque/itens',
        icon: '📦',
        title: 'ITENS',
        subtitle: 'Catálogo, filtros, edição e saldo individual',
        color: '#B89B00',
        gradient: 'linear-gradient(135deg, #FFFDE7 0%, #fff 100%)',
        iconBg: 'linear-gradient(135deg, #FFD600, #E6A800)',
        borderColor: '#FEF08A',
    },
    {
        area: 'movimentacoes',
        href: '/admin/estoque/movimentacoes',
        icon: '🔄',
        title: 'MOVIMENTAÇÕES',
        subtitle: 'Entrada, saída, transferência, ajuste, perda',
        color: '#059669',
        gradient: 'linear-gradient(135deg, #ECFDF5 0%, #fff 100%)',
        iconBg: 'linear-gradient(135deg, #10B981, #059669)',
        borderColor: '#A7F3D0',
    },
    {
        area: 'solicitacoes',
        href: '/admin/estoque/solicitacoes',
        icon: '🛒',
        title: 'SOLICITAÇÕES',
        subtitle: 'Aprovar compras pendentes → conta a pagar',
        color: '#EA580C',
        gradient: 'linear-gradient(135deg, #FFF7ED 0%, #fff 100%)',
        iconBg: 'linear-gradient(135deg, #F59E0B, #D97706)',
        borderColor: '#FED7AA',
    },
    {
        area: 'historico',
        href: '/admin/estoque/historico',
        icon: '📜',
        title: 'HISTÓRICO',
        subtitle: 'Auditoria completa: quem, quando, o quê, por quê',
        color: '#4F46E5',
        gradient: 'linear-gradient(135deg, #EEF2FF 0%, #fff 100%)',
        iconBg: 'linear-gradient(135deg, #6366F1, #4F46E5)',
        borderColor: '#C7D2FE',
    },
    {
        area: 'carretas',
        href: '/admin/carretas',
        icon: '🚛',
        title: 'CARRETAS',
        subtitle: 'Unidades móveis e estoque por carreta',
        color: '#7C3AED',
        gradient: 'linear-gradient(135deg, #F5F3FF 0%, #fff 100%)',
        iconBg: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
        borderColor: '#DDD6FE',
    },
    {
        area: 'baixa-acao',
        href: '/admin/estoque/baixa-acao',
        icon: '↧',
        title: 'BAIXA DE ESTOQUE',
        subtitle: 'Consumo de kits por ação e fechamento de ciclo',
        color: '#0EA5E9',
        gradient: 'linear-gradient(135deg, #F0F9FF 0%, #fff 100%)',
        iconBg: 'linear-gradient(135deg, #38BDF8, #0EA5E9)',
        borderColor: '#BAE6FD',
    },
];

interface Props {
    /** Área atual — recebe destaque visual de "você está aqui" e fica desabilitada para clique */
    currentArea: EstoqueArea;
    /** Opcional: limita quais áreas mostrar (omite as não relevantes ao contexto) */
    show?: EstoqueArea[];
    /** Título da seção (default: "Ir para outra área do Estoque") */
    title?: string;
}

/**
 * Barra de ações rápidas cross-área do módulo de Estoque.
 * Renderiza no rodapé das páginas filhas para permitir saltar entre
 * itens / movimentações / solicitações / histórico / carretas sem voltar ao dashboard.
 */
export function EstoqueQuickActionsBar({ currentArea, show, title = 'Ir para outra área do Estoque' }: Props) {
    const actions = (show ? ACTIONS.filter(a => show.includes(a.area)) : ACTIONS);

    return (
        <section style={{
            marginTop: '1.5rem',
            padding: '1.1rem 1.25rem',
            borderRadius: 18,
            background: '#FAFAFA',
            border: '1px solid #F3F4F6',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: '1rem' }}>⚡</span>
                <h4 style={{
                    fontFamily: 'Orbitron, sans-serif', fontWeight: 800,
                    fontSize: '0.78rem', letterSpacing: '0.08em',
                    color: '#374151', margin: 0, textTransform: 'uppercase',
                }}>{title}</h4>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.7rem',
            }}>
                {actions.map(a => {
                    const isCurrent = a.area === currentArea;
                    const card = (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 11,
                            padding: '0.7rem 0.85rem', borderRadius: 12,
                            background: isCurrent ? '#F3F4F6' : a.gradient,
                            border: `1.5px solid ${isCurrent ? '#D1D5DB' : a.borderColor}`,
                            cursor: isCurrent ? 'default' : 'pointer',
                            transition: 'all .2s',
                            opacity: isCurrent ? 0.7 : 1,
                            position: 'relative',
                        }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                background: isCurrent ? '#D1D5DB' : a.iconBg,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.1rem',
                                boxShadow: isCurrent ? 'none' : '0 2px 8px rgba(0,0,0,0.1)',
                                filter: isCurrent ? 'grayscale(1)' : 'none',
                            }}>{a.icon}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontFamily: 'Orbitron, sans-serif',
                                    fontWeight: 800, fontSize: '0.72rem',
                                    color: isCurrent ? '#6B7280' : a.color,
                                    letterSpacing: '0.04em',
                                }}>
                                    {a.title}
                                    {isCurrent && (
                                        <span style={{
                                            marginLeft: 6, fontSize: '0.55rem',
                                            background: '#9CA3AF', color: '#fff',
                                            padding: '1px 6px', borderRadius: 5, fontWeight: 800,
                                        }}>VOCÊ ESTÁ AQUI</span>
                                    )}
                                </div>
                                <div style={{
                                    fontSize: '0.66rem', color: '#6B7280',
                                    marginTop: 2, lineHeight: 1.35,
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                    {a.subtitle}
                                </div>
                            </div>
                            {!isCurrent && (
                                <div style={{ fontSize: '1.05rem', color: a.color, fontWeight: 900 }}>→</div>
                            )}
                        </div>
                    );

                    return isCurrent
                        ? <div key={a.area}>{card}</div>
                        : <Link key={a.area} href={a.href} style={{ textDecoration: 'none' }}>{card}</Link>;
                })}
            </div>
        </section>
    );
}
