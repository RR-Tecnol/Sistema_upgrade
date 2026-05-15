import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsOptional,
    IsNumber,
    IsUUID,
    Min,
    Length,
    IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementType } from '@prisma/client';

/**
 * Modo do AJUSTE:
 *  • SET   → quantidade informada vira o NOVO SALDO (ex.: contagem física = 47)
 *            O backend calcula o delta automaticamente e registra antes/depois
 *            em StockMovement.observacao + audit_logs.
 *  • DELTA → quantidade é decrementada do saldo atual (comportamento histórico)
 */
export type AjusteMode = 'SET' | 'DELTA';

/**
 * DTO unificado para registro de movimentações.
 * A validação de quais campos são obrigatórios por tipo é feita no service
 * (porque a regra depende do `type` em runtime — class-validator não suporta
 * cross-field obrigatório nativamente sem extensão).
 *
 * Regras por tipo (aplicadas no service):
 *  • ENTRADA       → toTruckId OBRIGATÓRIO
 *  • SAIDA         → fromTruckId OBRIGATÓRIO; acaoId recomendado
 *  • TRANSFERENCIA → fromTruckId E toTruckId OBRIGATÓRIOS, devem ser diferentes
 *  • DEVOLUCAO     → fromTruckId OBRIGATÓRIO
 *  • AJUSTE / PERDA → observacao OBRIGATÓRIA (fromTruckId opcional)
 *  • REPOSICAO     → BLOQUEADO neste endpoint (só via aprovação de PurchaseRequest)
 */
export class CreateMovementDto {
    @ApiProperty({ enum: StockMovementType, example: 'ENTRADA' })
    @IsEnum(StockMovementType, { message: 'Tipo de movimentação inválido' })
    type: StockMovementType;

    @ApiProperty({ description: 'ID do StockItem movimentado' })
    @IsUUID('4', { message: 'ID do item inválido' })
    stockItemId: string;

    @ApiProperty({ example: 5.0, description: 'Quantidade movimentada (sempre positiva; a direção vem do `type`)' })
    @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Quantidade deve ser um número com até 3 casas decimais' })
    @Min(0.001, { message: 'Quantidade deve ser pelo menos 0.001' })
    quantidade: number;

    @ApiPropertyOptional({ description: 'Carreta de origem (SAIDA, TRANSFERENCIA, DEVOLUCAO, AJUSTE/PERDA opcional)' })
    @IsUUID('4', { message: 'ID da carreta de origem inválido' })
    @IsOptional()
    fromTruckId?: string;

    @ApiPropertyOptional({ description: 'Carreta de destino (ENTRADA, TRANSFERENCIA)' })
    @IsUUID('4', { message: 'ID da carreta de destino inválido' })
    @IsOptional()
    toTruckId?: string;

    @ApiPropertyOptional({ description: 'Ação consumidora (SAIDA)' })
    @IsUUID('4', { message: 'ID da ação inválido' })
    @IsOptional()
    acaoId?: string;

    @ApiPropertyOptional({ description: 'Observação — OBRIGATÓRIA para AJUSTE e PERDA' })
    @IsString({ message: 'Observação deve ser um texto' })
    @IsOptional()
    @Length(0, 500, { message: 'Observação deve ter no máximo 500 caracteres' })
    observacao?: string;

    @ApiPropertyOptional({
        enum: ['SET', 'DELTA'],
        example: 'SET',
        description:
            'AJUSTE: SET = quantidade vira o novo saldo (contagem física); ' +
            'DELTA = quantidade é decrementada do saldo. Default: SET.',
    })
    @IsString({ message: 'Modo de ajuste deve ser texto' })
    @IsIn(['SET', 'DELTA'], { message: 'Modo de ajuste inválido (use SET ou DELTA)' })
    @IsOptional()
    ajusteMode?: AjusteMode;
}
