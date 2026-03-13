import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { ApproveEnrollmentDto, RejectEnrollmentDto, RequestCorrectionDto, EnrollmentStatus } from './dto/update-enrollment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('enrollments')
@Controller('enrollments')
export class EnrollmentsController {
    constructor(private readonly enrollmentsService: EnrollmentsService) { }

    @Post('public')
    @Public()
    @ApiOperation({ summary: 'Criar nova inscrição (público)' })
    @ApiResponse({ status: 201, description: 'Inscrição criada com sucesso' })
    @ApiResponse({ status: 400, description: 'Dados inválidos ou turma sem vagas' })
    @ApiResponse({ status: 409, description: 'CPF já cadastrado nesta turma' })
    async create(@Body() createEnrollmentDto: CreateEnrollmentDto) {
        return this.enrollmentsService.create(createEnrollmentDto);
    }

    @Post('admin')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COORDINATOR')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Inscrever aluno existente em turma (admin)' })
    @ApiResponse({ status: 201, description: 'Inscrição criada' })
    async adminEnroll(@Body() body: { studentId: string; classId: string }) {
        return this.enrollmentsService.adminEnroll(body.studentId, body.classId);
    }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COORDINATOR')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Listar todas as inscrições (admin)' })
    @ApiQuery({ name: 'status', required: false, enum: EnrollmentStatus })
    @ApiQuery({ name: 'classId', required: false, type: String })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Lista de inscrições' })
    async findAll(
        @Query('status') status?: EnrollmentStatus,
        @Query('classId') classId?: string,
        @Query('search') search?: string,
    ) {
        return this.enrollmentsService.findAll({ status, classId, search });
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Buscar inscrição por ID' })
    @ApiResponse({ status: 200, description: 'Detalhes da inscrição' })
    @ApiResponse({ status: 404, description: 'Inscrição não encontrada' })
    async findOne(@Param('id') id: string) {
        return this.enrollmentsService.findOne(id);
    }

    @Patch(':id/approve')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COORDINATOR')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Aprovar inscrição' })
    @ApiResponse({ status: 200, description: 'Inscrição aprovada' })
    @ApiResponse({ status: 400, description: 'Status inválido para aprovação' })
    async approve(
        @Param('id') id: string,
        @Body() dto: ApproveEnrollmentDto,
        @Request() req: any,
    ) {
        return this.enrollmentsService.approve(id, req.user.id, dto.notes);
    }

    @Patch(':id/reject')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COORDINATOR')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Rejeitar inscrição' })
    @ApiResponse({ status: 200, description: 'Inscrição rejeitada' })
    @ApiResponse({ status: 400, description: 'Status inválido para rejeição' })
    async reject(
        @Param('id') id: string,
        @Body() dto: RejectEnrollmentDto,
        @Request() req: any,
    ) {
        return this.enrollmentsService.reject(id, req.user.id, dto.rejectionReason);
    }

    @Patch(':id/request-correction')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COORDINATOR')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Solicitar correção de documentos' })
    @ApiResponse({ status: 200, description: 'Solicitação enviada' })
    async requestCorrection(
        @Param('id') id: string,
        @Body() dto: RequestCorrectionDto,
    ) {
        return this.enrollmentsService.requestCorrection(id, dto.correctionDetails);
    }

    @Patch(':id/waitlist')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COORDINATOR')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Mover inscrição para lista de espera' })
    @ApiResponse({ status: 200, description: 'Movido para lista de espera' })
    async moveToWaitlist(
        @Param('id') id: string,
        @Body() dto: { reason?: string },
        @Request() req: any,
    ) {
        return this.enrollmentsService.moveToWaitlist(id, req.user.id, dto.reason);
    }

    @Get('class/:classId/waitlist')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COORDINATOR')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Listar lista de espera de uma turma' })
    @ApiResponse({ status: 200, description: 'Lista de espera' })
    async getWaitlist(@Param('classId') classId: string) {
        return this.enrollmentsService.getWaitlist(classId);
    }

    /**
     * REQ-06 — Portal do Aluno
     * Retorna as matrículas do aluno autenticado com dados de turma, curso, cidade e carreta.
     */
    @Get('my')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Matrículas do próprio aluno autenticado (portal do aluno REQ-06)' })
    async myEnrollments(@Request() req: any) {
        return this.enrollmentsService.findByUserId(req.user.sub);
    }
}
