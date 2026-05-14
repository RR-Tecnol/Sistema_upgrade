import { PartialType } from '@nestjs/mapped-types';
import { CreateTruckMaintenanceDto } from './create-truck-maintenance.dto';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateTruckMaintenanceDto extends PartialType(CreateTruckMaintenanceDto) {
    @IsOptional()
    @IsString()
    @IsIn(['pendente', 'paga'])
    statusPagamento?: string;
}
