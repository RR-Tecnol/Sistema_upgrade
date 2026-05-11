'use client';

import { useState } from 'react';
import { useEnrollmentStore } from '@/stores/useEnrollmentStore';
import api from '@/lib/api/client';
import { ExclamationCircleIcon } from '@heroicons/react/24/solid';
import { EnrollmentDocumentsPreview } from '@/components/enrollment/EnrollmentDocumentsPreview';
import { CreationSuccessScreen } from '@/components/CreationSuccessScreen';

/** Nest/class-validator pode devolver message como string | string[] | objeto */
function formatEnrollmentApiError(err: any): string {
    const d = err?.response?.data;
    if (d == null) return err?.message || 'Erro ao enviar inscrição. Por favor, tente novamente.';
    const m = d.message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m)) return m.map((x) => String(x)).join(' • ');
    if (m && typeof m === 'object') {
        return Object.entries(m)
            .flatMap(([key, v]) => (Array.isArray(v) ? v.map((x) => `${key}: ${x}`) : [`${key}: ${v}`]))
            .join(' • ');
    }
    if (typeof d === 'string') return d;
    return 'Erro ao enviar inscrição. Por favor, tente novamente.';
}

export default function Step8Confirmation() {
    const { classId, formData, prevStep, reset, updatePersonalData } = useEnrollmentStore();
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);
    const [error, setError] = useState('');
    const [protocol, setProtocol] = useState('');
    /** Resposta da API: aluno já existia (mesmo CPF) — não foi criada conta nova, só nova inscrição */
    const [reusedExistingStudentAccount, setReusedExistingStudentAccount] = useState(false);
    /** Quando o formulário foi retomado do armazenamento local, a senha não é persistida por segurança. */
    const [passwordFallback, setPasswordFallback] = useState('');

    const handleSubmit = async () => {
        setError('');

        const password =
            String(formData.personalData?.password ?? '').trim()
            || String(passwordFallback ?? '').trim();
        if (password.length < 6) {
            setError(
                'A senha da conta é obrigatória (mínimo 6 caracteres). Se você recarregou a página durante o preenchimento, informe a senha abaixo ou volte ao passo 1.',
            );
            return;
        }

        setSubmitting(true);

        // Strip empty string enum fields — envia undefined em vez de '' para não falhar @IsEnum
        const clean = (v: any) => (v === '' || v === null || v === undefined) ? undefined : v;

        try {
            if (!String(formData.personalData?.password ?? '').trim() && passwordFallback) {
                updatePersonalData({ password });
            }

            const payload: Record<string, any> = {
                classId,
                fullName: formData.personalData.fullName,
                socialName: formData.personalData.socialName,
                cpf: formData.personalData.cpf,
                birthDate: formData.personalData.birthDate,
                gender: clean(formData.personalData.gender),
                raceColor: clean(formData.personalData.raceColor),
                maritalStatus: clean(formData.personalData.maritalStatus),
                motherName: formData.personalData.motherName,
                fatherName: formData.personalData.fatherName,
                nationality: formData.personalData.nationality,
                birthCity: formData.personalData.birthCity,
                birthState: formData.personalData.birthState,
                password,
                email: formData.contact.email,
                phone: formData.contact.phone,
                hasWhatsApp: formData.contact.hasWhatsApp ?? true,
                phoneAlt: formData.contact.phoneAlt,
                allowWhatsAppContact: formData.contact.allowWhatsAppContact ?? true,
                allowEmailContact: formData.contact.allowEmailContact ?? true,
                cep: formData.address.cep,
                street: formData.address.street,
                number: formData.address.number,
                complement: formData.address.complement,
                neighborhood: formData.address.neighborhood,
                city: formData.address.city,
                state: formData.address.state,
                zone: clean(formData.address.zone),
                educationLevel: clean(formData.socioeconomic.educationLevel),
                employmentStatus: clean(formData.socioeconomic.employmentStatus),
                familyIncome: clean(formData.socioeconomic.familyIncome),
                familyMembersCount: formData.socioeconomic.familyMembersCount ?? 1,
                socialProgram: clean(formData.socioeconomic.socialProgram),
                hasDisability: formData.socioeconomic.hasDisability ?? false,
                disabilityType: clean(formData.socioeconomic.disabilityType),
                disabilityAdaptation: formData.socioeconomic.disabilityAdaptation,
                publicSchoolOnly: formData.socioeconomic.publicSchoolOnly,
                previousQualification: formData.professional.previousQualification,
                professionalInterest: formData.professional.professionalInterest,
                careerGoal: clean(formData.professional.careerGoal),
                howHeardAbout: formData.professional.howHeardAbout,
                motivation: formData.professional.motivation,
                termsAccepted: !!formData.terms.termsAccepted,
                imageUseAuthorization: !!formData.terms.imageUseAuthorization,
                attendanceCommitment: !!formData.terms.attendanceCommitment,
                dataProcessingConsent: !!formData.terms.dataProcessingConsent,
                documents: formData.documents,
            };

            // Remove chaves undefined para não poluir o payload
            Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

            const response = await api.post('/enrollments/public', payload);
            setProtocol(response.data.protocol ?? '');
            setReusedExistingStudentAccount(!!response.data.reusedExistingStudentAccount);
            setSuccess(true);

        } catch (err: any) {
            const status = err.response?.status;
            const msgText = formatEnrollmentApiError(err);
            const lower = msgText.toLowerCase();

            const alreadyInClass =
                status === 409
                || lower.includes('já inscrito')
                || lower.includes('já cadastrado nesta turma')
                || lower.includes('aluno já inscrito');

            if (alreadyInClass) {
                setAlreadyEnrolled(true);
            } else {
                setError(msgText);
            }
        } finally {
            setSubmitting(false);
        }
    };


    if (alreadyEnrolled) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.1rem', fontWeight: 900, color: '#FBBF24', marginBottom: '0.5rem' }}>
                    VOCÊ JÁ ESTÁ INSCRITO
                </h2>
                <p style={{ color: '#9CA3AF', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                    Identificamos que seu CPF ou e-mail já está cadastrado nesta turma.<br />
                    Acesse o portal do aluno para acompanhar sua inscrição.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a href="/login" onClick={() => reset()} style={{ padding: '0.75rem 1.75rem', borderRadius: 12, background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', color: '#000', fontWeight: 800, fontSize: '0.88rem', textDecoration: 'none' }}>
                        🔐 Acessar Portal do Aluno →
                    </a>
                    <a href="/cursos" onClick={() => reset()} style={{ padding: '0.75rem 1.5rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#9CA3AF', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none' }}>
                        Ver outros cursos
                    </a>
                </div>
            </div>
        );
    }

    if (success) {
        const email = formData.contact.email || '';
        return (
            <CreationSuccessScreen
                variant="dark"
                alinhamento="center"
                title="INSCRIÇÃO ENVIADA!"
                secondaryLine="Sua inscrição foi recebida e está em análise."
                protocol={protocol || undefined}
                redirectMessage="Use os botões abaixo para acessar o portal do aluno ou explorar outros cursos."
                minHeight="auto"
                linksRodape={(
                    <>
                        <a href="/login" onClick={() => reset()} style={{ padding: '0.75rem 1.75rem', borderRadius: 12, background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', color: '#000', fontWeight: 800, fontSize: '0.88rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 20px rgba(251,191,36,0.35)' }}>
                            {reusedExistingStudentAccount ? '🔐 Entrar no Portal do Aluno →' : '🔐 Fazer login no Portal do Aluno →'}
                        </a>
                        <a href="/cursos" onClick={() => reset()} style={{ padding: '0.75rem 1.5rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#9CA3AF', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none' }}>
                            Ver outros cursos
                        </a>
                    </>
                )}
            >
                {reusedExistingStudentAccount ? (
                    <div style={{ padding: '1rem 1.25rem', borderRadius: 12, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.28)', marginBottom: '1rem', textAlign: 'left' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>📋 Inscrição na sua conta existente</div>
                        <p style={{ fontSize: '0.82rem', color: '#D1D5DB', margin: '0 0 8px' }}>
                            Você <strong style={{ color: '#E5E7EB' }}>já tinha cadastro</strong> no sistema (mesmo CPF). <strong style={{ color: '#E5E7EB' }}>Nenhuma conta nova foi criada.</strong>
                        </p>
                        <p style={{ fontSize: '0.78rem', color: '#9CA3AF', margin: '0 0 8px' }}>
                            Esta inscrição foi associada ao seu perfil e aparece em <strong style={{ color: '#FBBF24' }}>Minhas inscrições</strong> no Portal do Aluno, como <strong style={{ color: '#FBBF24' }}>pendente de análise</strong>.
                        </p>
                        <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: 0 }}>
                            <strong style={{ color: '#9CA3AF' }}>Conta:</strong> {email} — use seu <strong style={{ color: '#9CA3AF' }}>e-mail e senha habituais</strong> para entrar.
                        </p>
                    </div>
                ) : (
                    <div style={{ padding: '1rem 1.25rem', borderRadius: 12, background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.25)', marginBottom: '1rem', textAlign: 'left' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>🔑 Sua conta foi criada!</div>
                        <p style={{ fontSize: '0.82rem', color: '#D1D5DB', margin: '0 0 4px' }}>
                            <strong style={{ color: '#9CA3AF' }}>E-mail de acesso:</strong> {email}
                        </p>
                        <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: 0 }}>
                            Use o e-mail acima e a senha criada para acessar o Portal do Aluno — onde você acompanha inscrição, frequência e certificados.
                        </p>
                    </div>
                )}
                <div style={{ padding: '1rem 1.25rem', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '0.5rem', textAlign: 'left' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>📋 Próximos passos</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem', color: '#6B7280' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ color: '#34D399' }}>✓</span> Inscrição enviada e aguardando análise</div>
                        {reusedExistingStudentAccount ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ color: '#60A5FA' }}>👤</span> Após o login, abra <strong style={{ color: '#9CA3AF' }}>Minhas inscrições</strong> para ver o status desta turma</div>
                        ) : null}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ color: '#FBBF24' }}>⏳</span> Você será notificado sobre aprovação ou pendências</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ color: '#60A5FA' }}>📚</span> Em caso de aprovação, apresente-se no primeiro dia de aula</div>
                    </div>
                </div>
            </CreationSuccessScreen>
        );
    }

    const SummaryCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
        <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', padding: '0.9rem 1.1rem' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FBBF24', marginBottom: '0.65rem' }}>{title}</p>
            <div style={{ fontSize: '0.82rem', color: '#9CA3AF', lineHeight: 1.6 }}>
                {children}
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: '0 0 0.25rem' }}>Confirmação de Dados</h2>

            {/* Info banner */}
            <div style={{ padding: '0.8rem 1rem', borderRadius: 10, background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)' }}>
                <p style={{ fontSize: '0.8rem', color: '#93C5FD', margin: 0 }}>
                    📋 <strong>Revise seus dados:</strong> Confira todas as informações antes de enviar. Após o envio, não será possível alterar os dados.
                </p>
            </div>

            {!String(formData.personalData?.password ?? '').trim() && (
                <div style={{ padding: '0.85rem 1rem', borderRadius: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FBBF24', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Senha da conta (não salva no navegador)
                    </p>
                    <p style={{ fontSize: '0.78rem', color: '#9CA3AF', margin: '0 0 0.65rem' }}>
                        Por segurança, a senha não é armazenada ao recarregar a página. Digite novamente a mesma senha do passo 1 para concluir a inscrição.
                    </p>
                    <input
                        type="password"
                        autoComplete="new-password"
                        value={passwordFallback}
                        onChange={(e) => setPasswordFallback(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        style={{
                            width: '100%',
                            maxWidth: 320,
                            padding: '0.65rem 0.9rem',
                            borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.12)',
                            background: 'rgba(255,255,255,0.04)',
                            color: '#fff',
                            fontSize: '0.85rem',
                            boxSizing: 'border-box',
                        }}
                    />
                </div>
            )}

            {/* Summary sections */}
            <SummaryCard title="Dados Pessoais">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                    <p><span style={{ color: '#6B7280' }}>Nome:</span> <strong style={{ color: '#D1D5DB' }}>{formData.personalData.fullName}</strong></p>
                    <p><span style={{ color: '#6B7280' }}>CPF:</span> <strong style={{ color: '#D1D5DB' }}>{formData.personalData.cpf}</strong></p>
                    <p><span style={{ color: '#6B7280' }}>Nascimento:</span> <strong style={{ color: '#D1D5DB' }}>{formData.personalData.birthDate}</strong></p>
                    <p><span style={{ color: '#6B7280' }}>Gênero:</span> <strong style={{ color: '#D1D5DB' }}>{formData.personalData.gender}</strong></p>
                </div>
            </SummaryCard>

            <SummaryCard title="Contato">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                    <p><span style={{ color: '#6B7280' }}>E-mail:</span> <strong style={{ color: '#D1D5DB' }}>{formData.contact.email}</strong></p>
                    <p><span style={{ color: '#6B7280' }}>Telefone:</span> <strong style={{ color: '#D1D5DB' }}>{formData.contact.phone}</strong></p>
                </div>
            </SummaryCard>

            <SummaryCard title="Endereço">
                <p style={{ color: '#9CA3AF' }}>
                    {formData.address.street}, {formData.address.number} — {formData.address.neighborhood}<br />
                    {formData.address.city} / {formData.address.state} — CEP: {formData.address.cep}
                </p>
            </SummaryCard>

            <SummaryCard title="Objetivo Profissional">
                <p><span style={{ color: '#6B7280' }}>Meta:</span> <strong style={{ color: '#D1D5DB' }}>{formData.professional.careerGoal}</strong></p>
            </SummaryCard>

            <EnrollmentDocumentsPreview documents={formData.documents} variant="dark" />

            {/* Error */}
            {error && (
                <div style={{ padding: '0.85rem 1rem', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                    <ExclamationCircleIcon style={{ width: 20, height: 20, color: '#F87171', flexShrink: 0, marginTop: 1 }} />
                    <div>
                        <p style={{ color: '#F87171', fontWeight: 700, fontSize: '0.85rem', margin: '0 0 3px' }}>Erro ao enviar inscrição</p>
                        <p style={{ color: '#FCA5A5', fontSize: '0.78rem', margin: 0 }}>{error}</p>
                    </div>
                </div>
            )}

            {/* Nav */}
            <div className="nav-row">
                <button className="btn-back" onClick={prevStep} disabled={submitting}>← Voltar</button>
                <button
                    className="btn-next"
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    {submitting ? (
                        <>
                            <div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                            Enviando...
                        </>
                    ) : (
                        '✓ Confirmar e Enviar'
                    )}
                </button>
            </div>
        </div>
    );
}
