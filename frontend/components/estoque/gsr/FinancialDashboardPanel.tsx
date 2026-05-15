'use client';

import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';

interface FinancialDashboardData {
    valorTotalGasto: number;
    quantidadeComprada: number;
    valorPendente: number;
    quantidadePendente: number;
    statusCounts: {
        critico: number;
        baixo: number;
        ok: number;
    };
    valorEmEstoque?: {
        central: number;
        carretas: number;
    };
    verbaMensal?: {
        total: number;
        consumido: number;
    };
    topConsumoMes?: {
        nome: string;
        unidade: string;
        valorTotal: number;
        quantidade: number;
    }[];
}

export function FinancialDashboardPanel({ data }: { data: FinancialDashboardData | null }) {
    if (!data) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 0.75rem' }} />
                <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.65rem', letterSpacing: '0.15em', color: '#94A3B8', textTransform: 'uppercase' }}>
                    Carregando dados financeiros...
                </p>
            </div>
        );
    }

    const cards = [
        {
            label: 'Total Gasto (Aprovado/Recebido)',
            value: data.valorTotalGasto,
            displayValue: `R$ ${data.valorTotalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: <span aria-hidden>💰</span>,
            color: '#059669',
            bg: '#ECFDF5',
            border: '#D1FAE5',
        },
        {
            label: 'Volume Comprado',
            value: data.quantidadeComprada,
            icon: <span aria-hidden>📦</span>,
            color: '#0891B2',
            bg: '#F0F9FF',
            border: '#BAE6FD',
        },
        {
            label: 'Valor Pendente para Compra',
            value: data.valorPendente,
            displayValue: `R$ ${data.valorPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: <span aria-hidden>⏳</span>,
            color: '#EA580C',
            bg: '#FFF7ED',
            border: '#FED7AA',
        },
        {
            label: 'Volume Pendente',
            value: data.quantidadePendente,
            icon: <span aria-hidden>📝</span>,
            color: '#B89B00',
            bg: '#FFFDE7',
            border: '#FEF08A',
        },
    ];

    const statusCards = [
        {
            label: 'Itens em Estado Crítico',
            value: data.statusCounts.critico,
            icon: <span aria-hidden>🚨</span>,
            color: '#DC2626',
            bg: '#FEF2F2',
            border: '#FECACA',
        },
        {
            label: 'Itens com Estoque Baixo',
            value: data.statusCounts.baixo,
            icon: <span aria-hidden>⚠️</span>,
            color: '#EA580C',
            bg: '#FFF7ED',
            border: '#FED7AA',
        },
        {
            label: 'Itens com Estoque OK',
            value: data.statusCounts.ok,
            icon: <span aria-hidden>✅</span>,
            color: '#059669',
            bg: '#ECFDF5',
            border: '#D1FAE5',
        },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* NOVO: Patrimônio e Verba */}
            {data.valorEmEstoque && data.verbaMensal && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {/* Patrimônio Imobilizado */}
                    <section style={{ background: '#F8FAFC', borderRadius: 16, border: '1px solid #E2E8F0', padding: '1.5rem' }}>
                        <h3 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.75rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>🏛️</span> Valor do Patrimônio em Estoque
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📦</div>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Estoque Central</span>
                                </div>
                                <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>
                                    {data.valorEmEstoque.central.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEFCE8', color: '#CA8A04', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🚛</div>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Nas Carretas</span>
                                </div>
                                <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>
                                    {data.valorEmEstoque.carretas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', marginTop: 4 }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Total Global</span>
                                <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: '#059669' }}>
                                    {(data.valorEmEstoque.central + data.valorEmEstoque.carretas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Verba Global do Mês */}
                    <section style={{ background: '#F8FAFC', borderRadius: 16, border: '1px solid #E2E8F0', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.75rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>📊</span> Status de Verba Global (Mês Atual)
                        </h3>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            {data.verbaMensal.total > 0 ? (() => {
                                const pct = Math.min((data.verbaMensal.consumido / data.verbaMensal.total) * 100, 100);
                                const barColor = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#10B981';
                                return (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                            <div>
                                                <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Consumido</div>
                                                <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: barColor }}>
                                                    {data.verbaMensal.consumido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Teto Global</div>
                                                <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#0F172A' }}>
                                                    {data.verbaMensal.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ height: 12, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99, transition: 'width 1s ease-out' }} />
                                        </div>
                                        <div style={{ textAlign: 'center', marginTop: 12, fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>
                                            {pct.toFixed(1)}% da verba global utilizada
                                        </div>
                                    </>
                                );
                            })() : (
                                <div style={{ textAlign: 'center', color: '#94A3B8', padding: '2rem 0' }}>
                                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }}>🤷‍♂️</span>
                                    Nenhuma verba definida para este mês.
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            )}

            {/* Top 5 Consumo Mês */}
            {data.topConsumoMes && data.topConsumoMes.length > 0 && (
                <section>
                    <h3 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.75rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🔥</span> Ranking de Maiores Custos de Distribuição (Mês Atual)
                    </h3>
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden', background: '#FFFFFF' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                                <tr>
                                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Insumo</th>
                                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', textAlign: 'right' }}>Qtd Distribuída</th>
                                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', textAlign: 'right' }}>Custo Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.topConsumoMes.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: idx === data.topConsumoMes!.length - 1 ? 'none' : '1px solid #F1F5F9' }}>
                                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                                            <span style={{ color: '#94A3B8', marginRight: 8 }}>#{idx + 1}</span>
                                            {item.nome}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', textAlign: 'right' }}>
                                            {item.quantidade} <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{item.unidade}</span>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '0.9rem', fontWeight: 800, color: '#DC2626', textAlign: 'right', fontFamily: 'Orbitron, sans-serif' }}>
                                            {item.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            <section>
                <h3 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.75rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
                    Resumo Financeiro de Aquisições
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    {cards.map((c, i) => (
                        <AnimatedKpiCard
                            key={c.label}
                            label={c.label}
                            value={Number(c.value)}
                            displayValue={(c as any).displayValue}
                            color={c.color}
                            bg={c.bg}
                            border={c.border}
                            icon={c.icon}
                            delayMs={i * 60}
                        />
                    ))}
                </div>
            </section>

            <section>
                <h3 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.75rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
                    Distribuição de Status de Estoque
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    {statusCards.map((c, i) => (
                        <AnimatedKpiCard
                            key={c.label}
                            label={c.label}
                            value={Number(c.value)}
                            color={c.color}
                            bg={c.bg}
                            border={c.border}
                            icon={c.icon}
                            delayMs={(i + 4) * 60}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
}
