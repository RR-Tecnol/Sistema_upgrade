import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TruckMaintenanceService } from './truck-maintenance.service';
import { CreateTruckMaintenanceDto } from './dto/create-truck-maintenance.dto';
import { UpdateTruckMaintenanceDto } from './dto/update-truck-maintenance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('truck-maintenance')
@UseGuards(JwtAuthGuard)
export class TruckMaintenanceController {
    constructor(private readonly service: TruckMaintenanceService) { }

    @Get()
    findAll(@Query('truckId') truckId?: string) {
        return this.service.findAll(truckId);
    }

    @Get('truck/:truckId')
    findByTruck(@Param('truckId') truckId: string) {
        return this.service.findAll(truckId);
    }

    @Get('truck/:truckId/stats')
    stats(@Param('truckId') truckId: string) {
        return this.service.stats(truckId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Post()
    create(@Body() dto: CreateTruckMaintenanceDto) {
        return this.service.create(dto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateTruckMaintenanceDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
