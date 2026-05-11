import { Module } from '@nestjs/common';
import { ContasPagarController } from './contas-pagar.controller';
import { ContasPagarService } from './contas-pagar.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [ContasPagarController],
    providers: [ContasPagarService],
    exports: [ContasPagarService],
})
export class ContasPagarModule { }
