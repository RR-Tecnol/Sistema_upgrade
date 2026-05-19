// @ts-nocheck
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import {
    stockApi,
    StockPurchaseRequest,
    StockPurchaseRequestStatus,
    StockItemCategory,
    PURCHASE_STATUS_LABEL,
    PURCHASE_STATUS_COLOR,
    resolveCategoria,
} from '@/lib/api/stock';
import { toast } from '@/components/ui/Toast';
import { roleLabel } from '@/lib/i18n';
import { customConfirm } from '@/components/ui/ConfirmModal';
import { AdminListPagination } from '@/components/admin/AdminListPagination';
import { normalizePaginated, ADMIN_PAGE_SIZE_TABLE } from '@/lib/api/pagination';

const STATUS_TABS: { value: StockPurchaseRequestStatus | 'all'; label: string; emoji: string }[] = [
    { value: 'PENDENTE', label: 'Pendentes', emoji: '⏳' },
    { value: 'APROVADA', label: 'Em trânsito', emoji: '📦' },
    { value: 'RECEBIDA', label: 'Recebidas', emoji: '✅' },
    { value: 'REJEITADA', label: 'Rejeitadas', emoji: '❌' },
    { value: 'CANCELADA', label: 'Canceladas', emoji: '🚫' },
    { value: 'all', label: 'Todas', emoji: '📋' },
];

interface Props {
    highlightPrId?: string | null;
    /** Estado inicial da fila de PRs (ex.: `?status=APROVADA` no hub). */
    initialStatusTab?: StockPurchaseRequestStatus | 'all';
    /** Filtro inicial por categoria (vindo da aba Verbas). */
    initialCategoria?: StockItemCategory | '';
    /** Chamado quando um PR é recebido (estoque central atualizado). */
    onStockUpdated?: () => void;
    /** Incrementar para forçar reload da lista (ex.: após criar PR via verba). */
    refreshKey?: number;
    /** Quando true, esconde botões Aprovar/Rejeitar/Marcar recebido — exibe só leitura. */
    readOnly?: boolean;
}

