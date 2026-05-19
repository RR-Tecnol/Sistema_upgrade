'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    InformationCircleIcon,
    ScaleIcon,
    CameraIcon,
    ChevronLeftIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { stockApi, CreateStockItemDto, StockItem, StockItemCategory, StockCategory, resolveCategoria } from '@/lib/api/stock';
import { AdminCreationSuccessScreen } from '@/components/admin/AdminCreationSuccessScreen';
import { CreateCategoryModal } from '@/components/estoque/CreateCategoryModal';
import { SolicitarCompraModal } from '@/components/estoque/SolicitarCompraModal';

type Step = 1 | 2;

const STEPS = [
    { n: 1 as Step, label: 'Identificação',  icon: InformationCircleIcon },
    { n: 2 as Step, label: 'Quantidade e Detalhes', icon: ScaleIcon },
];

const INPUT_STYLE: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 0.9rem',
    borderRadius: 10,
    border: '1.5px solid #E5E7EB',
    background: '#F9FAFB',
    fontSize: '0.85rem',
    color: '#111827',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
};

const LABEL_STYLE: React.CSSProperties = {
    display: 'block',
    fontSize: '0.65rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#6B7280',
    marginBottom: '0.4rem',
};

function FormInput({ label, required, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean }) {
    const [focused, setFocused] = useState(false);
    return (
        <div>
            <label style={LABEL_STYLE}>{label}{required && <span style={{ color: '#FFD600', marginLeft: 3 }}>*</span>}</label>
            <input
                {...props}
                style={{ ...INPUT_STYLE, borderColor: focused ? '#FFD600' : '#E5E7EB', boxShadow: focused ? '0 0 0 3px rgba(255,214,0,0.15)' : 'none' }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
        </div>
    );
}

function FormSelect({ label, required, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; required?: boolean }) {
    const [focused, setFocused] = useState(false);
    return (
        <div>
            <label style={LABEL_STYLE}>{label}{required && <span style={{ color: '#FFD600', marginLeft: 3 }}>*</span>}</label>
            <select
                {...props}
                style={{ ...INPUT_STYLE, cursor: 'pointer', borderColor: focused ? '#FFD600' : '#E5E7EB', boxShadow: focused ? '0 0 0 3px rgba(255,214,0,0.15)' : 'none' }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            >
                {children}
            </select>
        </div>
    );
}

function FormTextarea({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
    const [focused, setFocused] = useState(false);
    return (
        <div>
            <label style={LABEL_STYLE}>{label}</label>
            <textarea
                {...props}
                style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 90, borderColor: focused ? '#FFD600' : '#E5E7EB', boxShadow: focused ? '0 0 0 3px rgba(255,214,0,0.15)' : 'none' }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
        </div>
    );
}

const CATEGORIAS_OPTS: { value: StockItemCategory; label: string; icon: string }[] = [
    { value: 'CONSUMIVEL',  label: 'Consumível',   icon: '📦' },
    { value: 'DIDATICO',    label: 'Didático',     icon: '📘' },
    { value: 'LIMPEZA',     label: 'Limpeza',      icon: '🧴' },
    { value: 'EQUIPAMENTO', label: 'Equipamento',  icon: '🔧' },
    { value: 'EPI',         label: 'EPI',          icon: '🦺' },
    { value: 'ALIMENTACAO', label: 'Alimentação',  icon: '🍱' },
    { value: 'ESCRITORIO',  label: 'Escritório',   icon: '✏️' },
    { value: 'OUTRO',       label: 'Outro',        icon: '❔' },
];

/** Embalagem contável — o saldo é sempre nessa unidade */
const EMBALAGEM_OPTS: { value: string; label: string }[] = [
    { value: 'un',     label: 'Unidade (un)' },
    { value: 'cx',     label: 'Caixa (cx)' },
    { value: 'pct',    label: 'Pacote (pct)' },
    { value: 'par',    label: 'Par (par)' },
    { value: 'frasco', label: 'Frasco' },
    { value: 'galão',  label: 'Galão' },
    { value: 'rolo',   label: 'Rolo' },
    { value: 'fd',     label: 'Fardo (fd)' },
    { value: 'm',      label: 'Metro (m)' },
    { value: 'm²',     label: 'Metro quadrado (m²)' },
];

/** Unidade de conteúdo (quanto há dentro de cada embalagem) */
const CONTEUDO_OPTS: { value: string; label: string }[] = [
    { value: 'mL', label: 'mL' },
    { value: 'L',  label: 'L' },
    { value: 'g',  label: 'g' },
    { value: 'kg', label: 'kg' },
    { value: 'm',  label: 'm' },
];

// ═══════════════════════════════════════════════════════════════════
//   Página Wizard
// ═══════════════════════════════════════════════════════════════════
export function NovoInsumoWizard({ isModal, onModalClose, onModalSuccess }: { isModal?: boolean; onModalClose?: () => void; onModalSuccess?: (hasPr?: boolean) => void } = {}) {
    const router = useRouter();
    const [step, setStep] = useState<Step>(1);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    // Conflito de código com item INATIVO — oferece reativar
    const [inactiveConflict, setInactiveConflict] = useState<{
        id: string;
        nome: string;
        message: string;
    } | null>(null);
    const [reactivating, setReactivating] = useState(false);

    const [form, setForm] = useState<CreateStockItemDto>({
        nome: '',
        codigoInterno: '',
        categoria: 'CONSUMIVEL',
        unidade: 'un',
        conteudoQuantidade: undefined,
        conteudoUnidade: undefined,
        // Quantidades começam VAZIAS (undefined) para não atrapalhar a digitação.
        // Se o admin confirmar deixar em branco, viram 0 no payload (ver handleSubmit).
        quantidadeAtual: undefined,
        quantidadeMinima: undefined,
        validade: '',
        fornecedor: '',
        precoUnitario: undefined,
        localizacao: '',
        fotoUrl: '',
        observacoes: '',
    });

    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);

    // Categorias customizadas vindas do backend (8 default + criadas pelo admin)
    const [allCategories, setAllCategories] = useState<StockCategory[]>([]);
    const [createCatOpen, setCreateCatOpen] = useState(false);
    const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
    useEffect(() => {
        stockApi.categories.list().then(setAllCategories).catch(() => setAllCategories([]));
    }, []);



    // Item efetivamente criado (usado pela tela de sucesso para abrir Solicitação a posteriori)
    const [createdItem, setCreatedItem] = useState<StockItem | null>(null);
    // Quando o item foi criado mas a PR falhou (ciclo financeiro incompleto) — mostra alerta + CTA
    const [partialPrError, setPartialPrError] = useState<string | null>(null);
    const [openSolicitarAfterSuccess, setOpenSolicitarAfterSuccess] = useState(false);

    // Auto-close modal on success
    useEffect(() => {
        if (success && isModal && onModalSuccess && !openSolicitarAfterSuccess) {
            const t = setTimeout(() => onModalSuccess(), 1500);
            return () => clearTimeout(t);
        }
    }, [success, isModal, onModalSuccess, openSolicitarAfterSuccess]);

    const set = (field: keyof CreateStockItemDto, value: any) => {
        setForm(f => ({ ...f, [field]: value }));
        setErrors(e => { const n = { ...e }; delete n[field]; return n; });
    };

    const handleDeleteCustomCategory = async (cat: StockCategory) => {
        const ok = window.confirm(
            `Apagar a categoria "${cat.nome}"?\n\n` +
            `Ela deixará de aparecer para novos cadastros. Se algum item ativo estiver usando essa categoria, o sistema vai bloquear para preservar o histórico.`,
        );
        if (!ok) return;

        setDeletingCategoryId(cat.id);
        try {
            await stockApi.categories.deactivate(cat.id);
            setAllCategories(prev => prev.filter(c => c.id !== cat.id));
            setForm(f => (
                f.customCategoryId === cat.id
                    ? { ...f, categoria: 'OUTRO', customCategoryId: undefined }
                    : f
            ));
        } catch (e: any) {
            const msg = e?.response?.data?.message ?? 'Não foi possível apagar esta categoria.';
            window.alert(Array.isArray(msg) ? msg.join('\n') : msg);
        } finally {
            setDeletingCategoryId(null);
        }
    };

    const validateStep1 = () => {
        const e: Record<string, string> = {};
        if (!form.nome.trim()) e.nome = 'Nome do item é obrigatório';
        else if (form.nome.trim().length < 2) e.nome = 'Nome muito curto';
        if (!form.categoria) e.categoria = 'Categoria obrigatória';
        if (!form.unidade?.trim()) e.unidade = 'Unidade obrigatória';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const validateStep2 = () => {
        const e: Record<string, string> = {};
        if (form.quantidadeAtual !== undefined && Number(form.quantidadeAtual) < 0) {
            e.quantidadeAtual = 'Quantidade não pode ser negativa';
        }
        if (form.quantidadeMinima !== undefined && Number(form.quantidadeMinima) < 0) {
            e.quantidadeMinima = 'Quantidade mínima não pode ser negativa';
        }
        if (form.precoUnitario !== undefined && form.precoUnitario !== null && Number(form.precoUnitario) < 0) {
            e.precoUnitario = 'Preço inválido';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const nextStep = () => {
        if (step === 1 && !validateStep1()) return;
        if (step === 2 && !validateStep2()) return;
        setStep(s => (s < 2 ? (s + 1) as Step : s));
    };

    const handleSubmit = async () => {
        setSubmitError(null);
        setInactiveConflict(null);

        const qtdInicialVazia = form.quantidadeAtual === undefined || form.quantidadeAtual === null || (form.quantidadeAtual as any) === '';
        const qtdMinimaVazia = form.quantidadeMinima === undefined || form.quantidadeMinima === null || (form.quantidadeMinima as any) === '';

        // Saldo inicial agora é SEMPRE 0 (input bloqueado no Step 2). Só avisamos sobre Qty Mínima.
        if (qtdMinimaVazia) {
            const ok = window.confirm(
                `Você não preencheu Quantidade Mínima.\n\n` +
                `Vai ficar zerada (0 ${form.unidade}). Sem mínimo, o item não dispara alertas de estoque baixo.\n\n` +
                `Deseja continuar mesmo assim?`,
            );
            if (!ok) return;
        }



        setSaving(true);
        // Item criado nesta tentativa. Usado para CTA de "tentar de novo" quando só a PR falha.
        let createdInThisAttempt: StockItem | null = null;
        try {
            // 🛡️ REGRA DE COERÊNCIA (REQ 2026-05): cadastro nasce SEMPRE com saldo = 0.
            // Saldo só entra via Solicitação de Compra aprovada e recebida (rastreio 100%).
            // O backend também valida — esta é a primeira linha de defesa.
            const qtdInicial = qtdInicialVazia ? 0 : Number(form.quantidadeAtual);
            const itemPayload: CreateStockItemDto = {
                nome: form.nome.trim(),
                categoria: form.categoria,
                customCategoryId: form.customCategoryId ?? undefined,
                unidade: form.unidade.trim(),
                codigoInterno: form.codigoInterno?.trim() || undefined,
                quantidadeAtual: 0, // SEMPRE 0
                quantidadeMinima: qtdMinimaVazia ? 0 : Number(form.quantidadeMinima),
                validade: form.validade || undefined,
                fornecedor: form.fornecedor?.trim() || undefined,
                precoUnitario: form.precoUnitario !== undefined && form.precoUnitario !== null
                    ? Number(form.precoUnitario) : undefined,
                localizacao: form.localizacao?.trim() || undefined,
                fotoUrl: form.fotoUrl?.trim() || undefined,
                observacoes: form.observacoes?.trim() || undefined,
            };

            const qtdSolicitacao = !qtdMinimaVazia && Number(form.quantidadeMinima) > 0 ? Number(form.quantidadeMinima) : 1;
            const precoSolicitacao = form.precoUnitario !== undefined && form.precoUnitario !== null ? Number(form.precoUnitario) : 0;
            
            // O backend valida justificativa com Length(10, 1000). Se observacoes for curta/vazia,
            // usa o fallback padrão pra não rejeitar o cadastro. Curtas viram complemento.
            const obs = form.observacoes?.trim() || '';
            const justificativa = obs.length >= 10
                ? obs
                : obs
                    ? `Primeira solicitação gerada via assistente de cadastro. Obs: ${obs}`
                    : 'Primeira solicitação gerada via assistente de cadastro.';
            const { item: created } = await stockApi.items.createWithPurchaseRequest({
                item: itemPayload,
                purchaseRequest: {
                    quantidade: qtdSolicitacao,
                    precoUnitario: precoSolicitacao,
                    fornecedor: form.fornecedor?.trim() || undefined,
                    urgente: false,
                    justificativa,
                },
            });
            createdInThisAttempt = created;
            setCreatedItem(created);

            setSuccess(true);
            setTimeout(() => { if (onModalSuccess) onModalSuccess(true); else router.push('/admin/estoque?tab=solicitacoes'); }, 1800);
        } catch (err: any) {
            const payload = err?.response?.data;

            // Caso especial: existe item INATIVO com mesmo código → oferecer reativar
            if (
                payload?.code === 'INACTIVE_ITEM_WITH_SAME_CODE' &&
                payload?.existingItemId
            ) {
                setInactiveConflict({
                    id: payload.existingItemId,
                    nome: payload.existingItemNome ?? '—',
                    message: payload.message ?? 'Existe um item desativado com este código',
                });
                setSubmitError(null);
            } else {
                const baseMsg =
                    payload?.message ||
                    err?.message ||
                    'Erro ao cadastrar item. Verifique os dados e tente novamente.';
                const flat = Array.isArray(baseMsg) ? baseMsg.join('; ') : baseMsg;
                // Se o item já tinha sido criado nesta tentativa, contextualiza melhor.
                setSubmitError(
                    createdInThisAttempt
                        ? `Item "${createdInThisAttempt.nome}" foi cadastrado, mas algo deu errado: ${flat}. Você pode finalizar a Solicitação de Compra abrindo o catálogo.`
                        : flat,
                );
            }
        } finally {
            setSaving(false);
        }
    };

    /**
     * Reativa o item INATIVO encontrado, sobrescrevendo seus dados cadastrais com
     * os valores preenchidos no wizard atual. Em seguida, se gerarSolicitacao=true,
     * cria a PR para esse mesmo item reativado (mantém auditoria 100% conectada).
     */
    const handleReactivate = async () => {
        if (!inactiveConflict) return;
        setReactivating(true);
        setSubmitError(null);
        try {
            const reactivated = await stockApi.items.reactivate(inactiveConflict.id, {
                nome: form.nome.trim(),
                categoria: form.categoria,
                customCategoryId: form.customCategoryId ?? undefined,
                unidade: form.unidade.trim(),
                codigoInterno: form.codigoInterno?.trim() || undefined,
                quantidadeMinima:
                    form.quantidadeMinima === undefined ||
                        form.quantidadeMinima === null ||
                        (form.quantidadeMinima as any) === ''
                        ? 0
                        : Number(form.quantidadeMinima),
                validade: form.validade || undefined,
                fornecedor: form.fornecedor?.trim() || undefined,
                precoUnitario:
                    form.precoUnitario !== undefined && form.precoUnitario !== null
                        ? Number(form.precoUnitario)
                        : undefined,
                localizacao: form.localizacao?.trim() || undefined,
                fotoUrl: form.fotoUrl?.trim() || undefined,
                observacoes: form.observacoes?.trim() || undefined,
            });

            setCreatedItem(reactivated);

            const qtdSolicitacao = form.quantidadeMinima === undefined || form.quantidadeMinima === null || (form.quantidadeMinima as any) === '' || Number(form.quantidadeMinima) <= 0 ? 1 : Number(form.quantidadeMinima);
            const precoSolicitacao = form.precoUnitario !== undefined && form.precoUnitario !== null ? Number(form.precoUnitario) : 0;
            try {
                await stockApi.purchaseRequests.create({
                    stockItemId: reactivated.id,
                    quantidade: qtdSolicitacao,
                    precoUnitario: precoSolicitacao,
                    fornecedor: form.fornecedor?.trim() || undefined,
                    urgente: false,
                    justificativa: form.observacoes || "Primeira solicitação gerada via assistente de cadastro.",
                });
            } catch (prErr: any) {
                const prMsg =
                    prErr?.response?.data?.message ||
                    prErr?.message ||
                    'Falha ao criar a Solicitação de Compra.';
                setPartialPrError(Array.isArray(prMsg) ? prMsg.join('; ') : prMsg);
                setInactiveConflict(null);
                setSuccess(true);
                setOpenSolicitarAfterSuccess(true);
                return;
            }

            setInactiveConflict(null);
            setSuccess(true);
            setTimeout(() => { if (onModalSuccess) onModalSuccess(true); else router.push('/admin/estoque?tab=solicitacoes'); }, 1500);
        } catch (err: any) {
            setSubmitError(
                err?.response?.data?.message ||
                err?.message ||
                'Falha ao reativar o item.',
            );
        } finally {
            setReactivating(false);
        }
    };

    const handlePhotoUpload = async (file: File) => {
        setPhotoUploadError(null);
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type)) {
            setPhotoUploadError('Formato inválido. Use JPG, PNG ou WebP.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setPhotoUploadError('Tamanho máximo: 5 MB.');
            return;
        }
        setUploadingPhoto(true);
        try {
            const { url } = await stockApi.items.uploadPhoto(file);
            set('fotoUrl', url);
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Falha ao enviar a foto.';
            setPhotoUploadError(Array.isArray(msg) ? msg.join('; ') : msg);
        } finally {
            setUploadingPhoto(false);
        }
    };

    // Resolve visual da categoria (default OU custom selecionada)
    const catInfo = resolveCategoria({
        categoria: form.categoria,
        customCategory: form.customCategoryId ? allCategories.find(c => c.id === form.customCategoryId) : null
    });
    const { color: catColor, icon: catIcon, label: catLabel } = catInfo;
    const categoryCards = [
        ...CATEGORIAS_OPTS.map(c => ({
            id: `default-${c.value}`,
            nome: c.label,
            icon: c.icon,
            color: resolveCategoria({ categoria: c.value }).color,
            isDefault: true,
            defaultEnum: c.value,
            description: null,
        })),
        // Customizadas criadas pelo admin entram como complemento. Os 8 legados nunca somem.
        ...allCategories.filter(c => !c.isDefault),
    ];

    // ── Tela de sucesso ──────────────────────────────────────────
    if (success) {
        // Caso 1: Item criado + PR criada com sucesso → mensagem positiva, auto-redirect mantém-se.
        // Caso 2: Item criado mas PR falhou (Erro 2) → mostra aviso + abre modal pré-preenchido.
        const isPartial = !!partialPrError;
        const title = !isPartial
            ? 'ITEM + SOLICITAÇÃO CRIADOS!'
            : 'ITEM CADASTRADO — SOLICITAÇÃO PENDENTE';
        const redirectMessage = !isPartial
            ? 'Solicitação pendente criada — aprove para gerar a conta a pagar...'
            : 'O item foi gravado. Falta abrir a Solicitação de Compra para fechar o ciclo financeiro.';

        return (
            <>
                <AdminCreationSuccessScreen
                    title={title}
                    entityName={form.nome}
                    redirectMessage={redirectMessage}
                >
                    {isPartial && (
                        <div style={{
                            padding: '0.75rem 0.9rem',
                            borderRadius: 10,
                            background: '#FFFBEB',
                            border: '1px solid #FDE68A',
                            color: '#92400E',
                            fontSize: '0.78rem',
                            textAlign: 'left',
                            margin: '0.5rem 0 1rem',
                        }}>
                            <strong>Solicitação não foi criada:</strong> {partialPrError}
                        </div>
                    )}
                    {isPartial ? (
                        <div style={{
                            display: 'flex', flexDirection: 'column', gap: '0.6rem',
                            marginTop: '0.5rem',
                        }}>
                            <button
                                type="button"
                                onClick={() => setOpenSolicitarAfterSuccess(true)}
                                style={{
                                    padding: '0.65rem 1rem',
                                    borderRadius: 10,
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                                    color: '#fff',
                                    fontWeight: 800,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(245,158,11,0.35)',
                                }}>
                                🛒 Abrir Solicitação de Compra agora
                            </button>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <Link
                                    href="/admin/estoque?tab=central"
                                    style={{
                                        flex: 1, textAlign: 'center',
                                        padding: '0.55rem 0.85rem', borderRadius: 10,
                                        background: '#F3F4F6', border: '1px solid #E5E7EB',
                                        color: '#374151', fontWeight: 700, fontSize: '0.78rem',
                                        textDecoration: 'none',
                                    }}>
                                    📦 Ir para o catálogo
                                </Link>
                                <Link
                                    href="/admin/estoque"
                                    style={{
                                        flex: 1, textAlign: 'center',
                                        padding: '0.55rem 0.85rem', borderRadius: 10,
                                        background: '#F3F4F6', border: '1px solid #E5E7EB',
                                        color: '#374151', fontWeight: 700, fontSize: '0.78rem',
                                        textDecoration: 'none',
                                    }}>
                                    🏠 Voltar ao painel de estoque
                                </Link>
                            </div>
                        </div>
                    ) : null}
                </AdminCreationSuccessScreen>

                {/* Modal de Solicitação de Compra acionado pelo CTA da tela de sucesso */}
                {openSolicitarAfterSuccess && createdItem && (
                    <SolicitarCompraModal
                        item={createdItem}
                        onClose={() => setOpenSolicitarAfterSuccess(false)}
                        onSuccess={() => {
                            setOpenSolicitarAfterSuccess(false);
                            setPartialPrError(null);
                            if (onModalSuccess) onModalSuccess(); else router.push('/admin/estoque?tab=solicitacoes');
                        }}
                    />
                )}
            </>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: isModal ? '100%' : 780, margin: '0 auto' }} className="animate-fade-in">

            {/* HEADER */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {isModal ? (
                    <button type="button" onClick={onModalClose} style={{ width: 36, height: 36, borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <ChevronLeftIcon style={{ width: 16, height: 16, color: '#6B7280' }} />
                    </button>
                ) : (
                    <Link href="/admin/estoque?tab=central"
                        style={{ width: 36, height: 36, borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', transition: 'all 0.18s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FFFDE7'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                    >
                        <ChevronLeftIcon style={{ width: 16, height: 16, color: '#6B7280' }} />
                    </Link>
                )}
                <div>
                    <h1 className="gradient-text" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: isModal ? '1.2rem' : '1.6rem', fontWeight: 900, letterSpacing: '0.08em' }}>
                        NOVO ITEM DE ESTOQUE
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                        Cadastre um novo insumo no estoque central
                    </p>
                </div>
            </div>

            {/* STEP PROGRESS */}
            <div style={{
                background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB',
                padding: '1rem 1.5rem',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                display: 'flex', alignItems: 'center', gap: '0',
            }}>
                {STEPS.map((s, i) => {
                    const active = step === s.n;
                    const done = step > s.n;
                    const Icon = s.icon;
                    return (
                        <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1 }}>
                                <div style={{
                                    width: 34, height: 34, borderRadius: 10,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0, transition: 'all 0.3s',
                                    background: done ? '#059669' : active ? '#FFD600' : '#F3F4F6',
                                    border: `2px solid ${done ? '#059669' : active ? '#FFD600' : '#E5E7EB'}`,
                                }}>
                                    {done
                                        ? <CheckCircleIcon style={{ width: 16, height: 16, color: '#fff' }} />
                                        : <Icon style={{ width: 16, height: 16, color: active ? '#000' : '#9CA3AF' }} />
                                    }
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: active ? '#B89B00' : done ? '#059669' : '#9CA3AF' }}>
                                        Etapa {s.n}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: active ? '#111827' : done ? '#374151' : '#9CA3AF' }}>
                                        {s.label}
                                    </div>
                                </div>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div style={{
                                    flex: 1, height: 2,
                                    background: done ? '#059669' : '#E5E7EB',
                                    borderRadius: 2, margin: '0 0.75rem',
                                    transition: 'background 0.3s',
                                }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* FORM CARD */}
            <div style={{
                background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB',
                overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
            }}>
                {/* Section header */}
                <div style={{
                    padding: '0.9rem 1.5rem', background: '#FFFDE7',
                    borderBottom: '2px solid #FEF08A',
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                }}>
                    {(() => {
                        const s = STEPS[step - 1];
                        const Icon = s.icon;
                        return <>
                            <Icon style={{ width: 16, height: 16, color: '#B89B00' }} />
                            <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.08em', color: '#B89B00' }}>
                                {STEPS[step - 1].label.toUpperCase()}
                            </span>
                        </>;
                    })()}
                </div>

                <div style={{ padding: '1.5rem' }}>
                    {/* ── STEP 1: IDENTIFICAÇÃO ── */}
                    {step === 1 && (
                        <div style={{ display: 'grid', gap: '1.1rem' }}>
                            <div>
                                <FormInput
                                    label="Nome do Item"
                                    required
                                    placeholder="Ex: Apostila Mecânica Básica"
                                    value={form.nome}
                                    onChange={e => set('nome', e.target.value)}
                                    maxLength={120}
                                />
                                {errors.nome && <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: '0.25rem' }}>{errors.nome}</p>}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <FormInput
                                    label="Código Interno / SKU"
                                    placeholder="Ex: APO-MEC-001"
                                    value={form.codigoInterno ?? ''}
                                    onChange={e => set('codigoInterno', e.target.value)}
                                    maxLength={60}
                                />
                                <div>
                                    <FormSelect
                                        label="Embalagem"
                                        required
                                        value={form.unidade}
                                        onChange={e => set('unidade', (e.target as HTMLSelectElement).value)}
                                    >
                                        {EMBALAGEM_OPTS.map(u => (
                                            <option key={u.value} value={u.value}>{u.label}</option>
                                        ))}
                                    </FormSelect>
                                    {errors.unidade && <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: '0.25rem' }}>{errors.unidade}</p>}
                                </div>
                            </div>

                            {/* Conteúdo por embalagem — opcional */}
                            <div>
                                <label style={{
                                    display: 'block', fontSize: '0.7rem', fontWeight: 800,
                                    textTransform: 'uppercase', letterSpacing: '0.08em',
                                    color: '#9CA3AF', marginBottom: 6,
                                }}>
                                    Conteúdo por Embalagem <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.6rem', alignItems: 'flex-start' }}>
                                    <FormInput
                                        label=""
                                        placeholder={`Qtd por ${form.unidade || 'embalagem'}  Ex: 250`}
                                        type="number"
                                        value={form.conteudoQuantidade !== undefined && form.conteudoQuantidade !== null ? String(form.conteudoQuantidade) : ''}
                                        onChange={e => set('conteudoQuantidade', e.target.value === '' ? undefined : Number(e.target.value))}
                                        min="0.001"
                                        step="any"
                                    />
                                    <div style={{ width: 90, marginTop: 2 }}>
                                        <FormSelect
                                            label=""
                                            value={form.conteudoUnidade ?? ''}
                                            onChange={e => set('conteudoUnidade', (e.target as HTMLSelectElement).value || undefined)}
                                        >
                                            <option value="">—</option>
                                            {CONTEUDO_OPTS.map(u => (
                                                <option key={u.value} value={u.value}>{u.label}</option>
                                            ))}
                                        </FormSelect>
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: 4 }}>
                                    Ex: frasco de 250 mL → o saldo fica em frascos, mas relatórios mostram "10 frascos × 250 mL".
                                </p>
                            </div>

                            {/* Categoria — defaults + customizadas (8 + N criadas pelo admin) */}
                            <div>
                                <label style={LABEL_STYLE}>Categoria<span style={{ color: '#FFD600', marginLeft: 3 }}>*</span></label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
                                    {categoryCards.map(c => {
                                        const isSelected = c.isDefault
                                            ? (!form.customCategoryId && form.categoria === c.defaultEnum)
                                            : form.customCategoryId === c.id;
                                        const color = c.color;
                                        const selectCategory = () => {
                                            if (c.isDefault) {
                                                setForm(f => ({
                                                    ...f,
                                                    categoria: (c.defaultEnum ?? 'OUTRO') as StockItemCategory,
                                                    customCategoryId: undefined,
                                                }));
                                            } else {
                                                setForm(f => ({
                                                    ...f,
                                                    categoria: 'OUTRO',
                                                    customCategoryId: c.id,
                                                }));
                                            }
                                            setErrors(e => { const n = { ...e }; delete n.categoria; return n; });
                                        };
                                        return (
                                            <div
                                                key={c.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={selectCategory}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        selectCategory();
                                                    }
                                                }}
                                                title={c.description ?? undefined}
                                                style={{
                                                    padding: '0.65rem 0.75rem', borderRadius: 10,
                                                    cursor: 'pointer', textAlign: 'left',
                                                    transition: 'all 0.18s',
                                                    background: isSelected ? `${color}12` : '#F9FAFB',
                                                    border: `1.5px solid ${isSelected ? color : '#E5E7EB'}`,
                                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                    position: 'relative',
                                                }}>
                                                <span style={{ fontSize: '1rem' }}>{c.icon}</span>
                                                <span style={{
                                                    fontSize: '0.78rem',
                                                    fontWeight: isSelected ? 800 : 600,
                                                    color: isSelected ? color : '#6B7280',
                                                }}>{c.nome}</span>
                                                {!c.isDefault && (
                                                    <span title="Categoria customizada" style={{
                                                        marginLeft: 4, fontSize: '0.55rem', fontWeight: 700,
                                                        background: color, color: '#fff', padding: '1px 5px',
                                                        borderRadius: 6,
                                                    }}>CUSTOM</span>
                                                )}
                                                {!c.isDefault && (
                                                    <button
                                                        type="button"
                                                        tabIndex={0}
                                                        title={`Apagar categoria ${c.nome}`}
                                                        aria-label={`Apagar categoria ${c.nome}`}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleDeleteCustomCategory(c as StockCategory);
                                                        }}
                                                        disabled={deletingCategoryId === c.id}
                                                        style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 999,
                                                            marginLeft: 'auto',
                                                            flexShrink: 0,
                                                            background: deletingCategoryId === c.id ? '#F3F4F6' : '#FEF2F2',
                                                            border: '1px solid #FECACA',
                                                            color: deletingCategoryId === c.id ? '#9CA3AF' : '#DC2626',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '1rem',
                                                            fontWeight: 700,
                                                            lineHeight: 1,
                                                            cursor: deletingCategoryId === c.id ? 'wait' : 'pointer',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                                            transition: 'transform 0.15s, background 0.15s',
                                                        }}
                                                    >
                                                        {deletingCategoryId === c.id ? '…' : '×'}
                                                    </button>
                                                )}
                                                {isSelected && (
                                                    <CheckCircleIcon style={{ width: 14, height: 14, color: color, marginLeft: c.isDefault ? 'auto' : 2 }} />
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* + Criar nova */}
                                    <button
                                        type="button"
                                        onClick={() => setCreateCatOpen(true)}
                                        style={{
                                            padding: '0.65rem 0.75rem', borderRadius: 10,
                                            cursor: 'pointer', textAlign: 'left',
                                            background: '#FFFBEB',
                                            border: '1.5px dashed #FFD600',
                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                            color: '#92400E', fontWeight: 700, fontSize: '0.78rem',
                                        }}>
                                        <span style={{ fontSize: '1rem' }}>+</span>
                                        <span>Criar categoria</span>
                                    </button>
                                </div>
                                <p style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: 6 }}>
                                    Use uma das categorias padrão ou crie uma customizada (visível para todo o time).
                                </p>
                            </div>

                            <CreateCategoryModal
                                open={createCatOpen}
                                onClose={() => setCreateCatOpen(false)}
                                onCreated={(cat) => {
                                    setAllCategories(prev => [...prev, cat].sort((a, b) => {
                                        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
                                        return a.nome.localeCompare(b.nome);
                                    }));
                                    setForm(f => ({ ...f, categoria: 'OUTRO', customCategoryId: cat.id }));
                                    setCreateCatOpen(false);
                                }}
                            />

                            <FormInput
                                label="Fornecedor"
                                placeholder="Ex: Papelaria São Luís Ltda"
                                value={form.fornecedor ?? ''}
                                onChange={e => set('fornecedor', e.target.value)}
                                maxLength={200}
                            />

                            {/* Preview card */}
                            {form.nome && (
                                <div style={{
                                    padding: '0.85rem 1rem', borderRadius: 10,
                                    background: '#F9FAFB', border: '1px solid #F3F4F6',
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                }}>
                                    <div style={{
                                        width: 36, height: 36, borderRadius: 10,
                                        background: `${catColor}15`,
                                        border: `1.5px solid ${catColor}40`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.1rem',
                                    }}>{catIcon}</div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>{form.nome}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono, monospace' }}>
                                            {form.codigoInterno || '—'} · {catLabel} · {form.unidade}
                                            {form.conteudoQuantidade && form.conteudoUnidade
                                                ? ` × ${form.conteudoQuantidade} ${form.conteudoUnidade}`
                                                : ''}
                                        </div>
                                    </div>
                                    <span style={{
                                        marginLeft: 'auto', padding: '0.2rem 0.6rem', borderRadius: 100,
                                        fontSize: '0.65rem', fontWeight: 700,
                                        background: '#F0F9FF', color: '#0891B2', border: '1px solid #BAE6FD',
                                    }}>Preview</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── STEP 2: QUANTIDADE ── */}
                    {step === 2 && (
                        <div style={{ display: 'grid', gap: '1.1rem' }}>
                            {/* AVISO: Saldo inicial sempre = 0. Estoque entra via Solicitação de Compra */}
                            <div style={{
                                padding: '0.95rem 1.1rem', borderRadius: 12,
                                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.07), rgba(245, 158, 11, 0.03))',
                                border: '1.5px solid rgba(245, 158, 11, 0.35)',
                                display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                            }}>
                                <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🛡️</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#92400E', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Saldo inicial sempre = 0 (rastreio 100%)
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#78350F', lineHeight: 1.5 }}>
                                        O cadastro <strong>cataloga</strong> o item. O <strong>saldo só entra via Solicitação de Compra aprovada e recebida</strong> —
                                        isso garante que cada unidade tenha uma conta a pagar de origem (sem "estoque fantasma").
                                        Use o atalho do passo 3 para já gerar a solicitação junto. Você pode comprar tudo de uma vez ou parcelar em várias compras.
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{
                                        display: 'block', fontSize: '0.7rem', fontWeight: 800,
                                        textTransform: 'uppercase', letterSpacing: '0.08em',
                                        color: '#9CA3AF', marginBottom: 6,
                                    }}>
                                        Saldo Inicial · bloqueado
                                    </label>
                                    <div style={{
                                        padding: '0.65rem 0.9rem', borderRadius: 10,
                                        border: '1.5px dashed #D1D5DB', background: '#F9FAFB',
                                        color: '#6B7280', fontSize: '0.85rem', fontFamily: 'Orbitron, sans-serif',
                                        fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8,
                                    }}>
                                        <span style={{ fontSize: '1.1rem' }}>🔒</span>
                                        <span>0 {form.unidade}</span>
                                        <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: '#9CA3AF', fontWeight: 600 }}>
                                            (use o atalho de Solicitação)
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <FormInput
                                        label={`Quantidade Mínima (${form.unidade})`}
                                        type="number"
                                        min={0}
                                        step={0.001}
                                        placeholder="Ex: 10 (deixe em branco para 0)"
                                        value={form.quantidadeMinima === undefined || form.quantidadeMinima === null ? '' : String(form.quantidadeMinima)}
                                        onChange={e => set('quantidadeMinima', e.target.value === '' ? undefined : Number(e.target.value))}
                                    />
                                    {errors.quantidadeMinima && <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: '0.25rem' }}>{errors.quantidadeMinima}</p>}
                                    <p style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                                        Quando o saldo atingir esse limite, será gerado um alerta de estoque baixo.
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <FormInput
                                        label="Preço Unitário (R$)"
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        placeholder="0,00"
                                        value={form.precoUnitario ?? ''}
                                        onChange={e => set('precoUnitario', e.target.value ? Number(e.target.value) : undefined)}
                                    />
                                    {errors.precoUnitario && <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: '0.25rem' }}>{errors.precoUnitario}</p>}

                                    {/* Feedback de Valor Total Estimado da Primeira Compra */}
                                    {form.precoUnitario !== undefined && (
                                        <div style={{
                                            marginTop: 10,
                                            padding: '10px 14px',
                                            borderRadius: 12,
                                            background: '#F0FDFA',
                                            border: '1.5px solid #5EEAD4',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            animation: 'fade-in 0.3s ease-out'
                                        }}>
                                            <span style={{ fontSize: '1.2rem' }}>💰</span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                                                    Custo da Primeira Compra (Estimado)
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0D9488', fontFamily: 'Orbitron, sans-serif' }}>
                                                        R$ {((form.quantidadeMinima ? Number(form.quantidadeMinima) : 1) * Number(form.precoUnitario)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                    <div style={{ fontSize: '0.65rem', color: '#14B8A6', fontWeight: 700 }}>
                                                        ({form.quantidadeMinima || 1} {form.unidade})
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <FormInput
                                    label="Validade"
                                    type="date"
                                    value={form.validade ?? ''}
                                    onChange={e => set('validade', e.target.value)}
                                />
                            </div>

                            <FormInput
                                label="Localização (depósito / prateleira)"
                                placeholder="Ex: Depósito Central — Prateleira A3"
                                value={form.localizacao ?? ''}
                                onChange={e => set('localizacao', e.target.value)}
                                maxLength={200}
                            />

                            {/* Aviso sobre auditoria */}
                            <div style={{
                                padding: '0.75rem 1rem', borderRadius: 10,
                                background: 'rgba(8, 145, 178, 0.06)',
                                border: '1px solid rgba(8, 145, 178, 0.2)',
                                display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
                            }}>
                                <span style={{ fontSize: '1rem', flexShrink: 0 }}>ℹ️</span>
                                <div>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0369A1' }}>
                                        Saldo gerenciado por movimentações
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#0369A1', marginTop: 2 }}>
                                        Após o cadastro, qualquer alteração de quantidade deve ser feita via movimentações (entrada/saída/ajuste) para garantir auditoria completa.
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label style={LABEL_STYLE}>Foto do Item</label>

                                {form.fotoUrl ? (
                                    <div style={{
                                        border: '1.5px solid #FEF08A', borderRadius: 12, padding: '1rem',
                                        background: '#FFFDE7', display: 'flex', alignItems: 'center', gap: 14,
                                    }}>
                                        <img
                                            src={form.fotoUrl}
                                            alt="Foto do item"
                                            style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 12, border: '1px solid #E5E7EB' }}
                                        />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F766E', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <CheckCircleIcon style={{ width: 14, height: 14 }} />
                                                Foto enviada
                                            </div>
                                            <div style={{ fontSize: '0.68rem', color: '#9CA3AF', wordBreak: 'break-all', marginTop: 4 }}>{form.fotoUrl}</div>

                                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                                <input
                                                    id="stock-photo-replace"
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); e.currentTarget.value = ''; }}
                                                    style={{ display: 'none' }}
                                                    disabled={uploadingPhoto}
                                                />
                                                <label
                                                    htmlFor="stock-photo-replace"
                                                    style={{
                                                        padding: '0.45rem 0.85rem', borderRadius: 8,
                                                        background: '#FFFFFF', border: '1px solid #FEF08A',
                                                        color: '#B89B00', fontWeight: 700, fontSize: '0.72rem',
                                                        cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
                                                        opacity: uploadingPhoto ? 0.6 : 1,
                                                    }}
                                                >
                                                    {uploadingPhoto ? 'Enviando...' : 'Substituir foto'}
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => set('fotoUrl', '')}
                                                    disabled={uploadingPhoto}
                                                    style={{
                                                        padding: '0.45rem 0.85rem', borderRadius: 8,
                                                        background: '#FFFFFF', border: '1px solid #FECACA',
                                                        color: '#DC2626', fontWeight: 700, fontSize: '0.72rem',
                                                        cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
                                                    }}
                                                >
                                                    Remover
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{
                                        border: '2px dashed #E5E7EB', borderRadius: 12, padding: '1.5rem',
                                        background: '#FAFBFC', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                                        textAlign: 'center',
                                    }}>
                                        <CameraIcon style={{ width: 28, height: 28, color: '#9CA3AF' }} />
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>
                                            {uploadingPhoto ? 'Enviando foto...' : 'Adicione uma foto do item'}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                                            JPG, PNG ou WebP — até 5 MB
                                        </div>
                                        <input
                                            id="stock-photo-upload"
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); e.currentTarget.value = ''; }}
                                            style={{ display: 'none' }}
                                            disabled={uploadingPhoto}
                                        />
                                        <label
                                            htmlFor="stock-photo-upload"
                                            style={{
                                                marginTop: 4,
                                                padding: '0.55rem 1.1rem', borderRadius: 10,
                                                background: '#FFD600', border: '1px solid #FACC15',
                                                color: '#000', fontWeight: 800, fontSize: '0.78rem',
                                                cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
                                                opacity: uploadingPhoto ? 0.6 : 1,
                                            }}
                                        >
                                            {uploadingPhoto ? 'Enviando...' : 'Escolher arquivo'}
                                        </label>
                                    </div>
                                )}

                                {photoUploadError && (
                                    <p style={{ fontSize: '0.72rem', color: '#DC2626', marginTop: '0.45rem' }}>
                                        {photoUploadError}
                                    </p>
                                )}
                            </div>

                            <FormTextarea
                                label="Observações"
                                placeholder="Notas internas sobre o item, condições especiais, restrições..."
                                value={form.observacoes ?? ''}
                                onChange={e => set('observacoes', (e.target as HTMLTextAreaElement).value)}
                                rows={4}
                            />



                            {/* Resumo */}
                            <div style={{ padding: '1rem 1.25rem', borderRadius: 12, background: '#FFFDE7', border: '1px solid #FEF08A' }}>
                                <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B89B00', marginBottom: '0.75rem' }}>
                                    Resumo do Cadastro
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
                                    {[
                                        ['Nome',         form.nome || '—'],
                                        ['Código',       form.codigoInterno || '—'],
                                        ['Categoria',    catLabel],
                                        ['Embalagem',    form.unidade],
                                        ['Conteúdo',     form.conteudoQuantidade && form.conteudoUnidade
                                            ? `${form.conteudoQuantidade} ${form.conteudoUnidade} por ${form.unidade}`
                                            : '— (não informado)'],
                                        ['Saldo Inicial', `0 ${form.unidade} (sempre — saldo entra via Solicitação de Compra)`],

                                        ['Qtd. Mínima',  form.quantidadeMinima === undefined || form.quantidadeMinima === null || (form.quantidadeMinima as any) === '' ? '— (será 0)' : `${form.quantidadeMinima} ${form.unidade}`],
                                        ['Preço Unit.',  form.precoUnitario != null ? `R$ ${Number(form.precoUnitario).toFixed(2).replace('.', ',')}` : '—'],
                                        ['Validade',     form.validade || '—'],
                                        ['Fornecedor',   form.fornecedor || '—'],
                                        ['Localização',  form.localizacao || '—'],
                                    ].map(([k, v]) => (
                                        <div key={k} style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                                            <span style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 700, minWidth: 85 }}>{k}</span>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* INACTIVE CONFLICT BANNER — oferece REATIVAR item soft-deletado */}
                {inactiveConflict && (
                    <div style={{
                        margin: '0 1.5rem 1rem', padding: '1rem 1.1rem', borderRadius: 12,
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(59,130,246,0.02))',
                        border: '1.5px solid rgba(59,130,246,0.35)',
                    }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>♻️</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: '#1E3A8A', letterSpacing: '0.04em', marginBottom: 6 }}>
                                    EXISTE ITEM DESATIVADO COM ESTE CÓDIGO
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#1E40AF', lineHeight: 1.55, marginBottom: 10 }}>
                                    Já existe o item <strong>"{inactiveConflict.nome}"</strong> com o código{' '}
                                    <code style={{ background: '#fff', padding: '1px 6px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                                        {form.codigoInterno}
                                    </code>{' '}desativado no sistema.
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#1E3A8A', background: 'rgba(255,255,255,0.6)', padding: '0.6rem 0.8rem', borderRadius: 8, marginBottom: 12 }}>
                                    <strong>Reativar</strong> mantém o histórico de movimentações e contas a pagar antigas conectadas a esse item,
                                    e atualiza nome, categoria, preço etc. com os dados que você acabou de digitar.
                                    O saldo volta zerado e a Solicitação de Compra é gerada normalmente.
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <button
                                        onClick={handleReactivate}
                                        disabled={reactivating}
                                        style={{
                                            padding: '0.6rem 1.2rem', borderRadius: 10, border: 'none',
                                            background: reactivating
                                                ? '#94A3B8'
                                                : 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                                            color: '#fff', fontWeight: 800, fontSize: '0.78rem',
                                            cursor: reactivating ? 'wait' : 'pointer',
                                            boxShadow: '0 2px 10px rgba(59,130,246,0.35)',
                                            letterSpacing: '0.03em',
                                        }}>
                                        {reactivating ? '⏳ Reativando...' : '♻️ Reativar item existente'}
                                    </button>
                                    <button
                                        onClick={() => setInactiveConflict(null)}
                                        style={{
                                            padding: '0.6rem 1rem', borderRadius: 10,
                                            background: '#fff', border: '1px solid #E5E7EB',
                                            color: '#475569', fontWeight: 700, fontSize: '0.78rem',
                                            cursor: 'pointer',
                                        }}>
                                        Usar outro código
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ERROR BANNER */}
                {submitError && (
                    <div style={{
                        margin: '0 1.5rem 1rem', padding: '0.75rem 1rem', borderRadius: 10,
                        background: '#FEF2F2', border: '1px solid #FECACA',
                        display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
                    }}>
                        <span style={{ color: '#DC2626', fontSize: '1rem', flexShrink: 0 }}>✕</span>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#DC2626', marginBottom: '0.15rem' }}>Erro ao cadastrar</div>
                            <div style={{ fontSize: '0.75rem', color: '#991B1B' }}>{submitError}</div>
                        </div>
                        <button onClick={() => setSubmitError(null)} style={{
                            marginLeft: 'auto', background: 'none', border: 'none',
                            cursor: 'pointer', color: '#DC2626', fontSize: '1.1rem', lineHeight: 1,
                        }}>×</button>
                    </div>
                )}

                {/* FOOTER */}
                <div style={{
                    padding: '1rem 1.5rem', borderTop: '1px solid #F3F4F6',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#FAFAFA',
                }}>
                    <button
                        onClick={() => step > 1 ? setStep(s => (s - 1) as Step) : (onModalClose ? onModalClose() : router.push('/admin/estoque?tab=central'))}
                        style={{
                            padding: '0.6rem 1.25rem', borderRadius: 10,
                            background: '#F3F4F6', border: '1px solid #E5E7EB',
                            color: '#6B7280', fontWeight: 700, fontSize: '0.82rem',
                            cursor: 'pointer', transition: 'all 0.18s',
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#E5E7EB'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#F3F4F6'}
                    >
                        {step === 1 ? 'Cancelar' : 'Voltar'}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {STEPS.map(s => (
                            <div key={s.n} style={{
                                width: s.n === step ? 20 : 7, height: 7, borderRadius: 4,
                                background: s.n === step ? '#FFD600' : s.n < step ? '#059669' : '#E5E7EB',
                                transition: 'all 0.3s',
                            }} />
                        ))}
                    </div>

                    {step < 2 ? (
                        <button onClick={nextStep} className="btn-primary" style={{ minWidth: 120 }}>
                            Próxima Etapa
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="btn-primary"
                            style={{ minWidth: 180, opacity: saving ? 0.7 : 1 }}>
                            {saving ? 'Cadastrando + solicitando...' : 'Cadastrar + Solicitar 💰'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
