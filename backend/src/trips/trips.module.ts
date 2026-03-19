import { Module } from '@nestjs/common';
import { TripsController, AdminTripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [TripsController, AdminTripsController],
    providers: [TripsService],
    exports: [TripsService],
})
export class TripsModule {}
