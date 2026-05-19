'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    stockApi,
    StockItem,
    StockItemCategory,
    StockCategory,
    CATEGORIA_LABEL,
    CATEGORIA_COLOR,
    CATEGORIA_ICON,
    resolveCategoria,
    isLowStock,
    daysUntilExpiry,
    getStockStatus,
    STOCK_STATUS_META,
} from '@/lib/api/stock';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toast } from '@/components/ui/Toast';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { EstoqueItensSidebarTutorial } from '@/components/admin/adminSidebarTutorials';
import { SolicitarCompraModal } from '@/components/estoque/SolicitarCompraModal';
import { MovimentacaoModal } from '@/components/estoque/MovimentacaoModal';
import {
    EstoqueSection,
    EstoqueSectionHeader,
    EstoqueEmptyState,
    EstoqueLoadingState,
    ESTOQUE_SECTION_CSS,
} from '@/components/estoque/EstoqueSection';

const CSS = `
@keyframes itm-fade-up { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
@keyframes itm-scan { 0%,100%{top:0;opacity:.6} 50%{top:100%;opacity:.2} }
@keyframes itm-grid { 0%,100%{opacity:.08} 50%{opacity:.18} }
@keyframes itm-ring { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes itm-pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
@keyframes itm-slide-in { from{transform:translateX(-8px);opacity:0} to{transform:translateX(0);opacity:1} }
@keyframes itm-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
`;

const CATEGORIAS_OPTS: { value: 'all' | StockItemCategory; label: string }[] = [
    { value: 'all',         label: 'Todas' },
    { value: 'CONSUMIVEL',  label: 'Consumível' },
    { value: 'DIDATICO',    label: 'Didático' },
    { value: 'LIMPEZA',     label: 'Limpeza' },
    { value: 'EQUIPAMENTO', label: 'Equipamento' },
    { value: 'EPI',         label: 'EPI' },
    { value: 'ALIMENTACAO', label: 'Alimentação' },
    { value: 'ESCRITORIO',  label: 'Escritório' },
    { value: 'OUTRO',       label: 'Outro' },
];

