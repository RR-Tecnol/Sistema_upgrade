import { Module, forwardRef } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { CertificatePdfCacheService } from './certificate-pdf-cache.service';
import { CertificatePdfCacheCleanupService } from './certificate-pdf-cache-cleanup.service';
import { CertificatePdfSigningService } from './certificate-pdf-signing.service';
import { CertificateMetricsService } from './certificate-metrics.service';
import { CertificateOgImageService } from './certificate-og-image.service';
import { ReportsController } from './reports.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CertificateModule } from '../certificates/certificate.module';
import { EmployeesModule } from '../employees/employees.module';

// REQ-11: Lista de frequência em PDF (dia 20 de cada mês)
// REQ-12: Lista de concludentes na 3ª semana de curso
// MODELO PROVISÓRIO — aguarda template visual do Robert para adaptar layout
@Module({
  imports: [PrismaModule, forwardRef(() => CertificateModule), EmployeesModule],
  controllers: [ReportsController],
  providers: [
    CertificatePdfCacheService,
    CertificatePdfCacheCleanupService,
    CertificateMetricsService,
    CertificatePdfSigningService,
    CertificateOgImageService,
    PdfService,
  ],
  exports: [
    CertificatePdfCacheService,
    CertificateMetricsService,
    CertificatePdfSigningService,
    CertificateOgImageService,
    PdfService,
  ],
})
export class ReportsModule {}
