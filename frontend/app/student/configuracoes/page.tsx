'use client';

import { useState, useEffect, useRef } from 'react';
import { CameraIcon, UserCircleIcon, BellIcon, ShieldCheckIcon, Cog6ToothIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api/client';
import { useAuthStore } from '@/stores/useAuthStore';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { SettingRow } from '@/components/settings/SettingRow';
import AuthenticatorSettingsTotpBlock from '@/components/auth/AuthenticatorSettingsTotpBlock';
import ChangePasswordSettingsPanel from '@/components/auth/ChangePasswordSettingsPanel';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button type="button" onClick={() => onChange(!checked)} style={{
            width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer',
            background: checked ? '#FFD600' : '#E5E7EB', border: 'none', transition: 'background 0.25s', flexShrink: 0,
        }}>
            <span style={{
                position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18,
                borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)', display: 'block',
            }} />
        </button>
    );
}

const TABS = [
    { id: 'perfil', label: 'Meu Perfil', icon: UserCircleIcon },
    { id: 'notificacoes', label: 'Notificações', icon: BellIcon },
    { id: 'seguranca', label: 'Segurança', icon: ShieldCheckIcon },
    { id: 'preferencias', label: 'Preferências', icon: Cog6ToothIcon },
];

const SECTION: React.CSSProperties = {
    background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB',
    padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '1rem',
};
const SECTION_TITLE: React.CSSProperties = {
    fontFamily: 'Orbitron', fontWeight: 800, fontSize: '0.7rem',
    letterSpacing: '0.12em', color: '#B89B00', textTransform: 'uppercase', marginBottom: '0.75rem',
};

