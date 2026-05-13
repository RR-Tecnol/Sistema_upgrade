'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    stockApi,
    StockItem,
    AcaoStockReservation,
    ReservationPrioridade,
    ReservationsByAcaoResponse,
    RESERVATION_STATUS_LABEL,
    RESERVATION_STATUS_COLOR,
    resolveCategoria,
} from '@/lib/api/stock';

interface Props {
    acaoId: string;
    /** Chamado após cada save com a resposta atualizada — pai pode usar p/ refresh. */
    onChange?: (data: ReservationsByAcaoResponse) => void;
    /** Se true, oculta o título da seção (use quando o pai já tem header) */
    hideHeader?: boolean;
}

type DraftItem = {
    key: string;
    stockItemId: string;
    nome: string;
    unidade: string;
    quantidadePrevista: number;
    prioridade: ReservationPrioridade;
    observacao?: string;
    truckId?: string;
    // dados read-only para alertas
    saldoAtual: number;
    quantidadeConsumida: number;
    cobertura?: string;
    valorEstimado?: number;
    isNew?: boolean;
};

/**
 * Editor inline do "kit de insumos previstos" de uma Ação.
 * - Lista reservas atuais com saldo e status (atendida/parcial/insuficiente)
 * - Permite adicionar/remover/ajustar quantidades
 * - Bloqueia remoção quando há consumo já registrado
 * - Salva tudo de uma vez via bulk upsert no backend
 */
