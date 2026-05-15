import api from './client';

export interface Notification {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    readAt: string | null;
    link?: string | null;
    createdAt: string;
}

export interface NotificationsResponse {
    data: Notification[];
    meta: {
        total: number;
        unreadCount: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export const notificationsApi = {
    /** GET /notifications — lista com paginação */
    getAll: async (params?: { unreadOnly?: boolean; page?: number; limit?: number }) => {
        const query = new URLSearchParams();
        if (params?.unreadOnly) query.set('unreadOnly', 'true');
        if (params?.page) query.set('page', String(params.page));
        if (params?.limit) query.set('limit', String(params.limit));
        const res = await api.get<NotificationsResponse>(`/notifications?${query}`);
        return res.data;
    },

    /** PATCH /notifications/read-all */
    markAllRead: async () => {
        await api.patch('/notifications/read-all');
    },

    /** PATCH /notifications/:id/read */
    markRead: async (id: string) => {
        await api.patch(`/notifications/${id}/read`);
    },

    /** DELETE /notifications/:id */
    remove: async (id: string) => {
        await api.delete(`/notifications/${id}`);
    },

    /** DELETE /notifications — limpar todas */
    clearAll: async () => {
        await api.delete('/notifications');
    },
};
