import { IsString, IsNumber, IsOptional, IsPositive, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAcaoFuncionarioDto {
    @ApiProperty({ description: 'ID do funcionário a vincular' })
    @IsString()
    employeeId: string;

    @ApiProperty({ description: 'Valor da diária do funcionário nesta ação', example: 250.00 })
    @IsNumber()
    @IsPositive()
    valorDiaria: number;

    @ApiPropertyOptional({ description: 'Quantidade de dias trabalhados', default: 1 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    diasTrabalhados?: number;
}
