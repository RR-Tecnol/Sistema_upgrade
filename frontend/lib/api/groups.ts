import api from './client';

export interface Group {
    id: string;
    name: string;
    state: string;
    createdAt: string;
}

export interface CreateGroupDto {
    name: string;
    state: string;
}

export const groupsApi = {
    getAll: async (filters?: { page?: number; limit?: number; search?: string }) => {
        const params = new URLSearchParams();
        if (filters?.page) params.append('page', String(filters.page));
        if (filters?.limit) params.append('limit', String(filters.limit));
        if (filters?.search) params.append('search', filters.search);
        const qs = params.toString();
        const response = await api.get(`/groups${qs ? `?${qs}` : ''}`);
        return response.data;
    },

    getOne: async (id: string) => {
        const response = await api.get<Group>(`/groups/${id}`);
        return response.data;
    },

    create: async (data: CreateGroupDto) => {
        const response = await api.post<Group>('/groups', data);
        return response.data;
    },

    update: async (id: string, data: Partial<CreateGroupDto>) => {
        const response = await api.patch<Group>(`/groups/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/groups/${id}`);
        return response.data;
    },
};
