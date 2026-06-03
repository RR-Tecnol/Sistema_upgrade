import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTruckStockMinimoDto {
    @ApiProperty({ description: 'Quantidade mínima desejada na carreta', minimum: 0, example: 10 })
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    quantidadeMinima: number;
}
