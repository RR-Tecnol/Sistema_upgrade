'use client';

import { useCallback, useEffect, useState } from 'react';
import { stockApi, StockHistoryEntry, auditActionMeta } from '@/lib/api/stock';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';

export function StockItemAuditModal({
    open,
    stockItemId,
    itemNome,
    onClose,
}: {
    open: boolean;
    stockItemId: string | null;
    itemNome?: string;
    onClose: () => void;
}) {
    const [entries, setEntries] = useState<StockHistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!stockItemId) return;
        setLoading(true);
        setErr(null);
        try {
            const res = await stockApi.history({ stockItemId, limit: 80, page: 1 });
            setEntries(res.data);
        } catch (e: any) {
            setErr(e?.response?.data?.message || 'Erro ao carregar histórico');
        } finally {
            setLoading(false);
        }
    }, [stockItemId]);

    useEffect(() => {
        if (!open || !stockItemId) {
            setEntries([]);
            return;
        }
        load();
    }, [open, stockItemId, load]);

    if (!open) return null;

    return (
        <ModalPortal>
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15,23,42,0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16,
                    zIndex: MODAL_PORTAL_Z_INDEX,
                }}
                onClick={onClose}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: 'min(720px, 100%)',
                        maxHeight: '85vh',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        background: '#fff',
                        borderRadius: 14,
                        boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                    }}
                >
                    <div style={{ padding: '16px 20px', borderBottom: '2px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #FFFFFF 0%, #FFFDF5 100%)' }}>
                        <div>
                            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#B89B00', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Orbitron, sans-serif' }}>
                                Histórico de auditoria
                            </div>
                            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A', marginTop: 2 }}>{itemNome || 'Item'}</div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                border: 'none',
                                background: '#F1F5F9',
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                cursor: 'pointer',
                                fontWeight: 800,
                            }}
                        >
                            ✕
                        </button>
                    </div>
                    <div style={{ padding: 16, overflow: 'auto', flex: 1 }}>
                        {loading && (
                            <div style={{ padding: '2rem', textAlign: 'center' }}>
                                <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto 0.5rem' }} />
                                <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.62rem', letterSpacing: '0.12em', color: '#94A3B8', textTransform: 'uppercase' }}>Carregando...</p>
                            </div>
                        )}
                        {err && <div style={{ color: '#DC2626', padding: 12 }}>{err}</div>}
                        {!loading && !err && entries.length === 0 && (
                            <div style={{ color: '#64748B', textAlign: 'center', padding: 24 }}>Sem eventos de auditoria para este item.</div>
                        )}
                        {!loading &&
                            !err &&
                            entries.map((e) => {
                                const meta = auditActionMeta(e.action);
                                return (
                                    <div
                                        key={e.id}
                                        style={{
                                            padding: '12px 14px',
                                            borderRadius: 12,
                                            border: '1px solid #E2E8F0',
                                            marginBottom: 8,
                                            background: 'linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%)',
                                            transition: 'border-color 0.2s',
                                        }}
                                        onMouseEnter={ev => (ev.currentTarget.style.borderColor = '#FEF08A')}
                                        onMouseLeave={ev => (ev.currentTarget.style.borderColor = '#E2E8F0')}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 800, fontSize: '0.82rem', color: meta.color }}>{meta.icon} {meta.label}</span>
                                            <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>
                                                {new Date(e.createdAt).toLocaleString('pt-BR')}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 4 }}>
                                            {e.user?.name ?? 'Sistema'} · {e.user?.role ?? '—'}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}
