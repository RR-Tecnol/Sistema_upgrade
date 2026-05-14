import {
    Body, Controller, ConflictException, BadRequestException,
    Post, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsSenderService } from '../notifications/notifications-sender.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcryptjs';
import { IsString, IsOptional, IsIn, IsEmail, MinLength } from 'class-validator';

class RegisterDto {
    @IsString() name: string;
    @IsEmail() email: string;
    @IsOptional() @IsString() phone?: string;
    @IsOptional() @IsString() cpf?: string;
    @IsString() @MinLength(6) password: string;
    @IsIn(['TEACHER', 'DRIVER']) role: 'TEACHER' | 'DRIVER';
    @IsOptional() @IsString() birthDate?: string;
    @IsOptional() @IsString() gender?: string;
    @IsOptional() @IsString() street?: string;
    @IsOptional() @IsString() number?: string;
    @IsOptional() @IsString() neighborhood?: string;
    @IsOptional() @IsString() city?: string;
    @IsOptional() @IsString() state?: string;
    @IsOptional() @IsString() cep?: string;
    @IsOptional() @IsString() specialty?: string;
    @IsOptional() @IsString() licenseNumber?: string;
    @IsOptional() @IsString() licenseCategory?: string;
    @IsOptional() experienceYears?: number;
}

/**
 * Endpoint PÚBLICO de auto-registro de professores e motoristas.
 * Sem autenticação. O usuário é criado com active=false (PENDING_APPROVAL).
 * O ADM aprova em admin/funcionarios.
 */
@ApiTags('registro')
@Controller('register')
export class RegisterController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationsSender: NotificationsSenderService,
        private readonly mail: MailService,
    ) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Auto-registro de professor ou motorista (sem autenticação)' })
    @ApiResponse({ status: 201, description: 'Cadastro criado; aguarda aprovação do ADM' })
    @ApiResponse({ status: 409, description: 'E-mail já cadastrado' })
    async register(@Body() dto: RegisterDto) {
        if (!dto.name?.trim() || !dto.email?.trim() || !dto.password) {
            throw new BadRequestException('Nome, e-mail e senha são obrigatórios');
        }
        if (!['TEACHER', 'DRIVER'].includes(dto.role)) {
            throw new BadRequestException('Perfil inválido. Use TEACHER ou DRIVER.');
        }

        const existing = await this.prisma.user.findFirst({ where: { email: dto.email.toLowerCase().trim() } });
        if (existing) throw new ConflictException('E-mail já cadastrado.');

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const user = await this.prisma.user.create({
            data: {
                name: dto.name.trim(),
                email: dto.email.toLowerCase().trim(),
                phone: dto.phone ?? '',
                password: hashedPassword,
                role: dto.role,
                active: false,
            },
            select: { id: true, name: true, email: true, role: true },
        });

        // Notificar todos os ADMs ativos
        try {
            const admins = await this.prisma.user.findMany({
                where: { role: 'ADMIN', active: true },
                select: { id: true },
            });
            const adminIds = admins.map(a => a.id);
            if (adminIds.length) {
                await this.notificationsSender.newRegistrationPending(adminIds, user.name, user.role);
            }
        } catch {
            // Falha de notificação não deve bloquear o registro
        }

        // ── EMAIL: confirmar ao staff que o cadastro foi recebido ──────────────
        // O email avisa que o cadastro está em análise e aguarda aprovação do ADM
        try {
            void this.mail.sendStaffWelcome(user.email, user.name);
        } catch { /* email nunca bloqueia */ }

        return {
            message: 'Cadastro realizado com sucesso! Aguarde a aprovação do administrador.',
            userId: user.id,
        };
    }
}
