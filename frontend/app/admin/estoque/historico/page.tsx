'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    stockApi,
    StockHistoryEntry,
    StockHistoryResponse,
    auditActionMeta,
    AUDIT_ACTION_META,
} from '@/lib/api/stock';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { EstoqueHistoricoSidebarTutorial } from '@/components/admin/adminSidebarTutorials';
import {
    EstoqueSection,
    EstoqueSectionHeader,
    EstoqueEmptyState,
    EstoqueLoadingState,
    ESTOQUE_SECTION_CSS,
} from '@/components/estoque/EstoqueSection';

const ROLE_LABEL: Record<string, string> = {
    ADMIN: 'Administrador',
    IT_ADMIN: 'Admin TI',
    COORDINATOR: 'Coordenador',
    FINANCIAL: 'Financeiro',
    DRIVER: 'Motorista',
    TEACHER: 'Professor',
    STUDENT: 'Aluno',
};

const TABLE_LABEL: Record<string, string> = {
    stock_items: 'Item',
    stock_movements: 'Movimentação',
    stock_purchase_requests: 'Solicitação de Compra',
};

const TECHNICAL_FALLBACK_LABEL: Record<string, string> = {
    action: 'Tipo de evento',
    tableName: 'Área do sistema',
    recordId: 'Registro',
    userId: 'Usuário',
    ipAddress: 'IP',
    userAgent: 'Navegador/dispositivo',
};

const VALUE_LABEL: Record<string, string> = {
    true: 'Sim',
    false: 'Não',
    PENDENTE: 'Pendente de análise',
    APROVADA: 'Aprovada / em trânsito',
    RECEBIDA: 'Recebida no estoque',
    REJEITADA: 'Rejeitada',
    CANCELADA: 'Cancelada',
    ENTRADA: 'Entrada: Central para Carreta',
    SAIDA: 'Saída: consumo em uma ação',
    TRANSFERENCIA: 'Transferência entre carretas',
    DEVOLUCAO: 'Devolução: Carreta para Central',
    AJUSTE: 'Ajuste manual de saldo',
    PERDA: 'Perda ou descarte',
    REPOSICAO: 'Reposição recebida',
    ENCOMENDA: 'Encomenda aguardando recebimento',
    ADMIN: 'Administrador',
    IT_ADMIN: 'Administrador de TI',
    COORDINATOR: 'Coordenador',
    FINANCIAL: 'Financeiro',
    DRIVER: 'Motorista',
    TEACHER: 'Professor',
    STUDENT: 'Aluno',
};

function formatBR(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
}

function relativeTime(iso: string) {
    const d = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.round((now - d) / 1000);
    if (diff < 60) return `há ${diff}s`;
    if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
    if (diff < 86400 * 30) return `há ${Math.floor(diff / 86400)} d`;
    return new Date(iso).toLocaleDateString('pt-BR');
}

