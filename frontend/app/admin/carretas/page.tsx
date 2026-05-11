'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { trucksApi, Truck } from '@/lib/api/trucks';
import Link from 'next/link';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toast } from '@/components/ui/Toast';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { CarretasSidebarTutorial } from '@/components/admin/adminSidebarTutorials';

// ── Keyframes CSS ─────────────────────────────────────────────────────────────

const CARRETAS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
@keyframes cr-fade-up { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
@keyframes cr-scan { 0%,100%{top:0;opacity:.6} 50%{top:100%;opacity:.2} }
@keyframes cr-grid { 0%,100%{opacity:.08} 50%{opacity:.18} }
@keyframes cr-ring { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes cr-glow { 0%,100%{box-shadow:0 0 8px currentColor} 50%{box-shadow:0 0 18px currentColor,0 0 30px currentColor} }
@keyframes cr-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
@keyframes cr-pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
@keyframes cr-truck-slide { from{transform:translateX(-8px);opacity:0} to{transform:translateX(0);opacity:1} }
@keyframes cr-shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
`;

// ── Utilitários ───────────────────────────────────────────────────────────────

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

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
    AVAILABLE: { label: 'Disponível', color: '#10B981', glow: '#10B981', icon: '✅', pulse: true },
    IN_USE: { label: 'Em Ação', color: '#FFD600', glow: '#FFD600', icon: '🚛', pulse: true },
    MAINTENANCE: { label: 'Manutenção', color: '#EF4444', glow: '#EF4444', icon: '🔧', pulse: true },
    INACTIVE: { label: 'Inativo', color: '#6B7280', glow: '#6B7280', icon: '⏸', pulse: false },
} as const;

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, icon, value, color, delay = 0 }:
    { label: string; icon: string; value: number; color: string; delay?: number }) {
    const n = useCountUp(value, 900);
    const [hov, setHov] = useState(false);

    return (
        <div
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
                animation: `cr-fade-up .5s ${delay}ms both`,
                cursor: 'default',
            }}>
            {/* Grid bg */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                backgroundImage: `linear-gradient(${color}06 1px,transparent 1px),linear-gradient(90deg,${color}06 1px,transparent 1px)`,
                backgroundSize: '24px 24px',
                animation: 'cr-grid 4s ease-in-out infinite',
            }} />
            {/* Scan */}
            <div style={{
                position: 'absolute', left: 0, right: 0, height: 1.5,
                background: `linear-gradient(90deg,transparent,${color}50,transparent)`,
                animation: 'cr-scan 3.5s ease-in-out infinite',
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
                animation: 'cr-ring 10s linear infinite', pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', top: -6, right: -6, width: 40, height: 40,
                border: `1px solid ${color}12`, borderRadius: '50%',
                animation: 'cr-ring 7s linear infinite reverse', pointerEvents: 'none',
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
                        animation: 'cr-pulse-dot 1.8s infinite',
                    }} />
                </div>
                <div style={{
                    fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '2rem',
                    color, lineHeight: 1, marginBottom: 4,
                    filter: hov ? `drop-shadow(0 0 8px ${color}90)` : 'none',
                    transition: 'filter .3s',
                    animation: 'cr-float 3s ease-in-out infinite',
                }}>{n}</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#9CA3AF' }}>{label}</div>
            </div>
        </div>
    );
}

// ── Truck Card ────────────────────────────────────────────────────────────────

function TruckCard({ truck, onDelete }: { truck: Truck; onDelete: (id: string) => void }) {
    const [hov, setHov] = useState(false);
    const cfg = STATUS_CFG[truck.status as keyof typeof STATUS_CFG] || STATUS_CFG.INACTIVE;
    const accentColor = cfg.color;

    return (
        <div
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                position: 'relative', overflow: 'hidden', borderRadius: 20,
                background: '#fff',
                borderStyle: 'solid',
                borderWidth: '1px 1px 1px 4px',
                borderTopColor: `${hov ? accentColor + '55' : accentColor + '20'}`,
                borderRightColor: `${hov ? accentColor + '55' : accentColor + '20'}`,
                borderBottomColor: `${hov ? accentColor + '55' : accentColor + '20'}`,
                borderLeftColor: accentColor,
                boxShadow: hov
                    ? `0 0 24px ${accentColor}18, 0 12px 32px rgba(0,0,0,.1)`
                    : `0 2px 8px rgba(0,0,0,.06)`,
                transition: 'all .3s cubic-bezier(.175,.885,.32,1.275)',
                transform: hov ? 'perspective(800px) rotateX(-2deg) rotateY(3deg) translateY(-6px)' : 'none',
                animation: 'cr-truck-slide .5s both',
                display: 'flex', flexDirection: 'column',
            }}>
            {/* Grid animado */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                backgroundImage: `linear-gradient(${accentColor}05 1px,transparent 1px),linear-gradient(90deg,${accentColor}05 1px,transparent 1px)`,
                backgroundSize: '28px 28px',
                animation: 'cr-grid 5s ease-in-out infinite',
            }} />
            {/* Scan line */}
            <div style={{
                position: 'absolute', left: 0, right: 0, height: 1.5,
                background: `linear-gradient(90deg,transparent,${accentColor}40,transparent)`,
                animation: 'cr-scan 4.5s ease-in-out infinite',
                pointerEvents: 'none',
            }} />
            {/* Top line */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg,transparent,${accentColor},transparent)`,
                opacity: hov ? .9 : .4, transition: 'opacity .3s',
            }} />
            {/* Rings */}
            <div style={{
                position: 'absolute', top: -20, right: -20, width: 80, height: 80,
                border: `1px solid ${accentColor}14`, borderRadius: '50%',
                animation: 'cr-ring 12s linear infinite', pointerEvents: 'none',
            }} />

            {/* Body */}
            <div style={{ position: 'relative', zIndex: 1, padding: '18px 18px 14px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{
                        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem',
                        background: `linear-gradient(135deg,${accentColor}22,${accentColor}06)`,
                        border: `1px solid ${accentColor}35`,
                        boxShadow: hov ? `0 0 14px ${accentColor}35` : `0 0 4px ${accentColor}10`,
                        transition: 'box-shadow .3s',
                    }}>🚛</div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '3px 10px', borderRadius: 20,
                            background: accentColor + '15', border: `1px solid ${accentColor}35`,
                            fontSize: '0.68rem', fontWeight: 700, color: accentColor,
                        }}>
                            <span style={{
                                width: 5, height: 5, borderRadius: '50%', background: accentColor,
                                animation: 'cr-pulse-dot 2s infinite', display: 'inline-block',
                            }} />
                            {cfg.label}
                        </span>
                    </div>
                </div>

                {/* Identifier */}
                <div style={{
                    fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1rem',
                    color: '#111827', marginBottom: 2, letterSpacing: '.04em',
                    filter: hov ? `drop-shadow(0 0 4px ${accentColor}50)` : 'none',
                    transition: 'filter .3s',
                }}>{truck.identifier}</div>
                <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: 10, fontFamily: 'JetBrains Mono' }}>
                    {truck.licensePlate}
                </div>

                {/* Info chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {[
                        { label: truck.group?.name ?? '—', color: '#6366F1' },
                        { label: truck.state, color: '#0891B2' },
                        { label: truck.type === 'MULTICOURSE' ? 'Multicurso' : 'Padrão', color: truck.type === 'MULTICOURSE' ? '#EA580C' : '#059669' },
                    ].map(chip => (
                        <span key={chip.label} style={{
                            padding: '2px 8px', borderRadius: 8, fontSize: '0.65rem', fontWeight: 700,
                            background: chip.color + '12', color: chip.color, border: `1px solid ${chip.color}25`,
                        }}>{chip.label}</span>
                    ))}
                </div>

                {/* Capacidade */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
                    <span style={{
                        fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.6rem',
                        color: accentColor,
                        filter: hov ? `drop-shadow(0 0 8px ${accentColor}70)` : 'none',
                        transition: 'filter .3s',
                        animation: 'cr-float 3s ease-in-out infinite',
                    }}>{truck.capacity}</span>
                    <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>vagas · {truck.roomsCount} sala(s)</span>
                </div>

                {/* Alerta manutenção */}
                {truck.status === 'MAINTENANCE' && (
                    <div style={{
                        padding: '8px 12px', borderRadius: 10,
                        background: '#FEF2F2', border: '1px solid #FECACA',
                        color: '#DC2626', fontSize: '0.7rem', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12,
                    }}>
                        ⚠️ Em manutenção — não pode ser vinculada a ações
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{
                position: 'relative', zIndex: 1,
                borderTop: `1px solid ${accentColor}15`,
                background: 'rgba(0,0,0,.01)',
                padding: '10px 18px',
                display: 'flex', gap: 8,
            }}>
                <Link href={`/admin/carretas/${truck.id}/manutencao`} style={{
                    flex: 1, textAlign: 'center', textDecoration: 'none',
                    padding: '8px 0', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700,
                    background: `linear-gradient(135deg,${accentColor},${accentColor}cc)`,
                    color: truck.status === 'IN_USE' ? '#000' : truck.status === 'AVAILABLE' ? '#fff' : '#fff',
                    boxShadow: hov ? `0 0 18px ${accentColor}50` : `0 2px 8px ${accentColor}25`,
                    transition: 'box-shadow .3s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}>
                    🔧 Manutenção
                </Link>
                <Link href={`/admin/carretas/${truck.id}`} style={{
                    padding: '8px 12px', borderRadius: 10, textDecoration: 'none',
                    background: '#F9FAFB', border: '1px solid #E5E7EB',
                    color: '#374151', fontSize: '0.72rem', display: 'flex', alignItems: 'center',
                    transition: 'background .2s',
                }}>✏️</Link>
                <button onClick={() => onDelete(truck.id)} style={{
                    padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                    background: '#FEF2F2', border: '1px solid #FECACA',
                    color: '#EF4444', fontSize: '0.72rem', display: 'flex', alignItems: 'center',
                    transition: 'background .2s',
                }}>🗑</button>
            </div>
        </div>
    );
}

// ── Página Principal ──────────────────────────────────────────────────────────

export default function CarretasPage() {
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'MA' | 'PI'>('all');
    const [search, setSearch] = useState('');
    const [deleteTruckId, setDeleteTruckId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const loadTrucks = useCallback(async () => {
        try {
            setLoading(true);
            const f = filter !== 'all' ? { state: filter } : undefined;
            setTrucks(await trucksApi.getAll(f));
        } catch { /* noop */ } finally { setLoading(false); }
    }, [filter]);

    useEffect(() => { loadTrucks(); }, [loadTrucks]);

    const handleDelete = async (id: string) => {
        setDeleteTruckId(id);
    };

    const confirmDelete = async () => {
        if (!deleteTruckId) return;
        setDeleting(true);
        try {
            await trucksApi.delete(deleteTruckId);
            setDeleteTruckId(null);
            loadTrucks();
            toast.success('Carreta excluída com sucesso!');
        } catch {
            toast.error('Erro ao excluir carreta. Verifique se não está vinculada a turmas.');
        } finally {
            setDeleting(false);
        }
    };

    const total = trucks.length;
    const available = trucks.filter(t => t.status === 'AVAILABLE').length;
    const inUse = trucks.filter(t => t.status === 'IN_USE').length;
    const maintenance = trucks.filter(t => t.status === 'MAINTENANCE').length;

    const filtered = trucks.filter(t =>
        !search || t.identifier.toLowerCase().includes(search.toLowerCase()) ||
        t.licensePlate.toLowerCase().includes(search.toLowerCase()) ||
        (t.group?.name ?? '').toLowerCase().includes(search.toLowerCase())
    );

    const FILTERS = [
        { label: 'Todas', value: 'all' as const },
        { label: 'Maranhão', value: 'MA' as const },
        { label: 'Piauí', value: 'PI' as const },
    ];

    return (
        <>
            <style>{CARRETAS_CSS}</style>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                <AdminHeaderHero
                    title="CARRETAS"
                    subtitle="Gerencie a frota de unidades móveis do programa"
                    badge="Operação logística"
                    rightSlot={(
                        <Link
                            href="/admin/carretas/nova"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '10px 22px',
                                borderRadius: 12,
                                textDecoration: 'none',
                                background: 'linear-gradient(135deg,#FFD600,#E6A800)',
                                color: '#000',
                                fontWeight: 800,
                                fontSize: '0.82rem',
                                fontFamily: 'Orbitron, sans-serif',
                                letterSpacing: '.04em',
                                boxShadow: '0 0 18px rgba(255,214,0,.4), 0 4px 12px rgba(0,0,0,.12)',
                                transition: 'box-shadow .25s',
                            }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 28px rgba(255,214,0,.65)'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 18px rgba(255,214,0,.4), 0 4px 12px rgba(0,0,0,.12)'}
                        >
                            ⚡ Nova Carreta
                        </Link>
                    )}
                />
                <CarretasSidebarTutorial />

                {/* ── KPIs ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem' }}>
                    <KpiCard label="Total" icon="🚛" value={total} color="#B89B00" delay={0} />
                    <KpiCard label="Disponíveis" icon="✅" value={available} color="#10B981" delay={60} />
                    <KpiCard label="Em Uso" icon="🔄" value={inUse} color="#3B82F6" delay={120} />
                    <KpiCard label="Manutenção" icon="🔧" value={maintenance} color="#EF4444" delay={180} />
                </div>

                {/* ── FILTROS + BUSCA ── */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
                    padding: '0.75rem 1rem', borderRadius: 14,
                    background: '#fff', border: '1px solid #F3F4F6',
                    boxShadow: '0 2px 8px rgba(0,0,0,.05)',
                }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: '#9CA3AF' }}>Estado</span>
                    {FILTERS.map(f => (
                        <button key={f.value} onClick={() => setFilter(f.value)} style={{
                            padding: '0.38rem 1rem', borderRadius: 9, fontSize: '0.78rem', fontWeight: 700,
                            border: 'none', cursor: 'pointer', transition: 'all .2s',
                            background: filter === f.value ? '#FFD600' : '#F3F4F6',
                            color: filter === f.value ? '#000' : '#6B7280',
                            boxShadow: filter === f.value ? '0 2px 8px rgba(255,214,0,.35)' : 'none',
                        }}>{f.label}</button>
                    ))}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar carretas..."
                            style={{
                                padding: '6px 12px', borderRadius: 9, border: '1px solid #E5E7EB',
                                fontSize: '0.78rem', color: '#111827', outline: 'none',
                                background: '#FAFAFA', width: 180,
                            }}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                            {loading ? '...' : `${filtered.length} carreta${filtered.length !== 1 ? 's' : ''}`}
                        </span>
                    </div>
                </div>

                {/* ── GRID DE CARDS ── */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '5rem' }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: '50%', margin: '0 auto 1rem',
                            border: '3px solid #FFD600', borderTopColor: 'transparent',
                            animation: 'cr-ring .8s linear infinite',
                        }} />
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '.18em', color: '#9CA3AF' }}>CARREGANDO FROTA...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '5rem', background: '#fff', borderRadius: 18, border: '1px solid #F3F4F6' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 12, animation: 'cr-float 3s ease-in-out infinite' }}>🚛</div>
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.72rem', letterSpacing: '.15em', color: '#9CA3AF' }}>NENHUMA CARRETA ENCONTRADA</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1.25rem' }}>
                        {filtered.map(truck => (
                            <TruckCard key={truck.id} truck={truck} onDelete={handleDelete} />
                        ))}
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={!!deleteTruckId}
                title="EXCLUIR CARRETA"
                message="Tem certeza que deseja excluir esta carreta? Esta ação não pode ser desfeita."
                confirmLabel="Excluir"
                danger
                loading={deleting}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTruckId(null)}
            />
        </>
    );
}
