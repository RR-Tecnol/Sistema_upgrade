'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import api from '@/lib/api/client';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { toast } from '@/components/ui/Toast';
import { TripOdometerPhotosPreview } from '@/components/admin/TripOdometerPhotosPreview';
import {
    isDepartureDay,
    isDriverAccepted,
    isDriverRejected,
    needsDriverResponse,
    sortPlannedTripsAsc,
} from '@/lib/driver-trips';

interface Trip {
    id: string; status: string; notes?: string;
    driverDecision?: string | null;
    originCity: { name: string; state: string };
    destinationCity: { name: string; state: string };
    departureDate: string; expectedArrivalDate: string;
    actualArrivalDate?: string;
    kmStart?: number; kmEnd?: number;
    truck: { identifier: string; licensePlate: string };
    origin?: string;
    destination?: string;
    originCityName?: string;
    destinationCityName?: string;
    class?: {
        classIdentifier: string;
        startDate?: string;
        endDate?: string;
        startTime?: string;
        endTime?: string;
        course?: { name: string };
    };
    /** URLs das fotos enviadas pelo motorista (mesmo modelo de pré-visualização das inscrições). */
    startOdometerPhotoUrl?: string | null;
    endOdometerPhotoUrl?: string | null;
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
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
    const [respondingId, setRespondingId] = useState<string | null>(null);
    const [rejectModal, setRejectModal] = useState<{ tripId: string; reason: string } | null>(null);

