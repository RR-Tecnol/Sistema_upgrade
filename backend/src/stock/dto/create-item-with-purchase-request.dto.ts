import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Length,
    Min,
    ValidateNested,
} from 'class-validator';
import { CreateStockItemDto } from './create-stock-item.dto';

/**
 * Dados da Solicitação de Compra que serão criados junto com o item, na
 * mesma transação Prisma. Não inclui `stockItemId` porque ele só existe
 * depois do `create(StockItem)` dentro do `$transaction`.
 */
export class CreatePurchaseRequestInlineDto {
    @ApiProperty({ example: 100, description: 'Quantidade solicitada' })
    @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Quantidade deve ser um número com até 3 casas decimais' })
    @Min(0, { message: 'Quantidade não pode ser negativa' })
    quantidade: number;

    @ApiProperty({ example: 12.5, description: 'Preço unitário em R$ — vira a conta a pagar após aprovação' })
    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Preço unitário deve ser um número com até 2 casas decimais' })
    @Min(0, { message: 'Preço unitário não pode ser negativo' })
    precoUnitario: number;

    @ApiPropertyOptional({ example: 'Papelaria São Luís Ltda' })
    @IsString({ message: 'Fornecedor deve ser um texto' })
    @IsOptional()
    @Length(0, 200, { message: 'Fornecedor deve ter no máximo 200 caracteres' })
    fornecedor?: string;

    @ApiPropertyOptional({ example: false, description: 'Marca como urgente — vai pro topo da fila' })
    @IsBoolean({ message: 'Urgente deve ser um valor booleano' })
    @IsOptional()
    urgente?: boolean;

    @ApiProperty({ example: 'Falta na carreta 02 e turma começa em 3 dias' })
    @IsString({ message: 'Justificativa deve ser um texto' })
    @IsNotEmpty({ message: 'A justificativa é obrigatória' })
    @Length(10, 1000, { message: 'A justificativa deve ter entre 10 e 1000 caracteres' })
    justificativa: string;

    @ApiPropertyOptional({ description: 'URL do orçamento/nota no MinIO (opcional)' })
    @IsString({ message: 'URL do comprovante inválida' })
    @IsOptional()
    comprovanteUrl?: string;
}

/**
 * Cria o item de estoque + uma Solicitação de Compra inicial em uma ÚNICA transação.
 * Se a PR falhar (validação, regra de negócio, etc.) o item NÃO é criado — evita o estado
 * "item órfão sem origem financeira" que acontecia quando o frontend fazia 2 chamadas em sequência.
 */
export class CreateItemWithPurchaseRequestDto {
    @ApiProperty({ type: () => CreateStockItemDto, description: 'Dados cadastrais do item (saldo inicial é forçado a 0)' })
    @ValidateNested({ message: 'Dados do item inválidos' })
    @Type(() => CreateStockItemDto)
    item: CreateStockItemDto;

    @ApiProperty({ type: () => CreatePurchaseRequestInlineDto, description: 'Dados da Solicitação de Compra que nascerá pendente' })
    @ValidateNested({ message: 'Dados da solicitação de compra inválidos' })
    @Type(() => CreatePurchaseRequestInlineDto)
    purchaseRequest: CreatePurchaseRequestInlineDto;
}
