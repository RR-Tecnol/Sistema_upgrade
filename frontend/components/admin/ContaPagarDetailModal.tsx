'use client';

/**
 * Modal de detalhes / rastreio de uma Conta a Pagar.
 *
 * Sucessor do `ContaRastreioModal` original. Visual alinhado com o detalhe de
 * Inscrições (`EmployeeStyleAdminDetailShell`): header escuro com avatar e
 * status badge, body com 4 tabs e footer com ações administrativas.
 *
 * Estrutura:
 *  - HEADER: avatar com ícone do tipo, status badge, headline (descrição),
 *    tags de contexto (tipo, valor, cidade, ação vinculada).
 *  - SEÇÃO FIXA: comprovante (anexo) com lightbox + upload + remover.
 *    Fica fora das tabs porque é o item mais crítico para conformidade
 *    financeira — admin precisa enxergar de cara.
 *  - TABS:
 *    1. Resumo executivo — pills grandes em grade
 *    2. Origem & auditoria — render condicional por `tipo_conta`
 *       (estoque, feedback PIX, diária, manutenção, reembolso, manual)
 *    3. Vínculos — todos os relacionamentos identificáveis, sem UUIDs
 *    4. Conformidade — checklist binário com ✓/⚠/✗
 *  - FOOTER: Editar | Marcar como paga | Anexar | Excluir | Fechar
 *
 * Padrão de upload: usa o helper `uploadContaComprovante` (presigned PUT
 * direto no MinIO + PATCH para persistir o URL). Lightbox abre o arquivo
 * via GET presigned (`/contas-pagar/:id/comprovante-view-url`).
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
    EmployeeStyleAdminDetailShell,
    EmployeeStylePill,
    EmployeeStyleSectionTitle,
} from '@/components/admin/employee-style-admin-detail';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';
import type { ContaPagar } from '@/lib/api/contasPagar';
import {
    getContaComprovanteViewUrl,
    removeContaComprovante,
    uploadContaComprovante,
} from '@/lib/api/contasPagar';
import {
    STATUS_CFG,
    REIMBURSEMENT_CATEGORY_LABELS,
    parseReimbursementMeta,
    fmtCur,
    fmtDate,
    fmtDateTime,
    humanizeObservacoes,
    extractObservacoesChips,
    type ContaStatus,
} from '@/lib/contasPagarHelpers';
import { getTipo, ORIGEM_TIPO_CONTA } from '@/lib/contasPagarTipoConta';
import { toast } from '@/components/ui/Toast';
import { roleLabel } from '@/lib/i18n';

type Tab = 'resumo' | 'origem' | 'vinculos' | 'conformidade';

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'resumo',        label: 'Resumo executivo',  icon: '📋' },
    { id: 'origem',        label: 'Origem & auditoria', icon: '🧭' },
    { id: 'vinculos',      label: 'Vínculos',          icon: '🔗' },
    { id: 'conformidade',  label: 'Conformidade',      icon: '🛡️' },
];

const TIPO_COLOR_FALLBACK = '#6B7280';

export type ContaPagarDetailModalProps = {
    conta: ContaPagar;
    canEdit?: boolean;
    canDelete?: boolean;
    canMarkAsPaid?: boolean;
    onClose: () => void;
    onEdit?: () => void;
    onMarkAsPaid?: () => void;
    onDelete?: () => void;
    /** Disparado após upload/remover comprovante para o pai recarregar a lista. */
    onAttachmentChange?: () => void;
};

