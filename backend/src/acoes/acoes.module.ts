import { Module } from '@nestjs/common';
import { AcoesController } from './acoes.controller';
import { AcoesService } from './acoes.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
    imports: [PrismaModule],
    controllers: [AcoesController],
    providers: [AcoesService],
    exports: [AcoesService],
})
export class AcoesModule { }
