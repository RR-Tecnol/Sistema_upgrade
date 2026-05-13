import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsNumber,
    IsUUID,
    IsBoolean,
    Min,
    Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Solicitação de compra/reposição.
 * Pode ser criada por ADMIN, COORDINATOR, DRIVER ou TEACHER.
 * Fica em status PENDENTE até que um ADMIN aprove ou rejeite.
 */
export class CreatePurchaseRequestDto {
    @ApiProperty({ description: 'ID do StockItem que precisa ser reposto' })
    @IsUUID()
    stockItemId: string;

    @ApiProperty({ example: 100, description: 'Quantidade solicitada' })
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0.001)
    quantidade: number;

    @ApiProperty({ example: 12.5, description: 'Preço unitário declarado em R$ (orçamento do fornecedor)' })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    precoUnitario: number;

    @ApiPropertyOptional({ example: 'Papelaria São Luís Ltda' })
    @IsString()
    @IsOptional()
    @Length(0, 200)
    fornecedor?: string;

    @ApiPropertyOptional({ example: false, description: 'Marca como urgente para priorizar análise' })
    @IsBoolean()
    @IsOptional()
    urgente?: boolean;

    @ApiProperty({ example: 'Acabou o estoque na carreta 02 e há turma iniciando em 3 dias' })
    @IsString()
    @IsNotEmpty()
    @Length(10, 1000)
    justificativa: string;

    @ApiPropertyOptional({ description: 'URL do orçamento/nota no MinIO (já enviado via presigned URL)' })
    @IsString()
    @IsOptional()
    comprovanteUrl?: string;
}
