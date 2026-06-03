'use client';
/**
 * DriverDrawer — F4.4 + F5.13
 * Drawer lateral com detalhes completos do motorista selecionado.
 * F5.13: React.createPortal → document.body
 *   - Corrige BUG-DRAWER-TRANSFORM: `animate-fade-in` do pai criava containing block
 *     para position:fixed via CSS Transforms Level 1 (fill-mode:both persiste transform).
 *   - Mounted check: evita hydration mismatch no Next.js App Router.
 *   - Scroll lock: gerenciado via useEffect cleanup (não no onClose do pai).
 *   - zIndex: 9999 (drawer) / 9998 (overlay) — sobrepõe toasts e sidebars.
 *   - stopPropagation: clique dentro do drawer não fecha via overlay.
 */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { DriverMarker } from './MapaMotoristas';

interface DriverDrawerProps {
    driver: DriverMarker | null;
    onClose: () => void;
}

function formatETA(min: number) {
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60); const m = min % 60;
    return m ? `${h}h${m}min` : `${h}h`;
}

const STATUS_COLOR: Record<string, string> = {
    online:  '#22C55E',
    stopped: '#F59E0B',
    offline: '#EF4444',
};
const STATUS_LABEL: Record<string, string> = {
    online:  'ONLINE',
    stopped: 'PARADO',
    offline: 'SEM SINAL',
};

