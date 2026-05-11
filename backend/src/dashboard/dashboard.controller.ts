import { Controller, Get, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.FINANCIAL, UserRole.IT_ADMIN)
@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('stats')
    @ApiOperation({ summary: 'Get overall dashboard statistics' })
    @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
    async getStats() {
        return this.dashboardService.getOverallStats();
    }

    @Get('recent-activity')
    @ApiOperation({ summary: 'Get recent system activity' })
    @ApiResponse({ status: 200, description: 'Recent activity retrieved successfully' })
    async getRecentActivity() {
        return this.dashboardService.getRecentActivity();
    }

    @Get('upcoming-classes')
    @ApiOperation({ summary: 'Get upcoming classes' })
    @ApiResponse({ status: 200, description: 'Upcoming classes retrieved successfully' })
    async getUpcomingClasses() {
        return this.dashboardService.getUpcomingClasses();
    }

    @Get('analytics')
    @ApiOperation({
        summary: 'Dados analíticos (pedagógico + financeiro) para relatórios',
        description:
            'Sem `year`: inscrições últimos 12 meses + finanças acumuladas. Com `year` (e opcional `month`): filtra agregados financeiros e inscrições no ano civil; se `month` definido, finanças só naquele mês.',
    })
    @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
    @ApiQuery({ name: 'year', required: false, description: 'Ano civil (2000–2100)' })
    @ApiQuery({ name: 'month', required: false, description: 'Mês (1–12); obrigatório `year`' })
    async getAnalytics(
        @Query('year') yearStr?: string,
        @Query('month') monthStr?: string,
    ) {
        let year: number | undefined;
        let month: number | undefined;
        if (yearStr !== undefined && yearStr !== '') {
            year = parseInt(yearStr, 10);
            if (Number.isNaN(year) || year < 2000 || year > 2100) {
                throw new BadRequestException('Parâmetro year inválido (use 2000–2100)');
            }
        }
        if (monthStr !== undefined && monthStr !== '') {
            month = parseInt(monthStr, 10);
            if (Number.isNaN(month) || month < 1 || month > 12) {
                throw new BadRequestException('Parâmetro month inválido (use 1–12)');
            }
            if (year == null) {
                throw new BadRequestException('month exige year');
            }
        }
        return this.dashboardService.getAnalytics(year, month);
    }

    @Get('rotas-bi')
    @ApiOperation({ summary: 'BI de rotas por estado, ano e opcionalmente mês (sobreposição do período)' })
    @ApiQuery({ name: 'mes', required: false, description: 'Mês 1–12; exige ano' })
    @ApiResponse({ status: 200, description: 'Rotas BI retrieved successfully' })
    getRotasBi(
        @Query('estado') estado?: string,
        @Query('ano') ano?: string,
        @Query('mes') mesStr?: string,
    ) {
        let anoNum: number | undefined;
        if (ano !== undefined && ano !== '') {
            anoNum = parseInt(ano, 10);
            if (Number.isNaN(anoNum)) {
                throw new BadRequestException('Parâmetro ano inválido');
            }
        }
        let mesNum: number | undefined;
        if (mesStr !== undefined && mesStr !== '') {
            mesNum = parseInt(mesStr, 10);
            if (Number.isNaN(mesNum) || mesNum < 1 || mesNum > 12) {
                throw new BadRequestException('Parâmetro mes inválido (use 1–12)');
            }
            if (anoNum == null) {
                throw new BadRequestException('mes exige ano');
            }
        }
        return this.dashboardService.getRotasBi(estado, anoNum, mesNum);
    }
}
