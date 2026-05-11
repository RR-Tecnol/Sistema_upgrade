import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor — injeta token da aba atual
// SEGURANÇA: sessionStorage é isolado por aba; cada tab usa seu próprio token
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            // Lê de sessionStorage (por aba) com fallback legacy para localStorage
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
        return Promise.reject(error);
    }
);

export default api;
