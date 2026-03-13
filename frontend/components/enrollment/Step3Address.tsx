'use client';

import { useState } from 'react';
import { useEnrollmentStore } from '@/stores/useEnrollmentStore';
import { Zone } from '@/lib/enums';

export default function Step3Address() {
    const { formData, updateAddress, nextStep, prevStep } = useEnrollmentStore();
    const [data, setData] = useState(formData.address);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loadingCep, setLoadingCep] = useState(false);

    const handleChange = (field: string, value: any) => {
        setData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    const fetchAddressByCep = async (cep: string) => {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return;

        setLoadingCep(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const addressData = await response.json();

            if (!addressData.erro) {
                setData((prev) => ({
                    ...prev,
                    street: addressData.logradouro || prev.street,
                    neighborhood: addressData.bairro || prev.neighborhood,
                    city: addressData.localidade || prev.city,
                    state: addressData.uf || prev.state,
                }));
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
        } finally {
            setLoadingCep(false);
        }
    };

    const handleCepChange = (value: string) => {
        const cleanCep = value.replace(/\D/g, '');
        handleChange('cep', cleanCep);

        if (cleanCep.length === 8) {
            fetchAddressByCep(cleanCep);
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!data.cep) newErrors.cep = 'CEP é obrigatório';
        else if (!/^\d{8}$/.test(data.cep.replace(/\D/g, ''))) newErrors.cep = 'CEP inválido';
        if (!data.street) newErrors.street = 'Logradouro é obrigatório';
        if (!data.number) newErrors.number = 'Número é obrigatório';
        if (!data.neighborhood) newErrors.neighborhood = 'Bairro é obrigatório';
        if (!data.city) newErrors.city = 'Cidade é obrigatória';
        if (!data.state) newErrors.state = 'Estado é obrigatório';
        if (!data.zone) newErrors.zone = 'Zona é obrigatória';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validate()) {
            updateAddress(data);
            nextStep();
        }
    };

    const formatCep = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">Endereço Residencial</h2>

            {/* CEP */}
            <div>
                <label className="block text-purple-200 mb-2">CEP *</label>
                <div className="relative">
                    <input
                        type="text"
                        value={data.cep ? formatCep(data.cep) : ''}
                        onChange={(e) => handleCepChange(e.target.value)}
                        maxLength={9}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="00000-000"
                    />
                    {loadingCep && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>
                {errors.cep && <p className="text-red-400 text-sm mt-1">{errors.cep}</p>}
                <p className="text-purple-300 text-sm mt-1">
                    O endereço será preenchido automaticamente
                </p>
            </div>

            {/* Street and Number */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-purple-200 mb-2">Logradouro *</label>
                    <input
                        type="text"
                        value={data.street || ''}
                        onChange={(e) => handleChange('street', e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Rua, Avenida, etc."
                    />
                    {errors.street && <p className="text-red-400 text-sm mt-1">{errors.street}</p>}
                </div>

                <div>
                    <label className="block text-purple-200 mb-2">Número *</label>
                    <input
                        type="text"
                        value={data.number || ''}
                        onChange={(e) => handleChange('number', e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Nº"
                    />
                    {errors.number && <p className="text-red-400 text-sm mt-1">{errors.number}</p>}
                </div>
            </div>

            {/* Complement */}
            <div>
                <label className="block text-purple-200 mb-2">Complemento (opcional)</label>
                <input
                    type="text"
                    value={data.complement || ''}
                    onChange={(e) => handleChange('complement', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Apto, Bloco, Casa, etc."
                />
            </div>

            {/* Neighborhood */}
            <div>
                <label className="block text-purple-200 mb-2">Bairro *</label>
                <input
                    type="text"
                    value={data.neighborhood || ''}
                    onChange={(e) => handleChange('neighborhood', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Digite o bairro"
                />
                {errors.neighborhood && <p className="text-red-400 text-sm mt-1">{errors.neighborhood}</p>}
            </div>

            {/* City and State */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-purple-200 mb-2">Cidade *</label>
                    <input
                        type="text"
                        value={data.city || ''}
                        onChange={(e) => handleChange('city', e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Digite a cidade"
                    />
                    {errors.city && <p className="text-red-400 text-sm mt-1">{errors.city}</p>}
                </div>

                <div>
                    <label className="block text-purple-200 mb-2">Estado (UF) *</label>
                    <input
                        type="text"
                        value={data.state || ''}
                        onChange={(e) => handleChange('state', e.target.value.toUpperCase())}
                        maxLength={2}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="UF"
                    />
                    {errors.state && <p className="text-red-400 text-sm mt-1">{errors.state}</p>}
                </div>
            </div>

            {/* Zone */}
            <div>
                <label className="block text-purple-200 mb-2">Zona *</label>
                <select
                    value={data.zone || ''}
                    onChange={(e) => handleChange('zone', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    <option value="">Selecione</option>
                    <option value="URBAN">Urbana</option>
                    <option value="RURAL">Rural</option>
                </select>
                {errors.zone && <p className="text-red-400 text-sm mt-1">{errors.zone}</p>}
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
