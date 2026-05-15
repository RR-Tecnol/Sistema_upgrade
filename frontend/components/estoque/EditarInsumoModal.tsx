'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    stockApi,
    StockItem,
    StockItemCategory,
    resolveCategoria,
    isLowStock,
    daysUntilExpiry,
} from '@/lib/api/stock';
import { toast } from '@/components/ui/Toast';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';

const CATEGORIAS_OPTS: { value: StockItemCategory; label: string }[] = [
    { value: 'CONSUMIVEL',  label: 'Consumível' },
    { value: 'DIDATICO',    label: 'Didático' },
    { value: 'LIMPEZA',     label: 'Limpeza' },
    { value: 'EQUIPAMENTO', label: 'Equipamento' },
    { value: 'EPI',         label: 'EPI' },
    { value: 'ALIMENTACAO', label: 'Alimentação' },
    { value: 'ESCRITORIO',  label: 'Escritório' },
    { value: 'OUTRO',       label: 'Outro' },
];

const labelCss: React.CSSProperties = {
    display: 'block', fontSize: '0.62rem', fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: '0.1em',
    color: '#B89B00', marginBottom: '0.35rem',
};

const inputCss: React.CSSProperties = {
    width: '100%', padding: '0.6rem 0.9rem', borderRadius: 10,
    border: '1.5px solid #E5E7EB', background: '#F9FAFB',
    fontSize: '0.85rem', color: '#111827', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
};

