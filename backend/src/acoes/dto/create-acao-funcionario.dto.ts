import { IsString, IsNumber, IsOptional, IsPositive, Min, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAcaoFuncionarioDto {
    @ApiProperty({ description: 'ID do funcionário a vincular' })
    @IsString()
    employeeId: string;

    @ApiPropertyOptional({
        description: 'Valor da diária (obrigatório para PJ/Freelance; ignorado se funcionário CLT)',
        example: 250.0,
    })
    @IsOptional()
    @IsNumber()
    @IsPositive()
    valorDiaria?: number;

    @ApiPropertyOptional({ description: 'Quantidade de dias trabalhados', default: 1 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    diasTrabalhados?: number;

    /** INSTRUCTOR: turmas do período em que o professor atuará (define carga/diárias por curso). */
    @ApiPropertyOptional({ type: [String], description: 'IDs das turmas (Class) do período' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ArrayMinSize(1)
    classIds?: string[];
}
