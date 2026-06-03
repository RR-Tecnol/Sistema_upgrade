/**
 * URLs de objectos MinIO acessíveis pelo browser (localhost:9010 ou proxy /storage na VPS).
 * Evita presigned com hostname Docker (`minio:9000`) — BUG-20 / Sprint 1.
 */

import {
    looksLikeAlreadyPresignedGetUrl,
    parseMinioPublicUrlToBucketKey,
} from '../reimbursement/minio-public-url.util';

/** Produção VPS: nginx expõe ficheiros em `https://dominio/storage/...` (ver docker-compose.prod.yml). */
export function isVpsStorageMode(): boolean {
    return !!(process.env.MINIO_PUBLIC_BROWSER_URL || '').trim();
}

/** Base pública para GET no browser — alinhado a `PublicUploadService`. */
export function buildStoredObjectUrl(bucket: string, objectKey: string): string {
    const key = String(objectKey || '').replace(/^\//, '');
    const publicBase = (process.env.MINIO_PUBLIC_BROWSER_URL || '').trim().replace(/\/$/, '');
    if (publicBase) {
        return `${publicBase}/${bucket}/${key}`;
    }
    const host = process.env.MINIO_PUBLIC_HOST || process.env.MINIO_BROWSER_HOST || 'localhost';
    const port = process.env.MINIO_PUBLIC_PORT || process.env.MINIO_BROWSER_PORT || '9010';
    const proto = (process.env.MINIO_USE_SSL || '').toLowerCase() === 'true' ? 'https' : 'http';
    return `${proto}://${host}:${port}/${bucket}/${key}`;
}

/** Config do cliente MinIO usado só para gerar presigned URLs ao browser. */
export function getBrowserMinioClientConfig(): {
    endPoint: string;
    port: number;
    useSSL: boolean;
} {
    const publicBase = (process.env.MINIO_PUBLIC_BROWSER_URL || '').trim();
    if (publicBase) {
        try {
            const u = new URL(publicBase);
            const port = u.port
                ? parseInt(u.port, 10)
                : u.protocol === 'https:'
                  ? 443
                  : 80;
            return {
                endPoint: u.hostname,
                port,
                useSSL: u.protocol === 'https:',
            };
        } catch {
            /* fallback abaixo */
        }
    }

    const internal = (process.env.MINIO_ENDPOINT || 'localhost').toLowerCase();
    if (internal === 'minio') {
        return {
            endPoint: process.env.MINIO_PUBLIC_HOST || process.env.MINIO_BROWSER_HOST || 'localhost',
            port: parseInt(process.env.MINIO_PUBLIC_PORT || process.env.MINIO_BROWSER_PORT || '9010', 10),
            useSSL: (process.env.MINIO_USE_SSL || '').toLowerCase() === 'true',
        };
    }

    return {
        endPoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: parseInt(
            process.env.MINIO_PUBLIC_PORT || process.env.MINIO_BROWSER_PORT || process.env.MINIO_PORT || '9010',
            10,
        ),
        useSSL: (process.env.MINIO_USE_SSL || '').toLowerCase() === 'true',
    };
}

/**
 * URL para abrir no browser: reutiliza URL estável ou reconstrói a partir de bucket/key.
 * Evita devolver presigned com host `minio` quando nginx ou :9010 serve o ficheiro.
 */
export function resolveBrowserViewUrl(storedUrl: string): string | null {
    const raw = String(storedUrl || '').trim();
    if (!raw || raw.startsWith('data:')) return null;

    if (looksLikeAlreadyPresignedGetUrl(raw)) {
        try {
            const u = new URL(raw);
            const host = u.hostname.toLowerCase();
            if (host === 'minio' || host.includes('minio')) {
                const parsed = parseMinioPublicUrlToBucketKey(
                    `http://local${u.pathname}`,
                );
                if (parsed) return buildStoredObjectUrl(parsed.bucket, parsed.key);
            }
        } catch {
            /* tenta parse normal abaixo */
        }
        if (!isVpsStorageMode()) {
            return raw;
        }
    }

    const parsed = parseMinioPublicUrlToBucketKey(raw);
    if (parsed) {
        return buildStoredObjectUrl(parsed.bucket, parsed.key);
    }

    return null;
}
