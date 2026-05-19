import {
    Controller, Get, Post, Put, Patch, Delete,
    Body, Param, Query, UseGuards, HttpCode, HttpStatus, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ContasPagarService } from './contas-pagar.service';
import { ContasPagarComprovanteService } from './comprovante.service';
import { CreateContaPagarDto } from './dto/create-conta-pagar.dto';

@ApiTags('Contas a Pagar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
@Controller('contas-pagar')
export class ContasPagarController {
    constructor(
        private readonly service: ContasPagarService,
        private readonly comprovanteService: ContasPagarComprovanteService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Criar nova conta a pagar' })
    create(@Body() dto: CreateContaPagarDto) {
        return this.service.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar contas a pagar com filtros (includeDeleted=true para excluídas)' })
    findAll(
        @Query('tipo_conta') tipo_conta?: string,
        @Query('status') status?: string,
        @Query('cidade') cidade?: string,
        @Query('data_inicio') data_inicio?: string,
        @Query('data_fim') data_fim?: string,
        @Query('search') search?: string,
        @Query('includeDeleted') includeDeleted?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.service.findAll({
            tipo_conta, status, cidade, data_inicio, data_fim, search,
            includeDeleted: includeDeleted === 'true',
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar uma conta a pagar' })
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Atualizar conta a pagar' })
    update(@Param('id') id: string, @Body() dto: Partial<CreateContaPagarDto> & { data_pagamento?: string; status?: any }) {
        return this.service.update(id, dto);
    }

    @Patch(':id/pagar')
    @ApiOperation({ summary: 'Marcar conta como paga' })
    marcarComoPaga(@Param('id') id: string, @Request() req: any) {
        return this.service.marcarComoPaga(id, req?.user?.id);
    }

    // PASSO 3.9: restaurar conta excluída (soft delete reversal)
    @Patch(':id/restore')
    @ApiOperation({ summary: 'Restaurar conta excluída (PASSO 3.9)' })
    restore(@Param('id') id: string) {
        return this.service.restore(id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Excluir conta a pagar' })
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }

    // ── COMPROVANTES (anexos) ────────────────────────────────────────────────
    // Fluxo presigned URL (mesmo padrão do reimbursement):
    //   1) cliente chama POST /:id/comprovante/presigned-url → recebe uploadUrl + fileUrl
    //   2) cliente faz PUT no uploadUrl com o binário direto pro MinIO
    //   3) cliente chama PATCH /:id/comprovante com { comprovante_url: fileUrl } para persistir

    @Post(':id/comprovante/presigned-url')
    @ApiOperation({ summary: 'Gerar URL temporária para upload de comprovante (MinIO presigned PUT)' })
    getComprovantePresignedUrl(
        @Param('id') id: string,
        @Body() dto: { filename: string; contentType: string },
        @Request() req: any,
    ) {
        return this.comprovanteService.getPresignedUploadUrl(req?.user?.id ?? 'system', id, dto.filename, dto.contentType);
    }

    @Patch(':id/comprovante')
    @ApiOperation({ summary: 'Anexar comprovante (após upload no MinIO via presigned URL)' })
    setComprovante(@Param('id') id: string, @Body() dto: { comprovante_url: string }) {
        return this.comprovanteService.setComprovanteUrl(id, dto.comprovante_url);
    }

    @Delete(':id/comprovante')
    @ApiOperation({ summary: 'Remover vínculo do comprovante (não apaga o arquivo no MinIO)' })
    removeComprovante(@Param('id') id: string) {
        return this.comprovanteService.removeComprovante(id);
    }

    @Get(':id/comprovante-view-url')
    @ApiOperation({ summary: 'URL GET assinada para visualizar o comprovante (60min)' })
    viewComprovante(@Param('id') id: string) {
        return this.comprovanteService.getPresignedViewUrl(id);
    }
}
