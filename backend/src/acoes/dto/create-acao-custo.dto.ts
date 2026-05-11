import { IsString, IsOptional, IsEnum, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AcaoCustoTipo } from '@prisma/client';

export class CreateAcaoCustoDto {
    @ApiPropertyOptional({ enum: AcaoCustoTipo })
    @IsEnum(AcaoCustoTipo)
    tipo: AcaoCustoTipo;

    @ApiPropertyOptional()
    @IsString()
    descricao: string;

    @ApiPropertyOptional()
    @Type(() => Number)
    @IsNumber()
    valor: number;

    @ApiPropertyOptional()
    @IsDateString()
    data: string;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    litros?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    funcionarioId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    observacoes?: string;
}
