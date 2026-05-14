'use client';

import { ReactNode } from 'react';

interface AdminHeaderHeroProps {
    title: string;
    subtitle?: string;
    rightSlot?: ReactNode;
    badge?: string;
}

export default function AdminHeaderHero({ title, subtitle, rightSlot, badge }: AdminHeaderHeroProps) {
    return (
        <div className="adm-hero adm-fade-up" style={{ padding: '1.25rem 1.35rem' }}>
            <div className="adm-hero-grid" />
            <div className="adm-hero-scan" />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <h1
                        style={{
                            fontFamily: 'Orbitron, sans-serif',
                            fontSize: '2rem',
                            fontWeight: 900,
                            letterSpacing: '0.08em',
                            margin: 0,
                            color: '#FFD600',
                            textShadow: '0 0 16px rgba(255,214,0,0.28)',
                        }}
                    >
                        {title}
                    </h1>
                    {subtitle && (
                        <p style={{ marginTop: '0.35rem', marginBottom: 0, color: 'rgba(255,255,255,0.72)', fontSize: '0.82rem' }}>
                            {subtitle}
                        </p>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    {badge && (
                        <span
                            style={{
                                padding: '0.3rem 0.75rem',
                                borderRadius: 999,
                                border: '1px solid rgba(255,214,0,0.4)',
                                background: 'rgba(255,214,0,0.1)',
                                color: '#FFD600',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                            }}
                        >
                            {badge}
                        </span>
                    )}
                    {rightSlot}
                </div>
            </div>
        </div>
    );
}
