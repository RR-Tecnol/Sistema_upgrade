import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CertificateTemplateScope, CertificateTemplateStatus, CertificateTemplateType, Prisma } from '@prisma/client';
import { promises as fs } from 'node:fs';
import path from 'node:path';

type UpsertTemplateInput = {
    scope: CertificateTemplateScope;
    courseId?: string;
    state?: string;
    /** Uma chave única (ex.: import: um PDF = um modelo). Se ausente, usa buildTemplateKey(scope, course, state). */
    keyOverride?: string;
    title: string;
    templateType: CertificateTemplateType;
    htmlContent?: string;
    cssContent?: string;
    pdfPath?: string;
    notes?: string;
    placeholders?: string[];
    autoPublish?: boolean;
    /** Textos / flags sobrepostos no PDF (só PDF_BASE) */
    pdfTextOverrides?: Record<string, string | boolean> | null;
    /** Posições de overlay em pt; ver tipo `CertificateCoordinateOverrides` no PdfService */
    coordinateOverrides?: Record<string, number> | null;
};

@Injectable()
export class CertificateTemplateService {
    constructor(private readonly prisma: PrismaService) {}

    async uploadBaseTemplateAsset(file: { originalname: string; buffer: Buffer }) {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const allowedExts = new Set(['.pdf', '.png', '.jpg', '.jpeg']);
        if (!allowedExts.has(ext)) {
            throw new BadRequestException('Formato inválido. Envie PDF, PNG ou JPG/JPEG.');
        }
        const safeBaseName = path
            .basename(file.originalname, ext)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9._-]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 80) || 'template';
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${safeBaseName}-${stamp}${ext}`;
        const publicDir = path.resolve(process.cwd(), '../public');
        const targetDir = path.join(publicDir, 'certificados', 'custom');
        await fs.mkdir(targetDir, { recursive: true });
        const absolutePath = path.join(targetDir, fileName);
        await fs.writeFile(absolutePath, file.buffer);
        return {
            name: path.relative(publicDir, absolutePath).replace(/\\/g, '/'),
            path: absolutePath,
        };
    }

    async listTemplates() {
        await this.repairOfficialStateMasterTemplates();

        return this.prisma.certificateTemplate.findMany({
            where: {
                isActive: true,
                NOT: { scope: CertificateTemplateScope.PUBLIC_FILE },
            },
            orderBy: [{ key: 'asc' }],
            include: {
                course: { select: { id: true, name: true } },
                currentVersion: {
                    select: {
                        id: true,
                        version: true,
                        title: true,
                        templateType: true,
                        status: true,
                        updatedAt: true,
                        publishedAt: true,
                        pdfTextOverrides: true,
                        coordinateOverrides: true,
                    },
                },
                versions: {
                    select: { id: true, version: true, title: true, status: true, publishedAt: true, updatedAt: true },
                    orderBy: { version: 'desc' },
                    take: 100,
                },
                _count: { select: { versions: true } },
            },
        });
    }

    async getTemplate(templateId: string) {
        const template = await this.prisma.certificateTemplate.findUnique({
            where: { id: templateId },
            include: {
                course: { select: { id: true, name: true } },
                currentVersion: true,
                versions: {
                    orderBy: { version: 'desc' },
                    include: {
                        createdBy: { select: { id: true, name: true, role: true } },
                        approvedBy: { select: { id: true, name: true, role: true } },
                    },
                },
            },
        });
        if (!template) throw new NotFoundException('Modelo não encontrado');
        return template;
    }

    async upsertTemplateVersion(input: UpsertTemplateInput, user: { id: string; role: string }) {
        if (input.scope === CertificateTemplateScope.PUBLIC_FILE) {
            throw new BadRequestException('Modelos legados PUBLIC_FILE foram desativados. Use STATE/COURSE/COURSE_STATE ou GLOBAL.');
        }
        const key = input.keyOverride ?? this.buildTemplateKey(input.scope, input.courseId, input.state);
        const scopeState = input.state?.trim().toUpperCase();
        const template = await this.prisma.certificateTemplate.upsert({
            where: { key },
            create: {
                key,
                scope: input.scope,
                state: scopeState,
                courseId: input.courseId ?? null,
                isActive: true,
            },
            update: {
                scope: input.scope,
                state: scopeState,
                courseId: input.courseId ?? null,
                isActive: true,
            },
        });

        const lastVersion = await this.prisma.certificateTemplateVersion.findFirst({
            where: { templateId: template.id },
            orderBy: { version: 'desc' },
        });
        const status =
            input.autoPublish && user.role === 'ADMIN'
                ? CertificateTemplateStatus.PUBLISHED
                : CertificateTemplateStatus.DRAFT;

        const version = await this.prisma.certificateTemplateVersion.create({
            data: {
                templateId: template.id,
                version: (lastVersion?.version ?? 0) + 1,
                title: input.title,
                templateType: input.templateType,
                htmlContent: input.htmlContent ?? null,
                cssContent: input.cssContent ?? null,
                pdfPath: input.pdfPath ?? null,
                pdfTextOverrides:
                    input.pdfTextOverrides === undefined
                        ? undefined
                        : input.pdfTextOverrides === null
                          ? Prisma.JsonNull
                          : (input.pdfTextOverrides as Prisma.InputJsonValue),
                coordinateOverrides:
                    input.coordinateOverrides === undefined
                        ? undefined
                        : input.coordinateOverrides === null
                          ? Prisma.JsonNull
                          : (input.coordinateOverrides as Prisma.InputJsonValue),
                notes: input.notes ?? null,
                placeholders: input.placeholders ?? [],
                status,
                createdById: user.id,
                publishedAt: status === CertificateTemplateStatus.PUBLISHED ? new Date() : null,
            },
        });

        if (status === CertificateTemplateStatus.PUBLISHED) {
            await this.promotePublishedVersion(version.id, user.id);
        }

        return version;
    }

    async submitForApproval(versionId: string) {
        return this.prisma.certificateTemplateVersion.update({
            where: { id: versionId },
            data: { status: CertificateTemplateStatus.PENDING_APPROVAL },
        });
    }

    async approveVersion(versionId: string, approverId: string, publish = false) {
        const status = publish ? CertificateTemplateStatus.PUBLISHED : CertificateTemplateStatus.APPROVED;
        const updated = await this.prisma.certificateTemplateVersion.update({
            where: { id: versionId },
            data: {
                status,
                approvedById: approverId,
                approvedAt: new Date(),
                publishedAt: publish ? new Date() : null,
            },
        });
        if (publish) {
            await this.promotePublishedVersion(versionId, approverId);
        }
        return updated;
    }

    async publishVersion(versionId: string, actorId: string) {
        await this.prisma.certificateTemplateVersion.update({
            where: { id: versionId },
            data: {
                status: CertificateTemplateStatus.PUBLISHED,
                approvedById: actorId,
                approvedAt: new Date(),
                publishedAt: new Date(),
            },
        });
        return this.promotePublishedVersion(versionId, actorId);
    }

    /**
     * Duplica uma versão existente (mesmo template), preservando arte e coordenadas.
     * Útil para acelerar criação de novos modelos por pequenas variações.
     */
    async duplicateVersion(
        versionId: string,
        user: { id: string; role: string },
        opts?: { title?: string; autoPublish?: boolean },
    ) {
        const src = await this.prisma.certificateTemplateVersion.findUnique({
            where: { id: versionId },
        });
        if (!src) throw new NotFoundException('Versão de origem não encontrada para duplicação');

        const lastVersion = await this.prisma.certificateTemplateVersion.findFirst({
            where: { templateId: src.templateId },
            orderBy: { version: 'desc' },
        });
        const status =
            opts?.autoPublish && user.role === 'ADMIN'
                ? CertificateTemplateStatus.PUBLISHED
                : CertificateTemplateStatus.DRAFT;
        const copyTitle =
            opts?.title?.trim() ||
            `${src.title} (cópia)`;

        const duplicated = await this.prisma.certificateTemplateVersion.create({
            data: {
                templateId: src.templateId,
                version: (lastVersion?.version ?? 0) + 1,
                title: copyTitle,
                templateType: src.templateType,
                htmlContent: src.htmlContent,
                cssContent: src.cssContent,
                pdfPath: src.pdfPath,
                placeholders:
                    src.placeholders === null
                        ? ([] as Prisma.InputJsonValue)
                        : (src.placeholders as Prisma.InputJsonValue),
                notes: src.notes,
                pdfTextOverrides:
                    src.pdfTextOverrides === null
                        ? Prisma.JsonNull
                        : src.pdfTextOverrides === undefined
                          ? undefined
                          : (src.pdfTextOverrides as Prisma.InputJsonValue),
                coordinateOverrides:
                    src.coordinateOverrides === null
                        ? Prisma.JsonNull
                        : src.coordinateOverrides === undefined
                          ? undefined
                          : (src.coordinateOverrides as Prisma.InputJsonValue),
                status,
                createdById: user.id,
                publishedAt: status === CertificateTemplateStatus.PUBLISHED ? new Date() : null,
            },
        });

        if (status === CertificateTemplateStatus.PUBLISHED) {
            await this.promotePublishedVersion(duplicated.id, user.id);
        }
        return duplicated;
    }

    /**
     * Lista bases artísticas disponíveis no editor.
     * Política atual:
     * - Oficiais fixas: MA e PI (fundo-limpo)
     * - Uploads do admin: `public/certificados/custom/**`
     * Não expõe bibliotecas legadas de `public/certificados/**`.
     */
    async listAvailableBases() {
        const publicDir = path.resolve(process.cwd(), '../public');
        const results: { name: string; path: string }[] = [];
        const seen = new Set<string>();

        const pushIfExists = async (fullPath: string) => {
            try {
                await fs.access(fullPath);
                const relPath = path.relative(publicDir, fullPath).replace(/\\/g, '/');
                if (!seen.has(relPath)) {
                    seen.add(relPath);
                    results.push({ name: relPath, path: fullPath });
                }
            } catch {
                // arquivo oficial ausente: ignora
            }
        };

        async function walk(dir: string) {
            try {
                const files = await fs.readdir(dir, { withFileTypes: true });
                for (const file of files) {
                    const fullPath = path.join(dir, file.name);
                    if (file.isDirectory()) {
                        await walk(fullPath);
                    } else if (file.isFile()) {
                        const lower = file.name.toLowerCase();
                        if (lower.endsWith('.pdf') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png')) {
                            const relPath = path.relative(publicDir, fullPath).replace(/\\/g, '/');
                            results.push({ name: relPath, path: fullPath });
                        }
                    }
                }
            } catch {
                // pasta inexistente — ignora silenciosamente
            }
        }

        // 1) Bases oficiais fixas do sistema (somente MA e PI).
        await pushIfExists(path.join(publicDir, 'certificados', 'maranhao', 'fundo-limpo.png'));
        await pushIfExists(path.join(publicDir, 'certificados', 'piaui', 'fundo-limpo.png'));
        // 2) Bases carregadas via upload do admin.
        await walk(path.join(publicDir, 'certificados', 'custom'));

        return results.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }

    /**
     * Duplica o template atual para um novo template (nova key), copiando os campos de formatação.
     */
    async duplicateTemplateFromCurrent(templateId: string, user: { id: string; role: string }, title?: string) {
        const source = await this.prisma.certificateTemplate.findUnique({
            where: { id: templateId },
            include: { currentVersion: true },
        });
        if (!source) throw new NotFoundException('Template não encontrado');
        if (!source.currentVersion) throw new BadRequestException('Template sem versão atual para duplicação');
        const src = source.currentVersion;
        const suffix = Date.now().toString(36).toUpperCase();
        const newKey = `${source.key}:COPY:${suffix}`;
        const newTemplate = await this.prisma.certificateTemplate.create({
            data: {
                key: newKey,
                scope: source.scope,
                courseId: source.courseId,
                state: source.state,
                isActive: true,
            },
        });
        const duplicated = await this.prisma.certificateTemplateVersion.create({
            data: {
                templateId: newTemplate.id,
                version: 1,
                title: (title?.trim() || src.title) + ' (Cópia)',
                templateType: src.templateType,
                htmlContent: src.htmlContent,
                cssContent: src.cssContent,
                pdfPath: src.pdfPath,
                placeholders:
                    src.placeholders === null
                        ? ([] as Prisma.InputJsonValue)
                        : (src.placeholders as Prisma.InputJsonValue),
                notes: src.notes,
                pdfTextOverrides:
                    src.pdfTextOverrides === null
                        ? Prisma.JsonNull
                        : src.pdfTextOverrides === undefined
                          ? undefined
                          : (src.pdfTextOverrides as Prisma.InputJsonValue),
                coordinateOverrides:
                    src.coordinateOverrides === null
                        ? Prisma.JsonNull
                        : src.coordinateOverrides === undefined
                          ? undefined
                          : (src.coordinateOverrides as Prisma.InputJsonValue),
                status: CertificateTemplateStatus.DRAFT,
                createdById: user.id,
            },
        });
        await this.prisma.certificateTemplate.update({
            where: { id: newTemplate.id },
            data: { currentVersionId: duplicated.id },
        });
        return { templateId: newTemplate.id, versionId: duplicated.id, title: duplicated.title };
    }

    async rollback(templateId: string, versionNumber: number, actorId: string) {
        const target = await this.prisma.certificateTemplateVersion.findFirst({
            where: { templateId, version: versionNumber },
        });
        if (!target) throw new NotFoundException('Versão não encontrada para rollback');
        await this.prisma.certificateTemplateVersion.update({
            where: { id: target.id },
            data: {
                status: CertificateTemplateStatus.PUBLISHED,
                approvedById: actorId,
                approvedAt: new Date(),
                publishedAt: new Date(),
            },
        });
        return this.promotePublishedVersion(target.id, actorId);
    }

    /** Legado desativado: importação em massa de public/ para modelos PUBLIC_FILE. */
    async importFromPublicPdfs(user: { id: string; role: string }) {
        if (user.role !== 'ADMIN') {
            throw new ForbiddenException('Apenas administradores podem gerir modelos');
        }
        return {
            imported: 0,
            skipped: 0,
            total: 0,
            disabled: true,
            message: 'Importação legada desativada. O sistema inicia com MA/PI e aceita apenas upload manual ou criação no editor.',
        };
    }

    /** Legado desativado: reset + reimport público em massa. */
    async resetAllTemplatesAndImportFromPublic(user: { id: string; role: string }) {
        if (user.role !== 'ADMIN') {
            throw new ForbiddenException('Apenas administradores podem reconstruir os modelos');
        }
        throw new BadRequestException(
            'Reset/reimport legado desativado. Use o botão de Moldes Mestres (MA/PI) e uploads manuais.',
        );
    }

    /**
     * Cria/actualiza os dois "Moldes Mestres" (MA e PI) com scope STATE.
     * Cada molde usa a arte limpa de public/certificados/ e as coordenadas default.
     * Qualquer emissão sem template específico para o curso vai cair aqui via cascata:
     *   COURSE_STATE → COURSE → STATE ← (molde mestre)
     */
    /**
     * Certificados emitidos congelam `templateVersionId`. Antes de apagar versões do modelo,
     * é obrigatório anular essa FK — caso contrário o Postgres bloqueia (`certificates_templateVersionId_fkey`).
     */
    private async detachCertificatesFromTemplate(templateId: string): Promise<void> {
        const versions = await this.prisma.certificateTemplateVersion.findMany({
            where: { templateId },
            select: { id: true },
        });
        const ids = versions.map(v => v.id);
        if (!ids.length) return;
        await this.prisma.certificate.updateMany({
            where: { templateVersionId: { in: ids } },
            data: { templateVersionId: null },
        });
    }

    /**
     * Moldes oficiais STATE:ANY:MA / PI: garante scope/UF/courseId e sobretudo `currentVersionId`
     * apontando para uma versão válida e publicada (fallback: versão mais recente).
     * Sem isto a UI mostra só a `key` (ex.: STATE:ANY:MA) porque `currentVersion` vem null —
     * típico após `onDelete: SetNull` ao remover/recriar versões.
     */
    private async repairOfficialStateMasterTemplates(): Promise<void> {
        const masters = [
            { key: 'STATE:ANY:MA', state: 'MA' },
            { key: 'STATE:ANY:PI', state: 'PI' },
        ] as const;

        for (const m of masters) {
            const tpl = await this.prisma.certificateTemplate.findUnique({
                where: { key: m.key },
                include: {
                    versions: { orderBy: { version: 'desc' } },
                },
            });
            if (!tpl?.versions?.length) continue;

            let currentValid = false;
            if (tpl.currentVersionId) {
                const cv = await this.prisma.certificateTemplateVersion.findFirst({
                    where: { id: tpl.currentVersionId, templateId: tpl.id },
                    select: { id: true },
                });
                currentValid = !!cv;
            }

            const published = tpl.versions.find(v => v.status === CertificateTemplateStatus.PUBLISHED);
            const targetVersion = published ?? tpl.versions[0];
            if (!targetVersion) continue;

            const fixPointer = !currentValid || tpl.currentVersionId !== targetVersion.id;
            const fixMeta =
                tpl.courseId != null ||
                tpl.scope !== CertificateTemplateScope.STATE ||
                String(tpl.state ?? '').toUpperCase() !== m.state;

            if (fixPointer || fixMeta) {
                await this.prisma.certificateTemplate.update({
                    where: { id: tpl.id },
                    data: {
                        courseId: null,
                        scope: CertificateTemplateScope.STATE,
                        state: m.state,
                        currentVersionId: targetVersion.id,
                    },
                });
            }
        }
    }

    async seedMasterTemplates(user: { id: string; role: string }) {
        if (user.role !== 'ADMIN') throw new ForbiddenException('Apenas administradores podem gerir moldes mestres');

        const publicDir = path.resolve(process.cwd(), '../public');
        const defaultCoordinates = {
            nameX: 420, nameY: 255, nameSize: 24,
            detailsY: 212, detailsSize: 11,
            qrX: 740, qrY: 28, qrSize: 64,
            paragraphX: 95, paragraphY: 220, paragraphW: 700, paragraphH: 165,
            bodyTextSize: 17,
            line1Y: 328, line2Y: 298, line3Y: 268,
            p2CourseBoxX: 255, p2CourseBoxY: 575, p2CourseBoxW: 350, p2CourseBoxH: 44, p2CourseTextSize: 15,
        };
        const defaultTextOverrides = {
            drawHeaderNameAndDetails: false,
            useBodyWhiteMask: false,
            usePage2TitleWhiteMask: false,
            signatureMode: 'AUTO',
        };

        const masters = [
            {
                state: 'MA',
                title: 'Molde Mestre — Maranhão',
                imagePath: path.join(publicDir, 'certificados', 'maranhao', 'fundo-limpo.png'),
            },
            {
                state: 'PI',
                title: 'Molde Mestre — Piauí',
                imagePath: path.join(publicDir, 'certificados', 'piaui', 'fundo-limpo.png'),
            },
        ];

        const results: { state: string; status: string; versionId?: string }[] = [];
        
        // Apaga moldes antigos antes de recriar
        for (const m of masters) {
            const key = `STATE:ANY:${m.state}`;
            const existing = await this.prisma.certificateTemplate.findUnique({ where: { key } });
            if (existing) {
                await this.detachCertificatesFromTemplate(existing.id);
                await this.prisma.certificateTemplate.update({ where: { id: existing.id }, data: { currentVersionId: null } });
                await this.prisma.certificateTemplateVersion.deleteMany({ where: { templateId: existing.id } });
                await this.prisma.certificateTemplate.delete({ where: { id: existing.id } });
            }
        }

        for (const m of masters) {
            let imageExists = false;
            try { await fs.access(m.imagePath); imageExists = true; } catch { /* nao encontrado */ }

            const version = await this.upsertTemplateVersion(
                {
                    scope: CertificateTemplateScope.STATE,
                    state: m.state,
                    title: m.title,
                    templateType: CertificateTemplateType.PDF_BASE,
                    pdfPath: imageExists ? m.imagePath : undefined,
                    coordinateOverrides: defaultCoordinates,
                    pdfTextOverrides: defaultTextOverrides,
                    placeholders: ['ALUNO_NOME', 'CURSO_NOME', 'CARGA_HORARIA', 'CIDADE', 'ESTADO', 'DATA_EMISSAO', 'CODIGO_VERIFICACAO', 'QR_CODE_DATA_URL', 'TURMA', 'EMISSOR'],
                    notes: `Molde mestre para o estado ${m.state}. Aplica-se automaticamente a todos os cursos da UF sem template específico.`,
                    autoPublish: true,
                },
                user,
            );
            results.push({ state: m.state, status: imageExists ? 'ok' : 'ok_sem_imagem', versionId: version.id });
        }

        await this.repairOfficialStateMasterTemplates();
        return { seeded: results.length, results };
    }

    async deleteAllTemplates() {
        await this.prisma.certificate.updateMany({ data: { templateVersionId: null } });
        await this.prisma.certificateTemplate.updateMany({ data: { currentVersionId: null } });
        await this.prisma.certificateTemplateVersion.deleteMany({});
        await this.prisma.certificateTemplate.deleteMany({});
    }

    async deleteTemplate(id: string) {
        await this.detachCertificatesFromTemplate(id);
        await this.prisma.certificateTemplate.update({ where: { id }, data: { currentVersionId: null } });
        await this.prisma.certificateTemplateVersion.deleteMany({ where: { templateId: id } });
        await this.prisma.certificateTemplate.delete({ where: { id } });
        return { success: true };
    }

    /**
     * Escolhe a versão publicada para preencher o certificado: ordem de especificidade, depois `updatedAt` mais recente.
     */
    async resolvePublishedTemplate(courseId?: string, state?: string) {
        const normalizedState = state?.trim().toUpperCase() ?? null;
        const cId = courseId ?? null;

        const candidates: Array<{
            scope: CertificateTemplateScope;
            courseId: string | null;
            state: string | null;
        }> = [
            { scope: CertificateTemplateScope.COURSE_STATE, courseId: cId, state: normalizedState },
            { scope: CertificateTemplateScope.COURSE, courseId: cId, state: null },
            { scope: CertificateTemplateScope.STATE, courseId: null, state: normalizedState },
            { scope: CertificateTemplateScope.GLOBAL, courseId: null, state: null },
        ];

        for (const candidate of candidates) {
            const version = await this.findPublishedVersionForScope(candidate.scope, candidate.courseId, candidate.state);
            if (version) return version;
        }
        return null;
    }

    private async findPublishedVersionForScope(
        scope: CertificateTemplateScope,
        courseId: string | null,
        state: string | null,
    ) {
        const rows = await this.prisma.certificateTemplate.findMany({
            where: {
                isActive: true,
                scope,
                courseId,
                state,
                // hard-stop para não ressuscitar modelos legados no motor de resolução
                NOT: { scope: CertificateTemplateScope.PUBLIC_FILE },
            },
            include: { currentVersion: true },
            orderBy: { updatedAt: 'desc' },
        });
        for (const t of rows) {
            if (t.currentVersion?.status === CertificateTemplateStatus.PUBLISHED) {
                return t.currentVersion;
            }
        }
        return null;
    }

    /**
     * Stream do PDF de uma versão (só ficheiros sob a pasta public do projecto).
     */
    async getVersionPdfAbsolutePathForPreview(versionId: string): Promise<string> {
        const version = await this.prisma.certificateTemplateVersion.findUnique({ where: { id: versionId } });
        if (!version?.pdfPath) throw new NotFoundException('Esta versão não tem PDF');
        const abs = path.resolve(version.pdfPath);
        const publicDir = path.resolve(process.cwd(), '../public');
        if (!abs.startsWith(publicDir + path.sep) && abs !== publicDir) {
            throw new ForbiddenException('Caminho fora da pasta public');
        }
        try {
            await fs.access(abs);
        } catch {
            throw new NotFoundException('Ficheiro PDF não encontrado no disco');
        }
        return abs;
    }

    private async promotePublishedVersion(versionId: string, actorId: string) {
        const version = await this.prisma.certificateTemplateVersion.findUnique({ where: { id: versionId } });
        if (!version) throw new NotFoundException('Versão não encontrada');

        await this.prisma.certificateTemplateVersion.updateMany({
            where: {
                templateId: version.templateId,
                NOT: { id: versionId },
                status: CertificateTemplateStatus.PUBLISHED,
            },
            data: { status: CertificateTemplateStatus.APPROVED },
        });

        await this.prisma.certificateTemplate.update({
            where: { id: version.templateId },
            data: {
                currentVersionId: version.id,
                isActive: true,
                updatedAt: new Date(),
            },
        });

        return this.prisma.certificateTemplateVersion.update({
            where: { id: versionId },
            data: {
                status: CertificateTemplateStatus.PUBLISHED,
                approvedById: actorId,
                approvedAt: new Date(),
                publishedAt: new Date(),
            },
        });
    }

    private buildTemplateKey(scope: CertificateTemplateScope, courseId?: string, state?: string) {
        const normalizedState = state?.trim().toUpperCase() ?? 'ANY';
        const normalizedCourse = courseId ?? 'ANY';
        return `${scope}:${normalizedCourse}:${normalizedState}`;
    }

}

