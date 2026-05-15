import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RevertFeedbackDto {
    @ApiProperty({ description: 'Motivo da reversão' })
    @IsString()
    @MinLength(5)
    revertReason: string;
}
