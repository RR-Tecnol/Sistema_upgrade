import { IsString, IsEnum, IsDateString, IsNumber, IsOptional, Min } from 'class-validator';
import { TruckType, TipoContratacaoFabricacao } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateOrdemDto {
  @IsString()
  descricaoBau: string;

  @IsEnum(TruckType)
  configuracao: TruckType;

  @IsEnum(TipoContratacaoFabricacao)
  tipoContratacao: TipoContratacaoFabricacao;

  @IsOptional()
  @IsString()
  bomTemplateId?: string;

  @IsDateString()
  dataEntradaGalpao: string;

  @IsDateString()
  dataInicioBaseline: string;

  @IsDateString()
  dataConclusaoBaseline: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  orcamentoTotal: number;

  @IsOptional()
  @IsString()
  grupoId?: string;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Type(() => Number)
  alertaCustoPercent?: number;

  @IsOptional()
  @IsString()
  observacoes?: string;

  // ── Custo de Aquisição da Carreta (opcionais) ────────────────────────────
  @IsOptional()
  @IsString()
  cursoEspecifico?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  valorBauComprado?: number;

  @IsOptional()
  @IsString()
  valorBauDescricao?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  valorFreteAquisicao?: number;

  @IsOptional()
  @IsString()
  valorFreteDescricao?: string;
}
