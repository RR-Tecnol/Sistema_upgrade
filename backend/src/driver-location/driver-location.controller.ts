import {
    Controller, Post, Get, Body, Param, Req,
    UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DriverLocationService } from './driver-location.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { CreateDriverLocationDto, BatchDriverLocationDto } from './dto/create-driver-location.dto';

// LIVRO_DE_REGRAS §2: literais ANTES de :id
@ApiTags('driver-location')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('driver')
export class DriverLocationController {
    constructor(
        private readonly service: DriverLocationService,
        private readonly notifications: NotificationsGateway,
    ) { }

    // ─────────────────────────────────────────────────────────
    // F2.2 — POST /driver/location
    // Motorista envia posição atual (checkin ou polling).
    // DRIVER role only — admin nunca envia posição.
    // ─────────────────────────────────────────────────────────
    @Post('location')
    @Roles('DRIVER')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Motorista envia posicao atual (checkin ou polling a cada 3min)' })
    async saveLocation(@Req() req: any, @Body() dto: CreateDriverLocationDto) {
        const driverUserId = req.user.id; // LIVRO_DE_REGRAS §5: req.user.id SEMPRE

        const tripAtiva = await this.service.findActiveTripForDriver(driverUserId);

        const saved = await this.service.saveLocation({
            driverUserId,
            tripId: tripAtiva?.id,
            latitude: dto.latitude,
            longitude: dto.longitude,
            accuracy: dto.accuracy,
            speed: dto.speed,
            heading: dto.heading,
            source: dto.source,
            capturedAt: new Date(dto.capturedAt),
        });

        // F2.9: emite update para admins via WS (try/catch SEPARADO — LIVRO §6)
        try {
            const motoristaInfo = await this.service['prisma'].user.findUnique({
                where: { id: driverUserId },
                select: { name: true },
            });
            const live = await this.service.getLiveTrackingSnapshot(
                driverUserId,
                dto.latitude,
                dto.longitude,
                dto.speed,
            );
            this.notifications.notifyAdmins('driver_location_update', {
                driverUserId,
                driverName: motoristaInfo?.name,
                lat: dto.latitude,
                lng: dto.longitude,
                speed: dto.speed,
                heading: dto.heading,
                tripId: live?.tripId ?? tripAtiva?.id,
                capturedAt: dto.capturedAt,
                progress: live?.progress,
                kmRemaining: live?.kmRemaining,
                kmTraveled: live?.kmTraveled,
                totalKmPlanned: live?.totalKmPlanned,
                distanceSource: live?.distanceSource,
                eta: live?.eta,
            });
            // F2.8: verifica alertas (sem sinal, parada longa, chegada proxima)
            await this.service.verificarAlertas(driverUserId, motoristaInfo?.name ?? '', tripAtiva?.id);
        } catch { /* WS falhou — nunca bloqueia o save */ }

        return { ok: true, locationId: saved.id, tripId: tripAtiva?.id };
    }

    // ─────────────────────────────────────────────────────────
    // F2.3 — POST /driver/location/batch
    // Envia lote de posicoes capturadas offline (fila localStorage).
    // ─────────────────────────────────────────────────────────
    @Post('location/batch')
    @Roles('DRIVER')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Envia lote de posicoes capturadas offline' })
    async saveBatch(@Req() req: any, @Body() dto: BatchDriverLocationDto) {
        const driverUserId = req.user.id;
        const tripAtiva = await this.service.findActiveTripForDriver(driverUserId);
        const result = await this.service.processarBatch(driverUserId, tripAtiva?.id, dto.locations);

        const last = dto.locations[dto.locations.length - 1];
        if (last) {
            try {
                const motoristaInfo = await this.service['prisma'].user.findUnique({
                    where: { id: driverUserId },
                    select: { name: true },
                });
                const live = await this.service.getLiveTrackingSnapshot(
                    driverUserId,
                    last.latitude,
                    last.longitude,
                    last.speed,
                );
                this.notifications.notifyAdmins('driver_location_update', {
                    driverUserId,
                    driverName: motoristaInfo?.name,
                    lat: last.latitude,
                    lng: last.longitude,
                    speed: last.speed,
                    heading: last.heading,
                    tripId: live?.tripId ?? tripAtiva?.id,
                    capturedAt: last.capturedAt,
                    progress: live?.progress,
                    kmRemaining: live?.kmRemaining,
                    kmTraveled: live?.kmTraveled,
                    totalKmPlanned: live?.totalKmPlanned,
                    distanceSource: live?.distanceSource,
                    eta: live?.eta,
                });
            } catch { /* WS opcional */ }
        }

        return { ok: true, ...result };
    }

    // ─────────────────────────────────────────────────────────
    // F2.4 — GET /driver/location/active  (literais antes de :id!)
    // Todos motoristas com Trip IN_TRANSIT — para mapa admin.
    // ADMIN only.
    // ─────────────────────────────────────────────────────────
    @Get('location/active')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Todos motoristas ativos em tempo real (admin)' })
    async getAtivos() {
        const drivers = await this.service.getMotoristaAtivos();
        return { drivers };
    }

    // ─────────────────────────────────────────────────────────
    // F2.6 — GET /driver/me/performance  (literal antes de :tripId!)
    // KPIs + ranking do motorista autenticado.
    // ─────────────────────────────────────────────────────────
    @Get('me/performance')
    @Roles('DRIVER')
    @ApiOperation({ summary: 'KPIs e ranking do motorista autenticado' })
    async getPerformance(@Req() req: any) {
        return this.service.getPerformance(req.user.id);
    }

    // ─────────────────────────────────────────────────────────
    // F2.5 — GET /driver/location/:tripId/trail
    // Trilha completa de uma viagem para desenhar no mapa.
    // ADMIN only.
    // ─────────────────────────────────────────────────────────
    @Get('location/:tripId/trail')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Trilha completa de uma viagem (admin)' })
    async getTrilha(@Param('tripId') tripId: string) {
        const trail = await this.service.getTrilha(tripId);
        return { tripId, trail };
    }
}
