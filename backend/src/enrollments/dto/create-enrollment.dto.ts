import { IsString, IsEmail, IsOptional, IsEnum, IsInt, IsBoolean, IsDateString, IsArray, ValidateNested, Min, Max, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    Gender,
    RaceColor,
    MaritalStatus,
    EducationLevel,
    EmploymentStatus,
    FamilyIncome,
    Zone,
    CareerGoal,
    SocialProgram,
    DisabilityType
} from '@prisma/client';

export class CreateEnrollmentDto {
    @ApiProperty({ description: 'ID da turma' })
    @IsString()
    classId: string;

    // ─── Conta de acesso ─────────────────────────────────────────────
    @ApiProperty({ description: 'Senha de acesso ao portal do aluno (mín. 6 caracteres)' })
    @IsString()
    @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
    password: string;

    // Section 1: Personal Data
    @ApiProperty({ description: 'Nome completo' })
    @IsString()
    fullName: string;

    @ApiPropertyOptional({ description: 'Nome social' })
    @IsOptional()
    @IsString()
    socialName?: string;

    @ApiProperty({ description: 'CPF (apenas números)' })
    @IsString()
    cpf: string;

    @ApiProperty({ description: 'Data de nascimento' })
    @IsDateString()
    birthDate: string;

    @ApiProperty({ enum: Gender })
    @IsEnum(Gender)
    gender: Gender;

    @ApiProperty({ enum: RaceColor })
    @IsEnum(RaceColor)
    raceColor: RaceColor;

    @ApiProperty({ enum: MaritalStatus })
    @IsEnum(MaritalStatus)
    maritalStatus: MaritalStatus;

    @ApiProperty({ description: 'Nome da mãe' })
    @IsString()
    motherName: string;

    @ApiPropertyOptional({ description: 'Nome do pai' })
    @IsOptional()
    @IsString()
    fatherName?: string;

    @ApiProperty({ description: 'Nacionalidade' })
    @IsString()
    nationality: string;

    @ApiProperty({ description: 'Cidade de nascimento' })
    @IsString()
    birthCity: string;

    @ApiProperty({ description: 'Estado de nascimento (UF)' })
    @IsString()
    birthState: string;

    // Section 2: Contact
    @ApiProperty({ description: 'Email' })
    @IsEmail()
    email: string;

    @ApiProperty({ description: 'Telefone celular' })
    @IsString()
    phone: string;

    @ApiProperty({ description: 'Possui WhatsApp' })
    @IsBoolean()
    hasWhatsApp: boolean;

    @ApiPropertyOptional({ description: 'Telefone alternativo' })
    @IsOptional()
    @IsString()
    phoneAlt?: string;

    @ApiProperty({ description: 'Autoriza contato por WhatsApp' })
    @IsBoolean()
    allowWhatsAppContact: boolean;

    @ApiProperty({ description: 'Autoriza contato por Email' })
    @IsBoolean()
    allowEmailContact: boolean;

    // Section 3: Address
    @ApiProperty({ description: 'CEP' })
    @IsString()
    cep: string;

    @ApiProperty({ description: 'Logradouro' })
    @IsString()
    street: string;

    @ApiProperty({ description: 'Número' })
    @IsString()
    number: string;

    @ApiPropertyOptional({ description: 'Complemento' })
    @IsOptional()
    @IsString()
    complement?: string;

    @ApiProperty({ description: 'Bairro' })
    @IsString()
    neighborhood: string;

    @ApiProperty({ description: 'Cidade' })
    @IsString()
    city: string;

    @ApiProperty({ description: 'Estado (UF)' })
    @IsString()
    state: string;

    @ApiProperty({ enum: Zone })
    @IsEnum(Zone)
    zone: Zone;

    // Section 4: Socioeconomic
    @ApiProperty({ enum: EducationLevel })
    @IsEnum(EducationLevel)
    educationLevel: EducationLevel;

    @ApiProperty({ enum: EmploymentStatus })
    @IsEnum(EmploymentStatus)
    employmentStatus: EmploymentStatus;

    @ApiProperty({ enum: FamilyIncome })
    @IsEnum(FamilyIncome)
    familyIncome: FamilyIncome;

    @ApiProperty({ description: 'Quantidade de pessoas na residência' })
    @IsInt()
    @Min(1)
    familyMembersCount: number;

    @ApiPropertyOptional({ enum: SocialProgram, description: 'Programa social beneficiário' })
    @IsOptional()
    @IsEnum(SocialProgram)
    socialProgram?: SocialProgram;

    @ApiPropertyOptional({ description: 'Possui deficiência' })
    @IsOptional()
    @IsBoolean()
    hasDisability?: boolean;

    @ApiPropertyOptional({ enum: DisabilityType, description: 'Tipo de deficiência' })
    @IsOptional()
    @IsEnum(DisabilityType)
    disabilityType?: DisabilityType;

    @ApiPropertyOptional({ description: 'Necessita adaptação' })
    @IsOptional()
    @IsBoolean()
    disabilityAdaptation?: boolean;

    // Section 5: Professional
    @ApiPropertyOptional({ description: 'Participou de outro curso de qualificação' })
    @IsOptional()
    @IsString()
    previousQualification?: string;

    @ApiPropertyOptional({ description: 'Área de interesse profissional' })
    @IsOptional()
    @IsString()
    professionalInterest?: string;

    @ApiProperty({ enum: CareerGoal })
    @IsEnum(CareerGoal)
    careerGoal: CareerGoal;

    @ApiPropertyOptional({ description: 'Como soube do curso' })
    @IsOptional()
    @IsString()
    howHeardAbout?: string;

    // REQ-05: campo tornado opcional conforme reunião 12/03/2026
    @ApiPropertyOptional({ description: 'Motivação para fazer o curso' })
    @IsOptional()
    @IsString()
    motivation?: string;

    // REQ-03: exigência governamental — elegibilidade por escola pública
    @ApiPropertyOptional({ description: 'Sempre estudou em escola pública?' })
    @IsOptional()
    @IsBoolean()
    publicSchoolOnly?: boolean;

    // Section 7: Terms
    @ApiProperty({ description: 'Aceita termos de uso' })
    @IsBoolean()
    termsAccepted: boolean;

    @ApiProperty({ description: 'Autoriza uso de imagem' })
    @IsBoolean()
    imageUseAuthorization: boolean;

    @ApiProperty({ description: 'Compromete-se com 75% de frequência' })
    @IsBoolean()
    attendanceCommitment: boolean;

    @ApiProperty({ description: 'Concorda com tratamento de dados (LGPD)' })
    @IsBoolean()
    dataProcessingConsent: boolean;

    @ApiPropertyOptional({ description: 'Documentos anexados pelo aluno' })
    @IsOptional()
    documents?: Record<string, string>;
}
