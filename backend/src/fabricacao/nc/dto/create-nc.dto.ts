import { IsString, IsEnum, IsBoolean, IsOptional, IsNumber } from 'class-validator';
import { TipoNaoConformidade } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateNcDto {
  @IsEnum(TipoNaoConformidade)
  tipo: TipoNaoConformidade;

  @IsString()
  descricao: string;

  @IsOptional()
  @IsString()
  operacaoId?: string;

  @IsBoolean()
  bloqueiaProducao: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  impactoFinanceiro?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  impactoDias?: number;

  @IsOptional()
  @IsString()
  acaoCorretiva?: string;
}
