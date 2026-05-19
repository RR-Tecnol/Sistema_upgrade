'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import {
    stockApi,
    StockPurchaseRequest,
    StockPurchaseRequestStatus,
    PURCHASE_STATUS_LABEL,
    PURCHASE_STATUS_COLOR,
} from '@/lib/api/stock';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { EstoqueSolicitacoesSidebarTutorial } from '@/components/admin/adminSidebarTutorials';
import { toast } from '@/components/ui/Toast';
import {
    EstoqueSection,
    EstoqueSectionHeader,
    EstoqueEmptyState,
    EstoqueLoadingState,
    ESTOQUE_SECTION_CSS,
} from '@/components/estoque/EstoqueSection';
import { roleLabel } from '@/lib/i18n';

const STATUS_TABS: { value: StockPurchaseRequestStatus | 'all'; label: string; emoji: string }[] = [
    { value: 'PENDENTE', label: 'Pendentes', emoji: '⏳' },
    { value: 'APROVADA', label: 'Em trânsito', emoji: '📦' },
    { value: 'RECEBIDA', label: 'Recebidas', emoji: '✅' },
    { value: 'REJEITADA', label: 'Rejeitadas', emoji: '❌' },
    { value: 'CANCELADA', label: 'Canceladas', emoji: '🚫' },
    { value: 'all', label: 'Todas', emoji: '📋' },
];

const CONTA_PAGAR_STATUS_LABEL: Record<string, string> = {
    PENDENTE: 'pagamento pendente',
    PAGO: 'paga',
    CANCELADO: 'cancelada',
    ATRASADO: 'atrasada',
};

