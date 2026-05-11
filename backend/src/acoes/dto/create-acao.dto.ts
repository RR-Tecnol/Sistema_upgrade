import { IsString, IsOptional, IsBoolean, IsDateString, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AcaoStatus } from '@prisma/client';

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
