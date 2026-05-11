'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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

// ─────────────────────────────────────────────────────────────────────────────
// SEGURANÇA CRÍTICA: sessionStorage em vez de localStorage
//
// localStorage é compartilhado entre TODAS as abas do mesmo browser na mesma
// origem. Isso causava o bug de mesclagem de perfis: login na Tab 2 sobrescrevia
// o estado da Tab 1, Tab 3, Tab 4 — vazando dados entre usuários diferentes.
//
// sessionStorage é ISOLADO POR ABA por design do browser:
//   - Tab 1 (Admin)    → sua própria sessão, não vê dados da Tab 2
//   - Tab 2 (Teacher)  → sua própria sessão, não vê dados da Tab 1
//   - F5 / refresh     → mantém sessão (sessionStorage sobrevive ao refresh)
//   - Fechar a aba     → sessão encerrada (comportamento seguro esperado)
//   - Ctrl+T nova aba  → nova aba começa sem sessão (usuário precisa logar)
//
// Consequência intencional: não é possível "carregar" uma sessão em nova aba.
// Isso é o comportamento correto para um sistema multi-role com dados sensíveis.
// ─────────────────────────────────────────────────────────────────────────────
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
                    if (!response.ok) throw new Error('Login failed');
                    const data = await response.json();
                    set({ user: data.user, token: data.access_token, isAuthenticated: true });
                } catch (error) {
                    throw error;
                }
            },

            logout: () => {
                // Limpa sessionStorage (isolado por aba) + quaisquer resquícios de localStorage legado
                if (typeof window !== 'undefined') {
                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('user');
                    sessionStorage.removeItem('student');
                    sessionStorage.removeItem('auth-storage');
                    // Remove legado localStorage para limpeza total
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('student');
                    localStorage.removeItem('auth-storage');
                }
                set({ user: null, token: null, isAuthenticated: false });
            },

            setUser: (user: User, token: string) => {
                set({ user, token, isAuthenticated: true });
            },
        }),
        {
            name: 'auth-storage',
            // sessionStorage: isolado por aba — NUNCA compartilhado entre tabs
            storage: createJSONStorage(() =>
                typeof window !== 'undefined' ? sessionStorage : localStorage
            ),
        }
    )
);
