'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api/client';
import {
    ArrowLeftIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CheckCircleIcon,
    XCircleIcon,
    CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface Student {
    id: string;
    name: string;
    cpf?: string;
    email?: string;
    phone?: string;
}

// FIX 1 — records por aluno adicionado (era só contagens agregadas)
interface AttendanceDay {
    date: string; // 'YYYY-MM-DD'
    presentCount: number;
    absentCount: number;
    total: number;
    records: Record<string, boolean>; // studentId → present
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_PT = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const CLASS_STATUS_LABEL: Record<string, string> = {
    PLANNED: 'planejada',
    ENROLLMENT_OPEN: 'com matrículas abertas',
    ENROLLMENT_CLOSED: 'com matrículas fechadas',
    COMPLETED: 'concluída',
    CANCELLED: 'cancelada',
};

function toLocalDateStr(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Alinha com a API (Brasília): professor não pode lançar em datas futuras. */
function todayYmdBrasil(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

export default function TeacherFrequenciaClass() {
    const params = useParams();
    const classId = params?.classId as string;
    const router = useRouter();
    const todayBr = todayYmdBrasil();

    const [classData, setClassData] = useState<any>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [records, setRecords] = useState<Record<string, boolean>>({});
    const [selectedDate, setSelectedDate] = useState(todayBr);
    const [calendarMonth, setCalendarMonth] = useState(() => {
        const d = new Date();
        return { year: d.getFullYear(), month: d.getMonth() };
    });
    const [attendanceHistory, setAttendanceHistory] = useState<Record<string, AttendanceDay>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [view, setView] = useState<'calendar' | 'register'>('calendar');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    // FIX 2 — estado de modo leitura vs edição
    const [editMode, setEditMode] = useState(false);

    // Estados para alerta de risco de frequência
    const [alertingRisco, setAlertingRisco] = useState<string | null>(null);
    const [alertedRisco, setAlertedRisco] = useState<Set<string>>(new Set());
    /** Confirmação visual (Upgrade) antes de gravar frequência retroativa — substitui window.confirm */
    const [retroConfirmOpen, setRetroConfirmOpen] = useState(false);

    useEffect(() => { loadClass(); }, [classId]);

    async function loadClass() {
        try {
            const res = await api.get(`/classes/${classId}`);
            setClassData(res.data);
            const enrolled = (res.data.enrollments || [])
                .filter((e: any) => ['ENROLLED', 'APPROVED'].includes(e.status))
                .map((e: any) => ({
                    id: e.student?.id || e.studentId,
                    name: e.student?.user?.name || 'Aluno',
                    cpf: e.student?.cpf,
                    email: e.student?.user?.email,
                    phone: e.student?.user?.phone,
                }));
            setStudents(enrolled);
            const initial: Record<string, boolean> = {};
            enrolled.forEach((s: Student) => { initial[s.id] = true; });
            setRecords(initial);

            // FIX 3 — endpoint correto + records por aluno
            try {
                const attRes = await api.get(`/classes/${classId}/attendance/history`);
                const hist: Record<string, AttendanceDay> = {};
                for (const att of (attRes.data || [])) {
                    const ds = att.date?.split('T')[0] || att.date;
                    if (!hist[ds]) {
                        hist[ds] = {
                            date: ds,
                            presentCount: 0,
                            absentCount: 0,
                            total: 0,
                            records: {},
                        };
                    }
                    hist[ds].total++;
                    if (att.present) hist[ds].presentCount++;
                    else hist[ds].absentCount++;
                    hist[ds].records[att.studentId] = att.present; // guarda por aluno
                }
                setAttendanceHistory(hist);
            } catch {/* sem histórico ainda */}
        } catch {
            setStudents([]);
        } finally {
            setLoading(false);
        }
    }

    function markAll(present: boolean) {
        const updated: Record<string, boolean> = {};
        students.forEach(s => { updated[s.id] = present; });
        setRecords(updated);
    }

    /** Persistência no backend (hoje ou após confirmar retroativo no modal). */
    async function performSave() {
        if (classData?.status !== 'IN_PROGRESS') {
            showToast('Lançamento de frequência disponível apenas para turmas em andamento.', 'error');
            return;
        }
        if (students.length === 0) {
            showToast('Nenhum aluno para registrar.', 'error');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                date: selectedDate,
                records: students.map(s => ({ studentId: s.id, present: records[s.id] ?? true })),
            };
            const res = await api.post(`/classes/${classId}/attendance/bulk`, payload);
            const retro = Boolean(res.data?.retroactiveTeacherEdit);

            const presentCount = students.filter(s => records[s.id]).length;
            setAttendanceHistory(prev => ({
                ...prev,
                [selectedDate]: {
                    date: selectedDate,
                    presentCount,
                    absentCount: students.length - presentCount,
                    total: students.length,
                    records: { ...records },
                },
            }));
            showToast(
                retro
                    ? 'Frequência salva. O administrador foi notificado (alteração em data passada).'
                    : `Frequência de ${students.length} alunos salva!`,
                'success',
            );
            setRetroConfirmOpen(false);
            setEditMode(false);
            setView('calendar');
        } catch (err: any) {
            showToast(err?.response?.data?.message || 'Erro ao salvar frequência.', 'error');
        } finally {
            setSaving(false);
        }
    }

    // FIX 6 — handleSave: data futura bloqueada; retroativa abre modal Upgrade (ConfirmModal)
    async function handleSave() {
        if (students.length === 0) {
            showToast('Nenhum aluno para registrar.', 'error');
            return;
        }
        const todayRef = todayYmdBrasil();
        if (selectedDate > todayRef) {
            showToast('Não é permitido lançar ou alterar frequência para datas futuras.', 'error');
            return;
        }
        if (selectedDate < todayRef) {
            setRetroConfirmOpen(true);
            return;
        }
        await performSave();
    }

    function showToast(msg: string, type: 'success' | 'error') {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    }

    // ===== CALENDÁRIO =====
    function buildCalendarDays() {
        const { year, month } = calendarMonth;
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const cells: (null | number)[] = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        return cells;
    }

    function getDayKey(day: number) {
        const { year, month } = calendarMonth;
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    function getDayStatus(day: number) {
        const key = getDayKey(day);
        const hist = attendanceHistory[key];
        if (!hist) return 'empty';
        if (hist.presentCount === hist.total) return 'all-present';
        if (hist.presentCount === 0) return 'all-absent';
        return 'partial';
    }

    // FIX 4 — selectDay carrega dados salvos ou inicia edição fresh
    function selectDay(day: number) {
        const key = getDayKey(day);
        const todayRef = todayYmdBrasil();
        if (key > todayRef) {
            showToast('Datas futuras não podem receber lançamento de frequência.', 'error');
            return;
        }
        setSelectedDate(key);
        setView('register');

        const hist = attendanceHistory[key];
        if (hist && hist.records && Object.keys(hist.records).length > 0) {
            // Dia já tem frequência salva → carregar dados reais do banco
            setRecords(hist.records);
            setEditMode(false); // modo leitura
        } else {
            const initial: Record<string, boolean> = {};
            students.forEach(s => { initial[s.id] = true; });
            setRecords(initial);
            setEditMode(classData?.status === 'IN_PROGRESS');
        }
    }

    const turmaSomenteLeitura = classData?.status !== 'IN_PROGRESS';
    const statusLabel = CLASS_STATUS_LABEL[classData?.status || ''] || classData?.status?.toLowerCase() || 'neste status';

    const cells = buildCalendarDays();
    const presentCount = students.filter(s => records[s.id]).length;
    const absentCount = students.length - presentCount;
    const attendedDays = Object.keys(attendanceHistory).length;
    const selectedIsPast = selectedDate < todayBr;

    // Computed: alunos em risco baseados no histórico completo
    const alunosEmRisco = students
        .map(student => {
            let total = 0; let presentes = 0;
            Object.values(attendanceHistory).forEach(day => {
                if (day.records && student.id in day.records) {
                    total++;
                    if (day.records[student.id]) presentes++;
                }
            });
            const freqPct = total > 0 ? Math.round((presentes / total) * 100) : null;
            return { ...student, freqPct, total };
        })
        .filter(s => s.freqPct !== null && s.freqPct < 75 && s.total > 0);

    // Handler: alerta de risco via API (cria notificação persistente + WS)
    async function handleRiscoAlert(student: Student & { freqPct: number | null }) {
        setAlertingRisco(student.id);
        try {
            await api.post(`/classes/${classId}/aluno-risco`, { studentId: student.id });
            setAlertedRisco(prev => new Set(prev).add(student.id));
            showToast(`Alerta enviado para ${student.name}. Admin notificado.`, 'success');
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Erro ao enviar alerta.', 'error');
        } finally {
            setAlertingRisco(null);
        }
    }

    const dayColors: Record<string, { bg: string; text: string; border: string; label: string }> = {
        'all-present': { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7', label: '✓' },
        'all-absent':  { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5', label: '✗' },
        'partial':     { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D', label: '~' },
        'empty':       { bg: 'transparent', text: '#6B7280', border: 'transparent', label: '' },
    };

    if (loading) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
                <div style={{ width: 36, height: 36, border: '3px solid #FFD600', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite', margin: '0 auto 0.75rem' }} />
                Carregando turma...
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }} className="animate-fade-in">
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 999,
                    background: toast.type === 'success' ? '#10B981' : '#EF4444',
                    color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 10,
                    fontWeight: 600, fontSize: '0.85rem', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                    animation: 'fadeIn 0.3s ease',
                }}>
                    {toast.type === 'success' ? '✓ ' : '✕ '}{toast.msg}
                </div>
            )}

            {/* Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <button
                    onClick={() => view === 'register' ? setView('calendar') : router.back()}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', marginBottom: '0.75rem', padding: 0 }}
                >
                    <ArrowLeftIcon style={{ width: 16, height: 16 }} />
                    {view === 'register' ? 'Voltar ao Calendário' : 'Voltar'}
                </button>
                <AdminHeaderHero
                    title={(classData?.course?.name || 'TURMA').toUpperCase()}
                    subtitle={`${classData?.city?.name || '—'} — ${classData?.city?.state || '—'} · ${classData?.classIdentifier || '—'}`}
                    badge="FREQUÊNCIA"
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <AnimatedKpiCard label="Aulas" value={attendedDays} color="#7C3AED" bg="#EDE9FE" border="#DDD6FE" compact />
                    <AnimatedKpiCard label="Alunos" value={students.length} color="#0891B2" bg="#E0F2FE" border="#BAE6FD" compact />
                </div>
            </div>

            {turmaSomenteLeitura && (
                <div style={{
                    marginBottom: '1rem', padding: '0.85rem 1rem', borderRadius: 10,
                    background: '#F3F4F6', border: '1px solid #D1D5DB',
                    fontSize: '0.82rem', color: '#4B5563', lineHeight: 1.5,
                }}>
                    <strong style={{ color: '#374151' }}>Turma {statusLabel}</strong>
                    {' '}— você pode consultar alunos e o calendário. O lançamento de frequência será liberado quando a turma estiver <strong>em andamento</strong>.
                </div>
            )}

            {/* ===================== VIEWS ===================== */}

            {view === 'calendar' ? (
                /* ============ CALENDÁRIO ============ */
                <div className="card" style={{ padding: '1.5rem' }}>
                    {/* Navegação do mês */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                        <button
                            onClick={() => setCalendarMonth(prev => {
                                const d = new Date(prev.year, prev.month - 1);
                                return { year: d.getFullYear(), month: d.getMonth() };
                            })}
                            className="btn-ghost"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                        >
                            <ChevronLeftIcon style={{ width: 16, height: 16 }} /> Anterior
                        </button>
                        <div style={{ fontFamily: 'Orbitron', fontWeight: 800, fontSize: '1rem', color: '#111827', letterSpacing: '0.05em' }}>
                            {MONTHS_PT[calendarMonth.month]} {calendarMonth.year}
                        </div>
                        <button
                            onClick={() => setCalendarMonth(prev => {
                                const d = new Date(prev.year, prev.month + 1);
                                return { year: d.getFullYear(), month: d.getMonth() };
                            })}
                            className="btn-ghost"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                        >
                            Próximo <ChevronRightIcon style={{ width: 16, height: 16 }} />
                        </button>
                    </div>

                    {/* Cabeçalho dos dias */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
                        {WEEKDAYS.map(wd => (
                            <div key={wd} style={{ textAlign: 'center', fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', padding: '0.4rem 0' }}>
                                {wd}
                            </div>
                        ))}
                    </div>

                    {/* Células do calendário */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                        {cells.map((day, i) => {
                            if (!day) return <div key={`e-${i}`} />;
                            const key = getDayKey(day);
                            const status = getDayStatus(day);
                            const c = dayColors[status];
                            const isToday = key === todayBr;
                            const isFutureDay = key > todayBr;
                            const isSelected = key === selectedDate;
                            const hist = attendanceHistory[key];

                            return (
                                <button
                                    key={day}
                                    type="button"
                                    disabled={isFutureDay}
                                    onClick={() => selectDay(day)}
                                    style={{
                                        aspectRatio: '1',
                                        borderRadius: 10,
                                        border: isSelected ? '2px solid #FFD600' : isToday ? '2px solid #F59E0B' : `1.5px solid ${c.border || '#E5E7EB'}`,
                                        background: isFutureDay ? '#F3F4F6' : isSelected ? '#FFFDE7' : c.bg || '#F9FAFB',
                                        cursor: isFutureDay ? 'not-allowed' : 'pointer',
                                        opacity: isFutureDay ? 0.45 : 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 2,
                                        transition: 'all 0.15s',
                                        boxShadow: status !== 'empty' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                                        padding: 4,
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
                                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                                >
                                    <span style={{ fontWeight: isToday ? 800 : 600, fontSize: '0.85rem', color: isSelected ? '#B89B00' : c.text || '#374151' }}>
                                        {day}
                                    </span>
                                    {hist && (
                                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: c.text }}>
                                            {hist.presentCount}/{hist.total}P
                                        </span>
                                    )}
                                    {!hist && isToday && !isFutureDay && (
                                        <span style={{ fontSize: '0.6rem', color: '#F59E0B', fontWeight: 700 }}>HOJE</span>
                                    )}
                                    {isFutureDay && (
                                        <span style={{ fontSize: '0.55rem', color: '#9CA3AF', fontWeight: 600 }}>—</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Legenda */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {[
                            { color: '#D1FAE5', border: '#6EE7B7', text: '#065F46', label: 'Todos Presentes' },
                            { color: '#FEE2E2', border: '#FCA5A5', text: '#991B1B', label: 'Faltas Registradas' },
                            { color: '#FEF3C7', border: '#FCD34D', text: '#92400E', label: 'Frequência Parcial' },
                            { color: '#F9FAFB', border: '#E5E7EB', text: '#6B7280', label: 'Sem registro' },
                        ].map(l => (
                            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#6B7280' }}>
                                <div style={{ width: 14, height: 14, borderRadius: 4, background: l.color, border: `1.5px solid ${l.border}` }} />
                                <span>{l.label}</span>
                            </div>
                        ))}
                        <span style={{ fontSize: '0.68rem', color: '#94A3B8', width: '100%', textAlign: 'center', marginTop: 6 }}>
                            Dias futuros aparecem bloqueados — a frequência só pode ser lançada para hoje ou datas passadas.
                        </span>
                    </div>

                    {!turmaSomenteLeitura && (
                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                        <button
                            onClick={() => {
                                const td = todayYmdBrasil();
                                setSelectedDate(td);
                                const hist = attendanceHistory[td];
                                if (hist && hist.records && Object.keys(hist.records).length > 0) {
                                    setRecords(hist.records);
                                    setEditMode(false);
                                } else {
                                    const initial: Record<string, boolean> = {};
                                    students.forEach(s => { initial[s.id] = true; });
                                    setRecords(initial);
                                    setEditMode(true);
                                }
                                setView('register');
                            }}
                            className="btn-primary"
                            style={{ paddingLeft: '2rem', paddingRight: '2rem' }}
                        >
                            <CalendarDaysIcon style={{ width: '1rem', height: '1rem' }} />
                            Registrar Frequência de Hoje
                        </button>
                    </div>
                    )}

                    {/* ── SEÇÃO ALUNOS EM RISCO (abaixo do calendário) ── */}
                    {alunosEmRisco.length > 0 && (
                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #F3F4F6', paddingTop: '1.5rem' }}>
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.68rem', fontWeight: 800, color: '#DC2626', letterSpacing: '0.1em' }}>
                                    ALUNOS EM RISCO
                                </span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', color: '#DC2626' }}>
                                    {alunosEmRisco.length}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: '#9CA3AF', marginLeft: 'auto' }}>abaixo de 75% de frequência</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                {alunosEmRisco.map(student => {
                                    const jaAlertado = alertedRisco.has(student.id);
                                    const enviando = alertingRisco === student.id;
                                    const freqColor = (student.freqPct ?? 0) < 50 ? '#DC2626' : '#F59E0B';
                                    return (
                                        <div key={student.id} style={{
                                            background: '#FFF5F5', borderRadius: 12,
                                            border: '1.5px solid rgba(239,68,68,0.15)',
                                            padding: '1rem 1.1rem',
                                            display: 'flex', alignItems: 'center', gap: '1rem',
                                        }}>
                                            {/* Avatar */}
                                            <div style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', color: '#DC2626' }}>
                                                {student.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                                            </div>
                                            {/* Info */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {student.name}
                                                </div>
                                                {student.cpf && (
                                                    <div style={{ fontSize: '0.7rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono' }}>{student.cpf}</div>
                                                )}
                                                {student.email && (
                                                    <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: 2 }}>
                                                        ✉ {student.email}
                                                        {student.phone && <span style={{ marginLeft: 8 }}>📱 {student.phone}</span>}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Freq gauge */}
                                            <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 56 }}>
                                                <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.15rem', color: freqColor }}>
                                                    {student.freqPct}%
                                                </div>
                                                <div style={{ height: 3, borderRadius: 2, background: '#F3F4F6', overflow: 'hidden', width: 48, margin: '4px auto 0' }}>
                                                    <div style={{ height: '100%', borderRadius: 2, width: `${student.freqPct}%`, background: freqColor }} />
                                                </div>
                                                <div style={{ fontSize: '0.58rem', color: '#9CA3AF', marginTop: 2 }}>frequência</div>
                                            </div>
                                            {/* Botão alerta */}
                                            <div style={{ flexShrink: 0 }}>
                                                {jaAlertado ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', padding: '0.35rem 0.75rem', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                                                            ✓ Enviado
                                                        </span>
                                                        <span style={{ fontSize: '0.6rem', color: '#9CA3AF' }}>admin notificado</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleRiscoAlert(student)}
                                                        disabled={enviando}
                                                        style={{
                                                            padding: '0.45rem 0.9rem', borderRadius: 9,
                                                            background: enviando ? '#F9FAFB' : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.08))',
                                                            border: `1.5px solid rgba(239,68,68,${enviando ? '0.1' : '0.3'})`,
                                                            color: enviando ? '#9CA3AF' : '#DC2626',
                                                            fontWeight: 700, fontSize: '0.75rem',
                                                            cursor: enviando ? 'not-allowed' : 'pointer',
                                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'all 0.15s',
                                                        }}
                                                    >
                                                        <span>{enviando ? '⏳' : '⚠️'}</span>
                                                        <span style={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}>{enviando ? 'Enviando...' : 'Enviar Alerta'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.85rem', borderRadius: 8, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)', fontSize: '0.7rem', color: '#9CA3AF', lineHeight: 1.5 }}>
                                💡 O alerta cria uma notificação no app do aluno e avisa o administrador automaticamente via sistema.
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* ============ REGISTRO DE FREQUÊNCIA ============ */
                <div>
                    {/* Header do registro — FIX 5: botões Editar / Cancelar */}
                    <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                            <div style={{ fontSize: '0.72rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Data da Aula</div>
                            <div style={{ fontFamily: 'Orbitron', fontWeight: 800, fontSize: '0.92rem', color: '#111827' }}>
                                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ background: '#D1FAE5', color: '#065F46', borderRadius: 20, padding: '4px 14px', fontSize: '0.82rem', fontWeight: 700 }}>
                                {presentCount} P
                            </span>
                            <span style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 20, padding: '4px 14px', fontSize: '0.82rem', fontWeight: 700 }}>
                                {absentCount} F
                            </span>
                            {/* FIX 5 — botão Editar no modo leitura */}
                            {!turmaSomenteLeitura && !editMode && attendanceHistory[selectedDate] && (
                                <button
                                    onClick={() => setEditMode(true)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                                        padding: '0.45rem 1rem', borderRadius: 9,
                                        background: 'rgba(255,214,0,0.12)',
                                        border: '1.5px solid rgba(255,214,0,0.4)',
                                        color: '#B89B00', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                                    }}
                                >
                                    ✏️ Editar
                                </button>
                            )}
                            {/* FIX 5 — botão Cancelar no modo edição (quando há dados salvos) */}
                            {editMode && attendanceHistory[selectedDate] && (
                                <button
                                    onClick={() => {
                                        const hist = attendanceHistory[selectedDate];
                                        if (hist?.records) setRecords(hist.records);
                                        setEditMode(false);
                                    }}
                                    style={{
                                        padding: '0.45rem 1rem', borderRadius: 9,
                                        background: '#F9FAFB', border: '1.5px solid #E5E7EB',
                                        color: '#9CA3AF', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                                    }}
                                >
                                    ✕ Cancelar
                                </button>
                            )}
                        </div>
                    </div>

                    {selectedIsPast && (
                        <div
                            style={{
                                padding: '0.75rem 1rem',
                                borderRadius: 10,
                                marginBottom: '0.75rem',
                                background: 'linear-gradient(135deg, rgba(26,58,106,0.08), rgba(255,214,0,0.12))',
                                border: '1px solid rgba(26,58,106,0.2)',
                                fontSize: '0.78rem',
                                color: '#1e3a5f',
                                lineHeight: 1.45,
                            }}
                        >
                            <strong style={{ display: 'block', marginBottom: 4 }}>Data passada</strong>
                            Ao salvar alterações neste dia, o <strong>administrador será notificado automaticamente</strong> e a ação fica <strong>registada na auditoria</strong> do sistema.
                        </div>
                    )}

                    {/* FIX 5 — Ações em lote visíveis apenas em editMode */}
                    <div style={{ display: editMode ? 'flex' : 'none', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <button onClick={() => markAll(true)} className="btn-ghost" style={{ fontSize: '0.8rem', color: '#065F46', borderColor: '#6EE7B7' }}>
                            <CheckCircleIcon style={{ width: '0.9rem', height: '0.9rem' }} /> Todos Presentes
                        </button>
                        <button onClick={() => markAll(false)} className="btn-ghost" style={{ fontSize: '0.8rem', color: '#991B1B', borderColor: '#FCA5A5' }}>
                            <XCircleIcon style={{ width: '0.9rem', height: '0.9rem' }} /> Todos Ausentes
                        </button>
                    </div>

                    {/* Lista de alunos */}
                    {students.length === 0 ? (
                        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF' }}>
                            Nenhum aluno matriculado nesta turma.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: editMode ? '5.5rem' : '1.5rem' }}>

                            {/* FIX 7 — Banner de leitura */}
                            {!turmaSomenteLeitura && !editMode && attendanceHistory[selectedDate] && (
                                <div style={{
                                    padding: '0.65rem 1rem', borderRadius: 10, marginBottom: '0.25rem',
                                    background: 'rgba(255,214,0,0.08)', border: '1px solid rgba(255,214,0,0.25)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '1rem' }}>🔒</span>
                                        <span style={{ fontSize: '0.78rem', color: '#B89B00', fontWeight: 600 }}>
                                            Frequência já registrada para este dia
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setEditMode(true)}
                                        style={{
                                            padding: '0.35rem 0.85rem', borderRadius: 8,
                                            background: 'rgba(255,214,0,0.15)', border: '1px solid rgba(255,214,0,0.4)',
                                            color: '#B89B00', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        ✏️ Clique para editar
                                    </button>
                                </div>
                            )}

                            {students.map((student, idx) => {
                                const isPresent = records[student.id] ?? true;
                                return (
                                    <div
                                        key={student.id}
                                        // FIX 5 — bloquear click do card em modo leitura
                                        onClick={() => {
                                            if (!editMode) return;
                                            setRecords(prev => ({ ...prev, [student.id]: !prev[student.id] }));
                                        }}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            background: isPresent ? '#F0FDF4' : '#FEF2F2',
                                            borderRadius: 10,
                                            border: `1.5px solid ${isPresent ? '#BBF7D0' : '#FECACA'}`,
                                            padding: '0.75rem 1rem', transition: 'all 0.15s',
                                            // FIX 5 — cursor indica modo
                                            cursor: editMode ? 'pointer' : 'default',
                                            opacity: editMode ? 1 : 0.92,
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{
                                                width: 34, height: 34, borderRadius: '50%',
                                                background: isPresent ? '#BBF7D0' : '#FECACA',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.75rem', fontWeight: 800,
                                                color: isPresent ? '#065F46' : '#991B1B', flexShrink: 0,
                                            }}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.88rem' }}>{student.name}</div>
                                                {student.cpf && <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{student.cpf}</div>}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                            {/* Botão 📧 Alertar — só aparece para ausentes */}
                                            {!isPresent && student.email && (
                                                <a
                                                    href={`mailto:${student.email}?subject=${encodeURIComponent('Alerta de Frequência — Qualifica')}&body=${encodeURIComponent(`Olá ${student.name.split(' ')[0]},\n\nSua frequência foi registrada como FALTA na aula de hoje (${new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}).\n\nCaso tenha dúvidas ou precise regularizar sua situação, entre em contato com o professor.\n\nAtenciosamente,\nEquipe Qualifica`)}`}
                                                    style={{ textDecoration: 'none' }}
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <button
                                                        style={{
                                                            minWidth: 40, minHeight: 40, borderRadius: 8,
                                                            border: '1px solid #BFDBFE', cursor: 'pointer',
                                                            background: '#EFF6FF', color: '#1D4ED8',
                                                            fontSize: '1rem', transition: 'all 0.15s',
                                                            opacity: editMode ? 1 : 0.85,
                                                        }}
                                                        title={`Enviar alerta por email para ${student.name}`}
                                                    >📧</button>
                                                </a>
                                            )}
                                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            {/* FIX 5 — botão P bloqueado em modo leitura */}
                                            <button
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    if (!editMode) return;
                                                    setRecords(prev => ({ ...prev, [student.id]: true }));
                                                }}
                                                style={{
                                                    minWidth: 48, minHeight: 40, borderRadius: 8,
                                                    border: 'none',
                                                    cursor: editMode ? 'pointer' : 'default',
                                                    fontWeight: 800, fontSize: '0.85rem',
                                                    background: isPresent ? '#10B981' : '#F3F4F6',
                                                    color: isPresent ? '#fff' : '#9CA3AF',
                                                    transition: 'all 0.15s',
                                                    opacity: editMode ? 1 : 0.75,
                                                }}
                                            >P</button>
                                            {/* FIX 5 — botão F bloqueado em modo leitura */}
                                            <button
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    if (!editMode) return;
                                                    setRecords(prev => ({ ...prev, [student.id]: false }));
                                                }}
                                                style={{
                                                    minWidth: 48, minHeight: 40, borderRadius: 8,
                                                    border: 'none',
                                                    cursor: editMode ? 'pointer' : 'default',
                                                    fontWeight: 800, fontSize: '0.85rem',
                                                    background: !isPresent ? '#EF4444' : '#F3F4F6',
                                                    color: !isPresent ? '#fff' : '#9CA3AF',
                                                    transition: 'all 0.15s',
                                                    opacity: editMode ? 1 : 0.75,
                                                }}
                                            >F</button>
                                            </div>{/* fecha wrapper P/F */}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* FIX 5 — Botão Salvar visível apenas em editMode */}
                    {students.length > 0 && editMode && !turmaSomenteLeitura && (
                        <div style={{
                            position: 'fixed', bottom: 0, left: 240, right: 0,
                            padding: '0.9rem 1.5rem',
                            background: 'rgba(255,255,255,0.95)',
                            backdropFilter: 'blur(8px)',
                            borderTop: '1px solid #E5E7EB',
                        }}>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="btn-primary"
                                style={{ width: '100%', minHeight: 50, justifyContent: 'center', fontSize: '0.95rem' }}
                            >
                                {saving ? 'SALVANDO...' : `SALVAR FREQUÊNCIA — ${presentCount}P / ${absentCount}F`}
                            </button>
                        </div>
                    )}
                </div>
            )}

            <ConfirmModal
                isOpen={retroConfirmOpen}
                title="Registo em data passada"
                message="Alterar frequência de uma data passada notifica automaticamente o administrador e fica registado no histórico de auditoria do sistema. Deseja continuar?"
                confirmLabel="Sim, notificar e guardar"
                cancelLabel="Cancelar"
                loading={saving}
                onConfirm={() => void performSave()}
                onCancel={() => {
                    if (!saving) setRetroConfirmOpen(false);
                }}
            />
        </div>
    );
}
