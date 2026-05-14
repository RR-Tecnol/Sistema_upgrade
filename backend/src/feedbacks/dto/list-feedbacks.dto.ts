import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNumberString } from 'class-validator';
import { FeedbackStatus } from '@prisma/client';

export class ListFeedbacksDto {
    @ApiPropertyOptional({ enum: FeedbackStatus })
    @IsOptional()
    @IsEnum(FeedbackStatus)
    status?: FeedbackStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    classId?: string;

    @ApiPropertyOptional({ default: '1' })
    @IsOptional()
    @IsNumberString()
    page?: string;

    @ApiPropertyOptional({ default: '20' })
    @IsOptional()
    @IsNumberString()
    limit?: string;
}
