/**
 * Resolve URLs de media (MinIO, paths relativos) para exibição no browser.
 */
export function resolveMediaUrl(
    raw: string | null | undefined,
    apiOrigin?: string,
): string | null {
    const value = String(raw || '').trim();
    if (!value || value.startsWith('data:')) return null;

    if (/^https?:\/\//i.test(value)) {
        try {
            const u = new URL(value);
            const host = u.hostname.toLowerCase();
            if (host === 'minio' || host.includes('minio')) {
                const path = u.pathname.replace(/^\/+/, '');
                const origin =
                    apiOrigin ||
                    (typeof window !== 'undefined'
                        ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(
                              /\/api\/?$/,
                              '',
                          )
                        : '');
                const storageBase =
                    (process.env.NEXT_PUBLIC_STORAGE_URL || '').replace(/\/$/, '') ||
                    (origin ? `${origin}/storage` : '');
                if (storageBase && path) return `${storageBase}/${path}`;
            }
        } catch {
            /* mantém URL original */
        }
        return value;
    }

    if (value.startsWith('//')) return `https:${value}`;

    const origin =
        apiOrigin ||
        (typeof window !== 'undefined'
            ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '')
            : '');

    const storageBase = (process.env.NEXT_PUBLIC_STORAGE_URL || '').replace(/\/$/, '');
    if (storageBase && !value.startsWith('/')) {
        return `${storageBase}/${value.replace(/^\/+/, '')}`;
    }

    if (value.startsWith('/')) {
        if (storageBase) return `${storageBase}${value}`;
        return origin ? `${origin}${value}` : value;
    }

    if (storageBase) return `${storageBase}/${value}`;
    return origin ? `${origin}/${value}` : value;
}
