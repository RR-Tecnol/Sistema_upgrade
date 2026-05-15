import { IsString, IsOptional, IsNumber, IsDateString, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTruckMaintenanceDto {
    @IsString()
    truckId: string;

    @IsString()
    @IsIn(['preventiva', 'corretiva', 'revisao', 'pneu', 'eletrica', 'outro'])
    tipo: string;

    @IsString()
    titulo: string;

    @IsOptional()
    @IsString()
    descricao?: string;

    @IsOptional()
    @IsString()
    @IsIn(['agendada', 'em_andamento', 'concluida', 'cancelada'])
    status?: string;

    @IsOptional()
    @IsString()
    @IsIn(['baixa', 'media', 'alta', 'critica'])
    prioridade?: string;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => value ? Number(value) : undefined)
    kmAtual?: number;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => value ? Number(value) : undefined)
    kmProximo?: number;

    @IsOptional()
    @IsDateString()
    dataAgendada?: string;

    @IsOptional()
    @IsDateString()
    dataConclusao?: string;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => value ? Number(value) : undefined)
    custoEstimado?: number;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => value ? Number(value) : undefined)
    custoReal?: number;

    @IsOptional()
    @IsString()
    fornecedor?: string;

    @IsOptional()
    @IsString()
    responsavel?: string;

    @IsOptional()
    @IsString()
    observacoes?: string;

    @IsOptional()
    @IsString()
    @IsIn(['pendente', 'pago', 'vencido'])
    statusPagamento?: string;
}
