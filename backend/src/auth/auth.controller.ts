import { Controller, Post, Body, Get, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PreAuthGuard } from './guards/pre-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    // ─── Etapa 1: Login (credenciais → dispara Email OTP) ────────────────────

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @ApiOperation({ summary: 'Login — valida credenciais e envia OTP por email' })
    @ApiResponse({ status: 200, description: '{ requiresEmailOtp: true, preAuthToken, emailMasked }' })
    @ApiResponse({ status: 429, description: 'Muitas tentativas' })
    async login(@Body() body: { email: string; password: string }) {
        return this.authService.login(body.email, body.password);
    }

    // ─── Etapa 2: Verificar Email OTP ─────────────────────────────────────────

    @Post('verify-email-otp')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 3, ttl: 600000 } }) // 3/10min por IP
    @ApiOperation({ summary: 'Verifica código OTP enviado por email' })
    @ApiResponse({ status: 200, description: 'JWT ou próxima etapa MFA' })
    async verifyEmailOtp(@Body() body: { preAuthToken: string; code: string }) {
        return this.authService.verifyEmailOtp(body.preAuthToken, body.code);
    }

    @Post('resend-email-otp')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 2, ttl: 300000 } }) // 2/5min por IP
    @ApiOperation({ summary: 'Reenvia código OTP por email' })
    async resendEmailOtp(@Body() body: { preAuthToken: string }) {
        return this.authService.resendEmailOtp(body.preAuthToken);
    }

    // ─── Etapa intermediária: Primeiro Login IT_ADMIN — trocar e-mail + senha ─

    @Post('first-login/complete')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 5, ttl: 300000 } })
    @ApiOperation({ summary: 'IT_ADMIN: define e-mail e senha definitivos no primeiro login' })
    @ApiResponse({ status: 200, description: '{ requiresTwoFactorSetup: true, preAuthToken }' })
    async completeFirstLogin(@Body() body: { preAuthToken: string; newEmail: string; newPassword: string }) {
        return this.authService.completeFirstLogin(body.preAuthToken, body.newEmail, body.newPassword);
    }

    // ─── Etapa 3A: Setup TOTP obrigatório (staff) — gerar QR Code ────────────

    @Post('2fa/setup/generate')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 5, ttl: 300000 } })
    @UseGuards(PreAuthGuard)
    @ApiOperation({ summary: 'Gera QR Code para setup obrigatório do Google Authenticator' })
    async setupGenerate(@Request() req: any) {
        return this.authService.generateSetupTotp(req.body.preAuthToken);
    }

    // ─── Etapa 3B: Confirmar setup TOTP → emite JWT ───────────────────────────

    @Post('2fa/setup/complete')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 3, ttl: 900000 } }) // 3/15min
    @UseGuards(PreAuthGuard)
    @ApiOperation({ summary: 'Confirma setup TOTP e emite JWT completo' })
    async setupComplete(@Body() body: { preAuthToken: string; totpCode: string }) {
        return this.authService.completeSetupTotp(body.preAuthToken, body.totpCode);
    }

    // ─── Etapa 3 (normal): Verificar TOTP já configurado → emite JWT ──────────

    @Post('2fa/verify')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 3, ttl: 900000 } }) // 3/15min
    @ApiOperation({ summary: 'Verifica código TOTP (Google Auth) e emite JWT' })
    @ApiResponse({ status: 200, description: 'JWT emitido' })
    @ApiResponse({ status: 429, description: 'Muitas tentativas — aguarde 15 minutos' })
    async verify2FA(@Body() body: { preAuthToken: string; token: string }) {
        return this.authService.verify2FAAndLogin(body.preAuthToken, body.token);
    }

    // ─── 2FA pós-login (gestão da conta) ─────────────────────────────────────

    @Post('2fa/generate')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Gera QR Code para ativar 2FA (usuário autenticado)' })
    async generate2FA(@Request() req: ExpressRequest & { user: { id: string } }) {
        return this.authService.generate2FA(req.user.id);
    }

    @Post('2fa/enable')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Confirma código TOTP e ativa 2FA' })
    async enable2FA(
        @Request() req: ExpressRequest & { user: { id: string } },
        @Body() body: { token: string },
    ) {
        await this.authService.enable2FA(req.user.id, body.token);
    }

    @Post('2fa/disable')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Desativa 2FA após confirmar código' })
    async disable2FA(
        @Request() req: ExpressRequest & { user: { id: string } },
        @Body() body: { token: string },
    ) {
        await this.authService.disable2FA(req.user.id, body.token);
    }

    // ─── Utilitários ──────────────────────────────────────────────────────────

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 3, ttl: 300000 } })
    async forgotPassword(@Body() body: { email: string }) {
        return this.authService.forgotPassword(body.email);
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 5, ttl: 300000 } })
    async resetPassword(@Body() body: { token: string; newPassword: string }) {
        return this.authService.resetPassword(body.token, body.newPassword);
    }

    @Post('check-email')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    async checkEmail(@Body() body: { email: string }) {
        return this.authService.checkEmailExists(body.email);
    }

    @Post('check-cpf')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    async checkCpf(@Body() body: { cpf: string }) {
        return this.authService.checkCpf(body.cpf);
    }

    @Post('register')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async register(@Body() body: { email: string; password: string; name: string; phone?: string }) {
        return this.authService.register(body);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 20, ttl: 60000 } })
    async refresh(@Body() body: { refresh_token: string }) {
        return this.authService.refreshToken(body.refresh_token);
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    async logout(@Request() req: ExpressRequest & { user: { id: string } }) {
        return this.authService.logout(req.user.id);
    }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    async getProfile(@Request() req: ExpressRequest & { user: Record<string, unknown> }) {
        return req.user;
    }
}
