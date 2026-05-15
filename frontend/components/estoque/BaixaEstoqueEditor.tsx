'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    stockApi,
    StockItem,
    BaixaStatusResponse,
    BaixaKitItem,
    BaixaItemPayload,
    BAIXA_STATUS_LABEL,
    BAIXA_STATUS_COLOR,
} from '@/lib/api/stock';

interface Props {
    acaoId: string;
    onChange?: (data: BaixaStatusResponse) => void;
}

type DraftLine = {
    key: string;
    stockItemId: string;
    nome: string;
    unidade: string;
    fromTruckId: string;
    quantidade: number;
    saldoCarretaSelecionada: number;
    quantidadeRestante: number;
    truckOptions: Array<{ truckId: string; identifier: string; saldo: number }>;
    /** se vem do kit: id da reserva; se item fora do kit: null */
    reservationId: string | null;
    observacao?: string;
};

/**
 * Editor de baixa de estoque para uma ação.
 * - Mostra kit previsto vs consumido + saldo nas carretas
 * - Permite baixar item por item, kit completo (lote) ou item fora do kit
 * - Histórico de baixas já realizadas (SAIDAs)
 */
export function BaixaEstoqueEditor({ acaoId, onChange }: Props) {
    const [data, setData] = useState<BaixaStatusResponse | null>(null);
    const [drafts, setDrafts] = useState<DraftLine[]>([]);
    const [allItems, setAllItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerQuery, setPickerQuery] = useState('');
    const [err, setErr] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [observacaoGlobal, setObservacaoGlobal] = useState('');

    const load = async () => {
        setLoading(true);
        setErr(null);
        try {
            const [status, items] = await Promise.all([
                stockApi.baixa.status(acaoId),
                stockApi.items.getAll(),
            ]);
            setData(status);
            setAllItems(items);
            // Reseta drafts a partir do estado atual (pré-preenche com sugestão)
            const newDrafts = status.kit
                .filter((k) => k.quantidadeRestante > 0 && k.sugestaoTruckId)
                .map((k) => buildDraftFromKit(k));
            setDrafts(newDrafts);
        } catch (e: any) {
            console.error('[BaixaEstoqueEditor]', e);
            setErr(e?.response?.data?.message ?? 'Erro ao carregar dados da baixa');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [acaoId]);

    const buildDraftFromKit = (k: BaixaKitItem): DraftLine => {
        const truckOptions = k.truckStocks.map((ts) => ({
            truckId: ts.truckId,
            identifier: ts.truck?.identifier ?? '—',
            saldo: Number(ts.quantidadeAtual),
        }));
        const fromTruckId = k.sugestaoTruckId ?? truckOptions[0]?.truckId ?? '';
        const saldoSel = truckOptions.find((t) => t.truckId === fromTruckId)?.saldo ?? 0;
        return {
            key: `kit-${k.id}`,
            stockItemId: k.stockItemId,
            nome: k.stockItem.nome,
            unidade: k.stockItem.unidade,
            fromTruckId,
            quantidade: Math.min(k.quantidadeRestante, saldoSel),
            saldoCarretaSelecionada: saldoSel,
            quantidadeRestante: k.quantidadeRestante,
            truckOptions,
            reservationId: k.id,
        };
    };

    const updateDraft = (key: string, patch: Partial<DraftLine>) => {
        setDrafts((prev) =>
            prev.map((d) => {
                if (d.key !== key) return d;
                const next = { ...d, ...patch };
                // ao mudar carreta, recalcula saldo
                if (patch.fromTruckId !== undefined) {
                    const opt = next.truckOptions.find((t) => t.truckId === patch.fromTruckId);
                    next.saldoCarretaSelecionada = opt?.saldo ?? 0;
                    // limita quantidade ao novo saldo se for menor
                    if (next.quantidade > next.saldoCarretaSelecionada) {
                        next.quantidade = next.saldoCarretaSelecionada;
                    }
                }
                return next;
            }),
        );
    };

    const removeDraft = (key: string) => {
        setDrafts((prev) => prev.filter((d) => d.key !== key));
    };

    const addItemForaDoKit = (it: StockItem) => {
        const truckOptions = (it.truckStocks ?? [])
            .filter((ts: any) => Number(ts.quantidadeAtual) > 0)
            .map((ts: any) => ({
                truckId: ts.truckId,
                identifier: ts.truck?.identifier ?? '—',
                saldo: Number(ts.quantidadeAtual),
            }));
        if (truckOptions.length === 0) {
            setErr(`Item "${it.nome}" não tem saldo em nenhuma carreta`);
            return;
        }
        const fromTruckId = truckOptions[0].truckId;
        setDrafts((prev) => [
            ...prev,
            {
                key: `fora-${Date.now()}-${it.id}`,
                stockItemId: it.id,
                nome: it.nome,
                unidade: it.unidade,
                fromTruckId,
                quantidade: 1,
                saldoCarretaSelecionada: truckOptions[0].saldo,
                quantidadeRestante: 0, // não está no kit
                truckOptions,
                reservationId: null,
            },
        ]);
        setPickerOpen(false);
        setPickerQuery('');
    };

    const draftIds = new Set(drafts.map((d) => d.stockItemId));
    const pickableItems = allItems
        .filter((it) => !draftIds.has(it.id) && it.active)
        .filter((it) => Array.isArray((it as any).truckStocks) && (it as any).truckStocks.length > 0)
        .filter((it) => {
            if (!pickerQuery.trim()) return true;
            const q = pickerQuery.toLowerCase();
            return (
                it.nome.toLowerCase().includes(q) ||
                (it.codigoInterno ?? '').toLowerCase().includes(q)
            );
        });

    const linhasValidas = drafts.filter((d) => d.quantidade > 0 && d.fromTruckId);
    const totalLinhas = linhasValidas.length;
    const algumExcedente = drafts.some((d) => d.quantidade > d.saldoCarretaSelecionada);

    const baixarTudo = async () => {
        if (totalLinhas === 0) {
            setErr('Adicione ao menos uma linha com quantidade e carreta');
            return;
        }
        if (algumExcedente) {
            setErr('Alguma linha excede o saldo da carreta selecionada');
            return;
        }
        setSubmitting(true);
        setErr(null);
        setSuccess(null);
        try {
            const items: BaixaItemPayload[] = linhasValidas.map((d) => ({
                stockItemId: d.stockItemId,
                quantidade: d.quantidade,
                fromTruckId: d.fromTruckId,
                observacao: d.observacao,
            }));
            const res = await stockApi.baixa.emLote(
                acaoId,
                items,
                observacaoGlobal || undefined,
            );
            setSuccess(res.mensagem);
            setObservacaoGlobal('');
            await load();
            if (onChange && data) onChange(data);
        } catch (e: any) {
            setErr(e?.response?.data?.message ?? 'Erro ao registrar baixa em lote');
        } finally {
            setSubmitting(false);
        }
    };

    const baixarLinhaIndividual = async (d: DraftLine) => {
        if (d.quantidade <= 0 || !d.fromTruckId) {
            setErr('Preencha quantidade e carreta');
            return;
        }
        if (d.quantidade > d.saldoCarretaSelecionada) {
            setErr('Quantidade excede o saldo da carreta');
            return;
        }
        setSubmitting(true);
        setErr(null);
        setSuccess(null);
        try {
            const res = await stockApi.baixa.emLote(
                acaoId,
                [
                    {
                        stockItemId: d.stockItemId,
                        quantidade: d.quantidade,
                        fromTruckId: d.fromTruckId,
                        observacao: d.observacao,
                    },
                ],
                undefined,
            );
            setSuccess(res.mensagem);
            await load();
        } catch (e: any) {
            setErr(e?.response?.data?.message ?? 'Erro ao baixar item');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Carregando…</div>
        );
    }
    if (!data) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: '#DC2626' }}>
                {err ?? 'Falha ao carregar'}
            </div>
        );
    }

    // % cobertura visual
    const pct =
        data.totalPrevisto > 0 ? Math.round((data.totalConsumido / data.totalPrevisto) * 100) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header com resumo */}
            <div
                style={{
                    background: 'white',
                    borderRadius: 12,
                    border: '1px solid #E5E7EB',
                    padding: 20,
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
                            Baixa de Estoque — {data.acao.nome}
                        </h3>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>
                            {data.acao.carreta ? (
                                <>Carreta principal: <strong>{data.acao.carreta.identifier}</strong> ({data.acao.carreta.licensePlate})</>
                            ) : (
                                <span style={{ color: '#DC2626' }}>⚠ Ação sem carreta vinculada</span>
                            )} · Status: <strong>{data.acao.status}</strong>
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>Cobertura do kit</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: pct >= 100 ? '#10B981' : pct > 0 ? '#F59E0B' : '#6B7280' }}>
                            {pct}%
                        </div>
                        <div style={{ fontSize: 11, color: '#6B7280' }}>
                            {data.totalConsumido.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} de {data.totalPrevisto.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                {/* barra */}
                <div style={{ marginTop: 12, background: '#F3F4F6', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                    <div
                        style={{
                            width: `${Math.min(100, pct)}%`,
                            height: '100%',
                            background: pct >= 100 ? '#10B981' : '#3B82F6',
                            transition: 'width .3s',
                        }}
                    />
                </div>
            </div>

            {/* Alertas */}
            {err && (
                <div style={{ padding: 12, background: '#FEE2E2', color: '#991B1B', borderRadius: 8, fontSize: 14 }}>
                    {err}
                </div>
            )}
            {success && (
                <div style={{ padding: 12, background: '#D1FAE5', color: '#065F46', borderRadius: 8, fontSize: 14 }}>
                    ✓ {success}
                </div>
            )}

            {/* Linhas a baixar */}
            <div
                style={{
                    background: 'white',
                    borderRadius: 12,
                    border: '1px solid #E5E7EB',
                    padding: 20,
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>
                        Linhas a baixar ({drafts.length})
                    </h4>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            type="button"
                            onClick={() => setPickerOpen(true)}
                            style={btnSecondary}
                            disabled={submitting}
                        >
                            + Item fora do kit
                        </button>
                        <button
                            type="button"
                            onClick={baixarTudo}
                            disabled={submitting || totalLinhas === 0 || algumExcedente}
                            style={{
                                ...btnPrimary,
                                opacity: submitting || totalLinhas === 0 || algumExcedente ? 0.5 : 1,
                            }}
                        >
                            ↧ Baixar tudo ({totalLinhas})
                        </button>
                    </div>
                </div>

                {drafts.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>
                        {data.kit.length === 0 ? (
                            <>Esta ação não tem kit de insumos planejado. Use “+ Item fora do kit” para registrar consumos avulsos, ou defina o kit em <em>Kit de Insumos</em>.</>
                        ) : (
                            <>Tudo do kit já foi consumido 🎉 — para registrar consumos extras, use “+ Item fora do kit”.</>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {drafts.map((d) => {
                            const excede = d.quantidade > d.saldoCarretaSelecionada;
                            return (
                                <div
                                    key={d.key}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1.5fr 1fr 1fr auto auto',
                                        gap: 10,
                                        alignItems: 'center',
                                        padding: 12,
                                        background: excede ? '#FEF2F2' : '#F9FAFB',
                                        borderRadius: 8,
                                        border: excede ? '1px solid #FCA5A5' : '1px solid #E5E7EB',
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                                            {d.nome}{' '}
                                            {d.reservationId === null && (
                                                <span style={{ fontSize: 10, padding: '2px 6px', background: '#FEF3C7', color: '#92400E', borderRadius: 4, marginLeft: 6 }}>
                                                    FORA DO KIT
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#6B7280' }}>
                                            {d.reservationId !== null && d.quantidadeRestante > 0 && (
                                                <>Restante no kit: <strong>{d.quantidadeRestante}</strong> {d.unidade} · </>
                                            )}
                                            Saldo na carreta: <strong>{d.saldoCarretaSelecionada}</strong> {d.unidade}
                                        </div>
                                    </div>
                                    <select
                                        value={d.fromTruckId}
                                        onChange={(e) => updateDraft(d.key, { fromTruckId: e.target.value })}
                                        disabled={submitting}
                                        style={inputStyle}
                                    >
                                        {d.truckOptions.map((t) => (
                                            <option key={t.truckId} value={t.truckId}>
                                                🚛 {t.identifier} ({t.saldo} disp.)
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        step="0.001"
                                        min={0}
                                        max={d.saldoCarretaSelecionada}
                                        value={d.quantidade}
                                        onChange={(e) => updateDraft(d.key, { quantidade: Number(e.target.value) })}
                                        disabled={submitting}
                                        style={{ ...inputStyle, color: excede ? '#DC2626' : '#111827', fontWeight: 600 }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => baixarLinhaIndividual(d)}
                                        disabled={submitting || excede || d.quantidade <= 0}
                                        style={{ ...btnPrimarySmall, opacity: excede || d.quantidade <= 0 ? 0.5 : 1 }}
                                        title="Baixar apenas esta linha"
                                    >
                                        ↧ Baixar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeDraft(d.key)}
                                        disabled={submitting}
                                        style={btnGhostDanger}
                                        title="Remover linha (não baixa nada)"
                                    >
                                        ✕
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Observação global (vai em todas as linhas do lote) */}
                {drafts.length > 0 && (
                    <input
                        type="text"
                        placeholder="Observação global (aplicada a todas as linhas do lote, opcional)…"
                        value={observacaoGlobal}
                        onChange={(e) => setObservacaoGlobal(e.target.value)}
                        disabled={submitting}
                        style={{ ...inputStyle, marginTop: 12, width: '100%' }}
                    />
                )}
            </div>

            {/* Picker de item fora do kit */}
            {pickerOpen && (
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onClick={() => setPickerOpen(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ background: 'white', borderRadius: 12, width: 'min(640px, 90vw)', maxHeight: '80vh', overflow: 'auto', padding: 20 }}
                    >
                        <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>Adicionar item fora do kit</h3>
                        <input
                            type="text"
                            placeholder="Buscar por nome ou código…"
                            value={pickerQuery}
                            onChange={(e) => setPickerQuery(e.target.value)}
                            style={{ ...inputStyle, width: '100%', marginBottom: 12 }}
                            autoFocus
                        />
                        {pickableItems.length === 0 ? (
                            <p style={{ color: '#6B7280', fontSize: 13 }}>Nenhum item com saldo em carretas disponível.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {pickableItems.slice(0, 30).map((it) => {
                                    const saldoCarretas = ((it as any).truckStocks ?? []).reduce(
                                        (sum: number, ts: any) => sum + Number(ts.quantidadeAtual ?? 0), 0,
                                    );
                                    return (
                                        <button
                                            key={it.id}
                                            onClick={() => addItemForaDoKit(it)}
                                            style={{
                                                padding: 10, textAlign: 'left', background: '#F9FAFB',
                                                border: '1px solid #E5E7EB', borderRadius: 6, cursor: 'pointer',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            }}
                                        >
                                            <span style={{ fontSize: 13, fontWeight: 600 }}>
                                                {it.nome}{' '}
                                                <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 400 }}>
                                                    {it.codigoInterno && `· ${it.codigoInterno}`}
                                                </span>
                                            </span>
                                            <span style={{ fontSize: 11, color: '#6B7280' }}>
                                                {saldoCarretas} {it.unidade} em carretas
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        <button onClick={() => setPickerOpen(false)} style={{ ...btnSecondary, marginTop: 12 }}>
                            Fechar
                        </button>
                    </div>
                </div>
            )}

            {/* Status do kit (somente leitura) */}
            <div
                style={{
                    background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 20,
                }}
            >
                <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#111827' }}>
                    Status atual do kit
                </h4>
                {data.kit.length === 0 ? (
                    <p style={{ fontSize: 13, color: '#6B7280' }}>Esta ação não tem kit planejado.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {data.kit.map((k) => (
                            <div
                                key={k.id}
                                style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: 8, background: '#F9FAFB', borderRadius: 6,
                                }}
                            >
                                <div>
                                    <span style={{ fontSize: 13, fontWeight: 600 }}>{k.stockItem.nome}</span>{' '}
                                    <span style={{ fontSize: 12, color: '#6B7280' }}>
                                        · {k.quantidadeConsumida}/{k.quantidadePrevista} {k.stockItem.unidade}
                                    </span>
                                </div>
                                <span
                                    style={{
                                        fontSize: 11, padding: '3px 8px', borderRadius: 999,
                                        background: BAIXA_STATUS_COLOR[k.status] + '22',
                                        color: BAIXA_STATUS_COLOR[k.status], fontWeight: 600,
                                    }}
                                >
                                    {BAIXA_STATUS_LABEL[k.status]}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Histórico de saídas desta ação */}
            <div
                style={{
                    background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 20,
                }}
            >
                <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#111827' }}>
                    Baixas já registradas ({data.saidas.length})
                </h4>
                {data.saidas.length === 0 ? (
                    <p style={{ fontSize: 13, color: '#6B7280' }}>Nenhuma baixa registrada ainda.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflow: 'auto' }}>
                        {data.saidas.map((s) => (
                            <div
                                key={s.id}
                                style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.8fr',
                                    gap: 8, padding: 8, background: '#F9FAFB', borderRadius: 6, fontSize: 12,
                                }}
                            >
                                <span style={{ fontWeight: 600, color: '#111827' }}>{s.stockItem.nome}</span>
                                <span style={{ color: '#6B7280' }}>
                                    {Number(s.quantidade)} {s.stockItem.unidade} · 🚛 {s.fromTruck?.identifier ?? '—'}
                                </span>
                                <span style={{ color: '#6B7280' }}>
                                    por {s.registrar?.name ?? '—'}
                                </span>
                                <span style={{ color: '#9CA3AF', textAlign: 'right' }}>
                                    {new Date(s.createdAt).toLocaleString('pt-BR')}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, background: 'white',
};
const btnPrimary: React.CSSProperties = {
    padding: '8px 16px', background: '#1F2937', color: 'white', border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const btnPrimarySmall: React.CSSProperties = {
    padding: '6px 12px', background: '#10B981', color: 'white', border: 'none', borderRadius: 6,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
    padding: '8px 14px', background: 'white', color: '#374151', border: '1px solid #D1D5DB',
    borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
};
const btnGhostDanger: React.CSSProperties = {
    padding: '6px 8px', background: 'transparent', color: '#DC2626', border: 'none',
    fontSize: 14, cursor: 'pointer',
};
