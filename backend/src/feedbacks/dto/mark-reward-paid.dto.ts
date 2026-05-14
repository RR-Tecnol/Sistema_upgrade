import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class MarkRewardPaidDto {
    @ApiPropertyOptional({ description: 'ID de referência no extrato bancário (evita duplicidade de interpretação humana)' })
    @IsOptional()
    @IsString()
    @MaxLength(256)
    paymentReference?: string;
}
