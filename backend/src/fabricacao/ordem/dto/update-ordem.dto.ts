import { IsString, IsOptional } from 'class-validator';

export class UpdateOrdemDto {
  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
