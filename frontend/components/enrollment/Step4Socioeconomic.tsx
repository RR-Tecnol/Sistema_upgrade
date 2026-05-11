'use client';

import { useState, useEffect } from 'react';
import { useEnrollmentStore } from '@/stores/useEnrollmentStore';

// Valores válidos conforme enum Prisma (backend) — mantidos aqui para sanitização
const VALID_EDUCATION = ['NO_FORMAL_EDUCATION','ELEMENTARY_INCOMPLETE','ELEMENTARY_COMPLETE','HIGH_SCHOOL_INCOMPLETE','HIGH_SCHOOL_COMPLETE','HIGHER_INCOMPLETE','HIGHER_COMPLETE','POSTGRADUATE'];
const VALID_EMPLOYMENT = ['EMPLOYED_CLT','EMPLOYED_PJ','SELF_EMPLOYED','UNEMPLOYED','STUDENT','HOMEMAKER','RETIRED','OTHER'];
const VALID_INCOME = ['UP_TO_1_MW','FROM_1_TO_2_MW','FROM_2_TO_3_MW','FROM_3_TO_5_MW','ABOVE_5_MW','PREFER_NOT_TO_SAY'];

export default function Step4Socioeconomic() {
    const { formData, updateSocioeconomic, nextStep, prevStep } = useEnrollmentStore();
    const [data, setData] = useState(formData.socioeconomic);
    const [errors, setErrors] = useState<Record<string, string>>({});
    // Estado local para o input de membros (permite apagar e digitar livremente)
    const [membersInput, setMembersInput] = useState<string>(
        formData.socioeconomic.familyMembersCount ? String(formData.socioeconomic.familyMembersCount) : ''
    );

    // Sanitize stale/invalid enum values from sessionStorage on first render
    useEffect(() => {
        setData(prev => ({
            ...prev,
            educationLevel: VALID_EDUCATION.includes(prev.educationLevel as string) ? prev.educationLevel : ('' as any),
            employmentStatus: VALID_EMPLOYMENT.includes(prev.employmentStatus as string) ? prev.employmentStatus : ('' as any),
            familyIncome: VALID_INCOME.includes(prev.familyIncome as string) ? prev.familyIncome : ('' as any),
        }));
    }, []);

    const handleChange = (field: string, value: any) => {
        setData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!data.educationLevel) e.educationLevel = 'Escolaridade é obrigatória';
        if (!data.employmentStatus) e.employmentStatus = 'Situação de emprego é obrigatória';
        if (!data.familyIncome) e.familyIncome = 'Renda familiar é obrigatória';
        const membersNum = parseInt(membersInput);
        if (!membersInput || isNaN(membersNum) || membersNum < 1) {
            e.familyMembersCount = 'Informe o número de membros (mín. 1)';
        } else {
            handleChange('familyMembersCount', membersNum);
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleNext = () => {
        if (validate()) { updateSocioeconomic(data); nextStep(); }
    };

    const LABEL: React.CSSProperties = { display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: '0.45rem' };
    const ERROR: React.CSSProperties = { color: '#F87171', fontSize: '0.72rem', marginTop: '0.3rem' };
    const err = (f: string): React.CSSProperties => ({ borderColor: errors[f] ? '#EF4444' : undefined });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: '0 0 0.25rem' }}>Dados Socioeconômicos</h2>

            {/* Education Level */}
            <div>
                <label style={LABEL}>Escolaridade *</label>
                <select className="enroll-select" value={data.educationLevel || ''} onChange={(e) => handleChange('educationLevel', e.target.value)} style={err('educationLevel')}>
                    <option value="">Selecione</option>
                    {/* ⚠️ Valores EXATOS do enum Prisma: EducationLevel */}
                    <option value="NO_FORMAL_EDUCATION">Sem escolaridade</option>
                    <option value="ELEMENTARY_INCOMPLETE">Ensino Fundamental Incompleto</option>
                    <option value="ELEMENTARY_COMPLETE">Ensino Fundamental Completo</option>
                    <option value="HIGH_SCHOOL_INCOMPLETE">Ensino Médio Incompleto</option>
                    <option value="HIGH_SCHOOL_COMPLETE">Ensino Médio Completo</option>
                    <option value="HIGHER_INCOMPLETE">Ensino Superior Incompleto</option>
                    <option value="HIGHER_COMPLETE">Ensino Superior Completo</option>
                    <option value="POSTGRADUATE">Pós-graduação</option>
                </select>
                {errors.educationLevel && <p style={ERROR}>{errors.educationLevel}</p>}
            </div>

            {/* Employment Status */}
            <div>
                <label style={LABEL}>Situação de Emprego *</label>
                <select className="enroll-select" value={data.employmentStatus || ''} onChange={(e) => handleChange('employmentStatus', e.target.value)} style={err('employmentStatus')}>
                    <option value="">Selecione</option>
                    {/* ⚠️ Valores EXATOS do enum Prisma: EmploymentStatus */}
                    <option value="EMPLOYED_CLT">Empregado(a) com carteira (CLT)</option>
                    <option value="EMPLOYED_PJ">Empregado(a) PJ / Informal</option>
                    <option value="SELF_EMPLOYED">Autônomo(a)</option>
                    <option value="UNEMPLOYED">Desempregado(a)</option>
                    <option value="STUDENT">Estudante</option>
                    <option value="HOMEMAKER">Do lar</option>
                    <option value="RETIRED">Aposentado(a)</option>
                    <option value="OTHER">Outro</option>
                </select>
                {errors.employmentStatus && <p style={ERROR}>{errors.employmentStatus}</p>}
            </div>

            {/* Family Income + Members */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                    <label style={LABEL}>Renda Familiar *</label>
                    <select className="enroll-select" value={data.familyIncome || ''} onChange={(e) => handleChange('familyIncome', e.target.value)} style={err('familyIncome')}>
                        <option value="">Selecione</option>
                        {/* ⚠️ Valores EXATOS do enum Prisma: FamilyIncome */}
                        <option value="UP_TO_1_MW">Até 1 salário mínimo</option>
                        <option value="FROM_1_TO_2_MW">De 1 a 2 salários mínimos</option>
                        <option value="FROM_2_TO_3_MW">De 2 a 3 salários mínimos</option>
                        <option value="FROM_3_TO_5_MW">De 3 a 5 salários mínimos</option>
                        <option value="ABOVE_5_MW">Acima de 5 salários mínimos</option>
                        <option value="PREFER_NOT_TO_SAY">Prefiro não informar</option>
                    </select>
                    {errors.familyIncome && <p style={ERROR}>{errors.familyIncome}</p>}
                </div>
                <div>
                    <label style={LABEL}>Membros da Família *</label>
                    <input
                        className="enroll-input"
                        type="number"
                        min="1"
                        max="20"
                        value={membersInput}
                        onChange={(e) => {
                            const raw = e.target.value;
                            setMembersInput(raw);
                            const n = parseInt(raw);
                            if (!isNaN(n) && n >= 1) {
                                handleChange('familyMembersCount', n);
                                setErrors(prev => ({ ...prev, familyMembersCount: '' }));
                            }
                        }}
                        onBlur={() => {
                            // Ao sair do campo vazio, não força valor
                            const n = parseInt(membersInput);
                            if (membersInput && !isNaN(n) && n >= 1) {
                                handleChange('familyMembersCount', n);
                            }
                        }}
                        placeholder="Ex: 4"
                        style={err('familyMembersCount')}
                    />
                    {errors.familyMembersCount && <p style={ERROR}>{errors.familyMembersCount}</p>}
                </div>
            </div>

            {/* Social Program */}
            <div>
                <label style={LABEL}>Programa Social <span style={{ fontSize: '0.62rem', fontWeight: 400, color: '#6B7280' }}>(opcional)</span></label>
                <select className="enroll-select" value={data.socialProgram || ''} onChange={(e) => handleChange('socialProgram', e.target.value || undefined)}>
                    <option value="">Nenhum</option>
                    {/* ⚠️ Valores EXATOS do enum Prisma: SocialProgram */}
                    <option value="BOLSA_FAMILIA">Bolsa Família</option>
                    <option value="BPC">BPC (Benefício de Prestação Continuada)</option>
                    <option value="AUXILIO_BRASIL">Auxílio Brasil</option>
                    <option value="PE_DE_MEIA">Pé-de-Meia (Poupança do Estudante)</option>
                    <option value="OTHER">Outro</option>
                </select>
            </div>

            {/* Checkboxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '1rem 1.25rem', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(251,191,36,0.1)' }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FBBF24', marginBottom: '0.5rem' }}>Informações Adicionais</p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <input type="checkbox" id="publicSchoolOnly" checked={data.publicSchoolOnly || false} onChange={(e) => handleChange('publicSchoolOnly', e.target.checked)} className="enroll-checkbox" />
                    <label htmlFor="publicSchoolOnly" style={{ color: '#D1D5DB', fontSize: '0.86rem', cursor: 'pointer' }}>
                        Estudante de escola pública <span style={{ color: '#6B7280', fontSize: '0.75rem' }}>(critério de elegibilidade governamental)</span>
                    </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <input type="checkbox" id="hasDisability" checked={data.hasDisability || false} onChange={(e) => handleChange('hasDisability', e.target.checked)} className="enroll-checkbox" />
                    <label htmlFor="hasDisability" style={{ color: '#D1D5DB', fontSize: '0.86rem', cursor: 'pointer' }}>Possui alguma deficiência?</label>
                </div>

                {data.hasDisability && (
                    <div style={{ marginLeft: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        <div>
                            <label style={LABEL}>Tipo de Deficiência</label>
                            <select className="enroll-select" value={data.disabilityType || ''} onChange={(e) => handleChange('disabilityType', e.target.value || undefined)}>
                                <option value="">Selecione</option>
                                {/* ⚠️ Valores EXATOS do enum Prisma: DisabilityType */}
                                <option value="VISUAL">Visual</option>
                                <option value="HEARING">Auditiva</option>
                                <option value="PHYSICAL">Física</option>
                                <option value="INTELLECTUAL">Intelectual</option>
                                <option value="MULTIPLE">Múltipla</option>
                                <option value="OTHER">Outra</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <input type="checkbox" id="disabilityAdaptation" checked={data.disabilityAdaptation || false} onChange={(e) => handleChange('disabilityAdaptation', e.target.checked)} className="enroll-checkbox" />
                            <label htmlFor="disabilityAdaptation" style={{ color: '#D1D5DB', fontSize: '0.86rem', cursor: 'pointer' }}>Necessita de adaptação especial para o curso?</label>
                        </div>
                    </div>
                )}
            </div>

            {/* Nav */}
            <div className="nav-row">
                <button className="btn-back" onClick={prevStep}>← Voltar</button>
                <button className="btn-next" onClick={handleNext}>Próximo →</button>
            </div>
        </div>
    );
}
