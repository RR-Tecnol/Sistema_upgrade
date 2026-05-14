'use client';

import { useEffect, useState } from 'react';
import {
    stockApi,
    BaixaStatusResponse,
    BaixaKitItem,
    TratarSobraItemPayload,
} from '@/lib/api/stock';

interface Props {
    acaoId: string;
    acaoNome: string;
    open: boolean;
    onClose: () => void;
    /** Chamado após concluir tudo (sobra tratada OU usuário escolheu seguir sem tratar) */
    onConfirm: () => void;
}

type DecisaoLinha = {
    stockItemId: string;
    nome: string;
    unidade: string;
    fromTruckId: string;
    truckIdentifier: string;
    quantidade: number;
    decisao: 'DEVOLVER' | 'MANTER' | 'PERDA';
    motivo?: string;
};

type Etapa = 'ALERTA' | 'DETALHADO';

/**
 * Modal que intercepta a conclusão de uma ação:
 * - Etapa ALERTA (B): mostra que há sobra, oferece 3 caminhos:
 *     [Auto-devolver tudo] (atalho), [Decidir item por item] (etapa DETALHADO),
 *     [Ignorar e concluir mesmo assim].
 * - Etapa DETALHADO (A): por item, escolhe DEVOLVER/MANTER/PERDA.
 */
