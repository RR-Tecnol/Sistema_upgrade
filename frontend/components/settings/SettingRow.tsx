'use client';

import type { ReactNode } from 'react';

export function SettingRow({
    label,
    desc,
    children,
    stack,
}: {
    label: string;
    desc?: string;
    children: ReactNode;
    stack?: boolean;
}) {
    if (stack) {
        return (
            <div style={{ padding: '0.9rem 0', borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>{label}</div>
                {desc && (
                    <div
                        style={{
                            fontSize: '0.72rem',
                            color: '#9CA3AF',
                            marginTop: '0.15rem',
                            marginBottom: '0.75rem',
                            lineHeight: 1.45,
                        }}
                    >
                        {desc}
                    </div>
                )}
                <div
                    style={{
                        width: '100%',
                        minWidth: 0,
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        gap: '0.75rem',
                    }}
                >
                    {children}
                </div>
            </div>
        );
    }
    return (
        <div
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '1rem 1.5rem',
                padding: '0.9rem 0',
                borderBottom: '1px solid #F3F4F6',
            }}
        >
            <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>{label}</div>
                {desc && (
                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '0.15rem', lineHeight: 1.45 }}>
                        {desc}
                    </div>
                )}
            </div>
            <div
                style={{
                    flex: '0 1 auto',
                    minWidth: 0,
                    maxWidth: '100%',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                }}
            >
                {children}
            </div>
        </div>
    );
}
