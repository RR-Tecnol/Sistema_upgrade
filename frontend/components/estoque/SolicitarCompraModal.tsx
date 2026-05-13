'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { stockApi, StockItem, CreatePurchaseRequestDto } from '@/lib/api/stock';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';
import { toast } from '@/components/ui/Toast';

/**
 * Modal de solicitação rápida de compra a partir de um item já cadastrado.
 * Pré-preenche quantidade sugerida (faltante para atingir o mínimo),
 * preço unitário do cadastro, fornecedor e calcula valor total em tempo real.
 *
 * Backend: cria StockPurchaseRequest com status PENDENTE.
 * Após aprovação por ADMIN, o sistema gera ContaPagar + StockMovement(REPOSICAO).
 */
export function SolicitarCompraModal({
    item,
    onClose,
    onSuccess,
}: {
    item: StockItem | null;
    onClose: () => void;
    onSuccess?: () => void;
}) {
    const initialQtd = item
        ? Math.max(1, Number(item.quantidadeMinima) - Number(item.quantidadeAtual) || 1)
        : 1;

    const [quantidade, setQuantidade] = useState<number | ''>(initialQtd);
    const [precoUnitario, setPrecoUnitario] = useState<number | ''>(
        item?.precoUnitario != null ? Number(item.precoUnitario) : '',
    );
    const [fornecedor, setFornecedor] = useState(item?.fornecedor ?? '');
    const [justificativa, setJustificativa] = useState('');
    const [urgente, setUrgente] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (item) {
            const sugestao = Math.max(1, Number(item.quantidadeMinima) - Number(item.quantidadeAtual) || 1);
            setQuantidade(sugestao);
            setPrecoUnitario(item.precoUnitario != null ? Number(item.precoUnitario) : '');
            setFornecedor(item.fornecedor ?? '');
            setJustificativa('');
            setUrgente(false);
            setError(null);
        }
    }, [item]);

    if (!item) return null;

    const qtdNum = typeof quantidade === 'number' ? quantidade : 0;
    const precoNum = typeof precoUnitario === 'number' ? precoUnitario : 0;
    const valorTotal = qtdNum * precoNum;

    const handleSubmit = async () => {
        setError(null);
        if (!qtdNum || qtdNum <= 0) {
            setError('Quantidade deve ser maior que 0.');
            return;
        }
        if (!precoNum || precoNum <= 0) {
            setError('Preço unitário é obrigatório (será o valor enviado para a conta a pagar gerada após aprovação).');
            return;
        }
        // Backend exige justificativa entre 10 e 1000 caracteres (DTO CreatePurchaseRequestDto).
        // Mantemos a mesma regra aqui para não enviar requisição que será rejeitada.
        if (!justificativa.trim() || justificativa.trim().length < 10) {
            setError('Justificativa é obrigatória — mínimo 10 caracteres (ela fica registrada na auditoria).');
            return;
        }
        if (justificativa.trim().length > 1000) {
            setError('Justificativa muito longa — máximo 1000 caracteres.');
            return;
        }

        setSubmitting(true);
        try {
            const dto: CreatePurchaseRequestDto = {
                stockItemId: item.id,
                quantidade: qtdNum,
                precoUnitario: precoNum,
                fornecedor: fornecedor.trim() || undefined,
                urgente,
                justificativa: justificativa.trim(),
            };
            await stockApi.purchaseRequests.create(dto);
            toast.success('Solicitação criada — aguardando aprovação do administrador para gerar a conta a pagar');
            onSuccess?.();
            onClose();
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Erro ao criar solicitação';
            setError(Array.isArray(msg) ? msg.join('; ') : msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ModalPortal>
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: MODAL_PORTAL_Z_INDEX,
                    background: 'rgba(2, 6, 23, 0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem',
                    animation: 'fade-in 0.2s ease',
                }}>
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: 'min(580px, 100%)',
                        maxHeight: '90vh',
                        background: '#FFFFFF',
                        borderRadius: 16,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        display: 'flex', flexDirection: 'column',
                        overflow: 'hidden',
                    }}>

                    {/* HEADER */}
                    <div style={{
                        padding: '1rem 1.25rem',
                        background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                        display: 'flex', alignItems: 'center', gap: 14, color: '#fff',
                    }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                            background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
                        }}>🛒</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.9 }}>
                                Nova solicitação de compra
                            </div>
                            <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.96rem', letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.nome}
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
                        {/* Item resumido */}
                        <div style={{
                            padding: '0.65rem 0.85rem', borderRadius: 10,
                            background: '#F8FAFC', border: '1px solid #E2E8F0',
                            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
                        }}>
                            <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                                Saldo atual: <strong style={{ color: '#0F172A' }}>{Number(item.quantidadeAtual)} {item.unidade}</strong>
                                {' · '}Mínimo: <strong style={{ color: '#0F172A' }}>{Number(item.quantidadeMinima)} {item.unidade}</strong>
                            </div>
                        </div>

                        <FormField label="Quantidade a comprar" required>
                            <input
                                type="number"
                                min={0}
                                step={0.001}
                                value={quantidade}
                                onChange={e => setQuantidade(e.target.value === '' ? '' : Number(e.target.value))}
                                style={inputStyle}
                            />
                            <small style={hintStyle}>
                                Sugestão: {initialQtd} {item.unidade} (para repor até o mínimo cadastrado).
                            </small>
                        </FormField>

                        <FormField label="Preço unitário (R$)" required>
                            <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={precoUnitario}
                                onChange={e => setPrecoUnitario(e.target.value === '' ? '' : Number(e.target.value))}
                                style={inputStyle}
                            />
                            <small style={hintStyle}>
                                {item.precoUnitario != null
                                    ? `Preço cadastrado: R$ ${Number(item.precoUnitario).toFixed(2).replace('.', ',')} (editável).`
                                    : 'Esse valor é o que será lançado em Contas a Pagar após aprovação.'}
                            </small>
                        </FormField>

                        {/* Valor total destacado */}
                        <div style={{
                            padding: '0.85rem 1rem', borderRadius: 12,
                            background: 'linear-gradient(135deg, #FFFDE7, #FEF3C7)',
                            border: '1.5px solid #FEF08A',
                            marginBottom: 14,
                            display: 'flex', alignItems: 'center', gap: 12,
                        }}>
                            <div style={{
                                width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                                background: 'linear-gradient(135deg, #FFD600, #E6A800)',
                                color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.1rem', fontWeight: 900,
                            }}>R$</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#B89B00' }}>
                                    Valor total da solicitação (vai para a conta a pagar após aprovação)
                                </div>
                                <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.45rem', color: '#7C5A00', lineHeight: 1.1, marginTop: 2 }}>
                                    R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div style={{ fontSize: '0.66rem', color: '#92400E', marginTop: 3 }}>
                                    {qtdNum} {item.unidade} × R$ {precoNum.toFixed(2).replace('.', ',')}
                                </div>
                            </div>
                        </div>

                        <FormField label="Fornecedor">
                            <input
                                type="text"
                                value={fornecedor}
                                onChange={e => setFornecedor(e.target.value)}
                                placeholder="Quem vai fornecer (opcional)"
                                style={inputStyle}
                            />
                        </FormField>

                        <FormField label="Justificativa" required>
                            <textarea
                                value={justificativa}
                                onChange={e => setJustificativa(e.target.value)}
                                placeholder="Por que essa compra é necessária? (mín. 10 caracteres — registrado no histórico de auditoria)"
                                rows={3}
                                maxLength={1000}
                                style={{
                                    ...inputStyle,
                                    resize: 'vertical',
                                    minHeight: 70,
                                    borderColor:
                                        justificativa.length === 0
                                            ? '#E5E7EB'
                                            : justificativa.trim().length < 10
                                                ? '#FBBF24'
                                                : '#10B981',
                                }}
                            />
                            <small
                                style={{
                                    ...hintStyle,
                                    color:
                                        justificativa.length === 0
                                            ? '#94A3B8'
                                            : justificativa.trim().length < 10
                                                ? '#B45309'
                                                : '#059669',
                                    fontWeight: 600,
                                }}>
                                {justificativa.trim().length < 10
                                    ? `Faltam ${10 - justificativa.trim().length} caractere(s) para o mínimo (10).`
                                    : `${justificativa.length}/1000 caracteres ✓`}
                            </small>
                        </FormField>

                        <label style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '0.65rem 0.85rem', borderRadius: 10,
                            border: `1px solid ${urgente ? '#FECACA' : '#E5E7EB'}`,
                            background: urgente ? '#FEF2F2' : '#F9FAFB',
                            cursor: 'pointer', marginBottom: 8,
                        }}>
                            <input
                                type="checkbox"
                                checked={urgente}
                                onChange={e => setUrgente(e.target.checked)}
                                style={{ accentColor: '#DC2626' }}
                            />
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: urgente ? '#DC2626' : '#475569' }}>
                                🔥 Marcar como URGENTE (vai aparecer no topo da fila de aprovação)
                            </span>
                        </label>

                        {error && (
                            <div style={{
                                padding: '0.65rem 0.85rem', borderRadius: 10,
                                background: '#FEF2F2', border: '1px solid #FECACA',
                                color: '#991B1B', fontSize: '0.78rem', marginTop: 8,
                            }}>{error}</div>
                        )}

                        {/* Fluxo explicativo */}
                        <div style={{
                            marginTop: 12,
                            padding: '0.75rem 0.9rem', borderRadius: 10,
                            background: '#EFF6FF', border: '1px solid #BFDBFE',
                            fontSize: '0.72rem', color: '#1E40AF', lineHeight: 1.55,
                        }}>
                            <strong>O que acontece depois:</strong>{' '}
                            esta solicitação vai para <Link href="/admin/estoque/solicitacoes" style={{ color: '#1D4ED8', fontWeight: 700 }}>Solicitações de Compra</Link>{' '}
                            com estado <strong>pendente de análise</strong>. Quando um administrador clicar em "Aprovar", o sistema cria automaticamente:
                            <br/>① uma <strong>conta a pagar</strong> de R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            {' '}② soma <strong>{qtdNum} {item.unidade}</strong> no saldo central
                            {' '}③ registra uma <strong>movimentação de reposição</strong> no histórico.
                        </div>
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
                                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                                border: 'none', color: '#fff',
                                fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.02em',
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                opacity: submitting ? 0.7 : 1,
                                boxShadow: '0 4px 12px rgba(245,158,11,0.35)',
                            }}>
                            {submitting ? 'Enviando...' : '🛒 Criar solicitação'}
                        </button>
                    </div>
                </div>

                <style>{`@keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }`}</style>
            </div>
        </ModalPortal>
    );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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
