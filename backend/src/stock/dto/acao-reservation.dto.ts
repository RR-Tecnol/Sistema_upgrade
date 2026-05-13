import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateAcaoReservationDto {
    @ApiProperty({ description: 'ID do StockItem a ser reservado' })
    @IsUUID()
    stockItemId: string;

    @ApiProperty({ description: 'Quantidade prevista para consumo nesta ação' })
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0.001)
    quantidadePrevista: number;

    @ApiPropertyOptional({ description: 'Carreta esperada de origem (opcional, ajuda planejamento)' })
    @IsUUID()
    @IsOptional()
    truckId?: string;

    @ApiPropertyOptional({
        description: 'Prioridade do item dentro do kit',
        enum: ['BAIXA', 'NORMAL', 'CRITICA'],
        example: 'NORMAL',
    })
    @IsString()
    @IsIn(['BAIXA', 'NORMAL', 'CRITICA'])
    @IsOptional()
    prioridade?: 'BAIXA' | 'NORMAL' | 'CRITICA';

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    observacao?: string;
}

export class UpdateAcaoReservationDto extends PartialType(CreateAcaoReservationDto) {}

/** Cria/atualiza várias reservas de uma ação em lote (usado pelo form). */
export class BulkUpsertAcaoReservationsDto {
    @ApiProperty({
        type: [CreateAcaoReservationDto],
        description:
            'Lista completa do "kit de insumos" da ação. Reservas omitidas serão removidas. ' +
            'Itens repetidos no array são rejeitados.',
    })
    items: CreateAcaoReservationDto[];
}
