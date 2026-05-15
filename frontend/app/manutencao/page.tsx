'use client';

import { useRouter } from 'next/navigation';

export default function ManutencaoPage() {
    return (
        <div style={{
            minHeight: '100vh',
            background: '#0F172A',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Inter, sans-serif',
            padding: '2rem',
            textAlign: 'center',
        }}>
            {/* Ícone animado */}
            <div style={{
                width: 96, height: 96, borderRadius: '50%',
                background: 'rgba(255,214,0,0.1)',
                border: '2px solid rgba(255,214,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '2rem',
                animation: 'pulse 2s ease-in-out infinite',
            }}>
                <span style={{ fontSize: '2.5rem' }}>🔧</span>
            </div>

            {/* Logo */}
            <div style={{
                fontFamily: 'Orbitron, sans-serif', fontSize: '1.1rem',
                fontWeight: 900, color: '#FFD600', letterSpacing: '0.12em',
                marginBottom: '0.5rem',
            }}>
                SISTEMA UPGRADE
            </div>

            {/* Título */}
            <h1 style={{
                fontSize: '2rem', fontWeight: 800, color: '#F1F5F9',
                marginBottom: '1rem', lineHeight: 1.2,
            }}>
                Sistema em Manutenção
            </h1>

            {/* Mensagem */}
            <p style={{
                fontSize: '1rem', color: '#94A3B8', maxWidth: 420,
                lineHeight: 1.6, marginBottom: '2rem',
            }}>
                Estamos realizando melhorias para oferecer uma experiência ainda melhor.
                <br />
                <strong style={{ color: '#F1F5F9' }}>Voltamos em breve.</strong>
            </p>

            {/* Barra de progresso animada */}
            <div style={{
                width: 280, height: 4, background: 'rgba(255,255,255,0.08)',
                borderRadius: 2, overflow: 'hidden', marginBottom: '2rem',
            }}>
                <div style={{
                    height: '100%', background: 'linear-gradient(90deg, #FFD600, #F59E0B)',
                    borderRadius: 2,
                    animation: 'progress 2.5s ease-in-out infinite',
                }} />
            </div>

            {/* Link para tentar novamente */}
            <button
                onClick={() => window.location.reload()}
                style={{
                    padding: '0.65rem 1.5rem', borderRadius: 10,
                    background: 'rgba(255,214,0,0.1)',
                    border: '1px solid rgba(255,214,0,0.3)',
                    color: '#FFD600', fontWeight: 600, fontSize: '0.9rem',
                    cursor: 'pointer', transition: 'all 0.2s',
                }}
            >
                Tentar novamente
            </button>

            <style>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.85; }
                }
                @keyframes progress {
                    0% { width: 0%; margin-left: 0; }
                    50% { width: 70%; margin-left: 15%; }
                    100% { width: 0%; margin-left: 100%; }
                }
            `}</style>
        </div>
    );
}
