import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { CitiesService } from './cities.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('cities')
@Controller('cities')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CitiesController {
    constructor(private citiesService: CitiesService) { }

    @Get()
    @Roles('ADMIN', 'COORDINATOR', 'TEACHER', 'DRIVER', 'STUDENT')
    @ApiOperation({ summary: 'List all cities' })
    @ApiQuery({ name: 'state', required: false, description: 'Filter by state (MA or PI)' })
    @ApiResponse({ status: 200, description: 'Cities retrieved successfully' })
    async findAll(@Query('state') state?: string) {
        return this.citiesService.findAll(state);
    }

    @Get(':id')
    @Roles('ADMIN', 'COORDINATOR', 'TEACHER', 'DRIVER', 'STUDENT')
    @ApiOperation({ summary: 'Get city by ID' })
    @ApiResponse({ status: 200, description: 'City retrieved successfully' })
    @ApiResponse({ status: 404, description: 'City not found' })
    async findOne(@Param('id') id: string) {
        return this.citiesService.findOne(id);
    }

    @Post()
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Create new city' })
    @ApiResponse({ status: 201, description: 'City created successfully' })
    @ApiResponse({ status: 409, description: 'City already exists' })
    async create(@Body() data: CreateCityDto) {
        return this.citiesService.create(data);
    }

    @Patch(':id')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Update city' })
    @ApiResponse({ status: 200, description: 'City updated successfully' })
    @ApiResponse({ status: 404, description: 'City not found' })
    async update(@Param('id') id: string, @Body() data: UpdateCityDto) {
        return this.citiesService.update(id, data);
    }

    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Delete city' })
    @ApiResponse({ status: 200, description: 'City deleted successfully' })
    @ApiResponse({ status: 404, description: 'City not found' })
    @ApiResponse({ status: 409, description: 'Cannot delete city with existing classes' })
    async delete(@Param('id') id: string) {
        return this.citiesService.delete(id);
    }

    // REQ-LOCAL-2026: geocodificação livre para o admin preencher endereço de Class/Acao.
    // SEGURANÇA:
    //   - JWT + ADMIN/COORDINATOR obrigatório
    //   - Rate limit restrito: 5 req/min por IP (sobrescreve o global de 60)
    //   - Sanitização completa feita no service antes de chamar o Nominatim
    //   - Parâmetro q validado: 4-300 chars, apenas conteúdo alfanumérico
    @Get('geocode/address')
    @Roles('ADMIN', 'COORDINATOR')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @ApiOperation({ summary: 'Geocode free-form address via backend proxy (Nominatim) — admin only' })
    @ApiQuery({ name: 'q', required: true, description: 'Endereço livre (máx 300 chars)' })
    @ApiQuery({ name: 'uf', required: false, description: 'UF (2 letras) para priorizar resultados no estado correto (ViaCEP)' })
    @ApiResponse({ status: 200, description: 'Coordenadas encontradas ou null' })
    @ApiResponse({ status: 400, description: 'Query inválida ou muito curta' })
    @ApiResponse({ status: 429, description: 'Rate limit atingido — aguarde 1 minuto' })
    async geocodeAddress(@Query('q') q: string, @Query('uf') uf?: string) {
        // Validação básica no controller antes de chegar ao service
        if (!q || typeof q !== 'string' || q.trim().length < 4) {
            throw new BadRequestException('Parâmetro q inválido: mínimo 4 caracteres');
        }
        if (q.length > 300) {
            throw new BadRequestException('Parâmetro q muito longo: máximo 300 caracteres');
        }
        let ufNorm: string | undefined;
        if (uf && typeof uf === 'string') {
            const u = uf.trim().toUpperCase();
            if (/^[A-Z]{2}$/.test(u)) ufNorm = u;
        }
        const result = await this.citiesService.geocodeAddress(q, ufNorm);
        return result ?? { lat: null, lng: null, displayName: null };
    }
}
