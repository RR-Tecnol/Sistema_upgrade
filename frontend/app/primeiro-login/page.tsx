'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api/client';

export default function PrimeiroLoginPage() {
    const router = useRouter();
    const [preAuthToken, setPreAuthToken] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const token = sessionStorage.getItem('preAuthToken') ?? '';
        if (!token) { router.replace('/login'); return; }
        setPreAuthToken(token);
    }, [router]);

    const passwordStrength = (pw: string) => {
        let score = 0;
        if (pw.length >= 8) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        return score;
    };

    const strength = passwordStrength(newPassword);
    const strengthLabel = ['', 'Fraca', 'Regular', 'Boa', 'Forte'][strength];
    const strengthColor = ['#E5E7EB', '#EF4444', '#F59E0B', '#3B82F6', '#059669'][strength];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!newEmail.includes('@')) { setError('E-mail inválido.'); return; }
        if (newPassword.length < 8) { setError('A senha deve ter no mínimo 8 caracteres.'); return; }
        if (newPassword !== confirmPassword) { setError('As senhas não coincidem.'); return; }
        if (strength < 2) { setError('Escolha uma senha mais forte.'); return; }

        setLoading(true);
        try {
            const result = await api.post('/auth/first-login/complete', {
                preAuthToken,
                newEmail,
                newPassword,
            });
            const data = result.data;

            // Backend envia OTP para o novo e-mail — redireciona para verificação
            if (data.requiresEmailOtp && data.preAuthToken) {
                sessionStorage.setItem('preAuthToken', data.preAuthToken);
                sessionStorage.setItem('emailMasked', data.emailMasked ?? newEmail);
                router.push('/verify-email-otp');
                return;
            }

            // Fallback caso venha direto para TOTP (não esperado, mas seguro)
            if (data.requiresTwoFactorSetup && data.preAuthToken) {
                sessionStorage.setItem('preAuthToken', data.preAuthToken);
                router.push('/setup-2fa');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao atualizar credenciais. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const canSubmit = newEmail && newPassword && confirmPassword && !loading;

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #FFFDE7 0%, #F4F6FA 40%, #EFF6FF 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem', position: 'relative', overflow: 'hidden',
        }}>
            {/* Blobs decorativos */}
            <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,214,0,0.12)', filter: 'blur(80px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(59,130,246,0.06)', filter: 'blur(100px)', pointerEvents: 'none' }} />
            {/* Grid pattern */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle,rgba(0,0,0,0.04) 1px,transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', width: '100%', maxWidth: 460, background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.10)', border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden' }}>

                {/* ── Header amarelo (padrão do sistema) ── */}
                <div style={{ background: 'linear-gradient(135deg, #FFD600 0%, #F59E0B 100%)', padding: '28px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <span style={{ fontSize: 28 }}>🔑</span>
                        <div>
                            <h1 style={{ margin: 0, fontFamily: 'Orbitron, sans-serif', fontSize: '0.95rem', fontWeight: 900, color: '#000', letterSpacing: '0.08em' }}>
                                CONFIGURAÇÃO INICIAL
                            </h1>
                            <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: 'rgba(0,0,0,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                Perfil TI — Primeiro Acesso
                            </p>
                        </div>
                    </div>
                    {/* Barra de progresso — etapa 1 de 2 */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#000' }} />
                        <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.2)' }} />
                    </div>
                    <p style={{ margin: '10px 0 0', fontSize: '0.78rem', color: 'rgba(0,0,0,0.65)', lineHeight: 1.5 }}>
                        Defina seu <strong style={{ color: '#000' }}>e-mail e senha definitivos</strong> antes de acessar o sistema.
                    </p>
                </div>

                {/* ── Body ── */}
                <form onSubmit={handleSubmit} style={{ padding: '28px 32px' }}>

                    {error && (
                        <div style={{ padding: '0.7rem 1rem', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.8rem', fontWeight: 600, marginBottom: 20, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                            <span style={{ flexShrink: 0 }}>⚠</span> {error}
                        </div>
                    )}

                    {/* Alerta de contexto */}
                    <div style={{ background: '#FFFBEB', border: '1px solid rgba(255,214,0,0.5)', borderRadius: 10, padding: '12px 14px', marginBottom: 22 }}>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#92400E', lineHeight: 1.5 }}>
                            ⚠️ Este é o único acesso temporário. Após confirmar, as credenciais anteriores serão desativadas permanentemente.
                        </p>
                    </div>

                    {/* E-mail */}
                    <div style={{ marginBottom: 18 }}>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#374151', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                            Novo E-mail Definitivo
                        </label>
                        <input
                            type="email"
                            value={newEmail}
                            onChange={e => { setNewEmail(e.target.value); setError(''); }}
                            placeholder="seuemail@qualifica.com.br"
                            required
                            disabled={loading}
                            className="form-input"
                            style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>

                    {/* Senha */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#374151', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                            Nova Senha
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={newPassword}
                                onChange={e => { setNewPassword(e.target.value); setError(''); }}
                                placeholder="Mínimo 8 caracteres"
                                required
                                disabled={loading}
                                className="form-input"
                                style={{ width: '100%', boxSizing: 'border-box', paddingRight: '2.8rem' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(v => !v)}
                                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#9CA3AF', padding: 0, lineHeight: 1 }}
                            >
                                {showPass ? '🙈' : '👁️'}
                            </button>
                        </div>

                        {/* Barra de força */}
                        {newPassword && (
                            <div style={{ marginTop: 8 }}>
                                <div style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} style={{ flex: 1, height: 3, borderRadius: 4, background: i <= strength ? strengthColor : '#E5E7EB', transition: 'background 0.3s' }} />
                                    ))}
                                </div>
                                <p style={{ margin: 0, fontSize: '0.7rem', color: strengthColor, fontWeight: 600 }}>{strengthLabel}</p>
                            </div>
                        )}
                    </div>

                    {/* Confirmar senha */}
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#374151', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                            Confirmar Nova Senha
                        </label>
                        <input
                            type={showPass ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                            placeholder="Repita a senha"
                            required
                            disabled={loading}
                            className="form-input"
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                borderColor: confirmPassword && confirmPassword !== newPassword ? '#FECACA' : '',
                            }}
                        />
                        {confirmPassword && confirmPassword !== newPassword && (
                            <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: '#DC2626', fontWeight: 600 }}>As senhas não coincidem</p>
                        )}
                    </div>

                    {/* Botão confirmar */}
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        style={{
                            width: '100%', padding: '0.9rem', borderRadius: 10, border: 'none',
                            background: canSubmit ? 'linear-gradient(180deg, #FFD600 0%, #F59E0B 100%)' : '#E5E7EB',
                            color: canSubmit ? '#000' : '#9CA3AF',
                            fontWeight: 800, fontSize: '0.88rem',
                            cursor: canSubmit ? 'pointer' : 'not-allowed',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            boxShadow: canSubmit ? '0 4px 14px rgba(255,214,0,0.35)' : 'none',
                            transition: 'all 0.2s',
                        }}
                    >
                        {loading
                            ? <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />Salvando...</>
                            : <>🔒 Confirmar e Configurar 2FA</>
                        }
                    </button>

                    <p style={{ margin: '14px 0 0', textAlign: 'center', fontSize: '0.72rem', color: '#9CA3AF', lineHeight: 1.5 }}>
                        Próxima etapa: configurar o Google Authenticator
                    </p>
                </form>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
