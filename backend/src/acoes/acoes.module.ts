import { Module } from '@nestjs/common';
import { AcoesController } from './acoes.controller';
import { AcoesService } from './acoes.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TripsModule } from '../trips/trips.module';
import { CoursesModule } from '../courses/courses.module';

@Module({
    imports: [PrismaModule, TripsModule, CoursesModule],
    controllers: [AcoesController],
    providers: [AcoesService],
    exports: [AcoesService],
})
export class AcoesModule { }
