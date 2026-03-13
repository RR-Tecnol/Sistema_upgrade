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

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">Termos e Autorizações</h2>

            <div className="bg-yellow-500/20 border border-yellow-400/50 rounded-xl p-4 mb-6">
                <p className="text-yellow-200 text-sm">
                    ⚠️ <strong>Importante:</strong> Leia atentamente todos os termos antes de aceitar.
                    Você deve concordar com todos para prosseguir com a inscrição.
                </p>
            </div>

            {/* Terms and Conditions */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/20 space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Termos e Condições do Programa</h3>

                <div className="max-h-60 overflow-y-auto bg-black/20 rounded-lg p-4 text-purple-200 text-sm space-y-3">
                    <p>
                        <strong>1. OBJETIVO DO PROGRAMA:</strong> O Programa Qualifica Maranhão e Piauí tem como objetivo
                        oferecer cursos de qualificação profissional gratuitos para a população dos estados do Maranhão e Piauí.
                    </p>
                    <p>
                        <strong>2. COMPROMISSOS DO ALUNO:</strong> Ao se inscrever, o aluno se compromete a:
                    </p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Frequentar no mínimo 75% das aulas</li>
                        <li>Participar ativamente das atividades propostas</li>
                        <li>Respeitar os professores, colegas e equipe do programa</li>
                        <li>Zelar pelo patrimônio e materiais disponibilizados</li>
                    </ul>
                    <p>
                        <strong>3. CERTIFICAÇÃO:</strong> O certificado será emitido apenas para alunos que cumprirem
                        os requisitos de frequência e aproveitamento.
                    </p>
                    <p>
                        <strong>4. DESISTÊNCIA:</strong> Em caso de desistência, o aluno deve comunicar formalmente
                        a coordenação do curso para que sua vaga possa ser disponibilizada para outro candidato.
                    </p>
                </div>

                <div className="flex items-start space-x-3 pt-4">
                    <input
                        type="checkbox"
                        id="termsAccepted"
                        checked={data.termsAccepted || false}
                        onChange={(e) => handleChange('termsAccepted', e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-2 focus:ring-purple-500"
                    />
                    <label htmlFor="termsAccepted" className="text-white cursor-pointer">
                        Li e aceito os <strong>Termos e Condições</strong> do programa
                    </label>
                </div>
            </div>

            {/* LGPD - Data Processing Consent */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/20 space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Consentimento de Tratamento de Dados (LGPD)</h3>

                <div className="text-purple-200 text-sm space-y-3">
                    <p>
                        De acordo com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), seus dados pessoais
                        serão utilizados exclusivamente para:
                    </p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Processamento da sua inscrição no curso</li>
                        <li>Comunicação sobre o andamento do curso</li>
                        <li>Emissão de certificados</li>
                        <li>Estatísticas e relatórios do programa (dados anonimizados)</li>
                    </ul>
                    <p>
                        Seus dados serão armazenados de forma segura e não serão compartilhados com terceiros sem
                        seu consentimento expresso.
                    </p>
                </div>

                <div className="flex items-start space-x-3 pt-4">
                    <input
                        type="checkbox"
                        id="dataProcessingConsent"
                        checked={data.dataProcessingConsent || false}
                        onChange={(e) => handleChange('dataProcessingConsent', e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-2 focus:ring-purple-500"
                    />
                    <label htmlFor="dataProcessingConsent" className="text-white cursor-pointer">
                        Autorizo o <strong>tratamento dos meus dados pessoais</strong> conforme descrito acima
                    </label>
                </div>
            </div>

            {/* Image Use Authorization */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/20 space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Autorização de Uso de Imagem</h3>

                <div className="text-purple-200 text-sm space-y-3">
                    <p>
                        Durante o curso, poderão ser realizadas fotografias e filmagens para fins de divulgação
                        do programa em materiais institucionais, redes sociais e relatórios.
                    </p>
                </div>

                <div className="flex items-start space-x-3 pt-4">
                    <input
                        type="checkbox"
                        id="imageUseAuthorization"
                        checked={data.imageUseAuthorization || false}
                        onChange={(e) => handleChange('imageUseAuthorization', e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-2 focus:ring-purple-500"
                    />
                    <label htmlFor="imageUseAuthorization" className="text-white cursor-pointer">
                        Autorizo o <strong>uso da minha imagem</strong> para divulgação do programa
                    </label>
                </div>
            </div>

            {/* Attendance Commitment */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/20 space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Compromisso de Frequência</h3>

                <div className="text-purple-200 text-sm space-y-3">
                    <p>
                        Para obter o certificado, é necessário ter no mínimo <strong>75% de frequência</strong> nas aulas.
                        Faltas não justificadas podem resultar no desligamento do programa.
                    </p>
                </div>

                <div className="flex items-start space-x-3 pt-4">
                    <input
                        type="checkbox"
                        id="attendanceCommitment"
                        checked={data.attendanceCommitment || false}
                        onChange={(e) => handleChange('attendanceCommitment', e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-2 focus:ring-purple-500"
                    />
                    <label htmlFor="attendanceCommitment" className="text-white cursor-pointer">
                        Comprometo-me a <strong>manter a frequência mínima</strong> exigida
                    </label>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/20 border border-red-400/50 rounded-xl p-4">
                    <p className="text-red-200 text-sm">{error}</p>
                </div>
            )}

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
