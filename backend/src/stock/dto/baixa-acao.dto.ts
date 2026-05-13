import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BaixaItemDto {
    @ApiProperty()
    @IsUUID()
    stockItemId: string;

    @ApiProperty({ description: 'Quantidade a baixar (deve ser <= saldo da carreta)' })
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0.001)
    quantidade: number;

    @ApiProperty({ description: 'Carreta de origem da baixa' })
    @IsUUID()
    fromTruckId: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    observacao?: string;
}

export class BaixaAcaoLoteDto {
    @ApiProperty({ type: [BaixaItemDto], description: 'Lista de itens a baixar (atômico — tudo ou nada)' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BaixaItemDto)
    items: BaixaItemDto[];

    @ApiPropertyOptional({ description: 'Observação que será replicada em todas as SAIDAs do lote' })
    @IsString()
    @IsOptional()
    observacaoGlobal?: string;
}

export class DevolverSobraItemDto {
    @ApiProperty()
    @IsUUID()
    stockItemId: string;

    @ApiProperty({ description: 'Carreta de origem da sobra' })
    @IsUUID()
    fromTruckId: string;

    @ApiProperty({ description: 'Quantidade da sobra a tratar' })
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0.001)
    quantidade: number;

    @ApiProperty({
        description:
            'O que fazer com a sobra: DEVOLVER (gera DEVOLUCAO Carreta→Central), ' +
            'MANTER (não faz nada, sobra fica na carreta) ou PERDA (gera PERDA com motivo).',
        enum: ['DEVOLVER', 'MANTER', 'PERDA'],
    })
    @IsIn(['DEVOLVER', 'MANTER', 'PERDA'])
    decisao: 'DEVOLVER' | 'MANTER' | 'PERDA';

    @ApiPropertyOptional({ description: 'Motivo (obrigatório para PERDA)' })
    @IsString()
    @IsOptional()
    motivo?: string;
}

export class DevolverSobraLoteDto {
    @ApiProperty({ type: [DevolverSobraItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DevolverSobraItemDto)
    items: DevolverSobraItemDto[];
}
