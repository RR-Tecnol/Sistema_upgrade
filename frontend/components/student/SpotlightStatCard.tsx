'use client';

import { useRef, useState, useCallback } from 'react';

interface SpotlightStatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    sub?: string;
    color?: string;
    onQuickAction?: () => void;
    rankGlow?: boolean;
    rankColor?: string;
    animDelay?: number;
    children?: React.ReactNode;
}

export default function SpotlightStatCard({
    icon, label, value, sub, color = '#FFD600',
    onQuickAction, rankGlow, rankColor, animDelay = 0, children,
}: SpotlightStatCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const rafRef  = useRef<number>(0);
    const [pos, setPos] = useState({ x: 50, y: 50, opacity: 0 });
    const [hovered, setHovered] = useState(false);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
            if (!cardRef.current) return;
            const rect = cardRef.current.getBoundingClientRect();
            setPos({
                x: ((e.clientX - rect.left) / rect.width)  * 100,
                y: ((e.clientY - rect.top)  / rect.height) * 100,
                opacity: 1,
            });
        });
    }, []);

    const handleEnter = useCallback(() => {
        setHovered(true);
        setPos(p => ({ ...p, opacity: 1 }));
    }, []);

    const handleLeave = useCallback(() => {
        setHovered(false);
        cancelAnimationFrame(rafRef.current);
        setPos(p => ({ ...p, opacity: 0 }));
    }, []);

    const glowBorder = rankGlow && rankColor ? `${rankColor}50` : '#E5E7EB';
    const activeColor = rankGlow && rankColor ? rankColor : color;

    return (
        <div
            ref={cardRef}
            className="animate-scale-in"
            onClick={onQuickAction}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            onTouchStart={() => setPos({ x: 50, y: 50, opacity: 0.55 })}
            onTouchEnd={() => setPos(p => ({ ...p, opacity: 0 }))}
            style={{
                position: 'relative', overflow: 'hidden', borderRadius: 16, padding: '1.25rem',
                cursor: onQuickAction ? 'pointer' : 'default',
                animationDelay: `${animDelay}ms`,
                // Gradiente dourado sutil
                background: 'linear-gradient(145deg, #ffffff 0%, #fffcf0 45%, #fff9e0 100%)',
                border: `1.5px solid ${hovered ? 'rgba(255,214,0,0.55)' : 'rgba(255,214,0,0.28)'}`,
                boxShadow: hovered
                    ? '0 6px 20px rgba(255,214,0,0.18), 0 2px 6px rgba(0,0,0,0.06)'
                    : '0 2px 10px rgba(255,214,0,0.10), 0 1px 3px rgba(0,0,0,0.04)',
                transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                transform: hovered ? 'translateY(-2px) scale(1.01)' : 'translateY(0) scale(1)',
            }}
        >
            {/* Spotlight radial cursor-tracking */}
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: `radial-gradient(circle at ${pos.x}% ${pos.y}%, rgba(255,214,0,0.18) 0%, transparent 58%)`,
                    opacity: pos.opacity,
                    transition: 'opacity 0.3s',
                }}
            />

            {/* Conteúdo */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Ícone + seta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 11,
                        background: `${activeColor}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: activeColor,
                        transition: 'box-shadow 0.2s',
                        boxShadow: hovered && rankGlow ? `0 0 14px ${activeColor}50` : 'none',
                    }}>
                        {icon}
                    </div>
                    {onQuickAction && (
                        <span style={{
                            color: hovered ? activeColor : '#D1D5DB',
                            fontSize: '1.1rem', lineHeight: 1,
                            transition: 'color 0.2s, transform 0.2s',
                            transform: hovered ? 'translateX(2px)' : 'none',
                            display: 'inline-block',
                        }}>›</span>
                    )}
                </div>

                {/* Label */}
                <div className="stat-label">{label}</div>

                {/* Valor principal */}
                <div style={{
                    fontFamily: 'Orbitron, sans-serif',
                    fontSize: '2rem', fontWeight: 900,
                    color: activeColor, lineHeight: 1, marginTop: 2,
                }}>
                    {value}
                </div>

                {/* Sub */}
                {sub && (
                    <div style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: 4 }}>{sub}</div>
                )}

                {/* Slot extra (ex: mini barra) */}
                {children}
            </div>
        </div>
    );
}
