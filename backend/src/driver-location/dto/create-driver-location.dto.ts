import { IsNumber, IsOptional, IsString, IsDateString, IsArray, ValidateNested, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateDriverLocationDto {
    @ApiProperty({ example: -2.5297 })
    @IsNumber()
    latitude: number;

    @ApiProperty({ example: -44.3028 })
    @IsNumber()
    longitude: number;

    @ApiProperty({ example: 15.5, required: false })
    @IsNumber()
    @IsOptional()
    accuracy?: number;

    @ApiProperty({ example: 74.2, required: false, description: 'Velocidade em km/h' })
    @IsNumber()
    @IsOptional()
    speed?: number;

    @ApiProperty({ example: 180, required: false, description: 'Direcao 0-360 graus (0=Norte)' })
    @IsNumber()
    @IsOptional()
    heading?: number;

    @ApiProperty({ example: '2026-03-27T14:30:00.000Z', description: 'Momento real da captura no device' })
    @IsDateString()
    capturedAt: string;

    @ApiProperty({ example: 'polling', enum: ['checkin', 'polling', 'batch'] })
    @IsString()
    @IsIn(['checkin', 'polling', 'batch'])
    source: string;
}

export class BatchDriverLocationDto {
    @ApiProperty({ type: [CreateDriverLocationDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateDriverLocationDto)
    locations: CreateDriverLocationDto[];
}
