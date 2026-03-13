import {
  Controller, Post, Get, Patch, Delete, Param, Body,
  UseGuards, Request, Query, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery, ApiBody,
} from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, IsUUID, IsUrl, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReimbursementType, ExpenseStatus } from '@prisma/client';
import { ReimbursementService } from './reimbursement.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// ─── DTOs ───────────────────────────────────────────────────────────────────

export class GetPresignedUrlDto {
  @ApiProperty({ example: 'recibo_material_aula.jpg' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @IsNotEmpty()
  contentType: string;
}

export class CreateReimbursementDto {
  @ApiPropertyOptional({ description: 'ID do Período de Curso relacionado' })
  @IsOptional()
  @IsUUID()
  acaoId?: string;

  @ApiPropertyOptional({ description: 'ID do Employee vinculado' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiProperty({ enum: ReimbursementType, example: 'CLASSROOM_MATERIAL' })
  @IsEnum(ReimbursementType)
  type: ReimbursementType;

  @ApiProperty({ example: 45.50, description: 'Valor em R$ (máx 2 casas decimais)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'Material de limpeza para a sala de aula' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'URL do recibo no MinIO (opcional para testes sem MinIO)' })
  @IsString()
  @IsOptional()
  receiptUrl?: string;
}

export class RejectReimbursementDto {
  @ApiProperty({ example: 'Recibo ilegível ou fora do valor permitido' })
  @IsString()
  @IsNotEmpty()
  rejectionReason: string;
}

// ─── Controller ─────────────────────────────────────────────────────────────

@ApiTags('Portal de Reembolso')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reimbursements')
export class ReimbursementController {
  constructor(private readonly service: ReimbursementService) {}

  /**
   * Passo 1: Professor solicita URL assinada para upload direto ao MinIO
   * O servidor não recebe o arquivo — apenas gera a URL
   */
  @Post('presigned-url')
  @ApiOperation({
    summary: 'Gerar URL para upload de foto do recibo (MinIO Presigned URL)',
    description: 'Passo 1 do fluxo: obter URL → fazer upload direto → criar reembolso com a URL',
  })
  getPresignedUrl(@Body() dto: GetPresignedUrlDto, @Request() req: any) {
    return this.service.getPresignedUploadUrl(req.user.id, dto.filename, dto.contentType);
  }

  /**
   * Passo 2: Professor registra o reembolso com a URL da foto já enviada ao MinIO
   */
  @Post()
  @ApiOperation({ summary: 'Criar solicitação de reembolso' })
  create(@Body() dto: CreateReimbursementDto, @Request() req: any) {
    return this.service.create({
      requestedBy: req.user.id,
      ...dto,
    });
  }

  /**
   * ADMIN: Lista todos os reembolsos | Professor: lista só os seus
   */
  @Get()
  @ApiOperation({ summary: 'Listar reembolsos (admin: todos | professor: só os seus)' })
  @ApiQuery({ name: 'status', enum: ExpenseStatus, required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Request() req: any,
    @Query('status') status?: ExpenseStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    // Admin vê todos, professor vê só os seus
    const onlyMine =
      req.user.role === 'TEACHER' || req.user.role === 'STUDENT'
        ? req.user.id
        : undefined;

    return this.service.findAll(onlyMine, status, page, limit);
  }

  /**
   * Detalhe de um reembolso
   */
  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um reembolso' })
  @ApiParam({ name: 'id', description: 'ID do reembolso' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  /**
   * ADMIN: Aprova reembolso
   */
  @Patch(':id/approve')
  @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
  @ApiOperation({ summary: 'Aprovar reembolso (apenas ADMIN/COORDINATOR/FINANCIAL)' })
  @ApiParam({ name: 'id', description: 'ID do reembolso' })
  approve(@Param('id') id: string, @Request() req: any) {
    return this.service.approve(id, req.user.id);
  }

  /**
   * ADMIN: Rejeita reembolso com motivo
   */
  @Patch(':id/reject')
  @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
  @ApiOperation({ summary: 'Rejeitar reembolso com motivo' })
  @ApiParam({ name: 'id', description: 'ID do reembolso' })
  @ApiBody({ type: RejectReimbursementDto })
  reject(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: RejectReimbursementDto,
  ) {
    return this.service.reject(id, req.user.id, dto.rejectionReason);
  }

  /**
   * Professor cancela próprio reembolso (só se ainda PENDING)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Cancelar próprio reembolso (apenas se PENDENTE)' })
  @ApiParam({ name: 'id', description: 'ID do reembolso' })
  cancel(@Param('id') id: string, @Request() req: any) {
    return this.service.cancel(id, req.user.id);
  }
}
