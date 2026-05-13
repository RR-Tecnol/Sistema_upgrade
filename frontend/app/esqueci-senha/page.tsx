'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api/client';

export default function EsqueciSenhaPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    // Em dev: o backend retorna o token no response para facilitar testes
    const [devToken, setDevToken] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.includes('@')) { setError('E-mail inválido'); return; }
        setLoading(true);
        setError('');
        try {
            const { data } = await api.post('/auth/forgot-password', { email });
            setSent(true);
            // Em dev: backend retorna resetToken no response
            if (data.resetToken) setDevToken(data.resetToken);
        } catch {
            setError('Erro ao processar a solicitação. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const INPUT: React.CSSProperties = {
        width: '100%', padding: '0.75rem 1rem', borderRadius: 12,
        border: '1.5px solid #E5E7EB', background: '#F9FAFB',
        fontSize: '0.95rem', color: '#111827', outline: 'none',
        transition: 'border-color 0.2s',
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FFFDE7 0%, #F4F6FA 60%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div style={{ width: '100%', maxWidth: 440 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #FFD600, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 4px 20px rgba(255,214,0,0.4)' }}>
                        <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: '#000' }}>U</span>
                    </div>
                    <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.1rem', fontWeight: 900, color: '#111827', margin: 0, letterSpacing: '0.06em' }}>REDEFINIR SENHA</h1>
                    <p style={{ color: '#9CA3AF', fontSize: '0.82rem', marginTop: '0.5rem' }}>Portal do Aluno — Upgrade</p>
                </div>

                {sent ? (
                    <div style={{ background: '#fff', borderRadius: 20, padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F0FDF4', border: '2px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: '1.75rem' }}>
                            📧
                        </div>
                        <h2 style={{ fontWeight: 800, color: '#111827', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Instruções enviadas!</h2>
                        <p style={{ color: '#6B7280', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                            Se o e-mail <strong>{email}</strong> estiver cadastrado no sistema, você receberá as instruções para redefinir sua senha.
                        </p>

                        {/* Em desenvolvimento: mostra o link direto */}
                        {devToken && (
                            <div style={{ padding: '1rem', borderRadius: 12, background: '#FFFDE7', border: '1px solid #FDE68A', marginBottom: '1.5rem', textAlign: 'left' }}>
                                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#B89B00', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>⚠️ Modo desenvolvimento</div>
                                <div style={{ fontSize: '0.75rem', color: '#374151', marginBottom: 8 }}>Em produção este token seria enviado por e-mail. Use o link abaixo para testar:</div>
                                <Link
                                    href={`/redefinir-senha?token=${devToken}`}
                                    style={{ fontSize: '0.8rem', color: '#0ea5e9', fontWeight: 600, textDecoration: 'underline', wordBreak: 'break-all' }}
                                >
                                    /redefinir-senha?token={devToken.slice(0, 30)}...
                                </Link>
                            </div>
                        )}

                        <Link href="/login" style={{ display: 'inline-block', padding: '0.75rem 2rem', borderRadius: 12, background: 'linear-gradient(135deg, #FFD600, #F59E0B)', color: '#000', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}>
                            Voltar ao login
                        </Link>
                    </div>
                ) : (
                    <div style={{ background: '#fff', borderRadius: 20, padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB' }}>
                        <h2 style={{ fontWeight: 800, color: '#111827', marginBottom: '0.4rem', fontSize: '1.1rem' }}>Esqueceu sua senha?</h2>
                        <p style={{ color: '#6B7280', fontSize: '0.83rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
                            Digite seu e-mail cadastrado e enviaremos as instruções para criar uma nova senha.
                        </p>

                        {error && (
                            <div style={{ padding: '0.75rem 1rem', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.82rem', fontWeight: 600, marginBottom: '1rem' }}>
                                ⚠️ {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.45rem' }}>E-mail *</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    style={INPUT}
                                    onFocus={e => (e.target.style.borderColor = '#FFD600')}
                                    onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                                    required
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    padding: '0.85rem', borderRadius: 12, border: 'none',
                                    background: loading ? '#E5E7EB' : 'linear-gradient(135deg, #FFD600, #F59E0B)',
                                    color: loading ? '#9CA3AF' : '#000',
                                    fontWeight: 800, fontSize: '0.9rem',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    boxShadow: loading ? 'none' : '0 4px 16px rgba(255,214,0,0.4)',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {loading ? 'Enviando...' : '📧 Enviar instruções'}
                            </button>
                        </form>

                        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.82rem', color: '#9CA3AF' }}>
                            Lembrou a senha?{' '}
                            <Link href="/login" style={{ color: '#B89B00', fontWeight: 700, textDecoration: 'none' }}>Fazer login</Link>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