export function ContaPagarDetailModal({
    conta,
    canEdit = true,
    canDelete = true,
    canMarkAsPaid = true,
    onClose,
    onEdit,
    onMarkAsPaid,
    onDelete,
    onAttachmentChange,
}: ContaPagarDetailModalProps) {
    const [tab, setTab] = useState<Tab>('resumo');
    const statusCfg = STATUS_CFG[conta.status as ContaStatus] ?? STATUS_CFG.pendente;
    const tipo = getTipo(conta.tipo_conta);
    const origem = ORIGEM_TIPO_CONTA[conta.tipo_conta];
    const reimbursementMeta = useMemo(() => parseReimbursementMeta(conta), [conta]);

    const accentColor = tipo.color || TIPO_COLOR_FALLBACK;

    // ── Comprovante (anexo) ──
    const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(conta.comprovante_url ?? null);
    const [comprovanteLoading, setComprovanteLoading] = useState(false);
    const [comprovantePreviewUrl, setComprovantePreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    // Mantém o URL local sincronizado quando o pai re-busca a conta.
    useEffect(() => {
        setComprovanteUrl(conta.comprovante_url ?? null);
    }, [conta.comprovante_url, conta.id]);

    // Resolve URL para preview (presigned GET) sempre que o comprovante mudar.
    useEffect(() => {
        let cancelled = false;
        if (!comprovanteUrl) {
            setComprovantePreviewUrl(null);
            return;
        }
        (async () => {
            try {
                const { url } = await getContaComprovanteViewUrl(conta.id);
                if (!cancelled) setComprovantePreviewUrl(url || comprovanteUrl);
            } catch {
                if (!cancelled) setComprovantePreviewUrl(comprovanteUrl);
            }
        })();
        return () => { cancelled = true; };
    }, [conta.id, comprovanteUrl]);

    const handleFileSelect = async (file: File) => {
        if (!file) return;
        const limitMb = 8;
        if (file.size > limitMb * 1024 * 1024) {
            toast.error(`Arquivo muito grande (máx ${limitMb} MB).`);
            return;
        }
        setComprovanteLoading(true);
        try {
            const res = await uploadContaComprovante(conta.id, file);
            setComprovanteUrl(res.comprovante_url);
            toast.success('Comprovante anexado com sucesso.');
            onAttachmentChange?.();
        } catch (err: any) {
            toast.error(err?.message || 'Falha ao anexar comprovante.');
        } finally {
            setComprovanteLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveComprovante = async () => {
        if (!comprovanteUrl) return;
        if (!confirm('Remover o comprovante anexado desta conta? O arquivo continua no armazenamento, só o vínculo é desfeito.')) return;
        setComprovanteLoading(true);
        try {
            await removeContaComprovante(conta.id);
            setComprovanteUrl(null);
            toast.success('Comprovante removido.');
            onAttachmentChange?.();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Falha ao remover comprovante.');
        } finally {
            setComprovanteLoading(false);
        }
    };

    // ── HEADER tags ──
    const headerTags = (
        <>
            <HeaderChip color={accentColor} icon={tipo.icon} label={tipo.label} />
            <HeaderChip color={statusCfg.color} icon="💰" label={fmtCur(conta.valor)} />
            {conta.cidade?.trim() && (
                <HeaderChip color="#0EA5E9" icon="📍" label={conta.cidade} />
            )}
            {conta.acao && (
                <HeaderChip color="#8B5CF6" icon="🎯" label={`Ação: ${conta.acao.nome}`} />
            )}
            {conta.recorrente && (
                <HeaderChip color="#0891B2" icon="🔁" label="Recorrente" />
            )}
        </>
    );

    const statusBadge = (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 999,
            background: statusCfg.bg,
            border: `1px solid ${statusCfg.border}`,
            color: statusCfg.color,
            fontSize: '0.7rem', fontWeight: 800,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            fontFamily: 'Orbitron, sans-serif',
        }}>
            {statusCfg.icon} {statusCfg.label}
        </span>
    );

    // ── FOOTER ──
    const footer = (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <button
                type="button"
                onClick={onClose}
                style={btnSecondary}
            >
                Fechar
            </button>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileSelect(f);
                    }}
                />
                <button
                    type="button"
                    disabled={comprovanteLoading}
                    onClick={() => fileInputRef.current?.click()}
                    style={btnOutline(accentColor)}
                >
                    📎 {comprovanteLoading ? 'Anexando…' : (comprovanteUrl ? 'Substituir anexo' : 'Anexar comprovante')}
                </button>
                {canMarkAsPaid && conta.status !== 'paga' && conta.status !== 'cancelada' && onMarkAsPaid && (
                    <button type="button" onClick={onMarkAsPaid} style={btnPrimary('#059669')}>
                        💳 Marcar como paga
                    </button>
                )}
                {canEdit && onEdit && (
                    <button type="button" onClick={onEdit} style={btnPrimary(accentColor)}>
                        ✎ Editar
                    </button>
                )}
                {canDelete && onDelete && (
                    <button type="button" onClick={onDelete} style={btnDanger}>
                        🗑 Excluir
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <>
            <EmployeeStyleAdminDetailShell
                onClose={onClose}
                accentColor={accentColor}
                accentGlow={`${accentColor}55`}
                initials={(tipo.icon || '💳').slice(0, 2)}
                statusBadge={statusBadge}
                headline={conta.descricao}
                headerTags={headerTags}
                footer={footer}
            >
                {/* Anexo / comprovante — bloco fixo sempre visível */}
                <ComprovanteSection
                    comprovanteUrl={comprovanteUrl}
                    previewUrl={comprovantePreviewUrl}
                    loading={comprovanteLoading}
                    onOpen={() => setLightboxOpen(true)}
                    onAttachClick={() => fileInputRef.current?.click()}
                    onRemove={handleRemoveComprovante}
                    accentColor={accentColor}
                />

                {/* Barra de tabs */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {TABS.map((t) => {
                        const active = tab === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setTab(t.id)}
                                style={{
                                    padding: '8px 14px', borderRadius: 10,
                                    border: `1.5px solid ${active ? accentColor : '#E5E7EB'}`,
                                    background: active ? `${accentColor}14` : '#fff',
                                    color: active ? accentColor : '#6B7280',
                                    fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    transition: 'all .15s',
                                }}
                            >
                                {t.icon} {t.label}
                            </button>
                        );
                    })}
                </div>

                {/* Conteúdo da tab atual */}
                {tab === 'resumo'       && <TabResumo       conta={conta} accent={accentColor} statusCfg={statusCfg} tipoLabel={tipo.label} />}
                {tab === 'origem'       && <TabOrigem       conta={conta} accent={accentColor} reimbursementMeta={reimbursementMeta} origem={origem} />}
                {tab === 'vinculos'     && <TabVinculos     conta={conta} accent={accentColor} reimbursementMeta={reimbursementMeta} />}
                {tab === 'conformidade' && <TabConformidade conta={conta} accent={accentColor} comprovanteUrl={comprovanteUrl} />}
            </EmployeeStyleAdminDetailShell>

            {lightboxOpen && comprovantePreviewUrl && (
                <Lightbox url={comprovantePreviewUrl} onClose={() => setLightboxOpen(false)} />
            )}
        </>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ═══════════════════════════════════════════════════════════════════════════

function HeaderChip({ color, icon, label }: { color: string; icon: string; label: string }) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 999,
            background: `${color}22`, border: `1px solid ${color}55`,
            fontSize: '0.7rem', fontWeight: 700, color,
            maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
            {icon} {label}
        </span>
    );
}

