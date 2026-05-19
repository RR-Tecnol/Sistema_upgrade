import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { CertificateTemplateService } from './src/certificates/certificate-template.service';

async function bootstrap() {
  console.log('Iniciando NestJS Context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const svc = app.get(CertificateTemplateService);
  console.log('Recriando templates mestres...');
  const result = await svc.seedMasterTemplates({ id: 'system-admin', role: 'ADMIN' });
  console.log('Resultado:', result);
  await app.close();
  process.exit(0);
}
bootstrap();
