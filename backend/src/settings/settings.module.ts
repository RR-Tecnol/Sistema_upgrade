import { Module, Global } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

/**
 * REQ-14: Configurações globais do sistema.
 *
 * @Global() permite que o SettingsService seja injetado em qualquer módulo
 * sem precisar importar o SettingsModule explicitamente, pois as configurações
 * (como limiteFrequencia, senhaComplexidade) são usadas por múltiplos módulos.
 */
@Global()
@Module({
    controllers: [SettingsController],
    providers: [SettingsService],
    exports: [SettingsService],
})
export class SettingsModule {}
