import { Module } from '@nestjs/common';
import { TripsController, AdminTripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { PrismaModule } from '../prisma/prisma.module';

import { ReimbursementModule } from '../reimbursement/reimbursement.module';

@Module({
    imports: [PrismaModule, ReimbursementModule],
    controllers: [TripsController, AdminTripsController],
    providers: [TripsService],
    exports: [TripsService],
})
export class TripsModule {}
