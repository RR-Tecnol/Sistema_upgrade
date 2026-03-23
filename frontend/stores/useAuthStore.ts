'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    setUser: (user: User, token: string) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            login: async (email: string, password: string) => {
                try {
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password }),
                    });

                    if (!response.ok) {
                        throw new Error('Login failed');
                    }

                    const data = await response.json();
                    set({
                        user: data.user,
                        token: data.access_token,
                        isAuthenticated: true,
                    });
                } catch (error) {
                    throw error;
                }
            },

            logout: () => {
                // PASSO 3.14: limpa AMBAS as fontes de estado de autenticação
                // Sem isso, Zustand diz "deslogado" mas localStorage ainda tem token válido
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('student');
                localStorage.removeItem('auth-storage');
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                });
            },

            setUser: (user: User, token: string) => {
                set({
                    user,
                    token,
                    isAuthenticated: true,
                });
            },
        }),
        {
            name: 'auth-storage',
        }
    )
);
