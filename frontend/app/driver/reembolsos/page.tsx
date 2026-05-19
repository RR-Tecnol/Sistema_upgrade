'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api/client';
import { uploadPublicFile } from '@/lib/uploadPublicFile';
import imageCompression from 'browser-image-compression';
import { toast } from '@/components/ui/Toast';
import { CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import {
    EmployeeStyleAdminDetailShell,
    EmployeeStyleAttachmentsGrid,
    EmployeeStylePill,
    EmployeeStyleSectionTitle,
    portalReimbursementAttachmentDocs,
} from '@/components/admin/employee-style-admin-detail';

const TIPOS = [
    { value: 'FOOD',              label: '🍽️ Alimentação' },
    { value: 'EMERGENCY_REPAIR',  label: '🔧 Reparo Emergencial' },
    { value: 'CLEANING_MATERIAL', label: '🧹 Material de Limpeza' },
    { value: 'CLASSROOM_MATERIAL',label: '📚 Material de Aula' },
    { value: 'OTHER',             label: '📦 Outro' },
];

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
    PENDING:  { label: 'Pendente',  bg: 'rgba(251,191,36,0.12)',  color: '#92400E' },
    APPROVED: { label: 'Aprovado',  bg: 'rgba(16,185,129,0.12)', color: '#065F46' },
    REJECTED: { label: 'Rejeitado', bg: 'rgba(239,68,68,0.12)',  color: '#991B1B' },
};

const CSS = `
@keyframes rmb-fade-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
.rmb-page { animation: rmb-fade-in .3s ease; }
.rmb-card {
    background: #FFFFFF;
    border-radius: 14px;
    padding: 1.1rem 1.25rem;
    border: 1px solid #E5E7EB;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    transition: box-shadow .2s, border-color .2s;
}
.rmb-list { display: flex; flex-direction: column; gap: 1rem; }
.rmb-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); border-color: rgba(255,214,0,0.4); }
.rmb-modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(8px);
    z-index: 100;
    display: flex; align-items: center; justify-content: center; padding: 1rem;
}
.rmb-modal {
    background: #FFFFFF;
    border-radius: 20px;
    padding: 1.75rem;
    width: 100%; max-width: 540px;
    border: 1px solid rgba(0,0,0,0.08);
    box-shadow: 0 8px 40px rgba(0,0,0,0.15);
    max-height: 90vh; overflow-y: auto;
}
.rmb-input {
    width: 100%; padding: 0.75rem 0.9rem;
    border-radius: 10px;
    border: 1.5px solid #E5E7EB;
    background: #F9FAFB;
    color: #111827;
    font-size: 0.9rem;
    box-sizing: border-box;
    margin-bottom: 0.75rem;
    outline: none;
    transition: border-color .18s;
}
.rmb-input:focus { border-color: #FFD600; box-shadow: 0 0 0 3px rgba(255,214,0,0.15); }
.rmb-label {
    font-size: 0.7rem; color: #6B7280; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
    display: block; margin-bottom: 0.35rem;
}
`;

function reimbursementPortalAccentGlow(status: string) {
    switch (status) {
        case 'REJECTED': return 'rgba(220,38,38,0.22)';
        case 'APPROVED': return 'rgba(5,150,105,0.2)';
        default: return 'rgba(217,119,6,0.22)';
    }
}

function initialsFromTipoLabel(label: string) {
    const t = String(label || '').replace(/[^\wÀ-ú]/gi, '').slice(0, 2).toUpperCase();
    return t || 'RB';
}

