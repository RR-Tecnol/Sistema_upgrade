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
        <div className="adm-hero adm-fade-up" style={{ padding: '1.25rem 1.35rem', overflow: 'visible' }}>
            <style>{`
                .adm-hero-h1 { font-family: Orbitron, sans-serif; font-size: 2rem; font-weight: 900; letter-spacing: 0.08em; margin: 0; color: #FFD600; text-shadow: 0 0 16px rgba(255,214,0,0.28); }
                .adm-hero-inner { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
                @media(max-width: 640px) {
                    .adm-hero-h1 { font-size: 1.15rem; letter-spacing: 0.04em; }
                    .adm-hero-inner { gap: 0.5rem; }
                }
            `}</style>
            {/* Background FX clipping wrapper — only this clips, outer hero is overflow:visible */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', overflow: 'hidden', pointerEvents: 'none' }}>
                <div className="adm-hero-grid" />
                <div className="adm-hero-scan" />
            </div>
            <div className="adm-hero-inner" style={{ position: 'relative', zIndex: 1 }}>
                <div>
                    <h1 className="adm-hero-h1">
                        {title}
                    </h1>
                    {subtitle && (
                        <p style={{ marginTop: '0.35rem', marginBottom: 0, color: 'rgba(255,255,255,0.72)', fontSize: '0.82rem' }}>
                            {subtitle}
                        </p>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
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
                    {rightSlot && (
                        <div style={{ position: 'relative', zIndex: 200 }}>
                            {rightSlot}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
