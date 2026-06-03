import { IsString, IsEnum, IsDateString, IsNumber, IsOptional, Min, IsArray } from 'class-validator';
import { TipoCustoOf, TipoPrestador, OperacaoRoteiro } from '@prisma/client';
import { Type } from 'class-transformer';

export class LancarCustoServicoDto {
  /** Tipo: SERVICO_DIARIA, SERVICO_PACOTE, BAU_COMPRA, FRETE_AQUISICAO, MATERIAL, etc. */
  @IsEnum(TipoCustoOf)
  tipo: TipoCustoOf;

  /** Ofício do prestador: "Marceneiro", "Serralheiro", "Eletricista", "Pintor"... */
  @IsOptional()
  @IsString()
  oficio?: string;

  /** Descrição do serviço executado */
  @IsString()
  descricao: string;

  /** Valor total do serviço (diária já calculada ou pacote fechado) */
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  valor: number;

  /** Gate/operação ao qual este custo pertence (opcional) */
  @IsOptional()
  @IsEnum(OperacaoRoteiro)
  operacao?: OperacaoRoteiro;

  /** Data de vencimento para ContaPagar */
  @IsDateString()
  dataVencimento: string;

  /** Fornecedor vinculado (opcional) */
  @IsOptional()
  @IsString()
  fornecedorId?: string;

  // ── Prestador (PF ou PJ) ──────────────────────────────────────────────────

  @IsOptional()
  @IsEnum(TipoPrestador)
  tipoPrestador?: TipoPrestador;

  @IsOptional()
  @IsString()
  prestadorNome?: string;

  @IsOptional()
  @IsString()
  prestadorCpf?: string;

  @IsOptional()
  @IsString()
  prestadorCnpj?: string;

  @IsOptional()
  @IsString()
  prestadorTelefone?: string;

  @IsOptional()
  @IsString()
  prestadorContato?: string;

  // ── Diária — calendário de dias trabalhados ───────────────────────────────

  /**
   * Array de datas ISO (YYYY-MM-DD) selecionadas no calendário interativo.
   * Ex: ["2026-05-13","2026-05-15","2026-05-16"]
   */
  @IsOptional()
  @IsArray()
  diasTrabalhados?: string[];

  /** Valor de uma única diária (antes da multiplicação). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  valorDiaria?: number;
}