export default function DriverDrawer({ driver, onClose }: DriverDrawerProps) {
    const [mounted, setMounted] = useState(false);

    // F5.13: mounted check — createPortal com document.body falha no servidor (SSR)
    useEffect(() => {
        setMounted(true);
    }, []);

    // F5.13: scroll lock via useEffect cleanup (não no onClose do pai — princípio declarativo React)
    useEffect(() => {
        if (!driver || !mounted) return;
        const contentEl = document.querySelector('.admin-content') as HTMLElement | null;
        if (contentEl) contentEl.style.overflowY = 'hidden';
        return () => {
            if (contentEl) contentEl.style.overflowY = 'auto';
        };
    }, [driver, mounted]);

    // Guarda SSR: sem mounted ou sem driver → não renderiza nada
    if (!mounted || !driver) return null;

    const isCompleted = driver.isCompleted === true
                     || driver.trip.id.includes('_COMPLETED')
                     || driver.trip.id.includes('VIRTUAL_');
    const stColor = isCompleted ? '#94A3B8' : (STATUS_COLOR[driver.status] || '#EF4444');
    const stLabel = isCompleted ? 'Viagem Concluída' : (STATUS_LABEL[driver.status] || 'Sem Sinal');

    const drawerContent = (
        <>
            {/* Overlay semitransparente */}
            <div
                style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 9998,  // F5.13: valor alto — sobrepõe sidebars
                }}
                onClick={onClose}
            />
            {/* Drawer */}
            <div
                style={{
                    position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 9999,
                    width: 'min(380px, 100vw)',
                    background: '#0F172A', borderLeft: '1px solid rgba(255,255,255,0.08)',
                    overflowY: 'auto', padding: '1.5rem',
                    animation: 'slideInRight .25s cubic-bezier(.22,1,.36,1)',
                }}
                // F5.13: impede propagação para o overlay (event bubbling via árvore React)
                onClick={e => e.stopPropagation()}
            >
                <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%',
                            background: stColor, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem',
                            color: '#fff', flexShrink: 0 }}>
                            {driver.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#F1F5F9' }}>{driver.name}</div>
                            <span style={{ fontSize: '.65rem', fontWeight: 700, padding: '2px 8px',
                                borderRadius: 20,
                                background: isCompleted ? 'rgba(148,163,184,.12)' :
                                    driver.status === 'online'  ? 'rgba(34,197,94,.12)' :
                                    driver.status === 'stopped' ? 'rgba(245,158,11,.12)' : 'rgba(239,68,68,.12)',
                                color: stColor }}>
                                {stLabel}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none',
                        color: '#64748B', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}>✕</button>
                </div>

                {/* Rota e Carreta */}
                <div style={{ background: '#1E293B', borderRadius: 10, padding: '1rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {/* Carreta vinculada */}
                    <div style={{ marginBottom: '.75rem', paddingBottom: '.75rem', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '.62rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.4rem' }}>Veículo Vinculado</div>
                        {driver.trip.truck ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                                <div style={{ padding: '3px 6px', borderRadius: 6, background: 'rgba(255,214,0,.15)', border: '1px solid rgba(255,214,0,.3)', color: '#FFD600', fontSize: '.7rem', fontWeight: 800 }}>🚛 {driver.trip.truck.identifier}</div>
                                <div style={{ fontSize: '.75rem', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>{driver.trip.truck.licensePlate}</div>
                            </div>
                        ) : (
                            <div style={{ fontSize: '.75rem', color: '#EF4444', fontWeight: 600 }}>Nenhum veículo vinculado</div>
                        )}
                    </div>

                    <div style={{ fontSize: '.62rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.5rem' }}>Rota Atual</div>
                    <div style={{ fontSize: '.95rem', fontWeight: 800, color: '#F1F5F9', display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap' }}>
                        <span style={{ color: '#94A3B8', fontSize: '.82rem' }}>{driver.trip.origin}</span>
                        <span style={{ color: '#FFD600' }}>→</span>
                        <span>{driver.trip.destination}</span>
                    </div>
                    {/* Barra progresso */}
                    <div style={{ height: 6, borderRadius: 3, background: '#334155', overflow: 'hidden', margin: '.75rem 0 .35rem' }}>
                        <div style={{ height: '100%', width: `${driver.progress}%`, background: isCompleted ? 'linear-gradient(90deg,#94A3B8,#CBD5E1)' : 'linear-gradient(90deg,#22C55E,#86EFAC)', borderRadius: 3, transition: 'width 1s' }} />
                    </div>
                    <div style={{ fontSize: '.7rem', color: '#64748B' }}>
                        {isCompleted
                            ? '100% — Viagem concluída'
                            : `${driver.progress}% do trajeto · ${Math.round(driver.kmRemaining ?? driver.eta?.distanciaKm ?? 0)} km restantes${
                                driver.totalKmPlanned
                                    ? ` (de ${Math.round(driver.totalKmPlanned)} km${driver.distanceSource === 'acao' ? ' do período' : ''})`
                                    : ''
                              }`}
                    </div>
                </div>

                {/* ETA — não exibe para COMPLETED */}
                {driver.eta && !isCompleted && (
                    <div style={{ background: '#1E293B', borderRadius: 10, padding: '1rem', marginBottom: '1rem',
                        border: '1px solid rgba(8,145,178,.2)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                        <div>
                            <div style={{ fontSize: '.6rem', color: '#64748B', fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.25rem' }}>ETA</div>
                            <div style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 900,
                                fontSize: '1.2rem', color: '#0891B2' }}>{formatETA(driver.eta.minutos)}</div>
                            <div style={{ fontSize: '.65rem', color: '#475569', marginTop: '.15rem' }}>
                                via {driver.eta.fonte === 'google' ? '🗺️ Maps' : '📐 estimativa'}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '.6rem', color: '#64748B', fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.25rem' }}>Restante</div>
                            <div style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 900,
                                fontSize: '1.2rem', color: '#22C55E' }}>{Math.round(driver.kmRemaining ?? driver.eta.distanciaKm)}km</div>
                        </div>
                    </div>
                )}

                {/* Posição atual */}
                {driver.lastLocation && (
                    <div style={{ background: '#1E293B', borderRadius: 10, padding: '1rem', marginBottom: '1rem',
                        border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: '.62rem', color: '#64748B', fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.75rem' }}>Posição Atual</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
                            {[
                                { label: 'Velocidade', value: driver.lastLocation.speed ? `${Math.round(driver.lastLocation.speed as number)} km/h` : '—' },
                                { label: 'Direção', value: driver.lastLocation.heading != null ? `${Math.round(driver.lastLocation.heading as number)}°` : '—' },
                                { label: 'Lat', value: driver.lastLocation.lat.toFixed(4) },
                                { label: 'Lng', value: driver.lastLocation.lng.toFixed(4) },
                            ].map(item => (
                                <div key={item.label}>
                                    <div style={{ fontSize: '.6rem', color: '#475569', marginBottom: '.1rem' }}>{item.label}</div>
                                    <div style={{ fontSize: '.82rem', fontFamily: 'JetBrains Mono,monospace',
                                        color: '#94A3B8', fontWeight: 600 }}>{item.value}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '.75rem', fontSize: '.65rem', color: '#475569' }}>
                            Última posição: {new Date(driver.lastLocation.capturedAt).toLocaleTimeString('pt-BR')}
                        </div>
                    </div>
                )}

                {/* Sem posição */}
                {!driver.lastLocation && (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: '#475569', fontSize: '.82rem' }}>
                        📡 Aguardando primeira localização...
                    </div>
                )}
            </div>
        </>
    );

    // F5.13: Portal — renderiza em document.body, fora de qualquer ancestral com transform
    return createPortal(drawerContent, document.body);
}
