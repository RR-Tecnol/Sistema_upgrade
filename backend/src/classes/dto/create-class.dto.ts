import { IsString, IsNotEmpty, IsInt, IsEnum, IsOptional, IsDateString, Min, Length, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Period, ClassStatus } from '@prisma/client';

export class CreateClassDto {
    @ApiProperty({ description: 'Course ID' })
    @IsString()
    @IsNotEmpty()
    courseId: string;

    @ApiProperty({ description: 'Group ID' })
    @IsString()
    @IsNotEmpty()
    groupId: string;

    @ApiProperty({ description: 'City ID' })
    @IsString()
    @IsNotEmpty()
    cityId: string;

    @ApiProperty({ example: 'INF-MA-SLZ-2024-01', description: 'Class identifier' })
    @IsString()
    @IsNotEmpty()
    @Length(5, 100)
    classIdentifier: string;

    @ApiProperty({ example: '2024-03-01', description: 'Start date (YYYY-MM-DD)' })
    @IsDateString()
    startDate: string;

    @ApiProperty({ example: '2024-04-30', description: 'End date (YYYY-MM-DD)' })
    @IsDateString()
    endDate: string;

    @ApiProperty({ enum: Period, example: 'MORNING' })
    @IsEnum(Period)
    period: Period;

    @ApiProperty({ example: '08:00', description: 'Start time (HH:mm)' })
    @IsString()
    @IsNotEmpty()
    startTime: string;

    @ApiProperty({ example: '12:00', description: 'End time (HH:mm)' })
    @IsString()
    @IsNotEmpty()
    endTime: string;

    @ApiProperty({ example: 30, description: 'Number of vacancies' })
    @IsInt()
    @Min(1)
    vacancies: number;

    // REQ-01: vagas de reserva — padrão 4 conforme reunião 12/03/2026
    // "são 4 vagas de reserva por padrão" — Robert S. Pimentel
    @ApiProperty({
        example: 4,
        description: 'Vagas de cadastro reserva (padrão: 4)',
        required: false,
        default: 4,
    })
    @IsInt()
    @Min(0)
    @Max(20)
    @IsOptional()
    reserveSlots?: number;

    @ApiProperty({ description: 'Truck ID', required: false })
    @IsString()
    @IsOptional()
    truckId?: string;

    @ApiProperty({ enum: ClassStatus, example: 'PLANNED', default: 'PLANNED' })
    @IsEnum(ClassStatus)
    @IsOptional()
    status?: ClassStatus;

    @ApiProperty({ example: '2024-02-15', required: false })
    @IsDateString()
    @IsOptional()
    enrollmentOpenDate?: string;

    @ApiProperty({ example: '2024-02-28', required: false })
    @IsDateString()
    @IsOptional()
    enrollmentCloseDate?: string;
}
