import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { AdminStudentsService } from './admin-students.service';
import { MinioService } from './minio.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateStudentDto, UpdateStudentDto } from './dto';

@ApiTags('admin/students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.COORDINATOR)
@Controller('admin/students')
export class AdminStudentsController {
    constructor(
        private readonly adminStudentsService: AdminStudentsService,
        private readonly minioService: MinioService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Get all students with filters' })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'state', required: false, description: 'Filtro por UF (dinâmico, ex.: MA, PI, AC)' })
    @ApiQuery({ name: 'active', required: false, type: Boolean })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'List of students' })
    async findAll(
        @Query('search') search?: string,
        @Query('state') state?: string,
        @Query('active') active?: boolean,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.adminStudentsService.findAll({
            search,
            state,
            active,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 10,
        });
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get student statistics' })
    @ApiResponse({ status: 200, description: 'Student statistics' })
    async getStats() {
        return this.adminStudentsService.getStats();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get student by ID' })
    @ApiResponse({ status: 200, description: 'Student details' })
    @ApiResponse({ status: 404, description: 'Student not found' })
    async findOne(@Param('id') id: string) {
        return this.adminStudentsService.findOne(id);
    }

    @Post()
    @ApiOperation({ summary: 'Create new student' })
    @ApiResponse({ status: 201, description: 'Student created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid data' })
    async create(@Body() createStudentDto: CreateStudentDto) {
        return this.adminStudentsService.create(createStudentDto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update student' })
    @ApiResponse({ status: 200, description: 'Student updated successfully' })
    @ApiResponse({ status: 404, description: 'Student not found' })
    async update(
        @Param('id') id: string,
        @Body() updateStudentDto: UpdateStudentDto,
    ) {
        return this.adminStudentsService.update(id, updateStudentDto);
    }

    @Post(':id/notify-pending-documents')
    @ApiOperation({ summary: 'Reenviar notificação in-app de documentação pendente ao aluno' })
    @ApiResponse({ status: 200, description: 'Lembrete enviado ou documentação já completa' })
    async notifyPendingDocuments(@Param('id') id: string) {
        return this.adminStudentsService.notifyPendingDocuments(id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete student' })
    @ApiResponse({ status: 200, description: 'Student deleted successfully' })
    @ApiResponse({ status: 404, description: 'Student not found' })
    async remove(@Param('id') id: string) {
        return this.adminStudentsService.remove(id);
    }

    @Patch(':id/photo')
    @ApiOperation({ summary: 'Upload student profile photo' })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({ status: 200, description: 'Photo uploaded successfully' })
    @UseInterceptors(FileInterceptor('photo'))
    async uploadPhoto(
        @Param('id') id: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) throw new BadRequestException('No file provided');
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
            throw new BadRequestException('Only JPEG, PNG or WebP images are allowed');
        }
        if (file.size > 5 * 1024 * 1024) {
            throw new BadRequestException('File size must be under 5MB');
        }
        const ext = file.originalname.split('.').pop();
        const objectName = `student-${id}-${Date.now()}.${ext}`;
        const url = await this.minioService.uploadFile(objectName, file.buffer, file.mimetype);
        await this.adminStudentsService.updatePhoto(id, url);
        return { photoUrl: url };
    }
}
