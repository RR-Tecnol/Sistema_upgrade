'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    stockApi,
    StockItem,
    StockMovementType,
    CreateMovementDto,
    AjusteMode,
    TruckStockItem,
    MOV_TYPE_LABEL,
    MOV_TYPE_COLOR,
    MOV_TYPE_ICON,
} from '@/lib/api/stock';

// Augmenta StockItem com a forma completa de truckStocks vinda de findOneItem.
type StockItemWithStocks = Omit<StockItem, 'truckStocks'> & { truckStocks?: TruckStockItem[] };
import { trucksApi, Truck } from '@/lib/api/trucks';
import { acoesApi, Acao } from '@/lib/api/acoes';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';
import { toast } from '@/components/ui/Toast';

/**
 * Modal único de Movimentação de Estoque.
 * Inspirado no fluxo do sistema legado (Insumo / Tipo / Caminhão / Quantidade / Observação).
 *
 * Suporta pré-preenchimento via props para reutilizar a partir de:
 *   - header de /admin/estoque       → tudo livre
 *   - header de /admin/estoque/movimentacoes → tudo livre
 *   - card de item                   → defaultItemId fixa o insumo
 *   - detalhe da carreta             → defaultFromTruckId / defaultToTruckId
 *   - tela de ação                   → defaultAcaoId
 */
