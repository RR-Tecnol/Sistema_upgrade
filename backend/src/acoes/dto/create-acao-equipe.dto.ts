import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAcaoEquipeDto {
    @ApiProperty()
    @IsString()
    userId: string;

    @ApiProperty({ example: 'Motorista' })
    @IsString()
    funcao: string;

    @ApiProperty({ example: 150 })
    @Type(() => Number)
    @IsNumber()
    diaria: number;

    @ApiPropertyOptional({ default: 0 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    diasTrabalhados?: number;
}
