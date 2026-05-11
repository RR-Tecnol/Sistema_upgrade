'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeftIcon, BanknotesIcon, EnvelopeIcon, PhoneIcon, UserCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api/client';
import { pipelineBadgeForFeedback } from '@/lib/feedbackPipelineBadge';
import { toast } from '@/components/ui/Toast';
import ApproveFeedbackPixModal from '@/components/admin/ApproveFeedbackPixModal';
import AdminStudentProfileModal from '@/components/admin/AdminStudentProfileModal';
import { createPortal } from 'react-dom';

const CURRENT_STATUS_LABELS: Record<string, string> = {
    EMPLOYED_CLT: 'Empregado CLT', EMPLOYED_PJ: 'Empregado PJ',
    SELF_EMPLOYED: 'Autônomo', STUDYING: 'Estudando',
    UNEMPLOYED_LOOKING: 'Desempregado (buscando)', OTHER: 'Outro',
};

interface FeedbackDetail {
    id: string;
    status: string;
    ratingCourse: number | null;
    ratingSystem: number | null;
    ratingManagement: number | null;
    ratingTeachers: number | null;
    ratingGeneral: number | null;
    commentPositive: string | null;
    commentImprovement: string | null;
    commentGeneral: string | null;
    currentStatus: string | null;
    currentStatusDetails: string | null;
    currentPhotoUrl: string | null;
    currentVideoUrl: string | null;
    pixKeyType: string | null;
    pixKey: string | null;
    pixAmount: number | null;
    invitedAt: string;
    submittedAt: string | null;
    reviewedAt: string | null;
    rejectionReason: string | null;
    revertReason: string | null;
    reminderCount: number;
    sharedOnSocial?: boolean;
    socialPostPlatform?: 'LINKEDIN' | 'WHATSAPP' | null;
    socialPostUrl?: string | null;
    socialPostProofUrl?: string | null;
    socialPostedAt?: string | null;
    rewardStatus?: 'PENDING' | 'PAID' | 'CANCELLED' | null;
    rewardPaidAt?: string | null;
    rewardPaymentReference?: string | null;
    contaPagarId?: string | null;
    student: {
        id: string;
        user: { name: string; email: string; phone: string | null };
        contact?: { phone: string; email: string };
    };
    class: { id: string; course: { name: string; workloadHours: number }; city?: { name: string; state: string } };
    certificate: { id: string; verificationCode: string; issuedAt: string; fileUrl: string } | null;
    contaPagar: { id: string; status: string; valor: number; data_pagamento: string | null } | null;
}

function RejectModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (reason: string) => void }) {
    const [reason, setReason] = useState('');
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);
    if (!mounted) return null;
    return createPortal(
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, #DC2626, #B91C1C)' }}>
                    <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#fff' }}>❌ Rejeitar Feedback</h3>
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#374151', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>📝 Motivo (obrigatório)</label>
                        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Ex: Post social não encontrado, evidências insuficientes..." style={{ width: '100%', padding: '0.7rem 0.85rem', borderRadius: 10, border: '2px solid #E5E7EB', fontSize: '0.88rem', background: '#F9FAFB', resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={onClose} style={{ flex: 1, padding: '0.75rem', background: '#F3F4F6', border: '2px solid #E5E7EB', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: '#6B7280' }}>Cancelar</button>
                        <button onClick={() => onConfirm(reason)} disabled={reason.trim().length < 5}
                            style={{ flex: 2, padding: '0.75rem', background: reason.trim().length >= 5 ? 'linear-gradient(135deg, #DC2626, #B91C1C)' : '#E5E7EB', border: 'none', borderRadius: 12, cursor: reason.trim().length >= 5 ? 'pointer' : 'not-allowed', fontWeight: 800, fontSize: '0.85rem', color: '#fff' }}>Rejeitar</button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}

function RevertModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (reason: string) => void }) {
    const [reason, setReason] = useState('');
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);
    if (!mounted) return null;
    return createPortal(
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, #EA580C, #C2410C)' }}>
                    <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#fff' }}>↩️ Reverter Aprovação</h3>
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem 1rem', borderRadius: 12, background: '#FFF7ED', border: '1.5px solid rgba(234,88,12,0.3)', fontSize: '0.78rem', color: '#EA580C', lineHeight: 1.5 }}>
                        ⚠️ A ContaPagar vinculada será cancelada. Esta ação é irreversível.
                    </div>
                    <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#374151', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>📝 Motivo (obrigatório)</label>
                        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Informe o motivo da reversão..." style={{ width: '100%', padding: '0.7rem 0.85rem', borderRadius: 10, border: '2px solid #E5E7EB', fontSize: '0.88rem', background: '#F9FAFB', resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={onClose} style={{ flex: 1, padding: '0.75rem', background: '#F3F4F6', border: '2px solid #E5E7EB', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: '#6B7280' }}>Cancelar</button>
                        <button onClick={() => onConfirm(reason)} disabled={reason.trim().length < 5}
                            style={{ flex: 2, padding: '0.75rem', background: reason.trim().length >= 5 ? 'linear-gradient(135deg, #EA580C, #C2410C)' : '#E5E7EB', border: 'none', borderRadius: 12, cursor: reason.trim().length >= 5 ? 'pointer' : 'not-allowed', fontWeight: 800, fontSize: '0.85rem', color: '#fff' }}>Reverter</button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}

