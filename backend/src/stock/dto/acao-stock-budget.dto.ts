import {
    IsString,
    IsOptional,
    IsNumber,
    IsUUID,
    Min,
    Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Verba de insumos por Ação (REQ 2026-05).
 * Opcional e combinável com `valorTeto` da PR e com `StockBudget` mensal.
 * Quando preenchida, qualquer PR vinculada à `acaoId` desconta deste teto.
 */
export class UpsertAcaoStockBudgetDto {
    @ApiProperty({ description: 'ID da Ação alvo da verba' })
    @IsUUID()
    acaoId: string;

    @ApiProperty({ example: 8000.00, description: 'Teto da verba em R$' })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    valorTeto: number;

    @ApiPropertyOptional({ example: 'Inclui 5 ajudantes locais (uniforme + EPI)' })
    @IsString()
    @IsOptional()
    @Length(0, 500)
    observacao?: string;
}
