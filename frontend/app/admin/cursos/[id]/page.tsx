'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api/client';
import { AcademicCapIcon, ClockIcon, UserGroupIcon, ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface CourseDetail {
    id: string;
    name: string;
    description?: string;
    workloadHours: number;
    durationDaysMA: number;
    durationDaysPI: number;
    prerequisites?: string;
    isMulticourse: boolean;
    active: boolean;
    createdAt: string;
    classes?: ClassItem[];
}

interface ClassItem {
    id: string;
    classIdentifier: string;
    status: string;
    startDate: string;
    endDate: string;
    vacancies: number;
    city?: { name: string; state: string };
    _count?: { enrollments: number };
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    PLANNED:          { label: 'Planejada',          color: '#0891B2', bg: '#F0F9FF' },
    ENROLLMENT_OPEN:  { label: 'Inscrições Abertas', color: '#059669', bg: '#F0FDF4' },
    IN_PROGRESS:      { label: 'Em Andamento',       color: '#D97706', bg: '#FFFBEB' },
    COMPLETED:        { label: 'Concluída',           color: '#6B7280', bg: '#F3F4F6' },
    CANCELLED:        { label: 'Cancelada',           color: '#DC2626', bg: '#FEF2F2' },
};

export default function CursoDetalhePage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [course, setCourse] = useState<CourseDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        api.get(`/courses/${id}`)
            .then(res => setCourse(res.data))
            .catch(() => setError('Curso não encontrado ou erro ao carregar.'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
            <p style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO CURSO...</p>
        </div>
    );

    if (error || !course) return (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
            <AcademicCapIcon style={{ width: 48, height: 48, color: '#D1D5DB', margin: '0 auto 1rem' }} />
            <p style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', letterSpacing: '0.15em', color: '#9CA3AF', marginBottom: '1.5rem' }}>{error || 'CURSO NÃO ENCONTRADO'}</p>
            <button onClick={() => router.back()} className="btn-primary">Voltar</button>
        </div>
    );

    const classes = course.classes || [];
    const activeClasses = classes.filter(c => c.status === 'IN_PROGRESS').length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">

            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Link href="/admin/cursos" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#9CA3AF', textDecoration: 'none', fontWeight: 500 }}>
                    <ArrowLeftIcon style={{ width: 14, height: 14 }} /> Cursos
                </Link>
                <span style={{ color: '#D1D5DB', fontSize: '0.78rem' }}>/</span>
                <span style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 600 }}>{course.name}</span>
            </div>

            {/* Header */}
            <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '1.5rem', background: '#FFFDE7', borderBottom: '2px solid #FEF08A', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: '#FFD600', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <AcademicCapIcon style={{ width: 26, height: 26, color: '#000' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <h1 style={{ fontFamily: 'Orbitron', fontSize: '1.2rem', fontWeight: 900, color: '#111827', margin: 0 }}>{course.name}</h1>
                            <span style={{ padding: '0.2rem 0.65rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, background: course.active ? '#DCFCE7' : '#F3F4F6', color: course.active ? '#15803D' : '#9CA3AF', border: `1px solid ${course.active ? '#BBF7D0' : '#E5E7EB'}` }}>
                                {course.active ? '● Ativo' : '○ Inativo'}
                            </span>
                            {course.isMulticourse && <span style={{ padding: '0.2rem 0.65rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, background: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA' }}>Multicurso</span>}
                        </div>
                        {course.description && <p style={{ margin: '0.4rem 0 0', fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.5 }}>{course.description}</p>}
                    </div>
                </div>

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', padding: '1rem 1.5rem', gap: '1rem' }}>
                    {[
                        { icon: ClockIcon, label: 'Carga Horária', value: `${course.workloadHours}h`, color: '#B89B00' },
                        { icon: UserGroupIcon, label: 'Turmas Ativas', value: String(activeClasses), color: '#059669' },
                        { icon: CheckCircleIcon, label: 'Total de Turmas', value: String(classes.length), color: '#0891B2' },
                        { icon: ClockIcon, label: 'Duração MA', value: `${course.durationDaysMA} dias`, color: '#0891B2' },
                        { icon: ClockIcon, label: 'Duração PI', value: `${course.durationDaysPI} dias`, color: '#059669' },
                    ].map(({ icon: Icon, label, value, color }) => (
                        <div key={label} style={{ padding: '0.75rem', background: '#F9FAFB', borderRadius: 10, border: '1px solid #F3F4F6' }}>
                            <div style={{ fontSize: '0.58rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.2rem' }}>{label}</div>
                            <div style={{ fontFamily: 'Orbitron', fontWeight: 800, fontSize: '1rem', color }}>{value}</div>
                        </div>
                    ))}
                </div>

                {course.prerequisites && (
                    <div style={{ padding: '0 1.5rem 1rem' }}>
                        <div style={{ fontSize: '0.72rem', color: '#6B7280', background: '#F9FAFB', borderRadius: 8, padding: '0.6rem 0.85rem', borderLeft: '3px solid #FEF08A' }}>
                            <strong style={{ color: '#374151' }}>Pré-requisitos:</strong> {course.prerequisites}
                        </div>
                    </div>
                )}
            </div>

            {/* Turmas Vinculadas */}
            <div>
                <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.1em', color: '#374151', marginBottom: '1rem' }}>
                    TURMAS VINCULADAS <span style={{ color: '#9CA3AF', fontSize: '0.65rem' }}>({classes.length})</span>
                </h2>

                {classes.length === 0 ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem', color: '#9CA3AF' }}>
                        <UserGroupIcon style={{ width: 36, height: 36, margin: '0 auto 0.75rem', opacity: 0.3 }} />
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.68rem', letterSpacing: '0.12em' }}>NENHUMA TURMA VINCULADA</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '0.65rem' }}>
                        {classes.map(cls => {
                            const st = STATUS_MAP[cls.status] || STATUS_MAP['PLANNED'];
                            return (
                                <div key={cls.id} className="glass-card animate-fade-in" style={{ padding: '0.9rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                    <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: '0.82rem', color: '#111827', flex: 1, minWidth: 160 }}>
                                        {cls.classIdentifier}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                                        {cls.city ? `${cls.city.name} — ${cls.city.state}` : '—'}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono' }}>
                                        {new Date(cls.startDate).toLocaleDateString('pt-BR')} → {new Date(cls.endDate).toLocaleDateString('pt-BR')}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#374151' }}>
                                        {cls._count?.enrollments ?? 0}/{cls.vacancies} alunos
                                    </div>
                                    <span style={{ padding: '0.2rem 0.65rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, background: st.bg, color: st.color, border: `1px solid ${st.color}44`, whiteSpace: 'nowrap' }}>
                                        {st.label}
                                    </span>
                                    <Link href={`/admin/turmas/${cls.id}`} style={{ padding: '0.35rem 0.75rem', borderRadius: 7, background: '#FFFDE7', border: '1px solid #FEF08A', color: '#92730A', fontSize: '0.7rem', fontWeight: 700, textDecoration: 'none' }}>
                                        Ver
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
