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
import { AdminOverrideAttendanceDto } from './dto/admin-override-attendance.dto';
import { Public } from '../auth/decorators/public.decorator';
import { CreateRegistrationTokenDto, SubmitRegistrationDto } from './dto/registration.dto';

@ApiTags('Funcionários')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'COORDINATOR')
@Controller('employees')
export class EmployeesController {
    constructor(private readonly service: EmployeesService) { }

    @Post()
    @ApiOperation({ summary: 'Cadastrar novo funcionário (Manual)' })
    create(@Body() dto: CreateEmployeeDto) {
        return this.service.create(dto);
    }

    // ============================================
    // CADASTRO SEGURO DE FUNCIONÁRIOS (LINKS)
    // ============================================

    @Post('registration-token')
    @ApiOperation({ summary: 'Gera um link seguro para cadastro de funcionário' })
    createRegistrationToken(@Request() req: any, @Body() dto: CreateRegistrationTokenDto) {
        return this.service.createRegistrationToken(req.user.id, dto.role, dto.department);
    }

    @Post('admin-invite')
    @Roles('IT_ADMIN')
    @ApiOperation({ summary: '[IT_ADMIN only] Gera link seguro para cadastro de novo Administrador' })
    createAdminInvite(@Request() req: any) {
        return this.service.createRegistrationToken(req.user.id, 'ADMIN' as any, 'ADMINISTRATIVE' as any);
    }

    @Public()
    @Get('registration/:token')
    @ApiOperation({ summary: 'Valida o token e retorna a role para montar o form dinâmico' })
    validateRegistrationToken(@Param('token') token: string) {
        return this.service.validateRegistrationToken(token);
    }

    @Public()
    @Post('registration/:token')
    @ApiOperation({ summary: 'Submete os dados de cadastro via link seguro' })
    submitRegistration(@Param('token') token: string, @Body() dto: SubmitRegistrationDto) {
        return this.service.submitRegistration(token, dto);
    }

    @Get('registration-requests')
    @ApiOperation({ summary: 'Lista solicitações de cadastro pendentes' })
    getRegistrationRequests(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.service.getRegistrationRequests({
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }

    @Post('registration-requests/:id/approve')
    @ApiOperation({ summary: 'Aprova uma solicitação de cadastro, criando o User, Employee e Teacher' })
    approveRegistrationRequest(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body?: { dailyCost?: number },
    ) {
        return this.service.approveRegistrationRequest(id, req.user.id, { dailyCost: body?.dailyCost });
    }

    @Get()
    @ApiOperation({ summary: 'Listar funcionários com filtros e KPIs' })
    findAll(
        @Query('role') role?: string,
        @Query('department') department?: string,
        @Query('active') active?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.service.findAll({
            role,
            department,
            active,
            search,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }

    // PASSO 3.2: Frequencia de funcionarios
    // LIVRO_DE_REGRAS §2: rotas LITERAIS sempre antes de rotas com parâmetro (:id)

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
    getAttendanceSummary(
        @Query('start') start: string,
        @Query('end') end: string,
        @Query('role') role?: string,
    ) {
        const today = new Date().toISOString().split('T')[0];
        return this.service.getAttendanceSummary(start || today, end || today, role);
    }

    @Get('attendance')
    @ApiOperation({ summary: '[PASSO 3.2] Frequencia por data' })
    getAttendanceByDate(@Query('date') date: string) {
        return this.service.getAttendanceByDate(date || new Date().toISOString().split('T')[0]);
    }

    @Get('attendance/unified')
    @ApiOperation({ summary: 'Obter frequência unificada (Professores/Motoristas) para uma data' })
    getUnifiedAttendance(@Query('date') date: string, @Query('role') role?: string) {
        return this.service.getUnifiedAttendance(date || new Date().toISOString().split('T')[0], role);
    }

    @Get('attendance/history')
    @ApiOperation({ summary: 'Obter datas com registros de frequência para alimentar o calendário' })
    getAttendanceHistory(@Query('role') role?: string) {
        return this.service.getHistorySummary(role);
    }

    @Get('attendance/individual/:employeeId')
    @ApiOperation({ summary: 'Histórico detalhado de frequência de um funcionário (professor/motorista) no período' })
    getIndividualAttendance(
        @Param('employeeId') employeeId: string,
        @Query('start') start?: string,
        @Query('end') end?: string,
    ) {
        return this.service.getIndividualAttendanceDetail(employeeId, start, end);
    }

    @Patch('attendance/:employeeId/admin-override')
    @ApiOperation({ summary: 'Admin altera o ponto de um funcionário e notifica' })
    adminOverrideAttendance(
        @Request() req: any,
        @Param('employeeId') employeeId: string,
        @Body() dto: AdminOverrideAttendanceDto,
        @Query('date') date: string,
        @Query('attendanceId') attendanceId?: string,
    ) {
        return this.service.adminOverrideAttendance(
            attendanceId || null,
            employeeId,
            date || new Date().toISOString().split('T')[0],
            dto.present,
            dto.reason,
            req.user.id,
            dto.notifyUser,
        );
    }

    // Rotas com parâmetro (:id) — SEMPRE após as literais

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
}
