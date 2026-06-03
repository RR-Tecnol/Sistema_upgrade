import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TripStatus } from '@prisma/client';
import { MinioService } from '../reimbursement/minio.service';
import { buildStoredObjectUrl } from '../common/minio-browser-url.util';

// ─── Rotas do MOTORISTA ────────────────────────────────────────────────────────
@ApiTags('driver/trips')
@Controller('driver/trips')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DRIVER')
@ApiBearerAuth()
export class TripsController {
    constructor(
        private readonly tripsService: TripsService,
        private readonly minioService: MinioService,
    ) {}

    @Get()
    @ApiOperation({ summary: 'Viagens do motorista autenticado' })
    @ApiQuery({ name: 'status', required: false, enum: TripStatus })
    async findMyTrips(
        @Request() req: any,
        @Query('status') status?: TripStatus,
    ) {
        return this.tripsService.findByDriver(req.user.id, status);
    }

    @Get(':id/odometer-photo-url')
    @ApiOperation({ summary: 'URL assinada para pré-visualizar foto do hodômetro (privado MinIO)' })
    @ApiQuery({ name: 'kind', required: true, enum: ['start', 'end'] })
    async getOdometerPhotoDriver(
        @Request() req: any,
        @Param('id') id: string,
        @Query('kind') kind: 'start' | 'end',
    ) {
        return this.tripsService.getOdometerPhotoPresignedUrlForDriver(id, req.user.id, kind);
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
        @Body('kmStart') kmStart?: number,
        @Body('startOdometerPhotoUrl') startOdometerPhotoUrl?: string,
        @Body('actualDepartureDate') actualDepartureDate?: string,
    ) {
        return this.tripsService.startTrip(id, req.user.id, kmStart, startOdometerPhotoUrl, actualDepartureDate);
    }

    @Patch(':id/respond')
    @ApiOperation({ summary: 'Motorista aceita ou recusa viagem planejada' })
    async respondTrip(
        @Request() req: any,
        @Param('id') id: string,
        @Body('decision') decision: 'ACCEPTED' | 'REJECTED',
        @Body('reason') reason?: string,
    ) {
        return this.tripsService.respondTrip(id, req.user.id, decision, reason);
    }

    @Patch(':id/complete')
    @ApiOperation({ summary: 'Finalizar viagem: IN_TRANSIT → COMPLETED' })
    async completeTrip(
        @Request() req: any,
        @Param('id') id: string,
        @Body('endOdometerPhotoUrl') endOdometerPhotoUrl: string,
        @Body('gpsDistanceKm') gpsDistanceKm?: number,
        @Body('kmEnd') kmEnd?: number,
        @Body('actualArrivalDate') actualArrivalDate?: string,
    ) {
        return this.tripsService.completeTrip(id, req.user.id, endOdometerPhotoUrl, gpsDistanceKm, kmEnd, actualArrivalDate);
    }

    @Post('presigned-url')
    @ApiOperation({ summary: 'Gerar URL para upload de foto do painel (MinIO)' })
    async getPresignedUrl(@Body('filename') filename: string, @Request() req: any) {
        const bucket = process.env.MINIO_BUCKET_REPORTS || 'reports';
        const fileKey = `odometer/${req.user.id}/${Date.now()}_${filename}`;
        const uploadUrl = await this.minioService.presignedPutUrl(bucket, fileKey, 900);
        const fileUrl = buildStoredObjectUrl(bucket, fileKey);

        return { uploadUrl, fileKey, fileUrl };
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
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    async findAll(
        @Query('status') status?: TripStatus,
        @Query('driverUserId') driverUserId?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.tripsService.findAllAdmin(status, driverUserId, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }

    @Get(':id/odometer-photo-url')
    @ApiOperation({ summary: '[Admin] URL assinada para pré-visualizar foto do hodômetro (privado MinIO)' })
    @ApiQuery({ name: 'kind', required: true, enum: ['start', 'end'] })
    async getOdometerPhotoAdmin(@Param('id') id: string, @Query('kind') kind: 'start' | 'end') {
        return this.tripsService.getOdometerPhotoPresignedUrlForAdmin(id, kind);
    }

    @Post('manual')
    @ApiOperation({ summary: '[Admin] Criar viagem manual (cidade-cidade ou intra-cidade)' })
    async createManual(
        @Body()
        body: {
            truckId: string;
            originCityId: string;
            destinationCityId: string;
            departureDate: string;
            expectedArrivalDate: string;
            driverUserId: string;
            notes?: string;
            originCep?: string;
            destinationCep?: string;
            originLatitude?: number;
            originLongitude?: number;
            destinationLatitude?: number;
            destinationLongitude?: number;
        },
    ) {
        return this.tripsService.createManualTrip(body);
    }

    @Patch(':id/assign-driver')
    @ApiOperation({ summary: '[Admin] Vincular/revincular motorista em viagem planejada' })
    async assignDriver(@Param('id') id: string, @Body('driverUserId') driverUserId: string) {
        return this.tripsService.assignDriver(id, driverUserId);
    }

    @Patch(':id/rejection-penalty')
    @ApiOperation({ summary: '[Admin] Aplicar penalização por recusa de viagem' })
    async applyRejectionPenalty(
        @Request() req: any,
        @Param('id') id: string,
        @Body('penaltyAmount') penaltyAmount?: number,
        @Body('adminNote') adminNote?: string,
    ) {
        return this.tripsService.applyRejectionPenalty(id, req.user.id, penaltyAmount, adminNote);
    }

    @Patch(':id/validate-audit')
    @ApiOperation({ summary: '[Admin] Registar validação de auditoria operacional (viagem concluída)' })
    async validateAudit(@Request() req: any, @Param('id') id: string) {
        return this.tripsService.validateAuditTrip(id, req.user.id);
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
        @Body('acaoId') acaoId?: string,
    ) {
        return this.tripsService.generateTripsForClass(classId, driverUserId, acaoId);
    }
}
