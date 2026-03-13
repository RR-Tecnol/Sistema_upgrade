'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api/client'; // corrigido: era @/lib/api/acoes
import {
    CurrencyDollarIcon,
    PlusIcon,
    CheckIcon,
    XMarkIcon,
    ClockIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';

/* ── Tipos ─────────────────────────────────────────── */
interface Reimbursement {
    id: string;
    employeeId: string;
    acaoId?: string;
    category: string;
    type: string;
    amount: number;
    description: string;
    receiptUrl?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    active: boolean;
    createdAt: string;
    employee?: { name: string };
    acao?: { nome: string };
}

const STATUS_CONFIG = {
    PENDING: { label: 'Aguardando', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: <ClockIcon style={{ width: 12, height: 12 }} /> },
    APPROVED: { label: 'Aprovado', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0', icon: <CheckIcon style={{ width: 12, height: 12 }} /> },
    REJECTED: { label: 'Rejeitado', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: <XMarkIcon style={{ width: 12, height: 12 }} /> },
};

// Categorias alinhadas com enum ReimbursementType do schema Prisma
const CATEGORY_LABELS: Record<string, string> = {
    CLASSROOM_MATERIAL: '📚 Material de Aula',
    CLEANING_MATERIAL: '🧹 Material de Limpeza',
    EMERGENCY_REPAIR: '🔧 Reparo Emergencial',
    FOOD: '🍽️ Alimentação',
    OTHER: '📦 Outro',
};

const fmtCurr = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

/* ── Modal: Novo Reembolso (sem MinIO) ─────────────── */
function ModalNovoReembolso({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [form, setForm] = useState({ type: 'CLASSROOM_MATERIAL', amount: '', description: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(form.amount.replace(',', '.'));
        if (isNaN(amount) || amount <= 0) { setError('Informe um valor válido.'); return; }
        setLoading(true); setError('');
        try {
            await api.post('/reimbursements', { type: form.type, amount, description: form.description });
            onCreated(); onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Erro ao criar reembolso.');
        } finally { setLoading(false); }
    };

    const INPUT: React.CSSProperties = {
        width: '100%', padding: '0.65rem 0.9rem', borderRadius: 9,
        border: '1.5px solid #E5E7EB', background: '#F9FAFB',
        fontSize: '0.85rem', color: '#111827', outline: 'none',
        boxSizing: 'border-box',
    };
    const LABEL: React.CSSProperties = {
        display: 'block', fontSize: '0.63rem', fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        color: '#6B7280', marginBottom: '0.35rem',
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', animation: 'slideUp 0.25s' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ padding: '18px 24px 14px', background: '#FFFDE7', borderBottom: '1px solid #FEF08A', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CurrencyDollarIcon style={{ width: 20, height: 20, color: '#B89B00' }} />
                    <div>
                        <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 900, color: '#111827', margin: 0 }}>NOVA SOLICITAÇÃO DE REEMBOLSO</h2>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: '#9CA3AF' }}>Comprovante pode ser anexado via app mobile (MinIO)</p>
                    </div>
                    <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                </div>
                <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '10px 14px', borderRadius: 9, fontSize: '0.83rem' }}>{error}</div>}
                    <div>
                        <label style={LABEL}>Categoria *</label>
                        <select style={{ ...(INPUT as any), cursor: 'pointer' }} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={LABEL}>Valor (R$) *</label>
                        <input style={INPUT} type="text" inputMode="decimal" placeholder="0,00"
                            value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
                    </div>
                    <div>
                        <label style={LABEL}>Descrição *</label>
                        <textarea style={{ ...(INPUT as any), minHeight: 72, resize: 'vertical' }} required
                            placeholder="Descreva o que foi comprado e o motivo..."
                            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div style={{ background: '#FFFDE7', border: '1px solid #FEF08A', borderRadius: 9, padding: '10px 14px', fontSize: '0.75rem', color: '#92400E' }}>
                        📱 <strong>Comprovante via mobile:</strong> Após criar, o comprovante pode ser anexado pelo app mobile via upload de foto.
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} style={{ padding: '9px 20px', background: 'transparent', border: '1px solid #E5E7EB', color: '#6B7280', borderRadius: 9, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Cancelar</button>
                        <button type="submit" disabled={loading} className="btn-primary" style={{ minWidth: 160 }}>
                            {loading ? 'Enviando...' : '💰 Solicitar Reembolso'}
                        </button>
                    </div>
                </form>
            </div>
            <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </div>
    );
}

