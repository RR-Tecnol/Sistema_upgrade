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

export default function Setup2FAPage() {
    const router = useRouter();
    const { setUser: setAuthUser } = useAuthStore();
    const [step, setStep] = useState<'intro' | 'qrcode' | 'confirm'>('intro');
    const [qrUrl, setQrUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [preAuthToken, setPreAuthToken] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const codeRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const token = sessionStorage.getItem('preAuthToken') ?? '';
        if (!token) { router.replace('/login'); return; }
        setPreAuthToken(token);
    }, [router]);

    const handleGenerateQR = async () => {
        setLoading(true); setError('');
        try {
            const r = await authApi.setupTotpGenerate(preAuthToken);
            setQrUrl(r.qrCodeDataUrl);
            setSecret(r.secret);
            setPreAuthToken(r.preAuthToken); // token atualizado
            setStep('qrcode');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao gerar QR Code');
        } finally { setLoading(false); }
    };

    const handleConfirm = async () => {
        if (code.length < 6) { setError('Digite o código de 6 dígitos do app'); return; }
        setLoading(true); setError('');
        try {
            const result = await authApi.setupTotpComplete(preAuthToken, code);
            sessionStorage.removeItem('preAuthToken');
            sessionStorage.removeItem('emailMasked');
            completeLogin(result, router, setAuthUser);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Código inválido — verifique o app e tente novamente');
            setCode('');
            codeRef.current?.focus();
        } finally { setLoading(false); }
    };

    const formatSecret = (s: string) => s.replace(/(.{4})/g, '$1 ').trim();

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#FFFDE7 0%,#F4F6FA 40%,#EFF6FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,214,0,0.12)', filter: 'blur(80px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle,rgba(0,0,0,0.04) 1px,transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', width: '100%', maxWidth: 480, minWidth: 0, boxSizing: 'border-box', background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.10)', border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ background: 'linear-gradient(135deg,#FFD600 0%,#F59E0B 100%)', padding: '28px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <span style={{ fontSize: 28 }}>🔐</span>
                        <div>
                            <h1 style={{ margin: 0, fontFamily: 'Orbitron,sans-serif', fontSize: '0.95rem', fontWeight: 900, color: '#000', letterSpacing: '0.08em' }}>AUTENTICADOR DE DOIS FATORES</h1>
                            <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: 'rgba(0,0,0,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Etapa 3 — Configuração obrigatória</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {['intro', 'qrcode', 'confirm'].map((s, i) => (
                            <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: ['intro', 'qrcode', 'confirm'].indexOf(step) >= i ? '#000' : 'rgba(0,0,0,0.2)', transition: 'background 0.3s' }} />
                        ))}
                    </div>
                </div>

                <div style={{ padding: '32px' }}>
                    {error && <div style={{ padding: '0.7rem 1rem', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.8rem', fontWeight: 600, marginBottom: 20, display: 'flex', gap: 6 }}><span>⚠</span>{error}</div>}

                    {/* ── STEP 1: Intro ─────────────────────────────────────────────────── */}
                    {step === 'intro' && (
                        <div>
                            <div style={{ background: '#FFFBEB', border: '1px solid rgba(255,214,0,0.4)', borderRadius: 12, padding: '16px', marginBottom: 24 }}>
                                <p style={{ margin: '0 0 8px', fontSize: '0.82rem', fontWeight: 700, color: '#92400E' }}>⚠️ Autenticação obrigatória para sua função</p>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#92400E', lineHeight: 1.5 }}>
                                    Sua conta requer proteção adicional com o Google Authenticator. Este processo leva menos de 2 minutos.
                                </p>
                            </div>

                            <p style={{ fontSize: '0.85rem', color: '#374151', fontWeight: 600, margin: '0 0 16px' }}>O que você vai precisar:</p>

                            {[
                                { icon: '📱', title: 'Google Authenticator', desc: 'Instale o app no seu celular (Android ou iPhone)' },
                                { icon: '📷', title: 'Câmera do celular', desc: 'Para escanear o QR Code que será exibido' },
                                { icon: '⏰', title: '2 minutos', desc: 'O processo é rápido e você faz uma só vez' },
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 0', borderBottom: i < 2 ? '1px solid #F3F4F6' : 'none' }}>
                                    <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
                                    <div>
                                        <p style={{ margin: '0 0 2px', fontSize: '0.82rem', fontWeight: 700, color: '#111827' }}>{item.title}</p>
                                        <p style={{ margin: 0, fontSize: '0.76rem', color: '#6B7280', lineHeight: 1.4 }}>{item.desc}</p>
                                    </div>
                                </div>
                            ))}

                            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                                <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" target="_blank" rel="noopener noreferrer"
                                    style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #E5E7EB', textAlign: 'center', fontSize: '0.72rem', color: '#374151', fontWeight: 600, textDecoration: 'none', background: '#F9FAFB' }}>
                                    📱 Android
                                </a>
                                <a href="https://apps.apple.com/app/google-authenticator/id388497605" target="_blank" rel="noopener noreferrer"
                                    style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #E5E7EB', textAlign: 'center', fontSize: '0.72rem', color: '#374151', fontWeight: 600, textDecoration: 'none', background: '#F9FAFB' }}>
                                    🍎 iPhone
                                </a>
                            </div>

                            <button onClick={handleGenerateQR} disabled={loading}
                                style={{ width: '100%', marginTop: 20, padding: '0.9rem', borderRadius: 10, border: 'none', background: loading ? '#E5E7EB' : 'linear-gradient(180deg,#FFD600 0%,#F59E0B 100%)', color: loading ? '#9CA3AF' : '#000', fontWeight: 800, fontSize: '0.88rem', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: loading ? 'none' : '0 4px 12px rgba(255,214,0,0.3)' }}>
                                {loading ? <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />Gerando QR Code...</> : <>📷 Gerar QR Code</>}
                            </button>
                        </div>
                    )}

                    {/* ── STEP 2: QR Code ───────────────────────────────────────────────── */}
                    {step === 'qrcode' && (
                        <div>
                            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#374151', textAlign: 'center', lineHeight: 1.5 }}>
                                Abra o <strong>Google Authenticator</strong>, toque em <strong>+</strong> e escaneie o QR Code abaixo:
                            </p>

                            {/* QR Code */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20, width: '100%', minWidth: 0 }}>
                                <div style={{ padding: 16, background: '#fff', border: '3px solid #FFD600', borderRadius: 16, boxShadow: '0 4px 20px rgba(255,214,0,0.2)', maxWidth: '100%', boxSizing: 'border-box' }}>
                                    {qrUrl && <img src={qrUrl} alt="QR Code Google Authenticator" style={{ width: 'min(100%, 200px)', height: 'auto', maxWidth: '100%', display: 'block' }} />}
                                </div>
                            </div>

                            {/* Secret manual */}
                            <div style={{ background: '#F3F4F6', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
                                <p style={{ margin: '0 0 6px', fontSize: '0.72rem', color: '#6B7280', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Código manual (se câmera não funcionar)</p>
                                <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 700, color: '#111827', letterSpacing: '0.12em', wordBreak: 'break-all' }}>
                                    {formatSecret(secret)}
                                </p>
                            </div>

                            <button onClick={() => { setStep('confirm'); setTimeout(() => codeRef.current?.focus(), 100); }}
                                style={{ width: '100%', padding: '0.9rem', borderRadius: 10, border: 'none', background: 'linear-gradient(180deg,#FFD600 0%,#F59E0B 100%)', color: '#000', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255,214,0,0.3)' }}>
                                ✅ Já escaneei — Continuar
                            </button>
                        </div>
                    )}

                    {/* ── STEP 3: Confirmar código ──────────────────────────────────────── */}
                    {step === 'confirm' && (
                        <div>
                            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#374151', textAlign: 'center', lineHeight: 1.5 }}>
                                Digite o código de <strong>6 dígitos</strong> que aparece no<br /><strong>Google Authenticator</strong> agora:
                            </p>

                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24, width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                                <input ref={codeRef} type="text" inputMode="numeric" maxLength={6} value={code}
                                    onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                                    onKeyDown={e => { if (e.key === 'Enter' && code.length === 6) handleConfirm(); }}
                                    placeholder="000000"
                                    style={{
                                        width: '100%',
                                        maxWidth: 280,
                                        minWidth: 0,
                                        boxSizing: 'border-box',
                                        height: 64,
                                        textAlign: 'center',
                                        fontSize: 'clamp(1.25rem, 6.5vw, 2rem)',
                                        fontWeight: 900,
                                        fontFamily: 'Orbitron,monospace',
                                        border: '2.5px solid #FFD600',
                                        borderRadius: 12,
                                        background: '#FFFBEB',
                                        color: '#111827',
                                        outline: 'none',
                                        letterSpacing: 'clamp(0.08em, 1.5vw, 0.2em)',
                                    }} />
                            </div>

                            <p style={{ margin: '0 0 20px', fontSize: '0.75rem', color: '#9CA3AF', textAlign: 'center' }}>
                                ⏰ O código muda a cada 30 segundos
                            </p>

                            <button onClick={handleConfirm} disabled={loading || code.length < 6}
                                style={{ width: '100%', padding: '0.9rem', borderRadius: 10, border: 'none', background: code.length === 6 && !loading ? 'linear-gradient(180deg,#FFD600 0%,#F59E0B 100%)' : '#E5E7EB', color: code.length === 6 && !loading ? '#000' : '#9CA3AF', fontWeight: 800, fontSize: '0.88rem', cursor: code.length === 6 && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: code.length === 6 && !loading ? '0 4px 12px rgba(255,214,0,0.3)' : 'none', marginBottom: 14 }}>
                                {loading ? <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />Confirmando...</> : <>🔐 Ativar e Entrar no Sistema</>}
                            </button>

                            <button onClick={() => setStep('qrcode')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'center', fontSize: '0.78rem', color: '#9CA3AF', cursor: 'pointer', padding: '6px 0' }}>
                                ← Ver QR Code novamente
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}
