'use client';

import { useEffect, useState, useRef } from 'react';
import { dashboardApi, DashboardStats, Activity, UpcomingClass } from '@/lib/api/dashboard';
import { ClockIcon, CalendarIcon, MapPinIcon, BuildingLibraryIcon, UsersIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import api from '@/lib/api/client';

const MapaRotas = dynamic(() => import('@/components/MapaRotas'), { ssr: false, loading: () => (
    <div style={{ height: 360, background: '#0F172A', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '0.85rem' }}>Carregando mapa...</div>
) });

/* ── Count-up ── */
function useCountUp(target: number, duration = 1000) {
    const [count, setCount] = useState(0);
    const raf = useRef(0);
    useEffect(() => {
        if (target === 0) { setCount(0); return; }
        const start = Date.now();
        const tick = () => {
            const p = Math.min((Date.now() - start) / duration, 1);
            setCount(Math.round((1 - Math.pow(1 - p, 3)) * target));
            if (p < 1) raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf.current);
    }, [target, duration]);
    return count;
}

/* ── Clean sparkline (no glow, no broken emoji) ── */
function Sparkline({ data, color, width = 72, height = 28 }: { data: number[]; color: string; width?: number; height?: number }) {
    if (data.length < 2) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((v - min) / range) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible', display: 'block' }}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* End dot */}
            {(() => {
                const lx = width; const ly = height - ((data[data.length - 1] - min) / range) * height;
                return <circle cx={lx} cy={ly} r="3" fill={color} />;
            })()}
        </svg>
    );
}

/* ── Single KPI card — ultra compact ── */
function KPI({ label, value, sub, color, bg, border, spark, suffix = '' }: {
    label: string; value: number; sub?: string; color: string; bg: string; border: string;
    spark?: number[]; suffix?: string;
}) {
    const n = useCountUp(value, 1000);
    return (
        <div style={{ padding: '1rem 1.25rem', borderRadius: 14, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color, opacity: 0.65, marginBottom: '0.2rem', whiteSpace: 'nowrap' }}>{label}</div>
                <div style={{ fontFamily: 'Orbitron', fontSize: '1.65rem', fontWeight: 900, color, lineHeight: 1 }}>{n}{suffix}</div>
                {sub && <div style={{ fontSize: '0.65rem', color, opacity: 0.5, marginTop: '0.2rem', fontFamily: 'JetBrains Mono' }}>{sub}</div>}
            </div>
            {spark && <Sparkline data={spark} color={color} />}
        </div>
    );
}

