'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/useAuthStore';

export default function LoginPage() {
    const router = useRouter();
    const { setUser: setAuthUser, logout: clearAuth } = useAuthStore();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            clearAuth();
            const response = await authApi.login(formData) as any;

            // ── [DEV BYPASS — completo] AUTH_BYPASS_MFA=true: JWT imediato ─────
            if (response.access_token && response.user) {
                sessionStorage.setItem('token', response.access_token);
                sessionStorage.setItem('user', JSON.stringify(response.user));
                setAuthUser(response.user, response.access_token);
                if (response.student) sessionStorage.setItem('student', JSON.stringify(response.student));
                const role = response.user.role;
                if (role === 'IT_ADMIN' || role === 'ADMIN' || role === 'COORDINATOR' || role === 'FINANCIAL') router.push('/admin/dashboard');
                else if (role === 'STUDENT') router.push('/student/dashboard');
                else if (role === 'DRIVER') router.push('/driver/dashboard');
                else router.push('/teacher/dashboard');
                return;
            }
            // ── [/DEV BYPASS — completo] ───────────────────────────────────────

            // Alinhar com verify-email-otp: primeiro login, setup 2FA, TOTP, depois OTP por e-mail
            if (response.requiresPasswordChange && response.preAuthToken) {
                sessionStorage.setItem('preAuthToken', response.preAuthToken);
                router.push('/primeiro-login');
                return;
            }
            if (response.requiresTwoFactorSetup && response.preAuthToken) {
                sessionStorage.setItem('preAuthToken', response.preAuthToken);
                router.push('/setup-2fa');
                return;
            }
            if (response.requiresTwoFactor && response.preAuthToken) {
                sessionStorage.setItem('preAuthToken', response.preAuthToken);
                router.push('/verify-2fa');
                return;
            }

            if (response.requiresEmailOtp) {
                sessionStorage.setItem('preAuthToken', response.preAuthToken);
                sessionStorage.setItem('emailMasked', response.emailMasked);
                router.push('/verify-email-otp');
                return;
            }

            setError('Resposta inesperada do servidor. Tente novamente.');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Credenciais inválidas');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #FFFDE7 0%, #F4F6FA 40%, #EFF6FF 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem', position: 'relative', overflow: 'hidden',
        }}>
            <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,214,0,0.12)', filter: 'blur(80px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(59,130,246,0.08)', filter: 'blur(100px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />

            <div
                className={`w-full max-w-5xl relative z-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.08)' }}
            >
                {/* Left — Branding */}
                <div style={{ background: 'linear-gradient(160deg, #FFD600 0%, #FFC200 100%)', padding: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(0,0,0,0.06)' }} />
                    <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(0,0,0,0.04)' }} />
                    <div style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '2.5rem' }}>
                            <img src="/logo-upgrade.png" alt="Upgrade" style={{ height: 52, width: 'auto', objectFit: 'contain' }} />
                            <div>
                                <h1 style={{ fontFamily: 'Orbitron', color: '#000', fontSize: '1.75rem', fontWeight: 900, letterSpacing: '0.12em', lineHeight: 1 }}>UPGRADE</h1>
                                <p style={{ fontSize: '0.62rem', letterSpacing: '0.2em', color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase', marginTop: '0.2rem', fontWeight: 600 }}>Sistema de Gestão</p>
                            </div>
                        </div>
                        <h2 style={{ fontFamily: 'Orbitron', fontSize: '1.6rem', fontWeight: 800, color: '#000', lineHeight: 1.25, marginBottom: '1rem' }}>
                            Plataforma de<br />Qualificação<br />Profissional
                        </h2>
                        <p style={{ fontSize: '0.9rem', color: 'rgba(0,0,0,0.6)', lineHeight: 1.7 }}>
                            Gestão completa de cursos profissionalizantes, turmas, alunos e certificações.
                        </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {['Gestão de Cursos e Turmas', 'Frequência Digital Touch', 'Certificação com QR Code', 'Relatórios e Dashboards'].map((label, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0.9rem', borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.82rem', color: 'rgba(0,0,0,0.7)', fontWeight: 500 }}>
                                <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(0,0,0,0.45)' }} />
                                </div>
                                <span>{label}</span>
                            </div>
                        ))}
                        <div style={{ marginTop: '0.5rem', fontSize: '0.6rem', color: 'rgba(0,0,0,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>v2.0.0 · UPGRADE · 2026</div>
                    </div>
                </div>

                {/* Right — Form */}
                <div style={{ background: '#FFFFFF', padding: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontFamily: 'Orbitron', fontSize: '1.25rem', fontWeight: 800, color: '#111827', marginBottom: '0.4rem' }}>Acesso ao Sistema</h2>
                        <p style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>Entre com suas credenciais para continuar</p>
                    </div>

                    {error && (
                        <div style={{ padding: '0.85rem 1rem', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>⚠</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label className="form-label">E-mail ou CPF</label>
                            <input type="text" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="form-input" placeholder="seu@email.com ou CPF" required autoComplete="username" />
                        </div>
                        <div>
                            <label className="form-label">Senha</label>
                            <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="form-input" placeholder="••••••••" required autoComplete="current-password" />
                        </div>
                        <button type="submit" disabled={loading} className="btn-primary" style={{ justifyContent: 'center', padding: '0.85rem', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                            {loading ? (<><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, boxShadow: 'none' }} /> Verificando...</>) : (<>⚡ Continuar</>)}
                        </button>
                    </form>

                    <div style={{ marginTop: '1.5rem', padding: '0.85rem', background: '#FFFBEB', borderRadius: 8, border: '1px solid rgba(255,214,0,0.3)', fontSize: '0.75rem', color: '#92400E', lineHeight: 1.5 }}>
                        🔒 <strong>Acesso seguro em duas etapas.</strong> Após validar suas credenciais, você receberá um código no seu e-mail.
                    </div>

                    <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                        <a href="/esqueci-senha" style={{ fontSize: '0.8rem', color: '#9CA3AF', textDecoration: 'none', fontWeight: 500 }}>Esqueci minha senha</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
