import api from './client';

export interface Student {
    id: string;
    cpf: string;
    rg: string;
    rgIssuer?: string;
    birthDate: string;
    gender: string;
    raceColor?: string;
    maritalStatus?: string;
    motherName?: string;
    fatherName?: string;
    nationality?: string;
    birthCity?: string;
    birthState?: string;
    socialName?: string;
    photoUrl?: string | null;
    active: boolean;
    createdAt?: string;
    user: {
        id: string;
        name: string;
        email: string;
        phone: string;
        active: boolean;
    };
    address?: {
        city: string;
        state: string;
        cep?: string;
        street?: string;
        number?: string;
        complement?: string;
        neighborhood?: string;
        zone?: string;
    };
    contact?: {
        phoneAlt?: string;
        hasWhatsapp?: boolean;
        allowWhatsappContact?: boolean;
        allowEmailContact?: boolean;
    };
    socioeconomic?: any;
    professional?: any;
    enrollments?: any[];
    attendances?: any[];
    certificates?: any[];
    _count?: {
        enrollments: number;
    };
}

export interface StudentFilters {
    search?: string;
    state?: 'MA' | 'PI';
    active?: boolean;
    page?: number;
    limit?: number;
}

export interface StudentStats {
    total: number;
    byState: {
        MA: number;
        PI: number;
    };
    activeEnrollments: number;
}

export interface PaginatedStudents {
    data: Student[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export const studentsApi = {
    async getAll(filters?: StudentFilters): Promise<PaginatedStudents> {
        const { data } = await api.get('/admin/students', { params: filters });
        return data;
    },

    async getById(id: string): Promise<Student> {
        const { data } = await api.get(`/admin/students/${id}`);
        return data;
    },

    async create(studentData: any): Promise<Student> {
        const { data } = await api.post('/admin/students', studentData);
        return data;
    },

    async update(id: string, studentData: any): Promise<Student> {
        const { data } = await api.put(`/admin/students/${id}`, studentData);
        return data;
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/admin/students/${id}`);
    },

    async getStats(): Promise<StudentStats> {
        const { data } = await api.get('/admin/students/stats');
        return data;
    },

    async uploadPhoto(id: string, file: File): Promise<{ photoUrl: string }> {
        const formData = new FormData();
        formData.append('photo', file);
        const { data } = await api.patch(`/admin/students/${id}/photo`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
    },
};
