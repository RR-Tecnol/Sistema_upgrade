'use client';

import { ReactNode } from 'react';

interface AnimatedEntityCardProps {
    children: ReactNode;
    topGlowColor?: string;
    delayMs?: number;
    style?: React.CSSProperties;
}

export default function AnimatedEntityCard({
    children,
    topGlowColor = '#FFD600',
    delayMs = 0,
    style,
}: AnimatedEntityCardProps) {
    return (
        <div className="adm-entity-card adm-scale-in" style={{ animationDelay: `${delayMs}ms`, ...style }}>
            <div
                className="adm-entity-glow"
                style={{
                    background: `linear-gradient(90deg, transparent, ${topGlowColor}, transparent)`,
                }}
            />
            <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
        </div>
    );
}
