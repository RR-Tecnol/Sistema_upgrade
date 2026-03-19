'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';
import {
    MagnifyingGlassIcon,
    CheckCircleIcon,
    XCircleIcon,
    EyeIcon,
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

    // ── Drag & Drop state ─────────────────────────────────────────────────────
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);

    // ── Horizontal scroll (arrastar tela para o lado) ─────────────────────────
    const kanbanRef = useRef<HTMLDivElement>(null);
    const isDraggingScroll = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const handleScrollMouseDown = (e: React.MouseEvent) => {
        // Only trigger scroll if clicking on the kanban container background (not a card)
        if ((e.target as HTMLElement).closest('[data-card]')) return;
        isDraggingScroll.current = true;
        startX.current = e.pageX - (kanbanRef.current?.offsetLeft || 0);
        scrollLeft.current = kanbanRef.current?.scrollLeft || 0;
    };
    const handleScrollMouseMove = useCallback((e: MouseEvent) => {
        if (!isDraggingScroll.current || !kanbanRef.current) return;
        e.preventDefault();
        const x = e.pageX - (kanbanRef.current.offsetLeft || 0);
        const walk = (x - startX.current) * 1.5;
        kanbanRef.current.scrollLeft = scrollLeft.current - walk;
    }, []);
    const handleScrollMouseUp = useCallback(() => { isDraggingScroll.current = false; }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleScrollMouseMove);
        window.addEventListener('mouseup', handleScrollMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleScrollMouseMove);
            window.removeEventListener('mouseup', handleScrollMouseUp);
        };
    }, [handleScrollMouseMove, handleScrollMouseUp]);

    // ── Data ──────────────────────────────────────────────────────────────────
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
        // Optimistic update
        setEnrollments(prev => prev.map(e => e.id === id ? { ...e, status } : e));
        try {
            await api.patch(`/enrollments/${id}/status`, { status, rejectionReason: reason });
            toast.success(`Status atualizado para ${STATUS_LABELS[status] || status}`);
            setSelected(null);
            setRejectModal(null);
        } catch {
            toast.error('Erro ao atualizar inscrição');
            // Revert on error
            fetchEnrollments();
        } finally {
            setProcessing(null);
        }
    };

    // ── Drag & Drop handlers ──────────────────────────────────────────────────
    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggingId(id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('enrollment_id', id);
        // Ghost image
        const el = e.currentTarget as HTMLElement;
        el.style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        (e.currentTarget as HTMLElement).style.opacity = '1';
        setDraggingId(null);
        setDragOverCol(null);
    };

    const handleDragOver = (e: React.DragEvent, colKey: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverCol(colKey);
    };

    const handleDrop = (e: React.DragEvent, targetStatus: string) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('enrollment_id');
        const enrollment = enrollments.find(e => e.id === id);
        if (!enrollment || enrollment.status === targetStatus) {
            setDragOverCol(null);
            return;
        }
        // Rejeição requer motivo
        if (targetStatus === 'REJECTED') {
            setRejectModal(id);
        } else {
            updateStatus(id, targetStatus);
        }
        setDragOverCol(null);
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
                        Gerencie e aprove as inscrições — <strong>arraste os cards</strong> para mudar o status
                        {totalPending > 0 && <span style={{ marginLeft: '0.5rem', padding: '0.15rem 0.6rem', borderRadius: 100, background: '#FEF9C3', color: '#92730A', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #FDE047' }}>
                            {totalPending} pendente{totalPending > 1 ? 's' : ''}
                        </span>}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {/* Dica de drag */}
                    {view === 'kanban' && (
                        <span style={{ fontSize: '0.7rem', color: '#9CA3AF', padding: '0.35rem 0.75rem', borderRadius: 8, background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
                            ↔ Arraste p/ navegar | Segure card p/ mover
                        </span>
                    )}
                    {(['kanban', 'list'] as const).map(v => (
                        <button key={v} onClick={() => setView(v)}
                            style={{
                                padding: '0.5rem 1rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                                background: view === v ? '#FFD600' : 'transparent',
                                color: view === v ? '#000' : 'var(--text-secondary)',
                                border: view === v ? '1px solid #FFD600' : '1px solid var(--border-default)',
                                boxShadow: view === v ? '0 2px 8px rgba(255,214,0,0.3)' : 'none',
                            }}>
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
                        <div key={col.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: 10, fontSize: '0.82rem', background: col.bg, border: `1px solid ${col.border}`, color: col.color, fontWeight: 700 }}>
                            <span>{col.icon}</span><span>{col.label}</span>
                            <span style={{ fontFamily: 'Orbitron', fontSize: '1rem', fontWeight: 900 }}>{count}</span>
                        </div>
                    );
                })}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: 10, fontSize: '0.82rem', background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 700 }}>
                    📋 Total <span style={{ fontFamily: 'Orbitron', fontSize: '1rem', fontWeight: 900 }}>{enrollments.length}</span>
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

                /* ════════════════════════════════════════════════════
                   KANBAN VIEW — Drag cards entre colunas
                   + Arrastar horizontalmente na área de fundo
                   ════════════════════════════════════════════════════ */
                <div
                    ref={kanbanRef}
                    onMouseDown={handleScrollMouseDown}
                    style={{
                        display: 'flex',
                        gap: '1rem',
                        overflowX: 'auto',
                        paddingBottom: '1rem',
                        cursor: isDraggingScroll.current ? 'grabbing' : 'grab',
                        userSelect: 'none',
                        WebkitOverflowScrolling: 'touch',
                    }}
                    className="custom-scrollbar"
                >
                    {STATUS_COLUMNS.map(col => {
                        const cards = filtered.filter(e => e.status === col.key);
                        const isOver = dragOverCol === col.key;
                        return (
                            <div
                                key={col.key}
                                onDragOver={e => handleDragOver(e, col.key)}
                                onDragLeave={() => setDragOverCol(null)}
                                onDrop={e => handleDrop(e, col.key)}
                                style={{
                                    flexShrink: 0,
                                    width: 260,
                                    borderRadius: 14,
                                    border: isOver ? `2px dashed ${col.color}` : `1px solid ${col.border}`,
                                    background: isOver ? col.bg : col.bg,
                                    overflow: 'hidden',
                                    transition: 'border 0.15s, transform 0.15s',
                                    transform: isOver ? 'scale(1.01)' : 'scale(1)',
                                    boxShadow: isOver ? `0 8px 24px rgba(0,0,0,0.12)` : 'none',
                                }}
                            >
                                {/* Column header */}
                                <div style={{ padding: '0.85rem 1rem', borderBottom: `2px solid ${col.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: col.bg }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.82rem', color: col.color }}>
                                        <span>{col.icon}</span><span>{col.label}</span>
                                    </div>
                                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: col.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900 }}>
                                        {cards.length}
                                    </span>
                                </div>

                                {/* Drop zone hint */}
                                {isOver && (
                                    <div style={{ margin: '0.5rem', padding: '0.6rem', borderRadius: 8, background: `${col.color}20`, border: `1.5px dashed ${col.color}`, textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: col.color }}>
                                        ↓ Soltar aqui para mover
                                    </div>
                                )}

                                {/* Cards */}
                                <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', minHeight: 120, maxHeight: 520, overflowY: 'auto' }} className="custom-scrollbar">
                                    {cards.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#9CA3AF', fontSize: '0.78rem', border: '1.5px dashed #E5E7EB', borderRadius: 10, margin: '0.25rem' }}>
                                            Arraste um card aqui
                                        </div>
                                    ) : cards.map((e, i) => (
                                        <div
                                            key={e.id}
                                            data-card="true"
                                            draggable
                                            onDragStart={ev => handleDragStart(ev, e.id)}
                                            onDragEnd={handleDragEnd}
                                            className="animate-fade-in"
                                            style={{
                                                background: '#FFFFFF',
                                                border: draggingId === e.id ? `2px solid ${col.color}` : '1px solid rgba(0,0,0,0.08)',
                                                borderRadius: 10,
                                                padding: '0.85rem',
                                                cursor: 'grab',
                                                transition: 'all 0.2s',
                                                animationDelay: `${i * 30}ms`,
                                                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                                                opacity: draggingId === e.id ? 0.5 : 1,
                                            }}
                                            onClick={() => setSelected(e)}
                                            onMouseEnter={el => {
                                                if (!draggingId) {
                                                    (el.currentTarget as HTMLElement).style.borderColor = col.color + '60';
                                                    (el.currentTarget as HTMLElement).style.boxShadow = `0 4px 12px rgba(0,0,0,0.1)`;
                                                    (el.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                                                }
                                            }}
                                            onMouseLeave={el => {
                                                (el.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.08)';
                                                (el.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                                                (el.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                                            }}
                                        >
                                            {/* Drag handle indicator */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                                <span style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono', color: '#9CA3AF' }}>{e.protocol}</span>
                                                <span style={{ fontSize: '0.62rem', color: '#C4B5FD', letterSpacing: '0.05em', cursor: 'grab' }}>⠿ drag</span>
                                            </div>
                                            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem', lineHeight: 1.3 }}>{getName(e)}</p>
                                            <p style={{ fontSize: '0.72rem', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.25rem' }}>{getCourse(e)}</p>
                                            <p style={{ fontSize: '0.62rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono' }}>
                                                {new Date(e.createdAt).toLocaleDateString('pt-BR')}
                                            </p>
                                            {/* Quick actions for pending */}
                                            {e.status === 'PENDING' && (
                                                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.65rem' }} onClick={ev => ev.stopPropagation()}>
                                                    <button onClick={() => updateStatus(e.id, 'APPROVED')} disabled={processing === e.id}
                                                        style={{ flex: 1, padding: '0.35rem', borderRadius: 6, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#059669', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
                                                        ✓ Aprovar
                                                    </button>
                                                    <button onClick={() => setRejectModal(e.id)}
                                                        style={{ flex: 1, padding: '0.35rem', borderRadius: 6, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
                                                        ✕ Rejeitar
                                                    </button>
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
                                    <th>Protocolo</th><th>Aluno</th><th>Curso</th>
                                    <th>Data</th><th>Status</th><th>Ações</th>
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
                                                <span style={{ padding: '0.2rem 0.65rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, background: col?.bg || '#F3F4F6', color: col?.color || '#6B7280', border: `1px solid ${col?.border || '#E5E7EB'}`, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                                                    {STATUS_LABELS[e.status] || e.status}
                                                </span>
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
                                <button onClick={() => updateStatus(selected.id, 'APPROVED')} disabled={!!processing} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                                    {processing ? '...' : <><CheckCircleIcon style={{ width: 16, height: 16 }} /> Aprovar Inscrição</>}
                                </button>
                                <button onClick={() => { setRejectModal(selected.id); setSelected(null); }} className="btn-danger" style={{ flex: 1, justifyContent: 'center' }}>
                                    <XCircleIcon style={{ width: 16, height: 16 }} /> Rejeitar
                                </button>
                            </div>
                        )}
                        {selected.status === 'APPROVED' && (
                            <button onClick={() => updateStatus(selected.id, 'ENROLLED')} disabled={!!processing} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                                🎓 Confirmar Matrícula
                            </button>
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
                        <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                            placeholder="Ex: documentação incompleta, requisitos não atendidos..."
                            className="form-input" style={{ height: 100, resize: 'none', marginBottom: '1rem' }} />
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancelar</button>
                            <button onClick={() => updateStatus(rejectModal, 'REJECTED', rejectReason)} disabled={!!processing} className="btn-danger" style={{ flex: 1, justifyContent: 'center' }}>
                                {processing ? '...' : 'Confirmar Rejeição'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
