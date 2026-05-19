'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { sendDriverLocationOnce } from '@/hooks/useDriverTracking';
import { toast } from '@/components/ui/Toast';
import { isDepartureDay, isDriverAccepted, pickActiveInTransitTrip, pickNextPlannedTrip } from '@/lib/driver-trips';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';

interface Trip {
    id: string; classId?: string | null; status: string; notes?: string; driverDecision?: string | null;
    originCity: { name: string; state: string };
    destinationCity: { name: string; state: string };
    departureDate: string; expectedArrivalDate: string; actualArrivalDate?: string;
    kmStart?: number; kmEnd?: number;
    truck: { identifier: string; licensePlate: string };
}

interface Performance {
    currentTrip: {
        destination: string;
        eta: { distanciaKm: number; minutos: number; fonte: 'haversine' | 'google' };
        kmRemaining: number;
        kmTraveled?: number;
        totalKmPlanned?: number;
        progress?: number;
        distanceSource?: 'acao' | 'haversine' | 'none';
        speed: number | null;
    } | null;
    ranking: {
        semana: { viagensNoPrazo: number; totalViagens: number; posicao: number | null; totalMotoristas: number };
        mes: { kmRodados: number; velocidadeMedia: number; viagensCompletas: number };
    };
}

const DASHBOARD_CSS = `
    @keyframes drv-slide-up  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    @keyframes drv-pulse-dot { 0%,100%{box-shadow:0 0 0 0 rgba(5,150,105,.5)} 50%{box-shadow:0 0 0 8px rgba(5,150,105,0)} }
    @keyframes drv-spin      { to{transform:rotate(360deg)} }
    @keyframes drv-prog      { from{width:0} to{width:var(--prog-w)} }

    .drv-page { width:100%; display:flex; flex-direction:column; gap:1rem; animation:drv-slide-up .35s cubic-bezier(.22,1,.36,1); }

    .drv-hero { position:relative; border-radius:16px; overflow:hidden;
        background:linear-gradient(135deg,#FFFDE7 0%,#FFF9C4 50%,#FFFBEB 100%);
        border:1px solid rgba(255,214,0,0.4); padding:1.5rem;
        box-shadow:0 4px 24px rgba(255,214,0,.12),0 1px 4px rgba(0,0,0,.04); }

    .drv-kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:.75rem; margin-top:1rem; }
    @media(max-width:600px){ .drv-kpis { grid-template-columns:repeat(2,1fr); } }

    .drv-kpi { padding:.9rem 1rem; border-radius:12px; background:rgba(255,255,255,0.75);
        backdrop-filter:blur(4px); display:flex; flex-direction:column; gap:.3rem;
        min-height:76px; box-shadow:0 1px 4px rgba(0,0,0,0.06); }
    .drv-kpi-label { font-size:.58rem; font-weight:800; letter-spacing:.12em; text-transform:uppercase;
        white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#6B7280; }
    .drv-kpi-value { font-family:Orbitron,sans-serif; font-weight:900; font-size:1.25rem; line-height:1; }

    .drv-card { width:100%; background:#FFFFFF; border-radius:16px; padding:1.25rem;
        border:1px solid rgba(0,0,0,0.07); box-shadow:0 1px 4px rgba(0,0,0,0.06);
        transition:box-shadow .2s,border-color .2s; }
    .drv-card:hover { box-shadow:0 4px 16px rgba(0,0,0,0.08); border-color:rgba(255,214,0,0.3); }
    .drv-card-active { background:linear-gradient(135deg,#F0FDF4,#DCFCE7);
        border-color:rgba(5,150,105,.35); box-shadow:0 4px 24px rgba(5,150,105,.1); }

    .drv-btn { width:100%; min-height:52px; border-radius:12px; border:none; cursor:pointer;
        font-weight:800; font-size:.92rem; display:flex; align-items:center; justify-content:center;
        gap:.5rem; transition:opacity .18s,transform .18s,box-shadow .18s; }
    .drv-btn:hover { opacity:.9; } .drv-btn:active { transform:scale(.98); }
    .drv-btn:disabled { opacity:.45; cursor:not-allowed; }

    .drv-actions { display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:.75rem; }
    .drv-action-btn { padding:.9rem .5rem; border-radius:12px; cursor:pointer;
        display:flex; flex-direction:column; align-items:center; gap:.4rem; min-height:80px;
        transition:opacity .18s,transform .18s,box-shadow .18s; border:none;
        background:#FFFFFF; box-shadow:0 1px 4px rgba(0,0,0,0.06); }
    .drv-action-btn:hover { box-shadow:0 4px 12px rgba(255,214,0,.2); transform:translateY(-2px); }
    .drv-action-btn:active { transform:scale(.97); }
    .drv-action-label { font-size:.68rem; font-weight:700; text-align:center; line-height:1.3; color:#374151; }

    .drv-progress-bar { height:8px; border-radius:4px; background:#E5E7EB; overflow:hidden; margin:.6rem 0; }
    .drv-progress-fill { height:100%; border-radius:4px;
        background:linear-gradient(90deg,#059669,#34D399);
        transition:width 1s cubic-bezier(.16,1,.3,1); }

    .drv-eta-badge { display:inline-flex; align-items:center; gap:.3rem;
        padding:.2rem .6rem; border-radius:20px; font-size:.68rem; font-weight:700;
        background:rgba(8,145,178,.1); color:#0891B2; border:1px solid rgba(8,145,178,.2); }

    .drv-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5);
        backdrop-filter:blur(8px); z-index:100; display:flex; align-items:center;
        justify-content:center; padding:1rem; }
    .drv-modal { background:#FFFFFF; border-radius:18px; padding:1.75rem;
        width:min(440px,calc(100% - 2rem)); border:1px solid rgba(0,0,0,0.08);
        box-shadow:0 8px 40px rgba(0,0,0,0.15); }
    .drv-modal-title { font-family:Orbitron,sans-serif; font-weight:800; color:#111827;
        margin-bottom:.4rem; font-size:.95rem; }
    .drv-modal-sub { color:#9CA3AF; font-size:.78rem; margin-bottom:1rem; }
    .drv-modal-label { font-size:.68rem; color:#6B7280; font-weight:700; letter-spacing:.08em;
        text-transform:uppercase; display:block; margin-bottom:.4rem; }
    .drv-modal-input { width:100%; padding:.85rem; border-radius:10px;
        border:1.5px solid rgba(0,0,0,.12); background:#F9FAFB; color:#111827;
        font-size:1.1rem; font-family:"JetBrains Mono",monospace;
        box-sizing:border-box; margin-bottom:1rem; outline:none; transition:border-color .18s; }
    .drv-modal-input:focus { border-color:#FFD600; box-shadow:0 0 0 3px rgba(255,214,0,.15); }
    .drv-modal-textarea { width:100%; padding:.85rem; border-radius:10px;
        border:1.5px solid rgba(0,0,0,.12); background:#F9FAFB; color:#111827;
        font-size:.9rem; resize:vertical; box-sizing:border-box; margin-bottom:1rem;
        outline:none; transition:border-color .18s; }
    .drv-modal-textarea:focus { border-color:#FFD600; box-shadow:0 0 0 3px rgba(255,214,0,.15); }
    .drv-modal-row { display:flex; gap:.75rem; }
    .drv-modal-cancel { flex:1; padding:.75rem; border-radius:10px;
        border:1px solid rgba(0,0,0,0.1); background:#F9FAFB; color:#6B7280;
        cursor:pointer; font-weight:600; font-size:.85rem; transition:background .15s; }
    .drv-modal-cancel:hover { background:#F3F4F6; }
    .drv-modal-ok { flex:2; padding:.75rem; border-radius:10px; border:none;
        color:#fff; cursor:pointer; font-weight:800; font-size:.85rem; transition:opacity .18s; }
    .drv-modal-ok:disabled { opacity:.45; cursor:not-allowed; }

    .drv-gps-badge { display:inline-flex; align-items:center; gap:.35rem;
        font-size:.62rem; font-weight:700; padding:.2rem .55rem; border-radius:20px;
        background:rgba(5,150,105,.12); color:#059669; border:1px solid rgba(5,150,105,.2); }
    .drv-gps-dot { width:7px; height:7px; border-radius:50%; background:#059669;
        animation:drv-pulse-dot 2s ease-in-out infinite; }
`;

