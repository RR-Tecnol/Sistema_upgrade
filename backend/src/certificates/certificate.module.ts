import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CertificateService } from './certificate.service';
import { CertificateController } from './certificate.controller';

/** REQ-06: Emissão e consulta de certificados digitais de conclusão */
@Module({
    imports: [PrismaModule],
    controllers: [CertificateController],
    providers: [CertificateService],
    exports: [CertificateService],
})
export class CertificateModule {}
