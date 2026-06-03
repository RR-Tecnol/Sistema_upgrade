import { IsString, IsBoolean, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ChecklistItemDto {
  @IsString()
  item: string;

  @IsBoolean()
  ok: boolean;

  @IsOptional()
  @IsString()
  obs?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fotosUrls?: string[];   // fotos por item (opcional)
}

export class AprovarGateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  itens: ChecklistItemDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fotosUrls?: string[];   // fotos globais do gate (opcional)

  @IsOptional()
  medicoes?: Record<string, number>;

  @IsOptional()
  @IsString()
  observacao?: string;
}
