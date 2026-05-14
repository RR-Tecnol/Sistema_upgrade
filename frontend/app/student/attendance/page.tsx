'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import api from '@/lib/api/client';
import SoloLevelingKPICard from '@/components/student/SoloLevelingKPICard';
import SoloLevelingAchievements from '@/components/student/SoloLevelingAchievements';
import { calcAchievements, getRankConfig, type Achievement } from '@/lib/gamification';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';

interface AttendanceRecord {
    id: string;
    date: string;
    present: boolean;
    justified: boolean;
    justification?: string;
    classNotes?: string;
    classId: string;
    class?: { id: string; course?: { name: string }; startDate?: string; endDate?: string };
}

interface StudentClass {
    id: string;
    course?: { name: string };
    city?: { name: string; state: string };
    startDate?: string;
    endDate?: string;
    teachers?: { isSubstitute?: boolean; teacher?: { user?: { name?: string | null } } }[];
}

function mainTeacherFromClass(c: StudentClass): string | null {
    const list = c.teachers || [];
    const row = list.find(t => !t.isSubstitute) ?? list[0];
    const n = row?.teacher?.user?.name?.trim();
    return n || null;
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ─── Modal detalhe do dia — CORRIGIDO: position fixed centralizado na TELA ────
function ModalDia({ record, onClose }: { record: AttendanceRecord; onClose: () => void }) {
    const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const status = record.justified ? { label: '📋 Falta Justificada', color: '#92730A', bg: '#FFFBEB', border: '#FEF08A' }
        : record.present ? { label: '✅ Presente', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' }
        : { label: '❌ Falta', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };

    // Bloqueia scroll do body quando modal está aberto
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    return (
        <div 
            style={{ 
                position: 'fixed', 
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0,0,0,0.55)', 
                backdropFilter: 'blur(4px)', 
                zIndex: 99999, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: 16,
            }} 
            onClick={onClose}
        >
            <div 
                style={{ 
                    background: '#fff', 
                    borderRadius: 20, 
                    width: '100%', 
                    maxWidth: 420, 
                    boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
                    animation: 'modalSlideUp 0.25s ease-out',
                }} 
                onClick={e => e.stopPropagation()}
            >
                <div style={{ padding: '16px 20px 12px', background: status.bg, borderBottom: `1px solid ${status.border}`, borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h3 style={{ fontFamily: 'Orbitron', fontSize: '0.8rem', fontWeight: 900, color: status.color, margin: 0 }}>DETALHE DE FREQUÊNCIA</h3>
                        <p style={{ fontSize: '0.75rem', color: status.color, opacity: 0.8, margin: '2px 0 0' }}>{fmt(record.date)}</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 8 }}><XMarkIcon style={{ width: 20, height: 20 }} /></button>
                </div>
                <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ padding: '0.75rem 1rem', borderRadius: 10, background: status.bg, border: `1px solid ${status.border}`, textAlign: 'center' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: status.color }}>{status.label}</span>
                    </div>
                    {/* +10 XP badge — aparece quando o aluno estava presente */}
                    {record.present && !record.justified && (
                        <div style={{
                            padding: '0.5rem 0.85rem', borderRadius: 8,
                            background: 'linear-gradient(135deg, rgba(255,214,0,0.15), rgba(255,214,0,0.08))',
                            border: '1px solid rgba(255,214,0,0.3)',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            justifyContent: 'center',
                        }}>
                            <span style={{ fontSize: '0.85rem' }}>⚡</span>
                            <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.75rem', color: '#B89B00' }}>
                                +10 XP GANHO
                            </span>
                        </div>
                    )}
                    {record.class?.course?.name && (
                        <div>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Curso</span>
                            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827', margin: '2px 0 0' }}>{record.class.course.name}</p>
                        </div>
                    )}
                    {record.justified && record.justification && (
                        <div>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Justificativa</span>
                            <p style={{ fontSize: '0.85rem', color: '#374151', margin: '2px 0 0', lineHeight: 1.5 }}>{record.justification}</p>
                        </div>
                    )}
                    {record.classNotes && (
                        <div>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Observação do Professor</span>
                            <p style={{ fontSize: '0.85rem', color: '#374151', margin: '2px 0 0', lineHeight: 1.5 }}>{record.classNotes}</p>
                        </div>
                    )}
                    <button onClick={onClose} style={{ padding: '10px', background: '#F3F4F6', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#6B7280', marginTop: 4 }}>Fechar</button>
                </div>
            </div>
            
            {/* CSS para animação */}
            <style jsx global>{`
                @keyframes modalSlideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}

// ─── Modal de detalhes do KPI — NOVO ──────────────────────────────────────────
interface KPIDetailModalProps {
    title: string;
    value: string | number;
    color: string;
    details: { label: string; value: string | number; color?: string }[];
    onClose: () => void;
}

function KPIDetailModal({ title, value, color, details, onClose }: KPIDetailModalProps) {
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    return (
        <div 
            style={{ 
                position: 'fixed', 
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0,0,0,0.55)', 
                backdropFilter: 'blur(4px)', 
                zIndex: 99999, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: 16,
            }} 
            onClick={onClose}
        >
            <div 
                style={{ 
                    background: '#fff', 
                    borderRadius: 20, 
                    width: '100%', 
                    maxWidth: 380, 
                    boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
                    overflow: 'hidden',
                    animation: 'modalSlideUp 0.25s ease-out',
                    border: `2px solid ${color}30`,
                }} 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '1.25rem 1.5rem',
                    background: `linear-gradient(135deg, ${color}15, ${color}08)`,
                    borderBottom: `1px solid ${color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div>
                        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
                            DETALHES
                        </div>
                        <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.95rem', color, letterSpacing: '0.04em' }}>
                            {title}
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: `${color}15`, border: 'none',
                        cursor: 'pointer', fontSize: '1rem', color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        ✕
                    </button>
                </div>

                {/* Big number */}
                <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <div style={{
                        fontFamily: 'Orbitron', fontWeight: 900, fontSize: '3.5rem',
                        color, lineHeight: 1,
                        textShadow: `0 4px 20px ${color}40`,
                    }}>
                        {value}
                    </div>
                </div>

                {/* Details */}
                <div style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {details.map((d, i) => (
                        <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.65rem 0.85rem', borderRadius: 10,
                            background: d.color ? `${d.color}10` : '#F9FAFB',
                        }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>{d.label}</span>
                            <span style={{ fontFamily: 'Orbitron', fontWeight: 800, fontSize: '0.95rem', color: d.color || '#374151' }}>
                                {d.value}
                            </span>
                        </div>
                    ))}
                </div>

                <div style={{ padding: '0 1.5rem 1.5rem' }}>
                    <button onClick={onClose} style={{
                        width: '100%', padding: '0.75rem',
                        background: '#0F172A', color: '#FFD600',
                        border: 'none', borderRadius: 12,
                        fontFamily: 'Orbitron', fontWeight: 700, fontSize: '0.78rem',
                        letterSpacing: '0.06em', cursor: 'pointer',
                    }}>
                        FECHAR
                    </button>
                </div>
            </div>
            
            <style jsx global>{`
                @keyframes modalSlideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}

// ─── Streak map por data ──────────────────────────────────────────────────────
function buildStreakMap(records: AttendanceRecord[]): Record<string, number> {
    const presenceDates = records
        .filter(r => r.present && !r.justified && r.date)
        .map(r => (r.date || '').slice(0, 10))
        .sort();
    const map: Record<string, number> = {};
    presenceDates.forEach((dateStr, idx) => {
        let streak = 1;
        let cur = new Date(dateStr + 'T12:00:00');
        for (let i = idx - 1; i >= 0; i--) {
            const prev = new Date(presenceDates[i] + 'T12:00:00');
            const diffDays = Math.round((cur.getTime() - prev.getTime()) / 86400000);
            if (diffDays === 1) { streak++; cur = prev; } else break;
        }
        map[dateStr] = streak;
    });
    return map;
}

// ─── Calendário ───────────────────────────────────────────────────────────────
function AttendanceCalendar({ records, year, month, onDayClick, streakMap }: {
    records: AttendanceRecord[]; year: number; month: number;
    onDayClick: (r: AttendanceRecord) => void;
    streakMap?: Record<string, number>;
}) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const getRecord = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return records.find(r => r.date && r.date.startsWith(dateStr));
    };
    const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
    const isFuture = (d: number) => new Date(year, month, d) > today;

    return (
        <div style={{ maxWidth: 420, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
                {DAYS_SHORT.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 0' }}>{d}</div>
                ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const rec = getRecord(day);
                    const future = isFuture(day);
                    const todayDay = isToday(day);
                    let bg = '#F9FAFB', color = '#9CA3AF', border = '1px solid #E5E7EB', emoji = '';
                    if (rec) {
                        if (rec.justified) { bg = '#FFFBEB'; color = '#92730A'; border = '1px solid #FEF08A'; emoji = '📋'; }
                        else if (rec.present) { bg = '#DCFCE7'; color = '#15803D'; border = '1px solid #BBF7D0'; emoji = '✓'; }
                        else { bg = '#FEF2F2'; color = '#DC2626'; border = '1px solid #FECACA'; emoji = '✕'; }
                    } else if (!future) { bg = '#F3F4F6'; color = '#D1D5DB'; }
                    if (todayDay) border = '2px solid #FFD600';
                    return (
                        <div key={day} onClick={() => rec && onDayClick(rec)}
                            style={{ height: 48, borderRadius: 8, background: bg, border, color, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: rec ? 'pointer' : 'default', transition: 'transform 0.12s, box-shadow 0.12s', position: 'relative' }}
                            onMouseEnter={e => { if (rec) { (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; } }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                            title={rec ? (rec.present ? 'Presente — clique para detalhes' : rec.justified ? 'Falta Justificada — clique para detalhes' : 'Falta — clique para detalhes') : ''}>
                            <span style={{ fontSize: '0.7rem', fontWeight: todayDay ? 900 : 600, fontFamily: todayDay ? 'Orbitron' : 'inherit' }}>{day}</span>
                            {emoji && <span style={{ fontSize: '0.5rem', lineHeight: 1 }}>{emoji}</span>}
                            {/* Streak flames */}
                            {rec?.present && !rec?.justified && streakMap && (() => {
                                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const s = streakMap[dateStr] ?? 0;
                                if (s >= 14) return <span style={{ fontSize: '0.4rem', lineHeight: 1 }}>🔥🔥🔥</span>;
                                if (s >= 7)  return <span style={{ fontSize: '0.4rem', lineHeight: 1 }}>🔥🔥</span>;
                                if (s >= 3)  return <span style={{ fontSize: '0.4rem', lineHeight: 1 }}>🔥</span>;
                                return null;
                            })()}
                            {todayDay && <div style={{ position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: '50%', background: '#FFD600' }} />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function StudentAttendancePage() {
    const today = new Date();
    const searchParams = useSearchParams();
    const urlClassId = searchParams.get('classId') ?? '';
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [classes, setClasses] = useState<StudentClass[]>([]);
    const [selectedClass, setSelectedClass] = useState(urlClassId);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
    const [certificates, setCertificates] = useState<any[]>([]);
    
    // Estados para modais de KPI
    const [kpiModal, setKpiModal] = useState<{
        title: string;
        value: string | number;
        color: string;
        details: { label: string; value: string | number; color?: string }[];
    } | null>(null);

    // Quando a URL traz ?classId=, alinha o filtro (ex.: link da turma). Sem query, não apaga escolha manual no select.
    useEffect(() => {
        if (urlClassId) setSelectedClass(urlClassId);
    }, [urlClassId]);

    // Carrega turmas do aluno para o filtro
    useEffect(() => {
        api.get('/students/me/classes')
            .then(r => setClasses(Array.isArray(r.data) ? r.data : []))
            .catch(() => setClasses([]));
        api.get('/students/me/certificates')
            .then(r => setCertificates(Array.isArray(r.data) ? r.data : []))
            .catch(() => setCertificates([]));
    }, []);

    // Carrega attendance ao mudar turma selecionada
    const fetchAttendance = useCallback(async () => {
        setLoading(true);
        try {
            const params = selectedClass ? `?classId=${selectedClass}` : '';
            const res = await api.get(`/students/me/attendance${params}`);
            setRecords(Array.isArray(res.data) ? res.data : []);
        } catch {
            setRecords([]);
        } finally {
            setLoading(false);
        }
    }, [selectedClass]);

    useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

    const goToday = () => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); };
    const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); };
    const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); };

    const monthRecords = records.filter(r => {
        if (!r.date) return false;
        const d = new Date(r.date);
        return !Number.isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
    const present = monthRecords.filter(r => r.present && !r.justified).length;
    const absent = monthRecords.filter(r => !r.present && !r.justified).length;
    const justified = monthRecords.filter(r => r.justified).length;
    const total = monthRecords.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    // Taxa geral (todos os registros)
    const totalAll = records.length;
    const presentAll = records.filter(r => r.present && !r.justified).length;
    const absentAll = records.filter(r => !r.present && !r.justified).length;
    const justifiedAll = records.filter(r => r.justified).length;
    const rateAll = totalAll > 0 ? Math.round((presentAll / totalAll) * 100) : 0;

    // Streak — dias consecutivos de presença recentes
    const calcStreak = (recs: AttendanceRecord[]): number => {
        const sorted = [...recs]
            .filter(r => r.present && !r.justified)
            .map(r => r.date.slice(0, 10))
            .sort()
            .reverse();
        if (sorted.length === 0) return 0;
        let streak = 0;
        let current = new Date();
        current.setHours(0, 0, 0, 0);
        for (const dateStr of sorted) {
            if (!dateStr) continue;
            const d = new Date(dateStr + 'T12:00:00');
            const diff = Math.floor((current.getTime() - d.getTime()) / 86400000);
            if (diff <= 1) { streak++; current = d; }
            else break;
        }
        return streak;
    };

    const currentStreak = calcStreak(records);

    const selectedClassMeta = useMemo(
        () => classes.find(c => c.id === selectedClass),
        [classes, selectedClass],
    );
    const selectedProfessor = selectedClassMeta ? mainTeacherFromClass(selectedClassMeta) : null;

    // Achievements para a seção de conquistas
    const achievements: Achievement[] = calcAchievements(rateAll, presentAll, certificates.length, currentStreak);
    const rankCfg = getRankConfig(rateAll);

    // ══════════════════════════════════════════════════════════════════════════
    // HANDLERS PARA ABRIR MODAIS DE KPI — TODOS OS CARDS CLICÁVEIS
    // ══════════════════════════════════════════════════════════════════════════
    const openFreqMesModal = () => {
        setKpiModal({
            title: 'FREQ. DO MÊS',
            value: `${rate}%`,
            color: rate >= 75 ? '#059669' : '#DC2626',
            details: [
                { label: 'Mês atual', value: MONTHS[currentMonth], color: '#0891B2' },
                { label: 'Presenças no mês', value: present, color: '#059669' },
                { label: 'Faltas no mês', value: absent, color: '#DC2626' },
                { label: 'Justificadas no mês', value: justified, color: '#92730A' },
                { label: 'Total de aulas', value: total },
            ],
        });
    };

    const openFreqGeralModal = () => {
        setKpiModal({
            title: 'FREQ. GERAL',
            value: `${rateAll}%`,
            color: rateAll >= 75 ? '#059669' : '#DC2626',
            details: [
                { label: 'Total de presenças', value: presentAll, color: '#059669' },
                { label: 'Total de faltas', value: absentAll, color: '#DC2626' },
                { label: 'Total justificadas', value: justifiedAll, color: '#92730A' },
                { label: 'Total de aulas', value: totalAll },
                { label: 'XP acumulado', value: `${presentAll * 10} XP`, color: '#FFD600' },
            ],
        });
    };

    const openPresencasModal = () => {
        setKpiModal({
            title: 'PRESENÇAS',
            value: present,
            color: '#059669',
            details: [
                { label: 'Presenças no mês', value: present, color: '#059669' },
                { label: 'Total geral', value: presentAll, color: '#059669' },
                { label: 'XP ganho', value: `+${present * 10} XP`, color: '#FFD600' },
            ],
        });
    };

    const openFaltasModal = () => {
        setKpiModal({
            title: 'FALTAS',
            value: absent,
            color: '#DC2626',
            details: [
                { label: 'Faltas no mês', value: absent, color: '#DC2626' },
                { label: 'Total geral', value: absentAll, color: '#DC2626' },
                { label: 'Impacto na frequência', value: totalAll > 0 ? `-${Math.round((absentAll / totalAll) * 100)}%` : '0%', color: '#DC2626' },
            ],
        });
    };

    const openJustificadasModal = () => {
        setKpiModal({
            title: 'JUSTIFICADAS',
            value: justified,
            color: '#92730A',
            details: [
                { label: 'Justificadas no mês', value: justified, color: '#92730A' },
                { label: 'Total geral', value: justifiedAll, color: '#92730A' },
                { label: 'Status', value: 'Não contam como falta', color: '#059669' },
            ],
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
            <AdminHeaderHero
                title="FREQUÊNCIA"
                subtitle="Calendário de presenças e faltas — clique em um dia para detalhes"
                badge="PORTAL DO ALUNO"
                rightSlot={classes.length > 0 ? (
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                        style={{ padding: '0.5rem 0.85rem', borderRadius: 9, border: '1.5px solid #E5E7EB', background: '#F9FAFB', fontSize: '0.82rem', color: '#374151', cursor: 'pointer', minWidth: 200 }}>
                        <option value="">Todas as turmas</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.course?.name || 'Turma'}{c.city ? ` — ${c.city.name}` : ''}</option>
                        ))}
                    </select>
                ) : undefined}
            />
            <Link href="/student/classes" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 600, textDecoration: 'none', width: 'fit-content', padding: '0.3rem 0.7rem', borderRadius: 8, background: '#F3F4F6', border: '1px solid #E5E7EB', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#FFD600'; e.currentTarget.style.borderColor = '#FFD600'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.borderColor = '#E5E7EB'; }}>
                <ChevronLeftIcon style={{ width: 14, height: 14 }} />
                Minhas Turmas
            </Link>

            {selectedClass && selectedClassMeta && (
                <div
                    style={{
                        padding: '0.85rem 1.1rem',
                        borderRadius: 12,
                        border: '1px solid #FDE68A',
                        background: 'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 100%)',
                        fontSize: '0.82rem',
                        color: '#374151',
                        lineHeight: 1.45,
                    }}
                    className="animate-fade-in"
                >
                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#92400E', letterSpacing: '0.1em', marginBottom: 6 }}>
                        TURMA SELECIONADA
                    </div>
                    <div style={{ fontWeight: 700, color: '#111827' }}>
                        {selectedClassMeta.course?.name || 'Turma'}
                        {selectedClassMeta.city?.name ? (
                            <span style={{ fontWeight: 600, color: '#6B7280' }}>
                                {' '}
                                — {selectedClassMeta.city.name}/{selectedClassMeta.city.state}
                            </span>
                        ) : null}
                    </div>
                    {selectedProfessor ? (
                        <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#4B5563' }}>
                            <span style={{ fontWeight: 700, color: '#92400E' }}>Professor(a):</span> {selectedProfessor}
                        </div>
                    ) : (
                        <div style={{ marginTop: 8, fontSize: '0.72rem', color: '#9CA3AF' }}>
                            Professor(a) titular ainda não está associado a esta turma no sistema.
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                KPI CARDS SOLO LEVELING — TODOS CLICÁVEIS
               ══════════════════════════════════════════════════════════════════ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem' }}>
                <SoloLevelingKPICard
                    icon="📊"
                    label="Freq. do Mês"
                    value={`${rate}%`}
                    color={rate >= 75 ? '#059669' : '#DC2626'}
                    bgGradient={rate >= 75 
                        ? 'linear-gradient(145deg, #F0FDF4 0%, #DCFCE7 100%)' 
                        : 'linear-gradient(145deg, #FEF2F2 0%, #FEE2E2 100%)'}
                    borderColor={rate >= 75 ? 'rgba(16,185,129,0.35)' : 'rgba(220,38,38,0.35)'}
                    isActive={rate >= 90}
                    animDelay={0}
                    onClick={openFreqMesModal}
                />
                <SoloLevelingKPICard
                    icon="🎯"
                    label="Freq. Geral"
                    value={`${rateAll}%`}
                    color={rateAll >= 75 ? '#059669' : '#DC2626'}
                    bgGradient={rateAll >= 75 
                        ? 'linear-gradient(145deg, #F0FDF4 0%, #DCFCE7 100%)' 
                        : 'linear-gradient(145deg, #FEF2F2 0%, #FEE2E2 100%)'}
                    borderColor={rateAll >= 75 ? 'rgba(16,185,129,0.35)' : 'rgba(220,38,38,0.35)'}
                    isActive={rateAll >= 90}
                    xpBonus={presentAll * 10}
                    animDelay={80}
                    onClick={openFreqGeralModal}
                />
                <SoloLevelingKPICard
                    icon="✅"
                    label="Presenças"
                    value={present}
                    color="#059669"
                    bgGradient="linear-gradient(145deg, #F0FDF4 0%, #DCFCE7 100%)"
                    borderColor="rgba(16,185,129,0.35)"
                    xpBonus={present * 10}
                    animDelay={160}
                    onClick={openPresencasModal}
                />
                <SoloLevelingKPICard
                    icon="❌"
                    label="Faltas"
                    value={absent}
                    color="#DC2626"
                    bgGradient="linear-gradient(145deg, #FEF2F2 0%, #FEE2E2 100%)"
                    borderColor="rgba(220,38,38,0.35)"
                    animDelay={240}
                    onClick={openFaltasModal}
                />
                <SoloLevelingKPICard
                    icon="📋"
                    label="Justificadas"
                    value={justified}
                    color="#92730A"
                    bgGradient="linear-gradient(145deg, #FFFDF5 0%, #FFFDE7 100%)"
                    borderColor="rgba(255,214,0,0.35)"
                    animDelay={320}
                    onClick={openJustificadasModal}
                />
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                CONQUISTAS DESBLOQUEADAS — SOLO LEVELING ACHIEVEMENTS
               ══════════════════════════════════════════════════════════════════ */}
            <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
                <SoloLevelingAchievements
                    achievements={achievements}
                    showLocked={false}
                    maxVisible={6}
                    size="md"
                    layout="inline"
                />
            </div>

            {/* Streak badge — aparece quando há 2+ presenças consecutivas */}
            {(() => {
                const streak = currentStreak;
                if (streak < 2) return null;
                return (
                    <div style={{
                        padding: '0.85rem 1.25rem', borderRadius: 14,
                        background: 'linear-gradient(135deg, #FFFDE7 0%, #FEF9C3 100%)',
                        border: '2px solid #FFD600',
                        display: 'flex', alignItems: 'center', gap: '0.85rem',
                        boxShadow: '0 4px 16px rgba(255,214,0,0.2), inset 0 1px 0 rgba(255,255,255,0.5)',
                        position: 'relative',
                        overflow: 'hidden',
                    }} className="animate-fade-in">
                        {/* Glow background */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'radial-gradient(ellipse at 20% 50%, rgba(255,214,0,0.15), transparent 60%)',
                            pointerEvents: 'none',
                        }} />
                        <div style={{
                            width: 48, height: 48, borderRadius: 14,
                            background: 'linear-gradient(135deg, #FFD600, #F59E0B)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.5rem', flexShrink: 0,
                            boxShadow: '0 4px 12px rgba(255,214,0,0.35)',
                            animation: 'pulse 2s ease-in-out infinite',
                        }}>
                            🔥
                        </div>
                        <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                            <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.95rem', color: '#92400E', letterSpacing: '0.06em' }}>
                                STREAK DE {streak} DIAS! 🎯
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#A16207', marginTop: 3, lineHeight: 1.4 }}>
                                Você está em sequência de presenças! Continue assim para ganhar mais XP!
                            </div>
                        </div>
                        <div style={{
                            padding: '0.5rem 0.85rem', borderRadius: 10,
                            background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.1)',
                            textAlign: 'center', flexShrink: 0, position: 'relative', zIndex: 1,
                        }}>
                            <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1rem', color: '#92400E' }}>
                                +{streak * 5}
                            </div>
                            <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#A16207', letterSpacing: '0.08em' }}>
                                XP BÔNUS
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Rank Badge — exibe rank atual baseado na frequência */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1rem 1.25rem', borderRadius: 14,
                background: rankCfg.bg,
                border: `2px solid ${rankCfg.border}`,
                boxShadow: `0 4px 16px ${rankCfg.glow}`,
            }} className="animate-fade-in">
                <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: rankCfg.color,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 4px 16px ${rankCfg.glow}`,
                    flexShrink: 0,
                }}>
                    <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.5rem', color: '#fff', lineHeight: 1 }}>{rankCfg.rank}</span>
                    <span style={{ fontSize: '0.45rem', fontWeight: 800, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.1em' }}>RANK</span>
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.85rem', color: rankCfg.color, letterSpacing: '0.06em' }}>
                        {rankCfg.rank}-RANK · {rankCfg.label}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>
                        {rankCfg.description}
                    </div>
                </div>
                <Link href="/student/dashboard" style={{
                    padding: '0.5rem 1rem', borderRadius: 10,
                    background: rankCfg.color, color: '#fff',
                    fontWeight: 700, fontSize: '0.72rem',
                    textDecoration: 'none', flexShrink: 0,
                    transition: 'all 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
                >
                    Ver Painel →
                </Link>
            </div>

            {/* Calendário */}
            <div className="glass-card">
                {/* Navegação de mês */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '0.5rem' }}>
                    <button onClick={prevMonth} style={{ padding: '0.4rem 0.65rem', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#FFD600'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'}>
                        <ChevronLeftIcon style={{ width: 16, height: 16 }} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.95rem', fontWeight: 800, color: '#111827', margin: 0 }}>{MONTHS[currentMonth]} {currentYear}</h2>
                        {/* Botão "Hoje" */}
                        {(currentMonth !== today.getMonth() || currentYear !== today.getFullYear()) && (
                            <button onClick={goToday} style={{ padding: '0.25rem 0.65rem', borderRadius: 7, background: '#FFFDE7', border: '1px solid #FEF08A', color: '#B89B00', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Hoje</button>
                        )}
                    </div>
                    <button onClick={nextMonth} style={{ padding: '0.4rem 0.65rem', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#FFD600'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'}>
                        <ChevronRightIcon style={{ width: 16, height: 16 }} />
                    </button>
                </div>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO...</p>
                    </div>
                ) : records.length === 0 ? (
                    <div
                        style={{
                            textAlign: 'center',
                            padding: '2rem 1.25rem',
                            borderRadius: 12,
                            background: '#F9FAFB',
                            border: '1px dashed #D1D5DB',
                        }}
                        role="status"
                    >
                        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📅</div>
                        <p style={{ fontWeight: 700, color: '#374151', margin: '0 0 0.35rem', fontSize: '0.9rem' }}>
                            Ainda não há registos de frequência
                        </p>
                        <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: 0, lineHeight: 1.55, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
                            {selectedClass
                                ? 'Não há marcações de presença ou falta para esta turma. Quando o professor lançar a frequência, os dias aparecerão no calendário.'
                                : 'Não há marcações em nenhuma das suas turmas neste período, ou ainda não há aulas registadas. Escolha uma turma no filtro acima ou aguarde o lançamento pelo professor.'}
                        </p>
                    </div>
                ) : (
                    <AttendanceCalendar records={records} year={currentYear} month={currentMonth} onDayClick={setSelectedRecord} streakMap={buildStreakMap(records)} />
                )}
                {/* Legenda */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #E5E7EB' }}>
                    {[
                        { bg: '#DCFCE7', border: '#BBF7D0', text: '#15803D', label: '✓ Presente' },
                        { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', label: '✕ Falta' },
                        { bg: '#FFFBEB', border: '#FEF08A', text: '#92730A', label: '📋 Justificada' },
                        { bg: '#FFFDE7', border: '#FFD600', text: '#B89B00', label: '● Hoje' },
                    ].map(l => (
                        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div style={{ width: 16, height: 16, borderRadius: 4, background: l.bg, border: `1.5px solid ${l.border}` }} />
                            <span style={{ fontSize: '0.72rem', color: l.text, fontWeight: 600 }}>{l.label}</span>
                        </div>
                    ))}
                    <span style={{ fontSize: '0.68rem', color: '#9CA3AF', marginLeft: 'auto', alignSelf: 'center' }}>Clique em um dia para ver detalhes</span>
                </div>
            </div>

            {/* Alerta frequência baixa */}
            {rateAll < 75 && rateAll > 0 && (
                <div style={{ padding: '1rem 1.25rem', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: '0.75rem' }} className="animate-fade-in">
                    <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>⚠️</span>
                    <div>
                        <div style={{ fontWeight: 700, color: '#DC2626', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Atenção: Frequência Abaixo do Mínimo</div>
                        <div style={{ color: '#B91C1C', fontSize: '0.78rem' }}>Sua frequência geral é de {rateAll}%. O mínimo para aprovação é 75%. Entre em contato com a coordenação.</div>
                    </div>
                </div>
            )}

            {/* Modal de dia do calendário */}
            {selectedRecord && <ModalDia record={selectedRecord} onClose={() => setSelectedRecord(null)} />}
            
            {/* Modal de KPI */}
            {kpiModal && <KPIDetailModal {...kpiModal} onClose={() => setKpiModal(null)} />}
        </div>
    );
}
