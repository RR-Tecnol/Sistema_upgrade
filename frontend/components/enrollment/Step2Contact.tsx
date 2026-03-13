'use client';

import { useState } from 'react';
import { useEnrollmentStore } from '@/stores/useEnrollmentStore';

export default function Step2Contact() {
    const { formData, updateContact, nextStep, prevStep } = useEnrollmentStore();
    const [data, setData] = useState(formData.contact);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (field: string, value: any) => {
        setData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!data.email) newErrors.email = 'E-mail é obrigatório';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) newErrors.email = 'E-mail inválido';

        if (!data.phone) newErrors.phone = 'Telefone é obrigatório';
        else if (!/^\d{10,11}$/.test(data.phone.replace(/\D/g, ''))) newErrors.phone = 'Telefone inválido';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validate()) {
            updateContact(data);
            nextStep();
        }
    };

    const formatPhone = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 10) {
            return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">Informações de Contato</h2>

            {/* Email */}
            <div>
                <label className="block text-purple-200 mb-2">E-mail *</label>
                <input
                    type="email"
                    value={data.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="seu@email.com"
                />
                {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
                <p className="text-purple-300 text-sm mt-1">
                    Usaremos este e-mail para enviar atualizações sobre sua inscrição
                </p>
            </div>

            {/* Phone */}
            <div>
                <label className="block text-purple-200 mb-2">Telefone Principal *</label>
                <input
                    type="tel"
                    value={data.phone ? formatPhone(data.phone) : ''}
                    onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, ''))}
                    maxLength={15}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="(00) 00000-0000"
                />
                {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone}</p>}
            </div>

            {/* Has WhatsApp */}
            <div className="flex items-center space-x-3 bg-white/5 p-4 rounded-xl">
                <input
                    type="checkbox"
                    id="hasWhatsApp"
                    checked={data.hasWhatsApp || false}
                    onChange={(e) => handleChange('hasWhatsApp', e.target.checked)}
                    className="w-5 h-5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-2 focus:ring-purple-500"
                />
                <label htmlFor="hasWhatsApp" className="text-purple-200 cursor-pointer">
                    Este número tem WhatsApp
                </label>
            </div>

            {/* Alternative Phone */}
            <div>
                <label className="block text-purple-200 mb-2">Telefone Alternativo (opcional)</label>
                <input
                    type="tel"
                    value={data.phoneAlt ? formatPhone(data.phoneAlt) : ''}
                    onChange={(e) => handleChange('phoneAlt', e.target.value.replace(/\D/g, ''))}
                    maxLength={15}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="(00) 00000-0000"
                />
            </div>

            {/* Contact Permissions */}
            <div className="space-y-3 bg-white/5 p-4 rounded-xl">
                <p className="text-white font-semibold mb-3">Autorização de Contato</p>

                <div className="flex items-center space-x-3">
                    <input
                        type="checkbox"
                        id="allowWhatsAppContact"
                        checked={data.allowWhatsAppContact !== undefined ? data.allowWhatsAppContact : true}
                        onChange={(e) => handleChange('allowWhatsAppContact', e.target.checked)}
                        className="w-5 h-5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-2 focus:ring-purple-500"
                    />
                    <label htmlFor="allowWhatsAppContact" className="text-purple-200 cursor-pointer">
                        Autorizo contato via WhatsApp
                    </label>
                </div>

                <div className="flex items-center space-x-3">
                    <input
                        type="checkbox"
                        id="allowEmailContact"
                        checked={data.allowEmailContact !== undefined ? data.allowEmailContact : true}
                        onChange={(e) => handleChange('allowEmailContact', e.target.checked)}
                        className="w-5 h-5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-2 focus:ring-purple-500"
                    />
                    <label htmlFor="allowEmailContact" className="text-purple-200 cursor-pointer">
                        Autorizo contato via E-mail
                    </label>
                </div>
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
