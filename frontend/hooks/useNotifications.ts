'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '@/lib/api/client';
import { getSocketBaseUrl } from '@/lib/socketBase';

export interface Notification {
    id: string;
    type: string;
    message: string;
    timestamp: string;
    read: boolean;
    /** Título persistido na API (opcional — eventos só-WS podem não ter) */
    title?: string;
    link?: string;
}

/** Alinhado ao backend `ws-notification-payload.contract.ts` (+ userName legado em clientes). */
const WS_ACTOR_RESOLUTION_KEYS = [
    'actorName',
    'reviewedByName',
    'adminName',
    'approverName',
    'registeredByName',
    'reviewerName',
    'teacherName',
    'userName',
] as const;

function resolveActorDisplayName(data: Record<string, unknown> | null | undefined): string | undefined {
    if (!data || typeof data !== 'object') return undefined;
    for (const key of WS_ACTOR_RESOLUTION_KEYS) {
        const v = data[key];
        if (typeof v === 'string' && v.trim().length > 0) return v.trim();
    }
    return undefined;
}

function interpolateTemplate(template: string | undefined, data: any): string {
    const raw = String(template || '');
    if (!raw) return raw;
    if (!data || typeof data !== 'object') return raw;
    return raw
        .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
            const v = data?.[key];
            return v === undefined || v === null ? '' : String(v);
        })
        .replace(/\$\{\s*([a-zA-Z0-9_]+)\s*\}/g, (_m, key) => {
            const v = data?.[key];
            return v === undefined || v === null ? '' : String(v);
        });
}

function mapApiNotification(n: any): Notification {
    const data = n?.data;
    const link =
        data && typeof data === 'object' && typeof (data as { link?: string }).link === 'string'
            ? (data as { link: string }).link
            : undefined;
    return {
        id: n.id,
        type: n.type || 'geral',
        title: interpolateTemplate(n.title, data),
        message: interpolateTemplate(n.message || n.title || `Evento: ${n.type}`, data),
        timestamp: n.createdAt || new Date().toISOString(),
        read: !!n.readAt,
        link,
    };
}

