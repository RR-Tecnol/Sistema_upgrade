import { Module } from '@nestjs/common';
import { AbsencesController, AdminAbsencesController } from './absences.controller';
import { AbsencesService } from './absences.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [AbsencesController, AdminAbsencesController],
    providers: [AbsencesService],
    exports: [AbsencesService],
})
export class AbsencesModule {}
