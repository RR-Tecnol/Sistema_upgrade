import { IsInt, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateScheduleDto {
    @ApiProperty({ example: 1, description: 'Weekday (0=Sunday, 1=Monday, ..., 6=Saturday)' })
    @IsInt()
    @Min(0)
    @Max(6)
    weekday: number;

    @ApiProperty({ example: true, default: true })
    @IsBoolean()
    @IsOptional()
    active?: boolean;
}
