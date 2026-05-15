import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class ApproveFeedbackDto {
    @ApiProperty({ example: 50.00, description: 'Valor em R$ (default via SystemConfig)' })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    pixAmount: number;
}
