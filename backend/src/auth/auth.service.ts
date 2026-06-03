import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { getPrimaryFrontendUrl } from '../common/cors-origins';
import { isLocalhostAuthBypassEnabled } from './auth-localhost-bypass.util';

/** Roles que exigem Email OTP + Google Authenticator obrigatórios */
const STAFF_ROLES = ['IT_ADMIN', 'ADMIN', 'COORDINATOR', 'FINANCIAL', 'TEACHER', 'DRIVER'];

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private usersService: UsersService,
        private mail: MailService,
    ) { }

    // ─────────────────────────────────────────────────────────────────────────
    // REGISTRO
    // ─────────────────────────────────────────────────────────────────────────

    async register(data: { email: string; password: string; name: string; phone?: string }) {
        const existingUser = await this.prisma.user.findUnique({ where: { email: data.email } });
        if (existingUser) throw new UnauthorizedException('Email already registered');

        const hashedPassword = await bcrypt.hash(data.password, 10);
        const user = await this.prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                name: data.name,
                phone: data.phone,
                role: 'STUDENT',
            },
            select: { id: true, email: true, name: true, phone: true, role: true, active: true, createdAt: true },
        });
        return user;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LOGIN — Etapa 1: valida senha e dispara OTP por email
    // ─────────────────────────────────────────────────────────────────────────

    async login(identifier: string, password: string) {
        if (!identifier) throw new UnauthorizedException('Identifier is required');

        let user: any = null;
        let studentData: any = null;
        const isEmail = identifier.includes('@');

        if (isEmail) {
            user = await this.prisma.user.findUnique({ where: { email: identifier } });
            if (user?.role === 'STUDENT') {
                const student = await this.prisma.student.findUnique({ where: { userId: user.id } });
                if (student) studentData = { id: student.id, cpf: student.cpf };
            }
        } else {
            const cpf = identifier.replace(/\D/g, '');
            const student = await this.prisma.student.findUnique({
                where: { cpf },
                include: { user: true },
            });
            if (student) {
                user = student.user;
                studentData = { id: student.id, cpf: student.cpf };
            } else {
                user = await this.prisma.user.findFirst({
                    where: { cpf, role: { in: ['ADMIN', 'COORDINATOR'] as any } },
                });
            }
        }

        if (!user) throw new UnauthorizedException('Invalid credentials');
        if (!user.active) throw new UnauthorizedException('Account is inactive');

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

        // ── [LOCALHOST] bypass login completo (JWT direto) — ver auth-localhost-bypass.util.ts
        // VPS: AUTH_BYPASS_MFA=false no .env do servidor; este bloco nunca corre em produção.
        if (isLocalhostAuthBypassEnabled(this.configService)) {
            this.logger.warn(
                `[DEV BYPASS] Login completo sem OTP/2FA: ${user.email} (${user.role}) — desative AUTH_BYPASS_MFA em produção!`,
            );
            const tokens = await this.generateTokens(user.id, user.email, user.role);
            const studentDataFull = await this.getStudentData(user.id, user.role);
            return {
                user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role },
                ...tokens,
                ...(studentDataFull ? { student: studentDataFull } : {}),
            };
        }
        // ── [/LOCALHOST] bypass login completo ───────────────────────────────────

        // ── IT_ADMIN: primeiro login — pula OTP (e-mail placeholder não tem caixa) ──
        // Vai direto para a tela de definir e-mail + senha definitivos.
        if (user.role === 'IT_ADMIN' && (user as any).requiresPasswordChange) {
            const firstLoginToken = this.jwtService.sign(
                { sub: user.id, scope: 'pre_auth', step: 'first_login' },
                { expiresIn: '30m' },
            );
            return { requiresPasswordChange: true, preAuthToken: firstLoginToken };
        }

        // ── [LOCALHOST] bypass só e-mail OTP (mantém 2FA) — alternativa ao MFA completo
        // VPS: AUTH_BYPASS_EMAIL_OTP=false
        const bypassEmailOtp =
            this.configService.get('AUTH_BYPASS_EMAIL_OTP') === 'true' &&
            (this.configService.get<string>('NODE_ENV') || '').toLowerCase() !== 'production';
        if (bypassEmailOtp) {
            this.logger.warn(
                `[DEV BYPASS] OTP por e-mail ignorado para ${user.email} (${user.role}) — fluxo 2FA mantido. Desative AUTH_BYPASS_EMAIL_OTP em produção.`,
            );
            await this.clearEmailOtpFields(user.id);
            const userCleared = {
                ...user,
                emailOtpHash: null,
                emailOtpExpiresAt: null,
                emailOtpAttempts: 0,
            };
            const next = await this.afterEmailOtpVerified(userCleared);
            return {
                ...next,
                ...(studentData ? { _studentHint: true } : {}),
            };
        }
        // ── [/LOCALHOST] bypass só e-mail OTP ──────────────────────────────────

        // ── [VPS / fluxo real] MFA Step 1: envia Email OTP ─────────────────────
        const { preAuthToken, emailMasked } = await this.sendEmailOtp(user.id, user.email, user.name);

        return {
            requiresEmailOtp: true,
            preAuthToken,
            emailMasked,
            // Preserva studentData para reanexar ao completar login
            ...(studentData ? { _studentHint: true } : {}),
        };
    }

    /** Limpa estado de OTP por e-mail (após verificação bem-sucedida ou bypass de e-mail em dev). */
    private async clearEmailOtpFields(userId: string) {
        await (this.prisma.user as any).update({
            where: { id: userId },
            data: { emailOtpHash: null, emailOtpExpiresAt: null, emailOtpAttempts: 0 },
        });
    }

    /**
     * Próximo passo após e-mail OTP validado (ou saltado em dev com AUTH_BYPASS_EMAIL_OTP).
     * Mesma regra para IT_ADMIN / setup TOTP / TOTP / JWT final.
     */
    private async afterEmailOtpVerified(userSnapshot: any) {
        const userId = userSnapshot.id;
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.active) {
            throw new UnauthorizedException('Usuário inativo ou não encontrado');
        }
        const u = user as any;
        const isStaff = STAFF_ROLES.includes(user.role);

        if (user.role === 'IT_ADMIN' && u.requiresPasswordChange) {
            const firstLoginToken = this.jwtService.sign(
                { sub: userId, scope: 'pre_auth', step: 'first_login' },
                { expiresIn: '30m' },
            );
            return { requiresPasswordChange: true, preAuthToken: firstLoginToken };
        }

        // 2FA já activo (ex.: activado em Configurações) — sempre exige TOTP neste login.
        // Deve vir antes de requiresTwoFactorSetup para não mandar de volta ao "setup" nem emitir JWT.
        const hasActiveTotp = Boolean(u.twoFactorEnabled && u.twoFactorSecret);
        if (hasActiveTotp) {
            const nextToken = this.jwtService.sign(
                { sub: userId, scope: 'pre_auth', step: 'totp' },
                { expiresIn: '10m' },
            );
            return { requiresTwoFactor: true, preAuthToken: nextToken };
        }

        if (isStaff && u.requiresTwoFactorSetup) {
            const nextToken = this.jwtService.sign(
                { sub: userId, scope: 'pre_auth', step: 'setup_totp' },
                { expiresIn: '15m' },
            );
            return { requiresTwoFactorSetup: true, preAuthToken: nextToken };
        }

        const tokens = await this.generateTokens(user.id, user.email, user.role);
        const studentData = await this.getStudentData(user.id, user.role);
        const suggestTwoFactor = user.role === 'STUDENT' && !u.twoFactorEnabled;

        return {
            user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role },
            ...tokens,
            ...(studentData ? { student: studentData } : {}),
            ...(suggestTwoFactor ? { suggestTwoFactor: true } : {}),
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EMAIL OTP — geração e envio
    // ─────────────────────────────────────────────────────────────────────────

    private async sendEmailOtp(userId: string, email: string, name: string) {
        const code = crypto.randomInt(100000, 999999).toString();
        const hash = crypto.createHash('sha256').update(code).digest('hex');
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await (this.prisma.user as any).update({
            where: { id: userId },
            data: { emailOtpHash: hash, emailOtpExpiresAt: expiresAt, emailOtpAttempts: 0 },
        });

        await this.mail.sendOtpLogin(email, name, code);

        const preAuthToken = this.jwtService.sign(
            { sub: userId, scope: 'pre_auth', step: 'email_otp' },
            { expiresIn: '10m' },
        );

        const emailMasked = email.replace(/(.{2})(.+?)(@.+)/, (_, a, b, c) =>
            a + '*'.repeat(Math.max(1, b.length)) + c
        );

        return { preAuthToken, emailMasked };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EMAIL OTP — verificação (Etapa 2)
    // ─────────────────────────────────────────────────────────────────────────

    async verifyEmailOtp(preAuthToken: string, code: string) {
        // Valida o pre-auth token
        let payload: any;
        try {
            payload = this.jwtService.verify(preAuthToken, {
                secret: this.configService.get('JWT_SECRET'),
            });
        } catch {
            throw new UnauthorizedException('Sessão expirada — faça login novamente');
        }
        if (payload.scope !== 'pre_auth' || payload.step !== 'email_otp') {
            throw new UnauthorizedException('Token inválido para esta etapa');
        }

        const userId = payload.sub;
        const user = await (this.prisma.user as any).findUnique({ where: { id: userId } });
        if (!user || !user.active) throw new UnauthorizedException('Usuário inativo');

        // Verifica tentativas
        if ((user.emailOtpAttempts ?? 0) >= 3) {
            throw new UnauthorizedException('Código bloqueado após 3 tentativas — solicite um novo código');
        }

        // Verifica expiração
        if (!user.emailOtpExpiresAt || new Date(user.emailOtpExpiresAt) < new Date()) {
            throw new UnauthorizedException('Código expirado — solicite um novo');
        }

        // Verifica hash
        const inputHash = crypto.createHash('sha256').update(code.trim()).digest('hex');
        if (!user.emailOtpHash || user.emailOtpHash !== inputHash) {
            await (this.prisma.user as any).update({
                where: { id: userId },
                data: { emailOtpAttempts: { increment: 1 } },
            });
            const remaining = 2 - (user.emailOtpAttempts ?? 0);
            throw new UnauthorizedException(`Código inválido. ${remaining > 0 ? `${remaining} tentativa(s) restante(s)` : 'Solicite um novo código'}`);
        }

        await this.clearEmailOtpFields(userId);

        const userCleared = {
            ...user,
            emailOtpHash: null,
            emailOtpExpiresAt: null,
            emailOtpAttempts: 0,
        };
        return this.afterEmailOtpVerified(userCleared);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIMEIRO LOGIN IT_ADMIN — troca e-mail + senha (etapa intermediária)
    // ─────────────────────────────────────────────────────────────────────────

    async completeFirstLogin(preAuthToken: string, newEmail: string, newPassword: string) {
        let payload: any;
        try {
            payload = this.jwtService.verify(preAuthToken, {
                secret: this.configService.get('JWT_SECRET'),
            });
        } catch {
            throw new UnauthorizedException('Sessão expirada — faça login novamente');
        }
        if (payload.scope !== 'pre_auth' || payload.step !== 'first_login') {
            throw new UnauthorizedException('Token inválido para esta etapa');
        }

        const userId = payload.sub;
        const user = await (this.prisma.user as any).findUnique({ where: { id: userId } });
        if (!user || user.role !== 'IT_ADMIN') throw new UnauthorizedException('Acesso negado');
        if (!(user as any).requiresPasswordChange) throw new BadRequestException('Troca de senha não necessária');

        // Verificar conflito de e-mail
        const emailConflict = await this.prisma.user.findUnique({ where: { email: newEmail } });
        if (emailConflict && emailConflict.id !== userId) {
            throw new BadRequestException('Este e-mail já está em uso por outro usuário');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await (this.prisma.user as any).update({
            where: { id: userId },
            data: { email: newEmail, password: hashedPassword, requiresPasswordChange: false },
        });

        // ── Etapa 2.5: Verificar o NOVO e-mail real via OTP ──────────────────
        // Agora que o e-mail definitivo foi salvo, enviamos um OTP para validar
        // que o usuário tem acesso real à caixa. Após confirmar o OTP,
        // o fluxo segue automaticamente para /setup-2fa (verifyEmailOtp já trata isso).
        const { preAuthToken: otpToken, emailMasked } = await this.sendEmailOtp(
            userId,
            newEmail,
            user.name,
        );
        return { requiresEmailOtp: true, preAuthToken: otpToken, emailMasked };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EMAIL OTP — reenvio
    // ─────────────────────────────────────────────────────────────────────────

    async resendEmailOtp(preAuthToken: string) {

        let payload: any;
        try {
            payload = this.jwtService.verify(preAuthToken, {
                secret: this.configService.get('JWT_SECRET'),
            });
        } catch {
            throw new UnauthorizedException('Sessão expirada — faça login novamente');
        }
        if (payload.scope !== 'pre_auth' || payload.step !== 'email_otp') {
            throw new UnauthorizedException('Token inválido');
        }

        const user = await (this.prisma.user as any).findUnique({ where: { id: payload.sub } });
        if (!user) throw new UnauthorizedException('Usuário não encontrado');

        const { preAuthToken: newToken, emailMasked } = await this.sendEmailOtp(user.id, user.email, user.name);
        return { preAuthToken: newToken, emailMasked };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TOTP SETUP — Etapa 3A: gerar QR Code (setup obrigatório staff)
    // ─────────────────────────────────────────────────────────────────────────

    async generateSetupTotp(preAuthToken: string) {
        let payload: any;
        try {
            payload = this.jwtService.verify(preAuthToken, {
                secret: this.configService.get('JWT_SECRET'),
            });
        } catch {
            throw new UnauthorizedException('Sessão expirada');
        }
        if (payload.scope !== 'pre_auth' || payload.step !== 'setup_totp') {
            throw new UnauthorizedException('Token inválido para esta etapa');
        }

        const user = await (this.prisma.user as any).findUnique({ where: { id: payload.sub } });
        if (!user) throw new UnauthorizedException('Usuário não encontrado');

        const secret = authenticator.generateSecret(20);
        const otpauthUrl = authenticator.keyuri(user.email, 'Qualifica', secret);

        await (this.prisma.user as any).update({
            where: { id: user.id },
            data: { twoFactorSecret: this.encryptSecret(secret) },
        });

        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

        // Mantém o mesmo preAuthToken (ainda step: setup_totp)
        return { qrCodeDataUrl, secret, preAuthToken };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TOTP SETUP — Etapa 3B: confirmar setup e emitir JWT
    // ─────────────────────────────────────────────────────────────────────────

    async completeSetupTotp(preAuthToken: string, totpCode: string) {
        let payload: any;
        try {
            payload = this.jwtService.verify(preAuthToken, {
                secret: this.configService.get('JWT_SECRET'),
            });
        } catch {
            throw new UnauthorizedException('Sessão expirada');
        }
        if (payload.scope !== 'pre_auth' || payload.step !== 'setup_totp') {
            throw new UnauthorizedException('Token inválido para esta etapa');
        }

        const user = await (this.prisma.user as any).findUnique({ where: { id: payload.sub } });
        if (!user || !user.twoFactorSecret) {
            throw new BadRequestException('Secret TOTP não configurado — chame generate primeiro');
        }

        const secret = this.decryptSecret(user.twoFactorSecret);
        const valid = authenticator.verify({ token: totpCode, secret });
        if (!valid) throw new UnauthorizedException('Código do Google Authenticator inválido');

        // Ativa 2FA e remove flag de setup obrigatório
        await (this.prisma.user as any).update({
            where: { id: user.id },
            data: { twoFactorEnabled: true, requiresTwoFactorSetup: false },
        });

        const tokens = await this.generateTokens(user.id, user.email, user.role);
        return {
            user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role },
            ...tokens,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TOTP VERIFY — Login com TOTP já configurado (Etapa 3 normal)
    // ─────────────────────────────────────────────────────────────────────────

    async verify2FAAndLogin(preAuthToken: string, totpCode: string) {
        let payload: any;
        try {
            payload = this.jwtService.verify(preAuthToken, {
                secret: this.configService.get('JWT_SECRET'),
            });
        } catch {
            throw new UnauthorizedException('Sessão expirada — faça login novamente');
        }
        if (payload.scope !== 'pre_auth' || payload.step !== 'totp') {
            throw new UnauthorizedException('Token inválido para esta etapa');
        }

        const user = await (this.prisma.user as any).findUnique({ where: { id: payload.sub } });
        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            throw new BadRequestException('2FA não ativo para este usuário');
        }

        const secret = this.decryptSecret(user.twoFactorSecret);
        const valid = authenticator.verify({ token: totpCode, secret });
        if (!valid) throw new UnauthorizedException('Código 2FA inválido ou expirado');

        const tokens = await this.generateTokens(user.id, user.email, user.role);
        const studentData = await this.getStudentData(user.id, user.role);
        return {
            user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role },
            ...tokens,
            ...(studentData ? { student: studentData } : {}),
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2FA — Gestão (pós-login, endpoints autenticados com JWT completo)
    // ─────────────────────────────────────────────────────────────────────────

    async generate2FA(userId: string): Promise<{ qrCodeDataUrl: string; secret: string }> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new UnauthorizedException('Usuário não encontrado');

        const secret = authenticator.generateSecret(20);
        const otpauthUrl = authenticator.keyuri(user.email, 'Qualifica', secret);

        await (this.prisma.user as any).update({
            where: { id: userId },
            data: { twoFactorSecret: this.encryptSecret(secret) },
        });

        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
        return { qrCodeDataUrl, secret };
    }

    async enable2FA(userId: string, token: string): Promise<void> {
        const user = await (this.prisma.user as any).findUnique({ where: { id: userId } });
        if (!user || !user.twoFactorSecret) {
            throw new BadRequestException('Segredo 2FA não configurado. Chame /auth/2fa/generate primeiro.');
        }
        const secret = this.decryptSecret(user.twoFactorSecret);
        const valid = authenticator.verify({ token, secret });
        if (!valid) throw new UnauthorizedException('Código inválido ou expirado');
        await (this.prisma.user as any).update({
            where: { id: userId },
            data: { twoFactorEnabled: true, requiresTwoFactorSetup: false },
        });
    }

    async disable2FA(userId: string, token: string): Promise<void> {
        const user = await (this.prisma.user as any).findUnique({ where: { id: userId } });
        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            throw new BadRequestException('2FA não ativo');
        }
        const secret = this.decryptSecret(user.twoFactorSecret);
        const valid = authenticator.verify({ token, secret });
        if (!valid) throw new UnauthorizedException('Código 2FA inválido');
        await (this.prisma.user as any).update({
            where: { id: userId },
            data: { twoFactorEnabled: false, twoFactorSecret: null },
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REFRESH / LOGOUT
    // ─────────────────────────────────────────────────────────────────────────

    async refreshToken(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });
            const tokenRecord = await this.prisma.refreshToken.findUnique({
                where: { token: refreshToken },
                include: { user: true },
            });
            if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
                throw new UnauthorizedException('Invalid or expired refresh token');
            }
            const tokens = await this.generateTokens(
                tokenRecord.user.id, tokenRecord.user.email, tokenRecord.user.role,
            );
            await this.prisma.refreshToken.delete({ where: { token: refreshToken } });
            return tokens;
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async logout(userId: string) {
        await this.prisma.refreshToken.deleteMany({ where: { userId } });
        return { message: 'Logged out successfully' };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RESET DE SENHA
    // ─────────────────────────────────────────────────────────────────────────

    async forgotPassword(email: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) return { message: 'Se o e-mail existir, as instruções serão enviadas.' };

        const resetToken = this.jwtService.sign(
            { sub: user.id, type: 'password_reset' },
            { expiresIn: '30m' },
        );
        const base = getPrimaryFrontendUrl().replace(/\/$/, '');
        const resetLink = `${base}/redefinir-senha?token=${encodeURIComponent(resetToken)}`;

        await this.mail.sendPasswordReset(user.email, user.name || 'Utilizador', resetLink);

        if (process.env.NODE_ENV !== 'production') {
            this.logger.debug(`[DEV] Link de reset (também enviado por MailService): ${resetLink}`);
        }
        return { message: 'Se o e-mail existir, as instruções serão enviadas.' };
    }

    async resetPassword(token: string, newPassword: string) {
        let payload: { sub: string; type: string };
        try { payload = this.jwtService.verify(token); }
        catch { throw new UnauthorizedException('Token inválido ou expirado'); }
        if (payload.type !== 'password_reset') throw new UnauthorizedException('Token inválido');
        const hashed = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({ where: { id: payload.sub }, data: { password: hashed } });
        return { message: 'Senha redefinida com sucesso' };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VALIDAÇÃO / UTILITÁRIOS
    // ─────────────────────────────────────────────────────────────────────────

    async validateUser(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, phone: true, role: true, active: true },
        });
        if (!user || !user.active) throw new UnauthorizedException('User not found or inactive');
        return user;
    }

    async checkEmailExists(email: string) {
        const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
        return { exists: !!user };
    }

    async checkCpf(cpf: string) {
        const cleaned = cpf.replace(/\D/g, '');
        const student = await this.prisma.student.findUnique({
            where: { cpf: cleaned },
            select: { id: true, user: { select: { email: true } } },
        });
        if (!student) return { exists: false };
        const email = student.user.email;
        const masked = email.replace(/(.{2})(.+)(@.+)/, (_, a, b, c) => a + '*'.repeat(b.length) + c);
        return { exists: true, maskedEmail: masked };
    }

    private async getStudentData(userId: string, role: string) {
        if (role !== 'STUDENT') return null;
        const student = await this.prisma.student.findUnique({ where: { userId } });
        return student ? { id: student.id, cpf: student.cpf } : null;
    }

    private async generateTokens(userId: string, email: string, role: string) {
        const payload = { sub: userId, email, role };
        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
        });
        const refreshExpiresDays = parseInt(this.configService.get('JWT_REFRESH_EXPIRES_DAYS') || '7', 10);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + refreshExpiresDays);
        await this.prisma.refreshToken.create({ data: { token: refreshToken, userId, expiresAt } });
        return { access_token: accessToken, refresh_token: refreshToken };
    }

    // ── VULN-14: AES-256-GCM para secrets TOTP ────────────────────────────────

    private getTotpKey(): Buffer {
        const key = this.configService.get<string>('TOTP_ENCRYPTION_KEY') ?? '';
        const hex = key.trim();
        const isHex = /^[0-9a-fA-F]+$/.test(hex);
        if (!isHex || hex.length < 64 || hex.length % 2 !== 0) {
            this.logger.warn('TOTP_ENCRYPTION_KEY ausente/inválida — usando fallback derivado de JWT_SECRET');
            return crypto.scryptSync(this.configService.get('JWT_SECRET') || 'dev-fallback', 'totp-salt', 32);
        }
        const parsed = Buffer.from(hex.slice(0, 64), 'hex');
        if (parsed.length !== 32) {
            this.logger.warn('TOTP_ENCRYPTION_KEY inválida para AES-256 — usando fallback derivado de JWT_SECRET');
            return crypto.scryptSync(this.configService.get('JWT_SECRET') || 'dev-fallback', 'totp-salt', 32);
        }
        return parsed;
    }

    private encryptSecret(plaintext: string): string {
        const key = this.getTotpKey();
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
    }

    private decryptSecret(stored: string): string {
        if (!stored.includes(':')) return stored; // retrocompatibilidade
        const [ivHex, tagHex, dataHex] = stored.split(':');
        const key = this.getTotpKey();
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
        return decipher.update(Buffer.from(dataHex, 'hex')).toString('utf8') + decipher.final('utf8');
    }
}
