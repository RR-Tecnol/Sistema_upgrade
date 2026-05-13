import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString, IsObject } from 'class-validator';
import { EmployeeRole, EmployeeDepartment } from '@prisma/client';

export class CreateRegistrationTokenDto {
    @IsEnum(EmployeeRole)
    role: EmployeeRole;

    @IsEnum(EmployeeDepartment)
    department: EmployeeDepartment;
}

export class SubmitRegistrationDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    cpf: string;

    @IsString()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsDateString()
    @IsOptional()
    birthDate?: string;

    @IsObject()
    @IsNotEmpty()
    submittedData: any;
}
