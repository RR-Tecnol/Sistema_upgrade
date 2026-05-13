'use client';

import { useState, ReactNode } from 'react';

interface SoloLevelingKPICardProps {
    label: string;
    value: string | number;
    icon?: string;
    color: string;
    bgGradient?: string;
    borderColor?: string;
    glowColor?: string;
    onClick?: () => void;
    xpBonus?: number;
    isActive?: boolean;
    animDelay?: number;
    children?: ReactNode;
}

/**
 * KPI Card estilo Solo Leveling — cyberpunk, clicável, com glow animado.
 * Usado nas páginas de frequência, dashboard, imprevistos, etc.
 */
export default function SoloLevelingKPICard({
    label,
    value,
    icon,
    color,
    bgGradient,
    borderColor,
    glowColor,
    onClick,
    xpBonus,
    isActive = false,
    animDelay = 0,
    children,
}: SoloLevelingKPICardProps) {
    const [hovered, setHovered] = useState(false);

    const bg = bgGradient || `linear-gradient(145deg, ${color}08, ${color}15)`;
    const border = borderColor || `${color}30`;
    const glow = glowColor || `${color}40`;

    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="animate-scale-in"
            style={{
                animationDelay: `${animDelay}ms`,
                padding: '1rem 1.1rem',
                borderRadius: 14,
                background: bg,
                border: `1.5px solid ${border}`,
                borderLeft: `4px solid ${color}`,
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: hovered && onClick ? 'translateY(-3px) scale(1.02)' : 'none',
                boxShadow: hovered && onClick
                    ? `0 8px 24px ${glow}, 0 0 0 1px ${color}20, inset 0 1px 0 rgba(255,255,255,0.15)`
                    : `0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.1)`,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Glow overlay — pulsa quando ativo */}
            {isActive && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: `radial-gradient(ellipse at 50% 0%, ${color}15, transparent 70%)`,
                        pointerEvents: 'none',
                        animation: 'pulse-glow 2s ease-in-out infinite',
                    }}
                />
            )}

            {/* Cyber corner accent */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 40,
                    height: 40,
                    background: `linear-gradient(135deg, ${color}12 0%, transparent 60%)`,
                    borderRadius: '0 12px 0 40px',
                    pointerEvents: 'none',
                }}
            />

            {/* Header: icon + label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem', position: 'relative', zIndex: 1 }}>
                {icon && <span style={{ fontSize: '0.85rem' }}>{icon}</span>}
                <span style={{
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    color,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                }}>
                    {label}
                </span>
            </div>

            {/* Value */}
            <div style={{
                fontFamily: 'Orbitron, sans-serif',
                fontSize: '1.8rem',
                fontWeight: 900,
                color,
                lineHeight: 1.1,
                position: 'relative',
                zIndex: 1,
                textShadow: isActive ? `0 0 12px ${glow}` : 'none',
            }}>
                {value}
            </div>

            {/* XP bonus badge */}
            {typeof xpBonus === 'number' && xpBonus > 0 && (
                <div style={{
                    marginTop: '0.45rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.2rem 0.55rem',
                    borderRadius: 100,
                    background: `${color}15`,
                    border: `1px solid ${color}30`,
                    position: 'relative',
                    zIndex: 1,
                }}>
                    <span style={{ fontSize: '0.6rem' }}>⚡</span>
                    <span style={{
                        fontFamily: 'Orbitron, sans-serif',
                        fontWeight: 800,
                        fontSize: '0.6rem',
                        color,
                    }}>
                        +{xpBonus} XP
                    </span>
                </div>
            )}

            {/* Custom children */}
            {children && <div style={{ marginTop: '0.4rem', position: 'relative', zIndex: 1 }}>{children}</div>}

            {/* Click hint */}
            {onClick && (
                <div style={{
                    position: 'absolute',
                    bottom: 6,
                    right: 10,
                    fontSize: '0.55rem',
                    color: `${color}80`,
                    fontWeight: 600,
                    opacity: hovered ? 1 : 0.5,
                    transition: 'opacity 0.2s',
                }}>
                    {hovered ? '👆 clique' : '···'}
                </div>
            )}

            {/* Inline styles for pulse animation */}
            <style jsx>{`
                @keyframes pulse-glow {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
