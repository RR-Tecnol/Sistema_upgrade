import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TrucksService } from './trucks.service';
import { CreateTruckDto } from './dto/create-truck.dto';
import { UpdateTruckDto } from './dto/update-truck.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TruckStatus } from '@prisma/client';

@ApiTags('trucks')
@Controller('trucks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TrucksController {
    constructor(private trucksService: TrucksService) { }

    @Get()
    @Roles('ADMIN', 'COORDINATOR', 'DRIVER')
    @ApiOperation({ summary: 'List all trucks' })
    @ApiQuery({ name: 'status', required: false, enum: TruckStatus })
    @ApiQuery({ name: 'groupId', required: false })
    @ApiQuery({ name: 'type', required: false })
    @ApiQuery({ name: 'state', required: false })
    @ApiResponse({ status: 200, description: 'Trucks retrieved successfully' })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    async findAll(
        @Query('status') status?: TruckStatus,
        @Query('groupId') groupId?: string,
        @Query('type') type?: string,
        @Query('state') state?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const filters: any = {};
        if (status) filters.status = status;
        if (groupId) filters.groupId = groupId;
        if (type) filters.type = type;
        if (state) filters.state = state;
        if (search) filters.search = search;
        if (page) filters.page = parseInt(page, 10);
        if (limit) filters.limit = parseInt(limit, 10);

        return this.trucksService.findAll(filters);
    }

    @Get(':id')
    @Roles('ADMIN', 'COORDINATOR', 'DRIVER')
    @ApiOperation({ summary: 'Get truck by ID' })
    @ApiResponse({ status: 200, description: 'Truck retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Truck not found' })
    async findOne(@Param('id') id: string) {
        return this.trucksService.findOne(id);
    }

    @Post()
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Create new truck' })
    @ApiResponse({ status: 201, description: 'Truck created successfully' })
    @ApiResponse({ status: 409, description: 'Truck identifier or license plate already exists' })
    async create(@Body() data: CreateTruckDto) {
        return this.trucksService.create(data);
    }

    @Patch(':id')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Update truck' })
    @ApiResponse({ status: 200, description: 'Truck updated successfully' })
    @ApiResponse({ status: 404, description: 'Truck not found' })
    async update(@Param('id') id: string, @Body() data: UpdateTruckDto) {
        return this.trucksService.update(id, data);
    }

    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Delete truck' })
    @ApiResponse({ status: 200, description: 'Truck deleted successfully' })
    @ApiResponse({ status: 404, description: 'Truck not found' })
    @ApiResponse({ status: 409, description: 'Cannot delete truck with active classes' })
    async delete(@Param('id') id: string) {
        return this.trucksService.delete(id);
    }

    @Patch(':id/status')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Update truck status' })
    @ApiResponse({ status: 200, description: 'Status updated successfully' })
    async updateStatus(@Param('id') id: string, @Body('status') status: TruckStatus) {
        return this.trucksService.updateStatus(id, status);
    }

    @Get(':id/availability')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Check truck availability' })
    @ApiQuery({ name: 'startDate', required: true })
    @ApiQuery({ name: 'endDate', required: true })
    @ApiResponse({ status: 200, description: 'Availability checked successfully' })
    async checkAvailability(
        @Param('id') id: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.trucksService.checkAvailability(
            id,
            new Date(startDate),
            new Date(endDate),
        );
    }

    @Post(':id/maintenance')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Schedule maintenance' })
    @ApiResponse({ status: 200, description: 'Maintenance scheduled successfully' })
    async scheduleMaintenance(@Param('id') id: string, @Body('date') date: string) {
        return this.trucksService.scheduleMaintenance(id, new Date(date));
    }
}
