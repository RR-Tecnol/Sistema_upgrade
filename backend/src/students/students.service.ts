import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

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
            },
        });

        if (!student) {
            throw new NotFoundException('Student profile not found');
        }

        return student;
    }

    async updatePassword(userId: string, currentPassword: string, newPassword: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
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

        // Get enrollments with ENROLLED status
        const enrollments = await this.prisma.enrollment.findMany({
            where: {
                studentId: student.id,
                status: 'ENROLLED',
            },
            include: {
                class: {
                    include: {
                        course: true,
                        city: true,
                        group: true,
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
}