// Mapeamento de tipos de evento → mensagem legível em PT-BR
function buildMessage(type: string, data: any): string {
    const actor = resolveActorDisplayName(data);
    const actorPor = actor ? ` por ${actor}` : '';
    const map: Record<string, string> = {
        nova_inscricao:        `Nova inscrição: ${data.studentName || 'Aluno'} em ${data.courseName || 'Curso'}`,
        inscricao_aprovada:    `Inscrição aprovada: ${data.studentName || 'Aluno'} — ${data.courseName || 'Curso'}${actorPor}`,
        inscricao_rejeitada:   `Inscrição rejeitada: ${data.studentName || 'Aluno'} — ${data.courseName || 'Curso'}${actorPor}`,
        frequencia_registrada: `Frequência registrada: ${data.totalRegistros || 0} aluno(s) em ${data.date || ''}${actorPor}`,
        imprevisto_cadastrado: `Novo imprevisto cadastrado${actor ? `${actorPor}` : ''}`,
        reembolso_solicitado:  `Reembolso solicitado: R$ ${Number(data.amount || 0).toFixed(2)}${actorPor}`,
        reembolso_revisado:    `Reembolso ${data.status === 'APPROVED' ? 'aprovado ✓' : 'rejeitado ✗'}: R$ ${Number(data.amount || 0).toFixed(2)}${actorPor}`,
        imprevisto_revisado:   `Imprevisto atualizado${actor ? actorPor : ' pela equipa'}`,
        imprevisto_cadastrado_por_admin: `Imprevisto registado em seu nome${actor ? actorPor : ' pela equipa'}`,
        custo_excessivo:       `⚠️ Custo excessivo na ação: ${data.nomeAcao || ''}`,
        turma_termino_alterado: `Término da turma alterado: ${data.previousEndDate || '?'} → ${data.newEndDate || '?'}`,
        curso_atualizado:       `Curso atualizado: ${data.courseName || 'Curso'}`,
        curso_inativado:        `Curso inativado: ${data.courseName || 'Curso'}`,
        curso_reativado:        `Curso reativado: ${data.courseName || 'Curso'}`,
        feedback_aprovado:     `PIX/feedback aprovado: R$ ${Number(data.pixAmount ?? 0).toFixed(2)}${actorPor}`,
        FEEDBACK_CONTENT_APPROVED: `Triagem do feedback aceite — o valor PIX será confirmado em seguida${actorPor}`,
        feedback_rejeitado:    `Feedback rejeitado${actorPor}`,
        feedback_revertido:    `Aprovação de PIX revertida${actorPor}`,
        feedback_submetido:    'Novo feedback de curso submetido (painel administrativo)',
        aluno_risco_alertado:  `Alerta de frequência: ${data.studentName || 'Aluno'} — ${data.classIdentifier || '?'} (${data.freqPct ?? '?'}%)${actorPor}`,
    };
    return map[type] || `Evento: ${type}`;
}

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    const fetchStoredNotifications = useCallback(async () => {
        try {
            const res = await api.get('/notifications?limit=50');
            const stored = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
            setNotifications(stored.map(mapApiNotification));
        } catch {
            /* silencioso — histórico opcional */
        }
    }, []);

    useEffect(() => {
        // SEGURANÇA: sessionStorage (isolado por aba) com fallback legacy
        const token =
            sessionStorage.getItem('token') ||
            sessionStorage.getItem('access_token') ||
            localStorage.getItem('token') ||
            localStorage.getItem('access_token');
        if (!token) return;

        fetchStoredNotifications();

        // PASSO 3.1-B: Conectar ao WebSocket para eventos em tempo real
        const base = getSocketBaseUrl();
        const socket = io(`${base}/notifications`, {
            auth: { token },
            // Polling primeiro costuma ser mais estável no carregamento (ex.: Firefox); depois upgrade para WS
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionDelay: 2000,
            reconnectionAttempts: 8,
        });

        socketRef.current = socket;

        socket.on('connect', () => setConnected(true));
        socket.on('disconnect', () => setConnected(false));

        const addNotification = (type: string, data: any) => {
            const nid =
                typeof data?.notificationId === 'string' && data.notificationId.length > 0
                    ? data.notificationId
                    : `${type}-${Date.now()}`;
            setNotifications(prev => {
                const rest = prev.filter(n => n.id !== nid);
                return [
                    {
                        id: nid,
                        type,
                        message: buildMessage(type, data),
                        timestamp: data.timestamp || new Date().toISOString(),
                        read: false,
                        title: undefined,
                        link: undefined,
                    },
                    ...rest.slice(0, 49),
                ];
            });
        };

        // Eventos já existentes
        socket.on('nova_inscricao',        d => addNotification('nova_inscricao', d));
        socket.on('inscricao_aprovada',    d => addNotification('inscricao_aprovada', d));
        socket.on('frequencia_registrada', d => addNotification('frequencia_registrada', d));
        socket.on('custo_excessivo',       d => addNotification('custo_excessivo', d));

        // PASSO 3.1-B: Eventos faltantes adicionados
        socket.on('inscricao_rejeitada',   d => addNotification('inscricao_rejeitada', d));
        socket.on('imprevisto_cadastrado', d => addNotification('imprevisto_cadastrado', d));
        socket.on('imprevisto_cadastrado_por_admin', d => addNotification('imprevisto_cadastrado_por_admin', d));
        socket.on('imprevisto_revisado', d => addNotification('imprevisto_revisado', d));
        socket.on('reembolso_solicitado',  d => addNotification('reembolso_solicitado', d));
        socket.on('reembolso_revisado',    d => addNotification('reembolso_revisado', d));
        socket.on('turma_termino_alterado', d => addNotification('turma_termino_alterado', d));
        socket.on('curso_atualizado', d => addNotification('curso_atualizado', d));
        socket.on('curso_inativado', d => addNotification('curso_inativado', d));
        socket.on('curso_reativado', d => addNotification('curso_reativado', d));
        socket.on('feedback_aprovado', d => addNotification('feedback_aprovado', d));
        socket.on('feedback_rejeitado', d => addNotification('feedback_rejeitado', d));
        socket.on('feedback_revertido', d => addNotification('feedback_revertido', d));
        socket.on('feedback_submetido', d => addNotification('feedback_submetido', d));
        socket.on('aluno_risco_alertado', d => addNotification('aluno_risco_alertado', d));

        return () => { socket.disconnect(); };
    }, [fetchStoredNotifications]);

    /** UX-10: persistir no servidor para o estado sobreviver ao F5 */
    const markAllRead = useCallback(async () => {
        try {
            await api.patch('/notifications/read-all');
        } catch {
            return;
        }
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    const markOneRead = useCallback(async (id: string) => {
        await api.patch(`/notifications/${id}/read`).catch(() => {});
        setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    return {
        notifications,
        unreadCount,
        connected,
        markAllRead,
        markOneRead,
        refetch: fetchStoredNotifications,
    };
}