export default function AdminFeedbackDetail() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [fb, setFb] = useState<FeedbackDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [showApprove, setShowApprove] = useState(false);
    const [showReject, setShowReject] = useState(false);
    const [showRevert, setShowRevert] = useState(false);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [postProofUrl, setPostProofUrl] = useState<string | null>(null);
    const [photoZoom, setPhotoZoom] = useState(false);
    const [postProofZoom, setPostProofZoom] = useState(false);
    const [downloading, setDownloading] = useState<'photo' | 'video' | 'postProof' | null>(null);
    const [profileOpen, setProfileOpen] = useState(false);

    const load = async () => {
        try { setLoading(true); const r = await api.get(`/feedbacks/${id}`); setFb(r.data); }
        catch { toast.error('Feedback não encontrado'); router.push('/admin/feedbacks'); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (id) load(); }, [id]);

    useEffect(() => {
        if (!fb?.id) return;
        let cancelled = false;
        const fetchMedia = async (kind: 'photo' | 'video' | 'postProof', key: string | null | undefined, setter: (u: string | null) => void) => {
            if (!key) { setter(null); return; }
            try {
                const r = await api.get(`/feedbacks/${fb.id}/media-url`, { params: { kind } });
                if (!cancelled) setter(r.data?.url ?? null);
            } catch { if (!cancelled) setter(null); }
        };
        fetchMedia('photo', fb.currentPhotoUrl, setPhotoUrl);
        fetchMedia('video', fb.currentVideoUrl, setVideoUrl);
        fetchMedia('postProof', fb.socialPostProofUrl, setPostProofUrl);
        return () => { cancelled = true; };
    }, [fb?.id, fb?.currentPhotoUrl, fb?.currentVideoUrl, fb?.socialPostProofUrl]);

    const handleApproveContent = async () => {
        if (!window.confirm('Aceitar o envio como válido na triagem administrativa? O aluno será notificado. O passo seguinte é confirmar o valor do PIX e gerar Conta a pagar.')) return;
        try {
            setProcessing(true);
            await api.patch(`/feedbacks/${id}/approve-content`);
            toast.success('Triagem aceite. Confirme agora o PIX para gerar Conta a pagar.');
            load();
        } catch (e: unknown) {
            const msg = e && typeof e === 'object' && 'response' in e ? (e as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
            toast.error(msg || 'Erro');
        } finally {
            setProcessing(false);
        }
    };

    const handleApprovePixAndConta = async (amount: number) => {
        try {
            setProcessing(true);
            await api.patch(`/feedbacks/${id}/approve`, { pixAmount: amount });
            toast.success('Conta a Pagar criada e feedback aprovado.');
            setShowApprove(false);
            load();
        } catch (e: unknown) {
            const msg = e && typeof e === 'object' && 'response' in e ? (e as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
            toast.error(msg || 'Erro');
        } finally {
            setProcessing(false);
        }
    };
    /*
     * FUTURE_DEPLOY: PIX em lote — `approve-for-batch`.
     * const handleApproveForBatch = async () => { ... await api.patch(`/feedbacks/${id}/approve-for-batch`); ... };
     */
    const handleReject = async (reason: string) => {
        try { setProcessing(true); await api.patch(`/feedbacks/${id}/reject`, { rejectionReason: reason }); toast.success('Feedback rejeitado.'); setShowReject(false); load(); }
        catch (e: any) { toast.error(e?.response?.data?.message || 'Erro'); } finally { setProcessing(false); }
    };
    const handleRevert = async (reason: string) => {
        try { setProcessing(true); await api.patch(`/feedbacks/${id}/revert`, { revertReason: reason }); toast.success('Aprovação revertida.'); setShowRevert(false); load(); }
        catch (e: any) { toast.error(e?.response?.data?.message || 'Erro'); } finally { setProcessing(false); }
    };
    const handleMarkRewardPaid = async () => {
        const ref = window.prompt('Referência do pagamento (opcional)', '');
        if (ref === null) return;
        try { setProcessing(true); await api.patch(`/feedbacks/${id}/reward/mark-paid`, { paymentReference: ref.trim() || undefined }); toast.success('Recompensa marcada como paga.'); load(); }
        catch (e: any) { toast.error(e?.response?.data?.message || 'Erro'); } finally { setProcessing(false); }
    };
    const handleCancelReward = async () => {
        const reason = window.prompt('Motivo do cancelamento (post fake suspeito, etc.)', '');
        if (reason === null || !reason.trim()) { toast.error('Informe um motivo para cancelar a recompensa'); return; }
        if (!window.confirm('Cancelar esta recompensa PIX em lote? O feedback continua existindo, mas não será pago.')) return;
        try { setProcessing(true); await api.patch(`/feedbacks/${id}/reward/cancel`, { reason }); toast.success('Recompensa cancelada.'); load(); }
        catch (e: any) { toast.error(e?.response?.data?.message || 'Erro'); } finally { setProcessing(false); }
    };
    const handleDownload = async (kind: 'photo' | 'video' | 'postProof') => {
        try {
            setDownloading(kind);
            const r = await api.get(`/feedbacks/${id}/media-url`, { params: { kind, download: 1 } });
            const url = r.data?.url;
            if (!url) { toast.error('Mídia indisponível para download.'); return; }
            const a = document.createElement('a'); a.href = url; a.rel = 'noopener';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        } catch (e: any) { toast.error(e?.response?.data?.message || 'Erro ao baixar mídia'); }
        finally { setDownloading(null); }
    };

    const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const pixKeyTypeLabel = fb?.pixKeyType === 'CPF'
        ? 'CPF'
        : fb?.pixKeyType === 'EMAIL'
            ? 'E-mail'
            : fb?.pixKeyType === 'PHONE'
                ? 'Telefone'
                : fb?.pixKeyType === 'RANDOM'
                    ? 'Chave aleatória'
                    : 'Tipo não informado';
    const pixKeySafe = fb?.pixKey?.trim() ? fb.pixKey.trim() : 'Chave não informada';

    if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><div className="spinner" style={{ margin: '0 auto 1rem', width: 40, height: 40 }} /></div>;
    if (!fb) return null;

    const pipelineBadge = pipelineBadgeForFeedback({
        status: fb.status,
        rewardStatus: fb.rewardStatus ?? undefined,
        contaPagar: fb.contaPagar,
    });
    const isSubmitted = fb.status === 'SUBMITTED';
    const isContentApproved = fb.status === 'CONTENT_APPROVED';
    const isApproved = fb.status === 'APPROVED';
    const canRevert = isApproved && !(fb.contaPagar && fb.contaPagar.status === 'paga');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 800, margin: '0 auto' }} className="animate-fade-in">
            <button onClick={() => router.push('/admin/feedbacks')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#6B7280', fontWeight: 600 }}>
                <ArrowLeftIcon style={{ width: 16, height: 16 }} /> Voltar para lista
            </button>

            {/* Header — alinhado à lista admin (pipeline + cartão neutro) */}
            <div
                style={{
                    borderRadius: 16,
                    background: '#fff',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
                    padding: '1.25rem 1.5rem',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ minWidth: 0, flex: '1 1 240px' }}>
                        <div
                            style={{
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                color: '#9CA3AF',
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                                marginBottom: 6,
                            }}
                        >
                            Detalhe do feedback
                        </div>
                        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>{fb.student.user.name}</h2>
                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                columnGap: '1rem',
                                rowGap: '0.5rem',
                                marginTop: 10,
                                fontSize: '0.82rem',
                                color: '#64748B',
                            }}
                        >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <EnvelopeIcon style={{ width: 16, height: 16, flexShrink: 0, color: '#94A3B8' }} aria-hidden />
                                {fb.student.user.email}
                            </span>
                            {fb.student.user.phone ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <PhoneIcon style={{ width: 16, height: 16, flexShrink: 0, color: '#94A3B8' }} aria-hidden />
                                    {fb.student.user.phone}
                                </span>
                            ) : null}
                        </div>
                    </div>
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.3rem 0.65rem',
                            borderRadius: 100,
                            background: pipelineBadge.bg,
                            border: `1px solid ${pipelineBadge.border}`,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: pipelineBadge.color,
                            flexShrink: 0,
                        }}
                    >
                        {pipelineBadge.icon} {pipelineBadge.label}
                    </span>
                </div>

                {/* Perfil completo do aluno (mesmo padrão clicável da Central de Frequência / funcionários) */}
                <button
                    type="button"
                    onClick={() => setProfileOpen(true)}
                    className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl border-2 border-amber-400/55 bg-gradient-to-r from-amber-50/95 to-white px-4 py-3 text-left shadow-sm transition hover:border-amber-500 hover:shadow-md"
                >
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/25 text-amber-900">
                            <UserCircleIcon className="h-6 w-6" aria-hidden />
                        </span>
                        <div className="min-w-0">
                            <div className="font-orbitron text-[0.62rem] font-black uppercase tracking-[0.12em] text-amber-900">
                                Área do aluno
                            </div>
                            <div className="text-sm font-bold text-slate-900">Ver cadastro completo</div>
                            <div className="text-xs text-slate-600">
                                Dados pessoais, endereço, socioeconómico, documentos, imagens, matrículas e certificados
                            </div>
                        </div>
                    </div>
                    <span className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-amber-300">
                        Abrir
                    </span>
                </button>
            </div>

            <AdminStudentProfileModal
                open={profileOpen}
                onClose={() => setProfileOpen(false)}
                studentId={fb.student?.id ?? null}
                highlightClassId={fb.class?.id ?? null}
            />

            {/* ── Triagem: envio aguardando análise ── */}
            {isSubmitted && (
                <div style={{
                    borderRadius: 20, overflow: 'hidden',
                    border: '2px solid #2563EB30',
                    boxShadow: '0 4px 24px rgba(37,99,235,0.08)',
                }}>
                    <div style={{
                        padding: '1rem 1.5rem',
                        background: 'linear-gradient(135deg, #1e40af 0%, #2563EB 100%)',
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>📋</span>
                        <div>
                            <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.85rem', color: '#fff', letterSpacing: '0.04em' }}>
                                AGUARDANDO TRIAGEM
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                                Verifique foto, vídeo, post social e comentários. Aceite só se estiver conforme os requisitos.
                            </div>
                        </div>
                    </div>

                    <div style={{ background: '#F8FAFF', padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                        <button
                            type="button"
                            onClick={handleApproveContent}
                            disabled={processing}
                            style={{
                                padding: '1rem 1.1rem', borderRadius: 16, cursor: processing ? 'not-allowed' : 'pointer',
                                background: '#fff', textAlign: 'left',
                                border: '2px solid rgba(124,58,237,0.35)',
                                boxShadow: '0 2px 12px rgba(124,58,237,0.1)',
                                transition: 'all 0.15s',
                                display: 'flex', flexDirection: 'column', gap: '0.4rem',
                            }}
                        >
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#7C3AED' }}>Aceitar envio na triagem</span>
                            <span style={{ fontSize: '0.7rem', color: '#374151', lineHeight: 1.5 }}>
                                Prossegue para o próximo passo (confirmação do valor PIX e Contas a pagar). O aluno é notificado.
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowReject(true)}
                            disabled={processing}
                            style={{
                                padding: '1rem 1.1rem', borderRadius: 16, cursor: 'pointer',
                                background: '#fff', textAlign: 'left',
                                border: '2px solid rgba(220,38,38,0.2)',
                                boxShadow: '0 2px 12px rgba(220,38,38,0.06)',
                                display: 'flex', flexDirection: 'column', gap: '0.4rem',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <XMarkIcon style={{ width: 20, height: 20, color: '#DC2626' }} />
                                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#DC2626' }}>Rejeitar envio</span>
                            </div>
                            <span style={{ fontSize: '0.7rem', color: '#374151', lineHeight: 1.5 }}>
                                O aluno será notificado com o motivo e poderá reenviar o feedback do zero.
                            </span>
                        </button>
                    </div>

                    <div style={{ padding: '0.75rem 1.5rem', background: '#EFF6FF', borderTop: '1px solid #BFDBFE', fontSize: '0.74rem', color: '#1d4ed8', lineHeight: 1.5 }}>
                        💡 Revise comentários, foto, vídeo e print do post antes de aceitar.
                    </div>
                </div>
            )}

            {/* ── Após triagem: confirmar PIX / Contas a pagar ── */}
            {isContentApproved && (
                <div style={{
                    borderRadius: 20, overflow: 'hidden',
                    border: '2px solid rgba(124,58,237,0.35)',
                    boxShadow: '0 4px 24px rgba(124,58,237,0.08)',
                }}>
                    <div style={{ padding: '1rem 1.5rem', background: 'linear-gradient(135deg, #6D28D9 0%, #7C3AED 100%)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>💳</span>
                        <div>
                            <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.85rem', color: '#fff', letterSpacing: '0.04em' }}>
                                CONFIRMAR PIX
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                                Triagem aceita. Informe o valor e gere a Conta a pagar.
                            </div>
                        </div>
                    </div>
                    <div style={{ background: '#FAF5FF', padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                        <button
                            type="button"
                            onClick={() => setShowApprove(true)}
                            disabled={processing}
                            style={{
                                padding: '1rem 1.1rem', borderRadius: 16, cursor: 'pointer',
                                background: '#fff', textAlign: 'left',
                                border: '2px solid rgba(16,185,129,0.3)',
                                boxShadow: '0 2px 12px rgba(16,185,129,0.1)',
                                display: 'flex', flexDirection: 'column', gap: '0.4rem',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <BanknotesIcon style={{ width: 20, height: 20, color: '#059669' }} />
                                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#059669' }}>Confirmar valor e gerar Conta a pagar</span>
                            </div>
                            <span style={{ fontSize: '0.7rem', color: '#374151' }}>Valor personalizado · vê notificação ao aluno após criar o lançamento.</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowReject(true)}
                            disabled={processing}
                            style={{
                                padding: '1rem 1.1rem', borderRadius: 16, cursor: 'pointer',
                                background: '#fff', textAlign: 'left',
                                border: '2px solid rgba(220,38,38,0.2)',
                                display: 'flex', flexDirection: 'column', gap: '0.4rem',
                            }}
                        >
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#DC2626' }}>Rejeitar mesmo após triagem</span>
                            <span style={{ fontSize: '0.68rem', color: '#64748B' }}>Corrige inconsistências detectadas só no passo financeiro.</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Botão Reverter — só para APPROVED com ContaPagar não paga */}
            {canRevert && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowRevert(true)} disabled={processing}
                        style={{ padding: '0.65rem 1.25rem', borderRadius: 12, border: '2px solid rgba(234,88,12,0.3)', background: '#FFF7ED', color: '#EA580C', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                        ↩️ Reverter Aprovação
                    </button>
                </div>
            )}

            {/* Course & Certificate */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                <div style={{ padding: '1rem 1.25rem', borderRadius: 14, background: '#fff', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>📚 Curso</div>
                    <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{fb.class.course.name}</div>
                    {fb.class.city && <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>📍 {fb.class.city.name}/{fb.class.city.state}</div>}
                    <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 4 }}>⏱️ {fb.class.course.workloadHours}h · Certificado: {fb.certificate?.verificationCode ?? '—'}</div>
                </div>
                <div style={{ padding: '1rem 1.25rem', borderRadius: 14, background: '#fff', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>📅 Timeline</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.78rem' }}>
                        <div style={{ color: '#374151' }}><strong>Convite:</strong> {fmt(fb.invitedAt)}</div>
                        {fb.submittedAt && <div style={{ color: '#374151' }}><strong>Submetido:</strong> {fmt(fb.submittedAt)}</div>}
                        {fb.reviewedAt && <div style={{ color: '#374151' }}><strong>Revisado:</strong> {fmt(fb.reviewedAt)}</div>}
                        <div style={{ color: '#9CA3AF' }}>Lembretes enviados: {fb.reminderCount}</div>
                    </div>
                </div>
            </div>

            {/* Avaliações — mesmo padrão visual dos KPIs admin (tarja + tipografia) */}
            {fb.ratingGeneral && (
                <div
                    style={{
                        padding: '1.25rem',
                        borderRadius: 14,
                        background: '#fff',
                        border: '1px solid #E5E7EB',
                        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                    }}
                >
                    <div
                        style={{
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            color: '#9CA3AF',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            marginBottom: 14,
                        }}
                    >
                        Avaliações
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))', gap: '0.75rem' }}>
                        {[
                            { label: 'Curso', value: fb.ratingCourse },
                            { label: 'Instrutores', value: fb.ratingTeachers },
                            { label: 'Gestão', value: fb.ratingManagement },
                            { label: 'Sistema', value: fb.ratingSystem },
                            { label: 'Geral', value: fb.ratingGeneral },
                        ].map((r, i) => (
                            <div
                                key={i}
                                style={{
                                    padding: '0.85rem 1rem',
                                    borderRadius: 12,
                                    background: '#FAFAFA',
                                    border: '1px solid #E5E7EB',
                                    borderLeft: '3px solid #FFD600',
                                    textAlign: 'left',
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: '0.62rem',
                                        fontWeight: 800,
                                        letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                        color: '#64748B',
                                        marginBottom: 6,
                                    }}
                                >
                                    {r.label}
                                </div>
                                <div
                                    style={{
                                        fontSize: '1.35rem',
                                        fontWeight: 800,
                                        color: '#0F172A',
                                        fontFamily: 'Orbitron, sans-serif',
                                        lineHeight: 1.1,
                                    }}
                                >
                                    {r.value ?? '—'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Comments */}
            {(fb.commentPositive || fb.commentImprovement || fb.commentGeneral) && (
                <div style={{ padding: '1.25rem', borderRadius: 14, background: '#fff', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>💬 Comentários</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {fb.commentPositive && <div><div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669', marginBottom: 4 }}>😊 Positivo</div><p style={{ margin: 0, fontSize: '0.85rem', color: '#374151', lineHeight: 1.6 }}>{fb.commentPositive}</p></div>}
                        {fb.commentImprovement && <div><div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#EA580C', marginBottom: 4 }}>💡 Melhoria</div><p style={{ margin: 0, fontSize: '0.85rem', color: '#374151', lineHeight: 1.6 }}>{fb.commentImprovement}</p></div>}
                        {fb.commentGeneral && <div><div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563EB', marginBottom: 4 }}>📝 Geral</div><p style={{ margin: 0, fontSize: '0.85rem', color: '#374151', lineHeight: 1.6 }}>{fb.commentGeneral}</p></div>}
                    </div>
                </div>
            )}

            {/* Situação atual + PIX */}
            {(fb.currentStatus || fb.pixKey || fb.pixKeyType || fb.pixAmount) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                    {fb.currentStatus && (
                        <div style={{ padding: '1rem 1.25rem', borderRadius: 14, background: '#fff', border: '1px solid #E5E7EB' }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>👤 Situação Atual</div>
                            <div style={{ fontWeight: 700, color: '#0F172A' }}>{CURRENT_STATUS_LABELS[fb.currentStatus] ?? fb.currentStatus}</div>
                            {fb.currentStatusDetails && <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 4 }}>{fb.currentStatusDetails}</div>}
                        </div>
                    )}
                    <div style={{ padding: '1rem 1.25rem', borderRadius: 14, background: '#fff', border: '1px solid #E5E7EB' }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>💰 Chave PIX</div>
                        <div style={{ fontSize: '0.74rem', color: '#6B7280', marginBottom: 4 }}>{pixKeyTypeLabel}</div>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all' }}>{pixKeySafe}</div>
                        {fb.pixAmount && <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#059669', marginTop: 6 }}>Valor aprovado: R$ {Number(fb.pixAmount).toFixed(2)}</div>}
                    </div>
                </div>
            )}

            {/* Evidências — foto + vídeo */}
            {(fb.currentPhotoUrl || fb.currentVideoUrl) && (
                <div style={{ padding: '1.25rem', borderRadius: 14, background: '#fff', border: '1px solid #E5E7EB' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: 12 }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>📂 Evidências enviadas pelo aluno</div>
                        <div style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>Clique em ⬇️ para baixar</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                        {fb.currentPhotoUrl && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: '0.5rem' }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151' }}>📸 Foto atual</div>
                                    <button onClick={() => handleDownload('photo')} disabled={downloading === 'photo'}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.7rem', borderRadius: 8, background: downloading === 'photo' ? '#E5E7EB' : 'linear-gradient(135deg, #FFD600, #F59E0B)', border: 'none', color: downloading === 'photo' ? '#9CA3AF' : '#0F172A', fontSize: '0.7rem', fontWeight: 800, cursor: downloading === 'photo' ? 'wait' : 'pointer' }}>
                                        {downloading === 'photo' ? '⏳' : '⬇️'} Baixar</button>
                                </div>
                                {photoUrl ? (
                                    <div onClick={() => setPhotoZoom(true)} style={{ borderRadius: 12, overflow: 'hidden', background: '#000', cursor: 'zoom-in', border: '1px solid #E5E7EB' }}>
                                        <img src={photoUrl} alt="Foto" style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block' }} />
                                    </div>
                                ) : (
                                    <div style={{ padding: '2rem', background: '#F9FAFB', borderRadius: 12, textAlign: 'center', border: '1px dashed #E5E7EB', fontSize: '0.78rem', color: '#9CA3AF' }}>Carregando foto...</div>
                                )}
                            </div>
                        )}
                        {fb.currentVideoUrl && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: '0.5rem' }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151' }}>🎥 Vídeo atual</div>
                                    <button onClick={() => handleDownload('video')} disabled={downloading === 'video'}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.7rem', borderRadius: 8, background: downloading === 'video' ? '#E5E7EB' : 'linear-gradient(135deg, #FFD600, #F59E0B)', border: 'none', color: downloading === 'video' ? '#9CA3AF' : '#0F172A', fontSize: '0.7rem', fontWeight: 800, cursor: downloading === 'video' ? 'wait' : 'pointer' }}>
                                        {downloading === 'video' ? '⏳' : '⬇️'} Baixar</button>
                                </div>
                                {videoUrl ? (
                                    <div style={{ borderRadius: 12, overflow: 'hidden', background: '#000', border: '1px solid #E5E7EB' }}>
                                        <video src={videoUrl} controls preload="metadata" playsInline style={{ width: '100%', maxHeight: 320, display: 'block' }} />
                                    </div>
                                ) : (
                                    <div style={{ padding: '2rem', background: '#F9FAFB', borderRadius: 12, textAlign: 'center', border: '1px dashed #E5E7EB', fontSize: '0.78rem', color: '#9CA3AF' }}>Carregando vídeo...</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Comprovação de Divulgação Social */}
            {(fb.socialPostPlatform || fb.socialPostUrl || fb.socialPostProofUrl || fb.sharedOnSocial) && (() => {
                const isLinkedIn = fb.socialPostPlatform === 'LINKEDIN';
                const platformColor = isLinkedIn ? '#0a66c2' : '#10B981';
                const platformBg = isLinkedIn ? 'linear-gradient(135deg, #0f172a, #1e3a5f)' : 'linear-gradient(135deg, #022c22, #064e3b)';
                const platformLabel = isLinkedIn ? 'LinkedIn' : fb.socialPostPlatform === 'WHATSAPP' ? 'WhatsApp' : 'Não informado';
                const platformIcon = isLinkedIn ? <span style={{ color: '#fff', fontWeight: 900, fontSize: '1.1rem' }}>in</span> : <span style={{ fontSize: '1rem' }}>💬</span>;
                return (
                    <div style={{ padding: '1.25rem', borderRadius: 14, background: '#fff', border: '1px solid #E5E7EB' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: 12 }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>📱 Comprovação de Divulgação Social</div>
                            {fb.socialPostedAt && <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>Postado em {fmt(fb.socialPostedAt)}</div>}
                        </div>
                        {fb.socialPostPlatform && (
                            <div style={{ padding: '0.75rem 1rem', borderRadius: 12, marginBottom: 12, background: platformBg, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '0.55rem', fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.04em', boxShadow: `0 4px 16px ${platformColor}40` }}>
                                {platformIcon} Postado no {platformLabel}
                            </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                            <div style={{ padding: '0.85rem 1rem', borderRadius: 12, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>🔗 Link do post</div>
                                {fb.socialPostUrl ? (
                                    <a href={fb.socialPostUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', wordBreak: 'break-all', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: platformColor, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>{fb.socialPostUrl}</a>
                                ) : (
                                    <div style={{ fontSize: '0.78rem', color: '#9CA3AF', fontStyle: 'italic' }}>{fb.socialPostPlatform === 'WHATSAPP' ? 'Postou em WhatsApp Status (sem link público)' : 'Link não informado'}</div>
                                )}
                            </div>
                            <div style={{ padding: '0.85rem 1rem', borderRadius: 12, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: '0.5rem' }}>
                                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📸 Print do post</div>
                                    {fb.socialPostProofUrl && (
                                        <button onClick={() => handleDownload('postProof')} disabled={downloading === 'postProof'}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.6rem', borderRadius: 8, background: downloading === 'postProof' ? '#E5E7EB' : 'linear-gradient(135deg, #FFD600, #F59E0B)', border: 'none', color: downloading === 'postProof' ? '#9CA3AF' : '#0F172A', fontSize: '0.66rem', fontWeight: 800, cursor: downloading === 'postProof' ? 'wait' : 'pointer' }}>
                                            {downloading === 'postProof' ? '⏳' : '⬇️'} Baixar</button>
                                    )}
                                </div>
                                {fb.socialPostProofUrl ? (
                                    postProofUrl ? (
                                        <div onClick={() => setPostProofZoom(true)} style={{ borderRadius: 10, overflow: 'hidden', background: '#000', cursor: 'zoom-in', border: '1px solid #E5E7EB' }}>
                                            <img src={postProofUrl} alt="Screenshot do post" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', display: 'block' }} />
                                        </div>
                                    ) : <div style={{ padding: '1.5rem', background: '#fff', borderRadius: 10, textAlign: 'center', border: '1px dashed #E5E7EB', fontSize: '0.72rem', color: '#9CA3AF' }}>Carregando print...</div>
                                ) : <div style={{ fontSize: '0.78rem', color: '#9CA3AF', fontStyle: 'italic' }}>Print não enviado (feedback antigo)</div>}
                            </div>
                        </div>
                        {fb.sharedOnSocial && !fb.socialPostPlatform && (
                            <div style={{ marginTop: 12, padding: '0.75rem 1rem', borderRadius: 10, background: '#FFF7ED', border: '1px solid rgba(234,88,12,0.25)', fontSize: '0.75rem', color: '#9A3412', lineHeight: 1.5 }}>
                                ⚠️ Feedback enviado antes da nova exigência de prova. Não há link/print disponíveis.
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Fluxo PIX */}
            {(fb.pixKey || fb.contaPagarId || fb.rewardStatus) && (() => {
                const isIndividual = !!fb.contaPagarId;
                const isBatchPaid = fb.rewardStatus === 'PAID';
                const isLegacyBatchPending =
                    fb.rewardStatus === 'PENDING'
                    && !isIndividual
                    && fb.sharedOnSocial
                    && !!fb.pixKey
                    && fb.status === 'APPROVED';
                const isAwaitingPixAfterTriagem = fb.status === 'CONTENT_APPROVED' && !fb.contaPagarId;
                const isCancelled = fb.rewardStatus === 'CANCELLED';
                const flowColor = isIndividual ? '#059669' : isAwaitingPixAfterTriagem ? '#7C3AED' : isBatchPaid ? '#15803D' : isCancelled ? '#6B7280' : isLegacyBatchPending ? '#B89B00' : '#9CA3AF';
                const flowBg = isIndividual ? '#F0FDF4' : isAwaitingPixAfterTriagem ? '#FAF5FF' : isBatchPaid ? '#F0FDF4' : isCancelled ? '#F9FAFB' : isLegacyBatchPending ? '#FFFDF5' : '#F9FAFB';
                const flowLabel = isIndividual
                    ? 'Pagamento via Conta a Pagar'
                    : isAwaitingPixAfterTriagem
                        ? 'Triagem aceite — falta confirmar o valor e gerar Conta a Pagar (lista ou secção acima)'
                        : isBatchPaid
                            ? 'Pagamento registado manualmente (histórico)'
                            : isCancelled
                                ? 'Recompensa cancelada'
                                : isLegacyBatchPending
                                    ? 'Legado: aprovado sem Conta a Pagar — use «Marcar como pago» se aplicável'
                                    : 'Sem fluxo PIX definido';
                const flowIcon = isIndividual ? '🏦' : isAwaitingPixAfterTriagem ? '👍' : isBatchPaid ? '✅' : isCancelled ? '🚫' : isLegacyBatchPending ? '⏳' : '—';
                return (
                    <div style={{ padding: '1.25rem', borderRadius: 14, background: flowBg, border: `1.5px solid ${flowColor}30` }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ fontSize: '1.5rem' }}>{flowIcon}</span>
                                <div>
                                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>FLUXO DE RECOMPENSA PIX</div>
                                    <div style={{ fontWeight: 800, color: flowColor, fontFamily: 'Orbitron, sans-serif', fontSize: '0.92rem' }}>{flowLabel}</div>
                                </div>
                            </div>
                            {isLegacyBatchPending && (
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <button onClick={handleMarkRewardPaid} disabled={processing} style={{ padding: '0.5rem 0.9rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>✅ Marcar como pago</button>
                                    <button onClick={handleCancelReward} disabled={processing} style={{ padding: '0.5rem 0.9rem', borderRadius: 10, border: '1.5px solid #FEE2E2', background: '#FEF2F2', color: '#DC2626', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>🚫 Cancelar recompensa</button>
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem', marginTop: 8 }}>
                            {isIndividual && fb.pixAmount && (
                                <div style={{ padding: '0.6rem 0.85rem', borderRadius: 10, background: '#fff', border: '1px solid #E5E7EB' }}>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>Valor individual</div>
                                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: '#059669', fontSize: '1rem' }}>R$ {Number(fb.pixAmount).toFixed(2)}</div>
                                </div>
                            )}
                            {isBatchPaid && fb.rewardPaidAt && (
                                <div style={{ padding: '0.6rem 0.85rem', borderRadius: 10, background: '#fff', border: '1px solid #E5E7EB' }}>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>Pago em</div>
                                    <div style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 600 }}>{fmt(fb.rewardPaidAt)}</div>
                                </div>
                            )}
                            {fb.rewardPaymentReference && (
                                <div style={{ padding: '0.6rem 0.85rem', borderRadius: 10, background: '#fff', border: '1px solid #E5E7EB' }}>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>Referência</div>
                                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: '#475569', wordBreak: 'break-all' }}>{fb.rewardPaymentReference}</div>
                                </div>
                            )}
                        </div>
                        {isIndividual && fb.rewardStatus === 'PENDING' && (
                            <div style={{ marginTop: 12, padding: '0.65rem 0.9rem', borderRadius: 10, background: '#FEF3C7', border: '1px solid #FDE68A', fontSize: '0.74rem', color: '#92400E', lineHeight: 1.5 }}>
                                ⚠️ Conta a Pagar criada: liquide em Financeiro quando o PIX for efectuado.
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* ContaPagar */}
            {fb.contaPagar && (() => {
                const cp = fb.contaPagar;
                return (
                <div style={{ padding: '1rem 1.25rem', borderRadius: 14, background: '#F0FDF4', border: '1.5px solid rgba(16,185,129,0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>💳 Conta a Pagar Vinculada</div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', marginTop: 4 }}>R$ {Number(cp.valor).toFixed(2)} — Status: {cp.status}</div>
                            {cp.data_pagamento && <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Pago em: {fmt(cp.data_pagamento)}</div>}
                        </div>
                        <button
                            type="button"
                            onClick={() => router.push(`/admin/contas-a-pagar?highlight=${cp.id}`)}
                            style={{ padding: '0.4rem 0.85rem', borderRadius: 8, background: '#059669', border: 'none', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                            Ver Contas a Pagar →
                        </button>
                    </div>
                </div>
                );
            })()}

            {/* Rejection/Revert reason */}
            {fb.rejectionReason && (
                <div style={{ padding: '1rem 1.25rem', borderRadius: 14, background: '#FEF2F2', border: '1.5px solid rgba(220,38,38,0.25)' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', marginBottom: 4 }}>Motivo da Rejeição</div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#374151' }}>{fb.rejectionReason}</p>
                </div>
            )}
            {fb.revertReason && (
                <div style={{ padding: '1rem 1.25rem', borderRadius: 14, background: '#FFF7ED', border: '1.5px solid rgba(234,88,12,0.25)' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#EA580C', textTransform: 'uppercase', marginBottom: 4 }}>Motivo da Reversão</div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#374151' }}>{fb.revertReason}</p>
                </div>
            )}

            {showApprove && (
                <ApproveFeedbackPixModal
                    onClose={() => !processing && setShowApprove(false)}
                    onConfirm={handleApprovePixAndConta}
                    confirming={processing}
                />
            )}
            {showReject && <RejectModal onClose={() => setShowReject(false)} onConfirm={handleReject} />}
            {showRevert && <RevertModal onClose={() => setShowRevert(false)} onConfirm={handleRevert} />}

            {photoZoom && photoUrl && createPortal(
                <div onClick={() => setPhotoZoom(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out' }}>
                    <img src={photoUrl} alt="Foto em tela cheia" style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 8 }} />
                    <button onClick={() => setPhotoZoom(false)} style={{ position: 'absolute', top: 20, right: 20, width: 42, height: 42, borderRadius: 100, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 800 }}>✕</button>
                </div>,
                document.body,
            )}
            {postProofZoom && postProofUrl && createPortal(
                <div onClick={() => setPostProofZoom(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out' }}>
                    <img src={postProofUrl} alt="Print do post em tela cheia" style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 8 }} />
                    <button onClick={() => setPostProofZoom(false)} style={{ position: 'absolute', top: 20, right: 20, width: 42, height: 42, borderRadius: 100, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 800 }}>✕</button>
                </div>,
                document.body,
            )}
        </div>
    );
}
