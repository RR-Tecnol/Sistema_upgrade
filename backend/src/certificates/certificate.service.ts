import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FeedbacksInvitationService } from '../feedbacks/feedbacks-invitation.service';
import { CertificateTemplateService } from './certificate-template.service';
import { CertificatePdfCacheService } from '../reports/certificate-pdf-cache.service';
import type { CertificateBulkSyncBody } from './certificate-bulk-sync.schema';
import { PublicCertificateVerificationDto } from './dto/public-certificate-verification.dto';
import { CertificateNotificationService, type IssuedCertificatePayload } from './certificate-notification.service';
import { evaluateCertificateEligibilityForEnrollment } from '../common/certificate-enrollment-evaluation.helper';

/**
 * CertificateService — REQ-06 (Portal do Aluno)
 *
 * Schema real (schema.prisma @814):
 *   Certificate { id, studentId, classId, templateVersionId, verificationCode, … }
 *
 * EnrollmentStatus (schema.prisma @128): PENDING, APPROVED, REJECTED,
 *   DOCUMENT_PENDING, WAITLIST, ENROLLED, DROPOUT
 *
 * Critério de eligibilidade (LIVRO_REGRAS §5.3):
 *   - Enrollment status = ENROLLED ou APPROVED
 *   - Frequência ≥ 75% (3ª semana) / ≥ 80% (final)
 */
