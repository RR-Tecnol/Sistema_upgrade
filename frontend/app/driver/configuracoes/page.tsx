'use client';

import { useState, useEffect, useRef } from 'react';
import { CameraIcon, UserCircleIcon, BellIcon, ShieldCheckIcon, Cog6ToothIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api/client';
import { useAuthStore } from '@/stores/useAuthStore';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AuthenticatorSettingsTotpBlock from '@/components/auth/AuthenticatorSettingsTotpBlock';
import ChangePasswordSettingsPanel from '@/components/auth/ChangePasswordSettingsPanel';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button type="button" onClick={() => onChange(!checked)} style={{ width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer', background: checked ? '#FFD600' : '#E5E7EB', border: 'none', transition: 'background 0.25s', flexShrink: 0 }}>
            <span style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)', display: 'block' }} />
        </button>
    );
}
function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 0', borderBottom: '1px solid #F3F4F6', gap: '1.5rem' }}>
            <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>{label}</div>
                {desc && <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '0.15rem' }}>{desc}</div>}
            </div>
            <div style={{ flexShrink: 0 }}>{children}</div>
        </div>
    );
}

const TABS = [
    { id: 'perfil', label: 'Meu Perfil', icon: UserCircleIcon },
    { id: 'notificacoes', label: 'Notificações', icon: BellIcon },
    { id: 'seguranca', label: 'Segurança', icon: ShieldCheckIcon },
    { id: 'preferencias', label: 'Preferências', icon: Cog6ToothIcon },
];
const SECTION: React.CSSProperties = { background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '1rem' };
const SECTION_TITLE: React.CSSProperties = { fontFamily: 'Orbitron', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.12em', color: '#B89B00', textTransform: 'uppercase', marginBottom: '0.75rem' };

export default function DriverConfiguracoes() {
    const { user: authUser, token, setUser: setAuthUser } = useAuthStore();
    const [tab, setTab] = useState('perfil');
    const [user, setUser] = useState<any>(null);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [avatarHover, setAvatarHover] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /* 2FA */
    const [twoFAStep, setTwoFAStep] = useState<'idle' | 'setup' | 'disabling' | 'active'>('idle');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [totpToken, setTotpToken] = useState('');
    const [twoFALoading, setTwoFALoading] = useState(false);
    const [twoFAError, setTwoFAError] = useState('');
    const [twoFADisableToken, setTwoFADisableToken] = useState('');
    const [doisFatores, setDoisFatores] = useState(false);

    const [cfg, setCfg] = useState({ nome: '', email: '', notifEmail: true, notifViagemAtribuida: true, notifReembolsos: true, logAcesso: true, animacoes: true });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const t = new URLSearchParams(window.location.search).get('tab');
        if (t === 'seguranca') setTab('seguranca');
    }, []);

    useEffect(() => {
        // Sempre busca /users/me para garantir que o nome real do perfil logado é exibido
        api.get('/users/me').then(res => {
            const p = res.data;
            setUser(p);
            setCfg(c => ({ ...c, nome: p.name || '', email: p.email || '' }));
            setDoisFatores(!!p.twoFactorEnabled);
            // BUG-07: não usar localStorage.setItem('user') — Zustand persiste em auth-storage
        }).catch(() => {
            if (authUser) { setUser(authUser); setCfg(c => ({ ...c, nome: authUser.name || '', email: authUser.email || '' })); }
        });
        // Carrega preferências separadamente
        api.get('/users/me/preferences').then(res => {
            if (res.data) {
                setCfg(c => ({ ...c, animacoes: res.data.animacoes ?? true }));
            }
        }).catch(() => { /* silencioso — usa defaults */ });
    }, []);

    const set = (k: string, v: any) => setCfg(c => ({ ...c, [k]: v }));

    // BUG-ANIMACOES-NO-REALTIME: aplica imediatamente no DOM sem esperar salvar
    const handleAnimacoesChange = (v: boolean) => {
        set('animacoes', v);
        if (v) document.body.classList.remove('no-animations');
        else   document.body.classList.add('no-animations');
    };

    const handleSave = async () => {
        try {
            await Promise.all([
                api.patch('/users/me', { name: cfg.nome }),
                api.patch('/users/me/preferences', {
                    animacoes: cfg.animacoes,
                }),
            ]);
            if (authUser && token) { setAuthUser({ ...authUser, name: cfg.nome }, token); }
            window.dispatchEvent(new Event('userUpdated'));
            setSaved(true); setTimeout(() => setSaved(false), 2800);
        } catch { setSaveError(true); setTimeout(() => setSaveError(false), 3500); }
    };

    const initials = user?.name ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : 'MT';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }} className="animate-fade-in">
            <AdminHeaderHero
                title="CONFIGURAÇÕES"
                subtitle="Personalize sua experiência no portal do motorista"
                badge="MOTORISTA"
                rightSlot={(
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                        {saved && <div className="animate-scale-in" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', borderRadius: 9, background: '#DCFCE7', border: '1px solid #BBF7D0', color: '#059669', fontSize: '0.78rem', fontWeight: 700 }}><CheckCircleIcon style={{ width: 14, height: 14 }} /> Salvo!</div>}
                        {saveError && <div className="animate-scale-in" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', borderRadius: 9, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.78rem', fontWeight: 700 }}><ExclamationTriangleIcon style={{ width: 14, height: 14 }} /> Erro ao salvar.</div>}
                        <button onClick={handleSave} className="btn-primary">Salvar Alterações</button>
                    </div>
                )}
            />

            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: '0.5rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                {TABS.map(t => { const Icon = t.icon; const active = tab === t.id; return (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.5rem 1rem', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: active ? 700 : 500, background: active ? '#FFD600' : 'transparent', color: active ? '#000' : '#6B7280', transition: 'all 0.2s', boxShadow: active ? '0 2px 8px rgba(255,214,0,0.3)' : 'none' }}>
                        <Icon style={{ width: 15, height: 15 }} />{t.label}
                    </button>
                ); })}
            </div>

            {tab === 'perfil' && (
                <div className="animate-fade-in">
                    <div style={{ ...SECTION, background: '#FFFDE7', border: '1px solid #FEF08A', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ position: 'relative', flexShrink: 0 }} onMouseEnter={() => setAvatarHover(true)} onMouseLeave={() => setAvatarHover(false)}>
                            <div onClick={() => fileInputRef.current?.click()} style={{ width: 80, height: 80, borderRadius: 20, overflow: 'hidden', cursor: 'pointer', background: avatarUrl ? 'transparent' : '#FFD600', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.4rem', color: '#000', border: `3px solid ${avatarHover ? '#FFD600' : '#FEF08A'}`, transition: 'all 0.2s', position: 'relative' }}>
                                {avatarUrl ? <img src={avatarUrl} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
                                {avatarHover && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}><CameraIcon style={{ width: 20, height: 20, color: '#fff' }} /><span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#fff' }}>ALTERAR</span></div>}
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 2097152) { setPhotoError('Máximo 2 MB.'); return; } const r = new FileReader(); r.onload = ev => setAvatarUrl(ev.target?.result as string); r.readAsDataURL(f); }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111827' }}>{cfg.nome || 'Motorista'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#B89B00', fontWeight: 700, marginTop: '0.1rem' }}>MOTORISTA</div>
                            <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '0.1rem' }}>{cfg.email}</div>
                            {photoError && <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: '0.35rem' }}>{photoError}</p>}
                            <button onClick={() => fileInputRef.current?.click()} style={{ marginTop: '0.75rem', padding: '0.38rem 0.85rem', borderRadius: 8, background: '#FFD600', border: 'none', color: '#000', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><CameraIcon style={{ width: 13, height: 13 }} />{avatarUrl ? 'Trocar foto' : 'Adicionar foto'}</button>
                        </div>
                    </div>
                    <div style={SECTION}>
                        <div style={SECTION_TITLE}>Dados Pessoais</div>
                        <SettingRow label="Nome Completo" desc="Exibido no dashboard e nas viagens">
                            <input value={cfg.nome} onChange={e => set('nome', e.target.value)} placeholder="Seu nome..." style={{ padding: '0.45rem 0.75rem', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#F9FAFB', fontSize: '0.82rem', outline: 'none', width: 220 }} />
                        </SettingRow>
                        <SettingRow label="E-mail" desc="Usado para login (somente leitura)">
                            <input value={cfg.email} readOnly style={{ padding: '0.45rem 0.75rem', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#F3F4F6', fontSize: '0.82rem', outline: 'none', width: 220, color: '#9CA3AF' }} />
                        </SettingRow>
                    </div>
                </div>
            )}

            {tab === 'notificacoes' && (
                <div className="animate-fade-in">
                    <div style={SECTION}>
                        <div style={SECTION_TITLE}>Preferências de Notificação</div>
                        <SettingRow label="Notificações por e-mail"><Toggle checked={cfg.notifEmail} onChange={v => set('notifEmail', v)} /></SettingRow>
                        <SettingRow label="Viagem Atribuída" desc="Avisar quando uma nova viagem for designada para mim"><Toggle checked={cfg.notifViagemAtribuida} onChange={v => set('notifViagemAtribuida', v)} /></SettingRow>
                        <SettingRow label="Atualizações de Reembolsos" desc="Notificar sobre aprovação ou rejeição"><Toggle checked={cfg.notifReembolsos} onChange={v => set('notifReembolsos', v)} /></SettingRow>
                    </div>
                </div>
            )}

            {tab === 'seguranca' && (
                <div className="animate-fade-in">
                    <div style={SECTION}>
                        <div style={SECTION_TITLE}>Acesso e Segurança</div>
                        <div style={{ marginBottom: '1.35rem', paddingBottom: '1.35rem', borderBottom: '1px solid #F3F4F6' }}>
                            <div style={{ ...SECTION_TITLE, marginBottom: '0.65rem' }}>Alterar senha</div>
                            <ChangePasswordSettingsPanel />
                        </div>
                        <SettingRow label="Autenticação em 2 Fatores" desc="Proteja sua conta com código TOTP (Google Authenticator)">
                            {twoFAStep === 'idle' && !doisFatores && (
                                <button onClick={async () => { setTwoFAError(''); setTwoFALoading(true); try { const res = await api.post('/auth/2fa/generate'); const qr = res.data?.qrCodeDataUrl || res.data?.qrCode || ''; if (!qr) throw new Error('QR Code não retornado pelo servidor.'); setQrCodeUrl(qr); setTwoFAStep('setup'); } catch (e: any) { const status = e?.response?.status; if (status === 401 || status === 403) setTwoFAError('Sessão expirada ou sem permissão. Faça login novamente.'); else setTwoFAError(e?.response?.data?.message || e?.message || 'Erro ao gerar QR Code'); } finally { setTwoFALoading(false); } }} disabled={twoFALoading} style={{ padding: '0.45rem 1.15rem', borderRadius: 10, border: '2px solid #0F172A', background: twoFALoading ? '#E5E7EB' : '#FFD600', color: twoFALoading ? '#9CA3AF' : '#000', fontWeight: 800, fontSize: '0.82rem', cursor: twoFALoading ? 'not-allowed' : 'pointer', boxShadow: twoFALoading ? 'none' : '0 4px 12px rgba(255,214,0,0.35)' }}>
                                    {twoFALoading ? 'Gerando...' : '🔐 Ativar 2FA'}
                                </button>
                            )}
                            {twoFAStep === 'idle' && !doisFatores && twoFAError && (
                                <div style={{ marginTop: '0.45rem', fontSize: '0.72rem', color: '#EF4444', maxWidth: 280, textAlign: 'right' }}>{twoFAError}</div>
                            )}
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
                                            setTwoFAError(e?.response?.data?.message || 'Inválido.');
                                        } finally { setTwoFALoading(false); }
                                    }}
                                    loading={twoFALoading}
                                    confirmDisabled={totpToken.length !== 6}
                                />
                            )}
                            {(twoFAStep === 'active' || (twoFAStep === 'idle' && doisFatores)) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: 20, background: '#DCFCE7', color: '#059669', fontWeight: 700, fontSize: '0.8rem', border: '1px solid #BBF7D0' }}>✓ 2FA Ativo</span>
                                    <button onClick={() => { setTwoFAStep('disabling'); setTwoFAError(''); setTwoFADisableToken(''); }} style={{ padding: '0.35rem 0.8rem', borderRadius: 8, border: '1px solid #FED7AA', background: '#FFF7ED', color: '#EA580C', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>Desativar</button>
                                </div>
                            )}
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
                                            setTwoFAError(e?.response?.data?.message || 'Inválido.');
                                        } finally { setTwoFALoading(false); }
                                    }}
                                    loading={twoFALoading}
                                    confirmDisabled={twoFADisableToken.length !== 6}
                                />
                            )}
                        </SettingRow>
                        <SettingRow label="Log de Acessos"><Toggle checked={cfg.logAcesso} onChange={v => set('logAcesso', v)} /></SettingRow>
                    </div>
                    <div style={{ padding: '0.85rem 1.1rem', borderRadius: 12, background: '#FFF7ED', border: '1px solid #FED7AA', display: 'flex', gap: '0.7rem' }}>
                        <ExclamationTriangleIcon style={{ width: 18, height: 18, color: '#EA580C', flexShrink: 0, marginTop: 1 }} />
                        <div style={{ fontSize: '0.72rem', color: '#9A3412' }}>Conta segura — sem acessos suspeitos detectados.</div>
                    </div>
                </div>
            )}

            {tab === 'preferencias' && (
                <div className="animate-fade-in">
                    <div style={SECTION}>
                        <div style={SECTION_TITLE}>Experiência Visual</div>
                        <SettingRow label="Animações" desc="Desative em dispositivos mais lentos"><Toggle checked={cfg.animacoes} onChange={handleAnimacoesChange} /></SettingRow>
                    </div>
                </div>
            )}
        </div>
    );
}