/* ── Modal de aprovação/rejeição ─────────────────────── */
function ModalAprovacao({
    item,
    onClose,
    onDone,
}: {
    item: Reimbursement;
    onClose: () => void;
    onDone: () => void;
}) {
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectField, setShowRejectField] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errMsg, setErrMsg] = useState('');

    const approve = async () => {
        setLoading(true); setErrMsg('');
        try {
            await api.patch(`/reimbursements/${item.id}/approve`);
            onDone(); onClose();
        } catch (e: any) {
            setErrMsg(e?.response?.data?.message || 'Erro ao aprovar reembolso.');
        } finally { setLoading(false); }
    };

    const reject = async () => {
        if (!rejectionReason.trim()) { setErrMsg('Informe o motivo da rejeição.'); return; }
        setLoading(true); setErrMsg('');
        try {
            await api.patch(`/reimbursements/${item.id}/reject`, { rejectionReason });
            onDone(); onClose();
        } catch (e: any) {
            setErrMsg(e?.response?.data?.message || 'Erro ao rejeitar reembolso.');
        } finally { setLoading(false); }
    };

    const openReceipt = () => {
        if (item.receiptUrl) window.open(item.receiptUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', animation: 'slideUp 0.25s' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ padding: '18px 24px 14px', background: '#FFFDE7', borderBottom: '1px solid #FEF08A', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CurrencyDollarIcon style={{ width: 20, height: 20, color: '#B89B00' }} />
                    <div>
                        <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 900, color: '#111827', margin: 0 }}>ANALISAR REEMBOLSO</h2>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: '#9CA3AF' }}>{item.employee?.name} · {CATEGORY_LABELS[item.type || item.category] || item.type}</p>
                    </div>
                    <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
                </div>

                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '12px 16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <div>
                                <div style={{ fontSize: '0.62rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Valor</div>
                                <div style={{ fontFamily: 'Orbitron', fontWeight: 800, fontSize: '1.1rem', color: '#059669' }}>{fmtCurr(item.amount)}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.62rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Período</div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827' }}>{item.acao?.nome || '—'}</div>
                            </div>
                        </div>
                        <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#374151' }}>{item.description}</div>
                        {item.receiptUrl ? (
                            <button onClick={openReceipt}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: '0.75rem', color: '#1D4ED8', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600 }}>
                                <DocumentTextIcon style={{ width: 13, height: 13 }} /> Ver comprovante ↗
                            </button>
                        ) : (
                            <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#9CA3AF', fontStyle: 'italic' }}>📎 Comprovante pendente (dados de teste sem MinIO)</div>
                        )}
                    </div>

                    {showRejectField && (
                        <div>
                            <label style={{ display: 'block', fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#DC2626', marginBottom: '0.35rem' }}>
                                Motivo da Rejeição <span style={{ color: '#DC2626' }}>*</span>
                            </label>
                            <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={3}
                                style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: 9, border: '1.5px solid #FECACA', background: '#FEF2F2', fontSize: '0.83rem', color: '#111827', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                                placeholder="Ex: Recibo ilegível, valor acima do permitido..." autoFocus />
                        </div>
                    )}

                    {errMsg && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', fontSize: '0.78rem', color: '#DC2626' }}>⚠ {errMsg}</div>}

                    <div style={{ display: 'flex', gap: 10 }}>
                        {!showRejectField ? (
                            <>
                                <button onClick={() => setShowRejectField(true)} disabled={loading}
                                    style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                    <XMarkIcon style={{ width: 15, height: 15 }} /> Rejeitar
                                </button>
                                <button onClick={approve} disabled={loading}
                                    className="btn-primary" style={{ flex: 1, padding: '10px' }}>
                                    <CheckIcon style={{ width: 15, height: 15 }} /> {loading ? 'Aprovando...' : 'Aprovar'}
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => { setShowRejectField(false); setRejectionReason(''); setErrMsg(''); }} disabled={loading}
                                    style={{ flex: 0, padding: '10px 16px', borderRadius: 10, background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                                    Voltar
                                </button>
                                <button onClick={reject} disabled={loading || !rejectionReason.trim()}
                                    style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#DC2626', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: !rejectionReason.trim() ? 0.5 : 1 }}>
                                    <XMarkIcon style={{ width: 15, height: 15 }} /> {loading ? 'Rejeitando...' : 'Confirmar Rejeição'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </div>
    );
}

/* ── Página Principal ───────────────────────────────── */
export default function ReembolsosPage() {
    const [items, setItems] = useState<Reimbursement[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [selected, setSelected] = useState<Reimbursement | null>(null);
    const [showCriar, setShowCriar] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const params = filterStatus ? `?status=${filterStatus}` : '';
            const res = await api.get(`/reimbursements${params}`);
            setItems(Array.isArray(res.data) ? res.data : res.data.data ?? []);
        } catch { setItems([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [filterStatus]);

    const stats = {
        total: items.length,
        pending: items.filter(i => i.status === 'PENDING').length,
        approved: items.filter(i => i.status === 'APPROVED').length,
        totalApproved: items.filter(i => i.status === 'APPROVED').reduce((s, i) => s + Number(i.amount), 0),
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 className="gradient-text" style={{ fontFamily: 'Orbitron', fontSize: '1.7rem', fontWeight: 900, letterSpacing: '0.08em', margin: 0 }}>
                        REEMBOLSOS
                    </h1>
                    <p style={{ color: '#9CA3AF', fontSize: '0.82rem', margin: '4px 0 0' }}>
                        Gerencie solicitações de reembolso de despesas dos funcionários (REQ-10)
                    </p>
                </div>
                <button onClick={() => setShowCriar(true)} className="btn-primary">
                    <PlusIcon style={{ width: 15, height: 15 }} /> Nova Solicitação
                </button>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
                {[
                    { label: 'Total', value: stats.total, color: '#B89B00', format: String },
                    { label: 'Pendentes', value: stats.pending, color: '#D97706', format: String },
                    { label: 'Aprovados', value: stats.approved, color: '#059669', format: String },
                    { label: 'Total Aprovado', value: stats.totalApproved, color: '#1D4ED8', format: (v: number) => fmtCurr(v) },
                ].map((k, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: `1px solid ${k.color}22`, borderLeft: `4px solid ${k.color}` }}>
                        <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.5rem', color: k.color }}>
                            {k.format(k.value as any)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#6B7280', fontWeight: 600, marginTop: 4 }}>{k.label}</div>
                    </div>
                ))}
            </div>

            {/* Filtros de status */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => setFilterStatus('')}
                    style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, border: !filterStatus ? '1px solid #B89B00' : '1px solid #E5E7EB', background: !filterStatus ? '#FFFDE7' : 'transparent', color: !filterStatus ? '#B89B00' : '#6B7280', cursor: 'pointer' }}>
                    Todos
                </button>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <button key={k} onClick={() => setFilterStatus(k)}
                        style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, border: filterStatus === k ? `1px solid ${v.color}` : '1px solid #E5E7EB', background: filterStatus === k ? v.bg : 'transparent', color: filterStatus === k ? v.color : '#6B7280', cursor: 'pointer' }}>
                        {v.icon} {v.label}
                    </button>
                ))}
            </div>

            {/* Aviso */}
            <div style={{ background: '#EFF6FF', borderRadius: 10, padding: '10px 14px', border: '1px solid #BFDBFE', fontSize: '0.75rem', color: '#1E40AF' }}>
                📱 <strong>Upload de comprovante:</strong> Após criar a solicitação, o comprovante pode ser anexado pelo app mobile. Clique em <strong>Analisar</strong> para aprovar ou rejeitar.
            </div>

            {/* Tabela */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F3F4F6', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ margin: '0 auto 1rem' }} /></div>
                ) : items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF' }}>
                        <CurrencyDollarIcon style={{ width: 36, height: 36, margin: '0 auto 8px', opacity: 0.3 }} />
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', letterSpacing: '0.12em' }}>NENHUM REEMBOLSO ENCONTRADO</p>
                        <p style={{ fontSize: '0.78rem', color: '#9CA3AF', marginTop: 6 }}>Clique em <strong>+ Nova Solicitação</strong> para criar, ou execute o seed de dados de teste.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Funcionário</th>
                                    <th>Categoria</th>
                                    <th>Valor</th>
                                    <th>Período</th>
                                    <th>Data</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => {
                                    const st = STATUS_CONFIG[item.status];
                                    return (
                                        <tr key={item.id}>
                                            <td style={{ fontWeight: 600, fontSize: '0.82rem', color: '#111827' }}>{item.employee?.name || '—'}</td>
                                            <td style={{ fontSize: '0.8rem' }}>{CATEGORY_LABELS[item.type || item.category] || item.type}</td>
                                            <td>
                                                <span style={{ fontFamily: 'Orbitron', fontWeight: 800, fontSize: '0.85rem', color: '#059669' }}>
                                                    {fmtCurr(Number(item.amount))}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.78rem', color: '#6B7280' }}>{item.acao?.nome || '—'}</td>
                                            <td style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono' }}>{fmtDate(item.createdAt)}</td>
                                            <td>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color, fontSize: '0.68rem', fontWeight: 700, border: `1px solid ${st.border}` }}>
                                                    {st.icon} {st.label}
                                                </span>
                                            </td>
                                            <td>
                                                {item.status === 'PENDING' && (
                                                    <button onClick={() => setSelected(item)}
                                                        style={{ padding: '5px 12px', borderRadius: 7, background: '#FFFDE7', color: '#B89B00', border: '1px solid #FEF08A', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>
                                                        Analisar
                                                    </button>
                                                )}
                                                {item.receiptUrl && (
                                                    <a href={item.receiptUrl} target="_blank" rel="noreferrer"
                                                        style={{ marginLeft: 6, padding: '5px 8px', borderRadius: 7, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
                                                        📄
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selected && <ModalAprovacao item={selected} onClose={() => setSelected(null)} onDone={load} />}
            {showCriar && <ModalNovoReembolso onClose={() => setShowCriar(false)} onCreated={load} />}
        </div>
    );
}
