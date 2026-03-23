'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { classesApi } from '@/lib/api/classes';
import api from '@/lib/api/client';
import {
    ArrowLeftIcon,
    PencilIcon,
    ChartBarIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline';

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    PLANNED:           { label: 'Planejada',          color: '#9CA3AF', bg: '#F9FAFB',                  border: '#E5E7EB' },
    ENROLLMENT_OPEN:   { label: 'Matrículas Abertas', color: '#059669', bg: 'rgba(5,150,105,0.08)',     border: 'rgba(5,150,105,0.3)' },
    ENROLLMENT_CLOSED: { label: 'Matrículas Fechadas',color: '#D97706', bg: 'rgba(217,119,6,0.08)',     border: 'rgba(217,119,6,0.3)' },
    IN_PROGRESS:       { label: 'Em Andamento',       color: '#2563EB', bg: 'rgba(37,99,235,0.08)',     border: 'rgba(37,99,235,0.3)' },
    COMPLETED:         { label: 'Concluída',           color: '#7C3AED', bg: 'rgba(124,58,237,0.08)',    border: 'rgba(124,58,237,0.3)' },
    CANCELLED:         { label: 'Cancelada',           color: '#DC2626', bg: 'rgba(220,38,38,0.08)',     border: 'rgba(220,38,38,0.3)' },
};

const ALL_STATUSES = ['PLANNED','ENROLLMENT_OPEN','ENROLLMENT_CLOSED','IN_PROGRESS','COMPLETED','CANCELLED'];

const PERIOD_LABEL: Record<string, string> = {
    MORNING: '🌅 Manhã', AFTERNOON: '☀ Tarde', EVENING: '🌙 Noite',
};

