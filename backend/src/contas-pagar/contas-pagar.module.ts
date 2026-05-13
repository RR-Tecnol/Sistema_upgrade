import { Module, forwardRef } from '@nestjs/common';
import { ContasPagarController } from './contas-pagar.controller';
import { ContasPagarService } from './contas-pagar.service';
import { ContasPagarComprovanteService } from './comprovante.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StockModule } from '../stock/stock.module';
import { MinioService } from '../reimbursement/minio.service';

@Module({
    imports: [PrismaModule, forwardRef(() => StockModule)],
    controllers: [ContasPagarController],
    providers: [ContasPagarService, ContasPagarComprovanteService, MinioService],
    exports: [ContasPagarService],
})
export class ContasPagarModule { }
