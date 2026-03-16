'use client';

import { useState, useEffect, useRef } from 'react';
import { CameraIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api/client';
import {
    Cog6ToothIcon,
    BellIcon,
    ShieldCheckIcon,
    GlobeAltIcon,
    DocumentArrowDownIcon,
    UserCircleIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

/* ── Toggle Switch ── */
function Toggle({ checked, onChange, color = '#FFD600' }: { checked: boolean; onChange: (v: boolean) => void; color?: string }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            style={{
                width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer',
                background: checked ? color : '#E5E7EB', border: 'none', transition: 'background 0.25s',
                flexShrink: 0,
            }}
        >
            <span style={{
                position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18,
                borderRadius: '50%', background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                display: 'block',
            }} />
        </button>
    );
}

/* ── Section row ── */
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

/* ── Input inline ── */
function InlineInput({ value, onChange, placeholder, type = 'text', width = 200 }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; width?: number }) {
    const [focused, setFocused] = useState(false);
    return (
        <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
                width, padding: '0.45rem 0.75rem', borderRadius: 8, fontSize: '0.82rem', color: '#111827',
                border: `1.5px solid ${focused ? '#FFD600' : '#E5E7EB'}`,
                background: '#F9FAFB', outline: 'none',
                boxShadow: focused ? '0 0 0 3px rgba(255,214,0,0.15)' : 'none',
                transition: 'all 0.2s',
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
        />
    );
}

/* ── Select inline ── */
function InlineSelect({ value, onChange, options, width = 200 }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[]; width?: number }) {
    const [focused, setFocused] = useState(false);
    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{
                width, padding: '0.45rem 0.75rem', borderRadius: 8, fontSize: '0.82rem', color: '#111827',
                border: `1.5px solid ${focused ? '#FFD600' : '#E5E7EB'}`,
                background: '#F9FAFB', outline: 'none', cursor: 'pointer',
                boxShadow: focused ? '0 0 0 3px rgba(255,214,0,0.15)' : 'none',
                transition: 'all 0.2s',
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
        >
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    );
}

const TABS = [
    { id: 'geral', label: 'Geral', icon: Cog6ToothIcon },
    { id: 'notificacoes', label: 'Notificações', icon: BellIcon },
    { id: 'seguranca', label: 'Segurança', icon: ShieldCheckIcon },
    { id: 'sistema', label: 'Sistema', icon: GlobeAltIcon },
    { id: 'financeiro', label: 'Financeiro', icon: CurrencyDollarIcon },
    { id: 'dados', label: 'Dados', icon: DocumentArrowDownIcon },
    { id: 'perfil', label: 'Meu Perfil', icon: UserCircleIcon },
];

