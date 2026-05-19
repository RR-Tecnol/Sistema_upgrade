'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { stockApi, TruckStockItem, StockMovement } from '@/lib/api/stock';

interface Props {
    truckId: string;
    truckIdentifier?: string;
}

/**
 * Seção exibida na página da carreta: lista os itens em estoque na carreta,
 * com saldo, valor estimado e — quando disponível — a última ação para a qual
 * houve consumo deste item nesta carreta (vínculo histórico).
 */
export function TruckStockSection({ truckId, truckIdentifier }: Props) {
    const [stocks, setStocks] = useState<TruckStockItem[]>([]);
    const [lastSaidaByItem, setLastSaidaByItem] = useState<Map<string, StockMovement>>(new Map());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const [stocksRes, movs] = await Promise.all([
                    stockApi.trucks.getStock(truckId),
                    stockApi.movements.list({ truckId, type: 'SAIDA', limit: 100 }).catch(() => [] as StockMovement[]),
                ]);
                if (cancelled) return;
                setStocks(stocksRes.stocks);

                // Mapa: stockItemId → última SAIDA dessa carreta para esse item
                const map = new Map<string, StockMovement>();
                for (const m of movs) {
                    if (m.fromTruckId !== truckId) continue;
                    if (!map.has(m.stockItemId)) {
                        map.set(m.stockItemId, m);
                    }
                }
                setLastSaidaByItem(map);
            } catch (e) {
                console.error('[TruckStockSection] erro', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [truckId]);

    const totalDistintos = stocks.filter(s => Number(s.quantidadeAtual) > 0).length;
    const valorTotal = stocks.reduce((sum, s) => {
        const qtd = Number(s.quantidadeAtual);
        const preco = s.stockItem?.precoUnitario != null ? Number(s.stockItem.precoUnitario) : 0;
        return sum + qtd * preco;
    }, 0);

    return (
        <section style={{
            marginTop: '1rem',
            padding: '1.25rem',
            borderRadius: 18,
            background: '#fff',
            border: '1px solid #F3F4F6',
            boxShadow: '0 1px 4px rgba(0,0,0,.06)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                <div>
                    <h3 style={{
                        fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: '0.92rem',
                        letterSpacing: '0.06em', color: '#111827', margin: 0,
                        display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <span style={{ fontSize: '1.1rem' }}>📦</span> Itens em estoque nesta carreta
                    </h3>
                    <p style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 4 }}>
                        Saldo atual, valor estimado e última ação consumidora (histórico de SAIDA por item).
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{
                        padding: '5px 12px', borderRadius: 999,
                        background: '#F5F3FF', color: '#5B21B6',
                        fontSize: '0.7rem', fontWeight: 800,
                    }}>
                        {totalDistintos} {totalDistintos === 1 ? 'item' : 'itens'} · R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.8rem' }}>Carregando…</div>
            ) : stocks.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
                    <div style={{ fontWeight: 700, color: '#6B7280', marginBottom: 4 }}>
                        Nenhum item nesta carreta
                    </div>
                    <div style={{ fontSize: '0.72rem' }}>
                        Use uma movimentação de <strong>entrada</strong> (central → carreta) para abastecer {truckIdentifier ?? 'esta carreta'}.
                    </div>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '0.85rem',
                }}>
                    {stocks.map(s => {
                        const qtd = Number(s.quantidadeAtual);
                        const preco = s.stockItem?.precoUnitario != null ? Number(s.stockItem.precoUnitario) : 0;
                        const valor = qtd * preco;
                        const qmin = s.quantidadeMinima != null && Number(s.quantidadeMinima) > 0
                            ? Number(s.quantidadeMinima)
                            : s.stockItem?.quantidadeMinima != null
                                ? Number(s.stockItem.quantidadeMinima)
                                : 0;
                        const vazio = qtd <= 0;
                        const baixo = !vazio && qmin > 0 && qtd <= qmin;

                        const lastSaida = lastSaidaByItem.get(s.stockItemId);
                        const acaoNome = (lastSaida as any)?.acao?.nome ?? null;
                        const acaoId = (lastSaida as any)?.acao?.id ?? lastSaida?.acaoId ?? null;

                        return (
                            <Link key={s.id} href={`/admin/estoque/itens/${s.stockItemId}`} style={{
                                textDecoration: 'none', display: 'block',
                                padding: '0.85rem',
                                borderRadius: 12,
                                background: vazio ? '#F9FAFB' : '#fff',
                                border: `1.5px solid ${baixo ? '#FECACA' : (vazio ? '#E5E7EB' : '#E5E7EB')}`,
                                transition: 'all .2s',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                    <div style={{
                                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                                        background: '#F5F3FF', border: '1.5px solid #DDD6FE',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.05rem', overflow: 'hidden',
                                    }}>
                                        {s.stockItem?.fotoUrl
                                            ? <img src={s.stockItem.fotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : '📦'}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontWeight: 800, fontSize: '0.82rem', color: '#111827',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>{s.stockItem?.nome ?? 'Item'}</div>
                                        <div style={{ fontSize: '0.62rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono, monospace' }}>
                                            {(s.stockItem as any)?.codigoInterno ?? '—'}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.72rem' }}>
                                    <span style={{ color: '#6B7280', fontWeight: 600 }}>Saldo</span>
                                    <span style={{
                                        color: vazio ? '#9CA3AF' : (baixo ? '#DC2626' : '#7C3AED'),
                                        fontWeight: 800, fontFamily: 'Orbitron, sans-serif',
                                    }}>
                                        {qtd.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {s.stockItem?.unidade ?? ''}
                                        {baixo && <span style={{ marginLeft: 4 }}>⚠</span>}
                                    </span>
                                </div>
                                {preco > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                                        <span style={{ color: '#6B7280', fontWeight: 600 }}>Valor</span>
                                        <span style={{ color: '#111827', fontWeight: 800 }}>
                                            R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}

                                {/* Última ação consumidora — vínculo histórico item↔ação nesta carreta */}
                                {acaoNome && (
                                    <div
                                        title="Última ação a consumir este item desta carreta (SAIDA)"
                                        style={{
                                            marginTop: 8, paddingTop: 8,
                                            borderTop: '1px dashed #E5E7EB',
                                            fontSize: '0.65rem',
                                        }}>
                                        <span style={{ color: '#6B7280', fontWeight: 600 }}>↳ Últ. consumo: </span>
                                        {acaoId ? (
                                            <Link href={`/admin/acoes/${acaoId}`}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ color: '#10B981', fontWeight: 800, textDecoration: 'none' }}>
                                                🎯 {acaoNome}
                                            </Link>
                                        ) : (
                                            <span style={{ color: '#10B981', fontWeight: 800 }}>🎯 {acaoNome}</span>
                                        )}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
