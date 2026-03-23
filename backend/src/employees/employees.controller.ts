import {
    Controller, Get, Post, Put, Patch, Delete,
    Body, Param, Query, UseGuards, HttpCode, HttpStatus, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';

@ApiTags('Funcionários')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'COORDINATOR')
@Controller('employees')
export class EmployeesController {
    constructor(private readonly service: EmployeesService) { }

    @Post()
    @ApiOperation({ summary: 'Cadastrar novo funcionário' })
    create(@Body() dto: CreateEmployeeDto) {
        return this.service.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar funcionários com filtros e KPIs' })
    findAll(
        @Query('role') role?: string,
        @Query('department') department?: string,
        @Query('active') active?: string,
        @Query('search') search?: string,
    ) {
        return this.service.findAll({ role, department, active, search });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar funcionário por ID' })
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Atualizar funcionário' })
    update(@Param('id') id: string, @Body() dto: Partial<CreateEmployeeDto>) {
        return this.service.update(id, dto);
    }

    @Patch(':id/toggle-active')
    @ApiOperation({ summary: 'Ativar/desativar funcionário' })
    toggleActive(@Param('id') id: string) {
        return this.service.toggleActive(id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Excluir funcionário' })
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }


    // PASSO 3.2: Frequencia de funcionarios

    @Post('attendance')
    @ApiOperation({ summary: '[PASSO 3.2] Registrar frequencia em lote' })
    registerAttendance(
        @Request() req: any,
        @Body() body: { date: string; records: { employeeId: string; present: boolean; justified?: boolean; justification?: string }[] },
    ) {
        return this.service.bulkAttendance(req.user.id, body.date, body.records);
    }

    @Get('attendance/summary')
    @ApiOperation({ summary: '[PASSO 3.2] Resumo de frequencia por periodo' })
    getAttendanceSummary(@Query('start') start: string, @Query('end') end: string) {
        const today = new Date().toISOString().split('T')[0];
        return this.service.getAttendanceSummary(start || today, end || today);
    }

    @Get('attendance')
    @ApiOperation({ summary: '[PASSO 3.2] Frequencia por data' })
    getAttendanceByDate(@Query('date') date: string) {
        return this.service.getAttendanceByDate(date || new Date().toISOString().split('T')[0]);
    }
}