import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { AbsenceType, AbsenceStatus, UserRole } from '@prisma/client';
import { attendanceDateUtcMidnightFrom } from '../common/certificate-eligibility.util';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsSenderService } from '../notifications/notifications-sender.service';
import { MinioService } from '../reimbursement/minio.service';
import { paginatedResult, resolvePagination } from '../common/pagination.util';
import {
    looksLikeAlreadyPresignedGetUrl,
    parseMinioPublicUrlToBucketKey,
} from '../reimbursement/minio-public-url.util';
import { isVpsStorageMode, resolveBrowserViewUrl } from '../common/minio-browser-url.util';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

/** `YYYY-MM-DD` em JS vira meia-noite UTC → em fusos atrás do UTC aparece dia anterior na UI. Normaliza como «dia civil» (meio-dia UTC). */
function parseCalendarDateOnlyOrThrow(dateInput: string): Date {
    const trimmed = dateInput.trim();
    const isoDay = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (isoDay) {
        const y = Number(isoDay[1]);
        const mo = Number(isoDay[2]) - 1;
        const d = Number(isoDay[3]);
        if (mo < 0 || mo > 11 || d < 1 || d > 31) throw new BadRequestException('Data inválida');
        const utc = new Date(Date.UTC(y, mo, d, 12, 0, 0, 0));
        if (utc.getUTCFullYear() !== y || utc.getUTCMonth() !== mo || utc.getUTCDate() !== d) {
            throw new BadRequestException('Data inválida');
        }
        return utc;
    }
    const t = new Date(trimmed);
    if (Number.isNaN(t.getTime())) throw new BadRequestException('Data inválida');
    return t;
}

@Injectable()
export class AbsencesService {
    constructor(
        private prisma: PrismaService,
        private notifications: NotificationsGateway,
        private notificationsSender: NotificationsSenderService,
        private minio: MinioService,
        private whatsapp: WhatsAppService,
    ) {}

    private dayStampUtc(d: Date): number {
        return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }

    /** Dias civis inclusivos entre início e fim da turma (UTC), no mínimo 1. */
    private inclusiveCalendarDaysBetweenUtc(start: Date, end: Date): number {
        const a = this.dayStampUtc(start);
        const b = this.dayStampUtc(end);
        const diffDays = Math.round((b - a) / 86400000);
        return Math.max(1, diffDays + 1);
    }

