'use client';

import { useState } from 'react';
import { useEnrollmentStore } from '@/stores/useEnrollmentStore';
import { EducationLevel, EmploymentStatus, FamilyIncome, SocialProgram, DisabilityType } from '@/lib/enums';

export default function Step4Socioeconomic() {
    const { formData, updateSocioeconomic, nextStep, prevStep } = useEnrollmentStore();
    const [data, setData] = useState(formData.socioeconomic);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (field: string, value: any) => {
        setData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!data.educationLevel) newErrors.educationLevel = 'Escolaridade é obrigatória';
        if (!data.employmentStatus) newErrors.employmentStatus = 'Situação de emprego é obrigatória';
        if (!data.familyIncome) newErrors.familyIncome = 'Renda familiar é obrigatória';
        if (!data.familyMembersCount || data.familyMembersCount < 1) newErrors.familyMembersCount = 'Número de membros deve ser maior que 0';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validate()) {
            updateSocioeconomic(data);
            nextStep();
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">Dados Socioeconômicos</h2>

            {/* Education Level */}
            <div>
                <label className="block text-purple-200 mb-2">Escolaridade *</label>
                <select
                    value={data.educationLevel || ''}
                    onChange={(e) => handleChange('educationLevel', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    <option value="">Selecione</option>
                    <option value="INCOMPLETE_ELEMENTARY">Ensino Fundamental Incompleto</option>
                    <option value="COMPLETE_ELEMENTARY">Ensino Fundamental Completo</option>
                    <option value="INCOMPLETE_HIGH_SCHOOL">Ensino Médio Incompleto</option>
                    <option value="COMPLETE_HIGH_SCHOOL">Ensino Médio Completo</option>
                    <option value="INCOMPLETE_HIGHER_EDUCATION">Ensino Superior Incompleto</option>
                    <option value="COMPLETE_HIGHER_EDUCATION">Ensino Superior Completo</option>
                    <option value="POSTGRADUATE">Pós-graduação</option>
                </select>
                {errors.educationLevel && <p className="text-red-400 text-sm mt-1">{errors.educationLevel}</p>}
            </div>

            {/* Employment Status */}
            <div>
                <label className="block text-purple-200 mb-2">Situação de Emprego *</label>
                <select
                    value={data.employmentStatus || ''}
                    onChange={(e) => handleChange('employmentStatus', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    <option value="">Selecione</option>
                    <option value="EMPLOYED">Empregado(a)</option>
                    <option value="UNEMPLOYED">Desempregado(a)</option>
                    <option value="SELF_EMPLOYED">Autônomo(a)</option>
                    <option value="STUDENT">Estudante</option>
                    <option value="RETIRED">Aposentado(a)</option>
                    <option value="OTHER">Outro</option>
                </select>
                {errors.employmentStatus && <p className="text-red-400 text-sm mt-1">{errors.employmentStatus}</p>}
            </div>

            {/* Family Income and Members */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-purple-200 mb-2">Renda Familiar *</label>
                    <select
                        value={data.familyIncome || ''}
                        onChange={(e) => handleChange('familyIncome', e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="">Selecione</option>
                        <option value="UP_TO_1_MW">Até 1 salário mínimo</option>
                        <option value="FROM_1_TO_2_MW">De 1 a 2 salários mínimos</option>
                        <option value="FROM_2_TO_3_MW">De 2 a 3 salários mínimos</option>
                        <option value="FROM_3_TO_5_MW">De 3 a 5 salários mínimos</option>
                        <option value="ABOVE_5_MW">Acima de 5 salários mínimos</option>
                        <option value="PREFER_NOT_TO_SAY">Prefiro não informar</option>
                    </select>
                    {errors.familyIncome && <p className="text-red-400 text-sm mt-1">{errors.familyIncome}</p>}
                </div>

                <div>
                    <label className="block text-purple-200 mb-2">Membros da Família *</label>
                    <input
                        type="number"
                        min="1"
                        value={data.familyMembersCount || 1}
                        onChange={(e) => handleChange('familyMembersCount', parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Número de pessoas"
                    />
                    {errors.familyMembersCount && <p className="text-red-400 text-sm mt-1">{errors.familyMembersCount}</p>}
                </div>
            </div>

            {/* Social Program */}
            <div>
                <label className="block text-purple-200 mb-2">Programa Social (opcional)</label>
                <select
                    value={data.socialProgram || ''}
                    onChange={(e) => handleChange('socialProgram', e.target.value || undefined)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    <option value="">Nenhum</option>
                    <option value="BOLSA_FAMILIA">Bolsa Família</option>
                    <option value="BPC">BPC (Benefício de Prestação Continuada)</option>
                    <option value="AUXILIO_BRASIL">Auxílio Brasil</option>
                    <option value="PE_DE_MEIA">Pé-de-Meia (Poupança do Estudante)</option> {/* REQ-04 */}
                    <option value="OTHER">Outro</option>
                </select>
            </div>

            {/* Escola Pública — REQ-03 */}
            <div className="space-y-4 bg-white/5 p-4 rounded-xl">
                <div className="flex items-center space-x-3">
                    <input
                        type="checkbox"
                        id="publicSchoolOnly"
                        checked={data.publicSchoolOnly || false}
                        onChange={(e) => handleChange('publicSchoolOnly', e.target.checked)}
                        className="w-5 h-5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-2 focus:ring-purple-500"
                    />
                    <label htmlFor="publicSchoolOnly" className="text-white font-semibold cursor-pointer">
                        Estudante de escola pública? 
                        <span className="text-purple-300 text-sm font-normal ml-1">(Critério de elegibilidade governamental)</span>
                    </label>
                </div>
            </div>

            {/* Disability Section */}
            <div className="space-y-4 bg-white/5 p-4 rounded-xl">
                <div className="flex items-center space-x-3">
                    <input
                        type="checkbox"
                        id="hasDisability"
                        checked={data.hasDisability || false}
                        onChange={(e) => handleChange('hasDisability', e.target.checked)}
                        className="w-5 h-5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-2 focus:ring-purple-500"
                    />
                    <label htmlFor="hasDisability" className="text-white font-semibold cursor-pointer">
                        Possui alguma deficiência?
                    </label>
                </div>

                {data.hasDisability && (
                    <>
                        <div>
                            <label className="block text-purple-200 mb-2">Tipo de Deficiência</label>
                            <select
                                value={data.disabilityType || ''}
                                onChange={(e) => handleChange('disabilityType', e.target.value || undefined)}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">Selecione</option>
                                <option value="PHYSICAL">Física</option>
                                <option value="VISUAL">Visual</option>
                                <option value="HEARING">Auditiva</option>
                                <option value="INTELLECTUAL">Intelectual</option>
                                <option value="MULTIPLE">Múltipla</option>
                                <option value="OTHER">Outra</option>
                            </select>
                        </div>

                        <div className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                id="disabilityAdaptation"
                                checked={data.disabilityAdaptation || false}
                                onChange={(e) => handleChange('disabilityAdaptation', e.target.checked)}
                                className="w-5 h-5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-2 focus:ring-purple-500"
                            />
                            <label htmlFor="disabilityAdaptation" className="text-purple-200 cursor-pointer">
                                Necessita de adaptação especial para o curso?
                            </label>
                        </div>
                    </>
                )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
                <button
                    onClick={prevStep}
                    className="px-8 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-all duration-300"
                >
                    ← Voltar
                </button>
                <button
                    onClick={handleNext}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/50"
                >
                    Próximo →
                </button>
            </div>
        </div>
    );
}
