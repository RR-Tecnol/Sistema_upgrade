import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AbsencesService } from './absences.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// ─── Driver: seus imprevistos ─────────────────────────────────────────────────
@ApiTags('driver/absences')
@Controller('driver/absences')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DRIVER', 'TEACHER', 'STUDENT')
@ApiBearerAuth()
export class AbsencesController {
    constructor(private readonly absencesService: AbsencesService) {}

    @Get()
    @ApiOperation({ summary: 'Lista imprevistos do usuário autenticado' })
    async findMine(@Request() req: any) {
        return this.absencesService.findByUser(req.user.id);
    }

    @Post()
    @ApiOperation({ summary: 'Registra novo imprevisto (todos os perfis)' })
    async create(
        @Request() req: any,
        @Body() body: { type: string; date: string; description: string; documentUrl?: string },
    ) {
        return this.absencesService.create(req.user.id, body);
    }
}

// ─── Admin: gerencia todos os imprevistos ─────────────────────────────────────
@ApiTags('admin/absences')
@Controller('admin/absences')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'COORDINATOR')
@ApiBearerAuth()
export class AdminAbsencesController {
    constructor(private readonly absencesService: AbsencesService) {}

    @Get()
    @ApiOperation({ summary: '[Admin] Lista todos os imprevistos com filtros' })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'userId', required: false })
    async findAll(
        @Query('status') status?: string,
        @Query('userId') userId?: string,
    ) {
        return this.absencesService.findAll(status, userId);
    }

    @Patch(':id/review')
    @ApiOperation({ summary: '[Admin] Valida, rejeita ou penaliza um imprevisto' })
    async review(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { status: 'VALIDATED' | 'REJECTED' | 'PENALIZED'; adminNote?: string; penalty?: number },
    ) {
        return this.absencesService.review(id, req.user.id, body);
    }
}