function friendlyFieldLabel(key: string) {
    return FIELD_LABEL[key] ?? TECHNICAL_FALLBACK_LABEL[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
}

function friendlyValue(value: any): string {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (typeof value === 'number') return value.toLocaleString('pt-BR');
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    const raw = String(value);
    return VALUE_LABEL[raw] ?? raw;
}

/** Renderiza um par chave/valor formatado para o painel de detalhes do registro. */
function KvPair({ k, v }: { k: string; v: any }) {
    if (v === null || v === undefined || v === '') return null;
    const display = friendlyValue(v);
    return (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', padding: '4px 0', borderBottom: '1px dashed #F1F5F9' }}>
            <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748B', minWidth: 130, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</span>
            <span style={{ fontSize: '0.78rem', color: '#0F172A', wordBreak: 'break-word', flex: 1 }}>{display}</span>
        </div>
    );
}

/** Friendly labels para campos comuns que aparecem em oldData/newData */
const FIELD_LABEL: Record<string, string> = {
    id: 'ID',
    nome: 'Nome',
    codigoInterno: 'Código',
    categoria: 'Categoria',
    unidade: 'Unidade',
    quantidade: 'Quantidade',
    quantidadeAtual: 'Qtd. atual',
    quantidadeMinima: 'Qtd. mínima',
    validade: 'Validade',
    fornecedor: 'Fornecedor',
    precoUnitario: 'Preço unitário',
    valorTotal: 'Valor total',
    localizacao: 'Localização',
    fotoUrl: 'Foto',
    observacoes: 'Observações',
    observacao: 'Observação',
    active: 'Ativo',
    type: 'Tipo',
    fromTruckId: 'ID Carreta origem',
    fromTruckIdentifier: 'Carreta origem',
    toTruckId: 'ID Carreta destino',
    toTruckIdentifier: 'Carreta destino',
    acaoId: 'ID Ação',
    acaoNome: 'Ação consumidora',
    stockItemId: 'ID Item',
    stockItemNome: 'Item',
    registeredBy: 'ID Registrante',
    registeredByName: 'Registrado por',
    registeredByRole: 'Perfil do registrante',
    requestedBy: 'ID Solicitante',
    requesterName: 'Solicitado por',
    requesterRole: 'Perfil do solicitante',
    reviewedBy: 'ID Revisor',
    reviewerName: 'Revisado por',
    reviewNote: 'Nota da revisão',
    justificativa: 'Justificativa',
    urgente: 'Urgente',
    status: 'Status',
    contaPagarId: 'Conta a pagar',
    movementId: 'Movimentação vinculada',
    cancelledBy: 'ID Cancelador',
};

function describeData(obj: Record<string, any> | null | undefined) {
    if (!obj) return [];
    return Object.entries(obj)
        .filter(([_, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => ({ k: friendlyFieldLabel(k), v }));
}

export default function EstoqueHistoricoPage() {
    const searchParams = useSearchParams();
    const initialAction = searchParams.get('action') ?? '';
    const initialStockItemId = searchParams.get('stockItemId') ?? '';

    const [data, setData] = useState<StockHistoryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // filtros
    const [action, setAction] = useState(initialAction);
    const [tableName, setTableName] = useState('');
    const [stockItemId, setStockItemId] = useState(initialStockItemId);
    const [recordId, setRecordId] = useState('');
    const [userId, setUserId] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(50);

    // entry aberto para detalhes
    const [activeEntry, setActiveEntry] = useState<StockHistoryEntry | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await stockApi.history({
                action: action || undefined,
                tableName: tableName || undefined,
                stockItemId: stockItemId || undefined,
                recordId: recordId || undefined,
                userId: userId || undefined,
                from: from || undefined,
                to: to || undefined,
                page,
                limit,
            });
            setData(res);
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Erro ao carregar histórico');
        } finally {
            setLoading(false);
        }
    }, [action, tableName, stockItemId, recordId, userId, from, to, page, limit]);

    useEffect(() => { load(); }, [load]);

    const clearFilters = () => {
        setAction(''); setTableName(''); setStockItemId(''); setRecordId(''); setUserId('');
        setFrom(''); setTo(''); setPage(1);
    };

    const summary = useMemo(() => {
        if (!data) return { creates: 0, updates: 0, movs: 0, prs: 0 };
        const acc = { creates: 0, updates: 0, movs: 0, prs: 0 };
        data.data.forEach((e) => {
            if (e.action.includes('MOVEMENT')) acc.movs++;
            else if (e.action.includes('PURCHASE_REQUEST')) acc.prs++;
            else if (e.action.endsWith('CREATE')) acc.creates++;
            else acc.updates++;
        });
        return acc;
    }, [data]);

    const inputStyle: React.CSSProperties = {
        padding: '0.55rem 0.75rem',
        borderRadius: 9,
        border: '1px solid #E2E8F0',
        background: '#FFFFFF',
        fontSize: '0.82rem',
        outline: 'none',
        color: '#0F172A',
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        fontSize: '0.6rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#64748B',
        marginBottom: 4,
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <style>{ESTOQUE_SECTION_CSS}</style>

            <AdminHeaderHero
                title="HISTÓRICO DE ESTOQUE"
                subtitle="Auditoria completa, rastreável: quem fez, quando, o quê, em qual recurso, por quê"
                badge="Auditoria"
                rightSlot={(
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Link href="/admin/estoque" style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '10px 18px', borderRadius: 12, textDecoration: 'none',
                            background: 'rgba(255,255,255,0.06)',
                            color: '#fff',
                            border: '1px solid rgba(99,102,241,0.4)',
                            fontWeight: 700, fontSize: '0.78rem',
                            fontFamily: 'Orbitron, sans-serif', letterSpacing: '.04em',
                        }}>
                            ← Voltar
                        </Link>
                    </div>
                )}
            />

            <EstoqueHistoricoSidebarTutorial />

            {/* Resumo */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem',
            }}>
                <SummaryPill icon="📦" label="Cadastros de itens" value={summary.creates} color="#0891B2" />
                <SummaryPill icon="✏️" label="Edições / desativações" value={summary.updates} color="#6366F1" />
                <SummaryPill icon="🔄" label="Movimentações" value={summary.movs} color="#059669" />
                <SummaryPill icon="🛒" label="Solicitações" value={summary.prs} color="#F59E0B" />
            </div>

            {/* FILTROS */}
            <EstoqueSection delay={120} accent="#6366F1" minimal>
                <EstoqueSectionHeader
                    icon="🔍"
                    title="Filtros"
                    subtitle="Combine os filtros para isolar movimentos específicos da auditoria"
                    accent="#6366F1"
                    action={
                        <button type="button" onClick={clearFilters} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '6px 12px', borderRadius: 9,
                            fontFamily: 'Orbitron, sans-serif', fontWeight: 700,
                            fontSize: '0.66rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                            color: '#6366F1',
                            background: '#6366F110',
                            border: '1px solid #6366F130',
                            cursor: 'pointer',
                        }}>
                            ✕ Limpar
                        </button>
                    }
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
                    <div>
                        <label style={labelStyle}>Tipo de Ação</label>
                        <select
                            value={action}
                            onChange={e => { setAction(e.target.value); setPage(1); }}
                            style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}
                        >
                            <option value="">Todas</option>
                            <optgroup label="Itens">
                                <option value="STOCK_ITEM_CREATE">Cadastro</option>
                                <option value="STOCK_ITEM_UPDATE">Edição</option>
                                <option value="STOCK_ITEM_DEACTIVATE">Desativação</option>
                            </optgroup>
                            <optgroup label="Movimentações">
                                <option value="STOCK_MOVEMENT">Todas movimentações</option>
                                <option value="ENTRADA">Entrada</option>
                                <option value="SAIDA">Saída</option>
                                <option value="TRANSFERENCIA">Transferência</option>
                                <option value="DEVOLUCAO">Devolução</option>
                                <option value="AJUSTE">Ajuste</option>
                                <option value="PERDA">Perda</option>
                                <option value="REPOSICAO">Reposição</option>
                            </optgroup>
                            <optgroup label="Solicitações de Compra">
                                <option value="PURCHASE_REQUEST">Todas solicitações</option>
                                <option value="PURCHASE_REQUEST_CREATE">Criada</option>
                                <option value="PURCHASE_REQUEST_APPROVE">Aprovada</option>
                                <option value="PURCHASE_REQUEST_REJECT">Rejeitada</option>
                                <option value="PURCHASE_REQUEST_CANCEL">Cancelada</option>
                            </optgroup>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Recurso</label>
                        <select
                            value={tableName}
                            onChange={e => { setTableName(e.target.value); setPage(1); }}
                            style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}
                        >
                            <option value="">Todos</option>
                            <option value="stock_items">Itens</option>
                            <option value="stock_movements">Movimentações</option>
                            <option value="stock_purchase_requests">Solicitações</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>ID do Item</label>
                        <input
                            value={stockItemId}
                            onChange={e => setStockItemId(e.target.value)}
                            onBlur={() => setPage(1)}
                            placeholder="Cole o identificador do item"
                            style={{ ...inputStyle, width: '100%' }}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>ID do Registro</label>
                        <input
                            value={recordId}
                            onChange={e => setRecordId(e.target.value)}
                            onBlur={() => setPage(1)}
                            placeholder="ID de movimentação, solicitação ou item"
                            style={{ ...inputStyle, width: '100%' }}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>ID do Autor</label>
                        <input
                            value={userId}
                            onChange={e => setUserId(e.target.value)}
                            onBlur={() => setPage(1)}
                            placeholder="ID do usuário que fez a alteração"
                            style={{ ...inputStyle, width: '100%' }}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>De</label>
                        <input
                            type="date"
                            value={from}
                            onChange={e => { setFrom(e.target.value); setPage(1); }}
                            style={{ ...inputStyle, width: '100%' }}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Até</label>
                        <input
                            type="date"
                            value={to}
                            onChange={e => { setTo(e.target.value); setPage(1); }}
                            style={{ ...inputStyle, width: '100%' }}
                        />
                    </div>
                </div>
            </EstoqueSection>

            {/* TIMELINE + Painel lateral */}
            <div style={{ display: 'grid', gridTemplateColumns: activeEntry ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                {/* Lista */}
                <EstoqueSection delay={180} accent="#4F46E5">
                    <EstoqueSectionHeader
                        icon="📜"
                        title="Timeline auditável"
                        subtitle="Cada linha é um evento imutável (quem, quando, o quê)"
                        accent="#4F46E5"
                        action={data ? (
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '5px 10px', borderRadius: 9,
                                fontFamily: 'Orbitron, sans-serif', fontWeight: 700,
                                fontSize: '0.62rem', letterSpacing: '0.06em', color: '#4F46E5',
                                background: '#4F46E510', border: '1px solid #4F46E530',
                            }}>
                                {data.data.length}/{data.total} · pg {data.page}/{data.totalPages}
                            </span>
                        ) : null}
                    />
                    <div style={{ maxHeight: '60vh', overflowY: 'auto' }} className="custom-scrollbar">

                    {error && (
                        <div style={{ padding: '0.75rem 1rem', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '0.78rem' }}>
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <EstoqueLoadingState label="Carregando histórico…" />
                    ) : !data || data.data.length === 0 ? (
                        <EstoqueEmptyState icon="📜" label="Nenhum registro encontrado com os filtros atuais" />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {data.data.map((entry, i) => (
                                <TimelineRow
                                    key={entry.id}
                                    entry={entry}
                                    isActive={activeEntry?.id === entry.id}
                                    isLast={i === data.data.length - 1}
                                    onClick={() => setActiveEntry(entry)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Paginação */}
                    {data && data.totalPages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                            <button
                                type="button"
                                disabled={page <= 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                style={{
                                    padding: '0.45rem 1rem', borderRadius: 8,
                                    background: page <= 1 ? '#F1F5F9' : '#FFFFFF',
                                    border: '1px solid #E2E8F0',
                                    color: page <= 1 ? '#94A3B8' : '#0F172A',
                                    fontWeight: 700, fontSize: '0.78rem',
                                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                                }}
                            >
                                ← Anterior
                            </button>
                            <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>
                                {data.page} / {data.totalPages}
                            </span>
                            <button
                                type="button"
                                disabled={page >= data.totalPages}
                                onClick={() => setPage(p => p + 1)}
                                style={{
                                    padding: '0.45rem 1rem', borderRadius: 8,
                                    background: page >= data.totalPages ? '#F1F5F9' : '#FFFFFF',
                                    border: '1px solid #E2E8F0',
                                    color: page >= data.totalPages ? '#94A3B8' : '#0F172A',
                                    fontWeight: 700, fontSize: '0.78rem',
                                    cursor: page >= data.totalPages ? 'not-allowed' : 'pointer',
                                }}
                            >
                                Próxima →
                            </button>
                        </div>
                    )}
                    </div>
                </EstoqueSection>

                {/* Painel de detalhes do entry selecionado */}
                {activeEntry && (
                    <EntryDetail entry={activeEntry} onClose={() => setActiveEntry(null)} />
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//   Sub-componentes
// ═══════════════════════════════════════════════════════════════════

function SummaryPill({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
    return (
        <div style={{
            position: 'relative', overflow: 'hidden',
            padding: '0.95rem 1.1rem', borderRadius: 14,
            background: '#FFFFFF',
            borderStyle: 'solid',
            borderWidth: '1px 1px 1px 4px',
            borderTopColor: `${color}25`,
            borderRightColor: `${color}25`,
            borderBottomColor: `${color}25`,
            borderLeftColor: color,
            boxShadow: `0 2px 10px rgba(0,0,0,.05)`,
            display: 'flex', alignItems: 'center', gap: 12,
            animation: 'est-sec-fade-up .5s 80ms both',
        }}>
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg,transparent,${color},transparent)`,
                opacity: 0.55, pointerEvents: 'none',
            }} />
            <div style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: `linear-gradient(135deg, ${color}25, ${color}08)`,
                border: `1px solid ${color}50`,
                boxShadow: `0 0 8px ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.15rem',
            }}>
                <span style={{ animation: 'est-sec-float 3.4s ease-in-out infinite' }}>{icon}</span>
            </div>
            <div>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.45rem', color, lineHeight: 1 }}>
                    {value}
                </div>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94A3B8', marginTop: 4 }}>
                    {label}
                </div>
            </div>
        </div>
    );
}

function TimelineRow({ entry, isActive, isLast, onClick }: {
    entry: StockHistoryEntry; isActive: boolean; isLast: boolean; onClick: () => void;
}) {
    const meta = auditActionMeta(entry.action);
    const what =
        (entry.newData?.stockItemNome as string | undefined) ??
        (entry.newData?.nome as string | undefined) ??
        (entry.oldData?.stockItemNome as string | undefined) ??
        (entry.oldData?.nome as string | undefined) ??
        '—';
    const quantidade = entry.newData?.quantidade ?? entry.newData?.quantidadeAtual;
    const unidade = entry.newData?.unidade ?? '';

    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                position: 'relative',
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '12px 14px', borderRadius: 12,
                background: isActive ? `${meta.color}10` : '#FAFBFC',
                border: `1px solid ${isActive ? meta.color : '#F3F4F6'}`,
                cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.18s',
                width: '100%',
            }}>

            {/* Timeline line + dot */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                    width: 36, height: 36, borderRadius: 11,
                    background: `${meta.color}18`, border: `1.5px solid ${meta.color}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem',
                    zIndex: 1, position: 'relative',
                }}>{meta.icon}</div>
                {!isLast && (
                    <div style={{
                        position: 'absolute', top: 36, left: '50%',
                        transform: 'translateX(-50%)',
                        width: 2, height: 'calc(100% + 10px)',
                        background: '#E2E8F0',
                    }} />
                )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0F172A' }}>{meta.label}</span>
                    <span style={{
                        fontSize: '0.6rem', padding: '2px 7px', borderRadius: 100,
                        background: '#F1F5F9', color: '#475569', fontWeight: 700,
                    }}>
                        {TABLE_LABEL[entry.tableName] ?? entry.tableName}
                    </span>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: 4 }}>
                    <strong style={{ color: meta.color }}>{what}</strong>
                    {quantidade && (
                        <> · {Number(quantidade)} {unidade}</>
                    )}
                </div>

                <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
                    <span>👤 {entry.user?.name ?? 'Sistema'}</span>
                    {entry.user?.role && <span style={{ color: '#94A3B8' }}>({ROLE_LABEL[entry.user.role] ?? entry.user.role})</span>}
                    <span style={{ color: '#94A3B8' }}>·</span>
                    <span title={formatBR(entry.createdAt)}>🕒 {relativeTime(entry.createdAt)}</span>
                </div>

                {/* Justificativa/observação destacada quando existir */}
                {(entry.newData?.justificativa || entry.newData?.observacao || entry.newData?.reviewNote) && (
                    <div style={{
                        marginTop: 8, padding: '6px 9px', borderRadius: 8,
                        background: '#FFFDE7', border: '1px solid #FEF08A',
                        fontSize: '0.72rem', color: '#7C5A00', fontStyle: 'italic',
                    }}>
                        💬 {entry.newData?.justificativa || entry.newData?.observacao || entry.newData?.reviewNote}
                    </div>
                )}
            </div>

            <div style={{ fontSize: '0.66rem', color: isActive ? meta.color : '#94A3B8', fontWeight: 700, alignSelf: 'center' }}>
                {isActive ? 'aberto' : 'ver →'}
            </div>
        </button>
    );
}

function EntryDetail({ entry, onClose }: { entry: StockHistoryEntry; onClose: () => void }) {
    const meta = auditActionMeta(entry.action);
    const oldKvs = describeData(entry.oldData);
    const newKvs = describeData(entry.newData);

    return (
        <div style={{
            background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB',
            padding: 0, maxHeight: '70vh', overflowY: 'auto',
            display: 'flex', flexDirection: 'column',
        }}
        className="custom-scrollbar"
        >
            <div style={{
                padding: '1rem 1.2rem', borderBottom: '1px solid #F1F5F9',
                background: `linear-gradient(135deg, ${meta.color}EE, ${meta.color}AA)`,
                display: 'flex', alignItems: 'center', gap: 14,
            }}>
                <div style={{
                    width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                    background: 'rgba(255,255,255,0.18)',
                    border: '1px solid rgba(255,255,255,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.45rem',
                }}>{meta.icon}</div>
                <div style={{ flex: 1, color: '#fff', minWidth: 0 }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.9 }}>
                        Detalhe da auditoria
                    </div>
                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1rem', letterSpacing: '0.04em' }}>
                        {meta.label}
                    </div>
                </div>
                <button onClick={onClose} style={{
                    border: '1px solid rgba(255,255,255,0.4)',
                    background: 'rgba(255,255,255,0.15)',
                    color: '#fff', borderRadius: 8, padding: '0.35rem 0.7rem',
                    cursor: 'pointer', fontWeight: 800, fontSize: '0.78rem',
                }}>
                    ✕
                </button>
            </div>

            <div style={{ padding: '1rem 1.2rem', flex: 1 }}>
                <Block title="Identificação do evento">
                    <KvPair k="Tipo de evento" v={meta.label} />
                    <KvPair k="Área do sistema" v={TABLE_LABEL[entry.tableName] ?? entry.tableName} />
                    <KvPair k="Registro relacionado" v={entry.recordId} />
                    <KvPair k="Código interno do registro de auditoria" v={entry.id} />
                </Block>

                <Block title="Quem fez">
                    <KvPair k="Usuário" v={entry.user?.name ?? '— (Sistema)'} />
                    <KvPair k="Email" v={entry.user?.email} />
                    <KvPair k="Perfil" v={entry.user ? (ROLE_LABEL[entry.user.role] ?? entry.user.role) : null} />
                    <KvPair k="Código interno do usuário" v={entry.userId} />
                </Block>

                <Block title="Quando">
                    <KvPair k="Data/hora" v={formatBR(entry.createdAt)} />
                    <KvPair k="Relativa" v={relativeTime(entry.createdAt)} />
                </Block>

                {oldKvs.length > 0 && (
                    <Block title="Estado anterior" tone="muted">
                        {oldKvs.map(({ k, v }) => <KvPair key={`o-${k}`} k={k} v={v} />)}
                    </Block>
                )}

                {newKvs.length > 0 && (
                    <Block title="Estado atual / dados da ação" tone="strong">
                        {newKvs.map(({ k, v }) => <KvPair key={`n-${k}`} k={k} v={v} />)}
                    </Block>
                )}

                <Block title="Origem do acesso">
                    <KvPair k="IP" v={entry.ipAddress ?? '—'} />
                    <KvPair k="Navegador/dispositivo" v={entry.userAgent ?? '—'} />
                </Block>

                {/* Atalhos contextuais */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                    {entry.tableName === 'stock_items' && entry.recordId && (
                        <Link href={`/admin/estoque/itens/${entry.recordId}`} style={pillBtn(meta.color)}>
                            📦 Abrir item
                        </Link>
                    )}
                    {entry.newData?.stockItemId && (
                        <Link href={`/admin/estoque/itens/${entry.newData.stockItemId}`} style={pillBtn(meta.color)}>
                            📦 Abrir item vinculado
                        </Link>
                    )}
                    {entry.tableName === 'stock_purchase_requests' && (
                        <Link href="/admin/estoque/solicitacoes" style={pillBtn(meta.color)}>
                            🛒 Ver solicitações
                        </Link>
                    )}
                    {entry.tableName === 'stock_movements' && (
                        <Link href="/admin/estoque/movimentacoes" style={pillBtn(meta.color)}>
                            🔄 Ver movimentações
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

function Block({ title, tone, children }: { title: string; tone?: 'muted' | 'strong'; children: React.ReactNode }) {
    const bg = tone === 'strong' ? '#FFFDE7' : tone === 'muted' ? '#F8FAFC' : '#FFFFFF';
    const border = tone === 'strong' ? '#FEF08A' : '#E5E7EB';
    return (
        <div style={{
            background: bg, border: `1px solid ${border}`, borderRadius: 10,
            padding: '0.8rem 0.95rem', marginBottom: 12,
        }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748B', marginBottom: 6 }}>
                {title}
            </div>
            {children}
        </div>
    );
}

function pillBtn(color: string): React.CSSProperties {
    return {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '0.4rem 0.8rem', borderRadius: 8,
        background: `${color}10`,
        border: `1px solid ${color}55`,
        color,
        fontWeight: 700, fontSize: '0.72rem',
        textDecoration: 'none',
    };
}
