import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class RegisterAcaoHolidaysDto {
  @ApiProperty({
    example: ['2026-06-12'],
    description: 'Datas sem aula (YYYY-MM-DD)',
    type: [String],
  })
  @IsArray()
  @IsDateString({}, { each: true })
  dates: string[];

  @ApiProperty({ example: 'Sem energia na unidade móvel' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: 'Turma quando o período tem várias vinculadas' })
  @IsOptional()
  @IsUUID()
  turmaId?: string;
}
