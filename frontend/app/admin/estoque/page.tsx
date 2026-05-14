'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
    stockApi,
    StockDashboard,
    StockItem,
    StockMovement,
    StockPurchaseRequest,
    DashboardCategoryRow,
    DashboardTruckRow,
    MOV_TYPE_LABEL,
    MOV_TYPE_COLOR,
    MOV_TYPE_ICON,
    CATEGORIA_LABEL,
    CATEGORIA_COLOR,
    CATEGORIA_ICON,
} from '@/lib/api/stock';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { EstoqueSidebarTutorial } from '@/components/admin/adminSidebarTutorials';
import { EstoqueKpiSidebar, EstoqueKpiKey } from '@/components/estoque/EstoqueKpiSidebar';
import { MovimentacaoModal } from '@/components/estoque/MovimentacaoModal';
import {
    EstoqueSection,
    EstoqueSectionHeader,
    EstoqueEmptyState,
    EstoqueLoadingState,
    ESTOQUE_SECTION_CSS,
} from '@/components/estoque/EstoqueSection';

// ═══════════════════════════════════════════════════════════════════
//   CSS local (mesmo padrão de carretas/page.tsx)
// ═══════════════════════════════════════════════════════════════════
const ESTOQUE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
@keyframes est-fade-up { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
@keyframes est-scan { 0%,100%{top:0;opacity:.6} 50%{top:100%;opacity:.2} }
@keyframes est-grid { 0%,100%{opacity:.08} 50%{opacity:.18} }
@keyframes est-ring { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes est-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
@keyframes est-pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
@keyframes est-slide-in { from{transform:translateX(-8px);opacity:0} to{transform:translateX(0);opacity:1} }
`;

// ═══════════════════════════════════════════════════════════════════
//   useCountUp (mesmo padrão de carretas)
// ═══════════════════════════════════════════════════════════════════
function useCountUp(target: number, duration = 1000) {
    const [count, setCount] = useState(0);
    const raf = useRef(0);
    useEffect(() => {
        if (target === 0) { setCount(0); return; }
        const start = Date.now();
        const tick = () => {
            const p = Math.min((Date.now() - start) / duration, 1);
            setCount(Math.round((1 - Math.pow(1 - p, 3)) * target));
            if (p < 1) raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf.current);
    }, [target, duration]);
    return count;
}

// ═══════════════════════════════════════════════════════════════════
//   KpiCard — clicável (abre sidebar com explicação + ações rápidas)
// ═══════════════════════════════════════════════════════════════════
function KpiCard({
    label, icon, value, color, delay = 0, onClick, suffix,
}: {
    label: string;
    icon: string;
    value: number;
    color: string;
    delay?: number;
    onClick?: () => void;
    suffix?: string;
}) {
    const n = useCountUp(value, 900);
    const [hov, setHov] = useState(false);

    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                position: 'relative', overflow: 'hidden', borderRadius: 18, padding: '22px 24px',
                background: '#fff',
                borderStyle: 'solid',
                borderWidth: '1px 1px 1px 4px',
                borderTopColor: `${hov ? color + '70' : color + '25'}`,
                borderRightColor: `${hov ? color + '70' : color + '25'}`,
                borderBottomColor: `${hov ? color + '70' : color + '25'}`,
                borderLeftColor: color,
                boxShadow: hov ? `0 0 28px ${color}22, 0 8px 24px rgba(0,0,0,.08)` : `0 2px 8px rgba(0,0,0,.06)`,
                transition: 'all .3s cubic-bezier(.175,.885,.32,1.275)',
                transform: hov ? 'perspective(500px) rotateX(-3deg) translateY(-4px) scale(1.02)' : 'none',
                animation: `est-fade-up .5s ${delay}ms both`,
                cursor: onClick ? 'pointer' : 'default',
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
            }}>
            {/* Grid bg */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                backgroundImage: `linear-gradient(${color}06 1px,transparent 1px),linear-gradient(90deg,${color}06 1px,transparent 1px)`,
                backgroundSize: '24px 24px',
                animation: 'est-grid 4s ease-in-out infinite',
            }} />
            {/* Scan */}
            <div style={{
                position: 'absolute', left: 0, right: 0, height: 1.5,
                background: `linear-gradient(90deg,transparent,${color}50,transparent)`,
                animation: 'est-scan 3.5s ease-in-out infinite',
                top: 0, pointerEvents: 'none',
            }} />
            {/* Top accent */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg,transparent,${color},transparent)`,
                opacity: hov ? 1 : 0.4, transition: 'opacity .3s',
            }} />
            {/* Ring */}
            <div style={{
                position: 'absolute', top: -16, right: -16, width: 65, height: 65,
                border: `1px solid ${color}18`, borderRadius: '50%',
                animation: 'est-ring 10s linear infinite', pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{
                        width: 38, height: 38, borderRadius: 11, fontSize: '1.1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `linear-gradient(135deg,${color}22,${color}08)`,
                        border: `1px solid ${color}35`,
                        boxShadow: hov ? `0 0 14px ${color}40` : `0 0 6px ${color}15`,
                        transition: 'box-shadow .3s',
                    }}>{icon}</span>
                    <div style={{
                        width: 7, height: 7, borderRadius: '50%', background: color,
                        animation: 'est-pulse-dot 1.8s infinite',
                    }} />
                </div>
                <div style={{
                    fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '2rem',
                    color, lineHeight: 1, marginBottom: 4,
                    filter: hov ? `drop-shadow(0 0 8px ${color}90)` : 'none',
                    transition: 'filter .3s',
                    animation: 'est-float 3s ease-in-out infinite',
                }}>
                    {n}{suffix && <span style={{ fontSize: '1rem', marginLeft: 4 }}>{suffix}</span>}
                </div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#9CA3AF' }}>
                    {label}
                </div>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: color, marginTop: 6, opacity: hov ? 1 : 0.65, transition: 'opacity 0.2s' }}>
                    Clique para detalhes →
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//   MovementRow — linha de movimentação recente
// ═══════════════════════════════════════════════════════════════════
function MovementRow({ mov }: { mov: StockMovement }) {
    const color = MOV_TYPE_COLOR[mov.type];
    const icon = MOV_TYPE_ICON[mov.type];
    const label = MOV_TYPE_LABEL[mov.type];

    const target = mov.fromTruck?.identifier
        ? `de ${mov.fromTruck.identifier}${mov.toTruck?.identifier ? ` → ${mov.toTruck.identifier}` : ''}`
        : mov.toTruck?.identifier
            ? `→ ${mov.toTruck.identifier}`
            : 'Central';

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 10,
            background: '#FAFBFC', border: '1px solid #F3F4F6',
        }}>
            <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem',
                background: `${color}15`,
                border: `1px solid ${color}35`,
            }}>{icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {mov.stockItem?.nome ?? '—'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 2 }}>
                    {label} · {target}
                </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: '0.85rem', color }}>
                    {Number(mov.quantidade).toFixed(2).replace('.', ',')}
                </div>
                <div style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>
                    {new Date(mov.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//   PendingRequestRow — solicitação pendente
// ═══════════════════════════════════════════════════════════════════
function PendingRequestRow({ req }: { req: StockPurchaseRequest }) {
    return (
        <Link
            href={`/admin/estoque/solicitacoes`}
            style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 10,
                background: req.urgente ? 'rgba(239,68,68,0.06)' : '#FAFBFC',
                border: `1px solid ${req.urgente ? 'rgba(239,68,68,0.25)' : '#F3F4F6'}`,
                textDecoration: 'none', color: 'inherit',
                transition: 'all 0.2s',
            }}>
            <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem',
                background: 'rgba(255,214,0,0.15)',
                border: '1px solid rgba(255,214,0,0.4)',
            }}>{req.urgente ? '🔥' : '🛒'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {req.stockItem?.nome ?? 'Item'} {req.urgente && (
                        <span style={{ fontSize: '0.6rem', color: '#DC2626', marginLeft: 4, fontWeight: 800 }}>URGENTE</span>
                    )}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 2 }}>
                    {Number(req.quantidade).toFixed(0)} un · {req.requester?.name ?? 'Solicitante'}
                </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: '#B89B00' }}>
                    R$ {Number(req.valorTotal).toFixed(2).replace('.', ',')}
                </div>
            </div>
        </Link>
    );
}

