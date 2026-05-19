import { IsString, IsNotEmpty, IsInt, IsEnum, IsOptional, IsDateString, Min, Length, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TruckType, TruckStatus } from '@prisma/client';

export class CreateTruckDto {
    @ApiProperty({ example: 'CAR-MA-01', description: 'Truck identifier' })
    @IsString()
    @IsNotEmpty()
    @Length(3, 50)
    identifier: string;

    @ApiProperty({ example: 'ABC-1234', description: 'License plate' })
    @IsString()
    @IsNotEmpty()
    @Length(7, 10)
    licensePlate: string;

    @ApiProperty({ enum: TruckType, example: 'STANDARD' })
    @IsEnum(TruckType)
    type: TruckType;

    @ApiProperty({ description: 'Group ID' })
    @IsString()
    @IsNotEmpty()
    groupId: string;

    @ApiProperty({ example: 'MA', description: 'State (MA or PI)' })
    @IsString()
    @IsNotEmpty()
    @Length(2, 2)
    state: string;

    @ApiProperty({ example: 30, description: 'Student capacity' })
    @IsInt()
    @Min(1)
    capacity: number;

    @ApiProperty({ example: 2, description: 'Number of rooms', default: 1 })
    @IsInt()
    @Min(1)
    @IsOptional()
    roomsCount?: number;

    @ApiProperty({ enum: TruckStatus, example: 'AVAILABLE', default: 'AVAILABLE' })
    @IsEnum(TruckStatus)
    @IsOptional()
    status?: TruckStatus;

    @ApiProperty({ example: '2023', required: false })
    @IsString()
    @IsOptional()
    modelYear?: string;

    @ApiProperty({ example: '2024-01-15', required: false })
    @ValidateIf((o) => o.lastMaintenanceDate != null && o.lastMaintenanceDate !== '')
    @IsDateString()
    @IsOptional()
    lastMaintenanceDate?: string;

    @ApiProperty({ example: '2024-07-15', required: false })
    @ValidateIf((o) => o.nextMaintenanceDate != null && o.nextMaintenanceDate !== '')
    @IsDateString()
    @IsOptional()
    nextMaintenanceDate?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    photoUrl?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    equipmentList?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    notes?: string;
}
