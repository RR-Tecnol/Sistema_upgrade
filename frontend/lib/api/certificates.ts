import api from './client';

export interface Certificate {
    id: string;
    studentId: string;
    classId: string;
    verificationCode: string;
    issuedAt: string;
    student?: { user: { name: string }; cpf: string };
    class?: { classIdentifier: string; course?: { name: string } };
}

export const certificatesApi = {
    getMy: async () => {
        const res = await api.get<Certificate[]>('/certificates/my');
        return Array.isArray(res.data) ? res.data : (res.data as any)?.data ?? [];
    },

    verify: async (code: string) => {
        const res = await api.get<Certificate>(`/certificates/verify/${code}`);
        return res.data;
    },

    getEligible: async (classId: string) => {
        const res = await api.get(`/certificates/eligible/${classId}`);
        return res.data;
    },

    issueEligible: async (classId: string) => {
        const res = await api.post(`/certificates/issue-eligible/${classId}`);
        return res.data;
    },

    download: async (id: string) => {
        const res = await api.get(`/certificates/${id}/download`, { responseType: 'blob' });
        return res.data;
    },
};
