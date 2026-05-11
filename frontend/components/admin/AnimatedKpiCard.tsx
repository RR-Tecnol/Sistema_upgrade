'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';

interface AnimatedKpiCardProps {
    label: string;
    value: number;
    displayValue?: string;
    sub?: string;
    color: string;
    bg: string;
    border: string;
    icon?: ReactNode;
    suffix?: string;
    delayMs?: number;
    compact?: boolean;
    onClick?: () => void;
}

function useCountUp(target: number, duration = 850) {
    const [count, setCount] = useState(0);
    const raf = useRef(0);

    useEffect(() => {
        if (target === 0) {
            setCount(0);
            return;
        }
        const start = Date.now();
        const tick = () => {
            const p = Math.min((Date.now() - start) / duration, 1);
            setCount(Math.round((1 - Math.pow(1 - p, 3)) * target));
            if (p < 1) raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf.current);
    }, [target, duration]);

    return count;
}

export default function AnimatedKpiCard({
    label,
    value,
    displayValue,
    sub,
    color,
    bg,
    border,
    icon,
    suffix = '',
    delayMs = 0,
    compact = false,
    onClick,
}: AnimatedKpiCardProps) {
    const n = useCountUp(value);
    const [hov, setHov] = useState(false);
    const shownValue = displayValue ?? `${n}${suffix}`;
    const isLongValue = shownValue.length >= 10;

    return (
        <div
            className="adm-kpi-card adm-scale-in"
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            onClick={onClick}
            onKeyDown={(e) => {
                if (!onClick) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            style={{
                animationDelay: `${delayMs}ms`,
                background: bg,
                borderTopColor: hov ? `${border}` : `${border}88`,
                borderRightColor: hov ? `${border}` : `${border}88`,
                borderBottomColor: hov ? `${border}` : `${border}88`,
                borderLeftColor: color,
                boxShadow: hov
                    ? `0 0 24px ${color}25, 0 10px 28px rgba(0,0,0,.10)`
                    : `0 2px 10px ${border}25`,
                padding: compact ? '0.85rem 1rem' : '1rem 1.2rem',
                transform: hov ? 'perspective(600px) rotateX(-2deg) translateY(-4px) scale(1.01)' : 'none',
                cursor: onClick ? 'pointer' : 'default',
            }}
        >
            <div className="adm-kpi-grid" />
            <div className="adm-kpi-scan" style={{ background: `linear-gradient(90deg, transparent, ${color}66, transparent)` }} />
            <div className="adm-kpi-topline" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: hov ? 1 : 0.45 }} />
            <div className="adm-kpi-ring" style={{ borderColor: `${color}2A` }} />
            <div className="adm-kpi-ring adm-kpi-ring-sm" style={{ borderColor: `${color}1F` }} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: compact ? '0.6rem' : '0.8rem' }}>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color, opacity: 0.72, marginBottom: '0.25rem' }}>
                        {label}
                    </div>
                    <div
                        style={{
                            fontFamily: 'Orbitron, sans-serif',
                            fontWeight: 900,
                            fontSize: compact ? (isLongValue ? '1.2rem' : '1.35rem') : (isLongValue ? '1.55rem' : '1.7rem'),
                            color,
                            lineHeight: 1.05,
                            wordBreak: 'break-word',
                            animation: 'adm-float 3s ease-in-out infinite',
                            filter: hov ? `drop-shadow(0 0 8px ${color}99)` : 'none',
                            transition: 'filter .28s ease',
                        }}
                    >
                        {shownValue}
                    </div>
                    {sub && <div style={{ marginTop: '0.2rem', fontSize: '0.68rem', color, opacity: 0.58 }}>{sub}</div>}
                </div>
                {icon ? (
                    <div style={{ width: compact ? 30 : 34, height: compact ? 30 : 34, borderRadius: 10, border: `1px solid ${border}66`, background: `${color}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0, boxShadow: hov ? `0 0 14px ${color}40` : `0 0 6px ${color}20`, transition: 'box-shadow .3s ease' }}>
                        {icon}
                    </div>
                ) : (
                    <div style={{ width: 3, height: 46, borderRadius: 2, background: color, opacity: 0.28 }} />
                )}
            </div>
            <div className="adm-kpi-dot" style={{ background: color }} />
        </div>
    );
}