export function ConcluirAcaoModal({ acaoId, acaoNome, open, onClose, onConfirm }: Props) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [data, setData] = useState<BaixaStatusResponse | null>(null);
    const [etapa, setEtapa] = useState<Etapa>('ALERTA');
    const [linhas, setLinhas] = useState<DecisaoLinha[]>([]);

    useEffect(() => {
        if (!open) return;
        let alive = true;
        (async () => {
            setLoading(true);
            setErr(null);
            try {
                const status = await stockApi.baixa.status(acaoId);
                if (!alive) return;
                setData(status);
                // Pré-popula decisões: por padrão DEVOLVER
                setLinhas(
                    status.sobra
                        .filter((s) => s.quantidadeRestante > 0)
                        .map((s) => buildDefaultLinha(s)),
                );
                setEtapa('ALERTA');
            } catch (e: any) {
                setErr(e?.response?.data?.message ?? 'Erro ao carregar dados da ação');
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [acaoId, open]);

    const buildDefaultLinha = (s: BaixaKitItem): DecisaoLinha => {
        const truckComSaldo = s.truckStocks.find((ts) => Number(ts.quantidadeAtual) > 0);
        return {
            stockItemId: s.stockItemId,
            nome: s.stockItem.nome,
            unidade: s.stockItem.unidade,
            fromTruckId: truckComSaldo?.truckId ?? '',
            truckIdentifier: truckComSaldo?.truck?.identifier ?? '—',
            quantidade: Math.min(
                s.quantidadeRestante,
                Number(truckComSaldo?.quantidadeAtual ?? 0),
            ),
            decisao: 'DEVOLVER',
        };
    };

    const updateLinha = (i: number, patch: Partial<DecisaoLinha>) => {
        setLinhas((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
    };

    if (!open) return null;

    // ── ações dos botões ───────────────────────────────────────────
    const submitAutoDevolverTudo = async () => {
        if (!linhas.length) {
            onConfirm();
            return;
        }
        setSubmitting(true);
        setErr(null);
        try {
            const items: TratarSobraItemPayload[] = linhas
                .filter((l) => l.fromTruckId && l.quantidade > 0)
                .map((l) => ({
                    stockItemId: l.stockItemId,
                    fromTruckId: l.fromTruckId,
                    quantidade: l.quantidade,
                    decisao: 'DEVOLVER',
                }));
            if (items.length > 0) {
                await stockApi.baixa.tratarSobra(acaoId, items);
            }
            onConfirm();
        } catch (e: any) {
            setErr(e?.response?.data?.message ?? 'Erro ao devolver sobra');
        } finally {
            setSubmitting(false);
        }
    };

    const submitDetalhado = async () => {
        for (const l of linhas) {
            if (l.decisao === 'PERDA' && (!l.motivo || l.motivo.trim().length < 3)) {
                setErr(`Item "${l.nome}": PERDA exige motivo (mín. 3 caracteres)`);
                return;
            }
        }
        setSubmitting(true);
        setErr(null);
        try {
            const items: TratarSobraItemPayload[] = linhas
                .filter((l) => l.fromTruckId && l.quantidade > 0)
                .map((l) => ({
                    stockItemId: l.stockItemId,
                    fromTruckId: l.fromTruckId,
                    quantidade: l.quantidade,
                    decisao: l.decisao,
                    motivo: l.motivo,
                }));
            if (items.length > 0) {
                await stockApi.baixa.tratarSobra(acaoId, items);
            }
            onConfirm();
        } catch (e: any) {
            setErr(e?.response?.data?.message ?? 'Erro ao tratar sobra');
        } finally {
            setSubmitting(false);
        }
    };

    const submitIgnorar = () => {
        // não toca em estoque, apenas conclui
        onConfirm();
    };

    return (
        <div
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 100,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'white', borderRadius: 14, width: 'min(720px, 95vw)',
                    maxHeight: '90vh', overflow: 'auto', padding: 28, position: 'relative',
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: 12, right: 14, background: 'transparent',
                        border: 'none', fontSize: 22, cursor: 'pointer', color: '#6B7280',
                    }}
                    aria-label="Fechar"
                >
                    ×
                </button>

                <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800 }}>
                    ✅ Concluir ação: <span style={{ color: '#1F2937' }}>{acaoNome}</span>
                </h2>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Carregando…</div>
                ) : err && !data ? (
                    <div style={{ padding: 12, background: '#FEE2E2', color: '#991B1B', borderRadius: 8 }}>{err}</div>
                ) : !data || !data.temSobra ? (
                    <>
                        <p style={{ color: '#6B7280', fontSize: 14, marginTop: 8 }}>
                            Nenhuma sobra no kit. Tudo o que estava previsto já foi consumido. ✨
                        </p>
                        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button onClick={onClose} style={btnSecondary}>Cancelar</button>
                            <button onClick={onConfirm} style={btnPrimary}>Concluir ação</button>
                        </div>
                    </>
                ) : etapa === 'ALERTA' ? (
                    <>
                        <div style={{
                            marginTop: 8, padding: 14, background: '#FEF3C7', border: '1px solid #FCD34D',
                            borderRadius: 8,
                        }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#92400E', marginBottom: 4 }}>
                                ⚠ Esta ação tem sobra no kit
                            </div>
                            <div style={{ fontSize: 13, color: '#92400E' }}>
                                {data.sobra.length} item(ns) com saldo planejado e não consumido — total restante:{' '}
                                <strong>{data.totalRestante.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</strong> unidade(s).
                            </div>
                        </div>

                        <p style={{ fontSize: 13, color: '#4B5563', marginTop: 16 }}>
                            O que deseja fazer com a sobra antes de concluir?
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                            <ActionCard
                                title="↩ Auto-devolver tudo à central"
                                desc="Toda sobra do kit volta automaticamente para o estoque central com movimentação DEVOLUCAO registrada. Rápido."
                                color="#10B981"
                                onClick={submitAutoDevolverTudo}
                                disabled={submitting}
                            />
                            <ActionCard
                                title="🎯 Decidir item por item"
                                desc="Escolha por linha: devolver à central, manter na carreta ou registrar como perda (com motivo). Máximo controle."
                                color="#3B82F6"
                                onClick={() => setEtapa('DETALHADO')}
                                disabled={submitting}
                            />
                            <ActionCard
                                title="⏭ Ignorar e concluir mesmo assim"
                                desc="A sobra permanece na carreta. Nenhuma movimentação é gerada agora — você pode resolver depois manualmente."
                                color="#6B7280"
                                onClick={submitIgnorar}
                                disabled={submitting}
                            />
                        </div>

                        {err && <div style={{ marginTop: 12, color: '#DC2626', fontSize: 13 }}>{err}</div>}

                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={onClose} style={btnSecondary} disabled={submitting}>Cancelar</button>
                        </div>
                    </>
                ) : (
                    /* ─── ETAPA DETALHADO ─── */
                    <>
                        <p style={{ fontSize: 13, color: '#4B5563', marginTop: 12 }}>
                            Para cada item da sobra, escolha o destino:
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                            {linhas.map((l, i) => (
                                <div
                                    key={l.stockItemId}
                                    style={{
                                        padding: 12, background: '#F9FAFB', border: '1px solid #E5E7EB',
                                        borderRadius: 8,
                                    }}
                                >
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{l.nome}</div>
                                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                                        {l.quantidade} {l.unidade} na carreta {l.truckIdentifier}
                                    </div>

                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {(['DEVOLVER', 'MANTER', 'PERDA'] as const).map((opt) => {
                                            const selected = l.decisao === opt;
                                            const opts = {
                                                DEVOLVER: { label: '↩ Devolver à central', bg: '#D1FAE5', color: '#065F46' },
                                                MANTER:   { label: '📦 Manter na carreta', bg: '#DBEAFE', color: '#1E40AF' },
                                                PERDA:    { label: '⚠ Registrar perda', bg: '#FEE2E2', color: '#991B1B' },
                                            }[opt];
                                            return (
                                                <button
                                                    key={opt}
                                                    onClick={() => updateLinha(i, { decisao: opt })}
                                                    style={{
                                                        padding: '6px 10px',
                                                        background: selected ? opts.bg : 'white',
                                                        color: selected ? opts.color : '#374151',
                                                        border: `1px solid ${selected ? opts.color : '#D1D5DB'}`,
                                                        borderRadius: 6, fontSize: 12, fontWeight: 600,
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    {opts.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {l.decisao === 'PERDA' && (
                                        <input
                                            type="text"
                                            placeholder="Motivo da perda (vencimento, dano, extravio…) — obrigatório"
                                            value={l.motivo ?? ''}
                                            onChange={(e) => updateLinha(i, { motivo: e.target.value })}
                                            style={{
                                                marginTop: 8, width: '100%', padding: '6px 10px',
                                                border: '1px solid #FCA5A5', borderRadius: 6, fontSize: 12,
                                            }}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        {err && <div style={{ marginTop: 12, color: '#DC2626', fontSize: 13 }}>{err}</div>}

                        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <button onClick={() => setEtapa('ALERTA')} style={btnSecondary} disabled={submitting}>
                                ← Voltar
                            </button>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={onClose} style={btnSecondary} disabled={submitting}>Cancelar</button>
                                <button onClick={submitDetalhado} style={btnPrimary} disabled={submitting}>
                                    {submitting ? 'Processando…' : 'Confirmar e concluir'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function ActionCard({
    title,
    desc,
    color,
    onClick,
    disabled,
}: {
    title: string;
    desc: string;
    color: string;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                textAlign: 'left',
                padding: 14,
                background: 'white',
                border: `1px solid ${color}33`,
                borderLeft: `4px solid ${color}`,
                borderRadius: 8,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                transition: 'all .15s',
            }}
            onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = `${color}08`; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
        >
            <div style={{ fontSize: 14, fontWeight: 700, color }}>{title}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{desc}</div>
        </button>
    );
}

const btnPrimary: React.CSSProperties = {
    padding: '9px 18px', background: '#1F2937', color: 'white', border: 'none',
    borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
    padding: '9px 16px', background: 'white', color: '#374151', border: '1px solid #D1D5DB',
    borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
};
