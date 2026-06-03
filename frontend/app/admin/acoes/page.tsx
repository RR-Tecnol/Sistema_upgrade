'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { acoesApi, Acao, AcaoStatus, AcaoEstatisticas } from '@/lib/api/acoes';
import api from '@/lib/api/acoes'; // axios com interceptor de auth
import { AcaoPeriodWizard } from '@/components/admin/acoes/AcaoPeriodWizard';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { AcoesSidebarTutorial } from '@/components/admin/adminSidebarTutorials';
import AdminViewModeToggle from '@/components/admin/AdminViewModeToggle';
import { usePersistedAdminViewMode } from '@/hooks/usePersistedAdminViewMode';
import { toast } from '@/components/ui/Toast';
import { AdminListPagination } from '@/components/admin/AdminListPagination';
import { normalizePaginated, ADMIN_PAGE_SIZE_CARDS } from '@/lib/api/pagination';

// ── Utilitários ───────────────────────────────────────────────────

const statusConfig: Record<AcaoStatus, { label: string; color: string; bg: string; border: string }> = {
    PLANEJADA: { label: 'Planejada', color: '#92400E', bg: '#FFF9C4', border: '#FFE97A' },
    EM_ANDAMENTO: { label: 'Em Andamento', color: '#065F46', bg: '#DCFCE7', border: '#BBF7D0' },
    CONCLUIDA: { label: 'Concluída', color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE' },
    CANCELADA: { label: 'Cancelada', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
};

const statusDot: Record<AcaoStatus, string> = {
    PLANEJADA: '#D97706',
    EM_ANDAMENTO: '#059669',
    CONCLUIDA: '#1D4ED8',
    CANCELADA: '#DC2626',
};

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ── CSS futurista completo ───────────────────────────────────────
const ACOES_CSS = `
@keyframes ac-fade-up   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
@keyframes ac-scan      { 0%{transform:translateY(-100%);opacity:0} 10%{opacity:.6} 90%{opacity:.6} 100%{transform:translateY(400%);opacity:0} }
@keyframes ac-grid      { 0%,100%{opacity:.18} 50%{opacity:.42} }
@keyframes ac-glow-pulse{ 0%,100%{opacity:.55} 50%{opacity:1} }
@keyframes ac-float-num { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
@keyframes ac-ring      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
.ac-kpi {
  position:relative; overflow:hidden;
  transition:transform .28s ease, box-shadow .28s ease, border-color .28s ease;
}
.ac-kpi:hover {
  transform:perspective(700px) rotateX(-3deg) rotateY(4deg) translateY(-5px);
}
`;

// ── KPI Card — dark futurista total ──────────────────────────────────────────
function KpiCard({ label, value, icon, color, bgColor: _bg, delay }: { label: string; value: number; icon: string; color: string; bgColor: string; delay: number }) {
    const [displayed, setDisplayed] = useState(0);
    const [hovered, setHovered] = useState(false);

    useEffect(() => {
        let start = 0;
        const step = Math.max(1, Math.ceil(value / 20));
        const timer = setTimeout(() => {
            const interval = setInterval(() => {
                start = Math.min(start + step, value);
                setDisplayed(start);
                if (start >= value) clearInterval(interval);
            }, 40);
            return () => clearInterval(interval);
        }, delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return (
        <div
            className="ac-kpi"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                borderRadius: 18,
                padding: '20px 22px',
                background: '#fff',
                borderStyle: 'solid',
                borderTopWidth: 1,
                borderRightWidth: 1,
                borderBottomWidth: 1,
                borderLeftWidth: 4,
                borderTopColor: hovered ? color + '70' : color + '28',
                borderRightColor: hovered ? color + '70' : color + '28',
                borderBottomColor: hovered ? color + '70' : color + '28',
                borderLeftColor: color,
                boxShadow: hovered
                    ? `0 0 28px ${color}22, 0 8px 28px rgba(0,0,0,.1), inset 0 1px 0 ${color}12`
                    : `0 1px 6px rgba(0,0,0,.07), inset 0 1px 0 ${color}08`,
                animation: `ac-fade-up .5s ${delay}ms both`,
            }}
        >
            {/* Grid animado de fundo */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                backgroundImage: `linear-gradient(${color}08 1px,transparent 1px),linear-gradient(90deg,${color}08 1px,transparent 1px)`,
                backgroundSize: '28px 28px',
                animation: 'ac-grid 4s ease-in-out infinite',
            }} />

            {/* Linha scan */}
            <div style={{
                position: 'absolute', left: 0, right: 0, height: 1.5,
                background: `linear-gradient(90deg,transparent,${color}55,transparent)`,
                animation: 'ac-scan 3.5s ease-in-out infinite',
                pointerEvents: 'none',
            }} />

            {/* Anel decorativo canto superior direito */}
            <div style={{
                position: 'absolute', top: -18, right: -18, width: 70, height: 70,
                border: `1px solid ${color}18`, borderRadius: '50%',
                animation: 'ac-ring 10s linear infinite', pointerEvents: 'none',
            }} />

            {/* Conteúdo */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                        background: `linear-gradient(135deg,${color}22,${color}0a)`,
                        border: `1px solid ${color}45`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem',
                        boxShadow: `0 0 10px ${color}25`,
                    }}>{icon}</div>
                    <span style={{
                        color: '#6B7280', fontSize: '.8rem', fontWeight: 600,
                        letterSpacing: '.04em',
                    }}>{label}</span>
                    {/* dot pulsante */}
                    <div style={{
                        marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%',
                        background: color, boxShadow: `0 0 6px ${color}`,
                        animation: 'ac-glow-pulse 2s infinite',
                    }} />
                </div>
                <div style={{
                    fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.8rem',
                    color: color, lineHeight: 1,
                    filter: `drop-shadow(0 0 10px ${color}80)`,
                    animation: 'ac-float-num 3s ease-in-out infinite',
                }}>{displayed}</div>
            </div>
        </div>
    );
}

// ── Card de Ação ─────────────────────────────────────────────────

function AcaoCard({ acao }: { acao: Acao }) {
    const cfg = statusConfig[acao.status];
    const dot = statusDot[acao.status];
    const inicio = new Date(acao.dataInicio);
    const fim = new Date(acao.dataFim);
    const hoje = new Date();
    const totalDias = Math.max(1, Math.ceil((fim.getTime() - inicio.getTime()) / 86400000));
    const diasPassados = Math.max(0, Math.ceil((hoje.getTime() - inicio.getTime()) / 86400000));
    const progresso = Math.min(100, Math.round((diasPassados / totalDias) * 100));
    const [hov, setHov] = useState(false);
    const accentColor = dot;

    return (
        <Link href={`/admin/acoes/${acao.id}`} style={{ textDecoration: 'none' }}>
            <div
                onMouseEnter={() => setHov(true)}
                onMouseLeave={() => setHov(false)}
                style={{
                    position: 'relative', overflow: 'hidden',
                    borderRadius: 18, cursor: 'pointer',
                    background: '#fff',
                    borderStyle: 'solid',
                    borderTopWidth: 1,
                    borderRightWidth: 1,
                    borderBottomWidth: 1,
                    borderLeftWidth: 4,
                    borderTopColor: hov ? accentColor + '60' : accentColor + '22',
                    borderRightColor: hov ? accentColor + '60' : accentColor + '22',
                    borderBottomColor: hov ? accentColor + '60' : accentColor + '22',
                    borderLeftColor: accentColor,
                    boxShadow: hov
                        ? `0 0 22px ${accentColor}18, 0 8px 24px rgba(0,0,0,.1)`
                        : `0 1px 6px rgba(0,0,0,.07)`,
                    transition: 'border-color .25s, box-shadow .25s, transform .28s',
                    transform: hov ? 'perspective(700px) rotateX(-2deg) rotateY(3deg) translateY(-5px)' : 'none',
                    display: 'flex', flexDirection: 'column',
                    animation: 'ac-fade-up .5s both',
                }}
            >
                {/* Grid animado */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    backgroundImage: `linear-gradient(${accentColor}07 1px,transparent 1px),linear-gradient(90deg,${accentColor}07 1px,transparent 1px)`,
                    backgroundSize: '26px 26px',
                    animation: 'ac-grid 5s ease-in-out infinite',
                }} />

                {/* Scan line */}
                <div style={{
                    position: 'absolute', left: 0, right: 0, height: 1.5,
                    background: `linear-gradient(90deg,transparent,${accentColor}45,transparent)`,
                    animation: 'ac-scan 4s ease-in-out infinite',
                    pointerEvents: 'none',
                }} />

                {/* Anel decorativo */}
                <div style={{
                    position: 'absolute', top: -24, right: -24, width: 90, height: 90,
                    border: `1px solid ${accentColor}15`, borderRadius: '50%',
                    animation: 'ac-ring 12s linear infinite', pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', top: -10, right: -10, width: 50, height: 50,
                    border: `1px solid ${accentColor}10`, borderRadius: '50%',
                    animation: 'ac-ring 8s linear infinite reverse', pointerEvents: 'none',
                }} />

                {/* Linha top accent */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg,transparent,${accentColor},transparent)`,
                    opacity: hov ? 0.9 : 0.4, transition: 'opacity .25s',
                }} />

                {/* Conteúdo principal */}
                <div style={{ position: 'relative', zIndex: 1, padding: '18px 20px', flex: 1 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                            background: `linear-gradient(135deg,${accentColor}25,${accentColor}08)`,
                            border: `1px solid ${accentColor}40`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.15rem',
                            boxShadow: `0 0 12px ${accentColor}25`,
                        }}>⚡</div>
                        <span style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px', borderRadius: 20,
                            background: `${accentColor}18`, border: `1px solid ${accentColor}40`,
                            fontSize: '0.7rem', fontWeight: 700, color: cfg.color,
                        }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot, display: 'inline-block', boxShadow: `0 0 4px ${dot}`, animation: 'ac-glow-pulse 2s infinite' }} />
                            {cfg.label}
                        </span>
                    </div>

                    {/* Nome */}
                    <h3 style={{
                        fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: '0.82rem',
                        color: '#111827', margin: '0 0 12px', lineHeight: 1.35,
                        letterSpacing: '.02em',
                    }}>{acao.nome}</h3>

                    {/* Meta */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
                        <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>📍 {acao.cidade?.name}, {acao.cidade?.state}</span>
                        {acao.carreta && <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>🚛 {acao.carreta.identifier}</span>}
                        <span style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>📅 {fmtDate(acao.dataInicio)} → {fmtDate(acao.dataFim)}</span>
                    </div>

                    {/* Barra de progresso */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', borderRadius: 3,
                                background: `linear-gradient(90deg,${accentColor},#FFD600)`,
                                width: `${progresso}%`, transition: 'width 1.2s ease',
                                boxShadow: `0 0 8px ${accentColor}80`,
                            }} />
                        </div>
                        <span style={{
                            fontSize: '0.68rem', color: accentColor, width: 32, textAlign: 'right',
                            fontFamily: 'Orbitron', fontWeight: 700,
                        }}>{progresso}%</span>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    position: 'relative', zIndex: 1,
                    padding: '12px 20px',
                    borderTop: `1px solid ${accentColor}20`,
                    background: 'rgba(0,0,0,.02)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', gap: 14 }}>
                        {[
                            { v: acao._count?.turmas ?? 0, l: 'Turmas' },
                            { v: acao._count?.equipe ?? 0, l: 'Equipe' },
                            { v: acao._count?.custos ?? 0, l: 'Custos' },
                        ].map(({ v, l }) => (
                            <span key={l} style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>
                                <strong style={{ color: accentColor, fontFamily: 'Orbitron', fontSize: '0.78rem' }}>{v}</strong> {l}
                            </span>
                        ))}
                    </div>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '5px 12px', borderRadius: 9,
                        background: 'linear-gradient(135deg,#FFD600,#E6A800)',
                        color: '#000', fontWeight: 800, fontSize: '0.68rem',
                        letterSpacing: '.04em', fontFamily: 'Orbitron, sans-serif',
                        boxShadow: hov ? '0 0 18px rgba(255,214,0,.6)' : '0 0 10px rgba(255,214,0,.35)',
                        transition: 'box-shadow .25s',
                    }}>
                        ⚡ Ver
                    </span>
                </div>
            </div>
        </Link>
    );
}

