import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('courses')
@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CoursesController {
    constructor(private coursesService: CoursesService) { }

    @Get()
    @Roles('ADMIN', 'COORDINATOR', 'TEACHER', 'STUDENT')
    @ApiOperation({ summary: 'List all courses' })
    @ApiQuery({ name: 'state', required: false, description: 'Filter by state (MA or PI)' })
    @ApiQuery({ name: 'active', required: false, type: Boolean })
    @ApiQuery({ name: 'isMulticourse', required: false, type: Boolean })
    @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    async findAll(
        @Query('state') state?: string,
        @Query('active') active?: string,
        @Query('isMulticourse') isMulticourse?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const filters: any = {};
        if (state) filters.state = state;
        if (active !== undefined) filters.active = active === 'true';
        if (isMulticourse !== undefined) filters.isMulticourse = isMulticourse === 'true';
        if (search) filters.search = search;
        if (page) filters.page = parseInt(page, 10);
        if (limit) filters.limit = parseInt(limit, 10);

        return this.coursesService.findAll(filters);
    }

    @Get(':id')
    @Roles('ADMIN', 'COORDINATOR', 'TEACHER', 'STUDENT')
    @ApiOperation({ summary: 'Get course by ID' })
    @ApiResponse({ status: 200, description: 'Course retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Course not found' })
    async findOne(@Param('id') id: string) {
        return this.coursesService.findOne(id);
    }

    @Post()
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Create new course' })
    @ApiResponse({ status: 201, description: 'Course created successfully' })
    @ApiResponse({ status: 409, description: 'Course name already exists' })
    async create(@Body() data: CreateCourseDto) {
        return this.coursesService.create(data);
    }

    @Patch(':id')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Update course' })
    @ApiResponse({ status: 200, description: 'Course updated successfully' })
    @ApiResponse({ status: 404, description: 'Course not found' })
    async update(@Param('id') id: string, @Body() data: UpdateCourseDto) {
        return this.coursesService.update(id, data);
    }

    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Delete course (soft delete)' })
    @ApiResponse({ status: 200, description: 'Course deleted successfully' })
    @ApiResponse({ status: 404, description: 'Course not found' })
    @ApiResponse({ status: 409, description: 'Cannot delete course with existing classes' })
    async delete(@Param('id') id: string) {
        return this.coursesService.delete(id);
    }

    // Course Modules
    @Post(':id/modules')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Add module to course' })
    @ApiResponse({ status: 201, description: 'Module added successfully' })
    async addModule(@Param('id') courseId: string, @Body() data: CreateCourseModuleDto) {
        return this.coursesService.addModule(courseId, data);
    }

    @Patch('modules/:moduleId')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Update course module' })
    @ApiResponse({ status: 200, description: 'Module updated successfully' })
    async updateModule(@Param('moduleId') moduleId: string, @Body() data: UpdateCourseModuleDto) {
        return this.coursesService.updateModule(moduleId, data);
    }

    @Delete('modules/:moduleId')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Delete course module' })
    @ApiResponse({ status: 200, description: 'Module deleted successfully' })
    async deleteModule(@Param('moduleId') moduleId: string) {
        return this.coursesService.deleteModule(moduleId);
    }

    // Teacher Assignment
    @Post(':id/teachers/:teacherId')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Assign teacher to course' })
    @ApiResponse({ status: 201, description: 'Teacher assigned successfully' })
    async assignTeacher(@Param('id') courseId: string, @Param('teacherId') teacherId: string) {
        return this.coursesService.assignTeacher(courseId, teacherId);
    }

    @Delete(':id/teachers/:teacherId')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Remove teacher from course' })
    @ApiResponse({ status: 200, description: 'Teacher removed successfully' })
    async removeTeacher(@Param('id') courseId: string, @Param('teacherId') teacherId: string) {
        return this.coursesService.removeTeacher(courseId, teacherId);
    }
}