function fmtCurrDriver(value: number | string) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? 'R$ 0,00' : num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function DriverReembolsos() {
    const [reembolsos, setReembolsos] = useState<any[]>([]);
    const [trips, setTrips]           = useState<any[]>([]);
    const [loading, setLoading]       = useState(true);
    const [showForm, setShowForm]     = useState(false);
    const [saving, setSaving]         = useState(false);
    const [form, setForm]             = useState({ type: 'FOOD', amount: '', description: '' });
    const [mounted, setMounted]       = useState(false);
    const [fotoPreview, setFotoPreview] = useState<string | null>(null);
    const [fotoFile, setFotoFile]     = useState<File | null>(null);
    const fileRef                     = useRef<HTMLInputElement>(null);
    const [detailRb, setDetailRb] = useState<Record<string, unknown> | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [r, t] = await Promise.all([
                api.get('/reimbursements'),
                api.get('/driver/trips?status=IN_TRANSIT').catch(() => ({ data: [] })),
            ]);
            setReembolsos(Array.isArray(r.data) ? r.data : (r.data?.data ?? []));
            setTrips(Array.isArray(t.data) ? t.data : []);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);
    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        const modalOpen = !!(detailRb || showForm);
        document.body.style.overflow = modalOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [detailRb, showForm]);

    const handleSubmit = async () => {
        if (!form.amount || !form.description) return;
        setSaving(true);
        try {
            let receiptUrl: string | undefined;
            if (fotoFile) {
                receiptUrl = await uploadPublicFile(fotoFile);
            }
            await api.post('/reimbursements', {
                type: form.type,
                amount: parseFloat(form.amount.replace(',', '.')),
                description: form.description,
                ...(receiptUrl ? { receiptUrl } : {}),
            });
            setShowForm(false);
            setForm({ type: 'FOOD', amount: '', description: '' });
            setFotoPreview(null); setFotoFile(null);
            load();
            toast.success('Reembolso enviado com sucesso.');
        } catch (e: any) {
            const msg = e?.response?.data?.message || e?.message;
            toast.error(typeof msg === 'string' ? msg : 'Não foi possível enviar o reembolso. Verifique o anexo e tente novamente.');
        } finally { setSaving(false); }
    };

    async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type === 'application/pdf') {
            setFotoFile(file);
            setFotoPreview('PDF');
            return;
        }

        try {
            const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true });
            setFotoFile(compressed as unknown as File);
            const reader = new FileReader();
            reader.onload = ev => setFotoPreview(ev.target?.result as string);
            reader.readAsDataURL(compressed);
        } catch {
            setFotoFile(file);
            const reader = new FileReader();
            reader.onload = ev => setFotoPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        }
    }

    return (
        <>
        <style>{CSS}</style>
        <div className="rmb-page animate-fade-in" style={{ width: '100%', maxWidth: '100%', margin: '0 auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            <AdminHeaderHero
                title="REEMBOLSOS"
                subtitle="Solicite e acompanhe seus pedidos de reembolso"
                badge="MOTORISTA"
                rightSlot={<button onClick={() => setShowForm(true)} className="btn-primary">+ Novo</button>}
            />

            {/* Resumo rápido */}
            {reembolsos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem' }}>
                    {[
                        { label: 'Pendentes', count: reembolsos.filter(r => r.status === 'PENDING').length, color: '#92400E', bg: '#FFFDE7', border: '#FEF08A' },
                        { label: 'Aprovados', count: reembolsos.filter(r => r.status === 'APPROVED').length, color: '#065F46', bg: '#F0FDF4', border: '#BBF7D0' },
                        { label: 'Rejeitados', count: reembolsos.filter(r => r.status === 'REJECTED').length, color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },
                    ].map((s, i) => (
                        <AnimatedKpiCard key={i} label={s.label} value={s.count} color={s.color} bg={s.bg} border={s.border} compact />
                    ))}
                </div>
            )}

            {/* Lista */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
                    Carregando reembolsos...
                </div>
            ) : reembolsos.length === 0 ? (
                <div className="rmb-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💰</div>
                    <div style={{ color: '#9CA3AF', fontSize: '0.85rem', fontWeight: 600 }}>
                        Nenhum reembolso solicitado
                    </div>
                    <p style={{ color: '#D1D5DB', fontSize: '0.75rem', marginTop: '0.4rem' }}>
                        Clique em &quot;+ Novo&quot; para solicitar seu primeiro reembolso
                    </p>
                </div>
            ) : (
                <div className="rmb-list">
                {reembolsos.map((r: any) => {
                const st   = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
                const tipo = TIPOS.find(t => t.value === r.type);
                const data = r.createdAt ? new Date(r.createdAt).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' }) : '';
                return (
                    <div key={r.id} className="rmb-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.92rem', marginBottom: '0.2rem' }}>
                                    {tipo?.label || r.type}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.4rem' }}>
                                    {r.description}
                                </div>
                                {data && <div style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>📅 {data}</div>}
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '1rem' }}>
                                <div style={{ fontFamily: 'Orbitron, monospace', fontWeight: 900, color: '#111827', fontSize: '1.05rem', marginBottom: '0.3rem' }}>
                                    R$ {Number(r.amount).toFixed(2)}
                                </div>
                                <span style={{
                                    fontSize: '0.65rem', fontWeight: 700,
                                    color: st.color, background: st.bg,
                                    padding: '0.2rem 0.6rem', borderRadius: 20,
                                    letterSpacing: '0.06em', whiteSpace: 'nowrap',
                                }}>
                                    {st.label}
                                </span>
                            </div>
                        </div>
                        {r.rejectionReason && (
                            <div style={{
                                fontSize: '0.72rem', color: '#991B1B',
                                background: 'rgba(239,68,68,0.08)',
                                padding: '0.4rem 0.7rem', borderRadius: 8, marginTop: '0.6rem',
                                borderLeft: '3px solid #EF4444',
                            }}>
                                ❌ Motivo: {r.rejectionReason}
                            </div>
                        )}
                        <div style={{ marginTop: 10 }}>
                            <button type="button" onClick={() => setDetailRb(r)} style={{ padding: '0.35rem 0.7rem', borderRadius: 8, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#1D4ED8', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                                Ver detalhes
                            </button>
                        </div>
                    </div>
                );
            })}
                </div>
            )}

            </div>

            {detailRb && (() => {
                const r = detailRb as {
                    id: string;
                    type: string;
                    status: string;
                    amount: number;
                    description?: string;
                    createdAt?: string;
                    receiptUrl?: string | null;
                    rejectionReason?: string | null;
                    acao?: { nome?: string } | null;
                };
                const st = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
                const tipo = TIPOS.find(t => t.value === r.type);
                const tipoLabel = tipo?.label || r.type;
                const data = r.createdAt ? new Date(r.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
                return (
                    <EmployeeStyleAdminDetailShell
                        onClose={() => setDetailRb(null)}
                        accentColor={st.color}
                        accentGlow={reimbursementPortalAccentGlow(r.status)}
                        initials={initialsFromTipoLabel(tipoLabel)}
                        statusBadge={(
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.6rem', borderRadius: 100, fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.08em', background: st.bg, color: st.color, textTransform: 'uppercase' }}>
                                {st.label}
                            </span>
                        )}
                        headline={tipoLabel}
                        headerTags={(
                            <>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.7rem', borderRadius: 100, background: `${st.color}22`, border: `1px solid ${st.color}55`, fontSize: '0.72rem', fontWeight: 700, color: st.color }}>
                                    💰 {fmtCurrDriver(r.amount)}
                                </span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.7rem', borderRadius: 100, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.72rem', fontWeight: 600, color: '#E7E5E4' }}>
                                    📅 {data}
                                </span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.28rem 0.7rem', borderRadius: 100, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '0.72rem', fontWeight: 700, color: '#CBD5E1' }}>
                                    🚗 Portal motorista
                                </span>
                            </>
                        )}
                        footer={(
                            <button
                                type="button"
                                onClick={() => setDetailRb(null)}
                                style={{
                                    width: '100%',
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
                        )}
                    >
                        <div>
                            <EmployeeStyleSectionTitle icon="📋" title="Resumo" color="#B89B00" />
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem' }}>
                                <EmployeeStylePill icon="💵" label="Valor" value={fmtCurrDriver(r.amount)} accent="#059669" />
                                <EmployeeStylePill icon="📆" label="Solicitado em" value={data} accent="#6366F1" />
                                <EmployeeStylePill icon="🏷️" label="Categoria" value={tipoLabel} accent="#7C3AED" />
                                {r.acao?.nome ? <EmployeeStylePill icon="📍" label="Período / ação" value={r.acao.nome} accent="#0891B2" /> : null}
                            </div>
                        </div>
                        <div>
                            <EmployeeStyleSectionTitle icon="🧾" title="Descrição" color="#7C3AED" />
                            <div style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: 12, padding: '0.85rem 1rem', fontSize: '0.88rem', color: '#374151', lineHeight: 1.65 }}>
                                {r.description?.trim() || '—'}
                            </div>
                        </div>
                        {r.rejectionReason?.trim() ? (
                            <div>
                                <EmployeeStyleSectionTitle icon="⚠️" title="Motivo da rejeição" color="#DC2626" />
                                <div style={{ background: 'rgba(220,38,38,0.06)', border: '1.5px solid rgba(248,113,113,0.45)', borderRadius: 14, padding: '1rem 1.1rem', fontSize: '0.88rem', color: '#7F1D1D', lineHeight: 1.65 }}>
                                    {r.rejectionReason}
                                </div>
                            </div>
                        ) : null}
                        <div>
                            <EmployeeStyleSectionTitle icon="📁" title="Comprovante" color="#3B82F6" />
                            <EmployeeStyleAttachmentsGrid docs={portalReimbursementAttachmentDocs(r.id, r.receiptUrl)} />
                        </div>
                    </EmployeeStyleAdminDetailShell>
                );
            })()}

            {/* Modal Novo Reembolso */}
            {mounted && showForm && createPortal(
                <div className="rmb-modal-overlay"
                    onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
                    <div className="rmb-modal">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <div>
                                <div style={{ fontFamily: 'Orbitron', fontWeight: 800, color: '#111827', fontSize: '1rem' }}>
                                    💰 Novo Reembolso
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.2rem' }}>
                                    Preencha os dados da despesa
                                </div>
                            </div>
                            <button onClick={() => setShowForm(false)} style={{
                                background: '#F3F4F6', border: 'none', borderRadius: 8,
                                width: 32, height: 32, cursor: 'pointer', fontSize: '1rem', color: '#6B7280',
                            }}>✕</button>
                        </div>

                        <label className="rmb-label">Tipo de despesa</label>
                        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                            className="rmb-input" style={{ appearance: 'none' }}>
                            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>

                        <label className="rmb-label">Valor (R$)</label>
                        <input type="number" inputMode="decimal" step="0.01" min="0" placeholder="Ex: 45.90"
                            value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                            className="rmb-input" />

                        <label className="rmb-label">Descrição</label>
                        <textarea rows={3} placeholder="Descreva a despesa com detalhes..."
                            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                            className="rmb-input" style={{ resize: 'vertical' }} />

                        {/* Upload de comprovante */}
                        <label className="rmb-label">Comprovante (opcional)</label>
                        <input ref={fileRef} type="file" accept="image/*,application/pdf" capture="environment" onChange={handleFotoChange} style={{ display: 'none' }} />
                        <button type="button" onClick={() => fileRef.current?.click()} style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.55rem 1rem', borderRadius: 9, marginBottom: '0.75rem',
                            background: 'rgba(255,214,0,0.08)', border: '1px dashed rgba(255,214,0,0.4)',
                            color: '#B89B00', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                        }}>
                            <CameraIcon style={{ width: 16, height: 16 }} />
                            {fotoFile ? 'Trocar comprovante' : 'Tirar / Selecionar foto'}
                        </button>
                        {fotoPreview && (
                            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.75rem' }}>
                                {fotoPreview === 'PDF' ? (
                                    <div style={{ width: 100, height: 130, borderRadius: 8, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,214,0,0.3)', color: '#DC2626', fontWeight: 800 }}>PDF</div>
                                ) : (
                                    <img src={fotoPreview} alt="Preview" style={{ maxWidth: 180, maxHeight: 130, borderRadius: 8, objectFit: 'cover', border: '2px solid rgba(255,214,0,0.3)' }} />
                                )}
                                <button type="button" onClick={() => { setFotoPreview(null); setFotoFile(null); }}
                                    style={{ position: 'absolute', top: -8, right: -8, background: '#EF4444', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <XMarkIcon style={{ width: 13, height: 13 }} />
                                </button>
                            </div>
                        )}

                        {trips.length > 0 && (
                            <>
                                <label className="rmb-label">Vincular à viagem (opcional)</label>
                                <select className="rmb-input" style={{ appearance: 'none' }}>
                                    <option value="">Sem vínculo</option>
                                    {trips.map((t: any) => (
                                        <option key={t.id} value={t.id}>
                                            {t.originCity?.name} → {t.destinationCity?.name}
                                        </option>
                                    ))}
                                </select>
                            </>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <button onClick={() => setShowForm(false)} style={{
                                flex: 1, padding: '0.8rem', borderRadius: 10,
                                border: '1.5px solid #E5E7EB', background: '#F9FAFB',
                                color: '#6B7280', cursor: 'pointer', fontWeight: 600,
                            }}>Cancelar</button>
                            <button onClick={handleSubmit}
                                disabled={saving || !form.amount || !form.description}
                                style={{
                                    flex: 2, padding: '0.8rem', borderRadius: 10, border: 'none',
                                    background: 'linear-gradient(135deg,#FFD600,#F59E0B)',
                                    color: '#0F172A', cursor: 'pointer', fontWeight: 800,
                                    opacity: saving || !form.amount || !form.description ? 0.5 : 1,
                                    boxShadow: '0 4px 12px rgba(255,214,0,0.3)',
                                }}>
                                {saving ? 'Enviando...' : '💾 Enviar Solicitação'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
        </>
    );
}
