import { BadRequestException, Controller, Get, Post, Body, Param, Res, UseGuards, Request, Patch, Delete, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsArray, IsBoolean, IsObject } from 'class-validator';
import { Response } from 'express';
import path from 'node:path';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CertificateService } from './certificate.service';
import { PdfService } from '../reports/pdf.service';
import { CertificateTemplateService } from './certificate-template.service';
import { CertificateMetricsService } from '../reports/certificate-metrics.service';
import { CertificateOgImageService } from '../reports/certificate-og-image.service';
import { CertificateTemplateScope, CertificateTemplateType } from '@prisma/client';
import { certificateBulkSyncBodySchema } from './certificate-bulk-sync.schema';

class IssueCertDto {
    @IsString()
    studentId!: string;

    @IsString()
    classId!: string;
}

class PreviewCertificatePdfDto {
    @IsString()
    studentId!: string;

    @IsString()
    classId!: string;

    /** Se enviado, gera com esta versão do modelo (qualquer estado, p.ex. rascunho para sandbox). */
    @IsOptional()
    @IsString()
    templateVersionId?: string;

    @IsOptional()
    @IsString()
    pdfPathOverride?: string;

    @IsOptional()
    @IsBoolean()
    /** Desenha contornos vermelhos sobre as áreas de texto/QR (só PDF_BASE). */
    debug?: boolean;

    @IsOptional()
    @IsObject()
    /** Sobrescreve/mescla coordenadas do JSONB da versão (ajuste fino sem gravar). */
    coordinateOverrides?: Record<string, number>;

    @IsOptional()
    @IsBoolean()
    isVisualEditor?: boolean;

    @IsOptional()
    @IsObject()
    /** Sobrescreve textos/flags do PDF_BASE em preview (sem persistir no banco). */
    pdfTextOverrides?: Record<string, string | boolean>;

    /** Curso do editor (nome/carga/branding) para alinhar pré-visualização ao modelo — não altera a matrícula de teste. */
    @IsOptional()
    @IsString()
    previewCourseId?: string;
}

class UpsertTemplateDto {
    @IsEnum(CertificateTemplateScope)
    scope!: CertificateTemplateScope;

    @IsOptional()
    @IsString()
    courseId?: string;

    @IsOptional()
    @IsString()
    state?: string;

    @IsString()
    title!: string;

    @IsEnum(CertificateTemplateType)
    templateType!: CertificateTemplateType;

    @IsOptional()
    @IsString()
    htmlContent?: string;

    @IsOptional()
    @IsString()
    cssContent?: string;

    @IsOptional()
    @IsString()
    pdfPath?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsArray()
    placeholders?: string[];

    @IsOptional()
    @IsBoolean()
    autoPublish?: boolean;

    /** Manter a mesma chave ao editar modelos `PUBLIC_FILE` (import) */
    @IsOptional()
    @IsString()
    keyOverride?: string;

    @IsOptional()
    @IsObject()
    pdfTextOverrides?: Record<string, string | boolean>;

    /** Posições de overlay em pt (1/72"); ver `CertificateCoordinateOverrides` no PdfService */
    @IsOptional()
    @IsObject()
    coordinateOverrides?: Record<string, number>;
}

class DuplicateTemplateVersionDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsBoolean()
    autoPublish?: boolean;
}

class DuplicateTemplateDto {
    @IsOptional()
    @IsString()
    title?: string;
}

@ApiTags('Certificados')
@Controller('certificates')
export class CertificateController {
    constructor(
        private readonly svc: CertificateService,
        private readonly pdfSvc: PdfService,
        private readonly templateSvc: CertificateTemplateService,
        private readonly certificateMetrics: CertificateMetricsService,
        private readonly certificateOgImage: CertificateOgImageService,
    ) {}

