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

interface Student {
    id: string;
    name: string;
    cpf?: string;
}

interface AttendanceDay {
    date: string; // 'YYYY-MM-DD'
    presentCount: number;
    absentCount: number;
    total: number;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_PT = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function toLocalDateStr(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TeacherFrequenciaClass() {
    const params = useParams();
    const classId = params?.classId as string;
    const router = useRouter();
    const today = toLocalDateStr(new Date());

    const [classData, setClassData] = useState<any>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [records, setRecords] = useState<Record<string, boolean>>({});
    const [selectedDate, setSelectedDate] = useState(today);
    const [calendarMonth, setCalendarMonth] = useState(() => {
        const d = new Date();
        return { year: d.getFullYear(), month: d.getMonth() };
    });
    const [attendanceHistory, setAttendanceHistory] = useState<Record<string, AttendanceDay>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [view, setView] = useState<'calendar' | 'register'>('calendar');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

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
                }));
            setStudents(enrolled);
            const initial: Record<string, boolean> = {};
            enrolled.forEach((s: Student) => { initial[s.id] = true; });
            setRecords(initial);

            // Carregar histórico de frequência (attendances)
            try {
                const attRes = await api.get(`/classes/${classId}/attendance`);
                const hist: Record<string, AttendanceDay> = {};
                for (const att of (attRes.data || [])) {
                    const ds = att.date?.split('T')[0] || att.date;
                    if (!hist[ds]) hist[ds] = { date: ds, presentCount: 0, absentCount: 0, total: 0 };
                    hist[ds].total++;
                    if (att.present) hist[ds].presentCount++;
                    else hist[ds].absentCount++;
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

    async function handleSave() {
        if (students.length === 0) { showToast('Nenhum aluno para registrar.', 'error'); return; }
        setSaving(true);
        try {
            const payload = {
                date: selectedDate,
                records: students.map(s => ({ studentId: s.id, present: records[s.id] ?? true })),
            };
            await api.post(`/classes/${classId}/attendance/bulk`, payload);

            // Atualiza histórico local
            const presentCount = students.filter(s => records[s.id]).length;
            setAttendanceHistory(prev => ({
                ...prev,
                [selectedDate]: {
                    date: selectedDate,
                    presentCount,
                    absentCount: students.length - presentCount,
                    total: students.length,
                },
            }));
            showToast(`Frequência de ${students.length} alunos salva!`, 'success');
            setView('calendar');
        } catch (err: any) {
            showToast(err?.response?.data?.message || 'Erro ao salvar frequência.', 'error');
        } finally {
            setSaving(false);
        }
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

    function selectDay(day: number) {
        const key = getDayKey(day);
        setSelectedDate(key);
        setView('register');
        // Resetar todos como presentes
        const initial: Record<string, boolean> = {};
        students.forEach(s => { initial[s.id] = true; });
        setRecords(initial);
    }

    const cells = buildCalendarDays();
    const presentCount = students.filter(s => records[s.id]).length;
    const absentCount = students.length - presentCount;
    const attendedDays = Object.keys(attendanceHistory).length;

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
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', fontFamily: 'Orbitron, sans-serif' }}>
                            {classData?.course?.name || 'Turma'}
                        </h1>
                        <p style={{ color: '#6B7280', fontSize: '0.82rem', marginTop: 2 }}>
                            {classData?.city?.name} — {classData?.city?.state} · {classData?.classIdentifier}
                        </p>
                    </div>
                    {/* KPI rápido */}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {[
                            { label: 'Aulas', value: attendedDays, color: '#7C3AED', bg: '#EDE9FE' },
                            { label: 'Alunos', value: students.length, color: '#0891B2', bg: '#E0F2FE' },
                        ].map(k => (
                            <div key={k.label} style={{
                                background: k.bg, borderRadius: 10, padding: '0.5rem 0.9rem',
                                textAlign: 'center', border: `1px solid ${k.color}22`,
                            }}>
                                <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.1rem', color: k.color }}>{k.value}</div>
                                <div style={{ fontSize: '0.68rem', color: k.color, fontWeight: 600, textTransform: 'uppercase' }}>{k.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

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
                            const isToday = key === today;
                            const isSelected = key === selectedDate;
                            const hist = attendanceHistory[key];

                            return (
                                <button
                                    key={day}
                                    onClick={() => selectDay(day)}
                                    style={{
                                        aspectRatio: '1',
                                        borderRadius: 10,
                                        border: isSelected ? '2px solid #FFD600' : isToday ? '2px solid #F59E0B' : `1.5px solid ${c.border || '#E5E7EB'}`,
                                        background: isSelected ? '#FFFDE7' : c.bg || '#F9FAFB',
                                        cursor: 'pointer',
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
                                    {!hist && isToday && (
                                        <span style={{ fontSize: '0.6rem', color: '#F59E0B', fontWeight: 700 }}>HOJE</span>
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
                    </div>

                    {/* Botão Registrar Hoje */}
                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                        <button
                            onClick={() => { setSelectedDate(today); setView('register'); }}
                            className="btn-primary"
                            style={{ paddingLeft: '2rem', paddingRight: '2rem' }}
                        >
                            <CalendarDaysIcon style={{ width: '1rem', height: '1rem' }} />
                            Registrar Frequência de Hoje
                        </button>
                    </div>
                </div>
            ) : (
                /* ============ REGISTRO DE FREQUÊNCIA ============ */
                <div>
                    {/* Header do registro */}
                    <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                            <div style={{ fontSize: '0.72rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Data da Aula</div>
                            <div style={{ fontFamily: 'Orbitron', fontWeight: 800, fontSize: '0.92rem', color: '#111827' }}>
                                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <span style={{ background: '#D1FAE5', color: '#065F46', borderRadius: 20, padding: '4px 14px', fontSize: '0.82rem', fontWeight: 700 }}>
                                {presentCount} P
                            </span>
                            <span style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 20, padding: '4px 14px', fontSize: '0.82rem', fontWeight: 700 }}>
                                {absentCount} F
                            </span>
                        </div>
                    </div>

                    {/* Ações em lote */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '5.5rem' }}>
                            {students.map((student, idx) => {
                                const isPresent = records[student.id] ?? true;
                                return (
                                    <div
                                        key={student.id}
                                        onClick={() => setRecords(prev => ({ ...prev, [student.id]: !prev[student.id] }))}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            background: isPresent ? '#F0FDF4' : '#FEF2F2',
                                            borderRadius: 10,
                                            border: `1.5px solid ${isPresent ? '#BBF7D0' : '#FECACA'}`,
                                            padding: '0.75rem 1rem', transition: 'all 0.15s',
                                            cursor: 'pointer',
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

                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            <button
                                                onClick={e => { e.stopPropagation(); setRecords(prev => ({ ...prev, [student.id]: true })); }}
                                                style={{
                                                    minWidth: 48, minHeight: 40, borderRadius: 8,
                                                    border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem',
                                                    background: isPresent ? '#10B981' : '#F3F4F6',
                                                    color: isPresent ? '#fff' : '#9CA3AF',
                                                    transition: 'all 0.15s',
                                                }}
                                            >P</button>
                                            <button
                                                onClick={e => { e.stopPropagation(); setRecords(prev => ({ ...prev, [student.id]: false })); }}
                                                style={{
                                                    minWidth: 48, minHeight: 40, borderRadius: 8,
                                                    border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem',
                                                    background: !isPresent ? '#EF4444' : '#F3F4F6',
                                                    color: !isPresent ? '#fff' : '#9CA3AF',
                                                    transition: 'all 0.15s',
                                                }}
                                            >F</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Botão Salvar — fixo no bottom */}
                    {students.length > 0 && (
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
        </div>
    );
}
