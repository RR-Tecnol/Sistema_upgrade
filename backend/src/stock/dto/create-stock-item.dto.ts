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
    @IsString({ message: 'Nome deve ser um texto' })
    @IsNotEmpty({ message: 'Nome é obrigatório' })
    @Length(2, 120, { message: 'Nome deve ter entre 2 e 120 caracteres' })
    nome: string;

    @ApiPropertyOptional({ example: 'APO-MEC-001', description: 'SKU / código interno único' })
    @IsString({ message: 'Código interno deve ser um texto' })
    @IsOptional()
    @Length(1, 60, { message: 'Código interno deve ter entre 1 e 60 caracteres' })
    codigoInterno?: string;

    @ApiProperty({ enum: StockItemCategory, example: 'DIDATICO' })
    @IsEnum(StockItemCategory, { message: 'Categoria inválida' })
    categoria: StockItemCategory;

    @ApiPropertyOptional({
        description:
            'ID de StockCategory customizada (criada pelo admin). Quando preenchido, ' +
            'a UI usa o label/icon/color dessa categoria; o enum `categoria` deve vir como OUTRO neste caso.',
    })
    @IsString({ message: 'ID da categoria customizada inválido' })
    @IsOptional()
    customCategoryId?: string;

    @ApiProperty({
        example: 'frasco',
        description:
            'EMBALAGEM contável (un, cx, frasco, fardo, par, rolo, m, m²…). É a unidade ' +
            'em que o saldo é mantido e movimentado. Para descrever o conteúdo de cada ' +
            'embalagem (ex: 250 mL), use os campos opcionais `conteudoQuantidade` e `conteudoUnidade`.',
    })
    @IsString({ message: 'Unidade deve ser um texto' })
    @IsNotEmpty({ message: 'Unidade é obrigatória' })
    @Length(1, 20, { message: 'Unidade deve ter entre 1 e 20 caracteres' })
    unidade: string;

    @ApiPropertyOptional({
        example: 250,
        description:
            'Quantidade de CONTEÚDO em cada embalagem (opcional). Ex: 250 para "frasco de 250 mL". ' +
            'Não afeta o saldo — é apenas rótulo/relatório.',
    })
    @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Quantidade de conteúdo deve ser um número com até 3 casas decimais' })
    @IsOptional()
    @Min(0.001, { message: 'Quantidade de conteúdo deve ser pelo menos 0.001' })
    conteudoQuantidade?: number;

    @ApiPropertyOptional({
        example: 'mL',
        description: 'Unidade de medida do conteúdo (mL, L, g, kg, m). Opcional, par com `conteudoQuantidade`.',
    })
    @IsString({ message: 'Unidade do conteúdo deve ser um texto' })
    @IsOptional()
    @Length(1, 10, { message: 'Unidade do conteúdo deve ter entre 1 e 10 caracteres' })
    conteudoUnidade?: string;

    @ApiPropertyOptional({ example: 50, description: 'Quantidade inicial no estoque central' })
    @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Quantidade atual deve ser um número com até 3 casas decimais' })
    @IsOptional()
    @Min(0, { message: 'Quantidade atual não pode ser negativa' })
    quantidadeAtual?: number;

    @ApiPropertyOptional({ example: 10, description: 'Quantidade mínima — dispara alerta de estoque baixo' })
    @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Quantidade mínima deve ser um número com até 3 casas decimais' })
    @IsOptional()
    @Min(0, { message: 'Quantidade mínima não pode ser negativa' })
    quantidadeMinima?: number;

    @ApiPropertyOptional({ example: '2027-06-30', description: 'Data de validade (ISO 8601)' })
    @IsDateString({}, { message: 'Data de validade inválida' })
    @IsOptional()
    validade?: string;

    @ApiPropertyOptional({ example: 'Editora ABC Ltda' })
    @IsString({ message: 'Fornecedor deve ser um texto' })
    @IsOptional()
    @Length(0, 200, { message: 'Fornecedor deve ter no máximo 200 caracteres' })
    fornecedor?: string;

    @ApiPropertyOptional({ example: 12.50, description: 'Preço unitário em R$ (máx 2 casas)' })
    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Preço unitário deve ser um número com até 2 casas decimais' })
    @IsOptional()
    @Min(0, { message: 'Preço unitário não pode ser negativo' })
    precoUnitario?: number;

    @ApiPropertyOptional({ example: 'Depósito Central — Prateleira A3' })
    @IsString({ message: 'Localização deve ser um texto' })
    @IsOptional()
    @Length(0, 200, { message: 'Localização deve ter no máximo 200 caracteres' })
    localizacao?: string;

    @ApiPropertyOptional({ description: 'URL da foto no MinIO (já enviada via presigned URL)' })
    @IsString({ message: 'URL da foto inválida' })
    @IsOptional()
    fotoUrl?: string;

    @ApiPropertyOptional()
    @IsString({ message: 'Observações deve ser um texto' })
    @IsOptional()
    observacoes?: string;
}
