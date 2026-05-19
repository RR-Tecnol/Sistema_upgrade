import { resolveBrowserViewUrl } from './minio-browser-url.util';

/** Normaliza URL MinIO/presigned para abrir no browser (VPS /storage ou :9010). */
export function resolveStoredMediaUrl(stored: string | null | undefined): string | null {
    const raw = String(stored || '').trim();
    if (!raw || raw.startsWith('data:')) return null;
    const resolved = resolveBrowserViewUrl(raw);
    return resolved ?? raw;
}