export function SolicitacoesEstoquePanel({ highlightPrId, initialStatusTab, initialCategoria, onStockUpdated, refreshKey, readOnly = false }: Props) {
    const [reqs, setReqs] = useState<StockPurchaseRequest[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [statusTab, setStatusTab] = useState<StockPurchaseRequestStatus | 'all'>(initialStatusTab ?? 'PENDENTE');
    const [filterCategoria, setFilterCategoria] = useState<StockItemCategory | ''>(initialCategoria ?? '');
    const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);

    const [reviewing, setReviewing] = useState<StockPurchaseRequest | null>(null);
    const [reviewMode, setReviewMode] = useState<'approve' | 'reject' | null>(null);
    const [reviewNote, setReviewNote] = useState('');
    const [reviewQuantity, setReviewQuantity] = useState<number | ''>('');
    const [reviewSupplier, setReviewSupplier] = useState('');
    const [updateMin, setUpdateMin] = useState(false);
    const [reviewMinimo, setReviewMinimo] = useState<number | ''>('');
    const [submitting, setSubmitting] = useState(false);

    // ── Verba PR approval specific state ─────────────────────────────
    const [verbaPrItemSearch, setVerbaPrItemSearch] = useState('');
    const [verbaPrItemId, setVerbaPrItemId] = useState('');
    const [verbaPrItemNome, setVerbaPrItemNome] = useState('');
    const [verbaPrItemUnidade, setVerbaPrItemUnidade] = useState('');
    const [verbaPrItems, setVerbaPrItems] = useState<{ id: string; nome: string; unidade: string; precoUnitario?: number | string | null; fornecedor?: string | null }[]>([]);
    const [verbaPrSearching, setVerbaPrSearching] = useState(false);
    const [verbaPrShowResults, setVerbaPrShowResults] = useState(false);
    const [verbaPrQty, setVerbaPrQty] = useState<number | ''>('');
    const [verbaPrPreco, setVerbaPrPreco] = useState<number | ''>('');
    const [verbaPrTotal, setVerbaPrTotal] = useState<number | ''>('');
    // Qual campo foi editado por último: define se o preço, ao mudar,
    // recalcula o Total (last='qty') ou a Quantidade (last='total').
    const [verbaPrLastEdit, setVerbaPrLastEdit] = useState<'qty' | 'total'>('qty');
    // ── Novo item inline ─────────────────────────────────────────────
    const [verbaPrIsNewItem, setVerbaPrIsNewItem] = useState(false);
    const [verbaPrNewItemUnidade, setVerbaPrNewItemUnidade] = useState('un');
    // ── Upload de foto ───────────────────────────────────────────────
    const [verbaPrFotoUrl, setVerbaPrFotoUrl] = useState('');
    const [verbaPrUploadingPhoto, setVerbaPrUploadingPhoto] = useState(false);
    const [verbaPrPhotoError, setVerbaPrPhotoError] = useState<string | null>(null);
    // Categoria da verba já tem insumo cadastrado?
    // null = ainda não checado · true/false após checagem
    // Quando true: modal esconde "cadastrar item novo" e força seleção de existente
    // (admin decide só qty × preço, igual ao fluxo de Insumos/Movimentações).
    const [verbaPrCategoriaTemInsumo, setVerbaPrCategoriaTemInsumo] = useState<boolean | null>(null);

    useEffect(() => {
        const u = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (u) {
            try {
                const parsed = JSON.parse(u);
                setCurrentUser({ id: parsed.id, role: parsed.role });
            } catch {
                /* ignore */
            }
        }
    }, []);

    useEffect(() => {
        if (initialStatusTab === undefined) return;
        setStatusTab(initialStatusTab);
    }, [initialStatusTab]);

    useEffect(() => {
        if (initialCategoria !== undefined) setFilterCategoria(initialCategoria);
    }, [initialCategoria]);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const raw = await stockApi.purchaseRequests.list({
                status: statusTab === 'all' ? undefined : statusTab,
                page,
                limit: ADMIN_PAGE_SIZE_TABLE,
            });
            const norm = normalizePaginated<StockPurchaseRequest>(raw, ADMIN_PAGE_SIZE_TABLE);
            setReqs(norm.data);
            setTotal(norm.total);
            setTotalPages(norm.totalPages);
        } catch (e) {
            console.error('[SolicitacoesEstoquePanel]', e);
            toast.error('Erro ao carregar solicitações');
        } finally {
            setLoading(false);
        }
    }, [statusTab, filterCategoria, page]);

    useEffect(() => { setPage(1); }, [statusTab, filterCategoria]);

    useEffect(() => {
        load();
    }, [load, refreshKey]);

    useEffect(() => {
        if (!highlightPrId || typeof document === 'undefined') return;
        const t = setTimeout(() => {
            const el = document.getElementById(`pr-card-${highlightPrId}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 400);
        return () => clearTimeout(t);
    }, [highlightPrId, reqs]);

    const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'IT_ADMIN';

    const resetVerbaPrState = () => {
        setVerbaPrItemSearch('');
        setVerbaPrItemId('');
        setVerbaPrItemNome('');
        setVerbaPrItemUnidade('');
        setVerbaPrItems([]);
        setVerbaPrSearching(false);
        setVerbaPrShowResults(false);
        setVerbaPrQty('');
        setVerbaPrPreco('');
        setVerbaPrTotal('');
        setVerbaPrLastEdit('qty');
        setVerbaPrIsNewItem(false);
        setVerbaPrNewItemUnidade('un');
        setVerbaPrFotoUrl('');
        setVerbaPrUploadingPhoto(false);
        setVerbaPrPhotoError(null);
        setVerbaPrCategoriaTemInsumo(null);
    };

    // ── Sincronização Quantidade ↔ Total (Preço Unit. é o multiplicador) ─
    // Admin pode digitar pela Qtd OU pelo Total — o outro lado recalcula.
    const handleQtyChange = (raw: string) => {
        const v = raw === '' ? '' : Number(raw);
        setVerbaPrQty(v);
        setVerbaPrLastEdit('qty');
        const p = Number(verbaPrPreco);
        if (v === '' || isNaN(Number(v))) { setVerbaPrTotal(''); return; }
        if (!isNaN(p) && p > 0) {
            setVerbaPrTotal(Number((Number(v) * p).toFixed(2)));
        }
    };

    const handleTotalChange = (raw: string) => {
        const v = raw === '' ? '' : Number(raw);
        setVerbaPrTotal(v);
        setVerbaPrLastEdit('total');
        const p = Number(verbaPrPreco);
        if (v === '' || isNaN(Number(v))) { setVerbaPrQty(''); return; }
        if (!isNaN(p) && p > 0) {
            setVerbaPrQty(Number((Number(v) / p).toFixed(3)));
        }
    };

    const handlePriceChange = (raw: string) => {
        const v = raw === '' ? '' : Number(raw);
        setVerbaPrPreco(v);
        if (v === '' || isNaN(Number(v)) || Number(v) <= 0) return;
        if (verbaPrLastEdit === 'qty' && verbaPrQty !== '') {
            setVerbaPrTotal(Number((Number(verbaPrQty) * Number(v)).toFixed(2)));
        } else if (verbaPrLastEdit === 'total' && verbaPrTotal !== '') {
            setVerbaPrQty(Number((Number(verbaPrTotal) / Number(v)).toFixed(3)));
        }
    };

    const handleVerbaPrPhotoUpload = async (file: File) => {
        setVerbaPrPhotoError(null);
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type)) { setVerbaPrPhotoError('Formato inválido. Use JPG, PNG ou WebP.'); return; }
        if (file.size > 5 * 1024 * 1024) { setVerbaPrPhotoError('Tamanho máximo: 5 MB.'); return; }
        setVerbaPrUploadingPhoto(true);
        try {
            const { url } = await stockApi.items.uploadPhoto(file);
            setVerbaPrFotoUrl(url);
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Falha ao enviar a foto.';
            setVerbaPrPhotoError(Array.isArray(msg) ? msg.join('; ') : msg);
        } finally {
            setVerbaPrUploadingPhoto(false);
        }
    };

    const openReview = (req: StockPurchaseRequest, mode: 'approve' | 'reject') => {
        setReviewing(req);
        setReviewMode(mode);
        setReviewNote('');
        resetVerbaPrState();
        if (mode === 'approve') {
            if (!(null as any) || !!req.stockItemId) {
                setReviewQuantity(Number(req.quantidade));
                setReviewSupplier(req.fornecedor || '');
                setUpdateMin(false);
                setReviewMinimo(Number(req.stockItem?.quantidadeMinima ?? 0));
            } else {
                setReviewSupplier(req.fornecedor || '');
                // Verba PR: descobrir se a categoria já tem insumo cadastrado.
                // Se tiver, o modal vai esconder a opção "cadastrar item novo"
                // e funcionar como o fluxo normal (selecionar item existente + qty × preço).
                const catEnum = (null as any)?.categoriaEnum as StockItemCategory | undefined;
                const catCustom = (null as any)?.categoriaCustomId ?? undefined;
                if (catEnum || catCustom) {
                    stockApi.items.getAll({
                        ...(catEnum ? { categoria: catEnum } : {}),
                        ...(catCustom ? { customCategoryId: catCustom } : {}),
                    })
                        .then(items => {
                            setVerbaPrItems(items.map((i: any) => ({
                                id: i.id,
                                nome: i.nome,
                                unidade: i.unidade,
                                precoUnitario: i.precoUnitario,
                                fornecedor: i.fornecedor,
                            })));
                            setVerbaPrCategoriaTemInsumo(items.length > 0);
                        })
                        .catch(() => setVerbaPrCategoriaTemInsumo(false));
                } else {
                    setVerbaPrCategoriaTemInsumo(false);
                }
            }
        } else {
            setReviewQuantity('');
            setReviewSupplier('');
            setUpdateMin(false);
            setReviewMinimo('');
        }
    };

    const closeReview = () => {
        setReviewing(null);
        setReviewMode(null);
        setReviewNote('');
        setReviewQuantity('');
        setReviewSupplier('');
        setUpdateMin(false);
        setReviewMinimo('');
        resetVerbaPrState();
    };

    const searchVerbaPrItems = async (q: string) => {
        setVerbaPrShowResults(true);
        // Sem texto: mantém a lista pré-carregada da categoria (já populada em openReview),
        // assim o admin vê os nomes da categoria só clicando/focando o input.
        if (q.trim().length === 0) { setVerbaPrSearching(false); return; }
        if (q.trim().length === 1) { setVerbaPrSearching(false); return; }
        setVerbaPrSearching(true);
        try {
            // Filtra a busca pela categoria da verba para que o admin só veja itens
            // relevantes àquela verba (não mistura insumos de outras categorias).
            const catEnum = reviewing?.stockBudget?.categoriaEnum as StockItemCategory | undefined;
            const catCustom = reviewing?.stockBudget?.categoriaCustomId ?? undefined;
            const data = await stockApi.items.getAll({
                search: q.trim(),
                ...(catEnum ? { categoria: catEnum } : {}),
                ...(catCustom ? { customCategoryId: catCustom } : {}),
            });
            setVerbaPrItems(data.map((i: any) => ({
                id: i.id,
                nome: i.nome,
                unidade: i.unidade,
                precoUnitario: i.precoUnitario,
                fornecedor: i.fornecedor,
            })));
        } catch {
            setVerbaPrItems([]);
        } finally {
            setVerbaPrSearching(false);
        }
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
                const isVerbaReview = !!(null as any);
                if (isVerbaReview) {
                    if (!verbaPrItemId && !verbaPrIsNewItem) { toast.error('Selecione o item a comprar ou cadastre um novo'); setSubmitting(false); return; }
                    if (verbaPrIsNewItem && !verbaPrItemNome.trim()) { toast.error('Informe o nome do novo item'); setSubmitting(false); return; }
                    if (verbaPrQty === '' || Number(verbaPrQty) <= 0) { toast.error('Informe a quantidade'); setSubmitting(false); return; }
                    if (verbaPrPreco === '' || Number(verbaPrPreco) <= 0) { toast.error('Informe o preço unitário'); setSubmitting(false); return; }

                    const approveData: any = {
                        quantidade: Number(verbaPrQty),
                        precoUnitario: Number(verbaPrPreco),
                        
                        reviewNote: reviewNote.trim() || undefined,
                    };
                    if (verbaPrIsNewItem) {
                        approveData.newItemData = {
                            nome: verbaPrItemNome.trim(),
                            unidade: verbaPrNewItemUnidade.trim() || 'un',
                            categoria: (null as any)?.categoriaEnum ?? 'OUTRO',
                            fotoUrl: verbaPrFotoUrl || undefined,
                        };
                    } else {
                        approveData.stockItemId = verbaPrItemId;
                    }
                    await stockApi.purchaseRequests.approve(reviewing.id, approveData);
                } else {
                    if (reviewQuantity === '' || Number(reviewQuantity) <= 0) {
                        toast.error('Quantidade inválida para aprovação');
                        setSubmitting(false);
                        return;
                    }
                    await stockApi.purchaseRequests.approve(reviewing.id, {
                        reviewNote: reviewNote.trim() || undefined,
                        quantidadeAprovada: Number(reviewQuantity),
                        
                        
                    });
                }
                toast.success('Solicitação aprovada');
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* ── STATUS TABS ── */}
            <div style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #FFFFFF 0%, #FFFDF5 50%, #F8FAFC 100%)',
                borderRadius: 14,
                border: '1.5px solid #E5D88A55',
                boxShadow: '0 2px 12px rgba(184,155,0,0.06)',
            }}>
                {STATUS_TABS.map((t) => {
                    const active = statusTab === t.value;
                    const color = t.value === 'all' ? '#6B7280' : PURCHASE_STATUS_COLOR[t.value as StockPurchaseRequestStatus];
                    return (
                        <button
                            key={t.value}
                            type="button"
                            onClick={() => setStatusTab(t.value)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 16px',
                                borderRadius: 10,
                                border: `1.5px solid ${active ? color : '#E5E7EB'}`,
                                background: active ? `${color}12` : '#fff',
                                color: active ? color : '#64748B',
                                fontSize: '0.78rem',
                                fontWeight: active ? 800 : 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontFamily: active ? 'Orbitron, sans-serif' : 'inherit',
                                letterSpacing: active ? '0.04em' : 'normal',
                            }}
                        >
                            <span>{t.emoji}</span> {t.label}
                        </button>
                    );
                })}
            </div>

            {/* ── FILTRO DE CATEGORIA (quando vindo da aba Verbas) ── */}
            {filterCategoria && (() => {
                const cat = resolveCategoria({ categoria: filterCategoria as StockItemCategory });
                return (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 16px',
                        background: `${cat.color}12`,
                        border: `1.5px solid ${cat.color}40`,
                        borderRadius: 10,
                    }}>
                        <span style={{ fontSize: '0.8rem' }}>
                            {cat.icon}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0F172A' }}>
                            Filtrando por: <strong>{cat.label}</strong>
                        </span>
                        <button
                            onClick={() => setFilterCategoria('')}
                            style={{
                                marginLeft: 'auto',
                                background: 'white', border: '1.5px solid #E2E8F0',
                                borderRadius: 8, padding: '3px 10px',
                                fontSize: '0.75rem', fontWeight: 700, color: '#64748B', cursor: 'pointer',
                            }}
                        >
                            × Remover filtro
                        </button>
                    </div>
                );
            })()}

            {/* ── TABLE HEADER ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{
                    fontFamily: 'Orbitron, sans-serif',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    letterSpacing: '0.12em',
                    color: '#B89B00',
                    textTransform: 'uppercase',
                }}>
                    Solicitações de compra
                </div>
                <span style={{
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: '#FFFDE7',
                    border: '1px solid #FEF08A',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#B89B00',
                }}>
                    {loading ? '...' : `${total} itens`}
                </span>
            </div>

            {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                    <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 0.75rem' }} />
                    <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.65rem', letterSpacing: '0.15em', color: '#94A3B8', textTransform: 'uppercase' }}>
                        Carregando...
                    </p>
                </div>
            ) : reqs.length === 0 ? (
                <div style={{
                    padding: '3rem 1.5rem',
                    textAlign: 'center',
                    background: 'linear-gradient(180deg, #FFFDF5 0%, #FAFBFC 100%)',
                    borderRadius: 14,
                    border: '1.5px dashed #E5D88A',
                }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FFFDE7', border: '1.5px solid #FEF08A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 12px' }}>🛒</div>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>Nenhuma solicitação</div>
                    <div style={{ fontSize: '0.82rem', marginTop: 6, color: '#64748B' }}>Nenhuma solicitação encontrada neste filtro.</div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                    {reqs.map((req) => (
                        <div key={req.id} id={`pr-card-${req.id}`}>
                            <RequestCard
                                req={req}
                                highlight={highlightPrId === req.id}
                                canReview={!readOnly && isAdmin && req.status === 'PENDENTE'}
                                canReceive={!readOnly && isAdmin && req.status === 'APROVADA'}
                                onApprove={() => openReview(req, 'approve')}
                                onReject={() => openReview(req, 'reject')}
                                onConfirmReceipt={async () => {
                                    const recDesc = (null as any)
                                        ? `verba de "${(null as any).categoriaEnum ?? 'Categoria personalizada'}"`
                                        : `"${req.stockItem?.nome}" — ${Number(req.quantidade)} ${req.stockItem?.unidade ?? ''}`;
                                    const ok = await customConfirm({
                                        title: 'Confirmar Recebimento',
                                        message: `Confirma o RECEBIMENTO de ${recDesc}?`,
                                        confirmLabel: 'Confirmar Recebimento',
                                        cancelLabel: 'Agora não',
                                    });
                                    if (!ok) return;
                                    try {
                                        await stockApi.purchaseRequests.confirmReceipt(req.id);
                                        toast.success('Recebimento confirmado');
                                        load();
                                        onStockUpdated?.();
                                    } catch (err: any) {
                                        toast.error(err?.response?.data?.message || 'Erro ao confirmar recebimento');
                                    }
                                }}
                            />
                        </div>
                    ))}
                </div>
            )}

            <AdminListPagination
                page={page}
                totalPages={totalPages}
                total={total}
                loading={loading}
                onPageChange={setPage}
                itemLabel="solicitação(ões)"
                style={{ marginTop: 12 }}
            />

            {reviewing &&
                reviewMode &&
                typeof window !== 'undefined' &&
                createPortal(
                    <div className="modal-overlay" onClick={closeReview}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
                            <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem', color: reviewMode === 'approve' ? '#059669' : '#DC2626' }}>
                                {reviewMode === 'approve' ? 'Aprovar solicitação' : 'Rejeitar solicitação'}
                            </h2>
                            <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
                                {(null as any)
                                    ? `Verba: ${(null as any).categoriaEnum ?? 'Categoria personalizada'} — ${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][(null as any).mes - 1]}/${(null as any).ano}`
                                    : `${reviewing.stockItem?.nome ?? 'Item'} · ${Number(reviewing.quantidade)} ${reviewing.stockItem?.unidade ?? ''}`}
                            </p>
                            {reviewMode === 'approve' && (null as any) && !reviewing.stockItemId && (() => {
                                const teto = Number((null as any).valorTeto ?? reviewing.valorTotal);
                                // Total exibido = o que o usuário digitou OU o calculado a partir de qty × preço
                                // (os handlers mantêm os dois lados em sincronia).
                                const verbaTotalAprov = verbaPrTotal === '' ? 0 : Number(verbaPrTotal);
                                const ultrapassaTeto = verbaTotalAprov > teto && verbaTotalAprov > 0;
                                const inputSt: React.CSSProperties = { width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 8, border: '1px solid #E5E7EB', fontWeight: 700, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' };
                                const labelSt: React.CSSProperties = { display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B' };
                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
                                        {/* Banner do teto */}
                                        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FFFDE7', border: '1px solid #FEF08A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400E' }}>
                                                💰 Teto disponível da verba
                                            </span>
                                            <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: '#B45309', fontSize: '1rem' }}>
                                                R$ {teto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>

                                        {/* Busca de item */}
                                        <div style={{ position: 'relative' }}>
                                            <label style={labelSt}>Item a comprar *</label>
                                            {verbaPrItemId || verbaPrIsNewItem ? (
                                                <div style={{ marginTop: 4, padding: '8px 12px', borderRadius: 8, background: verbaPrIsNewItem ? '#EFF6FF' : '#F0FDF4', border: `1.5px solid ${verbaPrIsNewItem ? '#93C5FD' : '#86EFAC'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 700, color: verbaPrIsNewItem ? '#1D4ED8' : '#15803D', fontSize: '0.88rem' }}>
                                                        {verbaPrIsNewItem ? '🆕' : '✅'} {verbaPrItemNome} {verbaPrItemUnidade && <span style={{ color: '#64748B', fontWeight: 500 }}>({verbaPrIsNewItem ? verbaPrNewItemUnidade : verbaPrItemUnidade})</span>}
                                                    </span>
                                                    <button type="button" onClick={() => { setVerbaPrItemId(''); setVerbaPrItemNome(''); setVerbaPrItemUnidade(''); setVerbaPrItemSearch(''); setVerbaPrIsNewItem(false); setVerbaPrNewItemUnidade('un'); setVerbaPrFotoUrl(''); setReviewSupplier(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '1rem', fontWeight: 700 }}>×</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <input
                                                        type="text"
                                                        value={verbaPrItemSearch}
                                                        onChange={e => { setVerbaPrItemSearch(e.target.value); searchVerbaPrItems(e.target.value); }}
                                                        onFocus={() => { if (verbaPrItems.length > 0) setVerbaPrShowResults(true); }}
                                                        placeholder={verbaPrItems.length > 0 ? 'Selecione ou digite o nome...' : 'Digite o nome do item...'}
                                                        style={{ ...inputSt, marginTop: 4 }}
                                                        autoComplete="off"
                                                    />
                                                    {verbaPrShowResults && (
                                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, maxHeight: 240, overflowY: 'auto' }}>
                                                            {verbaPrSearching ? (
                                                                <div style={{ padding: '10px 14px', color: '#94A3B8', fontSize: '0.82rem' }}>Buscando...</div>
                                                            ) : (
                                                                <>
                                                                    {verbaPrItems.map(it => (
                                                                        <button key={it.id} type="button" onClick={() => {
                                                                            setVerbaPrItemId(it.id);
                                                                            setVerbaPrItemNome(it.nome);
                                                                            setVerbaPrItemUnidade(it.unidade);
                                                                            setVerbaPrItemSearch(it.nome);
                                                                            setVerbaPrShowResults(false);
                                                                            // Pré-preenche preço unitário a partir do cadastro do item
                                                                            // (admin pode editar livremente antes de aprovar).
                                                                            if (it.precoUnitario != null && verbaPrPreco === '') {
                                                                                const p = Number(it.precoUnitario);
                                                                                if (!isNaN(p) && p > 0) handlePriceChange(String(p));
                                                                            }
                                                                            // Reaproveita o fornecedor já cadastrado no insumo (admin não digita de novo).
                                                                            if (it.fornecedor) setReviewSupplier(it.fornecedor);
                                                                        }}
                                                                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid #F1F5F9' }}
                                                                            onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                                                                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                                                                        >
                                                                            {it.nome} <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>({it.unidade})</span>
                                                                            {it.precoUnitario != null && Number(it.precoUnitario) > 0 && (
                                                                                <span style={{ color: '#059669', fontSize: '0.72rem', fontWeight: 700, marginLeft: 6 }}>
                                                                                    · R$ {Number(it.precoUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                                </span>
                                                                            )}
                                                                        </button>
                                                                    ))}
                                                                    {verbaPrItems.length === 0 && verbaPrItemSearch.trim().length >= 2 && (
                                                                        <div style={{ padding: '10px 14px', color: '#94A3B8', fontSize: '0.82rem', borderBottom: '1px solid #F1F5F9' }}>Nenhum item encontrado{verbaPrCategoriaTemInsumo ? ' nesta categoria' : ''}</div>
                                                                    )}
                                                                    {verbaPrItemSearch.trim().length >= 2 && !verbaPrItems.some(it => it.nome.toLowerCase() === verbaPrItemSearch.trim().toLowerCase()) && verbaPrCategoriaTemInsumo !== true && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setVerbaPrIsNewItem(true);
                                                                                setVerbaPrItemNome(verbaPrItemSearch.trim());
                                                                                setVerbaPrShowResults(false);
                                                                            }}
                                                                            style={{
                                                                                display: 'flex', width: '100%', alignItems: 'center', gap: 8,
                                                                                padding: '10px 14px', border: 'none', cursor: 'pointer',
                                                                                background: '#EFF6FF', fontSize: '0.85rem', fontWeight: 700,
                                                                                color: '#1D4ED8', textAlign: 'left',
                                                                            }}
                                                                            onMouseEnter={e => { e.currentTarget.style.background = '#DBEAFE'; }}
                                                                            onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; }}
                                                                        >
                                                                            <span style={{ fontSize: '1.1rem' }}>➕</span>
                                                                            Cadastrar &ldquo;{verbaPrItemSearch.trim()}&rdquo; como novo item
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {/* Unidade (só para item novo) */}
                                        {verbaPrIsNewItem && (
                                            <div>
                                                <label style={labelSt}>Unidade do item *</label>
                                                <select
                                                    value={verbaPrNewItemUnidade}
                                                    onChange={e => setVerbaPrNewItemUnidade(e.target.value)}
                                                    style={{ ...inputSt, marginTop: 4, cursor: 'pointer' }}
                                                >
                                                    {['un', 'cx', 'pct', 'kg', 'g', 'L', 'mL', 'frasco', 'fardo', 'rolo', 'par', 'm', 'm²', 'resma'].map(u => (
                                                        <option key={u} value={u}>{u}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {/* Upload de foto — só ao cadastrar item novo */}
                                        {verbaPrIsNewItem && (
                                        <div>
                                            <label style={labelSt}>Foto do Item</label>
                                            {verbaPrFotoUrl ? (
                                                <div style={{
                                                    marginTop: 4, border: '1.5px solid #FEF08A', borderRadius: 12, padding: '0.75rem',
                                                    background: '#FFFDE7', display: 'flex', alignItems: 'center', gap: 12,
                                                }}>
                                                    <img
                                                        src={verbaPrFotoUrl}
                                                        alt="Foto do item"
                                                        style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10, border: '1px solid #E5E7EB' }}
                                                    />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F766E', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            ✅ Foto enviada
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                                            <input
                                                                id="verba-photo-replace"
                                                                type="file"
                                                                accept="image/jpeg,image/png,image/webp"
                                                                onChange={e => { const f = e.target.files?.[0]; if (f) handleVerbaPrPhotoUpload(f); e.currentTarget.value = ''; }}
                                                                style={{ display: 'none' }}
                                                                disabled={verbaPrUploadingPhoto}
                                                            />
                                                            <label
                                                                htmlFor="verba-photo-replace"
                                                                style={{
                                                                    padding: '0.35rem 0.65rem', borderRadius: 8,
                                                                    background: '#FFFFFF', border: '1px solid #FEF08A',
                                                                    color: '#B89B00', fontWeight: 700, fontSize: '0.68rem',
                                                                    cursor: verbaPrUploadingPhoto ? 'not-allowed' : 'pointer',
                                                                    opacity: verbaPrUploadingPhoto ? 0.6 : 1,
                                                                }}
                                                            >
                                                                {verbaPrUploadingPhoto ? 'Enviando...' : 'Substituir'}
                                                            </label>
                                                            <button
                                                                type="button"
                                                                onClick={() => setVerbaPrFotoUrl('')}
                                                                disabled={verbaPrUploadingPhoto}
                                                                style={{
                                                                    padding: '0.35rem 0.65rem', borderRadius: 8,
                                                                    background: '#FFFFFF', border: '1px solid #FECACA',
                                                                    color: '#DC2626', fontWeight: 700, fontSize: '0.68rem',
                                                                    cursor: verbaPrUploadingPhoto ? 'not-allowed' : 'pointer',
                                                                }}
                                                            >
                                                                Remover
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{
                                                    marginTop: 4, border: '2px dashed #E5E7EB', borderRadius: 12, padding: '1rem',
                                                    background: '#FAFBFC', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                                    textAlign: 'center',
                                                }}>
                                                    <span style={{ fontSize: '1.4rem' }}>📷</span>
                                                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>
                                                        {verbaPrUploadingPhoto ? 'Enviando foto...' : 'Adicione uma foto do item'}
                                                    </div>
                                                    <div style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>
                                                        JPG, PNG ou WebP — até 5 MB
                                                    </div>
                                                    <input
                                                        id="verba-photo-upload"
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/webp"
                                                        onChange={e => { const f = e.target.files?.[0]; if (f) handleVerbaPrPhotoUpload(f); e.currentTarget.value = ''; }}
                                                        style={{ display: 'none' }}
                                                        disabled={verbaPrUploadingPhoto}
                                                    />
                                                    <label
                                                        htmlFor="verba-photo-upload"
                                                        style={{
                                                            padding: '0.45rem 0.9rem', borderRadius: 10,
                                                            background: '#FFD600', border: '1px solid #FACC15',
                                                            color: '#000', fontWeight: 800, fontSize: '0.72rem',
                                                            cursor: verbaPrUploadingPhoto ? 'not-allowed' : 'pointer',
                                                            opacity: verbaPrUploadingPhoto ? 0.6 : 1,
                                                        }}
                                                    >
                                                        {verbaPrUploadingPhoto ? 'Enviando...' : 'Escolher arquivo'}
                                                    </label>
                                                </div>
                                            )}
                                            {verbaPrPhotoError && (
                                                <p style={{ fontSize: '0.72rem', color: '#DC2626', marginTop: '0.35rem' }}>{verbaPrPhotoError}</p>
                                            )}
                                        </div>
                                        )}

                                        {/* Quantidade + Preço Unit */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            <div>
                                                <label style={labelSt}>Quantidade{(verbaPrIsNewItem ? verbaPrNewItemUnidade : verbaPrItemUnidade) ? ` (${verbaPrIsNewItem ? verbaPrNewItemUnidade : verbaPrItemUnidade})` : ''} *</label>
                                                <input type="number" min={0.001} step={0.001} value={verbaPrQty}
                                                    onChange={e => handleQtyChange(e.target.value)}
                                                    style={{ ...inputSt, fontFamily: 'Orbitron, sans-serif' }} />
                                            </div>
                                            <div>
                                                <label style={labelSt}>Preço Unitário (R$) *</label>
                                                <input type="number" min={0.01} step={0.01} value={verbaPrPreco}
                                                    onChange={e => handlePriceChange(e.target.value)}
                                                    style={{ ...inputSt, fontFamily: 'Orbitron, sans-serif' }} />
                                            </div>
                                        </div>

                                        {/* Total — editável bidirecionalmente com a Quantidade.
                                            Banner mantém o visual (verde/vermelho) mas o valor à direita é um input. */}
                                        <div style={{ padding: '10px 14px', borderRadius: 10, background: ultrapassaTeto ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${ultrapassaTeto ? '#FCA5A5' : '#86EFAC'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: ultrapassaTeto ? '#DC2626' : '#15803D', textTransform: 'uppercase' }}>
                                                    {ultrapassaTeto ? '⚠️ Total excede a verba' : 'Total da Conta a Pagar'}
                                                </span>
                                                <span style={{ fontSize: '0.62rem', fontWeight: 600, color: ultrapassaTeto ? '#B91C1C' : '#15803D', opacity: 0.7 }}>
                                                    edite Qtd. ou Total — o outro recalcula
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                                <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.05rem', color: ultrapassaTeto ? '#DC2626' : '#059669' }}>R$</span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step={0.01}
                                                    value={verbaPrTotal}
                                                    onChange={e => handleTotalChange(e.target.value)}
                                                    placeholder="0,00"
                                                    style={{
                                                        width: 170,
                                                        padding: '5px 8px',
                                                        fontFamily: 'Orbitron, sans-serif',
                                                        fontWeight: 900,
                                                        fontSize: '1.05rem',
                                                        color: ultrapassaTeto ? '#DC2626' : '#059669',
                                                        background: '#FFFFFFAA',
                                                        border: `1px dashed ${ultrapassaTeto ? '#FCA5A5' : '#86EFAC'}`,
                                                        borderRadius: 6,
                                                        outline: 'none',
                                                        textAlign: 'right',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        {/* Hint do valor formatado (pt-BR) para conferência rápida */}
                                        {verbaPrTotal !== '' && Number(verbaPrTotal) > 0 && (
                                            <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: -8, textAlign: 'right' }}>
                                                ≈ R$ {Number(verbaPrTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        )}

                                        {/* Fornecedor — só pede input quando é item NOVO.
                                            Para insumo existente o fornecedor já vem do cadastro
                                            (reaproveitado em onClick do item). */}
                                        {verbaPrIsNewItem ? (
                                            <div>
                                                <label style={labelSt}>Fornecedor</label>
                                                <input type="text" value={reviewSupplier} onChange={e => setReviewSupplier(e.target.value)} placeholder="Nome do fornecedor" style={inputSt} />
                                            </div>
                                        ) : verbaPrItemId && reviewSupplier ? (
                                            <div style={{
                                                padding: '8px 12px', borderRadius: 8,
                                                background: '#F0F9FF', border: '1px solid #BAE6FD',
                                                display: 'flex', alignItems: 'center', gap: 8,
                                            }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                    🔗 Fornecedor (do insumo)
                                                </span>
                                                <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>
                                                    {reviewSupplier}
                                                </span>
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })()}

                            {reviewMode === 'approve' && (!(null as any) || !!reviewing.stockItemId) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B' }}>Quantidade a aprovar *</label>
                                            <input
                                                type="number"
                                                min={0.001}
                                                step={0.001}
                                                value={reviewQuantity}
                                                onChange={e => setReviewQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                                                style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: '1px solid #E5E7EB', fontWeight: 800, fontFamily: 'Orbitron, sans-serif' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B' }}>Preço Unit. (Fixo)</label>
                                            <div style={{
                                                width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 8,
                                                background: '#F3F4F6', border: '1px dashed #D1D5DB',
                                                color: '#6B7280', fontWeight: 800, fontFamily: 'Orbitron, sans-serif'
                                            }}>
                                                R$ {Number(reviewing.precoUnitario).toFixed(2).replace('.', ',')}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: '10px 12px', borderRadius: 10, background: '#FFFDE7', border: '1px solid #FEF08A',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#B89B00', textTransform: 'uppercase' }}>Total da Conta a Pagar</span>
                                        <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.05rem', color: '#B89B00' }}>
                                            R$ {((Number(reviewQuantity) || 0) * Number(reviewing.precoUnitario)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B' }}>Fornecedor</label>
                                        <input
                                            type="text"
                                            value={reviewSupplier}
                                            onChange={e => setReviewSupplier(e.target.value)}
                                            placeholder="Nome do fornecedor"
                                            style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: '1px solid #E5E7EB' }}
                                        />
                                    </div>

                                    <div style={{ marginTop: 8, padding: '12px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#F8FAFC' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                                            <input
                                                type="checkbox"
                                                checked={updateMin}
                                                onChange={e => setUpdateMin(e.target.checked)}
                                            />
                                            Atualizar Estoque Mínimo?
                                        </label>
                                        {updateMin && (
                                            <div style={{ marginTop: 8 }}>
                                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B' }}>Novo Mínimo</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step={0.001}
                                                    value={reviewMinimo}
                                                    onChange={e => setReviewMinimo(e.target.value === '' ? '' : Number(e.target.value))}
                                                    style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: '1px solid #E5E7EB', fontWeight: 800, fontFamily: 'Orbitron, sans-serif' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginTop: 16 }}>
                                {reviewMode === 'approve' ? 'Observação (opcional)' : 'Motivo da rejeição *'}
                            </label>
                            <textarea
                                value={reviewNote}
                                onChange={(e) => setReviewNote(e.target.value)}
                                rows={reviewMode === 'approve' ? 2 : 4}
                                style={{ width: '100%', marginTop: 4, padding: 10, borderRadius: 10, border: '1px solid #E5E7EB' }}
                            />
                            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                                <button type="button" onClick={closeReview} disabled={submitting} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff' }}>
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReview}
                                    disabled={submitting}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: 10,
                                        border: 'none',
                                        background: reviewMode === 'approve' ? '#059669' : '#DC2626',
                                        color: '#fff',
                                        fontWeight: 700,
                                    }}
                                >
                                    {submitting ? '…' : reviewMode === 'approve' ? 'Aprovar' : 'Rejeitar'}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
        </div>
    );
}

function RequestCard({
    req,
    highlight,
    canReview,
    canReceive,
    onApprove,
    onReject,
    onConfirmReceipt,
}: {
    req: StockPurchaseRequest;
    highlight?: boolean;
    canReview: boolean;
    canReceive?: boolean;
    onApprove: () => void;
    onReject: () => void;
    onConfirmReceipt?: () => void;
}) {
    const color = PURCHASE_STATUS_COLOR[req.status];
    const label = PURCHASE_STATUS_LABEL[req.status];

    return (
        <div
            style={{
                background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFBFC 100%)',
                borderRadius: 14,
                overflow: 'hidden',
                border: highlight ? `2px solid #B89B00` : `1px solid ${req.urgente ? 'rgba(239,68,68,0.35)' : '#E2E8F0'}`,
                boxShadow: highlight ? '0 8px 24px rgba(184,155,0,0.18)' : '0 2px 10px rgba(15,23,42,0.06)',
                transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#FEF08A'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(184,155,0,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = highlight ? '#B89B00' : (req.urgente ? 'rgba(239,68,68,0.35)' : '#E2E8F0'); e.currentTarget.style.boxShadow = highlight ? '0 8px 24px rgba(184,155,0,0.18)' : '0 2px 10px rgba(15,23,42,0.06)'; }}
        >
            <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
            <div style={{ padding: '1rem 1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color, textTransform: 'uppercase' }}>{label}</span>
                    {req.urgente && <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#DC2626' }}>Urgente</span>}
                </div>
                {(null as any) && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 6, background: '#FEF9C3', border: '1px solid #FDE68A', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase' }}>💰 Verba</span>
                    </div>
                )}
                {req.stockItemId ? (
                    <Link href={`/admin/estoque/itens/${req.stockItemId}`} style={{ fontWeight: 800, color: '#0F172A', textDecoration: 'none', fontSize: '0.95rem', display: 'block' }}>
                        {req.stockItem?.nome ?? 'Item'}
                    </Link>
                ) : (null as any) ? (() => {
                    const cat = resolveCategoria({} as any);
                    return (
                        <div>
                            <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>
                                {cat.label}
                                {' — '}
                                {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][(null as any).mes - 1]}/{(null as any).ano}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
                                Orçamento: <strong style={{ color: '#B45309' }}>R$ {Number(req.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> — Admin decide itens e quantidades na aprovação
                            </div>
                        </div>
                    );
                })() : (
                    <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>Item não identificado</span>
                )}
                <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 4 }}>
                    Por <strong>{req.requester?.name ?? '—'}</strong> ({roleLabel(req.requester?.role)})
                </div>
                {(!(null as any) || !!req.stockItemId) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 10 }}>
                    <div style={{ padding: '8px 10px', background: '#F8FAFC', borderRadius: 10, fontSize: '0.75rem', border: '1px solid #E2E8F0' }}>
                        <div style={{ color: '#94A3B8', fontWeight: 800, fontSize: '0.62rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Qtd</div>
                        <div style={{ fontWeight: 800, fontFamily: 'Orbitron, sans-serif', marginTop: 2 }}>{Number(req.quantidade).toFixed(0)}</div>
                    </div>
                    <div style={{ padding: '8px 10px', background: '#F8FAFC', borderRadius: 10, fontSize: '0.75rem', border: '1px solid #E2E8F0' }}>
                        <div style={{ color: '#94A3B8', fontWeight: 800, fontSize: '0.62rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Unit.</div>
                        <div style={{ fontWeight: 800, fontFamily: 'Orbitron, sans-serif', marginTop: 2 }}>R$ {Number(req.precoUnitario).toFixed(2).replace('.', ',')}</div>
                    </div>
                    <div style={{ padding: '8px 10px', background: '#FFFDE7', borderRadius: 10, fontSize: '0.75rem', border: '1px solid #FEF08A' }}>
                        <div style={{ color: '#B89B00', fontWeight: 800, fontSize: '0.62rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Total</div>
                        <div style={{ fontWeight: 800, fontFamily: 'Orbitron, sans-serif', color: '#B89B00', marginTop: 2 }}>R$ {Number(req.valorTotal).toFixed(2).replace('.', ',')}</div>
                    </div>
                </div>
                )}
                <div style={{
                    fontSize: '0.78rem',
                    color: '#475569',
                    marginTop: 10,
                    fontStyle: 'italic',
                    whiteSpace: 'pre-wrap',
                    padding: '8px 12px',
                    background: '#F1F5F9',
                    borderRadius: 8,
                    borderLeft: '3px solid #CBD5E1',
                    lineHeight: 1.5
                }}>
                    &ldquo;{req.justificativa}&rdquo;
                </div>
                {req.status === 'APROVADA' && req.contaPagar?.id && (
                    <div style={{ marginTop: 10 }}>
                        <Link href={`/admin/contas-a-pagar?highlight=${req.contaPagar.id}`} style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1D4ED8' }}>
                            Abrir conta a pagar
                        </Link>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {canReview && (
                        <>
                            <button type="button" onClick={onReject} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontWeight: 700, fontSize: '0.75rem' }}>
                                Rejeitar
                            </button>
                            <button type="button" onClick={onApprove} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>
                                Aprovar
                            </button>
                        </>
                    )}
                    {canReceive && onConfirmReceipt && (
                        <button type="button" onClick={onConfirmReceipt} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>
                            Marcar recebido
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
