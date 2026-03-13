import { IsString, IsOptional, IsEnum, IsBoolean, IsDecimal, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeeRole, EmployeeDepartment } from '@prisma/client';

export class CreateEmployeeDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty({ enum: EmployeeRole })
    @IsEnum(EmployeeRole)
    role: EmployeeRole;

    @ApiProperty({ enum: EmployeeDepartment })
    @IsEnum(EmployeeDepartment)
    department: EmployeeDepartment;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    cpf?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    rg?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    email?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    specialty?: string;

    @ApiPropertyOptional()
    @IsOptional()
    dailyCost?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    hireDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    photoUrl?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    active?: boolean;
}
