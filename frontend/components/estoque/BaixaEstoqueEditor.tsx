'use client';

import { useEffect, useState } from 'react';
import {
    stockApi,
    StockItem,
    BaixaStatusResponse,
    BaixaKitItem,
    BaixaItemPayload,
    BAIXA_STATUS_LABEL,
    BAIXA_STATUS_COLOR,
} from '@/lib/api/stock';
import {
    ESTOQUE_SECTION_CSS,
    EstoqueSection,
    EstoqueSectionHeader,
    EstoqueEmptyState,
    EstoqueLoadingState,
} from '@/components/estoque/EstoqueSection';

const ACCENT = '#FFD600';
const ACCENT_BAIXA = '#0891B2';

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
    reservationId: string | null;
    observacao?: string;
};

function BaixaKpi({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
    return (
        <div style={{
            padding: '0.75rem 1rem', borderRadius: 12, background: '#FAFAFA',
            border: `1px solid ${color}30`, minWidth: 120,
        }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', color: '#9CA3AF', textTransform: 'uppercase' }}>
                {icon} {label}
            </div>
            <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.15rem', color, marginTop: 4 }}>
                {value}
            </div>
        </div>
    );
}

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
                if (patch.fromTruckId !== undefined) {
                    const opt = next.truckOptions.find((t) => t.truckId === patch.fromTruckId);
                    next.saldoCarretaSelecionada = opt?.saldo ?? 0;
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
                quantidadeRestante: 0,
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
            const res = await stockApi.baixa.emLote(acaoId, items, observacaoGlobal || undefined);
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
                [{ stockItemId: d.stockItemId, quantidade: d.quantidade, fromTruckId: d.fromTruckId, observacao: d.observacao }],
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
            <>
                <style>{ESTOQUE_SECTION_CSS}</style>
                <EstoqueSection accent={ACCENT_BAIXA} minimal>
                    <EstoqueLoadingState label="Carregando baixa de estoque…" />
                </EstoqueSection>
            </>
        );
    }
    if (!data) {
        return (
            <>
                <style>{ESTOQUE_SECTION_CSS}</style>
                <EstoqueSection accent="#DC2626" minimal>
                    <EstoqueEmptyState icon="⚠" label={err ?? 'Falha ao carregar dados da baixa'} />
                </EstoqueSection>
            </>
        );
    }

    const pct = data.totalPrevisto > 0 ? Math.round((data.totalConsumido / data.totalPrevisto) * 100) : 0;
    const pctColor = pct >= 100 ? '#10B981' : pct > 0 ? '#F59E0B' : '#9CA3AF';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
            <style>{ESTOQUE_SECTION_CSS}</style>

            <EstoqueSection delay={0} accent={ACCENT_BAIXA}>
                <EstoqueSectionHeader
                    icon="↧"
                    title={`Baixa — ${data.acao.nome}`}
                    subtitle={
                        data.acao.carreta
                            ? `Carreta ${data.acao.carreta.identifier} (${data.acao.carreta.licensePlate}) · Status ${data.acao.status}`
                            : 'Ação sem carreta vinculada — vincule uma carreta na ação'
                    }
                    accent={ACCENT_BAIXA}
                    pulse={!!data.acao.carreta}
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
                    <BaixaKpi label="Cobertura" value={`${pct}%`} icon="📊" color={pctColor} />
                    <BaixaKpi
                        label="Consumido"
                        value={data.totalConsumido.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                        icon="↧"
                        color="#10B981"
                    />
                    <BaixaKpi
                        label="Previsto"
                        value={data.totalPrevisto.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                        icon="🎒"
                        color="#6366F1"
                    />
                    <BaixaKpi label="Itens no kit" value={data.kit.length} icon="📦" color={ACCENT_BAIXA} />
                    <BaixaKpi label="Baixas feitas" value={data.saidas.length} icon="✓" color="#059669" />
                </div>
                <div style={{ background: '#F3F4F6', borderRadius: 999, height: 10, overflow: 'hidden' }}>
                    <div
                        style={{
                            width: `${Math.min(100, pct)}%`,
                            height: '100%',
                            background: `linear-gradient(90deg, ${ACCENT_BAIXA}, ${pct >= 100 ? '#10B981' : ACCENT})`,
                            transition: 'width .35s ease',
                            borderRadius: 999,
                        }}
                    />
                </div>
            </EstoqueSection>

            {err && <AlertBox type="error">{err}</AlertBox>}
            {success && <AlertBox type="success">✓ {success}</AlertBox>}

            <EstoqueSection delay={80} accent={ACCENT}>
                <EstoqueSectionHeader
                    icon="📝"
                    title={`Linhas a baixar (${drafts.length})`}
                    subtitle="Selecione carreta e quantidade; confirme em lote ou linha a linha"
                    accent={ACCENT}
                    action={(
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button type="button" onClick={() => setPickerOpen(true)} style={btnSecondary} disabled={submitting}>
                                + Item fora do kit
                            </button>
                            <button
                                type="button"
                                onClick={baixarTudo}
                                disabled={submitting || totalLinhas === 0 || algumExcedente}
                                style={{ ...btnPrimary, opacity: submitting || totalLinhas === 0 || algumExcedente ? 0.5 : 1 }}
                            >
                                ↧ Baixar tudo ({totalLinhas})
                            </button>
                        </div>
                    )}
                />

                {drafts.length === 0 ? (
                    <EstoqueEmptyState
                        icon={data.kit.length === 0 ? '📋' : '🎉'}
                        label={
                            data.kit.length === 0
                                ? 'Sem kit planejado — use "+ Item fora do kit" ou defina o kit na aba Kit de Insumos'
                                : 'Kit totalmente consumido — use "+ Item fora do kit" para extras'
                        }
                    />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {drafts.map((d) => {
                            const excede = d.quantidade > d.saldoCarretaSelecionada;
                            return (
                                <div
                                    key={d.key}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'minmax(160px,1.4fr) minmax(120px,1fr) minmax(80px,0.7fr) auto auto',
                                        gap: 10,
                                        alignItems: 'end',
                                        padding: '0.85rem 1rem',
                                        background: excede ? '#FEF2F2' : d.reservationId === null ? '#FFFBEB' : '#FAFAFA',
                                        borderRadius: 12,
                                        border: `1px solid ${excede ? '#FCA5A5' : d.reservationId === null ? '#FDE68A' : '#E5E7EB'}`,
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                            {d.nome}
                                            {d.reservationId === null && (
                                                <span style={badgeFora}>FORA DO KIT</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 4 }}>
                                            {d.reservationId !== null && d.quantidadeRestante > 0 && (
                                                <>Restante kit: <strong style={{ color: '#0891B2' }}>{d.quantidadeRestante} {d.unidade}</strong> · </>
                                            )}
                                            Saldo carreta: <strong>{d.saldoCarretaSelecionada} {d.unidade}</strong>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={MINI_LABEL}>Carreta</label>
                                        <select
                                            value={d.fromTruckId}
                                            onChange={(e) => updateDraft(d.key, { fromTruckId: e.target.value })}
                                            disabled={submitting}
                                            style={MINI_INPUT}
                                        >
                                            {d.truckOptions.map((t) => (
                                                <option key={t.truckId} value={t.truckId}>
                                                    🚛 {t.identifier} ({t.saldo})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={MINI_LABEL}>Qtd ({d.unidade})</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            min={0}
                                            max={d.saldoCarretaSelecionada}
                                            value={d.quantidade}
                                            onChange={(e) => updateDraft(d.key, { quantidade: Number(e.target.value) })}
                                            disabled={submitting}
                                            style={{ ...MINI_INPUT, color: excede ? '#DC2626' : '#111827', fontWeight: 700 }}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => baixarLinhaIndividual(d)}
                                        disabled={submitting || excede || d.quantidade <= 0}
                                        style={{ ...btnBaixaLinha, opacity: excede || d.quantidade <= 0 ? 0.5 : 1 }}
                                    >
                                        ↧ Baixar
                                    </button>
                                    <button type="button" onClick={() => removeDraft(d.key)} disabled={submitting} style={btnGhostDanger} title="Remover">
                                        ✕
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {drafts.length > 0 && (
                    <input
                        type="text"
                        placeholder="Observação global do lote (opcional)…"
                        value={observacaoGlobal}
                        onChange={(e) => setObservacaoGlobal(e.target.value)}
                        disabled={submitting}
                        style={{ ...MINI_INPUT, marginTop: 14, width: '100%', padding: '0.65rem 0.85rem' }}
                    />
                )}
            </EstoqueSection>

            {pickerOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                    onClick={() => setPickerOpen(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#fff', borderRadius: 18, width: 'min(640px, 96vw)', maxHeight: '85vh',
                            overflow: 'hidden', display: 'flex', flexDirection: 'column',
                            border: `2px solid ${ACCENT}50`, boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
                        }}
                    >
                        <div style={{ padding: '1.1rem 1.25rem', borderBottom: '1px solid #F3F4F6', background: 'linear-gradient(135deg,#FFFDE7,#FFFBEB)' }}>
                            <h3 style={{ margin: 0, fontFamily: 'Orbitron,sans-serif', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.08em', color: '#111827' }}>
                                ADICIONAR ITEM FORA DO KIT
                            </h3>
                        </div>
                        <div style={{ padding: '1rem 1.25rem', overflow: 'auto' }}>
                            <input
                                type="text"
                                placeholder="Buscar por nome ou código…"
                                value={pickerQuery}
                                onChange={(e) => setPickerQuery(e.target.value)}
                                style={{ ...MINI_INPUT, width: '100%', marginBottom: 12, padding: '0.65rem 0.85rem' }}
                                autoFocus
                            />
                            {pickableItems.length === 0 ? (
                                <EstoqueEmptyState icon="🔍" label="Nenhum item com saldo em carretas" />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {pickableItems.slice(0, 30).map((it) => {
                                        const saldoCarretas = ((it as any).truckStocks ?? []).reduce(
                                            (sum: number, ts: any) => sum + Number(ts.quantidadeAtual ?? 0), 0,
                                        );
                                        return (
                                            <button
                                                key={it.id}
                                                type="button"
                                                onClick={() => addItemForaDoKit(it)}
                                                style={{
                                                    padding: '0.65rem 0.85rem', textAlign: 'left', background: '#FAFAFA',
                                                    border: '1px solid #E5E7EB', borderRadius: 10, cursor: 'pointer',
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                                                }}
                                            >
                                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#111827' }}>
                                                    {it.nome}
                                                    {it.codigoInterno && (
                                                        <span style={{ marginLeft: 6, color: '#9CA3AF', fontFamily: 'JetBrains Mono,monospace', fontSize: '0.68rem' }}>
                                                            {it.codigoInterno}
                                                        </span>
                                                    )}
                                                </span>
                                                <span style={{ fontSize: '0.68rem', color: '#6B7280', whiteSpace: 'nowrap' }}>
                                                    {saldoCarretas} {it.unidade}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            <button type="button" onClick={() => setPickerOpen(false)} style={{ ...btnSecondary, marginTop: 12, width: '100%' }}>
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <EstoqueSection delay={160} accent="#6366F1" minimal>
                <EstoqueSectionHeader icon="🎒" title="Status atual do kit" subtitle="Previsto vs consumido por item" accent="#6366F1" pulse={false} />
                {data.kit.length === 0 ? (
                    <EstoqueEmptyState icon="📋" label="Esta ação não tem kit planejado" />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {data.kit.map((k) => (
                            <div
                                key={k.id}
                                style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
                                    padding: '0.65rem 0.85rem', background: '#FAFAFA', borderRadius: 10, border: '1px solid #E5E7EB',
                                }}
                            >
                                <div>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827' }}>{k.stockItem.nome}</span>
                                    <span style={{ fontSize: '0.72rem', color: '#6B7280', marginLeft: 8 }}>
                                        {k.quantidadeConsumida}/{k.quantidadePrevista} {k.stockItem.unidade}
                                    </span>
                                </div>
                                <span style={{
                                    fontSize: '0.65rem', padding: '3px 10px', borderRadius: 999, fontWeight: 800,
                                    background: `${BAIXA_STATUS_COLOR[k.status]}18`,
                                    color: BAIXA_STATUS_COLOR[k.status],
                                    border: `1px solid ${BAIXA_STATUS_COLOR[k.status]}40`,
                                }}>
                                    {BAIXA_STATUS_LABEL[k.status]}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </EstoqueSection>

            <EstoqueSection delay={240} accent="#059669" minimal>
                <EstoqueSectionHeader
                    icon="📜"
                    title={`Baixas registradas (${data.saidas.length})`}
                    subtitle="Histórico de saídas desta ação/período"
                    accent="#059669"
                    pulse={false}
                />
                {data.saidas.length === 0 ? (
                    <EstoqueEmptyState icon="↧" label="Nenhuma baixa registrada ainda" />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflow: 'auto' }}>
                        {data.saidas.map((s) => (
                            <div
                                key={s.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'minmax(120px,1.2fr) minmax(100px,1fr) minmax(80px,0.8fr) minmax(100px,0.9fr)',
                                    gap: 8,
                                    padding: '0.65rem 0.85rem',
                                    background: '#F0FDF4',
                                    borderRadius: 10,
                                    border: '1px solid #BBF7D0',
                                    fontSize: '0.72rem',
                                }}
                            >
                                <span style={{ fontWeight: 700, color: '#111827' }}>{s.stockItem.nome}</span>
                                <span style={{ color: '#374151' }}>
                                    {Number(s.quantidade)} {s.stockItem.unidade} · 🚛 {s.fromTruck?.identifier ?? '—'}
                                </span>
                                <span style={{ color: '#6B7280' }}>{s.registrar?.name ?? '—'}</span>
                                <span style={{ color: '#9CA3AF', textAlign: 'right' }}>
                                    {new Date(s.createdAt).toLocaleString('pt-BR')}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </EstoqueSection>
        </div>
    );
}

function AlertBox({ type, children }: { type: 'error' | 'success'; children: React.ReactNode }) {
    const isErr = type === 'error';
    return (
        <div style={{
            padding: '0.7rem 1rem', borderRadius: 12, fontSize: '0.82rem', fontWeight: 600,
            background: isErr ? '#FEF2F2' : '#ECFDF5',
            border: `1px solid ${isErr ? '#FECACA' : '#A7F3D0'}`,
            color: isErr ? '#991B1B' : '#065F46',
        }}>
            {children}
        </div>
    );
}

const MINI_LABEL: React.CSSProperties = {
    display: 'block', fontSize: '0.55rem', fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 4,
};
const MINI_INPUT: React.CSSProperties = {
    width: '100%', padding: '6px 10px', borderRadius: 8,
    border: '1px solid #E5E7EB', background: '#fff', fontSize: '0.78rem', color: '#111827', outline: 'none',
    boxSizing: 'border-box',
};
const badgeFora: React.CSSProperties = {
    fontSize: '0.55rem', fontWeight: 800, background: '#FBBF24', color: '#78350F',
    padding: '2px 7px', borderRadius: 5,
};
const btnPrimary: React.CSSProperties = {
    padding: '8px 16px', background: 'linear-gradient(135deg,#FFD600,#F59E0B)', color: '#0F172A',
    border: 'none', borderRadius: 10, fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
    fontFamily: 'Orbitron,sans-serif', letterSpacing: '0.04em',
};
const btnBaixaLinha: React.CSSProperties = {
    padding: '8px 12px', background: ACCENT_BAIXA, color: '#fff', border: 'none', borderRadius: 8,
    fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
};
const btnSecondary: React.CSSProperties = {
    padding: '8px 14px', background: '#fff', color: '#374151', border: '1.5px solid #E5E7EB',
    borderRadius: 10, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
};
const btnGhostDanger: React.CSSProperties = {
    padding: '8px 10px', background: 'transparent', color: '#DC2626', border: '1px solid #FECACA',
    borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer',
};
