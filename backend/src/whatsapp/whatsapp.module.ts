import { Global, Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * WhatsAppModule — Módulo global de integração Z-API WhatsApp.
 *
 * @Global() garante que WhatsAppService está disponível em TODOS os módulos
 * sem precisar importar WhatsAppModule individualmente em cada um.
 *
 * Registrado em AppModule uma única vez.
 */
@Global()
@Module({
    imports: [PrismaModule],
    controllers: [WhatsAppController],
    providers: [WhatsAppService],
    exports: [WhatsAppService],
})
export class WhatsAppModule {}
