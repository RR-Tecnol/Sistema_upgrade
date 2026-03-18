'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api/client';

interface Trip {
    id: string; status: string; notes?: string;
    originCity: { name: string; state: string };
    destinationCity: { name: string; state: string };
    departureDate: string; expectedArrivalDate: string;
    actualArrivalDate?: string;
    kmStart?: number; kmEnd?: number;
    truck: { identifier: string; licensePlate: string };
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    PLANNED:    { label: 'Planejada',   color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
    IN_TRANSIT: { label: 'Em Trânsito', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
    COMPLETED:  { label: 'Concluída',   color: '#64748B', bg: 'rgba(100,116,139,0.12)' },
};

export default function DriverViagens() {
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'IN_TRANSIT' | 'PLANNED' | 'COMPLETED'>('IN_TRANSIT');
    const [kmInput, setKmInput] = useState('');
    const [showModal, setShowModal] = useState<{ trip: Trip; type: 'start' | 'end' } | null>(null);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/driver/trips');
            setTrips(Array.isArray(res.data) ? res.data : []);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const filtered = trips.filter(t => t.status === tab);

    const handleAction = async () => {
        if (!showModal || !kmInput) return;
        setSaving(true);
        try {
            if (showModal.type === 'start') {
                await api.patch(`/driver/trips/${showModal.trip.id}/start`, { kmStart: parseInt(kmInput) });
            } else {
                await api.patch(`/driver/trips/${showModal.trip.id}/complete`, { kmEnd: parseInt(kmInput) });
            }
            setShowModal(null); setKmInput(''); load();
        } catch { } finally { setSaving(false); }
    };

    const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');
    const cardStyle: React.CSSProperties = { background: '#1E293B', borderRadius: 14, padding: '1.1rem', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '0.75rem' };
    const btnStyle: React.CSSProperties = { padding: '0.6rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', minHeight: 40 };

    return (
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <h1 style={{ fontFamily: 'Orbitron, sans-serif', color: '#0891B2', fontSize: '1.3rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '1.25rem' }}>VIAGENS</h1>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', background: '#1E293B', padding: '0.35rem', borderRadius: 10 }}>
                {(['IN_TRANSIT', 'PLANNED', 'COMPLETED'] as const).map(s => (
                    <button key={s} onClick={() => setTab(s)} style={{
                        flex: 1, padding: '0.5rem', borderRadius: 7, border: 'none', cursor: 'pointer',
                        fontWeight: tab === s ? 700 : 400, fontSize: '0.75rem',
                        background: tab === s ? STATUS_LABELS[s].bg : 'transparent',
                        color: tab === s ? STATUS_LABELS[s].color : '#64748B',
                        transition: 'all 0.18s',
                    }}>
                        {s === 'IN_TRANSIT' ? 'Andamento' : s === 'PLANNED' ? 'Planejadas' : 'Concluídas'}
                        <span style={{ marginLeft: '0.3rem', fontSize: '0.65rem' }}>
                            ({trips.filter(t => t.status === s).length})
                        </span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>Carregando...</div>
            ) : filtered.length === 0 ? (
                <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem 1rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🛣️</div>
                    <div style={{ color: '#64748B', fontSize: '0.85rem' }}>Nenhuma viagem {STATUS_LABELS[tab].label.toLowerCase()}</div>
                </div>
            ) : filtered.map(trip => {
                const st = STATUS_LABELS[trip.status];
                const kmPercorrida = trip.kmEnd && trip.kmStart ? trip.kmEnd - trip.kmStart : null;
                return (
                    <div key={trip.id} style={{ ...cardStyle, borderColor: `${st.color}25` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: st.color, background: st.bg, padding: '0.2rem 0.6rem', borderRadius: 100, letterSpacing: '0.08em' }}>
                                {st.label.toUpperCase()}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#64748B', fontFamily: 'monospace' }}>{trip.truck.licensePlate}</span>
                        </div>

                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#F1F5F9', marginBottom: '0.4rem' }}>
                            {trip.originCity.name} <span style={{ color: '#0891B2' }}>→</span> {trip.destinationCity.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '0.75rem' }}>
                            {trip.status === 'COMPLETED'
                                ? `Chegada: ${fmtDate(trip.actualArrivalDate || trip.expectedArrivalDate)} · ${kmPercorrida ? `${kmPercorrida} km` : ''}`
                                : `Partida: ${fmtDate(trip.departureDate)} · Chegada prevista: ${fmtDate(trip.expectedArrivalDate)}`
                            }
                        </div>

                        {trip.notes && (
                            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.6rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic', maxHeight: 60, overflow: 'hidden' }}>
                                📝 {trip.notes.split('\n').pop()}
                            </div>
                        )}

                        {trip.status === 'PLANNED' && (
                            <button onClick={() => { setShowModal({ trip, type: 'start' }); setKmInput(''); }}
                                style={{ ...btnStyle, background: '#0891B2', color: '#fff', width: '100%' }}>
                                🚛 Iniciar Viagem
                            </button>
                        )}
                        {trip.status === 'IN_TRANSIT' && (
                            <button onClick={() => { setShowModal({ trip, type: 'end' }); setKmInput(''); }}
                                style={{ ...btnStyle, background: '#10B981', color: '#fff', width: '100%' }}>
                                ✅ Finalizar Viagem
                            </button>
                        )}
                        {trip.status === 'COMPLETED' && kmPercorrida && (
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10B981', fontFamily: 'monospace' }}>
                                🏁 {kmPercorrida.toLocaleString('pt-BR')} km percorridos
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Modal km */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                    onClick={e => { if (e.target === e.currentTarget) setShowModal(null); }}>
                    <div style={{ background: '#1E293B', borderRadius: 20, padding: '1.75rem', width: '100%', maxWidth: 380, border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontWeight: 800, color: '#F1F5F9', marginBottom: '0.4rem' }}>
                            {showModal.type === 'start' ? '🚛 Iniciar Viagem' : '✅ Finalizar Viagem'}
                        </div>
                        <div style={{ color: '#64748B', fontSize: '0.8rem', marginBottom: '1rem' }}>
                            {showModal.trip.originCity.name} → {showModal.trip.destinationCity.name}
                        </div>
                        <label style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                            Hodômetro atual (km)
                        </label>
                        <input type="number" placeholder="Ex: 145020" value={kmInput} onChange={e => setKmInput(e.target.value)}
                            style={{ width: '100%', padding: '0.85rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: '#0F172A', color: '#F1F5F9', fontSize: '1.1rem', fontFamily: 'monospace', boxSizing: 'border-box', marginBottom: '1rem' }} />
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => setShowModal(null)} style={{ flex: 1, padding: '0.75rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#64748B', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                            <button onClick={handleAction} disabled={saving || !kmInput}
                                style={{ flex: 2, padding: '0.75rem', borderRadius: 10, border: 'none', background: showModal.type === 'start' ? '#0891B2' : '#10B981', color: '#fff', cursor: 'pointer', fontWeight: 700, opacity: saving || !kmInput ? 0.6 : 1 }}>
                                {saving ? 'Salvando...' : showModal.type === 'start' ? 'Iniciar' : 'Finalizar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
