'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
    stockApi,
    StockMovement,
    StockMovementType,
    StockHistoryEntry,
    MOV_TYPE_LABEL,
    MOV_TYPE_COLOR,
    auditActionMeta,
} from '@/lib/api/stock';
import { toast } from '@/components/ui/Toast';
import { acoesApi, Acao } from '@/lib/api/acoes';

const TYPE_OPTS: { value: 'all' | StockMovementType; label: string }[] = [
    { value: 'all', label: 'Todos os tipos' },
    { value: 'ENTRADA', label: '📥 Entrada' },
    { value: 'SAIDA', label: '📤 Saída' },
    { value: 'TRANSFERENCIA', label: '🔄 Transferência' },
    { value: 'DEVOLUCAO', label: '↩️ Devolução' },
    { value: 'AJUSTE', label: '🔧 Ajuste' },
    { value: 'PERDA', label: '❌ Perda' },
    { value: 'REPOSICAO', label: '🛒 Reposição' },
];

/* ── Upgrade design tokens ── */
const labelStyle: React.CSSProperties = {
    fontSize: '0.62rem',
    fontWeight: 800,
    color: '#B89B00',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    marginTop: 4,
    padding: '9px 12px',
    borderRadius: 10,
    border: '1.5px solid #E2E8F0',
    background: '#FFFFFF',
    fontSize: '0.82rem',
    color: '#0F172A',
    fontWeight: 600,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
};

const TH: React.CSSProperties = {
    textAlign: 'left',
    fontSize: '0.65rem',
    fontWeight: 800,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    padding: '12px 14px',
    borderBottom: '2px solid #E2E8F0',
    background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
    whiteSpace: 'nowrap',
};

const TD: React.CSSProperties = {
    padding: '13px 14px',
    borderBottom: '1px solid #F1F5F9',
    fontSize: '0.82rem',
    verticalAlign: 'middle',
};

interface Props {
    truckId?: string;
    showAudit?: boolean;
    /** Filtro opcional em `GET /stock/history` (ex.: vindo de `?action=` no hub). */
    auditAction?: string;
}

