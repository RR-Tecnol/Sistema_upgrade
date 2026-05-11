import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TruckMaintenanceService } from './truck-maintenance.service';
import { CreateTruckMaintenanceDto } from './dto/create-truck-maintenance.dto';
import { UpdateTruckMaintenanceDto } from './dto/update-truck-maintenance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('truck-maintenance')
@ApiBearerAuth()
@Controller('truck-maintenance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TruckMaintenanceController {
    constructor(private readonly service: TruckMaintenanceService) { }

    @Get()
    @Roles('ADMIN', 'COORDINATOR', 'DRIVER')
    findAll(@Query('truckId') truckId?: string) {
        return this.service.findAll(truckId);
    }

    @Get('truck/:truckId')
    @Roles('ADMIN', 'COORDINATOR', 'DRIVER')
    findByTruck(@Param('truckId') truckId: string) {
        return this.service.findAll(truckId);
    }

    @Get('truck/:truckId/stats')
    @Roles('ADMIN', 'COORDINATOR')
    stats(@Param('truckId') truckId: string) {
        return this.service.stats(truckId);
    }

    @Get(':id')
    @Roles('ADMIN', 'COORDINATOR', 'DRIVER')
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Post()
    @Roles('ADMIN', 'COORDINATOR', 'DRIVER')
    create(@Body() dto: CreateTruckMaintenanceDto) {
        return this.service.create(dto);
    }

    @Patch(':id')
    @Roles('ADMIN', 'COORDINATOR')
    update(@Param('id') id: string, @Body() dto: UpdateTruckMaintenanceDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    @Roles('ADMIN', 'COORDINATOR')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
