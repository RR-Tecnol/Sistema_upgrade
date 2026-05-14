import { IsBoolean, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminOverrideAttendanceDto {
    @ApiProperty({ description: 'Novo status de presença', example: true })
    @IsBoolean()
    present: boolean;

    @ApiProperty({ description: 'Motivo da alteração (obrigatório para rastreabilidade)', example: 'Erro de registro — atestado apresentado posteriormente.' })
    @IsString()
    @MinLength(5, { message: 'O motivo deve ter pelo menos 5 caracteres.' })
    reason: string;

    @ApiProperty({ description: 'Notificar o usuário afetado? (default: true)', required: false })
    @IsOptional()
    @IsBoolean()
    notifyUser?: boolean;
}
