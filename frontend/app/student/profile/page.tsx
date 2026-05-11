'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import api from '@/lib/api/client';
import {
    UserIcon,
    EnvelopeIcon,
    PhoneIcon,
    MapPinIcon,
} from '@heroicons/react/24/outline';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';

type ConsentFlagKey =
    | 'termsAccepted'
    | 'dataProcessingConsent'
    | 'imageUseAuthorization'
    | 'attendanceCommitment'
    | 'privacyPolicyAccepted';

interface LegalConsentRow {
    id: string;
    recordedAt: string;
    enrollmentId?: string | null;
    termsAccepted: boolean;
    dataProcessingConsent: boolean;
    imageUseAuthorization: boolean;
    attendanceCommitment: boolean;
    privacyPolicyAccepted: boolean;
}

interface StudentProfile {
    id: string;
    cpf: string;
    rg: string;
    birthDate: string;
    gender: string;
    user: { name: string; email: string; phone: string };
    contact: { email: string; phone: string; phoneAlt?: string };
    address: { street: string; number: string; neighborhood: string; city: string; state: string; cep: string };
    legalConsents?: LegalConsentRow[];
}

function Section({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
    return (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.8rem', fontWeight: 900, letterSpacing: '0.1em', color: '#111827', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {icon} {title}
            </h2>
            {children}
        </div>
    );
}

export default function StudentProfile() {
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [loading, setLoading] = useState(true);

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

    const consentLabels: { key: ConsentFlagKey; label: string }[] = [
        { key: 'termsAccepted', label: 'Termos e condições do programa' },
        { key: 'dataProcessingConsent', label: 'Tratamento de dados pessoais (LGPD)' },
        { key: 'imageUseAuthorization', label: 'Uso de imagem para divulgação' },
        { key: 'attendanceCommitment', label: 'Compromisso de frequência mínima' },
        { key: 'privacyPolicyAccepted', label: 'Política de privacidade / consentimento associado' },
    ];

    const latestConsent = profile.legalConsents?.[0];

    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                <AdminHeaderHero
                    title="MEU PERFIL"
                    subtitle="Visualize suas informações cadastradas no sistema"
                    badge="PORTAL DO ALUNO"
                />

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

                {/* LGPD — consentimentos ligados ao perfil */}
                <Section title="CONSENTIMENTOS (LGPD)" icon="📜">
                    {!latestConsent ? (
                        <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: 0 }}>
                            Ainda não há registo de consentimentos associado ao seu perfil. Após concluir uma inscrição com aceite dos termos, o registo aparecerá aqui.
                        </p>
                    ) : (
                        <>
                            <p style={{ fontSize: '0.72rem', color: '#6B7280', margin: '0 0 1rem' }}>
                                Último registo em{' '}
                                <strong style={{ color: '#111827' }}>
                                    {new Date(latestConsent.recordedAt).toLocaleString('pt-BR')}
                                </strong>
                                {latestConsent.enrollmentId ? ' (vinculado a uma inscrição)' : ''}.
                            </p>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {consentLabels.map(({ key, label }) => (
                                    <li
                                        key={key}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '0.55rem 0.75rem',
                                            borderRadius: 10,
                                            background: '#F9FAFB',
                                            border: '1px solid #E5E7EB',
                                            fontSize: '0.8rem',
                                            color: '#374151',
                                        }}
                                    >
                                        <span>{label}</span>
                                        <span style={{ fontWeight: 800, color: latestConsent[key] ? '#059669' : '#DC2626' }}>
                                            {latestConsent[key] ? 'Sim' : 'Não'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            {(profile.legalConsents?.length ?? 0) > 1 && (
                                <p style={{ fontSize: '0.7rem', color: '#9CA3AF', margin: '0.75rem 0 0' }}>
                                    Existem {profile.legalConsents!.length - 1} registo(s) anterior(es); o mais recente é exibido acima.
                                </p>
                            )}
                        </>
                    )}
                </Section>

                {/* Segurança — troca de senha e 2FA ficam em Configurações */}
                <Section title="SEGURANÇA" icon="🔑">
                    <p style={{ fontSize: '0.88rem', color: '#4B5563', lineHeight: 1.55, margin: '0 0 1rem' }}>
                        Para <strong>alterar a senha</strong> ou configurar <strong>autenticação em dois fatores</strong>, use o menu{' '}
                        <strong>Configurações</strong>, aba <strong>Segurança</strong>.
                    </p>
                    <Link
                        href="/student/configuracoes?tab=seguranca"
                        className="btn-primary"
                        style={{ display: 'inline-flex', width: 'auto', textDecoration: 'none', alignItems: 'center' }}
                    >
                        Abrir Configurações — Segurança
                    </Link>
                </Section>
            </div>
        </>
    );
}
