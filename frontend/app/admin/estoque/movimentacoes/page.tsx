'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
    stockApi,
    StockMovement,
    StockMovementType,
    MOV_TYPE_LABEL,
    MOV_TYPE_COLOR,
    MOV_TYPE_ICON,
} from '@/lib/api/stock';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { EstoqueMovimentacoesSidebarTutorial } from '@/components/admin/adminSidebarTutorials';
import { toast } from '@/components/ui/Toast';
import { MovimentacaoModal } from '@/components/estoque/MovimentacaoModal';
import { acoesApi, Acao } from '@/lib/api/acoes';
import { unwrapListData } from '@/lib/api/pagination';
import {
    EstoqueSection,
    EstoqueSectionHeader,
    EstoqueEmptyState,
    EstoqueLoadingState,
    ESTOQUE_SECTION_CSS,
} from '@/components/estoque/EstoqueSection';

const TYPE_OPTS: { value: 'all' | StockMovementType; label: string }[] = [
    { value: 'all',          label: 'Todos os tipos' },
    { value: 'ENTRADA',      label: 'Entrada' },
    { value: 'SAIDA',        label: 'Saída' },
    { value: 'TRANSFERENCIA', label: 'Transferência' },
    { value: 'DEVOLUCAO',    label: 'Devolução' },
    { value: 'AJUSTE',       label: 'Ajuste' },
    { value: 'PERDA',        label: 'Perda' },
    { value: 'REPOSICAO',    label: 'Reposição' },
];

