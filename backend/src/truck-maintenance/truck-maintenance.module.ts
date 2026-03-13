import { Module } from '@nestjs/common';
import { TruckMaintenanceController } from './truck-maintenance.controller';
import { TruckMaintenanceService } from './truck-maintenance.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [TruckMaintenanceController],
    providers: [TruckMaintenanceService],
    exports: [TruckMaintenanceService],
})
export class TruckMaintenanceModule { }