export function EditarInsumoModal({
    open,
    itemId,
    onClose,
    onSuccess,
}: {
    open: boolean;
    itemId: string | null;
    onClose: () => void;
    onSuccess?: () => void;
}) {
    const [item, setItem] = useState<StockItem | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<any>({});

    const load = useCallback(async () => {
        if (!itemId) return;
        setLoading(true);
        try {
            const data = await stockApi.items.getOne(itemId);
            setItem(data);
            setForm({
                nome: data.nome,
                codigoInterno: data.codigoInterno ?? '',
                categoria: data.categoria,
                unidade: data.unidade,
                quantidadeMinima: Number(data.quantidadeMinima),
                validade: data.validade ? data.validade.split('T')[0] : '',
                fornecedor: data.fornecedor ?? '',
                precoUnitario: data.precoUnitario != null ? Number(data.precoUnitario) : '',
                localizacao: data.localizacao ?? '',
                fotoUrl: data.fotoUrl ?? '',
                observacoes: data.observacoes ?? '',
            });
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Erro ao carregar item');
            onClose();
        } finally {
            setLoading(false);
        }
    }, [itemId, onClose]);

    useEffect(() => {
        if (open && itemId) load();
        if (!open) { setItem(null); setForm({}); }
    }, [open, itemId, load]);

    const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

    const handleSave = async () => {
        if (!itemId) return;
        setSaving(true);
        try {
            await stockApi.items.update(itemId, {
                nome: form.nome,
                codigoInterno: form.codigoInterno?.trim() || undefined,
                categoria: form.categoria,
                unidade: form.unidade,
                quantidadeMinima: Number(form.quantidadeMinima),
                validade: form.validade || undefined,
                fornecedor: form.fornecedor?.trim() || undefined,
                precoUnitario: form.precoUnitario !== '' ? Number(form.precoUnitario) : undefined,
                localizacao: form.localizacao?.trim() || undefined,
                fotoUrl: form.fotoUrl?.trim() || undefined,
                observacoes: form.observacoes?.trim() || undefined,
            });
            toast.success('Item atualizado com sucesso');
            onSuccess?.();
            onClose();
        } catch (e: any) {
            const msg = e?.response?.data?.message;
            toast.error(Array.isArray(msg) ? msg.join('; ') : (typeof msg === 'string' ? msg : 'Erro ao atualizar'));
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    const catInfo = item ? resolveCategoria(item) : { color: '#B89B00', icon: '📦' };
    const { color, icon } = catInfo;

    return (
        <ModalPortal>
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: MODAL_PORTAL_Z_INDEX,
                    background: 'rgba(2, 6, 23, 0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem', animation: 'mov-fade-in 0.2s ease',
                }}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: 'min(720px, 100%)', maxHeight: '92vh',
                        background: '#FFFFFF', borderRadius: 16,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        display: 'flex', flexDirection: 'column',
                        overflow: 'hidden',
                    }}
                >
                    {/* HEADER */}
                    <div style={{
                        padding: '1rem 1.25rem',
                        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                        display: 'flex', alignItems: 'center', gap: 14, color: '#fff',
                    }}>
                        <div style={{
                            width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                            background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                        }}>{icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.9 }}>
                                Editar Insumo
                            </div>
                            <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.05rem', letterSpacing: '0.04em' }}>
                                {item?.nome || 'Carregando...'}
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
                    <div className="custom-scrollbar" style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
                        {loading ? (
                            <div style={{ padding: '3rem', textAlign: 'center' }}>
                                <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 0.75rem' }} />
                                <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.65rem', letterSpacing: '0.15em', color: '#94A3B8', textTransform: 'uppercase' }}>
                                    Carregando...
                                </p>
                            </div>
                        ) : item ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <label style={labelCss}>Nome</label>
                                    <input style={inputCss} value={form.nome || ''} onChange={e => set('nome', e.target.value)} />
                                </div>
                                <div>
                                    <label style={labelCss}>Código Interno</label>
                                    <input style={inputCss} value={form.codigoInterno || ''} onChange={e => set('codigoInterno', e.target.value)} />
                                </div>
                                <div>
                                    <label style={labelCss}>Categoria</label>
                                    <select style={inputCss} value={form.categoria || ''} onChange={e => set('categoria', e.target.value)}>
                                        {CATEGORIAS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelCss}>Unidade</label>
                                    <input style={inputCss} value={form.unidade || ''} onChange={e => set('unidade', e.target.value)} />
                                </div>
                                <div>
                                    <label style={labelCss}>Quantidade Mínima</label>
                                    <input type="number" step="0.001" min={0} style={inputCss} value={form.quantidadeMinima ?? ''} onChange={e => set('quantidadeMinima', e.target.value)} />
                                </div>
                                <div>
                                    <label style={labelCss}>Preço Unitário (R$)</label>
                                    <input type="number" step="0.01" min={0} style={inputCss} value={form.precoUnitario ?? ''} onChange={e => set('precoUnitario', e.target.value)} />
                                </div>
                                <div>
                                    <label style={labelCss}>Validade</label>
                                    <input type="date" style={inputCss} value={form.validade || ''} onChange={e => set('validade', e.target.value)} />
                                </div>
                                <div>
                                    <label style={labelCss}>Fornecedor</label>
                                    <input style={inputCss} value={form.fornecedor || ''} onChange={e => set('fornecedor', e.target.value)} />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={labelCss}>Localização</label>
                                    <input style={inputCss} value={form.localizacao || ''} onChange={e => set('localizacao', e.target.value)} placeholder="Ex: Depósito Central — Prateleira A3" />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={labelCss}>URL da Foto</label>
                                    <input style={inputCss} value={form.fotoUrl || ''} onChange={e => set('fotoUrl', e.target.value)} placeholder="https://..." />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={labelCss}>Observações</label>
                                    <textarea style={{ ...inputCss, minHeight: 80, resize: 'vertical' }} value={form.observacoes || ''} onChange={e => set('observacoes', e.target.value)} />
                                </div>

                                {/* Info */}
                                <div style={{
                                    gridColumn: '1 / -1',
                                    padding: '0.7rem 1rem', borderRadius: 10,
                                    background: 'rgba(8, 145, 178, 0.06)',
                                    border: '1px solid rgba(8, 145, 178, 0.2)',
                                    display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
                                    fontSize: '0.75rem', color: '#0369A1',
                                }}>
                                    <span>ℹ️</span>
                                    <div>
                                        A <strong>quantidade em estoque</strong> só é alterada via movimentações (entrada/saída/ajuste) para garantir auditoria completa.
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* FOOTER */}
                    {!loading && item && (
                        <div style={{
                            padding: '0.85rem 1.25rem', borderTop: '1px solid #F1F5F9',
                            background: '#FAFAFA',
                            display: 'flex', justifyContent: 'flex-end', gap: 10,
                        }}>
                            <button
                                onClick={onClose}
                                disabled={saving}
                                style={{
                                    padding: '0.55rem 1.1rem', borderRadius: 10,
                                    background: '#F3F4F6', border: '1px solid #E5E7EB',
                                    color: '#6B7280', fontWeight: 700, fontSize: '0.82rem',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                style={{
                                    padding: '0.55rem 1.4rem', borderRadius: 10,
                                    background: `linear-gradient(135deg, ${color}, ${color}dd)`,
                                    border: 'none', color: '#fff',
                                    fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.02em',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    opacity: saving ? 0.7 : 1,
                                    boxShadow: `0 4px 12px ${color}55`,
                                }}
                            >
                                {saving ? 'Salvando...' : '✓ Salvar alterações'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <style>{`@keyframes mov-fade-in { from { opacity: 0 } to { opacity: 1 } }`}</style>
        </ModalPortal>
    );
}
