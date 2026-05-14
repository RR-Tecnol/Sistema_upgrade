import api from './client';

export interface Employee {
    id: string;
    userId: string;
    role: 'TEACHER' | 'DRIVER' | 'COORDINATOR';
    cpf: string;
    birthDate?: string;
    phone?: string;
    salary?: number;
    hiringDate?: string;
    status: 'ACTIVE' | 'INACTIVE' | 'PENDING_APPROVAL';
    user?: { name: string; email: string };
}

export const employeesApi = {
    getAll: async (params?: { role?: string; status?: string }) => {
        const query = new URLSearchParams();
        if (params?.role) query.set('role', params.role);
        if (params?.status) query.set('status', params.status);
        const res = await api.get<Employee[]>(`/employees?${query}`);
        return Array.isArray(res.data) ? res.data : (res.data as any)?.data ?? [];
    },

    getOne: async (id: string) => {
        const res = await api.get<Employee>(`/employees/${id}`);
        return res.data;
    },

    update: async (id: string, data: Partial<Employee>) => {
        const res = await api.patch<Employee>(`/employees/${id}`, data);
        return res.data;
    },

    deactivate: async (id: string) => {
        const res = await api.delete(`/employees/${id}`);
        return res.data;
    },

    getPayroll: async (employeeId: string) => {
        const res = await api.get(`/employees/${employeeId}/payroll`);
        return res.data;
    },
};