// ═══════════════════════════════════════════════════════════════════
//   ItemCard — clicável, com badges de alerta
// ═══════════════════════════════════════════════════════════════════
function ItemCard({
    item, onDelete, onSolicitarCompra, onMovimentar, index,
}: {
    item: StockItem;
    onDelete: (id: string) => void;
    onSolicitarCompra: (item: StockItem) => void;
    onMovimentar: (item: StockItem) => void;
    index: number;
}) {
    const [hov, setHov] = useState(false);
    const cat = resolveCategoria(item);
    const color = cat.color;
    const icon = cat.icon;
    const low = isLowStock(item);
    const status = getStockStatus(item);
    const statusMeta = STOCK_STATUS_META[status];
    const dias = daysUntilExpiry(item);
    const vencendo = dias !== null && dias <= 30 && dias >= 0;
    const vencido = dias !== null && dias < 0;

    const preco = item.precoUnitario != null ? Number(item.precoUnitario) : null;
    const qtdAtual = Number(item.quantidadeAtual);
    const qtdEmTransito = Number(item.quantidadeEmTransito ?? 0);
    const temTransito = qtdEmTransito > 0;
    const valorEstoque = preco != null ? qtdAtual * preco : null;
    const valorEmTransito = preco != null && temTransito ? qtdEmTransito * preco : null;

    // "Aguardando 1ª Solicitação": item recém-criado sem saldo real, sem encomenda em trânsito
    // e sem nenhuma Solicitação de Compra pendente. Esse é o estado que o usuário precisa "ver"
    // para entender que falta abrir a PR — caso contrário o item fica visualmente perdido.
    const pendingPR = Number(item.pendingPurchaseRequestsCount ?? 0);
    const aguardandoPrimeiraSolicitacao =
        qtdAtual === 0 && qtdEmTransito === 0 && pendingPR === 0;
    const temSolicitacaoPendente = pendingPR > 0;

    return (
        <div
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                position: 'relative', overflow: 'hidden', borderRadius: 20,
                background: '#fff',
                borderStyle: 'solid',
                borderWidth: '1px 1px 1px 4px',
                borderTopColor: `${hov ? color + '55' : color + '20'}`,
                borderRightColor: `${hov ? color + '55' : color + '20'}`,
                borderBottomColor: `${hov ? color + '55' : color + '20'}`,
                borderLeftColor: color,
                boxShadow: hov
                    ? `0 0 24px ${color}18, 0 12px 32px rgba(0,0,0,.1)`
                    : `0 2px 8px rgba(0,0,0,.06)`,
                transition: 'all .3s cubic-bezier(.175,.885,.32,1.275)',
                transform: hov ? 'perspective(800px) rotateX(-2deg) rotateY(2deg) translateY(-5px)' : 'none',
                animation: `itm-slide-in 0.5s ${index * 30}ms both`,
                display: 'flex', flexDirection: 'column',
            }}>
            {/* Grid */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                backgroundImage: `linear-gradient(${color}05 1px,transparent 1px),linear-gradient(90deg,${color}05 1px,transparent 1px)`,
                backgroundSize: '28px 28px',
                animation: 'itm-grid 5s ease-in-out infinite',
            }} />
            {/* Scan */}
            <div style={{
                position: 'absolute', left: 0, right: 0, height: 1.5,
                background: `linear-gradient(90deg,transparent,${color}40,transparent)`,
                animation: 'itm-scan 4.5s ease-in-out infinite',
                pointerEvents: 'none',
            }} />
            {/* Top line */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg,transparent,${color},transparent)`,
                opacity: hov ? .9 : .4, transition: 'opacity .3s',
            }} />
            {/* Ring */}
            <div style={{
                position: 'absolute', top: -20, right: -20, width: 80, height: 80,
                border: `1px solid ${color}14`, borderRadius: '50%',
                animation: 'itm-ring 12s linear infinite', pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', zIndex: 1, padding: '18px 18px 14px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    {item.fotoUrl ? (
                        <div style={{
                            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                            backgroundImage: `url("${item.fotoUrl}")`,
                            backgroundSize: 'cover', backgroundPosition: 'center',
                            border: `1px solid ${color}35`,
                            boxShadow: hov ? `0 0 14px ${color}35` : `0 0 4px ${color}10`,
                        }} />
                    ) : (
                        <div style={{
                            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.4rem',
                            background: `linear-gradient(135deg,${color}22,${color}06)`,
                            border: `1px solid ${color}35`,
                            boxShadow: hov ? `0 0 14px ${color}35` : `0 0 4px ${color}10`,
                        }}>{icon}</div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {/* Status do saldo: CRÍTICO / BAIXO / OK / SEM MÍNIMO */}
                        {status !== 'OK' && (
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '3px 9px', borderRadius: 20,
                                background: statusMeta.bg, border: `1px solid ${statusMeta.border}`,
                                fontSize: '0.6rem', fontWeight: 800, color: statusMeta.color,
                                textTransform: 'uppercase', letterSpacing: '0.06em',
                                animation: status === 'CRITICO' ? 'itm-pulse-dot 1.4s infinite' : 'none',
                            }}>
                                {status === 'CRITICO' ? '🚨' : status === 'BAIXO' ? '⚠️' : '◌'}
                                {statusMeta.label}
                            </span>
                        )}
                        <span style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '3px 10px', borderRadius: 20,
                            background: color + '15', border: `1px solid ${color}35`,
                            fontSize: '0.62rem', fontWeight: 700, color: color, textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                            <span style={{
                                width: 5, height: 5, borderRadius: '50%', background: color,
                                animation: 'itm-pulse-dot 2s infinite', display: 'inline-block',
                            }} />
                            {cat.label}
                            {cat.isCustom && (
                                <span title="Categoria customizada" style={{
                                    marginLeft: 4, fontSize: '0.5rem', fontWeight: 800,
                                    background: color, color: '#fff', padding: '1px 4px', borderRadius: 4,
                                }}>★</span>
                            )}
                        </span>
                    </div>
                </div>

                {/* Nome */}
                <div style={{
                    fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: '0.95rem',
                    color: '#111827', marginBottom: 2, letterSpacing: '.02em',
                    minHeight: '2.4em', lineHeight: 1.2,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{item.nome}</div>
                <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: 10, fontFamily: 'JetBrains Mono, monospace' }}>
                    {item.codigoInterno ?? '—'}
                </div>

                {/* Saldo central — destaque */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                    <span style={{
                        fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.7rem',
                        color: status === 'CRITICO' ? statusMeta.color : status === 'BAIXO' ? statusMeta.color : color,
                        filter: hov ? `drop-shadow(0 0 8px ${(status === 'CRITICO' || status === 'BAIXO' ? statusMeta.color : color)}70)` : 'none',
                        transition: 'filter .3s',
                        animation: 'itm-float 3s ease-in-out infinite',
                    }}>
                        {qtdAtual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600 }}>
                        {item.unidade} · mín {Number(item.quantidadeMinima).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                    </span>
                </div>

                {/* Em trânsito (PR aprovada aguardando recebimento/pagamento) */}
                {temTransito && (
                    <div
                        title={`📦 ${qtdEmTransito} ${item.unidade} encomendado(s) — aguardando pagamento da conta a pagar ou confirmação manual de recebimento. Saldo real só sobe quando recebido.`}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                            padding: '4px 10px', borderRadius: 8,
                            background: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)',
                            border: '1px solid #93C5FD',
                            width: 'fit-content',
                        }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#1E3A8A', letterSpacing: '0.05em' }}>
                            📦 EM TRÂNSITO
                        </span>
                        <span style={{
                            fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.82rem',
                            color: '#1E3A8A',
                        }}>
                            {qtdEmTransito.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {item.unidade}
                        </span>
                        {valorEmTransito != null && (
                            <span style={{ fontSize: '0.6rem', color: '#1E40AF', opacity: 0.75 }}>
                                · R$ {valorEmTransito.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} a receber
                            </span>
                        )}
                    </div>
                )}

                {/* Valor total em estoque (qtd × preço) — só quando há preço cadastrado */}
                {valorEstoque != null ? (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12,
                        padding: '4px 10px', borderRadius: 8,
                        background: 'linear-gradient(135deg, #FFFDE7, #FEF3C7)',
                        border: '1px solid #FEF08A',
                        width: 'fit-content',
                    }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#B89B00', letterSpacing: '0.05em' }}>
                            VALOR EM ESTOQUE
                        </span>
                        <span style={{
                            fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.82rem',
                            color: '#7C5A00',
                        }}>
                            R$ {valorEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span style={{ fontSize: '0.6rem', color: '#92400E', opacity: 0.75 }} title={`${qtdAtual} × R$ ${preco?.toFixed(2)}`}>
                            ({qtdAtual} × R$ {preco?.toFixed(2).replace('.', ',')})
                        </span>
                    </div>
                ) : (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12,
                        padding: '4px 10px', borderRadius: 8,
                        background: '#F8FAFC',
                        border: '1px dashed #CBD5E1',
                        width: 'fit-content',
                    }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94A3B8' }}>
                            sem preço cadastrado — valor não calculado
                        </span>
                    </div>
                )}

                {/* Alertas */}
                {(low || vencendo || vencido || aguardandoPrimeiraSolicitacao || temSolicitacaoPendente) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                        {aguardandoPrimeiraSolicitacao && (
                            <span
                                title="Este item foi cadastrado mas ainda não tem nenhuma Solicitação de Compra. Clique em 'Repor agora' para abrir a conta a pagar e dar entrada de estoque."
                                style={{
                                    padding: '3px 9px', borderRadius: 8, fontSize: '0.62rem', fontWeight: 800,
                                    background: 'linear-gradient(135deg, #FFF7ED, #FFEDD5)',
                                    color: '#9A3412', border: '1px solid #FDBA74',
                                    textTransform: 'uppercase', letterSpacing: '0.05em',
                                    animation: 'itm-pulse-dot 1.8s infinite',
                                }}>
                                🛒 Aguardando 1ª Solicitação
                            </span>
                        )}
                        {temSolicitacaoPendente && (
                            <span
                                title={`${pendingPR} Solicitação(ões) de Compra pendente(s) — aguardando aprovação para virar conta a pagar.`}
                                style={{
                                    padding: '3px 9px', borderRadius: 8, fontSize: '0.62rem', fontWeight: 800,
                                    background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE',
                                    textTransform: 'uppercase', letterSpacing: '0.05em',
                                }}>
                                ⏳ {pendingPR} solicitação{pendingPR > 1 ? 'ões' : ''} pendente{pendingPR > 1 ? 's' : ''}
                            </span>
                        )}
                        {low && (
                            <span style={{
                                padding: '3px 9px', borderRadius: 8, fontSize: '0.62rem', fontWeight: 800,
                                background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                                textTransform: 'uppercase', letterSpacing: '0.05em',
                            }}>⚠️ Estoque baixo</span>
                        )}
                        {vencido && (
                            <span style={{
                                padding: '3px 9px', borderRadius: 8, fontSize: '0.62rem', fontWeight: 800,
                                background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                                textTransform: 'uppercase', letterSpacing: '0.05em',
                            }}>🚨 Vencido</span>
                        )}
                        {vencendo && !vencido && (
                            <span style={{
                                padding: '3px 9px', borderRadius: 8, fontSize: '0.62rem', fontWeight: 800,
                                background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A',
                                textTransform: 'uppercase', letterSpacing: '0.05em',
                            }}>⏰ {dias}d p/ vencer</span>
                        )}
                    </div>
                )}

                {/* Localização */}
                {item.localizacao && (
                    <div style={{ fontSize: '0.7rem', color: '#6B7280', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        📍 {item.localizacao}
                    </div>
                )}

                {/* Carretas onde este item está distribuído (truckStocks vem no payload de findAllItems) */}
                {item.truckStocks && item.truckStocks.filter(ts => Number(ts.quantidadeAtual) > 0).length > 0 && (
                    <div
                        title="Carretas que têm este item em estoque (clique 'Ver detalhes' para visão completa)"
                        style={{
                            marginTop: 8, padding: '6px 10px', borderRadius: 8,
                            background: '#F5F3FF', border: '1px solid #DDD6FE',
                            display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center',
                        }}>
                        <span style={{
                            fontSize: '0.6rem', fontWeight: 800, color: '#7C3AED',
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>🚛 Em carretas:</span>
                        {item.truckStocks
                            .filter(ts => Number(ts.quantidadeAtual) > 0)
                            .slice(0, 3)
                            .map(ts => (
                                <span key={ts.id} style={{
                                    fontSize: '0.65rem',
                                    background: '#fff', color: '#5B21B6',
                                    padding: '2px 7px', borderRadius: 999,
                                    border: '1px solid #DDD6FE',
                                    fontFamily: 'JetBrains Mono, monospace',
                                    fontWeight: 700,
                                }}>
                                    {ts.truck?.identifier ?? 'Carreta'} ({Number(ts.quantidadeAtual).toLocaleString('pt-BR', { maximumFractionDigits: 2 })})
                                </span>
                            ))}
                        {item.truckStocks.filter(ts => Number(ts.quantidadeAtual) > 0).length > 3 && (
                            <span style={{ fontSize: '0.6rem', color: '#7C3AED', fontWeight: 700 }}>
                                + {item.truckStocks.filter(ts => Number(ts.quantidadeAtual) > 0).length - 3} mais
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Footer com ações */}
            <div style={{
                position: 'relative', zIndex: 1,
                borderTop: `1px solid ${color}15`,
                background: 'rgba(0,0,0,.01)',
                padding: '10px 18px',
                display: 'flex', gap: 8, flexWrap: 'wrap',
            }}>
                <Link href={`/admin/estoque/itens/${item.id}`} style={{
                    flex: 1, textAlign: 'center', textDecoration: 'none',
                    padding: '8px 0', borderRadius: 10, fontSize: '0.74rem', fontWeight: 700,
                    background: `linear-gradient(135deg,${color},${color}cc)`,
                    color: '#fff',
                    boxShadow: hov ? `0 0 18px ${color}50` : `0 2px 8px ${color}25`,
                    transition: 'box-shadow .3s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    minWidth: 110,
                }}>
                    👁 Ver detalhes
                </Link>
                <button
                    onClick={() => onMovimentar(item)}
                    style={{
                        padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                        background: '#EEF2FF', border: '1px solid #C7D2FE',
                        color: '#4338CA', fontSize: '0.72rem', fontWeight: 800,
                        display: 'flex', alignItems: 'center', gap: 5,
                        transition: 'all .2s',
                    }}
                    title="Movimentar este item (Entrada/Saída/Transferência/Devolução/Ajuste/Perda)"
                >
                    ↔ Movimentar
                </button>
                <button
                    onClick={() => onSolicitarCompra(item)}
                    style={{
                        padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                        background: (low || aguardandoPrimeiraSolicitacao)
                            ? 'linear-gradient(135deg,#F59E0B,#D97706)'
                            : '#FFFDE7',
                        border: `1px solid ${(low || aguardandoPrimeiraSolicitacao) ? '#D97706' : '#FEF08A'}`,
                        color: (low || aguardandoPrimeiraSolicitacao) ? '#fff' : '#B89B00',
                        fontSize: '0.72rem', fontWeight: 800,
                        display: 'flex', alignItems: 'center', gap: 5,
                        transition: 'all .2s',
                        boxShadow: (low || aguardandoPrimeiraSolicitacao)
                            ? '0 0 12px rgba(245,158,11,.35)'
                            : 'none',
                        animation: aguardandoPrimeiraSolicitacao ? 'itm-pulse-dot 1.8s infinite' : 'none',
                    }}
                    title={
                        aguardandoPrimeiraSolicitacao
                            ? 'Item recém-cadastrado sem nenhuma Solicitação de Compra — abra agora para fechar o ciclo financeiro.'
                            : 'Solicitar compra/reposição → cria uma solicitação pendente; a conta a pagar nasce quando o administrador aprova'
                    }
                >
                    💰 {(low || aguardandoPrimeiraSolicitacao) ? 'Repor agora' : 'Solicitar'}
                </button>
                <button onClick={() => onDelete(item.id)} style={{
                    padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                    background: '#FEF2F2', border: '1px solid #FECACA',
                    color: '#EF4444', fontSize: '0.74rem',
                    display: 'flex', alignItems: 'center',
                    transition: 'background .2s',
                }} title="Desativar item">🗑</button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//   Página
// ═══════════════════════════════════════════════════════════════════
export default function EstoqueItensListPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [items, setItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    // Filtro: pode ser 'all' | enum default | 'custom:<id>' (categoria customizada)
    const [categoriaFilter, setCategoriaFilter] = useState<string>(
        searchParams.get('customCategoryId')
            ? `custom:${searchParams.get('customCategoryId')}`
            : searchParams.get('categoria') || 'all',
    );
    const [allCategories, setAllCategories] = useState<StockCategory[]>([]);
    const [search, setSearch] = useState('');
    const [onlyLow, setOnlyLow] = useState(searchParams.get('onlyLow') === 'true');
    const [onlyExpiring, setOnlyExpiring] = useState(searchParams.get('onlyExpiring') === 'true');
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [solicitarItem, setSolicitarItem] = useState<StockItem | null>(null);
    const [movItem, setMovItem] = useState<StockItem | null>(null);

    useEffect(() => {
        stockApi.categories.list().then(setAllCategories).catch(() => setAllCategories([]));
    }, []);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const filters: any = {
                search: search.trim() || undefined,
                onlyLow: onlyLow || undefined,
                onlyExpiring: onlyExpiring || undefined,
            };
            if (categoriaFilter !== 'all') {
                if (categoriaFilter.startsWith('custom:')) {
                    filters.customCategoryId = categoriaFilter.split(':')[1];
                } else {
                    filters.categoria = categoriaFilter as StockItemCategory;
                }
            }
            const data = await stockApi.items.getAll(filters);
            setItems(data);
        } catch (e) {
            console.error('[Estoque/Itens] erro', e);
            toast.error('Erro ao carregar itens');
        } finally {
            setLoading(false);
        }
    }, [categoriaFilter, search, onlyLow, onlyExpiring]);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            await stockApi.items.delete(deleteId);
            toast.success('Item desativado com sucesso');
            setDeleteId(null);
            load();
        } catch (e: any) {
            const msg = e?.response?.data?.message || 'Erro ao desativar item';
            toast.error(Array.isArray(msg) ? msg.join('; ') : msg);
        } finally {
            setDeleting(false);
        }
    };

    const total = items.length;
    const totalBaixo = items.filter(isLowStock).length;

    return (
        <>
            <style>{CSS}</style>
            <style>{ESTOQUE_SECTION_CSS}</style>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                <AdminHeaderHero
                    title="ITENS DO ESTOQUE"
                    subtitle="Catálogo completo de insumos no estoque central"
                    badge={`${total} ${total === 1 ? 'item' : 'itens'}`}
                    rightSlot={(
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Link href="/admin/estoque" style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '10px 16px', borderRadius: 12, textDecoration: 'none',
                                background: 'rgba(255,255,255,0.06)',
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.2)',
                                fontWeight: 700, fontSize: '0.78rem',
                            }}>← Voltar</Link>
                            <Link href="/admin/estoque/itens/novo" style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                padding: '10px 22px', borderRadius: 12, textDecoration: 'none',
                                background: 'linear-gradient(135deg,#FFD600,#E6A800)',
                                color: '#000',
                                fontWeight: 800, fontSize: '0.82rem',
                                fontFamily: 'Orbitron, sans-serif', letterSpacing: '.04em',
                                boxShadow: '0 0 18px rgba(255,214,0,.4), 0 4px 12px rgba(0,0,0,.12)',
                            }}>⚡ Novo Item</Link>
                        </div>
                    )}
                />

                <EstoqueItensSidebarTutorial />

                {/* ── Filtros + Busca ── */}
                <EstoqueSection delay={80} accent="#6366F1" minimal>
                    <EstoqueSectionHeader
                        icon="🔍"
                        title="Filtros & busca"
                        subtitle="Combine categoria + situação para isolar exatamente o que precisa"
                        accent="#6366F1"
                    />
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
                    }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: '#9CA3AF' }}>Categoria</span>
                    <select
                        value={categoriaFilter}
                        onChange={e => setCategoriaFilter(e.target.value)}
                        style={{
                            padding: '6px 12px', borderRadius: 9, border: '1px solid #E5E7EB',
                            fontSize: '0.78rem', color: '#111827', outline: 'none',
                            background: '#FAFAFA', cursor: 'pointer',
                        }}>
                        <option value="all">Todas</option>
                        <optgroup label="Padrão">
                            {allCategories.filter(c => c.isDefault).map(c => (
                                <option key={c.id} value={c.defaultEnum ?? 'OUTRO'}>{c.icon} {c.nome}</option>
                            ))}
                        </optgroup>
                        {allCategories.some(c => !c.isDefault) && (
                            <optgroup label="Customizadas">
                                {allCategories.filter(c => !c.isDefault).map(c => (
                                    <option key={c.id} value={`custom:${c.id}`}>{c.icon} {c.nome} ★</option>
                                ))}
                            </optgroup>
                        )}
                    </select>

                    <label style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 9,
                        border: `1px solid ${onlyLow ? '#FECACA' : '#E5E7EB'}`,
                        background: onlyLow ? '#FEF2F2' : '#FAFAFA',
                        cursor: 'pointer', fontSize: '0.78rem',
                        color: onlyLow ? '#DC2626' : '#6B7280', fontWeight: 700,
                    }}>
                        <input type="checkbox" checked={onlyLow} onChange={e => setOnlyLow(e.target.checked)} style={{ accentColor: '#EF4444' }} />
                        ⚠️ Estoque baixo
                    </label>

                    <label style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 9,
                        border: `1px solid ${onlyExpiring ? '#FDE68A' : '#E5E7EB'}`,
                        background: onlyExpiring ? '#FFFBEB' : '#FAFAFA',
                        cursor: 'pointer', fontSize: '0.78rem',
                        color: onlyExpiring ? '#B45309' : '#6B7280', fontWeight: 700,
                    }}>
                        <input type="checkbox" checked={onlyExpiring} onChange={e => setOnlyExpiring(e.target.checked)} style={{ accentColor: '#F59E0B' }} />
                        ⏰ Vencendo
                    </label>

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar item, código, fornecedor..."
                            style={{
                                padding: '6px 12px', borderRadius: 9, border: '1px solid #E5E7EB',
                                fontSize: '0.78rem', color: '#111827', outline: 'none',
                                background: '#FAFAFA', width: 240,
                            }}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                            {loading ? '...' : `${total} ${total === 1 ? 'item' : 'itens'}`}
                        </span>
                    </div>
                    </div>
                </EstoqueSection>

                {/* ── Banner de aviso quando há estoque baixo ── */}
                {!onlyLow && totalBaixo > 0 && (
                    <button
                        onClick={() => setOnlyLow(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '0.9rem 1.2rem', borderRadius: 12,
                            background: 'linear-gradient(135deg, #FEF2F2, #FEE2E2)',
                            border: '1.5px solid #FECACA',
                            cursor: 'pointer', textAlign: 'left',
                            animation: 'itm-fade-up 0.5s both',
                        }}>
                        <span style={{ fontSize: '1.3rem' }}>⚠️</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#DC2626' }}>
                                {totalBaixo} {totalBaixo === 1 ? 'item está' : 'itens estão'} com estoque abaixo da quantidade mínima
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#991B1B', marginTop: 2 }}>
                                Clique aqui para filtrar e revisar
                            </div>
                        </div>
                        <span style={{ fontSize: '1.2rem', color: '#DC2626' }}>→</span>
                    </button>
                )}

                {/* ── Grid ── */}
                <EstoqueSection delay={140} accent="#FFD600">
                    <EstoqueSectionHeader
                        icon="📦"
                        title="Catálogo de itens"
                        subtitle="Cada card mostra saldo, status (CRÍTICO/BAIXO/OK) e atalhos para movimentar ou solicitar"
                        accent="#FFD600"
                        action={(
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '5px 10px', borderRadius: 9,
                                fontFamily: 'Orbitron, sans-serif', fontWeight: 700,
                                fontSize: '0.62rem', letterSpacing: '0.06em',
                                color: '#B89B00', background: '#FFFDE7',
                                border: '1px solid #FEF08A',
                            }}>
                                {total} {total === 1 ? 'item' : 'itens'}
                            </span>
                        )}
                    />
                    {loading ? (
                        <EstoqueLoadingState label="Carregando itens…" />
                    ) : items.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: 12, animation: 'itm-float 3s ease-in-out infinite' }}>📦</div>
                            <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.72rem', letterSpacing: '.15em', color: '#9CA3AF', marginBottom: 18 }}>
                                NENHUM ITEM ENCONTRADO
                            </p>
                            <Link href="/admin/estoque/itens/novo" className="btn-primary">
                                ⚡ Cadastrar primeiro item
                            </Link>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))',
                            gap: '1.25rem',
                        }}>
                            {items.map((item, i) => (
                                <ItemCard
                                    key={item.id}
                                    item={item}
                                    index={i}
                                    onDelete={(id) => setDeleteId(id)}
                                    onSolicitarCompra={(it) => setSolicitarItem(it)}
                                    onMovimentar={(it) => setMovItem(it)}
                                />
                            ))}
                        </div>
                    )}
                </EstoqueSection>
            </div>

            <ConfirmModal
                isOpen={!!deleteId}
                title="DESATIVAR ITEM"
                message="Tem certeza que deseja desativar este item do estoque? Itens com saldo em carretas ou solicitações pendentes não podem ser desativados."
                confirmLabel="Desativar"
                danger
                loading={deleting}
                onConfirm={handleDelete}
                onCancel={() => setDeleteId(null)}
            />

            <SolicitarCompraModal
                item={solicitarItem}
                onClose={() => setSolicitarItem(null)}
                onSuccess={() => { setSolicitarItem(null); router.push('/admin/estoque/solicitacoes'); }}
            />

            <MovimentacaoModal
                open={!!movItem}
                defaultItemId={movItem?.id}
                onClose={() => setMovItem(null)}
                onSuccess={() => { setMovItem(null); load(); }}
            />
        </>
    );
}
