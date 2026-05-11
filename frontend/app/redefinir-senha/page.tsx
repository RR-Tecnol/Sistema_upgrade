'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api/client';
import { CreationSuccessScreen } from '@/components/CreationSuccessScreen';

function RedefinirSenhaForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token') || '';

    const [form, setForm] = useState({ newPassword: '', confirm: '' });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [showPass, setShowPass] = useState(false);

    useEffect(() => {
        if (!token) setError('Link inválido ou expirado. Solicite um novo link de redefinição.');
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.newPassword.length < 6) { setError('A senha deve ter no mínimo 6 caracteres'); return; }
        if (form.newPassword !== form.confirm) { setError('As senhas não coincidem'); return; }

        setLoading(true);
        setError('');
        try {
            await api.post('/auth/reset-password', { token, newPassword: form.newPassword });
            setSuccess(true);
            setTimeout(() => router.push('/login'), 3000);
        } catch (err: any) {
            const msg = err?.response?.data?.message;
            setError(msg || 'Token inválido ou expirado. Solicite um novo link.');
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
                    <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.1rem', fontWeight: 900, color: '#111827', margin: 0, letterSpacing: '0.06em' }}>NOVA SENHA</h1>
                    <p style={{ color: '#9CA3AF', fontSize: '0.82rem', marginTop: '0.5rem' }}>Portal do Aluno — Upgrade</p>
                </div>

                {success ? (
                    <div style={{ background: '#fff', borderRadius: 20, padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB' }}>
                        <CreationSuccessScreen
                            title="SENHA REDEFINIDA!"
                            secondaryLine="Sua senha foi alterada com sucesso."
                            redirectMessage="Redirecionando para o login em instantes..."
                            alinhamento="center"
                            minHeight="auto"
                            linksRodape={(
                                <Link href="/login" style={{ display: 'inline-block', padding: '0.75rem 2rem', borderRadius: 12, background: 'linear-gradient(135deg, #FFD600, #F59E0B)', color: '#000', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}>
                                    Ir para o login
                                </Link>
                            )}
                        />
                    </div>
                ) : (
                    <div style={{ background: '#fff', borderRadius: 20, padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB' }}>
                        <h2 style={{ fontWeight: 800, color: '#111827', marginBottom: '0.4rem', fontSize: '1.1rem' }}>Crie sua nova senha</h2>
                        <p style={{ color: '#6B7280', fontSize: '0.83rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
                            Escolha uma senha segura com pelo menos 6 caracteres.
                        </p>

                        {error && (
                            <div style={{ padding: '0.75rem 1rem', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.82rem', fontWeight: 600, marginBottom: '1rem' }}>
                                ⚠️ {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.45rem' }}>Nova Senha *</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        value={form.newPassword}
                                        onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                                        placeholder="Mínimo 6 caracteres"
                                        style={{ ...INPUT, paddingRight: '3rem' }}
                                        onFocus={e => (e.target.style.borderColor = '#FFD600')}
                                        onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                                        required
                                        autoFocus
                                    />
                                    <button type="button" onClick={() => setShowPass(v => !v)}
                                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#9CA3AF' }}>
                                        {showPass ? '🙈' : '👁'}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.45rem' }}>Confirmar Nova Senha *</label>
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    value={form.confirm}
                                    onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                                    placeholder="Repita a nova senha"
                                    style={{
                                        ...INPUT,
                                        borderColor: form.confirm && form.confirm !== form.newPassword ? '#EF4444' : '#E5E7EB',
                                    }}
                                    onFocus={e => (e.target.style.borderColor = '#FFD600')}
                                    onBlur={e => (e.target.style.borderColor = form.confirm && form.confirm !== form.newPassword ? '#EF4444' : '#E5E7EB')}
                                    required
                                />
                                {form.confirm && form.confirm !== form.newPassword && (
                                    <p style={{ fontSize: '0.72rem', color: '#EF4444', marginTop: '0.3rem' }}>As senhas não coincidem</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !token}
                                style={{
                                    padding: '0.85rem', borderRadius: 12, border: 'none',
                                    background: (loading || !token) ? '#E5E7EB' : 'linear-gradient(135deg, #FFD600, #F59E0B)',
                                    color: (loading || !token) ? '#9CA3AF' : '#000',
                                    fontWeight: 800, fontSize: '0.9rem',
                                    cursor: (loading || !token) ? 'not-allowed' : 'pointer',
                                    boxShadow: (loading || !token) ? 'none' : '0 4px 16px rgba(255,214,0,0.4)',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {loading ? 'Salvando...' : '🔑 Salvar nova senha'}
                            </button>
                        </form>

                        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.82rem', color: '#9CA3AF' }}>
                            <Link href="/esqueci-senha" style={{ color: '#B89B00', fontWeight: 700, textDecoration: 'none' }}>Solicitar novo link</Link>
                            {' · '}
                            <Link href="/login" style={{ color: '#B89B00', fontWeight: 700, textDecoration: 'none' }}>Voltar ao login</Link>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function RedefinirSenhaPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" style={{ width: 40, height: 40 }} /></div>}>
            <RedefinirSenhaForm />
        </Suspense>
    );
}
