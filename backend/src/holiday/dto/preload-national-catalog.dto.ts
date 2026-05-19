import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class PreloadNationalCatalogDto {
  @ApiPropertyOptional({ example: [2025, 2026], description: 'Anos civis (padrão: ano atual e seguinte)' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(2000, { each: true })
  @Max(2100, { each: true })
  years?: number[];

  @ApiPropertyOptional({
    description: 'Se true, replica feriados nas turmas IN_PROGRESS (recalcula endDate). Padrão: false.',
  })
  @IsOptional()
  @IsBoolean()
  applyToActiveClasses?: boolean;
}
