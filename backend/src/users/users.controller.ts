import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateOwnPasswordDto } from './dto/update-own-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const ALL_ROLES = ['IT_ADMIN', 'ADMIN', 'COORDINATOR', 'TEACHER', 'DRIVER', 'STUDENT'];

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Get()
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'List all users' })
    @ApiQuery({ name: 'role', required: false, description: 'Filter by user role' })
    @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
    async findAll(@Query('role') role?: string) {
        return this.usersService.findAll(role);
    }

    @Get('me')
    @Roles(...ALL_ROLES)
    @ApiOperation({ summary: 'Get own profile (any authenticated user)' })
    @ApiResponse({ status: 200, description: 'Own profile returned' })
    async getMe(@Request() req: any) {
        return this.usersService.findOne(req.user.userId || req.user.id);
    }

    @Patch('me')
    @Roles(...ALL_ROLES)
    @ApiOperation({ summary: 'Update own profile (any authenticated user)' })
    @ApiResponse({ status: 200, description: 'Profile updated successfully' })
    async updateMe(
        @Request() req: any,
        @Body() data: { name?: string; phone?: string },
    ) {
        return this.usersService.update(req.user.userId || req.user.id, data);
    }

    @Patch('me/password')
    @Roles(...ALL_ROLES)
    @ApiOperation({ summary: 'Alterar a própria senha (utilizador autenticado)' })
    @ApiResponse({ status: 200, description: 'Senha atualizada' })
    @ApiResponse({ status: 400, description: 'Senha atual incorreta ou validação falhou' })
    async updateMyPassword(
        @Request() req: any,
        @Body() body: UpdateOwnPasswordDto,
    ) {
        return this.usersService.updateOwnPassword(
            req.user.userId || req.user.id,
            body.currentPassword,
            body.newPassword,
        );
    }

    // ─── PASSO 1.3: Preferências — ANTES de /:id ─────────────────────────────

    // ─── PASSO 3.7: Registro de Ponto Professor — ANTES de /:id ──────────────

    @Post('me/checkin')
    @Roles('TEACHER')
    @ApiOperation({ summary: 'Registrar ponto (check-in) do professor autenticado' })
    @ApiResponse({ status: 201, description: 'Ponto registrado com sucesso' })
    async teacherCheckin(@Request() req: any) {
        return this.usersService.registerCheckin(req.user.id);
    }

    @Get('me/checkins')
    @Roles('TEACHER')
    @ApiOperation({ summary: 'Histórico de pontos do professor autenticado' })
    @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso' })
    async getMyCheckins(@Request() req: any) {
        return this.usersService.getCheckins(req.user.id);
    }

    @Post('me/driver-checkin')
    @Roles('DRIVER')
    @ApiOperation({ summary: 'Registrar ponto do motorista autenticado' })
    @ApiResponse({ status: 201, description: 'Ponto do motorista registrado' })
    async driverCheckin(@Request() req: any) {
        return this.usersService.registerDriverCheckin(req.user.id);
    }

    @Get('me/driver-checkins')
    @Roles('DRIVER')
    @ApiOperation({ summary: 'Histórico de pontos do motorista' })
    @ApiResponse({ status: 200, description: 'Histórico de motorista retornado' })
    async getMyDriverCheckins(@Request() req: any) {
        return this.usersService.getDriverCheckins(req.user.id);
    }

    // MEL-07: checkout motorista
    @Post('me/driver-checkout')
    @Roles('DRIVER')
    @ApiOperation({ summary: 'MEL-07: Registrar saída do motorista autenticado' })
    @ApiResponse({ status: 200, description: 'Saída do motorista registrada' })
    async driverCheckout(@Request() req: any) {
        return this.usersService.registerDriverCheckout(req.user.id);
    }

    @Get('me/preferences')
    @Roles(...ALL_ROLES)
    @ApiOperation({ summary: 'Buscar preferências do usuário autenticado' })
    @ApiResponse({ status: 200, description: 'Preferências retornadas com defaults caso não existam' })
    async getMyPreferences(@Request() req: any) {
        return this.usersService.getPreferences(req.user.id);
    }

    @Patch('me/preferences')
    @Roles(...ALL_ROLES)
    @ApiOperation({ summary: 'Atualizar preferências do usuário autenticado' })
    @ApiResponse({ status: 200, description: 'Preferências atualizadas com sucesso' })
    async updateMyPreferences(
        @Request() req: any,
        @Body() data: {
            notifEmail?: boolean;
            notifCertificado?: boolean;
            notifInscricao?: boolean;
            notifFrequencia?: boolean;
            animacoes?: boolean;
            fonteGrande?: boolean;
        },
    ) {
        return this.usersService.updatePreferences(req.user.id, data);
    }

    @Get(':id')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiResponse({ status: 200, description: 'User retrieved successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Update user' })
    @ApiResponse({ status: 200, description: 'User updated successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async update(@Param('id') id: string, @Body() data: { name?: string; phone?: string; active?: boolean }) {
        return this.usersService.update(id, data);
    }

    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Deactivate user' })
    @ApiResponse({ status: 200, description: 'User deactivated successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async deactivate(@Param('id') id: string) {
        return this.usersService.deactivate(id);
    }
}
