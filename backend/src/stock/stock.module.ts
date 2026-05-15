import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { StockMinioService } from './stock-minio.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * MÓDULO DE ESTOQUE — Sistema Upgrade
 *
 * Adaptado do projeto-referência (Insumo / EstoqueCaminhao / MovimentacaoEstoque),
 * com o conceito-chave preservado:
 *   - StockItem central é a FONTE de abastecimento
 *   - TruckStockItem mantém saldo POR CARRETA
 *   - Toda variação de saldo passa por StockMovement (auditoria)
 *   - Reposição (compra) tem workflow de aprovação via StockPurchaseRequest
 *
 * Toda escrita de saldo é feita dentro de prisma.$transaction para evitar
 * divergência entre tela, carreta e histórico.
 */
@Module({
    imports: [
        PrismaModule,
        MulterModule.register({ storage: undefined }),
    ],
    controllers: [StockController],
    providers: [StockService, StockMinioService],
    exports: [StockService],
})
export class StockModule {}
