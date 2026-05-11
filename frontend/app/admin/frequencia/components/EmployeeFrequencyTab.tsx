'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';
import AdminOverrideModal from './AdminOverrideModal';
import IndividualAttendanceDetailModal from './IndividualAttendanceDetailModal';
import { customConfirm } from '@/components/ui/ConfirmModal';
import { 
    CheckCircleIcon, 
    XCircleIcon, 
    MapPinIcon,
    PencilSquareIcon,
    ExclamationCircleIcon,
    ClockIcon,
    CalendarIcon,
    ChevronLeftIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline';

interface UnifiedAttendance {
    employee: {
        id: string;
        name: string;
        role: string;
        department: string;
        userId?: string;
        userName?: string;
    };
    attendanceId: string | null;
    present: boolean | null;
    justified: boolean;
    source: 'MANUAL' | 'AUTO_CHECKIN' | 'ADMIN_OVERRIDE' | 'PENDING';
    checkinTime: string | null;
    adminOverrideReason: string | null;
    registeredAt: string | null;
    registrar: { id: string; name: string } | null;
    date: string;
}

interface EmployeeFrequencyTabProps {
    role: 'TEACHER' | 'DRIVER';
}

export default function EmployeeFrequencyTab({ role }: EmployeeFrequencyTabProps) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [periodStart, setPeriodStart] = useState(() => {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - 30);
        return d.toISOString().slice(0, 10);
    });
    const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
    const [records, setRecords] = useState<UnifiedAttendance[]>([]);
    const [nameFilter, setNameFilter] = useState('');
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailEmployeeId, setDetailEmployeeId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [exportingXlsx, setExportingXlsx] = useState(false);
    
    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<UnifiedAttendance | null>(null);
    const [intendedStatus, setIntendedStatus] = useState<boolean | null>(null);

    // Histórico para calendário
    const [attendanceHistory, setAttendanceHistory] = useState<Record<string, 'present' | 'absent' | 'holiday'>>({});
    const [calMonth, setCalMonth] = useState(() => {
        const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
    });

    const loadRecords = async () => {
        setLoading(true);
        try {
            const res = await api.get('/employees/attendance/unified', {
                params: { date, role }
            });
            setRecords(res.data || []);

            // Carrega o histórico mensal para o calendário
            const histRes = await api.get('/employees/attendance/history', { params: { role } });
            const histData: any[] = Array.isArray(histRes.data) ? histRes.data : histRes.data?.data ?? [];
            const hist: Record<string, 'present' | 'absent' | 'holiday'> = {};
            
            const byDate: Record<string, { present: number; absent: number }> = {};
            histData.forEach((r: any) => {
                if (!r.date) return;
                const dateKey = r.date.split('T')[0];
                if (!byDate[dateKey]) byDate[dateKey] = { present: 0, absent: 0 };
                if (r.present === false) byDate[dateKey].absent += 1;
                else byDate[dateKey].present += 1;
            });
            Object.entries(byDate).forEach(([dateKey, totals]) => {
                hist[dateKey] = totals.absent > totals.present ? 'absent' : 'present';
            });
            setAttendanceHistory(hist);
        } catch (e) {
            toast.error('Erro ao carregar frequência');
            setRecords([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRecords();
    }, [date, role]);

    const isPastDate = (dateStr: string) => {
        const today = new Date().toISOString().slice(0, 10);
        return dateStr < today;
    };

    const requestDateChange = async (nextDate: string) => {
        if (!nextDate || nextDate === date) return;
        if (!isPastDate(nextDate)) {
            setDate(nextDate);
            return;
        }
        const ok = await customConfirm({
            title: 'Editar ponto de dia passado?',
            message: `Você selecionou ${new Date(nextDate + 'T12:00:00').toLocaleDateString('pt-BR')}. Confirmar antes de alterar garante rastreabilidade. Deseja continuar?`,
            confirmLabel: 'Sim, continuar',
            cancelLabel: 'Cancelar',
        });
        if (ok) setDate(nextDate);
    };

    const handleOpenModal = (record: UnifiedAttendance, status?: boolean) => {
        setSelectedRecord(record);
        setIntendedStatus(status ?? record.present);
        setModalOpen(true);
    };

    const handleDateChange = async (days: number) => {
        const d = new Date(date + 'T12:00:00Z');
        d.setDate(d.getDate() + days);
        await requestDateChange(d.toISOString().split('T')[0]);
    };

    const presentCount = records.filter(r => r.present === true).length;
    const absentCount = records.filter(r => r.present === false).length;
    const unmarkedCount = records.filter(r => r.present === null).length;
    const attendancePct = records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0;

    const filteredRecords = nameFilter.trim()
        ? records.filter(r =>
            r.employee.name.toLowerCase().includes(nameFilter.trim().toLowerCase()),
        )
        : records;

    const openDetail = (employeeId: string) => {
        setDetailEmployeeId(employeeId);
        setDetailOpen(true);
    };

    const exportPdfPeriodo = async () => {
        if (!periodStart || !periodEnd) {
            toast.error('Defina início e fim do período.');
            return;
        }
        const start = periodStart <= periodEnd ? periodStart : periodEnd;
        const end = periodStart <= periodEnd ? periodEnd : periodStart;
        setGeneratingPdf(true);
        try {
            const res = await api.get('/reports/employees/attendance', {
                params: { role, start, end },
                responseType: 'blob',
            });
            const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `frequencia-${role.toLowerCase()}-${start}-${end}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            const engine = String(res.headers['x-pdf-engine'] || '');
            if (engine === 'pdf-lib') {
                toast.success('PDF gerado em modo compatível (fallback sem Chromium).');
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Erro ao gerar PDF do período.');
        } finally {
            setGeneratingPdf(false);
        }
    };

    const exportExcelPeriodo = async () => {
        if (!periodStart || !periodEnd) {
            toast.error('Defina início e fim do período.');
            return;
        }
        const start = periodStart <= periodEnd ? periodStart : periodEnd;
        const end = periodStart <= periodEnd ? periodEnd : periodStart;
        setExportingXlsx(true);
        try {
            const res = await api.get('/reports/employees/attendance/xlsx', {
                params: { role, start, end },
                responseType: 'blob',
            });
            const url = URL.createObjectURL(
                new Blob([res.data], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                }),
            );
            const a = document.createElement('a');
            a.href = url;
            a.download = `frequencia-${role.toLowerCase()}-${start}-${end}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Excel dashboard exportado com sucesso.');
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Erro ao exportar Excel do período.');
        } finally {
            setExportingXlsx(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
            {/* Header controls adaptados para o novo layout de cartão */}
            <div className="glass-card" style={{ padding: '1.25rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Filtrar por nome</label>
                    <input
                        type="search"
                        placeholder="Digite para refinar a lista…"
                        value={nameFilter}
                        onChange={e => setNameFilter(e.target.value)}
                        className="form-input"
                        style={{ fontSize: '0.85rem', maxWidth: 420 }}
                    />
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        Clique no nome para ver frequência completa, cadastro e critérios do perfil ({role === 'DRIVER' ? 'motorista' : 'professor'}).
                    </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <label className="form-label">Data do Ponto</label>
                        <div className="flex items-center gap-2">
                            <button onClick={() => { void handleDateChange(-1); }} className="p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 bg-white shadow-sm transition-colors">
                                <ChevronLeftIcon className="w-5 h-5" />
                            </button>
                            <input 
                                type="date" 
                                value={date} 
                                onChange={(e) => { void requestDateChange(e.target.value); }}
                                className="form-input flex-1"
                                style={{ fontSize: '0.9rem', padding: '0.65rem' }}
                            />
                            <button onClick={() => { void handleDateChange(1); }} className="p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 bg-white shadow-sm transition-colors">
                                <ChevronRightIcon className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => { void requestDateChange(new Date().toISOString().split('T')[0]); }}
                                className="px-4 py-2.5 rounded-lg bg-blue-50 text-blue-600 font-medium text-sm hover:bg-blue-100 transition-colors shadow-sm ml-2"
                            >
                                Hoje
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Período para documentos</label>
                        <div className="flex items-center gap-2 flex-wrap">
                            <input
                                type="date"
                                value={periodStart}
                                onChange={(e) => setPeriodStart(e.target.value)}
                                className="form-input"
                                style={{ fontSize: '0.82rem', maxWidth: 170 }}
                            />
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>até</span>
                            <input
                                type="date"
                                value={periodEnd}
                                onChange={(e) => setPeriodEnd(e.target.value)}
                                className="form-input"
                                style={{ fontSize: '0.82rem', maxWidth: 170 }}
                            />
                            <button
                                type="button"
                                onClick={exportPdfPeriodo}
                                disabled={generatingPdf}
                                style={{
                                    padding: '0.5rem 0.9rem',
                                    borderRadius: 8,
                                    background: generatingPdf ? 'rgba(29,78,216,0.45)' : 'rgba(29,78,216,0.14)',
                                    border: '1px solid rgba(29,78,216,0.4)',
                                    color: '#60A5FA',
                                    fontWeight: 700,
                                    fontSize: '0.78rem',
                                    cursor: generatingPdf ? 'wait' : 'pointer',
                                }}
                            >
                                📄 {generatingPdf ? 'Gerando...' : 'PDF Período'}
                            </button>
                            <button
                                type="button"
                                onClick={exportExcelPeriodo}
                                disabled={exportingXlsx}
                                style={{
                                    padding: '0.5rem 0.9rem',
                                    borderRadius: 8,
                                    background: exportingXlsx ? 'rgba(5,150,105,0.45)' : 'rgba(5,150,105,0.14)',
                                    border: '1px solid rgba(5,150,105,0.45)',
                                    color: '#34D399',
                                    fontWeight: 700,
                                    fontSize: '0.78rem',
                                    cursor: exportingXlsx ? 'wait' : 'pointer',
                                }}
                            >
                                📊 {exportingXlsx ? 'Gerando...' : 'Excel Período'}
                            </button>
                        </div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                            Documentos instaláveis com período customizado ({role === 'DRIVER' ? 'motoristas' : 'professores'}).
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats no padrão da aba Alunos */}
            {records.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                    {[
                        { label: 'Total', value: records.length, color: 'var(--neon-yellow)' },
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
            {records.length > 0 && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span>Progresso do registro diário</span>
                        <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--neon-yellow)' }}>{presentCount + absentCount}/{records.length} consolidados</span>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${records.length > 0 ? ((presentCount + absentCount) / records.length) * 100 : 0}%` }} />
                    </div>
                </div>
            )}

            {/* Lista em formato de Cartões (Padrão Alunos) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {loading ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO FUNCIONÁRIOS...</p>
                    </div>
                ) : records.length === 0 ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <ExclamationCircleIcon className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', letterSpacing: '0.12em' }}>NENHUM FUNCIONÁRIO ENCONTRADO</p>
                    </div>
                ) : filteredRecords.length === 0 ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        <p style={{ fontSize: '0.85rem' }}>Nenhum nome corresponde ao filtro.</p>
                    </div>
                ) : (
                    filteredRecords.map((record, i) => {
                        const isPresent = record.present === true;
                        const isAbsent = record.present === false;

                        return (
                            <div
                                key={record.employee.id}
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
                                    {record.employee.name.substring(0, 2).toUpperCase()}
                                </div>

                                {/* Dados do Funcionário */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <button
                                        type="button"
                                        onClick={() => openDetail(record.employee.id)}
                                        style={{
                                            fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            textAlign: 'left', width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                                            padding: 0, textDecoration: 'underline', textDecorationColor: 'rgba(255,214,0,0.4)',
                                        }}
                                    >
                                        {record.employee.name}
                                    </button>
                                    <div style={{ fontSize: '0.65rem', color: isPresent ? 'var(--neon-green)' : isAbsent ? 'var(--neon-red)' : 'var(--text-muted)', fontWeight: 700, marginTop: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        {isPresent ? '✓ Presente' : isAbsent ? '✕ Faltou' : '— Pendente'}
                                        
                                        {/* Exibe origem do registro se consolidado */}
                                        {(isPresent || isAbsent) && record.source && (
                                            <span style={{ fontWeight: 400, opacity: 0.8 }}>
                                                • {record.source === 'AUTO_CHECKIN' ? 'Via App' : record.source === 'ADMIN_OVERRIDE' ? 'Override ADM' : 'Manual'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Botões P e F */}
                                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                                    <button
                                        onClick={() => handleOpenModal(record, true)}
                                        style={{
                                            minWidth: 48, minHeight: 44, borderRadius: 9,
                                            fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer',
                                            border: `2px solid ${isPresent ? 'var(--neon-green)' : 'rgba(0,255,138,0.2)'}`,
                                            background: isPresent ? 'var(--neon-green)' : 'transparent',
                                            color: isPresent ? '#000' : 'var(--neon-green)',
                                            transition: 'all 0.15s',
                                            boxShadow: isPresent ? '0 0 12px rgba(0,255,138,0.4)' : 'none',
                                        }}
                                        title="Registrar Presença (Abre Modal de Justificativa)"
                                    >P</button>
                                    <button
                                        onClick={() => handleOpenModal(record, false)}
                                        style={{
                                            minWidth: 48, minHeight: 44, borderRadius: 9,
                                            fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer',
                                            border: `2px solid ${isAbsent ? 'var(--neon-red)' : 'rgba(255,45,85,0.2)'}`,
                                            background: isAbsent ? 'var(--neon-red)' : 'transparent',
                                            color: isAbsent ? '#000' : 'var(--neon-red)',
                                            transition: 'all 0.15s',
                                            boxShadow: isAbsent ? '0 0 12px rgba(255,45,85,0.4)' : 'none',
                                        }}
                                        title="Registrar Falta (Abre Modal de Justificativa)"
                                    >F</button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Calendário de Histórico (Padrão Alunos) */}
            {records.length > 0 && (
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                    {/* Header do calendário */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ flex: 1 }}>
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
                                    { color: 'rgba(0,255,138,0.7)', label: 'Dia com registros' },
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
                                        const isSelected = dateStr === date;
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
                                        } else if (isToday) {
                                            border = '1px solid rgba(255,214,0,0.3)';
                                        }

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => { void requestDateChange(dateStr); }}
                                                title={hist === 'present' ? 'Dia com registros de ponto' : 'Clique para selecionar esta data'}
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
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {selectedRecord && (
                <AdminOverrideModal 
                    key={`${selectedRecord.employee.id}-${intendedStatus}`}
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    employeeName={selectedRecord.employee.name}
                    employeeId={selectedRecord.employee.id}
                    attendanceId={selectedRecord.attendanceId}
                    date={date}
                    currentPresent={intendedStatus}
                    onSuccess={loadRecords}
                />
            )}

            {detailEmployeeId && (
                <IndividualAttendanceDetailModal
                    key={detailEmployeeId}
                    open={detailOpen}
                    onClose={() => { setDetailOpen(false); setDetailEmployeeId(null); }}
                    mode="employee"
                    employeeId={detailEmployeeId}
                    employeeRoleApi={role}
                />
            )}
        </div>
    );
}
