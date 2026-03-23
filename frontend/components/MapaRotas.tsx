'use client';

import { useState } from 'react';
import {
    ComposableMap,
    Geographies,
    Geography,
    Marker,
    ZoomableGroup,
} from 'react-simple-maps';

// GeoJSON do Brasil via world-atlas
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json';

interface Rota {
    id?: string;
    cidade?: string;
    estado?: string;
    totalInscritos?: number;
    lat?: number;
    lng?: number;
}

// Coordenadas aproximadas de cidades conhecidas no MA e PI
const COORDS_FALLBACK: Record<string, [number, number]> = {
    'São Luís': [-44.302, -2.530],
    'Teresina': [-42.803, -5.091],
    'Imperatriz': [-47.491, -5.526],
    'Caxias': [-43.360, -4.858],
    'Timon': [-42.836, -5.094],
    'Parnaíba': [-41.777, -2.905],
    'Picos': [-41.468, -7.078],
    'Floriano': [-43.021, -6.769],
};

// Obter coordenadas da cidade (fallback por nome)
function getCoordsForCity(cidade?: string): [number, number] | null {
    if (!cidade) return null;
    const match = Object.entries(COORDS_FALLBACK).find(([name]) =>
        cidade.toLowerCase().includes(name.toLowerCase())
    );
    return match ? match[1] : [-44.302, -4.0]; // fallback: centro MA
}

interface MapaRotasProps {
    rotas: Rota[];
}

export default function MapaRotas({ rotas }: MapaRotasProps) {
    const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

    // Estado vazio — sem rotas cadastradas
    if (!rotas || rotas.length === 0) {
        return (
            <div style={{ background: '#0F172A', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', padding: '3rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🗺️</div>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.12em' }}>
                    NENHUMA ROTA CADASTRADA
                </div>
                <div style={{ fontSize: '0.75rem', color: '#334155', marginTop: '0.4rem' }}>
                    Cadastre Períodos de Curso (Ações) para visualizar o mapa.
                </div>
            </div>
        );
    }

    // Agrupar rotas por cidade para calcular tamanho dos marcadores
    const cidadeMap = rotas.reduce<Record<string, { inscritos: number; estado: string }>>((acc, r) => {
        const key = r.cidade || 'Desconhecida';
        if (!acc[key]) acc[key] = { inscritos: 0, estado: r.estado || '' };
        acc[key].inscritos += r.totalInscritos || 0;
        return acc;
    }, {});

    const maxInscritos = Math.max(...Object.values(cidadeMap).map(c => c.inscritos), 1);

    return (
        <div style={{ position: 'relative', background: '#0F172A', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Tooltip */}
            {tooltip && (
                <div style={{
                    position: 'absolute', zIndex: 10,
                    background: '#1E293B', border: '1px solid rgba(255,214,0,0.3)',
                    borderRadius: 8, padding: '6px 12px', fontSize: '0.78rem',
                    color: '#F1F5F9', pointerEvents: 'none',
                    left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)',
                    whiteSpace: 'nowrap',
                }}>
                    {tooltip.text}
                </div>
            )}

            <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                    scale: 650,
                    center: [-44, -5], // Foco em MA/PI
                }}
                style={{ width: '100%', height: 360, display: 'block' }}
            >
                <ZoomableGroup center={[-44, -5]} zoom={1}>
                    <Geographies geography={GEO_URL}>
                        {({ geographies }: { geographies: any[] }) =>
                            geographies
                                .filter((geo: any) => geo.properties.name === 'Brazil')
                                .map((geo: any) => (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        style={{
                                            default: { fill: '#1E293B', stroke: '#334155', strokeWidth: 0.5, outline: 'none' },
                                            hover: { fill: '#1E293B', outline: 'none' },
                                            pressed: { fill: '#1E293B', outline: 'none' },
                                        }}
                                    />
                                ))
                        }
                    </Geographies>

                    {/* Marcadores por cidade */}
                    {Object.entries(cidadeMap).map(([cidade, data]) => {
                        const coords = getCoordsForCity(cidade);
                        if (!coords) return null;
                        const radius = 4 + (data.inscritos / maxInscritos) * 14;
                        const isMA = data.estado === 'MA';
                        const isPI = data.estado === 'PI';
                        const color = isMA ? '#FFD600' : isPI ? '#0EA5E9' : '#7C3AED';

                        return (
                            <Marker
                                key={cidade}
                                coordinates={coords}
                                onMouseEnter={(e: React.MouseEvent<SVGGElement>) => {
                                    const svg = (e.target as SVGElement).closest('svg');
                                    const rect = svg?.getBoundingClientRect();
                                    setTooltip({
                                        text: `${cidade} — ${data.inscritos} inscritos`,
                                        x: e.clientX - (rect?.left || 0),
                                        y: e.clientY - (rect?.top || 0),
                                    });
                                }}
                                onMouseLeave={() => setTooltip(null)}
                            >
                                <circle
                                    r={radius}
                                    fill={color}
                                    fillOpacity={0.85}
                                    stroke="#0F172A"
                                    strokeWidth={1.5}
                                    style={{ cursor: 'pointer', transition: 'r 0.2s' }}
                                />
                            </Marker>
                        );
                    })}
                </ZoomableGroup>
            </ComposableMap>

            {/* Legenda */}
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {[
                    { color: '#FFD600', label: 'Maranhão (MA)' },
                    { color: '#0EA5E9', label: 'Piauí (PI)' },
                    { color: '#7C3AED', label: 'Outros estados' },
                ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
                        <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{item.label}</span>
                    </div>
                ))}
                <span style={{ fontSize: '0.72rem', color: '#475569', marginLeft: 'auto' }}>
                    Tamanho proporcional ao número de inscritos
                </span>
            </div>
        </div>
    );
}
