import { Controller, Post, Body, Get, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    @ApiOperation({ summary: 'Register new user' })
    @ApiResponse({ status: 201, description: 'User registered successfully' })
    @ApiResponse({ status: 400, description: 'Email already registered' })
    async register(
        @Body() body: { email: string; password: string; name: string; phone?: string },
    ) {
        return this.authService.register(body);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login with CPF' })
    @ApiResponse({ status: 200, description: 'Login successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() body: { email: string; password: string }) {
        return this.authService.login(body.email, body.password);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token' })
    @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async refresh(@Body() body: { refresh_token: string }) {
        return this.authService.refreshToken(body.refresh_token);
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Logout user' })
    @ApiResponse({ status: 200, description: 'Logged out successfully' })
    async logout(@Request() req: ExpressRequest & { user: { id: string } }) {
        return this.authService.logout(req.user.id);
    }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getProfile(@Request() req: ExpressRequest & { user: Record<string, unknown> }) {
        return req.user;
    }

    // ─── S3-03: Google Authenticator endpoints ───

    @Post('2fa/generate')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Gera QR Code para ativar Google Authenticator' })
    async generate2FA(@Request() req: ExpressRequest & { user: { id: string } }) {
        return this.authService.generate2FA(req.user.id);
    }

    @Post('2fa/enable')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Confirma o primeiro código TOTP e ativa 2FA' })
    async enable2FA(
        @Request() req: ExpressRequest & { user: { id: string } },
        @Body() body: { token: string },
    ) {
        await this.authService.enable2FA(req.user.id, body.token);
    }

    @Post('2fa/verify')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verifica token TOTP após login (2FA ativo) e emite JWT' })
    async verify2FA(@Body() body: { userId: string; token: string }) {
        return this.authService.verify2FAAndLogin(body.userId, body.token);
    }

    @Post('2fa/disable')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Desativa 2FA após confirmar com token válido' })
    async disable2FA(
        @Request() req: ExpressRequest & { user: { id: string } },
        @Body() body: { token: string },
    ) {
        await this.authService.disable2FA(req.user.id, body.token);
    }
}
