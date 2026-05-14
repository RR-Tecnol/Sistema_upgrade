'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/useAuthStore';
import {
    CalendarDaysIcon, CheckCircleIcon, XCircleIcon, ClockIcon,
    UserGroupIcon, AcademicCapIcon, ClipboardDocumentCheckIcon,
    ChevronDownIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';

/* ─────────────────────────────────────────────
   Tipos
───────────────────────────────────────────── */
interface AttRecord {
    id: string;
    date: string;
    present: boolean;
    class: { id: string; classIdentifier: string; course: { name: string }; city: { name: string; state: string }; };
    student: { user: { name: string } };
}

interface ClassSummary {
    id: string;
    classIdentifier: string;
    status: string;
    course: { name: string };
    city: { name: string; state: string };
    startDate: string;
    endDate: string;
    _count?: { students?: number };
}

interface DayGroup {
    date: string;
    label: string;
    records: AttRecord[];
    presentCount: number;
    absentCount: number;
    className: string;
    cityName: string;
}

type Tab = 'frequencia' | 'turmas' | 'ponto';

const TAB_LABELS: Record<Tab, string> = {
    frequencia: '📋 Frequência de Alunos',
    turmas: '🎓 Minhas Turmas',
    ponto: '⏱ Meu Ponto',
};

interface Checkin {
    id: string;
    checkedAt: string;
    date: string;
    note?: string;
}

/* ─────────────────────────────────────────────
   Agrupamento por dia
───────────────────────────────────────────── */
function groupByDay(records: AttRecord[]): DayGroup[] {
    const map = new Map<string, AttRecord[]>();
    records.forEach(r => {
        const day = r.date.split('T')[0];
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(r);
    });
    return Array.from(map.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, recs]) => {
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

/* ─────────────────────────────────────────────
   Componente principal
───────────────────────────────────────────── */
export default function TeacherHistorico() {
    const [tab, setTab] = useState<Tab>('frequencia');
    const [attGroups, setAttGroups] = useState<DayGroup[]>([]);
    const [classes, setClasses] = useState<ClassSummary[]>([]);
    const [checkins, setCheckins] = useState<Checkin[]>([]);
    const [checkingIn, setCheckingIn] = useState(false);
    const [expandedDay, setExpandedDay] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [totalPresent, setTotalPresent] = useState(0);
    const [totalAbsent, setTotalAbsent] = useState(0);
    const { user } = useAuthStore();

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [attRes, classRes, checkRes] = await Promise.allSettled([
                api.get('/classes/teacher/history'),
                // Busca turmas do professor sem filtro de status — backend aceita string, não array
                api.get('/classes', { params: { teacherUserId: user?.id } }),
                api.get('/teachers/me/checkins'),
            ]);
            if (attRes.status === 'fulfilled') {
                const records: AttRecord[] = Array.isArray(attRes.value.data) ? attRes.value.data : [];
                setAttGroups(groupByDay(records));
                setTotalPresent(records.filter(r => r.present).length);
                setTotalAbsent(records.filter(r => !r.present).length);
            }
            if (classRes.status === 'fulfilled') {
                const data = classRes.value.data;
                setClasses(Array.isArray(data) ? data : []);
            }
            if (checkRes.status === 'fulfilled') {
                setCheckins(Array.isArray(checkRes.value.data) ? checkRes.value.data : []);
            }
        } catch {/* noop */} finally {
            setLoading(false);
        }
    }, [user]);

    const todayStr = new Date().toISOString().split('T')[0];
    const hasCheckedInToday = checkins.some(c => c.date === todayStr);
    const todayCheckin = checkins.find(c => c.date === todayStr);

    const handleCheckin = async () => {
        if (hasCheckedInToday || checkingIn) {
            if (hasCheckedInToday) {
                toast.error('Você já registrou o ponto hoje.');
            }
            return;
        }
        setCheckingIn(true);
        try {
            const post = await api.post('/teachers/me/checkin');
            const already = post.data?.alreadyRegistered === true;
            toast.success(
                already
                    ? 'Ponto de hoje já estava registrado.'
                    : `Ponto registrado! ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
            );
            const res = await api.get('/teachers/me/checkins');
            setCheckins(Array.isArray(res.data) ? res.data : []);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Erro ao registrar ponto.');
        } finally {
            setCheckingIn(false);
        }
    };

    useEffect(() => { loadAll(); }, [loadAll]);

    const totalAtt = totalPresent + totalAbsent;
    const taxaPresenca = totalAtt > 0 ? Math.round((totalPresent / totalAtt) * 100) : 0;

    const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
        IN_PROGRESS: { label: 'Em Andamento', color: '#059669', bg: '#DCFCE7' },
        COMPLETED: { label: 'Concluída', color: '#7C3AED', bg: '#EDE9FE' },
        PLANNED: { label: 'Planejada', color: '#B89B00', bg: '#FFFDE7' },
        ENROLLMENT_OPEN: { label: 'Matrículas Abertas', color: '#0891B2', bg: '#E0F2FE' },
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
            <AdminHeaderHero
                title="HISTÓRICO"
                subtitle="Registro completo de frequências, turmas e ponto do professor"
                badge="PROFESSOR"
            />

            {/* ── KPIs ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.85rem' }}>
                {[
                    { icon: <CalendarDaysIcon style={{ width: 16, height: 16 }} />, label: 'Dias de Aula', value: attGroups.length, color: '#B89B00', bg: '#FFFDE7', border: '#FEF08A', displayValue: String(attGroups.length) },
                    { icon: <CheckCircleIcon style={{ width: 16, height: 16 }} />, label: 'Presenças', value: totalPresent, color: '#059669', bg: '#F0FDF4', border: '#BBF7D0', displayValue: String(totalPresent) },
                    { icon: <XCircleIcon style={{ width: 16, height: 16 }} />, label: 'Faltas Reg.', value: totalAbsent, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', displayValue: String(totalAbsent) },
                    { icon: <ClockIcon style={{ width: 16, height: 16 }} />, label: 'Taxa Presença', value: 0, color: taxaPresenca >= 75 ? '#059669' : '#F59E0B', bg: taxaPresenca >= 75 ? '#F0FDF4' : '#FFFBEB', border: taxaPresenca >= 75 ? '#BBF7D0' : '#FDE68A', displayValue: `${taxaPresenca}%` },
                    { icon: <UserGroupIcon style={{ width: 16, height: 16 }} />, label: 'Turmas', value: classes.length, color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', displayValue: String(classes.length) },
                ].map((kpi, i) => (
                    <AnimatedKpiCard
                        key={i}
                        label={kpi.label}
                        value={kpi.value}
                        displayValue={kpi.displayValue}
                        color={kpi.color}
                        bg={kpi.bg}
                        border={kpi.border}
                        delayMs={i * 60}
                        icon={kpi.icon}
                        compact
                    />
                ))}
            </div>

            {/* ── Tabs ── */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #F3F4F6', paddingBottom: 0 }}>
                {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{
                        padding: '0.6rem 1.1rem', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
                        fontWeight: 700, fontSize: '0.78rem', transition: 'all 0.15s',
                        background: tab === t ? '#FFD600' : 'transparent',
                        color: tab === t ? '#000' : '#9CA3AF',
                        borderBottom: tab === t ? '2px solid #FFD600' : '2px solid transparent',
                        marginBottom: -2,
                    }}>
                        {TAB_LABELS[t]}
                    </button>
                ))}
            </div>

            {/* ── Conteúdo das Tabs ── */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '0.15em', color: '#9CA3AF' }}>CARREGANDO HISTÓRICO...</p>
                </div>
            ) : (
                <>
                {/* ── aba: Frequência de Alunos ── */}
                {tab === 'frequencia' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {attGroups.length === 0 ? (
                            <div style={{ background: '#fff', borderRadius: 12, padding: '3rem', textAlign: 'center', border: '1px solid #E5E7EB' }}>
                                <CalendarDaysIcon style={{ width: 40, height: 40, color: '#D1D5DB', margin: '0 auto 1rem' }} />
                                <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Nenhuma frequência registrada ainda.</p>
                            </div>
                        ) : attGroups.map(group => {
                            const isExpanded = expandedDay === group.date;
                            const presRate = group.records.length > 0 ? Math.round((group.presentCount / group.records.length) * 100) : 0;
                            return (
                                <div key={group.date} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                                    <button onClick={() => setExpandedDay(isExpanded ? null : group.date)} style={{
                                        width: '100%', padding: '1rem 1.25rem',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '1rem',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                                                background: presRate >= 75 ? '#DCFCE7' : '#FEF2F2',
                                                border: `1.5px solid ${presRate >= 75 ? '#BBF7D0' : '#FECACA'}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.82rem', color: presRate >= 75 ? '#059669' : '#DC2626' }}>{presRate}%</span>
                                            </div>
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.88rem', marginBottom: 2, textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.label}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.className} · {group.cityName}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                                                    <CheckCircleIcon style={{ width: 14, height: 14 }} /> {group.presentCount}
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#DC2626', fontWeight: 600 }}>
                                                    <XCircleIcon style={{ width: 14, height: 14 }} /> {group.absentCount}
                                                </span>
                                            </div>
                                            {isExpanded ? <ChevronDownIcon style={{ width: 16, height: 16, color: '#9CA3AF' }} /> : <ChevronRightIcon style={{ width: 16, height: 16, color: '#9CA3AF' }} />}
                                        </div>
                                    </button>
                                    {isExpanded && (
                                        <div style={{ borderTop: '1px solid #F3F4F6', padding: '0.75rem 1.25rem 1rem' }}>
                                            <div style={{ display: 'grid', gap: '0.4rem', maxHeight: 300, overflowY: 'auto' }}>
                                                {group.records.map(r => (
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
                                                            fontSize: '0.7rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                                                            background: r.present ? 'rgba(5,150,105,0.15)' : 'rgba(220,38,38,0.15)',
                                                            color: r.present ? '#059669' : '#DC2626',
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

                {/* ── aba: Minhas Turmas ── */}
                {tab === 'turmas' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {classes.length === 0 ? (
                            <div style={{ background: '#fff', borderRadius: 12, padding: '3rem', textAlign: 'center', border: '1px solid #E5E7EB' }}>
                                <AcademicCapIcon style={{ width: 40, height: 40, color: '#D1D5DB', margin: '0 auto 1rem' }} />
                                <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Nenhuma turma encontrada.</p>
                            </div>
                        ) : classes.map((cls, i) => {
                            const s = STATUS_MAP[cls.status] || { label: cls.status, color: '#9CA3AF', bg: '#F3F4F6' };
                            return (
                                <div key={cls.id} className="animate-fade-in" style={{
                                    animationDelay: `${i * 40}ms`,
                                    background: '#fff', borderRadius: 12, padding: '1rem 1.25rem',
                                    border: '1px solid #E5E7EB', borderLeft: `3px solid ${s.color}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem',
                                    transition: 'box-shadow 0.2s',
                                }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${s.color}22`}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}
                                >
                                    <div style={{ flex: 1, minWidth: 200 }}>
                                        <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                                            {cls.course?.name || 'Curso'}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                                            {cls.classIdentifier} · {cls.city?.name} / {cls.city?.state}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '0.2rem' }}>
                                            {new Date(cls.startDate).toLocaleDateString('pt-BR')} → {new Date(cls.endDate).toLocaleDateString('pt-BR')}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        {cls._count?.students !== undefined && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#6B7280' }}>
                                                <UserGroupIcon style={{ width: 14, height: 14 }} />
                                                {cls._count.students} alunos
                                            </div>
                                        )}
                                        <span style={{ padding: '0.2rem 0.65rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
                                            {s.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── aba: Meu Ponto ── */}
                {tab === 'ponto' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Card bater ponto hoje */}
                        <div style={{ background: 'linear-gradient(135deg, #FFFDE7, #FFF9C4)', border: '1.5px solid #FEF08A', borderRadius: 16, padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B89B00', marginBottom: '0.4rem' }}>
                                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                </div>
                                <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '2.2rem', color: '#000', lineHeight: 1 }}>
                                    {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '0.4rem' }}>Horário atual do sistema</div>
                                {todayCheckin && (
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                                        ✓ Ponto registrado hoje às {new Date(todayCheckin.checkedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleCheckin}
                                disabled={checkingIn || hasCheckedInToday}
                                style={{ padding: '0.85rem 1.75rem', borderRadius: 12, background: checkingIn || hasCheckedInToday ? '#E5E7EB' : '#FFD600', border: 'none', cursor: checkingIn || hasCheckedInToday ? 'not-allowed' : 'pointer', fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.78rem', letterSpacing: '0.1em', color: checkingIn || hasCheckedInToday ? '#9CA3AF' : '#000', boxShadow: checkingIn || hasCheckedInToday ? 'none' : '0 4px 14px rgba(255,214,0,0.4)', transition: 'all 0.2s' }}
                                onMouseEnter={e => { if (!checkingIn && !hasCheckedInToday) (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; }}
                            >
                                {checkingIn ? '⏳ Registrando...' : hasCheckedInToday ? '✓ PONTO DE HOJE' : '⏱ REGISTRAR PONTO'}
                            </button>
                        </div>

                        {/* Histórico de check-ins */}
                        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ fontFamily: 'Orbitron', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em', color: '#B89B00' }}>HISTÓRICO DE PONTOS</div>
                                <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{checkins.length} registro{checkins.length !== 1 ? 's' : ''}</span>
                            </div>
                            {checkins.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF', fontSize: '0.85rem' }}>
                                    <ClockIcon style={{ width: 32, height: 32, color: '#E5E7EB', margin: '0 auto 0.75rem' }} />
                                    <p>Nenhum ponto registrado ainda.</p>
                                    <p style={{ fontSize: '0.72rem', marginTop: '0.25rem' }}>Clique em &ldquo;Registrar Ponto&rdquo; para começar.</p>
                                </div>
                            ) : (
                                <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                                    {checkins.map((c, i) => {
                                        const dt = new Date(c.checkedAt);
                                        const isToday = c.date === new Date().toISOString().split('T')[0];
                                        return (
                                            <div key={c.id} className="animate-fade-in" style={{ animationDelay: `${i * 25}ms`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.25rem', borderBottom: i < checkins.length - 1 ? '1px solid #F9FAFB' : 'none', background: isToday ? '#FFFDE7' : 'transparent' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{ width: 36, height: 36, borderRadius: 9, background: isToday ? '#FFD600' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', flexShrink: 0 }}>
                                                        {isToday ? '⏱' : '📅'}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.85rem' }}>
                                                            {dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                                                        </div>
                                                        {isToday && <div style={{ fontSize: '0.65rem', color: '#B89B00', fontWeight: 700 }}>HOJE</div>}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontFamily: 'Orbitron', fontWeight: 800, fontSize: '1rem', color: isToday ? '#B89B00' : '#374151' }}>
                                                        {dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    <div style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>check-in</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                </>
            )}
        </div>
    );
}
