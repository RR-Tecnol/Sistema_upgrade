'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api/client';
import { useEnrollmentStore } from '@/stores/useEnrollmentStore';

interface Props {
    classId: string;
    onContinueNew: () => void;
}

export default function PreEnrollmentGate({ classId, onContinueNew }: Props) {
    const router = useRouter();
    const { setStep, updatePersonalData, updateContact, updateAddress, updateSocioeconomic, updateProfessional } = useEnrollmentStore();

    const [mode, setMode] = useState<'choose' | 'login' | 'loading'>('choose');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) { setLoginError('Preencha e-mail e senha.'); return; }
        setLoginLoading(true);
        setLoginError('');
        try {
            // Autenticar
            const authRes = await api.post('/auth/login', { email, password });
            const token = authRes.data.access_token;

            // Buscar dados do aluno
            const meRes = await api.get('/users/me', { headers: { Authorization: `Bearer ${token}` } });
            const me = meRes.data;

            // Verificar se já está inscrito nesta turma
            try {
                const enrollRes = await api.get(`/enrollments/check?classId=${classId}&userId=${me.id}`, { headers: { Authorization: `Bearer ${token}` } });
                if (enrollRes.data?.enrolled) {
                    // Já inscrito — redirecionar para login com mensagem
                    router.push(`/login?message=already_enrolled&class=${classId}`);
                    return;
                }
            } catch { /* endpoint pode não existir, ignorar */ }

            // Pré-preencher store: nome/cpf vêm do User; cadastro acadêmico em student (quando existir)
            const s = me.student as {
                cpf?: string;
                birthDate?: string;
                gender?: string;
                raceColor?: string;
                maritalStatus?: string;
                motherName?: string;
                fatherName?: string;
                nationality?: string;
                birthCity?: string;
                birthState?: string;
                socialName?: string;
                contact?: {
                    email?: string;
                    phone?: string;
                    hasWhatsapp?: boolean;
                    phoneAlt?: string;
                    allowWhatsappContact?: boolean;
                    allowEmailContact?: boolean;
                };
                address?: {
                    cep?: string;
                    street?: string;
                    number?: string;
                    complement?: string;
                    neighborhood?: string;
                    city?: string;
                    state?: string;
                    zone?: string;
                };
            } | null | undefined;

            updatePersonalData({
                fullName: (me.name || '').trim() || (s?.socialName || ''),
                socialName: s?.socialName || '',
                cpf: s?.cpf || (me as { cpf?: string }).cpf || '',
                birthDate: s?.birthDate ? String(s.birthDate).split('T')[0] : '',
                gender: (s?.gender as any) || '',
                raceColor: (s?.raceColor as any) || '',
                maritalStatus: (s?.maritalStatus as any) || '',
                motherName: s?.motherName || '',
                fatherName: s?.fatherName || '',
                nationality: s?.nationality || 'Brasileiro(a)',
                birthCity: s?.birthCity || '',
                birthState: s?.birthState || '',
            });

            if (s?.address) {
                updateAddress({
                    cep: s.address.cep || '',
                    street: s.address.street || '',
                    number: s.address.number || '',
                    complement: s.address.complement || '',
                    neighborhood: s.address.neighborhood || '',
                    city: s.address.city || '',
                    state: s.address.state || '',
                    zone: (s.address.zone as any) || '',
                });
            }

            updateContact({
                email: s?.contact?.email || me.email || '',
                phone: s?.contact?.phone || me.phone || '',
                hasWhatsApp: s?.contact?.hasWhatsapp ?? true,
                phoneAlt: s?.contact?.phoneAlt,
                allowWhatsAppContact: s?.contact?.allowWhatsappContact ?? true,
                allowEmailContact: s?.contact?.allowEmailContact ?? true,
            });

            // Ir direto para Step 4 (socioeconomico) pois 1-3 já preenchidos
            setStep(4);
            onContinueNew();
        } catch (e: any) {
            const msg = e?.response?.data?.message;
            if (e?.response?.status === 401) setLoginError('E-mail ou senha incorretos.');
            else setLoginError(msg || 'Erro ao fazer login. Tente novamente.');
        } finally {
            setLoginLoading(false);
        }
    };

    const I: React.CSSProperties = {
        width: '100%', padding: '0.7rem 1rem', borderRadius: 10,
        border: '1.5px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
        fontSize: '0.88rem', color: '#fff', outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.2s',
    };

    if (mode === 'choose') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>🎓</div>
                <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.15rem', fontWeight: 900, color: '#fff', margin: 0 }}>
                    INSCRIÇÃO NO CURSO
                </h2>
                <p style={{ color: '#9CA3AF', fontSize: '0.85rem', margin: 0 }}>
                    Você já tem uma conta no portal?
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                        onClick={() => setMode('login')}
                        style={{
                            padding: '1rem 1.5rem', borderRadius: 14, border: '1.5px solid rgba(251,191,36,0.4)',
                            background: 'rgba(251,191,36,0.06)', color: '#FBBF24', fontWeight: 700,
                            fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                        }}
                    >
                        <span style={{ fontSize: '1.4rem' }}>🔐</span>
                        <div>
                            <div>Sim, já tenho conta</div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 400, color: '#6B7280', marginTop: 2 }}>
                                Faço login e meus dados são preenchidos automaticamente
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={onContinueNew}
                        style={{
                            padding: '1rem 1.5rem', borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.03)', color: '#9CA3AF', fontWeight: 700,
                            fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                        }}
                    >
                        <span style={{ fontSize: '1.4rem' }}>✨</span>
                        <div>
                            <div style={{ color: '#D1D5DB' }}>Não, sou novo(a) aqui</div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 400, color: '#6B7280', marginTop: 2 }}>
                                Preencho meus dados do zero e crio minha conta
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <button
                onClick={() => { setMode('choose'); setLoginError(''); }}
                style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: '0.8rem', textAlign: 'left', padding: 0 }}
            >
                ← Voltar
            </button>
            <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.1rem', fontWeight: 900, color: '#fff', margin: 0 }}>
                ENTRAR COM MINHA CONTA
            </h2>
            <p style={{ color: '#9CA3AF', fontSize: '0.82rem', margin: 0 }}>
                Seus dados cadastrais serão preenchidos automaticamente. Você ainda passará pelas etapas de consentimento, documentação e dados socioeconômicos.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: '0.45rem' }}>
                        E-mail de acesso
                    </label>
                    <input
                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="seu@email.com" style={I}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: '0.45rem' }}>
                        Senha
                    </label>
                    <input
                        type="password" value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••" style={I}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    />
                </div>

                {loginError && (
                    <div style={{ padding: '0.7rem 1rem', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171', fontSize: '0.82rem' }}>
                        ⚠️ {loginError}
                    </div>
                )}

                <button
                    onClick={handleLogin} disabled={loginLoading}
                    style={{
                        padding: '0.85rem', borderRadius: 12, border: 'none',
                        background: loginLoading ? '#374151' : 'linear-gradient(135deg, #FBBF24, #F59E0B)',
                        color: loginLoading ? '#6B7280' : '#000', fontWeight: 800, fontSize: '0.9rem',
                        cursor: loginLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    }}
                >
                    {loginLoading ? '⏳ Verificando...' : '🔐 Entrar e continuar inscrição'}
                </button>
            </div>
        </div>
    );
}
