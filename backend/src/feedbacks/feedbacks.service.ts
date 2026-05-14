import {
    Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsSenderService } from '../notifications/notifications-sender.service';
import { FeedbackStatus, FeedbackRewardStatus, PixKeyType, Prisma } from '@prisma/client';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { NoopEmailProvider, NoopSmsProvider, NoopWhatsappProvider } from './providers/noop-notification.provider';
import { FeedbacksMinioService } from './feedbacks-minio.service';
import { MailService } from '../mail/mail.service';

/**
 * FeedbacksService — Regras de negócio do módulo Feedback Pós-Curso + Recompensa PIX.
 * Segue precisamente o padrão de reimbursement.service.ts:
 * - Decimal para dinheiro (NUNCA Float)
 * - Soft delete via active: false
 * - WS/Notifications FORA de $transaction, em try/catch
 * - ContaPagar criada dentro de $transaction com feedback update
 */
@Injectable()
export class FeedbacksService {
    private readonly logger = new Logger(FeedbacksService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsGateway,
        private readonly notifSender: NotificationsSenderService,
        private readonly email: NoopEmailProvider,
        private readonly sms: NoopSmsProvider,
        private readonly whatsapp: NoopWhatsappProvider,
        private readonly minio: FeedbacksMinioService,
        private readonly mail: MailService,
    ) {}

    // ── STUDENT ──────────────────────────────────────────────

    async listMine(userId: string) {
        const student = await this.prisma.student.findFirst({ where: { userId } });
        if (!student) throw new NotFoundException('Aluno não encontrado');
        return this.prisma.courseFeedback.findMany({
            where: { studentId: student.id, active: true },
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
            include: {
                class: {
                    include: {
                        course: { select: { name: true } },
                        city: { select: { name: true, state: true } },
                    },
                },
                certificate: { select: { verificationCode: true, issuedAt: true } },
            },
        });
    }

    async findOneMine(id: string, userId: string) {
        const student = await this.prisma.student.findFirst({ where: { userId } });
        if (!student) throw new NotFoundException('Aluno não encontrado');
        const fb = await this.prisma.courseFeedback.findFirst({
            where: { id, studentId: student.id, active: true },
            include: {
                student: { include: { user: { select: { name: true } } } },
                class: {
                    include: {
                        course: {
                            select: {
                                name: true,
                                workloadHours: true,
                                institution: { select: { name: true, shortName: true, slug: true } },
                            },
                        },
                        city: { select: { name: true, state: true } },
                    },
                },
                certificate: { select: { verificationCode: true, issuedAt: true } },
            },
        });
        if (!fb) throw new NotFoundException('Feedback não encontrado');
        return fb;
    }

    async submit(id: string, userId: string, dto: SubmitFeedbackDto) {
        const student = await this.prisma.student.findFirst({ where: { userId } });
        if (!student) throw new NotFoundException('Aluno não encontrado');

        const fb = await this.prisma.courseFeedback.findFirst({
            where: { id, studentId: student.id, active: true },
        });
        if (!fb) throw new NotFoundException('Feedback não encontrado');
        const fromRejected = fb.status === 'REJECTED';
        if (fb.status !== 'PENDING_STUDENT_RESPONSE' && fb.status !== 'REJECTED') {
            throw new BadRequestException('Este feedback já foi enviado ou não pode ser reeditado neste estado');
        }
        if (dto.sharedOnSocial !== true) {
            throw new BadRequestException('Confirme a divulgação do certificado (LinkedIn ou WhatsApp) para concluir o envio');
        }

        // Validação extra: comprovação de postagem social é obrigatória
        if (!dto.socialPostPlatform || !['LINKEDIN', 'WHATSAPP'].includes(dto.socialPostPlatform)) {
            throw new BadRequestException('Informe a plataforma onde postou (LINKEDIN ou WHATSAPP)');
        }
        if (!dto.socialPostProofUrl?.trim()) {
            throw new BadRequestException('Envie o screenshot do post como comprovação');
        }
        if (dto.socialPostPlatform === 'LINKEDIN') {
            if (!dto.socialPostUrl?.trim()) {
                throw new BadRequestException('Para posts no LinkedIn, é obrigatório informar o link do post publicado');
            }
        }

        this.validatePixKey(dto.pixKeyType, dto.pixKey);

        const seq = fb.studentSubmitSequence + 1;

        const updated = await this.prisma.courseFeedback.update({
            where: { id },
            data: {
                ratingCourse: dto.ratingCourse,
                ratingSystem: dto.ratingSystem,
                ratingManagement: dto.ratingManagement,
                ratingTeachers: dto.ratingTeachers,
                ratingGeneral: dto.ratingGeneral,
                commentPositive: dto.commentPositive,
                commentImprovement: dto.commentImprovement,
                commentGeneral: dto.commentGeneral,
                currentStatus: dto.currentStatus,
                currentStatusDetails: dto.currentStatusDetails,
                currentPhotoUrl: dto.currentPhotoUrl,
                currentVideoUrl: dto.currentVideoUrl,
                pixKeyType: dto.pixKeyType,
                pixKey: dto.pixKey,
                sharedOnSocial: true,
                // socialPostPlatform / socialPostProofUrl: campos pendentes de migration (schema v2)
                // Cast temporário até próxima migration do Prisma
                ...({ socialPostPlatform: dto.socialPostPlatform } as any),
                socialPostUrl: dto.socialPostUrl?.trim() || null,
                ...({ socialPostProofUrl: dto.socialPostProofUrl } as any),
                socialPostedAt: new Date(),
                status: 'SUBMITTED',
                submittedAt: new Date(),
                studentSubmitSequence: seq,
                resubmittedAfterReject: fromRejected,
                rejectionReason: fromRejected ? null : fb.rejectionReason,
                contentApprovedAt: null,
                contentApprovedBy: null,
                ...(fromRejected ? { rewardStatus: FeedbackRewardStatus.PENDING } : {}),
            },
        });

        // Notificar admins — WS em try/catch SEPARADO (nunca em $transaction)
        try {
            this.notifications.notifyAdmins('feedback_submetido', {
                feedbackId: updated.id,
                studentId: updated.studentId,
                timestamp: new Date().toISOString(),
            });
        } catch {}

        return updated;
    }

