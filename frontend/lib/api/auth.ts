import client from './client';

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    refresh_token: string;
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
        active: boolean;
    };
    student?: any;
}

export const authApi = {
    login: async (data: LoginRequest): Promise<LoginResponse> => {
        const response = await client.post('/auth/login', data);
        return response.data;
    },

    logout: async (): Promise<void> => {
        await client.post('/auth/logout');
    },

    getCurrentUser: async (): Promise<any> => {
        const response = await client.get('/auth/me');
        return response.data;
    },
};