export default function SolicitacoesPage() {
    const [reqs, setReqs] = useState<StockPurchaseRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusTab, setStatusTab] = useState<StockPurchaseRequestStatus | 'all'>('PENDENTE');
    const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);

    // Modal de revisão
    const [reviewing, setReviewing] = useState<StockPurchaseRequest | null>(null);
    const [reviewMode, setReviewMode] = useState<'approve' | 'reject' | null>(null);
    const [reviewNote, setReviewNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const u = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (u) {
            try {
                const parsed = JSON.parse(u);
                setCurrentUser({ id: parsed.id, role: parsed.role });
            } catch { }
        }
    }, []);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await stockApi.purchaseRequests.list({
                status: statusTab === 'all' ? undefined : statusTab,
            });
            setReqs(data);
        } catch (e) {
            console.error('[Solicitações]', e);
            toast.error('Erro ao carregar solicitações');
        } finally {
            setLoading(false);
        }
    }, [statusTab]);

    useEffect(() => { load(); }, [load]);

    const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'IT_ADMIN';

    const openReview = (req: StockPurchaseRequest, mode: 'approve' | 'reject') => {
        setReviewing(req);
        setReviewMode(mode);
        setReviewNote('');
    };

    const closeReview = () => {
        setReviewing(null);
        setReviewMode(null);
        setReviewNote('');
    };

    const handleReview = async () => {
        if (!reviewing || !reviewMode) return;
        if (reviewMode === 'reject' && reviewNote.trim().length < 5) {
            toast.error('Por favor, informe o motivo da rejeição (mín. 5 caracteres)');
            return;
        }
        setSubmitting(true);
        try {
            if (reviewMode === 'approve') {
                await stockApi.purchaseRequests.approve(reviewing.id, { reviewNote: reviewNote.trim() || undefined });
                toast.success('Solicitação aprovada — conta a pagar e reposição geradas com sucesso');
            } else {
                await stockApi.purchaseRequests.reject(reviewing.id, reviewNote.trim());
                toast.success('Solicitação rejeitada');
            }
            closeReview();
            load();
        } catch (e: any) {
            const msg = e?.response?.data?.message;
            toast.error(typeof msg === 'string' ? msg : 'Erro ao processar solicitação');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
            <style>{ESTOQUE_SECTION_CSS}</style>
            <AdminHeaderHero
                title="SOLICITAÇÕES DE COMPRA"
                subtitle="Aprovação de reposições e geração automática de conta a pagar"
                badge={`${reqs.length} ${reqs.length === 1 ? 'registro' : 'registros'}`}
                rightSlot={(
                    <Link href="/admin/estoque" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '10px 16px', borderRadius: 12, textDecoration: 'none',
                        background: 'rgba(255,255,255,0.06)', color: '#fff',
                        border: '1px solid rgba(255,255,255,0.2)',
                        fontWeight: 700, fontSize: '0.78rem',
                    }}>← Voltar</Link>
                )}
            />

            <EstoqueSolicitacoesSidebarTutorial />

            {/* TABS de status */}
            <EstoqueSection delay={80} accent="#F59E0B" minimal>
                <EstoqueSectionHeader
                    icon="🗂️"
                    title="Filtrar por status"
                    subtitle="Clique em um status para isolar somente solicitações nesse estado"
                    accent="#F59E0B"
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {STATUS_TABS.map(t => {
                        const active = statusTab === t.value;
                        const color = t.value === 'all' ? '#6B7280' : PURCHASE_STATUS_COLOR[t.value as StockPurchaseRequestStatus];
                        return (
                            <button
                                key={t.value}
                                onClick={() => setStatusTab(t.value)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '9px 16px', borderRadius: 10,
                                    border: `1.5px solid ${active ? color : '#E5E7EB'}`,
                                    background: active ? `${color}15` : '#FAFAFA',
                                    color: active ? color : '#6B7280',
                                    fontSize: '0.76rem', fontWeight: 800,
                                    fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.04em',
                                    cursor: 'pointer', transition: 'all 0.18s',
                                }}>
                                <span>{t.emoji}</span> {t.label}
                            </button>
                        );
                    })}
                </div>
            </EstoqueSection>

            {/* LISTA */}
            <EstoqueSection delay={140} accent="#F59E0B">
                <EstoqueSectionHeader
                    icon="🛒"
                    title={statusTab === 'all'
                        ? 'Todas as solicitações'
                        : `Solicitações · ${PURCHASE_STATUS_LABEL[statusTab as StockPurchaseRequestStatus]}`}
                    subtitle="Cada card é uma solicitação de compra e o seu estado no fluxo financeiro"
                    accent="#F59E0B"
                />
                {loading ? (
                    <EstoqueLoadingState />
                ) : reqs.length === 0 ? (
                    <EstoqueEmptyState
                        icon="🛒"
                        label={`Nenhuma solicitação ${statusTab !== 'all' ? PURCHASE_STATUS_LABEL[statusTab as StockPurchaseRequestStatus].toLowerCase() : ''}`}
                    />
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
                        {reqs.map(req => (
                            <RequestCard
                                key={req.id}
                                req={req}
                                canReview={isAdmin && req.status === 'PENDENTE'}
                                canReceive={isAdmin && req.status === 'APROVADA'}
                                onApprove={() => openReview(req, 'approve')}
                                onReject={() => openReview(req, 'reject')}
                                onConfirmReceipt={async () => {
                                    if (!confirm(
                                        `Confirma o RECEBIMENTO físico de "${req.stockItem?.nome}" — ${Number(req.quantidade)} ${req.stockItem?.unidade}?\n\n` +
                                        `Isso vai:\n• subir o saldo real do estoque\n• tirar da fila "Em trânsito"\n• registrar uma movimentação de reposição\n\n` +
                                        `(É idempotente — também é disparado automaticamente quando a conta a pagar é paga.)`
                                    )) return;
                                    try {
                                        await stockApi.purchaseRequests.confirmReceipt(req.id);
                                        toast.success('Recebimento confirmado — saldo de estoque atualizado');
                                        load();
                                    } catch (err: any) {
                                        toast.error(err?.response?.data?.message || 'Erro ao confirmar recebimento');
                                    }
                                }}
                            />
                        ))}
                    </div>
                )}
            </EstoqueSection>

            {/* MODAL de revisão */}
            {reviewing && reviewMode && typeof window !== 'undefined' && createPortal(
                <div className="modal-overlay" onClick={closeReview}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
                        <div style={{ marginBottom: 18 }}>
                            <h2 style={{
                                fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.1rem',
                                color: reviewMode === 'approve' ? '#059669' : '#DC2626',
                                letterSpacing: '0.05em', margin: 0,
                            }}>
                                {reviewMode === 'approve' ? '✅ APROVAR SOLICITAÇÃO' : '❌ REJEITAR SOLICITAÇÃO'}
                            </h2>
                            <p style={{ fontSize: '0.82rem', color: '#6B7280', marginTop: 6 }}>
                                {reviewing.stockItem?.nome} · {Number(reviewing.quantidade)} {reviewing.stockItem?.unidade} ·
                                <strong> R$ {Number(reviewing.valorTotal).toFixed(2).replace('.', ',')}</strong>
                            </p>
                        </div>

                        {reviewMode === 'approve' && (
                            <div style={{
                                padding: '0.9rem 1.1rem', borderRadius: 10,
                                background: 'rgba(5, 150, 105, 0.06)',
                                border: '1px solid rgba(5, 150, 105, 0.2)',
                                marginBottom: 16,
                            }}>
                                <div style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 700, marginBottom: 4 }}>
                                    Ao aprovar, o sistema irá automaticamente:
                                </div>
                                <ul style={{ fontSize: '0.74rem', color: '#065F46', margin: 0, paddingLeft: 18 }}>
                                    <li>Criar uma <strong>conta a pagar</strong> de R$ {Number(reviewing.valorTotal).toFixed(2).replace('.', ',')} (venc. 30 dias)</li>
                                    <li>Registrar uma <strong>movimentação de reposição</strong> no histórico</li>
                                    <li>Aumentar o saldo do item em <strong>{Number(reviewing.quantidade)} {reviewing.stockItem?.unidade}</strong> no estoque central</li>
                                </ul>
                            </div>
                        )}

                        <div>
                            <label style={{
                                display: 'block', fontSize: '0.65rem', fontWeight: 800,
                                textTransform: 'uppercase', letterSpacing: '0.1em',
                                color: '#6B7280', marginBottom: 6,
                            }}>
                                {reviewMode === 'approve' ? 'Observação (opcional)' : 'Motivo da rejeição'}
                                {reviewMode === 'reject' && <span style={{ color: '#DC2626', marginLeft: 3 }}>*</span>}
                            </label>
                            <textarea
                                value={reviewNote}
                                onChange={e => setReviewNote(e.target.value)}
                                rows={4}
                                maxLength={500}
                                placeholder={reviewMode === 'approve'
                                    ? 'Ex: Aprovado conforme orçamento anexo'
                                    : 'Ex: Valor acima do orçado; renegociar com fornecedor'}
                                style={{
                                    width: '100%', padding: '0.65rem 0.9rem', borderRadius: 10,
                                    border: '1.5px solid #E5E7EB', background: '#F9FAFB',
                                    fontSize: '0.85rem', color: '#111827', outline: 'none',
                                    resize: 'vertical', fontFamily: 'inherit',
                                }}
                            />
                        </div>

                        <div className="modal-actions-row" style={{ marginTop: 18 }}>
                            <button
                                onClick={closeReview}
                                disabled={submitting}
                                style={{
                                    padding: '0.65rem 1.4rem', borderRadius: 10,
                                    background: '#F3F4F6', border: '1px solid #E5E7EB',
                                    color: '#6B7280', fontWeight: 700, fontSize: '0.85rem',
                                    cursor: submitting ? 'wait' : 'pointer',
                                }}>
                                Cancelar
                            </button>
                            <button
                                onClick={handleReview}
                                disabled={submitting}
                                style={{
                                    padding: '0.65rem 1.4rem', borderRadius: 10, border: 'none',
                                    background: reviewMode === 'approve'
                                        ? 'linear-gradient(135deg, #10B981, #059669)'
                                        : 'linear-gradient(135deg, #EF4444, #DC2626)',
                                    color: '#fff', fontWeight: 800, fontSize: '0.85rem',
                                    cursor: submitting ? 'wait' : 'pointer',
                                    boxShadow: reviewMode === 'approve'
                                        ? '0 2px 10px rgba(5, 150, 105, 0.35)'
                                        : '0 2px 10px rgba(220, 38, 38, 0.35)',
                                    opacity: submitting ? 0.7 : 1,
                                }}>
                                {submitting ? 'Processando...' : (reviewMode === 'approve' ? '✅ Aprovar' : '❌ Rejeitar')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//   RequestCard
// ═══════════════════════════════════════════════════════════════════
function RequestCard({
    req, canReview, canReceive, onApprove, onReject, onConfirmReceipt,
}: {
    req: StockPurchaseRequest;
    canReview: boolean;
    canReceive?: boolean;
    onApprove: () => void;
    onReject: () => void;
    onConfirmReceipt?: () => void;
}) {
    const color = PURCHASE_STATUS_COLOR[req.status];
    const label = PURCHASE_STATUS_LABEL[req.status];

    return (
        <div style={{
            background: '#fff', borderRadius: 16, overflow: 'hidden',
            border: `1px solid ${req.urgente ? 'rgba(239,68,68,0.35)' : '#F3F4F6'}`,
            boxShadow: req.urgente ? '0 4px 14px rgba(239,68,68,0.15)' : '0 2px 8px rgba(0,0,0,0.05)',
        }}>
            {/* Top bar */}
            <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}aa)` }} />

            <div style={{ padding: '1.1rem 1.2rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '3px 10px', borderRadius: 20,
                        background: `${color}15`, border: `1px solid ${color}40`,
                        fontSize: '0.66rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                        {label}
                    </span>
                    {req.urgente && (
                        <span style={{
                            padding: '3px 10px', borderRadius: 20,
                            background: '#FEF2F2', border: '1px solid #FECACA',
                            fontSize: '0.62rem', fontWeight: 800, color: '#DC2626',
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>🔥 Urgente</span>
                    )}
                </div>

                {/* Item */}
                <Link href={`/admin/estoque/itens/${req.stockItemId}`} style={{
                    fontFamily: 'Orbitron, sans-serif', fontSize: '1rem', fontWeight: 800,
                    color: '#111827', textDecoration: 'none', display: 'block', marginBottom: 4,
                    letterSpacing: '0.03em',
                }}>
                    {req.stockItem?.nome ?? 'Item'}
                </Link>
                <div style={{ fontSize: '0.74rem', color: '#9CA3AF', marginBottom: 12 }}>
                    Solicitado por <strong>{req.requester?.name ?? '—'}</strong> ({roleLabel(req.requester?.role)})
                </div>

                {/* Numbers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <div style={{ padding: '0.5rem 0.6rem', borderRadius: 9, background: '#FAFBFC', border: '1px solid #F3F4F6' }}>
                        <div style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF' }}>Qtd</div>
                        <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#111827' }}>
                            {Number(req.quantidade).toFixed(0)}
                        </div>
                    </div>
                    <div style={{ padding: '0.5rem 0.6rem', borderRadius: 9, background: '#FAFBFC', border: '1px solid #F3F4F6' }}>
                        <div style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF' }}>Unit.</div>
                        <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: '#111827' }}>
                            R$ {Number(req.precoUnitario).toFixed(2).replace('.', ',')}
                        </div>
                    </div>
                    <div style={{ padding: '0.5rem 0.6rem', borderRadius: 9, background: 'rgba(255,214,0,0.08)', border: '1px solid rgba(255,214,0,0.3)' }}>
                        <div style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#B89B00' }}>Total</div>
                        <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.95rem', color: '#7C5A00' }}>
                            R$ {Number(req.valorTotal).toFixed(2).replace('.', ',')}
                        </div>
                    </div>
                </div>

                {/* Fornecedor + justificativa */}
                {req.fornecedor && (
                    <div style={{ fontSize: '0.74rem', color: '#6B7280', marginBottom: 6 }}>
                        🏪 <strong>{req.fornecedor}</strong>
                    </div>
                )}
                <div style={{
                    fontSize: '0.78rem', color: '#374151',
                    background: '#FAFBFC', padding: '0.6rem 0.8rem', borderRadius: 8,
                    borderLeft: '3px solid #E5E7EB', marginBottom: 10,
                    fontStyle: 'italic',
                }}>
                    "{req.justificativa}"
                </div>

                {/* Review note (se já revisado) */}
                {req.reviewNote && (
                    <div style={{
                        fontSize: '0.74rem',
                        color: req.status === 'APROVADA' || req.status === 'RECEBIDA' ? '#047857' : '#DC2626',
                        background: req.status === 'APROVADA' || req.status === 'RECEBIDA' ? 'rgba(5,150,105,0.06)' : 'rgba(220,38,38,0.06)',
                        padding: '0.55rem 0.75rem', borderRadius: 8,
                        marginBottom: 10,
                    }}>
                        <strong>
                            {req.status === 'APROVADA' || req.status === 'RECEBIDA' ? '✓ Aprovado' : '✗ Rejeitado'}
                            {' '}por {req.reviewer?.name ?? '—'}:
                        </strong>
                        <div style={{ marginTop: 2 }}>{req.reviewNote}</div>
                    </div>
                )}

                {/* Status detalhado para APROVADA (em trânsito) */}
                {req.status === 'APROVADA' && (
                    <div style={{
                        fontSize: '0.74rem', color: '#1E3A8A',
                        background: 'rgba(59,130,246,0.06)',
                        padding: '0.55rem 0.75rem', borderRadius: 8,
                        marginBottom: 10, border: '1px solid rgba(59,130,246,0.2)',
                    }}>
                        📦 <strong>Em trânsito</strong> — saldo real ainda não subiu. Aguardando pagamento da conta a pagar
                        {req.contaPagar?.status && (
                            <span> (situação: <strong>{CONTA_PAGAR_STATUS_LABEL[req.contaPagar.status] ?? 'Em processamento'}</strong>)</span>
                        )}
                        {' '}ou confirmação manual de recebimento.
                        {req.contaPagar?.id && (
                            <div style={{ marginTop: 6 }}>
                                <Link
                                    href={`/admin/contas-a-pagar?highlight=${req.contaPagar.id}`}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                        padding: '4px 10px', borderRadius: 7,
                                        background: '#fff', border: '1px solid #93C5FD',
                                        color: '#1D4ED8', fontSize: '0.7rem', fontWeight: 800,
                                        textDecoration: 'none',
                                    }}>
                                    💳 Abrir conta a pagar →
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {/* Status detalhado para RECEBIDA */}
                {req.status === 'RECEBIDA' && (
                    <div style={{
                        fontSize: '0.74rem', color: '#047857',
                        background: 'rgba(5,150,105,0.06)',
                        padding: '0.55rem 0.75rem', borderRadius: 8,
                        marginBottom: 10, border: '1px solid rgba(5,150,105,0.2)',
                    }}>
                        ✅ <strong>Recebida</strong> — saldo real do estoque atualizado e movimentação de reposição registrada.
                    </div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '0.66rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono, monospace' }}>
                        {new Date(req.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {canReview && (
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button
                                onClick={onReject}
                                style={{
                                    padding: '6px 12px', borderRadius: 8,
                                    background: '#FEF2F2', border: '1px solid #FECACA',
                                    color: '#DC2626', fontSize: '0.74rem', fontWeight: 700,
                                    cursor: 'pointer',
                                }}>
                                Rejeitar
                            </button>
                            <button
                                onClick={onApprove}
                                style={{
                                    padding: '6px 14px', borderRadius: 8, border: 'none',
                                    background: 'linear-gradient(135deg, #10B981, #059669)',
                                    color: '#fff', fontSize: '0.74rem', fontWeight: 800,
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(5,150,105,0.3)',
                                }}>
                                ✅ Aprovar
                            </button>
                        </div>
                    )}
                    {canReceive && onConfirmReceipt && (
                        <button
                            onClick={onConfirmReceipt}
                            title="Marca como recebida manualmente — sobe o saldo real do estoque. Pode ser clicado mais de uma vez sem efeitos duplicados."
                            style={{
                                padding: '6px 14px', borderRadius: 8, border: 'none',
                                background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                                color: '#fff', fontSize: '0.74rem', fontWeight: 800,
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
                            }}>
                            📦 Marcar como recebido
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
