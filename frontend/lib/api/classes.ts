import api from './client';

export interface Class {
    id: string;
    courseId: string;
    groupId: string;
    cityId: string;
    classIdentifier: string;
    startDate: string;
    endDate: string;
    period: 'MORNING' | 'AFTERNOON' | 'EVENING';
    startTime: string;
    endTime: string;
    vacancies: number;
    reserveSlots?: number;  // REQ-01: vagas de reserva para cotas governamentais
    truckId?: string;
    status: 'PLANNED' | 'ENROLLMENT_OPEN' | 'ENROLLMENT_CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    enrollmentOpenDate?: string;
    enrollmentCloseDate?: string;
    createdAt: string;
    updatedAt: string;
    course?: {
        id: string;
        name: string;
    };
    group?: {
        id: string;
        name: string;
    };
    city?: {
        id: string;
        name: string;
        state: string;
    };
    truck?: {
        id: string;
        identifier: string;
    };
}

export interface CreateClassDto {
    courseId: string;
    groupId: string;
    cityId: string;
    classIdentifier: string;
    startDate: string;
    endDate: string;
    period: 'MORNING' | 'AFTERNOON' | 'EVENING';
    startTime: string;
    endTime: string;
    vacancies: number;
    reserveSlots?: number;  // REQ-01: vagas de reserva para cotas governamentais
    truckId?: string;
    status?: 'PLANNED' | 'ENROLLMENT_OPEN' | 'ENROLLMENT_CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    enrollmentOpenDate?: string;
    enrollmentCloseDate?: string;
}

export const classesApi = {
    getAll: async (filters?: { status?: string; courseId?: string; groupId?: string; cityId?: string; truckId?: string }) => {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.courseId) params.append('courseId', filters.courseId);
        if (filters?.groupId) params.append('groupId', filters.groupId);
        if (filters?.cityId) params.append('cityId', filters.cityId);
        if (filters?.truckId) params.append('truckId', filters.truckId);

        const response = await api.get<Class[]>(`/classes?${params.toString()}`);
        return response.data;
    },

    getOne: async (id: string) => {
        const response = await api.get<Class>(`/classes/${id}`);
        return response.data;
    },

    create: async (data: CreateClassDto) => {
        const response = await api.post<Class>('/classes', data);
        return response.data;
    },

    update: async (id: string, data: Partial<CreateClassDto>) => {
        const response = await api.patch<Class>(`/classes/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/classes/${id}`);
        return response.data;
    },

    updateStatus: async (id: string, status: string) => {
        const response = await api.patch(`/classes/${id}/status`, { status });
        return response.data;
    },

    getStatistics: async (id: string) => {
        const response = await api.get(`/classes/${id}/statistics`);
        return response.data;
    },
};
