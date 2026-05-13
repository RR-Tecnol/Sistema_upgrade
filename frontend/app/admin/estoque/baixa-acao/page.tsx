'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { acoesApi, Acao } from '@/lib/api/acoes';
import { stockApi, BaixaStatusResponse } from '@/lib/api/stock';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { EstoqueBaixaAcaoSidebarTutorial } from '@/components/admin/adminSidebarTutorials';
import { EstoqueQuickActionsBar } from '@/components/estoque/EstoqueQuickActionsBar';
import {
    EstoqueSection,
    EstoqueSectionHeader,
    EstoqueEmptyState,
    EstoqueLoadingState,
    ESTOQUE_SECTION_CSS,
} from '@/components/estoque/EstoqueSection';

type AcaoComStatus = Acao & {
    baixa?: BaixaStatusResponse | null;
    loadingBaixa?: boolean;
};

type FiltroStatus = 'TODAS' | 'EM_ANDAMENTO' | 'PLANEJADA' | 'CONCLUIDA';

const ACAO_STATUS_LABEL: Record<string, string> = {
    PLANEJADA: 'Planejada',
    EM_ANDAMENTO: 'Em andamento',
    CONCLUIDA: 'Concluída',
    CANCELADA: 'Cancelada',
};

export default function BaixaAcaoListaPage() {
    const [acoes, setAcoes] = useState<AcaoComStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [filtro, setFiltro] = useState<FiltroStatus>('EM_ANDAMENTO');
    const [busca, setBusca] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setErr(null);
        try {
            const params: any = {};
            if (filtro !== 'TODAS') params.status = filtro;
            const rows = await acoesApi.listar(params);
            setAcoes(rows.map((a) => ({ ...a, baixa: null, loadingBaixa: false })));
            // Lazy-fetch o status de baixa para as primeiras ~20 ações
            const head = rows.slice(0, 20);
            for (const a of head) {
                stockApi.baixa
                    .status(a.id)
                    .then((b) => {
                        setAcoes((prev) =>
                            prev.map((x) => (x.id === a.id ? { ...x, baixa: b } : x)),
                        );
                    })
                    .catch(() => {});
            }
        } catch (e: any) {
            setErr(e?.response?.data?.message ?? 'Erro ao listar ações');
        } finally {
            setLoading(false);
        }
    }, [filtro]);

    useEffect(() => {
        load();
    }, [load]);

    const filtradas = useMemo(() => {
        const q = busca.trim().toLowerCase();
        if (!q) return acoes;
        return acoes.filter(
            (a) =>
                a.nome.toLowerCase().includes(q) ||
                (a.cidadeNome ?? '').toLowerCase().includes(q),
        );
    }, [acoes, busca]);

    // Estatísticas globais
    const stats = useMemo(() => {
        const carregadas = filtradas.filter((a) => a.baixa);
        const totalKit = carregadas.reduce((s, a) => s + (a.baixa?.totalPrevisto ?? 0), 0);
        const totalConsumido = carregadas.reduce((s, a) => s + (a.baixa?.totalConsumido ?? 0), 0);
        const comSobra = carregadas.filter((a) => a.baixa?.temSobra).length;
        return {
            totalAcoes: filtradas.length,
            carregadas: carregadas.length,
            totalKit,
            totalConsumido,
            comSobra,
            cobertura: totalKit > 0 ? Math.round((totalConsumido / totalKit) * 100) : 0,
        };
    }, [filtradas]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <style>{ESTOQUE_SECTION_CSS}</style>
            <AdminHeaderHero
                title="↧ BAIXA DE ESTOQUE POR AÇÃO"
                subtitle="Fechamento do ciclo: consumo dos kits de insumos por ação/curso."
            />

            <EstoqueBaixaAcaoSidebarTutorial />

            {/* KPIs */}
            <section
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 12,
                }}
            >
                <KpiCard label="Ações filtradas" value={stats.totalAcoes} icon="📋" color="#3B82F6" />
                <KpiCard
                    label="Cobertura média do kit"
                    value={`${stats.cobertura}%`}
                    icon="📊"
                    color={stats.cobertura >= 80 ? '#10B981' : stats.cobertura >= 40 ? '#F59E0B' : '#DC2626'}
                />
                <KpiCard
                    label="Com sobra do kit"
                    value={stats.comSobra}
                    icon="⚠"
                    color="#F59E0B"
                />
                <KpiCard
                    label="Total previsto"
                    value={stats.totalKit.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                    icon="🎒"
                    color="#6366F1"
                />
                <KpiCard
                    label="Total consumido"
                    value={stats.totalConsumido.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                    icon="↧"
                    color="#10B981"
                />
            </section>

            {/* Filtros */}
            <EstoqueSection delay={120} accent="#6366F1" minimal>
                <EstoqueSectionHeader
                    icon="🔍"
                    title="Filtrar ações"
                    subtitle="Status + busca livre por nome ou cidade"
                    accent="#6366F1"
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {(['EM_ANDAMENTO', 'PLANEJADA', 'CONCLUIDA', 'TODAS'] as FiltroStatus[]).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFiltro(f)}
                                style={{
                                    padding: '8px 14px',
                                    background: filtro === f ? '#1F2937' : 'white',
                                    color: filtro === f ? 'white' : '#374151',
                                    border: '1px solid ' + (filtro === f ? '#1F2937' : '#D1D5DB'),
                                    borderRadius: 9,
                                    fontSize: 12,
                                    fontWeight: 800,
                                    fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.04em',
                                    cursor: 'pointer',
                                }}
                            >
                                {{
                                    EM_ANDAMENTO: '🏃 Em andamento',
                                    PLANEJADA: '📅 Planejadas',
                                    CONCLUIDA: '✅ Concluídas',
                                    TODAS: 'Todas',
                                }[f]}
                            </button>
                        ))}
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nome ou cidade…"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        style={{
                            flex: 1,
                            minWidth: 220,
                            padding: '8px 12px',
                            border: '1px solid #D1D5DB',
                            borderRadius: 9,
                            fontSize: 13,
                            outline: 'none',
                            background: '#FAFAFA',
                        }}
                    />
                </div>
            </EstoqueSection>

            {/* Lista */}
            <EstoqueSection delay={180} accent="#0EA5E9">
                <EstoqueSectionHeader
                    icon="↧"
                    title="Ações disponíveis para baixa"
                    subtitle="Cada card abre a aba 'Baixa de Estoque' da ação correspondente"
                    accent="#0EA5E9"
                />
                {loading ? (
                    <EstoqueLoadingState label="Carregando ações…" />
                ) : err ? (
                    <div style={{ padding: 14, background: '#FEE2E2', color: '#991B1B', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600 }}>
                        {err}
                    </div>
                ) : filtradas.length === 0 ? (
                    <EstoqueEmptyState icon="📋" label="Nenhuma ação no filtro atual" />
                ) : (
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                            gap: 12,
                        }}
                    >
                        {filtradas.map((a) => (
                            <AcaoCard key={a.id} acao={a} />
                        ))}
                    </div>
                )}
            </EstoqueSection>

            <EstoqueQuickActionsBar currentArea="baixa-acao" />
        </div>
    );
}

