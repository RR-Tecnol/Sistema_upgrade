'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/client';
import { CalendarDaysIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface HistoryRecord {
    id: string;
    date: string;
    present: boolean;
    class: {
        id: string;
        classIdentifier: string;
        course: { name: string };
        city: { name: string; state: string };
    };
    student: {
        user: { name: string };
    };
}

interface DayGroup {
    date: string;
    label: string;
    records: HistoryRecord[];
    presentCount: number;
    absentCount: number;
    className: string;
    cityName: string;
}

function groupByDay(records: HistoryRecord[]): DayGroup[] {
    const map = new Map<string, HistoryRecord[]>();
    records.forEach(r => {
        const day = r.date.split('T')[0];
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(r);
    });
    return Array.from(map.entries()).map(([date, recs]) => {
        const presentCount = recs.filter(r => r.present).length;
        const first = recs[0];
        const d = new Date(date + 'T12:00:00');
        return {
            date,
            label: d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
            records: recs,
            presentCount,
            absentCount: recs.length - presentCount,
            className: first?.class?.course?.name || '—',
            cityName: first ? `${first.class?.city?.name} / ${first.class?.city?.state}` : '—',
        };
    });
}

export default function TeacherHistorico() {
    const [groups, setGroups] = useState<DayGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedDay, setExpandedDay] = useState<string | null>(null);
    const [totalPresent, setTotalPresent] = useState(0);
    const [totalAbsent, setTotalAbsent] = useState(0);

    useEffect(() => {
        loadHistory();
    }, []);

    async function loadHistory() {
        try {
            const res = await api.get('/classes/teacher/history');
            const records: HistoryRecord[] = Array.isArray(res.data) ? res.data : [];
            const grouped = groupByDay(records);
            setGroups(grouped);
            setTotalPresent(records.filter(r => r.present).length);
            setTotalAbsent(records.filter(r => !r.present).length);
        } catch {
            setGroups([]);
        } finally {
            setLoading(false);
        }
    }

    const totalRegistros = totalPresent + totalAbsent;
    const taxaPresenca = totalRegistros > 0 ? Math.round((totalPresent / totalRegistros) * 100) : 0;

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 className="gradient-text" style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.08em', margin: 0 }}>
                    HISTÓRICO DE FREQUÊNCIA
                </h1>
                <p style={{ color: '#6B7280', fontSize: '0.85rem', marginTop: 4 }}>
                    Todas as frequências que você registrou
                </p>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem', marginBottom: '1.75rem' }}>
                {[
                    { icon: <CalendarDaysIcon style={{ width: 20, height: 20 }} />, label: 'Dias Registrados', value: groups.length, color: '#FFD600' },
                    { icon: <CheckCircleIcon style={{ width: 20, height: 20 }} />, label: 'Presenças', value: totalPresent, color: '#10B981' },
                    { icon: <XCircleIcon style={{ width: 20, height: 20 }} />, label: 'Faltas', value: totalAbsent, color: '#EF4444' },
                    { icon: <ClockIcon style={{ width: 20, height: 20 }} />, label: 'Taxa Presença', value: `${taxaPresenca}%`, color: taxaPresenca >= 75 ? '#10B981' : '#F59E0B' },
                ].map((kpi, i) => (
                    <div key={i} style={{
                        background: '#fff', borderRadius: 12, padding: '1rem',
                        border: '1px solid #E5E7EB',
                        display: 'flex', alignItems: 'center', gap: '0.85rem',
                    }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 10,
                            background: `${kpi.color}18`, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: kpi.color, flexShrink: 0,
                        }}>
                            {kpi.icon}
                        </div>
                        <div>
                            <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: '1.35rem', color: '#111827', lineHeight: 1 }}>
                                {kpi.value}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {kpi.label}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Timeline */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>Carregando histórico...</div>
            ) : groups.length === 0 ? (
                <div style={{
                    background: '#fff', borderRadius: 12, padding: '3rem',
                    textAlign: 'center', border: '1px solid #E5E7EB',
                }}>
                    <CalendarDaysIcon style={{ width: 48, height: 48, color: '#D1D5DB', margin: '0 auto 1rem' }} />
                    <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Nenhuma frequência registrada ainda.</p>
                    <p style={{ color: '#9CA3AF', fontSize: '0.78rem', marginTop: 6 }}>As frequências aparecerão aqui após o primeiro registro.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {groups.map((group) => {
                        const isExpanded = expandedDay === group.date;
                        const presRate = group.records.length > 0
                            ? Math.round((group.presentCount / group.records.length) * 100)
                            : 0;

                        return (
                            <div key={group.date} style={{
                                background: '#fff', borderRadius: 14,
                                border: '1px solid #E5E7EB',
                                overflow: 'hidden',
                                transition: 'box-shadow 0.2s',
                            }}>
                                {/* Day header */}
                                <button
                                    onClick={() => setExpandedDay(isExpanded ? null : group.date)}
                                    style={{
                                        width: '100%', padding: '1rem 1.25rem',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        textAlign: 'left', gap: '1rem',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                                            background: presRate >= 75 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)',
                                            border: `1.5px solid ${presRate >= 75 ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.3)'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.85rem', color: presRate >= 75 ? '#10B981' : '#EF4444' }}>
                                                {presRate}%
                                            </span>
                                        </div>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.88rem', marginBottom: 2, textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {group.label}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {group.className} · {group.cityName}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#10B981', fontWeight: 600 }}>
                                                <CheckCircleIcon style={{ width: 14, height: 14 }} /> {group.presentCount}
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#EF4444', fontWeight: 600 }}>
                                                <XCircleIcon style={{ width: 14, height: 14 }} /> {group.absentCount}
                                            </span>
                                        </div>
                                        <span style={{ color: '#475569', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'none', display: 'inline-block', fontSize: '1rem' }}>
                                            ›
                                        </span>
                                    </div>
                                </button>

                                {/* Expanded: alunos */}
                                {isExpanded && (
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '0.5rem 1.25rem 1rem' }}>
                                        <div style={{ display: 'grid', gap: '0.4rem', maxHeight: 280, overflowY: 'auto' }}>
                                            {group.records.map((r) => (
                                                <div key={r.id} style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '0.5rem 0.75rem', borderRadius: 8,
                                                    background: r.present ? '#F0FDF4' : '#FEF2F2',
                                                    border: `1px solid ${r.present ? '#BBF7D0' : '#FECACA'}`,
                                                }}>
                                                    <span style={{ fontSize: '0.82rem', color: '#111827', fontWeight: 500 }}>
                                                        {r.student?.user?.name || 'Aluno'}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '0.72rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                                                        background: r.present ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                                        color: r.present ? '#10B981' : '#EF4444',
                                                    }}>
                                                        {r.present ? 'PRESENTE' : 'FALTA'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
