import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportsModule } from '../reports/reports.module'; // exporta PdfService
import { FeedbacksModule } from '../feedbacks/feedbacks.module';
import { CertificateService } from './certificate.service';
import { CertificateController } from './certificate.controller';
import { CertificateTemplateService } from './certificate-template.service';
import { CertificateNotificationService } from './certificate-notification.service';

/** REQ-06: Emissao e consulta de certificados digitais de conclusao */
@Module({
    imports: [PrismaModule, forwardRef(() => ReportsModule), forwardRef(() => FeedbacksModule)],
    controllers: [CertificateController],
    providers: [CertificateService, CertificateTemplateService, CertificateNotificationService],
    exports: [CertificateService, CertificateTemplateService, CertificateNotificationService],
})
export class CertificateModule {}
