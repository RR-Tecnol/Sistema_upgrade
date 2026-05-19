import { IsString, IsOptional, IsBoolean, IsDateString, IsNumber, IsEnum, IsArray, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AcaoStatus, ClassWeekendPolicy, Period } from '@prisma/client';

export class CreateAcaoDto {
    @ApiProperty({ example: 'Ação Qualifica Imperatriz 2025' })
    @IsString()
    nome: string;

    @ApiProperty({ example: 'Imperatriz', description: 'Nome da cidade digitado livremente pelo usuário' })
    @IsString()
    cidadeNome: string;

    @ApiPropertyOptional({ example: 'uuid-da-cidade', description: 'FK opcional para correlação com tabela City (relatórios). Preenchido automaticamente via autocomplete.' })
    @IsOptional()
    @IsString()
    cidadeId?: string;

    @ApiProperty({ example: 'uuid-do-grupo' })
    @IsString()
    grupoId: string;

    @ApiPropertyOptional({ example: 'uuid-da-carreta' })
    @IsOptional()
    @IsString()
    carretaId?: string;

    @ApiProperty({ enum: AcaoStatus, default: AcaoStatus.PLANEJADA })
    @IsOptional()
    @IsEnum(AcaoStatus)
    status?: AcaoStatus;

    @ApiProperty({ example: '2025-06-01T00:00:00Z' })
    @IsDateString()
    dataInicio: string;

    @ApiProperty({ example: '2025-06-30T00:00:00Z' })
    @IsDateString()
    dataFim: string;

    @ApiPropertyOptional({ description: 'Curso de referência do motor letivo' })
    @IsOptional()
    @IsString()
    motorCourseId?: string;

    @ApiPropertyOptional({ enum: Period, default: Period.MORNING })
    @IsOptional()
    @IsEnum(Period)
    period?: Period;

    @ApiPropertyOptional({ example: '07:00' })
    @IsOptional()
    @IsString()
    startTime?: string;

    @ApiPropertyOptional({ example: '12:00' })
    @IsOptional()
    @IsString()
    endTime?: string;

    @ApiPropertyOptional({ enum: ClassWeekendPolicy, default: ClassWeekendPolicy.WEEKDAYS_ONLY })
    @IsOptional()
    @IsEnum(ClassWeekendPolicy)
    weekendPolicy?: ClassWeekendPolicy;

    @ApiPropertyOptional({ type: [String], description: 'Datas ISO com aula em fim de semana (SELECT_WEEKENDS)' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    weekendExtraDates?: string[];

    @ApiPropertyOptional({ description: 'Override de dias letivos do motor' })
    @IsOptional()
    @IsInt()
    @Min(1)
    teachingDaysOverride?: number;

    @ApiPropertyOptional({ example: 'Ginásio Municipal' })
    @IsOptional()
    @IsString()
    localExecucao?: string;

    // ── Detalhes adicionais do local (REQ-LOCAL-2026) ──
    // Aditivos: turmas filhas herdam estes valores automaticamente quando criadas.

    @ApiPropertyOptional({ example: 'Av. Beira-Mar, 1500 - Centro' })
    @IsOptional()
    @IsString()
    localEndereco?: string;

    @ApiPropertyOptional({ example: 'Em frente à praça principal' })
    @IsOptional()
    @IsString()
    localReferencia?: string;

    @ApiPropertyOptional({ example: -5.0892 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    localLatitude?: number;

    @ApiPropertyOptional({ example: -42.8013 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    localLongitude?: number;

    // ── Tipo de rota (REQ-ROUTE-2026) ─────────────────────────────────────────
    @ApiPropertyOptional({ example: 'INTERCIDADE', enum: ['INTERCIDADE', 'INTRAURBANA'] })
    @IsOptional()
    @IsString()
    routeType?: 'INTERCIDADE' | 'INTRAURBANA';

    @ApiPropertyOptional({ example: 'uuid-da-cidade-origem', description: 'Cidade de origem (intercidade)' })
    @IsOptional()
    @IsString()
    originCidadeId?: string;

    @ApiPropertyOptional({ example: 'Alto do Calhau', description: 'Bairro/ponto de partida (intraurbana)' })
    @IsOptional()
    @IsString()
    originNeighborhood?: string;

    @ApiPropertyOptional({ example: 'Forquilha', description: 'Bairro/ponto de chegada (intraurbana)' })
    @IsOptional()
    @IsString()
    destinationNeighborhood?: string;

    @ApiPropertyOptional({ example: 350 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    distanciaKm?: number;

    @ApiPropertyOptional({ example: 6.5 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    precoCombustivelL?: number;

    @ApiPropertyOptional({ example: 4.5 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    autonomiaKmL?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    observacoes?: string;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    permitirInscricoes?: boolean;
}
