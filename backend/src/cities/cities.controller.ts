import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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
    @ApiOperation({ summary: 'List all cities' })
    @ApiQuery({ name: 'state', required: false, description: 'Filter by state (MA or PI)' })
    @ApiResponse({ status: 200, description: 'Cities retrieved successfully' })
    async findAll(@Query('state') state?: string) {
        return this.citiesService.findAll(state);
    }

    @Get(':id')
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
}
