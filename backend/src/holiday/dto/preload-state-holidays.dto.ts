import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, Max, Min } from 'class-validator';

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
}