    /**
     * PENALIZED para aluno: cada registo conta 1 dia de deságio sobre o período planejado da turma —
     * percentual = 100 × 1 / totalDias período (arredondado a 2 casas).
     */
    private async computeStudentOneDayPenaltyPercent(
        absenceUserId: string,
        absenceDate: Date,
    ): Promise<{
        totalDays: number;
        percent: number;
        classIdentifier: string | null;
        courseName: string | null;
        usedFallback: boolean;
    }> {
        const student = await this.prisma.student.findUnique({
            where: { userId: absenceUserId },
            select: { id: true },
        });
        if (!student) {
            throw new BadRequestException('Não há ficha de aluno vinculada a este utilizador.');
        }

        const absStamp = this.dayStampUtc(absenceDate);

        const enrollments = await this.prisma.enrollment.findMany({
            where: {
                studentId: student.id,
                status: { in: ['ENROLLED', 'APPROVED'] },
            },
            include: {
                class: {
                    select: {
                        id: true,
                        classIdentifier: true,
                        startDate: true,
                        endDate: true,
                        course: {
                            select: {
                                durationDaysMA: true,
                                durationDaysPI: true,
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: { enrolledAt: 'desc' },
        });

        if (enrollments.length === 0) {
            const totalDaysFallback = 180;
            const percentRaw = (100 / totalDaysFallback) * 1;
            const percent = Math.round(percentRaw * 100) / 100;
            return {
                totalDays: totalDaysFallback,
                percent,
                classIdentifier: null,
                courseName: null,
                usedFallback: true,
            };
        }

        const overlaps = enrollments.filter((e) => {
            const s = this.dayStampUtc(e.class.startDate);
            const ed = this.dayStampUtc(e.class.endDate);
            return absStamp >= s && absStamp <= ed;
        });

        const pick = overlaps[0] ?? enrollments[0];

        let totalDays = this.inclusiveCalendarDaysBetweenUtc(pick.class.startDate, pick.class.endDate);
        const courseDur = Math.max(
            Number(pick.class.course?.durationDaysMA) || 0,
            Number(pick.class.course?.durationDaysPI) || 0,
        );
        if (totalDays <= 0 || totalDays > 365 * 5) {
            totalDays = Math.max(courseDur, 1);
        }

        const percentRaw = (100 / totalDays) * 1;
        const percent = Math.round(percentRaw * 100) / 100;

        return {
            totalDays,
            percent,
            classIdentifier: pick.class.classIdentifier ?? null,
            courseName: pick.class.course?.name ?? null,
            usedFallback: false,
        };
    }

    /**
     * Imprevisto VALIDATED → alinha com `Attendance.justified`, mesma turma/decisão que o cálculo de penalidade usa.
     * Não cria lançamentos de falta ausentes (`REJECTED` sem PENALIZED não altera frequência aqui).
     */
    private async syncAttendanceJustifiedForValidatedStudentAbsence(
        absenceUserId: string,
        absenceDate: Date,
    ): Promise<void> {
        const student = await this.prisma.student.findUnique({
            where: { userId: absenceUserId },
            select: { id: true },
        });
        if (!student) return;

        const enrollments = await this.prisma.enrollment.findMany({
            where: {
                studentId: student.id,
                status: { in: ['ENROLLED', 'APPROVED'] },
            },
            include: {
                class: {
                    select: {
                        id: true,
                        startDate: true,
                        endDate: true,
                    },
                },
            },
            orderBy: { enrolledAt: 'desc' },
        });
        if (enrollments.length === 0) return;

        const absStamp = this.dayStampUtc(absenceDate);
        const overlaps = enrollments.filter(e => {
            const s = this.dayStampUtc(e.class.startDate);
            const ed = this.dayStampUtc(e.class.endDate);
            return absStamp >= s && absStamp <= ed;
        });
        const pick = overlaps[0] ?? enrollments[0];
        const dateSlot = attendanceDateUtcMidnightFrom(absenceDate);

        await this.prisma.attendance.updateMany({
            where: {
                classId: pick.class.id,
                studentId: student.id,
                date: dateSlot,
            },
            data: { justified: true },
        });
    }

    /** [Admin] Estimativa antes de aplicar PENALIZED a aluno. */
    async studentPenaltyPreviewByAbsenceId(absenceId: string) {
        const absence = await this.prisma.absence.findFirst({
            where: { id: absenceId, active: true },
            include: {
                user: { select: { id: true, role: true } },
            },
        });
        if (!absence) throw new NotFoundException('Imprevisto não encontrado');
        if (absence.user.role !== 'STUDENT') {
            throw new ForbiddenException(
                'Esta pré-visualização só aplica-se a imprevistos de alunos — colaboradores usam valor em R$ ao rever.',
            );
        }
        return this.computeStudentOneDayPenaltyPercent(absence.userId, absence.date);
    }

    // Driver: lista suas próprias ausências
    async findByUser(userId: string) {
        return this.prisma.absence.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
        });
    }

    // Driver: registra imprevisto
    async create(userId: string, data: { type: string; date: string; description: string; documentUrl?: string }) {
        return this.prisma.absence.create({
            data: {
                userId,
                type: data.type as AbsenceType,
                date: parseCalendarDateOnlyOrThrow(data.date),
                description: data.description,
                documentUrl: data.documentUrl ?? null,
                status: AbsenceStatus.PENDING,
            },
        }).then(async absence => {
            // PASSO 3.1: notificar admins — WS em try/catch SEPARADO
            try {
                const reporter = await this.prisma.user.findUnique({
                    where: { id: userId },
                    select: { name: true },
                });
                this.notifications.notifyAdmins('imprevisto_cadastrado', {
                    absenceId: absence.id,
                    userId,
                    type: data.type,
                    date: data.date,
                    timestamp: new Date().toISOString(),
                    actorName: reporter?.name ?? undefined,
                    actorUserId: userId,
                });
            } catch { /* WS nunca causa rollback */ }
            return absence;
        });
    }

    // Admin: lista todas as ausências com filtros (apenas activas por padrão)
    async findAll(
        status?: string,
        userId?: string,
        opts?: { page?: number; limit?: number },
    ) {
        const where: any = { active: true };
        if (status) where.status = status;
        if (userId) where.userId = userId;

        const { skip, page, limit } = resolvePagination(opts?.page, opts?.limit, 20);
        const include = {
            user: { select: { id: true, name: true, role: true, email: true } },
        };

        const [data, total] = await Promise.all([
            this.prisma.absence.findMany({
                where,
                orderBy: { date: 'desc' },
                include,
                skip,
                take: limit,
            }),
            this.prisma.absence.count({ where }),
        ]);

        return paginatedResult(data, total, page, limit);
    }

    // Admin: cria imprevisto manualmente (PASSO 3.6)
    async createByAdmin(
        targetUserId: string,
        data: { type: string; date: string; description: string; documentUrl?: string },
        adminId?: string,
    ) {
        const admin = adminId
            ? await this.prisma.user.findUnique({ where: { id: adminId }, select: { name: true } })
            : null;
        const created = await this.prisma.absence.create({
            data: {
                userId: targetUserId,
                type: data.type as AbsenceType,
                date: parseCalendarDateOnlyOrThrow(data.date),
                description: data.description,
                documentUrl: data.documentUrl ?? null,
                status: AbsenceStatus.PENDING,
            },
            include: {
                user: { select: { id: true, name: true, role: true, email: true } },
            },
        });

        const role = created.user?.role ?? 'STUDENT';
        try {
            this.notifications.notifyFinanceiroListagemRefresh({
                source: 'imprevisto_admin_create',
                absenceId: created.id,
            });
            const notificationId = await this.notificationsSender
                .absenceCreatedByAdminForUser(
                    targetUserId,
                    role,
                    data.description,
                    data.date,
                    adminId,
                    admin?.name || undefined,
                )
                .catch(() => undefined as string | undefined);
            this.notifications.notifyUser(targetUserId, 'imprevisto_cadastrado_por_admin', {
                absenceId: created.id,
                type: data.type,
                date: data.date,
                adminName: admin?.name || null,
                actorName: admin?.name ?? undefined,
                actorUserId: adminId,
                timestamp: new Date().toISOString(),
                ...(notificationId ? { notificationId } : {}),
            });
        } catch { /* WS / e-mail não bloqueiam */ }

        return created;
    }

    // Admin: edita dados de um imprevisto (PASSO 3.6)
    async update(
        id: string,
        data: { type?: string; date?: string; description?: string },
    ) {
        const absence = await this.prisma.absence.findUnique({ where: { id } });
        if (!absence) throw new NotFoundException('Imprevisto não encontrado');
        return this.prisma.absence.update({
            where: { id },
            data: {
                ...(data.type && { type: data.type as AbsenceType }),
                ...(data.date && { date: parseCalendarDateOnlyOrThrow(data.date) }),
                ...(data.description && { description: data.description }),
            },
            include: {
                user: { select: { id: true, name: true, role: true, email: true } },
            },
        });
    }

    // Admin: soft delete (PASSO 3.6 + LIVRO_DE_REGRAS §3)
    async remove(id: string) {
        const absence = await this.prisma.absence.findUnique({ where: { id } });
        if (!absence) throw new NotFoundException('Imprevisto não encontrado');
        return this.prisma.absence.update({
            where: { id },
            data: { active: false },
        });
    }
    async review(
        id: string,
        adminId: string,
        data: {
            status: 'VALIDATED' | 'REJECTED' | 'PENALIZED';
            adminNote?: string;
            penalty?: number;
        },
    ) {
        const absence = await this.prisma.absence.findUnique({
            where: { id },
            include: { user: { select: { id: true, name: true, role: true } } },
        });
        const admin = await this.prisma.user.findUnique({ where: { id: adminId }, select: { name: true } });
        if (!absence) throw new NotFoundException('Imprevisto não encontrado');

        const status = data.status as AbsenceStatus;

        let penaltyResolved: number | null = null;
        let penalidadeNotificacaoExtra: string | undefined;

        if (status === AbsenceStatus.PENALIZED) {
            if (absence.user.role === 'STUDENT') {
                const est = await this.computeStudentOneDayPenaltyPercent(absence.userId, absence.date);
                penaltyResolved = est.percent;
                const pctStr = est.percent.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });
                const turmaOuCurso = [est.courseName, est.classIdentifier].filter(Boolean).join(' · ');
                const faltaMatricula = est.usedFallback
                    ? 'Sem matrícula ENROLLED/APPROVED ativa — base provisória de 180 dias. '
                    : '';
                penalidadeNotificacaoExtra =
                    faltaMatricula +
                    `Equivale a 1 dia face a ${est.totalDays} dias do período${turmaOuCurso ? ` (${turmaOuCurso})` : ''}: ${pctStr}% da carga prevista entre início e fim da turma.`;
            } else if (
                data.penalty != null &&
                Number.isFinite(Number(data.penalty)) &&
                Number(data.penalty) > 0
            ) {
                penaltyResolved = Number(data.penalty);
                penalidadeNotificacaoExtra =
                    penaltyResolved !== null ? `Valor de retenção registrado: R$ ${penaltyResolved.toFixed(2).replace('.', ',')}.` : undefined;
            } else {
                penaltyResolved = null;
            }
        } else {
            penaltyResolved = null;
        }

        const updated = await this.prisma.absence.update({
            where: { id },
            data: {
                status,
                adminNote: data.adminNote ?? null,
                penalty: penaltyResolved,
                reviewedBy: adminId,
                reviewedAt: new Date(),
            },
            include: {
                user: { select: { id: true, name: true, role: true, email: true } },
            },
        });

        if (status === AbsenceStatus.VALIDATED && absence.user.role === UserRole.STUDENT) {
            try {
                await this.syncAttendanceJustifiedForValidatedStudentAbsence(absence.userId, absence.date);
            } catch {
                /* frequência opcional nesta data — não falha revisão */
            }
        }

        const userRole = updated.user?.role ?? absence.user?.role ?? 'STUDENT';
        try {
            this.notifications.notifyFinanceiroListagemRefresh({
                source: 'absence_review',
                absenceId: id,
            });
            const notificationId = await this.notificationsSender
                .absenceReviewedForUser(
                    absence.userId,
                    userRole,
                    data.status,
                    absence.description,
                    data.adminNote,
                    adminId,
                    admin?.name || undefined,
                    penalidadeNotificacaoExtra,
                )
                .catch(() => undefined as string | undefined);
            this.notifications.notifyUser(absence.userId, 'imprevisto_revisado', {
                absenceId: id,
                status: data.status,
                adminNote: data.adminNote ?? null,
                penalty: penaltyResolved,
                reviewedByName: admin?.name || null,
                actorName: admin?.name ?? undefined,
                actorUserId: adminId,
                timestamp: new Date().toISOString(),
                ...(notificationId ? { notificationId } : {}),
            });
        } catch { /* WS / persistência secundária */ }

        // ── WHATSAPP: notificar resultado da revisão de imprevisto ──────────────
        try {
            void this.whatsapp.notifyAbsenceReviewed(
                absence.userId,
                absence.user?.name || 'Usuário',
                data.status,
                absence.description,
                data.adminNote,
            );
        } catch { /* WhatsApp nunca bloqueia */ }

        return updated;
    }

    /**
     * URL GET assinada para documento de imprevisto (mesmo bucket / padrão de URL que reembolsos).
     */
    async getDocumentPresignedViewUrl(
        absenceId: string,
        callerId: string,
        callerRole: string,
        opts: { adminRoute: boolean },
    ) {
        const absence = await this.prisma.absence.findFirst({
            where: { id: absenceId, active: true },
        });
        if (!absence) throw new NotFoundException('Imprevisto não encontrado');

        const privileged = ['IT_ADMIN', 'ADMIN', 'COORDINATOR', 'FINANCIAL'].includes(callerRole);
        if (opts.adminRoute) {
            if (!['ADMIN', 'COORDINATOR'].includes(callerRole)) {
                throw new ForbiddenException();
            }
        } else if (!privileged && absence.userId !== callerId) {
            throw new ForbiddenException('Sem permissão para este documento');
        }

        const raw = absence.documentUrl?.trim();
        if (!raw) throw new BadRequestException('Nenhum documento anexado');

        const browserUrl = resolveBrowserViewUrl(raw);
        if (browserUrl) {
            return { url: browserUrl, expiresIn: 0 };
        }

        if (looksLikeAlreadyPresignedGetUrl(raw)) {
            return { url: raw, expiresIn: 0 };
        }

        const parsed = parseMinioPublicUrlToBucketKey(raw);
        if (!parsed) {
            throw new BadRequestException('URL do documento não reconhecida para leitura segura');
        }

        if (isVpsStorageMode()) {
            throw new BadRequestException(
                'URL do documento não reconhecida. Anexe novamente pelo portal ou contacte o suporte.',
            );
        }

        const expirySeconds = 3600;
        try {
            const url = await this.minio.presignedGetUrl(parsed.bucket, parsed.key, expirySeconds);
            return { url, expiresIn: expirySeconds };
        } catch {
            throw new BadRequestException('Não foi possível gerar link de visualização');
        }
    }
}
