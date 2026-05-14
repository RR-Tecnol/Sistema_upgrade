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
    BadRequestException,
    Ip,
    Headers,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { ApproveEnrollmentDto, RejectEnrollmentDto, RequestCorrectionDto, EnrollmentStatus } from './dto/update-enrollment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { AuditLogService } from '../audit-log/audit-log.service';
import { Throttle } from '@nestjs/throttler';

@ApiTags('enrollments')
@Controller('enrollments')
export class EnrollmentsController {
    constructor(
        private readonly enrollmentsService: EnrollmentsService,
        private readonly auditLog: AuditLogService,
    ) { }

    @Post('public')
    @Public()
    @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 inscrições/min por IP — evita spam
    @ApiOperation({ summary: 'Criar nova inscrição (público)' })
    @ApiResponse({ status: 201, description: 'Inscrição criada com sucesso' })
    @ApiResponse({ status: 400, description: 'Dados inválidos ou turma sem vagas' })
    @ApiResponse({ status: 409, description: 'CPF já cadastrado nesta turma' })
    @ApiResponse({ status: 429, description: 'Muitas tentativas — aguarde 1 minuto' })
    async create(
        @Body() createEnrollmentDto: CreateEnrollmentDto,
        @Ip() ip: string,
        @Headers('user-agent') userAgent?: string,
    ) {
        return this.enrollmentsService.create(createEnrollmentDto, {
            ipAddress: ip || undefined,
            userAgent: userAgent || undefined,
        });
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

    /**
     * REQ-06 — Portal do Aluno
     * Retorna as matrículas do aluno autenticado com dados de turma, curso, cidade e carreta.
     * IMPORTANTE: deve ficar ANTES de @Get(':id') para não ser capturado como id='my'
     */
    @Get('my')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Matrículas do próprio aluno autenticado (portal do aluno REQ-06)' })
    async myEnrollments(@Request() req: any) {
        return this.enrollmentsService.findByUserId(req.user.id);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Buscar inscrição por ID (dono ou admin/coordinator)' })
    @ApiResponse({ status: 200, description: 'Detalhes da inscrição' })
    @ApiResponse({ status: 403, description: 'Sem permissão para ver esta inscrição' })
    @ApiResponse({ status: 404, description: 'Inscrição não encontrada' })
    async findOne(@Param('id') id: string, @Request() req: any) {
        return this.enrollmentsService.findOne(id, req.user.id, req.user.role);
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
        const result = await this.enrollmentsService.approve(id, req.user.id, dto.notes);
        this.auditLog.log({ userId: req.user.id, action: 'APPROVE_ENROLLMENT', tableName: 'enrollments', recordId: id });
        return result;
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
        const result = await this.enrollmentsService.reject(id, req.user.id, dto.rejectionReason);
        this.auditLog.log({ userId: req.user.id, action: 'REJECT_ENROLLMENT', tableName: 'enrollments', recordId: id, newData: { reason: dto.rejectionReason } });
        return result;
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
     * Endpoint genérico de mudança de status — usado por admin/inscricoes/page.tsx
     * PATCH /enrollments/:id/status { status: 'APPROVED' | 'REJECTED' | 'WAITLIST', rejectionReason? }
     * Roteia internamente para os métodos específicos (approve/reject/waitlist).
     */
    @Patch(':id/status')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COORDINATOR')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Atualizar status da inscrição (endpoint genérico)' })
    @ApiResponse({ status: 200, description: 'Status atualizado' })
    async updateStatus(
        @Param('id') id: string,
        @Body() dto: { status: string; rejectionReason?: string; notes?: string },
        @Request() req: any,
    ) {
        let result: any;
        switch (dto.status) {
            case 'ENROLLED':
                result = await this.enrollmentsService.confirmEnrollment(id, req.user.id);
                this.auditLog.log({ userId: req.user.id, action: 'CONFIRM_ENROLLMENT', tableName: 'enrollments', recordId: id });
                break;
            case 'APPROVED':
                result = await this.enrollmentsService.approve(id, req.user.id, dto.notes);
                this.auditLog.log({ userId: req.user.id, action: 'APPROVE_ENROLLMENT', tableName: 'enrollments', recordId: id });
                break;
            case 'REJECTED':
                result = await this.enrollmentsService.reject(id, req.user.id, dto.rejectionReason ?? '');
                this.auditLog.log({ userId: req.user.id, action: 'REJECT_ENROLLMENT', tableName: 'enrollments', recordId: id, newData: { reason: dto.rejectionReason } });
                break;
            case 'WAITLIST':
                result = await this.enrollmentsService.moveToWaitlist(id, req.user.id, dto.notes);
                break;
            case 'DOCUMENT_PENDING':
                result = await this.enrollmentsService.requestCorrection(id, dto.notes || '');
                break;
            case 'PENDING':
                result = await this.enrollmentsService.moveToPending(id, req.user.id, dto.notes);
                break;
            default:
                throw new BadRequestException(`Transição para status '${dto.status}' não suportada`);
        }
        return result;
    }

}
