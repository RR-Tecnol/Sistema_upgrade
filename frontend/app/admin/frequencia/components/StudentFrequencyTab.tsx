'use client';

import { useEffect, useState, useCallback } from 'react';
import { classesApi, Class } from '@/lib/api/classes';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';
import IndividualAttendanceDetailModal from './IndividualAttendanceDetailModal';
import { customConfirm } from '@/components/ui/ConfirmModal';

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

export default function StudentFrequencyTab() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<Record<string, boolean | null>>({});
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [periodStart, setPeriodStart] = useState(() => {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - 30);
        return d.toISOString().slice(0, 10);
    });
    const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [exportingXlsx, setExportingXlsx] = useState(false);
    // PASSO 3.12 — estado do dia selecionado
    const [isEditingExisting, setIsEditingExisting] = useState(false);
    const [loadingDayAttendance, setLoadingDayAttendance] = useState(false);
    
    // BUG-07: calendário de histórico
    const [attendanceHistory, setAttendanceHistory] = useState<Record<string, 'present' | 'absent' | 'holiday'>>({});
    const [calMonth, setCalMonth] = useState(() => {
        const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
    });
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailStudentId, setDetailStudentId] = useState<string | null>(null);
    const [studentNameFilter, setStudentNameFilter] = useState('');

    const isPastDate = (dateStr: string) => {
        const today = new Date().toISOString().slice(0, 10);
        return dateStr < today;
    };

    const requestDateChange = async (nextDate: string) => {
        if (!nextDate || nextDate === selectedDate) return;
        if (!isPastDate(nextDate)) {
            setSelectedDate(nextDate);
            return;
        }
        const ok = await customConfirm({
            title: 'Editar dia já encerrado?',
            message: `Você selecionou ${new Date(nextDate + 'T12:00:00').toLocaleDateString('pt-BR')}. Alterar ponto de dia passado impacta relatórios e auditoria. Deseja continuar?`,
            confirmLabel: 'Sim, continuar',
            cancelLabel: 'Cancelar',
        });
        if (ok) setSelectedDate(nextDate);
    };

    const generateFrequencyPdf = async () => {
        if (!selectedClass) return;
        if (!periodStart || !periodEnd) {
            toast.error('Defina o período para o documento.');
            return;
        }
        const start = periodStart <= periodEnd ? periodStart : periodEnd;
        const end = periodStart <= periodEnd ? periodEnd : periodStart;
        setGeneratingPdf(true);
        try {
            const res = await api.get(`/reports/frequency/${selectedClass}`, {
                params: { start, end },
                responseType: 'blob',
            });
            const ctype = String(res.headers['content-type'] || '');
            if (ctype.includes('application/json')) {
                const txt = await (res.data as Blob).text();
                let msg = 'Resposta inválida ao gerar PDF.';
                try {
                    msg = JSON.parse(txt).message || msg;
                } catch {
                    msg = txt.slice(0, 160) || msg;
                }
                toast.error(msg);
                return;
            }
            const engine = String(res.headers['x-pdf-engine'] || '');
            const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `frequencia-${selectedClass}-${start}-${end}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            if (engine === 'pdf-lib') {
                toast.success('PDF gerado com sucesso (modo compatível neste servidor).');
            }
        } catch (e: unknown) {
            const ax = e as { response?: { status?: number; data?: { message?: string } } };
            const st = ax?.response?.status;
            const apiMsg = ax?.response?.data?.message;
            if (st === 500) {
                toast.error(
                    apiMsg ||
                        'O servidor não conseguiu concluir o PDF. Tente de novo ou contacte a equipa técnica.',
                );
            } else if (st === 401 || st === 403) {
                toast.error('Sessão expirada ou sem permissão para relatórios.');
            } else {
                toast.error(
                    apiMsg ||
                        'Não foi possível baixar o PDF. Confirme a ligação e que está autenticado com permissão para relatórios.',
                );
            }
        } finally {
            setGeneratingPdf(false);
        }
    };

    const exportFrequencyExcel = async () => {
        if (!selectedClass) return;
        if (!periodStart || !periodEnd) {
            toast.error('Defina o período para o documento.');
            return;
        }
        const start = periodStart <= periodEnd ? periodStart : periodEnd;
        const end = periodStart <= periodEnd ? periodEnd : periodStart;
        setExportingXlsx(true);
        try {
            const res = await api.get(`/reports/frequency/${selectedClass}/xlsx`, {
                params: { start, end },
                responseType: 'blob',
            });
            const url = URL.createObjectURL(
                new Blob([res.data], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                }),
            );
            const a = document.createElement('a');
            a.href = url;
            a.download = `frequencia-dashboard-${selectedClass}-${start}-${end}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Planilha painel exportada (KPI + alunos + matriz).');
        } catch (e: unknown) {
            const ax = e as { response?: { status?: number; data?: { message?: string } } };
            toast.error(ax?.response?.data?.message || 'Falha ao exportar planilha de frequência.');
        } finally {
            setExportingXlsx(false);
        }
    };

    useEffect(() => {
        loadActiveClasses();
    }, []);

    const loadActiveClasses = async () => {
        try {
            const data = await classesApi.getAll({ status: 'IN_PROGRESS' });
            setClasses(data);
        } catch {
            // falha silenciosa — lista fica vazia, usuário vê "Selecione uma turma"
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
            const enrolled_active = enrolled.filter((e: any) =>
                e.status === 'ENROLLED' ||
                e.status === 'APPROVED' ||
                e.status === 'PENDING' ||
                e.status === 'DOCUMENT_PENDING' ||
                e.status === 'DOCUMENTS_PENDING',
            );
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
        } catch {
            // falha silenciosa — lista de alunos fica vazia, usuário vê estado vazio
            setStudents([]);
        } finally {
            setLoadingStudents(false);
        }
    }, []);

    useEffect(() => {
        if (selectedClass) loadStudents(selectedClass);
    }, [selectedClass, loadStudents]);

    // PASSO 3.12 — ao mudar a data, carregar frequência já salva para esse dia
    useEffect(() => {
        if (!selectedClass || students.length === 0) return;
        const hasPrev = !!attendanceHistory[selectedDate];
        if (!hasPrev) {
            // Dia sem registro — zerar para não marcado
            const init: Record<string, boolean | null> = {};
            students.forEach(s => { init[s.id] = null; });
            setAttendance(init);
            setIsEditingExisting(false);
            return;
        }
        // Dia com registro — buscar os dados reais do backend
        setLoadingDayAttendance(true);
        setIsEditingExisting(true);
        api.get(`/classes/${selectedClass}/attendance/history`)
            .then(res => {
                const all: any[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
                const dayRecords = all.filter((r: any) => r.date?.split('T')[0] === selectedDate);
                if (dayRecords.length > 0) {
                    const loaded: Record<string, boolean | null> = {};
                    // Inicializa todos como null, depois aplica os registros encontrados
                    students.forEach(s => { loaded[s.id] = null; });
                    dayRecords.forEach((r: any) => { if (r.studentId) loaded[r.studentId] = r.present; });
                    setAttendance(loaded);
                }
            })
            .catch(() => { /* silencioso — mantém estado atual */ })
            .finally(() => setLoadingDayAttendance(false));
    }, [selectedDate, selectedClass, students, attendanceHistory]);

    const markAll = (present: boolean) => {
        const upd: Record<string, boolean> = {};
        students.forEach(s => { upd[s.id] = present; });
        setAttendance(upd);
        setSaved(false);
    };

    const saveAttendance = async () => {
        if (isPastDate(selectedDate)) {
            const ok = await customConfirm({
                title: 'Confirmar edição retroativa',
                message: 'Este lançamento é de uma data passada. Confirma salvar a alteração de frequência?',
                confirmLabel: 'Salvar mesmo assim',
                cancelLabel: 'Cancelar',
            });
            if (!ok) return;
        }
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
            setAttendanceHistory(prev => {
                const next = { ...prev };
                const anyPresent = records.some(r => r.present);
                next[selectedDate] = anyPresent ? 'present' : 'absent';
                return next;
            });
            setSaved(true);
            toast.success(`${records.length} presenças registradas com sucesso!`);
            setTimeout(() => setSaved(false), 3000);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Erro ao salvar frequência. Tente novamente.');
            setSaved(false);
        } finally {
            setSaving(false);
        }
    };

    const presentCount = Object.values(attendance).filter(v => v === true).length;
    const absentCount = Object.values(attendance).filter(v => v === false).length;
    const unmarkedCount = students.length - presentCount - absentCount;
    const attendancePct = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

    const filteredStudents = studentNameFilter.trim()
        ? students.filter(s =>
            s.name.toLowerCase().includes(studentNameFilter.trim().toLowerCase()),
        )
        : students;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontFamily: 'Orbitron', fontSize: '2rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                        FREQUÊNCIA
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Registro digital de presença — clique no nome do aluno para ver frequência completa e cadastro</p>
                </div>
                {/* Botão PDF REQ-11 */}
                {selectedClass && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
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
                            <>📄 PDF painel (KPI + matriz)</>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={exportFrequencyExcel}
                        disabled={exportingXlsx}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.6rem 1.25rem', borderRadius: 10,
                            background: exportingXlsx ? 'rgba(5,150,105,0.35)' : 'rgba(5,150,105,0.12)',
                            border: '1px solid rgba(5,150,105,0.45)',
                            color: '#34D399', fontSize: '0.82rem', fontWeight: 700,
                            cursor: exportingXlsx ? 'wait' : 'pointer', transition: 'all 0.2s',
                        }}
                    >
                        {exportingXlsx ? '…' : '📊 Excel painel (3 folhas)'}
                    </button>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="glass-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Filtrar aluno por nome</label>
                        <input
                            type="search"
                            placeholder="Opcional — refina a lista abaixo"
                            value={studentNameFilter}
                            onChange={e => setStudentNameFilter(e.target.value)}
                            className="form-input"
                            style={{ fontSize: '0.85rem', maxWidth: 420 }}
                        />
                    </div>
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
                            onChange={e => { void requestDateChange(e.target.value); }}
                            className="form-input"
                            style={{ fontSize: '0.85rem' }}
                        />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Período para documentos (PDF/Excel)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <input
                                type="date"
                                value={periodStart}
                                onChange={e => setPeriodStart(e.target.value)}
                                className="form-input"
                                style={{ fontSize: '0.82rem', maxWidth: 170 }}
                            />
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>até</span>
                            <input
                                type="date"
                                value={periodEnd}
                                onChange={e => setPeriodEnd(e.target.value)}
                                className="form-input"
                                style={{ fontSize: '0.82rem', maxWidth: 170 }}
                            />
                        </div>
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
                                                onClick={() => { void requestDateChange(dateStr); }}
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
                    {/* PASSO 3.12 — Banner de edição de registro existente */}
                    {isEditingExisting && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.75rem 1rem', borderRadius: 10,
                            background: 'rgba(255,214,0,0.08)',
                            border: '1.5px solid rgba(255,214,0,0.35)',
                        }}>
                            {loadingDayAttendance
                                ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, boxShadow: 'none' }} /> <span style={{ fontSize: '0.82rem', color: 'var(--neon-yellow)', fontWeight: 600 }}>Carregando registro do dia...</span></>
                                : <><span style={{ fontSize: '1rem' }}>✏️</span> <span style={{ fontSize: '0.82rem', color: 'var(--neon-yellow)', fontWeight: 700 }}>Editando registro existente — {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}. Salve novamente para atualizar.</span></>
                            }
                        </div>
                    )}

                    {/* PASSO 3.11 — 2 botões P/F por aluno (touch-friendly, min 44px) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {filteredStudents.length === 0 && students.length > 0 && (
                            <div className="glass-card" style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                Nenhum aluno corresponde ao filtro.
                            </div>
                        )}
                        {filteredStudents.map((student, i) => {
                            const state = attendance[student.id];
                            const isPresent = state === true;
                            const isAbsent = state === false;

                            return (
                                <div
                                    key={student.id}
                                    className="animate-fade-in"
                                    style={{
                                        animationDelay: `${i * 20}ms`,
                                        display: 'flex', alignItems: 'center',
                                        gap: '0.75rem', padding: '0.65rem 1rem',
                                        borderRadius: 12,
                                        border: `1.5px solid ${isPresent ? 'rgba(0,255,138,0.4)' : isAbsent ? 'rgba(255,45,85,0.4)' : 'var(--border-default)'}`,
                                        background: isPresent ? 'rgba(0,255,138,0.06)' : isAbsent ? 'rgba(255,45,85,0.06)' : 'rgba(255,255,255,0.02)',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {/* Avatar */}
                                    <div style={{
                                        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                                        background: isPresent ? 'var(--neon-green)' : isAbsent ? 'var(--neon-red)' : 'rgba(255,214,0,0.1)',
                                        border: `2px solid ${isPresent ? 'var(--neon-green)' : isAbsent ? 'var(--neon-red)' : 'var(--border-default)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.75rem',
                                        color: isPresent || isAbsent ? '#000' : 'var(--neon-yellow)',
                                        transition: 'all 0.15s',
                                    }}>
                                        {student.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                    </div>

                                    {/* Nome */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <button
                                            type="button"
                                            onClick={() => { setDetailStudentId(student.id); setDetailOpen(true); }}
                                            style={{
                                                fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                textAlign: 'left', width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                                                padding: 0, textDecoration: 'underline', textDecorationColor: 'rgba(255,214,0,0.4)',
                                            }}
                                        >
                                            {student.name}
                                        </button>
                                        <div style={{ fontSize: '0.65rem', color: isPresent ? 'var(--neon-green)' : isAbsent ? 'var(--neon-red)' : 'var(--text-muted)', fontWeight: 700, marginTop: '0.1rem' }}>
                                            {isPresent ? '✓ Presente' : isAbsent ? '✕ Faltou' : '— Não marcado'}
                                        </div>
                                    </div>

                                    {/* PASSO 3.11 — 2 botões explícitos P e F */}
                                    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                                        <button
                                            onClick={() => { setAttendance(prev => ({ ...prev, [student.id]: true })); setSaved(false); }}
                                            style={{
                                                minWidth: 48, minHeight: 44, borderRadius: 9,
                                                fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer',
                                                border: `2px solid ${isPresent ? 'var(--neon-green)' : 'rgba(0,255,138,0.2)'}`,
                                                background: isPresent ? 'var(--neon-green)' : 'transparent',
                                                color: isPresent ? '#000' : 'var(--neon-green)',
                                                transition: 'all 0.15s',
                                                boxShadow: isPresent ? '0 0 12px rgba(0,255,138,0.4)' : 'none',
                                            }}
                                            title="Marcar como Presente"
                                        >P</button>
                                        <button
                                            onClick={() => { setAttendance(prev => ({ ...prev, [student.id]: false })); setSaved(false); }}
                                            style={{
                                                minWidth: 48, minHeight: 44, borderRadius: 9,
                                                fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer',
                                                border: `2px solid ${isAbsent ? 'var(--neon-red)' : 'rgba(255,45,85,0.2)'}`,
                                                background: isAbsent ? 'var(--neon-red)' : 'transparent',
                                                color: isAbsent ? '#000' : 'var(--neon-red)',
                                                transition: 'all 0.15s',
                                                boxShadow: isAbsent ? '0 0 12px rgba(255,45,85,0.4)' : 'none',
                                            }}
                                            title="Marcar como Faltou"
                                        >F</button>
                                    </div>
                                </div>
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

            {selectedClass && detailStudentId && (
                <IndividualAttendanceDetailModal
                    key={`${selectedClass}-${detailStudentId}`}
                    open={detailOpen}
                    onClose={() => { setDetailOpen(false); setDetailStudentId(null); }}
                    mode="student"
                    classId={selectedClass}
                    studentId={detailStudentId}
                />
            )}
        </div>
    );
}
