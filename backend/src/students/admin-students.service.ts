import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto, UpdateStudentDto } from './dto';
import * as bcrypt from 'bcryptjs';

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
    constructor(private prisma: PrismaService) { }

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
            previousQualification, professionalInterest, careerGoal, howHeardAbout, motivation
        } = createStudentDto;

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
            // Ignore password in update
            password: _password,
            ...rest
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

        // Update student and all relations
        const updated = await this.prisma.student.update({
            where: { id },
            data: {
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
