'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SolicitacoesEstoquePanel } from './SolicitacoesEstoquePanel';
import { ListaInsumosGsr, ListaInsumosRow } from './ListaInsumosGsr';
import { MovimentacoesRecentesPanel } from './MovimentacoesRecentesPanel';
import { MovimentacaoModal } from '@/components/estoque/MovimentacaoModal';
import { StockItemAuditModal } from './StockItemAuditModal';
import { stockApi, StockItem, TruckStockItem } from '@/lib/api/stock';
import { toast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';

type TruckTab = 'solicitacoes' | 'insumos' | 'movimentacoes';

const TAB_LABEL: Record<TruckTab, string> = {
    solicitacoes: 'Solicitações pendentes',
    insumos: 'Insumos na carreta',
    movimentacoes: 'Movimentações recentes',
};

interface Props {
    truckId: string;
    truckIdentifier?: string;
    userRole: string;
    /** Quando true, esconde ações de mutação (Movimentação header, editar/desativar item, aprovar/rejeitar PR). */
    readOnly?: boolean;
}

export function TruckEstoqueZone({ truckId, truckIdentifier, userRole, readOnly = false }: Props) {
    const [tab, setTab] = useState<TruckTab>('solicitacoes');
    const [rows, setRows] = useState<ListaInsumosRow[]>([]);
    const [loadingStock, setLoadingStock] = useState(false);
    const [movOpen, setMovOpen] = useState(false);
    const [movItemId, setMovItemId] = useState<string | undefined>();
    const [auditOpen, setAuditOpen] = useState(false);
    const [auditItemId, setAuditItemId] = useState<string | null>(null);
    const [auditNome, setAuditNome] = useState('');
    const [deleteItem, setDeleteItem] = useState<StockItem | null>(null);

    const loadTruckStock = async () => {
        setLoadingStock(true);
        try {
            const data = await stockApi.trucks.getStock(truckId);
            const mapped: ListaInsumosRow[] = (data.stocks || []).map((ts: TruckStockItem) => {
                const it = ts.stockItem;
                if (!it) return null;
                const merged = {
                    ...it,
                    quantidadeAtual: ts.quantidadeAtual as any,
                } as StockItem;
                return { item: merged, quantidadeExibida: Number(ts.quantidadeAtual) };
            }).filter(Boolean) as ListaInsumosRow[];
            setRows(mapped);
        } catch (e) {
            console.error(e);
            toast.error('Erro ao carregar estoque da carreta');
        } finally {
            setLoadingStock(false);
        }
    };

    const onTab = (t: TruckTab) => {
        setTab(t);
        if (t === 'insumos') loadTruckStock();
    };

    return (
        <section style={{ marginTop: '1.5rem', padding: '1.25rem', borderRadius: 16, border: '1px solid #E2E8F0', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>Estoque da carreta</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                        {truckIdentifier ? `${truckIdentifier} · ` : ''}
                        <Link href="/admin/estoque?tab=central" style={{ color: '#2563EB', fontWeight: 600 }}>
                            Abrir controlo global de estoque
                        </Link>
                    </p>
                </div>
                {!readOnly && (
                    <button
                        type="button"
                        onClick={() => {
                            setMovItemId(undefined);
                            setMovOpen(true);
                        }}
                        style={{
                            padding: '8px 14px',
                            borderRadius: 10,
                            border: '1px solid #2563EB',
                            background: '#fff',
                            color: '#1D4ED8',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                        }}
                    >
                        Movimentação
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #E5E7EB', marginBottom: 16, flexWrap: 'wrap' }}>
                {(Object.keys(TAB_LABEL) as TruckTab[]).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => onTab(t)}
                        style={{
                            padding: '10px 16px',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            color: tab === t ? '#1D4ED8' : '#64748B',
                            borderBottom: tab === t ? '3px solid #2563EB' : '3px solid transparent',
                            marginBottom: -2,
                        }}
                    >
                        {TAB_LABEL[t]}
                    </button>
                ))}
            </div>

            {tab === 'solicitacoes' && <SolicitacoesEstoquePanel readOnly={readOnly} />}

            {tab === 'insumos' && (
                <ListaInsumosGsr
                    variant="truck"
                    rows={rows}
                    loading={loadingStock}
                    userRole={userRole}
                    onMovement={({ item }) => {
                        setMovItemId(item.id);
                        setMovOpen(true);
                    }}
                    onHistory={({ item }) => {
                        setAuditItemId(item.id);
                        setAuditNome(item.nome);
                        setAuditOpen(true);
                    }}
                    onDelete={({ item }) => setDeleteItem(item)}
                    readOnly={readOnly}
                />
            )}

            {tab === 'movimentacoes' && <MovimentacoesRecentesPanel truckId={truckId} />}

            <MovimentacaoModal
                open={movOpen}
                onClose={() => {
                    setMovOpen(false);
                    setMovItemId(undefined);
                }}
                defaultItemId={movItemId}
                defaultFromTruckId={truckId}
                defaultType="SAIDA"
                onSuccess={() => {
                    if (tab === 'insumos') loadTruckStock();
                }}
            />

            <StockItemAuditModal open={auditOpen} stockItemId={auditItemId} itemNome={auditNome} onClose={() => setAuditOpen(false)} />

            <ConfirmModal
                isOpen={!!deleteItem}
                title="Desativar item?"
                message={deleteItem ? `O item "${deleteItem.nome}" será desativado (soft delete).` : ''}
                confirmLabel="Desativar"
                danger
                onCancel={() => setDeleteItem(null)}
                onConfirm={() => {
                    void (async () => {
                        if (!deleteItem) return;
                        try {
                            await stockApi.items.delete(deleteItem.id);
                            toast.success('Item desativado');
                            setDeleteItem(null);
                            loadTruckStock();
                        } catch (e: any) {
                            toast.error(e?.response?.data?.message || 'Erro ao desativar');
                        }
                    })();
                }}
            />
        </section>
    );
}
