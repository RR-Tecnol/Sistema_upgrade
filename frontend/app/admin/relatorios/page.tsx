'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Cell } from 'recharts';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { RelatoriosSidebarTutorial } from '@/components/admin/adminSidebarTutorials';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import RelatorioPeriodDropdown from '@/components/admin/RelatorioPeriodDropdown';

// Lazy-load Recharts to avoid SSR issues
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false });



function fmtBrl(n: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n || 0));
}

function labelStatusRota(status: string) {
    const map: Record<string, string> = {
        EM_ANDAMENTO: 'Em andamento',
        PLANEJADA: 'Planejada',
        CONCLUIDA: 'Concluída',
        CANCELADA: 'Cancelada',
    };
    return map[status] ?? status.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

const TOOLTIP_STYLE = {
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: 10,
    boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
    padding: '0.6rem 1rem',
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.8rem',
    color: '#0F172A',
};

/** Paleta executiva — alinhada aos KPI/cards admin (contraste alto em fundo branco/glass). */
const CHART = {
    grid: '#E2E8F0',
    axis: '#475569',
    axisMuted: '#64748B',
    /** Sequência categórica (barras múltiplas / fatias repetíveis) */
    sequence: ['#FFD600', '#0891B2', '#059669', '#7C3AED', '#EA580C', '#1D4ED8', '#0D9488', '#92400E'] as const,
    /** Semântica financeira */
    financeReembolso: '#0891B2',
    financeRetencao: '#EA580C',
    financePix: '#059669',
    legendText: '#334155',
    sliceStroke: '#FFFFFF',
} as const;

const PERIODO_FILTRO_OPTIONS = [
    { value: 'acumulado', label: 'Acumulado (sem filtro de data)' },
    { value: 'ano', label: 'Ano civil completo' },
    { value: 'mes', label: 'Mês específico' },
] as const;

const TICK_AXIS = { fontSize: 11, fill: CHART.axisMuted } as const;
const TICK_AXIS_STRONG = { fontSize: 11, fill: CHART.axis, fontWeight: 600 } as const;
const LEGEND_STYLE = {
    fontSize: '0.72rem',
    color: CHART.legendText,
    paddingTop: 8,
} as const;

/** Área fixa para Recharts: `minWidth: 0` evita colapso em grid/flex; altura numérica evita width/height -1. */
function chartShell(px: number) {
    return {
        width: '100%' as const,
        minWidth: 0,
        height: px,
        minHeight: px,
        position: 'relative' as const,
    };
}

type FinanceiroAgregados = {
    periodoRotulo: string;
    reembolsos: Record<string, number>;
    imprevistos: Record<string, number>;
    feedbacksPosCurso: Record<string, number>;
};

type RotasBi = {
    totalRotas: number;
    cidadesBeneficiadas: number;
    totalInscritos: number;
    rotas: Array<{
        id: string;
        nome: string;
        cidade?: string;
        estado?: string;
        status: string;
        totalTurmas: number;
        totalInscritos: number;
    }>;
};

export default function RelatoriosPage() {
    const [stats, setStats] = useState({ alunos: 0, turmas: 0, cursos: 0, inscricoes: 0, aprovados: 0, concluidos: 0 });
    const [analytics, setAnalytics] = useState<{
        inscricoesPorMes: any[];
        alunosPorCurso: any[];
        distribuicaoEstado: any[];
        statusInscricoes: any[];
        inscricoesSerieTipo?: string;
        anoInscricoes?: number | null;
        mesInscricoes?: number | null;
        inscricoesCriadasNoPeriodo?: number;
        geradoEm?: string;
        financeiro?: FinanceiroAgregados;
        matriculadosOuAprovados?: number;
        certificadosEmitidos?: number;
    }>({
        inscricoesPorMes: [],
        alunosPorCurso: [],
        distribuicaoEstado: [],
        statusInscricoes: [],
    });
    /** acumulado = sem query string (finanças e pedagógico no modo largo definido pela API). */
    const [filtroFin, setFiltroFin] = useState<'acumulado' | 'ano' | 'mes'>('acumulado');
    const [anoRef, setAnoRef] = useState<number>(() => new Date().getFullYear());
    const [mesRef, setMesRef] = useState<number>(new Date().getMonth() + 1);
    const [loading, setLoading] = useState(true);
    const [rotasBi, setRotasBi] = useState<RotasBi | null>(null);
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [pdfLoading, setPdfLoading] = useState<'frequency' | 'concludents' | null>(null);

    const downloadPdf = async (type: 'frequency' | 'concludents') => {
        if (!selectedClass) { toast.warning('Selecione uma turma primeiro'); return; }
        setPdfLoading(type);
        try {
            const endpoint = selectedClass === 'all'
                ? `/reports/${type}/all`
                : `/reports/${type}/${selectedClass}`;
            const res = await api.get(endpoint, { responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}-${selectedClass}-${new Date().toISOString().slice(0, 10)}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            toast.error(err?.response?.status === 500
                ? 'Não foi possível gerar o PDF no servidor. Tente mais tarde ou peça apoio à equipa técnica.'
                : 'Não foi possível gerar o PDF. Confirme se está ligado ao sistema e tente novamente.');
        } finally {
            setPdfLoading(null);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [filtroFin, anoRef, mesRef]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const params: string[] = [];
            if (filtroFin === 'ano') params.push(`year=${anoRef}`);
            if (filtroFin === 'mes') params.push(`year=${anoRef}`, `month=${mesRef}`);
            const q = params.length ? `?${params.join('&')}` : '';

            const [statsRes, classesRes, analyticsRes] = await Promise.all([
                api.get('/dashboard/stats'),
                api.get('/classes'),
                api.get(`/dashboard/analytics${q}`),
            ]);
            const rotasParams = new URLSearchParams();
            if (filtroFin === 'ano' || filtroFin === 'mes') {
                rotasParams.set('ano', String(anoRef));
            }
            if (filtroFin === 'mes') {
                rotasParams.set('mes', String(mesRef));
            }
            const rotasQuery = rotasParams.toString();
            const rotasRes = await api.get(`/dashboard/rotas-bi${rotasQuery ? `?${rotasQuery}` : ''}`);
            const d = statsRes.data;
            const ar = analyticsRes.data;
            const inscricoesKpi = typeof ar?.inscricoesCriadasNoPeriodo === 'number'
                ? ar.inscricoesCriadasNoPeriodo
                : (d.enrollments?.total ?? 0);
            setStats({
                alunos: d.students?.total ?? 0,
                turmas: d.classes?.active ?? 0,
                cursos: d.courses?.active ?? 0,
                inscricoes: inscricoesKpi,
                aprovados: ar?.matriculadosOuAprovados ?? 0,
                concluidos: ar?.certificadosEmitidos ?? 0,
            });
            setClasses(Array.isArray(classesRes.data) ? classesRes.data : classesRes.data?.data ?? []);
            setAnalytics(ar ?? { inscricoesPorMes: [], alunosPorCurso: [], distribuicaoEstado: [], statusInscricoes: [] });
            setRotasBi(rotasRes.data ?? null);
        } catch {
            // silently fail — components show empty state
        } finally {
            setLoading(false);
        }
    };

    const funilJornada = [
        { etapa: 'Inscrições', valor: stats.inscricoes, color: CHART.sequence[0], stroke: '#CA8A04' },
        { etapa: 'Aprov./Matr.', valor: stats.aprovados, color: CHART.sequence[1], stroke: '#0E7490' },
        { etapa: 'Certificados', valor: stats.concluidos, color: CHART.sequence[2], stroke: '#047857' },
    ];

    const financeMix = analytics.financeiro ? [
        { name: 'Reemb. Aprovados', value: Number(analytics.financeiro.reembolsos?.valorAprovadoComDataDecisaoNoPeriodo ?? 0), color: CHART.financeReembolso },
        { name: 'Retenções', value: Number(analytics.financeiro.imprevistos?.penalidadesValorRetidoTotal ?? 0), color: CHART.financeRetencao },
        { name: 'PIX Liquidados', value: Number(analytics.financeiro.feedbacksPosCurso?.recompensasPixLiquidadasNoPeriodo ?? 0), color: CHART.financePix },
    ].filter(x => x.value > 0) : [];

    const correlacaoOperacional = analytics.financeiro ? [
        { eixo: 'Reemb. Criados', valor: Number(analytics.financeiro.reembolsos?.solicitacoesCriadasNoPeriodo ?? 0), color: CHART.sequence[0] },
        { eixo: 'Imprevistos', valor: Number(analytics.financeiro.imprevistos?.registrosNoPeriodo ?? 0), color: '#DC2626' },
        { eixo: 'Feedback Convites', valor: Number(analytics.financeiro.feedbacksPosCurso?.convitesEnviadosNoPeriodo ?? 0), color: CHART.sequence[3] },
        { eixo: 'Feedback Subm.', valor: Number(analytics.financeiro.feedbacksPosCurso?.submissoesNoPeriodo ?? 0), color: CHART.sequence[1] },
        { eixo: 'PIX Pagos', valor: Number(analytics.financeiro.feedbacksPosCurso?.recompensasPixLiquidadasNoPeriodo ?? 0), color: CHART.sequence[2] },
    ] : [];

    const rotasStatusMap = (rotasBi?.rotas ?? []).reduce<Record<string, number>>((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
    }, {});
    const rotasPorStatus = Object.entries(rotasStatusMap).map(([status, value]) => ({
        status: labelStatusRota(status),
        value,
        color:
            status === 'EM_ANDAMENTO' ? CHART.sequence[2] :
                status === 'PLANEJADA' ? '#D97706' :
                    status === 'CONCLUIDA' ? CHART.sequence[1] :
                        status === 'CANCELADA' ? '#94A3B8' :
                            '#64748B',
    }));
    const topRotas = [...(rotasBi?.rotas ?? [])]
        .sort((a, b) => b.totalInscritos - a.totalInscritos)
        .slice(0, 6)
        .map(r => ({
            rota: r.nome.length > 20 ? `${r.nome.slice(0, 20)}…` : r.nome,
            inscritos: r.totalInscritos,
        }));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
        <style>{`
            .rel-chart-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
            .rel-chart-2fr1fr { display: grid; grid-template-columns: 2fr 1fr; gap: 1.25rem; }
            .rel-table-wrap { overflow: hidden; }
            @media (max-width: 640px) {
                .rel-chart-2col   { grid-template-columns: 1fr; }
                .rel-chart-2fr1fr { grid-template-columns: 1fr; }
                .rel-table-wrap   { overflow-x: auto; }
            }
        `}</style>
            <AdminHeaderHero
                title="RELATÓRIOS EXECUTIVOS"
                subtitle="Panorama completo do sistema: captação, operação acadêmica, campo e financeiro"
                badge={analytics.geradoEm ? `Atualizado: ${new Date(analytics.geradoEm).toLocaleString('pt-BR')}` : undefined}
                rightSlot={(
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: 10, background: '#F0F9FF', border: '1px solid #BAE6FD', fontSize: '0.78rem', color: '#164E63', fontWeight: 600, maxWidth: 340 }}>
                        Painel de decisão multiárea: pedagógico, financeiro e operação de campo.
                    </div>
                )}
            />
            <RelatoriosSidebarTutorial />

            {/* Filtro período — painel Upgrade (navy / amarelo / cyan) */}
            <div
                className="relatorio-period-shell"
                style={{
                    background: 'linear-gradient(148deg, #0a1f3d 0%, #133660 38%, #0d2748 72%, #102a4a 100%)',
                }}
            >
                <div className="relatorio-period-inner">
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem 1rem', marginBottom: '1rem' }}>
                        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: 6 }}>
                                <span
                                    style={{
                                        fontSize: '0.62rem',
                                        fontWeight: 900,
                                        letterSpacing: '0.14em',
                                        color: '#FFD600',
                                        padding: '3px 10px',
                                        borderRadius: 999,
                                        border: '1px solid rgba(255,214,0,0.45)',
                                        background: 'rgba(255,214,0,0.1)',
                                        boxShadow: '0 0 20px rgba(255,214,0,0.12)',
                                    }}
                                >
                                    PERÍODO ATIVO
                                </span>
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(226,232,240,0.85)', letterSpacing: '0.04em' }}>
                                    Finanças · Pedagógico · Rotas
                                </span>
                            </div>
                            <h2 style={{ margin: 0, fontSize: 'clamp(0.95rem, 2.5vw, 1.05rem)', fontWeight: 900, color: '#fff', letterSpacing: '0.03em', lineHeight: 1.35 }}>
                                Período dos relatórios
                            </h2>
                            <p style={{ margin: '6px 0 0', fontSize: '0.74rem', color: 'rgba(226,232,240,0.72)', maxWidth: 520, lineHeight: 1.5 }}>
                                Define a janela temporal dos gráficos financeiros, matrículas e BI de rotas. Os totais fixos no topo (alunos, turmas, cursos) continuam globais.
                            </p>
                        </div>
                        {analytics.financeiro?.periodoRotulo && (
                            <div
                                className="relatorio-period-chip"
                                style={{
                                    flexShrink: 0,
                                    padding: '0.5rem 0.95rem',
                                    borderRadius: 12,
                                    background: 'linear-gradient(135deg, rgba(8,145,178,0.22), rgba(255,214,0,0.08))',
                                    border: '1px solid rgba(8,145,178,0.35)',
                                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                                }}
                            >
                                <div style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.12em', color: '#67e8f9', marginBottom: 3 }}>JANELA</div>
                                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
                                    {analytics.financeiro.periodoRotulo}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center' }}>
                        <RelatorioPeriodDropdown
                            value={filtroFin}
                            onChange={(v) => setFiltroFin(v as typeof filtroFin)}
                            options={[...PERIODO_FILTRO_OPTIONS]}
                            aria-label="Tipo de período"
                            minWidth={248}
                        />
                        {filtroFin !== 'acumulado' && (
                            <RelatorioPeriodDropdown
                                value={String(anoRef)}
                                onChange={(v) => setAnoRef(parseInt(v, 10))}
                                options={Array.from({ length: 6 }, (_, i) => {
                                    const y = new Date().getFullYear() - i;
                                    return { value: String(y), label: String(y) };
                                })}
                                aria-label="Ano"
                                minWidth={104}
                                triggerStyle={{
                                    animation: 'relatorio-period-chip-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
                                }}
                            />
                        )}
                        {filtroFin === 'mes' && (
                            <RelatorioPeriodDropdown
                                value={String(mesRef)}
                                onChange={(v) => setMesRef(parseInt(v, 10))}
                                options={Array.from({ length: 12 }, (_, i) => {
                                    const m = i + 1;
                                    return {
                                        value: String(m),
                                        label: new Date(2000, m - 1, 1).toLocaleString('pt-BR', { month: 'long' }),
                                    };
                                })}
                                aria-label="Mês"
                                minWidth={148}
                                triggerStyle={{
                                    animation: 'relatorio-period-chip-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
                                }}
                            />
                        )}
                    </div>

                    {filtroFin !== 'acumulado' && (
                        <p
                            style={{
                                margin: '0.85rem 0 0',
                                padding: '0.65rem 0.85rem',
                                borderRadius: 10,
                                fontSize: '0.72rem',
                                color: 'rgba(241,245,249,0.88)',
                                lineHeight: 1.5,
                                background: 'rgba(8,145,178,0.12)',
                                border: '1px solid rgba(8,145,178,0.28)',
                                animation: 'relatorio-period-chip-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
                            }}
                        >
                            <strong style={{ color: '#fde047' }}>Nota:</strong>{' '}
                            Inscrições, matrículas, certificados do período, gráficos por curso/UF e rotas de campo seguem esta seleção.
                        </p>
                    )}
                </div>
            </div>

            {/* KPI Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                {[
                    { label: 'Alunos', value: stats.alunos, color: '#FFD600', icon: '👥' },
                    { label: 'Turmas Ativas', value: stats.turmas, color: '#0891B2', icon: '🏫' },
                    { label: 'Cursos', value: stats.cursos, color: '#7C3AED', icon: '🎓' },
                    { label: filtroFin === 'acumulado' ? 'Inscrições' : 'Inscrições (período)', value: stats.inscricoes, color: '#059669', icon: '📋' },
                    { label: filtroFin === 'acumulado' ? 'Aprovados / Matric.' : 'Aprov./Matric. (período)', value: stats.aprovados, color: '#EA580C', icon: '✅' },
                        { label: filtroFin === 'acumulado' ? 'Certificados Ativos' : 'Certificados (período)', value: stats.concluidos, color: '#374151', icon: '🏆' },
                ].map((s, i) => (
                    <AnimatedKpiCard
                        key={s.label}
                        label={s.label}
                        value={s.value}
                        color={s.color}
                        bg="#FFFFFF"
                        border={s.color}
                        sub={s.icon}
                        delayMs={i * 45}
                    />
                ))}
            </div>

            {/* Panorama operacional — mesmo padrão de KPI que a faixa principal (fundo branco, número colorido) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <AnimatedKpiCard
                    label="Operação de campo"
                    value={rotasBi?.totalRotas ?? 0}
                    color="#16A34A"
                    bg="#FFFFFF"
                    border="#16A34A"
                    sub="Rotas no BI"
                    delayMs={0}
                    compact
                />
                <AnimatedKpiCard
                    label="Cidades beneficiadas"
                    value={rotasBi?.cidadesBeneficiadas ?? 0}
                    color="#1D4ED8"
                    bg="#FFFFFF"
                    border="#1D4ED8"
                    sub="Cobertura geográfica"
                    delayMs={40}
                    compact
                />
                <AnimatedKpiCard
                    label="Inscritos em rotas"
                    value={rotasBi?.totalInscritos ?? 0}
                    color="#B45309"
                    bg="#FFFFFF"
                    border="#D97706"
                    sub="Demanda na malha"
                    delayMs={80}
                    compact
                />
                <AnimatedKpiCard
                    label="Conversão final"
                    value={stats.inscricoes > 0 ? Math.round((stats.concluidos / stats.inscricoes) * 100) : 0}
                    suffix="%"
                    color="#7C3AED"
                    bg="#FFFFFF"
                    border="#7C3AED"
                    sub="Certificados / inscrições (KPI acima)"
                    delayMs={120}
                    compact
                />
            </div>

            {analytics.financeiro && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {[
                        { label: 'Reembolsos (criados no período)', value: analytics.financeiro.reembolsos?.solicitacoesCriadasNoPeriodo ?? 0, sub: `${fmtBrl(analytics.financeiro.reembolsos?.valorTotalSolicitadoNoPeriodo ?? 0)} solicitado`, color: '#B45309' },
                        { label: 'Valor aprovado (revisão no período)', value: 0, displayValue: fmtBrl(Number(analytics.financeiro.reembolsos?.valorAprovadoComDataDecisaoNoPeriodo ?? 0)), sub: 'Soma reembolsos aprovados', color: '#047857' },
                        { label: 'Imprevistos registrados no período', value: analytics.financeiro.imprevistos?.registrosNoPeriodo ?? 0, sub: 'Linhas como ausências', color: '#1D4ED8' },
                        { label: 'Penalidades (imprevisto)', value: analytics.financeiro.imprevistos?.penalidadesQuantidade ?? 0, sub: `${fmtBrl(analytics.financeiro.imprevistos?.penalidadesValorRetidoTotal ?? 0)} retidos`, color: '#B91C1C' },
                        { label: 'Feedbacks convidados no período', value: analytics.financeiro.feedbacksPosCurso?.convitesEnviadosNoPeriodo ?? 0, color: '#6D28D9' },
                        { label: 'Feedbacks submetidos no período', value: analytics.financeiro.feedbacksPosCurso?.submissoesNoPeriodo ?? 0, color: '#0E7490' },
                        { label: 'PIX liquidados no período', value: analytics.financeiro.feedbacksPosCurso?.recompensasPixLiquidadasNoPeriodo ?? 0, sub: `${analytics.financeiro.feedbacksPosCurso?.recompensaLotePixPendentes ?? 0} pendentes na fila`, color: '#15803D' },
                    ].map((c, i) => (
                        <AnimatedKpiCard
                            key={c.label}
                            label={c.label}
                            value={c.value}
                            displayValue={c.displayValue}
                            sub={c.sub}
                            color={c.color}
                            bg="#FFFFFF"
                            border={c.color}
                            delayMs={i * 35}
                            compact
                        />
                    ))}
                </div>
            )}

            {/* Correlação estratégica */}
            <div className="rel-chart-2col">
                <div className="glass-card">
                    <div className="card-header">
                        <div className="card-title">🔗 Funil de Conversão (Captação → Certificação)</div>
                    </div>
                    <div style={chartShell(220)}>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={funilJornada} margin={{ top: 8, right: 12, left: -24, bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                                <XAxis dataKey="etapa" tick={TICK_AXIS} axisLine={{ stroke: CHART.grid }} tickLine={false} />
                                <YAxis tick={TICK_AXIS} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                                <Bar dataKey="valor" radius={[8, 8, 0, 0]} maxBarSize={56}>
                                    {funilJornada.map((e, i) => (
                                        <Cell key={i} fill={e.color} stroke={e.stroke} strokeWidth={1.5} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card">
                    <div className="card-header">
                        <div className="card-title">💸 Mix Financeiro do Período</div>
                    </div>
                    <div style={chartShell(220)}>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={financeMix} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={46} outerRadius={78} paddingAngle={2}>
                                    {financeMix.map((e, i) => (
                                        <Cell key={i} fill={e.color} stroke={CHART.sliceStroke} strokeWidth={2} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any, n: any) => [fmtBrl(Number(v)), n]} />
                                <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="rel-chart-2col">
                <div className="glass-card">
                    <div className="card-header">
                        <div className="card-title">📡 Correlação Operacional (Eventos do Período)</div>
                    </div>
                    <div style={chartShell(240)}>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={correlacaoOperacional} margin={{ top: 8, right: 12, left: -20, bottom: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                                <XAxis dataKey="eixo" angle={-18} textAnchor="end" interval={0} height={60} tick={TICK_AXIS} axisLine={{ stroke: CHART.grid }} tickLine={false} />
                                <YAxis tick={TICK_AXIS} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                                <Bar dataKey="valor" radius={[8, 8, 0, 0]} maxBarSize={48}>
                                    {correlacaoOperacional.map((e, i) => (
                                        <Cell key={i} fill={e.color} stroke="#FFFFFF" strokeWidth={1.25} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card">
                    <div className="card-header">
                        <div className="card-title">🛣️ Rotas por Status (Campo)</div>
                    </div>
                    <div style={chartShell(240)}>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={rotasPorStatus} margin={{ top: 8, right: 12, left: -20, bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                                <XAxis dataKey="status" tick={TICK_AXIS} axisLine={{ stroke: CHART.grid }} tickLine={false} />
                                <YAxis tick={TICK_AXIS} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={52}>
                                    {rotasPorStatus.map((e, i) => (
                                        <Cell key={i} fill={e.color} stroke="#FFFFFF" strokeWidth={1.25} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="rel-chart-2col">

                {/* Bar — Inscrições por mês */}
                <div className="glass-card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">📈 Inscrições por Mês</div>
                            <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 4 }}>
                                {analytics.inscricoesSerieTipo === 'mes_unico'
                                    ? `Inscrições apenas em ${analytics.mesInscricoes != null ? new Date(2000, analytics.mesInscricoes - 1, 1).toLocaleString('pt-BR', { month: 'long' }) : ''} de ${analytics.anoInscricoes ?? ''}`
                                    : analytics.inscricoesSerieTipo === 'ano_civil'
                                        ? `Novas filas registradas durante o ano ${analytics.anoInscricoes ?? ''} — 12 barras mensais fixas`
                                        : 'Janela móvel: últimos 12 meses a partir das inscrições existentes'}
                            </div>
                        </div>
                    </div>
                    <div style={chartShell(220)}>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={analytics.inscricoesPorMes} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} barGap={4} barCategoryGap="18%">
                                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                                <XAxis dataKey="month" tick={TICK_AXIS} axisLine={{ stroke: CHART.grid }} tickLine={false} />
                                <YAxis tick={TICK_AXIS} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(8,145,178,0.06)' }} />
                                <Legend wrapperStyle={LEGEND_STYLE} iconType="square" />
                                <Bar dataKey="total" name="Inscrições" fill={CHART.sequence[0]} stroke="#CA8A04" strokeWidth={1} radius={[6, 6, 0, 0]} maxBarSize={36} />
                                <Bar dataKey="aprovados" name="Aprovados" fill={CHART.sequence[2]} stroke="#047857" strokeWidth={1} radius={[6, 6, 0, 0]} maxBarSize={36} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Line — Status de Inscrições */}
                <div className="glass-card">
                    <div className="card-header">
                        <div className="card-title">📊 Status das Inscrições</div>
                    </div>
                    <div style={{ ...chartShell(220), display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start' }}>
                        <div style={{ width: '100%', minWidth: 0, height: 160, minHeight: 160, position: 'relative' }}>
                        <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                                <Pie
                                    data={analytics.statusInscricoes}
                                    cx="50%" cy="50%"
                                    innerRadius={46} outerRadius={68}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {analytics.statusInscricoes.map((entry: any, index: number) => (
                                        <Cell key={index} fill={entry.color} stroke={CHART.sliceStroke} strokeWidth={2} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                                <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="rel-chart-2fr1fr">

                {/* Bar — Alunos por curso */}
                <div className="glass-card">
                    <div className="card-header">
                        <div className="card-title">🎓 Alunos por Curso</div>
                    </div>
                    <div style={chartShell(240)}>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={analytics.alunosPorCurso} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                                <XAxis type="number" tick={TICK_AXIS} axisLine={{ stroke: CHART.grid }} tickLine={false} />
                                <YAxis dataKey="curso" type="category" tick={TICK_AXIS_STRONG} axisLine={false} tickLine={false} width={50} />
                                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(124,58,237,0.06)' }} />
                                <Bar dataKey="alunos" name="Alunos" radius={[0, 6, 6, 0]} maxBarSize={22}>
                                    {analytics.alunosPorCurso.map((_: any, i: number) => (
                                        <Cell key={i} fill={CHART.sequence[i % CHART.sequence.length]} stroke="#FFFFFF" strokeWidth={1.25} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie — Distribuição dinâmica por UF */}
                <div className="glass-card">
                    <div className="card-header">
                        <div className="card-title">🗺 Distribuição por Estado</div>
                    </div>
                    <div style={{ width: '100%', minWidth: 0, minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                        <div style={{ width: '100%', minWidth: 0, height: 160, minHeight: 160, position: 'relative' }}>
                        <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                                <Pie
                                    data={analytics.distribuicaoEstado}
                                    cx="50%" cy="50%"
                                    innerRadius={46} outerRadius={68}
                                    paddingAngle={2}
                                    dataKey="value"
                                    startAngle={90} endAngle={-270}
                                >
                                    {analytics.distribuicaoEstado.map((entry: any, index: number) => (
                                        <Cell key={index} fill={entry.color ?? CHART.sequence[index % CHART.sequence.length]} stroke={CHART.sliceStroke} strokeWidth={2} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [v, 'Alunos']} />
                            </PieChart>
                        </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                            {analytics.distribuicaoEstado.map((item: any) => (
                                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color }} />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151' }}>{item.name}</span>
                                    <span style={{ fontFamily: 'Orbitron', fontSize: '0.8rem', fontWeight: 900, color: item.color }}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Table */}
            <div className="glass-card rel-table-wrap" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="card-title">📋 Resumo por Curso</div>
                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 6 }}>
                        Certificados ativos no sistema (todas as turmas): <strong>{analytics.certificadosEmitidos ?? '—'}</strong>
                    </div>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Curso</th>
                            <th>Turmas Ativas</th>
                            <th>Alunos (matric.)</th>
                            <th>Nota</th>
                            <th>Certificado / curso</th>
                        </tr>
                    </thead>
                    <tbody>
                        {analytics.alunosPorCurso.map((c: any, i: number) => (
                            <tr key={i}>
                                <td style={{ fontWeight: 700, color: '#111827' }}>{c.curso}</td>
                                <td>{Math.max(1, c.turmas ?? Math.round((c.alunos || 1) / 18))}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ flex: 1, height: 6, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden', maxWidth: 80 }}>
                                            <div style={{ height: '100%', width: `${(c.alunos / 60) * 100}%`, background: '#FFD600', borderRadius: 3 }} />
                                        </div>
                                        <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#374151', fontSize: '0.8rem' }}>{c.alunos}</span>
                                    </div>
                                </td>
                                <td>
                                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Por curso; certificados contados globalmente ao topo</span>
                                </td>
                                <td>
                                    <span style={{ fontWeight: 700, color: '#9CA3AF' }}>—</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="glass-card rel-table-wrap" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="card-title">🚀 Top Rotas por Inscritos</div>
                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 6 }}>
                        Cruzamento direto da operação de campo com captação de alunos.
                    </div>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Rota/Período</th>
                            <th>Inscritos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {topRotas.length === 0 ? (
                            <tr>
                                <td colSpan={2} style={{ textAlign: 'center', color: '#9CA3AF' }}>Sem dados de rotas para o filtro atual.</td>
                            </tr>
                        ) : topRotas.map((r, i) => (
                            <tr key={`${r.rota}-${i}`}>
                                <td style={{ fontWeight: 700, color: '#111827' }}>{r.rota}</td>
                                <td style={{ fontFamily: 'Orbitron', color: CHART.sequence[1], fontWeight: 900 }}>{r.inscritos}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* === SEÇÃO RELATÓRIOS GOVERNAMENTAIS === */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F3F4F6', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F3F4F6', background: '#FFFDE7', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.2rem' }}>📋</span>
                    <div>
                        <div style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 900, color: '#92400E', letterSpacing: '0.08em' }}>DOCUMENTOS GOVERNAMENTAIS</div>
                        <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 2 }}>Documentos oficiais em PDF — modelo provisório até versão final aprovada</div>
                    </div>
                </div>
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6B7280', marginBottom: '0.4rem' }}>Selecione a Turma</label>
                        <select
                            value={selectedClass}
                            onChange={e => setSelectedClass(e.target.value)}
                            style={{ width: '100%', maxWidth: 420, padding: '0.65rem 0.9rem', borderRadius: 9, border: '1.5px solid #E5E7EB', background: '#F9FAFB', fontSize: '0.85rem', color: '#111827', outline: 'none' }}
                        >
                            <option value="">Selecione a turma...</option>
                            <option value="all">📋 Todas as Turmas (Relatório Geral)</option>
                            {classes.map((c: any) => (
                                <option key={c.id} value={c.id}>
                                    {c.classIdentifier} — {c.course?.name} ({c.city?.name}/{c.city?.state})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {/* REQ-11 — Lista de Frequência */}
                        <div style={{ flex: '1 1 280px', background: '#EFF6FF', borderRadius: 12, padding: '1rem 1.25rem', border: '1px solid #BFDBFE' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <span style={{ fontSize: '1.2rem' }}>📊</span>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1E40AF' }}>Lista de Frequência</div>
                                    <div style={{ fontSize: '0.68rem', color: '#6B7280' }}>Contém presença por aluno e % frequência · REQ-11</div>
                                </div>
                            </div>
                            <div style={{ fontSize: '0.73rem', color: '#374151', marginBottom: 12, lineHeight: 1.5 }}>
                                Emitir no <strong>dia 20 de cada mês</strong> e ao final do curso. Critério: ≥80% = aprovado.
                            </div>
                            <button
                                onClick={() => downloadPdf('frequency')}
                                disabled={!selectedClass || pdfLoading === 'frequency'}
                                style={{ width: '100%', padding: '8px', borderRadius: 8, background: pdfLoading === 'frequency' ? '#BFDBFE' : '#1D4ED8', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: !selectedClass || pdfLoading === 'frequency' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: !selectedClass ? 0.5 : 1 }}
                            >
                                {pdfLoading === 'frequency' ? 'Gerando PDF...' : '⬇ Baixar PDF de Frequência'}
                            </button>
                        </div>

                        {/* REQ-12 — Lista de Concludentes */}
                        <div style={{ flex: '1 1 280px', background: '#F0FDF4', borderRadius: 12, padding: '1rem 1.25rem', border: '1px solid #BBF7D0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <span style={{ fontSize: '1.2rem' }}>🎓</span>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#065F46' }}>Lista de Concludentes</div>
                                    <div style={{ fontSize: '0.68rem', color: '#6B7280' }}>Aprovados ≥75% e desistentes &lt;75% · REQ-12</div>
                                </div>
                            </div>
                            <div style={{ fontSize: '0.73rem', color: '#374151', marginBottom: 12, lineHeight: 1.5 }}>
                                Emitir na <strong>3ª semana do curso</strong>. A secretaria exige antes do final para planejamento de certificados.
                            </div>
                            <button
                                onClick={() => downloadPdf('concludents')}
                                disabled={!selectedClass || pdfLoading === 'concludents'}
                                style={{ width: '100%', padding: '8px', borderRadius: 8, background: pdfLoading === 'concludents' ? '#BBF7D0' : '#059669', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: !selectedClass || pdfLoading === 'concludents' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: !selectedClass ? 0.5 : 1 }}
                            >
                                {pdfLoading === 'concludents' ? 'Gerando PDF...' : '⬇ Baixar Lista de Concludentes'}
                            </button>
                        </div>
                    </div>

                    <div style={{ background: '#FFFDE7', borderRadius: 9, padding: '10px 14px', border: '1px solid #FEF08A', fontSize: '0.73rem', color: '#92400E' }}>
                        ⚠️ <strong>Template provisório:</strong> aguardando modelo visual oficial do Robert. Quando disponível, substituir apenas os métodos <code>buildFrequencyHtml()</code> e <code>buildConcludentsHtml()</code> no <code>PdfService</code> — a lógica de dados e os endpoints não mudam.
                    </div>
                </div>
            </div>
        </div>
    );
}