function formatETA(minutos: number): string {
    if (minutos < 60) return `${minutos}min`;
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return m > 0 ? `${h}h${m}min` : `${h}h`;
}

export default function DriverDashboard() {
    const router = useRouter();
    const { user } = useAuthStore();

    const [activeTrip,   setActiveTrip]   = useState<Trip | null>(null);
    const [nextTrip,     setNextTrip]     = useState<Trip | null>(null);
    const [stats,        setStats]        = useState({ tripsMonth: 0, kmMonth: 0, pendingValue: 0, absencesPending: 0 });
    const [performance,  setPerformance]  = useState<Performance | null>(null);
    const [loading,      setLoading]      = useState(true);
    const [noteInput,    setNoteInput]    = useState('');
    const [kmModal,      setKmModal]      = useState<'start'|'end'|null>(null);
    const [noteModal,    setNoteModal]    = useState(false);
    const [saving,       setSaving]       = useState(false);
    const [gpsActive,    setGpsActive]    = useState(false);
    const [gpsError,     setGpsError]     = useState('');
    const [photoFile,    setPhotoFile]    = useState<File | null>(null);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

    const refreshPerformance = useCallback(async () => {
        try {
            const perfRes = await api.get('/driver/me/performance');
            if (perfRes.data) setPerformance(perfRes.data);
        } catch { /* silencioso */ }
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [tripsRes, reimbRes, absRes, perfRes] = await Promise.all([
                api.get('/driver/trips'),
                api.get('/reimbursements').catch(() => ({ data: [] })),
                api.get('/absences').catch(() => ({ data: [] })),
                api.get('/driver/me/performance').catch(() => ({ data: null })),
            ]);

            const allTrips: Trip[] = Array.isArray(tripsRes.data) ? tripsRes.data : [];
            const active = pickActiveInTransitTrip(allTrips);
            const next   = pickNextPlannedTrip(allTrips);
            const done   = allTrips.filter(t => t.status === 'COMPLETED');

            const now = new Date();
            const month = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthTrips = done.filter(t => new Date(t.departureDate) >= month);
            const kmMonth = monthTrips.reduce((a, t) =>
                (t.kmStart != null && t.kmEnd != null) ? a + (t.kmEnd - t.kmStart) : a, 0);

            const rList = Array.isArray(reimbRes.data) ? reimbRes.data : (reimbRes.data?.data ?? []);
            const pendingValue = rList
                .filter((r: any) => r.status === 'PENDING')
                .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

            const aList = Array.isArray(absRes.data) ? absRes.data : [];
            const absencesPending = aList.filter((a: any) => a.status === 'PENDING').length;

            setActiveTrip(active);
            setNextTrip(next);
            setStats({ tripsMonth: monthTrips.length, kmMonth, pendingValue, absencesPending });
            if (perfRes.data) setPerformance(perfRes.data);

            // F3.2: Se já tem viagem ativa, GPS já estava ativo — manter
            if (active) setGpsActive(true);
        } catch { /* silencioso */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        const onLoc = () => { refreshPerformance(); };
        window.addEventListener('driver:location-sent', onLoc);
        return () => window.removeEventListener('driver:location-sent', onLoc);
    }, [refreshPerformance]);

    useEffect(() => {
        if (!photoFile) {
            setPhotoPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(photoFile);
        setPhotoPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [photoFile]);

    // F3.2: Iniciar Viagem — solicita GPS, inicia polling, Trip → IN_TRANSIT
    const handleStart = async () => {
        if (!nextTrip || !photoFile) return;
        setSaving(true);
        try {
            if (!isDriverAccepted(nextTrip)) {
                toast.error('Aceite a viagem em Viagens → Planejadas antes de iniciar.');
                return;
            }
            if (!isDepartureDay(nextTrip.departureDate)) {
                toast.error('A viagem só pode ser iniciada no dia da partida.');
                return;
            }
            // Verifica suporte a geolocalização
            if (!navigator.geolocation) {
                setGpsError('Geolocalização não disponível neste dispositivo.');
                setSaving(false);
                return;
            }
            // Solicita permissão GPS antes de iniciar a viagem
            await new Promise<void>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(() => resolve(), (err) => {
                    if (err.code === err.PERMISSION_DENIED) {
                        setGpsError('Permissão de GPS negada. Habilite nas configurações do navegador.');
                        reject(err);
                    } else {
                        resolve(); // timeout ou unavailable — continua mesmo assim
                    }
                }, { timeout: 8000 });
            });

            const ext = photoFile.name.split('.').pop();
            const { data: presigned } = await api.post('/driver/trips/presigned-url', {
                filename: `hodometro_inicial.${ext}`,
            });
            await fetch(presigned.uploadUrl, {
                method: 'PUT',
                body: photoFile,
                headers: { 'Content-Type': photoFile.type }
            });

            await api.patch(`/driver/trips/${nextTrip.id}/start`, {
                startOdometerPhotoUrl: presigned.fileUrl,
            });
            setGpsActive(true);  // F3.2: ativa polling 3min
            setGpsError('');
            setKmModal(null);
            setPhotoFile(null);
            toast.success('Viagem iniciada com sucesso.');
            load();
        } catch (err: any) {
            if (!err?.code) {
                toast.error(err?.response?.data?.message || 'Erro ao iniciar viagem');
            }
        } finally { setSaving(false); }
    };

    // F3.3: Cheguei — bate ponto de chegada, tira foto, para polling, Trip → COMPLETED
    const handleComplete = async () => {
        if (!activeTrip || !photoFile) return;
        setSaving(true);
        try {
            // Bate check-in de chegada (posição final)
            await sendDriverLocationOnce('checkin');
            refreshPerformance();
            
            // 1. Obter URL pre-assinada
            const ext = photoFile.name.split('.').pop();
            const { data: presigned } = await api.post('/driver/trips/presigned-url', {
                filename: `hodometro_final.${ext}`,
            });

            // 2. Fazer upload da imagem
            await fetch(presigned.uploadUrl, {
                method: 'PUT',
                body: photoFile,
                headers: { 'Content-Type': photoFile.type }
            });

            // 3. Finalizar viagem no backend com a URL da foto
            await api.patch(`/driver/trips/${activeTrip.id}/complete`, { 
                endOdometerPhotoUrl: presigned.fileUrl,
                // kmEnd não é mais enviado, backend tentará deduzir pelo GPS 
                // e o Admin poderá corrigir visualizando a foto.
            });
            
            setGpsActive(false); // F3.3: para polling
            setKmModal(null);
            setPhotoFile(null);
            load();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Erro ao finalizar viagem');
        } finally { setSaving(false); }
    };

    const handleNote = async () => {
        if (!activeTrip || !noteInput.trim()) return;
        setSaving(true);
        try {
            await api.patch(`/driver/trips/${activeTrip.id}/notes`, { note: noteInput.trim() });
            setNoteModal(false);
            setNoteInput('');
            load();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Erro ao salvar ocorrência');
        } finally { setSaving(false); }
    };

    const fmt = (d: string) =>
        new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });

    if (loading) return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'50vh' }}>
            <style>{`@keyframes drv-spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ textAlign:'center' }}>
                <div style={{ width:36, height:36, border:'3px solid #FFD600', borderTopColor:'transparent',
                    borderRadius:'50%', animation:'drv-spin .75s linear infinite', margin:'0 auto 1rem' }} />
                <p style={{ color:'#9CA3AF', fontSize:'.8rem', fontFamily:'Orbitron,sans-serif',
                    letterSpacing:'.1em', margin:0 }}>CARREGANDO...</p>
            </div>
        </div>
    );

    return (
        <>
        <style>{DASHBOARD_CSS}</style>
        <div className="drv-page">

            <AdminHeaderHero
                title={`DASHBOARD · ${user?.name?.split(' ')[0] || 'MOTORISTA'}`}
                subtitle={new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}
                badge="PORTAL DO MOTORISTA"
                rightSlot={gpsActive && activeTrip ? <div className="drv-gps-badge"><span className="drv-gps-dot" />GPS ON</div> : undefined}
            />

            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:'.75rem' }}>
                <AnimatedKpiCard label="Viagens/Mês" value={stats.tripsMonth} color="#92400E" bg="#FFF7ED" border="#FED7AA" compact />
                <AnimatedKpiCard label="Km Rodados" value={stats.kmMonth} color="#059669" bg="#F0FDF4" border="#BBF7D0" displayValue={`${stats.kmMonth.toLocaleString('pt-BR')}km`} compact />
                <AnimatedKpiCard label="A Receber" value={0} color="#EA580C" bg="#FFF7ED" border="#FED7AA" displayValue={`R$ ${stats.pendingValue.toLocaleString('pt-BR')}`} compact />
                <AnimatedKpiCard label="Imprevistos" value={stats.absencesPending} color="#7C3AED" bg="#F5F3FF" border="#DDD6FE" compact />
            </div>

            {/* ERRO GPS */}
            {gpsError && (
                <div style={{ padding:'.75rem 1rem', borderRadius:10, background:'#FEF2F2',
                    border:'1px solid #FECACA', color:'#DC2626', fontSize:'.8rem', display:'flex',
                    alignItems:'center', gap:'.5rem' }}>
                    ⚠️ {gpsError}
                </div>
            )}

            {/* F3.4 — CARD VIAGEM ATIVA com ETA, progresso e velocidade */}
            {activeTrip && (
                <div className="drv-card drv-card-active">
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.75rem', gap:'.5rem', flexWrap:'wrap' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:'.4rem',
                            fontSize:'.62rem', fontWeight:800, color:'#059669', letterSpacing:'.12em', textTransform:'uppercase' }}>
                            <span style={{ width:8, height:8, borderRadius:'50%', background:'#059669',
                                display:'inline-block', animation:'drv-pulse-dot 2s ease-in-out infinite' }} />
                            EM TRÂNSITO
                        </span>
                        <span style={{ fontSize:'.68rem', color:'#6B7280', fontFamily:'"JetBrains Mono",monospace',
                            background:'rgba(0,0,0,.05)', padding:'.15rem .5rem', borderRadius:5 }}>
                            {activeTrip.truck.licensePlate}
                        </span>
                    </div>

                    <div style={{ fontSize:'1.05rem', fontWeight:800, color:'#111827', marginBottom:'.3rem',
                        display:'flex', alignItems:'center', gap:'.4rem', flexWrap:'wrap' }}>
                        {activeTrip.originCity.name}
                        <span style={{ color:'#FFD600', fontSize:'1.2rem' }}>→</span>
                        {activeTrip.destinationCity.name}
                    </div>

                    {/* Barra de progresso + ETA do backend */}
                    {performance?.currentTrip && (
                        <div style={{ margin:'.75rem 0' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.4rem', gap:'.5rem', flexWrap:'wrap' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'.5rem', flexWrap:'wrap' }}>
                                    <span className="drv-eta-badge">
                                        🕐 {formatETA(performance.currentTrip.eta.minutos)}
                                    </span>
                                    <span style={{ fontSize:'.68rem', color:'#6B7280' }}>
                                        {Math.round(performance.currentTrip.kmRemaining)} km restantes
                                        {performance.currentTrip.totalKmPlanned != null &&
                                            performance.currentTrip.totalKmPlanned > 0 && (
                                            <> · {Math.round(performance.currentTrip.totalKmPlanned)} km total
                                                {performance.currentTrip.distanceSource === 'acao' ? ' (período)' : ''}
                                            </>
                                        )}
                                    </span>
                                    {performance.currentTrip.speed != null && (
                                        <span style={{ fontSize:'.68rem', color:'#059669', fontWeight:700 }}>
                                            {Math.round(performance.currentTrip.speed)} km/h
                                        </span>
                                    )}
                                </div>
                                <span style={{ fontSize:'.6rem', color:'#9CA3AF' }}>
                                    via {performance.currentTrip.eta.fonte === 'google' ? '🗺️ Maps' : '📐 estimativa'}
                                </span>
                            </div>
                            <div className="drv-progress-bar">
                                <div className="drv-progress-fill"
                                    style={{ width: `${Math.min(100, Math.max(performance.currentTrip.progress ?? 0, performance.currentTrip.totalKmPlanned ? 2 : 5))}%` }} />
                            </div>
                        </div>
                    )}

                    <div style={{ display:'flex', gap:'.75rem', fontSize:'.72rem', color:'#6B7280',
                        marginBottom: activeTrip.notes ? '.5rem' : '.85rem', flexWrap:'wrap' }}>
                        <span>📅 Chegada prevista: {fmt(activeTrip.expectedArrivalDate)}</span>
                        <span>🔢 Km início: {activeTrip.kmStart?.toLocaleString('pt-BR') ?? '—'}</span>
                    </div>

                    {activeTrip.notes && (
                        <div style={{ padding:'.6rem .85rem', borderRadius:9, background:'rgba(255,214,0,0.1)',
                            border:'1px solid rgba(255,214,0,0.3)', fontSize:'.78rem', color:'#92400E',
                            marginBottom:'.85rem', lineHeight:1.5 }}>
                            📋 {activeTrip.notes}
                        </div>
                    )}

                    {/* F3.3: Botão Cheguei */}
                    <button className="drv-btn" style={{ background:'linear-gradient(135deg,#059669,#047857)',
                        color:'#fff', marginBottom:'.5rem', boxShadow:'0 4px 20px rgba(5,150,105,.3)' }}
                        onClick={() => { setKmModal('end'); setPhotoFile(null); }}>
                        🏁 Cheguei ao Destino
                    </button>
                    <button className="drv-btn" style={{ background:'rgba(0,0,0,.04)',
                        color:'#6B7280', border:'1px solid rgba(0,0,0,.08)', minHeight:44 }}
                        onClick={() => setNoteModal(true)}>
                        📝 Reportar Ocorrência
                    </button>
                </div>
            )}

            {/* F3.2 — PRÓXIMA VIAGEM com botão Iniciar */}
            {nextTrip && !activeTrip && (
                <div className="drv-card" style={{ borderColor:'rgba(255,214,0,.4)', background:'#FFFDE7' }}>
                    <div style={{ fontSize:'.62rem', fontWeight:800, color:'#92400E', letterSpacing:'.12em',
                        textTransform:'uppercase', marginBottom:'.75rem' }}>
                        📋 PRÓXIMA VIAGEM
                    </div>
                    <div style={{ fontSize:'1.05rem', fontWeight:800, color:'#111827', marginBottom:'.3rem',
                        display:'flex', alignItems:'center', gap:'.4rem', flexWrap:'wrap' }}>
                        {nextTrip.originCity.name}
                        <span style={{ color:'#FFD600', fontSize:'1.2rem' }}>→</span>
                        {nextTrip.destinationCity.name}
                    </div>
                    <div style={{ fontSize:'.72rem', color:'#6B7280', marginBottom:'.85rem' }}>
                        🗓️ Partida: {fmt(nextTrip.departureDate)} · {nextTrip.truck.licensePlate}
                        {nextTrip.notes && (
                            <span style={{ display:'block', marginTop:'.25rem', color:'#92400E', fontWeight:700 }}>
                                {nextTrip.notes.split('—')[0]?.trim()}
                            </span>
                        )}
                    </div>
                    {!isDriverAccepted(nextTrip) && (
                        <div style={{ fontSize:'.75rem', fontWeight:700, color:'#92400E', marginBottom:'.75rem',
                            padding:'.55rem .75rem', borderRadius:8, background:'#FFFBEB', border:'1px solid #FDE68A' }}>
                            Confirme a viagem em <strong>Viagens → Planejadas</strong> (Aceitar) antes de iniciar.
                        </div>
                    )}
                    {isDriverAccepted(nextTrip) && (
                        <div style={{ fontSize:'.72rem', color:'#6B7280', marginBottom:'.85rem',
                            padding:'.5rem .75rem', borderRadius:8, background:'rgba(8,145,178,.08)',
                            border:'1px solid rgba(8,145,178,.15)' }}>
                            📍 Ao iniciar, o GPS será ativado automaticamente para rastreamento da rota.
                        </div>
                    )}
                    {isDriverAccepted(nextTrip) && (
                    <button
                        className="drv-btn"
                        style={{
                            background: isDepartureDay(nextTrip.departureDate)
                                ? 'linear-gradient(135deg,#FFD600,#F59E0B)'
                                : '#94A3B8',
                            color:'#0F172A',
                            boxShadow:'0 4px 20px rgba(255,214,0,.3)',
                            fontWeight:900,
                        }}
                        disabled={!isDepartureDay(nextTrip.departureDate)}
                        onClick={() => { setKmModal('start'); setPhotoFile(null); }}
                    >
                        {isDepartureDay(nextTrip.departureDate)
                            ? '🚛 Iniciar Viagem'
                            : '🚫 Disponível somente no dia da partida'}
                    </button>
                    )}
                </div>
            )}

            {/* SEM VIAGEM */}
            {!activeTrip && !nextTrip && (
                <div className="drv-card" style={{ textAlign:'center', padding:'2.5rem 1rem' }}>
                    <div style={{ fontSize:'2.5rem', marginBottom:'.75rem' }}>🛣️</div>
                    <div style={{ fontFamily:'Orbitron,sans-serif', fontSize:'.7rem', color:'#9CA3AF', letterSpacing:'.1em' }}>
                        NENHUMA VIAGEM ATRIBUÍDA
                    </div>
                    <p style={{ color:'#6B7280', fontSize:'.78rem', marginTop:'.5rem' }}>
                        Entre em contato com o coordenador.
                    </p>
                </div>
            )}

            {/* F3.5 — CARD MEU DESEMPENHO com ranking */}
            {performance && (
                <div className="drv-card" style={{ borderColor:'rgba(124,58,237,.2)', background:'linear-gradient(135deg,#F5F3FF,#EDE9FE)' }}>
                    <div style={{ fontSize:'.62rem', fontWeight:800, color:'#7C3AED', letterSpacing:'.12em',
                        textTransform:'uppercase', marginBottom:'1rem', display:'flex',
                        alignItems:'center', gap:'.35rem' }}>
                        🏆 MEU DESEMPENHO
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.75rem' }}>
                        {/* Pontualidade semanal */}
                        <div style={{ padding:'.85rem', borderRadius:11, background:'rgba(255,255,255,0.7)',
                            border:'1px solid rgba(124,58,237,.12)' }}>
                            <div style={{ fontSize:'.6rem', color:'#7C3AED', fontWeight:700,
                                textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'.35rem' }}>
                                Esta Semana
                            </div>
                            <div style={{ fontFamily:'Orbitron,sans-serif', fontWeight:900,
                                fontSize:'1.3rem', color:'#059669' }}>
                                {performance.ranking.semana.viagensNoPrazo}/{performance.ranking.semana.totalViagens}
                            </div>
                            <div style={{ fontSize:'.68rem', color:'#6B7280', marginTop:'.2rem' }}>
                                viagens no prazo
                            </div>
                            {performance.ranking.semana.posicao && (
                                <div style={{ marginTop:'.5rem', fontSize:'.72rem', fontWeight:700,
                                    color:'#7C3AED' }}>
                                    🥇 #{performance.ranking.semana.posicao} de {performance.ranking.semana.totalMotoristas}
                                </div>
                            )}
                        </div>
                        {/* KPIs do mês */}
                        <div style={{ padding:'.85rem', borderRadius:11, background:'rgba(255,255,255,0.7)',
                            border:'1px solid rgba(124,58,237,.12)' }}>
                            <div style={{ fontSize:'.6rem', color:'#7C3AED', fontWeight:700,
                                textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'.35rem' }}>
                                Este Mês
                            </div>
                            <div style={{ fontFamily:'Orbitron,sans-serif', fontWeight:900,
                                fontSize:'1.3rem', color:'#0891B2' }}>
                                {performance.ranking.mes.kmRodados.toLocaleString('pt-BR')}km
                            </div>
                            <div style={{ fontSize:'.68rem', color:'#6B7280', marginTop:'.2rem' }}>
                                rodados · {performance.ranking.mes.velocidadeMedia > 0
                                    ? `${performance.ranking.mes.velocidadeMedia} km/h média` : 'sem dados'}
                            </div>
                            <div style={{ marginTop:'.5rem', fontSize:'.72rem', color:'#059669', fontWeight:700 }}>
                                ✅ {performance.ranking.mes.viagensCompletas} viagem(ns) completa(s)
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AÇÕES RÁPIDAS */}
            <div className="drv-actions">
                {[
                    { icon:'💰', label:'Novo Reembolso', color:'#92400E', bg:'rgba(255,214,0,.12)', border:'rgba(255,214,0,.3)',   href:'/driver/reembolsos' },
                    { icon:'🗺️', label:'Ver Viagens',    color:'#7C3AED', bg:'rgba(124,58,237,.08)', border:'rgba(124,58,237,.2)', href:'/driver/viagens' },
                    { icon:'🚛', label:'Meu Veículo',    color:'#059669', bg:'rgba(5,150,105,.08)',  border:'rgba(5,150,105,.2)',   href:'/driver/veiculo' },
                    { icon:'⚠️', label:'Imprevisto',     color:'#DC2626', bg:'rgba(220,38,38,.07)',  border:'rgba(220,38,38,.2)',   href:'/driver/imprevistos' },
                    { icon:'📍', label:'Minha Rota',     color:'#0891B2', bg:'rgba(8,145,178,.08)',  border:'rgba(8,145,178,.2)',   href:'/driver/viagens' },
                ].map((a,i) => (
                    <button key={i} className="drv-action-btn"
                        style={{ background:a.bg, border:`1px solid ${a.border}` }}
                        onClick={() => router.push(a.href)}>
                        <span style={{ fontSize:'1.45rem' }}>{a.icon}</span>
                        <span className="drv-action-label" style={{ color:a.color }}>{a.label}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* MODAL QUILOMETRAGEM */}
        {kmModal && (
            <div className="drv-modal-overlay" onClick={e => { if(e.target===e.currentTarget) setKmModal(null); }}>
                <div className="drv-modal">
                    <div className="drv-modal-title">
                        {kmModal==='start' ? '🚛 Iniciar Viagem' : '🏁 Finalizar Viagem'}
                    </div>
                    <p className="drv-modal-sub">
                        {kmModal==='start'
                            ? 'Envie a foto do hodômetro inicial para validação. O GPS será ativado automaticamente.'
                            : 'Informe o hodômetro final ao chegar. O GPS será desativado.'}
                    </p>
                    {kmModal === 'start' ? (
                        <>
                            <label className="drv-modal-label">Foto do Hodômetro Inicial (Obrigatório)</label>
                            <div style={{ padding:'1rem', border:'1.5px dashed rgba(0,0,0,.15)', borderRadius:10, marginBottom:'1rem', textAlign:'center', background:'#F9FAFB' }}>
                                <input type="file" accept="image/*" capture="environment"
                                    id="start-photo-upload" style={{ display:'none' }}
                                    onChange={e => e.target.files && setPhotoFile(e.target.files[0])} />
                                <label htmlFor="start-photo-upload" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'.5rem', cursor:'pointer' }}>
                                    <span style={{ fontSize:'2rem' }}>📸</span>
                                    <span style={{ fontSize:'.85rem', fontWeight:600, color:'#374151' }}>
                                        {photoFile ? photoFile.name : 'Tirar Foto do Painel'}
                                    </span>
                                </label>
                                {photoPreviewUrl && (
                                    <img
                                        src={photoPreviewUrl}
                                        alt="Pré-visualização hodômetro inicial"
                                        style={{ marginTop: '.7rem', width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(0,0,0,.12)' }}
                                    />
                                )}
                            </div>
                            <div style={{ padding:'.5rem .75rem', borderRadius:8, background:'rgba(8,145,178,.08)',
                                border:'1px solid rgba(8,145,178,.15)', fontSize:'.72rem', color:'#0891B2',
                                marginBottom:'1rem', display:'flex', alignItems:'center', gap:'.4rem' }}>
                                📍 Foto inicial + GPS a cada 3 minutos durante a viagem.
                            </div>
                        </>
                    ) : (
                        <>
                            <label className="drv-modal-label">Foto do Hodômetro (Obrigatório)</label>
                            <div style={{ padding:'1rem', border:'1.5px dashed rgba(0,0,0,.15)', borderRadius:10, marginBottom:'1rem', textAlign:'center', background:'#F9FAFB' }}>
                                <input type="file" accept="image/*" capture="environment" 
                                    id="photo-upload" style={{ display:'none' }}
                                    onChange={e => e.target.files && setPhotoFile(e.target.files[0])} />
                                <label htmlFor="photo-upload" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'.5rem', cursor:'pointer' }}>
                                    <span style={{ fontSize:'2rem' }}>📸</span>
                                    <span style={{ fontSize:'.85rem', fontWeight:600, color:'#374151' }}>
                                        {photoFile ? photoFile.name : 'Tirar Foto do Painel'}
                                    </span>
                                </label>
                                {photoPreviewUrl && (
                                    <img
                                        src={photoPreviewUrl}
                                        alt="Pré-visualização hodômetro final"
                                        style={{ marginTop: '.7rem', width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(0,0,0,.12)' }}
                                    />
                                )}
                            </div>
                            <div style={{ padding:'.5rem .75rem', borderRadius:8, background:'rgba(5,150,105,.08)',
                                border:'1px solid rgba(5,150,105,.15)', fontSize:'.72rem', color:'#059669',
                                marginBottom:'1rem', display:'flex', alignItems:'center', gap:'.4rem' }}>
                                🔍 A foto servirá como comprovante da distância percorrida.
                            </div>
                        </>
                    )}
                    
                    <div className="drv-modal-row">
                        <button className="drv-modal-cancel" onClick={() => setKmModal(null)}>Cancelar</button>
                        <button className="drv-modal-ok"
                            style={{ background: kmModal==='start'
                                ? 'linear-gradient(135deg,#FFD600,#F59E0B)' : '#059669',
                                color: kmModal==='start' ? '#0F172A' : '#fff' }}
                            onClick={kmModal==='start' ? handleStart : handleComplete}
                            disabled={saving || (kmModal === 'start' ? !photoFile : !photoFile)}>
                            {saving ? 'Aguarde...' : kmModal==='start' ? '🚛 Iniciar + GPS' : '🏁 Finalizar'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL OCORRÊNCIA */}
        {noteModal && (
            <div className="drv-modal-overlay" onClick={e => { if(e.target===e.currentTarget) setNoteModal(false); }}>
                <div className="drv-modal">
                    <div className="drv-modal-title">📝 Registrar Ocorrência</div>
                    <p className="drv-modal-sub">Descreva o ocorrido — salvo com hora automaticamente.</p>
                    <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)} rows={4}
                        placeholder="Ex: Pneu furado na BR-135 km 234..." className="drv-modal-textarea" />
                    <div className="drv-modal-row">
                        <button className="drv-modal-cancel" onClick={() => setNoteModal(false)}>Cancelar</button>
                        <button className="drv-modal-ok" style={{ background:'#EA580C' }}
                            onClick={handleNote} disabled={saving || !noteInput.trim()}>
                            {saving ? 'Salvando...' : '📋 Registrar'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
