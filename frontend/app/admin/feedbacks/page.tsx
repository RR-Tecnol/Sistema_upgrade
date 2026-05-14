'use client';

import { useEffect, useState, useCallback, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FunnelIcon, ArrowPathIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AdminCollapsibleTutorial from '@/components/admin/AdminCollapsibleTutorial';
import AdminViewModeToggle from '@/components/admin/AdminViewModeToggle';
import { usePersistedAdminViewMode } from '@/hooks/usePersistedAdminViewMode';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import ApproveFeedbackPixModal from '@/components/admin/ApproveFeedbackPixModal';
import { pipelineBadgeForFeedback } from '@/lib/feedbackPipelineBadge';

type FeedbackStatus =
    | 'PENDING_STUDENT_RESPONSE'
    | 'SUBMITTED'
    | 'CONTENT_APPROVED'
    | 'APPROVED'
    | 'REJECTED'
    | 'REVERTED'
    | 'EXPIRED';

interface FeedbackItem {
    id: string;
    status: FeedbackStatus;
    resubmittedAfterReject?: boolean;
    rejectionReason?: string | null;
    studentSubmitSequence?: number;
    rewardStatus?: 'PENDING' | 'PAID' | 'CANCELLED';
    contaPagarId?: string | null;
    currentPhotoUrl?: string | null;
    currentVideoUrl?: string | null;
    socialPostProofUrl?: string | null;
    sharedOnSocial?: boolean;
    socialPostPlatform?: 'LINKEDIN' | 'WHATSAPP' | null;
    ratingGeneral?: number;
    pixAmount?: number;
    pixKey?: string | null;
    pixKeyType?: string | null;
    submittedAt?: string;
    invitedAt: string;
    student: { user: { name: string; email: string } };
    class: { course: { name: string }; city?: { name: string; state: string } };
    contaPagar?: {
        id: string;
        status: string;
        valor: unknown;
        data_pagamento: string | null;
    } | null;
}

interface KPIs {
    totalInvites: number;
    responded: number;
    responseRate: number;
    approved: number;
    rejected: number;
    submitted: number;
    totalPaidValue: number;
    pendingPaymentPipeline?: number;
    paidPipeline?: number;
    ratings: { ratingCourse: number | null; ratingGeneral: number | null };
    pendingBatchCount: number;
    pendingBatchValue: number;
    paidBatchCount: number;
    paidBatchValue: number;
    cancelledBatchCount: number;
    pixBatchUnitValue: number;
    awaitingFinancialConfirmation?: number;
}

const LIFECYCLE_FILTERS: { value: string; label: string }[] = [
    { value: '', label: 'Todos' },
    { value: 'WAITING_TRIAGE', label: 'Aguardando triagem' },
    { value: 'TRIAGE_OK', label: 'Triagem OK' },
    { value: 'PENDING_PAYMENT', label: 'Pendente pagamento' },
    { value: 'PAID', label: 'Pago' },
    { value: 'REJECTED', label: 'Rejeitados' },
];

const REWARD_FILTERS: { value: string; label: string }[] = [
    { value: '', label: 'Todas (campo técnico)' },
    { value: 'PENDING', label: '⏳ PENDING' },
    { value: 'PAID', label: '✅ PAID (registo)' },
    { value: 'CANCELLED', label: '🚫 Canceladas' },
];

function contaPagarStatusPt(status: string): string {
    switch (status) {
        case 'pendente':
            return 'Pendente';
        case 'paga':
            return 'Pago';
        case 'vencida':
            return 'Vencida';
        case 'cancelada':
            return 'Cancelada';
        default:
            return status;
    }
}

function parseValor(v: unknown): number {
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    const n = parseFloat(String(v ?? '0'));
    return Number.isNaN(n) ? 0 : n;
}

function canApprovePixListed(fb: FeedbackItem): boolean {
    const keyOk = !!(fb.pixKey && fb.pixKey.trim());
    return fb.status === 'CONTENT_APPROVED' && !!fb.sharedOnSocial && keyOk && !fb.contaPagarId;
}

function canCreateMissingContaPagar(fb: FeedbackItem): boolean {
    const keyOk = !!(fb.pixKey && fb.pixKey.trim());
    return fb.status === 'APPROVED' && !fb.contaPagarId && !!fb.sharedOnSocial && keyOk;
}

export default function AdminFeedbacksList() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
    const [kpis, setKpis] = useState<KPIs | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [lifecycleFilter, setLifecycleFilter] = useState('');
    const [rewardFilter, setRewardFilter] = useState('');
    const [showRewardFilter, setShowRewardFilter] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [approveForId, setApproveForId] = useState<string | null>(null);
    const [approveMode, setApproveMode] = useState<'approve' | 'createConta'>('approve');
    const [approveSaving, setApproveSaving] = useState(false);
    const [listViewMode, setListViewMode] = usePersistedAdminViewMode('admin:feedbacks:list', 'table');

    const loadAll = useCallback(async () => {
        try {
            setLoading(true);
            const params: Record<string, string | number> = { page, limit: 20 };
            if (lifecycleFilter) params.lifecycle = lifecycleFilter;
            if (rewardFilter) params.rewardStatus = rewardFilter;

            const [fbRes, kpiRes] = await Promise.all([
                api.get('/feedbacks', { params }),
                api.get('/feedbacks/kpis'),
            ]);
            setFeedbacks(fbRes.data.data ?? []);
            setTotalPages(fbRes.data.totalPages ?? 1);
            setTotal(fbRes.data.total ?? 0);
            setKpis(kpiRes.data);
        } catch {
            toast.error('Erro ao carregar feedbacks');
        } finally {
            setLoading(false);
        }
    }, [page, lifecycleFilter, rewardFilter]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    useEffect(() => {
        if (searchParams.get('tab') === 'pix-batch') {
            router.replace('/admin/feedbacks');
        }
    }, [searchParams, router]);

    const handleSync = async () => {
        try {
            setSyncing(true);
            const { data } = await api.post('/feedbacks/admin/sync-orphans');
            if (data.created > 0) {
                toast.success(`${data.created} novo(s) convite(s) criado(s) · ${data.scanned} certificado(s) verificado(s)`);
            } else if (data.scanned === 0) {
                toast.success('Nenhum certificado órfão encontrado');
            } else {
                toast.success(`${data.scanned} certificado(s) já tinham feedback — nada a fazer`);
            }
            await loadAll();
        } catch {
            toast.error('Falha ao sincronizar certificados');
        } finally {
            setSyncing(false);
        }
    };

    const confirmApproveFromList = async (amount: number) => {
        if (!approveForId) return;
        try {
            setApproveSaving(true);
            const path =
                approveMode === 'createConta'
                    ? `/feedbacks/${approveForId}/create-conta-pagar`
                    : `/feedbacks/${approveForId}/approve`;
            await api.patch(path, { pixAmount: amount });
            toast.success(approveMode === 'createConta' ? 'Conta a Pagar criada e vinculada.' : 'Aprovado. Conta a Pagar criada.');
            setApproveForId(null);
            await loadAll();
        } catch (e: unknown) {
            const msg = e && typeof e === 'object' && 'response' in e ? (e as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
            toast.error(msg || 'Erro ao aprovar');
        } finally {
            setApproveSaving(false);
        }
    };

    const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

    const openFeedbackMedia = async (e: MouseEvent, feedbackId: string, kind: 'photo' | 'video' | 'postProof') => {
        e.stopPropagation();
        e.preventDefault();
        try {
            const { data } = await api.get<{ url?: string | null }>(`/feedbacks/${feedbackId}/media-url`, { params: { kind } });
            const url = data?.url;
            if (!url) {
                toast.error('Mídia não disponível para este feedback');
                return;
            }
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
            toast.error(msg || 'Erro ao gerar URL da mídia');
        }
    };

    const mediaBtnSx: CSSProperties = {
        borderRadius: 6,
        border: '1px solid #E5E7EB',
        background: '#F9FAFB',
        padding: '0.2rem 0.45rem',
        fontSize: '0.75rem',
        cursor: 'pointer',
        lineHeight: 1,
    };

    const renderPaymentCell = (fb: FeedbackItem) => {
        if (fb.contaPagar) {
            const c = fb.contaPagar;
            const valor = parseValor(c.valor);
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, maxWidth: 200 }}>
                    <span
                        style={{
                            display: 'inline-flex',
                            padding: '0.2rem 0.5rem',
                            borderRadius: 100,
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            background: c.status === 'paga' ? '#D1FAE5' : c.status === 'vencida' ? '#FEE2E2' : '#FEF3C7',
                            color: c.status === 'paga' ? '#065F46' : c.status === 'vencida' ? '#B91C1C' : '#92400E',
                        }}
                    >
                        {contaPagarStatusPt(c.status)}
                    </span>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', fontWeight: 700, color: '#059669' }}>
                        R${' '}
                        {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <button
                        type="button"
                        onClick={e => {
                            e.stopPropagation();
                            router.push(`/admin/contas-a-pagar?highlight=${c.id}`);
                        }}
                        style={{
                            padding: '0.25rem 0.55rem',
                            borderRadius: 8,
                            border: '1px solid #059669',
                            background: '#F0FDF4',
                            color: '#15803d',
                            fontWeight: 700,
                            fontSize: '0.62rem',
                            cursor: 'pointer',
                        }}
                    >
                        Ver em Contas a pagar
                    </button>
                </div>
            );
        }

        if (canApprovePixListed(fb)) {
            return (
                <button
                    type="button"
                    onClick={e => {
                        e.stopPropagation();
                        setApproveMode('approve');
                        setApproveForId(fb.id);
                    }}
                    style={{
                        padding: '0.35rem 0.65rem',
                        borderRadius: 8,
                        border: 'none',
                        background: 'linear-gradient(135deg, #10B981, #059669)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.68rem',
                        cursor: 'pointer',
                    }}
                >
                    Aprovar PIX
                </button>
            );
        }

        if (canCreateMissingContaPagar(fb)) {
            return (
                <button
                    type="button"
                    onClick={e => {
                        e.stopPropagation();
                        setApproveMode('createConta');
                        setApproveForId(fb.id);
                    }}
                    style={{
                        padding: '0.35rem 0.65rem',
                        borderRadius: 8,
                        border: '1px solid #B45309',
                        background: '#FFFBEB',
                        color: '#B45309',
                        fontWeight: 700,
                        fontSize: '0.68rem',
                        cursor: 'pointer',
                    }}
                >
                    Gerar Conta a pagar
                </button>
            );
        }

        if (fb.status === 'SUBMITTED') {
            return <span style={{ fontSize: '0.68rem', color: '#64748B', maxWidth: 180, lineHeight: 1.35 }}>Triagem na ficha antes do PIX</span>;
        }

        if (fb.status === 'CONTENT_APPROVED' && !fb.sharedOnSocial) {
            return <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Sem divulgação social</span>;
        }

        if (fb.status === 'CONTENT_APPROVED' && fb.sharedOnSocial && !(fb.pixKey && fb.pixKey.trim())) {
            return <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Sem chave PIX</span>;
        }

        if (fb.status === 'APPROVED' && !fb.contaPagarId && !(fb.pixKey && fb.pixKey.trim())) {
            return (
                <span style={{ fontSize: '0.65rem', color: '#B45309', maxWidth: 200, lineHeight: 1.35, display: 'inline-block', textAlign: 'center' }}>
                    Sem chave PIX no registo — peça reenvio ou corrija na ficha
                </span>
            );
        }

        return <span style={{ color: '#D1D5DB', fontSize: '0.75rem' }}>—</span>;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
            <AdminHeaderHero
                title="FEEDBACKS"
                subtitle="Avaliações pós-curso e aprovação de recompensa (Conta a Pagar)"
                badge="Gestão de feedback"
                rightSlot={
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        title="Cria convites para certificados emitidos sem feedback (idempotente)"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.6rem 1.1rem',
                            borderRadius: 10,
                            background: syncing ? '#E5E7EB' : 'linear-gradient(135deg, #FFD600 0%, #F59E0B 100%)',
                            color: syncing ? '#9CA3AF' : '#0F172A',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            border: 'none',
                            cursor: syncing ? 'not-allowed' : 'pointer',
                            boxShadow: syncing ? 'none' : '0 2px 8px rgba(255,214,0,0.3)',
                            transition: 'all 0.15s',
                        }}
                    >
                        <ArrowPathIcon style={{ width: 16, height: 16, animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
                        {syncing ? 'Sincronizando...' : 'Sincronizar certificados'}
                    </button>
                }
            />

            {approveForId ? (
                <ApproveFeedbackPixModal
                    onClose={() => !approveSaving && setApproveForId(null)}
                    onConfirm={confirmApproveFromList}
                    confirming={approveSaving}
                    title={approveMode === 'createConta' ? 'Gerar Conta a Pagar (retroativo)' : 'Pagamento via Conta a Pagar'}
                    subtitle={
                        approveMode === 'createConta'
                            ? 'Este feedback já estava aprovado sem lançamento no financeiro. Informe o valor para criar a conta agora.'
                            : 'Informe o valor a pagar em PIX. Será criada uma Conta a Pagar no financeiro.'
                    }
                />
            ) : null}

            <AdminCollapsibleTutorial
                storageKey="admin-feedbacks-tutorial-expanded"
                emoji="📖"
                title="COMO USAR ESTA PÁGINA — FEEDBACKS"
                steps={[
                    {
                        num: '1',
                        color: '#3B82F6',
                        title: 'Filtros de ciclo de vida',
                        body: (
                            <>
                                Use os filtros <strong>Aguardando triagem</strong>, <strong>Triagem OK</strong>, <strong>Pendente pagamento</strong>, <strong>Pago</strong> e <strong>Rejeitados</strong>.
                                Se o PIX foi aprovado sem lançamento financeiro (legado), use <strong>Gerar Conta a pagar</strong> quando disponível.
                            </>
                        ),
                    },
                    {
                        num: '2',
                        color: '#F59E0B',
                        title: 'Rejeições e reenvio',
                        body: (
                            <>
                                Alunos rejeitados podem voltar a submeter. A coluna <strong>Reenvio</strong> indica se já houve nova submissão após a última rejeição.
                            </>
                        ),
                    },
                    {
                        num: '3',
                        color: '#059669',
                        title: 'Fluxo financeiro sugerido',
                        body: (
                            <>
                                <strong>Triagem OK</strong> → aprovar PIX cria <strong>Conta a Pagar</strong>. Em <strong>Pendente pagamento</strong>, acompanhe em Contas a pagar até marcar como pago.
                                Se estiver <strong>aprovado sem conta</strong>, use «Gerar Conta a pagar» na coluna Pagamento.
                            </>
                        ),
                    },
                ]}
            />

            {kpis && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(158px, 1fr))', gap: '0.75rem' }}>
                    <AnimatedKpiCard label="Convites" value={kpis.totalInvites} color="#0891B2" bg="#F0F9FF" border="#BAE6FD" compact delayMs={0} icon={<span aria-hidden>📤</span>} />
                    <AnimatedKpiCard
                        label="Taxa resposta"
                        value={Math.min(100, Math.round(Number(kpis.responseRate) || 0))}
                        suffix="%"
                        color="#7C3AED"
                        bg="#F5F3FF"
                        border="#DDD6FE"
                        compact
                        delayMs={40}
                        icon={<span aria-hidden>📊</span>}
                    />
                    <AnimatedKpiCard label="Aguardando triagem" value={kpis.submitted} color="#EA580C" bg="#FFF7ED" border="#FED7AA" compact delayMs={80} icon={<span aria-hidden>🔍</span>} />
                    <AnimatedKpiCard
                        label="Aguardam confirmação PIX"
                        value={Number(kpis.awaitingFinancialConfirmation) || 0}
                        color="#7C3AED"
                        bg="#F5F3FF"
                        border="#DDD6FE"
                        compact
                        delayMs={100}
                        icon={<span aria-hidden>👍</span>}
                    />
                    <AnimatedKpiCard label="Pendente pagamento" value={Number(kpis.pendingPaymentPipeline) || 0} color="#B45309" bg="#FFFBEB" border="#FDE68A" compact delayMs={100} icon={<span aria-hidden>💳</span>} />
                    <AnimatedKpiCard label="Pago (PIX)" value={Number(kpis.paidPipeline) || 0} color="#059669" bg="#F0FDF4" border="#BBF7D0" compact delayMs={120} icon={<span aria-hidden>✅</span>} />
                    <AnimatedKpiCard label="Rejeitados" value={kpis.rejected} color="#DC2626" bg="#FEF2F2" border="#FECACA" compact delayMs={160} icon={<span aria-hidden>❌</span>} />
                    <AnimatedKpiCard
                        label="Volume aprovado (PIX)"
                        value={0}
                        displayValue={`R$ ${Number(kpis.totalPaidValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        color="#15803D"
                        bg="#F0FDF4"
                        border="#BBF7D0"
                        compact
                        delayMs={200}
                        icon={<span aria-hidden>💰</span>}
                        sub="soma valores aprovados"
                    />
                    <AnimatedKpiCard
                        label="Nota média"
                        value={0}
                        displayValue={kpis.ratings?.ratingGeneral != null ? Number(kpis.ratings.ratingGeneral).toFixed(1) : '—'}
                        sub={kpis.ratings?.ratingGeneral != null ? 'geral (1–5)' : undefined}
                        color="#B89B00"
                        bg="#FFFDE7"
                        border="#FEF08A"
                        compact
                        delayMs={240}
                        icon={<span aria-hidden>⭐</span>}
                    />
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <FunnelIcon style={{ width: 15, height: 15, color: '#9CA3AF', flexShrink: 0 }} />
                    {LIFECYCLE_FILTERS.map(f => (
                        <button
                            key={f.value}
                            onClick={() => {
                                setLifecycleFilter(f.value);
                                setPage(1);
                            }}
                            style={{
                                padding: '0.4rem 0.85rem',
                                borderRadius: 100,
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                background: lifecycleFilter === f.value ? '#0F172A' : '#F3F4F6',
                                color: lifecycleFilter === f.value ? '#FFD600' : '#6B7280',
                                border: `1px solid ${lifecycleFilter === f.value ? '#0F172A' : '#E5E7EB'}`,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                        >
                            {f.label}
                        </button>
                    ))}

                    <button
                        onClick={() => {
                            setShowRewardFilter(v => !v);
                            if (showRewardFilter) setRewardFilter('');
                        }}
                        style={{
                            marginLeft: 'auto',
                            padding: '0.4rem 0.85rem',
                            borderRadius: 100,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            background: rewardFilter ? 'linear-gradient(135deg, #FFD600, #F59E0B)' : showRewardFilter ? '#F3F4F6' : 'transparent',
                            color: rewardFilter ? '#0F172A' : '#9CA3AF',
                            border: `1px solid ${rewardFilter ? '#F59E0B' : '#E5E7EB'}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                        }}
                    >
                        <BanknotesIcon style={{ width: 13, height: 13 }} />
                        Filtro rewardStatus {rewardFilter ? `(${rewardFilter})` : ''}
                        <span style={{ fontSize: '0.65rem' }}>{showRewardFilter ? '▲' : '▼'}</span>
                    </button>
                </div>

                {showRewardFilter && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingLeft: '1.6rem' }}>
                        {REWARD_FILTERS.map(f => (
                            <button
                                key={f.value}
                                onClick={() => {
                                    setRewardFilter(f.value);
                                    setPage(1);
                                }}
                                style={{
                                    padding: '0.3rem 0.75rem',
                                    borderRadius: 100,
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    background: rewardFilter === f.value ? 'linear-gradient(135deg, #FFD600, #F59E0B)' : '#F9FAFB',
                                    color: rewardFilter === f.value ? '#0F172A' : '#6B7280',
                                    border: `1px solid ${rewardFilter === f.value ? '#F59E0B' : '#E5E7EB'}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.35rem 0 0' }}>
                    <AdminViewModeToggle mode={listViewMode} onChange={setListViewMode} />
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem', width: 40, height: 40 }} />
                </div>
            ) : feedbacks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', background: '#F9FAFB', borderRadius: 16, border: '2px dashed #E5E7EB' }}>
                    <p style={{ fontSize: '0.88rem', color: '#6B7280' }}>Nenhum feedback encontrado</p>
                </div>
            ) : listViewMode === 'card' ? (
                <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                    {feedbacks.map((fb, idx) => {
                        const cfg = pipelineBadgeForFeedback(fb);
                        const keyText = (fb.pixKey || '').trim();
                        let reenvioShort = '—';
                        if (fb.status === 'REJECTED') reenvioShort = 'Não reenviou';
                        else if (fb.status === 'SUBMITTED' && fb.resubmittedAfterReject) reenvioShort = 'Sim';
                        return (
                            <div
                                key={fb.id}
                                className="adm-kpi-card adm-scale-in"
                                onClick={() => router.push(`/admin/feedbacks/${fb.id}`)}
                                style={{
                                    animationDelay: `${idx * 30}ms`,
                                    background: '#fff',
                                    cursor: 'pointer',
                                    borderStyle: 'solid',
                                    borderWidth: '1px 1px 1px 4px',
                                    borderTopColor: `${cfg.border}55`,
                                    borderRightColor: `${cfg.border}44`,
                                    borderBottomColor: `${cfg.border}44`,
                                    borderLeftColor: cfg.color,
                                }}
                            >
                                <div className="adm-kpi-grid" />
                                <div className="adm-kpi-scan" style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}55, transparent)` }} />
                                <div className="adm-kpi-topline" style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)` }} />
                                <div className="adm-kpi-ring" style={{ borderColor: `${cfg.color}2A` }} />
                                <div className="adm-kpi-ring adm-kpi-ring-sm" style={{ borderColor: `${cfg.color}1F` }} />
                                <div className="adm-kpi-dot" style={{ background: cfg.color }} />
                                <div style={{ position: 'relative', zIndex: 1, padding: '14px 14px 10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <span style={{ fontFamily: 'Orbitron', fontSize: '.58rem', fontWeight: 800, letterSpacing: '.08em', color: '#64748B' }}>#{String(fb.id).slice(0, 8)}</span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '.2rem .5rem', borderRadius: 999, background: cfg.bg, border: `1px solid ${cfg.border}`, fontSize: '.65rem', fontWeight: 700, color: cfg.color }}>{cfg.icon} {cfg.label}</span>
                                    </div>
                                    <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>{fb.student.user.name}</div>
                                    <div style={{ fontSize: '.7rem', color: '#64748B', marginBottom: 8 }}>{fb.class.course.name}{fb.class.city ? ` · ${fb.class.city.name}/${fb.class.city.state}` : ''}</div>
                                    <div style={{ fontSize: '.72rem', color: '#334155', marginBottom: 4 }}><b>Nota:</b> {fb.ratingGeneral ? `⭐ ${fb.ratingGeneral}/5` : '—'}</div>
                                    <div style={{ fontSize: '.68rem', color: '#475569', wordBreak: 'break-word', marginBottom: 6 }} title={(fb.pixKeyType ? `${fb.pixKeyType}: ` : '') + (fb.pixKey ?? '')}>
                                        <b>PIX:</b>{' '}
                                        {keyText ? keyText : <span style={{ color: '#92400E', fontWeight: 700 }}>Chave não informada</span>}
                                    </div>
                                    <div style={{ fontSize: '.68rem', color: '#64748B' }}><b>Reenvio:</b> {reenvioShort}</div>
                                    <div style={{ fontSize: '.68rem', color: '#64748B', marginTop: 6 }}>{fb.submittedAt ? fmt(fb.submittedAt) : fmt(fb.invitedAt)}</div>
                                </div>
                                <div style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(148,163,184,.25)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }} onClick={e => e.stopPropagation()}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                                        {fb.currentPhotoUrl ? <button type="button" aria-label="Foto" onClick={e => openFeedbackMedia(e, fb.id, 'photo')} style={mediaBtnSx}>📷</button> : null}
                                        {fb.currentVideoUrl ? <button type="button" aria-label="Vídeo" onClick={e => openFeedbackMedia(e, fb.id, 'video')} style={mediaBtnSx}>📹</button> : null}
                                        {fb.socialPostProofUrl ? <button type="button" aria-label="Post" onClick={e => openFeedbackMedia(e, fb.id, 'postProof')} style={mediaBtnSx}>🖼️</button> : null}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>{renderPaymentCell(fb)}</div>
                                    <button
                                        type="button"
                                        onClick={() => router.push(`/admin/feedbacks/${fb.id}`)}
                                        style={{
                                            padding: '0.4rem 0.75rem', borderRadius: 8, border: '1px solid #0F172A', background: '#0F172A', color: '#FFD600', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer', width: '100%',
                                        }}
                                    >
                                        Ver detalhes
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', fontSize: '0.78rem' }}>
                            <span style={{ color: '#6B7280' }}>
                                {total} feedback{total !== 1 ? 's' : ''} · Página {page}/{totalPages}
                            </span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    style={{
                                        padding: '0.4rem 0.85rem',
                                        borderRadius: 8,
                                        border: '1px solid #E5E7EB',
                                        background: '#F9FAFB',
                                        cursor: page <= 1 ? 'not-allowed' : 'pointer',
                                        fontWeight: 600,
                                        color: page <= 1 ? '#D1D5DB' : '#374151',
                                    }}
                                >
                                    ← Anterior
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    style={{
                                        padding: '0.4rem 0.85rem',
                                        borderRadius: 8,
                                        border: '1px solid #E5E7EB',
                                        background: '#F9FAFB',
                                        cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                                        fontWeight: 600,
                                        color: page >= totalPages ? '#D1D5DB' : '#374151',
                                    }}
                                >
                                    Próxima →
                                </button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #E5E7EB', background: '#fff' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                            <thead>
                                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                                        Aluno
                                    </th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                                        Curso
                                    </th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: '#374151', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                                        Status
                                    </th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: '#374151', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                                        Nota
                                    </th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: '#374151', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                                        PIX
                                    </th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: '#374151', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                                        Pagamento
                                    </th>
                                    <th style={{ padding: '0.75rem 0.65rem', textAlign: 'center', fontWeight: 700, color: '#374151', fontSize: '0.68rem', textTransform: 'uppercase', maxWidth: 110 }} title="Após rejeição: se o aluno já enviou de novo">
                                        Reenvio
                                    </th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: '#374151', fontSize: '0.72rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }} title="Abrir foto, vídeo ou print do post (nova aba)">
                                        Comprov.
                                    </th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: '#374151', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                                        Ações
                                    </th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: '#374151', fontSize: '0.72rem', textTransform: 'uppercase' }}>Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {feedbacks.map(fb => {
                                    const cfg = pipelineBadgeForFeedback(fb);
                                    const keyText = (fb.pixKey || '').trim();
                                    let reenvioCell: ReactNode = <span style={{ color: '#D1D5DB', fontSize: '0.72rem' }}>—</span>;
                                    if (fb.status === 'REJECTED') {
                                        reenvioCell = <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#B45309', lineHeight: 1.3 }}>Não reenviou</span>;
                                    } else if (fb.status === 'SUBMITTED' && fb.resubmittedAfterReject) {
                                        reenvioCell = <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#059669' }}>Sim</span>;
                                    }
                                    return (
                                        <tr
                                            key={fb.id}
                                            style={{ borderBottom: '1px solid #F3F4F6', transition: 'background 0.15s' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <div style={{ fontWeight: 600, color: '#0F172A' }}>{fb.student.user.name}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{fb.student.user.email}</div>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <div style={{ fontWeight: 600, color: '#374151' }}>{fb.class.course.name}</div>
                                                {fb.class.city && <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{fb.class.city.name}/{fb.class.city.state}</div>}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.3rem',
                                                        padding: '0.3rem 0.65rem',
                                                        borderRadius: 100,
                                                        background: cfg.bg,
                                                        border: `1px solid ${cfg.border}`,
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        color: cfg.color,
                                                    }}
                                                >
                                                    {cfg.icon} {cfg.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: fb.ratingGeneral ? '#B89B00' : '#D1D5DB' }}>
                                                {fb.ratingGeneral ? `⭐ ${fb.ratingGeneral}/5` : '—'}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', maxWidth: 220, verticalAlign: 'middle' }}>
                                                <div
                                                    style={{
                                                        fontFamily: 'JetBrains Mono, monospace',
                                                        fontWeight: 600,
                                                        fontSize: '0.72rem',
                                                        color: '#0F172A',
                                                        wordBreak: 'break-all',
                                                        lineHeight: 1.35,
                                                        textAlign: 'center',
                                                    }}
                                                    title={(fb.pixKeyType ? `${fb.pixKeyType}: ` : '') + (fb.pixKey ?? '')}
                                                >
                                                    {keyText ? keyText : <span style={{ color: '#92400e', fontWeight: 700 }}>Chave não informada</span>}
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', verticalAlign: 'middle' }} onClick={e => e.stopPropagation()}>
                                                {renderPaymentCell(fb)}
                                            </td>
                                            <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', verticalAlign: 'middle' }}>
                                                {reenvioCell}
                                            </td>
                                            <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', verticalAlign: 'middle' }} onClick={e => e.stopPropagation()}>
                                                <div style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 120 }}>
                                                    {fb.currentPhotoUrl ? (
                                                        <button type="button" title="Foto enviada" aria-label="Abrir foto" onClick={e => openFeedbackMedia(e, fb.id, 'photo')} style={mediaBtnSx}>
                                                            📷
                                                        </button>
                                                    ) : null}
                                                    {fb.currentVideoUrl ? (
                                                        <button type="button" title="Vídeo enviado" aria-label="Abrir vídeo" onClick={e => openFeedbackMedia(e, fb.id, 'video')} style={mediaBtnSx}>
                                                            📹
                                                        </button>
                                                    ) : null}
                                                    {fb.socialPostProofUrl ? (
                                                        <button type="button" title="Print do post social" aria-label="Abrir print do post" onClick={e => openFeedbackMedia(e, fb.id, 'postProof')} style={mediaBtnSx}>
                                                            🖼️
                                                        </button>
                                                    ) : null}
                                                    {!fb.currentPhotoUrl && !fb.currentVideoUrl && !fb.socialPostProofUrl && <span style={{ color: '#D1D5DB', fontSize: '0.72rem' }}>—</span>}
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => router.push(`/admin/feedbacks/${fb.id}`)}
                                                    style={{
                                                        padding: '0.35rem 0.75rem',
                                                        borderRadius: 8,
                                                        border: '1px solid #0F172A',
                                                        background: '#0F172A',
                                                        color: '#FFD600',
                                                        fontWeight: 700,
                                                        fontSize: '0.7rem',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    Ver detalhes
                                                </button>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', color: '#6B7280' }}>
                                                {fb.submittedAt ? fmt(fb.submittedAt) : fmt(fb.invitedAt)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderTop: '1px solid #F3F4F6', fontSize: '0.78rem' }}>
                            <span style={{ color: '#6B7280' }}>
                                {total} feedback{total !== 1 ? 's' : ''} · Página {page}/{totalPages}
                            </span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    style={{
                                        padding: '0.4rem 0.85rem',
                                        borderRadius: 8,
                                        border: '1px solid #E5E7EB',
                                        background: '#F9FAFB',
                                        cursor: page <= 1 ? 'not-allowed' : 'pointer',
                                        fontWeight: 600,
                                        color: page <= 1 ? '#D1D5DB' : '#374151',
                                    }}
                                >
                                    ← Anterior
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    style={{
                                        padding: '0.4rem 0.85rem',
                                        borderRadius: 8,
                                        border: '1px solid #E5E7EB',
                                        background: '#F9FAFB',
                                        cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                                        fontWeight: 600,
                                        color: page >= totalPages ? '#D1D5DB' : '#374151',
                                    }}
                                >
                                    Próxima →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/*
             * ─────────────────────────────────────────────────────────────────────────────
             * FUTURE_DEPLOY — UI «PIX em lote»: segunda aba, CSV, seleção em massa, bulk mark-paid,
             * KPIs próprios do lote na mesma página. Repor via histórico git deste ficheiro antes
             * do deploy atual; endpoints Nest mantidos mas comentados como backlog no controller.
             * ─────────────────────────────────────────────────────────────────────────────
             */}
        </div>
    );
}
