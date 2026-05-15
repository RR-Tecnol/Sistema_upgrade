'use client';

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getSocketBaseUrl } from '@/lib/socketBase';

export type AdminFinanceTopic = 'contas' | 'reembolsos' | 'imprevistos' | 'inscricoes';

/**
 * UX-5: refrescar listagens admin quando o backend emite eventos de negócio
 * (outra aba, outro admin, ou aprovação que gera Conta a pagar).
 * Inscrições: `nova_inscricao` / `inscricao_aprovada` / `inscricao_rejeitada` (notifyAdmins).
 */
export function useAdminFinanceRefresh(load: () => void, topics: AdminFinanceTopic[]) {
    const loadRef = useRef(load);
    loadRef.current = load;
    const key = topics.slice().sort().join(',');

    useEffect(() => {
        const token =
            sessionStorage.getItem('token') ||
            sessionStorage.getItem('access_token') ||
            localStorage.getItem('token') ||
            localStorage.getItem('access_token');
        if (!token) return;

        const socket = io(`${getSocketBaseUrl()}/notifications`, {
            auth: { token },
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionDelay: 2000,
            reconnectionAttempts: 6,
        });

        const refresh = () => {
            loadRef.current();
        };

        const set = new Set(topics);

        if (set.has('contas')) {
            socket.on('financeiro_listagem_refresh', refresh);
        }
        if (set.has('reembolsos')) {
            socket.on('reembolso_solicitado', refresh);
            socket.on('financeiro_listagem_refresh', refresh);
        }
        if (set.has('imprevistos')) {
            socket.on('imprevisto_cadastrado', refresh);
            socket.on('financeiro_listagem_refresh', refresh);
        }
        if (set.has('inscricoes')) {
            socket.on('nova_inscricao', refresh);
            socket.on('inscricao_aprovada', refresh);
            socket.on('inscricao_rejeitada', refresh);
        }

        return () => {
            socket.disconnect();
        };
    }, [key]);
}
