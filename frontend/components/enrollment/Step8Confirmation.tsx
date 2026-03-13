'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEnrollmentStore } from '@/stores/useEnrollmentStore';
import api from '@/lib/api/client';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';

export default function Step8Confirmation() {
    const router = useRouter();
    const { classId, formData, prevStep, reset } = useEnrollmentStore();
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [protocol, setProtocol] = useState('');

    const handleSubmit = async () => {
        setSubmitting(true);
        setError('');

        try {
            // Prepare enrollment data
            const enrollmentData = {
                classId,
                // Personal Data
                fullName: formData.personalData.fullName,
                socialName: formData.personalData.socialName,
                cpf: formData.personalData.cpf,
                rg: formData.personalData.rg,
                rgIssuer: formData.personalData.rgIssuer,
                birthDate: formData.personalData.birthDate,
                gender: formData.personalData.gender,
                raceColor: formData.personalData.raceColor,
                maritalStatus: formData.personalData.maritalStatus,
                motherName: formData.personalData.motherName,
                fatherName: formData.personalData.fatherName,
                nationality: formData.personalData.nationality,
                birthCity: formData.personalData.birthCity,
                birthState: formData.personalData.birthState,
                // Contact
                email: formData.contact.email,
                phone: formData.contact.phone,
                hasWhatsApp: formData.contact.hasWhatsApp,
                phoneAlt: formData.contact.phoneAlt,
                allowWhatsAppContact: formData.contact.allowWhatsAppContact,
                allowEmailContact: formData.contact.allowEmailContact,
                // Address
                cep: formData.address.cep,
                street: formData.address.street,
                number: formData.address.number,
                complement: formData.address.complement,
                neighborhood: formData.address.neighborhood,
                city: formData.address.city,
                state: formData.address.state,
                zone: formData.address.zone,
                // Socioeconomic
                educationLevel: formData.socioeconomic.educationLevel,
                employmentStatus: formData.socioeconomic.employmentStatus,
                familyIncome: formData.socioeconomic.familyIncome,
                familyMembersCount: formData.socioeconomic.familyMembersCount,
                socialProgram: formData.socioeconomic.socialProgram,
                hasDisability: formData.socioeconomic.hasDisability,
                disabilityType: formData.socioeconomic.disabilityType,
                disabilityAdaptation: formData.socioeconomic.disabilityAdaptation,
                // Professional
                previousQualification: formData.professional.previousQualification,
                professionalInterest: formData.professional.professionalInterest,
                careerGoal: formData.professional.careerGoal,
                howHeardAbout: formData.professional.howHeardAbout,
                motivation: formData.professional.motivation,
                // Terms
                termsAccepted: formData.terms.termsAccepted,
                imageUseAuthorization: formData.terms.imageUseAuthorization,
                attendanceCommitment: formData.terms.attendanceCommitment,
                dataProcessingConsent: formData.terms.dataProcessingConsent,
            };

            // Submit enrollment
            const response = await api.post('/enrollments/public', enrollmentData);

            setProtocol(response.data.protocol);
            setSuccess(true);

            // Clear form data after successful submission
            setTimeout(() => {
                reset();
            }, 1000);

        } catch (err: any) {
            console.error('Erro ao enviar inscrição:', err);
            setError(err.response?.data?.message || 'Erro ao enviar inscrição. Por favor, tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="text-center py-12">
                <CheckCircleIcon className="w-24 h-24 text-green-500 mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-white mb-4">
                    Inscrição Realizada com Sucesso!
                </h2>
                <p className="text-purple-200 mb-6">
                    Sua inscrição foi enviada e está em análise.
                </p>

                <div className="bg-white/10 rounded-xl p-6 mb-8 max-w-md mx-auto">
                    <p className="text-purple-200 mb-2">Número do Protocolo:</p>
                    <p className="text-3xl font-bold text-white">{protocol}</p>
                    <p className="text-purple-300 text-sm mt-4">
                        Guarde este número para acompanhar o status da sua inscrição
                    </p>
                </div>

                <div className="space-y-3 text-purple-200 mb-8">
                    <p>✅ Você receberá um e-mail de confirmação em breve</p>
                    <p>✅ Acompanhe o status da sua inscrição pelo e-mail cadastrado</p>
                    <p>✅ Em caso de aprovação, você será notificado sobre o início das aulas</p>
                </div>

                <button
                    onClick={() => router.push('/cursos')}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/50"
                >
                    Voltar para Cursos
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">Confirmação de Dados</h2>

            <div className="bg-blue-500/20 border border-blue-400/50 rounded-xl p-4 mb-6">
                <p className="text-blue-200 text-sm">
                    📋 <strong>Revise seus dados:</strong> Confira todas as informações antes de enviar.
                    Após o envio, não será possível alterar os dados.
                </p>
            </div>

            {/* Summary Sections */}
            <div className="space-y-4">
                {/* Personal Data Summary */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-3">Dados Pessoais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <p className="text-purple-200"><strong>Nome:</strong> {formData.personalData.fullName}</p>
                        <p className="text-purple-200"><strong>CPF:</strong> {formData.personalData.cpf}</p>
                        <p className="text-purple-200"><strong>Data de Nascimento:</strong> {formData.personalData.birthDate}</p>
                        <p className="text-purple-200"><strong>Gênero:</strong> {formData.personalData.gender}</p>
                    </div>
                </div>

                {/* Contact Summary */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-3">Contato</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <p className="text-purple-200"><strong>E-mail:</strong> {formData.contact.email}</p>
                        <p className="text-purple-200"><strong>Telefone:</strong> {formData.contact.phone}</p>
                    </div>
                </div>

                {/* Address Summary */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-3">Endereço</h3>
                    <p className="text-purple-200 text-sm">
                        {formData.address.street}, {formData.address.number} - {formData.address.neighborhood}
                        <br />
                        {formData.address.city} - {formData.address.state}, CEP: {formData.address.cep}
                    </p>
                </div>

                {/* Professional Summary */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-3">Objetivo Profissional</h3>
                    <p className="text-purple-200 text-sm">
                        <strong>Meta:</strong> {formData.professional.careerGoal}
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/20 border border-red-400/50 rounded-xl p-4 flex items-start gap-3">
                    <ExclamationCircleIcon className="w-6 h-6 text-red-400 flex-shrink-0" />
                    <div>
                        <p className="text-red-200 font-semibold">Erro ao enviar inscrição</p>
                        <p className="text-red-300 text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
                <button
                    onClick={prevStep}
                    disabled={submitting}
                    className="px-8 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    ← Voltar
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {submitting ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Enviando...
                        </>
                    ) : (
                        <>
                            ✓ Confirmar e Enviar Inscrição
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
