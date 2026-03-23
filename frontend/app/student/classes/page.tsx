'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/client';
import {
    AcademicCapIcon,
    CalendarIcon,
    MapPinIcon,
    ClockIcon,
    CheckCircleIcon,
    TruckIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface ClassItem {
    id: string;
    classIdentifier: string;
    status: string;
    period: string;
    startDate: string;
    endDate: string;
    course: { name: string; workloadHours: number; description?: string };
    city: { name: string; state: string };
    truck?: { plate: string };
    vacancies?: number;
}

const PERIOD: Record<string, string> = {
    MORNING: '🌅 Manhã (07h–12h)',
    AFTERNOON: '☀️ Tarde (13h–18h)',
    EVENING: '🌙 Noite (19h–22h)',
};

const STATUS_COLOR: Record<string, { bg: string; color: string; label: string }> = {
    PLANNED: { bg: '#F3F4F6', color: '#6B7280', label: 'Planejada' },
    ENROLLMENT_OPEN: { bg: '#DCFCE7', color: '#059669', label: 'Matrículas Abertas' },
    IN_PROGRESS: { bg: '#FFFDE7', color: '#B89B00', label: 'Em Andamento' },
    FINISHED: { bg: '#F5F3FF', color: '#7C3AED', label: 'Concluída' },
    CANCELLED: { bg: '#FEF2F2', color: '#DC2626', label: 'Cancelada' },
};

// PASSO 3.3: Mini-calendário com dias de aula
function MiniCalendario({ classes }: { classes: ClassItem[] }) {
    const today = new Date();
    const [calDate, setCalDate] = useState({ year: today.getFullYear(), month: today.getMonth() });
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    const firstDay = new Date(calDate.year, calDate.month, 1).getDay();
    const daysInMonth = new Date(calDate.year, calDate.month + 1, 0).getDate();
    const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);

    // Mapear quais dias têm aula (dentro do intervalo startDate..endDate de cada turma ativa)
    const classDays: Record<string, ClassItem[]> = {};
    classes.forEach(c => {
        if (!c.startDate || !c.endDate) return;
        const start = new Date(c.startDate);
        const end = new Date(c.endDate);
        for (let d = 1; d <= daysInMonth; d++) {
            const dt = new Date(calDate.year, calDate.month, d);
            if (dt >= start && dt <= end) {
                const key = `${calDate.year}-${String(calDate.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                if (!classDays[key]) classDays[key] = [];
                classDays[key].push(c);
            }
        }
    });

    const selectedClasses = selectedDay ? (classDays[selectedDay] ?? []) : [];
    const monthName = new Date(calDate.year, calDate.month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    return (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                    <div style={{ fontFamily: 'Orbitron', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.1em', color: '#B89B00', textTransform: 'uppercase' }}>Calendário de Aulas</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', marginTop: '0.1rem', textTransform: 'capitalize' }}>{monthName}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button onClick={() => setCalDate(d => { const nd = new Date(d.year, d.month - 1); return { year: nd.getFullYear(), month: nd.getMonth() }; })} style={{ padding: '0.35rem 0.6rem', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <ChevronLeftIcon style={{ width: 14, height: 14, color: '#6B7280' }} />
                    </button>
                    <button onClick={() => setCalDate(d => { const nd = new Date(d.year, d.month + 1); return { year: nd.getFullYear(), month: nd.getMonth() }; })} style={{ padding: '0.35rem 0.6rem', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <ChevronRightIcon style={{ width: 14, height: 14, color: '#6B7280' }} />
                    </button>
                </div>
            </div>

            {/* Dias da semana */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '0.6rem', fontWeight: 800, color: '#9CA3AF', letterSpacing: '0.06em', padding: '0.25rem 0' }}>{d}</div>
                ))}
            </div>

            {/* Grid de dias */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                {cells.map((day, idx) => {
                    if (!day) return <div key={idx} />;
                    const dateKey = `${calDate.year}-${String(calDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const hasClass = !!classDays[dateKey];
                    const isToday = dateKey === today.toISOString().split('T')[0];
                    const isSelected = dateKey === selectedDay;

                    return (
                        <button key={idx} onClick={() => setSelectedDay(isSelected ? null : dateKey)} style={{
                            padding: '0.4rem 0', borderRadius: 7, border: isSelected ? '2px solid #FFD600' : '1px solid transparent',
                            background: isSelected ? '#FFFDE7' : hasClass ? 'rgba(255,214,0,0.08)' : 'transparent',
                            color: isToday ? '#B89B00' : hasClass ? '#111827' : '#9CA3AF',
                            fontWeight: isToday || hasClass ? 700 : 400,
                            fontSize: '0.78rem', cursor: hasClass || isToday ? 'pointer' : 'default',
                            position: 'relative', transition: 'all 0.15s',
                        }}>
                            {day}
                            {hasClass && <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: '#FFD600' }} />}
                        </button>
                    );
                })}
            </div>

            {/* Detalhe do dia selecionado */}
            {selectedDay && selectedClasses.length > 0 && (
                <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#FFFDE7', borderRadius: 10, border: '1px solid #FEF08A' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#B89B00', marginBottom: '0.4rem' }}>
                        {new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                    {selectedClasses.map(c => (
                        <div key={c.id} style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 600 }}>📚 {c.course?.name}</div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function StudentClasses() {
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/students/me/enrollments')
            .then(r => {
                const data = r.data || [];
                const list = Array.isArray(data) ? data : (data.data || []);
                // Extrair as classes de cada enrollment
                setClasses(list.map((e: any) => e.class).filter(Boolean));
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
            <div className="spinner" style={{ width: 40, height: 40 }} />
            <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO...</p>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontFamily: 'Orbitron', fontSize: '1.7rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
                        MINHAS TURMAS
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        Turmas em que você está matriculado • {classes.length} turma(s)
                    </p>
                </div>
                <Link href="/student/enrollments"
                    style={{ padding: '0.6rem 1.2rem', background: '#FFD600', borderRadius: 10, fontSize: '0.82rem', fontWeight: 700, color: '#000', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AcademicCapIcon style={{ width: 15, height: 15 }} />
                    Ver Inscrições
                </Link>
            </div>

            {/* PASSO 3.3: Calendário interativo de aulas */}
            {classes.length > 0 && <MiniCalendario classes={classes} />}

            {/* Cards */}
            {classes.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '4rem', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div style={{ width: 64, height: 64, borderRadius: 18, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '2rem' }}>🎓</div>
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.72rem', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>NENHUMA TURMA ENCONTRADA</p>
                    <p style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>Você não está matriculado em nenhuma turma ainda.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                    {classes.map((c, i) => {
                        const statusCfg = STATUS_COLOR[c.status] || STATUS_COLOR.PLANNED;
                        return (
                            <div key={c.id} className="animate-scale-in" style={{ animationDelay: `${i * 60}ms`, background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'all 0.2s' }}>
                                {/* Card header */}
                                <div style={{ padding: '1rem 1.25rem', background: 'linear-gradient(135deg, #FFFDE7, #FFF9C4)', borderBottom: '1px solid #FEF08A' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem', fontWeight: 800, color: '#B89B00', letterSpacing: '0.05em' }}>
                                            {c.classIdentifier}
                                        </span>
                                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.62rem', fontWeight: 700, background: statusCfg.bg, color: statusCfg.color }}>
                                            {statusCfg.label}
                                        </span>
                                    </div>
                                    <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827', lineHeight: 1.3, margin: 0 }}>
                                        {c.course?.name}
                                    </h3>
                                    {c.course?.description && (
                                        <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.3rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                                            {c.course.description}
                                        </p>
                                    )}
                                </div>

                                {/* Card body */}
                                <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#6B7280' }}>
                                        <MapPinIcon style={{ width: 14, height: 14, flexShrink: 0 }} />
                                        <span>{c.city?.name} / {c.city?.state}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#6B7280' }}>
                                        <ClockIcon style={{ width: 14, height: 14, flexShrink: 0 }} />
                                        <span>{PERIOD[c.period] || c.period}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#6B7280' }}>
                                        <CalendarIcon style={{ width: 14, height: 14, flexShrink: 0 }} />
                                        <span>
                                            {c.startDate ? new Date(c.startDate).toLocaleDateString('pt-BR') : '—'}
                                            {' → '}
                                            {c.endDate ? new Date(c.endDate).toLocaleDateString('pt-BR') : '—'}
                                        </span>
                                    </div>
                                    {c.truck?.plate && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#6B7280' }}>
                                            <TruckIcon style={{ width: 14, height: 14, flexShrink: 0 }} />
                                            <span>Placa: <strong>{c.truck.plate}</strong></span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: 8, marginTop: '0.4rem' }}>
                                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: 8, fontSize: '0.65rem', background: '#F0F9FF', color: '#0891B2', fontWeight: 700, border: '1px solid #BAE6FD' }}>
                                            {c.course?.workloadHours ?? 0}h
                                        </span>
                                    </div>
                                </div>

                                {/* Card footer */}
                                <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Link href="/student/attendance"
                                        style={{ fontSize: '0.78rem', fontWeight: 700, color: '#B89B00', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <CheckCircleIcon style={{ width: 13, height: 13 }} />
                                        Ver Frequência
                                    </Link>
                                    <Link href="/student/certificates"
                                        style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7C3AED', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        🏆 Certificados
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
