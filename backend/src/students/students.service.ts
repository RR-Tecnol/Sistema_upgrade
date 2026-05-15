import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import {
    MIN_CERTIFICATE_ATTENDANCE_PCT,
    WARN_ATTENDANCE_PCT,
    type CertificateAttendanceRisk,
} from '../common/certificate-attendance.util';
import type { CertificateEligibilityBreakdown } from '../common/certificate-eligibility.util';
import { evaluateCertificateEligibilityForEnrollment } from '../common/certificate-enrollment-evaluation.helper';
import { mergeStudentDocuments, sanitizeStudentDocumentsPatch } from '../common/student-documents.util';
import type { UpdateStudentDocumentsDto } from './dto';

type CertificateProgressItem = CertificateEligibilityBreakdown & {
    classId: string;
    classIdentifier: string;
    courseName: string;
    workloadHours: number;
    classStatus: string;
    enrollmentStatus: string | null;
    certificate: { id: string; issuedAt: Date; status: string } | null;
    meetsMinimum: boolean;
    weekendPolicy: string;
};

@Injectable()
export class StudentsService {
    constructor(private readonly prisma: PrismaService) { }

    async getProfile(userId: string) {
        const student = await this.prisma.student.findFirst({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        phone: true,
                        role: true,
                        active: true,
                        createdAt: true,
                    },
                },
                contact: true,
                address: true,
                socioeconomic: true,
                professional: true,
                legalConsents: {
                    orderBy: { recordedAt: 'desc' },
                    take: 20,
                },
            },
        });

        if (!student) {
            throw new NotFoundException('Student profile not found');
        }

        return student;
    }

    async updateMyDocuments(userId: string, dto: UpdateStudentDocumentsDto) {
        const student = await this.prisma.student.findFirst({
            where: { userId },
            select: { id: true, documents: true },
        });
        if (!student) {
            throw new NotFoundException('Student profile not found');
        }
        const merged = mergeStudentDocuments(
            student.documents,
            sanitizeStudentDocumentsPatch(dto.documents as Record<string, unknown>),
        );
        await this.prisma.student.update({
            where: { id: student.id },
            data: { documents: merged },
        });
        return this.getProfile(userId);
    }

    async updatePassword(userId: string, currentPassword: string, newPassword: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // bcrypt.compare(undefined, hash) rejeita a promise ("Illegal arguments") → 500 sem este tratamento
        let isPasswordValid = false;
        try {
            isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        } catch {
            throw new BadRequestException(
                'Não foi possível validar a senha atual. Se o problema persistir, use redefinição de senha ou contate o suporte.',
            );
        }
        if (!isPasswordValid) {
            throw new BadRequestException('Current password is incorrect');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        return { message: 'Password updated successfully' };
    }

    async getEnrollments(userId: string) {
        const student = await this.prisma.student.findFirst({
            where: { userId },
        });

        if (!student) {
            throw new NotFoundException('Student not found');
        }

        return this.prisma.enrollment.findMany({
            where: { studentId: student.id },
            include: {
                class: {
                    include: {
                        course: true,
                        city: true,
                    },
                },
                documents: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async getClasses(userId: string) {
        const student = await this.prisma.student.findFirst({
            where: { userId },
        });

        if (!student) {
            throw new NotFoundException('Student not found');
        }

        // Turmas com inscrição efetiva (matriculado ou aprovado aguardando confirmação de matrícula)
        const enrollments = await this.prisma.enrollment.findMany({
            where: {
                studentId: student.id,
                status: { in: ['ENROLLED', 'APPROVED'] },
            },
            include: {
                class: {
                    include: {
                        course: true,
                        city: true,
                        group: true,
                        teachers: {
                            take: 12,
                            include: {
                                teacher: {
                                    include: {
                                        user: { select: { name: true } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        return enrollments.map(enrollment => enrollment.class);
    }

    async getAttendance(userId: string, classId?: string) {
        const student = await this.prisma.student.findFirst({
            where: { userId },
        });

        if (!student) {
            throw new NotFoundException('Student not found');
        }

        const where: any = { studentId: student.id };
        if (classId) {
            const allowed = await this.prisma.enrollment.findFirst({
                where: {
                    studentId: student.id,
                    classId,
                    status: { in: ['ENROLLED', 'APPROVED'] },
                },
            });
            if (!allowed) {
                throw new ForbiddenException(
                    'Você ainda não tem acesso a frequência desta turma. Aguarde a aprovação da inscrição ou consulte Minhas inscrições.',
                );
            }
            where.classId = classId;
        }

        return this.prisma.attendance.findMany({
            where,
            include: {
                class: {
                    include: {
                        course: true,
                    },
                },
            },
            orderBy: {
                date: 'desc',
            },
        });
    }

    async getCertificates(userId: string) {
        const student = await this.prisma.student.findFirst({
            where: { userId },
        });

        if (!student) {
            throw new NotFoundException('Student not found');
        }

        return this.prisma.certificate.findMany({
            where: { studentId: student.id },
            include: {
                class: {
                    include: {
                        course: true,
                    },
                },
            },
            orderBy: {
                issuedAt: 'desc',
            },
        });
    }

    // EXEC-04: Resumo real de frequência do aluno
    async getAttendanceSummary(userId: string) {
        const student = await this.prisma.student.findFirst({
            where: { userId },
            select: { id: true },
        });
        if (!student) return { totalClasses: 0, presentCount: 0, absentCount: 0, rate: 0 };
        const [total, present] = await Promise.all([
            this.prisma.attendance.count({ where: { studentId: student.id } }),
            this.prisma.attendance.count({ where: { studentId: student.id, present: true } }),
        ]);
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
        return { totalClasses: total, presentCount: present, absentCount: total - present, rate };
    }

    /**
     * Progresso de frequência por turma (inscrições ativas + turmas com certificado),
     * alinhado à regra de certificado (mín. 75% de dias efetivos / dias lançados).
     */
    async getCertificateAttendanceProgress(userId: string) {
        const student = await this.prisma.student.findFirst({
            where: { userId },
            select: { id: true },
        });
        if (!student) {
            throw new NotFoundException('Student not found');
        }

        type Agg = {
            classId: string;
            classIdentifier: string;
            courseName: string;
            workloadHours: number;
            classStatus: string;
            enrollmentStatus?: string;
            certificate?: { id: string; issuedAt: Date; status: string };
        };

        const byClass = new Map<string, Agg>();

        const enrollments = await this.prisma.enrollment.findMany({
            where: {
                studentId: student.id,
                status: { in: ['ENROLLED', 'APPROVED'] },
                class: { status: { not: 'CANCELLED' } },
            },
            include: {
                class: {
                    include: {
                        course: { select: { name: true, workloadHours: true } },
                    },
                },
            },
        });

        for (const e of enrollments) {
            byClass.set(e.classId, {
                classId: e.classId,
                classIdentifier: e.class.classIdentifier,
                courseName: e.class.course.name,
                workloadHours: e.class.course.workloadHours,
                classStatus: e.class.status,
                enrollmentStatus: e.status,
            });
        }

        const certificates = await this.prisma.certificate.findMany({
            where: { studentId: student.id },
            include: {
                class: {
                    include: {
                        course: { select: { name: true, workloadHours: true } },
                    },
                },
            },
        });

        for (const cert of certificates) {
            const cid = cert.classId;
            const prev = byClass.get(cid);
            if (!prev) {
                byClass.set(cid, {
                    classId: cid,
                    classIdentifier: cert.class.classIdentifier,
                    courseName: cert.class.course.name,
                    workloadHours: cert.class.course.workloadHours,
                    classStatus: cert.class.status,
                    certificate: { id: cert.id, issuedAt: cert.issuedAt, status: cert.status },
                });
            } else {
                byClass.set(cid, {
                    ...prev,
                    certificate: { id: cert.id, issuedAt: cert.issuedAt, status: cert.status },
                });
            }
        }

        const riskOrder: Record<CertificateAttendanceRisk, number> = {
            ok: 0,
            watch: 1,
            risk: 2,
            critical: 3,
        };

        const classIds = [...byClass.keys()];

        const classWeekendRows = classIds.length
            ? await this.prisma.class.findMany({
                where: { id: { in: classIds } },
                select: { id: true, weekendPolicy: true },
            })
            : [];
        const weekendById = new Map(classWeekendRows.map(c => [c.id, c.weekendPolicy]));

        const items: CertificateProgressItem[] = [];
        for (const agg of byClass.values()) {
            const evaluation = await evaluateCertificateEligibilityForEnrollment(
                this.prisma,
                student.id,
                agg.classId,
            );
            if (!evaluation) continue;

            const meetsMinimum =
                evaluation.certificateEligible ||
                evaluation.beforeCourseStart;

            items.push({
                classId: agg.classId,
                classIdentifier: agg.classIdentifier,
                courseName: agg.courseName,
                workloadHours: agg.workloadHours,
                classStatus: agg.classStatus,
                enrollmentStatus: agg.enrollmentStatus ?? null,
                certificate: agg.certificate
                    ? {
                        id: agg.certificate.id,
                        issuedAt: agg.certificate.issuedAt,
                        status: agg.certificate.status,
                    }
                    : null,
                weekendPolicy: weekendById.get(agg.classId) ?? 'FOLLOW_SCHEDULE',
                ...evaluation,
                meetsMinimum,
            });
        }

        items.sort((a, b) => {
            const dr = riskOrder[b.riskLevelAfterPenalty] - riskOrder[a.riskLevelAfterPenalty];
            if (dr !== 0) return dr;
            return (a.courseName || '').localeCompare(b.courseName || '', 'pt-BR');
        });

        let worstRisk: CertificateAttendanceRisk = 'ok';
        for (const it of items) {
            if (riskOrder[it.riskLevelAfterPenalty] > riskOrder[worstRisk]) {
                worstRisk = it.riskLevelAfterPenalty;
            }
        }

        return {
            minCertificateAttendancePct: MIN_CERTIFICATE_ATTENDANCE_PCT,
            warnAttendancePct: WARN_ATTENDANCE_PCT,
            worstRisk,
            items,
        };
    }
}
