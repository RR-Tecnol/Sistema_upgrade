'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api/client';
import Link from 'next/link';
import {
    ArrowLeftIcon,
    UserGroupIcon,
    ChartBarIcon,
    CalendarDaysIcon,
    CheckCircleIcon,
    ClockIcon,
    AcademicCapIcon,
} from '@heroicons/react/24/outline';

interface ClassDetail {
    id: string;
    classIdentifier: string;
    status: string;
    startDate: string;
    endDate: string;
    vacancies: number;
    reserveSlots: number;
    period: string;
    course?: { name: string; workloadHours: number };
    city?: { name: string; state: string };
    group?: { name: string };
    _count?: { enrollments: number };
}

interface EnrollmentSummary {
    total: number;
    active: number;
    avgFrequency: number;
    fullyPresent: number; // ≥ 75%
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    PLANNED:         { label: 'Planejada',          color: '#0891B2', bg: '#F0F9FF' },
    ENROLLMENT_OPEN: { label: 'Inscrições Abertas', color: '#059669', bg: '#F0FDF4' },
    IN_PROGRESS:     { label: 'Em Andamento',       color: '#D97706', bg: '#FFFBEB' },
    COMPLETED:       { label: 'Concluída',           color: '#6B7280', bg: '#F3F4F6' },
    CANCELLED:       { label: 'Cancelada',           color: '#DC2626', bg: '#FEF2F2' },
};

