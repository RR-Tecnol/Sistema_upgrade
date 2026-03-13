import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { ReportsController } from './reports.controller';
import { PrismaModule } from '../prisma/prisma.module';

// REQ-11: Lista de frequência em PDF (dia 20 de cada mês)
// REQ-12: Lista de concludentes na 3ª semana de curso
// MODELO PROVISÓRIO — aguarda template visual do Robert para adaptar layout
@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [PdfService],
  exports: [PdfService],
})
export class ReportsModule {}
