'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api/client'; // corrigido: era @/lib/api/acoes
import { toast } from '@/components/ui/Toast';
import { useAdminFinanceRefresh } from '@/hooks/useAdminFinanceRefresh';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { ReembolsosSidebarTutorial } from '@/components/admin/adminSidebarTutorials';
import AdminViewModeToggle from '@/components/admin/AdminViewModeToggle';
import { usePersistedAdminViewMode } from '@/hooks/usePersistedAdminViewMode';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';
import {
    EmployeeStyleAdminDetailShell,
    EmployeeStyleAttachmentsGrid,
    type EmployeeStyleAttachmentItem,
    EmployeeStylePill,
    EmployeeStyleSectionTitle,
} from '@/components/admin/employee-style-admin-detail';
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
    rejectionReason?: string | null;
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

function initialsFromName(name: string) {
    return name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

async function fetchReimbursementReceiptPresigned(reimbursementId: string): Promise<string | null> {
    try {
        const { data } = await api.get<{ url: string }>(`/reimbursements/${reimbursementId}/receipt-presigned-url`);
        return data?.url?.trim() ?? null;
    } catch {
        return null;
    }
}

function reimbursementAttachmentDocs(entry: { id: string; receiptUrl?: string | null }): EmployeeStyleAttachmentItem[] {
    const raw = entry.receiptUrl?.trim();
    if (!raw) return [];
    return [
        {
            label: 'Comprovante',
            url: raw,
            presign: { kind: 'reimbursement', id: entry.id },
        },
    ];
}

function reimbursementStatusHeaderBadge(status: Reimbursement['status']) {
    const st = STATUS_CONFIG[status];
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.6rem',
                borderRadius: 100,
                fontSize: '0.6rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                background: st.bg,
                color: st.color,
                border: `1px solid ${st.border}`,
                textTransform: 'uppercase',
            }}
        >
            <span style={{ display: 'flex', alignItems: 'center', opacity: 0.95 }}>{st.icon}</span>
            {st.label}
        </span>
    );
}

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
        <ModalPortal>
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: MODAL_PORTAL_Z_INDEX, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
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
        </ModalPortal>
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
    const [receiptViewUrl, setReceiptViewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!item.receiptUrl?.trim()) {
            setReceiptViewUrl(null);
            return;
        }
        let cancelled = false;
        (async () => {
            const signed = await fetchReimbursementReceiptPresigned(item.id);
            if (!cancelled) setReceiptViewUrl(signed ?? item.receiptUrl!.trim());
        })();
        return () => {
            cancelled = true;
        };
    }, [item.id, item.receiptUrl]);

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
        const href = receiptViewUrl ?? item.receiptUrl?.trim();
        if (href) window.open(href, '_blank', 'noopener,noreferrer');
    };

    return (
        <ModalPortal>
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: MODAL_PORTAL_Z_INDEX, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
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
                        {item.receiptUrl?.trim() ? (
                            <div style={{ marginTop: 16, border: '2px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
                                <div style={{ background: '#F9FAFB', padding: 8 }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={receiptViewUrl ?? item.receiptUrl} alt="Comprovante" style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block', borderRadius: 8 }} />
                                </div>
                                <a href={receiptViewUrl ?? item.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: '#F3F4F6', color: '#1D4ED8', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none', borderTop: '1px solid #E5E7EB' }}>
                                    <DocumentTextIcon style={{ width: 14, height: 14 }} /> Abrir em nova guia ↗
                                </a>
                            </div>
                        ) : (
                            <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#9CA3AF', fontStyle: 'italic' }}>📎 Comprovante não anexado.</div>
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
        </ModalPortal>
    );
}

/* ── Página Principal ───────────────────────────────── */
export default function ReembolsosPage() {
    const [items, setItems] = useState<Reimbursement[]>([]);
    const [kpiSource, setKpiSource] = useState<Reimbursement[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [selected, setSelected] = useState<Reimbursement | null>(null);
    const [showCriar, setShowCriar] = useState(false);
    const [listViewMode, setListViewMode] = usePersistedAdminViewMode('admin:reembolsos:list', 'table');
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
    const [detailing, setDetailing] = useState<Reimbursement | null>(null);

    const loadKpis = useCallback(async () => {
        try {
            const res = await api.get('/reimbursements');
            const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
            setKpiSource(list);
        } catch {
            setKpiSource([]);
        }
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = filterStatus ? `?status=${filterStatus}` : '';
            const res = await api.get(`/reimbursements${params}`);
            setItems(Array.isArray(res.data) ? res.data : res.data.data ?? []);
        } catch { setItems([]); }
        finally { setLoading(false); }
    }, [filterStatus]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => { loadKpis(); }, [loadKpis]);

    useEffect(() => {
        const modalOpen = !!selected || !!detailing || showCriar;
        document.body.style.overflow = modalOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [selected, detailing, showCriar]);

    const refreshFromSocket = useCallback(() => {
        loadKpis();
        load();
    }, [loadKpis, load]);

    useAdminFinanceRefresh(refreshFromSocket, ['reembolsos']);

    const afterApproveOrReject = () => {
        loadKpis();
        setFilterStatus('');
        toast.success('Reembolso atualizado. Se aprovado, a conta foi lançada em Contas a Pagar.');
    };

    const stats = {
        total: kpiSource.length,
        pending: kpiSource.filter(i => i.status === 'PENDING').length,
        approved: kpiSource.filter(i => i.status === 'APPROVED').length,
        rejected: kpiSource.filter(i => i.status === 'REJECTED').length,
        totalApproved: kpiSource.filter(i => i.status === 'APPROVED').reduce((s, i) => s + Number(i.amount), 0),
        totalRejected: kpiSource.filter(i => i.status === 'REJECTED').reduce((s, i) => s + Number(i.amount), 0),
    };
    const rejectedList = kpiSource
        .filter((i) => i.status === 'REJECTED')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-in">
            <AdminHeaderHero
                title="REEMBOLSOS"
                subtitle="Gerencie solicitações de reembolso de despesas dos funcionários (REQ-10)"
                rightSlot={(
                    <button onClick={() => setShowCriar(true)} className="btn-primary" type="button">
                        <PlusIcon style={{ width: 15, height: 15 }} /> Nova Solicitação
                    </button>
                )}
            />
            <ReembolsosSidebarTutorial />

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
                {[
                    { label: 'Total', value: stats.total, color: '#B89B00', sub: 'todas as solicitações', onClick: () => setFilterStatus('') },
                    { label: 'Pendentes', value: stats.pending, color: '#D97706', sub: 'aguardando análise', onClick: () => setFilterStatus('PENDING') },
                    { label: 'Aprovados', value: stats.approved, color: '#059669', sub: 'liberados para pagamento', onClick: () => setFilterStatus('APPROVED') },
                    { label: 'Rejeitados', value: stats.rejected, color: '#DC2626', sub: `${fmtCurr(stats.totalRejected)} recusados`, onClick: () => setFilterStatus('REJECTED') },
                    { label: 'Total Aprovado (R$)', value: Number(stats.totalApproved.toFixed(2)), color: '#1D4ED8', sub: 'valor financeiro aprovado', onClick: () => setFilterStatus('APPROVED') },
                ].map((k, i) => (
                    <AnimatedKpiCard
                        key={i}
                        label={k.label}
                        value={k.value}
                        sub={k.sub}
                        color={k.color}
                        bg="#FFFFFF"
                        border={k.color}
                        delayMs={i * 60}
                        onClick={k.onClick}
                    />
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
                <div style={{ marginLeft: 'auto', alignSelf: 'center' }}>
                    <AdminViewModeToggle mode={listViewMode} onChange={setListViewMode} />
                </div>
            </div>

            {/* Aviso */}
            <div style={{ background: '#EFF6FF', borderRadius: 10, padding: '10px 14px', border: '1px solid #BFDBFE', fontSize: '0.75rem', color: '#1E40AF' }}>
                📱 <strong>Upload de comprovante:</strong> Após criar a solicitação, o comprovante pode ser anexado pelo app mobile. Clique em <strong>Analisar</strong> para aprovar ou rejeitar.
            </div>

            {/* Seção dedicada: Rejeitados */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #FECACA', overflow: 'hidden' }}>
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FEF2F2' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <XMarkIcon style={{ width: 14, height: 14, color: '#DC2626' }} />
                        <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#7F1D1D' }}>Reembolsos Rejeitados</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFilterStatus('REJECTED')}
                        style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #FCA5A5', background: '#fff', color: '#B91C1C', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                        Ver somente rejeitados
                    </button>
                </div>
                {rejectedList.length === 0 ? (
                    <div style={{ padding: '1rem', fontSize: '0.78rem', color: '#9CA3AF' }}>
                        Nenhum reembolso rejeitado no momento.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: 8, padding: '0.75rem 0.85rem' }}>
                        {rejectedList.slice(0, 6).map((item) => (
                            <div key={item.id} style={{ border: '1px solid #FEE2E2', borderRadius: 12, background: '#FFFDFD', padding: '0.65rem 0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                                    <strong style={{ fontSize: '0.8rem', color: '#111827' }}>{item.employee?.name || '—'}</strong>
                                    <span style={{ fontFamily: 'Orbitron', fontWeight: 800, fontSize: '0.78rem', color: '#B91C1C' }}>{fmtCurr(Number(item.amount))}</span>
                                </div>
                                <div style={{ marginTop: 2, fontSize: '0.74rem', color: '#6B7280' }}>
                                    {CATEGORY_LABELS[item.type || item.category] || item.type} · {item.acao?.nome || 'Sem período'}
                                </div>
                                <div style={{ marginTop: 2, fontSize: '0.72rem', color: '#9CA3AF' }}>
                                    {fmtDate(item.createdAt)} · Motivo: {item.rejectionReason?.trim() || 'Não informado'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
                ) : listViewMode === 'card' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, padding: 14 }}>
                        {items.map((item, idx) => {
                            const st = STATUS_CONFIG[item.status];
                            const expanded = expandedCardId === item.id;
                            return (
                                <div
                                    key={item.id}
                                    className="adm-kpi-card adm-scale-in"
                                    style={{
                                        animationDelay: `${idx * 35}ms`,
                                        background: '#fff',
                                        borderStyle: 'solid',
                                        borderWidth: '1px 1px 1px 4px',
                                        borderLeftColor: st.color,
                                        borderTopColor: `${st.border}55`,
                                        borderRightColor: `${st.border}44`,
                                        borderBottomColor: `${st.border}44`,
                                    }}
                                >
                                    <div className="adm-kpi-grid" />
                                    <div className="adm-kpi-scan" style={{ background: `linear-gradient(90deg, transparent, ${String(st.color)}55, transparent)` }} />
                                    <div className="adm-kpi-topline" style={{ background: `linear-gradient(90deg, transparent, ${st.color}, transparent)` }} />
                                    <div style={{ position: 'relative', zIndex: 1, padding: '14px 14px 10px', cursor: 'pointer' }} onClick={() => setDetailing(item)}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <span style={{ fontWeight: 800, color: '#111827' }}>{item.employee?.name || '—'}</span>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color, fontSize: '0.65rem', fontWeight: 700, border: `1px solid ${st.border}` }}>{st.icon} {st.label}</span>
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: '#6B7280', marginBottom: 6 }}>{CATEGORY_LABELS[item.type || item.category] || item.type}</div>
                                        <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.1rem', color: '#059669', marginBottom: 6 }}>{fmtCurr(Number(item.amount))}</div>
                                        <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Período: {item.acao?.nome || '—'}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontFamily: 'JetBrains Mono', marginTop: 4 }}>{fmtDate(item.createdAt)}</div>
                                        {expanded && (
                                            <div style={{ marginTop: 12 }}>
                                                <EmployeeStyleSectionTitle icon="📁" title="Documentação" color="#3B82F6" />
                                                <EmployeeStyleAttachmentsGrid docs={reimbursementAttachmentDocs(item)} />
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(148,163,184,.2)', padding: '10px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        <button type="button" onClick={() => setDetailing(item)} className="btn-ghost" style={{ fontSize: '0.72rem', fontWeight: 700 }}>Ver</button>
                                        <button type="button" onClick={() => setExpandedCardId(expanded ? null : item.id)} className="btn-ghost" style={{ fontSize: '0.72rem', fontWeight: 700 }}>{expanded ? 'Ocultar doc' : 'Expandir doc'}</button>
                                        {item.status === 'PENDING' && (
                                            <button type="button" onClick={() => setSelected(item)} className="btn-ghost" style={{ fontSize: '0.72rem', fontWeight: 700 }}>Analisar</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
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
                                        <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => setDetailing(item)}>
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
                                            <td style={{ cursor: 'pointer' }} onClick={(e) => e.stopPropagation()}>
                                                <button type="button" onClick={() => setDetailing(item)}
                                                    style={{ padding: '5px 12px', borderRadius: 7, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>
                                                    Ver
                                                </button>
                                                {item.status === 'PENDING' && (
                                                    <button type="button" onClick={() => setSelected(item)}
                                                        style={{ marginLeft: 6, padding: '5px 12px', borderRadius: 7, background: '#FFFDE7', color: '#B89B00', border: '1px solid #FEF08A', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>
                                                        Analisar
                                                    </button>
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

            {selected && (
                <ModalAprovacao
                    item={selected}
                    onClose={() => setSelected(null)}
                    onDone={afterApproveOrReject}
                />
            )}
            {detailing && (() => {
                const st = STATUS_CONFIG[detailing.status];
                const empName = detailing.employee?.name ?? '—';
                const cat = CATEGORY_LABELS[detailing.type || detailing.category] || detailing.type;
                const glow =
                    detailing.status === 'REJECTED'
                        ? 'rgba(220,38,38,0.22)'
                        : detailing.status === 'APPROVED'
                          ? 'rgba(5,150,105,0.2)'
                          : 'rgba(217,119,6,0.22)';
                return (
                    <EmployeeStyleAdminDetailShell
                        onClose={() => setDetailing(null)}
                        accentColor={st.color}
                        accentGlow={glow}
                        initials={initialsFromName(empName)}
                        statusBadge={reimbursementStatusHeaderBadge(detailing.status)}
                        headline={empName}
                        headerTags={(
                            <>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.7rem', borderRadius: 100, background: `${st.color}22`, border: `1px solid ${st.color}55`, fontSize: '0.72rem', fontWeight: 700, color: st.color }}>
                                    💰 {cat}
                                </span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.7rem', borderRadius: 100, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.72rem', fontWeight: 600, color: '#E7E5E4' }}>
                                    📍 {detailing.acao?.nome || 'Sem período vinculado'}
                                </span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.28rem 0.7rem', borderRadius: 100, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '0.72rem', fontWeight: 700, color: '#86EFAC', fontFamily: 'Orbitron, sans-serif' }}>
                                    {fmtCurr(Number(detailing.amount))}
                                </span>
                            </>
                        )}
                        footer={(
                            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                                <button
                                    type="button"
                                    onClick={() => setDetailing(null)}
                                    style={{
                                        flex: detailing.status === 'PENDING' ? 1 : 1,
                                        width: detailing.status === 'PENDING' ? undefined : '100%',
                                        padding: '0.75rem',
                                        borderRadius: 12,
                                        border: '1.5px solid #E2E8F0',
                                        background: 'transparent',
                                        color: '#6B7280',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    ✕ Fechar
                                </button>
                                {detailing.status === 'PENDING' ? (
                                    <button
                                        type="button"
                                        onClick={() => { setSelected(detailing); setDetailing(null); }}
                                        style={{ flex: 2, padding: '0.75rem', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #FFD600, #B89B00)', color: '#000', fontWeight: 900, fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,214,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    >
                                        💵 Analisar reembolso
                                    </button>
                                ) : null}
                            </div>
                        )}
                    >
                        <div>
                            <EmployeeStyleSectionTitle icon="🪪" title="Identificação" color="#6366F1" />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                                <EmployeeStylePill icon="👤" label="Funcionário" value={empName} accent="#6366F1" />
                                <EmployeeStylePill icon="🏷️" label="Categoria" value={cat} accent="#6366F1" />
                                <EmployeeStylePill icon="📆" label="Solicitado em" value={fmtDate(detailing.createdAt)} accent="#6366F1" />
                                <EmployeeStylePill icon="🆔" label="ID do registro" value={`${detailing.id.slice(0, 8)}…`} accent="#6366F1" />
                            </div>
                        </div>
                        <div>
                            <EmployeeStyleSectionTitle icon="🧾" title="Dados da solicitação" color="#7C3AED" />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                                <EmployeeStylePill icon="💵" label="Valor" value={fmtCurr(Number(detailing.amount))} accent="#059669" />
                                <EmployeeStylePill icon="📌" label="Período / ação" value={detailing.acao?.nome || '—'} accent="#7C3AED" />
                            </div>
                            <div style={{ marginTop: '0.75rem', background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: 12, padding: '0.85rem 1rem' }}>
                                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#7C3AED', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Descrição da despesa</div>
                                <div style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.65 }}>{detailing.description}</div>
                            </div>
                        </div>
                        {detailing.status === 'REJECTED' && detailing.rejectionReason?.trim() ? (
                            <div>
                                <EmployeeStyleSectionTitle icon="⚠️" title="Motivo da rejeição" color="#DC2626" />
                                <div style={{ background: 'rgba(220,38,38,0.06)', border: '1.5px solid rgba(248,113,113,0.45)', borderRadius: 14, padding: '1rem 1.1rem', fontSize: '0.88rem', color: '#7F1D1D', lineHeight: 1.65 }}>
                                    {detailing.rejectionReason}
                                </div>
                            </div>
                        ) : null}
                        <div>
                            <EmployeeStyleSectionTitle icon="📁" title="Documentos anexados" color="#3B82F6" />
                            <EmployeeStyleAttachmentsGrid docs={reimbursementAttachmentDocs(detailing)} />
                        </div>
                        <div>
                            <EmployeeStyleSectionTitle icon="🕐" title="Sistema" color="#6B7280" />
                            <EmployeeStylePill icon="🔗" label="Protocolo completo" value={detailing.id} accent="#6B7280" />
                        </div>
                    </EmployeeStyleAdminDetailShell>
                );
            })()}
            {showCriar && (
                <ModalNovoReembolso
                    onClose={() => setShowCriar(false)}
                    onCreated={() => {
                        loadKpis();
                        setFilterStatus('');
                        toast.success('Solicitação criada. Lista em «Todos».');
                    }}
                />
            )}
        </div>
    );
}