    // ── ADMIN / TEACHER ──────────────────────────────

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COORDINATOR', 'TEACHER')
    @Get()
    @ApiOperation({ summary: 'Lista todos os certificados emitidos' })
    findAll() { return this.svc.findAll(); }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COORDINATOR', 'TEACHER')
    @Get('eligible')
    @ApiOperation({ summary: 'Alunos elegiveis para certificacao (freq. >=75%)' })
    findEligible() { return this.svc.findEligible(); }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COORDINATOR', 'TEACHER')
    @Post()
    @ApiOperation({ summary: 'Emite certificado (REQ-06)' })
    issue(@Body() dto: IssueCertDto, @Request() req: any) {
        return this.svc.issueCertificate(dto.studentId, dto.classId, req.user.id);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Post('admin/backfill-certificate-template-versions')
    @ApiOperation({ summary: 'Preenche templateVersionId em certificados legados (curso+UF do modelo publicado)' })
    backfillCertificateTemplateVersions() {
        return this.svc.backfillMissingTemplateVersionIds();
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Post('admin/seed-master-templates')
    @ApiOperation({
        summary: 'Cria/actualiza os Moldes Mestres MA e PI (scope STATE) com coordenadas e textos default. Usa as artes limpas de public/certificados/.',
    })
    seedMasterTemplates(@Request() req: any) {
        return this.templateSvc.seedMasterTemplates(req.user);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Post('admin/bulk-sync')
    @ApiOperation({
        summary: 'Sincroniza múltiplos certificados com o modelo publicado (ids ou classId) — resultados pormenorizados',
    })
    bulkSyncCertificateTemplates(@Body() body: unknown) {
        const p = certificateBulkSyncBodySchema.safeParse(body);
        if (!p.success) {
            throw new BadRequestException(
                p.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') || 'Body inválido',
            );
        }
        return this.svc.bulkSyncCertificateTemplates(p.data);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get('admin/stats')
    @ApiOperation({ summary: 'Estatísticas do motor de certificados (cache, tempos, fila Puppeteer) — saúde do serviço' })
    getCertificateEngineStats() {
        return this.certificateMetrics.getSnapshot();
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get('admin/emission-breakdown')
    @ApiOperation({ summary: 'Volume de certificados ativos por curso e por UF (telemetria admin)' })
    getEmissionBreakdown() {
        return this.svc.getAdminEmissionBreakdown();
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COORDINATOR', 'TEACHER')
    @Post('admin/preview-certificate-pdf')
    @ApiOperation({
        summary: 'Pré-visualiza o PDF com dados reais aluno/turma/curso **sem** emitir certificado (teste de modelo)',
    })
    async previewCertificatePdf(@Body() dto: PreviewCertificatePdfDto, @Res() res: Response) {
        const pdf = await this.pdfSvc.generateCertificatePreviewPdf(dto.studentId, dto.classId, {
            templateVersionId: dto.templateVersionId,
            pdfPathOverride: dto.pdfPathOverride,
            previewCourseId: dto.previewCourseId,
            debug: dto.debug === true,
            isVisualEditor: dto.isVisualEditor === true,
            coordinateOverrides: dto.coordinateOverrides,
            pdfTextOverrides: dto.pdfTextOverrides,
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="certificado-previsualizacao.pdf"');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        return res.send(pdf);
    }

    // ── ALUNO: proprios certificados ─────────────────

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get('my')
    @ApiOperation({ summary: 'Meus certificados (portal do aluno REQ-06)' })
    myCertificates(@Request() req: any) {
        return this.svc.findMyCertificates(req.user.id);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Patch(':id/sync-template')
    @ApiOperation({ summary: 'Alinha o certificado à versão de modelo publicada mais recente (re-emissão / correção de design)' })
    @ApiParam({ name: 'id', description: 'ID do registo de certificado' })
    syncCertificateTemplate(@Param('id') id: string) {
        return this.svc.syncCertificateTemplateToLatest(id);
    }

    // ── PUBLICO — ORDEM IMPORTA (Livro §2): literais ANTES de :id conflitante ──

    @Get('download/:code')
    @ApiOperation({ summary: 'Download PDF do certificado (publico — via QR Code)' })
    @ApiParam({ name: 'code', description: 'Codigo de verificacao UPG-...' })
    async downloadCertificate(
        @Param('code') code: string,
        @Res() res: Response,
    ) {
        const pdf = await this.pdfSvc.generateCertificatePdf(code);
        const filename = `certificado-${code}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        return res.send(pdf);
    }

    @Get('verify/:code/image')
    @ApiOperation({ summary: 'PNG 1200×630 para Open Graph (preview social) — com cache agressivo' })
    @ApiParam({ name: 'code', description: 'Codigo UPG-...' })
    async verifyOgImage(@Param('code') code: string, @Res() res: Response) {
        const buf = await this.certificateOgImage.getPngForVerificationCode(code);
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800');
        return res.send(buf);
    }

    @Get('verify/:code')
    @ApiOperation({
        summary: 'Verificação pública (dados mínimos + ogShare; sem matrícula/CPF/turma)',
    })
    @ApiParam({ name: 'code', description: 'Codigo UPG-...' })
    verify(@Param('code') code: string) {
        return this.svc.verify(code);
    }

    @Get('template/model')
    @ApiOperation({ summary: 'Baixa o template oficial atual do certificado' })
    async downloadOfficialTemplate(@Res() res: Response) {
        const templatePath = await this.pdfSvc.getOfficialCertificateTemplatePath();
        const filename = path.basename(templatePath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.sendFile(templatePath);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COORDINATOR')
    @Get('templates')
    @ApiOperation({ summary: 'Lista templates de certificado (com versões)' })
    listTemplates() {
        return this.templateSvc.listTemplates();
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get('admin/available-bases')
    @ApiOperation({ summary: 'Lista PDFs e Imagens disponíveis na pasta public/certificados para novos modelos PDF_BASE' })
    listAvailableBases() {
        return this.templateSvc.listAvailableBases();
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COORDINATOR')
    @Post('templates/upload-base')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            limits: { fileSize: 15 * 1024 * 1024 },
            fileFilter: (_req, file, cb) => {
                const ok = /\.(pdf|png|jpe?g)$/i.test(file.originalname || '');
                cb(ok ? null : new BadRequestException('Formato inválido. Envie PDF, PNG ou JPG/JPEG.'), ok);
            },
        }),
    )
    @ApiOperation({ summary: 'Upload de base artística (PDF/Imagem) para novos modelos por UF' })
    uploadTemplateBase(@UploadedFile() file?: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('Arquivo não enviado. Use o campo multipart `file`.');
        }
        return this.templateSvc.uploadBaseTemplateAsset({ originalname: file.originalname, buffer: file.buffer });
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COORDINATOR')
    @Get('templates/versions/:versionId/preview-pdf')
    @ApiOperation({ summary: 'Pré-visualização do PDF de uma versão (ficheiro em public/)' })
    async previewTemplatePdf(
        @Param('versionId') versionId: string,
        @Res() res: Response,
    ) {
        const abs = await this.templateSvc.getVersionPdfAbsolutePathForPreview(versionId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
        return res.sendFile(abs);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COORDINATOR')
    @Get('templates/:id')
    @ApiOperation({ summary: 'Detalha um template e suas versões' })
    getTemplate(@Param('id') id: string) {
        return this.templateSvc.getTemplate(id);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Delete('templates/:id')
    @ApiOperation({ summary: 'Apaga um template de certificado e todas as suas versões' })
    deleteTemplate(@Param('id') id: string) {
        return this.templateSvc.deleteTemplate(id);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COORDINATOR')
    @Post('templates')
    @ApiOperation({ summary: 'Cria nova versão de template (draft ou publicado)' })
    upsertTemplate(@Body() dto: UpsertTemplateDto, @Request() req: any) {
        return this.templateSvc.upsertTemplateVersion(dto, req.user);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COORDINATOR')
    @Post('templates/import-public')
    @ApiOperation({ summary: 'Legado desativado: importação em massa de modelos a partir de public/' })
    importFromPublic(@Request() req: any) {
        return this.templateSvc.importFromPublicPdfs(req.user);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Post('templates/reset-and-reimport')
    @ApiOperation({ summary: 'Legado desativado: reset + reimportação em massa de public/' })
    resetAndReimport(@Request() req: any) {
        return this.templateSvc.resetAllTemplatesAndImportFromPublic(req.user);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Post('admin/ensure-demo-certificate')
    @ApiOperation({ summary: 'Cria certificado de teste se ainda não existir nenhum (verificação/baixar PDF)' })
    ensureDemoCertificate(@Request() req: any) {
        return this.svc.ensureDemoVerificationCertificate(req.user.id);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Post('admin/purge-issued-certificates')
    @ApiOperation({ summary: 'Apaga todos os certificados emitidos (e feedbacks vinculados) — homologação' })
    purgeIssuedCertificates() {
        return this.svc.deleteAllIssuedCertificates();
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COORDINATOR')
    @Post('templates/versions/:versionId/submit')
    @ApiOperation({ summary: 'Envia versão para aprovação' })
    submitTemplateVersion(@Param('versionId') versionId: string) {
        return this.templateSvc.submitForApproval(versionId);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COORDINATOR')
    @Post('templates/versions/:versionId/approve')
    @ApiOperation({ summary: 'Aprova versão (e opcionalmente publica)' })
    approveTemplateVersion(
        @Param('versionId') versionId: string,
        @Body() body: { publish?: boolean },
        @Request() req: any,
    ) {
        return this.templateSvc.approveVersion(versionId, req.user.id, !!body?.publish);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Post('templates/versions/:versionId/publish')
    @ApiOperation({ summary: 'Publica versão específica (admin)' })
    publishTemplateVersion(@Param('versionId') versionId: string, @Request() req: any) {
        return this.templateSvc.publishVersion(versionId, req.user.id);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COORDINATOR')
    @Post('templates/versions/:versionId/duplicate')
    @ApiOperation({ summary: 'Duplica versão de modelo (copia arte + textos + coordenadas)' })
    duplicateTemplateVersion(
        @Param('versionId') versionId: string,
        @Body() body: DuplicateTemplateVersionDto,
        @Request() req: any,
    ) {
        return this.templateSvc.duplicateVersion(versionId, req.user, {
            title: body.title,
            autoPublish: body.autoPublish === true,
        });
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Post('admin/templates/:id/duplicate')
    @ApiOperation({ summary: 'Duplica template atual para novo template (copia pdfPath + textos + coordenadas)' })
    duplicateTemplate(
        @Param('id') templateId: string,
        @Body() body: DuplicateTemplateDto,
        @Request() req: any,
    ) {
        return this.templateSvc.duplicateTemplateFromCurrent(templateId, req.user, body.title);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Post('templates/:templateId/rollback/:version')
    @ApiOperation({ summary: 'Rollback para versão anterior publicada (admin)' })
    rollbackTemplate(
        @Param('templateId') templateId: string,
        @Param('version') version: string,
        @Request() req: any,
    ) {
        return this.templateSvc.rollback(templateId, Number(version), req.user.id);
    }
}
