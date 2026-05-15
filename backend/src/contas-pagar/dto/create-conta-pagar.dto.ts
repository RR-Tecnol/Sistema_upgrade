import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContaPagarStatus } from '@prisma/client';

export class CreateContaPagarDto {
    @ApiProperty()
    @IsString()
    tipo_conta: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    tipo_espontaneo?: string;

    @ApiProperty()
    @IsString()
    descricao: string;

    @ApiProperty()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    valor: number;

    @ApiProperty()
    @IsDateString()
    data_vencimento: string;

    @ApiPropertyOptional({ enum: ContaPagarStatus, default: 'pendente' })
    @IsOptional()
    @IsEnum(ContaPagarStatus)
    status?: ContaPagarStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    recorrente?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    observacoes?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    acao_id?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    cidade?: string;
}
