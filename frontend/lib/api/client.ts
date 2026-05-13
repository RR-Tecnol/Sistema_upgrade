import axios from 'axios';

/** Base da API no Node (SSR / rotas internas). No browser usa-se `/api` no interceptor. */
function resolveServerApiBaseURL(): string {
    const fromEnv = (process.env.NEXT_PUBLIC_API_URL || '').trim();
    if (fromEnv.startsWith('http')) return fromEnv;
    const internal = (
        process.env.BACKEND_URL ||
        process.env.INTERNAL_API_URL ||
        'http://localhost:3002'
    ).replace(/\/$/, '');
    return `${internal}/api`;
}

const api = axios.create({
    headers: {
        'Content-Type': 'application/json',
    },
});

// 1) Base URL: no browser → `/api` (rewrite Next → Nest, mesma origem, sem CORS)
api.interceptors.request.use((config) => {
    const fromEnv = (process.env.NEXT_PUBLIC_API_URL || '').trim();
    const useDirectBrowser =
        process.env.NEXT_PUBLIC_BROWSER_API_BASE === 'direct' && fromEnv.startsWith('http');
    config.baseURL =
        typeof window !== 'undefined'
            ? useDirectBrowser
                ? fromEnv
                : '/api'
            : resolveServerApiBaseURL();
    return config;
});

// 2) Token — sessionStorage por aba (+ fallback localStorage legado)
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = sessionStorage.getItem('token') || localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor — trata erros globais
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Modo manutenção (S5-04)
        if (error.response?.status === 503 && error.response?.data?.maintenance) {
            if (typeof window !== 'undefined' && window.location.pathname !== '/manutencao') {
                window.location.href = '/manutencao';
            }
            return Promise.reject(error);
        }

        // 401 confirmado pelo servidor — limpa APENAS esta aba e redireciona
        if (error.response?.status === 401 && error.response?.data) {
            if (typeof window !== 'undefined') {
                const currentPath = window.location.pathname;
                if (currentPath !== '/login') {
                    // SEGURANÇA: limpa apenas sessionStorage desta aba
                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('user');
                    sessionStorage.removeItem('student');
                    sessionStorage.removeItem('auth-storage');
                    // Remove legado localStorage se existir
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('student');
                    localStorage.removeItem('auth-storage');
                    window.location.href = '/login';
                }
            }
        }
        const res = error.response;
        const data = res?.data;
        if (
            res?.status === 500 &&
            (typeof data === 'string' || data === undefined) &&
            typeof window !== 'undefined'
        ) {
            (res as { data: { message: string } }).data = {
                message:
                    'API indisponível (porta 3002). Inicie o backend: cd backend && npm run start:dev',
            };
        }
        return Promise.reject(error);
    }
);

export default api;
