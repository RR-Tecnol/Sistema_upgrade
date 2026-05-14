'use client';

import { useState } from 'react';
import { useEnrollmentStore } from '@/stores/useEnrollmentStore';
import { CheckCircleIcon, DocumentIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { getPublicApiBaseUrl } from '@/lib/publicApiBase';

export default function Step6Documents() {
    const { formData, updateDocuments, nextStep, prevStep } = useEnrollmentStore();
    const [documents, setDocuments] = useState<Record<string, string>>(formData.documents as any);
    const [uploading, setUploading] = useState<Record<string, boolean>>({});

    const documentTypes = [
        { key: 'photo', label: 'Selfie de Rosto', required: true },
        { key: 'identidade', label: 'Documento de Identidade (RG/CNH)', required: true },
        { key: 'cpfDoc', label: 'CPF (Caso não tenha no RG/CNH)', required: false },
        { key: 'addressProof', label: 'Comprovante de Residência', required: true },
        { key: 'educationProof', label: 'Comprovante de Escolaridade', required: false },
    ];

    const handleFileUpload = async (key: string, file: File) => {
        setUploading(prev => ({ ...prev, [key]: true }));
        const form = new FormData();
        form.append('file', file);

        try {
            const res = await axios.post(`${getPublicApiBaseUrl()}/public/upload`, form, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setDocuments(prev => ({ ...prev, [key]: res.data.url }));
        } catch (err: any) {
            alert(err.response?.data?.message || 'Erro ao enviar documento. Tente novamente.');
        } finally {
            setUploading(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleNext = () => {
        const missing = documentTypes.filter(d => d.required && !documents[d.key]);
        if (missing.length > 0) {
            alert(`Por favor, envie os seguintes documentos obrigatórios:\n${missing.map(d => d.label).join('\n')}`);
            return;
        }
        updateDocuments(documents as any);
        nextStep();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: '0 0 0.25rem' }}>Upload Seguro de Documentos</h2>

            {/* Tip */}
            <div style={{ padding: '0.85rem 1rem', borderRadius: 10, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <p style={{ fontSize: '0.8rem', color: '#FCD34D', margin: 0 }}>
                    📸 <strong>Atenção:</strong> Aceitamos apenas arquivos em formato PDF, JPG ou PNG. Todos os documentos enviados são armazenados de forma criptografada em nuvem para sua segurança.
                </p>
            </div>

            {/* Documents grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {documentTypes.map((docType) => {
                    const url = documents[docType.key];
                    const isUploading = uploading[docType.key];

                    return (
                        <div key={docType.key} style={{
                            borderRadius: 12,
                            border: `1px solid ${url ? 'rgba(5,150,105,0.4)' : 'rgba(255,255,255,0.08)'}`,
                            background: url ? 'rgba(5,150,105,0.05)' : 'rgba(255,255,255,0.02)',
                            padding: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {url ? (
                                    <CheckCircleIcon style={{ width: 24, height: 24, color: '#10B981' }} />
                                ) : (
                                    <DocumentIcon style={{ width: 24, height: 24, color: '#6B7280' }} />
                                )}
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: url ? '#34D399' : '#fff' }}>
                                        {docType.label} {docType.required && <span style={{ color: '#F87171' }}>*</span>}
                                    </p>
                                    {url && <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#10B981', textDecoration: 'none' }}>Visualizar Documento</a>}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.45rem' }}>
                                <input
                                    id={`file-${docType.key}`}
                                    type="file"
                                    accept="image/jpeg,image/png,application/pdf"
                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(docType.key, f); }}
                                    style={{ display: 'none' }}
                                    disabled={isUploading}
                                />
                                <label
                                    htmlFor={`file-${docType.key}`}
                                    style={{ padding: '0.6rem 1rem', borderRadius: 8, border: '1px solid rgba(251,191,36,0.4)', background: isUploading ? 'transparent' : 'rgba(251,191,36,0.08)', color: '#FBBF24', fontSize: '0.75rem', fontWeight: 700, cursor: isUploading ? 'not-allowed' : 'pointer' }}
                                >
                                    {isUploading ? 'Enviando...' : url ? 'Substituir Arquivo' : 'Escolher Arquivo'}
                                </label>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Nav */}
            <div className="nav-row" style={{ marginTop: '1rem' }}>
                <button className="btn-back" onClick={prevStep}>← Voltar</button>
                <button className="btn-next" onClick={handleNext}>Próximo →</button>
            </div>
        </div>
    );
}
