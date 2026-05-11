import api from './client';

export interface AttendanceRecord {
    id: string;
    studentId: string;
    classId: string;
    date: string;
    present: boolean;
    registeredBy?: string;
    notes?: string;
}

export interface AttendanceSummary {
    total: number;
    present: number;
    absent: number;
    rate: number;
}

export const attendanceApi = {
    /** GET /students/me/attendance — frequência do aluno logado */
    getMy: async (classId?: string) => {
        const query = classId ? `?classId=${classId}` : '';
        const res = await api.get<AttendanceRecord[]>(`/students/me/attendance${query}`);
        return Array.isArray(res.data) ? res.data : (res.data as any)?.data ?? [];
    },

    /** GET /students/me/attendance-summary */
    getMySummary: async () => {
        const res = await api.get<AttendanceSummary>('/students/me/attendance-summary');
        return res.data;
    },

    /** POST /classes/:classId/attendance/bulk — professor registra frequência do dia */
    bulkRecord: async (classId: string, date: string, records: { studentId: string; present: boolean }[]) => {
        const res = await api.post(`/classes/${classId}/attendance/bulk`, { date, records });
        return res.data;
    },

    /** GET /classes/:classId/statistics — estatísticas de frequência da turma */
    getClassStatistics: async (classId: string) => {
        const res = await api.get(`/classes/${classId}/statistics`);
        return res.data;
    },
};
