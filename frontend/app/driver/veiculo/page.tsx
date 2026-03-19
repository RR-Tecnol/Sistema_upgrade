'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api/client';

export default function DriverVeiculo() {
    const [truck, setTruck] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                // Busca as viagens do motorista para descobrir qual é o caminhão vinculado
                const res = await api.get('/driver/trips');
                const trips = Array.isArray(res.data) ? res.data : [];
                if (trips.length > 0 && trips[0].truck) {
                    // Busca detalhes completos do caminhão
                    const truckRes = await api.get(`/trucks/${trips[0].truck.id || trips[0].truckId}`);
                    setTruck(truckRes.data);
                }
            } catch { } finally { setLoading(false); }
        };
        load();
    }, []);

    const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
    const cardStyle: React.CSSProperties = { background: '#1E293B', borderRadius: 14, padding: '1.1rem', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '0.75rem' };
    const rowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' };
    const labelStyle: React.CSSProperties = { fontSize: '0.75rem', color: '#64748B', fontWeight: 600 };
    const valueStyle: React.CSSProperties = { fontSize: '0.85rem', color: '#F1F5F9', fontWeight: 600, fontFamily: 'monospace' };

    const PRIORITY_COLORS: Record<string, string> = {
        critica: '#EF4444', alta: '#F97316', media: '#FBBF24', baixa: '#10B981'
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 36, height: 36, border: '3px solid #0891B2', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite', margin: '0 auto 1rem' }} />
                <p style={{ color: '#64748B', fontSize: '0.8rem' }}>Carregando dados do veículo...</p>
            </div>
        </div>
    );

    if (!truck) return (
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <h1 className="gradient-text" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.8rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '1.25rem' }}>VEÍCULO</h1>
            <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem 1rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🚛</div>
                <div style={{ color: '#64748B', fontSize: '0.85rem' }}>Nenhum veículo vinculado a suas viagens ainda</div>
            </div>
        </div>
    );

    const STATUS_TRUCK: Record<string, { label: string; color: string }> = {
        AVAILABLE:   { label: 'Disponível',   color: '#10B981' },
        IN_USE:      { label: 'Em Uso',       color: '#0891B2' },
        MAINTENANCE: { label: 'Manutenção',   color: '#F97316' },
        INACTIVE:    { label: 'Inativo',      color: '#64748B' },
    };
    const st = STATUS_TRUCK[truck.status] || STATUS_TRUCK.AVAILABLE;

    return (
        <div className="animate-fade-in" style={{ maxWidth: 560, margin: '0 auto' }}>
            <h1 className="gradient-text" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.8rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '1.25rem' }}>VEÍCULO</h1>

            {/* Identificação */}
            <div style={{ ...cardStyle, borderColor: 'rgba(8,145,178,0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                        <div style={{ fontSize: '1.4rem', fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: '#0891B2', letterSpacing: '0.1em' }}>{truck.licensePlate}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 2 }}>ID: {truck.identifier}</div>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: st.color, background: `${st.color}18`, padding: '0.3rem 0.8rem', borderRadius: 100, letterSpacing: '0.06em' }}>
                        {st.label.toUpperCase()}
                    </span>
                </div>

                <div style={rowStyle}><span style={labelStyle}>Tipo</span><span style={valueStyle}>{truck.type}</span></div>
                <div style={rowStyle}><span style={labelStyle}>Ano do Modelo</span><span style={valueStyle}>{truck.modelYear || '—'}</span></div>
                <div style={rowStyle}><span style={labelStyle}>Capacidade</span><span style={valueStyle}>{truck.capacity} alunos</span></div>
                <div style={rowStyle}><span style={labelStyle}>Estado</span><span style={valueStyle}>{truck.state}</span></div>
                <div style={{ ...rowStyle, borderBottom: 'none' }}><span style={labelStyle}>Salas</span><span style={valueStyle}>{truck.roomsCount} sala(s)</span></div>
            </div>

            {/* Manutenções */}
            <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Manutenções Recentes</div>
                <div style={rowStyle}>
                    <span style={labelStyle}>Última manutenção</span>
                    <span style={valueStyle}>{fmtDate(truck.lastMaintenanceDate)}</span>
                </div>
                <div style={{ ...rowStyle, borderBottom: 'none' }}>
                    <span style={labelStyle}>Próxima manutenção</span>
                    <span style={{ ...valueStyle, color: truck.nextMaintenanceDate ? '#FBBF24' : '#64748B' }}>
                        {fmtDate(truck.nextMaintenanceDate)}
                    </span>
                </div>
            </div>

            {/* Manutenções agendadas */}
            {truck.maintenances && truck.maintenances.length > 0 && (
                <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem', marginTop: '1rem' }}>
                        Agendamentos ({truck.maintenances.slice(0,3).length})
                    </div>
                    {truck.maintenances.slice(0, 3).map((m: any) => (
                        <div key={m.id} style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                                <span style={{ fontWeight: 700, color: '#F1F5F9', fontSize: '0.85rem' }}>{m.titulo}</span>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: PRIORITY_COLORS[m.prioridade] || '#64748B', letterSpacing: '0.06em' }}>
                                    {m.prioridade?.toUpperCase()}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                {m.tipo} · {m.status} · {fmtDate(m.dataAgendada)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {truck.notes && (
                <div style={{ ...cardStyle, marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Observações</div>
                    <div style={{ fontSize: '0.82rem', color: '#94A3B8', lineHeight: 1.6 }}>{truck.notes}</div>
                </div>
            )}
        </div>
    );
}