export function MovimentacaoModal({
    open,
    onClose,
    defaultType = 'ENTRADA',
    defaultItemId,
    defaultFromTruckId,
    defaultToTruckId,
    defaultAcaoId,
    onSuccess,
}: {
    open: boolean;
    onClose: () => void;
    defaultType?: StockMovementType;
    defaultItemId?: string;
    defaultFromTruckId?: string;
    defaultToTruckId?: string;
    defaultAcaoId?: string;
    onSuccess?: () => void;
}) {
    const [items, setItems] = useState<StockItem[]>([]);
    const [itemDetail, setItemDetail] = useState<StockItemWithStocks | null>(null);
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [acoes, setAcoes] = useState<Acao[]>([]);

    const [type, setType] = useState<StockMovementType>(defaultType);
    const [stockItemId, setStockItemId] = useState(defaultItemId ?? '');
    const [fromTruckId, setFromTruckId] = useState(defaultFromTruckId ?? '');
    const [toTruckId, setToTruckId] = useState(defaultToTruckId ?? '');
    const [acaoId, setAcaoId] = useState(defaultAcaoId ?? '');
    const [quantidade, setQuantidade] = useState<number | ''>('');
    const [observacao, setObservacao] = useState('');
    const [ajusteMode, setAjusteMode] = useState<AjusteMode>('SET');

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset / pré-preenchimento ao abrir
    useEffect(() => {
        if (!open) return;
        setType(defaultType);
        setStockItemId(defaultItemId ?? '');
        setFromTruckId(defaultFromTruckId ?? '');
        setToTruckId(defaultToTruckId ?? '');
        setAcaoId(defaultAcaoId ?? '');
        setQuantidade('');
        setObservacao('');
        setAjusteMode('SET');
        setError(null);
    }, [open, defaultType, defaultItemId, defaultFromTruckId, defaultToTruckId, defaultAcaoId]);

    // Carregar dados auxiliares ao abrir
    useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                const [its, tks] = await Promise.all([
                    stockApi.items.getAll(),
                    trucksApi.getAll(),
                ]);
                setItems(its);
                setTrucks(tks);
            } catch (e) {
                console.error('[MovimentacaoModal] erro ao carregar listas', e);
            }
        })();
    }, [open]);

    // Carrega ações sob demanda (lista pode ser grande). Só quando type=SAIDA.
    useEffect(() => {
        if (!open) return;
        if (type !== 'SAIDA') return;
        if (acoes.length > 0) return;
        (async () => {
            try {
                const data = await acoesApi.listar({ status: 'EM_ANDAMENTO' });
                setAcoes(data);
            } catch (e) {
                console.error('[MovimentacaoModal] erro ao carregar ações', e);
            }
        })();
    }, [open, type, acoes.length]);

    // Quando o item muda, busca o detalhe (que inclui truckStocks) para preview correto
    useEffect(() => {
        if (!open || !stockItemId) {
            setItemDetail(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const d = await stockApi.items.getOne(stockItemId);
                if (!cancelled) setItemDetail(d as StockItemWithStocks);
            } catch (e) {
                console.error('[MovimentacaoModal] erro ao carregar detalhe do item', e);
            }
        })();
        return () => { cancelled = true; };
    }, [open, stockItemId]);

    const selectedItem: StockItemWithStocks | null = useMemo(
        () => itemDetail ?? (items.find((i) => i.id === stockItemId) as StockItemWithStocks | undefined) ?? null,
        [itemDetail, items, stockItemId],
    );

    // ── Campos requeridos por tipo (espelha o backend stock.service.ts) ──
    const requires = useMemo(() => {
        switch (type) {
            case 'ENTRADA':       return { fromTruck: false, toTruck: true,  acao: false, observacao: false };
            case 'SAIDA':         return { fromTruck: true,  toTruck: false, acao: true,  observacao: false };
            case 'TRANSFERENCIA': return { fromTruck: true,  toTruck: true,  acao: false, observacao: false };
            case 'DEVOLUCAO':     return { fromTruck: true,  toTruck: false, acao: false, observacao: false };
            case 'AJUSTE':        return { fromTruck: false, toTruck: false, acao: false, observacao: true };
            case 'PERDA':         return { fromTruck: false, toTruck: false, acao: false, observacao: true };
            default:              return { fromTruck: false, toTruck: false, acao: false, observacao: false };
        }
    }, [type]);

    // ── Saldo atual no escopo da operação (para preview e checagem) ──
    const saldoEscopo = useMemo(() => {
        if (!selectedItem) return null;
        // Para AJUSTE/PERDA com carreta: saldo da carreta
        // Para SAIDA/TRANSFERENCIA/DEVOLUCAO: saldo da carreta origem
        // Para ENTRADA: saldo do central
        const carretaAvaliada =
            type === 'ENTRADA' ? null
            : type === 'AJUSTE' || type === 'PERDA' ? (fromTruckId || null)
            : fromTruckId || null;

        if (!carretaAvaliada) {
            return { escopo: 'central', valor: Number(selectedItem.quantidadeAtual) };
        }
        const ts = selectedItem.truckStocks?.find((t) => t.truckId === carretaAvaliada);
        return { escopo: `carreta ${trucks.find((t) => t.id === carretaAvaliada)?.identifier ?? '—'}`, valor: ts ? Number(ts.quantidadeAtual) : 0 };
    }, [selectedItem, type, fromTruckId, trucks]);

    const qtdNum = typeof quantidade === 'number' ? quantidade : 0;

    // ── Preview do impacto: saldo antes → depois ──
    const preview = useMemo(() => {
        if (!selectedItem || !saldoEscopo || qtdNum <= 0) return null;
        const antes = saldoEscopo.valor;
        let depois = antes;

        switch (type) {
            case 'ENTRADA':
                // central debita qtd, carreta destino credita qtd. Preview mostra impacto NO CENTRAL.
                depois = antes - qtdNum;
                break;
            case 'SAIDA':
            case 'PERDA':
                depois = antes - qtdNum;
                break;
            case 'DEVOLUCAO':
                depois = antes - qtdNum; // debita carreta (origem)
                break;
            case 'TRANSFERENCIA':
                depois = antes - qtdNum; // debita carreta origem
                break;
            case 'AJUSTE':
                depois = ajusteMode === 'SET' ? qtdNum : antes - qtdNum;
                break;
        }
        return { antes, depois, delta: depois - antes };
    }, [selectedItem, saldoEscopo, type, qtdNum, ajusteMode]);

    const handleSubmit = async () => {
        setError(null);

        if (!stockItemId) { setError('Selecione o insumo.'); return; }
        if (qtdNum <= 0) { setError('Informe uma quantidade maior que zero.'); return; }
        if (requires.fromTruck && !fromTruckId) { setError('Carreta de origem obrigatória.'); return; }
        if (requires.toTruck && !toTruckId)     { setError('Carreta de destino obrigatória.'); return; }
        if (type === 'TRANSFERENCIA' && fromTruckId === toTruckId) {
            setError('Carreta de origem e destino devem ser diferentes.');
            return;
        }
        if (requires.observacao && observacao.trim().length < 3) {
            setError('Observação obrigatória (mín. 3 caracteres) para AJUSTE ou PERDA.');
            return;
        }
        // Validação de saldo (best-effort no client; backend faz validação canônica)
        if (preview && preview.depois < 0 && type !== 'AJUSTE') {
            setError(`Saldo insuficiente: ${saldoEscopo?.escopo} tem ${preview.antes} ${selectedItem?.unidade ?? ''} e a operação subtrairia ${qtdNum}.`);
            return;
        }

        setSubmitting(true);
        try {
            const dto: CreateMovementDto = {
                type,
                stockItemId,
                quantidade: qtdNum,
                fromTruckId: requires.fromTruck || (type === 'AJUSTE' || type === 'PERDA') ? (fromTruckId || undefined) : undefined,
                toTruckId: requires.toTruck ? toTruckId : undefined,
                acaoId: requires.acao ? acaoId || undefined : undefined,
                observacao: observacao.trim() || undefined,
                ajusteMode: type === 'AJUSTE' ? ajusteMode : undefined,
            };
            await stockApi.movements.create(dto);
            toast.success(`Movimentação ${MOV_TYPE_LABEL[type]} registrada com sucesso`);
            onSuccess?.();
            onClose();
        } catch (e: any) {
            const msg = e?.response?.data?.message || e?.message || 'Erro ao registrar movimentação';
            setError(Array.isArray(msg) ? msg.join('; ') : msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (!open) return null;

    const typeColor = MOV_TYPE_COLOR[type];

    return (
        <ModalPortal>
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: MODAL_PORTAL_Z_INDEX,
                    background: 'rgba(2, 6, 23, 0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem',
                    animation: 'mov-fade-in 0.2s ease',
                }}>
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: 'min(640px, 100%)', maxHeight: '92vh',
                        background: '#FFFFFF', borderRadius: 16,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        display: 'flex', flexDirection: 'column',
                        overflow: 'hidden',
                    }}>

                    {/* HEADER */}
                    <div style={{
                        padding: '1rem 1.25rem',
                        background: `linear-gradient(135deg, ${typeColor}, ${typeColor}cc)`,
                        display: 'flex', alignItems: 'center', gap: 14, color: '#fff',
                    }}>
                        <div style={{
                            width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                            background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                        }}>{MOV_TYPE_ICON[type]}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.9 }}>
                                Nova movimentação de estoque
                            </div>
                            <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.05rem', letterSpacing: '0.04em' }}>
                                {MOV_TYPE_LABEL[type]}
                            </div>
                        </div>
                        <button onClick={onClose} style={{
                            border: '1px solid rgba(255,255,255,0.4)',
                            background: 'rgba(255,255,255,0.15)', color: '#fff',
                            borderRadius: 8, padding: '0.35rem 0.7rem',
                            cursor: 'pointer', fontWeight: 800, fontSize: '0.78rem',
                        }}>✕</button>
                    </div>

                    {/* BODY */}
                    <div className="custom-scrollbar" style={{ padding: '1.1rem 1.25rem', overflowY: 'auto', flex: 1 }}>
                        <Field label="Insumo" required>
                            <select
                                value={stockItemId}
                                onChange={(e) => setStockItemId(e.target.value)}
                                style={inputStyle}
                            >
                                <option value="">Selecione um item…</option>
                                {items.map((i) => (
                                    <option key={i.id} value={i.id}>
                                        {i.nome} ({i.unidade}) — saldo central: {Number(i.quantidadeAtual)}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Tipo de Movimentação" required>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
                                {(['ENTRADA','SAIDA','TRANSFERENCIA','DEVOLUCAO','AJUSTE','PERDA'] as StockMovementType[]).map((t) => {
                                    const selected = type === t;
                                    const c = MOV_TYPE_COLOR[t];
                                    return (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setType(t)}
                                            style={{
                                                padding: '0.55rem 0.7rem', borderRadius: 9,
                                                background: selected ? `${c}12` : '#F9FAFB',
                                                border: `1.5px solid ${selected ? c : '#E5E7EB'}`,
                                                cursor: 'pointer', textAlign: 'left',
                                                display: 'flex', alignItems: 'center', gap: 6,
                                                transition: 'all 0.15s',
                                            }}>
                                            <span style={{ fontSize: '1rem' }}>{MOV_TYPE_ICON[t]}</span>
                                            <span style={{ fontSize: '0.72rem', fontWeight: selected ? 800 : 600, color: selected ? c : '#475569' }}>
                                                {MOV_TYPE_LABEL[t]}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </Field>

                        {/* Carretas */}
                        {(requires.fromTruck || type === 'AJUSTE' || type === 'PERDA') && (
                            <Field
                                label={
                                    requires.fromTruck
                                        ? 'Carreta de Origem'
                                        : 'Carreta (opcional — sem carreta, ajusta/baixa do estoque central)'
                                }
                                required={requires.fromTruck}>
                                <select
                                    value={fromTruckId}
                                    onChange={(e) => setFromTruckId(e.target.value)}
                                    style={inputStyle}
                                >
                                    <option value="">{requires.fromTruck ? 'Selecione…' : 'Estoque central (sem carreta)'}</option>
                                    {trucks.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.identifier} ({t.licensePlate})
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        )}
                        {requires.toTruck && (
                            <Field label="Carreta de Destino" required>
                                <select
                                    value={toTruckId}
                                    onChange={(e) => setToTruckId(e.target.value)}
                                    style={inputStyle}
                                >
                                    <option value="">Selecione…</option>
                                    {trucks.filter((t) => t.id !== fromTruckId).map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.identifier} ({t.licensePlate})
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        )}
                        {requires.acao && (
                            <Field label="Ação consumidora" required>
                                <select
                                    value={acaoId}
                                    onChange={(e) => setAcaoId(e.target.value)}
                                    style={inputStyle}
                                >
                                    <option value="">Selecione uma ação em andamento…</option>
                                    {acoes.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.nome} ({a.cidadeNome ?? '—'})
                                        </option>
                                    ))}
                                </select>
                                <small style={hintStyle}>Mostra ações com status EM_ANDAMENTO.</small>
                            </Field>
                        )}

                        {/* AJUSTE: modo SET ou DELTA */}
                        {type === 'AJUSTE' && (
                            <Field label="Modo do Ajuste" required>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <button
                                        type="button"
                                        onClick={() => setAjusteMode('SET')}
                                        style={ajusteModeBtnStyle(ajusteMode === 'SET', '#D97706')}>
                                        <div style={{ fontSize: '0.95rem' }}>📏</div>
                                        <div style={{ fontWeight: 800, fontSize: '0.78rem' }}>Definir novo saldo</div>
                                        <div style={{ fontSize: '0.66rem', opacity: 0.8 }}>
                                            Para contagem física: você digita o saldo correto.
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAjusteMode('DELTA')}
                                        style={ajusteModeBtnStyle(ajusteMode === 'DELTA', '#D97706')}>
                                        <div style={{ fontSize: '0.95rem' }}>➖</div>
                                        <div style={{ fontWeight: 800, fontSize: '0.78rem' }}>Subtrair delta</div>
                                        <div style={{ fontSize: '0.66rem', opacity: 0.8 }}>
                                            Decrementa a quantidade informada do saldo atual.
                                        </div>
                                    </button>
                                </div>
                            </Field>
                        )}

                        <Field
                            label={
                                type === 'AJUSTE' && ajusteMode === 'SET'
                                    ? `Novo saldo (${selectedItem?.unidade ?? 'un'})`
                                    : `Quantidade (${selectedItem?.unidade ?? 'un'})`
                            }
                            required>
                            <input
                                type="number"
                                min={0}
                                step={0.001}
                                value={quantidade}
                                onChange={(e) => setQuantidade(e.target.value === '' ? '' : Number(e.target.value))}
                                style={inputStyle}
                                placeholder={
                                    type === 'AJUSTE' && ajusteMode === 'SET'
                                        ? 'Quanto há de verdade depois da contagem?'
                                        : 'Quanto?'
                                }
                            />
                        </Field>

                        {/* Preview do impacto */}
                        {preview && selectedItem && saldoEscopo && (
                            <div style={{
                                padding: '0.75rem 0.95rem', borderRadius: 11,
                                background: preview.depois < 0 ? '#FEF2F2' : '#F0FDF4',
                                border: `1px solid ${preview.depois < 0 ? '#FECACA' : '#BBF7D0'}`,
                                marginBottom: 12,
                            }}>
                                <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: preview.depois < 0 ? '#991B1B' : '#065F46', marginBottom: 4 }}>
                                    Impacto previsto · {saldoEscopo.escopo}
                                </div>
                                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontFamily: 'Orbitron, sans-serif' }}>{preview.antes}</span>
                                    <span style={{ color: '#94A3B8' }}>→</span>
                                    <span style={{ fontFamily: 'Orbitron, sans-serif', color: preview.depois < 0 ? '#DC2626' : '#059669' }}>{preview.depois}</span>
                                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>{selectedItem.unidade}</span>
                                    <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: preview.delta > 0 ? '#059669' : '#DC2626', fontWeight: 800 }}>
                                        {preview.delta > 0 ? '+' : ''}{preview.delta.toFixed(2)}
                                    </span>
                                </div>
                                {preview.depois < 0 && (
                                    <div style={{ fontSize: '0.72rem', color: '#991B1B', marginTop: 4 }}>
                                        ⚠️ Esta operação resultaria em saldo negativo. O backend vai bloquear.
                                    </div>
                                )}
                                {type === 'ENTRADA' && (
                                    <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 4 }}>
                                        Esta movimentação também credita {qtdNum} {selectedItem.unidade} na carreta destino.
                                    </div>
                                )}
                                {type === 'DEVOLUCAO' && (
                                    <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 4 }}>
                                        Esta movimentação também credita {qtdNum} {selectedItem.unidade} no estoque central.
                                    </div>
                                )}
                                {type === 'TRANSFERENCIA' && toTruckId && (
                                    <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 4 }}>
                                        Esta movimentação também credita {qtdNum} {selectedItem.unidade} na carreta destino.
                                    </div>
                                )}
                            </div>
                        )}

                        <Field
                            label={requires.observacao ? 'Observações (obrigatório)' : 'Observações'}
                            required={requires.observacao}>
                            <textarea
                                value={observacao}
                                onChange={(e) => setObservacao(e.target.value)}
                                placeholder={requires.observacao
                                    ? 'Justificativa do AJUSTE ou da PERDA (registrada no histórico de auditoria).'
                                    : 'Notas adicionais (opcional)'}
                                rows={3}
                                style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }}
                            />
                        </Field>

                        {error && (
                            <div style={{
                                padding: '0.65rem 0.85rem', borderRadius: 10,
                                background: '#FEF2F2', border: '1px solid #FECACA',
                                color: '#991B1B', fontSize: '0.78rem', marginTop: 4,
                            }}>{error}</div>
                        )}
                    </div>

                    {/* FOOTER */}
                    <div style={{
                        padding: '0.85rem 1.25rem', borderTop: '1px solid #F1F5F9',
                        background: '#FAFAFA',
                        display: 'flex', justifyContent: 'flex-end', gap: 10,
                    }}>
                        <button
                            onClick={onClose}
                            disabled={submitting}
                            style={{
                                padding: '0.55rem 1.1rem', borderRadius: 10,
                                background: '#F3F4F6', border: '1px solid #E5E7EB',
                                color: '#6B7280', fontWeight: 700, fontSize: '0.82rem',
                                cursor: submitting ? 'not-allowed' : 'pointer',
                            }}>
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            style={{
                                padding: '0.55rem 1.4rem', borderRadius: 10,
                                background: `linear-gradient(135deg, ${typeColor}, ${typeColor}dd)`,
                                border: 'none', color: '#fff',
                                fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.02em',
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                opacity: submitting ? 0.7 : 1,
                                boxShadow: `0 4px 12px ${typeColor}55`,
                            }}>
                            {submitting ? 'Registrando...' : `${MOV_TYPE_ICON[type]} Registrar`}
                        </button>
                    </div>
                </div>

                <style>{`@keyframes mov-fade-in { from { opacity: 0 } to { opacity: 1 } }`}</style>
            </div>
        </ModalPortal>
    );
}

// ── Helpers visuais ──────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 12 }}>
            <label style={{
                display: 'block', fontSize: '0.62rem', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                color: '#6B7280', marginBottom: 5,
            }}>
                {label}{required && <span style={{ color: '#F59E0B', marginLeft: 3 }}>*</span>}
            </label>
            {children}
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.55rem 0.8rem',
    borderRadius: 9,
    border: '1.5px solid #E5E7EB',
    background: '#FFFFFF',
    fontSize: '0.85rem',
    color: '#0F172A',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
};

const hintStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.68rem',
    color: '#94A3B8',
    marginTop: 4,
};

function ajusteModeBtnStyle(selected: boolean, color: string): React.CSSProperties {
    return {
        padding: '0.65rem 0.85rem', borderRadius: 10,
        background: selected ? `${color}12` : '#F9FAFB',
        border: `1.5px solid ${selected ? color : '#E5E7EB'}`,
        cursor: 'pointer', textAlign: 'left',
        color: selected ? color : '#475569',
        display: 'flex', flexDirection: 'column', gap: 3,
        transition: 'all 0.15s',
    };
}
