'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/client';
import {
    UserIcon,
    EnvelopeIcon,
    PhoneIcon,
    MapPinIcon,
    KeyIcon,
} from '@heroicons/react/24/outline';

interface StudentProfile {
    id: string;
    cpf: string;
    rg: string;
    birthDate: string;
    gender: string;
    user: { name: string; email: string; phone: string };
    contact: { email: string; phone: string; phoneAlt?: string };
    address: { street: string; number: string; neighborhood: string; city: string; state: string; cep: string };
}

// Toast inline para o portal do aluno (sem precisar do provider do admin)
function useLocalToast() {
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const show = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };
    const ToastEl = toast ? (
        <div style={{
            position: 'fixed', top: 20, right: 20, zIndex: 9999,
            background: toast.type === 'success'
                ? 'linear-gradient(135deg,#059669,#047857)'
                : 'linear-gradient(135deg,#DC2626,#B91C1C)',
            color: '#fff', padding: '0.75rem 1.1rem', borderRadius: 12,
            fontWeight: 600, fontSize: '0.85rem', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            animation: 'toastIn 0.25s ease',
        }}>
            <span>{toast.type === 'success' ? '✓' : '✕'}</span>
            {toast.msg}
        </div>
    ) : null;
    return { show, ToastEl };
}

export default function StudentProfile() {
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const { show: showToast, ToastEl } = useLocalToast();

    useEffect(() => { fetchProfile(); }, []);

    const fetchProfile = async () => {
        try {
            const response = await api.get('/students/me');
            setProfile(response.data);
        } catch (error) {
            /* silencioso — perfil exibe dados locais como fallback */
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showToast('As senhas não coincidem', 'error');
            return;
        }

        try {
            await api.patch('/students/me/password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            });

            showToast('Senha alterada com sucesso!', 'success');
            setShowPasswordForm(false);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            /* silencioso — mensagem de erro exibida via estado */
            showToast('Erro ao alterar senha. Verifique a senha atual.', 'error');
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 40, height: 40, border: '3px solid #FFD600', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite', margin: '0 auto 1rem' }} />
                    <p style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Carregando perfil...</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return <div style={{ padding: '2rem', color: '#9CA3AF' }}>Perfil não encontrado</div>;
    }

    const fields = [
        { label: 'Nome Completo', value: profile.user.name, icon: <UserIcon style={{ width: 16 }} /> },
        { label: 'CPF', value: profile.cpf, mono: true },
        { label: 'RG', value: profile.rg, mono: true },
        { label: 'Data de Nascimento', value: new Date(profile.birthDate).toLocaleDateString('pt-BR') },
        { label: 'Gênero', value: profile.gender },
    ];

    const contactFields = [
        { label: 'E-mail', value: profile.contact?.email || profile.user.email },
        { label: 'Telefone', value: profile.contact?.phone || profile.user.phone, mono: true },
        ...(profile.contact?.phoneAlt ? [{ label: 'Tel. Alternativo', value: profile.contact.phoneAlt, mono: true }] : []),
    ];

    const addressFields = [
        { label: 'Rua', value: `${profile.address?.street}, ${profile.address?.number}`, span: true },
        { label: 'Bairro', value: profile.address?.neighborhood },
        { label: 'CEP', value: profile.address?.cep, mono: true },
        { label: 'Cidade', value: profile.address?.city },
        { label: 'Estado', value: profile.address?.state },
    ];

    const Section = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.8rem', fontWeight: 900, letterSpacing: '0.1em', color: '#111827', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {icon} {title}
            </h2>
            {children}
        </div>
    );

    return (
        <>
            {ToastEl}
            <style>{`@keyframes toastIn { from { opacity:0; transform:translateX(10px); } to { opacity:1; transform:translateX(0); } }`}</style>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                <div>
                    <h1 className="gradient-text" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.8rem', fontWeight: 900, letterSpacing: '0.08em', margin: 0 }}>
                        MEU PERFIL
                    </h1>
                    <p style={{ color: '#9CA3AF', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                        Visualize suas informações cadastradas no sistema
                    </p>
                </div>

                {/* Pessoal */}
                <Section title="DADOS PESSOAIS" icon="👤">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                        {fields.map((f, i) => (
                            <div key={i}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>{f.label}</div>
                                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#111827', fontFamily: f.mono ? 'JetBrains Mono, monospace' : 'inherit' }}>{f.value}</div>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Contato */}
                <Section title="CONTATO" icon="📧">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                        {contactFields.map((f, i) => (
                            <div key={i}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>{f.label}</div>
                                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#111827', fontFamily: f.mono ? 'JetBrains Mono, monospace' : 'inherit' }}>{f.value}</div>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Endereço */}
                <Section title="ENDEREÇO" icon="📍">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                        {addressFields.map((f, i) => (
                            <div key={i} style={{ gridColumn: f.span ? '1 / -1' : undefined }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>{f.label}</div>
                                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#111827', fontFamily: f.mono ? 'JetBrains Mono, monospace' : 'inherit' }}>{f.value}</div>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Segurança */}
                <Section title="SEGURANÇA" icon="🔑">
                    {!showPasswordForm ? (
                        <button
                            onClick={() => setShowPasswordForm(true)}
                            className="btn-primary"
                            style={{ width: 'auto' }}
                        >
                            🔒 Alterar Senha
                        </button>
                    ) : (
                        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 400 }}>
                            {[
                                { label: 'Senha Atual', key: 'currentPassword' },
                                { label: 'Nova Senha', key: 'newPassword' },
                                { label: 'Confirmar Nova Senha', key: 'confirmPassword' },
                            ].map(({ label, key }) => (
                                <div key={key}>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                                        {label}
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordData[key as keyof typeof passwordData]}
                                        onChange={e => setPasswordData(p => ({ ...p, [key]: e.target.value }))}
                                        className="form-input"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            ))}
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button type="button" onClick={() => { setShowPasswordForm(false); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                                    style={{ flex: 1, padding: '0.7rem', borderRadius: 10, border: '1.5px solid #E5E7EB', background: 'transparent', color: '#6B7280', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary" style={{ flex: 1.5, justifyContent: 'center' }}>
                                    Salvar Senha
                                </button>
                            </div>
                        </form>
                    )}
                </Section>
            </div>
        </>
    );
}
