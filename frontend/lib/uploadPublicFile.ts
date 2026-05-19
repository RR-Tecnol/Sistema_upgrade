import api from '@/lib/api/client';

/** Upload via backend → MinIO com URL browser-safe (mesmo fluxo de documentos em funcionários). */
export async function uploadPublicFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/public/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    const url = res.data?.url;
    if (!url || typeof url !== 'string') {
        throw new Error('O servidor não devolveu a URL do ficheiro.');
    }
    return url;
}
