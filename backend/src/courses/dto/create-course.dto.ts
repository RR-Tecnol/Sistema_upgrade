import { IsString, IsNotEmpty, IsInt, IsBoolean, IsOptional, Min, Length, IsUUID, Allow } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CreateCourseDto {
    @ApiProperty({ example: 'Informática Básica', description: 'Course name' })
    @IsString()
    @IsNotEmpty()
    @Length(3, 200)
    name: string;

    @ApiProperty({ example: 'Curso de informática básica com foco em ferramentas de escritório' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ example: 30, description: 'Duration in days for Maranhão' })
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    durationDaysMA: number;

    @ApiProperty({ example: 30, description: 'Duration in days for Piauí' })
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    durationDaysPI: number;

    @ApiProperty({ example: 120, description: 'Total workload in hours' })
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    workloadHours: number;

    @ApiProperty({ example: 'Ensino fundamental completo', required: false })
    @IsString()
    @IsOptional()
    @Transform(({ value }) => (value === '' ? undefined : value))
    prerequisites?: string;

    @ApiProperty({ example: 'Módulo 1: Windows\nMódulo 2: Word\nMódulo 3: Excel' })
    @IsString()
    @IsNotEmpty()
    syllabus: string;

    @ApiProperty({ example: true, description: 'Available in Maranhão', default: true })
    @Transform(({ value }) => value === true || value === 'true')
    @IsBoolean()
    @IsOptional()
    availableInMA?: boolean;

    @ApiProperty({ example: true, description: 'Available in Piauí', default: true })
    @Transform(({ value }) => value === true || value === 'true')
    @IsBoolean()
    @IsOptional()
    availableInPI?: boolean;

    @ApiProperty({ example: false, description: 'Is multicourse', default: false })
    @Transform(({ value }) => value === true || value === 'true')
    @IsBoolean()
    @IsOptional()
    isMulticourse?: boolean;

    @ApiProperty({
        required: false,
        description: 'Configuração incremental por estado (UF): disponibilidade e duração. Ex: { "MA": { "available": true, "durationDays": 30 }, "PA": { "available": true, "durationDays": 28 } }',
    })
    @IsOptional()
    @Allow()
    stateConfig?: Record<string, { available?: boolean; durationDays?: number }>;

    @ApiProperty({ required: false, description: 'Instituição white-label; omissão = instituição padrão (slug upgrade)' })
    @IsOptional()
    @IsUUID()
    institutionId?: string;
}
