'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api/client';

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
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ─── Modal detalhe do dia ─────────────────────────────────────────────────────
function ModalDia({ record, onClose }: { record: AttendanceRecord; onClose: () => void }) {
    const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const status = record.justified ? { label: '📋 Falta Justificada', color: '#92730A', bg: '#FFFBEB', border: '#FEF08A' }
        : record.present ? { label: '✅ Presente', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' }
        : { label: '❌ Falta', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '16px 20px 12px', background: status.bg, borderBottom: `1px solid ${status.border}`, borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h3 style={{ fontFamily: 'Orbitron', fontSize: '0.8rem', fontWeight: 900, color: status.color, margin: 0 }}>DETALHE DE FREQUÊNCIA</h3>
                        <p style={{ fontSize: '0.75rem', color: status.color, opacity: 0.8, margin: '2px 0 0' }}>{fmt(record.date)}</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><XMarkIcon style={{ width: 20, height: 20 }} /></button>
                </div>
                <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ padding: '0.75rem 1rem', borderRadius: 10, background: status.bg, border: `1px solid ${status.border}`, textAlign: 'center' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: status.color }}>{status.label}</span>
                    </div>
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
        </div>
    );
}

// ─── Calendário ───────────────────────────────────────────────────────────────
function AttendanceCalendar({ records, year, month, onDayClick }: {
    records: AttendanceRecord[]; year: number; month: number;
    onDayClick: (r: AttendanceRecord) => void;
}) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const getRecord = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return records.find(r => r.date.startsWith(dateStr));
    };
    const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
    const isFuture = (d: number) => new Date(year, month, d) > today;

    return (
        <div>
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
                            style={{ aspectRatio: '1', borderRadius: 8, background: bg, border, color, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: rec ? 'pointer' : 'default', transition: 'transform 0.12s, box-shadow 0.12s', position: 'relative' }}
                            onMouseEnter={e => { if (rec) { (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; } }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                            title={rec ? (rec.present ? 'Presente — clique para detalhes' : rec.justified ? 'Falta Justificada — clique para detalhes' : 'Falta — clique para detalhes') : ''}>
                            <span style={{ fontSize: '0.7rem', fontWeight: todayDay ? 900 : 600, fontFamily: todayDay ? 'Orbitron' : 'inherit' }}>{day}</span>
                            {emoji && <span style={{ fontSize: '0.5rem', lineHeight: 1 }}>{emoji}</span>}
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
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [classes, setClasses] = useState<StudentClass[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

    // Carrega turmas do aluno para o filtro
    useEffect(() => {
        api.get('/students/me/classes')
            .then(r => setClasses(Array.isArray(r.data) ? r.data : []))
            .catch(() => setClasses([]));
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
        const d = new Date(r.date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
    const present = monthRecords.filter(r => r.present && !r.justified).length;
    const absent = monthRecords.filter(r => !r.present && !r.justified).length;
    const justified = monthRecords.filter(r => r.justified).length;
    const total = monthRecords.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    // Taxa geral (todos os registros)
    const totalAll = records.length;
    const presentAll = records.filter(r => r.present && !r.justified).length;
    const rateAll = totalAll > 0 ? Math.round((presentAll / totalAll) * 100) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontFamily: 'Orbitron', fontSize: '2rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '0.4rem' }}>FREQUÊNCIA</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Calendário de presenças e faltas — clique em um dia para detalhes</p>
                </div>
                {/* Filtro por turma (PASSO 3.3) */}
                {classes.length > 0 && (
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                        style={{ padding: '0.5rem 0.85rem', borderRadius: 9, border: '1.5px solid #E5E7EB', background: '#F9FAFB', fontSize: '0.82rem', color: '#374151', cursor: 'pointer', minWidth: 200 }}>
                        <option value="">Todas as turmas</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.course?.name || 'Turma'}{c.city ? ` — ${c.city.name}` : ''}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* KPI cards do mês atual */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.85rem' }}>
                {[
                    { label: 'Freq. do Mês', value: `${rate}%`, color: rate >= 75 ? '#059669' : '#DC2626', bg: rate >= 75 ? '#DCFCE7' : '#FEF2F2', border: rate >= 75 ? '#BBF7D0' : '#FECACA' },
                    { label: 'Freq. Geral', value: `${rateAll}%`, color: rateAll >= 75 ? '#059669' : '#DC2626', bg: rateAll >= 75 ? '#F0FDF4' : '#FEF9F9', border: rateAll >= 75 ? '#BBF7D0' : '#FCA5A5' },
                    { label: 'Presenças', value: present, color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
                    { label: 'Faltas', value: absent, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
                    { label: 'Justificadas', value: justified, color: '#92730A', bg: '#FFFBEB', border: '#FEF08A' },
                ].map(s => (
                    <div key={s.label} style={{ padding: '0.9rem', borderRadius: 12, background: s.bg, border: `1px solid ${s.border}`, textAlign: 'center' }}>
                        <div style={{ fontFamily: 'Orbitron', fontSize: '1.4rem', fontWeight: 900, color: s.color, marginBottom: '0.2rem' }}>{s.value}</div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: s.color, opacity: 0.8 }}>{s.label}</div>
                    </div>
                ))}
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
                        {/* Botão "Hoje" (PASSO 3.3) */}
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
                ) : (
                    <AttendanceCalendar records={records} year={currentYear} month={currentMonth} onDayClick={setSelectedRecord} />
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

            {selectedRecord && <ModalDia record={selectedRecord} onClose={() => setSelectedRecord(null)} />}
        </div>
    );
}
