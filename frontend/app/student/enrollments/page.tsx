'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api/client';
import { DocumentTextIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';

interface Enrollment {
    id: string;
    protocol: string;
    status: string;
    createdAt: string;
    class: {
        id: string;
        classIdentifier?: string;
        course: { name: string; workloadHours?: number };
        city: { name: string; state: string };
        startDate?: string;
        endDate?: string;
    };
}

interface AvailableClass {
    id: string;
    classIdentifier: string;
    startDate: string;
    endDate: string;
    vacancies: number;
    course: { name: string; workloadHours: number };
    city: { name: string; state: string };
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    PENDING:          { label: 'Pendente',       color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    APPROVED:         { label: 'Aprovado',        color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
    ENROLLED:         { label: 'Matriculado',     color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    REJECTED:         { label: 'Rejeitado',       color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    WAITLIST:         { label: 'Lista de Espera', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
    DOCUMENT_PENDING: { label: 'Doc. Pendente',   color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
    DROPOUT:          { label: 'Desistiu',        color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
};

const FILTERS = ['ALL', 'PENDING', 'APPROVED', 'ENROLLED', 'REJECTED', 'WAITLIST'];
const FILTER_LABELS: Record<string, string> = {
    ALL: 'Todas', PENDING: 'Pendentes', APPROVED: 'Aprovadas',
    ENROLLED: 'Matriculado', REJECTED: 'Rejeitadas', WAITLIST: 'Espera',
};

function fmtDate(d?: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function StudentEnrollments() {
    const router = useRouter();
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [available, setAvailable] = useState<AvailableClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingAvail, setLoadingAvail] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [tab, setTab] = useState<'minhas' | 'disponiveis'>('minhas');

    useEffect(() => {
        api.get('/students/me/enrollments')
            .then(r => setEnrollments(Array.isArray(r.data) ? r.data : []))
            .catch(() => setEnrollments([]))
            .finally(() => setLoading(false));

        api.get('/classes', { params: { status: 'ENROLLMENT_OPEN', limit: 20 } })
            .then(r => {
                const data = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
                setAvailable(data);
            })
            .catch(() => setAvailable([]))
            .finally(() => setLoadingAvail(false));
    }, []);

    const filtered = enrollments.filter(e => filter === 'ALL' || e.status === filter);

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <AdminHeaderHero
                title="INSCRIÇÕES"
                subtitle="Gerencie suas inscrições e explore novos cursos disponíveis"
                badge="PORTAL DO ALUNO"
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.75rem' }}>
                <AnimatedKpiCard label="Total" value={enrollments.length} color="#0891B2" bg="#F0F9FF" border="#BAE6FD" compact />
                <AnimatedKpiCard label="Pendentes" value={enrollments.filter(e => e.status === 'PENDING').length} color="#B89B00" bg="#FFFDE7" border="#FEF08A" compact />
                <AnimatedKpiCard label="Aprovadas" value={enrollments.filter(e => e.status === 'APPROVED' || e.status === 'ENROLLED').length} color="#059669" bg="#F0FDF4" border="#BBF7D0" compact />
                <AnimatedKpiCard label="Disponíveis" value={available.length} color="#7C3AED" bg="#F5F3FF" border="#DDD6FE" compact />
            </div>

            {/* Tabs — PASSO 3.10 */}
            <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '2px solid #F3F4F6' }}>
                {([['minhas', `Minhas Inscrições (${enrollments.length})`], ['disponiveis', `Cursos Disponíveis (${available.length})`]] as [string, string][]).map(([t, label]) => (
                    <button key={t} onClick={() => setTab(t as any)} style={{
                        padding: '0.55rem 1rem', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
                        fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.15s',
                        background: tab === t ? '#FFD600' : 'transparent',
                        color: tab === t ? '#000' : '#9CA3AF',
                        borderBottom: tab === t ? '2px solid #FFD600' : '2px solid transparent',
                        marginBottom: -2,
                    }}>{label}</button>
                ))}
            </div>

            {/* ── ABA: Minhas Inscrições ── */}
            {tab === 'minhas' && (
                <>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {FILTERS.map(f => {
                            const isActive = filter === f;
                            return (
                                <button key={f} onClick={() => setFilter(f)} style={{
                                    padding: '0.3rem 0.85rem', borderRadius: 100, fontSize: '0.75rem',
                                    fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                                    background: isActive ? '#FFD600' : '#F3F4F6',
                                    color: isActive ? '#000' : '#6B7280',
                                    boxShadow: isActive ? '0 2px 8px rgba(255,214,0,0.35)' : 'none',
                                }}>
                                    {FILTER_LABELS[f]}
                                </button>
                            );
                        })}
                    </div>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '3rem' }}>
                            <div className="spinner" style={{ margin: '0 auto 1rem', width: 36, height: 36 }} />
                            <div style={{ color: '#9CA3AF', fontSize: '0.82rem' }}>Carregando suas inscrições...</div>
                        </div>
                    ) : (
                    <>
                        {/* ── Missão Ativa para PENDING ── */}
                        {(() => {
                            const pending = enrollments.filter(e => e.status === 'PENDING');
                            if (pending.length === 0) return null;
                            return (
                                <div style={{
                                    padding: '0.85rem 1.25rem', borderRadius: 14,
                                    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                                    border: '1.5px solid rgba(245,158,11,0.5)',
                                    borderLeft: '4px solid #F59E0B',
                                    boxShadow: '0 2px 12px rgba(245,158,11,0.12)',
                                }} className="animate-fade-in">
                                    <style>{`
                                        @keyframes missionPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
                                        @keyframes progressAnim { 0%{width:15%} 50%{width:70%} 100%{width:15%} }
                                    `}</style>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                                        <span style={{ fontSize: '1rem', display: 'inline-block', animation: 'missionPulse 1.5s ease-in-out infinite' }}>⏳</span>
                                        <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.7rem', color: '#92400E', letterSpacing: '0.1em' }}>⚡ MISSÃO ATIVA</span>
                                        <span style={{
                                            marginLeft: 'auto', padding: '0.15rem 0.6rem', borderRadius: 100,
                                            background: '#F59E0B', border: 'none',
                                            fontSize: '0.65rem', fontWeight: 700, color: '#FFFFFF',
                                        }}>{pending.length} aguardando</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                                        {pending.slice(0, 3).map(e => (
                                            <div key={e.id} style={{
                                                display: 'flex', alignItems: 'center', gap: '0.65rem',
                                                padding: '0.5rem 0.75rem', borderRadius: 9,
                                                background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(245,158,11,0.2)',
                                            }}>
                                                <span style={{ fontSize: '0.9rem' }}>🎓</span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {e.class.course.name}
                                                    </div>
                                                    <div style={{ fontSize: '0.62rem', color: '#6B7280', marginTop: 1 }}>
                                                        {e.class.city.name}/{e.class.city.state} · {e.protocol}
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#92400E', whiteSpace: 'nowrap' }}>Em análise</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ fontSize: '0.6rem', color: '#92400E', opacity: 0.8 }}>Aguardando aprovação da coordenação</span>
                                            <span style={{ fontSize: '0.6rem', color: '#92400E', fontWeight: 700 }}>+50 XP ao ser aprovado</span>
                                        </div>
                                        <div style={{ height: 5, borderRadius: 3, background: 'rgba(245,158,11,0.2)', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%', borderRadius: 3,
                                                background: 'linear-gradient(90deg, #F59E0B, #FFD600)',
                                                animation: 'progressAnim 2s ease-in-out infinite',
                                            }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* ── Lista de inscrições ── */}
                        {filtered.length === 0 ? (
                        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '3.5rem', textAlign: 'center' }}>
                            <DocumentTextIcon style={{ width: 48, height: 48, color: '#D1D5DB', margin: '0 auto 1rem' }} />
                            <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.72rem', letterSpacing: '0.12em', color: '#9CA3AF' }}>NENHUMA INSCRIÇÃO ENCONTRADA</div>
                            <p style={{ color: '#9CA3AF', fontSize: '0.78rem', marginTop: '0.5rem' }}>
                                {filter !== 'ALL' ? 'Tente outro filtro.' : 'Explore os cursos disponíveis na aba ao lado.'}
                            </p>
                            {filter === 'ALL' && (
                                <button onClick={() => setTab('disponiveis')} className="btn-primary" style={{ marginTop: '1rem' }}>
                                    Ver Cursos Disponíveis
                                </button>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {filtered.map((enrollment, i) => {
                                const cfg = STATUS_CFG[enrollment.status] || { label: enrollment.status, color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' };
                                return (
                                    <div key={enrollment.id} className="animate-scale-in"
                                        style={{
                                            animationDelay: `${i * 50}ms`,
                                            borderRadius: 14,
                                            // Gradiente por status
                                            background: (
                                                {
                                                    ENROLLED:         'linear-gradient(145deg,#eff6ff,#dbeafe)',
                                                    APPROVED:         'linear-gradient(145deg,#f0fdf4,#dcfce7)',
                                                    PENDING:          'linear-gradient(145deg,#fffdf5,#fffde7)',
                                                    REJECTED:         'linear-gradient(145deg,#fff5f5,#fee2e2)',
                                                    WAITLIST:         'linear-gradient(145deg,#faf5ff,#ede9fe)',
                                                    DOCUMENT_PENDING: 'linear-gradient(145deg,#fff7ed,#ffedd5)',
                                                    DROPOUT:          '#F9FAFB',
                                                } as Record<string, string>
                                            )[enrollment.status] || 'linear-gradient(145deg,#fffdf5,#fffde7)',
                                            border: `1.5px solid ${cfg.border}`,
                                            borderLeft: `4px solid ${cfg.color}`,
                                            padding: '1.1rem 1.25rem',
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                                            transition: 'box-shadow 0.2s',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
                                        onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)')}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                                                    <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827', margin: 0 }}>
                                                        {enrollment.class.course.name}
                                                    </h3>
                                                    <span style={{ padding: '0.18rem 0.6rem', borderRadius: 100, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                                                        {cfg.label.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem', color: '#6B7280' }}>
                                                    {enrollment.class.classIdentifier && <span>📋 {enrollment.class.classIdentifier}</span>}
                                                    <span>📍 {enrollment.class.city.name}/{enrollment.class.city.state}</span>
                                                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem' }}>🔖 {enrollment.protocol}</span>
                                                    <span>📅 {new Date(enrollment.createdAt).toLocaleDateString('pt-BR')}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Botão Ver esta turma — ENROLLED e APPROVED com link específico */}
                                        {(enrollment.status === 'ENROLLED' || enrollment.status === 'APPROVED') && enrollment.class.id && (
                                            <div style={{ marginTop: '0.65rem', display: 'flex', justifyContent: 'flex-end' }}>
                                                <a
                                                    href={`/student/classes/${enrollment.class.id}`}
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                                        padding: '0.35rem 0.85rem', borderRadius: 8,
                                                        background: enrollment.status === 'ENROLLED'
                                                            ? 'linear-gradient(135deg,#FFD600,#F59E0B)'
                                                            : 'linear-gradient(135deg,#dcfce7,#bbf7d0)',
                                                        color: enrollment.status === 'ENROLLED' ? '#000' : '#059669',
                                                        textDecoration: 'none', fontWeight: 700, fontSize: '0.72rem',
                                                        border: enrollment.status === 'ENROLLED' ? 'none' : '1px solid rgba(16,185,129,0.3)',
                                                        transition: 'all 0.15s',
                                                    }}
                                                >
                                                    🎓 Ver esta turma →
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        )}

                    </>
                    )}
                </>
            )}

            {/* ── ABA: Cursos Disponíveis (PASSO 3.10) ── */}
            {tab === 'disponiveis' && (
                <>
                    {loadingAvail ? (
                        <div style={{ textAlign: 'center', padding: '3rem' }}>
                            <div className="spinner" style={{ margin: '0 auto 1rem', width: 36, height: 36 }} />
                            <div style={{ color: '#9CA3AF', fontSize: '0.82rem' }}>Buscando cursos disponíveis...</div>
                        </div>
                    ) : available.length === 0 ? (
                        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '3.5rem', textAlign: 'center' }}>
                            <AcademicCapIcon style={{ width: 48, height: 48, color: '#D1D5DB', margin: '0 auto 1rem' }} />
                            <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.72rem', letterSpacing: '0.12em', color: '#9CA3AF' }}>
                                NENHUM CURSO COM INSCRIÇÕES ABERTAS
                            </div>
                            <p style={{ color: '#9CA3AF', fontSize: '0.78rem', marginTop: '0.5rem' }}>
                                Novas turmas serão anunciadas em breve.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                            {available.map((cls, i) => (
                                <div key={cls.id} className="animate-scale-in" style={{
                                    animationDelay: `${i * 60}ms`,
                                    background: '#fff', borderRadius: 16,
                                    border: '1.5px solid rgba(255,214,0,0.3)',
                                    padding: '1.25rem',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                                    display: 'flex', flexDirection: 'column', gap: '0.85rem',
                                    transition: 'all 0.2s',
                                }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(255,214,0,0.15)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,214,0,0.6)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,214,0,0.3)'; }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ padding: '0.2rem 0.65rem', borderRadius: 100, background: '#DCFCE7', color: '#059669', border: '1px solid #BBF7D0', fontSize: '0.65rem', fontWeight: 800 }}>
                                            ✓ INSCRIÇÕES ABERTAS
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: '#6B7280', fontWeight: 600 }}>
                                            {cls.vacancies} vagas
                                        </span>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827', marginBottom: '0.2rem' }}>
                                            {cls.course.name}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                                            {cls.course.workloadHours}h · {cls.classIdentifier}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.75rem', color: '#6B7280' }}>
                                        <span>📍 {cls.city.name}/{cls.city.state}</span>
                                        <span>📅 {fmtDate(cls.startDate)} → {fmtDate(cls.endDate)}</span>
                                    </div>
                                    {/* PASSO 3.10 — botão de inscrição */}
                                    <button
                                        onClick={() => router.push(`/inscricao/${cls.id}`)}
                                        className="btn-primary"
                                        style={{ justifyContent: 'center', marginTop: 'auto' }}
                                    >
                                        🎓 Inscrever-se
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
