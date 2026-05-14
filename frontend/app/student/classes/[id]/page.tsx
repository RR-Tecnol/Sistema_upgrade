'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api/client';
import {
    ChevronLeftIcon,
    MapPinIcon,
    ClockIcon,
    CalendarIcon,
    UserIcon,
    TruckIcon,
    AcademicCapIcon,
} from '@heroicons/react/24/outline';

const STATUS_COLOR: Record<string, { bg: string; color: string; label: string }> = {
    PLANNED:          { bg: '#F3F4F6', color: '#6B7280', label: 'Planejada' },
    ENROLLMENT_OPEN:  { bg: '#DCFCE7', color: '#059669', label: 'Matrículas Abertas' },
    IN_PROGRESS:      { bg: '#FFFDE7', color: '#B89B00', label: 'Em Andamento' },
    FINISHED:         { bg: '#F5F3FF', color: '#7C3AED', label: 'Concluída' },
    COMPLETED:        { bg: '#F5F3FF', color: '#7C3AED', label: 'Concluída' },
    CANCELLED:        { bg: '#FEF2F2', color: '#DC2626', label: 'Cancelada' },
};

interface AttendanceRecord {
    id: string;
    date: string;
    present: boolean;
    justified: boolean;
    classId: string;
}


type PortalAccess = 'full' | 'pending' | 'none';

