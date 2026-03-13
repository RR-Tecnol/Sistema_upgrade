import api from './client';

export interface Course {
    id: string;
    name: string;
    description: string;
    durationDaysMA: number;
    durationDaysPI: number;
    workloadHours: number;
    workload?: number;          // alias retornado pelo backend em algumas respostas
    prerequisites?: string;
    syllabus: string;
    availableInMA: boolean;
    availableInPI: boolean;
    isMulticourse: boolean;
    active: boolean;
    createdAt: string;
    updatedAt: string;
    _count?: { classes: number };
}

export interface CreateCourseDto {
    name: string;
    description: string;
    durationDaysMA: number;
    durationDaysPI: number;
    workloadHours: number;
    prerequisites?: string;
    syllabus: string;
    availableInMA: boolean;
    availableInPI: boolean;
    isMulticourse: boolean;
}

export const coursesApi = {
    getAll: async (filters?: { state?: string; active?: boolean; isMulticourse?: boolean }) => {
        const params = new URLSearchParams();
        if (filters?.state) params.append('state', filters.state);
        if (filters?.active !== undefined) params.append('active', String(filters.active));
        if (filters?.isMulticourse !== undefined) params.append('isMulticourse', String(filters.isMulticourse));

        const response = await api.get<Course[]>(`/courses?${params.toString()}`);
        return response.data;
    },

    getOne: async (id: string) => {
        const response = await api.get<Course>(`/courses/${id}`);
        return response.data;
    },

    create: async (data: CreateCourseDto) => {
        const response = await api.post<Course>('/courses', data);
        return response.data;
    },

    update: async (id: string, data: Partial<CreateCourseDto>) => {
        const response = await api.patch<Course>(`/courses/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/courses/${id}`);
        return response.data;
    },

    assignTeacher: async (courseId: string, teacherId: string) => {
        const response = await api.post(`/courses/${courseId}/teachers/${teacherId}`);
        return response.data;
    },

    removeTeacher: async (courseId: string, teacherId: string) => {
        const response = await api.delete(`/courses/${courseId}/teachers/${teacherId}`);
        return response.data;
    },
};