function ComprovanteSection({
    comprovanteUrl, previewUrl, loading, onOpen, onAttachClick, onRemove, accentColor,
}: {
    comprovanteUrl: string | null;
    previewUrl: string | null;
    loading: boolean;
    onOpen: () => void;
    onAttachClick: () => void;
    onRemove: () => void;
    accentColor: string;
}) {
    if (!comprovanteUrl) {
        return (
            <div style={{
                border: `1.5px dashed ${accentColor}55`, borderRadius: 14,
                padding: '1rem 1.2rem',
                background: `${accentColor}06`,
                display: 'flex', alignItems: 'center', gap: 12,
            }}>
                <div style={{
                    width: 42, height: 42, borderRadius: 10,
                    background: `${accentColor}18`, border: `1.5px solid ${accentColor}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.4rem',
                }}>📎</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: '#111827', fontSize: '0.92rem' }}>Nenhum comprovante anexado</div>
                    <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 2 }}>
                        Anexe a nota fiscal, recibo ou comprovante de pagamento (PDF, JPG ou PNG até 8&nbsp;MB).
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onAttachClick}
                    disabled={loading}
                    style={{
                        padding: '8px 14px', borderRadius: 10, border: 'none',
                        background: accentColor, color: '#fff',
                        fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                        opacity: loading ? 0.6 : 1,
                    }}>
                    + {loading ? 'Anexando…' : 'Anexar agora'}
                </button>
            </div>
        );
    }

    const isPdf = /\.pdf(\?.*)?$/i.test(comprovanteUrl);
    return (
        <div style={{
            border: `1.5px solid ${accentColor}33`, borderRadius: 14,
            padding: '0.85rem 1rem',
            background: '#fff',
            display: 'flex', alignItems: 'center', gap: 14,
        }}>
            <button
                type="button"
                onClick={onOpen}
                style={{
                    width: 84, height: 84, flexShrink: 0,
                    borderRadius: 12, border: `1.5px solid ${accentColor}33`,
                    background: '#F8FAFC', cursor: 'pointer', padding: 0, overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                {isPdf || !previewUrl ? (
                    <span style={{ fontSize: '2rem' }}>{isPdf ? '📄' : '🖼️'}</span>
                ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="Comprovante" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: '#111827', fontSize: '0.92rem' }}>
                    📎 Comprovante anexado
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2, wordBreak: 'break-all' }}>
                    {comprovanteUrl.split('/').pop()}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    <button type="button" onClick={onOpen} style={miniBtn(accentColor)}>👁 Visualizar</button>
                    {previewUrl && (
                        <a href={previewUrl} target="_blank" rel="noreferrer" download style={{ ...miniBtn('#0891B2'), textDecoration: 'none' }}>
                            ⬇ Download
                        </a>
                    )}
                    <button type="button" onClick={onAttachClick} style={miniBtn('#6366F1')}>↻ Substituir</button>
                    <button type="button" onClick={onRemove} disabled={loading} style={miniBtn('#DC2626')}>
                        🗑 Remover
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── TAB 1 — RESUMO EXECUTIVO ─────────────────────────────────────────────
function TabResumo({ conta, accent, statusCfg, tipoLabel }: { conta: ContaPagar; accent: string; statusCfg: typeof STATUS_CFG[ContaStatus]; tipoLabel: string }) {
    const diasAteVencer = Math.round((new Date(conta.data_vencimento).getTime() - Date.now()) / 86400000);
    const diasDesdeCreacao = Math.round((Date.now() - new Date(conta.createdAt).getTime()) / 86400000);

    return (
        <div>
            <EmployeeStyleSectionTitle icon="📋" title="Resumo financeiro" color={accent} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <EmployeeStylePill icon="🏷️" label="Tipo de conta" value={tipoLabel} accent={accent} />
                <EmployeeStylePill icon={statusCfg.icon} label="Status" value={statusCfg.label} accent={statusCfg.color} />
                <EmployeeStylePill icon="💰" label="Valor" value={fmtCur(conta.valor)} accent="#059669" />
                <EmployeeStylePill icon="📅" label="Vencimento" value={`${fmtDate(conta.data_vencimento)}${diasAteVencer >= 0 ? ` (em ${diasAteVencer} dia${diasAteVencer === 1 ? '' : 's'})` : ` (${Math.abs(diasAteVencer)} dia${diasAteVencer === -1 ? '' : 's'} atrás)`}`} accent="#F59E0B" />
                <EmployeeStylePill icon="✅" label="Pagamento" value={conta.data_pagamento ? fmtDate(conta.data_pagamento) : 'Ainda não pago'} accent={conta.data_pagamento ? '#059669' : '#9CA3AF'} />
                <EmployeeStylePill icon="🏙️" label="Cidade" value={conta.cidade?.trim() || 'Não informada'} accent="#0EA5E9" />
                <EmployeeStylePill icon="🔁" label="Recorrente" value={conta.recorrente ? 'Sim' : 'Não'} accent={conta.recorrente ? '#0891B2' : '#9CA3AF'} />
                <EmployeeStylePill icon="🕐" label="Criada há" value={`${diasDesdeCreacao} dia${diasDesdeCreacao === 1 ? '' : 's'}`} accent="#8B5CF6" />
            </div>

            {humanizeObservacoes(conta.observacoes) && (
                <div style={{ marginTop: 18 }}>
                    <EmployeeStyleSectionTitle icon="📝" title="Observações" color="#64748B" />
                    <div style={{
                        background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 12,
                        padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#334155',
                        lineHeight: 1.55, whiteSpace: 'pre-wrap',
                    }}>
                        {humanizeObservacoes(conta.observacoes)}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── TAB 2 — ORIGEM & AUDITORIA ───────────────────────────────────────────
function TabOrigem({
    conta, accent, reimbursementMeta, origem,
}: {
    conta: ContaPagar; accent: string;
    reimbursementMeta: ReturnType<typeof parseReimbursementMeta>;
    origem?: { modulo: string; notas: string };
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
                <EmployeeStyleSectionTitle icon="🧭" title="Origem do lançamento" color={accent} />
                <OriginCard tipoConta={conta.tipo_conta} origem={origem} />
            </div>

            {/* Renderização específica por tipo */}
            {conta.stockPurchaseRequest && (
                <div>
                    <EmployeeStyleSectionTitle icon="🛒" title="Solicitação de compra" color="#F59E0B" />
                    <StockPurchaseCard pr={conta.stockPurchaseRequest} />
                </div>
            )}

            {conta.courseFeedback && (
                <div>
                    <EmployeeStyleSectionTitle icon="✨" title="Feedback do aluno (PIX)" color="#EC4899" />
                    <FeedbackCard fb={conta.courseFeedback} />
                </div>
            )}

            {reimbursementMeta.isReimbursement && (
                <div>
                    <EmployeeStyleSectionTitle icon="🧾" title="Reembolso de funcionário" color="#2563EB" />
                    <ReimbursementCard meta={reimbursementMeta} />
                </div>
            )}

            {(conta.tipo_conta === 'diaria_funcionario' || conta.tipo_conta === 'manutencao') && conta.acao && (
                <div>
                    <EmployeeStyleSectionTitle icon="🎯" title="Ação vinculada" color="#8B5CF6" />
                    <AcaoCard acaoId={conta.acao.id} acaoNome={conta.acao.nome} />
                </div>
            )}

            <div>
                <EmployeeStyleSectionTitle icon="📅" title="Linha do tempo administrativa" color="#64748B" />
                <Timeline accent={accent} conta={conta} />
            </div>
        </div>
    );
}

function OriginCard({ tipoConta, origem }: { tipoConta: string; origem?: { modulo: string; notas: string } }) {
    const isAutomatic = !!origem && /\.service|reimbursement\.service|feedbacks\.service|acoes\.service|truck-maintenance|stock\.service/.test(origem.modulo);
    return (
        <div style={{
            background: isAutomatic ? 'rgba(16,185,129,0.06)' : '#F8FAFC',
            border: `1.5px solid ${isAutomatic ? 'rgba(16,185,129,0.25)' : '#E2E8F0'}`,
            borderRadius: 12, padding: '0.95rem 1.1rem',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: '1.4rem' }}>{isAutomatic ? '⚙️' : '✍️'}</span>
                <div style={{ fontWeight: 800, color: '#111827' }}>
                    {isAutomatic ? 'Gerada automaticamente pelo sistema' : 'Lançamento manual administrativo'}
                </div>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.55 }}>
                {origem?.notas
                    || `Conta tipo "${tipoConta}" criada manualmente em /admin/contas-a-pagar. Não há fluxo automático associado a este tipo no sistema.`}
            </div>
        </div>
    );
}

function StockPurchaseCard({ pr }: { pr: NonNullable<ContaPagar['stockPurchaseRequest']> }) {
    const statusLabel: Record<string, string> = {
        PENDENTE: 'Pendente de análise',
        APROVADA: 'Aprovada (em trânsito)',
        RECEBIDA: 'Recebida no estoque',
        REJEITADA: 'Rejeitada',
        CANCELADA: 'Cancelada',
    };
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Card PR */}
            <div style={{ background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: 12, padding: '0.95rem 1.1rem' }}>
                <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#92400E', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    🛒 Solicitação #{pr.id.slice(0, 8)}
                </div>
                <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#374151', lineHeight: 1.7 }}>
                    <KV label="Estado"           value={statusLabel[pr.status] ?? pr.status} />
                    <KV label="Quantidade"       value={`${Number(pr.quantidade)} ${pr.stockItem.unidade}`} />
                    <KV label="Preço unitário"   value={fmtCur(pr.precoUnitario)} />
                    <KV label="Total"            value={fmtCur(pr.valorTotal)} />
                    {pr.fornecedor && <KV label="Fornecedor" value={pr.fornecedor} />}
                    {pr.urgente && <KV label="Prioridade" value="🔥 Urgente" valueColor="#DC2626" />}
                    <KV label="Solicitada por"   value={`${pr.requester.name} (${roleLabel(pr.requester.role)})`} />
                    {pr.reviewer && <KV label="Aprovada por" value={`${pr.reviewer.name} (${roleLabel(pr.reviewer.role)})`} />}
                    {pr.reviewedAt && <KV label="Aprovada em" value={fmtDateTime(pr.reviewedAt)} />}
                </div>
                {pr.justificativa && (
                    <div style={{ marginTop: 10, padding: '8px 10px', background: '#fff', border: '1px solid #FCD34D', borderRadius: 8, fontSize: '0.78rem', color: '#78350F', fontStyle: 'italic' }}>
                        “{pr.justificativa}”
                    </div>
                )}
                <div style={{ marginTop: 10 }}>
                    <Link href={`/admin/estoque?tab=solicitacoes&highlight=${encodeURIComponent(pr.id)}`} style={linkBtn('#92400E')}>
                        Abrir solicitação →
                    </Link>
                </div>
            </div>

            {/* Card Item */}
            <div style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '0.95rem 1.1rem' }}>
                <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#6B7280', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    📦 Item de estoque
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    {pr.stockItem.fotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={pr.stockItem.fotoUrl} alt={pr.stockItem.nome} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 10, border: '1px solid #E5E7EB' }} />
                    ) : (
                        <div style={{ width: 56, height: 56, borderRadius: 10, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>📦</div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 800, color: '#111827', fontSize: '0.9rem' }}>{pr.stockItem.nome}</div>
                        {pr.stockItem.codigoInterno && (
                            <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono, monospace' }}>{pr.stockItem.codigoInterno}</div>
                        )}
                    </div>
                </div>
                <div style={{ marginTop: 8, fontSize: '0.82rem', color: '#374151', lineHeight: 1.65 }}>
                    <KV label="Categoria"      value={pr.stockItem.categoria} />
                    <KV label="Unidade"        value={pr.stockItem.unidade} />
                    <KV label="Saldo atual"    value={`${Number(pr.stockItem.quantidadeAtual)} ${pr.stockItem.unidade}`} />
                </div>
                <div style={{ marginTop: 10 }}>
                    <Link href={`/admin/estoque/itens/${pr.stockItem.id}`} style={linkBtn('#0891B2')}>
                        Abrir ficha do item →
                    </Link>
                </div>
            </div>
        </div>
    );
}

function FeedbackCard({ fb }: { fb: NonNullable<ContaPagar['courseFeedback']> }) {
    const photos = [fb.currentPhotoUrl, fb.socialPostProofUrl].filter(Boolean) as string[];
    return (
        <div style={{ background: 'rgba(236,72,153,0.06)', border: '1.5px solid rgba(236,72,153,0.25)', borderRadius: 12, padding: '0.95rem 1.1rem' }}>
            <div style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.65 }}>
                <KV label="Aluno"    value={fb.student?.user?.name || 'Não informado'} />
                {fb.student?.user?.email && <KV label="E-mail" value={fb.student.user.email} />}
                {fb.status && <KV label="Estado do feedback" value={fb.status} />}
                {fb.studentSubmitSequence && <KV label="Tentativa #" value={String(fb.studentSubmitSequence)} />}
                {fb.resubmittedAfterReject && <KV label="Reenviado após rejeição" value="Sim" valueColor="#F59E0B" />}
                {fb.rejectionReason && <KV label="Motivo de rejeição anterior" value={fb.rejectionReason} />}
            </div>
            {photos.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {photos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={i === 0 ? 'Foto atual' : 'Prova do post'} style={{ width: 110, height: 110, objectFit: 'cover', borderRadius: 10, border: '1.5px solid #EC4899' }} />
                            <div style={{ fontSize: '0.7rem', color: '#9D174D', textAlign: 'center', marginTop: 4 }}>
                                {i === 0 ? '📸 Foto atual' : '📲 Prova do post'}
                            </div>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}

function ReimbursementCard({ meta }: { meta: ReturnType<typeof parseReimbursementMeta> }) {
    return (
        <div style={{ background: 'rgba(37,99,235,0.06)', border: '1.5px solid rgba(37,99,235,0.25)', borderRadius: 12, padding: '0.95rem 1.1rem' }}>
            <div style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.7 }}>
                {meta.reimbursementId && <KV label="Identificador da solicitação" value={meta.reimbursementId.slice(0, 8) + '…'} />}
                {meta.category && <KV label="Categoria" value={REIMBURSEMENT_CATEGORY_LABELS[meta.category] || meta.category} />}
                {meta.reason && <KV label="Motivo" value={meta.reason} />}
            </div>
        </div>
    );
}

function AcaoCard({ acaoId, acaoNome }: { acaoId: string; acaoNome: string }) {
    return (
        <div style={{ background: 'rgba(139,92,246,0.06)', border: '1.5px solid rgba(139,92,246,0.25)', borderRadius: 12, padding: '0.95rem 1.1rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: '#8B5CF615', border: '1.5px solid #8B5CF630', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>🎯</div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: '#111827', fontSize: '0.92rem' }}>{acaoNome}</div>
                <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>Conta vinculada à ação operacional</div>
            </div>
            <Link href={`/admin/acoes/${acaoId}`} style={linkBtn('#8B5CF6')}>
                Abrir ação →
            </Link>
        </div>
    );
}

function Timeline({ accent, conta }: { accent: string; conta: ContaPagar }) {
    const events: Array<{ label: string; when: string; detail: string }> = [
        { label: 'Cadastro', when: conta.createdAt, detail: 'Conta criada e registrada na listagem financeira.' },
        { label: 'Vencimento planejado', when: conta.data_vencimento, detail: `Status atual: ${STATUS_CFG[conta.status as ContaStatus]?.label ?? conta.status}.` },
    ];
    if (conta.data_pagamento) {
        events.push({ label: 'Liquidação', when: conta.data_pagamento, detail: 'Pagamento registrado no fluxo financeiro.' });
    }
    if (conta.updatedAt && conta.updatedAt !== conta.createdAt) {
        events.push({ label: 'Última atualização', when: conta.updatedAt, detail: 'Alteração administrativa no lançamento.' });
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {events.map((ev, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ marginTop: 5, width: 9, height: 9, borderRadius: '50%', background: accent, flexShrink: 0, boxShadow: `0 0 0 3px ${accent}22` }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, color: '#374151', fontSize: '0.88rem' }}>{ev.label}</div>
                        <div style={{ fontSize: '0.76rem', color: '#9CA3AF', marginTop: 2 }}>
                            {fmtDateTime(ev.when)} · {ev.detail}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── TAB 3 — VÍNCULOS ─────────────────────────────────────────────────────
function TabVinculos({
    conta, accent, reimbursementMeta,
}: {
    conta: ContaPagar; accent: string;
    reimbursementMeta: ReturnType<typeof parseReimbursementMeta>;
}) {
    const chips = useMemo(() => extractObservacoesChips(conta.observacoes), [conta.observacoes]);

    const vinculos: Array<{
        title: string; icon: string; color: string;
        href?: string;
        descricao: ReactNode;
    }> = [];

    if (conta.acao) {
        vinculos.push({
            title: `Ação operacional — ${conta.acao.nome}`,
            icon: '🎯', color: '#8B5CF6',
            href: `/admin/acoes/${conta.acao.id}`,
            descricao: 'Esta conta foi vinculada manualmente ou automaticamente a uma ação. Custos da ação somam aqui.',
        });
    }
    if (conta.stockPurchaseRequest) {
        vinculos.push({
            title: `Solicitação de compra — ${conta.stockPurchaseRequest.stockItem.nome}`,
            icon: '🛒', color: '#F59E0B',
            href: `/admin/estoque?tab=solicitacoes&highlight=${encodeURIComponent(conta.stockPurchaseRequest.id)}`,
            descricao: `Gerada automaticamente quando a solicitação foi aprovada. Marcar esta conta como paga confirma o recebimento do material e sobe o saldo do item.`,
        });
    }
    if (conta.courseFeedback) {
        vinculos.push({
            title: `Feedback PIX — ${conta.courseFeedback.student?.user?.name ?? 'Aluno'}`,
            icon: '✨', color: '#EC4899',
            descricao: 'Gerada automaticamente quando o admin aprovou o feedback do aluno (premiação via PIX). O comprovante de pagamento é exigido.',
        });
    }
    if (reimbursementMeta.isReimbursement) {
        vinculos.push({
            title: `Reembolso de funcionário`,
            icon: '🧾', color: '#2563EB',
            descricao: reimbursementMeta.reason || 'Conta gerada via aprovação de solicitação de reembolso. Categoria e motivo extraídos da observação.',
        });
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {vinculos.length === 0 && (
                <div style={{ padding: '1.2rem', background: '#F8FAFC', border: '1.5px dashed #CBD5E1', borderRadius: 12, textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
                    Nenhum vínculo automático identificado. Esta é uma conta manual sem integração com outros módulos.
                </div>
            )}
            {vinculos.map((v, i) => (
                <div key={i} style={{ background: '#fff', border: `1.5px solid ${v.color}33`, borderRadius: 12, padding: '0.95rem 1.1rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: `${v.color}15`, border: `1.5px solid ${v.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>{v.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, color: '#111827', fontSize: '0.9rem' }}>{v.title}</div>
                        <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 3, lineHeight: 1.5 }}>{v.descricao}</div>
                    </div>
                    {v.href && (
                        <Link href={v.href} style={linkBtn(v.color)}>
                            Abrir →
                        </Link>
                    )}
                </div>
            ))}

            {chips.length > 0 && (
                <div style={{ marginTop: 6 }}>
                    <EmployeeStyleSectionTitle icon="🏷️" title="Metadados extraídos das observações" color="#64748B" />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {chips.map((c, i) => (
                            <span key={i} style={{
                                padding: '5px 10px', borderRadius: 999,
                                background: '#F1F5F9', border: '1px solid #E2E8F0',
                                fontSize: '0.75rem', color: '#475569',
                            }}>
                                <strong>{c.label}:</strong> {c.value}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── TAB 4 — CONFORMIDADE ─────────────────────────────────────────────────
function TabConformidade({
    conta, accent, comprovanteUrl,
}: {
    conta: ContaPagar; accent: string; comprovanteUrl: string | null;
}) {
    type CheckResult = { status: 'ok' | 'warn' | 'fail'; label: string; detail: string };

    const checks: CheckResult[] = [];

    checks.push({
        status: Number(conta.valor) > 0 ? 'ok' : 'fail',
        label: 'Valor positivo',
        detail: Number(conta.valor) > 0 ? `Valor de ${fmtCur(conta.valor)} cadastrado.` : 'Valor zerado ou inválido — corrigir cadastro.',
    });

    checks.push({
        status: conta.data_vencimento ? 'ok' : 'fail',
        label: 'Vencimento informado',
        detail: conta.data_vencimento ? `${fmtDate(conta.data_vencimento)}.` : 'Data de vencimento ausente.',
    });

    const coerent =
        (conta.status === 'paga' && !!conta.data_pagamento) ||
        (conta.status !== 'paga' && !conta.data_pagamento);
    checks.push({
        status: coerent ? 'ok' : 'fail',
        label: 'Status coerente com data de pagamento',
        detail: coerent
            ? 'Status e datas batem (paga ↔ tem data de pagamento; demais ↔ sem data).'
            : conta.status === 'paga'
                ? 'Status marcado como Paga mas SEM data de pagamento.'
                : `Há data de pagamento mas status é ${conta.status}.`,
    });

    const hasLink = !!conta.acao || !!conta.stockPurchaseRequest || !!conta.courseFeedback || parseReimbursementMeta(conta).isReimbursement;
    checks.push({
        status: hasLink ? 'ok' : 'warn',
        label: 'Origem identificada e vinculada',
        detail: hasLink
            ? 'Esta conta tem pelo menos um vínculo rastreável (ação, solicitação, feedback ou reembolso).'
            : 'Conta manual sem vínculo a outro módulo. Auditoria depende só da observação textual.',
    });

    checks.push({
        status: comprovanteUrl ? 'ok' : (conta.status === 'paga' ? 'fail' : 'warn'),
        label: 'Comprovante anexado',
        detail: comprovanteUrl
            ? 'Arquivo de comprovante anexado e armazenado.'
            : conta.status === 'paga'
                ? 'Conta MARCADA COMO PAGA sem comprovante anexado. Anexe a nota/recibo para fechar a auditoria.'
                : 'Sem comprovante — opcional enquanto pendente, obrigatório após o pagamento.',
    });

    checks.push({
        status: conta.cidade?.trim() ? 'ok' : 'warn',
        label: 'Cidade informada',
        detail: conta.cidade?.trim() ? `Cidade: ${conta.cidade}.` : 'Cidade não informada — útil para fechamentos por UF.',
    });

    const daysToVencer = Math.round((new Date(conta.data_vencimento).getTime() - new Date(conta.createdAt).getTime()) / 86400000);
    checks.push({
        status: daysToVencer >= 0 ? 'ok' : 'warn',
        label: 'Linha do tempo plausível',
        detail: daysToVencer >= 0
            ? `${daysToVencer} dia${daysToVencer === 1 ? '' : 's'} entre criação e vencimento.`
            : 'Vencimento ANTERIOR à criação — possível erro de cadastro.',
    });

    const ok = checks.filter(c => c.status === 'ok').length;
    const warn = checks.filter(c => c.status === 'warn').length;
    const fail = checks.filter(c => c.status === 'fail').length;

    return (
        <div>
            <div style={{
                background: fail > 0 ? 'rgba(220,38,38,0.06)' : warn > 0 ? 'rgba(245,158,11,0.06)' : 'rgba(16,185,129,0.06)',
                border: `1.5px solid ${fail > 0 ? 'rgba(220,38,38,0.25)' : warn > 0 ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}`,
                borderRadius: 12, padding: '0.9rem 1.1rem', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 12,
            }}>
                <div style={{ fontSize: '2.2rem' }}>{fail > 0 ? '🚨' : warn > 0 ? '⚠️' : '✅'}</div>
                <div>
                    <div style={{ fontWeight: 800, color: '#111827', fontSize: '0.95rem' }}>
                        {fail > 0
                            ? `${fail} problema${fail === 1 ? '' : 's'} crítico${fail === 1 ? '' : 's'} encontrado${fail === 1 ? '' : 's'}`
                            : warn > 0
                                ? `${warn} ponto${warn === 1 ? '' : 's'} de atenção`
                                : 'Conformidade total — nenhum problema detectado'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                        ✅ {ok} OK · ⚠️ {warn} avisos · 🚨 {fail} críticos
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {checks.map((c, i) => {
                    const color = c.status === 'ok' ? '#059669' : c.status === 'warn' ? '#D97706' : '#DC2626';
                    const icon = c.status === 'ok' ? '✅' : c.status === 'warn' ? '⚠️' : '🚨';
                    return (
                        <div key={i} style={{
                            display: 'flex', gap: 12, alignItems: 'flex-start',
                            padding: '0.7rem 0.9rem',
                            border: `1.5px solid ${color}22`,
                            borderLeft: `3px solid ${color}`,
                            borderRadius: 10,
                            background: '#fff',
                        }}>
                            <span style={{ fontSize: '1rem', marginTop: 1 }}>{icon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 800, color: '#111827', fontSize: '0.85rem' }}>{c.label}</div>
                                <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 2, lineHeight: 1.5 }}>{c.detail}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── PRIMITIVAS DE LAYOUT ─────────────────────────────────────────────────
function KV({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8, marginBottom: 3 }}>
            <span style={{ color: '#9CA3AF', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em' }}>{label}</span>
            <span style={{ color: valueColor || '#1F2937', fontWeight: 600 }}>{value}</span>
        </div>
    );
}

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
    const isPdf = /\.pdf(\?.*)?$/i.test(url);
    // Renderizado num portal próprio para escapar do stacking context do modal
    // (`EmployeeStyleAdminDetailShell` cria um `ModalPortal` com z-index 500_000;
    // o lightbox precisa ficar ACIMA disso, daí +10).
    return (
        <ModalPortal>
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: MODAL_PORTAL_Z_INDEX + 10,
                    background: 'rgba(0,0,0,0.92)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 24, cursor: 'zoom-out',
                }}>
                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: 18, right: 18,
                        width: 40, height: 40, borderRadius: 10,
                        background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                        color: '#fff', fontSize: '1.2rem', cursor: 'pointer',
                        zIndex: 1,
                    }}>
                    ✕
                </button>
                {isPdf ? (
                    <iframe
                        src={url}
                        style={{ width: '90vw', height: '90vh', border: 'none', borderRadius: 12, background: '#fff' }}
                        title="Comprovante"
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={url}
                        alt="Comprovante"
                        style={{ maxWidth: '92vw', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,0.6)', cursor: 'default' }}
                        onClick={(e) => e.stopPropagation()}
                    />
                )}
            </div>
        </ModalPortal>
    );
}

// ─── ESTILOS REUTILIZÁVEIS ────────────────────────────────────────────────
const btnPrimary = (color: string): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 10, border: 'none',
    background: color, color: '#fff',
    fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
    fontFamily: 'inherit',
});
const btnOutline = (color: string): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${color}`,
    background: '#fff', color,
    fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
    fontFamily: 'inherit',
});
const btnSecondary: React.CSSProperties = {
    padding: '8px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB',
    background: '#fff', color: '#374151',
    fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
    fontFamily: 'inherit',
};
const btnDanger: React.CSSProperties = {
    padding: '8px 14px', borderRadius: 10, border: '1.5px solid #FECACA',
    background: '#FEF2F2', color: '#B91C1C',
    fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
    fontFamily: 'inherit',
};
const miniBtn = (color: string): React.CSSProperties => ({
    padding: '4px 9px', borderRadius: 7, border: `1px solid ${color}55`,
    background: `${color}10`, color,
    fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer',
    fontFamily: 'inherit',
});
const linkBtn = (color: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '5px 10px', borderRadius: 8,
    background: `${color}15`, border: `1px solid ${color}33`,
    color, fontSize: '0.74rem', fontWeight: 800,
    textDecoration: 'none', whiteSpace: 'nowrap',
});

export default ContaPagarDetailModal;
