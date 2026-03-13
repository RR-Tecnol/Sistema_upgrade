'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/client';

interface AttendanceRecord {
    date: string;
    present: boolean;
    justified: boolean;
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function AttendanceCalendar({ records, year, month }: { records: AttendanceRecord[]; year: number; month: number }) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const getRecord = (day: number): AttendanceRecord | undefined => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return records.find(r => r.date.startsWith(dateStr));
    };

    const today = new Date();
    const isToday = (day: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    const isFuture = (day: number) => new Date(year, month, day) > today;

    return (
        <div>
            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
                {DAYS_SHORT.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 0' }}>
                        {d}
                    </div>
                ))}
            </div>
            {/* Cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {/* Empty prefix */}
                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                {/* Days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const record = getRecord(day);
                    const future = isFuture(day);
                    const todayDay = isToday(day);

                    let bg = '#F9FAFB';
                    let color = '#9CA3AF';
                    let border = '1px solid #E5E7EB';
                    let emoji = '';

                    if (record) {
                        if (record.justified) {
                            bg = '#FFFBEB'; color = '#92730A'; border = '1px solid #FEF08A'; emoji = '📋';
                        } else if (record.present) {
                            bg = '#DCFCE7'; color = '#15803D'; border = '1px solid #BBF7D0'; emoji = '✓';
                        } else {
                            bg = '#FEF2F2'; color = '#DC2626'; border = '1px solid #FECACA'; emoji = '✕';
                        }
                    } else if (!future) {
                        bg = '#F3F4F6'; color = '#D1D5DB';
                    }

                    if (todayDay) {
                        border = '2px solid #FFD600';
                    }

                    return (
                        <div key={day} style={{
                            aspectRatio: '1', borderRadius: 8,
                            background: bg, border, color,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            cursor: record ? 'pointer' : 'default',
                            transition: 'transform 0.15s',
                            position: 'relative',
                        }}
                            title={record ? (record.present ? 'Presente' : record.justified ? 'Falta Justificada' : 'Falta') : ''}
                        >
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

export default function StudentAttendancePage() {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    useEffect(() => { fetchAttendance(); }, []);

    const fetchAttendance = async () => {
        try {
            const res = await api.get('/students/me/attendance');
            setRecords(Array.isArray(res.data) ? res.data : []);
        } catch {
            // Use mock data if API not ready
            const mockDates = [];
            const now = new Date();
            for (let i = 1; i <= now.getDate(); i++) {
                if (i % 7 !== 0 && i % 7 !== 6) { // skip weekends
                    mockDates.push({
                        date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
                        present: i % 5 !== 0,
                        justified: i % 10 === 0,
                    });
                }
            }
            setRecords(mockDates);
        } finally {
            setLoading(false);
        }
    };

    const monthRecords = records.filter(r => {
        const d = new Date(r.date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
    const present = monthRecords.filter(r => r.present).length;
    const absent = monthRecords.filter(r => !r.present && !r.justified).length;
    const justified = monthRecords.filter(r => r.justified).length;
    const total = monthRecords.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    const prevMonth = () => {
        if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
        else setCurrentMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
        else setCurrentMonth(m => m + 1);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="gradient-text" style={{ fontFamily: 'Orbitron', fontSize: '2rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '0.4rem' }}>FREQUÊNCIA</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Seu calendário de presenças e faltas</p>
            </div>

            {/* Monthly stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.85rem' }}>
                {[
                    { label: 'Frequência', value: `${rate}%`, color: rate >= 75 ? '#059669' : '#DC2626', bg: rate >= 75 ? '#DCFCE7' : '#FEF2F2', border: rate >= 75 ? '#BBF7D0' : '#FECACA' },
                    { label: 'Presenças', value: present, color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
                    { label: 'Faltas', value: absent, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
                    { label: 'Justificadas', value: justified, color: '#92730A', bg: '#FFFBEB', border: '#FEF08A' },
                    { label: 'Total de Aulas', value: total, color: '#374151', bg: '#F9FAFB', border: '#E5E7EB' },
                ].map(s => (
                    <div key={s.label} style={{ padding: '1rem', borderRadius: 12, background: s.bg, border: `1px solid ${s.border}`, textAlign: 'center' }}>
                        <div style={{ fontFamily: 'Orbitron', fontSize: '1.5rem', fontWeight: 900, color: s.color, marginBottom: '0.25rem' }}>{s.value}</div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: s.color, opacity: 0.7 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Calendar */}
            <div className="glass-card">
                {/* Month navigation */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <button onClick={prevMonth} style={{ padding: '0.4rem 0.75rem', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#FFD600'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'}>
                        ‹ Anterior
                    </button>
                    <h2 style={{ fontFamily: 'Orbitron', fontSize: '1rem', fontWeight: 800, color: '#111827' }}>
                        {MONTHS[currentMonth]} {currentYear}
                    </h2>
                    <button onClick={nextMonth} style={{ padding: '0.4rem 0.75rem', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#FFD600'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'}>
                        Próximo ›
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO...</p>
                    </div>
                ) : (
                    <AttendanceCalendar records={records} year={currentYear} month={currentMonth} />
                )}

                {/* Legend */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #E5E7EB' }}>
                    {[
                        { color: '#DCFCE7', border: '#BBF7D0', text: '#15803D', label: '✓ Presente' },
                        { color: '#FEF2F2', border: '#FECACA', text: '#DC2626', label: '✕ Falta' },
                        { color: '#FFFBEB', border: '#FEF08A', text: '#92730A', label: '📋 Justificada' },
                        { color: '#FFFDE7', border: '#FFD600', text: '#B89B00', label: '● Hoje' },
                    ].map(l => (
                        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div style={{ width: 18, height: 18, borderRadius: 5, background: l.color, border: `1.5px solid ${l.border}` }} />
                            <span style={{ fontSize: '0.72rem', color: l.text, fontWeight: 600 }}>{l.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Alert if low attendance */}
            {rate < 75 && rate > 0 && (
                <div style={{ padding: '1rem 1.25rem', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>⚠️</span>
                    <div>
                        <div style={{ fontWeight: 700, color: '#DC2626', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Atenção: Frequência Abaixo do Mínimo</div>
                        <div style={{ color: '#B91C1C', fontSize: '0.78rem' }}>Sua frequência atual é de {rate}%. O mínimo exigido para aprovação é 75%. Entre em contato com a coordenação.</div>
                    </div>
                </div>
            )}
        </div>
    );
}