export default function MovimentacoesPage() {
    const [movs, setMovs] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [type, setType] = useState<'all' | StockMovementType>('all');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [acaoId, setAcaoId] = useState<string>('');
    const [acoes, setAcoes] = useState<Acao[]>([]);
    const [movOpen, setMovOpen] = useState(false);

    useEffect(() => {
        acoesApi
            .listar({ limit: 500, page: 1 })
            .then((raw) => setAcoes(unwrapListData<Acao>(raw)))
            .catch(() => {});
    }, []);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await stockApi.movements.list({
                type: type === 'all' ? undefined : type,
                from: from || undefined,
                to: to || undefined,
                acaoId: acaoId || undefined,
                limit: 200,
            });
            setMovs(data);
        } catch (e) {
            console.error('[Movimentações]', e);
            toast.error('Erro ao carregar histórico');
        } finally {
            setLoading(false);
        }
    }, [type, from, to, acaoId]);

    useEffect(() => { load(); }, [load]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
            <style>{ESTOQUE_SECTION_CSS}</style>
            <AdminHeaderHero
                title="MOVIMENTAÇÕES"
                subtitle="Histórico imutável de toda variação de saldo do estoque"
                badge={`${movs.length} ${movs.length === 1 ? 'registro' : 'registros'}`}
                rightSlot={(
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            type="button"
                            onClick={() => setMovOpen(true)}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '10px 16px', borderRadius: 12, cursor: 'pointer',
                                background: 'linear-gradient(135deg,#6366F1,#4F46E5)',
                                color: '#fff', border: '1px solid rgba(99,102,241,0.5)',
                                fontWeight: 800, fontSize: '0.78rem',
                                fontFamily: 'Orbitron, sans-serif', letterSpacing: '.04em',
                                boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
                            }}>
                            + Nova movimentação
                        </button>
                        <Link href="/admin/estoque" style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '10px 16px', borderRadius: 12, textDecoration: 'none',
                            background: 'rgba(255,255,255,0.06)', color: '#fff',
                            border: '1px solid rgba(255,255,255,0.2)',
                            fontWeight: 700, fontSize: '0.78rem',
                        }}>← Voltar</Link>
                    </div>
                )}
            />

            <EstoqueMovimentacoesSidebarTutorial />

            {/* FILTROS */}
            <EstoqueSection delay={80} accent="#6366F1" minimal>
                <EstoqueSectionHeader
                    icon="🔍"
                    title="Filtros"
                    subtitle="Refine por tipo, período ou ação específica"
                    accent="#6366F1"
                    action={(type !== 'all' || from || to || acaoId) ? (
                        <button
                            onClick={() => { setType('all'); setFrom(''); setTo(''); setAcaoId(''); }}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '6px 12px', borderRadius: 9,
                                fontFamily: 'Orbitron, sans-serif', fontWeight: 700,
                                fontSize: '0.66rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                                color: '#DC2626',
                                background: '#FEF2F2',
                                border: '1px solid #FECACA',
                                cursor: 'pointer',
                            }}>
                            ✕ Limpar
                        </button>
                    ) : null}
                />
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '0.75rem',
                }}>
                    <div>
                        <label style={mFilterLabel}>Tipo</label>
                        <select
                            value={type}
                            onChange={e => setType(e.target.value as any)}
                            style={mFilterInput}>
                            {TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={mFilterLabel}>De</label>
                        <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={mFilterInput} />
                    </div>
                    <div>
                        <label style={mFilterLabel}>Até</label>
                        <input type="date" value={to} onChange={e => setTo(e.target.value)} style={mFilterInput} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={mFilterLabel}>Ação</label>
                        <select
                            value={acaoId}
                            onChange={e => setAcaoId(e.target.value)}
                            style={mFilterInput}>
                            <option value="">Todas as ações</option>
                            {acoes.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.nome} {a.cidadeNome ? `· ${a.cidadeNome}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </EstoqueSection>

            {/* TABELA */}
            <EstoqueSection delay={140} accent="#059669">
                <EstoqueSectionHeader
                    icon="🔄"
                    title="Histórico de movimentações"
                    subtitle="Tabela imutável — cada linha é uma movimentação auditada do estoque"
                    accent="#059669"
                    action={(
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '5px 10px', borderRadius: 9,
                            fontFamily: 'Orbitron, sans-serif', fontWeight: 700,
                            fontSize: '0.62rem', letterSpacing: '0.06em',
                            color: '#059669', background: '#05966910',
                            border: '1px solid #05966930',
                        }}>
                            {movs.length} {movs.length === 1 ? 'registro' : 'registros'}
                        </span>
                    )}
                />
                {loading ? (
                    <EstoqueLoadingState label="Carregando movimentações…" />
                ) : movs.length === 0 ? (
                    <EstoqueEmptyState icon="🔄" label="Nenhuma movimentação encontrada com os filtros atuais" />
                ) : (
                    <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #F3F4F6' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead>
                                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                    <th style={thStyle}>Tipo</th>
                                    <th style={thStyle}>Item</th>
                                    <th style={thStyle}>De / Para</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Quantidade</th>
                                    <th style={thStyle}>Registrado por</th>
                                    <th style={thStyle}>Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movs.map(m => {
                                    const color = MOV_TYPE_COLOR[m.type];
                                    return (
                                        <tr key={m.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                            <td style={tdStyle}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                                    padding: '3px 9px', borderRadius: 20,
                                                    background: `${color}15`, border: `1px solid ${color}35`,
                                                    fontSize: '0.7rem', fontWeight: 700, color,
                                                }}>
                                                    <span>{MOV_TYPE_ICON[m.type]}</span> {m.type}
                                                </span>
                                            </td>
                                            <td style={tdStyle}>
                                                <Link href={`/admin/estoque/itens/${m.stockItemId}`} style={{
                                                    color: '#111827', textDecoration: 'none', fontWeight: 600,
                                                }}>
                                                    {m.stockItem?.nome ?? '—'}
                                                </Link>
                                            </td>
                                            <td style={tdStyle}>
                                                <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                                                    {m.fromTruck && m.toTruck
                                                        ? `${m.fromTruck.identifier} → ${m.toTruck.identifier}`
                                                        : m.fromTruck
                                                            ? `de ${m.fromTruck.identifier}` + (m.acao ? ` (${m.acao.nome})` : '')
                                                            : m.toTruck
                                                                ? `→ ${m.toTruck.identifier}`
                                                                : 'Central'}
                                                </span>
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                <span style={{
                                                    fontFamily: 'Orbitron, sans-serif', fontWeight: 800,
                                                    fontSize: '0.92rem', color,
                                                }}>
                                                    {Number(m.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {m.stockItem?.unidade ?? ''}
                                                </span>
                                            </td>
                                            <td style={tdStyle}>
                                                <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                                                    {m.registrar?.name ?? '—'}
                                                </span>
                                                <div style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>
                                                    {m.registrar?.role ?? ''}
                                                </div>
                                            </td>
                                            <td style={tdStyle}>
                                                <span style={{ fontSize: '0.74rem', color: '#6B7280', fontFamily: 'JetBrains Mono, monospace' }}>
                                                    {new Date(m.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </EstoqueSection>

            <MovimentacaoModal
                open={movOpen}
                onClose={() => setMovOpen(false)}
                onSuccess={() => { load(); }}
            />
        </div>
    );
}

const mFilterLabel: React.CSSProperties = {
    display: 'block',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: '0.6rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#64748B',
    marginBottom: 5,
};

const mFilterInput: React.CSSProperties = {
    width: '100%',
    padding: '7px 11px',
    borderRadius: 9,
    border: '1px solid #E5E7EB',
    fontSize: '0.78rem',
    color: '#111827',
    outline: 'none',
    background: '#FAFAFA',
    cursor: 'pointer',
};

const thStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    fontSize: '0.62rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#9CA3AF',
    textAlign: 'left',
};

const tdStyle: React.CSSProperties = {
    padding: '0.85rem 1rem',
    fontSize: '0.85rem',
    color: '#374151',
    verticalAlign: 'middle',
};
