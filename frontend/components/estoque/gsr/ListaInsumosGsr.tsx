'use client';

import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import {
    StockItem,
    resolveCategoria,
    getStockStatus,
    STOCK_STATUS_META,
    daysUntilExpiry,
    stockApi,
} from '@/lib/api/stock';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';

export type ListaInsumosVariant = 'central' | 'truck';

export interface ListaInsumosRow {
    item: StockItem;
    /** Quantidade mostrada na coluna "Quantidade" (central ou na carreta) */
    quantidadeExibida: number;
}

/* ── Upgrade table design tokens ── */
const TH: React.CSSProperties = {
    textAlign: 'left',
    fontSize: '0.65rem',
    fontWeight: 800,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    padding: '12px 14px',
    borderBottom: '2px solid #E2E8F0',
    background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
    whiteSpace: 'nowrap',
};

const TD: React.CSSProperties = {
    padding: '14px',
    borderBottom: '1px solid #F1F5F9',
    fontSize: '0.85rem',
    verticalAlign: 'middle',
};

/* ── Action icon button — inline, matching Upgrade style ── */
function ActionBtn({
    title,
    color,
    onClick,
    disabled,
    children,
    href,
}: {
    title: string;
    color: string;
    onClick?: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    href?: string;
}) {
    const style: React.CSSProperties = {
        width: 32,
        height: 32,
        borderRadius: 8,
        border: `1.5px solid ${disabled ? '#E5E7EB' : `${color}44`}`,
        background: disabled ? '#F9FAFB' : `${color}0D`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.82rem',
        padding: 0,
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.2s ease',
        textDecoration: 'none',
        color: disabled ? '#CBD5E1' : color,
    };

    if (href && !disabled) {
        return (
            <Link href={href} title={title} style={style}
                onMouseEnter={e => { e.currentTarget.style.background = `${color}1A`; e.currentTarget.style.borderColor = `${color}88`; e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${color}0D`; e.currentTarget.style.borderColor = `${color}44`; e.currentTarget.style.transform = 'scale(1)'; }}
            >
                {children}
            </Link>
        );
    }

    return (
        <button
            type="button"
            title={title}
            style={style}
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = `${color}1A`; e.currentTarget.style.borderColor = `${color}88`; e.currentTarget.style.transform = 'scale(1.1)'; } }}
            onMouseLeave={e => { if (!disabled) { e.currentTarget.style.background = `${color}0D`; e.currentTarget.style.borderColor = `${color}44`; e.currentTarget.style.transform = 'scale(1)'; } }}
        >
            {children}
        </button>
    );
}

export function ListaInsumosGsr({
    variant,
    rows,
    loading,
    userRole,
    onMovement,
    onHistory,
    onDelete,
    onEdit,
    readOnly = false,
}: {
    variant: ListaInsumosVariant;
    rows: ListaInsumosRow[];
    loading: boolean;
    userRole: string;
    onMovement: (row: ListaInsumosRow) => void;
    onHistory: (row: ListaInsumosRow) => void;
    onDelete: (row: ListaInsumosRow) => void;
    onEdit?: (row: ListaInsumosRow) => void;
    /** Quando true, esconde botões Editar e Desativar (mantém Movimentação e Histórico). */
    readOnly?: boolean;
}) {
    const canDelete = !readOnly && (userRole === 'ADMIN' || userRole === 'IT_ADMIN');
    const canEdit = !readOnly && ['ADMIN', 'IT_ADMIN', 'COORDINATOR'].includes(userRole);

    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [financialsData, setFinancialsData] = useState<Record<string, any>>({});
    const [loadingFin, setLoadingFin] = useState<Record<string, boolean>>({});

    const handleRowClick = (id: string) => {
        if (expandedId === id) {
            setExpandedId(null);
            return;
        }
        setExpandedId(id);
        if (!financialsData[id]) {
            setLoadingFin(prev => ({ ...prev, [id]: true }));
            stockApi.items.financials(id)
                .then(data => setFinancialsData(prev => ({ ...prev, [id]: data })))
                .catch(console.error)
                .finally(() => setLoadingFin(prev => ({ ...prev, [id]: false })));
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 0.75rem' }} />
                <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.65rem', letterSpacing: '0.15em', color: '#94A3B8', textTransform: 'uppercase' }}>
                    Carregando insumos...
                </p>
            </div>
        );
    }

    if (rows.length === 0) {
        return (
            <div
                style={{
                    padding: '3rem 1.5rem',
                    textAlign: 'center',
                    background: 'linear-gradient(180deg, #FFFDF5 0%, #FAFBFC 100%)',
                    borderRadius: 14,
                    border: '1.5px dashed #E5D88A',
                }}
            >
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FFFDE7', border: '1.5px solid #FEF08A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 12px' }}>📦</div>
                <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>Nenhum insumo encontrado</div>
                <div style={{ fontSize: '0.82rem', marginTop: 6, color: '#64748B' }}>
                    {variant === 'truck' ? 'Sem saldo registado nesta carreta.' : 'Ajuste os filtros ou cadastre um novo insumo.'}
                </div>
            </div>
        );
    }

    return (
        <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid #E2E8F0', background: '#fff', boxShadow: '0 2px 12px rgba(15,23,42,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                <thead>
                    <tr>
                        <th style={TH}>Nome</th>
                        <th style={TH}>Categoria</th>
                        <th style={TH}>Quantidade</th>
                        <th style={TH}>Mínimo</th>
                        <th style={TH}>Vencimento</th>
                        <th style={TH}>Status</th>
                        <th style={{ ...TH, textAlign: 'center', width: 170 }}>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(({ item, quantidadeExibida }) => {
                        const cat = resolveCategoria(item);
                        const status = getStockStatus(item);
                        const meta = STOCK_STATUS_META[status];
                        const dias = daysUntilExpiry(item);
                        const truckTotal = (item.truckStocks || []).reduce((acc, ts) => acc + Number(ts.quantidadeAtual), 0);
                        const emTransito = Number(item.quantidadeEmTransito ?? 0);
                        const vencStr =
                            item.validade && dias !== null
                                ? `${new Date(item.validade).toLocaleDateString('pt-BR')}${dias < 0 ? ' (vencido)' : dias <= 30 ? ` (${dias}d)` : ''}`
                                : '—';

                        return (
                            <Fragment key={item.id}>
                                <tr
                                    style={{ transition: 'background 0.15s ease', cursor: 'pointer' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#FFFDF5')}
                                    onMouseLeave={e => (e.currentTarget.style.background = expandedId === item.id ? '#FFFDF5' : 'transparent')}
                                    onClick={() => handleRowClick(item.id)}
                                >
                                    <td style={{ ...TD, fontWeight: 700, color: '#0F172A' }}>{item.nome}</td>
                                    <td style={TD}>
                                        <span
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 5,
                                                padding: '3px 10px',
                                                borderRadius: 20,
                                                fontSize: '0.72rem',
                                                fontWeight: 700,
                                                background: `${cat.color}15`,
                                                color: cat.color,
                                                border: `1px solid ${cat.color}25`,
                                            }}
                                        >
                                            <span>{cat.icon}</span> {cat.label}
                                        </span>
                                    </td>
                                    <td style={{ ...TD, fontWeight: 800, fontFamily: 'Orbitron, sans-serif', fontSize: '0.82rem' }}>
                                        <span style={{ color: quantidadeExibida === 0 ? '#DC2626' : '#0F172A' }}>
                                            {quantidadeExibida}
                                        </span>
                                        <span style={{ color: '#94A3B8', fontWeight: 600, fontFamily: 'inherit', fontSize: '0.7rem', marginLeft: 3 }}>{item.unidade}</span>
                                        {variant === 'central' && truckTotal > 0 && (
                                            <div style={{ fontSize: '0.63rem', color: '#6366F1', fontWeight: 700, marginTop: 2, fontFamily: 'Inter, sans-serif', letterSpacing: 0 }}>
                                                +{truckTotal} nas carretas
                                            </div>
                                        )}
                                        {variant === 'central' && emTransito > 0 && (
                                            <div style={{ fontSize: '0.63rem', color: '#3B82F6', fontWeight: 700, marginTop: 1, fontFamily: 'Inter, sans-serif', letterSpacing: 0 }}>
                                                ⟳ {emTransito} em trânsito
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ ...TD, color: '#475569' }}>
                                        {Number(item.quantidadeMinima)} <span style={{ color: '#94A3B8', fontSize: '0.78rem' }}>{item.unidade}</span>
                                    </td>
                                    <td style={{ ...TD, fontSize: '0.8rem', color: dias !== null && dias < 0 ? '#DC2626' : dias !== null && dias <= 30 ? '#EA580C' : '#475569' }}>
                                        {dias !== null && dias <= 30 && <span style={{ marginRight: 4 }}>⏰</span>}
                                        {vencStr}
                                    </td>
                                    <td style={TD}>
                                        <span
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 5,
                                                padding: '4px 10px',
                                                borderRadius: 8,
                                                fontSize: '0.68rem',
                                                fontWeight: 800,
                                                letterSpacing: '0.04em',
                                                background: meta.bg,
                                                color: meta.color,
                                                border: `1px solid ${meta.border}`,
                                            }}
                                        >
                                            {meta.label}
                                        </span>
                                    </td>
                                    <td style={{ ...TD, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                                            <ActionBtn title="Movimentação" color="#059669" onClick={() => onMovement({ item, quantidadeExibida })}>
                                                ⇅
                                            </ActionBtn>
                                            <ActionBtn title="Histórico" color="#B89B00" onClick={() => onHistory({ item, quantidadeExibida })}>
                                                ⟲
                                            </ActionBtn>
                                            {!readOnly && (
                                                <>
                                                    <ActionBtn title="Editar" color="#2563EB" onClick={canEdit && onEdit ? () => onEdit({ item, quantidadeExibida }) : undefined} disabled={!canEdit}>
                                                        ✎
                                                    </ActionBtn>
                                                    <ActionBtn title="Desativar item" color="#DC2626" onClick={() => onDelete({ item, quantidadeExibida })} disabled={!canDelete}>
                                                        🗑
                                                    </ActionBtn>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                {expandedId === item.id && (
                                    <tr className="adm-scale-in" style={{ animationDuration: '0.4s' }}>
                                        <td colSpan={7} style={{ padding: '0 14px 14px', background: '#FFFDF5', borderBottom: '1px solid #E5E7EB' }}>
                                            {loadingFin[item.id] ? (
                                                <div style={{ textAlign: 'center', padding: '2rem' }}>
                                                    <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 0.5rem' }} />
                                                    <div style={{ color: '#64748B', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                                        Sincronizando dados...
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ 
                                                    display: 'grid', 
                                                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                                                    gap: '0.75rem', 
                                                    padding: '1rem', 
                                                    background: 'rgba(255,255,255,0.6)', 
                                                    borderRadius: 16, 
                                                    border: '1px solid #E2E8F0',
                                                    backdropFilter: 'blur(8px)'
                                                }}>
                                                    <AnimatedKpiCard
                                                        label="Valor Total Gasto"
                                                        value={Number(financialsData[item.id]?.valorTotalGasto || 0)}
                                                        displayValue={`R$ ${Number(financialsData[item.id]?.valorTotalGasto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                                        color="#059669"
                                                        bg="#ECFDF5"
                                                        border="#D1FAE5"
                                                        icon={<span>💰</span>}
                                                        compact
                                                        delayMs={0}
                                                    />
                                                    <AnimatedKpiCard
                                                        label="Valor Pendente"
                                                        value={Number(financialsData[item.id]?.valorPendente || 0)}
                                                        displayValue={`R$ ${Number(financialsData[item.id]?.valorPendente || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                                        color="#EA580C"
                                                        bg="#FFF7ED"
                                                        border="#FFEDD5"
                                                        icon={<span>⏳</span>}
                                                        compact
                                                        delayMs={50}
                                                    />
                                                    <AnimatedKpiCard
                                                        label="Material Comprado"
                                                        value={Number(financialsData[item.id]?.quantidadeComprada || 0)}
                                                        suffix={` ${item.unidade}`}
                                                        color="#0891B2"
                                                        bg="#F0F9FF"
                                                        border="#BAE6FD"
                                                        icon={<span>📦</span>}
                                                        compact
                                                        delayMs={100}
                                                    />
                                                    {/* Valor monetário do que está atualmente no estoque CENTRAL
                                                        (não inclui carretas — pra não duplicar contagem com o saldo já distribuído). */}
                                                    <AnimatedKpiCard
                                                        label="Valor Atual em Estoque"
                                                        value={Number(item.quantidadeAtual) * Number(item.precoUnitario ?? 0)}
                                                        displayValue={`R$ ${(Number(item.quantidadeAtual) * Number(item.precoUnitario ?? 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                                        color="#7C3AED"
                                                        bg="#F5F3FF"
                                                        border="#DDD6FE"
                                                        icon={<span>📊</span>}
                                                        compact
                                                        delayMs={150}
                                                    />
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
