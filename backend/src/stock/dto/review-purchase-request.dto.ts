import { IsString, IsOptional, Length, IsNumber, Min, IsEnum, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { StockItemCategory } from '@prisma/client';

/**
 * Dados mínimos para criar um StockItem inline durante a aprovação de verba.
 * Quando enviado, o backend cria o item na mesma transação da aprovação.
 */
export class NewItemDataDto {
    @ApiProperty({ example: 'Pincel Atômico Azul' })
    @IsString({ message: 'Nome deve ser um texto' })
    @Length(2, 120, { message: 'Nome deve ter entre 2 e 120 caracteres' })
    nome: string;

    @ApiProperty({ example: 'un' })
    @IsString({ message: 'Unidade deve ser um texto' })
    @Length(1, 20, { message: 'Unidade deve ter entre 1 e 20 caracteres' })
    unidade: string;

    @ApiProperty({ enum: StockItemCategory, example: 'CONSUMIVEL' })
    @IsEnum(StockItemCategory, { message: 'Categoria inválida' })
    categoria: StockItemCategory;

    @ApiPropertyOptional({ description: 'URL da foto (já enviada via upload)' })
    @IsString({ message: 'URL da foto inválida' })
    @IsOptional()
    fotoUrl?: string;
}

/**
 * DTO de aprovação — admin pode opcionalmente adicionar uma observação.
 * A aprovação cria StockMovement(REPOSICAO) + ContaPagar atomicamente.
 */
export class ApprovePurchaseRequestDto {
    @ApiProperty({ example: 10, description: 'Quantidade aprovada para compra' })
    @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Quantidade deve ser um número com até 3 casas decimais' })
    @Min(0.001, { message: 'Quantidade deve ser pelo menos 0.001' })
    quantidade: number;

    @ApiPropertyOptional({ description: 'ID do item a comprar (obrigatório para aprovação de verba, a menos que newItemData seja fornecido)' })
    @IsString({ message: 'ID do item inválido' })
    @IsOptional()
    stockItemId?: string;

    @ApiPropertyOptional({ description: 'Dados para criar um novo item inline (alternativa a stockItemId)' })
    @ValidateNested({ message: 'Dados do novo item inválidos' })
    @Type(() => NewItemDataDto)
    @IsOptional()
    newItemData?: NewItemDataDto;

    @ApiPropertyOptional({ example: 150.00, description: 'Preço unitário (para verba PR — sobrescreve o valorTeto como precoUnitario)' })
    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Preço unitário deve ser um número com até 2 casas decimais' })
    @IsOptional()
    @Min(0.01, { message: 'Preço unitário deve ser pelo menos 0.01' })
    precoUnitario?: number;

    @ApiPropertyOptional({ example: 30, description: 'Atualização opcional da quantidade mínima do estoque' })
    @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Novo mínimo deve ser um número com até 3 casas decimais' })
    @Min(0, { message: 'Novo mínimo não pode ser negativo' })
    @IsOptional()
    novoMinimo?: number;

    @ApiPropertyOptional({ example: 'Papelaria São Luís Ltda' })
    @IsString({ message: 'Fornecedor deve ser um texto' })
    @IsOptional()
    @Length(0, 200, { message: 'Fornecedor deve ter no máximo 200 caracteres' })
    fornecedor?: string;

    @ApiPropertyOptional({ example: 'Aprovado conforme orçamento anexo' })
    @IsString({ message: 'Observação deve ser um texto' })
    @IsOptional()
    @Length(0, 500, { message: 'Observação deve ter no máximo 500 caracteres' })
    reviewNote?: string;

    @ApiPropertyOptional({
        example: 1500.00,
        description:
            'Teto opcional aplicado nesta aprovação (R$). Se preenchido, valorTotal aprovado ' +
            'não pode ultrapassá-lo. Salvo em StockPurchaseRequest.valorTeto para auditoria.',
    })
    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Valor teto deve ser um número com até 2 casas decimais' })
    @IsOptional()
    @Min(0.01, { message: 'Valor teto deve ser pelo menos 0.01' })
    valorTeto?: number;

    @ApiPropertyOptional({
        description:
            'Permite forçar a aprovação mesmo que verbas (mensal/ação) estourem. ' +
            'Use apenas em casos de urgência justificada. Quando true, exige `reviewNote`.',
    })
    @IsOptional()
    bypassBudgetCheck?: boolean;
}

/**
 * DTO de rejeição — motivo obrigatório (auditoria).
 */
export class RejectPurchaseRequestDto {
    @ApiProperty({ example: 'Valor acima do orçado para este item; renegociar com fornecedor' })
    @IsString({ message: 'Observação deve ser um texto' })
    @Length(5, 500, { message: 'A observação deve ter entre 5 e 500 caracteres' })
    reviewNote: string;
}