export default function TurmaDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [turma, setTurma] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'alunos' | 'frequencia' | 'info'>('alunos');
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [savingStatus, setSavingStatus] = useState(false);
    const [statusError, setStatusError] = useState('');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => { load(); }, [id]);

    async function load() {
        setLoading(true);
        try {
            const [cls, st] = await Promise.all([
                classesApi.getOne(id),
                classesApi.getStatistics(id).catch(() => null),
            ]);
            setTurma(cls);
            setStats(st);
        } catch {
            router.replace('/admin/turmas');
        } finally {
            setLoading(false);
        }
    }

    async function handleStatusSave() {
        if (!selectedStatus) return;
        setSavingStatus(true);
        setStatusError('');
        try {
            await classesApi.updateStatus(id, selectedStatus);
            setShowStatusModal(false);
            showToast('Status atualizado com sucesso!', 'success');
            load();
        } catch (e: any) {
            setStatusError(e?.response?.data?.message || 'Erro ao atualizar status');
        } finally {
            setSavingStatus(false);
        }
    }

    function showToast(msg: string, type: 'success' | 'error') {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    }

    if (loading) return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
            <div style={{ textAlign:'center' }}>
                <div className="spinner" style={{ margin:'0 auto 1rem' }} />
                <p style={{ fontFamily:'Orbitron', fontSize:'0.7rem', letterSpacing:'0.15em', color:'var(--text-muted)' }}>CARREGANDO TURMA...</p>
            </div>
        </div>
    );

    if (!turma) return null;

    const cfg = STATUS_CFG[turma.status] || STATUS_CFG.PLANNED;
    // enrollments reais vêm de turma.enrollments (classesApi.getOne inclui a relação)
    // stats.enrollments é { total, approved, pending } — objeto de métricas, não array
    const enrollments: any[] = Array.isArray(turma?.enrollments) ? turma.enrollments : [];
    const attendanceHistory: any[] = stats?.attendanceHistory || [];
    const totalPresent = stats?.attendance?.present ?? 0;
    const totalAbsent = (stats?.attendance?.total ?? 0) - totalPresent;
    const avgRate = stats?.attendance?.rate ?? 0;

    const startDate = new Date(turma.startDate);
    const endDate = new Date(turma.endDate);
    const today = new Date();
    const daysTotal = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
    const daysLeft = Math.max(0, Math.round((endDate.getTime() - today.getTime()) / 86400000));
    const progress = Math.min(100, Math.max(0, Math.round(((today.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())) * 100)));

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }} className="animate-fade-in">
            {/* Toast */}
            {toast && (
                <div style={{
                    position:'fixed', top:20, right:20, zIndex:9999,
                    background: toast.type === 'success' ? '#059669' : '#DC2626',
                    color:'#fff', padding:'0.75rem 1.25rem', borderRadius:10,
                    fontWeight:600, fontSize:'0.85rem', boxShadow:'0 4px 20px rgba(0,0,0,0.3)',
                    animation:'fadeIn 0.2s',
                }}>
                    {toast.type === 'success' ? '✓ ' : '✕ '}{toast.msg}
                </div>
            )}

            {/* Header */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                    <Link href="/admin/turmas" style={{
                        display:'flex', alignItems:'center', justifyContent:'center',
                        width:36, height:36, borderRadius:9,
                        background:'rgba(255,214,0,0.08)', border:'1px solid rgba(255,214,0,0.3)',
                        color:'#B89B00', textDecoration:'none', transition:'all 0.2s',
                    }}>
                        <ArrowLeftIcon style={{ width:16, height:16 }} />
                    </Link>
                    <div>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap' }}>
                            <h1 className="gradient-text" style={{ fontFamily:'Orbitron', fontSize:'1.75rem', fontWeight:900, letterSpacing:'0.08em' }}>
                                {turma.classIdentifier}
                            </h1>
                            <span style={{
                                padding:'0.3rem 0.85rem', borderRadius:100,
                                fontSize:'0.7rem', fontWeight:700,
                                background: cfg.bg, color: cfg.color, border:`1px solid ${cfg.border}`,
                            }}>
                                {cfg.label}
                            </span>
                        </div>
                        <p style={{ color:'var(--text-muted)', fontSize:'0.82rem', marginTop:'0.2rem' }}>
                            {turma.course?.name || '—'} · {turma.city?.name || '—'} ({turma.city?.state || '—'})
                        </p>
                    </div>
                </div>
                <div style={{ display:'flex', gap:'0.5rem' }}>
                    <button
                        onClick={() => { setSelectedStatus(turma.status); setShowStatusModal(true); }}
                        style={{
                            display:'flex', alignItems:'center', gap:6,
                            padding:'0.55rem 1.1rem', borderRadius:10,
                            background:'rgba(255,214,0,0.08)', border:'1px solid rgba(255,214,0,0.3)',
                            color:'#B89B00', fontWeight:700, fontSize:'0.8rem', cursor:'pointer',
                        }}
                    >
                        <PencilIcon style={{ width:14, height:14 }} />
                        Alterar Status
                    </button>
                    <Link href={`/admin/turmas/${id}/estatisticas`} style={{
                        display:'flex', alignItems:'center', gap:6,
                        padding:'0.55rem 1.1rem', borderRadius:10,
                        background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.3)',
                        color:'#7C3AED', fontWeight:700, fontSize:'0.8rem', textDecoration:'none',
                    }}>
                        <ChartBarIcon style={{ width:14, height:14 }} />
                        Estatísticas
                    </Link>
                </div>
            </div>

            {/* KPIs */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'1rem' }}>
                {[
                    { label:'Vagas',         value: turma.vacancies,    color:'#B89B00', icon:'🪑' },
                    { label:'Inscritos',     value: enrollments.length, color:'#2563EB', icon:'👥' },
                    { label:'Freq. Média',   value: `${Math.round(avgRate)}%`, color: avgRate >= 75 ? '#059669' : '#DC2626', icon:'📊' },
                    { label:'Dias Restantes',value: daysLeft,           color:'#7C3AED', icon:'📅' },
                ].map((kpi, i) => (
                    <div key={i} className="glass-card animate-scale-in" style={{ animationDelay:`${i*60}ms`, padding:'1rem' }}>
                        <div style={{ fontSize:'1.5rem', marginBottom:'0.4rem' }}>{kpi.icon}</div>
                        <div style={{ fontFamily:'Orbitron', fontWeight:900, fontSize:'1.6rem', color: kpi.color }}>{kpi.value}</div>
                        <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:700 }}>{kpi.label}</div>
                    </div>
                ))}
            </div>

            {/* Progress bar período */}
            {turma.status === 'IN_PROGRESS' && (
                <div className="glass-card" style={{ padding:'1rem 1.25rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.5rem', fontSize:'0.75rem', color:'var(--text-muted)', fontWeight:600 }}>
                        <span>Início: {startDate.toLocaleDateString('pt-BR')}</span>
                        <span style={{ color:'#B89B00', fontFamily:'Orbitron', fontWeight:800 }}>{progress}% concluído</span>
                        <span>Término: {endDate.toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="progress-bar" style={{ height:8 }}>
                        <div className="progress-fill" style={{ width:`${progress}%`, background:'linear-gradient(90deg,#FFD600,#B89B00)' }} />
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div style={{ display:'flex', gap:'0.4rem', padding:'0.3rem', background:'#F3F4F6', borderRadius:12, width:'fit-content' }}>
                {[
                    { key:'alunos', label:'👥 Alunos', count: enrollments.length },
                    { key:'frequencia', label:'📊 Frequência', count: attendanceHistory.length },
                    { key:'info', label:'ℹ️ Informações' },
                ].map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key as any)}
                        style={{
                            padding:'0.5rem 1rem', borderRadius:9, fontSize:'0.8rem', fontWeight:700,
                            cursor:'pointer', transition:'all 0.2s', border:'none',
                            background: activeTab === t.key ? '#FFD600' : 'transparent',
                            color: activeTab === t.key ? '#000' : '#6B7280',
                            boxShadow: activeTab === t.key ? '0 2px 8px rgba(255,214,0,0.3)' : 'none',
                        }}
                    >
                        {t.label}{'count' in t ? ` (${t.count})` : ''}
                    </button>
                ))}
            </div>

            {/* Tab: Alunos */}
            {activeTab === 'alunos' && (
                enrollments.length === 0 ? (
                    <div className="glass-card" style={{ textAlign:'center', padding:'4rem' }}>
                        <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>👥</div>
                        <p style={{ fontFamily:'Orbitron', fontSize:'0.75rem', letterSpacing:'0.15em', color:'var(--text-muted)' }}>NENHUM ALUNO MATRICULADO</p>
                        <p style={{ fontSize:'0.82rem', color:'var(--text-muted)', marginTop:'0.5rem' }}>
                            Abra as inscrições para a turma começar a receber alunos
                        </p>
                    </div>
                ) : (
                    <div className="glass-card" style={{ padding:0, overflow:'hidden' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Aluno</th>
                                    <th>CPF</th>
                                    <th>Status</th>
                                    <th>Frequência</th>
                                    <th>Protocolo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {enrollments.map((enr: any) => {
                                    const rate = enr.attendanceRate ?? null;
                                    const statusColors: Record<string, string> = {
                                        ENROLLED:'#059669', PENDING:'#D97706', CANCELLED:'#DC2626',
                                        WAITLISTED:'#6B7280', COMPLETED:'#7C3AED',
                                    };
                                    const statusLabels: Record<string, string> = {
                                        ENROLLED:'Matriculado', PENDING:'Pendente', CANCELLED:'Cancelado',
                                        WAITLISTED:'Lista de Espera', COMPLETED:'Concluído',
                                    };
                                    return (
                                        <tr key={enr.id}>
                                            <td style={{ fontWeight:600, color:'#111827' }}>{enr.student?.user?.name || enr.studentName || '—'}</td>
                                            <td style={{ fontFamily:'JetBrains Mono', fontSize:'0.75rem', color:'#9CA3AF' }}>{enr.student?.cpf || '—'}</td>
                                            <td>
                                                <span style={{
                                                    padding:'0.2rem 0.6rem', borderRadius:100, fontSize:'0.65rem', fontWeight:700,
                                                    background: (statusColors[enr.status] || '#9CA3AF') + '18',
                                                    color: statusColors[enr.status] || '#9CA3AF',
                                                    border:`1px solid ${(statusColors[enr.status] || '#9CA3AF')}30`,
                                                }}>
                                                    {statusLabels[enr.status] || enr.status}
                                                </span>
                                            </td>
                                            <td>
                                                {rate !== null ? (
                                                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                                                        <div className="progress-bar" style={{ width:60, height:5 }}>
                                                            <div className="progress-fill" style={{ width:`${rate}%`, background: rate >= 75 ? '#059669' : '#DC2626' }} />
                                                        </div>
                                                        <span style={{ fontFamily:'Orbitron', fontWeight:700, fontSize:'0.75rem', color: rate >= 75 ? '#059669' : '#DC2626' }}>
                                                            {Math.round(rate)}%
                                                        </span>
                                                    </div>
                                                ) : <span style={{ color:'#9CA3AF', fontSize:'0.75rem' }}>—</span>}
                                            </td>
                                            <td style={{ fontFamily:'JetBrains Mono', fontSize:'0.72rem', color:'#9CA3AF' }}>{enr.protocol || '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {/* Tab: Frequência */}
            {activeTab === 'frequencia' && (
                attendanceHistory.length === 0 ? (
                    <div className="glass-card" style={{ textAlign:'center', padding:'4rem' }}>
                        <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>📊</div>
                        <p style={{ fontFamily:'Orbitron', fontSize:'0.75rem', letterSpacing:'0.15em', color:'var(--text-muted)' }}>NENHUMA FREQUÊNCIA REGISTRADA</p>
                        <p style={{ fontSize:'0.82rem', color:'var(--text-muted)', marginTop:'0.5rem' }}>O professor deve lançar frequência pelo portal do professor</p>
                    </div>
                ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                        {attendanceHistory.map((day: any, i: number) => (
                            <div key={i} className="glass-card animate-scale-in" style={{ animationDelay:`${i*40}ms`, padding:'0.85rem 1.25rem', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'0.5rem' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                                    <div style={{ fontFamily:'JetBrains Mono', fontWeight:700, fontSize:'0.85rem', color:'#B89B00' }}>
                                        {new Date(day.date).toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'2-digit' })}
                                    </div>
                                    <div style={{ display:'flex', gap:'0.75rem', fontSize:'0.8rem' }}>
                                        <span style={{ color:'#059669', display:'flex', alignItems:'center', gap:4 }}>
                                            <CheckCircleIcon style={{ width:14 }} />{day.presentCount} presentes
                                        </span>
                                        <span style={{ color:'#DC2626', display:'flex', alignItems:'center', gap:4 }}>
                                            <XCircleIcon style={{ width:14 }} />{day.absentCount} faltas
                                        </span>
                                    </div>
                                </div>
                                <div style={{ fontFamily:'Orbitron', fontWeight:900, fontSize:'0.9rem', color: day.rate >= 75 ? '#059669' : '#DC2626' }}>
                                    {Math.round(day.rate || 0)}%
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Tab: Info */}
            {activeTab === 'info' && (
                <div className="glass-card" style={{ padding:'1.5rem' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'1.5rem' }}>
                        {[
                            { label:'Código da Turma', value: turma.classIdentifier, mono: true },
                            { label:'Curso', value: turma.course?.name || '—' },
                            { label:'Grupo', value: turma.group?.name || '—' },
                            { label:'Cidade', value: `${turma.city?.name || '—'} – ${turma.city?.state || '—'}` },
                            { label:'Período', value: PERIOD_LABEL[turma.period] || turma.period },
                            { label:'Horário', value: `${turma.startTime} – ${turma.endTime}`, mono: true },
                            { label:'Início', value: startDate.toLocaleDateString('pt-BR') },
                            { label:'Término', value: endDate.toLocaleDateString('pt-BR') },
                            { label:'Vagas', value: `${turma.vacancies} vagas` },
                            { label:'Reservas', value: turma.reserveSlots ? `${turma.reserveSlots} reservas` : '—' },
                            { label:'Carreta', value: turma.truck?.identifier || '—' },
                            { label:'Status', value: STATUS_CFG[turma.status]?.label || turma.status },
                        ].map((item, i) => (
                            <div key={i}>
                                <div style={{ fontSize:'0.65rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'0.3rem' }}>
                                    {item.label}
                                </div>
                                <div style={{ fontSize:'0.88rem', fontWeight:600, color:'#111827', fontFamily: item.mono ? 'JetBrains Mono' : 'inherit' }}>
                                    {item.value}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal: Alterar Status */}
            {showStatusModal && (
                <div className="modal-overlay" onClick={() => { setShowStatusModal(false); setStatusError(''); }}>
                    <div className="modal-content" style={{ maxWidth:440 }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setShowStatusModal(false); setStatusError(''); }}
                            style={{ position:'absolute', top:'1rem', right:'1rem', background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer', color:'#9CA3AF' }}>✕</button>

                        <h3 style={{ fontFamily:'Orbitron', fontWeight:900, fontSize:'1rem', marginBottom:'1rem', color:'#111827' }}>
                            Alterar Status da Turma
                        </h3>
                        <p style={{ fontSize:'0.82rem', color:'#6B7280', marginBottom:'1.25rem' }}>
                            Turma: <strong>{turma.classIdentifier}</strong>
                        </p>

                        <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', marginBottom:'1.25rem' }}>
                            {ALL_STATUSES.map(s => {
                                const c = STATUS_CFG[s];
                                const isSelected = selectedStatus === s;
                                return (
                                    <button key={s} onClick={() => setSelectedStatus(s)}
                                        style={{
                                            padding:'0.65rem 1rem', borderRadius:10, cursor:'pointer',
                                            display:'flex', alignItems:'center', gap:'0.75rem',
                                            border: `1.5px solid ${isSelected ? c.color : '#E5E7EB'}`,
                                            background: isSelected ? c.bg : 'transparent',
                                            transition:'all 0.15s',
                                            textAlign:'left',
                                        }}
                                    >
                                        <span style={{
                                            width:10, height:10, borderRadius:'50%', background: c.color,
                                            boxShadow: isSelected ? `0 0 8px ${c.color}` : 'none',
                                            flexShrink:0,
                                        }} />
                                        <span style={{ fontSize:'0.82rem', fontWeight:700, color: isSelected ? c.color : '#374151' }}>
                                            {c.label}
                                        </span>
                                        {turma.status === s && (
                                            <span style={{ marginLeft:'auto', fontSize:'0.65rem', color:'#9CA3AF' }}>Atual</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {statusError && (
                            <div style={{ padding:'0.65rem 1rem', borderRadius:9, background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', fontSize:'0.8rem', fontWeight:600, marginBottom:'1rem' }}>
                                ⚠️ {statusError}
                            </div>
                        )}

                        <div style={{ display:'flex', gap:'0.75rem' }}>
                            <button onClick={() => { setShowStatusModal(false); setStatusError(''); }}
                                style={{ flex:1, padding:'0.7rem', borderRadius:10, border:'1.5px solid #E5E7EB', background:'transparent', color:'#6B7280', fontWeight:700, fontSize:'0.85rem', cursor:'pointer' }}>
                                Cancelar
                            </button>
                            <button onClick={handleStatusSave} disabled={savingStatus || selectedStatus === turma.status}
                                className="btn-primary" style={{ flex:2, justifyContent:'center', opacity: (savingStatus || selectedStatus === turma.status) ? 0.6 : 1 }}>
                                {savingStatus ? <><div className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> Salvando...</> : '✓ Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
