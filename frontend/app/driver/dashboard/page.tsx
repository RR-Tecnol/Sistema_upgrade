'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api/client';

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
    @keyframes drv-pulse-dot { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.5)} 50%{box-shadow:0 0 0 8px rgba(16,185,129,0)} }
    @keyframes drv-spin      { to{transform:rotate(360deg)} }

    /* Container de página: ocupa TODA a largura do <main> sem maxWidth */
    .drv-page {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        animation: drv-slide-up .35s cubic-bezier(.22,1,.36,1);
    }

    /* ── Hero ── */
    .drv-hero {
        position: relative;
        border-radius: 14px;
        overflow: hidden;
        background: linear-gradient(135deg, #0F172A 0%, #0C2233 60%, #0F172A 100%);
        border: 1px solid rgba(8,145,178,.25);
        padding: 1.25rem;
        box-shadow: 0 0 40px rgba(8,145,178,.06);
    }

    /* ── KPIs: sempre 3 colunas iguais que crescem com o espaço disponível ── */
    .drv-kpis {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: .6rem;
        margin-top: .9rem;
    }
    .drv-kpi {
        padding: .75rem .9rem;
        border-radius: 10px;
        background: rgba(255,255,255,.04);
        display: flex;
        flex-direction: column;
        gap: .3rem;
        min-height: 72px;
    }
    .drv-kpi-label {
        font-size: .58rem;
        font-weight: 800;
        letter-spacing: .12em;
        text-transform: uppercase;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .drv-kpi-value {
        font-family: Orbitron, sans-serif;
        font-weight: 900;
        font-size: 1.35rem;
        line-height: 1;
    }

    /* ── Cards de conteúdo ── */
    .drv-card {
        width: 100%;
        background: #1E293B;
        border-radius: 14px;
        padding: 1.1rem 1.25rem;
        border: 1px solid rgba(255,255,255,.06);
    }
    .drv-card-active {
        background: linear-gradient(135deg, #1E293B, #0F2337);
        border-color: rgba(16,185,129,.3);
        box-shadow: 0 4px 24px rgba(16,185,129,.08);
    }

    /* ── Botões de ação principais (touch-friendly: mínimo 52px) ── */
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
        transition: opacity .18s, transform .18s;
    }
    .drv-btn:active { transform: scale(.98); }

    /*
     * ── Grid de ações rápidas ──
     * auto-fill garante que o browser decide quantas colunas cabem.
     * minmax(130px, 1fr): mínimo 130px, máximo 1fr.
     * Resultado: 2 colunas em <320px, 3 em ~450px, 4 em ~600px.
     * Sem nenhum breakpoint manual.
     */
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
        min-height: 76px;
        transition: opacity .18s, transform .18s;
        border: none;
        background: transparent;
    }
    .drv-action-btn:active { transform: scale(.97); }
    .drv-action-label {
        font-size: .68rem;
        font-weight: 700;
        text-align: center;
        line-height: 1.3;
    }

    /* ── Modais ── */
    .drv-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.75);
        backdrop-filter: blur(8px);
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
    }
    .drv-modal {
        background: #1E293B;
        border-radius: 18px;
        padding: 1.5rem;
        /* min(420px, ...) garante que no mobile ocupa quase toda a tela */
        width: min(420px, calc(100% - 2rem));
        border: 1px solid rgba(255,255,255,.1);
    }
    .drv-modal-title {
        font-family: Orbitron, sans-serif;
        font-weight: 800;
        color: #F1F5F9;
        margin-bottom: .4rem;
        font-size: .95rem;
    }
    .drv-modal-sub  { color: #64748B; font-size: .78rem; margin-bottom: 1rem; }
    .drv-modal-label {
        font-size: .68rem; color: #94A3B8; font-weight: 700;
        letter-spacing: .08em; text-transform: uppercase;
        display: block; margin-bottom: .4rem;
    }
    .drv-modal-input {
        width: 100%; padding: .85rem; border-radius: 10px;
        border: 1px solid rgba(8,145,178,.3); background: #0F172A;
        color: #F1F5F9; font-size: 1.1rem; font-family: JetBrains Mono, monospace;
        box-sizing: border-box; margin-bottom: 1rem; outline: none;
    }
    .drv-modal-textarea {
        width: 100%; padding: .85rem; border-radius: 10px;
        border: 1px solid rgba(255,255,255,.12); background: #0F172A;
        color: #F1F5F9; font-size: .9rem; resize: vertical;
        box-sizing: border-box; margin-bottom: 1rem; outline: none;
    }
    .drv-modal-row { display: flex; gap: .75rem; }
    .drv-modal-cancel {
        flex: 1; padding: .75rem; border-radius: 10px;
        border: 1px solid rgba(255,255,255,.1); background: transparent;
        color: #64748B; cursor: pointer; font-weight: 600; font-size: .85rem;
    }
    .drv-modal-ok {
        flex: 2; padding: .75rem; border-radius: 10px; border: none;
        color: #fff; cursor: pointer; font-weight: 800; font-size: .85rem;
        transition: opacity .18s;
    }
    .drv-modal-ok:disabled { opacity: .5; cursor: not-allowed; }
`;

/* ─── Partículas decorativas no hero ─── */
function Particles() {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const c = ref.current; if (!c) return;
        const ctx = c.getContext('2d'); if (!ctx) return;
        c.width = c.offsetWidth; c.height = c.offsetHeight;
        const pts = Array.from({ length: 18 }, () => ({
            x: Math.random() * c.width, y: Math.random() * c.height,
            vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
            r: Math.random() * 1.5 + .4, a: Math.random(),
        }));
        let raf: number;
        const draw = () => {
            ctx.clearRect(0, 0, c.width, c.height);
            pts.forEach(p => {
                p.x += p.vx; p.y += p.vy; p.a += .007;
                if (p.x < 0) p.x = c.width; if (p.x > c.width) p.x = 0;
                if (p.y < 0) p.y = c.height; if (p.y > c.height) p.y = 0;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(8,145,178,${(Math.sin(p.a) * .25 + .3).toFixed(2)})`;
                ctx.fill();
            });
            raf = requestAnimationFrame(draw);
        };
        draw(); return () => cancelAnimationFrame(raf);
    }, []);
    return (
        <canvas
            ref={ref}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}
        />
    );
}

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
                api.get('/reimbursements/my').catch(() => ({ data: [] })),
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
    useEffect(() => { load(); }, []);

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
                    width:36, height:36, border:'3px solid #0891B2',
                    borderTopColor:'transparent', borderRadius:'50%',
                    animation:'drv-spin .75s linear infinite', margin:'0 auto 1rem',
                }} />
                <p style={{ color:'#64748B', fontSize:'.8rem', fontFamily:'Orbitron,sans-serif',
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
                <Particles />
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'linear-gradient(rgba(8,145,178,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(8,145,178,.025) 1px,transparent 1px)',
                    backgroundSize: '32px 32px', pointerEvents: 'none',
                }} />
                <div style={{ position:'relative' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'.6rem', marginBottom:'.25rem' }}>
                        <div style={{
                            width:34, height:34, borderRadius:9,
                            background:'linear-gradient(135deg,#0891B2,#0369A1)',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:'1rem', boxShadow:'0 0 14px rgba(8,145,178,.5)', flexShrink:0,
                        }}>🚛</div>
                        <h1 style={{
                            fontFamily:'Orbitron,sans-serif', fontWeight:900, fontSize:'1.3rem',
                            color:'#fff', letterSpacing:'.1em', margin:0,
                            textShadow:'0 0 20px rgba(8,145,178,.6)',
                        }}>PAINEL</h1>
                    </div>
                    <p style={{ color:'rgba(255,255,255,.4)', fontSize:'.62rem', letterSpacing:'.1em', margin:0 }}>
                        OPERAÇÕES DE CAMPO — SISTEMA UPGRADE
                    </p>

                    {/* KPIs — 3 colunas fixas que crescem igualmente com o espaço */}
                    <div className="drv-kpis">
                        {[
                            { label:'VIAGENS/MÊS', value:stats.tripsMonth, color:'#0891B2' },
                            { label:'KM RODADOS',  value:stats.kmMonth,    color:'#10B981', suffix:'km' },
                            { label:'REEMBOLSOS',  value:stats.pending,    color:'#FBBF24' },
                        ].map((k, i) => (
                            <div key={i} className="drv-kpi" style={{ border:`1px solid ${k.color}25` }}>
                                <div className="drv-kpi-label" style={{ color:k.color }}>{k.label}</div>
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
                                  alignItems:'center', marginBottom:'.65rem' }}>
                        <span style={{
                            display:'inline-flex', alignItems:'center', gap:'.4rem',
                            fontSize:'.62rem', fontWeight:800, color:'#10B981',
                            letterSpacing:'.12em', textTransform:'uppercase',
                        }}>
                            <span style={{
                                width:8, height:8, borderRadius:'50%', background:'#10B981',
                                display:'inline-block', animation:'drv-pulse-dot 2s ease-in-out infinite',
                            }} />
                            EM TRÂNSITO
                        </span>
                        <span style={{
                            fontSize:'.68rem', color:'#64748B',
                            fontFamily:'JetBrains Mono,monospace',
                            background:'rgba(255,255,255,.05)', padding:'.15rem .5rem', borderRadius:5,
                        }}>{activeTrip.truck.licensePlate}</span>
                    </div>

                    <div style={{
                        fontSize:'1.05rem', fontWeight:800, color:'#F1F5F9',
                        marginBottom:'.3rem', display:'flex', alignItems:'center',
                        gap:'.4rem', flexWrap:'wrap',
                    }}>
                        {activeTrip.originCity.name}
                        <span style={{ color:'#0891B2' }}>→</span>
                        {activeTrip.destinationCity.name}
                    </div>

                    <div style={{ display:'flex', gap:'.75rem', fontSize:'.72rem',
                                  color:'#64748B', marginBottom:'.85rem', flexWrap:'wrap' }}>
                        <span>📅 Chegada: {fmt(activeTrip.expectedArrivalDate)}</span>
                        <span>🔢 Km início: {activeTrip.kmStart?.toLocaleString('pt-BR') ?? '—'}</span>
                    </div>

                    <button
                        className="drv-btn"
                        style={{
                            background:'linear-gradient(135deg,#10B981,#059669)',
                            color:'#fff', marginBottom:'.5rem',
                            boxShadow:'0 4px 20px rgba(16,185,129,.35)',
                        }}
                        onClick={() => { setKmModal('end'); setKmInput(''); }}
                    >
                        ✅ Cheguei ao Destino
                    </button>

                    <button
                        className="drv-btn"
                        style={{
                            background:'rgba(255,255,255,.04)',
                            color:'#94A3B8', border:'1px solid rgba(255,255,255,.1)', minHeight:44,
                        }}
                        onClick={() => setNoteModal(true)}
                    >
                        📝 Reportar Problema / Ocorrência
                    </button>
                </div>
            )}

            {/* ══ PRÓXIMA VIAGEM ══ */}
            {nextTrip && !activeTrip && (
                <div className="drv-card" style={{ borderColor:'rgba(251,191,36,.25)' }}>
                    <div style={{ fontSize:'.62rem', fontWeight:800, color:'#FBBF24',
                                  letterSpacing:'.12em', textTransform:'uppercase',
                                  marginBottom:'.65rem', display:'flex', alignItems:'center', gap:'.35rem' }}>
                        📋 PRÓXIMA VIAGEM
                    </div>
                    <div style={{ fontSize:'1.05rem', fontWeight:800, color:'#F1F5F9',
                                  marginBottom:'.3rem', display:'flex', alignItems:'center',
                                  gap:'.4rem', flexWrap:'wrap' }}>
                        {nextTrip.originCity.name}
                        <span style={{ color:'#0891B2' }}>→</span>
                        {nextTrip.destinationCity.name}
                    </div>
                    <div style={{ fontSize:'.72rem', color:'#64748B', marginBottom:'.85rem' }}>
                        🗓️ Partida: {fmt(nextTrip.departureDate)} · {nextTrip.truck.licensePlate}
                    </div>
                    <button
                        className="drv-btn"
                        style={{
                            background:'linear-gradient(135deg,#0891B2,#0369A1)',
                            color:'#fff', boxShadow:'0 4px 20px rgba(8,145,178,.35)',
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
                                  color:'#64748B', letterSpacing:'.1em' }}>
                        NENHUMA VIAGEM ATRIBUÍDA
                    </div>
                    <p style={{ color:'#475569', fontSize:'.78rem', marginTop:'.5rem', margin:'.5rem 0 0' }}>
                        Entre em contato com o coordenador.
                    </p>
                </div>
            )}

            {/* ══ AÇÕES RÁPIDAS (grid auto-fill, sem breakpoint manual) ══ */}
            <div className="drv-actions">
                {[
                    { icon:'💰', label:'Novo Reembolso', color:'#FFD600', bg:'rgba(255,214,0,.08)',   border:'rgba(255,214,0,.2)',   href:'/driver/reembolsos' },
                    { icon:'🗺️', label:'Ver Viagens',    color:'#8B5CF6', bg:'rgba(139,92,246,.08)', border:'rgba(139,92,246,.2)', href:'/driver/viagens' },
                    { icon:'🚛', label:'Meu Veículo',    color:'#10B981', bg:'rgba(16,185,129,.08)',  border:'rgba(16,185,129,.2)',  href:'/driver/veiculo' },
                    { icon:'📍', label:'Minha Rota',     color:'#0891B2', bg:'rgba(8,145,178,.08)',   border:'rgba(8,145,178,.2)',   href:'/driver/viagens' },
                ].map((a, i) => (
                    <button
                        key={i}
                        className="drv-action-btn"
                        style={{ background:a.bg, border:`1px solid ${a.border}` }}
                        onClick={() => router.push(a.href)}
                    >
                        <span style={{ fontSize:'1.45rem' }}>{a.icon}</span>
                        <span className="drv-action-label" style={{ color:a.color }}>{a.label}</span>
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
                            style={{ background: kmModal === 'start' ? '#0891B2' : '#10B981' }}
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
