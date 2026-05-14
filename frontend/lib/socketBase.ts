/** Base HTTP do backend (sem /api) — alinhada ao API client para Socket.IO */
export function getSocketBaseUrl(): string {
    const explicit = process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, '');
    if (explicit) return explicit;
    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api').replace(/\/$/, '');
    const withoutApi = api.replace(/\/api$/, '');
    return withoutApi || 'http://localhost:3002';
}
