'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api/client';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';

/* ─── tipos ──────────────────────────────────────────────────── */
interface Truck {
    id: string; identifier: string; licensePlate: string;
    type: string; modelYear?: number; capacity?: number;
    state?: string; roomsCount?: number; status: string;
    notes?: string; lastMaintenanceDate?: string; nextMaintenanceDate?: string;
    maintenances?: Maintenance[];
}
interface Maintenance {
    id: string; tipo: string; titulo?: string; descricao?: string;
    status: string; prioridade?: string; dataAgendada?: string;
    dataConclusao?: string; custoReal?: number;
}
interface Stats {
    agendadas: number; emAndamento: number; concluidas: number; canceladas: number;
    totalGasto: number; truck?: any; proxima?: any;
}
interface TruckHistoryItem {
    truckId: string; licensePlate: string; identifier: string;
    tripCount: number; totalKm: number;
    lastUsedDate: Date | null; firstUsedDate: Date | null;
    isActive: boolean;
}

/* ─── helpers ─────────────────────────────────────────────────── */
const STATUS_TRUCK: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    AVAILABLE:   { label: 'Disponível',    color: '#059669', bg: 'rgba(5,150,105,.12)',  dot: '#34D399' },
    IN_USE:      { label: 'Em Uso',        color: '#0891B2', bg: 'rgba(8,145,178,.12)',  dot: '#38BDF8' },
    MAINTENANCE: { label: 'Manutenção',    color: '#D97706', bg: 'rgba(217,119,6,.12)',  dot: '#FBBF24' },
    INACTIVE:    { label: 'Inativo',       color: '#6B7280', bg: 'rgba(107,114,128,.12)',dot: '#9CA3AF' },
};
const STATUS_MNT: Record<string, { label: string; color: string; bg: string }> = {
    agendada:     { label: 'Pendente',     color: '#D97706', bg: 'rgba(251,191,36,.12)' },
    em_andamento: { label: 'Em Andamento', color: '#0891B2', bg: 'rgba(8,145,178,.10)'  },
    concluida:    { label: 'Concluída',    color: '#059669', bg: 'rgba(5,150,105,.10)'  },
    PENDING:      { label: 'Pendente',     color: '#D97706', bg: 'rgba(251,191,36,.12)' },
    IN_PROGRESS:  { label: 'Em Andamento', color: '#0891B2', bg: 'rgba(8,145,178,.10)'  },
    COMPLETED:    { label: 'Concluída',    color: '#059669', bg: 'rgba(5,150,105,.10)'  },
};
const PRIO_COLORS: Record<string, string> = {
    critica: '#7C3AED', alta: '#DC2626', media: '#D97706', baixa: '#059669',
    CRITICAL: '#7C3AED', HIGH: '#DC2626', MEDIUM: '#D97706', LOW: '#059669',
};
const TYPE_ICONS: Record<string, string> = {
    preventiva: '🔧', corretiva: '🔨', pneu: '🛞', revisao: '🔩', eletrica: '⚡', funilaria: '🚛', outro: '📋',
};
function fmtDate(d?: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function diasDesde(d?: string | null): number {
    if (!d) return -1;
    return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

/* ─── CSS ─────────────────────────────────────────────────────── */
const CSS = `
@keyframes vhc-up     { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
@keyframes vhc-pulse  { 0%,100%{box-shadow:0 0 0 0 rgba(255,214,0,0.5)} 70%{box-shadow:0 0 0 10px rgba(255,214,0,0)} }
@keyframes vhc-spin   { to{transform:rotate(360deg)} }
@keyframes vhc-shimmer{ 0%{background-position:-200% 0} 100%{background-position:200% 0} }

.vhc-page { display:flex; flex-direction:column; gap:1.25rem; animation:vhc-up .4s cubic-bezier(.22,1,.36,1); }

.vhc-hero {
    position:relative; overflow:hidden; border-radius:20px;
    background:linear-gradient(135deg,#FFFDE7 0%,#FFF9C4 60%,#FFFBEB 100%);
    border:1px solid rgba(255,214,0,.4); padding:1.75rem;
    box-shadow:0 6px 32px rgba(255,214,0,.15),0 1px 4px rgba(0,0,0,.04);
}
.vhc-hero::before {
    content:''; position:absolute; top:-60px; right:-60px;
    width:200px; height:200px; border-radius:50%;
    background:radial-gradient(circle,rgba(255,214,0,.25),transparent 70%);
    pointer-events:none;
}

.vhc-plate {
    font-family:Orbitron,sans-serif; font-weight:900; font-size:2rem;
    letter-spacing:.12em; color:#0F172A;
    text-shadow:0 2px 12px rgba(0,0,0,.08);
}

.vhc-status-dot { width:9px; height:9px; border-radius:50%; display:inline-block; flex-shrink:0; }

.vhc-kpis { display:grid; grid-template-columns:repeat(3,1fr); gap:.75rem; }
@media(max-width:540px){ .vhc-kpis { grid-template-columns:repeat(2,1fr); } }

.vhc-kpi {
    background:#fff; border-radius:14px; padding:1rem;
    border:1px solid #E5E7EB; box-shadow:0 1px 4px rgba(0,0,0,.05);
    display:flex; flex-direction:column; gap:.3rem;
    transition:box-shadow .2s,transform .2s;
}
.vhc-kpi:hover { box-shadow:0 6px 20px rgba(255,214,0,.18); transform:translateY(-2px); }

.vhc-spec-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.7rem; }
@media(max-width:720px){ .vhc-spec-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
.vhc-spec {
    background:#F3F4F6;
    border:1px solid #D1D5DB;
    border-radius:14px;
    padding:.85rem .9rem;
    min-height:90px;
    display:flex;
    flex-direction:column;
    justify-content:space-between;
    box-shadow:0 1px 4px rgba(15,23,42,.06);
}
.vhc-spec-icon { font-size:1.02rem; line-height:1; }
.vhc-spec-label {
    font-size:.62rem;
    color:#9CA3AF;
    font-weight:800;
    text-transform:uppercase;
    letter-spacing:.08em;
}
.vhc-spec-value {
    font-family:Orbitron,sans-serif;
    color:#0F172A;
    font-weight:900;
    font-size:.95rem;
    letter-spacing:.04em;
}

.vhc-card {
    background:#fff; border-radius:16px; border:1px solid #E5E7EB;
    padding:1.25rem 1.5rem; box-shadow:0 1px 6px rgba(0,0,0,.05);
}
.vhc-row {
    display:flex; justify-content:space-between; align-items:center;
    padding:.65rem 0; border-bottom:1px solid #F3F4F6;
}
.vhc-row:last-child { border-bottom:none; }

.vhc-mnt-item {
    display:flex; align-items:center; gap:.85rem; padding:.85rem 1rem;
    border-radius:12px; border:1.5px solid #E5E7EB; background:#fff;
    cursor:pointer; transition:all .18s;
}
.vhc-mnt-item:hover { border-color:#FFD600; box-shadow:0 4px 16px rgba(255,214,0,.15); transform:translateY(-1px); }

.vhc-emergency {
    width:100%; padding:1rem; border-radius:14px; border:2px dashed rgba(220,38,38,.35);
    background:rgba(254,242,242,.6); cursor:pointer; display:flex;
    align-items:center; justify-content:center; gap:.6rem;
    color:#DC2626; font-weight:700; font-size:.88rem;
    transition:all .2s;
}
.vhc-emergency:hover { background:rgba(254,242,242,.95); border-color:#DC2626; box-shadow:0 4px 16px rgba(220,38,38,.12); }

.vhc-tab { padding:.45rem 1.1rem; border-radius:100px; font-size:.75rem; font-weight:700;
    border:1.5px solid #E5E7EB; cursor:pointer; transition:all .18s; background:transparent; color:#6B7280; }
.vhc-tab.active { background:#FFD600; border-color:#FFD600; color:#0F172A; box-shadow:0 2px 8px rgba(255,214,0,.4); }

.vhc-modal-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,.5);
    backdrop-filter:blur(8px); z-index:200;
    display:flex; align-items:center; justify-content:center; padding:1rem;
}
.vhc-modal {
    background:#fff; border-radius:20px; padding:1.75rem;
    width:min(480px,calc(100% - 2rem)); max-height:90vh; overflow-y:auto;
    box-shadow:0 20px 60px rgba(0,0,0,.2);
    animation:vhc-up .3s ease;
}
`;

/* ─── Modal Solicitar Veículo Substituto ─────────────────────── */
function ModalSubstituto({ truckId, onClose, onSaved }: { truckId: string; onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState({ motivo: '', descricao: '', urgencia: 'alta' });
    const [saving, setSaving] = useState(false);
    const [ok, setOk] = useState(false);

    const S: React.CSSProperties = {
        width:'100%', padding:'.75rem .9rem', borderRadius:10,
        border:'1.5px solid #E5E7EB', background:'#F9FAFB',
        fontSize:'.87rem', color:'#111827', outline:'none', boxSizing:'border-box' as const,
    };

    const handleSubmit = async () => {
        if (!form.descricao.trim()) return;
        setSaving(true);
        try {
            await api.post('/truck-maintenance', {
                truckId,
                tipo: 'corretiva',
                titulo: `⚠️ SOLICITAÇÃO URGENTE — ${form.motivo || 'Falha Grave / Veículo Substituto'}`,
                descricao: form.descricao,
                status: 'agendada', prioridade: form.urgencia,
                dataAgendada: new Date().toISOString(),
            });
            await api.post('/reimbursements', {
                type: 'EMERGENCY_REPAIR', amount: 0,
                description: `[SUBSTITUIÇÃO EMERGENCIAL] ${form.descricao}`,
            }).catch(() => {});
            setOk(true);
            setTimeout(() => { onSaved(); onClose(); }, 2000);
        } finally { setSaving(false); }
    };

    return (
        <div className="vhc-modal">
            <div style={{ display:'flex', alignItems:'center', gap:'.75rem', marginBottom:'1.25rem' }}>
                <div style={{ width:42, height:42, borderRadius:12, background:'rgba(220,38,38,.1)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem' }}>🚨</div>
                <div>
                    <div style={{ fontFamily:'Orbitron', fontWeight:900, fontSize:'1rem', color:'#111827' }}>
                        SOLICITAR VEÍCULO SUBSTITUTO
                    </div>
                    <div style={{ fontSize:'.72rem', color:'#6B7280', marginTop:2 }}>
                        Solicitação emergencial enviada ao coordenador
                    </div>
                </div>
                <button onClick={onClose} style={{ marginLeft:'auto', background:'#F3F4F6', border:'none',
                    borderRadius:8, width:32, height:32, cursor:'pointer', fontSize:'1rem', color:'#6B7280' }}>✕</button>
            </div>

            {ok && (
                <div style={{ padding:'1rem', borderRadius:12, background:'#F0FDF4', border:'1px solid #BBF7D0',
                    color:'#059669', fontSize:'.85rem', textAlign:'center', marginBottom:'1rem' }}>
                    ✅ Solicitação enviada! O coordenador foi notificado.
                </div>
            )}

            <div style={{ display:'flex', flexDirection:'column' as const, gap:'1rem' }}>
                <div>
                    <label style={{ display:'block', fontSize:'.63rem', fontWeight:800, textTransform:'uppercase' as const,
                        color:'#6B7280', letterSpacing:'.08em', marginBottom:6 }}>Motivo Principal</label>
                    <select style={{ ...S, appearance:'none' as any }} value={form.motivo}
                        onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}>
                        <option value="">Selecione o motivo...</option>
                        <option value="Pane mecânica">🔧 Pane mecânica</option>
                        <option value="Acidente de trânsito">🚧 Acidente de trânsito</option>
                        <option value="Pneu furado / sem estepe">🛞 Pneu furado / sem estepe</option>
                        <option value="Falha no motor">⚡ Falha no motor</option>
                        <option value="Problema elétrico grave">🔌 Problema elétrico grave</option>
                        <option value="Freios com defeito">⛔ Freios com defeito</option>
                        <option value="Outro">📋 Outro</option>
                    </select>
                </div>
                <div>
                    <label style={{ display:'block', fontSize:'.63rem', fontWeight:800, textTransform:'uppercase' as const,
                        color:'#6B7280', letterSpacing:'.08em', marginBottom:6 }}>Urgência</label>
                    <div style={{ display:'flex', gap:'.5rem' }}>
                        {[['critica','🔴 Crítica'],['alta','🟠 Alta'],['media','🟡 Média']].map(([v,l]) => (
                            <button key={v} onClick={() => setForm(f => ({ ...f, urgencia: v }))}
                                style={{ flex:1, padding:'.5rem .25rem', borderRadius:9, border:`2px solid ${form.urgencia===v ? PRIO_COLORS[v] : '#E5E7EB'}`,
                                    background: form.urgencia===v ? `${PRIO_COLORS[v]}15` : 'transparent',
                                    color: form.urgencia===v ? PRIO_COLORS[v] : '#6B7280',
                                    fontWeight:700, fontSize:'.73rem', cursor:'pointer' }}>
                                {l}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label style={{ display:'block', fontSize:'.63rem', fontWeight:800, textTransform:'uppercase' as const,
                        color:'#6B7280', letterSpacing:'.08em', marginBottom:6 }}>Descrição do Ocorrido *</label>
                    <textarea rows={4} style={{ ...S, resize:'none' as const, fontFamily:'inherit' }}
                        placeholder="Ex: Motor parou na BR-135 km 204. Alunos a bordo. Necessário substituto urgente."
                        value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
                </div>
                <div style={{ display:'flex', gap:'.75rem' }}>
                    <button onClick={onClose} style={{ flex:1, padding:'.8rem', borderRadius:10,
                        border:'1.5px solid #E5E7EB', background:'transparent', color:'#6B7280',
                        fontWeight:600, cursor:'pointer', fontSize:'.85rem' }}>Cancelar</button>
                    <button onClick={handleSubmit} disabled={saving || ok || !form.descricao.trim()}
                        style={{ flex:2, padding:'.8rem', borderRadius:10, border:'none',
                            background: saving || ok ? '#9CA3AF' : 'linear-gradient(135deg,#DC2626,#B91C1C)',
                            color:'#fff', fontWeight:800, cursor:'pointer', fontSize:'.85rem',
                            boxShadow: saving || ok ? 'none' : '0 4px 14px rgba(220,38,38,.35)' }}>
                        {saving ? '⏳ Enviando...' : ok ? '✅ Enviado!' : '🚨 Enviar Solicitação'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Página Principal ────────────────────────────────────────── */
export default function DriverVeiculo() {
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [selected, setSelected] = useState(0);
    const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [truckHistory, setTruckHistory] = useState<TruckHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [tabMnt, setTabMnt] = useState('todas');
    const [showModal, setShowModal] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [histExpanded, setHistExpanded] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const tripsRes = await api.get('/driver/trips');
            const trips: any[] = Array.isArray(tripsRes.data) ? tripsRes.data : [];

            // Agrupa trips por truckId para detectar atual vs. histórico
            const truckMap = new Map<string, {
                licensePlate: string; identifier: string;
                trips: any[]; hasActive: boolean;
                lastDate: number; firstDate: number; totalKm: number;
            }>();

            for (const t of trips) {
                const tid: string = t.truckId;
                if (!tid) continue;
                if (!truckMap.has(tid)) {
                    truckMap.set(tid, {
                        licensePlate: t.truck?.licensePlate || '—',
                        identifier: t.truck?.identifier || tid,
                        trips: [], hasActive: false,
                        lastDate: 0, firstDate: Infinity, totalKm: 0,
                    });
                }
                const entry = truckMap.get(tid)!;
                entry.trips.push(t);
                if (['IN_TRANSIT', 'PLANNED'].includes(t.status)) entry.hasActive = true;
                const ts = new Date(t.departureDate).getTime();
                if (ts > entry.lastDate) entry.lastDate = ts;
                if (ts < entry.firstDate) entry.firstDate = ts;
                if (t.kmStart && t.kmEnd && t.kmEnd > t.kmStart) entry.totalKm += t.kmEnd - t.kmStart;
            }

            // Ordena: ativo primeiro, depois mais recente
            const sortedEntries = Array.from(truckMap.entries()).sort(([, a], [, b]) => {
                if (a.hasActive && !b.hasActive) return -1;
                if (!a.hasActive && b.hasActive) return 1;
                return b.lastDate - a.lastDate;
            });

            // Busca detalhes completos de cada truck
            const truckList: Truck[] = [];
            for (const [tid] of sortedEntries) {
                try {
                    const res = await api.get(`/trucks/${tid}`);
                    truckList.push(res.data);
                } catch { /* skip */ }
            }
            setTrucks(truckList);

            // Manutenções e stats do truck atual
            const currentId = sortedEntries[0]?.[0];
            if (currentId) {
                const [mntRes, statsRes] = await Promise.allSettled([
                    api.get(`/truck-maintenance/truck/${currentId}`),
                    api.get(`/truck-maintenance/truck/${currentId}/stats`),
                ]);
                if (mntRes.status === 'fulfilled') {
                    const d = mntRes.value.data;
                    setMaintenances(Array.isArray(d) ? d : (d?.data ?? []));
                }
                if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
            }

            // Histórico de frota (todos os trucks, inclusive o atual para metadados)
            const history: TruckHistoryItem[] = sortedEntries.map(([tid, e]) => ({
                truckId: tid, licensePlate: e.licensePlate, identifier: e.identifier,
                tripCount: e.trips.length, totalKm: e.totalKm,
                lastUsedDate: e.lastDate > 0 ? new Date(e.lastDate) : null,
                firstUsedDate: e.firstDate < Infinity ? new Date(e.firstDate) : null,
                isActive: e.hasActive,
            }));
            setTruckHistory(history);

        } catch { /* silencioso */ } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);
    useEffect(() => { setMounted(true); }, []);

    // — remove o segundo useEffect de reload (ao trocar de veículo) —
    // Agora o load() já obtém manutenções do truck ativo corretamente

    if (loading) return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'50vh' }}>
            <style>{`@keyframes vhc-spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ textAlign:'center' }}>
                <div style={{ width:40, height:40, border:'3px solid #FFD600', borderTopColor:'transparent',
                    borderRadius:'50%', animation:'vhc-spin .75s linear infinite', margin:'0 auto 1rem' }} />
                <p style={{ color:'#9CA3AF', fontSize:'.8rem', fontFamily:'Orbitron,sans-serif', letterSpacing:'.1em' }}>
                    CARREGANDO...
                </p>
            </div>
        </div>
    );

    const truck = trucks[selected] ?? null;
    const st = truck ? (STATUS_TRUCK[truck.status] || STATUS_TRUCK.AVAILABLE) : null;
    const diasMnt = truck ? diasDesde(truck.lastMaintenanceDate) : -1;

    const mntFiltradas = maintenances.filter(m =>
        tabMnt === 'todas' ? true :
        tabMnt === 'pendente' ? ['agendada','PENDING'].includes(m.status) :
        tabMnt === 'andamento' ? ['em_andamento','IN_PROGRESS'].includes(m.status) :
        ['concluida','COMPLETED'].includes(m.status)
    );

    return (
        <>
        <style>{CSS}</style>
        <div className="vhc-page">

            {/* ── HEADER ──────────────────────────────────────────────── */}
            <AdminHeaderHero
                title="MEU VEÍCULO"
                subtitle={trucks.length > 0 ? `${trucks.length} veículo(s) vinculado(s)` : 'Gerenciamento do veículo atribuído'}
                badge="MOTORISTA"
                rightSlot={truck ? (
                    <button onClick={() => setShowModal(true)} className="btn-primary">
                        🚨 Solicitar Substituto
                    </button>
                ) : undefined}
            />

            {/* ── SEM VEÍCULO ─────────────────────────────────────────── */}
            {trucks.length === 0 && (
                <div className="vhc-card" style={{ textAlign:'center', padding:'4rem 1rem' }}>
                    <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🚛</div>
                    <div style={{ fontFamily:'Orbitron,sans-serif', fontSize:'.72rem', letterSpacing:'.12em',
                        color:'#9CA3AF', marginBottom:'.75rem' }}>NENHUM VEÍCULO VINCULADO</div>
                    <p style={{ color:'#6B7280', fontSize:'.8rem', maxWidth:320, margin:'0 auto' }}>
                        Seu veículo aparece aqui quando uma viagem for atribuída pelo coordenador.
                    </p>
                </div>
            )}

            {truck && (<>

            {/* ── SELETOR DE VEÍCULOS (se houver mais de 1) ──────────── */}
            {trucks.length > 1 && (
                <div style={{ display:'flex', gap:'.5rem', flexWrap:'wrap' }}>
                    {trucks.map((t, i) => (
                        <button key={t.id} onClick={() => setSelected(i)} className={`vhc-tab ${selected === i ? 'active' : ''}`}>
                            🚛 {t.licensePlate}
                        </button>
                    ))}
                </div>
            )}

            {/* ── HERO CARD ───────────────────────────────────────────── */}
            <div className="vhc-hero">
                {/* Linha de status */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem', flexWrap:'wrap', gap:'.5rem' }}>
                    <div>
                        <div className="vhc-plate">{truck.licensePlate}</div>
                        <div style={{ fontSize:'.72rem', color:'rgba(0,0,0,.45)', marginTop:'.2rem', fontFamily:'JetBrains Mono,monospace', fontWeight:600 }}>
                            ID: {truck.identifier}
                        </div>
                    </div>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:'.4rem', padding:'.35rem .9rem',
                        borderRadius:100, background: st!.bg, color: st!.color, fontSize:'.72rem', fontWeight:800,
                        border:`1px solid ${st!.color}30`, letterSpacing:'.08em', animation: truck.status === 'IN_USE' ? 'vhc-pulse 2s infinite' : 'none' }}>
                        <span className="vhc-status-dot" style={{ background: st!.dot, boxShadow:`0 0 6px ${st!.dot}` }} />
                        {st!.label.toUpperCase()}
                    </span>
                </div>

                {/* Ficha rápida do veículo (padronizada) */}
                <div className="vhc-spec-grid">
                    {[
                        { icon:'🗓️', label:'Modelo', value: truck.modelYear ? String(truck.modelYear) : '—' },
                        { icon:'👥', label:'Capacidade', value: truck.capacity ? `${truck.capacity} alunos` : '—' },
                        { icon:'📍', label:'Estado', value: truck.state || '—' },
                        { icon:'🚪', label:'Salas', value: truck.roomsCount ? `${truck.roomsCount} sala(s)` : '—' },
                        { icon:'🔩', label:'Tipo', value: truck.type || '—' },
                        { icon:'🛠️', label:'Últ. Manutenção', value: diasMnt >= 0 ? `${diasMnt}d atrás` : '—' },
                    ].map((k, i) => (
                        <div key={i} className="vhc-spec" style={{ animationDelay:`${i * 40}ms` }}>
                            <span className="vhc-spec-icon">{k.icon}</span>
                            <div className="vhc-spec-label">{k.label}</div>
                            <div className="vhc-spec-value">{k.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── STATS MANUTENÇÃO ────────────────────────────────────── */}
            {stats && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0,1fr))', gap:'.6rem' }}>
                    {[
                        { label:'Total',      value: stats.agendadas + stats.emAndamento + stats.concluidas, color:'#6B7280', bg:'#F3F4F6', border:'#E5E7EB' },
                        { label:'Agendadas',  value: stats.agendadas,    color:'#D97706', bg:'#FFF7ED', border:'#FED7AA' },
                        { label:'Andamento',  value: stats.emAndamento,  color:'#0891B2', bg:'#F0F9FF', border:'#BAE6FD' },
                        { label:'Conclu\u00eddas', value: stats.concluidas,  color:'#059669', bg:'#F0FDF4', border:'#BBF7D0' },
                    ].map((s, i) => (
                        <AnimatedKpiCard
                            key={i}
                            label={s.label}
                            value={s.value}
                            color={s.color}
                            bg={s.bg}
                            border={s.border}
                            compact
                        />
                    ))}
                </div>
            )}

            {/* ── PRÓXIMA MANUTENÇÃO ──────────────────────────────────── */}
            {truck.nextMaintenanceDate && (
                <div style={{ display:'flex', alignItems:'center', gap:'.85rem', padding:'1rem 1.25rem',
                    borderRadius:14, background:'rgba(251,191,36,.08)', border:'1px solid rgba(251,191,36,.35)',
                    boxShadow:'0 2px 10px rgba(251,191,36,.1)' }}>
                    <div style={{ fontSize:'1.5rem' }}>📅</div>
                    <div>
                        <div style={{ fontSize:'.68rem', fontWeight:800, color:'#D97706', textTransform:'uppercase' as const,
                            letterSpacing:'.1em', marginBottom:'.15rem' }}>PRÓXIMA MANUTENÇÃO AGENDADA</div>
                        <div style={{ fontFamily:'Orbitron,sans-serif', fontWeight:900, fontSize:'1rem', color:'#92400E' }}>
                            {fmtDate(truck.nextMaintenanceDate)}
                        </div>
                    </div>
                </div>
            )}

            {/* ── HISTÓRICO DE MANUTENÇÕES ────────────────────────────── */}
            <div className="vhc-card">
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                    marginBottom:'1rem', flexWrap:'wrap', gap:'.5rem' }}>
                    <div style={{ fontFamily:'Orbitron,sans-serif', fontWeight:900, fontSize:'.82rem',
                        letterSpacing:'.12em', color:'#D97706' }}>🛠️ HISTÓRICO DE MANUTENÇÃO</div>
                    <div style={{ display:'flex', gap:'.35rem', flexWrap:'wrap' }}>
                        {[['todas','Todas'],['pendente','Pendentes'],['andamento','Em Andamento'],['concluida','Concluídas']].map(([v,l]) => (
                            <button key={v} onClick={() => setTabMnt(v)} className={`vhc-tab ${tabMnt === v ? 'active' : ''}`}>
                                {l}
                            </button>
                        ))}
                    </div>
                </div>

                {mntFiltradas.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'2.5rem 1rem', color:'#9CA3AF' }}>
                        <div style={{ fontSize:'2rem', marginBottom:'.5rem' }}>🔧</div>
                        <div style={{ fontSize:'.8rem', fontWeight:600 }}>Nenhum registro nesta categoria</div>
                    </div>
                ) : (
                    <div style={{ display:'flex', flexDirection:'column' as const, gap:'.6rem' }}>
                        {mntFiltradas.slice(0, 6).map((m, i) => {
                            const ms = STATUS_MNT[m.status] || STATUS_MNT.agendada;
                            const ic = TYPE_ICONS[m.tipo] || '🔧';
                            return (
                                <div key={m.id} className="vhc-mnt-item" style={{ animationDelay:`${i * 30}ms` }}>
                                    <div style={{ width:40, height:40, borderRadius:10, flexShrink:0,
                                        background:`${ms.color}12`, display:'flex', alignItems:'center',
                                        justifyContent:'center', fontSize:'1.2rem', border:`1px solid ${ms.color}25` }}>
                                        {ic}
                                    </div>
                                    <div style={{ flex:1, minWidth:0 }}>
                                        <div style={{ fontWeight:700, fontSize:'.87rem', color:'#111827',
                                            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                                            {m.titulo || m.tipo}
                                        </div>
                                        <div style={{ fontSize:'.72rem', color:'#6B7280', marginTop:'.1rem' }}>
                                            📅 {fmtDate(m.dataAgendada)}
                                            {m.custoReal ? ` · 💰 R$ ${Number(m.custoReal).toFixed(2)}` : ''}
                                        </div>
                                    </div>
                                    <div style={{ display:'flex', flexDirection:'column' as const,
                                        alignItems:'flex-end', gap:'.25rem', flexShrink:0 }}>
                                        <span style={{ padding:'.2rem .65rem', borderRadius:100, background: ms.bg,
                                            color: ms.color, fontSize:'.62rem', fontWeight:800, whiteSpace:'nowrap' }}>
                                            {ms.label}
                                        </span>
                                        {m.prioridade && (
                                            <span style={{ fontSize:'.6rem', fontWeight:700,
                                                color: PRIO_COLORS[m.prioridade] || '#6B7280' }}>
                                                {m.prioridade.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {mntFiltradas.length > 6 && (
                            <div style={{ textAlign:'center', fontSize:'.75rem', color:'#9CA3AF', paddingTop:'.5rem' }}>
                                + {mntFiltradas.length - 6} registro(s) — veja em Manutenção
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── OBSERVAÇÕES ─────────────────────────────────────────── */}
            {truck.notes && (
                <div className="vhc-card">
                    <div style={{ fontFamily:'Orbitron,sans-serif', fontWeight:900, fontSize:'.72rem',
                        letterSpacing:'.12em', color:'#9CA3AF', marginBottom:'.75rem' }}>📋 OBSERVAÇÕES</div>
                    <p style={{ fontSize:'.85rem', color:'#374151', lineHeight:1.7, margin:0 }}>{truck.notes}</p>
                </div>
            )}

            {/* ── HISTÓRICO DE FROTA ───────────────────────────────── */}
            {truckHistory.length > 1 && (
                <div className="vhc-card">
                    <button onClick={() => setHistExpanded(e => !e)}
                        style={{ display:'flex', width:'100%', alignItems:'center', justifyContent:'space-between',
                            background:'none', border:'none', cursor:'pointer', padding:0 }}>
                        <div style={{ fontFamily:'Orbitron,sans-serif', fontWeight:900, fontSize:'.82rem',
                            letterSpacing:'.12em', color:'#6B7280' }}>
                            🚛 HISTÓRICO DE FROTA
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:'.5rem' }}>
                            <span style={{ fontSize:'.7rem', color:'#9CA3AF', fontWeight:600 }}>
                                {truckHistory.length - 1} veículo(s) anterior(es)
                            </span>
                            <span style={{ fontSize:'.85rem', color:'#9CA3AF',
                                transform: histExpanded ? 'rotate(180deg)' : 'none',
                                transition:'transform .2s', display:'inline-block' }}>▼</span>
                        </div>
                    </button>

                    {histExpanded && (
                        <div style={{ marginTop:'1rem', display:'flex', flexDirection:'column' as const, gap:'.6rem' }}>
                            {truckHistory.slice(1).map((h, i) => (
                                <div key={h.truckId} style={{
                                    display:'flex', alignItems:'center', gap:'.85rem',
                                    padding:'.85rem 1rem', borderRadius:12,
                                    background:'#F9FAFB', border:'1px solid #E5E7EB',
                                    animationDelay:`${i*40}ms`
                                }}>
                                    <div style={{ width:44, height:44, borderRadius:10, flexShrink:0,
                                        background:'rgba(107,114,128,.1)', display:'flex',
                                        alignItems:'center', justifyContent:'center',
                                        fontSize:'1.3rem', border:'1px solid rgba(107,114,128,.2)' }}>🚌</div>
                                    <div style={{ flex:1 }}>
                                        <div style={{ fontFamily:'Orbitron,sans-serif', fontWeight:900,
                                            fontSize:'1rem', color:'#374151', letterSpacing:'.08em' }}>
                                            {h.licensePlate}
                                        </div>
                                        <div style={{ fontSize:'.72rem', color:'#6B7280', marginTop:'.2rem' }}>
                                            ID: {h.identifier} · {h.tripCount} viagem(ns)
                                            {h.totalKm > 0 && ` · ${h.totalKm.toLocaleString('pt-BR')} km`}
                                        </div>
                                    </div>
                                    <div style={{ textAlign:'right' as const, flexShrink:0 }}>
                                        <div style={{ fontSize:'.62rem', fontWeight:800, color:'#9CA3AF',
                                            textTransform:'uppercase' as const, letterSpacing:'.08em',
                                            marginBottom:'.15rem' }}>ÚLT. USO</div>
                                        <div style={{ fontSize:'.78rem', fontWeight:700, color:'#6B7280',
                                            fontFamily:'JetBrains Mono,monospace' }}>
                                            {h.lastUsedDate ? h.lastUsedDate.toLocaleDateString('pt-BR',
                                                { day:'2-digit',month:'2-digit',year:'numeric' }) : '—'}
                                        </div>
                                        <span style={{ display:'inline-block', marginTop:'.25rem',
                                            padding:'.15rem .6rem', borderRadius:100, fontSize:'.58rem',
                                            fontWeight:800, background:'rgba(107,114,128,.1)',
                                            color:'#6B7280', letterSpacing:'.06em' }}>INATIVO</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── BOTÃO EMERGÊNCIA PRINCIPAL ───────────────────────── */}
            <button onClick={() => setShowModal(true)} className="vhc-emergency">
                🚨 Solicitar Veículo Substituto em Emergência
            </button>

            </>)}
        </div>

        {/* ── MODAL PORTAL ─────────────────────────────────────────────── */}
        {mounted && showModal && truck && createPortal(
            <div className="vhc-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
                <ModalSubstituto truckId={truck.id} onClose={() => setShowModal(false)} onSaved={load} />
            </div>,
            document.body
        )}
        </>
    );
}
