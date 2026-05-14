import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsOptional,
    IsNumber,
    IsDateString,
    Min,
    Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockItemCategory } from '@prisma/client';

export class CreateStockItemDto {
    @ApiProperty({ example: 'Apostila Mecânica Básica', description: 'Nome do item' })
    @IsString()
    @IsNotEmpty()
    @Length(2, 120)
    nome: string;

    @ApiPropertyOptional({ example: 'APO-MEC-001', description: 'SKU / código interno único' })
    @IsString()
    @IsOptional()
    @Length(1, 60)
    codigoInterno?: string;

    @ApiProperty({ enum: StockItemCategory, example: 'DIDATICO' })
    @IsEnum(StockItemCategory)
    categoria: StockItemCategory;

    @ApiPropertyOptional({
        description:
            'ID de StockCategory customizada (criada pelo admin). Quando preenchido, ' +
            'a UI usa o label/icon/color dessa categoria; o enum `categoria` deve vir como OUTRO neste caso.',
    })
    @IsString()
    @IsOptional()
    customCategoryId?: string;

    @ApiProperty({ example: 'un', description: 'Unidade de medida (un, kg, L, cx, par, etc.)' })
    @IsString()
    @IsNotEmpty()
    @Length(1, 20)
    unidade: string;

    @ApiPropertyOptional({ example: 50, description: 'Quantidade inicial no estoque central' })
    @IsNumber({ maxDecimalPlaces: 3 })
    @IsOptional()
    @Min(0)
    quantidadeAtual?: number;

    @ApiPropertyOptional({ example: 10, description: 'Quantidade mínima — dispara alerta de estoque baixo' })
    @IsNumber({ maxDecimalPlaces: 3 })
    @IsOptional()
    @Min(0)
    quantidadeMinima?: number;

    @ApiPropertyOptional({ example: '2027-06-30', description: 'Data de validade (ISO 8601)' })
    @IsDateString()
    @IsOptional()
    validade?: string;

    @ApiPropertyOptional({ example: 'Editora ABC Ltda' })
    @IsString()
    @IsOptional()
    @Length(0, 200)
    fornecedor?: string;

    @ApiPropertyOptional({ example: 12.50, description: 'Preço unitário em R$ (máx 2 casas)' })
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsOptional()
    @Min(0)
    precoUnitario?: number;

    @ApiPropertyOptional({ example: 'Depósito Central — Prateleira A3' })
    @IsString()
    @IsOptional()
    @Length(0, 200)
    localizacao?: string;

    @ApiPropertyOptional({ description: 'URL da foto no MinIO (já enviada via presigned URL)' })
    @IsString()
    @IsOptional()
    fotoUrl?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    observacoes?: string;
}
