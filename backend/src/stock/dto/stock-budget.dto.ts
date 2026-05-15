import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsOptional,
    IsNumber,
    IsInt,
    IsUUID,
    Min,
    Max,
    Length,
    ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockItemCategory } from '@prisma/client';

/**
 * Verba mensal por categoria (REQ 2026-05).
 * Opcional e combinável com `valorTeto` da PR e com `AcaoStockBudget`.
 *
 * Exatamente UMA das duas categorias é obrigatória:
 *  • `categoriaEnum`     — enum padrão (CONSUMIVEL, LIMPEZA, etc.)
 *  • `categoriaCustomId` — UUID de uma StockCategory customizada
 */
export class CreateStockBudgetDto {
    @ApiPropertyOptional({ enum: StockItemCategory, example: 'LIMPEZA' })
    @IsEnum(StockItemCategory, { message: 'Categoria inválida' })
    @IsOptional()
    @ValidateIf((o) => !o.categoriaCustomId)
    categoriaEnum?: StockItemCategory;

    @ApiPropertyOptional({ description: 'ID de StockCategory customizada' })
    @IsUUID('4', { message: 'ID da categoria customizada inválido' })
    @IsOptional()
    @ValidateIf((o) => !o.categoriaEnum)
    categoriaCustomId?: string;

    @ApiProperty({ example: 2026, description: 'Ano de vigência (4 dígitos)' })
    @IsInt({ message: 'Ano deve ser um número inteiro' })
    @Min(2024, { message: 'Ano deve ser pelo menos 2024' })
    @Max(2099, { message: 'Ano inválido' })
    ano: number;

    @ApiProperty({ example: 6, description: 'Mês de vigência (1-12)' })
    @IsInt({ message: 'Mês deve ser um número inteiro' })
    @Min(1, { message: 'Mês deve ser entre 1 e 12' })
    @Max(12, { message: 'Mês deve ser entre 1 e 12' })
    mes: number;

    @ApiProperty({ example: 2000.00, description: 'Teto da verba em R$' })
    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Valor teto deve ser um número com até 2 casas decimais' })
    @Min(0.01, { message: 'Valor teto deve ser pelo menos 0.01' })
    valorTeto: number;

    @ApiPropertyOptional({ example: 'Verba reforçada por temporada de feiras' })
    @IsString({ message: 'Observação deve ser um texto' })
    @IsOptional()
    @Length(0, 500, { message: 'Observação deve ter no máximo 500 caracteres' })
    observacao?: string;
}

export class UpdateStockBudgetDto {
    @ApiPropertyOptional({ example: 2500.00 })
    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Valor teto deve ser um número com até 2 casas decimais' })
    @IsOptional()
    @Min(0.01, { message: 'Valor teto deve ser pelo menos 0.01' })
    valorTeto?: number;

    @ApiPropertyOptional()
    @IsString({ message: 'Observação deve ser um texto' })
    @IsOptional()
    @Length(0, 500, { message: 'Observação deve ter no máximo 500 caracteres' })
    observacao?: string;
}
