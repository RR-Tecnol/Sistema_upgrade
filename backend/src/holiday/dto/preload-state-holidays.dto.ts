import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PreloadStateHolidaysDto {
  @ApiPropertyOptional({
    example: [2025, 2026],
    description: 'Anos civis para gerar feriados estaduais fixos (padrão: ano atual e seguinte)',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(2000, { each: true })
  @Max(2100, { each: true })
  years?: number[];

  @ApiPropertyOptional({
    example: ['RS', 'SP'],
    description: 'UFs a incluir no catálogo (padrão: todas com feriado fixo mapeado)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  states?: string[];

  @ApiPropertyOptional({
    description: 'Se true, também regista nas turmas IN_PROGRESS (recalcula endDate). Padrão: false.',
  })
  @IsOptional()
  @IsBoolean()
  applyToActiveClasses?: boolean;
}
