'use client';

import { useEffect, useRef, useState } from 'react';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';
import { stockApi, StockItem, resolveCategoria, getStockStatus } from '@/lib/api/stock';

interface OrquestradorInsumoModalProps {
    open: boolean;
    onClose: () => void;
    onNovoInsumo: () => void;
    onItemSelecionado: (item: StockItem) => void;
    /** Quando vem de uma Verba: pula direto para busca e exibe o orçamento disponível */
    initialStep?: 'escolha' | 'buscar';
    verbaBudget?: number;
}

const STATUS_COLOR: Record<string, string> = {
    CRITICO: '#EF4444',
    BAIXO: '#F59E0B',
    OK: '#10B981',
    SEM_MINIMO: '#94A3B8',
};
const STATUS_LABEL: Record<string, string> = {
    CRITICO: 'Crítico',
    BAIXO: 'Baixo',
    OK: 'OK',
    SEM_MINIMO: '—',
};

export function OrquestradorInsumoModal({
    open,
    onClose,
    onNovoInsumo,
    onItemSelecionado,
    initialStep = 'escolha',
    verbaBudget,
}: OrquestradorInsumoModalProps) {
    const [step, setStep] = useState<'escolha' | 'buscar'>(initialStep);
    const [search, setSearch] = useState('');
    const [items, setItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!open) {
            setStep(initialStep);
            setSearch('');
            setItems([]);
        } else {
            setStep(initialStep);
        }
    }, [open, initialStep]);

    useEffect(() => {
        if (step === 'buscar') {
            setTimeout(() => inputRef.current?.focus(), 100);
            doSearch('');
        }
    }, [step]);

    const doSearch = async (q: string) => {
        setLoading(true);
        try {
            const data = await stockApi.items.getAll({ search: q.trim() || undefined });
            setItems(data);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (val: string) => {
        setSearch(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(val), 350);
    };

    if (!open) return null;

    return (
        <ModalPortal>
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: MODAL_PORTAL_Z_INDEX,
                    background: 'rgba(2,6,23,0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem',
                    animation: 'orq-fade 0.2s ease',
                }}
            >
                <div
                    onClick={e => e.stopPropagation()}
                    style={{
                        width: step === 'buscar' ? 'min(700px,100%)' : 'min(520px,100%)',
                        maxHeight: '88vh',
                        background: '#FFFFFF',
                        borderRadius: 20,
                        boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
                        display: 'flex', flexDirection: 'column',
                        overflow: 'hidden',
                        transition: 'width 0.25s ease',
                    }}
                >
                    {/* ── HEADER ── */}
                    <div style={{
                        background: 'linear-gradient(135deg, #FFD600 0%, #B89B00 100%)',
                        padding: '20px 28px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        color: '#0F172A',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            {step === 'buscar' && initialStep !== 'buscar' && (
                                <button
                                    onClick={() => setStep('escolha')}
                                    style={{
                                        background: 'rgba(0,0,0,0.1)', border: 'none', borderRadius: 8,
                                        padding: '6px 12px', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem',
                                        color: '#0F172A',
                                    }}
                                >
                                    ← Voltar
                                </button>
                            )}
                            <div>
                                <p style={{ margin: 0, fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1rem', letterSpacing: '0.04em' }}>
                                    {step === 'escolha' ? '📦 INSUMOS' : '🔍 SELECIONAR ITEM'}
                                </p>
                                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', fontWeight: 600, opacity: 0.75 }}>
                                    {step === 'escolha'
                                        ? 'O que você deseja fazer?'
                                        : 'Busque e selecione o insumo existente'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(0,0,0,0.1)', border: 'none', borderRadius: '50%',
                                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', fontSize: '1.1rem', color: '#0F172A',
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* ── BODY ── */}
                    {step === 'escolha' ? (
                        <div style={{ padding: '28px 28px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <OptionCard
                                icon="✨"
                                title="Cadastrar novo insumo"
                                description="Registra um item que ainda não existe no catálogo. Você poderá já solicitar a primeira compra durante o cadastro."
                                color="#B89B00"
                                onClick={() => { onClose(); onNovoInsumo(); }}
                            />
                            <OptionCard
                                icon="🛒"
                                title="Solicitar compra de item existente"
                                description="Pede reposição de um produto já cadastrado. Você verá o saldo atual, sugestão de quantidade e poderá ajustar o mínimo."
                                color="#3B82F6"
                                onClick={() => setStep('buscar')}
                            />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            {/* Banner da verba (quando vem de uma verba) */}
                            {verbaBudget != null && verbaBudget > 0 && (
                                <div style={{
                                    padding: '10px 24px',
                                    background: 'linear-gradient(90deg, #FFFDE7 0%, #FEF9C3 100%)',
                                    borderBottom: '1px solid #FDE68A',
                                    display: 'flex', alignItems: 'center', gap: 10,
                                }}>
                                    <span style={{ fontSize: '1rem' }}>💰</span>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Orçamento da verba:&nbsp;
                                        </span>
                                        <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#B45309', fontFamily: 'Orbitron, sans-serif' }}>
                                            R$ {verbaBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '0.65rem', color: '#92400E', fontWeight: 600 }}>
                                        Selecione o item a comprar
                                    </span>
                                </div>
                            )}
                            {/* Search bar */}
                            <div style={{ padding: '16px 24px 12px', borderBottom: '1px solid #F1F5F9' }}>
                                <input
                                    ref={inputRef}
                                    value={search}
                                    onChange={e => handleSearch(e.target.value)}
                                    placeholder="Nome ou código do insumo..."
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        borderRadius: 10,
                                        border: '1.5px solid #E2E8F0',
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        outline: 'none',
                                        color: '#0F172A',
                                        boxSizing: 'border-box',
                                    }}
                                    onFocus={e => e.currentTarget.style.borderColor = '#FFD600'}
                                    onBlur={e => e.currentTarget.style.borderColor = '#E2E8F0'}
                                />
                            </div>

                            {/* Items list */}
                            <div style={{ overflowY: 'auto', flex: 1 }}>
                                {loading ? (
                                    <div style={{ padding: '32px 0', textAlign: 'center', color: '#94A3B8' }}>
                                        <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⏳</div>
                                        <p style={{ fontWeight: 600 }}>Buscando...</p>
                                    </div>
                                ) : items.length === 0 ? (
                                    <div style={{ padding: '32px 0', textAlign: 'center', color: '#94A3B8' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔍</div>
                                        <p style={{ fontWeight: 600 }}>Nenhum item encontrado</p>
                                    </div>
                                ) : (
                                    items.map(item => {
                                        const status = getStockStatus(item);
                                        const cat = resolveCategoria(item);
                                        const catColor = cat.color ?? '#94A3B8';
                                        const catIcon = cat.icon ?? '📦';
                                        const catLabel = cat.label ?? '';
                                        const statusColor = STATUS_COLOR[status] ?? '#94A3B8';
                                        const atual = Number(item.quantidadeAtual);

                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => { onClose(); onItemSelecionado(item); }}
                                                style={{
                                                    width: '100%', textAlign: 'left',
                                                    padding: '14px 24px',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    borderBottom: '1px solid #F8FAFC',
                                                    cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: 12,
                                                    transition: 'background 0.15s',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#FFFDE7'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                {/* Categoria icon */}
                                                <span style={{
                                                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                                                    background: `${catColor}15`,
                                                    border: `1px solid ${catColor}30`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '1.2rem',
                                                }}>
                                                    {catIcon}
                                                </span>

                                                {/* Info */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {item.nome}
                                                    </p>
                                                    <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: catColor, fontWeight: 700 }}>
                                                        {catLabel}
                                                        {item.codigoInterno && (
                                                            <span style={{ color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace', marginLeft: 6, fontWeight: 500 }}>
                                                                {item.codigoInterno}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>

                                                {/* Saldo + status */}
                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                    <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: atual === 0 ? '#EF4444' : '#0F172A' }}>
                                                        {atual}
                                                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B', marginLeft: 3 }}>{item.unidade}</span>
                                                    </p>
                                                    <span style={{
                                                        fontSize: '0.65rem', fontWeight: 700,
                                                        color: statusColor, marginTop: 2, display: 'block',
                                                    }}>
                                                        ● {STATUS_LABEL[status] ?? status}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>

                            {/* Footer hint */}
                            <div style={{ padding: '12px 24px', borderTop: '1px solid #F1F5F9', fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>
                                {items.length} {items.length === 1 ? 'item encontrado' : 'itens encontrados'} — clique para solicitar
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <style>{`@keyframes orq-fade { from { opacity:0; transform:scale(0.97) } to { opacity:1; transform:scale(1) } }`}</style>
        </ModalPortal>
    );
}

function OptionCard({ icon, title, description, color, onClick }: {
    icon: string; title: string; description: string; color: string; onClick: () => void;
}) {
    const [hov, setHov] = useState(false);
    return (
        <button
            type="button"
            onClick={onClick}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                width: '100%', textAlign: 'left', cursor: 'pointer',
                padding: '18px 20px',
                borderRadius: 14,
                border: `2px solid ${hov ? color : '#E2E8F0'}`,
                background: hov ? `${color}08` : '#FAFAFA',
                display: 'flex', alignItems: 'center', gap: 16,
                transition: 'all 0.2s',
                transform: hov ? 'translateY(-1px)' : 'none',
                boxShadow: hov ? `0 6px 20px ${color}20` : '0 1px 4px rgba(0,0,0,0.04)',
            }}
        >
            <span style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: `${color}18`, border: `1.5px solid ${color}35`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem',
                transition: 'transform 0.2s',
                transform: hov ? 'scale(1.1)' : 'scale(1)',
            }}>
                {icon}
            </span>
            <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: hov ? color : '#0F172A', fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.02em' }}>
                    {title}
                </p>
                <p style={{ margin: '5px 0 0', fontSize: '0.78rem', color: '#64748B', lineHeight: 1.5, fontWeight: 500 }}>
                    {description}
                </p>
            </div>
            <span style={{ fontSize: '1.2rem', color: hov ? color : '#CBD5E1', transition: 'all 0.2s' }}>›</span>
        </button>
    );
}
