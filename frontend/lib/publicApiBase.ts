/**
 * Base da API Nest para fluxos públicos (cadastro por link, inscrição, uploads).
 *
 * No browser usa-se sempre `/api`: o Next.js faz rewrite para `BACKEND_URL` (next.config.js),
 * mesma origem que a app — evita CORS e evita enviar pedidos para a porta do frontend por engano.
 */
export function getPublicApiBaseUrl(): string {
    if (typeof window === 'undefined') {
        const fromEnv = (process.env.NEXT_PUBLIC_API_URL || '').trim();
        if (fromEnv.startsWith('http')) {
            return fromEnv.replace(/\/?$/, '');
        }
        const internal = (
            process.env.BACKEND_URL ||
            process.env.INTERNAL_API_URL ||
            'http://localhost:3002'
        ).replace(/\/$/, '');
        return `${internal}/api`;
    }
    return '/api';
}
