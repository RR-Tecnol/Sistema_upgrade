import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto, EnrollmentStatus } from './dto/update-enrollment.dto';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class EnrollmentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsGateway,
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

        // 4. Create enrollment as APPROVED directly (admin action)
        const protocol = this.generateProtocol();
        const enrollment = await this.prisma.enrollment.create({
            data: { studentId, classId, protocol, status: 'APPROVED' },
            include: { student: { include: { user: true } }, class: { include: { course: true } } },
        });

        // 5. Create consent
        await this.prisma.enrollmentConsent.create({
            data: {
                enrollmentId: enrollment.id,
                dataProcessing: true, imageUse: true,
                termsAccepted: true, privacyPolicyAccepted: true,
                consentDate: new Date(),
            },
        });

        return enrollment;
    }

    async create(createEnrollmentDto: CreateEnrollmentDto) {
        // 1. Validate class exists and has open enrollment
        const classData = await this.prisma.class.findUnique({
            where: { id: createEnrollmentDto.classId },
            include: {
                course: true,
                _count: {
                    select: { enrollments: true },
                },
            },
        });

        if (!classData) {
            throw new NotFoundException('Turma não encontrada');
        }

        if (classData.status !== 'ENROLLMENT_OPEN') {
            throw new BadRequestException('Inscrições não estão abertas para esta turma');
        }

        // 2. Check if CPF is already enrolled in this class
        const existingEnrollment = await this.prisma.enrollment.findFirst({
            where: {
                classId: createEnrollmentDto.classId,
                student: {
                    cpf: createEnrollmentDto.cpf,
                },
            },
        });

        if (existingEnrollment) {
            throw new ConflictException('CPF já cadastrado nesta turma');
        }

        // 3. Check if class is full
        if (classData._count.enrollments >= classData.vacancies) {
            throw new BadRequestException('Turma sem vagas disponíveis');
        }

        // 4. Generate protocol number
        const protocol = this.generateProtocol();

        // 5. Create student if doesn't exist
        let student = await this.prisma.student.findUnique({
            where: { cpf: createEnrollmentDto.cpf },
        });

        if (!student) {
            // Create user first
            const user = await this.prisma.user.create({
                data: {
                    email: createEnrollmentDto.email,
                    name: createEnrollmentDto.fullName,
                    phone: createEnrollmentDto.phone,
                    role: 'STUDENT',
                    active: true,
                    // Password will be set later or sent via email
                    password: await this.hashPassword(this.generateTemporaryPassword()),
                },
            });

            // Create student profile
            student = await this.prisma.student.create({
                data: {
                    userId: user.id,
                    cpf: createEnrollmentDto.cpf,
                    rg: createEnrollmentDto.rg,
                    rgIssuer: createEnrollmentDto.rgIssuer,
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
                },
            });

            // Create contact
            await this.prisma.studentContact.create({
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

            // Create address
            await this.prisma.studentAddress.create({
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

            // Create socioeconomic data
            await this.prisma.studentSocioeconomic.create({
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

            // Create professional data
            await this.prisma.studentProfessional.create({
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

        // 6. Create enrollment
        const enrollment = await this.prisma.enrollment.create({
            data: {
                studentId: student.id,
                classId: createEnrollmentDto.classId,
                protocol,
                status: 'PENDING',
            },
            include: {
                student: {
                    include: {
                        user: true,
                    },
                },
                class: {
                    include: {
                        course: true,
                        city: true,
                    },
                },
            },
        });

        // 7. Create consent record
        await this.prisma.enrollmentConsent.create({
            data: {
                enrollmentId: enrollment.id,
                dataProcessing: createEnrollmentDto.dataProcessingConsent,
                imageUse: createEnrollmentDto.imageUseAuthorization,
                termsAccepted: createEnrollmentDto.termsAccepted,
                privacyPolicyAccepted: createEnrollmentDto.dataProcessingConsent,
                consentDate: new Date(),
            },
        });

        // SF-01: Emitir evento WebSocket em tempo real
        try {
            this.notifications.notifyAdmins('nova_inscricao', {
                studentName: enrollment.student?.user?.name,
                courseName: (enrollment.class as any)?.course?.name,
                cidade: (enrollment.class as any)?.city?.name,
                timestamp: new Date().toISOString(),
            });
        } catch { /* WS opcional */ }

        return enrollment;
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
                    },
                },
                class: {
                    include: {
                        course: true,
                        city: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async findOne(id: string) {
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

        return enrollment;
    }

    async approve(id: string, userId: string, notes?: string) {
        const enrollment = await this.findOne(id);

        if (enrollment.status !== 'PENDING' && enrollment.status !== 'WAITLIST') {
            throw new BadRequestException('Apenas matrículas pendentes ou em lista de espera podem ser aprovadas');
        }

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
            });
        } catch { /* WS opcional */ }

        return updated;
    }

    async reject(id: string, userId: string, rejectionReason: string) {
        const enrollment = await this.findOne(id);

        if (enrollment.status !== 'PENDING' && enrollment.status !== 'WAITLIST') {
            throw new BadRequestException('Apenas matrículas pendentes ou em lista de espera podem ser rejeitadas');
        }

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
            },
        });

        // TODO: Send rejection notification

        return updated;
    }

    async requestCorrection(id: string, correctionDetails: string) {
        const enrollment = await this.findOne(id);

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
        const enrollment = await this.findOne(id);

        if (enrollment.status !== 'PENDING' && enrollment.status !== 'APPROVED') {
            throw new BadRequestException('Apenas matrículas pendentes ou aprovadas podem ser movidas para lista de espera');
        }

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
        const bcrypt = require('bcrypt');
        return bcrypt.hash(password, 10);
    }
}