@Injectable()
export class CertificateService {
    private readonly logger = new Logger(CertificateService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => FeedbacksInvitationService))
        private readonly feedbacksInvitation: FeedbacksInvitationService,
        private readonly templateService: CertificateTemplateService,
        private readonly certificatePdfCache: CertificatePdfCacheService,
        private readonly certificateNotification: CertificateNotificationService,
    ) {}

    private normalizeUf(value?: string | null): string | undefined {
        const uf = String(value || '').trim().toUpperCase();
        return /^[A-Z]{2}$/.test(uf) ? uf : undefined;
    }

    /**
     * Código opaco globalmente único (coluna `verificationCode` + índice único).
     * 16 bytes aleatórios criptográficos → ~128 bits de entropia no payload (prefixo UPG- só identifica o produto).
     * O QR do PDF aponta para `/certificado/verificar/{verificationCode}` — um código por certificado,
     * e `@@unique([studentId, classId])` garante no máximo um certificado ativo por aluno/turma.
     */
    private buildNewVerificationCode(): string {
        return `UPG-${randomBytes(16).toString('hex').toUpperCase()}`;
    }

    /** Interpreta `meta.target` do Prisma em violações P2002 (string ou array). */
    private prismaUniqueTargetFields(e: Prisma.PrismaClientKnownRequestError): string[] {
        const t = e.meta?.target;
        if (Array.isArray(t)) return t.map(String);
        if (t != null) return [String(t)];
        return [];
    }

    /**
     * Remove todos os certificados emitidos e convites de feedback associados (admin / homologação).
     */
    async deleteAllIssuedCertificates() {
        await this.prisma.courseFeedback.deleteMany({});
        const r = await this.prisma.certificate.deleteMany({});
        return { deleted: r.count };
    }

    /**
     * Garante pelo menos um certificado ativo para teste de download/verificação.
     * Se já existir, devolve o mais recente; caso contrário emite a partir da primeira matrícula elegível.
     */
    async ensureDemoVerificationCertificate(issuedByUserId: string) {
        const existing = await this.prisma.certificate.findFirst({
            where: { status: 'ACTIVE' },
            orderBy: { issuedAt: 'desc' },
            include: {
                student: { include: { user: { select: { name: true } } } },
                class: { include: { course: { select: { name: true } } } },
            },
        });
        if (existing) {
            return {
                created: false,
                certificate: existing,
                message: 'Já existe certificado ativo; use o código abaixo para verificar/baixar.',
            };
        }
        const enrollment = await this.prisma.enrollment.findFirst({
            where: { status: { in: ['ENROLLED', 'APPROVED'] } },
            orderBy: { createdAt: 'desc' },
        });
        if (!enrollment) {
            throw new BadRequestException(
                'Nenhuma matrícula ENROLLED/APPROVED no banco. Crie matrícula e turma antes de gerar certificado de teste.',
            );
        }
        const cert = await this.issueCertificate(enrollment.studentId, enrollment.classId, issuedByUserId);
        const full = await this.prisma.certificate.findUnique({
            where: { id: cert.id },
            include: {
                student: { include: { user: { select: { name: true } } } },
                class: { include: { course: { select: { name: true } }, city: { select: { name: true, state: true } } } },
            },
        });
        return {
            created: true,
            certificate: full,
            message: 'Certificado de verificação criado. Use o código para /api/certificates/download e /certificado/verificar.',
        };
    }

    /** Emite certificado — idempotente */
    async issueCertificate(studentId: string, classId: string, issuedBy: string) {
        // Verifica matrícula
        const enrollment = await this.prisma.enrollment.findFirst({
            where: { studentId, classId, status: { in: ['ENROLLED', 'APPROVED'] } },
        });
        if (!enrollment) throw new NotFoundException('Matrícula ativa não encontrada para este aluno nesta turma');

        // Idempotência
        const existing = await this.prisma.certificate.findFirst({
            where: { studentId, classId, status: 'ACTIVE' },
        });
        if (existing) return existing;

        const classRow = await this.prisma.class.findUnique({
            where: { id: classId },
            select: { courseId: true, city: { select: { state: true } } },
        });
        if (!classRow?.courseId) {
            throw new BadRequestException('A turma não tem curso associado; não é possível escolher modelo de certificado.');
        }
        const state = this.normalizeUf(classRow.city?.state);
        const published = await this.templateService.resolvePublishedTemplate(classRow.courseId, state);
        if (!published) {
            throw new BadRequestException(
                `Não existe modelo de certificado publicado para este curso e UF (${state ?? 'N/D'}). ` +
                    'Publique um modelo em Admin → Certificados → Modelos (ou importe PDFs de public/) antes de emitir.',
            );
        }

        const eligibility = await evaluateCertificateEligibilityForEnrollment(this.prisma, studentId, classId);
        if (!eligibility || !eligibility.certificateEligible) {
            throw new BadRequestException({
                message:
                    'Não é possível emitir certificado: o aluno não cumpre a frequência efectiva exigível e/ou há penalidades de imprevisto que impedem certificação.',
                reasons: eligibility?.certificateBlockReasons ?? ['Não foi possível avaliar elegibilidade (dados incompletos).'],
                attendanceRateBeforePenaltyPct: eligibility?.attendanceRateBeforePenaltyPct,
                attendanceRateAfterPenaltyPct: eligibility?.attendanceRateAfterPenaltyPct,
                imprevistoPenaltyPctSum: eligibility?.imprevistoPenaltyPctSum,
            });
        }

        const maxAttempts = 8;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const verificationCode = this.buildNewVerificationCode();
            try {
                const certificate = await this.prisma.certificate.create({
                    data: {
                        studentId,
                        classId,
                        templateVersionId: published.id,
                        issuedBy,
                        verificationCode,
                        fileUrl: `/api/certificates/download/${verificationCode}`, // PDF lazy — gerado sob demanda
                        status: 'ACTIVE',
                        issuedAt: new Date(),
                    },
                });

                try {
                    await this.feedbacksInvitation.onCertificateIssued(certificate);
                } catch (err) {
                    this.logger.warn(`Falha ao criar convite de feedback: ${err}`);
                }

                void this.sendCertificateIssuedNotifications(certificate.id);

                return certificate;
            } catch (e) {
                if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== 'P2002') {
                    throw e;
                }
                const fields = this.prismaUniqueTargetFields(e);
                const compoundStudentClass =
                    fields.includes('studentId_classId') ||
                    (fields.includes('studentId') && fields.includes('classId'));
                if (compoundStudentClass) {
                    const winner = await this.prisma.certificate.findFirst({
                        where: { studentId, classId, status: 'ACTIVE' },
                    });
                    if (winner) {
                        return winner;
                    }
                    throw e;
                }
                if (fields.includes('verificationCode')) {
                    this.logger.warn(
                        `Colisão rara em verificationCode na emissão (tentativa ${attempt + 1}/${maxAttempts}); a gerar novo código.`,
                    );
                    continue;
                }
                throw e;
            }
        }

        throw new BadRequestException(
            'Não foi possível atribuir um código de verificação único após várias tentativas. Tente novamente.',
        );
    }

    /** Fase 6: e-mail + webhook; não bloqueia resposta. */
    private async sendCertificateIssuedNotifications(certificateId: string) {
        try {
            const row = await this.prisma.certificate.findFirst({
                where: { id: certificateId },
                include: {
                    student: { include: { user: { select: { name: true, email: true } } } },
                    class: { include: { course: { select: { name: true } } } },
                },
            });
            if (!row) {
                return;
            }
            const p: IssuedCertificatePayload = {
                verificationCode: row.verificationCode,
                studentEmail: row.student?.user?.email ?? null,
                studentName: row.student?.user?.name?.trim() || 'Aluno',
                courseName: row.class?.course?.name?.trim() || 'Curso',
                studentUserId: row.student?.userId,
            };
            await this.certificateNotification.notifyCertificateIssued(p);
        } catch (e) {
            this.logger.warn(`Notificação pós-certificado: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    /**
     * Admin: volume de certificados ativos por curso e por UF.
     */
    async getAdminEmissionBreakdown() {
        const certs = await this.prisma.certificate.findMany({
            where: { status: 'ACTIVE' },
            select: {
                class: {
                    select: {
                        course: { select: { name: true } },
                        city: { select: { state: true } },
                    },
                },
            },
        });
        const byCourse = new Map<string, number>();
        const byState = new Map<string, number>();
        for (const c of certs) {
            const cn = c.class?.course?.name?.trim() || '—';
            byCourse.set(cn, (byCourse.get(cn) || 0) + 1);
            const st = (c.class?.city?.state ?? '—').trim().toUpperCase() || '—';
            byState.set(st, (byState.get(st) || 0) + 1);
        }
        return {
            byCourse: [...byCourse.entries()]
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count),
            byState: [...byState.entries()]
                .map(([state, count]) => ({ state, count }))
                .sort((a, b) => b.count - a.count),
            total: certs.length,
        };
    }

    /** Lista todos os certificados (admin) */
    async findAll() {
        return this.prisma.certificate.findMany({
            orderBy: { issuedAt: 'desc' },
            include: {
                student: {
                    include: {
                        user: { select: { name: true, email: true } },
                        address: { select: { city: true, state: true } },
                    },
                },
                class: {
                    include: {
                        course: { select: { name: true, workloadHours: true } },
                        city: { select: { name: true, state: true } },
                    },
                },
                issuer: { select: { name: true } },
                templateVersion: { select: { id: true, version: true, title: true, templateId: true, templateType: true } },
            },
        });
    }

    /** Certificados do próprio aluno */
    async findMyCertificates(userId: string) {
        const student = await this.prisma.student.findFirst({ where: { userId } });
        if (!student) return [];

        return this.prisma.certificate.findMany({
            where: { studentId: student.id, status: 'ACTIVE' },
            orderBy: { issuedAt: 'desc' },
            include: {
                class: {
                    include: {
                        course: { select: { name: true, workloadHours: true } },
                        city: { select: { name: true, state: true } },
                    },
                },
            },
        });
    }

    /**
     * Nome ofuscado para o portal (ex.: "J*** S" a partir de "José Maria Silva").
     * Útil como barreira leve contra harvest em massa.
     */
    static obfuscateStudentNameForPublic(fullName: string): string {
        const parts = fullName
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        if (parts.length === 0) {
            return '***';
        }
        if (parts.length === 1) {
            const w = parts[0] as string;
            return w.length > 0 ? `${w[0] as string}***` : '***';
        }
        const first = parts[0] as string;
        const last = parts[parts.length - 1] as string;
        return `${(first[0] as string) || '?'}*** ${(last[0] as string) || '?'}`;
    }

    /**
     * Verificação pública: payload mínimo + ogShare (sem dados de matrícula, turma, CPf, etc.).
     */
    async verify(code: string): Promise<PublicCertificateVerificationDto> {
        const cert = await this.prisma.certificate.findFirst({
            where: { verificationCode: code },
            include: {
                student: { include: { user: { select: { name: true } } } },
                class: {
                    include: {
                        course: {
                            select: {
                                name: true,
                                workloadHours: true,
                                institution: {
                                    select: {
                                        name: true,
                                        shortName: true,
                                        logoUrl: true,
                                        siteUrl: true,
                                        primaryColor: true,
                                    },
                                },
                            },
                        },
                    },
                },
                issuer: { select: { name: true } },
            },
        });
        if (!cert) {
            throw new NotFoundException('Certificado não encontrado ou inválido');
        }

        const fullName = cert.student?.user?.name?.trim() || 'Aluno';
        const obfuscated = CertificateService.obfuscateStudentNameForPublic(fullName);
        const courseName = cert.class?.course?.name ?? '—';
        const workloadHours = cert.class?.course?.workloadHours ?? 0;
        const issuedAt = cert.issuedAt.toISOString();
        const inst = cert.class?.course?.institution;
        const institutionName =
            inst?.shortName?.trim() ||
            inst?.name?.trim() ||
            process.env.CERT_PUBLIC_INSTITUTION_NAME?.trim() ||
            cert.issuer?.name ||
            'UPGRADE';
        const institutionLogoUrl =
            inst?.logoUrl?.trim() || process.env.CERT_BRAND_LOGO_URL?.trim() || '/assets/logo-upgrade.png';
        const siteUrl = inst?.siteUrl?.trim() || process.env.CERT_BRAND_SITE_URL?.trim() || null;
        const primaryColor =
            inst?.primaryColor?.trim() || process.env.CERT_BRAND_PRIMARY_COLOR?.trim() || null;

        const body: PublicCertificateVerificationDto = {
            status: cert.status,
            studentNameObfuscated: obfuscated,
            courseName,
            workloadHours,
            issuedAt,
            institutionName,
            institutionLogoUrl,
            siteUrl,
            primaryColor,
            verificationCode: cert.verificationCode,
        };

        if (cert.status === 'ACTIVE') {
            const issued = new Date(cert.issuedAt).toLocaleDateString('pt-BR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
            body.ogShare = {
                title: `Verificação de Certificado: ${fullName} - ${institutionName}`,
                description: `Autenticidade confirmada na plataforma. ${courseName}. Emitido em ${issued}. ${workloadHours}h.`,
            };
        } else {
            body.ogShare = {
                title: 'Certificado indisponível | UPGRADE',
                description: 'Este certificado não se encontra ativo em nossa base. Verificação pública de autenticidade.',
            };
        }

        return body;
    }

    /**
     * Alunos elegíveis para certificação.
     * Calcula frequência real de cada enrollment ENROLLED/APPROVED.
     */
    async findEligible() {
        const enrollments = await this.prisma.enrollment.findMany({
            where: { status: { in: ['ENROLLED', 'APPROVED'] } },
            include: {
                student: { include: { user: { select: { name: true } } } },
                class: {
                    select: {
                        classIdentifier: true,
                        course: { select: { name: true } },
                    },
                },
            },
        });

        const eligible: any[] = [];

        for (const enrollment of enrollments) {
            const cls = enrollment.class;

            const evaluation = await evaluateCertificateEligibilityForEnrollment(
                this.prisma,
                enrollment.studentId,
                enrollment.classId,
            );
            if (!evaluation?.certificateEligible) continue;

            const hasCert = await this.prisma.certificate.findFirst({
                where: { studentId: enrollment.studentId, classId: enrollment.classId, status: 'ACTIVE' },
            });
            if (hasCert) continue;

            eligible.push({
                id: enrollment.studentId,
                name: enrollment.student?.user?.name ?? 'Aluno',
                cpf: enrollment.student?.cpf ?? '',
                enrollmentId: enrollment.id,
                classId: enrollment.classId,
                courseName: cls?.course?.name ?? '—',
                classIdentifier: cls?.classIdentifier ?? '—',
                attendanceRate: evaluation.attendanceRateAfterPenaltyPct,
                attendanceRateBeforePenaltyPct: evaluation.attendanceRateBeforePenaltyPct,
                imprevistoPenaltyPctSum: evaluation.imprevistoPenaltyPctSum,
                riskLevel: evaluation.riskLevelAfterPenalty,
            });
        }

        return eligible;
    }

    /**
     * Atribui `templateVersionId` aos certificados ativos em que ainda é nulo (legado),
     * resolvendo o modelo publicado para o par curso + UF da turma.
     */
    async backfillMissingTemplateVersionIds() {
        const rows = await this.prisma.certificate.findMany({
            where: { templateVersionId: null, status: 'ACTIVE' },
            include: { class: { select: { courseId: true, city: { select: { state: true } } } } },
        });
        let updated = 0;
        const skipped: { id: string; reason: string }[] = [];
        for (const cert of rows) {
            const courseId = cert.class?.courseId;
            const state = this.normalizeUf(cert.class?.city?.state);
            if (!courseId) {
                skipped.push({ id: cert.id, reason: 'Turma sem courseId' });
                continue;
            }
            const published = await this.templateService.resolvePublishedTemplate(courseId, state);
            if (!published) {
                skipped.push({ id: cert.id, reason: `Sem modelo publicado para o curso nesta UF (${state ?? 'N/D'})` });
                continue;
            }
            await this.prisma.certificate.update({
                where: { id: cert.id },
                data: { templateVersionId: published.id },
            });
            await this.certificatePdfCache.invalidate(cert.verificationCode);
            updated += 1;
        }
        return { scanned: rows.length, updated, skipped };
    }

    /**
     * Atualiza o certificado para a versão de modelo publicada mais recente (curso + UF),
     * útil para re-alinhar PDF após correcção de design.
     */
    async syncCertificateTemplateToLatest(certificateId: string) {
        const cert = await this.prisma.certificate.findUnique({
            where: { id: certificateId },
            include: { class: { select: { courseId: true, city: { select: { state: true } } } } },
        });
        if (!cert) {
            throw new NotFoundException('Certificado não encontrado');
        }
        const courseId = cert.class?.courseId;
        const state = this.normalizeUf(cert.class?.city?.state);
        if (!courseId) {
            throw new BadRequestException('A turma deste certificado não tem curso associado.');
        }
        const published = await this.templateService.resolvePublishedTemplate(courseId, state);
        if (!published) {
            throw new BadRequestException(
                `Não existe modelo publicado para este curso e UF (${state ?? 'N/D'}). Publique um modelo antes de sincronizar.`,
            );
        }
        const updated = await this.prisma.certificate.update({
            where: { id: certificateId },
            data: { templateVersionId: published.id },
            include: {
                templateVersion: { select: { id: true, version: true, title: true, templateId: true, templateType: true } },
            },
        });
        await this.certificatePdfCache.invalidate(cert.verificationCode);
        return updated;
    }

    /**
     * Sincroniza vários certificados com o modelo publicado (por IDs ou por turma).
     * Processa em blocos com `Promise.allSettled` para não exceder tempo útil de conexão em lotes grandes.
     */
    async bulkSyncCertificateTemplates(body: CertificateBulkSyncBody) {
        const ids: string[] = [];
        if (body.classId) {
            const rows = await this.prisma.certificate.findMany({
                where: { classId: body.classId, status: 'ACTIVE' },
                select: { id: true },
            });
            for (const r of rows) {
                ids.push(r.id);
            }
        } else if (body.certificateIds?.length) {
            ids.push(...body.certificateIds);
        }
        const unique = [...new Set(ids)];
        const results: { id: string; status: 'ok' | 'error'; message?: string }[] = [];
        const chunkSize = 8;
        for (let i = 0; i < unique.length; i += chunkSize) {
            const chunk = unique.slice(i, i + chunkSize);
            const settled = await Promise.allSettled(
                chunk.map((id) => this.syncCertificateTemplateToLatest(id)),
            );
            settled.forEach((r, j) => {
                const id = chunk[j]!;
                if (r.status === 'fulfilled') {
                    results.push({ id, status: 'ok' });
                } else {
                    const reason = r.reason;
                    results.push({
                        id,
                        status: 'error',
                        message: reason instanceof Error ? reason.message : String(reason),
                    });
                }
            });
        }
        return {
            total: unique.length,
            succeeded: results.filter((x) => x.status === 'ok').length,
            failed: results.filter((x) => x.status === 'error').length,
            results,
        };
    }
}
