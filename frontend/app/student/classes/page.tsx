'use client';

import { useEffect, useMemo, useState } from 'react';
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
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';

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

/** Linha: inscrição + turma — Minhas Turmas não lista rejeitadas */
interface EnrollmentClassRow {
    enrollmentId: string;
    enrollmentStatus: string;
    access: 'full' | 'pending';
    class: ClassItem;
}

const PERIOD: Record<string, string> = {
    MORNING: '🌅 Manhã (07h–12h)',
    AFTERNOON: '☀️ Tarde (13h–18h)',
    EVENING: '🌙 Noite (19h–22h)',
};

const STATUS_COLOR: Record<string, { bg: string; color: string; label: string }> = {
    PLANNED:         { bg: '#F3F4F6', color: '#6B7280', label: 'Planejada' },
    ENROLLMENT_OPEN: { bg: '#DCFCE7', color: '#059669', label: 'Matrículas Abertas' },
    IN_PROGRESS:     { bg: '#FFFDE7', color: '#B89B00', label: 'Em Andamento' },
    FINISHED:        { bg: '#F5F3FF', color: '#7C3AED', label: 'Concluída' },
    COMPLETED:       { bg: '#F5F3FF', color: '#7C3AED', label: 'Concluída' },
    CANCELLED:       { bg: '#FEF2F2', color: '#DC2626', label: 'Cancelada' },
};

const HIDDEN_ENROLLMENT = new Set(['REJECTED', 'DROPOUT']);
const FULL_ACCESS_STATUS = new Set(['ENROLLED', 'APPROVED']);

function buildEnrollmentRows(rawList: any[]): EnrollmentClassRow[] {
    const list = Array.isArray(rawList) ? rawList : [];
    return list
        .filter((e: any) => e?.class?.id && e?.status && !HIDDEN_ENROLLMENT.has(e.status))
        .map((e: any) => ({
            enrollmentId: e.id,
            enrollmentStatus: e.status,
            access: FULL_ACCESS_STATUS.has(e.status) ? 'full' as const : 'pending' as const,
            class: e.class as ClassItem,
        }))
        .sort((a, b) => {
            if (a.access !== b.access) return a.access === 'full' ? -1 : 1;
            return (a.class.course?.name || '').localeCompare(b.class.course?.name || '', 'pt-BR');
        });
}

