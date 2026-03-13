'use client';

import { useState } from 'react';
import { useEnrollmentStore } from '@/stores/useEnrollmentStore';
import { Gender, RaceColor, MaritalStatus } from '@/lib/enums';

export default function Step1PersonalData() {
    const { formData, updatePersonalData, nextStep } = useEnrollmentStore();
    const [data, setData] = useState(formData.personalData);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (field: string, value: any) => {
        setData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!data.fullName) newErrors.fullName = 'Nome completo é obrigatório';
        if (!data.cpf) newErrors.cpf = 'CPF é obrigatório';
        else if (!/^\d{11}$/.test(data.cpf.replace(/\D/g, ''))) newErrors.cpf = 'CPF inválido';
        if (!data.rg) newErrors.rg = 'RG é obrigatório';
        if (!data.rgIssuer) newErrors.rgIssuer = 'Órgão emissor é obrigatório';
        if (!data.birthDate) newErrors.birthDate = 'Data de nascimento é obrigatória';
        if (!data.gender) newErrors.gender = 'Gênero é obrigatório';
        if (!data.raceColor) newErrors.raceColor = 'Raça/Cor é obrigatória';
        if (!data.maritalStatus) newErrors.maritalStatus = 'Estado civil é obrigatório';
        if (!data.motherName) newErrors.motherName = 'Nome da mãe é obrigatório';
        if (!data.nationality) newErrors.nationality = 'Nacionalidade é obrigatória';
        if (!data.birthCity) newErrors.birthCity = 'Cidade de nascimento é obrigatória';
        if (!data.birthState) newErrors.birthState = 'Estado de nascimento é obrigatório';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validate()) {
            updatePersonalData(data);
            nextStep();
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">Dados Pessoais</h2>

            {/* Full Name */}
            <div>
                <label className="block text-purple-200 mb-2">Nome Completo *</label>
                <input
                    type="text"
                    value={data.fullName || ''}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Digite seu nome completo"
                />
                {errors.fullName && <p className="text-red-400 text-sm mt-1">{errors.fullName}</p>}
            </div>

            {/* Social Name */}
            <div>
                <label className="block text-purple-200 mb-2">Nome Social (opcional)</label>
                <input
                    type="text"
                    value={data.socialName || ''}
                    onChange={(e) => handleChange('socialName', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Digite seu nome social"
                />
            </div>

            {/* CPF and RG */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-purple-200 mb-2">CPF *</label>
                    <input
                        type="text"
                        value={data.cpf || ''}
                        onChange={(e) => handleChange('cpf', e.target.value.replace(/\D/g, ''))}
                        maxLength={11}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="000.000.000-00"
                    />
                    {errors.cpf && <p className="text-red-400 text-sm mt-1">{errors.cpf}</p>}
                </div>

                <div>
                    <label className="block text-purple-200 mb-2">RG *</label>
                    <input
                        type="text"
                        value={data.rg || ''}
                        onChange={(e) => handleChange('rg', e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Digite seu RG"
                    />
                    {errors.rg && <p className="text-red-400 text-sm mt-1">{errors.rg}</p>}
                </div>
            </div>

            {/* RG Issuer and Birth Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-purple-200 mb-2">Órgão Emissor *</label>
                    <input
                        type="text"
                        value={data.rgIssuer || ''}
                        onChange={(e) => handleChange('rgIssuer', e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Ex: SSP-MA"
                    />
                    {errors.rgIssuer && <p className="text-red-400 text-sm mt-1">{errors.rgIssuer}</p>}
                </div>

                <div>
                    <label className="block text-purple-200 mb-2">Data de Nascimento *</label>
                    <input
                        type="date"
                        value={data.birthDate || ''}
                        onChange={(e) => handleChange('birthDate', e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    {errors.birthDate && <p className="text-red-400 text-sm mt-1">{errors.birthDate}</p>}
                </div>
            </div>

            {/* Gender, Race, Marital Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-purple-200 mb-2">Gênero *</label>
                    <select
                        value={data.gender || ''}
                        onChange={(e) => handleChange('gender', e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="">Selecione</option>
                        <option value="MALE">Masculino</option>
                        <option value="FEMALE">Feminino</option>
                        <option value="NON_BINARY">Não-binário</option>
                        <option value="PREFER_NOT_TO_SAY">Prefiro não dizer</option>
                    </select>
                    {errors.gender && <p className="text-red-400 text-sm mt-1">{errors.gender}</p>}
                </div>

                <div>
                    <label className="block text-purple-200 mb-2">Raça/Cor *</label>
                    <select
                        value={data.raceColor || ''}
                        onChange={(e) => handleChange('raceColor', e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="">Selecione</option>
                        <option value="WHITE">Branca</option>
                        <option value="BLACK">Preta</option>
                        <option value="BROWN">Parda</option>
                        <option value="YELLOW">Amarela</option>
                        <option value="INDIGENOUS">Indígena</option>
                        <option value="PREFER_NOT_TO_SAY">Prefiro não dizer</option>
                    </select>
                    {errors.raceColor && <p className="text-red-400 text-sm mt-1">{errors.raceColor}</p>}
                </div>

                <div>
                    <label className="block text-purple-200 mb-2">Estado Civil *</label>
                    <select
                        value={data.maritalStatus || ''}
                        onChange={(e) => handleChange('maritalStatus', e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="">Selecione</option>
                        <option value="SINGLE">Solteiro(a)</option>
                        <option value="MARRIED">Casado(a)</option>
                        <option value="DIVORCED">Divorciado(a)</option>
                        <option value="WIDOWED">Viúvo(a)</option>
                        <option value="SEPARATED">Separado(a)</option>
                    </select>
                    {errors.maritalStatus && <p className="text-red-400 text-sm mt-1">{errors.maritalStatus}</p>}
                </div>
            </div>

            {/* Mother and Father Names */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-purple-200 mb-2">Nome da Mãe *</label>
                    <input
                        type="text"
                        value={data.motherName || ''}
                        onChange={(e) => handleChange('motherName', e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Nome completo da mãe"
                    />
                    {errors.motherName && <p className="text-red-400 text-sm mt-1">{errors.motherName}</p>}
                </div>

                <div>
                    <label className="block text-purple-200 mb-2">Nome do Pai (opcional)</label>
                    <input
                        type="text"
                        value={data.fatherName || ''}
                        onChange={(e) => handleChange('fatherName', e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Nome completo do pai"
                    />
                </div>
            </div>

            {/* Nationality, Birth City, Birth State */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-purple-200 mb-2">Nacionalidade *</label>
                    <input
                        type="text"
                        value={data.nationality || ''}
                        onChange={(e) => handleChange('nationality', e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Ex: Brasileira"
                    />
                    {errors.nationality && <p className="text-red-400 text-sm mt-1">{errors.nationality}</p>}
                </div>

                <div>
                    <label className="block text-purple-200 mb-2">Cidade de Nascimento *</label>
                    <input
                        type="text"
                        value={data.birthCity || ''}
                        onChange={(e) => handleChange('birthCity', e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Digite a cidade"
                    />
                    {errors.birthCity && <p className="text-red-400 text-sm mt-1">{errors.birthCity}</p>}
                </div>

                <div>
                    <label className="block text-purple-200 mb-2">Estado (UF) *</label>
                    <input
                        type="text"
                        value={data.birthState || ''}
                        onChange={(e) => handleChange('birthState', e.target.value.toUpperCase())}
                        maxLength={2}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Ex: MA"
                    />
                    {errors.birthState && <p className="text-red-400 text-sm mt-1">{errors.birthState}</p>}
                </div>
            </div>

            {/* Next Button */}
            <div className="flex justify-end pt-6">
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