function KpiCard({
    label,
    value,
    icon,
    color,
}: {
    label: string;
    value: string | number;
    icon: string;
    color: string;
}) {
    return (
        <div
            style={{
                position: 'relative', overflow: 'hidden',
                background: '#FFFFFF',
                borderStyle: 'solid',
                borderWidth: '1px 1px 1px 4px',
                borderTopColor: `${color}25`,
                borderRightColor: `${color}25`,
                borderBottomColor: `${color}25`,
                borderLeftColor: color,
                boxShadow: '0 2px 10px rgba(0,0,0,.05)',
                borderRadius: 14,
                padding: '14px 16px',
                animation: 'est-sec-fade-up .5s 80ms both',
            }}
        >
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg,transparent,${color},transparent)`,
                opacity: 0.55, pointerEvents: 'none',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                    width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                    background: `linear-gradient(135deg, ${color}25, ${color}08)`,
                    border: `1px solid ${color}50`,
                    boxShadow: `0 0 8px ${color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.05rem',
                }}>
                    <span style={{ animation: 'est-sec-float 3.4s ease-in-out infinite' }}>{icon}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.4rem', color: '#111827', lineHeight: 1 }}>
                        {value}
                    </div>
                    <div style={{
                        fontFamily: 'Orbitron, sans-serif',
                        fontSize: 10, fontWeight: 800,
                        textTransform: 'uppercase', letterSpacing: '0.1em',
                        color: '#64748B', marginTop: 5,
                    }}>
                        {label}
                    </div>
                </div>
            </div>
        </div>
    );
}