    const toText = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    const routeFromTrip = (trip: Trip) => {
        const origin =
            toText(trip.originCity?.name) ||
            toText(trip.originCityName) ||
            toText(trip.origin) ||
            'Origem não informada';
        const destination =
            toText(trip.destinationCity?.name) ||
            toText(trip.destinationCityName) ||
            toText(trip.destination) ||
            'Destino não informado';
        return { origin, destination };
    };
    const normalizeTrip = (raw: any): Trip => {
        const source = raw || {};
        const originName = toText(source.originCity?.name) || toText(source.originCityName) || toText(source.origin);
        const destinationName = toText(source.destinationCity?.name) || toText(source.destinationCityName) || toText(source.destination);
        return {
            ...source,
            originCity: source.originCity?.name ? source.originCity : { name: originName || 'Origem não informada', state: '' },
            destinationCity: source.destinationCity?.name ? source.destinationCity : { name: destinationName || 'Destino não informado', state: '' },
            startOdometerPhotoUrl: source.startOdometerPhotoUrl ?? null,
            endOdometerPhotoUrl: source.endOdometerPhotoUrl ?? null,
        };
    };

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/driver/trips');
            const rows = Array.isArray(res.data) ? res.data : [];
            setTrips(rows.map(normalizeTrip));
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    // Preview local da foto
    useEffect(() => {
        if (!photoFile) { setPhotoPreviewUrl(null); return; }
        const url = URL.createObjectURL(photoFile);
        setPhotoPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [photoFile]);

    const filtered =
        tab === 'PLANNED'
            ? sortPlannedTripsAsc(trips.filter(t => t.status === 'PLANNED'))
            : trips.filter(t => t.status === tab);

    const handleAction = async () => {
        if (!showModal) return;
        setSaving(true);
        try {
            if (showModal.type === 'start') {
                if (!photoFile) { toast.error('Foto do hodômetro inicial é obrigatória.'); return; }
                const ext = photoFile.name.split('.').pop();
                const { data: presigned } = await api.post('/driver/trips/presigned-url', {
                    filename: `hodometro_inicial.${ext}`,
                });
                // BUG A: validar se o PUT de upload realmente funcionou antes de salvar a URL
                const uploadRes = await fetch(presigned.uploadUrl, {
                    method: 'PUT',
                    body: photoFile,
                    headers: { 'Content-Type': photoFile.type },
                });
                if (!uploadRes.ok) {
                    throw new Error(`Upload da foto falhou (HTTP ${uploadRes.status}). Verifique a conexão e tente novamente.`);
                }
                await api.patch(`/driver/trips/${showModal.trip.id}/start`, {
                    startOdometerPhotoUrl: presigned.fileUrl,
                });
                toast.success('Viagem iniciada com sucesso.');
            } else {
                // BUG D: exigir foto também na finalização (alinhado com dashboard)
                if (!photoFile) { toast.error('Foto do hodômetro final é obrigatória.'); return; }
                const ext = photoFile.name.split('.').pop();
                const { data: presigned } = await api.post('/driver/trips/presigned-url', {
                    filename: `hodometro_final.${ext}`,
                });
                const uploadRes = await fetch(presigned.uploadUrl, {
                    method: 'PUT',
                    body: photoFile,
                    headers: { 'Content-Type': photoFile.type },
                });
                if (!uploadRes.ok) {
                    throw new Error(`Upload da foto falhou (HTTP ${uploadRes.status}). Verifique a conexão e tente novamente.`);
                }
                await api.patch(`/driver/trips/${showModal.trip.id}/complete`, {
                    endOdometerPhotoUrl: presigned.fileUrl,
                    ...(kmInput ? { kmEnd: parseInt(kmInput) } : {}),
                });
                toast.success('Viagem finalizada com sucesso.');
            }
            setShowModal(null); setKmInput(''); setPhotoFile(null); setPhotoPreviewUrl(null); load();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Erro ao executar ação da viagem.');
        } finally { setSaving(false); }
    };

    const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');
    const cardStyle: CSSProperties = { background: '#FFFFFF', borderRadius: 14, padding: '1.1rem', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' };
    const btnStyle: CSSProperties = { padding: '0.6rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', minHeight: 40 };

    const handleDecision = async (tripId: string, decision: 'ACCEPTED' | 'REJECTED', reason?: string) => {
        setRespondingId(tripId);
        try {
            await api.patch(`/driver/trips/${tripId}/respond`, { decision, reason });
            toast.success(decision === 'ACCEPTED' ? 'Viagem aceita com sucesso.' : 'Viagem recusada e enviada para análise.');
            await load();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Não foi possível registrar sua decisão.');
        } finally {
            setRespondingId(null);
        }
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <AdminHeaderHero
                title="VIAGENS"
                subtitle="Acompanhe viagens em andamento, planejadas e concluídas"
                badge="MOTORISTA"
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem' }}>
                <AnimatedKpiCard label="Em Andamento" value={trips.filter(t => t.status === 'IN_TRANSIT').length} color="#10B981" bg="#F0FDF4" border="#BBF7D0" compact />
                <AnimatedKpiCard label="Planejadas" value={trips.filter(t => t.status === 'PLANNED').length} color="#0891B2" bg="#F0F9FF" border="#BAE6FD" compact />
                <AnimatedKpiCard label="Concluídas" value={trips.filter(t => t.status === 'COMPLETED').length} color="#6B7280" bg="#F3F4F6" border="#E5E7EB" compact />
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', background: '#F3F4F6', padding: '0.35rem', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                {(['IN_TRANSIT', 'PLANNED', 'COMPLETED'] as const).map(s => (
                    <button key={s} onClick={() => setTab(s)} style={{
                        flex: 1, padding: '0.5rem', borderRadius: 7, border: 'none', cursor: 'pointer',
                        fontWeight: tab === s ? 700 : 400, fontSize: '0.75rem',
                        background: tab === s ? STATUS_LABELS[s].bg : 'transparent',
                        color: tab === s ? STATUS_LABELS[s].color : '#6B7280',
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
                <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>Carregando...</div>
            ) : filtered.length === 0 ? (
                <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem 1rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🛣️</div>
                    <div style={{ color: '#6B7280', fontSize: '0.85rem' }}>Nenhuma viagem {STATUS_LABELS[tab].label.toLowerCase()}</div>
                </div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filtered.map(trip => {
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

                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '0.4rem' }}>
                            {routeFromTrip(trip).origin} <span style={{ color: '#0891B2' }}>→</span> {routeFromTrip(trip).destination}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#6B7280', marginBottom: '0.75rem' }}>
                            {trip.status === 'COMPLETED'
                                ? `Chegada: ${fmtDate(trip.actualArrivalDate || trip.expectedArrivalDate)} · ${kmPercorrida ? `${kmPercorrida} km` : ''}`
                                : `Partida: ${fmtDate(trip.departureDate)} · Chegada prevista: ${fmtDate(trip.expectedArrivalDate)}`
                            }
                        </div>
                        {trip.class && (
                            <div style={{
                                fontSize: '0.76rem', color: '#374151', marginBottom: '0.75rem',
                                padding: '0.55rem 0.7rem', borderRadius: 8, background: '#FFFBEB', border: '1px solid #FDE68A',
                            }}>
                                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                                    📚 {trip.class.course?.name || 'Curso'} · Turma {trip.class.classIdentifier}
                                </div>
                                <div>🚌 Carreta {trip.truck?.identifier || '—'}</div>
                                {(trip.class.startTime || trip.class.endTime) && (
                                    <div style={{ marginTop: 4, color: '#6B7280' }}>
                                        Horário aula: {trip.class.startTime || '—'} – {trip.class.endTime || '—'}
                                    </div>
                                )}
                            </div>
                        )}

                        {trip.notes && (
                            <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '0.6rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: '#6B7280', fontStyle: 'italic', maxHeight: 60, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                                📝 {trip.notes.split('\n').pop()}
                            </div>
                        )}

                        {(trip.status !== 'PLANNED' ||
                            trip.startOdometerPhotoUrl ||
                            trip.endOdometerPhotoUrl) && (
                            <div style={{ marginBottom: '0.85rem' }}>
                                <TripOdometerPhotosPreview
                                    tripId={trip.id}
                                    startUrl={trip.startOdometerPhotoUrl}
                                    endUrl={trip.endOdometerPhotoUrl}
                                    scope="driver"
                                    emptyMessage={
                                        trip.status === 'IN_TRANSIT'
                                            ? 'Envie a foto da ida ao iniciar a viagem. A foto da volta ao finalizar.'
                                            : 'Nenhuma foto do hodômetro nesta viagem.'
                                    }
                                />
                            </div>
                        )}

                        {trip.status === 'PLANNED' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {needsDriverResponse(trip) && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => handleDecision(trip.id, 'ACCEPTED')}
                                            disabled={respondingId === trip.id}
                                            style={{ ...btnStyle, background: '#10B981', color: '#fff', width: '100%' }}
                                        >
                                            {respondingId === trip.id ? '...' : '✅ Aceitar'}
                                        </button>
                                        <button
                                            onClick={() => setRejectModal({ tripId: trip.id, reason: '' })}
                                            disabled={respondingId === trip.id}
                                            style={{ ...btnStyle, background: '#EF4444', color: '#fff', width: '100%' }}
                                        >
                                            {respondingId === trip.id ? '...' : '❌ Recusar'}
                                        </button>
                                    </div>
                                )}
                                {isDriverAccepted(trip) && (
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', padding: '0.45rem 0.65rem', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                                        ✅ Viagem aceita — aguarde o dia da partida para iniciar
                                    </div>
                                )}
                                {isDriverRejected(trip) && (
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#B91C1C', padding: '0.45rem 0.65rem', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                                        Viagem recusada — aguarde reatribuição do administrador
                                    </div>
                                )}
                                {isDriverAccepted(trip) && (
                                    <button
                                        onClick={() => { setShowModal({ trip, type: 'start' }); setKmInput(''); setPhotoFile(null); }}
                                        disabled={!isDepartureDay(trip.departureDate)}
                                        style={{ ...btnStyle, background: !isDepartureDay(trip.departureDate) ? '#94A3B8' : '#0891B2', color: '#fff', width: '100%', opacity: !isDepartureDay(trip.departureDate) ? 0.75 : 1, cursor: !isDepartureDay(trip.departureDate) ? 'not-allowed' : 'pointer' }}
                                    >
                                        {isDepartureDay(trip.departureDate) ? '🚛 Iniciar Viagem' : '🚫 Disponível somente no dia da partida'}
                                    </button>
                                )}
                            </div>
                        )}
                        {trip.status === 'IN_TRANSIT' && (
                            <button onClick={() => { setShowModal({ trip, type: 'end' }); setKmInput(''); }}
                                style={{ ...btnStyle, background: '#10B981', color: '#fff', width: '100%' }}>
                                ✅ Finalizar Viagem
                            </button>
                        )}
                        {trip.status === 'COMPLETED' && kmPercorrida && (
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#059669', fontFamily: 'monospace' }}>
                                🏁 {kmPercorrida.toLocaleString('pt-BR')} km percorridos
                            </div>
                        )}
                    </div>
                );
            })}
            </div>
            )}

            </div>

            {/* Modal km */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                    onClick={e => { if (e.target === e.currentTarget) setShowModal(null); }}>
                    <div style={{ background: '#1E293B', borderRadius: 20, padding: '1.75rem', width: '100%', maxWidth: 380, border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontWeight: 800, color: '#F1F5F9', marginBottom: '0.4rem' }}>
                            {showModal.type === 'start' ? '🚛 Iniciar Viagem' : '✅ Finalizar Viagem'}
                        </div>
                        <div style={{ color: '#64748B', fontSize: '0.8rem', marginBottom: '1rem' }}>
                            {routeFromTrip(showModal.trip).origin} → {routeFromTrip(showModal.trip).destination}
                        </div>
                        {showModal.type === 'end' && (
                            <>
                                <label style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                                    Hodômetro final (km) — opcional
                                </label>
                                <input type="number" placeholder="Ex: 145020" value={kmInput} onChange={e => setKmInput(e.target.value)}
                                    style={{ width: '100%', padding: '0.85rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: '#0F172A', color: '#F1F5F9', fontSize: '1.1rem', fontFamily: 'monospace', boxSizing: 'border-box', marginBottom: '1rem' }} />
                                <label style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                                    Foto do hodômetro final (obrigatório)
                                </label>
                                <input
                                    type="file" accept="image/*" capture="environment"
                                    id="end-photo-upload"
                                    onChange={e => e.target.files && setPhotoFile(e.target.files[0])}
                                    style={{ display: 'none' }}
                                />
                                <label htmlFor="end-photo-upload" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.85rem', borderRadius: 10, border: '1.5px dashed rgba(255,255,255,0.2)', background: '#0F172A', marginBottom: '0.75rem' }}>
                                    <span style={{ fontSize: '1.5rem' }}>📸</span>
                                    <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600 }}>{photoFile ? photoFile.name : 'Tirar Foto do Hodômetro'}</span>
                                </label>
                                {photoPreviewUrl && <img src={photoPreviewUrl} alt="Preview hodômetro final" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 8, marginBottom: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' }} />}
                            </>
                        )}
                        {showModal.type === 'start' && (
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                                    Foto do hodômetro inicial (obrigatório)
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={e => e.target.files && setPhotoFile(e.target.files[0])}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: '#0F172A', color: '#F1F5F9', fontSize: '0.82rem' }}
                                />
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => setShowModal(null)} style={{ flex: 1, padding: '0.75rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#64748B', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                        <button onClick={handleAction}
                            disabled={saving || (showModal.type === 'start' ? !photoFile : !photoFile)}
                            style={{ flex: 2, padding: '0.75rem', borderRadius: 10, border: 'none', background: showModal.type === 'start' ? '#0891B2' : '#10B981', color: '#fff', cursor: 'pointer', fontWeight: 700, opacity: saving || (showModal.type === 'start' ? !photoFile : !photoFile) ? 0.6 : 1 }}>
                                {saving ? 'Salvando...' : showModal.type === 'start' ? 'Iniciar' : 'Finalizar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {rejectModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', zIndex: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                    onClick={e => { if (e.target === e.currentTarget) setRejectModal(null); }}>
                    <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '1.2rem', width: '100%', maxWidth: 420, border: '1px solid #E5E7EB', boxShadow: '0 18px 44px rgba(0,0,0,.25)' }}>
                        <div style={{ fontWeight: 900, fontFamily: 'Orbitron', fontSize: '.85rem', letterSpacing: '.08em', color: '#B91C1C', marginBottom: '.35rem' }}>JUSTIFICAR RECUSA</div>
                        <p style={{ fontSize: '.8rem', color: '#6B7280', marginBottom: '.75rem' }}>Informe o motivo da recusa. Esta ação também será registrada em imprevistos para o admin.</p>
                        <textarea
                            rows={4}
                            value={rejectModal.reason}
                            onChange={(e) => setRejectModal((prev) => prev ? { ...prev, reason: e.target.value } : prev)}
                            placeholder="Ex.: indisponibilidade, problema de saúde, pane no veículo..."
                            style={{ width: '100%', borderRadius: 10, border: '1.5px solid #E5E7EB', padding: '.7rem .8rem', resize: 'vertical', minHeight: 100 }}
                        />
                        <div style={{ display: 'flex', gap: '.6rem', marginTop: '.8rem' }}>
                            <button onClick={() => setRejectModal(null)} style={{ flex: 1, padding: '.7rem', borderRadius: 10, border: '1px solid #E5E7EB', background: '#F8FAFC', color: '#64748B', fontWeight: 700, cursor: 'pointer' }}>
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    if (!rejectModal.reason.trim()) {
                                        toast.error('Informe a justificativa da recusa.');
                                        return;
                                    }
                                    await handleDecision(rejectModal.tripId, 'REJECTED', rejectModal.reason.trim());
                                    setRejectModal(null);
                                }}
                                style={{ flex: 1.7, padding: '.7rem', borderRadius: 10, border: 'none', background: '#EF4444', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
                            >
                                Confirmar Recusa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
