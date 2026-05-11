import { Module } from '@nestjs/common';
import { PortalAbsencesController, AbsencesController, AdminAbsencesController } from './absences.controller';
import { AbsencesService } from './absences.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ReimbursementModule } from '../reimbursement/reimbursement.module';

@Module({
    imports: [PrismaModule, ReimbursementModule],
    controllers: [PortalAbsencesController, AbsencesController, AdminAbsencesController],
    providers: [AbsencesService],
    exports: [AbsencesService],
})
export class AbsencesModule {}
