import client from './client';

export interface LoginRequest { email: string; password: string; }

export interface LoginResponse {
    access_token: string;
    refresh_token: string;
    user: { id: string; name: string; email: string; role: string; active: boolean; };
    student?: any;
    suggestTwoFactor?: boolean;
}

// Resposta intermediária — sempre retornada quando login é chamado
export interface LoginOtpResponse {
    requiresEmailOtp: true;
    preAuthToken: string;
    emailMasked: string;
}

export interface EmailOtpResult {
    // Aluno sem 2FA → JWT direto
    access_token?: string;
    refresh_token?: string;
    user?: LoginResponse['user'];
    student?: any;
    suggestTwoFactor?: boolean;
    // IT_ADMIN primeiro login — troca e-mail + senha
    requiresPasswordChange?: boolean;
    // Staff precisa configurar TOTP
    requiresTwoFactorSetup?: boolean;
    preAuthToken?: string;
    // Usuário com TOTP já configurado
    requiresTwoFactor?: boolean;
    // E-mail OTP para novo e-mail (IT_ADMIN após primeiro-login)
    requiresEmailOtp?: boolean;
    emailMasked?: string;
}

export const authApi = {
    login: async (data: LoginRequest): Promise<LoginOtpResponse> => {
        const response = await client.post('/auth/login', data);
        return response.data;
    },

    verifyEmailOtp: async (preAuthToken: string, code: string): Promise<EmailOtpResult> => {
        const response = await client.post('/auth/verify-email-otp', { preAuthToken, code });
        return response.data;
    },

    resendEmailOtp: async (preAuthToken: string): Promise<{ preAuthToken: string; emailMasked: string }> => {
        const response = await client.post('/auth/resend-email-otp', { preAuthToken });
        return response.data;
    },

    setupTotpGenerate: async (preAuthToken: string): Promise<{ qrCodeDataUrl: string; secret: string; preAuthToken: string }> => {
        const response = await client.post('/auth/2fa/setup/generate', { preAuthToken });
        return response.data;
    },

    setupTotpComplete: async (preAuthToken: string, totpCode: string): Promise<LoginResponse> => {
        const response = await client.post('/auth/2fa/setup/complete', { preAuthToken, totpCode });
        return response.data;
    },

    verifyTotp: async (preAuthToken: string, token: string): Promise<LoginResponse> => {
        const response = await client.post('/auth/2fa/verify', { preAuthToken, token });
        return response.data;
    },

    logout: async (): Promise<void> => {
        await client.post('/auth/logout');
    },

    getCurrentUser: async (): Promise<any> => {
        const response = await client.get('/auth/profile');
        return response.data;
    },
};
