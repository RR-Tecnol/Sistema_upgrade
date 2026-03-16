'use client';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface Notification {
    id: string;
    type: string;
    message: string;
    timestamp: string;
    read: boolean;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const token =
            localStorage.getItem('token') ||
            localStorage.getItem('access_token');
        if (!token) return;

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

        // Mapeamento de eventos para mensagens legíveis
        const addNotification = (type: string, data: any) => {
            const messages: Record<string, string> = {
                nova_inscricao: `Nova inscrição: ${data.studentName || 'Aluno'} em ${data.courseName || 'Curso'}`,
                inscricao_aprovada: `Inscrição aprovada: ${data.studentName || 'Aluno'} — ${data.courseName || 'Curso'}`,
                frequencia_registrada: `Frequência registrada: ${data.totalRegistros} alunos em ${data.date}`,
                custo_excessivo: `⚠️ Custo excessivo na ação: ${data.nomeAcao}`,
            };
            setNotifications(prev => [
                {
                    id: `${type}-${Date.now()}`,
                    type,
                    message: messages[type] || `Evento: ${type}`,
                    timestamp: data.timestamp || new Date().toISOString(),
                    read: false,
                },
                ...prev.slice(0, 49), // manter máx 50
            ]);
        };

        socket.on('nova_inscricao', d => addNotification('nova_inscricao', d));
        socket.on('inscricao_aprovada', d => addNotification('inscricao_aprovada', d));
        socket.on('frequencia_registrada', d => addNotification('frequencia_registrada', d));
        socket.on('custo_excessivo', d => addNotification('custo_excessivo', d));

        return () => { socket.disconnect(); };
    }, []);

    const markAllRead = () =>
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    const unreadCount = notifications.filter(n => !n.read).length;

    return { notifications, unreadCount, connected, markAllRead };
}
