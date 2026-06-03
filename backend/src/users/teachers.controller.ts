import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * TeachersController — expõe rotas /api/teachers/me/*
 * Usado pelo portal do professor para registro de ponto e histórico.
 * Delega para UsersService (sem duplicar lógica).
 */
@ApiTags('teachers')
@Controller('teachers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TeachersController {
    constructor(private readonly usersService: UsersService) {}

    /**
     * POST /api/teachers/me/checkin
     * Registra ponto do professor autenticado (PASSO 3.7)
     */
    @Post('me/checkin')
    @Roles('TEACHER', 'ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Registrar ponto do professor (check-in)' })
    @ApiResponse({ status: 201, description: 'Ponto registrado com sucesso' })
    async checkin(@Request() req: any) {
        return this.usersService.registerCheckin(req.user.id);
    }

    /**
     * GET /api/teachers/me/checkins
     * Histórico de pontos do professor autenticado
     */
    @Get('me/checkins')
    @Roles('TEACHER', 'ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Histórico de pontos do professor' })
    @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso' })
    async getCheckins(@Request() req: any) {
        return this.usersService.getCheckins(req.user.id);
    }

    /**
     * POST /api/teachers/me/checkout
     * MEL-07: Registra saída do professor autenticado
     */
    @Post('me/checkout')
    @Roles('TEACHER', 'ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Registrar saída (checkout) do professor' })
    @ApiResponse({ status: 200, description: 'Saída registrada com sucesso' })
    async checkout(@Request() req: any) {
        return this.usersService.registerCheckout(req.user.id);
    }
}
