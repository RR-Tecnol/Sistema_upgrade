import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SettingsService, SystemSettings } from './settings.service';

@ApiTags('Configurações')
@Controller('settings')
export class SettingsController {
    constructor(private readonly svc: SettingsService) {}

    /**
     * GET /settings
     * Retorna as configurações atuais do sistema.
     * Acessível por ADMIN e SUPER_ADMIN.
     */
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COORDINATOR')
    @Get()
    @ApiOperation({ summary: 'Retorna configurações do sistema (REQ-14)' })
    getSettings() {
        return this.svc.get();
    }

    /**
     * PUT /settings
     * Salva as configurações (merge parcial — só os campos enviados são atualizados).
     * Registra quem fez a última alteração com base no JWT.
     */
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COORDINATOR')
    @Put()
    @ApiOperation({ summary: 'Salva configurações do sistema (REQ-14)' })
    updateSettings(@Body() body: Partial<SystemSettings>, @Request() req: any) {
        return this.svc.update(body, req.user.id);
    }

    /**
     * GET /settings/public
     * Retorna um subconjunto seguro das configurações para uso no frontend
     * (sem dados sensíveis como senhas ou modos de debug).
     * Acessível por qualquer usuário autenticado.
     */
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get('public')
    @ApiOperation({ summary: 'Configurações públicas (nome do sistema, manutenção)' })
    getPublicSettings() {
        const s = this.svc.get();
        return {
            nomeSistema: s.nomeSistema,
            manutencao: s.manutencao,
            limiteFrequencia: s.limiteFrequencia,
            idioma: s.idioma,
        };
    }
}