export default function StudentClassDetail() {
    const params = useParams();
    const classId = params?.id as string;
    const [classData, setClassData] = useState<any>(null);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [portalAccess, setPortalAccess] = useState<PortalAccess>('none');

    useEffect(() => {
        if (!classId) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const [enrRes, clsRes] = await Promise.all([
                    api.get('/students/me/enrollments'),
                    api.get(`/classes/${classId}`),
                ]);
                if (cancelled) return;
                setClassData(clsRes.data);
                const list = Array.isArray(enrRes.data) ? enrRes.data : [];
                const mine = list.filter((e: any) => e.class?.id === classId);
                const hasFull = mine.some((e: any) => ['ENROLLED', 'APPROVED'].includes(e.status));
                const hasPending = mine.some((e: any) => ['PENDING', 'DOCUMENT_PENDING', 'WAITLIST'].includes(e.status));
                if (hasFull) {
                    setPortalAccess('full');
                    try {
                        const attRes = await api.get(`/students/me/attendance?classId=${classId}`);
                        if (!cancelled) setAttendance(Array.isArray(attRes.data) ? attRes.data : []);
                    } catch {
                        if (!cancelled) setAttendance([]);
                    }
                } else if (hasPending) {
                    setPortalAccess('pending');
                    setAttendance([]);
                } else {
                    setPortalAccess('none');
                    setAttendance([]);
                }
            } catch {
                if (!cancelled) {
                    setClassData(null);
                    setPortalAccess('none');
                    setAttendance([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [classId]);

    const prevMonth = () => {};
    const nextMonth = () => {};

    const totalAll = attendance.length;
    const presentAll = attendance.filter(r => r.present && !r.justified).length;
    const absentAll = attendance.filter(r => !r.present && !r.justified).length;
    const rateAll = totalAll > 0 ? Math.round((presentAll / totalAll) * 100) : 0;
    const freqColor = rateAll >= 80 ? '#10B981' : rateAll >= 75 ? '#F59E0B' : '#EF4444';

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
            <div className="spinner" style={{ width: 40, height: 40 }} />
            <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO...</p>
        </div>
    );

    if (!classData) return (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
            <p style={{ color: '#9CA3AF' }}>Turma não encontrada.</p>
            <Link href="/student/classes" style={{ color: '#B89B00', fontWeight: 700 }}>← Voltar</Link>
        </div>
    );

    if (portalAccess === 'pending') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 560, margin: '0 auto', padding: '1.5rem' }} className="animate-fade-in">
                <Link href="/student/classes" style={{ fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 600, textDecoration: 'none' }}>← Minhas turmas</Link>
                <div style={{ background: '#F3F4F6', borderRadius: 16, border: '1px solid #D1D5DB', padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
                    <h1 style={{ fontFamily: 'Orbitron', fontSize: '1.05rem', fontWeight: 900, color: '#4B5563', margin: '0 0 0.5rem' }}>Aguardando aprovação</h1>
                    <p style={{ fontSize: '0.88rem', color: '#6B7280', lineHeight: 1.55, margin: 0 }}>
                        A turma <strong style={{ color: '#374151' }}>{classData.course?.name}</strong> só ficará disponível com frequência e materiais após a <strong>coordenação aprovar</strong> a sua inscrição.
                    </p>
                    <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <Link href="/student/enrollments" style={{ padding: '0.75rem 1rem', borderRadius: 10, background: '#FFD600', color: '#000', fontWeight: 800, fontSize: '0.85rem', textDecoration: 'none', textAlign: 'center' }}>
                            Ver status em Minhas inscrições
                        </Link>
                        <Link href="/student/classes" style={{ padding: '0.65rem 1rem', borderRadius: 10, border: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 600, fontSize: '0.82rem', textDecoration: 'none', textAlign: 'center', background: '#fff' }}>
                            Voltar às minhas turmas
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (portalAccess === 'none') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 560, margin: '0 auto', padding: '1.5rem' }} className="animate-fade-in">
                <Link href="/student/classes" style={{ fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 600, textDecoration: 'none' }}>← Minhas turmas</Link>
                <div style={{ background: '#FEF2F2', borderRadius: 16, border: '1px solid #FECACA', padding: '1.5rem', textAlign: 'center' }}>
                    <h1 style={{ fontFamily: 'Orbitron', fontSize: '1.05rem', fontWeight: 900, color: '#991B1B', margin: '0 0 0.5rem' }}>Sem acesso a esta turma</h1>
                    <p style={{ fontSize: '0.88rem', color: '#7F1D1D', lineHeight: 1.55, margin: 0 }}>
                        Não há inscrição <strong>ativa</strong> sua nesta turma (inscrição rejeitada ou inexistente). Inscrições recusadas não aparecem em Minhas turmas.
                    </p>
                    <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <Link href="/student/enrollments" style={{ padding: '0.75rem 1rem', borderRadius: 10, background: '#FFD600', color: '#000', fontWeight: 800, fontSize: '0.85rem', textDecoration: 'none', textAlign: 'center' }}>
                            Minhas inscrições
                        </Link>
                        <Link href="/student/classes" style={{ padding: '0.65rem 1rem', borderRadius: 10, border: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 600, fontSize: '0.82rem', textDecoration: 'none', textAlign: 'center', background: '#fff' }}>
                            Minhas turmas
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const statusCfg = STATUS_COLOR[classData.status] || STATUS_COLOR.PLANNED;
    const professor =
        (() => {
            const list = Array.isArray(classData.teachers) ? classData.teachers : [];
            const t = list.find((x: { isSubstitute?: boolean }) => !x.isSubstitute) ?? list[0];
            return t?.teacher?.user?.name?.trim() || null;
        })();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
            {/* Breadcrumb */}
            <div>
                <Link href="/student/classes"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 600, textDecoration: 'none', marginBottom: '0.75rem', padding: '0.3rem 0.7rem', borderRadius: 8, background: '#F3F4F6', border: '1px solid #E5E7EB', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#FFD600'; e.currentTarget.style.borderColor = '#FFD600'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.borderColor = '#E5E7EB'; }}>
                    <ChevronLeftIcon style={{ width: 14, height: 14 }} />
                    Minhas Turmas
                </Link>

                {/* Header da turma */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem', fontWeight: 800, color: '#B89B00', letterSpacing: '0.05em' }}>
                                {classData.classIdentifier}
                            </span>
                            <span style={{ padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.62rem', fontWeight: 700, background: statusCfg.bg, color: statusCfg.color }}>
                                {statusCfg.label}
                            </span>
                        </div>
                        <h1 style={{ fontFamily: 'Orbitron', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.06em', margin: 0 }} className="gradient-text">
                            {classData.course?.name}
                        </h1>
                    </div>
                </div>
            </div>

            {/* Info da turma */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '0.75rem 1.25rem', background: '#FFFDE7', borderBottom: '1px solid #FEF08A' }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#B89B00', letterSpacing: '0.12em', textTransform: 'uppercase' }}>SOBRE A TURMA</div>
                </div>
                <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.85rem' }}>
                    {[
                        { icon: <MapPinIcon style={{ width: 15, height: 15 }} />, label: 'Cidade', value: classData.city ? `${classData.city.name} / ${classData.city.state}` : '—' },
                        { icon: <ClockIcon style={{ width: 15, height: 15 }} />, label: 'Horário', value: (classData.startTime && classData.endTime) ? `${classData.startTime} – ${classData.endTime}` : '—' },
                        { icon: <CalendarIcon style={{ width: 15, height: 15 }} />, label: 'Período', value: classData.startDate ? `${new Date(classData.startDate).toLocaleDateString('pt-BR')} → ${classData.endDate ? new Date(classData.endDate).toLocaleDateString('pt-BR') : '?'}` : '—' },
                        ...(professor ? [{ icon: <UserIcon style={{ width: 15, height: 15 }} />, label: 'Professor(a)', value: professor }] : []),
                        ...(classData.truck?.plate ? [{ icon: <TruckIcon style={{ width: 15, height: 15 }} />, label: 'Veículo', value: `Placa ${classData.truck.plate}` }] : []),
                        { icon: <AcademicCapIcon style={{ width: 15, height: 15 }} />, label: 'Carga Horária', value: `${classData.course?.workloadHours ?? 0}h` },
                    ].map(info => (
                        <div key={info.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ color: '#B89B00', flexShrink: 0, marginTop: 2 }}>{info.icon}</div>
                            <div>
                                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{info.label}</div>
                                <div style={{ fontSize: '0.83rem', fontWeight: 600, color: '#374151', marginTop: 1 }}>{info.value}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Mini painel de rank — gamificação por turma */}
            {totalAll > 0 && (() => {
                const RANKS_MINI = [
                    { rank: 'E', min: 0,  color: '#9CA3AF', icon: '⚪' },
                    { rank: 'D', min: 60, color: '#6B7280', icon: '🔵' },
                    { rank: 'C', min: 75, color: '#10B981', icon: '🟢' },
                    { rank: 'B', min: 85, color: '#0891B2', icon: '🔷' },
                    { rank: 'A', min: 90, color: '#7C3AED', icon: '💜' },
                    { rank: 'S', min: 95, color: '#FFD600', icon: '⭐' },
                ];
                const rankCfg = [...RANKS_MINI].reverse().find(r => rateAll >= r.min) ?? RANKS_MINI[0];
                const xp = presentAll * 10;
                const nextRank = RANKS_MINI[RANKS_MINI.indexOf(rankCfg) + 1];
                const progressPct = nextRank
                    ? Math.min(100, Math.round(((rateAll - rankCfg.min) / (nextRank.min - rankCfg.min)) * 100))
                    : 100;
                return (
                    <div style={{
                        padding: '0.85rem 1.25rem', borderRadius: 14,
                        background: `linear-gradient(135deg, ${rankCfg.color}12, ${rankCfg.color}06)`,
                        border: `1px solid ${rankCfg.color}25`,
                        display: 'flex', alignItems: 'center', gap: '1rem',
                    }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 11, flexShrink: 0,
                            background: rankCfg.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1rem',
                            color: rankCfg.rank === 'S' ? '#000' : '#fff',
                            boxShadow: `0 0 12px ${rankCfg.color}40`,
                        }}>
                            {rankCfg.rank}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'Orbitron', fontSize: '0.68rem', fontWeight: 800,
                                color: rankCfg.color, letterSpacing: '0.1em', marginBottom: 3 }}>
                                {rankCfg.rank}-RANK · {xp} XP nesta turma
                            </div>
                            {nextRank && (
                                <div style={{ height: 5, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${progressPct}%`, background: rankCfg.color, borderRadius: 3, transition: 'width 0.8s' }} />
                                </div>
                            )}
                            <div style={{ fontSize: '0.62rem', color: '#9CA3AF', marginTop: 3 }}>
                                {nextRank ? `Alcance ${nextRank.min}% de frequência para Rank ${nextRank.rank}` : '⭐ Rank máximo alcançado!'}
                            </div>
                        </div>
                        <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.3rem', color: rankCfg.color, flexShrink: 0 }}>
                            {rankCfg.icon}
                        </div>
                    </div>
                );
            })()}

            {/* Resumo de frequência — SEM calendário duplicado */}
            {totalAll > 0 && (
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#B89B00', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.85rem' }}>MINHA FREQUÊNCIA NESTA TURMA</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                        {/* % em destaque */}
                        <div style={{ textAlign: 'center', flexShrink: 0 }}>
                            <div style={{ fontFamily: 'Orbitron', fontSize: '2.2rem', fontWeight: 900, color: freqColor, lineHeight: 1 }}>{rateAll}%</div>
                            <div style={{ fontSize: '0.6rem', color: freqColor, fontWeight: 700, marginTop: 3 }}>
                                {rateAll >= 75 ? '✓ Regular' : '⚠ Atenção'}
                            </div>
                        </div>
                        {/* Barra + detalhes */}
                        <div style={{ flex: 1, minWidth: 160 }}>
                            <div style={{ height: 8, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden', marginBottom: 8 }}>
                                <div style={{ height: '100%', borderRadius: 4, width: `${rateAll}%`, background: freqColor, transition: 'width 0.8s ease' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                {[
                                    { label: 'Presenças', value: presentAll, color: '#10B981', bg: '#F0FDF4' },
                                    { label: 'Faltas', value: absentAll, color: '#EF4444', bg: '#FEF2F2' },
                                    { label: 'Total de Aulas', value: totalAll, color: '#6B7280', bg: '#F3F4F6' },
                                ].map(s => (
                                    <div key={s.label} style={{ padding: '0.35rem 0.65rem', borderRadius: 8, background: s.bg, textAlign: 'center' }}>
                                        <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1rem', color: s.color }}>{s.value}</div>
                                        <div style={{ fontSize: '0.6rem', color: s.color, opacity: 0.8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Botões de ação — Frequência leva ao calendário completo filtrado por esta turma */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link href={`/student/attendance?classId=${classId}`}
                    style={{ flex: 1, minWidth: 180, padding: '0.85rem 1.25rem', background: 'linear-gradient(135deg, #FFD600, #F59E0B)', border: 'none', borderRadius: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', transition: 'all 0.15s', boxShadow: '0 4px 12px rgba(255,214,0,0.3)' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,214,0,0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,214,0,0.3)'; }}>
                    📋 Ver Frequência Completa
                </Link>
                <Link href="/student/certificates"
                    style={{ flex: 1, minWidth: 180, padding: '0.85rem 1.25rem', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.88rem', fontWeight: 700, color: '#374151', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#FFD600'; e.currentTarget.style.background = '#FFFDE7'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '#F9FAFB'; }}>
                    🏆 Ver Certificados
                </Link>
            </div>
        </div>
    );
}