/**
 * Estilo padronizado para o link "Ver todos →" dentro dos headers de seção.
 * Combina com o accent da seção (cor do header, border, etc.).
 */
function sectionActionStyle(color: string): React.CSSProperties {
    return {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 9,
        fontFamily: 'Orbitron, sans-serif', fontWeight: 700,
        fontSize: '0.66rem', letterSpacing: '0.08em', textTransform: 'uppercase',
        color,
        background: `${color}10`,
        border: `1px solid ${color}30`,
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'all .2s',
    };
}

const TRUCK_STATUS_LABEL: Record<string, string> = {
    AVAILABLE: 'Disponível',
    IN_USE: 'Em uso',
    MAINTENANCE: 'Em manutenção',
    INACTIVE: 'Inativa',
    COM_ESTOQUE: 'Com estoque',
};

function truckStatusLabel(status?: string | null) {
    if (!status) return 'Status não informado';
    return TRUCK_STATUS_LABEL[status] ?? status.replace(/_/g, ' ').toLowerCase();
}

function buildTruckRowsFromItems(items: StockItem[]): DashboardTruckRow[] {
    const buckets = new Map<string, DashboardTruckRow>();

    for (const item of items) {
        for (const stock of item.truckStocks ?? []) {
            const qtd = Number(stock.quantidadeAtual ?? 0);
            const truck = stock.truck;
            if (!truck?.id || qtd <= 0) continue;

            if (!buckets.has(truck.id)) {
                buckets.set(truck.id, {
                    truckId: truck.id,
                    identifier: truck.identifier,
                    licensePlate: truck.licensePlate,
                    status: 'COM_ESTOQUE',
                    totalItensDistintos: 0,
                    quantidadeTotal: 0,
                    valorEstimado: 0,
                    itens: [],
                });
            }

            const bucket = buckets.get(truck.id)!;
            const preco = item.precoUnitario != null ? Number(item.precoUnitario) : 0;
            const valor = qtd * preco;
            bucket.totalItensDistintos += 1;
            bucket.quantidadeTotal += qtd;
            bucket.valorEstimado += valor;
            bucket.itens.push({
                id: item.id,
                nome: item.nome,
                unidade: item.unidade,
                quantidade: qtd,
                valor: Number(valor.toFixed(2)),
                categoria: item.customCategory?.nome ?? CATEGORIA_LABEL[item.categoria],
                icon: item.customCategory?.icon ?? CATEGORIA_ICON[item.categoria],
            });
        }
    }

    return Array.from(buckets.values())
        .map(row => ({
            ...row,
            quantidadeTotal: Number(row.quantidadeTotal.toFixed(3)),
            valorEstimado: Number(row.valorEstimado.toFixed(2)),
            itens: row.itens.sort((a, b) => b.quantidade - a.quantidade).slice(0, 12),
        }))
        .sort((a, b) => b.totalItensDistintos - a.totalItensDistintos);
}

