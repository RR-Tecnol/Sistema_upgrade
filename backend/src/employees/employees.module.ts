import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { PayrollService } from './payroll.service'; // REQ-09
import { PayrollController } from './payroll.controller'; // REQ-09
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [EmployeesController, PayrollController],
    providers: [EmployeesService, PayrollService],
    exports: [EmployeesService, PayrollService],
})
export class EmployeesModule { }
