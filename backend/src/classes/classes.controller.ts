import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ClassStatus } from '@prisma/client';

@ApiTags('classes')
@Controller('classes')
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
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List all classes' })
    @ApiQuery({ name: 'status', required: false, enum: ClassStatus })
    @ApiQuery({ name: 'courseId', required: false })
    @ApiQuery({ name: 'groupId', required: false })
    @ApiQuery({ name: 'cityId', required: false })
    @ApiQuery({ name: 'truckId', required: false })
    @ApiQuery({ name: 'teacherUserId', required: false, description: 'Filtrar turmas do professor pelo userId' })
    @ApiResponse({ status: 200, description: 'Classes retrieved successfully' })
    async findAll(
        @Query('status') status?: ClassStatus,
        @Query('courseId') courseId?: string,
        @Query('groupId') groupId?: string,
        @Query('cityId') cityId?: string,
        @Query('truckId') truckId?: string,
        @Query('teacherUserId') teacherUserId?: string,
    ) {
        const filters: any = {};
        if (status) filters.status = status;
        if (courseId) filters.courseId = courseId;
        if (groupId) filters.groupId = groupId;
        if (cityId) filters.cityId = cityId;
        if (truckId) filters.truckId = truckId;
        if (teacherUserId) filters.teacherUserId = teacherUserId;

        return this.classesService.findAll(filters);
    }

    // EXEC-06: Histórico do professor — DEVE ficar ANTES de /:id
    @Get('teacher/history')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Histórico de frequência lançada pelo professor logado' })
    @ApiResponse({ status: 200, description: 'Histórico de frequência' })
    async teacherHistory(@Req() req: any) {
        return this.classesService.getTeacherAttendanceHistory(req.user.id);
    }

    @Get(':id')
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

    // Teacher Management
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

    // Schedule Management
    @Post(':id/schedule')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Update class schedule' })
    @ApiResponse({ status: 200, description: 'Schedule updated successfully' })
    async updateSchedule(@Param('id') classId: string, @Body() schedules: CreateScheduleDto[]) {
        return this.classesService.updateSchedule(classId, schedules);
    }

    @Get(':id/schedule')
    @ApiOperation({ summary: 'Get class schedule' })
    @ApiResponse({ status: 200, description: 'Schedule retrieved successfully' })
    async getSchedule(@Param('id') classId: string) {
        return this.classesService.getSchedule(classId);
    }

    // Statistics
    @Get(':id/statistics')
    @ApiOperation({ summary: 'Get class statistics' })
    @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
    async getStatistics(@Param('id') classId: string) {
        return this.classesService.getClassStatistics(classId);
    }

    // Attendance History — usado pelo calendário de frequência do ADM e professor
    @Get(':id/attendance/history')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Histórico de frequência por data de uma turma' })
    @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso' })
    async getAttendanceHistory(@Param('id') classId: string) {
        return this.classesService.getAttendanceHistory(classId);
    }

    // Bulk Attendance (Professor)
    @Post(':id/attendance/bulk')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Registrar frequência em lote (professor)' })
    @ApiResponse({ status: 201, description: 'Frequências registradas com sucesso' })
    bulkAttendance(
        @Param('id') classId: string,
        @Body() body: { date: string; records: { studentId: string; present: boolean }[] },
        @Req() req: any,
    ) {
        const registeredBy = req.user.id;
        return this.classesService.bulkAttendance(classId, body.date, body.records, registeredBy);
    }
}
