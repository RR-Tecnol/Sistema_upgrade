'use client';

import { useState } from 'react';
import axios from 'axios';
import { getPublicApiBaseUrl } from '@/lib/publicApiBase';
import { CheckCircleIcon, DocumentIcon } from '@heroicons/react/24/outline';

export const STUDENT_DOCUMENT_SLOTS = [
    { key: 'photo', label: 'Selfie de rosto', required: true },
    { key: 'identidade', label: 'Documento de identidade (RG/CNH)', required: true },
    { key: 'cpfDoc', label: 'CPF (caso não conste no RG/CNH)', required: false },
    { key: 'addressProof', label: 'Comprovante de residência', required: true },
    { key: 'educationProof', label: 'Comprovante de escolaridade', required: false },
] as const;

export type StudentDocumentSlotKey = (typeof STUDENT_DOCUMENT_SLOTS)[number]['key'];

type Variant = 'adminLight' | 'adminDark' | 'student';

const variantStyles: Record<
    Variant,
    { title: string; sub: string; borderEmpty: string; borderOk: string; bgOk: string; tipBg: string; tipBorder: string; tipText: string }
> = {
    adminLight: {
        title: '#111827',
        sub: '#6B7280',
        borderEmpty: '#E5E7EB',
        borderOk: '#BBF7D0',
        bgOk: '#F0FDF4',
        tipBg: '#FFFBEB',
        tipBorder: '#FDE68A',
        tipText: '#92400E',
    },
    adminDark: {
        title: '#F9FAFB',
        sub: '#9CA3AF',
        borderEmpty: 'rgba(255,255,255,0.08)',
        borderOk: 'rgba(5,150,105,0.4)',
        bgOk: 'rgba(5,150,105,0.05)',
        tipBg: 'rgba(251,191,36,0.06)',
        tipBorder: 'rgba(251,191,36,0.2)',
        tipText: '#FCD34D',
    },
    student: {
        title: '#111827',
        sub: '#6B7280',
        borderEmpty: '#E5E7EB',
        borderOk: '#BBF7D0',
        bgOk: '#F0FDF4',
        tipBg: '#EFF6FF',
        tipBorder: '#BFDBFE',
        tipText: '#1E40AF',
    },
};

export function buildDocumentsPayload(docs: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const { key } of STUDENT_DOCUMENT_SLOTS) {
        const v = docs[key]?.trim();
        if (v) out[key] = v;
    }
    return out;
}

export function parseStudentDocumentsFromApi(raw: unknown): Record<string, string> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const o = raw as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const { key } of STUDENT_DOCUMENT_SLOTS) {
        const v = o[key];
        if (typeof v === 'string' && v.trim()) out[key] = v.trim();
    }
    return out;
}

interface StudentDocumentUploadListProps {
    value: Record<string, string>;
    onChange: (next: Record<string, string>) => void;
    variant?: Variant;
    /** Texto curto acima da lista (opcional) */
    hint?: string;
}

export default function StudentDocumentUploadList({
    value,
    onChange,
    variant = 'adminLight',
    hint,
}: StudentDocumentUploadListProps) {
    const [uploading, setUploading] = useState<Record<string, boolean>>({});
    const vs = variantStyles[variant];

    const handleFileUpload = async (key: string, file: File) => {
        setUploading((prev) => ({ ...prev, [key]: true }));
        const form = new FormData();
        form.append('file', file);
        try {
            const res = await axios.post(`${getPublicApiBaseUrl()}/public/upload`, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const url = res.data?.url as string;
            if (url) onChange({ ...value, [key]: url });
        } catch (err: unknown) {
            const msg =
                axios.isAxiosError(err) && err.response?.data?.message
                    ? String(err.response.data.message)
                    : 'Erro ao enviar documento. Tente novamente.';
            alert(msg);
        } finally {
            setUploading((prev) => ({ ...prev, [key]: false }));
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {hint ? (
                <p style={{ fontSize: '0.78rem', color: vs.sub, margin: 0, lineHeight: 1.45 }}>{hint}</p>
            ) : null}
            <div
                style={{
                    padding: '0.75rem 0.9rem',
                    borderRadius: 10,
                    background: vs.tipBg,
                    border: `1px solid ${vs.tipBorder}`,
                }}
            >
                <p style={{ fontSize: '0.75rem', color: vs.tipText, margin: 0, lineHeight: 1.5 }}>
                    Aceitamos PDF, JPG ou PNG. Os ficheiros são enviados de forma segura (mesmo serviço da inscrição pública).
                </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {STUDENT_DOCUMENT_SLOTS.map((docType) => {
                    const url = value[docType.key];
                    const isUploading = uploading[docType.key];
                    return (
                        <div
                            key={docType.key}
                            style={{
                                borderRadius: 12,
                                border: `1px solid ${url ? vs.borderOk : vs.borderEmpty}`,
                                background: url ? vs.bgOk : variant === 'adminDark' ? 'rgba(255,255,255,0.02)' : '#FAFAFA',
                                padding: '0.85rem 1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.75rem',
                                flexWrap: 'wrap',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                                {url ? (
                                    <CheckCircleIcon style={{ width: 22, height: 22, color: '#059669', flexShrink: 0 }} />
                                ) : (
                                    <DocumentIcon style={{ width: 22, height: 22, color: vs.sub, flexShrink: 0 }} />
                                )}
                                <div style={{ minWidth: 0 }}>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: '0.82rem',
                                            fontWeight: 700,
                                            color: url ? '#166534' : vs.title,
                                        }}
                                    >
                                        {docType.label}
                                        {docType.required ? (
                                            <span style={{ color: '#DC2626', marginLeft: 4 }}>*</span>
                                        ) : null}
                                    </p>
                                    {url ? (
                                        <a
                                            href={url}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ fontSize: '0.72rem', color: '#059669', textDecoration: 'none', wordBreak: 'break-all' }}
                                        >
                                            Ver ficheiro
                                        </a>
                                    ) : null}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                <input
                                    id={`doc-upload-${docType.key}`}
                                    type="file"
                                    accept="image/jpeg,image/png,application/pdf"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) void handleFileUpload(docType.key, f);
                                        e.target.value = '';
                                    }}
                                    style={{ display: 'none' }}
                                    disabled={isUploading}
                                />
                                <label
                                    htmlFor={`doc-upload-${docType.key}`}
                                    style={{
                                        padding: '0.35rem 0.75rem',
                                        borderRadius: 8,
                                        border: '1px solid #D1D5DB',
                                        background: '#fff',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        cursor: isUploading ? 'wait' : 'pointer',
                                        opacity: isUploading ? 0.65 : 1,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {isUploading ? '…' : url ? 'Substituir' : 'Enviar'}
                                </label>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
