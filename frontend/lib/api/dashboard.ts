import api from './client';

export interface DashboardStats {
    courses: {
        total: number;
        active: number;
    };
    students: {
        total: number;
        byState: Record<string, number>;
        ma?: number;
        pi?: number;
    };
    classes: {
        total: number;
        active: number;
    };
    enrollments: {
        total: number;
        pending: number;
    };
    attendance: {
        rate: number;
        totalRecords: number;
    };
}

export interface Activity {
    type: string;
    action: string;
    description: string;
    timestamp: string;
}

export interface UpcomingClass {
    id: string;
    startDate: string;
    endDate: string;
    course: {
        name: string;
    };
    city: {
        name: string;
        state: string;
    };
    teachers: Array<{
        user: {
            name: string;
        };
    }>;
    _count: {
        enrollments: number;
    };
}

export const dashboardApi = {
    async getStats(): Promise<DashboardStats> {
        const { data } = await api.get('/dashboard/stats');
        return data;
    },

    async getRecentActivity(): Promise<Activity[]> {
        const { data } = await api.get('/dashboard/recent-activity');
        return data;
    },

    async getUpcomingClasses(): Promise<UpcomingClass[]> {
        const { data } = await api.get('/dashboard/upcoming-classes');
        return data;
    },
};
