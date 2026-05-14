'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeftIcon,
    PencilIcon,
    CheckIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import {
    stockApi,
    StockItem,
    StockMovement,
    TruckStockItem,
    StockItemCategory,
    ConsumptionByItemResponse,
    ReservationsByItemResponse,
    RESERVATION_STATUS_COLOR,
    RESERVATION_STATUS_LABEL,
    CATEGORIA_LABEL,
    CATEGORIA_COLOR,
    CATEGORIA_ICON,
    MOV_TYPE_LABEL,
    MOV_TYPE_COLOR,
    MOV_TYPE_ICON,
    isLowStock,
    daysUntilExpiry,
} from '@/lib/api/stock';
import { toast } from '@/components/ui/Toast';

type Tab = 'dados' | 'carretas' | 'reservas' | 'acoes' | 'historico';

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

const ACAO_STATUS_LABEL: Record<string, string> = {
    PLANEJADA: 'Planejada',
    EM_ANDAMENTO: 'Em andamento',
    CONCLUIDA: 'Concluída',
    CANCELADA: 'Cancelada',
};

const PRIORIDADE_LABEL: Record<string, string> = {
    BAIXA: 'Baixa prioridade',
    NORMAL: 'Prioridade normal',
    CRITICA: 'Prioridade crítica',
};

