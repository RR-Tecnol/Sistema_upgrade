'use client';

import { EnrollmentDocumentsPreview } from '@/components/enrollment/EnrollmentDocumentsPreview';

function getApiOrigin(): string {
    return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api').replace(/\/api\/?$/, '');
}

export function normalizePreviewUrl(raw: string | null | undefined): string {
    const value = String(raw || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith('//')) return `https:${value}`;
    if (value.startsWith('/')) return `${getApiOrigin()}${value}`;
    return `${getApiOrigin()}/${value}`;
}

export function UnifiedDocumentPreview({
    url,
    keyName = 'documento',
}: {
    url?: string | null;
    keyName?: string;
}) {
    const normalized = normalizePreviewUrl(url);
    if (!normalized) return null;

    return (
        <EnrollmentDocumentsPreview
            documents={{ [keyName]: normalized }}
            variant="light"
            adminDownloads
            enableLightbox
        />
    );
}

