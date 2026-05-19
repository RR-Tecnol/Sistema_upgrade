'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AcademicCapIcon, BoltIcon, PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { coursesApi } from '@/lib/api/courses';
import { classesApi } from '@/lib/api/classes';
import { acoesApi } from '@/lib/api/acoes';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AdminViewModeToggle from '@/components/admin/AdminViewModeToggle';
import { usePersistedAdminViewMode } from '@/hooks/usePersistedAdminViewMode';
import { unwrapListData } from '@/lib/api/pagination';

type SectionTab = 'cursos' | 'periodos' | 'turmas';

export default function GestaoAcademicaPage() {
    const router = useRouter();
    // FUTURE_DEPLOY: Gestão Integrada em stand-by neste deploy.
    // O código completo desta tela está preservado abaixo para retomada futura.
    const STANDBY_GESTAO_INTEGRADA = true;
    const [tab, setTab] = useState<SectionTab>('cursos');
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState<any[]>([]);
    const [periods, setPeriods] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [cursosViewMode, setCursosViewMode] = usePersistedAdminViewMode('admin:gestao-academica:cursos', 'card');
    const [periodosViewMode, setPeriodosViewMode] = usePersistedAdminViewMode('admin:gestao-academica:periodos', 'card');
    const [turmasViewMode, setTurmasViewMode] = usePersistedAdminViewMode('admin:gestao-academica:turmas', 'card');

    useEffect(() => {
        if (!STANDBY_GESTAO_INTEGRADA) return;
        router.replace('/admin/cursos');
    }, [router]);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            coursesApi.getAll({ limit: 500, page: 1 }).catch(() => []),
            acoesApi.listar({ limit: 500, page: 1 }).catch(() => []),
            classesApi.getAll({ limit: 500, page: 1 }).catch(() => []),
        ])
            .then(([c, p, t]) => {
                setCourses(unwrapListData(c));
                setPeriods(unwrapListData(p));
                setClasses(unwrapListData(t));
            })
            .finally(() => setLoading(false));
    }, []);

    const summary = useMemo(() => {
        const activeCourses = courses.filter(c => c.active).length;
        const openClasses = classes.filter(t => t.status === 'ENROLLMENT_OPEN').length;
        const inProgressPeriods = periods.filter(p => p.status === 'EM_ANDAMENTO').length;
        return { activeCourses, openClasses, inProgressPeriods };
    }, [courses, classes, periods]);

    const sectionButton = (value: SectionTab, label: string, icon: React.ReactNode) => (
        <button
            type="button"
            onClick={() => setTab(value)}
            style={{
                borderRadius: 10,
                border: `1px solid ${tab === value ? '#FFD600' : '#E5E7EB'}`,
                background: tab === value ? '#FFFDE7' : '#fff',
                color: tab === value ? '#B89B00' : '#6B7280',
                padding: '0.5rem 0.9rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
            }}
        >
            {icon}
            {label}
        </button>
    );

    if (STANDBY_GESTAO_INTEGRADA) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }} className="animate-fade-in">
            <AdminHeaderHero
                title="GESTÃO INTEGRADA"
                subtitle="Cursos, Períodos e Turmas em uma única aba ramificada"
                badge="SEM REGRESSÃO VISUAL"
                rightSlot={(
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Link
                            href="/admin/gestao-academica/novo"
                            style={{
                                borderRadius: 9,
                                border: '1px solid #EAB308',
                                background: '#FFD600',
                                color: '#111827',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                                textDecoration: 'none',
                                padding: '0.5rem 0.85rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            <PlusIcon style={{ width: 14, height: 14 }} />
                            Novo Fluxo
                        </Link>
                    </div>
                )}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '0.75rem' }}>
                <AnimatedKpiCard label="Cursos Ativos" value={summary.activeCourses} color="#B89B00" bg="#FFFDE7" border="#FEF08A" icon={<AcademicCapIcon style={{ width: 16, height: 16 }} />} compact />
                <AnimatedKpiCard label="Períodos em Andamento" value={summary.inProgressPeriods} color="#EA580C" bg="#FFF7ED" border="#FED7AA" icon={<BoltIcon style={{ width: 16, height: 16 }} />} compact />
                <AnimatedKpiCard label="Turmas c/ Inscrição Aberta" value={summary.openClasses} color="#0891B2" bg="#F0F9FF" border="#BAE6FD" icon={<UserGroupIcon style={{ width: 16, height: 16 }} />} compact />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {sectionButton('cursos', 'Sessão Cursos', <AcademicCapIcon style={{ width: 14, height: 14 }} />)}
                {sectionButton('periodos', 'Sessão Períodos', <BoltIcon style={{ width: 14, height: 14 }} />)}
                {sectionButton('turmas', 'Sessão Turmas', <UserGroupIcon style={{ width: 14, height: 14 }} />)}
            </div>

            {loading ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem', color: '#9CA3AF' }}>
                    Carregando dados da gestão integrada...
                </div>
            ) : (
                <div className="glass-card" style={{ padding: '1rem' }}>
                    {tab === 'cursos' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.78rem', letterSpacing: '0.1em', color: '#374151' }}>CURSOS (MÓDULO EXISTENTE)</h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <AdminViewModeToggle mode={cursosViewMode} onChange={setCursosViewMode} />
                                    <Link href="/admin/cursos" style={{ fontSize: '0.75rem', color: '#1D4ED8', fontWeight: 700, textDecoration: 'none' }}>Abrir tela completa</Link>
                                </div>
                            </div>
                            {cursosViewMode === 'table' ? (
                                <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: 12 }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: 480 }}>
                                        <thead>
                                            <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>
                                                {['Curso', 'Carga', 'Estado', ''].map((h, hi) => (
                                                    <th key={hi} style={{ padding: '8px 12px', fontWeight: 800, color: '#64748B', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {courses.slice(0, 8).map((c, idx) => (
                                                <tr key={c.id} style={{ borderBottom: '1px solid #F3F4F6', background: idx % 2 ? '#FAFBFC' : '#fff' }}>
                                                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#111827' }}>{c.name}</td>
                                                    <td style={{ padding: '8px 12px', fontFamily: 'Orbitron', fontWeight: 700, color: '#B89B00' }}>{c.workloadHours}h</td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, background: c.active ? '#DCFCE7' : '#F3F4F6', color: c.active ? '#15803D' : '#6B7280' }}>{c.active ? 'Ativo' : 'Inativo'}</span>
                                                    </td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <Link href={`/admin/cursos/${c.id}`} style={{ fontSize: '0.73rem', color: '#B89B00', textDecoration: 'none', fontWeight: 700 }}>Ver</Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                courses.slice(0, 8).map(c => (
                                    <div key={c.id} style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '0.65rem 0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#111827' }}>{c.name}</div>
                                            <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>{c.workloadHours}h • {c.active ? 'Ativo' : 'Inativo'}</div>
                                        </div>
                                        <Link href={`/admin/cursos/${c.id}`} style={{ fontSize: '0.73rem', color: '#B89B00', textDecoration: 'none', fontWeight: 700 }}>Ver</Link>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {tab === 'periodos' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.78rem', letterSpacing: '0.1em', color: '#374151' }}>PERÍODOS DE CURSO (MÓDULO EXISTENTE)</h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <AdminViewModeToggle mode={periodosViewMode} onChange={setPeriodosViewMode} />
                                    <Link href="/admin/acoes" style={{ fontSize: '0.75rem', color: '#1D4ED8', fontWeight: 700, textDecoration: 'none' }}>Abrir tela completa</Link>
                                </div>
                            </div>
                            {periodosViewMode === 'table' ? (
                                <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: 12 }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: 480 }}>
                                        <thead>
                                            <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>
                                                {['Período', 'Cidade', 'Status', ''].map((h, hi) => (
                                                    <th key={hi} style={{ padding: '8px 12px', fontWeight: 800, color: '#64748B', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {periods.slice(0, 8).map((p, idx) => (
                                                <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6', background: idx % 2 ? '#FAFBFC' : '#fff' }}>
                                                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#111827' }}>{p.nome}</td>
                                                    <td style={{ padding: '8px 12px', color: '#475569' }}>{p.cidadeNome}</td>
                                                    <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: '0.74rem', color: '#64748B' }}>{p.status}</td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <Link href={`/admin/acoes/${p.id}`} style={{ fontSize: '0.73rem', color: '#B89B00', textDecoration: 'none', fontWeight: 700 }}>Ver</Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                periods.slice(0, 8).map(p => (
                                    <div key={p.id} style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '0.65rem 0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#111827' }}>{p.nome}</div>
                                            <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>{p.cidadeNome} • {p.status}</div>
                                        </div>
                                        <Link href={`/admin/acoes/${p.id}`} style={{ fontSize: '0.73rem', color: '#B89B00', textDecoration: 'none', fontWeight: 700 }}>Ver</Link>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {tab === 'turmas' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.78rem', letterSpacing: '0.1em', color: '#374151' }}>TURMAS (MÓDULO EXISTENTE)</h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <AdminViewModeToggle mode={turmasViewMode} onChange={setTurmasViewMode} />
                                    <Link href="/admin/turmas" style={{ fontSize: '0.75rem', color: '#1D4ED8', fontWeight: 700, textDecoration: 'none' }}>Abrir tela completa</Link>
                                </div>
                            </div>
                            {turmasViewMode === 'table' ? (
                                <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: 12 }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: 520 }}>
                                        <thead>
                                            <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>
                                                {['Turma', 'Curso', 'Cidade', 'Status', ''].map((h, hi) => (
                                                    <th key={hi} style={{ padding: '8px 12px', fontWeight: 800, color: '#64748B', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {classes.slice(0, 8).map((cl, idx) => (
                                                <tr key={cl.id} style={{ borderBottom: '1px solid #F3F4F6', background: idx % 2 ? '#FAFBFC' : '#fff' }}>
                                                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#111827', fontFamily: 'JetBrains Mono', fontSize: '0.78rem' }}>{cl.classIdentifier}</td>
                                                    <td style={{ padding: '8px 12px', color: '#374151' }}>{cl.course?.name || '—'}</td>
                                                    <td style={{ padding: '8px 12px', color: '#475569' }}>{cl.city?.name || '—'}</td>
                                                    <td style={{ padding: '8px 12px', fontSize: '0.72rem', color: '#64748B' }}>{cl.status}</td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <Link href={`/admin/turmas/${cl.id}`} style={{ fontSize: '0.73rem', color: '#B89B00', textDecoration: 'none', fontWeight: 700 }}>Ver</Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                classes.slice(0, 8).map(t => (
                                    <div key={t.id} style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '0.65rem 0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#111827' }}>{t.classIdentifier}</div>
                                            <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>{t.course?.name || 'Curso'} • {t.city?.name || 'Cidade'} • {t.status}</div>
                                        </div>
                                        <Link href={`/admin/turmas/${t.id}`} style={{ fontSize: '0.73rem', color: '#B89B00', textDecoration: 'none', fontWeight: 700 }}>Ver</Link>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

