'use client';

export default function GlobalError({
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body style={{
                margin: 0,
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0F172A',
                fontFamily: 'Inter, sans-serif',
                gap: '1.5rem',
            }}>
                <h2 style={{
                    color: '#F1F5F9',
                    fontFamily: 'sans-serif',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                }}>
                    Erro crítico na aplicação
                </h2>
                <button
                    onClick={reset}
                    style={{
                        padding: '0.65rem 1.75rem',
                        borderRadius: 10,
                        background: '#FFD600',
                        border: 'none',
                        color: '#000',
                        fontWeight: 700,
                        cursor: 'pointer',
                    }}
                >
                    Recarregar
                </button>
            </body>
        </html>
    );
}