export default function StudentConfiguracoes() {
    const { user: authUser, token, setUser: setAuthUser } = useAuthStore();
    const [tab, setTab] = useState('perfil');
    const [user, setUser] = useState<any>(null);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [avatarHover, setAvatarHover] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /* 2FA state */
    const [twoFAStep, setTwoFAStep] = useState<'idle' | 'setup' | 'disabling' | 'active'>('idle');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [totpToken, setTotpToken] = useState('');
    const [twoFALoading, setTwoFALoading] = useState(false);
    const [twoFAError, setTwoFAError] = useState('');
    const [twoFADisableToken, setTwoFADisableToken] = useState('');
    const [doisFatores, setDoisFatores] = useState(false);

    const [rankBadgeInfo, setRankBadgeInfo] = useState<{ rank: string; color: string; xp: number; label: string } | null>(null);

    const [cfg, setCfg] = useState({
        nome: '', email: '',
        notifEmail: true, notifCertificado: true, notifInscricao: true, notifFrequencia: true,
        logAcesso: true, animacoes: true, fonteGrande: false,
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const t = new URLSearchParams(window.location.search).get('tab');
        if (t === 'seguranca') setTab('seguranca');
    }, []);

    useEffect(() => {
        // Busca perfil e preferências em paralelo
        Promise.all([
            api.get('/users/me'),
            api.get('/users/me/preferences').catch(() => null),
        ]).then(([profileRes, prefRes]) => {
            const p = profileRes.data;
            setUser(p);
            setCfg(c => ({
                ...c,
                nome: p.name || '',
                email: p.email || '',
                ...(prefRes?.data ? {
                    notifEmail: prefRes.data.notifEmail,
                    notifCertificado: prefRes.data.notifCertificado,
                    notifInscricao: prefRes.data.notifInscricao,
                    notifFrequencia: prefRes.data.notifFrequencia,
                    animacoes: prefRes.data.animacoes,
                    fonteGrande: prefRes.data.fonteGrande,
                } : {}),
            }));
            setDoisFatores(!!p.twoFactorEnabled);
            // BUG-07: não usar localStorage.setItem('user') — Zustand persiste em auth-storage
        }).catch(() => {
            // fallback: usa Zustand se o fetch falhar
            if (authUser) {
                setUser(authUser);
                setCfg(c => ({ ...c, nome: authUser.name || '', email: authUser.email || '' }));
            }
        });

        // Rank badge compacto: lê do cache sem novo request
        try {
            const cached = localStorage.getItem('student_rank_cache');
            if (cached) {
                const c = JSON.parse(cached);
                setRankBadgeInfo(c);
            }
        } catch {}
    }, []);

    const set = (k: string, v: any) => setCfg(c => ({ ...c, [k]: v }));

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { setPhotoError('Máximo 2 MB.'); return; }
        const reader = new FileReader();
        reader.onload = ev => setAvatarUrl(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        try {
            // Salva nome e preferências em paralelo
            await Promise.all([
                api.patch('/users/me', { name: cfg.nome }),
                api.patch('/users/me/preferences', {
                    notifEmail: cfg.notifEmail,
                    notifCertificado: cfg.notifCertificado,
                    notifInscricao: cfg.notifInscricao,
                    notifFrequencia: cfg.notifFrequencia,
                    animacoes: cfg.animacoes,
                    fonteGrande: cfg.fonteGrande,
                }),
            ]);
            // BUG-07: atualiza Zustand store (fonte real de auth) em vez de localStorage.getItem('user') que não existe
            if (authUser && token) {
                setAuthUser({ ...authUser, name: cfg.nome }, token);
            }
            window.dispatchEvent(new Event('userUpdated'));
            setSaved(true);
            setTimeout(() => setSaved(false), 2800);
        } catch {
            setSaveError(true);
            setTimeout(() => setSaveError(false), 3500);
        }
    };

    const initials = user?.name ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : 'AL';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }} className="animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <AdminHeaderHero
                    title="CONFIGURAÇÕES"
                    subtitle="Gerencie seu perfil e preferências no portal do aluno"
                    badge="PORTAL DO ALUNO"
                />
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {saved && <div className="animate-scale-in" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', borderRadius: 9, background: '#DCFCE7', border: '1px solid #BBF7D0', color: '#059669', fontSize: '0.78rem', fontWeight: 700 }}><CheckCircleIcon style={{ width: 14, height: 14 }} /> Salvo!</div>}
                    {saveError && <div className="animate-scale-in" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', borderRadius: 9, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.78rem', fontWeight: 700 }}><ExclamationTriangleIcon style={{ width: 14, height: 14 }} /> Erro ao salvar.</div>}
                    <button onClick={handleSave} className="btn-primary">Salvar Alterações</button>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: '0.5rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                {TABS.map(t => {
                    const Icon = t.icon;
                    const active = tab === t.id;
                    return (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.5rem 1rem', borderRadius: 10,
                            border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: active ? 700 : 500,
                            background: active ? '#FFD600' : 'transparent', color: active ? '#000' : '#6B7280',
                            transition: 'all 0.2s', boxShadow: active ? '0 2px 8px rgba(255,214,0,0.3)' : 'none',
                        }}>
                            <Icon style={{ width: 15, height: 15 }} />{t.label}
                        </button>
                    );
                })}
            </div>

            {/* ── PERFIL ── */}
            {tab === 'perfil' && (
                <div className="animate-fade-in">
                    {/* Avatar / Foto — com mini-badge de rank compacto */}
                    <div style={{ ...SECTION, background: '#FFFDE7', border: '1px solid #FEF08A', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}
                            onMouseEnter={() => setAvatarHover(true)}
                            onMouseLeave={() => setAvatarHover(false)}>
                            <div onClick={() => fileInputRef.current?.click()} style={{
                                width: 80, height: 80, borderRadius: 20, overflow: 'hidden', cursor: 'pointer',
                                background: avatarUrl ? 'transparent' : '#FFD600',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.4rem', color: '#000',
                                border: `3px solid ${avatarHover ? '#FFD600' : '#FEF08A'}`, transition: 'all 0.2s', position: 'relative',
                            }}>
                                {avatarUrl ? <img src={avatarUrl} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
                                {avatarHover && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                                        <CameraIcon style={{ width: 20, height: 20, color: '#fff' }} />
                                        <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#fff' }}>ALTERAR</span>
                                    </div>
                                )}
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handlePhotoChange} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111827' }}>{cfg.nome || 'Aluno'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#B89B00', fontWeight: 700, marginTop: '0.1rem' }}>ALUNO</div>
                            <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '0.1rem' }}>{cfg.email}</div>
                            {photoError && <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: '0.35rem' }}>{photoError}</p>}
                            <button onClick={() => fileInputRef.current?.click()} style={{ marginTop: '0.75rem', padding: '0.38rem 0.85rem', borderRadius: 8, background: '#FFD600', border: 'none', color: '#000', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <CameraIcon style={{ width: 13, height: 13 }} />
                                {avatarUrl ? 'Trocar foto' : 'Adicionar foto'}
                            </button>
                        </div>
                        {/* Mini-badge rank compacto — carregado do cache (sem request) */}
                        {rankBadgeInfo && (
                            <div style={{
                                marginLeft: 'auto', flexShrink: 0,
                                padding: '0.5rem 0.75rem', borderRadius: 10,
                                background: `${rankBadgeInfo.color}15`,
                                border: `1px solid ${rankBadgeInfo.color}30`,
                                textAlign: 'center',
                            }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 9, margin: '0 auto 4px',
                                    background: rankBadgeInfo.color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.9rem',
                                    color: rankBadgeInfo.rank === 'S' ? '#000' : '#fff',
                                    transition: 'transform 0.2s',
                                }}
                                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
                                    onMouseLeave={e => (e.currentTarget.style.transform = '')}
                                >
                                    {rankBadgeInfo.rank}
                                </div>
                                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: rankBadgeInfo.color }}>
                                    {rankBadgeInfo.label || 'RANK'}
                                </div>
                                <div style={{ fontSize: '0.58rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono' }}>
                                    {rankBadgeInfo.xp} XP
                                </div>
                            </div>
                        )}
                    </div>
                    <div style={SECTION}>
                        <div style={SECTION_TITLE}>Dados Pessoais</div>
                        <SettingRow label="Nome Completo" desc="Exibido no certificado e no painel">
                            <input value={cfg.nome} onChange={e => set('nome', e.target.value)} placeholder="Seu nome..." style={{ padding: '0.45rem 0.75rem', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#F9FAFB', fontSize: '0.82rem', outline: 'none', width: 220 }} />
                        </SettingRow>
                        <SettingRow label="E-mail" desc="Usado para comunicações e login (somente leitura)">
                            <input value={cfg.email} readOnly style={{ padding: '0.45rem 0.75rem', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#F3F4F6', fontSize: '0.82rem', outline: 'none', width: 220, color: '#9CA3AF' }} />
                        </SettingRow>
                    </div>
                </div>
            )}

            {/* ── NOTIFICAÇÕES ── */}
            {tab === 'notificacoes' && (
                <div className="animate-fade-in">
                    <div style={SECTION}>
                        <div style={SECTION_TITLE}>Preferências de Notificação</div>
                        <SettingRow label="Notificações por e-mail" desc="Receber alertas pelo e-mail cadastrado">
                            <Toggle checked={cfg.notifEmail} onChange={v => set('notifEmail', v)} />
                        </SettingRow>
                        <SettingRow label="Certificados Emitidos" desc="Avisar quando um certificado for gerado">
                            <Toggle checked={cfg.notifCertificado} onChange={v => set('notifCertificado', v)} />
                        </SettingRow>
                        <SettingRow label="Atualização de Inscrição" desc="Notificar ao aprovar ou reprovar inscrição">
                            <Toggle checked={cfg.notifInscricao} onChange={v => set('notifInscricao', v)} />
                        </SettingRow>
                        <SettingRow label="Alertas de Frequência" desc="Avisar quando minha frequência estiver abaixo de 75%">
                            <Toggle checked={cfg.notifFrequencia} onChange={v => set('notifFrequencia', v)} />
                        </SettingRow>
                    </div>
                </div>
            )}

            {/* ── SEGURANÇA ── */}
            {tab === 'seguranca' && (
                <div className="animate-fade-in">
                    <div style={SECTION}>
                        <div style={SECTION_TITLE}>Acesso e Segurança</div>

                        <div style={{ marginBottom: '1.35rem', paddingBottom: '1.35rem', borderBottom: '1px solid #F3F4F6' }}>
                            <div style={{ ...SECTION_TITLE, marginBottom: '0.65rem' }}>Alterar senha</div>
                            <ChangePasswordSettingsPanel />
                        </div>

                        <SettingRow stack label="Autenticação em 2 Fatores" desc="Proteja sua conta com código TOTP (Google Authenticator)">
                            {/* idle — desativado */}
                            {twoFAStep === 'idle' && !doisFatores && (
                                <button onClick={async () => {
                                    setTwoFAError(''); setTwoFALoading(true);
                                    try {
                                        const res = await api.post('/auth/2fa/generate');
                                        const qr = res.data?.qrCodeDataUrl || res.data?.qrCode || '';
                                        if (!qr) throw new Error('QR Code não retornado pelo servidor.');
                                        setQrCodeUrl(qr);
                                        setTwoFAStep('setup');
                                    } catch (e: any) {
                                        const status = e?.response?.status;
                                        if (status === 401 || status === 403) {
                                            setTwoFAError('Sessão expirada ou sem permissão. Faça login novamente.');
                                        } else {
                                            setTwoFAError(e?.response?.data?.message || e?.message || 'Erro ao gerar QR Code');
                                        }
                                    } finally { setTwoFALoading(false); }
                                }} disabled={twoFALoading} style={{ padding: '0.45rem 1.15rem', borderRadius: 10, border: '2px solid #0F172A', background: twoFALoading ? '#E5E7EB' : '#FFD600', color: twoFALoading ? '#9CA3AF' : '#000', fontWeight: 800, fontSize: '0.82rem', cursor: twoFALoading ? 'not-allowed' : 'pointer', transition: 'all 0.18s', boxShadow: twoFALoading ? 'none' : '0 4px 12px rgba(255,214,0,0.35)' }}>
                                    {twoFALoading ? 'Gerando...' : '🔐 Ativar 2FA'}
                                </button>
                            )}
                            {twoFAStep === 'idle' && !doisFatores && twoFAError && (
                                <div style={{ fontSize: '0.72rem', color: '#EF4444', width: '100%', lineHeight: 1.45 }}>
                                    {twoFAError}
                                </div>
                            )}

                            {/* setup — QR Code + TOTP (visual alinhado ao Upgrade) */}
                            {twoFAStep === 'setup' && (
                                <AuthenticatorSettingsTotpBlock
                                    variant="setup"
                                    qrCodeUrl={qrCodeUrl}
                                    value={totpToken}
                                    onChange={setTotpToken}
                                    error={twoFAError}
                                    onCancel={() => { setTwoFAStep('idle'); setTotpToken(''); setTwoFAError(''); }}
                                    onConfirm={async () => {
                                        setTwoFAError(''); setTwoFALoading(true);
                                        try {
                                            await api.post('/auth/2fa/enable', { token: totpToken });
                                            setDoisFatores(true); setTwoFAStep('active'); setTotpToken('');
                                        } catch (e: any) {
                                            setTwoFAError(e?.response?.data?.message || 'Código inválido. Tente novamente.');
                                        } finally { setTwoFALoading(false); }
                                    }}
                                    loading={twoFALoading}
                                    confirmDisabled={totpToken.length !== 6}
                                />
                            )}

                            {/* active */}
                            {(twoFAStep === 'active' || (twoFAStep === 'idle' && doisFatores)) && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '0.75rem', width: '100%', minWidth: 0 }}>
                                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: 20, background: '#DCFCE7', color: '#059669', fontWeight: 700, fontSize: '0.8rem', border: '1px solid #BBF7D0', flexShrink: 0 }}>✓ 2FA Ativo</span>
                                    <button type="button" onClick={() => { setTwoFAStep('disabling'); setTwoFAError(''); setTwoFADisableToken(''); }} style={{ padding: '0.35rem 0.8rem', borderRadius: 8, border: '1px solid #FED7AA', background: '#FFF7ED', color: '#EA580C', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', flex: '0 1 auto', minWidth: 0 }}>Desativar</button>
                                </div>
                            )}

                            {/* disabling */}
                            {twoFAStep === 'disabling' && (
                                <AuthenticatorSettingsTotpBlock
                                    variant="disabling"
                                    value={twoFADisableToken}
                                    onChange={setTwoFADisableToken}
                                    error={twoFAError}
                                    onCancel={() => { setTwoFAStep('idle'); setTwoFAError(''); setTwoFADisableToken(''); }}
                                    onConfirm={async () => {
                                        setTwoFAError(''); setTwoFALoading(true);
                                        try {
                                            await api.post('/auth/2fa/disable', { token: twoFADisableToken });
                                            setDoisFatores(false); setTwoFAStep('idle'); setTwoFADisableToken('');
                                        } catch (e: any) {
                                            setTwoFAError(e?.response?.data?.message || 'Código inválido.');
                                        } finally { setTwoFALoading(false); }
                                    }}
                                    loading={twoFALoading}
                                    confirmDisabled={twoFADisableToken.length !== 6}
                                />
                            )}
                        </SettingRow>

                        <SettingRow label="Log de Acessos" desc="Registrar histórico de entrada no portal">
                            <Toggle checked={cfg.logAcesso} onChange={v => set('logAcesso', v)} />
                        </SettingRow>
                    </div>
                    <div style={{ padding: '0.85rem 1.1rem', borderRadius: 12, background: '#FFF7ED', border: '1px solid #FED7AA', display: 'flex', gap: '0.7rem' }}>
                        <ExclamationTriangleIcon style={{ width: 18, height: 18, color: '#EA580C', flexShrink: 0, marginTop: 1 }} />
                        <div style={{ fontSize: '0.72rem', color: '#9A3412' }}>Conta segura — sem acessos suspeitos detectados.</div>
                    </div>
                </div>
            )}

            {/* ── PREFERÊNCIAS ── */}
            {tab === 'preferencias' && (
                <div className="animate-fade-in">
                    <div style={SECTION}>
                        <div style={SECTION_TITLE}>Experiência Visual</div>
                        <SettingRow label="Animações" desc="Desative em computadores mais lentos para melhor desempenho">
                            <Toggle checked={cfg.animacoes} onChange={v => set('animacoes', v)} />
                        </SettingRow>
                        <SettingRow label="Fonte Grande" desc="Aumenta o tamanho do texto para melhor leitura">
                            <Toggle checked={cfg.fonteGrande} onChange={v => set('fonteGrande', v)} />
                        </SettingRow>
                    </div>
                </div>
            )}
        </div>
    );
}
