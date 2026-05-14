import api from './client';

export interface City {
    id: string;
    name: string;
    state: string;
    ibgeCode?: string;
    createdAt: string;
}

export interface CreateCityDto {
    name: string;
    state: string;
    ibgeCode?: string;
}

export const citiesApi = {
    getAll: async (state?: string) => {
        const params = state ? `?state=${state}` : '';
        const response = await api.get<City[]>(`/cities${params}`);
        return response.data;
    },

    getOne: async (id: string) => {
        const response = await api.get<City>(`/cities/${id}`);
        return response.data;
    },

    create: async (data: CreateCityDto) => {
        const response = await api.post<City>('/cities', data);
        return response.data;
    },

    update: async (id: string, data: Partial<CreateCityDto>) => {
        const response = await api.patch<City>(`/cities/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/cities/${id}`);
        return response.data;
    },
};
