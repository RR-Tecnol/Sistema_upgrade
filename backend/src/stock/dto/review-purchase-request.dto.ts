import { IsString, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO de aprovação — admin pode opcionalmente adicionar uma observação.
 * A aprovação cria StockMovement(REPOSICAO) + ContaPagar atomicamente.
 */
export class ApprovePurchaseRequestDto {
    @ApiPropertyOptional({ example: 'Aprovado conforme orçamento anexo' })
    @IsString()
    @IsOptional()
    @Length(0, 500)
    reviewNote?: string;

    @ApiPropertyOptional({ example: 10, description: 'Quantidade aprovada pelo Admin (sobrescreve a solicitada se fornecida)' })
    @IsOptional()
    quantidadeAprovada?: number;

    @ApiPropertyOptional({ example: 15.5, description: 'Preço unitário definido pelo Admin no ato da aprovação' })
    @IsOptional()
    precoUnitarioAprovado?: number;
}

/**
 * DTO de rejeição — motivo obrigatório (auditoria).
 */
export class RejectPurchaseRequestDto {
    @ApiProperty({ example: 'Valor acima do orçado para este item; renegociar com fornecedor' })
    @IsString()
    @Length(5, 500)
    reviewNote: string;
}
