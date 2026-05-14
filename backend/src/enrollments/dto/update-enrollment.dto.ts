import { PartialType } from '@nestjs/mapped-types';
import { CreateEnrollmentDto } from './create-enrollment.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum EnrollmentStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    DOCUMENT_PENDING = 'DOCUMENT_PENDING',
    WAITLIST = 'WAITLIST',
    ENROLLED = 'ENROLLED',
    DROPOUT = 'DROPOUT',
}

export class UpdateEnrollmentDto extends PartialType(CreateEnrollmentDto) {
    @ApiPropertyOptional({ enum: EnrollmentStatus })
    @IsOptional()
    @IsEnum(EnrollmentStatus)
    status?: EnrollmentStatus;

    @ApiPropertyOptional({ description: 'Motivo da rejeição' })
    @IsOptional()
    @IsString()
    rejectionReason?: string;

    @ApiPropertyOptional({ description: 'Observações' })
    @IsOptional()
    @IsString()
    notes?: string;
}

export class ApproveEnrollmentDto {
    @ApiPropertyOptional({ description: 'Observações da aprovação' })
    @IsOptional()
    @IsString()
    notes?: string;
}

export class RejectEnrollmentDto {
    @ApiPropertyOptional({ description: 'Motivo da rejeição' })
    @IsString()
    rejectionReason: string;
}

export class RequestCorrectionDto {
    @ApiPropertyOptional({ description: 'Detalhes do que precisa ser corrigido' })
    @IsString()
    correctionDetails: string;
}
