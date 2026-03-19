import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TripStatus } from '@prisma/client';

// ─── Rotas do MOTORISTA ────────────────────────────────────────────────────────
@ApiTags('driver/trips')
@Controller('driver/trips')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DRIVER')
@ApiBearerAuth()
export class TripsController {
    constructor(private readonly tripsService: TripsService) {}

    @Get()
    @ApiOperation({ summary: 'Viagens do motorista autenticado' })
    @ApiQuery({ name: 'status', required: false, enum: TripStatus })
    async findMyTrips(
        @Request() req: any,
        @Query('status') status?: TripStatus,
    ) {
        return this.tripsService.findByDriver(req.user.id, status);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Detalhe de uma viagem do motorista' })
    async findOne(@Request() req: any, @Param('id') id: string) {
        return this.tripsService.findOne(id, req.user.id);
    }

    @Patch(':id/start')
    @ApiOperation({ summary: 'Iniciar viagem: PLANNED → IN_TRANSIT' })
    async startTrip(
        @Request() req: any,
        @Param('id') id: string,
        @Body('kmStart') kmStart: number,
        @Body('actualDepartureDate') actualDepartureDate?: string,
    ) {
        return this.tripsService.startTrip(id, req.user.id, kmStart, actualDepartureDate);
    }

    @Patch(':id/complete')
    @ApiOperation({ summary: 'Finalizar viagem: IN_TRANSIT → COMPLETED' })
    async completeTrip(
        @Request() req: any,
        @Param('id') id: string,
        @Body('kmEnd') kmEnd: number,
        @Body('actualArrivalDate') actualArrivalDate?: string,
    ) {
        return this.tripsService.completeTrip(id, req.user.id, kmEnd, actualArrivalDate);
    }

    @Patch(':id/notes')
    @ApiOperation({ summary: 'Adicionar nota ao diário de bordo (append)' })
    async addNote(
        @Request() req: any,
        @Param('id') id: string,
        @Body('note') note: string,
    ) {
        return this.tripsService.addNote(id, req.user.id, note);
    }
}

// ─── Rotas do ADMIN ──────────────────────────────────────────────────────────
@ApiTags('admin/trips')
@Controller('admin/trips')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'COORDINATOR')
@ApiBearerAuth()
export class AdminTripsController {
    constructor(private readonly tripsService: TripsService) {}

    @Get()
    @ApiOperation({ summary: '[Admin] Lista todas as viagens com filtros' })
    @ApiQuery({ name: 'status', required: false, enum: TripStatus })
    @ApiQuery({ name: 'driverUserId', required: false })
    async findAll(
        @Query('status') status?: TripStatus,
        @Query('driverUserId') driverUserId?: string,
    ) {
        return this.tripsService.findAllAdmin(status, driverUserId);
    }

    /**
     * [Admin] Geração automática de viagens baseada nos dias de aula de uma turma.
     * Chame este endpoint após cadastrar uma turma com Schedule e Truck.
     * O motorista receberá notificação automática com todas as datas geradas.
     */
    @Post('generate-for-class')
    @ApiOperation({ summary: '[Admin] Gera viagens automaticamente a partir dos dias de aula de uma turma' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                classId:     { type: 'string', description: 'ID da turma' },
                driverUserId:{ type: 'string', description: 'User ID do motorista responsável' },
            },
            required: ['classId', 'driverUserId'],
        },
    })
    async generateTripsForClass(
        @Body('classId') classId: string,
        @Body('driverUserId') driverUserId: string,
    ) {
        return this.tripsService.generateTripsForClass(classId, driverUserId);
    }
}
