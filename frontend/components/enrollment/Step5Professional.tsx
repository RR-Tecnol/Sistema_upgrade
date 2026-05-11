'use client';

import { useState } from 'react';
import { useEnrollmentStore } from '@/stores/useEnrollmentStore';

export default function Step5Professional() {
    const { formData, updateProfessional, nextStep, prevStep } = useEnrollmentStore();
    const [data, setData] = useState(formData.professional);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (field: string, value: any) => {
        setData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!data.careerGoal) e.careerGoal = 'Objetivo profissional é obrigatório';
        if (data.motivation && data.motivation.length < 20) e.motivation = 'Se preenchida, descreva com pelo menos 20 caracteres';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleNext = () => {
        if (validate()) { updateProfessional(data); nextStep(); }
    };

    const LABEL: React.CSSProperties = { display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: '0.45rem' };
    const ERROR: React.CSSProperties = { color: '#F87171', fontSize: '0.72rem', marginTop: '0.3rem' };
    const HINT: React.CSSProperties = { color: '#6B7280', fontSize: '0.75rem', marginTop: '0.35rem' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: '0 0 0.25rem' }}>Qualificação Profissional</h2>

            {/* Previous Qualification */}
            <div>
                <label style={LABEL}>Qualificação Anterior <span style={{ fontSize: '0.62rem', fontWeight: 400, color: '#6B7280' }}>(opcional)</span></label>
                <textarea
                    className="enroll-input"
                    value={data.previousQualification || ''}
                    onChange={(e) => handleChange('previousQualification', e.target.value)}
                    rows={3}
                    placeholder="Descreva cursos ou qualificações que você já possui (se houver)"
                    style={{ resize: 'vertical', minHeight: 80 }}
                />
                <p style={HINT}>Ex: Curso de informática básica, curso de inglês, etc.</p>
            </div>

            {/* Professional Interest */}
            <div>
                <label style={LABEL}>Área de Interesse Profissional <span style={{ fontSize: '0.62rem', fontWeight: 400, color: '#6B7280' }}>(opcional)</span></label>
                <input
                    className="enroll-input"
                    type="text"
                    value={data.professionalInterest || ''}
                    onChange={(e) => handleChange('professionalInterest', e.target.value)}
                    placeholder="Ex: Tecnologia, Gastronomia, Saúde..."
                />
            </div>

            {/* Career Goal */}
            <div>
                <label style={LABEL}>Objetivo Profissional *</label>
                <select
                    className="enroll-select"
                    value={data.careerGoal || ''}
                    onChange={(e) => handleChange('careerGoal', e.target.value)}
                    style={{ borderColor: errors.careerGoal ? '#EF4444' : undefined }}
                >
                    <option value="">Selecione</option>
                    <option value="SEEK_EMPLOYMENT">Buscar emprego</option>
                    <option value="ENTREPRENEURSHIP">Empreender</option>
                    <option value="SELF_EMPLOYED">Trabalhar como autônomo</option>
                    <option value="NOT_SURE">Ainda não sei</option>
                    <option value="OTHER">Outro</option>
                </select>
                {errors.careerGoal && <p style={ERROR}>{errors.careerGoal}</p>}
            </div>

            {/* How Heard About */}
            <div>
                <label style={LABEL}>Como soube do curso? <span style={{ fontSize: '0.62rem', fontWeight: 400, color: '#6B7280' }}>(opcional)</span></label>
                <select className="enroll-select" value={data.howHeardAbout || ''} onChange={(e) => handleChange('howHeardAbout', e.target.value)}>
                    <option value="">Selecione</option>
                    <option value="SOCIAL_MEDIA">Redes Sociais</option>
                    <option value="FRIENDS_FAMILY">Amigos/Família</option>
                    <option value="GOVERNMENT_WEBSITE">Site do Governo</option>
                    <option value="RADIO_TV">Rádio/TV</option>
                    <option value="COMMUNITY_LEADER">Líder Comunitário</option>
                    <option value="SCHOOL">Escola</option>
                    <option value="OTHER">Outro</option>
                </select>
            </div>

            {/* Motivation */}
            <div>
                <label style={LABEL}>Por que você quer fazer este curso? <span style={{ fontSize: '0.62rem', fontWeight: 400, color: '#6B7280' }}>(opcional)</span></label>
                <textarea
                    className="enroll-input"
                    value={data.motivation || ''}
                    onChange={(e) => handleChange('motivation', e.target.value)}
                    rows={5}
                    placeholder="Conte-nos sobre suas expectativas (opcional)..."
                    style={{
                        resize: 'vertical', minHeight: 100,
                        borderColor: errors.motivation ? '#EF4444' : undefined,
                    }}
                />
                {errors.motivation && <p style={ERROR}>{errors.motivation}</p>}
                {data.motivation && (
                    <p style={HINT}>{data.motivation.length} caracteres {data.motivation.length < 20 ? '(mínimo 20 se preenchido)' : '✓'}</p>
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