function AcaoCard({ acao }: { acao: AcaoComStatus }) {
    const baixa = acao.baixa;
    const pct = baixa && baixa.totalPrevisto > 0
        ? Math.round((baixa.totalConsumido / baixa.totalPrevisto) * 100)
        : null;
    const statusColor: Record<string, string> = {
        PLANEJADA: '#D97706',
        EM_ANDAMENTO: '#059669',
        CONCLUIDA: '#1D4ED8',
        CANCELADA: '#DC2626',
    };
    const accent = statusColor[acao.status] ?? '#6B7280';

    return (
        <div
            style={{
                position: 'relative', overflow: 'hidden',
                background: '#FFFFFF',
                borderStyle: 'solid',
                borderWidth: '1px 1px 1px 4px',
                borderTopColor: `${accent}25`,
                borderRightColor: `${accent}25`,
                borderBottomColor: `${accent}25`,
                borderLeftColor: accent,
                boxShadow: '0 2px 10px rgba(0,0,0,.05)',
                borderRadius: 14,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                animation: 'est-sec-fade-up .5s 80ms both',
            }}
        >
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg,transparent,${accent},transparent)`,
                opacity: 0.55, pointerEvents: 'none',
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>{acao.nome}</h3>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>
                        {acao.cidadeNome ?? '—'} {acao.dataInicio && `· ${new Date(acao.dataInicio).toLocaleDateString('pt-BR')}`}
                    </p>
                </div>
                <span
                    style={{
                        padding: '3px 8px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: statusColor[acao.status] + '22',
                        color: statusColor[acao.status],
                    }}
                >
                    {ACAO_STATUS_LABEL[acao.status] ?? acao.status}
                </span>
            </div>

            <div style={{ fontSize: 12, color: '#6B7280' }}>
                {baixa?.acao.carreta ? (
                    <Link
                        href={`/admin/carretas/${baixa.acao.carreta.id}`}
                        title="Abrir detalhes desta carreta (estoque, manutenções, viagens)"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            color: '#1D4ED8', textDecoration: 'none',
                            fontWeight: 700,
                            borderBottom: '1px dashed #93C5FD',
                        }}>
                        🚛 {baixa.acao.carreta.identifier} ({baixa.acao.carreta.licensePlate})
                    </Link>
                ) : (
                    <span style={{ color: '#DC2626' }}>⚠ Sem carreta vinculada</span>
                )}
            </div>

            {!baixa ? (
                <div style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>Carregando dados de estoque…</div>
            ) : (
                <>
                    <div>
                        <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 3 }}>
                            Cobertura: {baixa.totalConsumido}/{baixa.totalPrevisto}
                        </div>
                        <div style={{ background: '#F3F4F6', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                            <div
                                style={{
                                    width: `${Math.min(100, pct ?? 0)}%`,
                                    height: '100%',
                                    background: pct === null || pct === 0 ? '#9CA3AF' : pct >= 100 ? '#10B981' : '#3B82F6',
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#6B7280', flexWrap: 'wrap' }}>
                        <span>🎒 {baixa.kit.length} item(ns) no kit</span>
                        <span>↧ {baixa.saidas.length} baixa(s) feita(s)</span>
                        {baixa.temSobra && (
                            <span style={{ color: '#F59E0B', fontWeight: 600 }}>⚠ {baixa.sobra.length} sobra(s)</span>
                        )}
                    </div>
                </>
            )}

            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <Link
                    href={`/admin/acoes/${acao.id}?tab=baixa`}
                    style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: '#0EA5E9',
                        color: 'white',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        textAlign: 'center',
                        textDecoration: 'none',
                    }}
                >
                    ↧ Dar baixa
                </Link>
                <Link
                    href={`/admin/acoes/${acao.id}`}
                    style={{
                        padding: '8px 12px',
                        background: 'white',
                        color: '#374151',
                        border: '1px solid #D1D5DB',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 500,
                        textDecoration: 'none',
                    }}
                >
                    Ver ação
                </Link>
            </div>
        </div>
    );
}
