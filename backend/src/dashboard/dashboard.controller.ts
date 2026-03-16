import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.COORDINATOR)
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
    @ApiOperation({ summary: 'Get analytics data for reports page' })
    @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
    async getAnalytics() {
        return this.dashboardService.getAnalytics();
    }

    @Get('rotas-bi')
    @ApiOperation({ summary: 'BI de rotas por estado e ano' })
    @ApiResponse({ status: 200, description: 'Rotas BI retrieved successfully' })
    getRotasBi(
        @Query('estado') estado?: string,
        @Query('ano') ano?: string,
    ) {
        return this.dashboardService.getRotasBi(
            estado,
            ano ? parseInt(ano, 10) : undefined,
        );
    }
}
