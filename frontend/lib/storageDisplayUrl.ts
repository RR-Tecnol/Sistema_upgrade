/**
 * URLs devolvidas pelo upload (MinIO) vêm como `http://localhost:9010/bucket/key` ou
 * `http://minio:9000/bucket/key` (Docker). Carregar isso directamente no browser falha
 * (hostname interno, porta 9000 vs proxy 9010, etc.).
 * Reescrevemos para `/storage/bucket/key` — o Next.js faz proxy para o MinIO (ver `next.config.js`).
 */
export function storageUrlForBrowser(raw: string | null | undefined): string {
    const u = String(raw || '').trim();
    if (!u) return '';
    if (u.startsWith('/storage/')) return u;
    if (u.startsWith('data:') || u.startsWith('blob:')) return u;

    try {
        const parsed = new URL(u);
        const host = parsed.hostname.toLowerCase();
        const isDockerInternal =
            host === 'minio' ||
            host === 's3' ||
            host.startsWith('minio.') ||
            host.endsWith('.internal');
        if (isDockerInternal && parsed.pathname && parsed.pathname !== '/') {
            return `/storage${parsed.pathname}`;
        }
    } catch {
        /* não é URL absoluta */
    }

    const bases: string[] = [];
    const custom = (process.env.NEXT_PUBLIC_MINIO_PUBLIC_URL || '').trim().replace(/\/$/, '');
    if (custom) bases.push(custom);
    bases.push('http://localhost:9010', 'http://127.0.0.1:9010');
    bases.push('http://localhost:9000', 'http://127.0.0.1:9000');

    if (/^https?:\/\//i.test(u)) {
        for (const base of bases) {
            if (u.startsWith(`${base}/`)) {
                return `/storage/${u.slice(base.length + 1)}`;
            }
        }
        return u;
    }

    if (/^[a-z0-9][a-z0-9_.-]*\/[^/\s]/i.test(u) && !u.startsWith('//')) {
        return `/storage/${u}`;
    }

    return u;
}
