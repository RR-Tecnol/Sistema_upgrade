'use client';

import { useEffect, useState, type ReactNode } from 'react';

export type AdminTutorialStep = {
    num: string;
    title: string;
    body: ReactNode;
    color?: string;
};

type Props = {
    storageKey: string;
    title: string;
    steps: AdminTutorialStep[];
    emoji?: string;
    /** Texto quando recolhido; por omissão usa N passos */
    subtitleCollapsed?: string;
};

export default function AdminCollapsibleTutorial({
    storageKey,
    title,
    steps,
    emoji = '📚',
    subtitleCollapsed,
}: Props) {
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved === '1') setExpanded(true);
        } catch {
            /* ignora */
        }
    }, [storageKey]);

    const toggle = () => {
        const next = !expanded;
        setExpanded(next);
        try {
            localStorage.setItem(storageKey, next ? '1' : '0');
        } catch {
            /* ignora */
        }
    };

    const sub =
        subtitleCollapsed ??
        (expanded ? 'Clique para recolher' : `Clique para ver o tutorial passo-a-passo (${steps.length} passos)`);

    return (
        <div
            style={{
                borderRadius: 16,
                background:
                    'linear-gradient(135deg, rgba(255,214,0,0.10) 0%, rgba(255,255,255,0.95) 50%, rgba(239,246,255,0.95) 100%)',
                border: '1px solid rgba(255,214,0,0.45)',
                boxShadow: '0 4px 24px rgba(15,23,42,0.06)',
                overflow: 'hidden',
            }}
        >
            <button
                type="button"
                onClick={toggle}
                style={{
                    width: '100%',
                    padding: '1rem 1.15rem',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #FFD600 0%, #F59E0B 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.1rem',
                            boxShadow: '0 2px 8px rgba(255,214,0,0.35)',
                            flexShrink: 0,
                        }}
                    >
                        {emoji}
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div
                            style={{
                                fontFamily: 'Orbitron',
                                fontSize: '0.82rem',
                                letterSpacing: '0.08em',
                                fontWeight: 800,
                                color: '#0F172A',
                            }}
                        >
                            {title}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2 }}>{sub}</div>
                    </div>
                </div>
                <div
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.1rem',
                        color: '#475569',
                        border: '1px solid #E5E7EB',
                        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        flexShrink: 0,
                    }}
                >
                    ▼
                </div>
            </button>

            {expanded && (
                <div style={{ padding: '0 1.15rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {steps.map((step) => (
                        <div
                            key={step.num}
                            style={{
                                display: 'flex',
                                gap: '0.85rem',
                                padding: '0.85rem 1rem',
                                background: '#fff',
                                borderRadius: 12,
                                border: '1px solid #E5E7EB',
                            }}
                        >
                            <div
                                style={{
                                    flexShrink: 0,
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    background: step.color ?? '#3B82F6',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: '0.85rem',
                                    fontFamily: 'Orbitron',
                                    boxShadow: `0 2px 6px ${(step.color ?? '#3B82F6')}55`,
                                }}
                            >
                                {step.num}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: 4, fontSize: '0.85rem' }}>
                                    {step.title}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#374151', lineHeight: 1.6 }}>{step.body}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
