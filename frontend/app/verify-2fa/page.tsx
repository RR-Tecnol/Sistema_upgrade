'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/useAuthStore';

function completeLogin(data: any, router: any, setAuthUser: any) {
    sessionStorage.setItem('token', data.access_token);
    sessionStorage.setItem('user', JSON.stringify(data.user));
    setAuthUser(data.user, data.access_token);
    if (data.student) sessionStorage.setItem('student', JSON.stringify(data.student));
    const role = data.user.role;
    if (role === 'IT_ADMIN' || role === 'ADMIN' || role === 'COORDINATOR' || role === 'FINANCIAL') router.push('/admin/dashboard');
    else if (role === 'STUDENT') router.push('/student/dashboard');
    else if (role === 'DRIVER') router.push('/driver/dashboard');
    else router.push('/teacher/dashboard');
}

export default function Verify2FAPage() {
    const router = useRouter();
    const { setUser: setAuthUser } = useAuthStore();
    const [code, setCode] = useState('');
    const [preAuthToken, setPreAuthToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const token = sessionStorage.getItem('preAuthToken') ?? '';
        if (!token) { router.replace('/login'); return; }
        setPreAuthToken(token);
        setTimeout(() => inputRef.current?.focus(), 100);
    }, [router]);

    const handleVerify = async () => {
        if (code.length < 6) { setError('Digite o código de 6 dígitos do Google Authenticator'); return; }
        setLoading(true); setError('');
        try {
            const result = await authApi.verifyTotp(preAuthToken, code);
            sessionStorage.removeItem('preAuthToken');
            sessionStorage.removeItem('emailMasked');
            completeLogin(result, router, setAuthUser);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Código inválido ou expirado');
            setCode('');
            inputRef.current?.focus();
        } finally { setLoading(false); }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#FFFDE7 0%,#F4F6FA 40%,#EFF6FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,214,0,0.12)', filter: 'blur(80px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle,rgba(0,0,0,0.04) 1px,transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', width: '100%', maxWidth: 420, minWidth: 0, boxSizing: 'border-box', background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.10)', border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg,#FFD600 0%,#F59E0B 100%)', padding: '28px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <span style={{ fontSize: 28 }}>🔑</span>
                        <div>
                            <h1 style={{ margin: 0, fontFamily: 'Orbitron,sans-serif', fontSize: '0.95rem', fontWeight: 900, color: '#000', letterSpacing: '0.08em' }}>GOOGLE AUTHENTICATOR</h1>
                            <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: 'rgba(0,0,0,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Etapa 3 — Verificação final</p>
                        </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(0,0,0,0.65)', lineHeight: 1.5 }}>
                        Abra o <strong style={{ color: '#000' }}>Google Authenticator</strong> no seu celular e digite o código de 6 dígitos.
                    </p>
                </div>

                <div style={{ padding: '32px' }}>
                    {error && <div style={{ padding: '0.7rem 1rem', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.8rem', fontWeight: 600, marginBottom: 20, display: 'flex', gap: 6 }}><span>⚠</span>{error}</div>}

                    <p style={{ margin: '0 0 20px', fontSize: '0.82rem', color: '#6B7280', textAlign: 'center' }}>Código atual (válido por 30 segundos)</p>

                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24, width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                        <input ref={inputRef} type="text" inputMode="numeric" maxLength={6} value={code}
                            onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                            onKeyDown={e => { if (e.key === 'Enter' && code.length === 6) handleVerify(); }}
                            placeholder="000000"
                            style={{
                                width: '100%',
                                maxWidth: 280,
                                minWidth: 0,
                                boxSizing: 'border-box',
                                height: 68,
                                textAlign: 'center',
                                fontSize: 'clamp(1.35rem, 7vw, 2.2rem)',
                                fontWeight: 900,
                                fontFamily: 'Orbitron,monospace',
                                border: '2.5px solid #FFD600',
                                borderRadius: 14,
                                background: '#FFFBEB',
                                color: '#111827',
                                outline: 'none',
                                letterSpacing: 'clamp(0.08em, 1.5vw, 0.2em)',
                            }} />
                    </div>

                    <button onClick={handleVerify} disabled={loading || code.length < 6}
                        style={{ width: '100%', padding: '0.9rem', borderRadius: 10, border: 'none', background: code.length === 6 && !loading ? 'linear-gradient(180deg,#FFD600 0%,#F59E0B 100%)' : '#E5E7EB', color: code.length === 6 && !loading ? '#000' : '#9CA3AF', fontWeight: 800, fontSize: '0.88rem', cursor: code.length === 6 && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20, boxShadow: code.length === 6 && !loading ? '0 4px 12px rgba(255,214,0,0.3)' : 'none' }}>
                        {loading ? <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />Verificando...</> : <>🔐 Entrar no Sistema</>}
                    </button>

                    <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '12px 16px' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#6B7280', lineHeight: 1.5 }}>
                            💡 <strong>Código incorreto?</strong> Aguarde o próximo código aparecer no app (renova a cada 30s) e tente novamente.
                        </p>
                    </div>

                    <div style={{ marginTop: 18, textAlign: 'center' }}>
                        <a href="/login" style={{ fontSize: '0.75rem', color: '#9CA3AF', textDecoration: 'none' }}>← Voltar ao login</a>
                    </div>
                </div>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}
