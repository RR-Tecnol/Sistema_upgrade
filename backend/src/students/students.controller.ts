import {
    Controller,
    Get,
    Patch,
    Body,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StudentGuard } from '../auth/guards/student.guard';

@ApiTags('students')
@Controller('students')
@UseGuards(JwtAuthGuard, StudentGuard)
@ApiBearerAuth()
export class StudentsController {
    constructor(private readonly studentsService: StudentsService) { }

    @Get('me')
    @ApiOperation({ summary: 'Get current student profile' })
    @ApiResponse({ status: 200, description: 'Student profile' })
    @ApiResponse({ status: 404, description: 'Student not found' })
    async getProfile(@Request() req: any) {
        return this.studentsService.getProfile(req.user.id);
    }

    @Patch('me/password')
    @ApiOperation({ summary: 'Update student password' })
    @ApiResponse({ status: 200, description: 'Password updated successfully' })
    @ApiResponse({ status: 400, description: 'Current password is incorrect' })
    async updatePassword(
        @Request() req: any,
        @Body() body: { currentPassword: string; newPassword: string },
    ) {
        return this.studentsService.updatePassword(
            req.user.id,
            body.currentPassword,
            body.newPassword,
        );
    }

    @Get('me/enrollments')
    @ApiOperation({ summary: 'Get student enrollments' })
    @ApiResponse({ status: 200, description: 'List of enrollments' })
    async getEnrollments(@Request() req: any) {
        return this.studentsService.getEnrollments(req.user.id);
    }

    @Get('me/classes')
    @ApiOperation({ summary: 'Get student active classes' })
    @ApiResponse({ status: 200, description: 'List of active classes' })
    async getClasses(@Request() req: any) {
        return this.studentsService.getClasses(req.user.id);
    }

    @Get('me/attendance')
    @ApiOperation({ summary: 'Get student attendance records' })
    @ApiQuery({ name: 'classId', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Attendance records' })
    async getAttendance(
        @Request() req: any,
        @Query('classId') classId?: string,
    ) {
        return this.studentsService.getAttendance(req.user.id, classId);
    }

    @Get('me/certificates')
    @ApiOperation({ summary: 'Get student certificates' })
    @ApiResponse({ status: 200, description: 'List of certificates' })
    async getCertificates(@Request() req: any) {
        return this.studentsService.getCertificates(req.user.id);
    }
}
