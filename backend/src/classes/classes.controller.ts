import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { PreviewClassEndDateDto } from './dto/preview-class-end-date.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ClassStatus } from '@prisma/client';

/**
 * OAI-2 / A1: JwtAuthGuard + RolesGuard ao nível da classe — rotas sem guard deixavam de exigir JWT.
 * `Get('public')` permanece `@Public()`; restantes precisam de `@Roles` explícito (deny-by-default no RolesGuard).
 */
@ApiTags('classes')
@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ClassesController {
    constructor(private classesService: ClassesService) { }

    @Get('public')
    @Public()
    @ApiOperation({ summary: 'Listar turmas com inscrições abertas (público)' })
    @ApiQuery({ name: 'state', required: false, type: String })
    @ApiQuery({ name: 'city', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Lista de turmas disponíveis' })
    async findPublicClasses(
        @Query('state') state?: string,
        @Query('city') city?: string,
    ) {
        return this.classesService.findPublicClasses({ state, city });
    }

    @Get()
    @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL', 'TEACHER', 'DRIVER', 'STUDENT')
    @ApiOperation({ summary: 'List all classes' })
    @ApiQuery({ name: 'status', required: false, enum: ClassStatus })
    @ApiQuery({ name: 'courseId', required: false })
    @ApiQuery({ name: 'groupId', required: false })
    @ApiQuery({ name: 'cityId', required: false })
    @ApiQuery({ name: 'truckId', required: false })
    @ApiQuery({ name: 'teacherUserId', required: false, description: 'Filtrar turmas do professor pelo userId' })
    @ApiResponse({ status: 200, description: 'Classes retrieved successfully' })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    async findAll(
        @Query('status') status?: ClassStatus,
        @Query('courseId') courseId?: string,
        @Query('groupId') groupId?: string,
        @Query('cityId') cityId?: string,
        @Query('truckId') truckId?: string,
        @Query('teacherUserId') teacherUserId?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const filters: any = {};
        if (status) filters.status = status;
        if (courseId) filters.courseId = courseId;
        if (groupId) filters.groupId = groupId;
        if (cityId) filters.cityId = cityId;
        if (truckId) filters.truckId = truckId;
        if (teacherUserId) filters.teacherUserId = teacherUserId;
        if (search) filters.search = search;
        if (page) filters.page = parseInt(page, 10);
        if (limit) filters.limit = parseInt(limit, 10);

        return this.classesService.findAll(filters);
    }

    @Post('preview-end-date')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Pré-visualizar data fim com N dias letivos (calendário personalizado)' })
    @ApiResponse({ status: 200, description: 'Data fim calculada' })
    async previewEndDate(@Body() dto: PreviewClassEndDateDto) {
        return this.classesService.previewEndDate(dto);
    }

    @Get('teacher/history')
    @Roles('TEACHER')
    @ApiOperation({ summary: 'Histórico de frequência lançada pelo professor logado' })
    @ApiResponse({ status: 200, description: 'Histórico de frequência' })
    async teacherHistory(@Req() req: any) {
        return this.classesService.getTeacherAttendanceHistory(req.user.id);
    }

    @Get('teacher/dashboard')
    @Roles('TEACHER')
    @ApiOperation({ summary: 'Dashboard agregado do professor autenticado — todos os dados em uma chamada' })
    @ApiResponse({ status: 200, description: 'Dashboard data' })
    async teacherDashboard(@Req() req: any) {
        return this.classesService.getTeacherDashboard(req.user.id);
    }

    @Post(':id/aluno-risco')
    @Roles('ADMIN', 'COORDINATOR', 'TEACHER')
    @ApiOperation({ summary: 'Enviar alerta de risco de frequência para aluno + notificar admins via app e WebSocket' })
    async sendRiskAlert(
        @Param('id') classId: string,
        @Body('studentId') studentId: string,
        @Req() req: any,
    ) {
        return this.classesService.sendRiskAlert(classId, studentId, req.user.id);
    }

    @Get(':id')
    @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL', 'TEACHER', 'DRIVER', 'STUDENT')
    @ApiOperation({ summary: 'Get class by ID' })
    @ApiResponse({ status: 200, description: 'Class retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Class not found' })
    async findOne(@Param('id') id: string) {
        return this.classesService.findOne(id);
    }

    @Post()
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Create new class' })
    @ApiResponse({ status: 201, description: 'Class created successfully' })
    @ApiResponse({ status: 409, description: 'Class identifier already exists or truck not available' })
    async create(@Body() data: CreateClassDto) {
        return this.classesService.create(data);
    }

    @Patch(':id')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Update class' })
    @ApiResponse({ status: 200, description: 'Class updated successfully' })
    @ApiResponse({ status: 404, description: 'Class not found' })
    async update(@Param('id') id: string, @Body() data: UpdateClassDto) {
        return this.classesService.update(id, data);
    }

    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Delete class' })
    @ApiResponse({ status: 200, description: 'Class deleted successfully' })
    @ApiResponse({ status: 404, description: 'Class not found' })
    @ApiResponse({ status: 409, description: 'Cannot delete class with existing enrollments' })
    async delete(@Param('id') id: string) {
        return this.classesService.delete(id);
    }

    @Patch(':id/status')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Update class status' })
    @ApiResponse({ status: 200, description: 'Status updated successfully' })
    async updateStatus(@Param('id') id: string, @Body('status') status: ClassStatus) {
        return this.classesService.updateStatus(id, status);
    }

    @Post(':id/teachers/:teacherId')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Assign teacher to class' })
    @ApiResponse({ status: 201, description: 'Teacher assigned successfully' })
    async assignTeacher(
        @Param('id') classId: string,
        @Param('teacherId') teacherId: string,
        @Body('isSubstitute') isSubstitute?: boolean,
    ) {
        return this.classesService.assignTeacher(classId, teacherId, isSubstitute);
    }

    @Delete(':id/teachers/:teacherId')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Remove teacher from class' })
    @ApiResponse({ status: 200, description: 'Teacher removed successfully' })
    async removeTeacher(@Param('id') classId: string, @Param('teacherId') teacherId: string) {
        return this.classesService.removeTeacher(classId, teacherId);
    }

    @Post(':id/schedule')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Update class schedule' })
    @ApiResponse({ status: 200, description: 'Schedule updated successfully' })
    async updateSchedule(@Param('id') classId: string, @Body() schedules: CreateScheduleDto[]) {
        return this.classesService.updateSchedule(classId, schedules);
    }

    @Get(':id/schedule')
    @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL', 'TEACHER', 'DRIVER', 'STUDENT')
    @ApiOperation({ summary: 'Get class schedule' })
    @ApiResponse({ status: 200, description: 'Schedule retrieved successfully' })
    async getSchedule(@Param('id') classId: string) {
        return this.classesService.getSchedule(classId);
    }

    @Get(':id/statistics')
    @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL', 'TEACHER', 'DRIVER', 'STUDENT')
    @ApiOperation({ summary: 'Get class statistics' })
    @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
    async getStatistics(@Param('id') classId: string) {
        return this.classesService.getClassStatistics(classId);
    }

    @Get(':id/attendance/history')
    @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL', 'TEACHER')
    @ApiOperation({ summary: 'Histórico de frequência por data de uma turma' })
    @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso' })
    async getAttendanceHistory(@Param('id') classId: string) {
        return this.classesService.getAttendanceHistory(classId);
    }

    @Get(':id/attendance/student/:studentId')
    @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL', 'TEACHER')
    @ApiOperation({ summary: 'Detalhe de frequência de um aluno na turma (admin)' })
    @ApiResponse({ status: 200, description: 'Perfil, resumo e registos do período' })
    async getStudentAttendanceDetail(
        @Param('id') classId: string,
        @Param('studentId') studentId: string,
        @Query('start') start?: string,
        @Query('end') end?: string,
    ) {
        return this.classesService.getStudentAttendanceDetailForAdmin(classId, studentId, start, end);
    }

    @Patch(':id/attendance/slot')
    @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL', 'TEACHER')
    @ApiOperation({ summary: 'Atualizar presença/justificativa de um aluno num dia (reavalia alertas de certificado)' })
    @ApiResponse({ status: 200, description: 'Registo atualizado' })
    patchAttendanceSlot(
        @Param('id') classId: string,
        @Body() body: { date: string; studentId: string; justified?: boolean; present?: boolean },
        @Req() req: any,
    ) {
        return this.classesService.patchAttendanceSlot(classId, body, req.user.id, req.user.role);
    }

    @Post(':id/attendance/bulk')
    @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL', 'TEACHER')
    @ApiOperation({ summary: 'Registrar frequência em lote (professor)' })
    @ApiResponse({ status: 201, description: 'Frequências registradas com sucesso' })
    bulkAttendance(
        @Param('id') classId: string,
        @Body() body: { date: string; records: { studentId: string; present: boolean; justified?: boolean }[] },
        @Req() req: any,
    ) {
        const registeredBy = req.user.id;
        return this.classesService.bulkAttendance(classId, body.date, body.records, registeredBy, req.user.role);
    }
}
