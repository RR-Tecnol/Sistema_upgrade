/**
 * Extrai bucket + objectKey de URLs públicas gravadas após upload (formato Nest/reembolso).
 * Ex.: http://host:9010/reimbursements/userId/arquivo.jpg → { bucket, key }
 */
export function parseMinioPublicUrlToBucketKey(storedUrl: string): { bucket: string; key: string } | null {
    const v = String(storedUrl || '').trim();
    if (!v || v.startsWith('data:')) return null;

    try {
        const u = new URL(v);
        let parts = u.pathname.split('/').filter(Boolean);
        // VPS: https://dominio/storage/<bucket>/<key...>
        if (parts[0] === 'storage') {
            parts = parts.slice(1);
        }
        if (parts.length < 2) return null;
        return { bucket: parts[0], key: parts.slice(1).join('/') };
    } catch {
        return null;
    }
}

export function looksLikeAlreadyPresignedGetUrl(url: string): boolean {
    const v = url.toLowerCase();
    return v.includes('x-amz-algorithm') || v.includes('x-amz-credential') || v.includes('signature=');
}
