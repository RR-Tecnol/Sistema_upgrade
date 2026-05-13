'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api/client';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';

interface Trip {
    id: string;
    status: string;
    departureDate: string;
    expectedArrivalDate: string;
    originCity: { name: string; state: string };
    destinationCity: { name: string; state: string };
    truck: { identifier: string; licensePlate: string };
    kmStart?: number;
    kmEnd?: number;
    notes?: string;
}

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    PLANNED:    { label: 'Planejada',    color: '#0891B2', bg: 'rgba(8,145,178,0.08)',   icon: '📋' },
    IN_TRANSIT: { label: 'Em Trânsito', color: '#059669', bg: 'rgba(5,150,105,0.08)',   icon: '🚛' },
    COMPLETED:  { label: 'Concluída',   color: '#6B7280', bg: 'rgba(107,114,128,0.08)', icon: '✅' },
    CANCELLED:  { label: 'Cancelada',   color: '#DC2626', bg: 'rgba(220,38,38,0.08)',   icon: '❌' },
};

export default function DriverRota() {
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get('/driver/trips');
                const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
                setTrips(data);
            } catch { setTrips([]); } finally { setLoading(false); }
        };
        load();
    }, []);

    const filtered = trips.filter(t => !filter || t.status === filter);

    const stats = {
        total: trips.length,
        active: trips.filter(t => t.status === 'IN_TRANSIT').length,
        planned: trips.filter(t => t.status === 'PLANNED').length,
        completed: trips.filter(t => t.status === 'COMPLETED').length,
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <AdminHeaderHero
                title="MINHAS ROTAS"
                subtitle={`Histórico de deslocamentos — ${stats.total} viagem${stats.total !== 1 ? 's' : ''}`}
                badge="MOTORISTA"
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '0.6rem' }}>
                <AnimatedKpiCard label="Em Trânsito" value={stats.active} color="#059669" bg="#F0FDF4" border="#BBF7D0" compact />
                <AnimatedKpiCard label="Planejadas" value={stats.planned} color="#0891B2" bg="#F0F9FF" border="#BAE6FD" compact />
                <AnimatedKpiCard label="Concluídas" value={stats.completed} color="#6B7280" bg="#F3F4F6" border="#E5E7EB" compact />
            </div>

            {/* Filtros */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {(['', 'IN_TRANSIT', 'PLANNED', 'COMPLETED', 'CANCELLED'] as const).map((s) => {
                    const cfg = s ? STATUS_CFG[s] : { label: 'Todas', color: '#6B7280', bg: '#F3F4F6', icon: '' };
                    const isActive = filter === s;
                    return (
                        <button key={s} onClick={() => setFilter(s)} style={{
                            padding: '0.4rem 0.9rem', borderRadius: 100, border: `1.5px solid ${isActive ? cfg.color : '#E5E7EB'}`,
                            background: isActive ? cfg.bg : 'transparent', color: isActive ? cfg.color : '#6B7280',
                            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                        }}>
                            {cfg.icon} {cfg.label}
                        </button>
                    );
                })}
            </div>

            {/* Lista */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem', width: 36, height: 36 }} />
                    <div style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>Carregando rotas...</div>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🛣️</div>
                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem', letterSpacing: '0.12em', color: '#9CA3AF' }}>NENHUMA ROTA ENCONTRADA</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filtered.map((t, i) => {
                        const cfg = STATUS_CFG[t.status] || STATUS_CFG.PLANNED;
                        const km = t.kmStart != null && t.kmEnd != null ? t.kmEnd - t.kmStart : null;
                        return (
                            <div key={t.id} className="animate-scale-in" style={{ animationDelay: `${i * 40}ms`, background: '#fff', borderRadius: 14, border: `1.5px solid ${t.status === 'IN_TRANSIT' ? 'rgba(5,150,105,0.3)' : '#E5E7EB'}`, padding: '1.1rem 1.25rem', boxShadow: t.status === 'IN_TRANSIT' ? '0 4px 16px rgba(5,150,105,0.08)' : '0 1px 4px rgba(0,0,0,0.04)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1rem', color: '#111827' }}>
                                        {t.originCity.name}
                                        <span style={{ color: '#FFD600', fontSize: '1.1rem' }}>→</span>
                                        {t.destinationCity.name}
                                    </div>
                                    <span style={{ padding: '0.2rem 0.65rem', borderRadius: 100, background: cfg.bg, color: cfg.color, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.06em' }}>
                                        {cfg.icon} {cfg.label.toUpperCase()}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.72rem', color: '#9CA3AF' }}>
                                    <span>📅 Partida: <strong style={{ color: '#374151' }}>{fmtDate(t.departureDate)}</strong></span>
                                    <span>🏁 Chegada: <strong style={{ color: '#374151' }}>{fmtDate(t.expectedArrivalDate)}</strong></span>
                                    <span>🚛 <strong style={{ color: '#374151' }}>{t.truck.licensePlate}</strong></span>
                                    {km != null && km > 0 && <span>📏 <strong style={{ color: '#374151' }}>{km.toLocaleString('pt-BR')} km</strong></span>}
                                </div>
                                {t.notes && (
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#9CA3AF', fontStyle: 'italic', borderTop: '1px solid #F3F4F6', paddingTop: '0.5rem' }}>
                                        📝 {t.notes}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