export default function EstatisticasTurmaPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [cls, setCls] = useState<ClassDetail | null>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        Promise.all([
            api.get(`/classes/${id}`),
            api.get(`/classes/${id}/enrollments`).catch(() => ({ data: [] })),
        ])
            .then(([clsRes, enrollRes]) => {
                setCls(clsRes.data);
                const list = Array.isArray(enrollRes.data) ? enrollRes.data : enrollRes.data?.data ?? [];
                setEnrollments(list);
            })
            .catch(() => setError('Turma não encontrada ou erro ao carregar.'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
            <p style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO ESTATÍSTICAS...</p>
        </div>
    );

    if (error || !cls) return (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
            <ChartBarIcon style={{ width: 48, height: 48, color: '#D1D5DB', margin: '0 auto 1rem' }} />
            <p style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', letterSpacing: '0.15em', color: '#9CA3AF', marginBottom: '1.5rem' }}>{error || 'TURMA NÃO ENCONTRADA'}</p>
            <button onClick={() => router.back()} className="btn-primary">Voltar</button>
        </div>
    );

    const st = STATUS_MAP[cls.status] || STATUS_MAP['PLANNED'];
    const occupancy = cls.vacancies > 0 ? Math.round((enrollments.length / cls.vacancies) * 100) : 0;

    // Estatísticas de frequência baseadas nos dados de matrícula
    const withFreq = enrollments.filter(e => typeof e.attendanceRate === 'number');
    const avgFreq = withFreq.length > 0
        ? Math.round(withFreq.reduce((s: number, e: any) => s + (e.attendanceRate || 0), 0) / withFreq.length)
        : 0;
    const qualified = enrollments.filter(e => (e.attendanceRate || 0) >= 75).length;

    const kpis = [
        { label: 'Vagas Totais',      value: String(cls.vacancies),        icon: UserGroupIcon,   color: '#B89B00', bg: '#FFFDE7', border: '#FEF08A' },
        { label: 'Alunos Matriculados', value: String(enrollments.length), icon: UserGroupIcon,   color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD' },
        { label: 'Ocupação',          value: `${occupancy}%`,              icon: ChartBarIcon,    color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
        { label: 'Freq. Média',       value: withFreq.length > 0 ? `${avgFreq}%` : '—', icon: CalendarDaysIcon, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
        { label: 'Aptos a Certificar (≥75%)', value: String(qualified),   icon: CheckCircleIcon, color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
        { label: 'Vagas de Reserva',  value: String(cls.reserveSlots || 0), icon: ClockIcon,     color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Link href="/admin/turmas" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#9CA3AF', textDecoration: 'none', fontWeight: 500 }}>
                    <ArrowLeftIcon style={{ width: 14, height: 14 }} /> Turmas
                </Link>
                <span style={{ color: '#D1D5DB', fontSize: '0.78rem' }}>/</span>
                <Link href={`/admin/turmas/${id}`} style={{ fontSize: '0.78rem', color: '#9CA3AF', textDecoration: 'none', fontWeight: 500 }}>
                    {cls.classIdentifier}
                </Link>
                <span style={{ color: '#D1D5DB', fontSize: '0.78rem' }}>/</span>
                <span style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 600 }}>Estatísticas</span>
            </div>

            {/* Header */}
            <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB', padding: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: '#FFD600', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ChartBarIcon style={{ width: 24, height: 24, color: '#000' }} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <h1 style={{ fontFamily: 'Orbitron', fontSize: '1.1rem', fontWeight: 900, color: '#111827', margin: 0 }}>ESTATÍSTICAS</h1>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', fontWeight: 700, color: '#374151' }}>{cls.classIdentifier}</span>
                        <span style={{ padding: '0.2rem 0.65rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, background: st.bg, color: st.color, border: `1px solid ${st.color}44` }}>
                            {st.label}
                        </span>
                    </div>
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#6B7280' }}>
                        {cls.course?.name} · {cls.city?.name}/{cls.city?.state} · {fmtDate(cls.startDate)} → {fmtDate(cls.endDate)}
                    </p>
                </div>
            </div>

            {/* KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                {kpis.map(({ label, value, icon: Icon, color, bg, border }) => (
                    <div key={label} className="animate-scale-in" style={{ background: bg, borderRadius: 14, border: `1px solid ${border}`, padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon style={{ width: 18, height: 18, color }} />
                        </div>
                        <div>
                            <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.4rem', color, lineHeight: 1 }}>{value}</div>
                            <div style={{ fontSize: '0.6rem', color, opacity: 0.7, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginTop: '0.2rem' }}>{label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Barra de ocupação */}
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Taxa de Ocupação</span>
                    <span style={{ fontFamily: 'Orbitron', fontWeight: 800, fontSize: '0.9rem', color: occupancy >= 80 ? '#059669' : occupancy >= 50 ? '#D97706' : '#DC2626' }}>{occupancy}%</span>
                </div>
                <div style={{ height: 10, borderRadius: 5, background: '#F3F4F6', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${occupancy}%`, borderRadius: 5, background: occupancy >= 80 ? '#059669' : occupancy >= 50 ? '#F59E0B' : '#EF4444', transition: 'width 0.8s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.65rem', color: '#9CA3AF' }}>
                    <span>{enrollments.length} matriculados</span>
                    <span>{cls.vacancies} vagas</span>
                </div>
            </div>

            {/* Tabela de alunos */}
            {enrollments.length > 0 && (
                <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AcademicCapIcon style={{ width: 16, height: 16, color: '#B89B00' }} />
                        <span style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em', color: '#374151' }}>ALUNOS MATRICULADOS</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#FFFDE7', borderBottom: '2px solid #FEF08A' }}>
                                    {['Aluno', 'Status', 'Frequência', 'Apto?'].map(h => (
                                        <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#B89B00' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {enrollments.map((e: any, i: number) => {
                                    const freq = e.attendanceRate ?? null;
                                    const isApt = freq !== null && freq >= 75;
                                    return (
                                        <tr key={e.id || i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                            <td style={{ padding: '0.65rem 1rem', fontWeight: 600, fontSize: '0.82rem', color: '#111827' }}>{e.student?.name || e.studentName || `Aluno ${i + 1}`}</td>
                                            <td style={{ padding: '0.65rem 1rem' }}>
                                                <span style={{ padding: '0.15rem 0.5rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, background: e.status === 'ACTIVE' ? '#DCFCE7' : '#F3F4F6', color: e.status === 'ACTIVE' ? '#15803D' : '#9CA3AF', border: `1px solid ${e.status === 'ACTIVE' ? '#BBF7D0' : '#E5E7EB'}` }}>
                                                    {e.status === 'ACTIVE' ? 'Ativo' : (e.status || '—')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.65rem 1rem' }}>
                                                {freq !== null ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden', minWidth: 60 }}>
                                                            <div style={{ height: '100%', width: `${freq}%`, background: freq >= 75 ? '#059669' : '#EF4444', borderRadius: 3 }} />
                                                        </div>
                                                        <span style={{ fontFamily: 'Orbitron', fontWeight: 700, fontSize: '0.72rem', color: freq >= 75 ? '#059669' : '#EF4444' }}>{freq}%</span>
                                                    </div>
                                                ) : <span style={{ fontSize: '0.72rem', color: '#D1D5DB' }}>Sem dados</span>}
                                            </td>
                                            <td style={{ padding: '0.65rem 1rem' }}>
                                                {freq !== null
                                                    ? <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isApt ? '#059669' : '#DC2626' }}>{isApt ? '✅ Sim' : '❌ Não'}</span>
                                                    : <span style={{ fontSize: '0.72rem', color: '#D1D5DB' }}>—</span>
                                                }
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
