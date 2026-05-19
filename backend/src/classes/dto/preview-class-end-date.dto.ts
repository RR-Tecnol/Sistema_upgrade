import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ClassWeekendPolicy } from '@prisma/client';

export class PreviewClassEndDateDto {
  @ApiProperty({ example: '2026-05-19' })
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cityId: string;

  @ApiProperty({ enum: ClassWeekendPolicy })
  @IsEnum(ClassWeekendPolicy)
  weekendPolicy: ClassWeekendPolicy;

  @ApiPropertyOptional({
    description: 'Override da duração do curso (dias letivos). Se omitido, usa durationDaysMA/PI do grupo.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  teachingDaysCount?: number;

  @ApiPropertyOptional({ type: [String], example: ['2026-05-10'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  weekendExtraDates?: string[];

  @ApiPropertyOptional({
    description: 'Opcional: dias da semana (0–6) para FOLLOW_SCHEDULE antes de existir class_schedules',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  scheduleDays?: number[];

  @ApiPropertyOptional({ description: 'Data fim manual para comparar (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  manualEndDate?: string;

  @ApiPropertyOptional({ example: '07:00', description: 'Horário início da aula (HH:mm) — para auditoria de carga horária' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ example: '12:00', description: 'Horário fim da aula (HH:mm)' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Turma existente — inclui ocorrências (class_holidays) no preview' })
  @IsOptional()
  @IsString()
  classId?: string;
}
