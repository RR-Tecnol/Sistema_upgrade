'use client';

import { useEffect, useState } from 'react';
import { XMarkIcon, PencilIcon, CheckIcon } from '@heroicons/react/24/outline';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';
import { stockApi, TruckStockItem, resolveCategoria } from '@/lib/api/stock';
import { toast } from '@/components/ui/Toast';

interface EstoqueCaminhaoModalProps {
    open: boolean;
    onClose: () => void;
    truckId?: string;
    truckName?: string;
    userRole?: string;
}

function getStatusColor(atual: number, minimo: number): string | null {
    if (minimo <= 0) return null;
    if (atual <= 0) return '#EF4444';          // vermelho: zerado
    if (atual < minimo) return '#F59E0B';      // amarelo: abaixo do mínimo
    return '#10B981';                          // verde: ok
}

function StatusDot({ atual, minimo }: { atual: number; minimo: number }) {
    const color = getStatusColor(atual, minimo);
    if (!color) return <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>—</span>;
    const label = atual <= 0 ? 'Zerado' : atual < minimo ? 'Abaixo do mínimo' : 'OK';
    return (
        <span title={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: color,
                display: 'inline-block',
                boxShadow: `0 0 0 2px ${color}30`,
                flexShrink: 0,
            }} />
            <span style={{ color, fontSize: '0.7rem', fontWeight: 700 }}>{label}</span>
        </span>
    );
}

