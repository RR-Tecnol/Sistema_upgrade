import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto, UpdateStudentDto } from './dto';
import * as bcrypt from 'bcryptjs';
import { NotificationType, Prisma } from '@prisma/client';
import {
    mergeStudentDocuments,
    sanitizeStudentDocumentsPatch,
    isStudentDocumentsComplete,
    getMissingRequiredStudentDocumentLabels,
} from '../common/student-documents.util';
import { NotificationsSenderService } from '../notifications/notifications-sender.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

interface StudentFilters {
    search?: string;
    state?: string;
    active?: boolean;
    page?: number;
    limit?: number;
    courseId?: string; // BUG-04: filtro por curso (REQ-13)
}

@Injectable()
export class AdminStudentsService {
    private readonly logger = new Logger(AdminStudentsService.name);

    constructor(
        private prisma: PrismaService,
        private readonly notificationsSender: NotificationsSenderService,
        private readonly notificationsGateway: NotificationsGateway,
    ) {}

    /** Notifica o aluno (in-app + WS) quando faltam documentos obrigatórios. */
    async notifyPendingDocuments(studentId: string): Promise<{ sent: boolean; message: string }> {
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
            select: { id: true, userId: true, documents: true },
        });
        if (!student) throw new NotFoundException('Student not found');
        if (isStudentDocumentsComplete(student.documents)) {
            return { sent: false, message: 'Documentação já está completa.' };
        }
        await this.sendDocumentsPendingNotification(student.userId, student.documents);
        return { sent: true, message: 'Lembrete enviado ao aluno.' };
    }

    private async sendDocumentsPendingNotification(userId: string, documentsJson: unknown): Promise<void> {
        try {
            const missing = getMissingRequiredStudentDocumentLabels(documentsJson as Prisma.JsonValue);
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
                extraData: { kind: 'documentacao_pendente' },
            });
            this.notificationsGateway.notifyUser(userId, 'documentacao_pendente', {
                notificationId,
                timestamp: new Date().toISOString(),
            });
        } catch (e) {
            this.logger.warn(`Falha ao notificar documentação pendente (userId=${userId}): ${e}`);
        }
    }

    async findAll(filters: StudentFilters) {
        const { search, state, active, page = 1, limit = 10, courseId } = filters;
        const skip = (page - 1) * limit;

        const where: any = {};

        // Search by name, CPF, or email
        if (search) {
            where.OR = [
                { user: { name: { contains: search, mode: 'insensitive' } } },
                { cpf: { contains: search.replace(/\D/g, '') } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
            ];
        }

        // Filter by state (from address)
        if (state) {
            where.address = { state };
        }

        // BUG-04: Filter by course — alunos matriculados neste curso
        if (courseId) {
            where.enrollments = { some: { class: { courseId } } };
        }

        // Filter by active status
        if (active !== undefined) {
            where.active = active;
        }

        const [students, total] = await Promise.all([
            this.prisma.student.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            active: true,
                        },
                    },
                    address: {
                        select: {
                            city: true,
                            state: true,
                            neighborhood: true,
                        },
                    },
                    contact: {
                        select: { email: true, phone: true },
                    },
                    _count: {
                        select: { enrollments: true },
                    },
                },
                orderBy: { user: { name: 'asc' } },
            }),
            this.prisma.student.count({ where }),
        ]);

        return {
            data: students,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getStats() {
        const [total, byStateRows, activeEnrollments] = await Promise.all([
            this.prisma.student.count(),
            this.prisma.studentAddress.groupBy({
                by: ['state'],
                _count: { _all: true },
            }),
            this.prisma.enrollment.count({ where: { status: 'APPROVED' } }),
        ]);

        const byState = byStateRows.reduce<Record<string, number>>((acc, row) => {
            const uf = (row.state || '').toUpperCase();
            if (!uf) return acc;
            acc[uf] = row._count._all;
            return acc;
        }, {});

        return {
            total,
            byState,
            activeEnrollments,
        };
    }

    async findOne(id: string) {
        const student = await this.prisma.student.findUnique({
            where: { id },
            include: {
                user: true,
                address: true,
                contact: true,
                socioeconomic: true,
                professional: true,
                enrollments: {
                    include: {
                        class: {
                            include: {
                                course: true,
                                city: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                attendances: {
                    include: {
                        class: {
                            include: {
                                course: true,
                            },
                        },
                    },
                    orderBy: { date: 'desc' },
                    take: 10,
                },
                certificates: {
                    include: {
                        class: {
                            include: {
                                course: true,
                            },
                        },
                    },
                    orderBy: { issuedAt: 'desc' },
                },
                legalConsents: {
                    orderBy: { recordedAt: 'desc' },
                    take: 30,
                },
            },
        });

        if (!student) {
            throw new NotFoundException('Student not found');
        }

        // Remove password from response
        const { password, ...userWithoutPassword } = student.user;
        return {
            ...student,
            user: userWithoutPassword,
        };
    }

    async create(createStudentDto: CreateStudentDto) {
        const {
            // User fields
            name, email, password, phone,
            // Student fields
            cpf, birthDate, gender, raceColor, maritalStatus,
            motherName, fatherName, nationality, birthCity, birthState, socialName,
            // Address fields
            cep, street, addressNumber, complement, neighborhood, city, state, zone,
            // Contact fields
            hasWhatsapp, phoneAlt, allowWhatsappContact, allowEmailContact,
            // Socioeconomic fields
            educationLevel, employmentStatus, familyIncome, familyMembersCount,
            socialProgram, hasDisability, disabilityType, disabilityAdaptation,
            publicSchoolOnly,
            // Professional fields
            previousQualification, professionalInterest, careerGoal, howHeardAbout, motivation,
            documents: documentsInput,
        } = createStudentDto;

        const mergedDocuments = mergeStudentDocuments(null, sanitizeStudentDocumentsPatch(documentsInput as Record<string, unknown>));

        // Check if CPF already exists
        const existingStudent = await this.prisma.student.findUnique({
            where: { cpf: cpf.replace(/\D/g, '') },
        });

        if (existingStudent) {
            throw new BadRequestException('CPF already registered');
        }

        // Check if email already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            throw new BadRequestException('Email already registered');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create student with all relations
        const student = await this.prisma.student.create({
            data: {
                cpf: cpf.replace(/\D/g, ''),
                birthDate: new Date(birthDate),
                gender,
                raceColor,
                maritalStatus,
                motherName,
                fatherName,
                nationality,
                birthCity,
                birthState,
                socialName,
                active: true,
                documents: Object.keys(mergedDocuments).length ? mergedDocuments : undefined,
                user: {
                    create: {
                        name,
                        email,
                        password: hashedPassword,
                        phone,
                        role: 'STUDENT',
                        active: true,
                    },
                },
                address: {
                    create: {
                        cep: cep.replace(/\D/g, ''),
                        street,
                        number: addressNumber,
                        complement,
                        neighborhood,
                        city,
                        state,
                        zone,
                    },
                },
                contact: {
                    create: {
                        email,
                        phone,
                        hasWhatsapp,
                        phoneAlt,
                        allowWhatsappContact,
                        allowEmailContact,
                    },
                },
                socioeconomic: {
                    create: {
                        educationLevel,
                        employmentStatus,
                        familyIncome,
                        familyMembersCount,
                        socialProgram,
                        hasDisability,
                        disabilityType,
                        disabilityAdaptation,
                        publicSchoolOnly: (publicSchoolOnly ?? false) as any, // REQ-03 — campo adicionado via migração
                    },
                },
                professional: {
                    create: {
                        previousQualification,
                        professionalInterest,
                        careerGoal,
                        howHeardAbout,
                        motivation: motivation ?? '', // REQ-05: opcional, fallback string vazia
                    },
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        active: true,
                    },
                },
                address: true,
                contact: true,
                socioeconomic: true,
                professional: true,
            },
        });

        if (!isStudentDocumentsComplete(student.documents)) {
            await this.sendDocumentsPendingNotification(student.userId, student.documents);
        }

        return student;
    }

    async update(id: string, updateStudentDto: UpdateStudentDto) {
        const student = await this.prisma.student.findUnique({
            where: { id },
            include: { user: true },
        });

        if (!student) {
            throw new NotFoundException('Student not found');
        }

        const {
            // User fields
            name, email, phone,
            // Student fields
            cpf, birthDate, gender, raceColor, maritalStatus,
            motherName, fatherName, nationality, birthCity, birthState, socialName,
            // Address fields
            cep, street, addressNumber, complement, neighborhood, city, state, zone,
            // Contact fields
            hasWhatsapp, phoneAlt, allowWhatsappContact, allowEmailContact,
            // Socioeconomic fields
            educationLevel, employmentStatus, familyIncome, familyMembersCount,
            socialProgram, hasDisability, disabilityType, disabilityAdaptation,
            // Professional fields
            previousQualification, professionalInterest, careerGoal, howHeardAbout, motivation,
            documents: documentsInput,
            // Ignore password in update
            password: _password,
        } = updateStudentDto;

        // Check if new CPF is already in use
        if (cpf && cpf !== student.cpf) {
            const existingStudent = await this.prisma.student.findUnique({
                where: { cpf: cpf.replace(/\D/g, '') },
            });

            if (existingStudent) {
                throw new BadRequestException('CPF already in use');
            }
        }

        // Check if new email is already in use
        if (email && email !== student.user.email) {
            const existingUser = await this.prisma.user.findUnique({
                where: { email },
            });

            if (existingUser) {
                throw new BadRequestException('Email already in use');
            }
        }

        const documentsPatch =
            documentsInput !== undefined
                ? mergeStudentDocuments(student.documents, sanitizeStudentDocumentsPatch(documentsInput as Record<string, unknown>))
                : undefined;

        // Update student and all relations
        const updated = await this.prisma.student.update({
            where: { id },
            data: {
                ...(documentsPatch !== undefined && { documents: documentsPatch }),
                ...(cpf && { cpf: cpf.replace(/\D/g, '') }),
                ...(birthDate && { birthDate: new Date(birthDate) }),
                ...(gender && { gender }),
                ...(raceColor && { raceColor }),
                ...(maritalStatus && { maritalStatus }),
                ...(motherName && { motherName }),
                ...(fatherName !== undefined && { fatherName }),
                ...(nationality && { nationality }),
                ...(birthCity && { birthCity }),
                ...(birthState && { birthState }),
                ...(socialName !== undefined && { socialName }),
                user: {
                    update: {
                        ...(name && { name }),
                        ...(email && { email }),
                        ...(phone && { phone }),
                    },
                },
                ...(cep || street || addressNumber || city || state || zone ? {
                    address: {
                        upsert: {
                            create: {
                                cep: cep?.replace(/\D/g, '') || '',
                                street: street || '',
                                number: addressNumber || '',
                                complement,
                                neighborhood: neighborhood || '',
                                city: city || '',
                                state: state || '',
                                zone: zone || 'URBAN',
                            },
                            update: {
                                ...(cep && { cep: cep.replace(/\D/g, '') }),
                                ...(street && { street }),
                                ...(addressNumber && { number: addressNumber }),
                                ...(complement !== undefined && { complement }),
                                ...(neighborhood && { neighborhood }),
                                ...(city && { city }),
                                ...(state && { state }),
                                ...(zone && { zone }),
                            },
                        },
                    },
                } : {}),
                ...(email || phone || hasWhatsapp !== undefined || phoneAlt !== undefined ||
                    allowWhatsappContact !== undefined || allowEmailContact !== undefined ? {
                    contact: {
                        upsert: {
                            create: {
                                email: email || student.user.email,
                                phone: phone || student.user.phone || '',
                                hasWhatsapp: hasWhatsapp ?? false,
                                phoneAlt,
                                allowWhatsappContact: allowWhatsappContact ?? true,
                                allowEmailContact: allowEmailContact ?? true,
                            },
                            update: {
                                ...(email && { email }),
                                ...(phone && { phone }),
                                ...(hasWhatsapp !== undefined && { hasWhatsapp }),
                                ...(phoneAlt !== undefined && { phoneAlt }),
                                ...(allowWhatsappContact !== undefined && { allowWhatsappContact }),
                                ...(allowEmailContact !== undefined && { allowEmailContact }),
                            },
                        },
                    },
                } : {}),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        active: true,
                    },
                },
                address: true,
                contact: true,
                socioeconomic: true,
                professional: true,
            },
        });

        return updated;
    }

    async remove(id: string) {
        const student = await this.prisma.student.findUnique({
            where: { id },
        });

        if (!student) {
            throw new NotFoundException('Student not found');
        }

        // Soft Delete — NUNCA deletar fisicamente (02_LIVRO_DE_REGRAS.md §3)
        await this.prisma.student.update({
            where: { id },
            data: { active: false },
        });

        return { message: 'Student deactivated successfully' };
    }

    async updatePhoto(id: string, photoUrl: string) {
        return this.prisma.student.update({
            where: { id },
            data: { photoUrl },
        });
    }
}
