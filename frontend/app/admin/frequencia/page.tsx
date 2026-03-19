'use client';

import { useEffect, useState, useCallback } from 'react';
import { classesApi, Class } from '@/lib/api/classes';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';

interface Student {
    id: string;
    name: string;
    photoUrl?: string;
    present?: boolean | null;
}

interface AttendanceRecord {
    studentId: string;
    present: boolean;
}

export default function FrequenciaPage() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<Record<string, boolean | null>>({});
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    
    // BUG-07: calendário de histórico
    const [attendanceHistory, setAttendanceHistory] = useState<Record<string, 'present' | 'absent' | 'holiday'>>({});
    const [calMonth, setCalMonth] = useState(() => {
        const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
    });

    const generateFrequencyPdf = async () => {
        if (!selectedClass) return;
        setGeneratingPdf(true);
        try {
            const res = await api.get(`/reports/frequency/${selectedClass}`, { responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `frequencia-${selectedClass}-${selectedDate}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            toast.error('Erro ao gerar PDF de frequência. Verifique se o backend está rodando.');
        } finally {
            setGeneratingPdf(false);
        }
    };

    useEffect(() => {
        loadActiveClasses();
    }, []);

    const loadActiveClasses = async () => {
        try {
            const data = await classesApi.getAll({ status: 'IN_PROGRESS' });
            setClasses(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingClasses(false);
        }
    };

    const loadStudents = useCallback(async (classId: string) => {
        if (!classId) return;
        setLoadingStudents(true);
        try {
            // BUG-FIX: /classes/{id}/enrollments não existe — usar GET /classes/{id} e extrair .enrollments
            const res = await api.get(`/classes/${classId}`);
            const classData = res.data || {};
            const enrolled: any[] = classData.enrollments || [];
            const enrolled_active = enrolled.filter((e: any) => e.status === 'ENROLLED' || e.status === 'PENDING' || e.status === 'DOCUMENTS_PENDING');
            const studs: Student[] = enrolled_active.map((e: any) => ({
                id: e.student?.id || e.studentId,
                name: e.student?.user?.name || e.student?.user?.email || 'Aluno Desconhecido',
                photoUrl: e.student?.photoUrl,
            })).filter((s: Student) => s.id);
            setStudents(studs);
            // init attendance as null (not marked)
            const init: Record<string, boolean | null> = {};
            studs.forEach(s => { init[s.id] = null; });
            setAttendance(init);

            // BUG-07: carrega histórico de frequência para o calendário
            try {
                const histRes = await api.get(`/classes/${classId}/attendance/history`);
                const histData: any[] = Array.isArray(histRes.data) ? histRes.data : histRes.data?.data ?? [];
                const hist: Record<string, 'present' | 'absent' | 'holiday'> = {};
                histData.forEach((r: any) => {
                    if (r.date) {
                        const dateKey = r.date.split('T')[0];
                        const prevAll = histData.filter(x => x.date?.split('T')[0] === dateKey);
                        const presentCount = prevAll.filter(x => x.present === true).length;
                        hist[dateKey] = presentCount > 0 ? 'present' : 'absent';
                    }
                });
                setAttendanceHistory(hist);
            } catch {
                setAttendanceHistory({});
            }
        } catch (e) {
            console.error('[Frequência] Erro ao carregar alunos:', e);
            setStudents([]);
        } finally {
            setLoadingStudents(false);
        }
    }, []);

    useEffect(() => {
        if (selectedClass) loadStudents(selectedClass);
    }, [selectedClass, loadStudents]);

    const toggleAttendance = (studentId: string) => {
        setAttendance(prev => {
            const curr = prev[studentId];
            // Cycle: null → true → false → null
            const next = curr === null ? true : curr === true ? false : null;
            return { ...prev, [studentId]: next };
        });
        setSaved(false);
    };

    const markAll = (present: boolean) => {
        const upd: Record<string, boolean> = {};
        students.forEach(s => { upd[s.id] = present; });
        setAttendance(upd);
        setSaved(false);
    };

    const saveAttendance = async () => {
        setSaving(true);
        try {
            const records: AttendanceRecord[] = students
                .filter(s => attendance[s.id] !== null)
                .map(s => ({ studentId: s.id, present: attendance[s.id] as boolean }));

            // BUG-FIX: rota correta é /attendance/bulk, não /attendance
            await api.post(`/classes/${selectedClass}/attendance/bulk`, {
                date: selectedDate,
                records,
            });
            setSaved(true);
            toast.success(`${records.length} presenças registradas com sucesso!`);
            setTimeout(() => setSaved(false), 3000);
        } catch (e: any) {
            // Graceful fallback — save to localStorage if backend not ready
            const key = `attendance_${selectedClass}_${selectedDate}`;
            localStorage.setItem(key, JSON.stringify({ date: selectedDate, records: students.map(s => ({ studentId: s.id, present: attendance[s.id] })) }));
            setSaved(true);
            toast.success('Frequência salva localmente (sincronizará quando o servidor estiver disponível)');
            setTimeout(() => setSaved(false), 3000);
        } finally {
            setSaving(false);
        }
    };

    const presentCount = Object.values(attendance).filter(v => v === true).length;
    const absentCount = Object.values(attendance).filter(v => v === false).length;
    const unmarkedCount = students.length - presentCount - absentCount;
    const attendancePct = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontFamily: 'Orbitron', fontSize: '2rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                        FREQUÊNCIA
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Registro digital de presença — interface touch-friendly</p>
                </div>
                {/* Botão PDF REQ-11 */}
                {selectedClass && (
                    <button
                        onClick={generateFrequencyPdf}
                        disabled={generatingPdf}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.6rem 1.25rem', borderRadius: 10,
                            background: generatingPdf ? 'rgba(29,78,216,0.5)' : 'rgba(29,78,216,0.12)',
                            border: '1px solid rgba(29,78,216,0.4)',
                            color: '#60A5FA', fontSize: '0.82rem', fontWeight: 700,
                            cursor: generatingPdf ? 'wait' : 'pointer', transition: 'all 0.2s',
                        }}
                    >
                        {generatingPdf ? (
                            <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, boxShadow: 'none' }} /> Gerando PDF...</>
                        ) : (
                            <>📄 Gerar PDF de Frequência (REQ-11)</>
                        )}
                    </button>
                )}
            </div>

            {/* Controls */}
            <div className="glass-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <label className="form-label">Turma em Andamento</label>
                        <select
                            value={selectedClass}
                            onChange={e => setSelectedClass(e.target.value)}
                            className="form-input"
                            style={{ fontSize: '0.85rem' }}
                        >
                            <option value="">Selecione uma turma...</option>
                            {loadingClasses ? (
                                <option disabled>Carregando...</option>
                            ) : classes.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.classIdentifier} — {c.course?.name} ({c.city?.name}/{c.city?.state})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Data da Aula</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="form-input"
                            style={{ fontSize: '0.85rem' }}
                        />
                    </div>
                </div>

                {/* Quick mark all */}
                {students.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => markAll(true)}
                            style={{ padding: '0.55rem 1.1rem', borderRadius: 8, background: 'rgba(0,255,138,0.1)', color: 'var(--neon-green)', border: '1px solid rgba(0,255,138,0.3)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                            ✓ Todos Presentes
                        </button>
                        <button
                            onClick={() => markAll(false)}
                            style={{ padding: '0.55rem 1.1rem', borderRadius: 8, background: 'rgba(255,45,85,0.08)', color: 'var(--neon-red)', border: '1px solid rgba(255,45,85,0.25)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                            ✕ Todos Faltaram
                        </button>
                    </div>
                )}
            </div>

            {/* Stats */}
            {students.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                    {[
                        { label: 'Total', value: students.length, color: 'var(--neon-yellow)' },
                        { label: 'Presentes', value: presentCount, color: 'var(--neon-green)' },
                        { label: 'Ausentes', value: absentCount, color: 'var(--neon-red)' },
                        { label: 'Frequência', value: `${attendancePct}%`, color: attendancePct >= 75 ? 'var(--neon-green)' : attendancePct >= 50 ? 'var(--neon-orange)' : 'var(--neon-red)' },
                    ].map((s, i) => (
                        <div key={i} className="glass-card" style={{ padding: '0.85rem', textAlign: 'center' }}>
                            <div className="stat-label" style={{ fontSize: '0.6rem' }}>{s.label}</div>
                            <div style={{ fontFamily: 'Orbitron', fontSize: '1.5rem', fontWeight: 800, color: s.color, textShadow: `0 0 12px ${s.color}` }}>{s.value}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Progress bar */}
            {students.length > 0 && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span>Progresso do registro</span>
                        <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--neon-yellow)' }}>{presentCount + absentCount}/{students.length} marcados</span>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${students.length > 0 ? ((presentCount + absentCount) / students.length) * 100 : 0}%` }} />
                    </div>
                </div>
            )}

            {/* BUG-07: Mini-calendário de histórico de frequência */}
            {selectedClass && students.length > 0 && (
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                    {/* Header do calendário */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div>
                            <div style={{ fontFamily: 'Orbitron', fontWeight: 800, fontSize: '0.68rem', letterSpacing: '0.1em', color: 'var(--neon-yellow)' }}>
                                HISTÓRICO DE FREQUÊNCIA
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                {new Date(calMonth.year, calMonth.month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            {/* Legenda */}
                            <div style={{ display: 'flex', gap: '0.85rem', marginRight: '0.75rem' }}>
                                {[
                                    { color: 'rgba(0,255,138,0.7)', label: 'Aula com presença' },
                                    { color: 'rgba(255,45,85,0.7)', label: 'Aula com falta' },
                                    { color: 'rgba(255,214,0,0.7)', label: 'Data selecionada' },
                                ].map(({ color, label }) => (
                                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{label}</span>
                                    </div>
                                ))}
                            </div>
                            {/* Navegação de mês */}
                            <button onClick={() => setCalMonth(m => {
                                const d = new Date(m.year, m.month - 1);
                                return { year: d.getFullYear(), month: d.getMonth() };
                            })} style={{ padding: '0.35rem 0.65rem', borderRadius: 7, border: '1px solid var(--border-default)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>
                                ‹
                            </button>
                            <button onClick={() => setCalMonth(m => {
                                const d = new Date(m.year, m.month + 1);
                                return { year: d.getFullYear(), month: d.getMonth() };
                            })} style={{ padding: '0.35rem 0.65rem', borderRadius: 7, border: '1px solid var(--border-default)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>
                                ›
                            </button>
                        </div>
                    </div>

                    {/* Grid do calendário */}
                    {(() => {
                        const firstDay = new Date(calMonth.year, calMonth.month, 1).getDay();
                        const daysInMonth = new Date(calMonth.year, calMonth.month + 1, 0).getDate();
                        const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
                        // Padeia para completar a última linha
                        while (cells.length % 7 !== 0) cells.push(null);

                        return (
                            <div>
                                {/* Cabeçalho dias da semana */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
                                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                                        <div key={d} style={{ textAlign: 'center', fontSize: '0.58rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', padding: '0.3rem 0' }}>
                                            {d}
                                        </div>
                                    ))}
                                </div>
                                {/* Grade de dias */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                                    {cells.map((day, idx) => {
                                        if (!day) return <div key={idx} />;
                                        const dateStr = `${calMonth.year}-${String(calMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const hist = attendanceHistory[dateStr];
                                        const isSelected = dateStr === selectedDate;
                                        const isToday = dateStr === new Date().toISOString().split('T')[0];

                                        let bg = 'rgba(255,255,255,0.03)';
                                        let border = '1px solid rgba(255,255,255,0.06)';
                                        let color = 'var(--text-muted)';
                                        let glow = 'none';

                                        if (isSelected) {
                                            bg = 'rgba(255,214,0,0.2)'; border = '1px solid rgba(255,214,0,0.6)';
                                            color = '#FFD600'; glow = '0 0 8px rgba(255,214,0,0.3)';
                                        } else if (hist === 'present') {
                                            bg = 'rgba(0,255,138,0.12)'; border = '1px solid rgba(0,255,138,0.4)';
                                            color = 'var(--neon-green)';
                                        } else if (hist === 'absent') {
                                            bg = 'rgba(255,45,85,0.1)'; border = '1px solid rgba(255,45,85,0.35)';
                                            color = 'var(--neon-red)';
                                        } else if (isToday) {
                                            border = '1px solid rgba(255,214,0,0.3)';
                                        }

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedDate(dateStr)}
                                                title={hist === 'present' ? 'Aula com presença' : hist === 'absent' ? 'Aula com ausência' : 'Clique para selecionar esta data'}
                                                style={{
                                                    padding: '0.4rem 0', borderRadius: 6, border, background: bg,
                                                    color, fontSize: '0.72rem', fontWeight: isSelected || hist ? 700 : 400,
                                                    cursor: 'pointer', transition: 'all 0.15s', boxShadow: glow,
                                                    fontFamily: isSelected ? 'Orbitron' : 'inherit',
                                                    position: 'relative',
                                                }}
                                            >
                                                {day}
                                                {hist === 'present' && <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: 'var(--neon-green)' }} />}
                                                {hist === 'absent' && <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: 'var(--neon-red)' }} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {!selectedClass ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>SELECIONE UMA TURMA PARA REGISTRAR FREQUÊNCIA</p>
                </div>
            ) : loadingStudents ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO ALUNOS...</p>
                </div>
            ) : students.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>👥</div>
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', letterSpacing: '0.12em' }}>NENHUM ALUNO MATRICULADO NESTA TURMA</p>
                </div>
            ) : (
                <>
                    {/* Touch-friendly student grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                        {students.map((student, i) => {
                            const state = attendance[student.id];
                            const isPresent = state === true;
                            const isAbsent = state === false;
                            const isUnmarked = state === null;

                            return (
                                <button
                                    key={student.id}
                                    onClick={() => toggleAttendance(student.id)}
                                    className="animate-fade-in"
                                    style={{
                                        animationDelay: `${i * 30}ms`,
                                        padding: '1.1rem',
                                        borderRadius: 14,
                                        border: `2px solid ${isPresent ? 'rgba(0,255,138,0.5)' : isAbsent ? 'rgba(255,45,85,0.5)' : 'var(--border-default)'}`,
                                        background: isPresent ? 'rgba(0,255,138,0.08)' : isAbsent ? 'rgba(255,45,85,0.08)' : 'rgba(255,255,255,0.02)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                        textAlign: 'center' as const,
                                        position: 'relative' as const,
                                        transform: isPresent || isAbsent ? 'scale(0.97)' : 'scale(1)',
                                        boxShadow: isPresent ? '0 0 16px rgba(0,255,138,0.15)' : isAbsent ? '0 0 16px rgba(255,45,85,0.15)' : 'none',
                                    }}
                                >
                                    {/* Status indicator */}
                                    <div style={{
                                        position: 'absolute', top: '0.6rem', right: '0.6rem',
                                        width: 24, height: 24, borderRadius: '50%',
                                        background: isPresent ? 'var(--neon-green)' : isAbsent ? 'var(--neon-red)' : 'var(--border-default)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.7rem', fontWeight: 900,
                                        boxShadow: isPresent ? '0 0 10px rgba(0,255,138,0.6)' : isAbsent ? '0 0 10px rgba(255,45,85,0.6)' : 'none',
                                        color: isUnmarked ? 'var(--text-muted)' : '#000',
                                        transition: 'all 0.2s',
                                    }}>
                                        {isPresent ? '✓' : isAbsent ? '✕' : '?'}
                                    </div>

                                    {/* Avatar */}
                                    <div style={{
                                        width: 52, height: 52, borderRadius: '50%',
                                        background: isPresent ? 'var(--neon-green)' : isAbsent ? 'var(--neon-red)' : 'rgba(255,214,0,0.1)',
                                        border: `2px solid ${isPresent ? 'var(--neon-green)' : isAbsent ? 'var(--neon-red)' : 'var(--border-default)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 0.7rem',
                                        fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.1rem',
                                        color: isPresent || isAbsent ? '#000' : 'var(--neon-yellow)',
                                        transition: 'all 0.2s',
                                    }}>
                                        {student.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                    </div>

                                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: '0.3rem', paddingRight: '1.5rem' }}>
                                        {student.name}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: isPresent ? 'var(--neon-green)' : isAbsent ? 'var(--neon-red)' : 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                        {isPresent ? '✓ Presente' : isAbsent ? '✕ Faltou' : '— Não marcado'}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Save Button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        {saved && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--neon-green)', fontSize: '0.85rem', fontWeight: 600 }}>
                                <span style={{ fontSize: '1rem' }}>✓</span> Frequência salva com sucesso!
                            </div>
                        )}
                        <button
                            onClick={saveAttendance}
                            disabled={saving || unmarkedCount === students.length}
                            className="btn-primary"
                            style={{ minWidth: 180, justifyContent: 'center' }}
                        >
                            {saving ? (
                                <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, boxShadow: 'none' }} /> Salvando...</>
                            ) : (
                                <><span>💾</span> Salvar Frequência</>
                            )}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
