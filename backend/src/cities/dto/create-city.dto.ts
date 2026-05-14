import { IsString, IsNotEmpty, IsOptional, IsNumber, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCityDto {
    @ApiProperty({ example: 'São Luís', description: 'City name' })
    @IsString()
    @IsNotEmpty()
    @Length(2, 100)
    name: string;

    @ApiProperty({ example: 'MA', description: 'State code (MA or PI)' })
    @IsString()
    @IsNotEmpty()
    @Length(2, 2)
    state: string;

    @ApiProperty({ example: '2111300', description: 'IBGE code', required: false })
    @IsString()
    @IsOptional()
    ibgeCode?: string;

    @ApiProperty({ example: -2.5297, description: 'Latitude (geocodificada via Nominatim se não fornecida)', required: false })
    @IsNumber()
    @IsOptional()
    latitude?: number;

    @ApiProperty({ example: -44.3028, description: 'Longitude (geocodificada via Nominatim se não fornecida)', required: false })
    @IsNumber()
    @IsOptional()
    longitude?: number;
}
