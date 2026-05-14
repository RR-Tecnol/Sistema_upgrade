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
    getAll: async () => {
        const response = await api.get<Group[]>('/groups');
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
