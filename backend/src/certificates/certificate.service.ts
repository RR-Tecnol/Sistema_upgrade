import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * CertificateService — REQ-06 (Portal do Aluno)
 *
 * Schema real (schema.prisma @814):
 *   Certificate { id, studentId, classId, verificationCode, qrCodeUrl, fileUrl,
 *                 issuedAt, issuedBy, status, cancellationReason, cancelledAt, cancelledBy }
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
    constructor(private readonly prisma: PrismaService) {}

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

        const timestamp = Date.now().toString(36).toUpperCase();
        const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
        const verificationCode = `UPG-${timestamp}-${rand}`;

        return this.prisma.certificate.create({
            data: {
                studentId,
                classId,
                issuedBy,
                verificationCode,
                fileUrl: '', // Preenchido quando PDF for gerado pelo ReportsModule
                status: 'ACTIVE',
                issuedAt: new Date(),
            },
        });
    }

    /** Lista todos os certificados (admin) */
    async findAll() {
        return this.prisma.certificate.findMany({
            orderBy: { issuedAt: 'desc' },
            include: {
                student: { include: { user: { select: { name: true } } } },
                class: { include: { course: { select: { name: true, workloadHours: true } } } },
                issuer: { select: { name: true } },
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

    /** Verificação pública via código */
    async verify(code: string) {
        const cert = await this.prisma.certificate.findFirst({
            where: { verificationCode: code },
            include: {
                student: { include: { user: { select: { name: true } } } },
                class: {
                    include: {
                        course: { select: { name: true, workloadHours: true } },
                        city: { select: { name: true, state: true } },
                    },
                },
            },
        });
        if (!cert) throw new NotFoundException('Certificado não encontrado ou inválido');
        return cert;
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
                    include: {
                        course: { select: { name: true } },
                        attendances: { select: { studentId: true, present: true, date: true } },
                    },
                },
            },
        });

        const eligible: any[] = [];

        for (const enrollment of enrollments) {
            const cls = enrollment.class as any;
            if (!cls?.attendances) continue;

            const allDates = new Set(cls.attendances.map((a: any) => a.date?.toString())).size;
            if (allDates === 0) continue;

            const present = cls.attendances.filter(
                (a: any) => a.studentId === enrollment.studentId && a.present,
            ).length;
            const rate = Math.round((present / allDates) * 100);

            if (rate >= 75) {
                const hasCert = await this.prisma.certificate.findFirst({
                    where: { studentId: enrollment.studentId, classId: enrollment.classId, status: 'ACTIVE' },
                });
                if (!hasCert) {
                    eligible.push({
                        id: enrollment.studentId,
                        name: (enrollment.student as any)?.user?.name ?? 'Aluno',
                        cpf: (enrollment.student as any)?.cpf ?? '',
                        enrollmentId: enrollment.id,
                        classId: enrollment.classId,
                        courseName: cls.course?.name ?? '—',
                        classIdentifier: cls.classIdentifier ?? '—',
                        attendanceRate: rate,
                    });
                }
            }
        }

        return eligible;
    }
}
