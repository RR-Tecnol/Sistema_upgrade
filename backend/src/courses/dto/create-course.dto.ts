import { IsString, IsNotEmpty, IsInt, IsBoolean, IsOptional, Min, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
    @IsInt()
    @Min(1)
    durationDaysMA: number;

    @ApiProperty({ example: 30, description: 'Duration in days for Piauí' })
    @IsInt()
    @Min(1)
    durationDaysPI: number;

    @ApiProperty({ example: 120, description: 'Total workload in hours' })
    @IsInt()
    @Min(1)
    workloadHours: number;

    @ApiProperty({ example: 'Ensino fundamental completo', required: false })
    @IsString()
    @IsOptional()
    prerequisites?: string;

    @ApiProperty({ example: 'Módulo 1: Windows\nMódulo 2: Word\nMódulo 3: Excel' })
    @IsString()
    @IsNotEmpty()
    syllabus: string;

    @ApiProperty({ example: true, description: 'Available in Maranhão', default: true })
    @IsBoolean()
    @IsOptional()
    availableInMA?: boolean;

    @ApiProperty({ example: true, description: 'Available in Piauí', default: true })
    @IsBoolean()
    @IsOptional()
    availableInPI?: boolean;

    @ApiProperty({ example: false, description: 'Is multicourse', default: false })
    @IsBoolean()
    @IsOptional()
    isMulticourse?: boolean;
}
