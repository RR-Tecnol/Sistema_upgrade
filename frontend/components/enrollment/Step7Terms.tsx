'use client';

import { useState } from 'react';
import { useEnrollmentStore } from '@/stores/useEnrollmentStore';

export default function Step7Terms() {
    const { formData, updateTerms, nextStep, prevStep } = useEnrollmentStore();
    const [data, setData] = useState(formData.terms);
    const [error, setError] = useState('');

    const handleChange = (field: string, value: boolean) => {
        setData((prev) => ({ ...prev, [field]: value }));
        setError('');
    };

    const handleNext = () => {
        if (!data.termsAccepted || !data.imageUseAuthorization || !data.attendanceCommitment || !data.dataProcessingConsent) {
            setError('Você deve aceitar todos os termos para continuar');
            return;
        }
        updateTerms(data);
        nextStep();
    };

    const LABEL: React.CSSProperties = { display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: '0.45rem' };

    const TermCard = ({ title, children, id, field, checked }: { title: string; children: React.ReactNode; id: string; field: keyof typeof data; checked: boolean }) => (
        <div style={{
            borderRadius: 14,
            border: `1px solid ${checked ? 'rgba(5,150,105,0.4)' : 'rgba(255,255,255,0.07)'}`,
            background: checked ? 'rgba(5,150,105,0.04)' : 'rgba(255,255,255,0.02)',
            padding: '1.1rem 1.25rem',
            transition: 'all 0.25s',
        }}>
            <h3 style={{ fontSize: '0.82rem', fontWeight: 800, color: checked ? '#34D399' : '#E5E7EB', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {checked ? '✅' : '⚪'} {title}
            </h3>
            <div style={{ color: '#6B7280', fontSize: '0.78rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                {children}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', paddingTop: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <input
                    type="checkbox"
                    id={id}
                    checked={checked}
                    onChange={(e) => handleChange(field, e.target.checked)}
                    className="enroll-checkbox"
                    style={{ marginTop: 2 }}
                />
                <label htmlFor={id} style={{ color: '#D1D5DB', fontSize: '0.84rem', cursor: 'pointer', lineHeight: 1.4 }}>
                    {field === 'termsAccepted' && <>Li e aceito os <strong>Termos e Condições</strong> do programa</>}
                    {field === 'dataProcessingConsent' && <>Autorizo o <strong>tratamento dos meus dados pessoais</strong> conforme descrito acima</>}
                    {field === 'imageUseAuthorization' && <>Autorizo o <strong>uso da minha imagem</strong> para divulgação do programa</>}
                    {field === 'attendanceCommitment' && <>Comprometo-me a <strong>manter a frequência mínima</strong> exigida</>}
                </label>
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: '0 0 0.25rem' }}>Termos e Autorizações</h2>

            {/* Warning */}
            <div style={{ padding: '0.8rem 1rem', borderRadius: 10, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <p style={{ fontSize: '0.8rem', color: '#FCD34D', margin: 0 }}>
                    ⚠️ <strong>Importante:</strong> Leia atentamente todos os termos antes de aceitar. Você deve concordar com todos para prosseguir com a inscrição.
                </p>
            </div>

            {/* Terms card */}
            <TermCard title="Termos e Condições do Programa" id="termsAccepted" field="termsAccepted" checked={data.termsAccepted || false}>
                <p><strong style={{ color: '#9CA3AF' }}>1. OBJETIVO:</strong> O Programa Qualifica Maranhão e Piauí oferece cursos de qualificação profissional gratuitos.</p>
                <p style={{ marginTop: '0.5rem' }}><strong style={{ color: '#9CA3AF' }}>2. COMPROMISSOS:</strong> Frequentar no mínimo 75% das aulas, participar das atividades, respeitar professores e colegas.</p>
                <p style={{ marginTop: '0.5rem' }}><strong style={{ color: '#9CA3AF' }}>3. CERTIFICAÇÃO:</strong> Emitido apenas para alunos que cumprirem os requisitos de frequência e aproveitamento.</p>
                <p style={{ marginTop: '0.5rem' }}><strong style={{ color: '#9CA3AF' }}>4. DESISTÊNCIA:</strong> Em caso de desistência, comunicar formalmente a coordenação do curso.</p>
            </TermCard>

            {/* LGPD */}
            <TermCard title="Consentimento de Dados (LGPD)" id="dataProcessingConsent" field="dataProcessingConsent" checked={data.dataProcessingConsent || false}>
                <p>De acordo com a LGPD (Lei nº 13.709/2018), seus dados pessoais serão usados exclusivamente para: processamento da inscrição, comunicação sobre o curso, emissão de certificados e estatísticas anonimizadas do programa.</p>
            </TermCard>

            {/* Image use */}
            <TermCard title="Autorização de Uso de Imagem" id="imageUseAuthorization" field="imageUseAuthorization" checked={data.imageUseAuthorization || false}>
                <p>Durante o curso, poderão ser realizadas fotografias e filmagens para fins de divulgação do programa em materiais institucionais, redes sociais e relatórios.</p>
            </TermCard>

            {/* Attendance */}
            <TermCard title="Compromisso de Frequência" id="attendanceCommitment" field="attendanceCommitment" checked={data.attendanceCommitment || false}>
                <p>Para obter o certificado, é necessário ter no mínimo <strong style={{ color: '#FBBF24' }}>75% de frequência</strong> nas aulas. Faltas não justificadas podem resultar no desligamento do programa.</p>
            </TermCard>

            {/* Error */}
            {error && (
                <div style={{ padding: '0.8rem 1rem', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
                    <p style={{ color: '#F87171', fontSize: '0.82rem', margin: 0 }}>❌ {error}</p>
                </div>
            )}

            {/* Nav */}
            <div className="nav-row">
                <button className="btn-back" onClick={prevStep}>← Voltar</button>
                <button className="btn-next" onClick={handleNext}>Próximo →</button>
            </div>
        </div>
    );
}