export default function ConfiguracoesPage() {
    const [tab, setTab] = useState('geral');
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [avatarHover, setAvatarHover] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /* 2FA state (S5-02) */
    const [twoFAStep, setTwoFAStep] = useState<'idle' | 'setup' | 'disabling' | 'active'>('idle');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [totpToken, setTotpToken] = useState('');
    const [twoFALoading, setTwoFALoading] = useState(false);
    const [twoFAError, setTwoFAError] = useState('');
    const [twoFADisableToken, setTwoFADisableToken] = useState('');

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPhotoError(null);
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            setPhotoError('Imagem muito grande. Máximo permitido: 2 MB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = ev => setAvatarUrl(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    /* Settings state */
    const [cfg, setCfg] = useState({
        // Geral
        nomeSistema: 'Sistema Qualifica MA & PI',
        emailContato: 'contato@qualifica.ma.gov.br',
        logoUrl: '',
        fusoHorario: 'America/Fortaleza',
        idioma: 'pt-BR',
        // Notificações
        notifEmail: true,
        notifNovaInscricao: true,
        notifFrequenciaBaixa: true,
        notifCertificado: true,
        notifSistema: false,
        limiteFrequencia: '75',
        // Segurança
        sessaoTimeout: '480',
        doisFatores: false,
        logAcesso: true,
        senhaComplexidade: 'media',
        // Sistema
        manutencao: false,
        backupAuto: true,
        intervalBackup: 'diario',
        versaoApi: '1.0.0',
        modoDebug: false,
        // Dados
        periodoRetencao: '365',
        exportFormato: 'xlsx',
        // Financeiro (S3-00)
        valorPassagemViagem: '270',
        valorDiariaPadrao: '120',
        kmLimitePassagemSemanal: '200',
        diasUteisReferenciaMes: '22',
        percentualAlertaCusto: '110',
        // Perfil
        nomeAdmin: '',
        emailAdmin: '',
        senhaAtual: '',
        novaSenha: '',
        confirmarSenha: '',
    });

    useEffect(() => {
        const u = localStorage.getItem('user');
        if (u) {
            const parsed = JSON.parse(u);
            setUser(parsed);
            setCfg(c => ({ ...c, nomeAdmin: parsed.name || '', emailAdmin: parsed.email || '' }));
        }
        // REQ-14: Carregar configurações salvas no backend
        api.get('/settings')
            .then(r => {
                const data = r.data;
                setCfg(c => ({
                    ...c,
                    nomeSistema: data.nomeSistema ?? c.nomeSistema,
                    emailContato: data.emailContato ?? c.emailContato,
                    fusoHorario: data.fusoHorario ?? c.fusoHorario,
                    idioma: data.idioma ?? c.idioma,
                    notifEmail: data.notifEmail ?? c.notifEmail,
                    notifNovaInscricao: data.notifNovaInscricao ?? c.notifNovaInscricao,
                    notifFrequenciaBaixa: data.notifFrequenciaBaixa ?? c.notifFrequenciaBaixa,
                    notifCertificado: data.notifCertificado ?? c.notifCertificado,
                    notifSistema: data.notifSistema ?? c.notifSistema,
                    limiteFrequencia: String(data.limiteFrequencia ?? c.limiteFrequencia),
                    sessaoTimeout: String(data.sessaoTimeout ?? c.sessaoTimeout),
                    doisFatores: data.doisFatores ?? c.doisFatores,
                    logAcesso: data.logAcesso ?? c.logAcesso,
                    senhaComplexidade: data.senhaComplexidade ?? c.senhaComplexidade,
                    manutencao: data.manutencao ?? c.manutencao,
                    backupAuto: data.backupAuto ?? c.backupAuto,
                    intervalBackup: data.intervalBackup ?? c.intervalBackup,
                    modoDebug: data.modoDebug ?? c.modoDebug,
                    periodoRetencao: String(data.periodoRetencao ?? c.periodoRetencao),
                    exportFormato: data.exportFormato ?? c.exportFormato,
                    // Financeiro (S3-00)
                    valorPassagemViagem: String(data.valorPassagemViagem ?? c.valorPassagemViagem),
                    valorDiariaPadrao: String(data.valorDiariaPadrao ?? c.valorDiariaPadrao),
                    kmLimitePassagemSemanal: String(data.kmLimitePassagemSemanal ?? c.kmLimitePassagemSemanal),
                    diasUteisReferenciaMes: String(data.diasUteisReferenciaMes ?? c.diasUteisReferenciaMes),
                    percentualAlertaCusto: String(data.percentualAlertaCusto ?? c.percentualAlertaCusto),
                }));
                setSettingsLoaded(true);
            })
            .catch(() => setSettingsLoaded(true)); // usa defaults se offline
    }, []);

    const set = (k: string, v: any) => setCfg(c => ({ ...c, [k]: v }));

    const handleSave = async () => {
        setSaveError(false);
        try {
            // Envia apenas as configs do sistema (sem dados pessoais do admin)
            await api.put('/settings', {
                nomeSistema: cfg.nomeSistema,
                emailContato: cfg.emailContato,
                fusoHorario: cfg.fusoHorario,
                idioma: cfg.idioma,
                notifEmail: cfg.notifEmail,
                notifNovaInscricao: cfg.notifNovaInscricao,
                notifFrequenciaBaixa: cfg.notifFrequenciaBaixa,
                notifCertificado: cfg.notifCertificado,
                notifSistema: cfg.notifSistema,
                limiteFrequencia: cfg.limiteFrequencia,
                sessaoTimeout: cfg.sessaoTimeout,
                doisFatores: cfg.doisFatores,
                logAcesso: cfg.logAcesso,
                senhaComplexidade: cfg.senhaComplexidade,
                manutencao: cfg.manutencao,
                backupAuto: cfg.backupAuto,
                intervalBackup: cfg.intervalBackup,
                modoDebug: cfg.modoDebug,
                periodoRetencao: cfg.periodoRetencao,
                exportFormato: cfg.exportFormato,
                // Financeiro (S3-00)
                valorPassagemViagem: parseFloat(cfg.valorPassagemViagem),
                valorDiariaPadrao: parseFloat(cfg.valorDiariaPadrao),
                kmLimitePassagemSemanal: parseInt(cfg.kmLimitePassagemSemanal),
                diasUteisReferenciaMes: parseInt(cfg.diasUteisReferenciaMes),
                percentualAlertaCusto: parseFloat(cfg.percentualAlertaCusto),
            });
            setSaved(true);
            // Atualizar nome/email do admin no localStorage para Header e Sidebar refletirem
            const stored = localStorage.getItem('user');
            if (stored) {
                const userObj = JSON.parse(stored);
                if (cfg.nomeAdmin) userObj.name = cfg.nomeAdmin;
                if (cfg.emailAdmin) userObj.email = cfg.emailAdmin;
                localStorage.setItem('user', JSON.stringify(userObj));
                window.dispatchEvent(new Event('userUpdated'));
            }
            setTimeout(() => setSaved(false), 2800);
        } catch {
            setSaveError(true);
            setTimeout(() => setSaveError(false), 3500);
        }
    };


    const SECTION_STYLE: React.CSSProperties = {
        background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB',
        padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        marginBottom: '1rem',
    };

    const SECTION_TITLE: React.CSSProperties = {
        fontFamily: 'Orbitron', fontWeight: 800, fontSize: '0.7rem',
        letterSpacing: '0.12em', color: '#B89B00',
        textTransform: 'uppercase', marginBottom: '0.1rem',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }} className="animate-fade-in">

            {/* ── HEADER ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontFamily: 'Orbitron', fontSize: '2rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '0.3rem' }}>CONFIGURAÇÕES</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Gerencie as preferências e configurações do sistema</p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    {saved && (
                        <div className="animate-scale-in" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', borderRadius: 9, background: '#DCFCE7', border: '1px solid #BBF7D0', color: '#059669', fontSize: '0.78rem', fontWeight: 700 }}>
                            <CheckCircleIcon style={{ width: 14, height: 14 }} />
                            Salvo com sucesso!
                        </div>
                    )}
                    {saveError && (
                        <div className="animate-scale-in" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', borderRadius: 9, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.78rem', fontWeight: 700 }}>
                            <ExclamationTriangleIcon style={{ width: 14, height: 14 }} />
                            Erro ao salvar. Tente novamente.
                        </div>
                    )}
                    <button onClick={handleSave} className="btn-primary" disabled={!settingsLoaded}>
                        {!settingsLoaded ? 'Carregando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>

            {/* ── TABS ── */}
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', padding: '0.5rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                {TABS.map(t => {
                    const Icon = t.icon;
                    const active = tab === t.id;
                    return (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.45rem',
                                padding: '0.5rem 1rem', borderRadius: 10, border: 'none', cursor: 'pointer',
                                fontSize: '0.8rem', fontWeight: active ? 700 : 500,
                                background: active ? '#FFD600' : 'transparent',
                                color: active ? '#000' : '#6B7280',
                                transition: 'all 0.2s',
                                boxShadow: active ? '0 2px 8px rgba(255,214,0,0.3)' : 'none',
                            }}
                            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; }}
                            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                            <Icon style={{ width: 15, height: 15 }} />
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* ── TAB: GERAL ── */}
            {tab === 'geral' && (
                <div className="animate-fade-in">
                    <div style={SECTION_STYLE}>
                        <div style={SECTION_TITLE}>Identidade do Sistema</div>
                        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.75rem' }}>Informações básicas do programa exibidas aos usuários</p>
                        <SettingRow label="Nome do Sistema" desc="Exibido no topo do portal e nos certificados">
                            <InlineInput value={cfg.nomeSistema} onChange={v => set('nomeSistema', v)} placeholder="Nome..." width={260} />
                        </SettingRow>
                        <SettingRow label="E-mail de Contato" desc="Usado em notificações automáticas enviadas pelo sistema">
                            <InlineInput value={cfg.emailContato} onChange={v => set('emailContato', v)} type="email" placeholder="contato@..." width={220} />
                        </SettingRow>
                        <SettingRow label="Fuso Horário" desc="Horário padrão para registros, logs e notificações">
                            <InlineSelect value={cfg.fusoHorario} onChange={v => set('fusoHorario', v)} width={200} options={[
                                { label: 'Brasília (UTC-3)', value: 'America/Sao_Paulo' },
                                { label: 'Fortaleza (UTC-3)', value: 'America/Fortaleza' },
                                { label: 'Manaus (UTC-4)', value: 'America/Manaus' },
                            ]} />
                        </SettingRow>
                        <SettingRow label="Idioma" desc="Idioma padrão da interface">
                            <InlineSelect value={cfg.idioma} onChange={v => set('idioma', v)} width={180} options={[
                                { label: 'Português (BR)', value: 'pt-BR' },
                                { label: 'English', value: 'en-US' },
                            ]} />
                        </SettingRow>
                    </div>
                </div>
            )}

            {/* ── TAB: NOTIFICAÇÕES ── */}
            {tab === 'notificacoes' && (
                <div className="animate-fade-in">
                    <div style={SECTION_STYLE}>
                        <div style={SECTION_TITLE}>Canais de Notificação</div>
                        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.75rem' }}>Configure como e quando o sistema envia alertas</p>
                        <SettingRow label="Notificações por E-mail" desc="Ativar envio de e-mails automáticos do sistema">
                            <Toggle checked={cfg.notifEmail} onChange={v => set('notifEmail', v)} />
                        </SettingRow>
                        <SettingRow label="Nova Inscrição" desc="Alertar quando um aluno se inscreve em um curso">
                            <Toggle checked={cfg.notifNovaInscricao} onChange={v => set('notifNovaInscricao', v)} />
                        </SettingRow>
                        <SettingRow label="Frequência Baixa" desc="Alertar quando frequência do aluno cai abaixo do mínimo">
                            <Toggle checked={cfg.notifFrequenciaBaixa} onChange={v => set('notifFrequenciaBaixa', v)} />
                        </SettingRow>
                        <SettingRow label="Limite de Frequência (%)" desc="Percentual mínimo de presença antes do alerta">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <input type="range" min="50" max="100" value={cfg.limiteFrequencia}
                                    onChange={e => set('limiteFrequencia', e.target.value)}
                                    style={{ width: 120, accentColor: '#FFD600' }} />
                                <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1rem', color: '#B89B00', minWidth: 40, textAlign: 'right' }}>{cfg.limiteFrequencia}%</span>
                            </div>
                        </SettingRow>
                        <SettingRow label="Certificados Emitidos" desc="Notificar quando um certificado é gerado">
                            <Toggle checked={cfg.notifCertificado} onChange={v => set('notifCertificado', v)} />
                        </SettingRow>
                        <SettingRow label="Alertas do Sistema" desc="Notificações de manutenção, backups e erros críticos">
                            <Toggle checked={cfg.notifSistema} onChange={v => set('notifSistema', v)} />
                        </SettingRow>
                    </div>
                </div>
            )}

            {/* ── TAB: SEGURANÇA ── */}
            {tab === 'seguranca' && (
                <div className="animate-fade-in">
                    <div style={SECTION_STYLE}>
                        <div style={SECTION_TITLE}>Controle de Acesso</div>
                        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.75rem' }}>Regras de sessão e autenticação dos usuários</p>
                        <SettingRow label="Timeout de Sessão (min)" desc="Tempo de inatividade antes do logout automático">
                            <InlineSelect value={cfg.sessaoTimeout} onChange={v => set('sessaoTimeout', v)} width={180} options={[
                                { label: '30 minutos', value: '30' },
                                { label: '1 hora', value: '60' },
                                { label: '4 horas', value: '240' },
                                { label: '8 horas', value: '480' },
                                { label: 'Nunca', value: '0' },
                            ]} />
                        </SettingRow>
                        <SettingRow label="Autenticação em 2 Fatores" desc="Proteja sua conta com código TOTP (Google Authenticator)">
                            {/* Estado: idle — 2FA desativado */}
                            {twoFAStep === 'idle' && !cfg.doisFatores && (
                                <button
                                    onClick={async () => {
                                        setTwoFAError('');
                                        setTwoFALoading(true);
                                        try {
                                            const res = await api.post('/auth/2fa/generate');
                                            setQrCodeUrl(res.data.qrCodeDataUrl || res.data.qrCode || '');
                                            setTwoFAStep('setup');
                                        } catch (e: any) {
                                            setTwoFAError(e?.response?.data?.message || 'Erro ao gerar QR Code');
                                        } finally {
                                            setTwoFALoading(false);
                                        }
                                    }}
                                    disabled={twoFALoading}
                                    style={{
                                        padding: '0.45rem 1.1rem', borderRadius: 8, border: '1.5px solid #0891B2',
                                        background: twoFALoading ? '#E5E7EB' : '#F0F9FF',
                                        color: '#0891B2', fontWeight: 700, fontSize: '0.82rem',
                                        cursor: twoFALoading ? 'not-allowed' : 'pointer', transition: 'all 0.18s',
                                    }}
                                >
                                    {twoFALoading ? 'Gerando...' : '🔐 Ativar 2FA'}
                                </button>
                            )}

                            {/* Estado: setup — Mostrar QR Code */}
                            {twoFAStep === 'setup' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end' }}>
                                    {qrCodeUrl && (
                                        <div style={{ textAlign: 'center', padding: '0.75rem', background: '#fff', borderRadius: 10, border: '2px solid #BAE6FD' }}>
                                            <img src={qrCodeUrl} alt="QR Code 2FA" style={{ width: 140, height: 140, display: 'block' }} />
                                            <div style={{ fontSize: '0.68rem', color: '#6B7280', marginTop: 6 }}>Escaneie com Google Authenticator ou Authy</div>
                                        </div>
                                    )}
                                    <input
                                        type="text" inputMode="numeric" maxLength={6}
                                        placeholder="Código de 6 dígitos"
                                        value={totpToken}
                                        onChange={e => setTotpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        style={{
                                            width: 160, padding: '0.5rem 0.75rem', borderRadius: 8,
                                            border: '1.5px solid #BAE6FD', background: '#F0F9FF',
                                            fontSize: '1.1rem', letterSpacing: '0.3em', textAlign: 'center',
                                            color: '#0891B2', fontWeight: 700, outline: 'none',
                                        }}
                                    />
                                    {twoFAError && <div style={{ fontSize: '0.72rem', color: '#EF4444' }}>{twoFAError}</div>}
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => { setTwoFAStep('idle'); setTotpToken(''); setTwoFAError(''); }}
                                            style={{ padding: '0.4rem 0.9rem', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#6B7280', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                                        >Cancelar</button>
                                        <button
                                            disabled={totpToken.length !== 6 || twoFALoading}
                                            onClick={async () => {
                                                setTwoFAError('');
                                                setTwoFALoading(true);
                                                try {
                                                    await api.post('/auth/2fa/enable', { token: totpToken });
                                                    setCfg(c => ({ ...c, doisFatores: true }));
                                                    setTwoFAStep('active');
                                                    setTotpToken('');
                                                } catch (e: any) {
                                                    setTwoFAError(e?.response?.data?.message || 'Código inválido. Tente novamente.');
                                                } finally {
                                                    setTwoFALoading(false);
                                                }
                                            }}
                                            style={{
                                                padding: '0.4rem 1rem', borderRadius: 8, border: 'none',
                                                background: totpToken.length !== 6 || twoFALoading ? '#E5E7EB' : '#0891B2',
                                                color: totpToken.length !== 6 || twoFALoading ? '#9CA3AF' : '#fff',
                                                fontWeight: 700, fontSize: '0.82rem',
                                                cursor: totpToken.length !== 6 || twoFALoading ? 'not-allowed' : 'pointer',
                                                transition: 'all 0.18s',
                                            }}
                                        >{twoFALoading ? 'Ativando...' : 'Confirmar e Ativar'}</button>
                                    </div>
                                </div>
                            )}

                            {/* Estado: active — 2FA ativado */}
                            {(twoFAStep === 'active' || (twoFAStep === 'idle' && cfg.doisFatores)) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: 20, background: '#DCFCE7', color: '#059669', fontWeight: 700, fontSize: '0.8rem', border: '1px solid #BBF7D0' }}>
                                        ✓ 2FA Ativo
                                    </span>
                                    <button
                                        onClick={() => { setTwoFAStep('disabling'); setTwoFAError(''); setTwoFADisableToken(''); }}
                                        style={{ padding: '0.35rem 0.8rem', borderRadius: 8, border: '1px solid #FED7AA', background: '#FFF7ED', color: '#EA580C', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}
                                    >Desativar</button>
                                </div>
                            )}

                            {/* Estado: disabling — confirmar desativação */}
                            {twoFAStep === 'disabling' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'flex-end' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Digite o código para confirmar desativação</div>
                                    <input
                                        type="text" inputMode="numeric" maxLength={6}
                                        placeholder="Código de 6 dígitos"
                                        value={twoFADisableToken}
                                        onChange={e => setTwoFADisableToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        style={{
                                            width: 160, padding: '0.5rem 0.75rem', borderRadius: 8,
                                            border: '1.5px solid #FED7AA', background: '#FFF7ED',
                                            fontSize: '1.1rem', letterSpacing: '0.3em', textAlign: 'center',
                                            color: '#EA580C', fontWeight: 700, outline: 'none',
                                        }}
                                    />
                                    {twoFAError && <div style={{ fontSize: '0.72rem', color: '#EF4444' }}>{twoFAError}</div>}
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => { setTwoFAStep('idle'); setTwoFAError(''); setTwoFADisableToken(''); }}
                                            style={{ padding: '0.4rem 0.9rem', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#6B7280', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                                        >Cancelar</button>
                                        <button
                                            disabled={twoFADisableToken.length !== 6 || twoFALoading}
                                            onClick={async () => {
                                                setTwoFAError('');
                                                setTwoFALoading(true);
                                                try {
                                                    await api.post('/auth/2fa/disable', { token: twoFADisableToken });
                                                    setCfg(c => ({ ...c, doisFatores: false }));
                                                    setTwoFAStep('idle');
                                                    setTwoFADisableToken('');
                                                } catch (e: any) {
                                                    setTwoFAError(e?.response?.data?.message || 'Código inválido.');
                                                } finally {
                                                    setTwoFALoading(false);
                                                }
                                            }}
                                            style={{
                                                padding: '0.4rem 1rem', borderRadius: 8, border: 'none',
                                                background: twoFADisableToken.length !== 6 || twoFALoading ? '#E5E7EB' : '#EF4444',
                                                color: twoFADisableToken.length !== 6 || twoFALoading ? '#9CA3AF' : '#fff',
                                                fontWeight: 700, fontSize: '0.82rem',
                                                cursor: twoFADisableToken.length !== 6 || twoFALoading ? 'not-allowed' : 'pointer',
                                            }}
                                        >{twoFALoading ? 'Desativando...' : 'Confirmar Desativação'}</button>
                                    </div>
                                </div>
                            )}
                        </SettingRow>
                        <SettingRow label="Log de Acessos" desc="Registrar data, hora e IP de todos os logins">
                            <Toggle checked={cfg.logAcesso} onChange={v => set('logAcesso', v)} color="#059669" />
                        </SettingRow>
                        <SettingRow label="Complexidade de Senha" desc="Nível mínimo exigido para senhas de usuários">
                            <InlineSelect value={cfg.senhaComplexidade} onChange={v => set('senhaComplexidade', v)} width={180} options={[
                                { label: 'Baixa (mín. 6 chars)', value: 'baixa' },
                                { label: 'Média (mín. 8 chars + número)', value: 'media' },
                                { label: 'Alta (mín. 10 chars + especial)', value: 'alta' },
                            ]} />
                        </SettingRow>
                    </div>

                    {/* Security alert */}
                    <div style={{ padding: '0.85rem 1.1rem', borderRadius: 12, background: '#FFF7ED', border: '1px solid #FED7AA', display: 'flex', gap: '0.7rem', alignItems: 'flex-start' }}>
                        <ExclamationTriangleIcon style={{ width: 18, height: 18, color: '#EA580C', flexShrink: 0, marginTop: 1 }} />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#C2410C', marginBottom: '0.2rem' }}>Última atividade suspeita</div>
                            <div style={{ fontSize: '0.72rem', color: '#9A3412' }}>Nenhum acesso suspeito detectado nos últimos 30 dias.</div>
                        </div>
                        <span style={{ marginLeft: 'auto', padding: '0.2rem 0.65rem', borderRadius: 100, background: '#DCFCE7', color: '#059669', fontSize: '0.65rem', fontWeight: 700, border: '1px solid #BBF7D0', flexShrink: 0 }}>Sistema Seguro</span>
                    </div>
                </div>
            )}

            {/* ── TAB: SISTEMA ── */}
            {tab === 'sistema' && (
                <div className="animate-fade-in">
                    <div style={SECTION_STYLE}>
                        <div style={SECTION_TITLE}>Operação do Sistema</div>
                        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.75rem' }}>Configurações de funcionamento do servidor e API</p>
                        <SettingRow label="Modo Manutenção" desc="Bloqueia acesso de alunos e exibe mensagem de indisponibilidade">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <Toggle checked={cfg.manutencao} onChange={v => set('manutencao', v)} color="#EA580C" />
                                {cfg.manutencao && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#EA580C' }}>ATIVO</span>}
                            </div>
                        </SettingRow>
                        <SettingRow label="Backup Automático" desc="Salvar cópia do banco de dados automaticamente">
                            <Toggle checked={cfg.backupAuto} onChange={v => set('backupAuto', v)} color="#059669" />
                        </SettingRow>
                        <SettingRow label="Intervalo de Backup" desc="Frequência dos snapshots automáticos">
                            <InlineSelect value={cfg.intervalBackup} onChange={v => set('intervalBackup', v)} width={180} options={[
                                { label: 'Diário (00:00)', value: 'diario' },
                                { label: 'Semanal (Domingo)', value: 'semanal' },
                                { label: 'Quinzenal', value: 'quinzenal' },
                                { label: 'Mensal', value: 'mensal' },
                            ]} />
                        </SettingRow>
                        <SettingRow label="Modo Debug" desc="Ativar logs detalhados no console (apenas desenvolvimento)">
                            <Toggle checked={cfg.modoDebug} onChange={v => set('modoDebug', v)} color="#7C3AED" />
                        </SettingRow>
                    </div>

                    {/* System info */}
                    <div style={{ background: '#FFFDE7', borderRadius: 14, border: '1px solid #FEF08A', padding: '1rem 1.25rem' }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B89B00', marginBottom: '0.75rem' }}>Informações do Sistema</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                            {[
                                ['Versão da API', cfg.versaoApi],
                                ['Framework', 'Next.js 14'],
                                ['Backend', 'NestJS + Prisma'],
                                ['Banco de Dados', 'PostgreSQL 15'],
                                ['Ambiente', 'Produção'],
                                ['Último Deploy', new Date().toLocaleDateString('pt-BR')],
                            ].map(([k, v]) => (
                                <div key={k} style={{ padding: '0.5rem 0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.7)', border: '1px solid #FEF08A' }}>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#B89B00', opacity: 0.7, marginBottom: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k}</div>
                                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>{v}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB: FINANCEIRO ── */}
            {tab === 'financeiro' && (
                <div className="animate-fade-in">
                    <div style={SECTION_STYLE}>
                        <div style={SECTION_TITLE}>Parâmetros Financeiros</div>
                        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.75rem' }}>
                            Valores usados no cálculo de custo estimado de rotas. Alterações aplicadas imediatamente.
                        </p>
                        <SettingRow label="Valor da passagem por viagem (R$)" desc="Custo de cada viagem de instrutor CLT (ida e volta)">
                            <InlineInput value={cfg.valorPassagemViagem} onChange={v => set('valorPassagemViagem', v)} type="number" placeholder="270.00" width={140} />
                        </SettingRow>
                        <SettingRow label="Diária padrão do instrutor (R$)" desc="Sugerida automaticamente ao vincular instrutor sem dailyCost cadastrado">
                            <InlineInput value={cfg.valorDiariaPadrao} onChange={v => set('valorDiariaPadrao', v)} type="number" placeholder="120.00" width={140} />
                        </SettingRow>
                        <SettingRow label="Distância limite passagem semanal (km)" desc="≤ este valor = passagem semanal · acima = passagem quinzenal">
                            <InlineInput value={cfg.kmLimitePassagemSemanal} onChange={v => set('kmLimitePassagemSemanal', v)} type="number" placeholder="200" width={120} />
                        </SettingRow>
                        <SettingRow label="Dias úteis de referência / mês" desc="Base para cálculo de salário proporcional CLT (padrão: 22)">
                            <InlineInput value={cfg.diasUteisReferenciaMes} onChange={v => set('diasUteisReferenciaMes', v)} type="number" placeholder="22" width={100} />
                        </SettingRow>
                        <SettingRow label="Alerta de custo excessivo (%)" desc="Gera notificação quando custo real ultrapassar este percentual do estimado">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <input type="range" min="100" max="200" step="5" value={cfg.percentualAlertaCusto}
                                    onChange={e => set('percentualAlertaCusto', e.target.value)}
                                    style={{ width: 120, accentColor: '#FFD600' }} />
                                <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1rem', color: '#B89B00', minWidth: 52, textAlign: 'right' }}>{cfg.percentualAlertaCusto}%</span>
                            </div>
                        </SettingRow>
                    </div>

                    <div style={{ padding: '0.85rem 1.1rem', borderRadius: 12, background: '#FFFDE7', border: '1px solid #FEF08A', display: 'flex', gap: '0.7rem', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '1.1rem' }}>💡</span>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#B89B00', marginBottom: '0.2rem' }}>Como esses parâmetros funcionam</div>
                            <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                                O custo estimado de cada Período de Cursos é calculado usando esses valores.
                                Para instrutores CLT: <strong>diárias + salário proporcional + passagens</strong>.
                                Altere e clique em &quot;Salvar Alterações&quot; para aplicar.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB: DADOS ── */}
            {tab === 'dados' && (
                <div className="animate-fade-in">
                    <div style={SECTION_STYLE}>
                        <div style={SECTION_TITLE}>Retenção e Exportação</div>
                        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.75rem' }}>Controle como os dados são armazenados e exportados</p>
                        <SettingRow label="Retenção de Logs (dias)" desc="Após este prazo, logs antigos são removidos automaticamente">
                            <InlineSelect value={cfg.periodoRetencao} onChange={v => set('periodoRetencao', v)} width={180} options={[
                                { label: '90 dias', value: '90' },
                                { label: '180 dias', value: '180' },
                                { label: '1 ano', value: '365' },
                                { label: '2 anos', value: '730' },
                                { label: 'Nunca excluir', value: '0' },
                            ]} />
                        </SettingRow>
                        <SettingRow label="Formato de Exportação" desc="Formato padrão para download de relatórios e listas">
                            <InlineSelect value={cfg.exportFormato} onChange={v => set('exportFormato', v)} width={180} options={[
                                { label: 'Excel (.xlsx)', value: 'xlsx' },
                                { label: 'CSV (.csv)', value: 'csv' },
                                { label: 'PDF (.pdf)', value: 'pdf' },
                            ]} />
                        </SettingRow>
                    </div>

                    {/* Quick export actions */}
                    <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B89B00', marginBottom: '1rem' }}>Exportação Rápida</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                            {[
                                { label: 'Lista de Alunos', desc: 'Todos os alunos cadastrados', color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD' },
                                { label: 'Relatório de Frequência', desc: 'Por turma e período', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
                                { label: 'Certificados Emitidos', desc: 'Histórico completo', color: '#B89B00', bg: '#FFFDE7', border: '#FEF08A' },
                                { label: 'Cursos e Turmas', desc: 'Catálogo do programa', color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
                                { label: 'Inscrições', desc: 'Por período selecionado', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
                                { label: 'Frota de Carretas', desc: 'Dados de infraestrutura', color: '#374151', bg: '#F9FAFB', border: '#E5E7EB' },
                            ].map(item => (
                                <button key={item.label}
                                    style={{ padding: '0.75rem 1rem', borderRadius: 10, border: `1px solid ${item.border}`, background: item.bg, cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 16px ${item.color}22`; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                                >
                                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: item.color, marginBottom: '0.2rem' }}>{item.label}</div>
                                    <div style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{item.desc}</div>
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.65rem', fontWeight: 700, color: item.color, opacity: 0.75 }}>↓ Exportar {cfg.exportFormato.toUpperCase()}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB: PERFIL ── */}
            {tab === 'perfil' && (
                <div className="animate-fade-in">
                    {/* Avatar card with photo upload */}
                    <div style={{ background: '#FFFDE7', borderRadius: 14, border: '1px solid #FEF08A', padding: '1.25rem 1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>

                        {/* Clickable avatar */}
                        <div style={{ position: 'relative', flexShrink: 0 }}
                            onMouseEnter={() => setAvatarHover(true)}
                            onMouseLeave={() => setAvatarHover(false)}
                        >
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    width: 80, height: 80, borderRadius: 20, overflow: 'hidden', cursor: 'pointer',
                                    background: avatarUrl ? 'transparent' : '#FFD600',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.4rem', color: '#000',
                                    border: `3px solid ${avatarHover ? '#FFD600' : '#FEF08A'}`,
                                    boxShadow: avatarHover ? '0 0 0 4px rgba(255,214,0,0.25)' : 'none',
                                    transition: 'all 0.2s',
                                    flexShrink: 0,
                                }}
                            >
                                {avatarUrl
                                    ? <img src={avatarUrl} alt="Foto de perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : (cfg.nomeAdmin || 'AD').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
                                }

                                {/* Hover overlay */}
                                {avatarHover && (
                                    <div style={{
                                        position: 'absolute', inset: 0, borderRadius: 17,
                                        background: 'rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center', gap: '0.2rem',
                                    }}>
                                        <CameraIcon style={{ width: 20, height: 20, color: '#fff' }} />
                                        <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#fff', letterSpacing: '0.06em' }}>ALTERAR</span>
                                    </div>
                                )}
                            </div>

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                style={{ display: 'none' }}
                                onChange={handlePhotoChange}
                            />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111827' }}>{cfg.nomeAdmin || 'Administrador'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#B89B00', fontWeight: 700, marginTop: '0.1rem' }}>{user?.role || 'ADMIN'}</div>
                            <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '0.1rem' }}>{cfg.emailAdmin || 'Sem e-mail'}</div>

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                                <button onClick={() => fileInputRef.current?.click()}
                                    style={{ padding: '0.38rem 0.85rem', borderRadius: 8, background: '#FFD600', border: 'none', color: '#000', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', transition: 'all 0.18s' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEF08A'}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FFD600'}
                                >
                                    <CameraIcon style={{ width: 13, height: 13 }} />
                                    {avatarUrl ? 'Trocar foto' : 'Adicionar foto'}
                                </button>
                                {avatarUrl && (
                                    <button onClick={() => { setAvatarUrl(null); setPhotoError(null); }}
                                        style={{ padding: '0.38rem 0.85rem', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.18s' }}
                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEE2E2'}
                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FEF2F2'}
                                    >Remover</button>
                                )}
                                <span style={{ fontSize: '0.68rem', color: '#9CA3AF', alignSelf: 'center' }}>PNG, JPG, WebP · max 2 MB</span>
                            </div>
                            {photoError && <p style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: 600, marginTop: '0.35rem' }}>{photoError}</p>}
                        </div>
                    </div>

                    <div style={SECTION_STYLE}>
                        <div style={SECTION_TITLE}>Dados Pessoais</div>
                        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.75rem' }}>Atualize seu nome e e-mail de acesso</p>
                        <SettingRow label="Nome completo" desc="Exibido no sistema e nos certificados">
                            <InlineInput value={cfg.nomeAdmin} onChange={v => set('nomeAdmin', v)} placeholder="Seu nome..." width={240} />
                        </SettingRow>
                        <SettingRow label="E-mail de acesso" desc="Usado para login e recuperação de senha">
                            <InlineInput value={cfg.emailAdmin} onChange={v => set('emailAdmin', v)} type="email" placeholder="seu@email.com" width={240} />
                        </SettingRow>
                    </div>

                    <div style={SECTION_STYLE}>
                        <div style={SECTION_TITLE}>Alterar Senha</div>
                        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.75rem' }}>Deixe em branco para não alterar</p>
                        <SettingRow label="Senha atual" desc="">
                            <InlineInput value={cfg.senhaAtual} onChange={v => set('senhaAtual', v)} type="password" placeholder="••••••••" width={200} />
                        </SettingRow>
                        <SettingRow label="Nova senha" desc="">
                            <InlineInput value={cfg.novaSenha} onChange={v => set('novaSenha', v)} type="password" placeholder="••••••••" width={200} />
                        </SettingRow>
                        <SettingRow label="Confirmar nova senha" desc="">
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                                <InlineInput value={cfg.confirmarSenha} onChange={v => set('confirmarSenha', v)} type="password" placeholder="••••••••" width={200} />
                                {cfg.novaSenha && cfg.confirmarSenha && cfg.novaSenha !== cfg.confirmarSenha && (
                                    <span style={{ fontSize: '0.68rem', color: '#DC2626', fontWeight: 600 }}>As senhas não coincidem</span>
                                )}
                                {cfg.novaSenha && cfg.confirmarSenha && cfg.novaSenha === cfg.confirmarSenha && (
                                    <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600 }}>✓ Senhas coincidem</span>
                                )}
                            </div>
                        </SettingRow>
                    </div>
                </div>
            )}
        </div>
    );
}
