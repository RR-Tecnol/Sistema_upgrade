import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            // Try to get token from localStorage
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Only logout on actual 401 Unauthorized from the API
        // Don't logout on network errors or other issues
        if (error.response?.status === 401 && error.response?.data) {
            // Token expired or invalid - confirmed by API
            if (typeof window !== 'undefined') {
                const currentPath = window.location.pathname;

                // Don't redirect if we are already trying to login
                if (currentPath !== '/login') {
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
