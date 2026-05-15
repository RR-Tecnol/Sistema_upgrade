import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectFeedbackDto {
    @ApiProperty({ description: 'Motivo da rejeição' })
    @IsString()
    @MinLength(5)
    rejectionReason: string;
}