// ═══════════════════════════════════════════════════════════════════
//   Página Principal
// ═══════════════════════════════════════════════════════════════════
export default function EstoqueDashboardPage() {
    const [dash, setDash] = useState<StockDashboard | null>(null);
    const [recentMovs, setRecentMovs] = useState<StockMovement[]>([]);
    const [pending, setPending] = useState<StockPurchaseRequest[]>([]);
    const [byCategory, setByCategory] = useState<DashboardCategoryRow[]>([]);
    const [byTruck, setByTruck] = useState<DashboardTruckRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeKpi, setActiveKpi] = useState<EstoqueKpiKey | null>(null);
    const [movOpen, setMovOpen] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [d, m, p, bc, bt, itemsForTruckFallback] = await Promise.all([
                stockApi.dashboard(),
                stockApi.movements.list({ limit: 6 }),
                stockApi.purchaseRequests.list({ status: 'PENDENTE' }).catch(() => []),
                stockApi.dashboardByCategory().catch(() => []),
                stockApi.dashboardByTruck().catch(() => []),
                stockApi.items.getAll().catch(() => []),
            ]);
            setDash(d);
            setRecentMovs(m);
            setPending(p.slice(0, 5));
            setByCategory(bc);
            setByTruck(bt.length > 0 ? bt : buildTruckRowsFromItems(itemsForTruckFallback));
        } catch (e) {
            console.error('[Estoque] erro ao carregar dashboard', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <>
            <style>{ESTOQUE_CSS}</style>
            <style>{ESTOQUE_SECTION_CSS}</style>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                <AdminHeaderHero
                    title="ESTOQUE"
                    subtitle="Monitoramento centralizado de insumos, saldos e movimentações"
                    badge="Gestão de Insumos"
                    rightSlot={(
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                type="button"
                                onClick={() => setMovOpen(true)}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 8,
                                    padding: '10px 18px', borderRadius: 12, cursor: 'pointer',
                                    background: 'rgba(255,255,255,0.06)',
                                    color: '#fff',
                                    border: '1px solid rgba(99,102,241,0.5)',
                                    fontWeight: 700, fontSize: '0.78rem',
                                    fontFamily: 'Orbitron, sans-serif', letterSpacing: '.04em',
                                }}>
                                ↔ Nova movimentação
                            </button>
                            <Link
                                href="/admin/estoque/movimentacoes"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 8,
                                    padding: '10px 18px', borderRadius: 12, textDecoration: 'none',
                                    background: 'rgba(255,255,255,0.06)',
                                    color: '#fff',
                                    border: '1px solid rgba(99,102,241,0.4)',
                                    fontWeight: 700, fontSize: '0.78rem',
                                    fontFamily: 'Orbitron, sans-serif', letterSpacing: '.04em',
                                }}>
                                ↔ Movimentações
                            </Link>
                            <Link
                                href="/admin/estoque/solicitacoes"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 8,
                                    padding: '10px 18px', borderRadius: 12, textDecoration: 'none',
                                    background: 'rgba(255,255,255,0.06)',
                                    color: '#fff',
                                    border: '1px solid rgba(245,158,11,0.5)',
                                    fontWeight: 700, fontSize: '0.78rem',
                                    fontFamily: 'Orbitron, sans-serif', letterSpacing: '.04em',
                                }}>
                                🛒 Solicitações
                            </Link>
                            <Link
                                href="/admin/estoque/itens"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 8,
                                    padding: '10px 18px', borderRadius: 12, textDecoration: 'none',
                                    background: 'rgba(255,255,255,0.06)',
                                    color: '#fff',
                                    border: '1px solid rgba(8,145,178,0.5)',
                                    fontWeight: 700, fontSize: '0.78rem',
                                    fontFamily: 'Orbitron, sans-serif', letterSpacing: '.04em',
                                }}>
                                📦 Estoque completo
                            </Link>
                            <Link
                                href="/admin/estoque/baixa-acao"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 8,
                                    padding: '10px 18px', borderRadius: 12, textDecoration: 'none',
                                    background: 'rgba(255,255,255,0.06)',
                                    color: '#fff',
                                    border: '1px solid rgba(14,165,233,0.5)',
                                    fontWeight: 700, fontSize: '0.78rem',
                                    fontFamily: 'Orbitron, sans-serif', letterSpacing: '.04em',
                                }}>
                                ↧ Baixa por ação
                            </Link>
                            <Link
                                href="/admin/estoque/historico"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 8,
                                    padding: '10px 18px', borderRadius: 12, textDecoration: 'none',
                                    background: 'rgba(255,255,255,0.06)',
                                    color: '#fff',
                                    border: '1px solid rgba(168,85,247,0.4)',
                                    fontWeight: 700, fontSize: '0.78rem',
                                    fontFamily: 'Orbitron, sans-serif', letterSpacing: '.04em',
                                }}>
                                🕐 Auditoria
                            </Link>
                            <Link
                                href="/admin/estoque/itens/novo"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 8,
                                    padding: '10px 22px', borderRadius: 12, textDecoration: 'none',
                                    background: 'linear-gradient(135deg,#FFD600,#E6A800)',
                                    color: '#000',
                                    fontWeight: 800, fontSize: '0.82rem',
                                    fontFamily: 'Orbitron, sans-serif', letterSpacing: '.04em',
                                    boxShadow: '0 0 18px rgba(255,214,0,.4), 0 4px 12px rgba(0,0,0,.12)',
                                }}>
                                ⚡ Novo Item
                            </Link>
                        </div>
                    )}
                />

                <EstoqueSidebarTutorial />

                {/* ── KPI GRID — 7 cartões (cada um abre sidebar de detalhes) ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '1rem' }}>
                    <KpiCard
                        label="Itens cadastrados"
                        icon="📦"
                        value={dash?.totalAtivos ?? 0}
                        color="#0891B2"
                        onClick={() => setActiveKpi('totalAtivos')}
                        delay={0}
                    />
                    <KpiCard
                        label="Saldo em carretas"
                        icon="🚛"
                        value={Math.floor(dash?.saldoCarretas ?? 0)}
                        color="#7C3AED"
                        onClick={() => setActiveKpi('saldoCarretas')}
                        delay={60}
                    />
                    <KpiCard
                        label="Estoque crítico"
                        icon="🚨"
                        value={dash?.alertasEstoqueCritico ?? 0}
                        color="#DC2626"
                        onClick={() => setActiveKpi('estoqueCritico')}
                        delay={120}
                    />
                    <KpiCard
                        label="Estoque baixo"
                        icon="⚠️"
                        value={(dash?.alertasEstoqueBaixoNaoCritico ?? Math.max(0, (dash?.alertasEstoqueBaixo ?? 0) - (dash?.alertasEstoqueCritico ?? 0)))}
                        color="#F59E0B"
                        onClick={() => setActiveKpi('estoqueBaixo')}
                        delay={180}
                    />
                    <KpiCard
                        label="Vencendo (30d)"
                        icon="⏰"
                        value={dash?.alertasVencendo ?? 0}
                        color="#EA580C"
                        onClick={() => setActiveKpi('vencendo')}
                        delay={240}
                    />
                    <KpiCard
                        label="Solicitações pendentes"
                        icon="🛒"
                        value={dash?.solicitacoesPendentes ?? 0}
                        color="#FFD600"
                        onClick={() => setActiveKpi('solicitacoesPendentes')}
                        delay={300}
                    />
                    <KpiCard
                        label="Em trânsito"
                        icon="📦"
                        value={dash?.itensEmTransito ?? 0}
                        color="#3B82F6"
                        onClick={() => setActiveKpi('emTransito')}
                        delay={360}
                    />
                    <KpiCard
                        label="Movimentações no mês"
                        icon="🔄"
                        value={dash?.movimentacoesMes ?? 0}
                        color="#059669"
                        onClick={() => setActiveKpi('movimentacoesMes')}
                        delay={420}
                    />
                </div>

                {/* Sidebar lateral à esquerda com detalhes do KPI selecionado */}
                <EstoqueKpiSidebar
                    kpi={activeKpi}
                    dash={dash}
                    onClose={() => setActiveKpi(null)}
                />

                {/* Modal único de movimentação (Entrada / Saída / Transferência / Devolução / Ajuste / Perda) */}
                <MovimentacaoModal
                    open={movOpen}
                    onClose={() => setMovOpen(false)}
                    onSuccess={() => { load(); }}
                />


                {/* ── Valor total estimado ── */}
                {dash && dash.valorTotalEstimado > 0 && (
                    <div style={{
                        padding: '1.25rem 1.5rem', borderRadius: 16,
                        background: 'linear-gradient(135deg, #FFFDE7, #FFF9C4)',
                        border: '1.5px solid #FEF08A',
                        display: 'flex', alignItems: 'center', gap: 16,
                        animation: 'est-fade-up 0.5s 360ms both',
                    }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.4rem',
                            background: 'linear-gradient(135deg, #FFD600, #E6A800)',
                            boxShadow: '0 4px 14px rgba(255,214,0,0.35)',
                        }}>💰</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B89B00' }}>
                                Valor total estimado do estoque
                            </div>
                            <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.75rem', color: '#7C5A00', lineHeight: 1.1, marginTop: 4 }}>
                                R$ {dash.valorTotalEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 4 }}>
                                Soma de (quantidade no central × preço unitário) para itens com preço cadastrado
                            </div>
                        </div>
                    </div>
                )}

                {/* ── 2 colunas: solicitações pendentes + movimentações recentes ── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                    gap: '1.25rem',
                }}>
                    {/* SOLICITAÇÕES PENDENTES */}
                    <EstoqueSection delay={420} accent="#F59E0B">
                        <EstoqueSectionHeader
                            icon="🛒"
                            title="Solicitações pendentes"
                            subtitle="Compras aguardando aprovação para gerar uma conta a pagar"
                            accent="#F59E0B"
                            action={
                                <Link href="/admin/estoque/solicitacoes" style={sectionActionStyle('#B45309')}>
                                    Ver todas →
                                </Link>
                            }
                        />
                        {loading ? (
                            <EstoqueLoadingState />
                        ) : pending.length === 0 ? (
                            <EstoqueEmptyState icon="✅" label="Nenhuma solicitação pendente" />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {pending.map(req => <PendingRequestRow key={req.id} req={req} />)}
                            </div>
                        )}
                    </EstoqueSection>

                    {/* MOVIMENTAÇÕES RECENTES */}
                    <EstoqueSection delay={480} accent="#059669">
                        <EstoqueSectionHeader
                            icon="🔄"
                            title="Movimentações recentes"
                            subtitle="Últimas variações de saldo (Entrada, Saída, Transferência…)"
                            accent="#059669"
                            action={
                                <Link href="/admin/estoque/movimentacoes" style={sectionActionStyle('#047857')}>
                                    Ver histórico →
                                </Link>
                            }
                        />
                        {loading ? (
                            <EstoqueLoadingState />
                        ) : recentMovs.length === 0 ? (
                            <EstoqueEmptyState icon="🔄" label="Nenhuma movimentação registrada ainda" />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {recentMovs.map(m => <MovementRow key={m.id} mov={m} />)}
                            </div>
                        )}
                    </EstoqueSection>
                </div>

                {/* ── VISÃO POR CATEGORIA ── */}
                <SectionByCategory rows={byCategory} loading={loading} />

                {/* ── VISÃO POR CARRETA ── */}
                <SectionByTruck rows={byTruck} loading={loading} />

                {/* ── AÇÕES RÁPIDAS — todas as áreas do módulo (atalho direto do dashboard) ── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '1rem',
                }}>
                    <QuickActionCard
                        href="/admin/estoque/itens"
                        icon="📦"
                        title="EXPLORAR TODOS OS ITENS"
                        subtitle="Visualizar, filtrar por categoria, editar e gerenciar saldo individual"
                        gradient="linear-gradient(135deg, #FFFDE7 0%, #fff 100%)"
                        borderColor="#FEF08A"
                        iconBg="linear-gradient(135deg, #FFD600, #E6A800)"
                        iconColor="#7C5A00"
                        arrowColor="#B89B00"
                        delay={540}
                    />
                    <QuickActionCard
                        href="/admin/estoque/movimentacoes"
                        icon="🔄"
                        title="MOVIMENTAÇÕES RECENTES"
                        subtitle="Toda entrada, saída, transferência, ajuste, perda, devolução e reposição"
                        gradient="linear-gradient(135deg, #ECFDF5 0%, #fff 100%)"
                        borderColor="#A7F3D0"
                        iconBg="linear-gradient(135deg, #10B981, #059669)"
                        iconColor="#065F46"
                        arrowColor="#059669"
                        delay={600}
                    />
                    <QuickActionCard
                        href="/admin/estoque/solicitacoes"
                        icon="🛒"
                        title="SOLICITAÇÕES PENDENTES"
                        subtitle="Aprovar/rejeitar compras de reposição — gera movimentação e conta a pagar"
                        gradient="linear-gradient(135deg, #FFF7ED 0%, #fff 100%)"
                        borderColor="#FED7AA"
                        iconBg="linear-gradient(135deg, #F59E0B, #D97706)"
                        iconColor="#7C2D12"
                        arrowColor="#EA580C"
                        delay={660}
                    />
                    <QuickActionCard
                        href="/admin/estoque/baixa-acao"
                        icon="↧"
                        title="BAIXA DE ESTOQUE POR AÇÃO"
                        subtitle="Fechamento do ciclo — consumir o kit de insumos por ação/curso"
                        gradient="linear-gradient(135deg, #F0F9FF 0%, #fff 100%)"
                        borderColor="#BAE6FD"
                        iconBg="linear-gradient(135deg, #38BDF8, #0EA5E9)"
                        iconColor="#075985"
                        arrowColor="#0EA5E9"
                        delay={720}
                    />
                    <QuickActionCard
                        href="/admin/carretas"
                        icon="🚛"
                        title="CARRETAS"
                        subtitle="Unidades móveis — estoque por carreta, manutenção e abastecimento"
                        gradient="linear-gradient(135deg, #F5F3FF 0%, #fff 100%)"
                        borderColor="#DDD6FE"
                        iconBg="linear-gradient(135deg, #8B5CF6, #7C3AED)"
                        iconColor="#5B21B6"
                        arrowColor="#7C3AED"
                        delay={780}
                    />
                    <QuickActionCard
                        href="/admin/estoque/historico"
                        icon="📜"
                        title="HISTÓRICO DE AUDITORIA"
                        subtitle="Quem, quando, o quê, por quê — rastreamento completo da área de estoque"
                        gradient="linear-gradient(135deg, #EEF2FF 0%, #fff 100%)"
                        borderColor="#C7D2FE"
                        iconBg="linear-gradient(135deg, #6366F1, #4F46E5)"
                        iconColor="#312E81"
                        arrowColor="#4F46E5"
                        delay={840}
                    />
                </div>
            </div>
        </>
    );
}

// ═══════════════════════════════════════════════════════════════════
//   SectionByCategory — grade com 1 card por categoria (default + custom)
// ═══════════════════════════════════════════════════════════════════
function SectionByCategory({ rows, loading }: { rows: DashboardCategoryRow[]; loading: boolean }) {
    return (
        <EstoqueSection delay={780} accent="#0891B2">
            <EstoqueSectionHeader
                icon="🏷️"
                title="Visão por Categoria"
                subtitle="Quantidade de itens, saldo e valor por categoria. Clique para filtrar."
                accent="#0891B2"
            />

            {loading ? (
                <EstoqueLoadingState />
            ) : rows.length === 0 ? (
                <EstoqueEmptyState icon="🏷️" label="Nenhuma categoria com itens" />
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: '1rem',
                }}>
                    {rows.map(r => {
                        const href = r.tipo === 'custom'
                            ? `/admin/estoque/itens?customCategoryId=${r.customCategoryId}`
                            : `/admin/estoque/itens?categoria=${r.categoriaEnum}`;
                        const hasCritical = r.qtdCritica > 0;
                        return (
                            <Link key={r.key} href={href} style={{
                                textDecoration: 'none', display: 'block',
                                padding: '1rem 1.05rem', borderRadius: 14,
                                background: `linear-gradient(135deg, ${r.color}10 0%, #FFFFFF 72%)`,
                                borderStyle: 'solid',
                                borderWidth: '1px 1px 1px 4px',
                                borderTopColor: `${r.color}25`,
                                borderRightColor: `${r.color}25`,
                                borderBottomColor: `${r.color}25`,
                                borderLeftColor: r.color,
                                boxShadow: '0 2px 10px rgba(0,0,0,.05)',
                                transition: 'all .2s',
                                position: 'relative',
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                                    background: `linear-gradient(90deg, transparent, ${r.color}, transparent)`,
                                    opacity: 0.55, pointerEvents: 'none',
                                }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                    <div style={{
                                        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                                        background: `linear-gradient(135deg, ${r.color}25, ${r.color}08)`,
                                        border: `1.5px solid ${r.color}55`,
                                        boxShadow: `0 0 10px ${r.color}25`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.15rem',
                                    }}>{r.icon}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: '0.78rem', letterSpacing: '0.04em', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {r.nome}
                                            {r.tipo === 'custom' && (
                                                <span title="Customizada" style={{
                                                    marginLeft: 5, fontSize: '0.5rem', fontWeight: 800,
                                                    background: r.color, color: '#fff', padding: '1px 5px', borderRadius: 5,
                                                }}>★</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.62rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                                            {r.totalItens} {r.totalItens === 1 ? 'item' : 'itens'}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 5 }}>
                                    <span style={{ color: '#6B7280', fontWeight: 600 }}>Saldo</span>
                                    <span style={{ color: r.color, fontWeight: 800, fontFamily: 'Orbitron, sans-serif' }}>
                                        {Math.floor(r.saldoCentral).toLocaleString('pt-BR')}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                                    <span style={{ color: '#6B7280', fontWeight: 600 }}>Valor</span>
                                    <span style={{ color: '#111827', fontWeight: 800, fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem' }}>
                                        R$ {r.valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>

                                {(hasCritical || r.qtdBaixa > 0) && (
                                    <div style={{
                                        marginTop: 8, paddingTop: 8, borderTop: '1px dashed #E5E7EB',
                                        display: 'flex', flexWrap: 'wrap', gap: 4, fontSize: '0.62rem',
                                    }}>
                                        {hasCritical && (
                                            <span style={{
                                                padding: '2px 6px', borderRadius: 5, fontWeight: 800,
                                                background: '#FEF2F2', color: '#DC2626',
                                                border: '1px solid #FECACA',
                                            }}>⚠ {r.qtdCritica} crít.</span>
                                        )}
                                        {r.qtdBaixa > 0 && (
                                            <span style={{
                                                padding: '2px 6px', borderRadius: 5, fontWeight: 800,
                                                background: '#FFFBEB', color: '#92400E',
                                                border: '1px solid #FDE68A',
                                            }}>⏳ {r.qtdBaixa} baixo</span>
                                        )}
                                    </div>
                                )}
                                {r.saldoEmTransito > 0 && (
                                    <div style={{ marginTop: 4, fontSize: '0.62rem', color: '#0891B2', fontWeight: 700 }}>
                                        📦 {Math.floor(r.saldoEmTransito)} em trânsito
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            )}
        </EstoqueSection>
    );
}

// ═══════════════════════════════════════════════════════════════════
//   SectionByTruck — grade com 1 card por carreta
// ═══════════════════════════════════════════════════════════════════
function SectionByTruck({ rows, loading }: { rows: DashboardTruckRow[]; loading: boolean }) {
    return (
        <EstoqueSection delay={840} accent="#7C3AED">
            <EstoqueSectionHeader
                icon="🚛"
                title="Visão por Carreta"
                subtitle="Itens distintos, quantidade total e valor por unidade móvel. Clique para abrir."
                accent="#7C3AED"
                action={
                    <Link href="/admin/carretas" style={sectionActionStyle('#7C3AED')}>
                        Ver todas →
                    </Link>
                }
            />

            {loading ? (
                <EstoqueLoadingState />
            ) : rows.length === 0 ? (
                <EstoqueEmptyState icon="🚛" label="Nenhuma carreta com estoque registrada" />
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '1rem',
                }}>
                    {rows.map(t => {
                        const vazia = t.totalItensDistintos === 0;
                        return (
                            <Link key={t.truckId} href={`/admin/carretas/${t.truckId}`} style={{
                                textDecoration: 'none', display: 'block',
                                padding: '1rem 1.1rem', borderRadius: 14,
                                background: vazia ? '#F9FAFB' : 'linear-gradient(135deg, #F5F3FF 0%, #FFFFFF 72%)',
                                borderStyle: 'solid',
                                borderWidth: '1px 1px 1px 4px',
                                borderTopColor: vazia ? '#E5E7EB' : '#DDD6FE',
                                borderRightColor: vazia ? '#E5E7EB' : '#DDD6FE',
                                borderBottomColor: vazia ? '#E5E7EB' : '#DDD6FE',
                                borderLeftColor: vazia ? '#CBD5E1' : '#7C3AED',
                                boxShadow: '0 2px 10px rgba(0,0,0,.05)',
                                transition: 'all .2s',
                                position: 'relative',
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                                    background: vazia
                                        ? 'linear-gradient(90deg, transparent, #CBD5E1, transparent)'
                                        : 'linear-gradient(90deg, transparent, #7C3AED, transparent)',
                                    opacity: 0.6, pointerEvents: 'none',
                                }} />
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                        <div style={{
                                            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                                            background: vazia ? '#F3F4F6' : 'linear-gradient(135deg, #EDE9FE, #F8FAFC)',
                                            border: `1.5px solid ${vazia ? '#E5E7EB' : '#C4B5FD'}`,
                                            boxShadow: vazia ? 'none' : '0 0 10px rgba(124,58,237,.18)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1.15rem',
                                        }}>🚛</div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: '0.9rem', color: '#111827' }}>
                                                {t.identifier}
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono, monospace' }}>
                                                {t.licensePlate || 'Sem placa'} · {truckStatusLabel(t.status)}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: '3px 9px', borderRadius: 999, fontSize: '0.62rem', fontWeight: 800,
                                        background: vazia ? '#F3F4F6' : '#EDE9FE',
                                        color: vazia ? '#9CA3AF' : '#5B21B6',
                                    }}>
                                        {t.totalItensDistintos} itens
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.75rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.6rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.06em' }}>Quantidade</div>
                                        <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 800, color: '#7C3AED' }}>
                                            {Math.floor(t.quantidadeTotal).toLocaleString('pt-BR')} itens
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.6rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.06em' }}>Valor</div>
                                        <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 800, color: '#111827' }}>
                                            R$ {t.valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>

                                {/* Mini-preview dos itens (até 5) */}
                                {!vazia && t.itens.length > 0 && (
                                    <div style={{
                                        marginTop: 8, paddingTop: 8, borderTop: '1px dashed #DDD6FE',
                                        display: 'flex', flexDirection: 'column', gap: 3,
                                    }}>
                                        {t.itens.slice(0, 4).map(it => (
                                            <div key={it.id} style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                fontSize: '0.7rem',
                                            }}>
                                                <span style={{ color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>
                                                    {it.icon} {it.nome}
                                                </span>
                                                <span style={{ color: '#7C3AED', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>
                                                    {it.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {it.unidade}
                                                </span>
                                            </div>
                                        ))}
                                        {t.itens.length > 4 && (
                                            <div style={{ fontSize: '0.65rem', color: '#9CA3AF', textAlign: 'right' }}>
                                                + {t.itens.length - 4} outros →
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            )}
        </EstoqueSection>
    );
}

// ═══════════════════════════════════════════════════════════════════
//   QuickActionCard — atalho contextual
// ═══════════════════════════════════════════════════════════════════
function QuickActionCard({
    href, icon, title, subtitle, gradient, borderColor, iconBg, iconColor, arrowColor, delay,
}: {
    href: string;
    icon: string;
    title: string;
    subtitle: string;
    gradient: string;
    borderColor: string;
    iconBg: string;
    iconColor: string;
    arrowColor: string;
    delay: number;
}) {
    const [hov, setHov] = useState(false);
    return (
        <Link href={href}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                display: 'block', textDecoration: 'none',
                padding: '1.25rem 1.4rem', borderRadius: 16,
                background: gradient,
                border: `1.5px solid ${borderColor}`,
                transition: 'all 0.25s',
                transform: hov ? 'translateY(-2px)' : 'none',
                boxShadow: hov ? '0 8px 20px rgba(0,0,0,0.07)' : '0 1px 4px rgba(0,0,0,0.04)',
                animation: `est-fade-up 0.5s ${delay}ms both`,
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                    width: 50, height: 50, borderRadius: 14, flexShrink: 0,
                    background: iconBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                }}>{icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.92rem', color: iconColor, letterSpacing: '0.04em' }}>
                        {title}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#6B7280', marginTop: 4, lineHeight: 1.45 }}>
                        {subtitle}
                    </div>
                </div>
                <div style={{ fontSize: '1.3rem', color: arrowColor, fontWeight: 800 }}>→</div>
            </div>
        </Link>
    );
}
