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

export default function VerifyEmailOtpPage() {
    const router = useRouter();
    const { setUser: setAuthUser } = useAuthStore();
    const [digits, setDigits] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [emailMasked, setEmailMasked] = useState('');
    const [preAuthToken, setPreAuthToken] = useState('');
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        const token = sessionStorage.getItem('preAuthToken') ?? '';
        const email = sessionStorage.getItem('emailMasked') ?? '';
        if (!token) { router.replace('/login'); return; }
        setPreAuthToken(token);
        setEmailMasked(email);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }, [router]);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    const handleDigit = (index: number, value: string) => {
        const v = value.replace(/\D/g, '').slice(-1);
        const next = [...digits];
        next[index] = v;
        setDigits(next);
        setError('');
        if (v && index < 5) setTimeout(() => inputRefs.current[index + 1]?.focus(), 10);
        if (next.every(d => d !== '')) handleVerify(next.join(''));
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            const next = [...digits]; next[index - 1] = '';
            setDigits(next);
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) { setDigits(pasted.split('')); handleVerify(pasted); }
    };

    const handleVerify = async (code: string) => {
        if (loading || code.length < 6) return;
        setLoading(true); setError('');
        try {
            const result = await authApi.verifyEmailOtp(preAuthToken, code);
            // IT_ADMIN primeiro login: troca de e-mail + senha antes do 2FA
            if (result.requiresPasswordChange && result.preAuthToken) {
                sessionStorage.setItem('preAuthToken', result.preAuthToken);
                router.push('/primeiro-login'); return;
            }
            if (result.requiresTwoFactorSetup && result.preAuthToken) {
                sessionStorage.setItem('preAuthToken', result.preAuthToken);
                router.push('/setup-2fa'); return;
            }
            if (result.requiresTwoFactor && result.preAuthToken) {
                sessionStorage.setItem('preAuthToken', result.preAuthToken);
                router.push('/verify-2fa'); return;
            }
            if (result.access_token && result.user) {
                completeLogin(result, router, setAuthUser);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Código inválido');
            setDigits(['', '', '', '', '', '']);
            setTimeout(() => inputRefs.current[0]?.focus(), 50);
        } finally { setLoading(false); }
    };

    const handleResend = async () => {
        if (resendCooldown > 0 || loading) return;
        setLoading(true); setError('');
        try {
            const r = await authApi.resendEmailOtp(preAuthToken);
            sessionStorage.setItem('preAuthToken', r.preAuthToken);
            setPreAuthToken(r.preAuthToken);
            setEmailMasked(r.emailMasked);
            setResendCooldown(60);
            setDigits(['', '', '', '', '', '']);
            setTimeout(() => inputRefs.current[0]?.focus(), 50);
        } catch { setError('Não foi possível reenviar. Faça login novamente.'); }
        finally { setLoading(false); }
    };

    const isComplete = digits.every(d => d !== '');

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#FFFDE7 0%,#F4F6FA 40%,#EFF6FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,214,0,0.12)', filter: 'blur(80px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle,rgba(0,0,0,0.04) 1px,transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', width: '100%', maxWidth: 440, background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.10)', border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg,#FFD600 0%,#F59E0B 100%)', padding: '28px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <span style={{ fontSize: 28 }}>📧</span>
                        <div>
                            <h1 style={{ margin: 0, fontFamily: 'Orbitron,sans-serif', fontSize: '0.95rem', fontWeight: 900, color: '#000', letterSpacing: '0.08em' }}>VERIFICAÇÃO POR E-MAIL</h1>
                            <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: 'rgba(0,0,0,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Etapa 2 — Código de acesso</p>
                        </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.83rem', color: 'rgba(0,0,0,0.65)', lineHeight: 1.5 }}>
                        Código enviado para <strong style={{ color: '#000' }}>{emailMasked || '...'}</strong>
                    </p>
                </div>

                <div style={{ padding: '32px' }}>
                    {error && <div style={{ padding: '0.7rem 1rem', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.8rem', fontWeight: 600, marginBottom: 20, display: 'flex', gap: 6 }}><span>⚠</span>{error}</div>}

                    <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#6B7280', margin: '0 0 20px' }}>Digite o código de 6 dígitos</p>

                    <div onPaste={handlePaste} style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
                        {digits.map((d, i) => (
                            <input key={i} ref={el => { inputRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={d}
                                onChange={e => handleDigit(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)} disabled={loading}
                                style={{ width: 46, height: 56, textAlign: 'center', fontSize: '1.4rem', fontWeight: 800, fontFamily: 'Orbitron,monospace', border: d ? '2.5px solid #FFD600' : '2px solid #E5E7EB', borderRadius: 10, background: d ? '#FFFBEB' : '#F9FAFB', color: '#111827', outline: 'none', transition: 'all 0.15s', cursor: loading ? 'not-allowed' : 'text' }} />
                        ))}
                    </div>

                    <button onClick={() => handleVerify(digits.join(''))} disabled={loading || !isComplete}
                        style={{ width: '100%', padding: '0.85rem', borderRadius: 10, border: 'none', background: isComplete && !loading ? 'linear-gradient(180deg,#FFD600 0%,#F59E0B 100%)' : '#E5E7EB', color: isComplete && !loading ? '#000' : '#9CA3AF', fontWeight: 800, fontSize: '0.88rem', cursor: isComplete && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18, boxShadow: isComplete && !loading ? '0 4px 12px rgba(255,214,0,0.3)' : 'none', transition: 'all 0.2s' }}>
                        {loading ? <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />Verificando...</> : <>✅ Confirmar código</>}
                    </button>

                    <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: '0 0 6px', fontSize: '0.78rem', color: '#9CA3AF' }}>Não recebeu?</p>
                        <button onClick={handleResend} disabled={resendCooldown > 0 || loading}
                            style={{ background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 700, color: resendCooldown > 0 ? '#9CA3AF' : '#B89B00', padding: 0, textDecoration: resendCooldown > 0 ? 'none' : 'underline' }}>
                            {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar código'}
                        </button>
                    </div>

                    <div style={{ marginTop: 20, textAlign: 'center' }}>
                        <a href="/login" style={{ fontSize: '0.75rem', color: '#9CA3AF', textDecoration: 'none' }}>← Voltar ao login</a>
                    </div>
                </div>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}
