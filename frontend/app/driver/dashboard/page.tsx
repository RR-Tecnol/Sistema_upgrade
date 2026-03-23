'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api/client';
import { useAuthStore } from '@/stores/useAuthStore';

/* ─── Tipos ─── */
interface Trip {
    id: string; status: string; notes?: string;
    originCity: { name: string; state: string };
    destinationCity: { name: string; state: string };
    departureDate: string; expectedArrivalDate: string;
    kmStart?: number; kmEnd?: number;
    truck: { identifier: string; licensePlate: string };
}

/* ─────────────────────────────────────────────
   CSS DO DASHBOARD — fora do componente para não
   corromper a árvore JSX. Regras:
   • Sem maxWidth em containers de página
   • Grids com auto-fill + minmax (sem breakpoints fixos)
   • Tamanhos em rem, nunca em vw direto
   • clamp() apenas com valores simples ou calc() explícito
   ───────────────────────────────────────────── */
const DASHBOARD_CSS = `
    @keyframes drv-slide-up  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    @keyframes drv-pulse-dot { 0%,100%{box-shadow:0 0 0 0 rgba(5,150,105,.5)} 50%{box-shadow:0 0 0 8px rgba(5,150,105,0)} }
    @keyframes drv-spin      { to{transform:rotate(360deg)} }
    @keyframes drv-shimmer   { 0%{background-position:-200% center} 100%{background-position:200% center} }

    .drv-page {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        animation: drv-slide-up .35s cubic-bezier(.22,1,.36,1);
    }

    /* ── Hero (light, com gradiente amarelo) ── */
    .drv-hero {
        position: relative;
        border-radius: 16px;
        overflow: hidden;
        background: linear-gradient(135deg, #FFFDE7 0%, #FFF9C4 50%, #FFFBEB 100%);
        border: 1px solid rgba(255,214,0,0.4);
        padding: 1.5rem;
        box-shadow: 0 4px 24px rgba(255,214,0,.12), 0 1px 4px rgba(0,0,0,.04);
    }

    /* ── KPIs ── */
    .drv-kpis {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: .75rem;
        margin-top: 1rem;
    }
    .drv-kpi {
        padding: .9rem 1rem;
        border-radius: 12px;
        background: rgba(255,255,255,0.75);
        backdrop-filter: blur(4px);
        display: flex;
        flex-direction: column;
        gap: .3rem;
        min-height: 76px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .drv-kpi-label {
        font-size: .58rem;
        font-weight: 800;
        letter-spacing: .12em;
        text-transform: uppercase;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #6B7280;
    }
    .drv-kpi-value {
        font-family: Orbitron, sans-serif;
        font-weight: 900;
        font-size: 1.35rem;
        line-height: 1;
    }

    /* ── Cards de conteúdo (light) ── */
    .drv-card {
        width: 100%;
        background: #FFFFFF;
        border-radius: 16px;
        padding: 1.25rem;
        border: 1px solid rgba(0,0,0,0.07);
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        transition: box-shadow .2s, border-color .2s;
    }
    .drv-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); border-color: rgba(255,214,0,0.3); }
    .drv-card-active {
        background: linear-gradient(135deg, #F0FDF4, #DCFCE7);
        border-color: rgba(5,150,105,.35);
        box-shadow: 0 4px 24px rgba(5,150,105,.1);
    }

    /* ── Botões de ação principais ── */
    .drv-btn {
        width: 100%;
        min-height: 52px;
        border-radius: 12px;
        border: none;
        cursor: pointer;
        font-weight: 800;
        font-size: .92rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: .5rem;
        transition: opacity .18s, transform .18s, box-shadow .18s;
    }
    .drv-btn:hover  { opacity: .9; }
    .drv-btn:active { transform: scale(.98); }

    /* ── Grid de ações rápidas ── */
    .drv-actions {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: .75rem;
    }
    .drv-action-btn {
        padding: .9rem .5rem;
        border-radius: 12px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: .4rem;
        min-height: 80px;
        transition: opacity .18s, transform .18s, box-shadow .18s;
        border: none;
        background: #FFFFFF;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .drv-action-btn:hover  { box-shadow: 0 4px 12px rgba(255,214,0,.2); transform: translateY(-2px); }
    .drv-action-btn:active { transform: scale(.97); }
    .drv-action-label {
        font-size: .68rem;
        font-weight: 700;
        text-align: center;
        line-height: 1.3;
        color: #374151;
    }

    /* ── Modais (light) ── */
    .drv-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.5);
        backdrop-filter: blur(8px);
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
    }
    .drv-modal {
        background: #FFFFFF;
        border-radius: 18px;
        padding: 1.75rem;
        width: min(440px, calc(100% - 2rem));
        border: 1px solid rgba(0,0,0,0.08);
        box-shadow: 0 8px 40px rgba(0,0,0,0.15);
    }
    .drv-modal-title {
        font-family: Orbitron, sans-serif;
        font-weight: 800;
        color: #111827;
        margin-bottom: .4rem;
        font-size: .95rem;
    }
    .drv-modal-sub  { color: #9CA3AF; font-size: .78rem; margin-bottom: 1rem; }
    .drv-modal-label {
        font-size: .68rem; color: #6B7280; font-weight: 700;
        letter-spacing: .08em; text-transform: uppercase;
        display: block; margin-bottom: .4rem;
    }
    .drv-modal-input {
        width: 100%; padding: .85rem; border-radius: 10px;
        border: 1.5px solid rgba(0,0,0,.12); background: #F9FAFB;
        color: #111827; font-size: 1.1rem; font-family: JetBrains Mono, monospace;
        box-sizing: border-box; margin-bottom: 1rem; outline: none;
        transition: border-color .18s;
    }
    .drv-modal-input:focus { border-color: #FFD600; box-shadow: 0 0 0 3px rgba(255,214,0,.15); }
    .drv-modal-textarea {
        width: 100%; padding: .85rem; border-radius: 10px;
        border: 1.5px solid rgba(0,0,0,.12); background: #F9FAFB;
        color: #111827; font-size: .9rem; resize: vertical;
        box-sizing: border-box; margin-bottom: 1rem; outline: none;
        transition: border-color .18s;
    }
    .drv-modal-textarea:focus { border-color: #FFD600; box-shadow: 0 0 0 3px rgba(255,214,0,.15); }
    .drv-modal-row { display: flex; gap: .75rem; }
    .drv-modal-cancel {
        flex: 1; padding: .75rem; border-radius: 10px;
        border: 1px solid rgba(0,0,0,0.1); background: #F9FAFB;
        color: #6B7280; cursor: pointer; font-weight: 600; font-size: .85rem;
        transition: background .15s;
    }
    .drv-modal-cancel:hover { background: #F3F4F6; }
    .drv-modal-ok {
        flex: 2; padding: .75rem; border-radius: 10px; border: none;
        color: #fff; cursor: pointer; font-weight: 800; font-size: .85rem;
        transition: opacity .18s;
    }
    .drv-modal-ok:disabled { opacity: .45; cursor: not-allowed; }
`;



