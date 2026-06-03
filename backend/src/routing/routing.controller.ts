import { Controller, Get, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { fetchOsrmDrivingRoute } from './osrm-route.util';

@ApiTags('routing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('routing')
export class RoutingController {
    @Get('driving')
    @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL', 'DRIVER', 'TEACHER')
    @ApiOperation({ summary: 'Rota rodoviária A→B (OSRM, segue ruas/avenidas)' })
    @ApiQuery({ name: 'fromLat', type: Number, required: true })
    @ApiQuery({ name: 'fromLng', type: Number, required: true })
    @ApiQuery({ name: 'toLat', type: Number, required: true })
    @ApiQuery({ name: 'toLng', type: Number, required: true })
    async drivingRoute(
        @Query('fromLat') fromLat: string,
        @Query('fromLng') fromLng: string,
        @Query('toLat') toLat: string,
        @Query('toLng') toLng: string,
    ) {
        const from = { lat: parseFloat(fromLat), lng: parseFloat(fromLng) };
        const to = { lat: parseFloat(toLat), lng: parseFloat(toLng) };
        if ([from.lat, from.lng, to.lat, to.lng].some(n => !Number.isFinite(n))) {
            throw new BadRequestException('Coordenadas inválidas');
        }

        const coordinates = await fetchOsrmDrivingRoute(from, to);
        return {
            coordinates,
            pointCount: coordinates.length,
            source: coordinates.length > 2 ? 'osrm' : 'unavailable',
        };
    }
}
