import {
    Body, Controller, ConflictException, BadRequestException,
    Post, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsSenderService } from '../notifications/notifications-sender.service';
import * as bcrypt from 'bcryptjs';

class RegisterDto {
    name: string;
    email: string;
    phone?: string;
    cpf?: string;
    password: string;
    role: 'TEACHER' | 'DRIVER';
    birthDate?: string;
    gender?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    cep?: string;
    specialty?: string;
    licenseNumber?: string;
    licenseCategory?: string;
    experienceYears?: number;
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

        return {
            message: 'Cadastro realizado com sucesso! Aguarde a aprovação do administrador.',
            userId: user.id,
        };
    }
}
