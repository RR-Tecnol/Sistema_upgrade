'use client';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '@/lib/api/client';

export interface Notification {
    id: string;
    type: string;
    message: string;
    timestamp: string;
    read: boolean;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

// Mapeamento de tipos de evento → mensagem legível em PT-BR
function buildMessage(type: string, data: any): string {
    const map: Record<string, string> = {
        nova_inscricao:        `Nova inscrição: ${data.studentName || 'Aluno'} em ${data.courseName || 'Curso'}`,
        inscricao_aprovada:    `Inscrição aprovada: ${data.studentName || 'Aluno'} — ${data.courseName || 'Curso'}`,
        inscricao_rejeitada:   `Inscrição rejeitada: ${data.studentName || 'Aluno'} — ${data.courseName || 'Curso'}`,
        frequencia_registrada: `Frequência registrada: ${data.totalRegistros || 0} alunos em ${data.date || ''}`,
        imprevisto_cadastrado: `Novo imprevisto registrado por ${data.userName || 'Usuário'}`,
        reembolso_solicitado:  `Reembolso solicitado: R$ ${Number(data.amount || 0).toFixed(2)} por ${data.userName || 'Usuário'}`,
        reembolso_revisado:    `Reembolso ${data.status === 'APPROVED' ? 'aprovado ✓' : 'rejeitado ✗'}: R$ ${Number(data.amount || 0).toFixed(2)}`,
        custo_excessivo:       `⚠️ Custo excessivo na ação: ${data.nomeAcao || ''}`,
    };
    return map[type] || `Evento: ${type}`;
}

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const token =
            localStorage.getItem('token') ||
            localStorage.getItem('access_token');
        if (!token) return;

        // PASSO 3.1-A: Carregar notificações históricas do banco ao montar
        // Garante que notificações não somem ao recarregar a página
        const fetchStoredNotifications = async () => {
            try {
                const res = await api.get('/notifications?limit=50');
                const stored = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
                setNotifications(stored.map((n: any) => ({
                    id: n.id,
                    type: n.type || 'geral',
                    message: n.message || n.title || `Evento: ${n.type}`,
                    timestamp: n.createdAt || new Date().toISOString(),
                    read: !!n.readAt,
                })));
            } catch {
                // silencioso — notificações históricas são opcionais
            }
        };
        fetchStoredNotifications();

        // PASSO 3.1-B: Conectar ao WebSocket para eventos em tempo real
        const socket = io(`${WS_URL}/notifications`, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 2000,
            reconnectionAttempts: 5,
        });

        socketRef.current = socket;

        socket.on('connect', () => setConnected(true));
        socket.on('disconnect', () => setConnected(false));

        const addNotification = (type: string, data: any) => {
            setNotifications(prev => [
                {
                    id: `${type}-${Date.now()}`,
                    type,
                    message: buildMessage(type, data),
                    timestamp: data.timestamp || new Date().toISOString(),
                    read: false,
                },
                ...prev.slice(0, 49), // máx 50 em memória
            ]);
        };

        // Eventos já existentes
        socket.on('nova_inscricao',        d => addNotification('nova_inscricao', d));
        socket.on('inscricao_aprovada',    d => addNotification('inscricao_aprovada', d));
        socket.on('frequencia_registrada', d => addNotification('frequencia_registrada', d));
        socket.on('custo_excessivo',       d => addNotification('custo_excessivo', d));

        // PASSO 3.1-B: Eventos faltantes adicionados
        socket.on('inscricao_rejeitada',   d => addNotification('inscricao_rejeitada', d));
        socket.on('imprevisto_cadastrado', d => addNotification('imprevisto_cadastrado', d));
        socket.on('reembolso_solicitado',  d => addNotification('reembolso_solicitado', d));
        socket.on('reembolso_revisado',    d => addNotification('reembolso_revisado', d));

        return () => { socket.disconnect(); };
    }, []);

    const markAllRead = () =>
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    const unreadCount = notifications.filter(n => !n.read).length;

    return { notifications, unreadCount, connected, markAllRead };
}
