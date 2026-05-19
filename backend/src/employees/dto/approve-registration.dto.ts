import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ApproveContractTypeDto {
    CLT = 'CLT',
    PJ = 'PJ',
    FREELANCE = 'FREELANCE',
}

export class ApproveRegistrationDto {
    @ApiPropertyOptional({ enum: ApproveContractTypeDto, description: 'CLT ou modalidade com diária (PJ/FREELANCE)' })
    @IsOptional()
    @IsEnum(ApproveContractTypeDto)
    contractType?: ApproveContractTypeDto;

    @ApiPropertyOptional({ description: 'Valor da diária (obrigatório se PJ ou FREELANCE)' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0.01)
    dailyCost?: number;

    @ApiPropertyOptional({ description: 'Salário mensal CLT (obrigatório se contractType=CLT)' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0.01)
    monthlySalaryCLT?: number;

    @ApiPropertyOptional({ description: 'Limite km para regra de passagem (CLT)' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    travelRuleKm?: number;
}
