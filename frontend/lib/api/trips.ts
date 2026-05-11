import api from './client';

export interface Trip {
    id: string;
    driverId: string;
    truckId?: string;
    origin: string;
    destination: string;
    startDate: string;
    endDate?: string;
    status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    notes?: string;
    createdAt: string;
}

export const tripsApi = {
    getAll: async (params?: { driverId?: string; status?: string; limit?: number }) => {
        const query = new URLSearchParams();
        if (params?.driverId) query.set('driverId', params.driverId);
        if (params?.status) query.set('status', params.status);
        if (params?.limit) query.set('limit', String(params.limit));
        const res = await api.get<Trip[]>(`/trips?${query}`);
        return Array.isArray(res.data) ? res.data : (res.data as any)?.data ?? [];
    },

    getOne: async (id: string) => {
        const res = await api.get<Trip>(`/trips/${id}`);
        return res.data;
    },

    create: async (data: Partial<Trip>) => {
        const res = await api.post<Trip>('/trips', data);
        return res.data;
    },

    update: async (id: string, data: Partial<Trip>) => {
        const res = await api.patch<Trip>(`/trips/${id}`, data);
        return res.data;
    },

    updateStatus: async (id: string, status: string) => {
        const res = await api.patch(`/trips/${id}/status`, { status });
        return res.data;
    },
};
