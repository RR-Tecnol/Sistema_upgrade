import { IsString, IsNumber, IsDateString, IsArray, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateApontamentoDto {
  @IsString()
  operacaoId: string;

  @IsString()
  funcionarioId: string;

  @IsDateString()
  data: string;

  @IsNumber()
  @Min(0.5)
  @Max(24)
  @Type(() => Number)
  horasTrabalhadas: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  percentualAvanco: number;

  @IsString()
  descricaoAtividade: string;

  @IsOptional()
  materiaisConsumidos?: Array<{
    insumoId?: string;    // ID de InsumoFabricacao (tabela própria de fabricação)
    stockItemId?: string; // ID de StockItem (categoria MATERIAL_FABRICACAO no estoque central)
    quantidade: number;
  }>;

  @IsArray()
  @IsOptional()
  fotoUrls?: string[];

  @IsOptional()
  @IsString()
  observacoes?: string;
}
