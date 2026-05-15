import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BaixaItemDto {
    @ApiProperty()
    @IsUUID('4', { message: 'ID do item inválido' })
    stockItemId: string;

    @ApiProperty({ description: 'Quantidade a baixar (deve ser <= saldo da carreta)' })
    @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Quantidade deve ser um número com até 3 casas decimais' })
    @Min(0.001, { message: 'Quantidade deve ser pelo menos 0.001' })
    quantidade: number;

    @ApiProperty({ description: 'Carreta de origem da baixa' })
    @IsUUID('4', { message: 'ID da carreta de origem inválido' })
    fromTruckId: string;

    @ApiPropertyOptional()
    @IsString({ message: 'Observação deve ser um texto' })
    @IsOptional()
    observacao?: string;
}

export class BaixaAcaoLoteDto {
    @ApiProperty({ type: [BaixaItemDto], description: 'Lista de itens a baixar (atômico — tudo ou nada)' })
    @IsArray({ message: 'A lista de itens deve ser um array' })
    @ValidateNested({ each: true, message: 'Dados de um ou mais itens inválidos' })
    @Type(() => BaixaItemDto)
    items: BaixaItemDto[];

    @ApiPropertyOptional({ description: 'Observação que será replicada em todas as SAIDAs do lote' })
    @IsString({ message: 'Observação global deve ser um texto' })
    @IsOptional()
    observacaoGlobal?: string;
}

export class DevolverSobraItemDto {
    @ApiProperty()
    @IsUUID('4', { message: 'ID do item inválido' })
    stockItemId: string;

    @ApiProperty({ description: 'Carreta de origem da sobra' })
    @IsUUID('4', { message: 'ID da carreta de origem inválido' })
    fromTruckId: string;

    @ApiProperty({ description: 'Quantidade da sobra a tratar' })
    @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Quantidade deve ser um número com até 3 casas decimais' })
    @Min(0.001, { message: 'Quantidade deve ser pelo menos 0.001' })
    quantidade: number;

    @ApiProperty({
        description:
            'O que fazer com a sobra: DEVOLVER (gera DEVOLUCAO Carreta→Central), ' +
            'MANTER (não faz nada, sobra fica na carreta) ou PERDA (gera PERDA com motivo).',
        enum: ['DEVOLVER', 'MANTER', 'PERDA'],
    })
    @IsIn(['DEVOLVER', 'MANTER', 'PERDA'], { message: 'Decisão inválida (use DEVOLVER, MANTER ou PERDA)' })
    decisao: 'DEVOLVER' | 'MANTER' | 'PERDA';

    @ApiPropertyOptional({ description: 'Motivo (obrigatório para PERDA)' })
    @IsString({ message: 'Motivo deve ser um texto' })
    @IsOptional()
    motivo?: string;
}

export class DevolverSobraLoteDto {
    @ApiProperty({ type: [DevolverSobraItemDto] })
    @IsArray({ message: 'A lista de itens deve ser um array' })
    @ValidateNested({ each: true, message: 'Dados de um ou mais itens inválidos' })
    @Type(() => DevolverSobraItemDto)
    items: DevolverSobraItemDto[];
}
