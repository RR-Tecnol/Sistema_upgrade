'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[App Error]', error);
    }, [error]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0F172A',
            fontFamily: 'Inter, sans-serif',
            gap: '1.5rem',
            padding: '2rem',
        }}>
            <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.15)',
                border: '2px solid rgba(239,68,68,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
            }}>
                ⚠
            </div>
            <div style={{ textAlign: 'center' }}>
                <h2 style={{
                    color: '#F1F5F9',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    marginBottom: '0.5rem',
                    fontFamily: 'Orbitron, sans-serif',
                    letterSpacing: '0.05em',
                }}>
                    Algo deu errado
                </h2>
                <p style={{ color: '#64748B', fontSize: '0.875rem', maxWidth: 400 }}>
                    Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.
                </p>
            </div>
            <button
                onClick={reset}
                style={{
                    padding: '0.65rem 1.75rem',
                    borderRadius: 10,
                    background: '#FFD600',
                    border: 'none',
                    color: '#000',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                }}
            >
                Tentar novamente
            </button>
        </div>
    );
}
