import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private usersService: UsersService,
    ) { }

    async register(data: { email: string; password: string; name: string; phone?: string; role?: string }) {
        // Check if user already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existingUser) {
            throw new UnauthorizedException('Email already registered');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // Create user
        const user = await this.prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                name: data.name,
                phone: data.phone,
                role: (data.role as any) || 'STUDENT',
            },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                active: true,
                createdAt: true,
            },
        });

        return user;
    }

    async login(identifier: string, password: string) {
        let user;
        let studentData = null;

        if (!identifier) {
            throw new UnauthorizedException('Identifier is required');
        }

        const isEmail = identifier.includes('@');

        if (isEmail) {
            user = await this.prisma.user.findUnique({
                where: { email: identifier },
            });

            if (user && user.role === 'STUDENT') {
                const student = await this.prisma.student.findUnique({
                    where: { userId: user.id },
                });
                if (student) {
                    studentData = { id: student.id, cpf: student.cpf };
                }
            }
        } else {
            // Remove formatting from CPF
            const cpfNumbers = identifier.replace(/\D/g, '');

            // Try to find user by CPF in Student table first
            const student = await this.prisma.student.findUnique({
                where: { cpf: cpfNumbers },
                include: { user: true },
            });

            if (student) {
                // User is a student
                user = student.user;
                studentData = {
                    id: student.id,
                    cpf: student.cpf,
                };
            } else {
                // Try to find admin/coordinator by CPF in User table
                user = await this.prisma.user.findFirst({
                    where: {
                        cpf: cpfNumbers,
                        role: { in: ['ADMIN', 'COORDINATOR'] },
                    },
                });
            }
        }

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if user is active
        if (!user.active) {
            throw new UnauthorizedException('Account is inactive');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Generate tokens
        // S3-03: Se 2FA ativado, não emite JWT agora
        // O frontend deve chamar POST /auth/2fa/verify com o TOTP antes de obter os tokens
        if ((user as any).twoFactorEnabled) {
            return { requiresTwoFactor: true, userId: user.id };
        }

        const tokens = await this.generateTokens(user.id, user.email, user.role);

        const response: any = {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: user.role,
            },
            ...tokens,
        };

        // Add student data if user is a student
        if (studentData) {
            response.student = studentData;
        }

        return response;
    }

    async refreshToken(refreshToken: string) {
        try {
            // Verify refresh token
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });

            // Check if refresh token exists in database
            const tokenRecord = await this.prisma.refreshToken.findUnique({
                where: { token: refreshToken },
                include: { user: true },
            });

            if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
                throw new UnauthorizedException('Invalid or expired refresh token');
            }

            // Generate new tokens
            const tokens = await this.generateTokens(
                tokenRecord.user.id,
                tokenRecord.user.email,
                tokenRecord.user.role,
            );

            // Delete old refresh token
            await this.prisma.refreshToken.delete({
                where: { token: refreshToken },
            });

            return tokens;
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async logout(userId: string) {
        // Delete all refresh tokens for user
        await this.prisma.refreshToken.deleteMany({
            where: { userId },
        });

        return { message: 'Logged out successfully' };
    }

    private async generateTokens(userId: string, email: string, role: string) {
        const payload = { sub: userId, email, role };

        // Generate access token
        const accessToken = this.jwtService.sign(payload);

        // Generate refresh token
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
        });

        // Store refresh token in database
        const expiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d';
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Default 7 days

        await this.prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId,
                expiresAt,
            },
        });

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
        };
    }

    async validateUser(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                active: true,
            },
        });

        if (!user || !user.active) {
            throw new UnauthorizedException('User not found or inactive');
        }

        return user;
    }

    // ─────────────────────────────────────────────
    // S3-03: Google Authenticator (TOTP / RFC 6238)
    // ─────────────────────────────────────────────

    /** PASSO 1: Gera segredo TOTP para o usuário e retorna QR Code em data URL */
    async generate2FA(userId: string): Promise<{ qrCodeDataUrl: string; secret: string }> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new UnauthorizedException('Usuário não encontrado');

        const secret = speakeasy.generateSecret({
            name: `Qualifica (${user.email})`,
            length: 32,
        });

        // Persiste o segredo ANTES da confirmação — ativado apenas no enable2FA()
        await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorSecret: secret.base32 },
        });

        const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);
        return { qrCodeDataUrl, secret: secret.base32 };
    }

    /** PASSO 2: Valida o primeiro código TOTP e ativa o 2FA definitivamente */
    async enable2FA(userId: string, token: string): Promise<void> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.twoFactorSecret) {
            throw new BadRequestException('Segredo 2FA não configurado. Chame /auth/2fa/generate primeiro.');
        }

        const valid = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token,
            window: 1,
        });

        if (!valid) throw new UnauthorizedException('Código inválido ou expirado');

        await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorEnabled: true },
        });
    }

    /** PASSO 3 (login): Valida token TOTP e emite JWT se correto */
    async verify2FAAndLogin(userId: string, token: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            throw new BadRequestException('2FA não ativo para este usuário');
        }

        const valid = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token,
            window: 1,
        });

        if (!valid) throw new UnauthorizedException('Código 2FA inválido ou expirado');

        return this.generateTokens(user.id, user.email, user.role);
    }

    /** PASSO 4: Desativa 2FA após confirmar com token válido */
    async disable2FA(userId: string, token: string): Promise<void> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            throw new BadRequestException('2FA não ativo');
        }

        const valid = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token,
            window: 1,
        });

        if (!valid) throw new UnauthorizedException('Código 2FA inválido');

        await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorEnabled: false, twoFactorSecret: null },
        });
    }
}