export function MovimentacoesRecentesPanel({ truckId, showAudit, auditAction }: Props) {
    const [movs, setMovs] = useState<StockMovement[]>([]);
    const [audit, setAudit] = useState<StockHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [type, setType] = useState<'all' | StockMovementType>('all');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [acaoId, setAcaoId] = useState('');
    const [acoes, setAcoes] = useState<Acao[]>([]);

    useEffect(() => {
        acoesApi.listar().then(setAcoes).catch(() => {});
    }, []);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await stockApi.movements.list({
                type: type === 'all' ? undefined : type,
                from: from || undefined,
                to: to || undefined,
                acaoId: acaoId || undefined,
                truckId: truckId || undefined,
                limit: 200,
            });
            setMovs(data);
            if (showAudit) {
                const h = await stockApi.history({
                    page: 1,
                    limit: 60,
                    action: auditAction || undefined,
                });
                setAudit(h.data);
            } else {
                setAudit([]);
            }
        } catch (e) {
            console.error('[MovimentacoesRecentesPanel]', e);
            toast.error('Erro ao carregar movimentações');
        } finally {
            setLoading(false);
        }
    }, [type, from, to, acaoId, truckId, showAudit, auditAction]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* ── FILTROS ── */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))',
                    gap: 12,
                    padding: '16px 18px',
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #FFFDF5 50%, #F8FAFC 100%)',
                    borderRadius: 14,
                    border: '1.5px solid #E5D88A55',
                    boxShadow: '0 2px 12px rgba(184,155,0,0.06)',
                }}
            >
                <div>
                    <label style={labelStyle}>⇅ Tipo</label>
                    <select value={type} onChange={(e) => setType(e.target.value as any)} style={inputStyle}>
                        {TYPE_OPTS.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>📅 De</label>
                    <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle} />
                </div>
                <div>
                    <label style={labelStyle}>📅 Até</label>
                    <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
                </div>
                <div>
                    <label style={labelStyle}>🎯 Ação</label>
                    <select value={acaoId} onChange={(e) => setAcaoId(e.target.value)} style={inputStyle}>
                        <option value="">Todas</option>
                        {acoes.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.nome}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── TABLE HEADER ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{
                    fontFamily: 'Orbitron, sans-serif',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    letterSpacing: '0.12em',
                    color: '#B89B00',
                    textTransform: 'uppercase',
                }}>
                    Movimentações recentes
                </div>
                <span style={{
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: '#FFFDE7',
                    border: '1px solid #FEF08A',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#B89B00',
                }}>
                    {movs.length} registros
                </span>
            </div>

            {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                    <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 0.75rem' }} />
                    <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.65rem', letterSpacing: '0.15em', color: '#94A3B8', textTransform: 'uppercase' }}>
                        Carregando...
                    </p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid #E2E8F0', background: '#fff', boxShadow: '0 2px 12px rgba(15,23,42,0.06)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                        <thead>
                            <tr>
                                <th style={TH}>Data</th>
                                <th style={TH}>Tipo</th>
                                <th style={TH}>Item</th>
                                <th style={{ ...TH, textAlign: 'right' }}>Qtd</th>
                                <th style={{ ...TH, textAlign: 'right' }}>Valor (R$)</th>
                                <th style={TH}>Registou</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movs.map((m) => (
                                <tr
                                    key={m.id}
                                    style={{ transition: 'background 0.15s ease' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#FFFDF5')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <td style={{ ...TD, color: '#64748B', fontSize: '0.78rem', fontFamily: 'JetBrains Mono, monospace' }}>{new Date(m.createdAt).toLocaleString('pt-BR')}</td>
                                    <td style={TD}>
                                        <span style={{
                                            fontWeight: 800,
                                            fontSize: '0.7rem',
                                            color: MOV_TYPE_COLOR[m.type],
                                            padding: '3px 8px',
                                            borderRadius: 6,
                                            background: `${MOV_TYPE_COLOR[m.type]}12`,
                                            border: `1px solid ${MOV_TYPE_COLOR[m.type]}25`,
                                            letterSpacing: '0.04em',
                                        }}>
                                            {MOV_TYPE_LABEL[m.type]}
                                        </span>
                                    </td>
                                    <td style={TD}>
                                        {m.stockItem ? (
                                            <Link href={`/admin/estoque/itens/${m.stockItemId}`} style={{ fontWeight: 700, color: '#0F172A', textDecoration: 'none', fontSize: '0.82rem' }}>
                                                {m.stockItem.nome}
                                            </Link>
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                    <td style={{ ...TD, textAlign: 'right', fontWeight: 800, fontFamily: 'Orbitron, sans-serif', fontSize: '0.82rem' }}>{Number(m.quantidade)}</td>
                                    <td style={{ ...TD, textAlign: 'right', fontFamily: 'Orbitron, sans-serif', fontSize: '0.8rem' }}>
                                        {(() => {
                                            const preco = Number(m.stockItem?.precoUnitario ?? 0);
                                            if (!preco || preco <= 0) return <span style={{ color: '#94A3B8' }}>—</span>;
                                            const valor = Number(m.quantidade) * preco;
                                            return <span style={{ fontWeight: 700, color: '#059669' }}>R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
                                        })()}
                                    </td>
                                    <td style={{ ...TD, fontSize: '0.78rem', color: '#64748B' }}>{m.registrar?.name ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {movs.length === 0 && (
                        <div style={{
                            padding: '3rem',
                            textAlign: 'center',
                            background: 'linear-gradient(180deg, #FFFDF5 0%, #FAFBFC 100%)',
                        }}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FFFDE7', border: '1.5px solid #FEF08A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 12px' }}>↕</div>
                            <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>Sem movimentações</div>
                            <div style={{ fontSize: '0.82rem', marginTop: 6, color: '#64748B' }}>Nenhuma movimentação registada com estes filtros.</div>
                        </div>
                    )}
                </div>
            )}

            {showAudit && audit.length > 0 && (
                <div>
                    <div style={{
                        fontFamily: 'Orbitron, sans-serif',
                        fontWeight: 800,
                        fontSize: '0.72rem',
                        letterSpacing: '0.12em',
                        color: '#B89B00',
                        textTransform: 'uppercase',
                        marginBottom: 12,
                    }}>
                        Auditoria recente
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {audit.map((e) => {
                            const meta = auditActionMeta(e.action);
                            return (
                                <div
                                    key={e.id}
                                    style={{
                                        padding: '12px 14px',
                                        borderRadius: 12,
                                        border: '1px solid #E2E8F0',
                                        background: 'linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%)',
                                        transition: 'border-color 0.2s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#FEF08A')}
                                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
                                >
                                    <div style={{ fontWeight: 800, color: meta.color, fontSize: '0.8rem' }}>
                                        {meta.icon} {meta.label}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 4 }}>
                                        {e.user?.name} · <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{new Date(e.createdAt).toLocaleString('pt-BR')}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
