'use client';

import { useState, useRef } from 'react';
import { useEnrollmentStore } from '@/stores/useEnrollmentStore';
import { CameraIcon, DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function Step6Documents() {
    const { formData, updateDocuments, nextStep, prevStep } = useEnrollmentStore();
    const [documents, setDocuments] = useState(formData.documents);
    const [previews, setPreviews] = useState<Record<string, string>>({});
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const documentTypes = [
        { key: 'photo', label: 'Foto 3x4', required: true },
        { key: 'rgFront', label: 'RG (Frente)', required: true },
        { key: 'rgBack', label: 'RG (Verso)', required: true },
        { key: 'cpfDoc', label: 'CPF', required: true },
        { key: 'addressProof', label: 'Comprovante de Residência', required: true },
        { key: 'educationProof', label: 'Comprovante de Escolaridade', required: false },
    ];

    const handleFileChange = (key: string, file: File | null) => {
        if (file) {
            setDocuments((prev) => ({ ...prev, [key]: file }));

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviews((prev) => ({ ...prev, [key]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const removeFile = (key: string) => {
        setDocuments((prev) => {
            const newDocs = { ...prev };
            delete newDocs[key as keyof typeof newDocs];
            return newDocs;
        });
        setPreviews((prev) => {
            const newPreviews = { ...prev };
            delete newPreviews[key];
            return newPreviews;
        });
    };

    const handleNext = () => {
        const requiredDocs = documentTypes.filter(doc => doc.required);
        const missingDocs = requiredDocs.filter(doc => !documents[doc.key as keyof typeof documents]);

        if (missingDocs.length > 0) {
            alert(`Por favor, envie os seguintes documentos obrigatórios:\n${missingDocs.map(d => d.label).join('\n')}`);
            return;
        }

        updateDocuments(documents);
        nextStep();
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">Documentos</h2>

            <div className="bg-blue-500/20 border border-blue-400/50 rounded-xl p-4 mb-6">
                <p className="text-blue-200 text-sm">
                    📸 <strong>Dica:</strong> Você pode usar a câmera do seu celular para tirar fotos dos documentos.
                    Certifique-se de que as imagens estejam nítidas e legíveis.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {documentTypes.map((docType) => {
                    const hasFile = documents[docType.key as keyof typeof documents];
                    const preview = previews[docType.key];

                    return (
                        <div key={docType.key} className="bg-white/5 rounded-xl p-4 border border-white/20">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-white font-semibold">
                                    {docType.label}
                                    {docType.required && <span className="text-red-400 ml-1">*</span>}
                                </label>
                                {hasFile && (
                                    <button
                                        onClick={() => removeFile(docType.key)}
                                        className="text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

                            {preview ? (
                                <div className="relative aspect-video bg-black/50 rounded-lg overflow-hidden">
                                    <img
                                        src={preview}
                                        alt={docType.label}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            ) : (
                                <div className="aspect-video bg-white/5 rounded-lg border-2 border-dashed border-white/20 flex flex-col items-center justify-center">
                                    <DocumentIcon className="w-12 h-12 text-purple-300 mb-2" />
                                    <p className="text-purple-200 text-sm">Nenhum arquivo</p>
                                </div>
                            )}

                            <div className="mt-3 space-y-2">
                                <input
                                    ref={(el) => {
                                        fileInputRefs.current[docType.key] = el;
                                    }}
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileChange(docType.key, file);
                                    }}
                                    className="hidden"
                                />

                                <button
                                    onClick={() => fileInputRefs.current[docType.key]?.click()}
                                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                                >
                                    {hasFile ? 'Trocar Arquivo' : 'Escolher Arquivo'}
                                </button>

                                {/* Camera Button (mobile only) */}
                                <button
                                    onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'image/*';
                                        input.capture = 'environment';
                                        input.onchange = (e) => {
                                            const file = (e.target as HTMLInputElement).files?.[0];
                                            if (file) handleFileChange(docType.key, file);
                                        };
                                        input.click();
                                    }}
                                    className="w-full px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                >
                                    <CameraIcon className="w-5 h-5" />
                                    Tirar Foto
                                </button>
                            </div>
                        </div>
                    );
                })}
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
