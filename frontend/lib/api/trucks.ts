import api from './client';

export interface Truck {
    id: string;
    identifier: string;
    licensePlate: string;
    type: 'STANDARD' | 'MULTICOURSE' | 'CAVALINHO' | 'BAU';
    groupId: string;
    state: string;
    capacity: number;
    roomsCount: number;
    status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'INACTIVE';
    modelYear?: string;
    lastMaintenanceDate?: string;
    nextMaintenanceDate?: string;
    photoUrl?: string;
    equipmentList?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    group?: {
        id: string;
        name: string;
        state: string;
    };
}

export interface CreateTruckDto {
    identifier: string;
    licensePlate: string;
    type: 'STANDARD' | 'MULTICOURSE' | 'CAVALINHO' | 'BAU';
    groupId: string;
    state: string;
    capacity: number;
    roomsCount?: number;
    status?: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'INACTIVE';
    modelYear?: string;
    lastMaintenanceDate?: string;
    nextMaintenanceDate?: string;
    photoUrl?: string;
    equipmentList?: string;
    notes?: string;
}

export const trucksApi = {
    getAll: async (filters?: {
        status?: string;
        groupId?: string;
        type?: string;
        state?: string;
        search?: string;
        page?: number;
        limit?: number;
    }) => {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.groupId) params.append('groupId', filters.groupId);
        if (filters?.type) params.append('type', filters.type);
        if (filters?.state) params.append('state', filters.state);
        if (filters?.search) params.append('search', filters.search);
        if (filters?.page) params.append('page', String(filters.page));
        if (filters?.limit) params.append('limit', String(filters.limit));

        const response = await api.get(`/trucks?${params.toString()}`);
        return response.data;
    },

    getOne: async (id: string) => {
        const response = await api.get<Truck>(`/trucks/${id}`);
        return response.data;
    },

    create: async (data: CreateTruckDto) => {
        const response = await api.post<Truck>('/trucks', data);
        return response.data;
    },

    update: async (id: string, data: Partial<CreateTruckDto>) => {
        const response = await api.patch<Truck>(`/trucks/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/trucks/${id}`);
        return response.data;
    },

    updateStatus: async (id: string, status: string) => {
        const response = await api.patch(`/trucks/${id}/status`, { status });
        return response.data;
    },

    checkAvailability: async (id: string, startDate: string, endDate: string) => {
        const response = await api.get(`/trucks/${id}/availability`, {
            params: { startDate, endDate },
        });
        return response.data;
    },
};
