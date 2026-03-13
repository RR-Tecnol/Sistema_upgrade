'use client';

import { useState } from 'react';
import { useEnrollmentStore } from '@/stores/useEnrollmentStore';
import { CareerGoal } from '@/lib/enums';

export default function Step5Professional() {
    const { formData, updateProfessional, nextStep, prevStep } = useEnrollmentStore();
    const [data, setData] = useState(formData.professional);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (field: string, value: any) => {
        setData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!data.careerGoal) newErrors.careerGoal = 'Objetivo profissional é obrigatório';
        // REQ-05: motivation é opcional — aluno pode deixar em branco
        // Mínimo 20 caracteres somente se preenchido
        if (data.motivation && data.motivation.length < 20) {
            newErrors.motivation = 'Se preenchida, descreva com pelo menos 20 caracteres';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validate()) {
            updateProfessional(data);
            nextStep();
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">Qualificação Profissional</h2>

            {/* Previous Qualification */}
            <div>
                <label className="block text-purple-200 mb-2">Qualificação Anterior (opcional)</label>
                <textarea
                    value={data.previousQualification || ''}
                    onChange={(e) => handleChange('previousQualification', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="Descreva cursos ou qualificações que você já possui (se houver)"
                />
                <p className="text-purple-300 text-sm mt-1">
                    Ex: Curso de informática básica, curso de inglês, etc.
                </p>
            </div>

            {/* Professional Interest */}
            <div>
                <label className="block text-purple-200 mb-2">Área de Interesse Profissional (opcional)</label>
                <input
                    type="text"
                    value={data.professionalInterest || ''}
                    onChange={(e) => handleChange('professionalInterest', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Ex: Tecnologia, Gastronomia, Saúde, etc."
                />
            </div>

            {/* Career Goal */}
            <div>
                <label className="block text-purple-200 mb-2">Objetivo Profissional *</label>
                <select
                    value={data.careerGoal || ''}
                    onChange={(e) => handleChange('careerGoal', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    <option value="">Selecione</option>
                    <option value="SEEK_EMPLOYMENT">Buscar emprego</option>
                    <option value="ENTREPRENEURSHIP">Empreender</option>
                    <option value="SELF_EMPLOYED">Trabalhar como autônomo</option>
                    <option value="NOT_SURE">Ainda não sei</option>
                    <option value="OTHER">Outro</option>
                </select>
                {errors.careerGoal && <p className="text-red-400 text-sm mt-1">{errors.careerGoal}</p>}
            </div>

            {/* How Heard About */}
            <div>
                <label className="block text-purple-200 mb-2">Como soube do curso? (opcional)</label>
                <select
                    value={data.howHeardAbout || ''}
                    onChange={(e) => handleChange('howHeardAbout', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
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
                <label className="block text-purple-200 mb-2">Por que você quer fazer este curso? <span className="text-purple-400 text-sm font-normal">(opcional)</span></label> {/* REQ-05 */}
                <textarea
                    value={data.motivation || ''}
                    onChange={(e) => handleChange('motivation', e.target.value)}
                    rows={5}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="Conte-nos sobre suas expectativas (opcional)..."
                />
                {errors.motivation && <p className="text-red-400 text-sm mt-1">{errors.motivation}</p>}
                {data.motivation && (
                    <p className="text-purple-300 text-sm mt-1">
                        {data.motivation.length} caracteres {data.motivation.length < 20 ? '(mínimo 20 se preenchido)' : '✓'}
                    </p>
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