function MiniCalendario({ classes }: { classes: ClassItem[] }) {
    const today = new Date();
    const [calDate, setCalDate] = useState({ year: today.getFullYear(), month: today.getMonth() });
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    const firstDay = new Date(calDate.year, calDate.month, 1).getDay();
    const daysInMonth = new Date(calDate.year, calDate.month + 1, 0).getDate();
    const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                    <div style={{ fontFamily: 'Orbitron', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.1em', color: '#B89B00', textTransform: 'uppercase' }}>Calendário de Aulas</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', marginTop: '0.1rem', textTransform: 'capitalize' }}>{monthName}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button type="button" onClick={() => setCalDate(d => { const nd = new Date(d.year, d.month - 1); return { year: nd.getFullYear(), month: nd.getMonth() }; })} style={{ padding: '0.35rem 0.6rem', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <ChevronLeftIcon style={{ width: 14, height: 14, color: '#6B7280' }} />
                    </button>
                    <button type="button" onClick={() => setCalDate(d => { const nd = new Date(d.year, d.month + 1); return { year: nd.getFullYear(), month: nd.getMonth() }; })} style={{ padding: '0.35rem 0.6rem', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <ChevronRightIcon style={{ width: 14, height: 14, color: '#6B7280' }} />
                    </button>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
                {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '0.6rem', fontWeight: 800, color: '#9CA3AF', letterSpacing: '0.06em', padding: '0.25rem 0' }}>{d}</div>
                ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                {cells.map((day, idx) => {
                    if (!day) return <div key={idx} />;
                    const dateKey = `${calDate.year}-${String(calDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const hasClass = !!classDays[dateKey];
                    const isToday = dateKey === today.toISOString().split('T')[0];
                    const isSelected = dateKey === selectedDay;
                    return (
                        <button key={idx} type="button" onClick={() => setSelectedDay(isSelected ? null : dateKey)} style={{
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
    const [rows, setRows] = useState<EnrollmentClassRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/students/me/enrollments')
            .then(r => {
                const data = r.data || [];
                const list = Array.isArray(data) ? data : (data.data || []);
                setRows(buildEnrollmentRows(list));
            })
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, []);

    const fullRows = useMemo(() => rows.filter(r => r.access === 'full'), [rows]);
    const pendingRows = useMemo(() => rows.filter(r => r.access === 'pending'), [rows]);
    const fullClasses = useMemo(() => fullRows.map(r => r.class), [fullRows]);

    const subtitle = useMemo(() => {
        const nFull = fullRows.length;
        const nPending = pendingRows.length;
        if (nFull === 0 && nPending === 0) return 'Nenhuma turma no momento';
        const parts: string[] = [];
        if (nFull > 0) parts.push(`${nFull} com acesso ao portal${nFull > 1 ? '' : ''}`);
        if (nPending > 0) parts.push(`${nPending} aguardando aprovação da inscrição`);
        return parts.join(' • ');
    }, [fullRows.length, pendingRows.length]);

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
            <div className="spinner" style={{ width: 40, height: 40 }} />
            <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO...</p>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
            <AdminHeaderHero
                title="MINHAS TURMAS"
                subtitle={subtitle}
                badge="PORTAL DO ALUNO"
                rightSlot={(
                    <Link href="/student/enrollments"
                        style={{ padding: '0.6rem 1.2rem', background: '#FFD600', borderRadius: 10, fontSize: '0.82rem', fontWeight: 700, color: '#000', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AcademicCapIcon style={{ width: 15, height: 15 }} />
                        Ver Inscrições
                    </Link>
                )}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <AnimatedKpiCard label="Com acesso" value={fullRows.length} color="#B89B00" bg="#FFFDE7" border="#FEF08A" compact />
                <AnimatedKpiCard label="Pendente" value={pendingRows.length} color="#6B7280" bg="#F3F4F6" border="#D1D5DB" compact />
                <AnimatedKpiCard label="Em Andamento" value={fullClasses.filter(c => c.status === 'IN_PROGRESS').length} color="#059669" bg="#F0FDF4" border="#BBF7D0" compact />
                <AnimatedKpiCard label="Concluídas" value={fullClasses.filter(c => c.status === 'FINISHED' || c.status === 'COMPLETED').length} color="#7C3AED" bg="#F5F3FF" border="#DDD6FE" compact />
            </div>

            {fullClasses.length > 0 && <MiniCalendario classes={fullClasses} />}

            {rows.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '4rem', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div style={{ width: 64, height: 64, borderRadius: 18, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '2rem' }}>🎓</div>
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.72rem', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>NENHUMA TURMA VISÍVEL</p>
                    <p style={{ fontSize: '0.82rem', color: '#9CA3AF', marginBottom: '1rem' }}>
                        Inscrições rejeitadas não aparecem aqui. Faça uma nova inscrição ou acompanhe o status em <strong>Minhas inscrições</strong>.
                    </p>
                    <Link href="/student/enrollments" style={{ color: '#B89B00', fontWeight: 700 }}>Ir para Minhas inscrições →</Link>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                    {rows.map((row, i) => {
                        const c = row.class;
                        const statusCfg = STATUS_COLOR[c.status] || STATUS_COLOR.PLANNED;
                        const isPending = row.access === 'pending';

                        if (isPending) {
                            return (
                                <div
                                    key={row.enrollmentId}
                                    className="animate-scale-in"
                                    style={{
                                        animationDelay: `${i * 60}ms`,
                                        borderRadius: 16,
                                        border: '1px solid #D1D5DB',
                                        overflow: 'hidden',
                                        background: 'linear-gradient(180deg, #F9FAFB 0%, #F3F4F6 100%)',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                                        opacity: 0.95,
                                    }}
                                >
                                    <div style={{ padding: '0.65rem 1rem', background: '#E5E7EB', borderBottom: '1px solid #D1D5DB' }}>
                                        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#6B7280', letterSpacing: '0.08em' }}>AGUARDANDO APROVAÇÃO</span>
                                    </div>
                                    <div style={{ padding: '1rem 1.25rem', background: '#F3F4F6', borderBottom: '1px solid #E5E7EB' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', letterSpacing: '0.05em' }}>{c.classIdentifier}</span>
                                            <span style={{ padding: '0.2rem 0.55rem', borderRadius: 99, fontSize: '0.6rem', fontWeight: 700, background: '#E5E7EB', color: '#4B5563' }}>{statusCfg.label}</span>
                                        </div>
                                        <h3 style={{ fontWeight: 800, fontSize: '0.92rem', color: '#4B5563', lineHeight: 1.3, margin: 0 }}>{c.course?.name}</h3>
                                        <p style={{ fontSize: '0.74rem', color: '#6B7280', margin: '0.5rem 0 0' }}>
                                            Sua inscrição está em análise. Quando a coordenação aprovar, esta turma passará a contar como ativa e você poderá ver frequência e materiais.
                                        </p>
                                    </div>
                                    <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#9CA3AF' }}>
                                            <MapPinIcon style={{ width: 14, height: 14, flexShrink: 0 }} />
                                            <span>{c.city?.name} / {c.city?.state}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#9CA3AF' }}>
                                            <ClockIcon style={{ width: 14, height: 14, flexShrink: 0 }} />
                                            <span>{PERIOD[c.period] || c.period}</span>
                                        </div>
                                    </div>
                                    <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #E5E7EB', background: '#E5E7EB' }}>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6B7280' }}>🔒 Acompanhe em <Link href="/student/enrollments" style={{ color: '#4B5563', fontWeight: 800 }}>Minhas inscrições</Link></span>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <Link key={row.enrollmentId} href={`/student/classes/${c.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                                <div className="animate-scale-in" style={{
                                    animationDelay: `${i * 60}ms`,
                                    background: '#fff', borderRadius: 16,
                                    border: '1.5px solid rgba(255,214,0,0.3)', overflow: 'hidden',
                                    boxShadow: '0 2px 8px rgba(255,214,0,0.08)',
                                    transition: 'all 0.2s', cursor: 'pointer',
                                }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(255,214,0,0.15)';
                                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,214,0,0.5)';
                                        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(255,214,0,0.08)';
                                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,214,0,0.3)';
                                        (e.currentTarget as HTMLElement).style.transform = '';
                                    }}>
                                    <div style={{ padding: '1rem 1.25rem', background: 'linear-gradient(135deg, #FFD600 0%, #F59E0B 100%)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem', fontWeight: 800, color: 'rgba(0,0,0,0.6)', letterSpacing: '0.05em' }}>
                                                {c.classIdentifier}
                                            </span>
                                            <span style={{ padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.62rem', fontWeight: 700, background: 'rgba(0,0,0,0.15)', color: '#0F172A' }}>
                                                {statusCfg.label}
                                            </span>
                                        </div>
                                        <h3 style={{ fontWeight: 900, fontSize: '0.95rem', color: '#0F172A', lineHeight: 1.3, margin: 0 }}>
                                            {c.course?.name}
                                        </h3>
                                        {c.course?.description && (
                                            <p style={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.55)', marginTop: '0.3rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                                                {c.course.description}
                                            </p>
                                        )}
                                    </div>

                                    <div style={{ padding: '1rem 1.25rem', background: 'linear-gradient(145deg, #ffffff 0%, #fffdf5 100%)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
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
                                        <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#B89B00' }}>⚡ Clique para ver detalhes e frequência</span>
                                        </div>
                                    </div>

                                    <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid rgba(255,214,0,0.3)', background: 'rgba(255,214,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                        onClick={e => e.preventDefault()}>
                                        <Link href={`/student/classes/${c.id}`}
                                            onClick={e => e.stopPropagation()}
                                            style={{ fontSize: '0.78rem', fontWeight: 700, color: '#B89B00', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <CheckCircleIcon style={{ width: 13, height: 13 }} />
                                            Ver Frequência
                                        </Link>
                                        <Link href="/student/certificates"
                                            onClick={e => e.stopPropagation()}
                                            style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7C3AED', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            🏆 Certificados
                                        </Link>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