export function EstoqueCaminhaoModal({ open, onClose, truckId, truckName, userRole }: EstoqueCaminhaoModalProps) {
    const [loading, setLoading] = useState(false);
    const [stocks, setStocks] = useState<TruckStockItem[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [savingId, setSavingId] = useState<string | null>(null);

    const canEdit = ['ADMIN', 'IT_ADMIN', 'COORDINATOR'].includes(userRole ?? '');

    useEffect(() => {
        if (open && truckId) {
            loadStock();
        } else {
            setStocks([]);
            setEditingId(null);
        }
    }, [open, truckId]);

    const loadStock = async () => {
        setLoading(true);
        try {
            const data = await stockApi.trucks.getStock(truckId!);
            setStocks(data.stocks || []);
        } catch (error) {
            console.error('Erro ao carregar estoque do caminhão:', error);
            toast.error('Erro ao carregar estoque do caminhão');
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (item: TruckStockItem) => {
        setEditingId(item.id);
        setEditValue(String(Number(item.quantidadeMinima) || 0));
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValue('');
    };

    const saveMinimo = async (item: TruckStockItem) => {
        const val = parseFloat(editValue);
        if (isNaN(val) || val < 0) {
            toast.error('Valor inválido — informe um número >= 0');
            return;
        }
        setSavingId(item.id);
        try {
            const updated = await stockApi.trucks.updateMinimo(truckId!, item.stockItemId, val);
            setStocks(prev => prev.map(s =>
                s.id === item.id ? { ...s, quantidadeMinima: updated.quantidadeMinima ?? val } : s
            ));
            setEditingId(null);
            toast.success('Mínimo atualizado');
        } catch (e) {
            toast.error('Erro ao atualizar mínimo');
        } finally {
            setSavingId(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, item: TruckStockItem) => {
        if (e.key === 'Enter') saveMinimo(item);
        if (e.key === 'Escape') cancelEdit();
    };

    if (!open) return null;

    return (
        <ModalPortal>
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(15, 23, 42, 0.4)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20,
                    zIndex: MODAL_PORTAL_Z_INDEX,
                    animation: 'fadeIn 0.2s ease-out',
                }}
            >
                <div
                    style={{
                        background: '#FFFFFF',
                        borderRadius: 16,
                        width: '100%',
                        maxWidth: 900,
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(184, 155, 0, 0.25)',
                        overflow: 'hidden',
                        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            background: 'linear-gradient(135deg, #FFD600 0%, #B89B00 100%)',
                            padding: '24px 32px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            color: '#FFFFFF',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ fontSize: '2rem' }}>🚛</div>
                            <div>
                                <h2 style={{
                                    margin: 0,
                                    fontFamily: 'Orbitron, sans-serif',
                                    fontSize: '1.25rem',
                                    fontWeight: 800,
                                    letterSpacing: '0.05em',
                                    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}>
                                    Estoque do Caminhão
                                </h2>
                                {truckName && (
                                    <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: '0.875rem', fontWeight: 600 }}>
                                        {truckName}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 8,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
                        >
                            <XMarkIcon width={20} height={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ padding: 32, overflowY: 'auto' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>
                                <div className="spinner" style={{ margin: '0 auto 16px', borderTopColor: '#B89B00' }} />
                                <p style={{ fontWeight: 600 }}>Carregando estoque...</p>
                            </div>
                        ) : stocks.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <div style={{ fontSize: '3rem', opacity: 0.5, marginBottom: 16 }}>📦</div>
                                <p style={{ color: '#64748B', fontWeight: 600, fontSize: '1rem' }}>
                                    Nenhum insumo no estoque deste caminhão.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Legenda de status */}
                                <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                                    {[
                                        { color: '#10B981', label: 'OK (acima do mínimo)' },
                                        { color: '#F59E0B', label: 'Abaixo do mínimo' },
                                        { color: '#EF4444', label: 'Zerado' },
                                    ].map(s => (
                                        <span key={s.color} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: s.color, display: 'inline-block' }} />
                                            {s.label}
                                        </span>
                                    ))}
                                    {canEdit && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>
                                            <PencilIcon width={12} height={12} />
                                            Clique no lápis para definir mínimo
                                        </span>
                                    )}
                                </div>

                                <div style={{
                                    border: '1px solid #E2E8F0',
                                    borderRadius: 12,
                                    overflow: 'hidden',
                                }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                                            <tr>
                                                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: 700, fontSize: '0.8rem' }}>Insumo</th>
                                                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: 700, fontSize: '0.8rem' }}>Categoria</th>
                                                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: 700, fontSize: '0.8rem', textAlign: 'right' }}>Quantidade</th>
                                                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: 700, fontSize: '0.8rem' }}>Un.</th>
                                                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: 700, fontSize: '0.8rem', textAlign: 'right' }}>Valor (R$)</th>
                                                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: 700, fontSize: '0.8rem', textAlign: 'center' }}>Mín. Carreta</th>
                                                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: 700, fontSize: '0.8rem' }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stocks.map((item, index) => {
                                                const insumo = item.stockItem;
                                                if (!insumo) return null;
                                                const cat = resolveCategoria(insumo);
                                                const catColor = cat.color;
                                                const atual = Number(item.quantidadeAtual);
                                                const minimo = Number(item.quantidadeMinima ?? 0);
                                                const rowBg = atual <= 0
                                                    ? 'rgba(239,68,68,0.04)'
                                                    : atual < minimo && minimo > 0
                                                        ? 'rgba(245,158,11,0.05)'
                                                        : 'transparent';
                                                const isEditing = editingId === item.id;

                                                return (
                                                    <tr
                                                        key={item.id}
                                                        style={{
                                                            borderBottom: index === stocks.length - 1 ? 'none' : '1px solid #F1F5F9',
                                                            backgroundColor: rowBg,
                                                            transition: 'background-color 0.15s',
                                                        }}
                                                    >
                                                        <td style={{ padding: '14px 16px', color: '#0F172A', fontWeight: 600, fontSize: '0.9rem' }}>
                                                            {insumo.nome}
                                                        </td>
                                                        <td style={{ padding: '14px 16px' }}>
                                                            <span style={{
                                                                padding: '4px 8px',
                                                                borderRadius: 6,
                                                                fontSize: '0.7rem',
                                                                fontWeight: 700,
                                                                backgroundColor: `${catColor}20`,
                                                                color: catColor,
                                                                border: `1px solid ${catColor}40`,
                                                                whiteSpace: 'nowrap',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 4,
                                                            }}>
                                                                <span aria-hidden>{cat.icon}</span>
                                                                {cat.label}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: atual <= 0 ? '#EF4444' : '#0F172A', fontWeight: 800, fontSize: '1.1rem' }}>
                                                            {atual}
                                                        </td>
                                                        <td style={{ padding: '14px 16px', color: '#64748B', fontWeight: 600, fontSize: '0.85rem' }}>
                                                            {insumo.unidade}
                                                        </td>
                                                        <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'Orbitron, sans-serif', fontSize: '0.85rem' }}>
                                                            {(() => {
                                                                const preco = Number(insumo.precoUnitario ?? 0);
                                                                if (!preco || preco <= 0) return <span style={{ color: '#CBD5E1' }}>—</span>;
                                                                const valor = atual * preco;
                                                                return <span style={{ fontWeight: 700, color: atual <= 0 ? '#94A3B8' : '#059669' }}>R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
                                                            })()}
                                                        </td>
                                                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                            {isEditing ? (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="1"
                                                                        value={editValue}
                                                                        onChange={(e) => setEditValue(e.target.value)}
                                                                        onKeyDown={(e) => handleKeyDown(e, item)}
                                                                        autoFocus
                                                                        style={{
                                                                            width: 64,
                                                                            padding: '4px 8px',
                                                                            border: '2px solid #FFD600',
                                                                            borderRadius: 6,
                                                                            fontSize: '0.85rem',
                                                                            fontWeight: 700,
                                                                            textAlign: 'center',
                                                                            outline: 'none',
                                                                            color: '#0F172A',
                                                                        }}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => saveMinimo(item)}
                                                                        disabled={savingId === item.id}
                                                                        title="Salvar"
                                                                        style={{
                                                                            background: '#10B981',
                                                                            border: 'none',
                                                                            borderRadius: 6,
                                                                            padding: '4px 6px',
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            color: 'white',
                                                                            opacity: savingId === item.id ? 0.6 : 1,
                                                                        }}
                                                                    >
                                                                        <CheckIcon width={14} height={14} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={cancelEdit}
                                                                        title="Cancelar"
                                                                        style={{
                                                                            background: '#E2E8F0',
                                                                            border: 'none',
                                                                            borderRadius: 6,
                                                                            padding: '4px 6px',
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            color: '#64748B',
                                                                        }}
                                                                    >
                                                                        <XMarkIcon width={14} height={14} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                                                                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: minimo > 0 ? '#334155' : '#CBD5E1', minWidth: 24, textAlign: 'right' }}>
                                                                        {minimo > 0 ? minimo : '—'}
                                                                    </span>
                                                                    {canEdit && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => startEdit(item)}
                                                                            title="Editar mínimo"
                                                                            style={{
                                                                                background: 'transparent',
                                                                                border: '1px solid #E2E8F0',
                                                                                borderRadius: 6,
                                                                                padding: '3px 5px',
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                color: '#94A3B8',
                                                                                transition: 'all 0.15s',
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                                e.currentTarget.style.borderColor = '#FFD600';
                                                                                e.currentTarget.style.color = '#B89B00';
                                                                                e.currentTarget.style.background = '#FFFBEB';
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                e.currentTarget.style.borderColor = '#E2E8F0';
                                                                                e.currentTarget.style.color = '#94A3B8';
                                                                                e.currentTarget.style.background = 'transparent';
                                                                            }}
                                                                        >
                                                                            <PencilIcon width={12} height={12} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '14px 16px' }}>
                                                            <StatusDot atual={atual} minimo={minimo} />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer — Valor total da carreta + ação fechar */}
                    <div
                        style={{
                            padding: '16px 32px',
                            background: '#F8FAFC',
                            borderTop: '1px solid #E2E8F0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 16,
                            flexWrap: 'wrap',
                        }}
                    >
                        {(() => {
                            const totalCarreta = stocks.reduce((acc, s) => {
                                const preco = Number(s.stockItem?.precoUnitario ?? 0);
                                return acc + (Number(s.quantidadeAtual) * preco);
                            }, 0);
                            if (totalCarreta <= 0) return <span />;
                            return (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '8px 14px', borderRadius: 10,
                                    background: '#ECFDF5', border: '1px solid #A7F3D0',
                                }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        💰 Valor total na carreta
                                    </span>
                                    <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#065F46' }}>
                                        R$ {totalCarreta.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            );
                        })()}
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 24px',
                                background: 'white',
                                border: '1.5px solid #E2E8F0',
                                borderRadius: 10,
                                color: '#64748B',
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .spinner {
                    width: 32px;
                    height: 32px;
                    border: 3px solid rgba(184, 155, 0, 0.2);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}} />
        </ModalPortal>
    );
}