// ── Página Principal ──────────────────────────────────────────────

export default function AcoesPage() {
    const [acoes, setAcoes] = useState<Acao[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [estatisticas, setEstatisticas] = useState<AcaoEstatisticas | null>(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [listViewMode, setListViewMode] = usePersistedAdminViewMode('admin:acoes:list', 'card');

    const [loadError, setLoadError] = useState('');

    const load = async (overrides?: { search?: string; status?: string; page?: number }) => {
        setLoading(true);
        setLoadError('');
        try {
            const searchValue = overrides?.search ?? search;
            const statusValue = overrides?.status ?? filterStatus;
            const pageValue = overrides?.page ?? page;
            const [aRaw, e] = await Promise.all([
                acoesApi.listar({
                    search: searchValue || undefined,
                    status: statusValue as AcaoStatus || undefined,
                    page: pageValue,
                    limit: ADMIN_PAGE_SIZE_CARDS,
                }),
                acoesApi.estatisticas(),
            ]);
            const a = normalizePaginated<Acao>(aRaw, ADMIN_PAGE_SIZE_CARDS);
            setAcoes(a.data);
            setTotal(a.total);
            setTotalPages(a.totalPages);
            setEstatisticas(e);
        } catch (err: any) {
            if (err?.response?.status === 401) {
                // Token expirado — redireciona para login
                localStorage.removeItem('token');
                window.location.href = '/login';
                return;
            }
            setAcoes([]);
            setLoadError('Erro ao carregar períodos de curso. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreatedFromModal = async () => {
        // Garantir visibilidade imediata do novo período criado
        // (mesmo que o utilizador estivesse com busca/filtro ativo).
        setSearch('');
        setFilterStatus('');
        setPage(1);
        setShowModal(false);
        await load({ search: '', status: '', page: 1 });
    };

    useEffect(() => { setPage(1); }, [search, filterStatus]);

    useEffect(() => { load(); }, [search, filterStatus, page]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-in">
            <style>{ACOES_CSS}</style>
            <AdminHeaderHero
                title="PERÍODOS DE CURSO"
                subtitle="Gerencie os períodos de curso da Upgrade em cada cidade"
                rightSlot={(
                    <button className="btn-primary" onClick={() => setShowModal(true)}>
                        ⚡ Novo Período de Curso
                    </button>
                )}
            />
            <AcoesSidebarTutorial />

            {/* KPIs */}
            {estatisticas && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
                    <KpiCard label="Total de Períodos" value={estatisticas.total} icon="⚡" color="#B89B00" bgColor="rgba(255,214,0,.07)" delay={0} />
                    <KpiCard label="Planejadas" value={estatisticas.planejadas} icon="📋" color="#D97706" bgColor="rgba(251,191,36,.09)" delay={80} />
                    <KpiCard label="Em Andamento" value={estatisticas.emAndamento} icon="🚀" color="#059669" bgColor="rgba(16,185,129,.08)" delay={160} />
                    <KpiCard label="Concluídas" value={estatisticas.concluidas} icon="✅" color="#1D4ED8" bgColor="rgba(37,99,235,.07)" delay={240} />
                    <KpiCard label="Canceladas" value={estatisticas.canceladas} icon="❌" color="#DC2626" bgColor="rgba(239,68,68,.07)" delay={320} />
                </div>
            )}

            {/* Filtros */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: '0.9rem' }}>🔍</span>
                    <input
                        type="text"
                        placeholder="Pesquisar períodos de curso..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px 10px 38px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: '0.88rem', color: '#111827', outline: 'none', background: '#fff' }}
                        onFocus={e => (e.target.style.borderColor = '#FFD600')}
                        onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    style={{ padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: '0.88rem', color: '#374151', outline: 'none', cursor: 'pointer', background: '#fff', minWidth: 180 }}
                >
                    <option value="">Todos os status</option>
                    <option value="PLANEJADA">Planejadas</option>
                    <option value="EM_ANDAMENTO">Em Andamento</option>
                    <option value="CONCLUIDA">Concluídas</option>
                    <option value="CANCELADA">Canceladas</option>
                </select>
                <div style={{ marginLeft: 'auto', alignSelf: 'center' }}>
                    <AdminViewModeToggle mode={listViewMode} onChange={setListViewMode} />
                </div>
            </div>

            {/* Conteúdo */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} style={{ height: 210, background: '#fff', borderRadius: 16, border: '1px solid #F3F4F6', animation: 'shimmerBg 1.5s infinite' }} />
                    ))}
                </div>
            ) : loadError ? (
                <div style={{ textAlign: 'center', padding: '44px 20px', background: '#fff', borderRadius: 16, border: '1px solid #FECACA' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 10 }}>⚠️</div>
                    <h3 style={{ color: '#B91C1C', fontSize: '1rem', margin: '0 0 6px', fontFamily: 'Orbitron' }}>Falha ao carregar períodos de curso</h3>
                    <p style={{ color: '#7F1D1D', fontSize: '0.82rem', margin: 0 }}>{loadError}</p>
                    <button className="btn-ghost" onClick={() => load({ search: '', status: '' })} style={{ marginTop: 14 }}>
                        Tentar novamente
                    </button>
                </div>
            ) : acoes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1px solid #F3F4F6' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 12, opacity: 0.35 }}>⚡</div>
                    <h3 style={{ color: '#374151', fontSize: '1.1rem', margin: '0 0 6px', fontFamily: 'Orbitron' }}>Nenhum período de curso encontrado</h3>
                    <p style={{ color: '#9CA3AF', fontSize: '0.85rem', margin: 0 }}>Crie o primeiro período de curso para começar a gerenciar as operações de campo.</p>
                </div>
            ) : listViewMode === 'table' ? (
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F3F4F6', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 720 }}>
                        <thead>
                            <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>
                                {['Período', 'Cidade', 'Datas', 'Status', 'Turmas', 'Equipe', 'Custos', 'Ações'].map((h, hi) => (
                                    <th key={hi} style={{ padding: '10px 12px', fontWeight: 800, color: '#64748B', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {acoes.map((acao, idx) => {
                                const cfg = statusConfig[acao.status];
                                const dot = statusDot[acao.status];
                                return (
                                    <tr key={acao.id} style={{ borderBottom: '1px solid #F3F4F6', background: idx % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#111827', maxWidth: 200 }}>{acao.nome}</td>
                                        <td style={{ padding: '10px 12px', color: '#475569' }}>{acao.cidade?.name}, {acao.cidade?.state}</td>
                                        <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.74rem', color: '#64748B', whiteSpace: 'nowrap' }}>{fmtDate(acao.dataInicio)} → {fmtDate(acao.dataFim)}</td>
                                        <td style={{ padding: '10px 12px' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: '0.65rem', fontWeight: 700, border: `1px solid ${cfg.border}` }}>
                                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot }} />{cfg.label}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 12px', fontFamily: 'Orbitron', fontWeight: 700, color: '#B89B00' }}>{acao._count?.turmas ?? 0}</td>
                                        <td style={{ padding: '10px 12px', fontFamily: 'Orbitron', fontWeight: 700 }}>{acao._count?.equipe ?? 0}</td>
                                        <td style={{ padding: '10px 12px', fontFamily: 'Orbitron', fontWeight: 700 }}>{acao._count?.custos ?? 0}</td>
                                        <td style={{ padding: '10px 12px' }}>
                                            <Link href={`/admin/acoes/${acao.id}`} style={{ padding: '6px 12px', borderRadius: 8, background: '#0F172A', color: '#FFD600', fontSize: '0.7rem', fontWeight: 800, textDecoration: 'none', display: 'inline-block' }}>Abrir</Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {acoes.map(acao => <AcaoCard key={acao.id} acao={acao} />)}
                </div>
            )}

            <AdminListPagination
                page={page}
                totalPages={totalPages}
                total={total}
                loading={loading}
                onPageChange={setPage}
                itemLabel="período(s)"
            />

            {showModal && <AcaoPeriodWizard onClose={() => setShowModal(false)} onCreated={handleCreatedFromModal} />}
            <style>{`@keyframes shimmerBg { 0%,100% { opacity:0.7; } 50% { opacity:0.4; } }`}</style>
        </div>
    );
}
