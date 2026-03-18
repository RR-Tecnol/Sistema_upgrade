import { Controller, Get, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TripStatus } from '@prisma/client';

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
