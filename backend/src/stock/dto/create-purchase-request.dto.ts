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
    @IsUUID('4', { message: 'ID do item inválido' })
    stockItemId: string;

    @ApiProperty({ example: 100, description: 'Quantidade solicitada' })
    @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Quantidade deve ser um número com até 3 casas decimais' })
    @Min(0.001, { message: 'Quantidade deve ser pelo menos 0.001' })
    quantidade: number;

    @ApiProperty({ example: 12.5, description: 'Preço unitário declarado em R$ (orçamento do fornecedor)' })
    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Preço unitário deve ser um número com até 2 casas decimais' })
    @Min(0.01, { message: 'Preço unitário deve ser pelo menos 0.01' })
    precoUnitario: number;

    @ApiPropertyOptional({ example: 'Papelaria São Luís Ltda' })
    @IsString({ message: 'Fornecedor deve ser um texto' })
    @IsOptional()
    @Length(0, 200, { message: 'Fornecedor deve ter no máximo 200 caracteres' })
    fornecedor?: string;

    @ApiPropertyOptional({ example: false, description: 'Marca como urgente para priorizar análise' })
    @IsBoolean({ message: 'Urgente deve ser um valor booleano' })
    @IsOptional()
    urgente?: boolean;

    @ApiProperty({ example: 'Acabou o estoque na carreta 02 e há turma iniciando em 3 dias' })
    @IsString({ message: 'Justificativa deve ser um texto' })
    @IsNotEmpty({ message: 'A justificativa é obrigatória' })
    @Length(10, 1000, { message: 'A justificativa deve ter entre 10 e 1000 caracteres' })
    justificativa: string;

    @ApiPropertyOptional({ description: 'URL do orçamento/nota no MinIO (já enviado via presigned URL)' })
    @IsString({ message: 'URL do comprovante inválida' })
    @IsOptional()
    comprovanteUrl?: string;

    @ApiPropertyOptional({
        example: 1500.00,
        description:
            'Teto opcional desta solicitação (R$). Quando preenchido, a aprovação não pode ' +
            'aumentar a quantidade × preço acima deste valor. Independe das verbas mensal/ação.',
    })
    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Valor teto deve ser um número com até 2 casas decimais' })
    @IsOptional()
    @Min(0.01, { message: 'Valor teto deve ser pelo menos 0.01' })
    valorTeto?: number;

    @ApiPropertyOptional({
        description:
            'ID da Ação à qual esta compra está vinculada (opcional). Se preenchido E ' +
            'a Ação tiver `AcaoStockBudget`, a aprovação valida o teto da ação também.',
    })
    @IsUUID('4', { message: 'ID da ação inválido' })
    @IsOptional()
    acaoId?: string;

    @ApiPropertyOptional({
        description: 'ID da Verba Mensal à qual esta compra está vinculada (opcional).'
    })
    @IsUUID('4', { message: 'ID da verba mensal inválido' })
    @IsOptional()
    stockBudgetId?: string;
}
