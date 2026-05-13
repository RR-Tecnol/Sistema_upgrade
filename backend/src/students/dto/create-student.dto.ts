import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsDateString, IsEnum, IsBoolean, IsInt, MinLength, IsObject } from 'class-validator';
import {
    Gender,
    RaceColor,
    MaritalStatus,
    Zone,
    EducationLevel,
    EmploymentStatus,
    FamilyIncome,
    SocialProgram,
    DisabilityType,
    CareerGoal
} from '@prisma/client';

export class CreateStudentDto {
    // ===== USER DATA =====
    @ApiProperty({ example: 'João da Silva' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'joao@email.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'senha123', minLength: 6 })
    @IsString()
    @MinLength(6)
    password: string;

    @ApiProperty({ example: '(98) 98765-4321' })
    @IsString()
    phone: string;

    // ===== STUDENT BASIC DATA =====
    @ApiProperty({ example: '123.456.789-00' })
    @IsString()
    cpf: string;

    @ApiProperty({ example: '1990-01-15' })
    @IsDateString()
    birthDate: string;

    @ApiProperty({ enum: Gender, example: 'MALE' })
    @IsEnum(Gender)
    gender: Gender;

    @ApiProperty({ enum: RaceColor, example: 'PARDO' })
    @IsEnum(RaceColor)
    raceColor: RaceColor;

    @ApiProperty({ enum: MaritalStatus, example: 'SINGLE' })
    @IsEnum(MaritalStatus)
    maritalStatus: MaritalStatus;

    @ApiProperty({ example: 'Maria da Silva' })
    @IsString()
    motherName: string;

    @ApiProperty({ example: 'José da Silva', required: false })
    @IsOptional()
    @IsString()
    fatherName?: string;

    @ApiProperty({ example: 'Brasileira' })
    @IsString()
    nationality: string;

    @ApiProperty({ example: 'São Luís' })
    @IsString()
    birthCity: string;

    @ApiProperty({ example: 'MA' })
    @IsString()
    birthState: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    socialName?: string;

    // ===== ADDRESS =====
    @ApiProperty({ example: '65000-000' })
    @IsString()
    cep: string;

    @ApiProperty({ example: 'Rua das Flores' })
    @IsString()
    street: string;

    @ApiProperty({ example: '123' })
    @IsString()
    addressNumber: string;

    @ApiProperty({ example: 'Apto 101', required: false })
    @IsOptional()
    @IsString()
    complement?: string;

    @ApiProperty({ example: 'Centro' })
    @IsString()
    neighborhood: string;

    @ApiProperty({ example: 'São Luís' })
    @IsString()
    city: string;

    @ApiProperty({ example: 'MA' })
    @IsString()
    state: string;

    @ApiProperty({ enum: Zone, example: 'URBAN' })
    @IsEnum(Zone)
    zone: Zone;

    // ===== CONTACT =====
    @ApiProperty({ example: true })
    @IsBoolean()
    hasWhatsapp: boolean;

    @ApiProperty({ example: '(98) 91234-5678', required: false })
    @IsOptional()
    @IsString()
    phoneAlt?: string;

    @ApiProperty({ example: true })
    @IsBoolean()
    allowWhatsappContact: boolean;

    @ApiProperty({ example: true })
    @IsBoolean()
    allowEmailContact: boolean;

    // ===== SOCIOECONOMIC =====
    @ApiProperty({ enum: EducationLevel, example: 'HIGH_SCHOOL_COMPLETE' })
    @IsEnum(EducationLevel)
    educationLevel: EducationLevel;

    @ApiProperty({ enum: EmploymentStatus, example: 'EMPLOYED' })
    @IsEnum(EmploymentStatus)
    employmentStatus: EmploymentStatus;

    @ApiProperty({ enum: FamilyIncome, example: 'ONE_TO_TWO' })
    @IsEnum(FamilyIncome)
    familyIncome: FamilyIncome;

    @ApiProperty({ example: 4 })
    @IsInt()
    familyMembersCount: number;

    @ApiProperty({ enum: SocialProgram, required: false })
    @IsOptional()
    @IsEnum(SocialProgram)
    socialProgram?: SocialProgram;

    @ApiProperty({ example: false })
    @IsBoolean()
    hasDisability: boolean;

    @ApiProperty({ enum: DisabilityType, required: false })
    @IsOptional()
    @IsEnum(DisabilityType)
    disabilityType?: DisabilityType;

    @ApiProperty({ example: false, required: false })
    @IsOptional()
    @IsBoolean()
    disabilityAdaptation?: boolean;

    // REQ-03: exigência governamental — elegibilidade por escola pública
    @ApiProperty({ example: false, required: false, description: 'Sempre estudou em escola pública?' })
    @IsOptional()
    @IsBoolean()
    publicSchoolOnly?: boolean;

    // ===== PROFESSIONAL =====
    @ApiProperty({ example: 'Curso de Informática Básica', required: false })
    @IsOptional()
    @IsString()
    previousQualification?: string;

    @ApiProperty({ example: 'Tecnologia da Informação', required: false })
    @IsOptional()
    @IsString()
    professionalInterest?: string;

    @ApiProperty({ enum: CareerGoal, example: 'EMPLOYMENT' })
    @IsEnum(CareerGoal)
    careerGoal: CareerGoal;

    @ApiProperty({ example: 'Redes sociais', required: false })
    @IsOptional()
    @IsString()
    howHeardAbout?: string;

    // REQ-05: campo tornado opcional conforme reunião 12/03/2026
    @ApiProperty({ example: 'Quero melhorar minhas habilidades profissionais', required: false })
    @IsOptional()
    @IsString()
    motivation?: string;

    /** URLs dos ficheiros (mesmas chaves da inscrição pública: photo, identidade, addressProof, …). Opcional no cadastro manual. */
    @ApiProperty({ required: false, example: { photo: 'https://...', identidade: 'https://...' } })
    @IsOptional()
    @IsObject()
    documents?: Record<string, string>;
}
