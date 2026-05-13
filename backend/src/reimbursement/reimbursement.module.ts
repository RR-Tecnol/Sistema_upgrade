import { Module } from '@nestjs/common';
import { ReimbursementService } from './reimbursement.service';
import { ReimbursementController } from './reimbursement.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MinioService } from './minio.service';

// REQ-10: Portal de reembolso — professor/motorista registra despesas imprevistas
// com foto do recibo pelo celular. Upload direto ao MinIO via Presigned URL.
@Module({
  imports: [PrismaModule],
  controllers: [ReimbursementController],
  providers: [ReimbursementService, MinioService],
  exports: [ReimbursementService, MinioService],
})
export class ReimbursementModule {}