const SPARK_ENROLL = [4, 8, 6, 14, 10, 18, 15, 20, 24, 21, 28];
const SPARK_ATTEND = [80, 83, 81, 86, 88, 84, 90, 88, 92, 90, 91];
const SPARK_CERT = [2, 5, 4, 9, 7, 12, 10, 14, 16, 15, 18];

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [upcoming, setUpcoming] = useState<UpcomingClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState('');
    const [rotasBiData, setRotasBiData] = useState<any>(null);
    const [biEstado, setBiEstado] = useState('TODOS');
    const [biAno, setBiAno] = useState(new Date().getFullYear().toString());
    const [biLoading, setBiLoading] = useState(false);

    useEffect(() => {
        load();
        loadRotasBi();
        const iv = setInterval(load, 30000);
        return () => clearInterval(iv);
    }, []);

    useEffect(() => { loadRotasBi(); }, [biEstado, biAno]);

    const load = async () => {
        try {
            const [s, a, u] = await Promise.all([
                dashboardApi.getStats(),
                dashboardApi.getRecentActivity(),
                dashboardApi.getUpcomingClasses(),
            ]);
            setStats(s); setActivities(a); setUpcoming(u);
            setLastUpdate(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        } catch { /* noop */ } finally { setLoading(false); }
    };

    const loadRotasBi = async () => {
        setBiLoading(true);
        try {
            const res = await api.get('/dashboard/rotas-bi', {
                params: { estado: biEstado !== 'TODOS' ? biEstado : undefined, ano: biAno }
            });
            setRotasBiData(res.data);
        } catch { setRotasBiData(null); } finally { setBiLoading(false); }
    };

    const maStudents = stats?.students.ma || 0;
    const piStudents = stats?.students.pi || 0;
    const totalStudents = stats?.students.total || 0;
    const maPct = totalStudents ? Math.round((maStudents / totalStudents) * 100) : 0;
    const piPct = 100 - maPct;

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div style={{ textAlign: 'center' }}>
                <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 1rem' }} />
                <p style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO...</p>
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }} className="animate-fade-in">

            {/* ── HEADER ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontFamily: 'Orbitron', fontSize: '2rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '0.25rem' }}>DASHBOARD</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Visão geral · Sistema Qualifica MA &amp; PI</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.9rem', borderRadius: 9, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#059669', display: 'inline-block', boxShadow: '0 0 0 2px rgba(5,150,105,0.25)' }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', fontFamily: 'JetBrains Mono', letterSpacing: '0.06em' }}>ONLINE</span>
                    {lastUpdate && <span style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>· {lastUpdate}</span>}
                </div>
            </div>

            {/* ── ROW 1: PRIMARY KPIs ── */}
            <div className="grid-4-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem' }}>
                <KPI label="Cursos Ativos" value={stats?.courses.active || 0} sub={`de ${stats?.courses.total || 0} cursos`} color="#B89B00" bg="#FFFDE7" border="#FEF08A" spark={[3, 5, 4, 7, 6, 8, 7, 9, 8, 10, 9]} />
                <KPI label="Total de Alunos" value={totalStudents} sub={`MA ${maStudents} · PI ${piStudents}`} color="#0891B2" bg="#F0F9FF" border="#BAE6FD" spark={[10, 15, 13, 18, 16, 20, 19, 22, 24, 21, 26]} />
                <KPI label="Turmas Ativas" value={stats?.classes.active || 0} sub={`de ${stats?.classes.total || 0} turmas`} color="#059669" bg="#F0FDF4" border="#BBF7D0" spark={[2, 3, 3, 5, 4, 6, 5, 7, 6, 8, 7]} />
                <KPI label="Inscrições Pendentes" value={stats?.enrollments.pending || 0} sub={`${stats?.enrollments.total || 0} inscrições total`} color="#EA580C" bg="#FFF7ED" border="#FED7AA" spark={SPARK_ENROLL} />
            </div>

            {/* ── ROW 2: SECONDARY METRICS ── */}
            <div className="grid-3-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
                <KPI label="Taxa de Aprovação" value={87} suffix="%" color="#B89B00" bg="#FFFDE7" border="#FEF08A" spark={[60, 70, 65, 80, 75, 82, 87, 85, 89, 88, 87]} />
                <KPI label="Frequência Média" value={91} suffix="%" color="#059669" bg="#F0FDF4" border="#BBF7D0" spark={SPARK_ATTEND} />
                <KPI label="Certificados Emitidos" value={stats?.enrollments.total ? Math.floor(stats.enrollments.total * 0.3) : 0} color="#0891B2" bg="#F0F9FF" border="#BAE6FD" spark={SPARK_CERT} />
            </div>

            {/* ── ROW 3: STATES BAR ── */}
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', padding: '0.85rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.72rem', color: '#9CA3AF', letterSpacing: '0.1em' }}>DISTRIBUIÇÃO DE ALUNOS</span>
                    </div>
                    {[
                        { state: 'MA', label: 'Maranhão', n: maStudents, pct: maPct, color: '#0891B2', border: '#BAE6FD', bg: '#E0F2FE' },
                        { state: 'PI', label: 'Piauí', n: piStudents, pct: piPct, color: '#059669', border: '#BBF7D0', bg: '#DCFCE7' },
                    ].map(s => (
                        <div key={s.state} style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span style={{ padding: '0.15rem 0.5rem', borderRadius: 100, background: s.bg, color: s.color, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.08em' }}>{s.state}</span>
                                    <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>{s.label}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                                    <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1rem', color: s.color }}>{s.n}</span>
                                    <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{s.pct}%</span>
                                </div>
                            </div>
                            <div style={{ height: 5, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${s.pct}%`, background: s.color, borderRadius: 3, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── ROW 4: ACTIVITIES + UPCOMING ── */}
            <div className="grid-2-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                {/* Recent Activity */}
                <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFDE7' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ClockIcon style={{ width: 14, height: 14, color: '#B89B00' }} />
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#111827' }}>Atividades Recentes</span>
                        </div>
                        <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.75rem', color: '#B89B00' }}>{activities.length}</span>
                    </div>
                    <div className="custom-scrollbar" style={{ maxHeight: 300, overflowY: 'auto' }}>
                        {activities.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#D1D5DB' }}>
                                <div style={{ width: 32, height: 32, borderRadius: 9, background: '#F9FAFB', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                                    <ClockIcon style={{ width: 16, height: 16, color: '#D1D5DB' }} />
                                </div>
                                <p style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>Nenhuma atividade recente</p>
                            </div>
                        ) : activities.map((a, i) => (
                            <div key={i} style={{ padding: '0.7rem 1rem', borderBottom: '1px solid #F9FAFB', display: 'flex', gap: '0.65rem', transition: 'background 0.15s' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FFFDE7'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FFFFFF'}
                            >
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFD600', flexShrink: 0, marginTop: '0.4rem' }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#111827', marginBottom: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.action}</p>
                                    <p style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{a.description}</p>
                                    <p style={{ fontSize: '0.62rem', color: '#D1D5DB', marginTop: '0.15rem', fontFamily: 'JetBrains Mono' }}>{new Date(a.timestamp).toLocaleString('pt-BR')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Upcoming Classes */}
                <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F0F9FF' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CalendarIcon style={{ width: 14, height: 14, color: '#0891B2' }} />
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#111827' }}>Próximas Turmas</span>
                        </div>
                        <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.75rem', color: '#0891B2' }}>{upcoming.length}</span>
                    </div>
                    <div className="custom-scrollbar" style={{ maxHeight: 300, overflowY: 'auto' }}>
                        {upcoming.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                                <div style={{ width: 32, height: 32, borderRadius: 9, background: '#F9FAFB', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                                    <CalendarIcon style={{ width: 16, height: 16, color: '#D1D5DB' }} />
                                </div>
                                <p style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>Nenhuma turma próxima</p>
                            </div>
                        ) : upcoming.slice(0, 6).map((item, i) => (
                            <div key={item.id} style={{ padding: '0.7rem 1rem', borderBottom: '1px solid #F9FAFB', transition: 'background 0.15s' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F0F9FF'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FFFFFF'}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#111827', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '0.5rem' }}>{item.course.name}</span>
                                    <span style={{ padding: '0.15rem 0.5rem', borderRadius: 100, fontSize: '0.62rem', fontWeight: 700, background: '#F0F9FF', color: '#0891B2', border: '1px solid #BAE6FD', whiteSpace: 'nowrap', flexShrink: 0 }}>{item._count.enrollments} alunos</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{item.city?.name} — {item.city?.state}</span>
                                    <span style={{ fontSize: '0.62rem', fontFamily: 'JetBrains Mono', color: '#0891B2', fontWeight: 700 }}>
                                        {new Date(item.startDate).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── ROW 5: QUICK LINKS ── */}
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', padding: '0.85rem 1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9CA3AF' }}>Acesso Rápido</span>
                    <div style={{ width: 1, height: 18, background: '#E5E7EB' }} />
                    {[
                        { label: 'Inscrições', href: '/admin/inscricoes', color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
                        { label: 'Frequência', href: '/admin/frequencia', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
                        { label: 'Certificados', href: '/admin/certificados', color: '#B89B00', bg: '#FFFDE7', border: '#FEF08A' },
                        { label: 'Relatórios', href: '/admin/relatorios', color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD' },
                        { label: 'Alunos', href: '/admin/alunos', color: '#374151', bg: '#F9FAFB', border: '#E5E7EB' },
                        { label: 'Turmas', href: '/admin/turmas', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
                    ].map(l => (
                        <Link key={l.href} href={l.href}
                            style={{ padding: '0.4rem 0.9rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none', background: l.bg, border: `1px solid ${l.border}`, color: l.color, transition: 'all 0.18s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 10px ${l.color}22`; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                        >
                            {l.label}
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── ROW 6: ROTAS BI ── */}
            <div style={{ background: '#0F172A', borderRadius: 16, border: '1px solid rgba(255,214,0,0.15)', overflow: 'hidden' }}>
                {/* Header BI */}
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                        <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.9rem', color: '#FFD600', letterSpacing: '0.08em' }}>ROTAS & BI</h2>
                        <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: 2 }}>Análise de ações de campo por estado e ano</p>
                    </div>
                    {/* Filtros */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select value={biEstado} onChange={e => setBiEstado(e.target.value)}
                            style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.35rem 0.75rem', color: '#F1F5F9', fontSize: '0.8rem', cursor: 'pointer', height: 36 }}>
                            <option value="TODOS">Todos estados</option>
                            <option value="MA">Maranhão (MA)</option>
                            <option value="PI">Piauí (PI)</option>
                            <option value="AC">Acre (AC)</option>
                        </select>
                        <select value={biAno} onChange={e => setBiAno(e.target.value)}
                            style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.35rem 0.75rem', color: '#F1F5F9', fontSize: '0.8rem', cursor: 'pointer', height: 36 }}>
                            {[2024, 2025, 2026].map(y => <option key={y} value={String(y)}>{y}</option>)}
                        </select>
                    </div>
                </div>

                {/* KPI Cards BI */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', padding: '1rem 1.25rem' }}>
                    {[
                        { label: 'Total de Rotas', value: biLoading ? '...' : String(rotasBiData?.totalRotas ?? 0), color: '#FFD600', icon: <MapPinIcon style={{ width: 20, height: 20 }} /> },
                        { label: 'Cidades Beneficiadas', value: biLoading ? '...' : String(rotasBiData?.cidadesBeneficiadas ?? 0), color: '#10B981', icon: <BuildingLibraryIcon style={{ width: 20, height: 20 }} /> },
                        { label: 'Total de Inscritos', value: biLoading ? '...' : String(rotasBiData?.totalInscritos ?? 0), color: '#0EA5E9', icon: <UsersIcon style={{ width: 20, height: 20 }} /> },
                    ].map(item => (
                        <div key={item.label} style={{ background: '#1E293B', borderRadius: 12, padding: '1rem', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${item.color}18`, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</div>
                            <div>
                                <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.4rem', color: '#F1F5F9', lineHeight: 1 }}>{item.value}</div>
                                <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Mapa interativo */}
                <div style={{ padding: '0 1.25rem 1rem' }}>
                    <MapaRotas rotas={rotasBiData?.rotas || []} />
                </div>

                {/* Tabela de rotas */}
                <div style={{ margin: '0 1.25rem 1.25rem', background: '#1E293B', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                                    {['Cidade', 'Estado', 'Status', 'Início', 'Turmas', 'Inscritos'].map(h => (
                                        <th key={h} style={{ padding: '0.6rem 0.875rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {!rotasBiData?.rotas?.length ? (
                                    <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>Nenhuma rota encontrada</td></tr>
                                ) : rotasBiData.rotas.slice(0, 10).map((r: any) => {
                                    const statusStyle: Record<string, { bg: string; color: string }> = {
                                        PLANEJADA: { bg: 'rgba(14,165,233,0.12)', color: '#0EA5E9' },
                                        EM_ANDAMENTO: { bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
                                        CONCLUIDA: { bg: 'rgba(100,116,139,0.12)', color: '#64748B' },
                                    };
                                    const st = statusStyle[r.status] || statusStyle.PLANEJADA;
                                    return (
                                        <tr key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '0.6rem 0.875rem', color: '#F1F5F9', fontWeight: 600 }}>{r.cidade || '—'}</td>
                                            <td style={{ padding: '0.6rem 0.875rem', color: '#94A3B8' }}>{r.estado || '—'}</td>
                                            <td style={{ padding: '0.6rem 0.875rem' }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: st.bg, color: st.color }}>
                                                    {r.status?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.6rem 0.875rem', color: '#94A3B8', fontFamily: 'monospace' }}>{r.dataInicio ? new Date(r.dataInicio).toLocaleDateString('pt-BR') : '—'}</td>
                                            <td style={{ padding: '0.6rem 0.875rem', color: '#F1F5F9', textAlign: 'center' }}>{r.totalTurmas}</td>
                                            <td style={{ padding: '0.6rem 0.875rem', color: '#FFD600', fontWeight: 700, textAlign: 'center' }}>{r.totalInscritos}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