// ═══════════════════════════════════════════════════════════════════
//   Helper de campo editável (read mode + edit mode)
// ═══════════════════════════════════════════════════════════════════
function ReadField({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
    return (
        <div>
            <div style={{
                fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: '#9CA3AF', marginBottom: '0.3rem',
            }}>{label}</div>
            <div style={{
                fontSize: '0.92rem', fontWeight: 600, color: '#111827',
                fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit',
            }}>
                {value ?? <span style={{ color: '#9CA3AF' }}>—</span>}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//   Página
// ═══════════════════════════════════════════════════════════════════
export default function ItemDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [item, setItem] = useState<(StockItem & { truckStocks: TruckStockItem[]; movimentacoes: StockMovement[] }) | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<Tab>('dados');
    const [consumption, setConsumption] = useState<ConsumptionByItemResponse | null>(null);
    const [consumptionLoading, setConsumptionLoading] = useState(false);
    const [reservas, setReservas] = useState<ReservationsByItemResponse | null>(null);
    const [reservasLoading, setReservasLoading] = useState(false);

    const [form, setForm] = useState<any>({});

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await stockApi.items.getOne(id);
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
            const msg = e?.response?.data?.message;
            toast.error(typeof msg === 'string' ? msg : 'Erro ao carregar item');
            router.replace('/admin/estoque/itens');
        } finally {
            setLoading(false);
        }
    }, [id, router]);

    useEffect(() => { load(); }, [load]);

    // Carrega consumo por ação só quando a aba é aberta (lazy)
    useEffect(() => {
        if (tab === 'acoes' && !consumption && !consumptionLoading) {
            setConsumptionLoading(true);
            stockApi.consumptionByItem(id)
                .then(setConsumption)
                .catch((e) => {
                    console.error('[consumptionByItem]', e);
                    toast.error('Erro ao carregar consumo por ação');
                })
                .finally(() => setConsumptionLoading(false));
        }
        if (tab === 'reservas' && !reservas && !reservasLoading) {
            setReservasLoading(true);
            stockApi.reservations.listByItem(id)
                .then(setReservas)
                .catch((e) => {
                    console.error('[reservationsByItem]', e);
                    toast.error('Erro ao carregar reservas');
                })
                .finally(() => setReservasLoading(false));
        }
    }, [tab, consumption, consumptionLoading, reservas, reservasLoading, id]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await stockApi.items.update(id, {
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
            setEditing(false);
            load();
        } catch (e: any) {
            const msg = e?.response?.data?.message;
            toast.error(Array.isArray(msg) ? msg.join('; ') : (typeof msg === 'string' ? msg : 'Erro ao atualizar'));
        } finally {
            setSaving(false);
        }
    };

    if (loading || !item) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>
                        CARREGANDO...
                    </p>
                </div>
            </div>
        );
    }

    const color = CATEGORIA_COLOR[item.categoria];
    const icon = CATEGORIA_ICON[item.categoria];
    const low = isLowStock(item);
    const dias = daysUntilExpiry(item);
    const vencido = dias !== null && dias < 0;
    const vencendo = dias !== null && dias >= 0 && dias <= 30;

    const saldoCarretasTotal = item.truckStocks.reduce((acc, ts) => acc + Number(ts.quantidadeAtual), 0);
    const saldoTotal = Number(item.quantidadeAtual) + saldoCarretasTotal;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">

            {/* ── HEADER ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                    <Link href="/admin/estoque/itens" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 36, height: 36, borderRadius: 9,
                        background: 'rgba(255,214,0,0.08)', border: '1px solid rgba(255,214,0,0.3)',
                        color: '#B89B00', textDecoration: 'none',
                    }}>
                        <ArrowLeftIcon style={{ width: 16, height: 16 }} />
                    </Link>

                    {item.fotoUrl ? (
                        <div style={{
                            width: 64, height: 64, borderRadius: 14, flexShrink: 0,
                            backgroundImage: `url("${item.fotoUrl}")`,
                            backgroundSize: 'cover', backgroundPosition: 'center',
                            border: `1.5px solid ${color}50`,
                            boxShadow: `0 4px 14px ${color}25`,
                        }} />
                    ) : (
                        <div style={{
                            width: 64, height: 64, borderRadius: 14, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.8rem',
                            background: `linear-gradient(135deg, ${color}22, ${color}06)`,
                            border: `1.5px solid ${color}40`,
                            boxShadow: `0 4px 14px ${color}20`,
                        }}>{icon}</div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h1 className="gradient-text" style={{
                            fontFamily: 'Orbitron, sans-serif', fontSize: '1.55rem', fontWeight: 900,
                            letterSpacing: '0.05em', marginBottom: 4,
                        }}>
                            {item.nome}
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{
                                padding: '3px 10px', borderRadius: 20,
                                background: `${color}15`, border: `1px solid ${color}35`,
                                fontSize: '0.66rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em',
                            }}>
                                {CATEGORIA_LABEL[item.categoria]}
                            </span>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                                {item.codigoInterno || '—'}
                            </span>
                            {!item.active && (
                                <span style={{
                                    padding: '3px 10px', borderRadius: 20,
                                    background: '#FEF2F2', border: '1px solid #FECACA',
                                    fontSize: '0.66rem', fontWeight: 700, color: '#DC2626',
                                    textTransform: 'uppercase', letterSpacing: '0.05em',
                                }}>Inativo</span>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    {!editing ? (
                        <button
                            onClick={() => setEditing(true)}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '0.6rem 1.2rem', borderRadius: 10,
                                background: 'rgba(255,214,0,0.1)', border: '1.5px solid rgba(255,214,0,0.5)',
                                color: '#B89B00', fontWeight: 700, fontSize: '0.82rem',
                                cursor: 'pointer', transition: 'all 0.18s',
                            }}>
                            <PencilIcon style={{ width: 14, height: 14 }} />
                            Editar
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => { setEditing(false); load(); }}
                                disabled={saving}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '0.6rem 1.2rem', borderRadius: 10,
                                    background: '#F3F4F6', border: '1px solid #E5E7EB',
                                    color: '#6B7280', fontWeight: 700, fontSize: '0.82rem',
                                    cursor: saving ? 'wait' : 'pointer',
                                }}>
                                <XMarkIcon style={{ width: 14, height: 14 }} />
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="btn-primary"
                                style={{ opacity: saving ? 0.7 : 1 }}>
                                <CheckIcon style={{ width: 14, height: 14 }} />
                                {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── KPIs do item ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
            }}>
                <KpiBox
                    label="Saldo Central"
                    value={Number(item.quantidadeAtual)}
                    unit={item.unidade}
                    color={low ? '#EF4444' : color}
                    alert={low ? 'Abaixo do mínimo' : undefined}
                />
                <KpiBox
                    label="Saldo em Carretas"
                    value={saldoCarretasTotal}
                    unit={item.unidade}
                    color="#7C3AED"
                    alert={`${item.truckStocks.length} carreta${item.truckStocks.length !== 1 ? 's' : ''}`}
                />
                <KpiBox
                    label="Saldo Total"
                    value={saldoTotal}
                    unit={item.unidade}
                    color="#0891B2"
                />
                <KpiBox
                    label="Quantidade Mínima"
                    value={Number(item.quantidadeMinima)}
                    unit={item.unidade}
                    color="#6B7280"
                />
            </div>

            {/* ── Banner de alertas ── */}
            {(low || vencido || vencendo) && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '0.9rem 1.2rem', borderRadius: 12,
                    background: vencido ? '#FEF2F2' : low ? '#FEF2F2' : '#FFFBEB',
                    border: `1.5px solid ${vencido || low ? '#FECACA' : '#FDE68A'}`,
                }}>
                    <span style={{ fontSize: '1.3rem' }}>{vencido ? '🚨' : low ? '⚠️' : '⏰'}</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: vencido || low ? '#DC2626' : '#B45309' }}>
                            {vencido && 'Este item está VENCIDO'}
                            {!vencido && low && 'Estoque abaixo do mínimo'}
                            {!vencido && !low && vencendo && `Vence em ${dias} dia${dias !== 1 ? 's' : ''}`}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: vencido || low ? '#991B1B' : '#92400E', marginTop: 2 }}>
                            {low && 'Solicite reposição via Solicitações de Compra. '}
                            {vencendo && 'Considere uma baixa por perda ou priorize o consumo.'}
                        </div>
                    </div>
                </div>
            )}

            {/* ── TABS ── */}
            <div style={{
                background: '#fff', borderRadius: 14, border: '1px solid #F3F4F6',
                overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #F3F4F6', background: '#FAFBFC' }}>
                    {([
                        { v: 'dados' as Tab, label: 'Dados',           icon: '📋' },
                        { v: 'carretas' as Tab, label: `Carretas (${item.truckStocks.length})`, icon: '🚛' },
                        { v: 'reservas' as Tab, label: 'Reservado p/ Ações', icon: '🎒' },
                        { v: 'acoes' as Tab, label: 'Ações Consumidoras', icon: '🎯' },
                        { v: 'historico' as Tab, label: `Histórico (${item._count?.movimentacoes ?? item.movimentacoes.length})`, icon: '🔄' },
                    ]).map(t => (
                        <button
                            key={t.v}
                            onClick={() => setTab(t.v)}
                            style={{
                                flex: 1, padding: '0.85rem 1rem',
                                background: tab === t.v ? '#fff' : 'transparent',
                                border: 'none', borderBottom: tab === t.v ? '3px solid #FFD600' : '3px solid transparent',
                                cursor: 'pointer',
                                fontSize: '0.85rem', fontWeight: tab === t.v ? 800 : 600,
                                color: tab === t.v ? '#111827' : '#6B7280',
                                transition: 'all 0.18s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            }}>
                            <span>{t.icon}</span>
                            {t.label}
                        </button>
                    ))}
                </div>

                <div style={{ padding: '1.5rem' }}>
                    {/* ── TAB: DADOS ── */}
                    {tab === 'dados' && (
                        editing ? (
                            <EditForm form={form} setForm={setForm} />
                        ) : (
                            <ReadView item={item} />
                        )
                    )}

                    {/* ── TAB: CARRETAS ── */}
                    {tab === 'carretas' && (
                        item.truckStocks.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#9CA3AF' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🚛</div>
                                <p style={{ fontSize: '0.85rem' }}>Nenhuma carreta possui saldo deste item ainda.</p>
                                <p style={{ fontSize: '0.75rem', marginTop: 8 }}>
                                    Use a movimentação <strong>ENTRADA</strong> para abastecer uma carreta.
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: 10 }}>
                                {item.truckStocks.map(ts => (
                                    <div key={ts.id} style={{
                                        display: 'flex', alignItems: 'center', gap: 14,
                                        padding: '0.9rem 1rem', borderRadius: 11,
                                        background: '#FAFBFC', border: '1px solid #F3F4F6',
                                    }}>
                                        <div style={{
                                            width: 44, height: 44, borderRadius: 11, flexShrink: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1.2rem',
                                            background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)',
                                        }}>🚛</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#111827', fontFamily: 'Orbitron, sans-serif' }}>
                                                {ts.truck?.identifier ?? 'Carreta'}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono, monospace' }}>
                                                {ts.truck?.licensePlate ?? '—'}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.2rem', color: '#7C3AED' }}>
                                                {Number(ts.quantidadeAtual).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                                            </div>
                                            <div style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>{item.unidade}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {/* ── TAB: RESERVADO PARA AÇÕES — kit planejado (futuro) ── */}
                    {tab === 'reservas' && (
                        reservasLoading ? (
                            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#9CA3AF' }}>
                                <div style={{ fontSize: '0.85rem' }}>Carregando reservas…</div>
                            </div>
                        ) : !reservas || reservas.reservations.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#9CA3AF' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎒</div>
                                <p style={{ fontSize: '0.85rem', marginBottom: 8 }}>Nenhuma ação futura reservou este item.</p>
                                <p style={{ fontSize: '0.7rem' }}>
                                    Reservas são criadas no formulário da Ação (aba "Kit de Insumos").
                                </p>
                            </div>
                        ) : (
                            <div>
                                <div style={{
                                    padding: '0.85rem 1rem', borderRadius: 12,
                                    background: 'linear-gradient(135deg, #EFF6FF 0%, #fff 100%)',
                                    border: '1px solid #BFDBFE', marginBottom: 14,
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
                                }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: '#1E40AF', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                                            Reservado para
                                        </div>
                                        <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.4rem', fontWeight: 900, color: '#1E3A8A' }}>
                                            {reservas.totalAcoesFuturas} {reservas.totalAcoesFuturas === 1 ? 'ação futura' : 'ações futuras'}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#1E40AF', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                                            Quantidade pendente
                                        </div>
                                        <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.4rem', fontWeight: 900, color: '#1E3A8A' }}>
                                            {reservas.totalReservadoPendente.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {reservas.item.unidade}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {reservas.reservations.map((r) => {
                                        const status = r.cobertura as keyof typeof RESERVATION_STATUS_COLOR | undefined;
                                        return (
                                            <Link key={r.id}
                                                href={`/admin/acoes/${r.acaoId}`}
                                                style={{
                                                    display: 'block', textDecoration: 'none',
                                                    padding: '0.9rem 1rem', borderRadius: 12,
                                                    background: '#fff', border: '1.5px solid #E5E7EB',
                                                    transition: 'all .2s',
                                                }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            🎯 {r.acao?.nome ?? 'Ação'}
                                                        </div>
                                                        <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: 2, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                            {r.acao?.cidadeNome && <span>📍 {r.acao.cidadeNome}</span>}
                                                            {r.acao?.dataInicio && (
                                                                <span>· {new Date(r.acao.dataInicio).toLocaleDateString('pt-BR')}</span>
                                                            )}
                                                            <span>· {r.acao?.status ? (ACAO_STATUS_LABEL[r.acao.status] ?? r.acao.status) : 'Status não informado'}</span>
                                                            {r.prioridade !== 'NORMAL' && (
                                                                <span style={{
                                                                    padding: '1px 6px', borderRadius: 5, fontWeight: 800,
                                                                    background: r.prioridade === 'CRITICA' ? '#FEF2F2' : '#F3F4F6',
                                                                    color: r.prioridade === 'CRITICA' ? '#DC2626' : '#6B7280',
                                                                }}>{PRIORIDADE_LABEL[r.prioridade] ?? r.prioridade}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                        <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.05rem', color: '#3B82F6' }}>
                                                            {r.quantidadePrevista.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {reservas.item.unidade}
                                                        </div>
                                                        <div style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>
                                                            {r.quantidadeConsumida > 0 ? `${r.quantidadeConsumida} consumido` : 'previsto'}
                                                        </div>
                                                    </div>
                                                </div>
                                                {status && (
                                                    <div style={{ marginTop: 6, fontSize: '0.65rem' }}>
                                                        <span style={{
                                                            padding: '2px 8px', borderRadius: 5, fontWeight: 800,
                                                            background: `${RESERVATION_STATUS_COLOR[status]}15`,
                                                            color: RESERVATION_STATUS_COLOR[status],
                                                            border: `1px solid ${RESERVATION_STATUS_COLOR[status]}40`,
                                                        }}>
                                                            {RESERVATION_STATUS_LABEL[status]}
                                                        </span>
                                                    </div>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        )
                    )}

                    {/* ── TAB: AÇÕES CONSUMIDORAS — vínculo histórico item↔ação ── */}
                    {tab === 'acoes' && (
                        consumptionLoading ? (
                            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#9CA3AF' }}>
                                <div style={{ fontSize: '0.85rem' }}>Carregando consumo por ação…</div>
                            </div>
                        ) : !consumption || consumption.acoes.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#9CA3AF' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎯</div>
                                <p style={{ fontSize: '0.85rem', marginBottom: 8 }}>Este item ainda não foi consumido por nenhuma ação.</p>
                                <p style={{ fontSize: '0.7rem' }}>
                                    Consumo é registrado via movimentação de SAÍDA (Carreta → Ação).
                                </p>
                            </div>
                        ) : (
                            <div>
                                <div style={{
                                    padding: '0.85rem 1rem', borderRadius: 12,
                                    background: 'linear-gradient(135deg, #ECFDF5 0%, #fff 100%)',
                                    border: '1px solid #A7F3D0', marginBottom: 14,
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
                                }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: '#047857', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                                            Já consumido por
                                        </div>
                                        <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.4rem', fontWeight: 900, color: '#065F46' }}>
                                            {consumption.totalAcoes} {consumption.totalAcoes === 1 ? 'ação' : 'ações'}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#047857', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                                            Total geral
                                        </div>
                                        <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.4rem', fontWeight: 900, color: '#065F46' }}>
                                            {consumption.totalConsumidoGeral.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {consumption.item.unidade}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {consumption.acoes.map(row => {
                                        const ultimoMov = row.movimentacoes[0];
                                        return (
                                            <Link key={row.acao.id}
                                                href={`/admin/acoes/${row.acao.id}`}
                                                style={{
                                                    display: 'block', textDecoration: 'none',
                                                    padding: '0.9rem 1rem', borderRadius: 12,
                                                    background: '#fff', border: '1.5px solid #E5E7EB',
                                                    transition: 'all .2s',
                                                }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            🎯 {row.acao.nome}
                                                        </div>
                                                        <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: 2 }}>
                                                            {row.acao.cidadeNome && <>📍 {row.acao.cidadeNome} · </>}
                                                            <span>{ACAO_STATUS_LABEL[row.acao.status] ?? row.acao.status}</span>
                                                            {row.acao.dataInicio && (
                                                                <> · {new Date(row.acao.dataInicio).toLocaleDateString('pt-BR')}</>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                        <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.05rem', color: '#10B981' }}>
                                                            -{row.totalConsumido.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {consumption.item.unidade}
                                                        </div>
                                                        <div style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>
                                                            {row.movimentacoes.length} {row.movimentacoes.length === 1 ? 'saída' : 'saídas'}
                                                        </div>
                                                    </div>
                                                </div>
                                                {ultimoMov && (
                                                    <div style={{
                                                        marginTop: 6, paddingTop: 6,
                                                        borderTop: '1px dashed #E5E7EB',
                                                        fontSize: '0.68rem', color: '#6B7280',
                                                        display: 'flex', flexWrap: 'wrap', gap: 8,
                                                    }}>
                                                        <span>↳ Último consumo: {new Date(row.ultimoConsumoAt).toLocaleDateString('pt-BR')}</span>
                                                        {ultimoMov.fromTruck && (
                                                            <span>· de <strong>🚛 {ultimoMov.fromTruck.identifier}</strong></span>
                                                        )}
                                                        {ultimoMov.registrar && (
                                                            <span>· por {ultimoMov.registrar.name}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        )
                    )}

                    {/* ── TAB: HISTÓRICO ── */}
                    {tab === 'historico' && (
                        item.movimentacoes.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#9CA3AF' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔄</div>
                                <p style={{ fontSize: '0.85rem' }}>Nenhuma movimentação registrada ainda.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: 8 }}>
                                {item.movimentacoes.map(m => (
                                    <MovementHistoryRow key={m.id} mov={m} unidade={item.unidade} />
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//   Componentes auxiliares
// ═══════════════════════════════════════════════════════════════════
function KpiBox({ label, value, unit, color, alert }: { label: string; value: number; unit: string; color: string; alert?: string }) {
    return (
        <div style={{
            padding: '1rem 1.2rem', borderRadius: 14,
            background: '#fff',
            borderStyle: 'solid',
            borderWidth: '1px 1px 1px 4px',
            borderTopColor: color + '25',
            borderRightColor: color + '25',
            borderBottomColor: color + '25',
            borderLeftColor: color,
            boxShadow: '0 2px 8px rgba(0,0,0,.05)',
        }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9CA3AF' }}>
                {label}
            </div>
            <div style={{
                fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.65rem',
                color, lineHeight: 1.1, marginTop: 4,
            }}>
                {value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                <span style={{ fontSize: '0.75rem', marginLeft: 4, color: '#9CA3AF', fontWeight: 500 }}>{unit}</span>
            </div>
            {alert && (
                <div style={{ fontSize: '0.66rem', color: '#9CA3AF', marginTop: 2, fontWeight: 600 }}>
                    {alert}
                </div>
            )}
        </div>
    );
}

function ReadView({ item }: { item: StockItem }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem 2rem' }}>
            <ReadField label="Nome" value={item.nome} />
            <ReadField label="Código Interno" value={item.codigoInterno} mono />
            <ReadField label="Categoria" value={CATEGORIA_LABEL[item.categoria]} />
            <ReadField label="Unidade" value={item.unidade} />
            <ReadField label="Quantidade Mínima" value={`${Number(item.quantidadeMinima)} ${item.unidade}`} />
            <ReadField label="Validade" value={item.validade ? new Date(item.validade).toLocaleDateString('pt-BR') : null} />
            <ReadField label="Preço Unitário" value={item.precoUnitario != null ? `R$ ${Number(item.precoUnitario).toFixed(2).replace('.', ',')}` : null} mono />
            <ReadField label="Fornecedor" value={item.fornecedor} />
            <ReadField label="Localização" value={item.localizacao} />
            <ReadField label="Cadastrado em" value={new Date(item.createdAt).toLocaleString('pt-BR')} mono />
            {item.observacoes && (
                <div style={{ gridColumn: '1 / -1' }}>
                    <ReadField label="Observações" value={item.observacoes} />
                </div>
            )}
        </div>
    );
}

function EditForm({ form, setForm }: { form: any; setForm: (f: any) => void }) {
    const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
    const inputCss: React.CSSProperties = {
        width: '100%', padding: '0.6rem 0.9rem', borderRadius: 10,
        border: '1.5px solid #E5E7EB', background: '#F9FAFB',
        fontSize: '0.85rem', color: '#111827', outline: 'none',
        fontFamily: 'inherit', boxSizing: 'border-box',
    };
    const labelCss: React.CSSProperties = {
        display: 'block', fontSize: '0.62rem', fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        color: '#6B7280', marginBottom: '0.35rem',
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div>
                <label style={labelCss}>Nome</label>
                <input style={inputCss} value={form.nome} onChange={e => set('nome', e.target.value)} />
            </div>
            <div>
                <label style={labelCss}>Código Interno</label>
                <input style={inputCss} value={form.codigoInterno} onChange={e => set('codigoInterno', e.target.value)} />
            </div>
            <div>
                <label style={labelCss}>Categoria</label>
                <select style={inputCss} value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                    {CATEGORIAS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>
            <div>
                <label style={labelCss}>Unidade</label>
                <input style={inputCss} value={form.unidade} onChange={e => set('unidade', e.target.value)} />
            </div>
            <div>
                <label style={labelCss}>Quantidade Mínima</label>
                <input type="number" step="0.001" min={0} style={inputCss} value={form.quantidadeMinima} onChange={e => set('quantidadeMinima', e.target.value)} />
            </div>
            <div>
                <label style={labelCss}>Preço Unitário (R$)</label>
                <input type="number" step="0.01" min={0} style={inputCss} value={form.precoUnitario} onChange={e => set('precoUnitario', e.target.value)} />
            </div>
            <div>
                <label style={labelCss}>Validade</label>
                <input type="date" style={inputCss} value={form.validade} onChange={e => set('validade', e.target.value)} />
            </div>
            <div>
                <label style={labelCss}>Fornecedor</label>
                <input style={inputCss} value={form.fornecedor} onChange={e => set('fornecedor', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelCss}>Localização</label>
                <input style={inputCss} value={form.localizacao} onChange={e => set('localizacao', e.target.value)} placeholder="Ex: Depósito Central — Prateleira A3" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelCss}>URL da Foto</label>
                <input style={inputCss} value={form.fotoUrl} onChange={e => set('fotoUrl', e.target.value)} placeholder="https://..." />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelCss}>Observações</label>
                <textarea style={{ ...inputCss, minHeight: 90, resize: 'vertical' }} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
            </div>

            {/* Aviso */}
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
                    A <strong>quantidade atual</strong> não pode ser alterada aqui. Para ajustes de saldo, use o histórico de movimentações (Ajuste / Perda).
                </div>
            </div>
        </div>
    );
}

function MovementHistoryRow({ mov, unidade }: { mov: StockMovement; unidade: string }) {
    const color = MOV_TYPE_COLOR[mov.type];
    const icon = MOV_TYPE_ICON[mov.type];
    const label = MOV_TYPE_LABEL[mov.type];
    const desc = mov.fromTruck && mov.toTruck
        ? `${mov.fromTruck.identifier} → ${mov.toTruck.identifier}`
        : mov.fromTruck
            ? `de ${mov.fromTruck.identifier}` + (mov.acao ? ` (ação: ${mov.acao.nome})` : '')
            : mov.toTruck
                ? `→ ${mov.toTruck.identifier}`
                : 'Estoque Central';

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '0.85rem 1rem', borderRadius: 11,
            background: '#FAFBFC', border: '1px solid #F3F4F6',
        }}>
            <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem',
                background: `${color}15`, border: `1px solid ${color}35`,
            }}>{icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#111827' }}>
                    {label}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 2 }}>
                    {desc} · por {mov.registrar?.name ?? '—'}
                </div>
                {mov.observacao && (
                    <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: 4, fontStyle: 'italic' }}>
                        “{mov.observacao}”
                    </div>
                )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: '0.95rem', color }}>
                    {Number(mov.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {unidade}
                </div>
                <div style={{ fontSize: '0.64rem', color: '#9CA3AF', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                    {new Date(mov.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </div>
    );
}