    // ── ADMIN ──────────────────────────────────────────────

    /** Filtro de pipeline na UI admin (chips) — mapeia para combinações de status + ContaPagar + reward. */
    async findAllAdmin(filters: {
        status?: FeedbackStatus;
        /** Se definido, tem precedência sobre `status` */
        lifecycle?:
            | 'WAITING_TRIAGE'
            | 'TRIAGE_OK'
            | 'PENDING_PAYMENT'
            | 'PAID'
            | 'REJECTED';
        classId?: string;
        rewardStatus?: FeedbackRewardStatus;
        page?: number;
        limit?: number;
    }) {
        const page = filters.page ?? 1;
        const limit = filters.limit ?? 20;
        const skip = (page - 1) * limit;

        const where: any = { active: true };
        if (filters.classId) where.classId = filters.classId;
        if (filters.rewardStatus) where.rewardStatus = filters.rewardStatus;

        if (filters.lifecycle) {
            switch (filters.lifecycle) {
                case 'WAITING_TRIAGE':
                    where.status = 'SUBMITTED';
                    break;
                case 'TRIAGE_OK':
                    where.status = 'CONTENT_APPROVED';
                    break;
                case 'REJECTED':
                    where.status = 'REJECTED';
                    break;
                case 'PENDING_PAYMENT':
                    where.status = 'APPROVED';
                    where.rewardStatus = { not: 'PAID' };
                    where.OR = [
                        { contaPagarId: null },
                        { contaPagar: { status: { in: ['pendente', 'vencida'] } } },
                    ];
                    break;
                case 'PAID':
                    where.status = 'APPROVED';
                    where.OR = [{ rewardStatus: 'PAID' }, { contaPagar: { status: 'paga' } }];
                    break;
            }
        } else if (filters.status) {
            where.status = filters.status;
        }

        const [data, total] = await Promise.all([
            this.prisma.courseFeedback.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    student: {
                        include: { user: { select: { name: true, email: true } } },
                    },
                    class: {
                        include: {
                            course: { select: { name: true } },
                            city: { select: { name: true, state: true } },
                        },
                    },
                    contaPagar: { select: { id: true, status: true, valor: true, data_pagamento: true } },
                },
            }),
            this.prisma.courseFeedback.count({ where }),
        ]);

        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async findOneAdmin(id: string) {
        const fb = await this.prisma.courseFeedback.findFirst({
            where: { id, active: true },
            include: {
                student: {
                    include: {
                        user: { select: { name: true, email: true, phone: true } },
                        contact: { select: { phone: true, email: true } },
                    },
                },
                class: {
                    include: {
                        course: { select: { name: true, workloadHours: true } },
                        city: { select: { name: true, state: true } },
                    },
                },
                certificate: { select: { id: true, verificationCode: true, issuedAt: true, fileUrl: true } },
                contaPagar: { select: { id: true, status: true, valor: true, data_pagamento: true } },
            },
        });
        if (!fb) throw new NotFoundException('Feedback não encontrado');
        return fb;
    }

    /**
     * FUTURE_DEPLOY — Fluxo PIX em lote (sem ContaPagar): aprova para CSV bancário.
     * UI stand-by no admin; serviço mantido para retomada.
     */
    async approveForBatch(id: string, adminId: string) {
        const fb = await this.prisma.courseFeedback.findFirst({
            where: { id, active: true },
            include: { student: { include: { user: { select: { id: true, name: true } } } } },
        });
        if (!fb) throw new NotFoundException('Feedback não encontrado');
        if (fb.status !== 'SUBMITTED') {
            throw new BadRequestException('Apenas feedbacks SUBMITTED podem ser reservados para lote');
        }
        if (!fb.sharedOnSocial) {
            throw new BadRequestException('Feedback sem divulgação social confirmada — não elegível à recompensa em lote');
        }
        if (!fb.pixKey) {
            throw new BadRequestException('Aluno não informou chave PIX — não elegível ao lote');
        }

        const updated = await this.prisma.courseFeedback.update({
            where: { id },
            data: {
                status: 'APPROVED',
                reviewedBy: adminId,
                reviewedAt: new Date(),
                // Sem ContaPagar, sem pixAmount — pagamento ocorre via lote
            },
        });

        // Notificar aluno: aprovado, aguarda pagamento em lote
        try {
            const adminUser = await this.prisma.user.findUnique({ where: { id: adminId }, select: { name: true } });
            this.notifications.notifyUser(fb.student.user.id, 'feedback_aprovado', {
                feedbackId: id,
                pixAmount: 50,
                loteFlow: true,
                timestamp: new Date().toISOString(),
                actorName: adminUser?.name ?? undefined,
                actorUserId: adminId,
            });
        } catch {}

        return updated;
    }

    async approve(id: string, adminId: string, pixAmount: number) {
        const fb = await this.prisma.courseFeedback.findFirst({
            where: { id, active: true },
            include: {
                student: { include: { user: { select: { id: true, name: true } } } },
                class: { include: { course: { select: { name: true } }, city: { select: { name: true, state: true } } } },
            },
        });
        if (!fb) throw new NotFoundException('Feedback não encontrado');
        if (fb.status !== 'CONTENT_APPROVED') {
            throw new BadRequestException(
                'Primeiro aceite o conteúdo na triagem admin; só depois confirme o valor do PIX aqui.',
            );
        }
        if (!fb.sharedOnSocial) {
            throw new BadRequestException('Feedback sem registo de divulgação social — não é elegível ao PIX');
        }

        // Transação: atualiza feedback + cria ContaPagar atomicamente
        const result = await this.prisma.$transaction(async (tx) => {
            const vencimento = new Date();
            vencimento.setDate(vencimento.getDate() + 5);

            const conta = await tx.contaPagar.create({
                data: {
                    tipo_conta: 'feedback_pix',
                    descricao: `Recompensa feedback — ${fb.student.user.name} (${fb.class.course.name})`,
                    valor: new Prisma.Decimal(pixAmount),
                    data_vencimento: vencimento,
                    status: 'pendente',
                    observacoes: `PIX ${fb.pixKeyType}: ${fb.pixKey}`,
                    cidade: fb.class.city?.name ?? null,
                },
            });

            const updated = await tx.courseFeedback.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    pixAmount: new Prisma.Decimal(pixAmount),
                    reviewedBy: adminId,
                    reviewedAt: new Date(),
                    contaPagarId: conta.id,
                },
            });

            return { updated, conta };
        });

        // Notificar FORA da transação
        try {
            await this.notifSender.feedbackPixStatusChanged(
                fb.student.user.id,
                'APPROVED',
                pixAmount,
                undefined,
                adminId,
            );
        } catch {}
        try {
            const adminUser = await this.prisma.user.findUnique({ where: { id: adminId }, select: { name: true } });
            this.notifications.notifyUser(fb.student.user.id, 'feedback_aprovado', {
                feedbackId: id,
                pixAmount,
                timestamp: new Date().toISOString(),
                actorName: adminUser?.name ?? undefined,
                actorUserId: adminId,
            });
        } catch {}
        try {
            this.notifications.notifyFinanceiroListagemRefresh({
                source: 'feedback_approve_pix',
                feedbackId: id,
                contaPagarId: result.conta.id,
            });
        } catch { /* WS nunca bloqueia */ }

        // Email de recompensa PIX ao aluno
        try {
            const studentUser = await this.prisma.user.findUnique({
                where: { id: fb.student.user.id },
                select: { name: true, email: true },
            });
            if (studentUser?.email && fb.pixKey && fb.pixKeyType) {
                await this.mail.sendFeedbackPixApproved(
                    studentUser.email,
                    studentUser.name,
                    pixAmount,
                    fb.class.course.name,
                    fb.pixKey,
                    fb.pixKeyType,
                );
            }
        } catch { /* email nunca bloqueia */ }

        return result.updated;
    }

    /**
     * Legado / lote: feedback APPROVED sem ContaPagar (ex.: approve-for-batch).
     * Cria o lançamento em Contas a pagar e vincula, sem alterar o status.
     */
    async createMissingContaPagar(id: string, adminId: string, pixAmount: number) {
        const fb = await this.prisma.courseFeedback.findFirst({
            where: { id, active: true },
            include: {
                student: { include: { user: { select: { id: true, name: true } } } },
                class: { include: { course: { select: { name: true } }, city: { select: { name: true, state: true } } } },
            },
        });
        if (!fb) throw new NotFoundException('Feedback não encontrado');
        if (fb.status !== 'APPROVED') {
            throw new BadRequestException('Só é possível gerar Conta a pagar em feedbacks já aprovados para PIX');
        }
        if (fb.contaPagarId) {
            throw new BadRequestException('Este feedback já tem Conta a Pagar vinculada');
        }
        if (!fb.sharedOnSocial) {
            throw new BadRequestException('Feedback sem registo de divulgação social — não é elegível');
        }
        if (!fb.pixKey?.trim()) {
            throw new BadRequestException('Aluno não informou chave PIX — complete o envio ou peça correção');
        }
        if (!fb.pixKeyType) {
            throw new BadRequestException('Tipo de chave PIX não registado no feedback');
        }
        this.validatePixKey(fb.pixKeyType, fb.pixKey);

        const result = await this.prisma.$transaction(async (tx) => {
            const vencimento = new Date();
            vencimento.setDate(vencimento.getDate() + 5);

            const conta = await tx.contaPagar.create({
                data: {
                    tipo_conta: 'feedback_pix',
                    descricao: `Recompensa feedback — ${fb.student.user.name} (${fb.class.course.name})`,
                    valor: new Prisma.Decimal(pixAmount),
                    data_vencimento: vencimento,
                    status: 'pendente',
                    observacoes: `PIX ${fb.pixKeyType}: ${fb.pixKey}`,
                    cidade: fb.class.city?.name ?? null,
                },
            });

            const updated = await tx.courseFeedback.update({
                where: { id },
                data: {
                    pixAmount: new Prisma.Decimal(pixAmount),
                    reviewedBy: adminId,
                    reviewedAt: new Date(),
                    contaPagarId: conta.id,
                },
            });

            return { updated, conta };
        });

        try {
            await this.notifSender.feedbackPixStatusChanged(
                fb.student.user.id,
                'APPROVED',
                pixAmount,
                undefined,
                adminId,
            );
        } catch {}
        try {
            this.notifications.notifyFinanceiroListagemRefresh({
                source: 'feedback_create_missing_conta',
                feedbackId: id,
                contaPagarId: result.conta.id,
            });
        } catch { /* WS nunca bloqueia */ }

        return result.updated;
    }

    async reject(id: string, adminId: string, rejectionReason: string) {
        const fb = await this.prisma.courseFeedback.findFirst({
            where: { id, active: true },
            include: { student: { include: { user: { select: { id: true } } } } },
        });
        if (!fb) throw new NotFoundException('Feedback não encontrado');
        if (!['SUBMITTED', 'CONTENT_APPROVED'].includes(fb.status)) {
            throw new BadRequestException(
                'Só é possível rejeitar feedbacks aguardando triagem (Submetido) ou aguardando PIX (conteúdo aprovado)',
            );
        }

        const updated = await this.prisma.courseFeedback.update({
            where: { id },
            data: {
                status: 'REJECTED',
                reviewedBy: adminId,
                reviewedAt: new Date(),
                rejectionReason,
                rewardStatus: FeedbackRewardStatus.CANCELLED,
                contentApprovedAt: null,
                contentApprovedBy: null,
                resubmittedAfterReject: false,
                rejectionHistoryJson: FeedbacksService.pushRejectionAudit(fb.rejectionHistoryJson, {
                    reason: rejectionReason,
                    rejectedAt: new Date().toISOString(),
                    reviewedBy: adminId,
                }),
            },
        });

        try {
            await this.notifSender.feedbackPixStatusChanged(
                fb.student.user.id,
                'REJECTED',
                0,
                rejectionReason,
                adminId,
            );
        } catch {}
        try {
            const adminUser = await this.prisma.user.findUnique({ where: { id: adminId }, select: { name: true } });
            this.notifications.notifyUser(fb.student.user.id, 'feedback_rejeitado', {
                feedbackId: id,
                timestamp: new Date().toISOString(),
                actorName: adminUser?.name ?? undefined,
                actorUserId: adminId,
            });
        } catch {}

        return updated;
    }

    /**
     * Primeira etapa do fluxo admin: aceita o envio do aluno (material, provas, dados)
     * sem gerar Conta a Pagar — o PIX vem em `approve()`.
     */
    async approveContent(id: string, adminId: string) {
        const fb = await this.prisma.courseFeedback.findFirst({
            where: { id, active: true },
            include: {
                student: { include: { user: { select: { id: true } } } },
                class: { include: { course: { select: { name: true } } } },
            },
        });
        if (!fb) throw new NotFoundException('Feedback não encontrado');
        if (fb.status !== 'SUBMITTED') {
            throw new BadRequestException('Apenas feedbacks SUBMETIDOS aguardando triagem podem ser aceites nesta etapa');
        }

        const updated = await this.prisma.courseFeedback.update({
            where: { id },
            data: {
                status: 'CONTENT_APPROVED',
                contentApprovedAt: new Date(),
                contentApprovedBy: adminId,
            },
        });

        try {
            const adminUser = await this.prisma.user.findUnique({ where: { id: adminId }, select: { name: true } });
            await this.notifSender.feedbackContentApproved(
                fb.student.user.id,
                id,
                fb.class.course.name,
                adminId,
                adminUser?.name ?? undefined,
            );
        } catch {}

        return updated;
    }

    async revert(id: string, adminId: string, revertReason: string) {
        const fb = await this.prisma.courseFeedback.findFirst({
            where: { id, active: true },
            include: {
                contaPagar: true,
                student: { include: { user: { select: { id: true } } } },
            },
        });
        if (!fb) throw new NotFoundException('Feedback não encontrado');
        if (fb.status !== 'APPROVED') {
            throw new BadRequestException('Apenas feedbacks APPROVED podem ser revertidos');
        }
        if (fb.contaPagar && fb.contaPagar.status === 'paga') {
            throw new BadRequestException('ContaPagar já foi paga — reversão bloqueada');
        }

        const result = await this.prisma.$transaction(async (tx) => {
            if (fb.contaPagarId) {
                await tx.contaPagar.update({
                    where: { id: fb.contaPagarId },
                    data: { status: 'cancelada', active: false },
                });
            }
            return tx.courseFeedback.update({
                where: { id },
                data: {
                    status: 'REVERTED',
                    revertedBy: adminId,
                    revertedAt: new Date(),
                    revertReason,
                },
            });
        });

        try {
            await this.notifSender.feedbackPixStatusChanged(
                fb.student.user.id,
                'REVERTED',
                Number(fb.pixAmount ?? 0),
                revertReason,
                adminId,
            );
        } catch {}
        try {
            const adminUser = await this.prisma.user.findUnique({ where: { id: adminId }, select: { name: true } });
            this.notifications.notifyUser(fb.student.user.id, 'feedback_revertido', {
                feedbackId: id,
                timestamp: new Date().toISOString(),
                actorName: adminUser?.name ?? undefined,
                actorUserId: adminId,
            });
        } catch {}
        try {
            this.notifications.notifyFinanceiroListagemRefresh({
                source: 'feedback_revert',
                feedbackId: id,
                contaPagarId: fb.contaPagarId ?? undefined,
            });
        } catch { /* WS nunca bloqueia */ }

        return result;
    }

    // ── MEDIA URL (presigned GET) ───────────────────────

    /**
     * Gera presigned GET URL do MinIO para visualização de foto/vídeo do feedback.
     * Autorização: só o próprio aluno dono ou admin/coordenador/financeiro.
     * Validade: 15 min (900s) — se a página ficar aberta mais tempo, cliente pode
     * rebuscar a URL sob demanda.
     */
    /**
     * FUTURE_DEPLOY — Elegíveis ao lote (UI desligada).
     * Fase 7–8: sem ContaPagar individual para evitar duplo pagamento.
     */
    async listPixRewardsEligible() {
        return this.prisma.courseFeedback.findMany({
            where: {
                active: true,
                sharedOnSocial: true,
                rewardStatus: 'PENDING',
                status: { in: ['SUBMITTED', 'APPROVED'] },
                pixKey: { not: null },
                contaPagarId: null, // <-- filtra fluxo individual: não duplica pagamento
            },
            orderBy: [{ submittedAt: 'asc' }, { createdAt: 'asc' }],
            include: {
                student: { include: { user: { select: { name: true, email: true, phone: true } } } },
                class: {
                    include: {
                        course: { select: { name: true, institution: { select: { name: true, slug: true } } } },
                        city: { select: { name: true, state: true } },
                    },
                },
                certificate: { select: { id: true, verificationCode: true } },
            },
        });
    }

    /** Histórico de feedbacks com recompensa PIX em lote já paga (auditoria). */
    async listPixRewardsPaid() {
        return this.prisma.courseFeedback.findMany({
            where: {
                active: true,
                rewardStatus: 'PAID',
            },
            orderBy: [{ rewardPaidAt: 'desc' }],
            include: {
                student: { include: { user: { select: { name: true, email: true } } } },
                class: {
                    include: {
                        course: { select: { name: true } },
                        city: { select: { name: true, state: true } },
                    },
                },
            },
        });
    }

    /** Recompensas canceladas (admin marcou como suspeitas, fakes, ou feedback rejeitado). */
    async listPixRewardsCancelled() {
        return this.prisma.courseFeedback.findMany({
            where: {
                active: true,
                rewardStatus: 'CANCELLED',
            },
            orderBy: [{ updatedAt: 'desc' }],
            include: {
                student: { include: { user: { select: { name: true, email: true } } } },
                class: {
                    include: {
                        course: { select: { name: true } },
                        city: { select: { name: true, state: true } },
                    },
                },
            },
        });
    }

    private static escCsv(s: string): string {
        if (s.includes(';') || s.includes('\n') || s.includes('"')) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    }

    private static formatPixBatchPaymentCsv(rows: { id: string; pixKey: string | null; student: { user: { name: string | null } | null } | null }[]) {
        const lines: string[] = ['chave_pix;nome_favorecido;valor;id_referencia'];
        let n = 0;
        for (const fb of rows) {
            const key = (fb.pixKey ?? '').trim();
            if (!key) continue;
            n += 1;
            const nome = (fb.student?.user?.name ?? 'Aluno').trim();
            lines.push(
                [FeedbacksService.escCsv(key), FeedbacksService.escCsv(nome), '50.00', fb.id].join(';'),
            );
        }
        const filename = `pix_recompensas_lote_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.csv`;
        return { filename, body: `${lines.join('\n')}\n`, rowCount: n };
    }

    async getPixBatchPaymentExport() {
        const rows = await this.listPixRewardsEligible();
        return FeedbacksService.formatPixBatchPaymentCsv(rows);
    }

    /**
     * Marca recompensa como paga (auditoria: data e referência evitam pagamento duplicado no processo manual).
     */
    async markRewardPaid(feedbackId: string, _adminId: string, paymentReference?: string) {
        const fb = await this.prisma.courseFeedback.findFirst({ where: { id: feedbackId, active: true } });
        if (!fb) throw new NotFoundException('Feedback não encontrado');
        if (fb.rewardStatus !== 'PENDING') {
            throw new BadRequestException(
                `Recompensa não está pendente (estado: ${fb.rewardStatus}). Não é possível marcar como paga novamente.`,
            );
        }
        if (fb.contaPagarId) {
            throw new BadRequestException(
                'Este feedback já foi aprovado pelo fluxo individual (ContaPagar). Não pode ser pago em lote — evita duplicação.',
            );
        }
        const ref =
            (paymentReference && paymentReference.trim()) ||
            `pago-${new Date().toISOString().slice(0, 10)}-${feedbackId.slice(0, 8)}`;
        return this.prisma.courseFeedback.update({
            where: { id: feedbackId },
            data: {
                rewardStatus: 'PAID',
                rewardPaidAt: new Date(),
                rewardPaymentReference: ref,
            },
        });
    }

    /**
     * Bulk: marca múltiplos feedbacks como pagos no lote.
     * Pula silenciosamente IDs que já foram pagos, cancelados, ou que têm ContaPagar (duplicação).
     * Retorna { updated: number, skipped: number, skippedIds: string[] }.
     */
    async bulkMarkRewardPaid(ids: string[], _adminId: string, paymentReference?: string) {
        if (!Array.isArray(ids) || ids.length === 0) {
            throw new BadRequestException('Forneça pelo menos um ID para marcar como pago');
        }
        const baseRef = (paymentReference && paymentReference.trim()) || `lote-${new Date().toISOString().slice(0, 10)}`;

        const fbs = await this.prisma.courseFeedback.findMany({
            where: { id: { in: ids }, active: true },
            select: { id: true, rewardStatus: true, contaPagarId: true },
        });

        const eligible = fbs.filter(f => f.rewardStatus === 'PENDING' && !f.contaPagarId);
        const skippedIds = fbs.filter(f => f.rewardStatus !== 'PENDING' || f.contaPagarId).map(f => f.id);
        const notFoundIds = ids.filter(id => !fbs.some(f => f.id === id));

        if (eligible.length === 0) {
            return { updated: 0, skipped: ids.length, skippedIds: [...skippedIds, ...notFoundIds] };
        }

        // Atualização em lote — uma transação para tudo
        const now = new Date();
        await this.prisma.$transaction(
            eligible.map(f =>
                this.prisma.courseFeedback.update({
                    where: { id: f.id },
                    data: {
                        rewardStatus: 'PAID',
                        rewardPaidAt: now,
                        rewardPaymentReference: `${baseRef}-${f.id.slice(0, 8)}`,
                    },
                }),
            ),
        );

        return {
            updated: eligible.length,
            skipped: skippedIds.length + notFoundIds.length,
            skippedIds: [...skippedIds, ...notFoundIds],
        };
    }

    /**
     * Cancela uma recompensa PIX (lote) — admin marca para NÃO pagar (post fake suspeito, etc.).
     * Não muda status do feedback (pode continuar APPROVED/SUBMITTED), só `rewardStatus = CANCELLED`.
     */
    async cancelReward(feedbackId: string, _adminId: string, reason?: string) {
        const fb = await this.prisma.courseFeedback.findFirst({ where: { id: feedbackId, active: true } });
        if (!fb) throw new NotFoundException('Feedback não encontrado');
        if (fb.rewardStatus === 'PAID') {
            throw new BadRequestException('Recompensa já foi paga — não pode ser cancelada. Reverta o feedback se necessário.');
        }
        if (fb.rewardStatus === 'CANCELLED') {
            throw new BadRequestException('Recompensa já está cancelada');
        }
        return this.prisma.courseFeedback.update({
            where: { id: feedbackId },
            data: {
                rewardStatus: 'CANCELLED',
                rewardPaymentReference: reason?.trim() ? `cancelado: ${reason.trim().slice(0, 200)}` : 'cancelado',
            },
        });
    }

    async getMediaUrl(
        feedbackId: string,
        kind: 'photo' | 'video' | 'postProof',
        requester: { userId: string; role: string },
        options?: { download?: boolean },
    ): Promise<{ url: string | null }> {
        const fb = await this.prisma.courseFeedback.findFirst({
            where: { id: feedbackId, active: true },
            include: {
                student: { select: { userId: true, user: { select: { name: true } } } },
                class: { include: { course: { select: { name: true } } } },
                certificate: { select: { verificationCode: true } },
            },
        });
        if (!fb) throw new NotFoundException('Feedback não encontrado');

        const isStudentOwner = fb.student.userId === requester.userId;
        const isAdmin = ['ADMIN', 'COORDINATOR', 'FINANCIAL'].includes(requester.role);
        if (!isStudentOwner && !isAdmin) {
            throw new ForbiddenException('Sem permissão para acessar esta mídia');
        }

        const fbAny = fb as any;
        const key =
            kind === 'photo' ? fb.currentPhotoUrl :
            kind === 'video' ? fb.currentVideoUrl :
            kind === 'postProof' ? (fbAny.socialPostProofUrl ?? null) :
            null;
        if (!key) return { url: null };

        // Deriva filename para download legible
        let downloadFilename: string | undefined;
        if (options?.download) {
            const ext = (key.match(/\.[a-zA-Z0-9]{2,5}$/)?.[0] ?? (kind === 'video' ? '.mp4' : '.jpg'));
            const studentSlug = (fb.student.user.name || 'aluno')
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '')
                .toLowerCase()
                .slice(0, 40) || 'aluno';
            const courseSlug = (fb.class.course.name || 'curso')
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '')
                .toLowerCase()
                .slice(0, 30) || 'curso';
            const kindSlug = kind === 'postProof' ? 'print_post' : kind;
            downloadFilename = `feedback_${studentSlug}_${courseSlug}_${kindSlug}${ext}`;
        }

        try {
            const url = await this.minio.presignedGetUrl(key, 900, downloadFilename ? { downloadFilename } : undefined);
            return { url };
        } catch (err) {
            this.logger.warn(`Falha ao gerar presigned GET para ${kind} do feedback ${feedbackId}: ${err}`);
            return { url: null };
        }
    }

    // ── KPIs ──────────────────────────────────────────────

    async kpis() {
        const [
            totalInvites,
            responded,
            approved,
            rejected,
            awaitingFinancial,
            pendingPaymentPipeline,
            paidPipeline,
            approvedRowsForSum,
        ] = await Promise.all([
            this.prisma.courseFeedback.count({ where: { active: true } }),
            this.prisma.courseFeedback.count({
                where: { active: true, status: { notIn: ['PENDING_STUDENT_RESPONSE', 'EXPIRED'] } },
            }),
            this.prisma.courseFeedback.count({ where: { active: true, status: 'APPROVED' } }),
            this.prisma.courseFeedback.count({ where: { active: true, status: 'REJECTED' } }),
            this.prisma.courseFeedback.count({
                where: { active: true, status: 'CONTENT_APPROVED' },
            }),
            this.prisma.courseFeedback.count({
                where: {
                    active: true,
                    status: 'APPROVED',
                    rewardStatus: { not: 'PAID' },
                    OR: [
                        { contaPagarId: null },
                        { contaPagar: { status: { in: ['pendente', 'vencida'] } } },
                    ],
                },
            }),
            this.prisma.courseFeedback.count({
                where: {
                    active: true,
                    status: 'APPROVED',
                    OR: [{ rewardStatus: 'PAID' }, { contaPagar: { status: 'paga' } }],
                },
            }),
            this.prisma.courseFeedback.findMany({
                where: { active: true, status: 'APPROVED' },
                select: { pixAmount: true, contaPagar: { select: { valor: true } } },
            }),
        ]);

        const totalPaidValue = approvedRowsForSum.reduce((s, r) => {
            const fromFb = r.pixAmount != null ? Number(r.pixAmount) : 0;
            const fromConta = r.contaPagar?.valor != null ? Number(r.contaPagar.valor) : 0;
            return s + (fromFb > 0 ? fromFb : fromConta);
        }, 0);

        const avg = await this.prisma.courseFeedback.aggregate({
            where: {
                status: { in: ['APPROVED', 'SUBMITTED', 'CONTENT_APPROVED', 'REJECTED', 'REVERTED'] },
                active: true,
            },
            _avg: {
                ratingCourse: true,
                ratingSystem: true,
                ratingManagement: true,
                ratingTeachers: true,
                ratingGeneral: true,
            },
        });

        const submitted = await this.prisma.courseFeedback.count({
            where: { active: true, status: 'SUBMITTED' },
        });

        // KPIs do fluxo PIX em lote (batch)
        const PIX_BATCH_VALUE = 50; // R$ 50 fixo no CSV
        const [pendingBatchCount, paidBatchCount, cancelledBatchCount] = await Promise.all([
            this.prisma.courseFeedback.count({
                where: {
                    active: true,
                    sharedOnSocial: true,
                    rewardStatus: 'PENDING',
                    status: { in: ['SUBMITTED', 'APPROVED'] },
                    pixKey: { not: null },
                    contaPagarId: null,
                },
            }),
            this.prisma.courseFeedback.count({ where: { active: true, rewardStatus: 'PAID' } }),
            this.prisma.courseFeedback.count({ where: { active: true, rewardStatus: 'CANCELLED' } }),
        ]);

        return {
            totalInvites,
            responded,
            responseRate: totalInvites ? Math.round((responded / totalInvites) * 100) : 0,
            approved,
            rejected,
            submitted,
            awaitingFinancialConfirmation: awaitingFinancial,
            pendingPaymentPipeline,
            paidPipeline,
            totalPaidValue,
            ratings: avg._avg,
            // Batch (PIX em lote)
            pendingBatchCount,
            pendingBatchValue: pendingBatchCount * PIX_BATCH_VALUE,
            paidBatchCount,
            paidBatchValue: paidBatchCount * PIX_BATCH_VALUE,
            cancelledBatchCount,
            pixBatchUnitValue: PIX_BATCH_VALUE,
        };
    }

    // ── HELPERS ──────────────────────────────────────────────

    private static pushRejectionAudit(
        json: Prisma.JsonValue | null,
        entry: { reason: string; rejectedAt: string; reviewedBy: string },
    ): Prisma.InputJsonValue {
        const arr = json === null || json === undefined ? [] : Array.isArray(json) ? [...json] : [];
        return [...arr, entry] as unknown as Prisma.InputJsonValue;
    }

    private validatePixKey(type: PixKeyType, key: string) {
        const normalized = key.replace(/\D/g, '');
        if (type === 'CPF' && normalized.length !== 11) {
            throw new BadRequestException('CPF deve ter 11 dígitos');
        }
        if (type === 'EMAIL' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(key)) {
            throw new BadRequestException('E-mail inválido');
        }
        if (type === 'PHONE' && (normalized.length < 10 || normalized.length > 11)) {
            throw new BadRequestException('Telefone deve ter 10 ou 11 dígitos');
        }
        if (type === 'RANDOM' && key.length < 20) {
            throw new BadRequestException('Chave aleatória muito curta');
        }
    }
}