export function KitInsumosEditor({ acaoId, onChange, hideHeader }: Props) {
    const [reservations, setReservations] = useState<AcaoStockReservation[]>([]);
    const [drafts, setDrafts] = useState<DraftItem[]>([]);
    const [allItems, setAllItems] = useState<StockItem[]>([]);
    const [valorTotal, setValorTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerQuery, setPickerQuery] = useState('');
    const [err, setErr] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [data, items] = await Promise.all([
                stockApi.reservations.listByAcao(acaoId),
                stockApi.items.getAll(),
            ]);
            setReservations(data.reservations);
            setValorTotal(data.valorEstimadoTotal);
            setDrafts(
                data.reservations.map((r) => ({
                    key: r.id,
                    stockItemId: r.stockItemId,
                    nome: r.stockItem?.nome ?? '—',
                    unidade: r.stockItem?.unidade ?? '',
                    quantidadePrevista: r.quantidadePrevista,
                    prioridade: r.prioridade,
                    observacao: r.observacao ?? '',
                    truckId: r.truckId ?? undefined,
                    saldoAtual: r.stockItem ? Number(r.stockItem.quantidadeAtual) : 0,
                    quantidadeConsumida: r.quantidadeConsumida,
                    cobertura: r.cobertura,
                    valorEstimado: r.valorEstimado,
                    isNew: false,
                })),
            );
            setAllItems(items);
        } catch (e: any) {
            console.error('[KitInsumosEditor]', e);
            setErr('Erro ao carregar kit de insumos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [acaoId]);

    const dirty = useMemo(() => {
        if (drafts.length !== reservations.length) return true;
        return drafts.some((d) => {
            if (d.isNew) return true;
            const orig = reservations.find((r) => r.id === d.key);
            if (!orig) return true;
            return (
                Number(d.quantidadePrevista) !== Number(orig.quantidadePrevista) ||
                d.prioridade !== orig.prioridade ||
                (d.observacao ?? '') !== (orig.observacao ?? '') ||
                (d.truckId ?? '') !== (orig.truckId ?? '')
            );
        });
    }, [drafts, reservations]);

    const draftIds = new Set(drafts.map((d) => d.stockItemId));
    const pickableItems = allItems
        .filter((it) => !draftIds.has(it.id) && it.active)
        .filter((it) => {
            if (!pickerQuery.trim()) return true;
            const q = pickerQuery.toLowerCase();
            return (
                it.nome.toLowerCase().includes(q) ||
                (it.codigoInterno ?? '').toLowerCase().includes(q)
            );
        });

    const addItem = (it: StockItem) => {
        setDrafts((prev) => [
            ...prev,
            {
                key: `new-${Date.now()}-${it.id}`,
                stockItemId: it.id,
                nome: it.nome,
                unidade: it.unidade,
                quantidadePrevista: 1,
                prioridade: 'NORMAL',
                observacao: '',
                saldoAtual: Number(it.quantidadeAtual),
                quantidadeConsumida: 0,
                isNew: true,
            },
        ]);
        setPickerOpen(false);
        setPickerQuery('');
    };

    const removeItem = (key: string) => {
        const d = drafts.find((x) => x.key === key);
        if (d && !d.isNew && d.quantidadeConsumida > 0) {
            setErr('Não é possível remover: já há consumo registrado para este item nesta ação.');
            return;
        }
        setDrafts((prev) => prev.filter((x) => x.key !== key));
        setErr(null);
    };

    const setField = <K extends keyof DraftItem>(key: string, field: K, value: DraftItem[K]) => {
        setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, [field]: value } : d)));
    };

    const handleSave = async () => {
        setErr(null);
        setSuccess(null);
        if (drafts.some((d) => !(d.quantidadePrevista > 0))) {
            setErr('Todos os itens devem ter quantidade prevista > 0');
            return;
        }
        setSaving(true);
        try {
            const data = await stockApi.reservations.upsertForAcao(
                acaoId,
                drafts.map((d) => ({
                    stockItemId: d.stockItemId,
                    quantidadePrevista: Number(d.quantidadePrevista),
                    truckId: d.truckId,
                    prioridade: d.prioridade,
                    observacao: d.observacao || undefined,
                })),
            );
            setReservations(data.reservations);
            setValorTotal(data.valorEstimadoTotal);
            setDrafts(
                data.reservations.map((r) => ({
                    key: r.id,
                    stockItemId: r.stockItemId,
                    nome: r.stockItem?.nome ?? '—',
                    unidade: r.stockItem?.unidade ?? '',
                    quantidadePrevista: r.quantidadePrevista,
                    prioridade: r.prioridade,
                    observacao: r.observacao ?? '',
                    truckId: r.truckId ?? undefined,
                    saldoAtual: r.stockItem ? Number(r.stockItem.quantidadeAtual) : 0,
                    quantidadeConsumida: r.quantidadeConsumida,
                    cobertura: r.cobertura,
                    valorEstimado: r.valorEstimado,
                    isNew: false,
                })),
            );
            setSuccess(`Kit salvo: ${data.total} ${data.total === 1 ? 'item' : 'itens'} planejado(s).`);
            onChange?.(data);
        } catch (e: any) {
            const msg = e?.response?.data?.message ?? 'Erro ao salvar kit de insumos';
            setErr(Array.isArray(msg) ? msg.join('; ') : msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <section style={{
            padding: '1.25rem', borderRadius: 18,
            background: '#fff', border: '1px solid #F3F4F6',
            boxShadow: '0 1px 4px rgba(0,0,0,.06)',
        }}>
            {!hideHeader && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                        <h3 style={{
                            fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: '0.95rem',
                            letterSpacing: '0.06em', color: '#111827', margin: 0,
                            display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                            <span style={{ fontSize: '1.1rem' }}>🎒</span> Kit de Insumos Previstos
                        </h3>
                        <p style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 4 }}>
                            Quantidades que esta ação espera consumir. Consumo real (movimentação SAÍDA) atualiza automaticamente.
                        </p>
                    </div>
                    <div style={{
                        padding: '5px 12px', borderRadius: 999,
                        background: '#ECFDF5', color: '#065F46',
                        fontSize: '0.7rem', fontWeight: 800,
                    }}>
                        {drafts.length} {drafts.length === 1 ? 'item' : 'itens'} · R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
            )}

            {err && (
                <div style={{
                    marginBottom: 10, padding: '0.65rem 0.9rem', borderRadius: 10,
                    background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '0.8rem',
                }}>{err}</div>
            )}
            {success && (
                <div style={{
                    marginBottom: 10, padding: '0.65rem 0.9rem', borderRadius: 10,
                    background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '0.8rem',
                }}>{success}</div>
            )}

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
                    Carregando kit…
                </div>
            ) : drafts.length === 0 ? (
                <div style={{
                    padding: '2rem', textAlign: 'center', color: '#9CA3AF',
                    background: '#FAFAFA', borderRadius: 12, border: '1px dashed #E5E7EB',
                    fontSize: '0.85rem', marginBottom: 12,
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>📋</div>
                    <div style={{ fontWeight: 700, color: '#6B7280', marginBottom: 4 }}>Kit vazio</div>
                    <div style={{ fontSize: '0.72rem' }}>
                        Adicione os insumos que esta ação espera consumir para gerar alertas e planejamento.
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {drafts.map((d) => {
                        const item = allItems.find((x) => x.id === d.stockItemId);
                        const cat = item ? resolveCategoria(item) : null;
                        const cobertura = d.cobertura as keyof typeof RESERVATION_STATUS_LABEL | undefined;
                        const restante = Math.max(0, d.quantidadePrevista - d.quantidadeConsumida);
                        return (
                            <div key={d.key} style={{
                                display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: 10,
                                padding: '0.7rem 0.85rem', borderRadius: 10,
                                background: d.isNew ? '#FFFBEB' : '#FAFAFA',
                                border: `1px solid ${d.isNew ? '#FDE68A' : '#E5E7EB'}`,
                                alignItems: 'center', position: 'relative',
                            }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {cat && <span>{cat.icon}</span>} {d.nome}
                                        {d.isNew && (
                                            <span style={{
                                                fontSize: '0.55rem', fontWeight: 800,
                                                background: '#FBBF24', color: '#78350F',
                                                padding: '1px 6px', borderRadius: 5,
                                            }}>NOVO</span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: 2, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        <span>Saldo central: <strong style={{ color: '#374151' }}>{d.saldoAtual.toLocaleString('pt-BR')} {d.unidade}</strong></span>
                                        {d.quantidadeConsumida > 0 && (
                                            <span>· Já consumido: <strong style={{ color: '#10B981' }}>{d.quantidadeConsumida.toLocaleString('pt-BR')} {d.unidade}</strong></span>
                                        )}
                                        {restante > 0 && (
                                            <span>· Restante: <strong style={{ color: '#0891B2' }}>{restante.toLocaleString('pt-BR')} {d.unidade}</strong></span>
                                        )}
                                        {cobertura && (
                                            <span style={{
                                                padding: '1px 6px', borderRadius: 5, fontWeight: 800,
                                                background: `${RESERVATION_STATUS_COLOR[cobertura]}15`,
                                                color: RESERVATION_STATUS_COLOR[cobertura],
                                                border: `1px solid ${RESERVATION_STATUS_COLOR[cobertura]}40`,
                                            }}>
                                                {RESERVATION_STATUS_LABEL[cobertura]}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label style={MINI_LABEL}>Prev.</label>
                                    <input
                                        type="number" min={0.001} step={0.001}
                                        value={d.quantidadePrevista}
                                        onChange={(e) => setField(d.key, 'quantidadePrevista', Number(e.target.value))}
                                        style={{ ...MINI_INPUT, width: 80, textAlign: 'right' }}
                                    />
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#6B7280', fontWeight: 700, minWidth: 30 }}>
                                    {d.unidade}
                                </div>

                                <div>
                                    <label style={MINI_LABEL}>Prio.</label>
                                    <select
                                        value={d.prioridade}
                                        onChange={(e) => setField(d.key, 'prioridade', e.target.value as ReservationPrioridade)}
                                        style={{ ...MINI_INPUT, width: 90, cursor: 'pointer' }}>
                                        <option value="BAIXA">Baixa</option>
                                        <option value="NORMAL">Normal</option>
                                        <option value="CRITICA">Crítica</option>
                                    </select>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => removeItem(d.key)}
                                    disabled={!d.isNew && d.quantidadeConsumida > 0}
                                    title={!d.isNew && d.quantidadeConsumida > 0 ? 'Item com consumo já registrado não pode ser removido' : 'Remover'}
                                    style={{
                                        padding: '6px 10px', borderRadius: 8, cursor: !d.isNew && d.quantidadeConsumida > 0 ? 'not-allowed' : 'pointer',
                                        background: !d.isNew && d.quantidadeConsumida > 0 ? '#F3F4F6' : '#FEF2F2',
                                        color: !d.isNew && d.quantidadeConsumida > 0 ? '#9CA3AF' : '#DC2626',
                                        border: !d.isNew && d.quantidadeConsumida > 0 ? '1px solid #E5E7EB' : '1px solid #FECACA',
                                        fontWeight: 800, fontSize: '0.95rem',
                                    }}>🗑</button>
                            </div>
                        );
                    })}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <button
                    type="button"
                    onClick={() => setPickerOpen((v) => !v)}
                    style={{
                        padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                        background: '#FFFDE7', color: '#92400E',
                        border: '1.5px dashed #FCD34D',
                        fontSize: '0.8rem', fontWeight: 800,
                    }}>
                    + Adicionar item ao kit
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={!dirty || saving}
                    style={{
                        padding: '8px 18px', borderRadius: 10,
                        background: !dirty || saving ? '#E5E7EB' : 'linear-gradient(135deg, #10B981, #059669)',
                        color: !dirty || saving ? '#9CA3AF' : '#fff',
                        cursor: !dirty || saving ? 'not-allowed' : 'pointer',
                        border: 'none',
                        fontSize: '0.8rem', fontWeight: 800,
                        boxShadow: !dirty || saving ? 'none' : '0 4px 12px rgba(16,185,129,0.3)',
                    }}>
                    {saving ? 'Salvando…' : (dirty ? '💾 Salvar Kit' : '✓ Salvo')}
                </button>
            </div>

            {pickerOpen && (
                <div style={{
                    marginTop: 12, padding: '0.85rem',
                    border: '1.5px solid #FCD34D', borderRadius: 12, background: '#FFFBEB',
                }}>
                    <input
                        autoFocus
                        value={pickerQuery}
                        onChange={(e) => setPickerQuery(e.target.value)}
                        placeholder="🔍 Buscar item por nome ou código…"
                        style={{
                            width: '100%', padding: '8px 12px', borderRadius: 8,
                            border: '1.5px solid #E5E7EB', background: '#fff',
                            fontSize: '0.85rem', boxSizing: 'border-box', marginBottom: 8,
                        }}
                    />
                    <div style={{ maxHeight: 240, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {pickableItems.length === 0 ? (
                            <div style={{ padding: '1rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.78rem' }}>
                                {pickerQuery ? 'Nenhum item encontrado' : 'Todos os itens ativos já estão no kit'}
                            </div>
                        ) : (
                            pickableItems.slice(0, 30).map((it) => {
                                const cat = resolveCategoria(it);
                                return (
                                    <button
                                        key={it.id}
                                        type="button"
                                        onClick={() => addItem(it)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '7px 10px', borderRadius: 8,
                                            background: '#fff', border: '1px solid #E5E7EB',
                                            cursor: 'pointer', textAlign: 'left',
                                            fontSize: '0.78rem',
                                        }}>
                                        <span style={{ fontSize: '1.05rem' }}>{cat.icon}</span>
                                        <span style={{ flex: 1, color: '#111827', fontWeight: 700 }}>
                                            {it.nome}
                                            {it.codigoInterno && (
                                                <span style={{ marginLeft: 6, color: '#9CA3AF', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem' }}>
                                                    {it.codigoInterno}
                                                </span>
                                            )}
                                        </span>
                                        <span style={{ color: '#6B7280', fontSize: '0.7rem' }}>
                                            saldo {Number(it.quantidadeAtual).toLocaleString('pt-BR')} {it.unidade}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}

const MINI_LABEL: React.CSSProperties = {
    display: 'block', fontSize: '0.55rem', fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    color: '#9CA3AF', marginBottom: 2,
};
const MINI_INPUT: React.CSSProperties = {
    padding: '4px 8px', borderRadius: 8,
    border: '1px solid #E5E7EB', background: '#fff',
    fontSize: '0.78rem', color: '#111827', outline: 'none',
};
