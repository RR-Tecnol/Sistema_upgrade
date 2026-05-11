import { IsString, IsNotEmpty, IsInt, IsEnum, IsOptional, IsDateString, IsNumber, Min, Length, Max, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Period, ClassStatus, ClassWeekendPolicy } from '@prisma/client';

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

    // ── Tipo de rota (REQ-ROUTE-2026) ─────────────────────────────────────────
    @ApiPropertyOptional({ example: 'INTERCIDADE', enum: ['INTERCIDADE', 'INTRAURBANA'], description: 'Tipo de rota da turma' })
    @IsString()
    @IsOptional()
    routeType?: 'INTERCIDADE' | 'INTRAURBANA';

    @ApiPropertyOptional({ example: 'uuid-da-cidade-origem', description: 'Cidade de origem da Carreta-Escola (apenas intercidade)' })
    @IsString()
    @IsOptional()
    originCityId?: string;

    @ApiPropertyOptional({ example: 'Alto do Calhau', description: 'Bairro/ponto de partida (apenas intraurbana)' })
    @IsString()
    @IsOptional()
    originNeighborhood?: string;

    @ApiPropertyOptional({ example: 'Forquilha', description: 'Bairro/ponto de chegada (apenas intraurbana)' })
    @IsString()
    @IsOptional()
    destinationNeighborhood?: string;

    // ── Local específico onde a turma ocorre fisicamente (REQ-LOCAL-2026) ──
    // Todos opcionais para não quebrar registos existentes; admin preenche depois.

    @ApiPropertyOptional({ example: 'Escola Municipal Castro Alves', description: 'Nome do local físico onde a turma ocorre' })
    @IsString()
    @IsOptional()
    locationName?: string;

    @ApiPropertyOptional({ example: 'Rua das Flores, 123 - Centro', description: 'Endereço completo do local' })
    @IsString()
    @IsOptional()
    locationAddress?: string;

    @ApiPropertyOptional({ example: 'Próximo ao mercado, portão azul', description: 'Ponto de referência para localizar' })
    @IsString()
    @IsOptional()
    locationReference?: string;

    @ApiPropertyOptional({ example: -2.5307, description: 'Latitude GPS (decimal)' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    locationLatitude?: number;

    @ApiPropertyOptional({ example: -44.3068, description: 'Longitude GPS (decimal)' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    locationLongitude?: number;

    @ApiPropertyOptional({
        enum: ClassWeekendPolicy,
        description: 'Como contar fins de semana nos dias letivos previstos (frequência/certificado)',
    })
    @IsEnum(ClassWeekendPolicy)
    @IsOptional()
    weekendPolicy?: ClassWeekendPolicy;

    @ApiPropertyOptional({
        example: ['2026-05-10', '2026-05-24'],
        description: 'Com weekendPolicy=SELECT_WEEKENDS: datas YYYY-MM-DD com aula ao fim de semana',
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    weekendExtraDates?: string[];
}
