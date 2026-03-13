'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api/client';
import {
    MagnifyingGlassIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    XCircleIcon,
    EyeIcon,
    ClockIcon,
    UserGroupIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface Enrollment {
    id: string;
    protocol: string;
    status: string;
    createdAt: string;
    student: { user?: { name?: string }; fullName?: string; cpf?: string; };
    class: { classIdentifier?: string; name?: string; course?: { name: string } };
    documents?: Array<{ id: string; type: string; name: string; url: string; uploadedAt: string }>;
}

const STATUS_COLUMNS = [
    { key: 'PENDING', label: 'Pendentes', color: '#F59E0B', bg: '#FFFBEB', border: '#FEF08A', icon: '⏳' },
    { key: 'DOCUMENT_PENDING', label: 'Docs. Pendentes', color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA', icon: '📄' },
    { key: 'APPROVED', label: 'Aprovados', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0', icon: '✅' },
    { key: 'ENROLLED', label: 'Matriculados', color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD', icon: '🎓' },
    { key: 'REJECTED', label: 'Rejeitados', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: '❌' },
];

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pendente', DOCUMENT_PENDING: 'Docs Pendentes',
    APPROVED: 'Aprovado', ENROLLED: 'Matriculado', REJECTED: 'Rejeitado', WAITLIST: 'Lista Espera',
};

export default function InscricoesPage() {
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Enrollment | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectModal, setRejectModal] = useState<string | null>(null);
    const [view, setView] = useState<'kanban' | 'list'>('kanban');
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => { fetchEnrollments(); }, []);

    const fetchEnrollments = async () => {
        setLoading(true);
        try {
            const res = await api.get('/enrollments?limit=100');
            setEnrollments(Array.isArray(res.data) ? res.data : res.data?.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, status: string, reason?: string) => {
        setProcessing(id);
        try {
            await api.patch(`/enrollments/${id}/status`, { status, rejectionReason: reason });
            await fetchEnrollments();
            setSelected(null);
            setRejectModal(null);
        } catch (e) {
            alert('Erro ao atualizar inscrição');
        } finally {
            setProcessing(null);
        }
    };

    const getName = (e: Enrollment) => e.student?.user?.name || e.student?.fullName || 'Aluno';
    const getCourse = (e: Enrollment) => e.class?.course?.name || e.class?.classIdentifier || '—';

    const filtered = enrollments.filter(e => {
        if (!search) return true;
        const s = search.toLowerCase();
        return getName(e).toLowerCase().includes(s) || e.protocol?.toLowerCase().includes(s) || getCourse(e).toLowerCase().includes(s);
    });

    const totalPending = enrollments.filter(e => e.status === 'PENDING').length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontFamily: 'Orbitron', fontSize: '2rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                        INSCRIÇÕES
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Gerencie e aprove as inscrições dos candidatos
                        {totalPending > 0 && <span style={{ marginLeft: '0.5rem', padding: '0.15rem 0.6rem', borderRadius: 100, background: '#FEF9C3', color: '#92730A', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #FDE047' }}>
                            {totalPending} pendente{totalPending > 1 ? 's' : ''}
                        </span>}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {/* View toggle */}
                    {(['kanban', 'list'] as const).map(v => (
                        <button key={v} onClick={() => setView(v)}
                            style={{
                                padding: '0.5rem 1rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                                background: view === v ? '#FFD600' : 'transparent',
                                color: view === v ? '#000' : 'var(--text-secondary)',
                                border: view === v ? '1px solid #FFD600' : '1px solid var(--border-default)',
                                boxShadow: view === v ? '0 2px 8px rgba(255,214,0,0.3)' : 'none',
                            }}
                        >
                            {v === 'kanban' ? '⬜ Kanban' : '☰ Lista'}
                        </button>
                    ))}
                    <button onClick={fetchEnrollments} className="btn-ghost" style={{ padding: '0.5rem 0.75rem' }}>
                        <ArrowPathIcon style={{ width: 15, height: 15 }} />
                    </button>
                </div>
            </div>

            {/* Stats bar */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {STATUS_COLUMNS.map(col => {
                    const count = enrollments.filter(e => e.status === col.key).length;
                    return (
                        <div key={col.key} style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.5rem 1rem', borderRadius: 10, fontSize: '0.82rem',
                            background: col.bg, border: `1px solid ${col.border}`, color: col.color, fontWeight: 700,
                        }}>
                            <span>{col.icon}</span>
                            <span>{col.label}</span>
                            <span style={{ fontFamily: 'Orbitron', fontSize: '1rem', fontWeight: 900 }}>{count}</span>
                        </div>
                    );
                })}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: 10, fontSize: '0.82rem', background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 700 }}>
                    <span>📋</span> Total <span style={{ fontFamily: 'Orbitron', fontSize: '1rem', fontWeight: 900 }}>{enrollments.length}</span>
                </div>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', maxWidth: 400 }}>
                <MagnifyingGlassIcon style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#9CA3AF' }} />
                <input type="text" placeholder="Buscar por nome, protocolo ou curso..." value={search}
                    onChange={e => setSearch(e.target.value)} className="form-input"
                    style={{ paddingLeft: '2.25rem', paddingTop: '0.55rem', paddingBottom: '0.55rem', fontSize: '0.82rem' }}
                />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ color: 'var(--text-muted)', fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em' }}>CARREGANDO INSCRIÇÕES...</p>
                </div>
            ) : view === 'kanban' ? (
                /* ── KANBAN VIEW ── */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', alignItems: 'start' }}>
                    {STATUS_COLUMNS.map(col => {
                        const cards = filtered.filter(e => e.status === col.key);
                        return (
                            <div key={col.key} style={{ borderRadius: 14, border: `1px solid ${col.border}`, background: col.bg, overflow: 'hidden' }}>
                                {/* Column header */}
                                <div style={{ padding: '0.85rem 1rem', borderBottom: `2px solid ${col.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.82rem', color: col.color }}>
                                        <span>{col.icon}</span>
                                        <span>{col.label}</span>
                                    </div>
                                    <span style={{
                                        width: 24, height: 24, borderRadius: '50%', background: col.color, color: '#fff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900,
                                    }}>{cards.length}</span>
                                </div>

                                {/* Cards */}
                                <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', minHeight: 100, maxHeight: 500, overflowY: 'auto' }}
                                    className="custom-scrollbar">
                                    {cards.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#9CA3AF', fontSize: '0.78rem' }}>
                                            Nenhuma inscrição
                                        </div>
                                    ) : cards.map((e, i) => (
                                        <div key={e.id}
                                            className="animate-fade-in"
                                            style={{
                                                background: '#FFFFFF',
                                                border: '1px solid rgba(0,0,0,0.08)',
                                                borderRadius: 10,
                                                padding: '0.85rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                animationDelay: `${i * 40}ms`,
                                                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                                            }}
                                            onClick={() => setSelected(e)}
                                            onMouseEnter={el => {
                                                (el.currentTarget as HTMLElement).style.borderColor = col.color + '60';
                                                (el.currentTarget as HTMLElement).style.boxShadow = `0 4px 12px rgba(0,0,0,0.1)`;
                                            }}
                                            onMouseLeave={el => {
                                                (el.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.08)';
                                                (el.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                                <span style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono', color: '#9CA3AF' }}>{e.protocol}</span>
                                                <span style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>{new Date(e.createdAt).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>{getName(e)}</p>
                                            <p style={{ fontSize: '0.72rem', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getCourse(e)}</p>
                                            {/* Quick actions for pending */}
                                            {e.status === 'PENDING' && (
                                                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.65rem' }}
                                                    onClick={ev => ev.stopPropagation()}>
                                                    <button
                                                        onClick={() => updateStatus(e.id, 'APPROVED')}
                                                        disabled={processing === e.id}
                                                        style={{ flex: 1, padding: '0.35rem', borderRadius: 6, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#059669', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                                    >✓ Aprovar</button>
                                                    <button
                                                        onClick={() => setRejectModal(e.id)}
                                                        style={{ flex: 1, padding: '0.35rem', borderRadius: 6, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                                    >✕ Rejeitar</button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ── LIST VIEW ── */
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Protocolo</th>
                                    <th>Aluno</th>
                                    <th>Curso</th>
                                    <th>Data</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(e => {
                                    const col = STATUS_COLUMNS.find(c => c.key === e.status);
                                    return (
                                        <tr key={e.id}>
                                            <td><span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', color: '#374151' }}>{e.protocol}</span></td>
                                            <td><span style={{ fontWeight: 600, color: '#111827' }}>{getName(e)}</span></td>
                                            <td style={{ color: '#6B7280' }}>{getCourse(e)}</td>
                                            <td style={{ fontSize: '0.78rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono' }}>{new Date(e.createdAt).toLocaleDateString('pt-BR')}</td>
                                            <td>
                                                <span style={{
                                                    padding: '0.2rem 0.65rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700,
                                                    background: col?.bg || '#F3F4F6', color: col?.color || '#6B7280', border: `1px solid ${col?.border || '#E5E7EB'}`,
                                                    textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
                                                }}>{STATUS_LABELS[e.status] || e.status}</span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                    <button onClick={() => setSelected(e)} style={{ padding: '0.35rem', borderRadius: 7, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', cursor: 'pointer', display: 'flex' }}>
                                                        <EyeIcon style={{ width: 14, height: 14 }} />
                                                    </button>
                                                    {e.status === 'PENDING' && <>
                                                        <button onClick={() => updateStatus(e.id, 'APPROVED')} style={{ padding: '0.35rem', borderRadius: 7, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#059669', cursor: 'pointer', display: 'flex' }}>
                                                            <CheckCircleIcon style={{ width: 14, height: 14 }} />
                                                        </button>
                                                        <button onClick={() => setRejectModal(e.id)} style={{ padding: '0.35rem', borderRadius: 7, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', cursor: 'pointer', display: 'flex' }}>
                                                            <XCircleIcon style={{ width: 14, height: 14 }} />
                                                        </button>
                                                    </>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {selected && (
                <div className="modal-overlay" onClick={() => setSelected(null)}>
                    <div className="modal-content" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.25rem' }}>
                            <div>
                                <h2 style={{ fontFamily: 'Orbitron', fontSize: '1.1rem', fontWeight: 800, color: '#111827', marginBottom: '0.25rem' }}>Detalhes da Inscrição</h2>
                                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: '#9CA3AF' }}>{selected.protocol}</span>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1.25rem', lineHeight: 1, padding: '0.25rem' }}>✕</button>
                        </div>

                        {/* Status badge */}
                        {(() => {
                            const col = STATUS_COLUMNS.find(c => c.key === selected.status);
                            return col && (
                                <span style={{ padding: '0.3rem 0.85rem', borderRadius: 100, fontSize: '0.72rem', fontWeight: 700, background: col.bg, color: col.color, border: `1px solid ${col.border}`, display: 'inline-block', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    {col.icon} {col.label}
                                </span>
                            );
                        })()}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                            {[
                                { label: 'Nome', value: getName(selected) },
                                { label: 'Curso', value: getCourse(selected) },
                                { label: 'Turma', value: selected.class?.classIdentifier || '—' },
                                { label: 'Inscrito em', value: new Date(selected.createdAt).toLocaleString('pt-BR') },
                            ].map(f => (
                                <div key={f.label} style={{ padding: '0.75rem', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                                    <div style={{ fontSize: '0.62rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>{f.label}</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{f.value}</div>
                                </div>
                            ))}
                        </div>

                        {selected.status === 'PENDING' && (
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    onClick={() => updateStatus(selected.id, 'APPROVED')}
                                    disabled={!!processing}
                                    className="btn-primary"
                                    style={{ flex: 1, justifyContent: 'center' }}
                                >
                                    {processing ? '...' : <><CheckCircleIcon style={{ width: 16, height: 16 }} /> Aprovar Inscrição</>}
                                </button>
                                <button
                                    onClick={() => { setRejectModal(selected.id); setSelected(null); }}
                                    className="btn-danger"
                                    style={{ flex: 1, justifyContent: 'center' }}
                                >
                                    <XCircleIcon style={{ width: 16, height: 16 }} /> Rejeitar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Reject reason modal */}
            {rejectModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 440 }}>
                        <h3 style={{ fontFamily: 'Orbitron', fontSize: '1rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>Motivo da Rejeição</h3>
                        <p style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: '1rem' }}>Informe o motivo para rejeitar esta inscrição.</p>
                        <textarea
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="Ex: documentação incompleta, requisitos não atendidos..."
                            className="form-input"
                            style={{ height: 100, resize: 'none', marginBottom: '1rem' }}
                        />
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancelar</button>
                            <button
                                onClick={() => updateStatus(rejectModal, 'REJECTED', rejectReason)}
                                disabled={!!processing}
                                className="btn-danger"
                                style={{ flex: 1, justifyContent: 'center' }}
                            >
                                {processing ? '...' : 'Confirmar Rejeição'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
