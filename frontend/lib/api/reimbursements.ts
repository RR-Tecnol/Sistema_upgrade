import api from './client';

export interface Reimbursement {
    id: string;
    userId: string;
    amount: number;
    description: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    receiptUrl?: string;
    createdAt: string;
    updatedAt: string;
}

export const reimbursementsApi = {
    getAll: async (params?: { userId?: string; status?: string }) => {
        const query = new URLSearchParams();
        if (params?.userId) query.set('userId', params.userId);
        if (params?.status) query.set('status', params.status);
        const res = await api.get<Reimbursement[]>(`/reimbursements?${query}`);
        return Array.isArray(res.data) ? res.data : (res.data as any)?.data ?? [];
    },

    getOne: async (id: string) => {
        const res = await api.get<Reimbursement>(`/reimbursements/${id}`);
        return res.data;
    },

    create: async (data: { amount: number; description: string; receiptUrl?: string }) => {
        const res = await api.post<Reimbursement>('/reimbursements', data);
        return res.data;
    },

    approve: async (id: string) => {
        const res = await api.patch(`/reimbursements/${id}/approve`);
        return res.data;
    },

    /** Corpo alinhado ao DTO do Nest: `rejectionReason` (ALG-10). */
    reject: async (id: string, rejectionReason?: string) => {
        const res = await api.patch(`/reimbursements/${id}/reject`, { rejectionReason: rejectionReason ?? '' });
        return res.data;
    },

    /** Gerar URL pre-assinada para upload de comprovante */
    getPresignedUrl: async (filename: string, contentType: string) => {
        const res = await api.post<{ url: string; key: string }>('/reimbursements/presigned-url', { filename, contentType });
        return res.data;
    },
};
