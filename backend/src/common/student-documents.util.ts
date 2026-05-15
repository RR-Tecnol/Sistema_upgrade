import type { Prisma } from '@prisma/client';

/** Mesmas chaves do fluxo público de inscrição (`Step6Documents` / `EnrollmentDocumentsPreview`). */
export const STUDENT_DOCUMENT_KEYS = ['photo', 'identidade', 'cpfDoc', 'addressProof', 'educationProof'] as const;
export type StudentDocumentKey = (typeof STUDENT_DOCUMENT_KEYS)[number];

export const REQUIRED_STUDENT_DOCUMENT_KEYS: readonly StudentDocumentKey[] = ['photo', 'identidade', 'addressProof'];

const DOC_LABELS: Record<string, string> = {
    photo: 'Selfie de rosto',
    identidade: 'Documento de identidade (RG/CNH)',
    cpfDoc: 'CPF (documento)',
    addressProof: 'Comprovante de residência',
    educationProof: 'Comprovante de escolaridade',
};

export function parseStudentDocumentsJson(raw: Prisma.JsonValue | null | undefined): Record<string, string> {
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const o = raw as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const k of STUDENT_DOCUMENT_KEYS) {
        const v = o[k];
        if (v != null && typeof v === 'string' && v.trim()) out[k] = v.trim();
    }
    return out;
}

export function studentDocumentValuePresent(v: unknown): boolean {
    return v != null && String(v).trim().length > 0;
}

export function isStudentDocumentsComplete(raw: Prisma.JsonValue | null | undefined): boolean {
    const d = parseStudentDocumentsJson(raw);
    return REQUIRED_STUDENT_DOCUMENT_KEYS.every(k => studentDocumentValuePresent(d[k]));
}

export function getMissingRequiredStudentDocumentLabels(raw: Prisma.JsonValue | null | undefined): string[] {
    const d = parseStudentDocumentsJson(raw);
    return REQUIRED_STUDENT_DOCUMENT_KEYS.filter(k => !studentDocumentValuePresent(d[k])).map(k => DOC_LABELS[k] ?? k);
}

/** Só permite chaves conhecidas e valores string (URLs). */
export function sanitizeStudentDocumentsPatch(input: Record<string, unknown> | null | undefined): Record<string, string> {
    if (!input || typeof input !== 'object') return {};
    const out: Record<string, string> = {};
    for (const k of STUDENT_DOCUMENT_KEYS) {
        const v = input[k];
        if (typeof v === 'string' && v.trim().length > 0) out[k] = v.trim().slice(0, 4000);
    }
    return out;
}

export function mergeStudentDocuments(
    current: Prisma.JsonValue | null | undefined,
    patch: Record<string, string>,
): Record<string, string> {
    return { ...parseStudentDocumentsJson(current), ...patch };
}
