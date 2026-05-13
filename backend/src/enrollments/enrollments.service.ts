import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto, EnrollmentStatus } from './dto/update-enrollment.dto';
import { Prisma, NotificationType } from '@prisma/client';
import { isStudentDocumentsComplete, getMissingRequiredStudentDocumentLabels } from '../common/student-documents.util';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsSenderService } from '../notifications/notifications-sender.service';

/** Metadados opcionais da requisição pública (LGPD — prova de quando/como o consentimento foi recolhido) */
export type PublicEnrollmentRequestMeta = {
    ipAddress?: string;
    userAgent?: string;
};

@Injectable()
export class EnrollmentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsGateway,
        private readonly notificationsSender: NotificationsSenderService,
    ) { }

    async adminEnroll(studentId: string, classId: string) {
        // 1. Validate student exists
        const student = await this.prisma.student.findUnique({ where: { id: studentId } });
        if (!student) throw new NotFoundException('Aluno não encontrado');

        // 2. Validate class exists
        const classData = await this.prisma.class.findUnique({ where: { id: classId } });
        if (!classData) throw new NotFoundException('Turma não encontrada');

        // 3. Check duplicate
        const existing = await this.prisma.enrollment.findFirst({ where: { studentId, classId } });
        if (existing) throw new ConflictException('Aluno já inscrito nesta turma');

        // 4. Criação manual também inicia em triagem (PENDING)
        const protocol = this.generateProtocol();
        const enrollment = await this.prisma.enrollment.create({
            data: { studentId, classId, protocol, status: 'PENDING' },
            include: { student: { include: { user: true } }, class: { include: { course: true } } },
        });

        // 5. Create consent
        await this.prisma.enrollmentConsent.create({
            data: {
                enrollmentId: enrollment.id,
                dataProcessing: true, imageUse: true,
                termsAccepted: true, privacyPolicyAccepted: true,
                attendanceCommitment: true,
                consentDate: new Date(),
            },
        });

        await this.prisma.studentLegalConsent.create({
            data: {
                studentId,
                enrollmentId: enrollment.id,
                termsAccepted: true,
                dataProcessingConsent: true,
                imageUseAuthorization: true,
                attendanceCommitment: true,
                privacyPolicyAccepted: true,
            },
        });

        if (!isStudentDocumentsComplete(enrollment.student.documents)) {
            try {
                const missing = getMissingRequiredStudentDocumentLabels(enrollment.student.documents);
                const userId = enrollment.student.user.id;
                const message =
                    missing.length > 0
                        ? `Complete no portal os documentos obrigatórios em falta: ${missing.join(', ')}.`
                        : 'Complete a documentação obrigatória em Meu perfil.';
                const { id: notificationId } = await this.notificationsSender.send({
                    userId,
                    type: NotificationType.GENERAL_ANNOUNCEMENT,
                    title: 'Documentação pendente',
                    message,
                    link: '/student/profile#documentos',
                    extraData: { kind: 'documentacao_pendente', enrollmentId: enrollment.id },
                });
                this.notifications.notifyUser(userId, 'documentacao_pendente', {
                    notificationId,
                    timestamp: new Date().toISOString(),
                });
            } catch {
                /* não bloquear matrícula manual */
            }
        }

        return enrollment;
    }

    async create(createEnrollmentDto: CreateEnrollmentDto, meta?: PublicEnrollmentRequestMeta) {
        // Validações FORA da transação (leituras sem lock)
        const classData = await this.prisma.class.findUnique({
            where: { id: createEnrollmentDto.classId },
            include: { course: true },
        });
        if (!classData) throw new NotFoundException('Turma não encontrada');
        if (classData.status !== 'ENROLLMENT_OPEN') {
            throw new BadRequestException('Inscrições não estão abertas para esta turma');
        }

        // Verificar CPF duplicado fora da transação
        const existingEnrollment = await this.prisma.enrollment.findFirst({
            where: {
                classId: createEnrollmentDto.classId,
                student: { cpf: createEnrollmentDto.cpf },
            },
        });
        if (existingEnrollment) throw new ConflictException('CPF já cadastrado nesta turma');

        // Protocolo gerado antes da transação
        const protocol = this.generateProtocol();

        // ── TRANSAÇÃO ATÔMICA ──────────────────────────────────
        // Re-verifica vagas DENTRO da transação para eliminar
        // race condition TOCTOU entre check e insert.
        const { enrollment, reusedExistingStudentAccount } = await this.prisma.$transaction(async (tx) => {

            // Re-verificar vagas com lock implícito do Prisma
            const freshClass = await tx.class.findUnique({
                where: { id: createEnrollmentDto.classId },
                include: { _count: { select: { enrollments: true } } },
            });
            if (!freshClass) throw new NotFoundException('Turma não encontrada');
            if (freshClass._count.enrollments >= freshClass.vacancies) {
                throw new BadRequestException('Turma sem vagas disponíveis');
            }

            // Criar ou buscar aluno DENTRO da transação
            let student = await tx.student.findUnique({
                where: { cpf: createEnrollmentDto.cpf },
            });
            /** Já existia aluno com este CPF — não se criou User/senha nova; só nova inscrição na turma */
            const reusedExistingStudentAccount = !!student;

            if (!student) {
                const user = await tx.user.create({
                    data: {
                        email: createEnrollmentDto.email,
                        name: createEnrollmentDto.fullName,
                        phone: createEnrollmentDto.phone,
                        role: 'STUDENT',
                        active: true,
                        // Usa a senha definida pelo próprio aluno no formulário
                        password: await this.hashPassword(createEnrollmentDto.password),
                    },
                });
                student = await tx.student.create({
                    data: {
                        userId: user.id,
                        cpf: createEnrollmentDto.cpf,
                        birthDate: new Date(createEnrollmentDto.birthDate),
                        gender: createEnrollmentDto.gender,
                        raceColor: createEnrollmentDto.raceColor,
                        maritalStatus: createEnrollmentDto.maritalStatus,
                        motherName: createEnrollmentDto.motherName,
                        fatherName: createEnrollmentDto.fatherName,
                        nationality: createEnrollmentDto.nationality,
                        birthCity: createEnrollmentDto.birthCity,
                        birthState: createEnrollmentDto.birthState,
                        socialName: createEnrollmentDto.socialName,
                        documents: createEnrollmentDto.documents || {},
                    },
                });
                await tx.studentContact.create({
                    data: {
                        studentId: student.id,
                        email: createEnrollmentDto.email,
                        phone: createEnrollmentDto.phone,
                        hasWhatsapp: createEnrollmentDto.hasWhatsApp,
                        phoneAlt: createEnrollmentDto.phoneAlt,
                        allowWhatsappContact: createEnrollmentDto.allowWhatsAppContact,
                        allowEmailContact: createEnrollmentDto.allowEmailContact,
                    },
                });
                await tx.studentAddress.create({
                    data: {
                        studentId: student.id,
                        cep: createEnrollmentDto.cep,
                        street: createEnrollmentDto.street,
                        number: createEnrollmentDto.number,
                        complement: createEnrollmentDto.complement,
                        neighborhood: createEnrollmentDto.neighborhood,
                        city: createEnrollmentDto.city,
                        state: createEnrollmentDto.state,
                        zone: createEnrollmentDto.zone,
                    },
                });
                await tx.studentSocioeconomic.create({
                    data: {
                        studentId: student.id,
                        educationLevel: createEnrollmentDto.educationLevel,
                        employmentStatus: createEnrollmentDto.employmentStatus,
                        familyIncome: createEnrollmentDto.familyIncome,
                        familyMembersCount: createEnrollmentDto.familyMembersCount,
                        socialProgram: createEnrollmentDto.socialProgram,
                        hasDisability: createEnrollmentDto.hasDisability,
                        disabilityType: createEnrollmentDto.disabilityType,
                        disabilityAdaptation: createEnrollmentDto.disabilityAdaptation,
                    },
                });
                await tx.studentProfessional.create({
                    data: {
                        studentId: student.id,
                        previousQualification: createEnrollmentDto.previousQualification,
                        professionalInterest: createEnrollmentDto.professionalInterest,
                        careerGoal: createEnrollmentDto.careerGoal,
                        howHeardAbout: createEnrollmentDto.howHeardAbout,
                        ...(createEnrollmentDto.motivation ? { motivation: createEnrollmentDto.motivation } : {}),
                    },
                });
            }

            // Criar enrollment DENTRO da transação
            const newEnrollment = await tx.enrollment.create({
                data: {
                    studentId: student.id,
                    classId: createEnrollmentDto.classId,
                    protocol,
                    status: 'PENDING',
                },
                include: {
                    student: { include: { user: true } },
                    class: { include: { course: true, city: true } },
                },
            });

            // Consentimento da inscrição (por turma) + registo no perfil do aluno (LGPD)
            await tx.enrollmentConsent.create({
                data: {
                    enrollmentId: newEnrollment.id,
                    dataProcessing: createEnrollmentDto.dataProcessingConsent,
                    imageUse: createEnrollmentDto.imageUseAuthorization,
                    termsAccepted: createEnrollmentDto.termsAccepted,
                    privacyPolicyAccepted: createEnrollmentDto.dataProcessingConsent,
                    attendanceCommitment: createEnrollmentDto.attendanceCommitment,
                    consentDate: new Date(),
                    ipAddress: meta?.ipAddress,
                    userAgent: meta?.userAgent,
                },
            });

            await tx.studentLegalConsent.create({
                data: {
                    studentId: student.id,
                    enrollmentId: newEnrollment.id,
                    termsAccepted: createEnrollmentDto.termsAccepted,
                    dataProcessingConsent: createEnrollmentDto.dataProcessingConsent,
                    imageUseAuthorization: createEnrollmentDto.imageUseAuthorization,
                    attendanceCommitment: createEnrollmentDto.attendanceCommitment,
                    privacyPolicyAccepted: createEnrollmentDto.dataProcessingConsent,
                    ipAddress: meta?.ipAddress,
                    userAgent: meta?.userAgent,
                },
            });

            return { enrollment: newEnrollment, reusedExistingStudentAccount };
        }); // ── FIM DA TRANSAÇÃO ──────────────────────────────────

        // Notificação WS FORA da transação
        // (operação externa — nunca deve bloquear rollback)
        try {
            this.notifications.notifyAdmins('nova_inscricao', {
                studentName: enrollment.student?.user?.name,
                courseName: (enrollment.class as any)?.course?.name,
                cidade: (enrollment.class as any)?.city?.name,
                timestamp: new Date().toISOString(),
            });

            if (enrollment.student?.user?.name) {
                await this.notificationsSender.newStudentRegistration(enrollment.student.user.name);
            }
        } catch { /* WS opcional — nunca bloqueia a inscrição */ }

        return {
            ...enrollment,
            protocol: enrollment.protocol,
            reusedExistingStudentAccount,
        };
    }

    async findAll(filters?: {
        status?: EnrollmentStatus;
        classId?: string;
        search?: string;
    }) {
        const where: Prisma.EnrollmentWhereInput = {};

        if (filters?.status) {
            where.status = filters.status;
        }

        if (filters?.classId) {
            where.classId = filters.classId;
        }

        if (filters?.search) {
            where.OR = [
                { protocol: { contains: filters.search, mode: 'insensitive' } },
                { student: { user: { name: { contains: filters.search, mode: 'insensitive' } } } },
                { student: { cpf: { contains: filters.search } } },
            ];
        }

        return this.prisma.enrollment.findMany({
            where,
            include: {
                student: {
                    include: {
                        user: true,
                        contact: { select: { email: true, phone: true } },
                        address: { select: { city: true, state: true } },
                    },
                },
                class: {
                    include: {
                        course: true,
                        city: true,
                        group: { select: { name: true, state: true } },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async findOne(id: string, requesterId?: string, requesterRole?: string) {
        const enrollment = await this.prisma.enrollment.findUnique({
            where: { id },
            include: {
                student: {
                    include: {
                        user: true,
                        contact: true,
                        address: true,
                        socioeconomic: true,
                        professional: true,
                    },
                },
                class: {
                    include: {
                        course: true,
                        city: true,
                        group: true,
                    },
                },
                documents: true,
                consents: true,
            },
        });

        if (!enrollment) {
            throw new NotFoundException('Matrícula não encontrada');
        }

        // VULN-09: verificação de propriedade — aluno só vê a própria inscrição
        // Admin, Coordinator, Teacher podem ver qualquer inscrição
        const allowedRoles = ['ADMIN', 'COORDINATOR', 'TEACHER', 'FINANCIAL'];
        if (requesterId && requesterRole && !allowedRoles.includes(requesterRole)) {
            const isOwner = enrollment.student?.user?.id === requesterId;
            if (!isOwner) {
                throw new ForbiddenException('Você não tem permissão para visualizar esta inscrição');
            }
        }

        return enrollment;
    }

    async approve(id: string, userId: string, notes?: string) {
        const enrollment = await this.findOne(id);
        const reviewer = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

        const updated = await this.prisma.enrollment.update({
            where: { id },
            data: {
                status: 'APPROVED',
                reviewedAt: new Date(),
                reviewedBy: userId,
                notes,
            },
            include: {
                student: {
                    include: {
                        user: true,
                        contact: true,
                    },
                },
                class: {
                    include: {
                        course: true,
                    },
                },
            },
        });

        // SF-01: Emitir evento WebSocket em tempo real
        try {
            this.notifications.notifyAdmins('inscricao_aprovada', {
                studentName: updated.student?.user?.name,
                courseName: (updated.class as any)?.course?.name,
                timestamp: new Date().toISOString(),
                actorName: reviewer?.name ?? undefined,
                actorUserId: userId,
            });

            // Dispara notificação no banco para o Aluno
            if (updated.student?.userId) {
                await this.notificationsSender.enrollmentApproved(
                    updated.student.userId,
                    (updated.class as any)?.course?.name || 'Curso',
                    userId,
                    reviewer?.name || undefined,
                );
            }
        } catch { /* WS opcional */ }

        return updated;
    }

    async reject(id: string, userId: string, rejectionReason: string) {
        const enrollment = await this.findOne(id);
        const reviewer = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

        const updated = await this.prisma.enrollment.update({
            where: { id },
            data: {
                status: 'REJECTED',
                reviewedAt: new Date(),
                reviewedBy: userId,
                rejectionReason,
            },
            include: {
                student: {
                    include: {
                        user: true,
                        contact: true,
                    },
                },
                class: {
                    include: {
                        course: true,
                    },
                },
            },
        });

        try {
            this.notifications.notifyAdmins('inscricao_rejeitada', {
                studentName: updated.student?.user?.name,
                courseName: (updated.class as any)?.course?.name,
                rejectionReason,
                timestamp: new Date().toISOString(),
                actorName: reviewer?.name ?? undefined,
                actorUserId: userId,
            });

            if (updated.student?.userId) {
                await this.notificationsSender.enrollmentRejected(
                    updated.student.userId,
                    (updated as any).class?.course?.name || 'Curso',
                    rejectionReason,
                    userId,
                    reviewer?.name || undefined,
                );
            }
        } catch { /* WS nunca bloqueia */ }

        return updated;
    }

    async requestCorrection(id: string, correctionDetails: string) {
        await this.findOne(id);

        const updated = await this.prisma.enrollment.update({
            where: { id },
            data: {
                status: 'DOCUMENT_PENDING',
                notes: correctionDetails,
            },
            include: {
                student: {
                    include: {
                        user: true,
                        contact: true,
                    },
                },
            },
        });

        // TODO: Send correction request notification

        return updated;
    }

    async moveToWaitlist(id: string, userId: string, reason?: string) {
        await this.findOne(id);

        const updated = await this.prisma.enrollment.update({
            where: { id },
            data: {
                status: 'WAITLIST',
                reviewedAt: new Date(),
                reviewedBy: userId,
                notes: reason || 'Movido para lista de espera',
            },
            include: {
                student: {
                    include: {
                        user: true,
                        contact: true,
                    },
                },
                class: {
                    include: {
                        course: true,
                    },
                },
            },
        });

        // TODO: Send waitlist notification

        return updated;
    }

    async confirmEnrollment(id: string, userId: string) {
        await this.findOne(id);
        return this.prisma.enrollment.update({
            where: { id },
            data: { status: 'ENROLLED', reviewedAt: new Date(), reviewedBy: userId },
            include: { student: { include: { user: true } }, class: { include: { course: true } } },
        });
    }

    async moveToPending(id: string, userId: string, notes?: string) {
        await this.findOne(id);
        return this.prisma.enrollment.update({
            where: { id },
            data: {
                status: 'PENDING',
                reviewedAt: new Date(),
                reviewedBy: userId,
                ...(notes ? { notes } : {}),
            },
            include: {
                student: { include: { user: true, contact: true } },
                class: { include: { course: true } },
            },
        });
    }

    async getWaitlist(classId: string) {
        return this.prisma.enrollment.findMany({
            where: { classId, status: 'WAITLIST' },
            include: {
                student: { include: { user: true, contact: true } },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    /**
     * REQ-06 — Portal do Aluno
     * Retorna as matrículas do usuário autenticado com dados completos de turma.
     */
    async findByUserId(userId: string) {
        const student = await this.prisma.student.findFirst({ where: { userId } });
        if (!student) return [];

        return this.prisma.enrollment.findMany({
            where: { studentId: student.id },
            orderBy: { createdAt: 'desc' },
            include: {
                class: {
                    include: {
                        course: { select: { name: true, workloadHours: true } },
                        city: { select: { name: true, state: true } },
                        truck: { select: { identifier: true, state: true } },
                    },
                },
            },
        });
    }

    private generateProtocol(): string {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = crypto.randomBytes(3).toString('hex').toUpperCase();
        return `${timestamp}-${random}`;
    }

    private generateTemporaryPassword(): string {
        return crypto.randomBytes(8).toString('hex');
    }

    private async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, 10);
    }
}