/* ─── Contador animado com tamanho fixo em rem ─── */
function Counter({ value, color, suffix = '' }: { value: number; color: string; suffix?: string }) {
    const [n, setN] = useState(0);
    useEffect(() => {
        if (!value) return;
        let v = 0;
        const step = Math.max(1, Math.ceil(value / 20));
        const t = setInterval(() => {
            v += step;
            if (v >= value) { setN(value); clearInterval(t); } else setN(v);
        }, 40);
        return () => clearInterval(t);
    }, [value]);
    return (
        <span
            className="drv-kpi-value"
            style={{ color, textShadow: `0 0 12px ${color}` }}
        >
            {n.toLocaleString('pt-BR')}{suffix}
        </span>
    );
}

/* ══════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════════════ */
export default function DriverDashboard() {
    const router = useRouter();

    const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
    const [nextTrip,   setNextTrip]   = useState<Trip | null>(null);
    const [stats,      setStats]      = useState({ tripsMonth: 0, kmMonth: 0, pending: 0 });
    const [loading,    setLoading]    = useState(true);
    const { user } = useAuthStore();
    const [kmInput,    setKmInput]    = useState('');
    const [noteInput,  setNoteInput]  = useState('');
    const [kmModal,    setKmModal]    = useState<'start'|'end'|null>(null);
    const [noteModal,  setNoteModal]  = useState(false);
    const [saving,     setSaving]     = useState(false);

    /* ── Carrega dados da API ── */
    const load = async () => {
        setLoading(true);
        try {
            const [transit, planned, completed, reimb] = await Promise.all([
                api.get('/driver/trips?status=IN_TRANSIT'),
                api.get('/driver/trips?status=PLANNED'),
                api.get('/driver/trips?status=COMPLETED'),
                api.get('/reimbursements').catch(() => ({ data: [] })),
            ]);
            const active = (Array.isArray(transit.data)  ? transit.data  : [])[0] || null;
            const next   = (Array.isArray(planned.data)  ? planned.data  : [])[0] || null;
            const done   = Array.isArray(completed.data) ? completed.data : [];
            const now    = new Date();
            const month  = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthT = done.filter((t: Trip) => new Date(t.departureDate) >= month);
            const km     = monthT.reduce((a: number, t: Trip) => a + ((t.kmEnd||0) - (t.kmStart||0)), 0);
            const rList  = Array.isArray(reimb.data) ? reimb.data : (reimb.data?.data ?? []);
            setActiveTrip(active);
            setNextTrip(next);
            setStats({
                tripsMonth: monthT.length,
                kmMonth: km,
                pending: rList.filter((r: { status: string }) => r.status === 'PENDING').length,
            });
        } catch { /* erros individuais são silenciados */ }
        finally { setLoading(false); }
    };
    useEffect(() => {
        load();
    }, []);

    /* ── Ações do motorista ── */
    const handleStart = async () => {
        if (!nextTrip || !kmInput) return;
        setSaving(true);
        try {
            await api.patch(`/driver/trips/${nextTrip.id}/start`, { kmStart: parseInt(kmInput) });
            setKmModal(null); setKmInput(''); load();
        } catch { } finally { setSaving(false); }
    };

    const handleComplete = async () => {
        if (!activeTrip || !kmInput) return;
        setSaving(true);
        try {
            await api.patch(`/driver/trips/${activeTrip.id}/complete`, { kmEnd: parseInt(kmInput) });
            setKmModal(null); setKmInput(''); load();
        } catch { } finally { setSaving(false); }
    };

    const handleNote = async () => {
        if (!activeTrip || !noteInput.trim()) return;
        setSaving(true);
        try {
            await api.patch(`/driver/trips/${activeTrip.id}/notes`, { note: noteInput.trim() });
            setNoteModal(false); setNoteInput(''); load();
        } catch { } finally { setSaving(false); }
    };

    const fmt = (d: string) =>
        new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });

    /* ── Loading ── */
    if (loading) return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'50vh' }}>
            <style>{`@keyframes drv-spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ textAlign:'center' }}>
                <div style={{
                    width:36, height:36, border:'3px solid #FFD600',
                    borderTopColor:'transparent', borderRadius:'50%',
                    animation:'drv-spin .75s linear infinite', margin:'0 auto 1rem',
                }} />
                <p style={{ color:'#9CA3AF', fontSize:'.8rem', fontFamily:'Orbitron,sans-serif',
                            letterSpacing:'.1em', margin:0 }}>CARREGANDO...</p>
            </div>
        </div>
    );

    /* ── Render principal ── */
    return (
        <>
        <style>{DASHBOARD_CSS}</style>

        <div className="drv-page">

            {/* ══ HERO PAINEL ══ */}
            <div className="drv-hero">
                <div style={{ position: 'relative' }}>
                    {/* Banner boas-vindas padrão */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{
                            width: 50, height: 50, borderRadius: 13,
                            background: '#000',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.9rem',
                            color: '#FFD600', boxShadow: '0 4px 12px rgba(0,0,0,0.25)', flexShrink: 0,
                        }}>
                            {user?.name ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : 'MT'}
                        </div>
                        <div>
                            <p style={{ fontSize: '0.62rem', color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, margin: 0, marginBottom: '0.15rem' }}>Portal do Motorista</p>
                            <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.25rem', color: '#92400E', letterSpacing: '.06em', margin: 0, lineHeight: 1.1 }}>
                                Olá, {user?.name?.split(' ')[0] || 'Motorista'}!
                            </h1>
                            <p style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.5)', margin: 0, marginTop: '0.2rem' }}>
                                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    {/* KPIs */}
                    <div className="drv-kpis">
                        {[
                            { label:'VIAGENS/MÊS', value:stats.tripsMonth, color:'#92400E' },
                            { label:'KM RODADOS',  value:stats.kmMonth,    color:'#059669', suffix:'km' },
                            { label:'A RECEBER',   value:stats.pending,    color:'#EA580C' },
                        ].map((k, i) => (
                            <div key={i} className="drv-kpi" style={{ borderLeft:`3px solid ${k.color}` }}>
                                <div className="drv-kpi-label">{k.label}</div>
                                <Counter value={k.value} color={k.color} suffix={k.suffix} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══ VIAGEM ATIVA ══ */}
            {activeTrip && (
                <div className="drv-card drv-card-active">
                    <div style={{ display:'flex', justifyContent:'space-between',
                                  alignItems:'center', marginBottom:'.75rem' }}>
                        <span style={{
                            display:'inline-flex', alignItems:'center', gap:'.4rem',
                            fontSize:'.62rem', fontWeight:800, color:'#059669',
                            letterSpacing:'.12em', textTransform:'uppercase',
                        }}>
                            <span style={{
                                width:8, height:8, borderRadius:'50%', background:'#059669',
                                display:'inline-block', animation:'drv-pulse-dot 2s ease-in-out infinite',
                            }} />
                            EM TRÂNSITO
                        </span>
                        <span style={{
                            fontSize:'.68rem', color:'#6B7280',
                            fontFamily:'JetBrains Mono,monospace',
                            background:'rgba(0,0,0,.05)', padding:'.15rem .5rem', borderRadius:5,
                        }}>{activeTrip.truck.licensePlate}</span>
                    </div>

                    <div style={{
                        fontSize:'1.05rem', fontWeight:800, color:'#111827',
                        marginBottom:'.3rem', display:'flex', alignItems:'center',
                        gap:'.4rem', flexWrap:'wrap',
                    }}>
                        {activeTrip.originCity.name}
                        <span style={{ color:'#FFD600', fontSize:'1.2rem' }}>→</span>
                        {activeTrip.destinationCity.name}
                    </div>

                    <div style={{ display:'flex', gap:'.75rem', fontSize:'.72rem',
                                  color:'#6B7280', marginBottom:'.85rem', flexWrap:'wrap' }}>
                        <span>📅 Chegada: {fmt(activeTrip.expectedArrivalDate)}</span>
                        <span>🔢 Km início: {activeTrip.kmStart?.toLocaleString('pt-BR') ?? '—'}</span>
                    </div>

                    <button
                        className="drv-btn"
                        style={{
                            background:'linear-gradient(135deg,#059669,#047857)',
                            color:'#fff', marginBottom:'.5rem',
                            boxShadow:'0 4px 20px rgba(5,150,105,.3)',
                        }}
                        onClick={() => { setKmModal('end'); setKmInput(''); }}
                    >
                        ✅ Cheguei ao Destino
                    </button>

                    <button
                        className="drv-btn"
                        style={{
                            background:'rgba(0,0,0,.04)',
                            color:'#6B7280', border:'1px solid rgba(0,0,0,.08)', minHeight:44,
                        }}
                        onClick={() => setNoteModal(true)}
                    >
                        📝 Reportar Problema / Ocorrência
                    </button>
                </div>
            )}

            {/* ══ PRÓXIMA VIAGEM ══ */}
            {nextTrip && !activeTrip && (
                <div className="drv-card" style={{ borderColor:'rgba(255,214,0,.4)', background:'#FFFDE7' }}>
                    <div style={{ fontSize:'.62rem', fontWeight:800, color:'#92400E',
                                  letterSpacing:'.12em', textTransform:'uppercase',
                                  marginBottom:'.75rem', display:'flex', alignItems:'center', gap:'.35rem' }}>
                        📋 PRÓXIMA VIAGEM
                    </div>
                    <div style={{ fontSize:'1.05rem', fontWeight:800, color:'#111827',
                                  marginBottom:'.3rem', display:'flex', alignItems:'center',
                                  gap:'.4rem', flexWrap:'wrap' }}>
                        {nextTrip.originCity.name}
                        <span style={{ color:'#FFD600', fontSize:'1.2rem' }}>→</span>
                        {nextTrip.destinationCity.name}
                    </div>
                    <div style={{ fontSize:'.72rem', color:'#6B7280', marginBottom:'.85rem' }}>
                        🗓️ Partida: {fmt(nextTrip.departureDate)} · {nextTrip.truck.licensePlate}
                    </div>
                    <button
                        className="drv-btn"
                        style={{
                            background:'linear-gradient(135deg,#FFD600,#F59E0B)',
                            color:'#0F172A', boxShadow:'0 4px 20px rgba(255,214,0,.3)', fontWeight: 900,
                        }}
                        onClick={() => { setKmModal('start'); setKmInput(''); }}
                    >
                        🚛 Iniciar Viagem
                    </button>
                </div>
            )}

            {/* ══ SEM VIAGEM ══ */}
            {!activeTrip && !nextTrip && (
                <div className="drv-card" style={{ textAlign:'center', padding:'2.5rem 1rem' }}>
                    <div style={{ fontSize:'2.5rem', marginBottom:'.75rem' }}>🛣️</div>
                    <div style={{ fontFamily:'Orbitron,sans-serif', fontSize:'.7rem',
                                  color:'#9CA3AF', letterSpacing:'.1em' }}>
                        NENHUMA VIAGEM ATRIBUÍDA
                    </div>
                    <p style={{ color:'#6B7280', fontSize:'.78rem', marginTop:'.5rem', margin:'.5rem 0 0' }}>
                        Entre em contato com o coordenador.
                    </p>
                </div>
            )}

            {/* ══ AÇÕES RÁPIDAS ══ */}
            <div className="drv-actions">
                {[
                    { icon:'💰', label:'Novo Reembolso', color:'#92400E', bg:'rgba(255,214,0,.12)',  border:'rgba(255,214,0,.3)',    href:'/driver/reembolsos' },
                    { icon:'🗺️', label:'Ver Viagens',    color:'#7C3AED', bg:'rgba(124,58,237,.08)', border:'rgba(124,58,237,.2)',   href:'/driver/viagens' },
                    { icon:'🚛', label:'Meu Veículo',    color:'#059669', bg:'rgba(5,150,105,.08)',   border:'rgba(5,150,105,.2)',    href:'/driver/veiculo' },
                    { icon:'📍', label:'Minha Rota',     color:'#0891B2', bg:'rgba(8,145,178,.08)',   border:'rgba(8,145,178,.2)',    href:'/driver/viagens' },
                ].map((a, i) => (
                    <button
                        key={i}
                        className="drv-action-btn"
                        style={{ background: a.bg, border:`1px solid ${a.border}` }}
                        onClick={() => router.push(a.href)}
                    >
                        <span style={{ fontSize:'1.45rem' }}>{a.icon}</span>
                        <span className="drv-action-label" style={{ color: a.color }}>{a.label}</span>
                    </button>
                ))}
            </div>

        </div>

        {/* ══ MODAL QUILOMETRAGEM ══ */}
        {kmModal && (
            <div
                className="drv-modal-overlay"
                onClick={e => { if (e.target === e.currentTarget) setKmModal(null); }}
            >
                <div className="drv-modal">
                    <div className="drv-modal-title">
                        {kmModal === 'start' ? '🚛 Iniciar Viagem' : '✅ Finalizar Viagem'}
                    </div>
                    <p className="drv-modal-sub">
                        {kmModal === 'start'
                            ? 'Hodômetro atual antes de partir.'
                            : 'Hodômetro final ao chegar.'
                        }
                    </p>
                    <label className="drv-modal-label">Quilometragem (km)</label>
                    <input
                        type="number"
                        placeholder="Ex: 145000"
                        value={kmInput}
                        onChange={e => setKmInput(e.target.value)}
                        className="drv-modal-input"
                    />
                    <div className="drv-modal-row">
                        <button className="drv-modal-cancel" onClick={() => setKmModal(null)}>
                            Cancelar
                        </button>
                        <button
                            className="drv-modal-ok"
                            style={{ background: kmModal === 'start' ? 'linear-gradient(135deg,#FFD600,#F59E0B)' : '#059669', color: kmModal === 'start' ? '#0F172A' : '#fff' }}
                            onClick={kmModal === 'start' ? handleStart : handleComplete}
                            disabled={saving || !kmInput}
                        >
                            {saving ? 'Salvando...' : kmModal === 'start' ? 'Iniciar' : 'Finalizar'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* ══ MODAL OCORRÊNCIA ══ */}
        {noteModal && (
            <div
                className="drv-modal-overlay"
                onClick={e => { if (e.target === e.currentTarget) setNoteModal(false); }}
            >
                <div className="drv-modal">
                    <div className="drv-modal-title">📝 Registrar Ocorrência</div>
                    <p className="drv-modal-sub">
                        Descreva o ocorrido — salvo com hora automaticamente.
                    </p>
                    <textarea
                        value={noteInput}
                        onChange={e => setNoteInput(e.target.value)}
                        rows={4}
                        placeholder="Ex: Pneu furado na BR-135 km 234..."
                        className="drv-modal-textarea"
                    />
                    <div className="drv-modal-row">
                        <button className="drv-modal-cancel" onClick={() => setNoteModal(false)}>
                            Cancelar
                        </button>
                        <button
                            className="drv-modal-ok"
                            style={{ background:'#EA580C' }}
                            onClick={handleNote}
                            disabled={saving || !noteInput.trim()}
                        >
                            {saving ? 'Salvando...' : '📋 Registrar'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
