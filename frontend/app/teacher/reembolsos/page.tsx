'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api/client';
import imageCompression from 'browser-image-compression';
import {
    BanknotesIcon,
    CameraIcon,
    PlusIcon,
    XMarkIcon,
    PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
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
    { value: 'CLASSROOM_MATERIAL', label: 'Material de Aula' },
    { value: 'CLEANING_MATERIAL',  label: 'Material de Limpeza' },
    { value: 'FOOD',               label: 'Alimentacao' },
    { value: 'EMERGENCY_REPAIR',   label: 'Reparo Emergencial' },
    { value: 'OTHER',              label: 'Outro' },
];

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string; border: string }> = {
    PENDING:  { label: 'Pendente',  bg: 'rgba(255,214,0,0.12)',  color: '#92400E', border: 'rgba(255,214,0,0.3)' },
    APPROVED: { label: 'Aprovado',  bg: 'rgba(16,185,129,0.12)', color: '#065F46', border: 'rgba(16,185,129,0.3)' },
    REJECTED: { label: 'Rejeitado', bg: 'rgba(239,68,68,0.12)',  color: '#991B1B', border: 'rgba(239,68,68,0.3)' },
};

function fmtCurr(value: number | string) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? 'R$ 0,00' : num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

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

export default function TeacherReembolsos() {
    const [reembolsos, setReembolsos] = useState<any[]>([]);
    const [loading, setLoading]       = useState(true);
    const [showForm, setShowForm]     = useState(false);
    const [mounted, setMounted]       = useState(false);
    const [detailRb, setDetailRb]     = useState<Record<string, unknown> | null>(null);

    // form state
    const [tipo, setTipo]             = useState('FOOD');
    const [valor, setValor]           = useState('');
    const [descricao, setDescricao]   = useState('');
    const [fotoPreview, setFotoPreview] = useState<string | null>(null);
    const [fotoFile, setFotoFile]     = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setMounted(true); loadReembolsos(); }, []);

    async function loadReembolsos() {
        try {
            const res = await api.get('/reimbursements');
            setReembolsos(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
        } catch {
            setReembolsos([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
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

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!valor || parseFloat(valor.replace(',', '.')) <= 0) return;
        setSubmitting(true);
        try {
            let receiptUrl: string | undefined;
            if (fotoFile) {
                try {
                    const urlRes = await api.post('/reimbursements/presigned-url', {
                        filename: fotoFile.name, contentType: fotoFile.type,
                    });
                    await fetch(urlRes.data.uploadUrl, {
                        method: 'PUT', body: fotoFile,
                        headers: { 'Content-Type': fotoFile.type },
                    });
                    receiptUrl = urlRes.data.fileUrl;
                } catch { /* MinIO indisponivel — continua sem URL */ }
            }
            await api.post('/reimbursements', {
                type: tipo,
                amount: parseFloat(valor.replace(',', '.')),
                description: descricao,
                ...(receiptUrl ? { receiptUrl } : {}),
            });
            closeModal();
            loadReembolsos();
        } catch (err: any) {
            console.error('Erro ao enviar reembolso:', err?.response?.data?.message);
        } finally {
            setSubmitting(false);
        }
    }

    function closeModal() {
        setShowForm(false);
        setTipo('FOOD'); setValor(''); setDescricao('');
        setFotoPreview(null); setFotoFile(null);
    }

    const totPendente  = reembolsos.filter(r => r.status === 'PENDING').length;
    const totAprovado  = reembolsos.filter(r => r.status === 'APPROVED').length;
    const totRejeitado = reembolsos.filter(r => r.status === 'REJECTED').length;

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            <AdminHeaderHero
                title="REEMBOLSOS"
                subtitle="Solicite reembolso por despesas de campo"
                rightSlot={(
                    <button onClick={() => setShowForm(true)} className="btn-primary">
                        <PlusIcon style={{ width: 16, height: 16 }} />
                        Nova Solicitação
                    </button>
                )}
            />

            {/* KPIs */}
            {reembolsos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem' }}>
                    {[
                        { label: 'Pendentes',  count: totPendente,  color: '#92400E', bg: '#FFFDE7', border: '#FEF08A' },
                        { label: 'Aprovados',  count: totAprovado,  color: '#065F46', bg: '#F0FDF4', border: '#BBF7D0' },
                        { label: 'Rejeitados', count: totRejeitado, color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },
                    ].map((s, i) => (
                        <AnimatedKpiCard
                            key={i}
                            label={s.label}
                            value={s.count}
                            color={s.color}
                            bg={s.bg}
                            border={s.border}
                            delayMs={i * 80}
                        />
                    ))}
                </div>
            )}

            {/* Lista */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '0.15em', color: '#9CA3AF' }}>CARREGANDO...</p>
                </div>
            ) : reembolsos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB' }}>
                    <BanknotesIcon style={{ width: 48, height: 48, color: '#D1D5DB', margin: '0 auto 1rem' }} />
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: '#9CA3AF' }}>NENHUMA SOLICITACAO</p>
                    <p style={{ fontSize: '0.82rem', color: '#D1D5DB', marginTop: 8 }}>
                        Clique em "Nova Solicitacao" para registrar sua primeira despesa
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <h2 style={{ fontSize: '0.72rem', fontWeight: 800, color: '#B89B00', fontFamily: 'Orbitron', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
                        MINHAS SOLICITACOES
                    </h2>
                    {reembolsos.map((r: any) => {
                        const st   = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
                        const tipo = TIPOS.find(t => t.value === r.type);
                        const data = r.createdAt ? new Date(r.createdAt).toLocaleDateString('pt-BR') : '';
                        return (
                            <div key={r.id} style={{
                                background: '#fff', borderRadius: 12,
                                border: '1px solid #E5E7EB',
                                padding: '1rem 1.25rem',
                                display: 'flex', alignItems: 'center', gap: '1rem',
                                transition: 'all 0.15s',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,214,0,0.4)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'; }}
                            >
                                <div style={{ width: 38, height: 38, borderRadius: 10, background: st.bg, border: `1.5px solid ${st.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <BanknotesIcon style={{ width: 18, height: 18, color: st.color }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.88rem' }}>
                                        {tipo?.label || r.type}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {r.description || 'Sem descricao'} {data && <span style={{ color: '#9CA3AF' }}> &middot; {data}</span>}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: '#111827', fontSize: '0.95rem' }}>
                                        {fmtCurr(r.amount)}
                                    </div>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                                        {st.label}
                                    </span>
                                </div>
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
                const data = r.createdAt ? new Date(r.createdAt).toLocaleDateString('pt-BR') : '—';
                return (
                    <EmployeeStyleAdminDetailShell
                        onClose={() => setDetailRb(null)}
                        accentColor={st.color}
                        accentGlow={reimbursementPortalAccentGlow(r.status)}
                        initials={initialsFromTipoLabel(tipoLabel)}
                        statusBadge={(
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.6rem', borderRadius: 100, fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.08em', background: st.bg, color: st.color, border: `1px solid ${st.border}`, textTransform: 'uppercase' }}>
                                {st.label}
                            </span>
                        )}
                        headline={tipoLabel}
                        headerTags={(
                            <>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.7rem', borderRadius: 100, background: `${st.color}22`, border: `1px solid ${st.border}`, fontSize: '0.72rem', fontWeight: 700, color: st.color }}>
                                    💰 {fmtCurr(r.amount)}
                                </span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.7rem', borderRadius: 100, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.72rem', fontWeight: 600, color: '#E7E5E4' }}>
                                    📅 {data}
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
                                <EmployeeStylePill icon="💵" label="Valor" value={fmtCurr(r.amount)} accent="#059669" />
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

            {/* Modal */}
            {mounted && showForm && createPortal(
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                    onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
                >
                    <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto', animation: 'slideUp 0.2s' }}>

                        {/* Header modal */}
                        <div style={{ padding: '18px 24px 14px', background: '#FFFDE7', borderBottom: '1px solid #FEF08A', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFD600', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <BanknotesIcon style={{ width: 18, height: 18, color: '#000' }} />
                            </div>
                            <div>
                                <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.82rem', fontWeight: 900, color: '#111827', margin: 0 }}>NOVA SOLICITACAO</h2>
                                <p style={{ fontSize: '0.72rem', color: '#92730A', margin: 0 }}>Preencha os dados da despesa</p>
                            </div>
                            <button onClick={closeModal} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '1.2rem' }}>&#x2715;</button>
                        </div>

                        {/* Body modal */}
                        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Tipo de Despesa</label>
                                <select value={tipo} onChange={e => setTipo(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 9, border: '1.5px solid #E5E7EB', fontSize: '0.85rem', color: '#111827', background: '#F9FAFB' }}>
                                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Valor (R$)</label>
                                <input type="number" step="0.01" min="0" placeholder="Ex: 45.90"
                                    value={valor} onChange={e => setValor(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 9, border: '1.5px solid #E5E7EB', fontSize: '0.85rem', color: '#111827', background: '#F9FAFB', boxSizing: 'border-box' }} />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Descricao</label>
                                <textarea rows={3} placeholder="Descreva a despesa com detalhes..."
                                    value={descricao} onChange={e => setDescricao(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 9, border: '1.5px solid #E5E7EB', fontSize: '0.85rem', color: '#111827', background: '#F9FAFB', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                            </div>

                            {/* Upload de comprovante */}
                            <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Comprovante (foto)</label>
                                <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFotoChange} style={{ display: 'none' }} />
                                <button type="button" onClick={() => fileRef.current?.click()} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.55rem 1rem', borderRadius: 9,
                                    background: 'rgba(255,214,0,0.08)',
                                    border: '1px dashed rgba(255,214,0,0.4)',
                                    color: '#B89B00', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                                }}>
                                    <CameraIcon style={{ width: 18, height: 18 }} />
                                    {fotoFile ? 'Trocar foto' : 'Tirar / Selecionar foto'}
                                </button>
                                {fotoPreview && (
                                    <div style={{ position: 'relative', display: 'inline-block', marginTop: '0.75rem' }}>
                                        <img src={fotoPreview} alt="Preview" style={{ maxWidth: 180, maxHeight: 130, borderRadius: 8, objectFit: 'cover', border: '2px solid rgba(255,214,0,0.3)' }} />
                                        <button type="button" onClick={() => { setFotoPreview(null); setFotoFile(null); }}
                                            style={{ position: 'absolute', top: -8, right: -8, background: '#EF4444', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <XMarkIcon style={{ width: 13, height: 13 }} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="button" onClick={closeModal}
                                    style={{ flex: 1, padding: '10px', background: '#F3F4F6', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#6B7280' }}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={submitting || !valor || !descricao}
                                    style={{ flex: 2, padding: '10px', background: '#FFD600', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: submitting || !valor || !descricao ? 0.5 : 1 }}>
                                    {submitting ? <><span className="spinner" style={{ width: 14, height: 14 }} /></> : <><PaperAirplaneIcon style={{ width: 15, height: 15 }} /> Enviar Solicitacao</>}
                                </button>
                            </div>
                        </form>
                        <style>{`@keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
