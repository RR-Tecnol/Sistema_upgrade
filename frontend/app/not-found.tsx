import Link from 'next/link';

export default function NotFound() {
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
                fontFamily: 'Orbitron, sans-serif',
                fontSize: '6rem',
                fontWeight: 900,
                color: '#FFD600',
                lineHeight: 1,
                textShadow: '0 0 40px rgba(255,214,0,0.3)',
            }}>
                404
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
                    Página não encontrada
                </h2>
                <p style={{ color: '#64748B', fontSize: '0.875rem', maxWidth: 400 }}>
                    A página que você está procurando não existe ou foi movida.
                </p>
            </div>
            <Link
                href="/login"
                style={{
                    padding: '0.65rem 1.75rem',
                    borderRadius: 10,
                    background: '#FFD600',
                    color: '#000',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                    fontFamily: 'Inter, sans-serif',
                }}
            >
                Ir para o Login
            </Link>
        </div>
    );
}
