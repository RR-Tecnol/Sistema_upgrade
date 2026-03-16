import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CoursesService } from '../courses/courses.service';
import { TrucksService } from '../trucks/trucks.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { Prisma, ClassStatus } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class ClassesService {
    constructor(
        private prisma: PrismaService,
        private coursesService: CoursesService,
        private trucksService: TrucksService,
        private notifications: NotificationsGateway,
    ) { }

    async findPublicClasses(filters?: { state?: string; city?: string }) {
        const where: Prisma.ClassWhereInput = {
            status: 'ENROLLMENT_OPEN',
        };

        if (filters?.state && filters?.city) {
            where.city = {
                state: filters.state,
                name: {
                    contains: filters.city,
                    mode: 'insensitive',
                },
            };
        } else if (filters?.state) {
            where.city = {
                state: filters.state,
            };
        } else if (filters?.city) {
            where.city = {
                name: {
                    contains: filters.city,
                    mode: 'insensitive',
                },
            };
        }

        return this.prisma.class.findMany({
            where,
            include: {
                course: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        workloadHours: true,
                    },
                },
                city: {
                    select: {
                        id: true,
                        name: true,
                        state: true,
                    },
                },
                group: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        enrollments: true,
                    },
                },
            },
            orderBy: {
                startDate: 'asc',
            },
        });
    }

    async findAll(filters?: {
        status?: ClassStatus;
        courseId?: string;
        groupId?: string;
        cityId?: string;
        truckId?: string;
    }) {
        const where: any = {};

        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.courseId) {
            where.courseId = filters.courseId;
        }
        if (filters?.groupId) {
            where.groupId = filters.groupId;
        }
        if (filters?.cityId) {
            where.cityId = filters.cityId;
        }
        if (filters?.truckId) {
            where.truckId = filters.truckId;
        }

        return this.prisma.class.findMany({
            where,
            orderBy: { startDate: 'desc' },
            include: {
                course: true,
                group: true,
                city: true,
                truck: true,
                teachers: {
                    include: {
                        teacher: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                    },
                                },
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        enrollments: true,
                        attendances: true,
                        schedules: true,
                    },
                },
            },
        });
    }

    async findOne(id: string) {
        const classData = await this.prisma.class.findUnique({
            where: { id },
            include: {
                course: {
                    include: {
                        modules: true,
                    },
                },
                group: true,
                city: true,
                truck: true,
                teachers: {
                    include: {
                        teacher: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        phone: true,
                                    },
                                },
                            },
                        },
                    },
                },
                schedules: {
                    orderBy: { weekday: 'asc' },
                },
                enrollments: {
                    include: {
                        student: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { enrolledAt: 'desc' },
                    take: 50,
                },
                _count: {
                    select: {
                        enrollments: true,
                        attendances: true,
                        materials: true,
                        certificates: true,
                    },
                },
            },
        });

        if (!classData) {
            throw new NotFoundException('Class not found');
        }

        return classData;
    }

    async create(data: CreateClassDto) {
        // Verify course exists
        await this.coursesService.findOne(data.courseId);

        // Verify group exists
        const group = await this.prisma.group.findUnique({
            where: { id: data.groupId },
        });
        if (!group) {
            throw new NotFoundException('Group not found');
        }

        // Verify city exists
        const city = await this.prisma.city.findUnique({
            where: { id: data.cityId },
        });
        if (!city) {
            throw new NotFoundException('City not found');
        }

        // Verify truck availability if provided
        if (data.truckId) {
            const availability = await this.trucksService.checkAvailability(
                data.truckId,
                new Date(data.startDate),
                new Date(data.endDate),
            );

            if (!availability.available) {
                throw new ConflictException(`Truck not available: ${availability.reason} `);
            }
        }

        // Check for duplicate class identifier
        const existing = await this.prisma.class.findFirst({
            where: {
                classIdentifier: data.classIdentifier,
            },
        });

        if (existing) {
            throw new ConflictException('Class identifier already exists');
        }

        // Create class
        const newClass = await this.prisma.class.create({
            data: {
                ...data,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                enrollmentOpenDate: data.enrollmentOpenDate ? new Date(data.enrollmentOpenDate) : null,
                enrollmentCloseDate: data.enrollmentCloseDate ? new Date(data.enrollmentCloseDate) : null,
            },
            include: {
                course: true,
                group: true,
                city: true,
                truck: true,
            },
        });

        // Update truck status if assigned
        if (data.truckId) {
            await this.trucksService.updateStatus(data.truckId, 'IN_USE');
        }

        return newClass;
    }

    async update(id: string, data: UpdateClassDto) {
        await this.findOne(id);

        // Verify truck availability if being changed
        if (data.truckId) {
            const classData = await this.prisma.class.findUnique({
                where: { id },
            });

            if (!classData) {
                throw new NotFoundException('Class not found');
            }

            const availability = await this.trucksService.checkAvailability(
                data.truckId,
                data.startDate ? new Date(data.startDate) : classData.startDate,
                data.endDate ? new Date(data.endDate) : classData.endDate,
            );

            if (!availability.available) {
                throw new ConflictException(`Truck not available: ${availability.reason} `);
            }
        }

        // Check for duplicate class identifier if being changed
        if (data.classIdentifier) {
            const existing = await this.prisma.class.findFirst({
                where: {
                    classIdentifier: data.classIdentifier,
                    NOT: { id },
                },
            });

            if (existing) {
                throw new ConflictException('Class identifier already exists');
            }
        }

        const updateData: any = { ...data };
        if (data.startDate) updateData.startDate = new Date(data.startDate);
        if (data.endDate) updateData.endDate = new Date(data.endDate);
        if (data.enrollmentOpenDate) updateData.enrollmentOpenDate = new Date(data.enrollmentOpenDate);
        if (data.enrollmentCloseDate) updateData.enrollmentCloseDate = new Date(data.enrollmentCloseDate);

        return this.prisma.class.update({
            where: { id },
            data: updateData,
            include: {
                course: true,
                group: true,
                city: true,
                truck: true,
            },
        });
    }

    async delete(id: string) {
        const classData = await this.findOne(id);

        // Check if class has enrollments
        const enrollmentCount = await this.prisma.enrollment.count({
            where: { classId: id },
        });

        if (enrollmentCount > 0) {
            throw new ConflictException('Cannot delete class with existing enrollments');
        }

        return this.prisma.class.delete({
            where: { id },
        });
    }

    async updateStatus(id: string, status: ClassStatus) {
        await this.findOne(id);

        return this.prisma.class.update({
            where: { id },
            data: { status },
        });
    }

    // Teacher Management
    async assignTeacher(classId: string, teacherId: string, isSubstitute: boolean = false) {
        await this.findOne(classId);

        // Verify teacher exists
        const teacher = await this.prisma.teacher.findUnique({
            where: { id: teacherId },
        });

        if (!teacher) {
            throw new NotFoundException('Teacher not found');
        }

        // Check if already assigned
        const existing = await this.prisma.classTeacher.findFirst({
            where: {
                classId,
                teacherId,
            },
        });

        if (existing) {
            throw new ConflictException('Teacher already assigned to this class');
        }

        return this.prisma.classTeacher.create({
            data: {
                classId,
                teacherId,
                isSubstitute,
            },
            include: {
                teacher: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });
    }

    async removeTeacher(classId: string, teacherId: string) {
        const assignment = await this.prisma.classTeacher.findFirst({
            where: {
                classId,
                teacherId,
            },
        });

        if (!assignment) {
            throw new NotFoundException('Teacher assignment not found');
        }

        return this.prisma.classTeacher.delete({
            where: { id: assignment.id },
        });
    }

    // Schedule Management
    async updateSchedule(classId: string, schedules: CreateScheduleDto[]) {
        await this.findOne(classId);

        // Validate weekdays (0-6)
        for (const schedule of schedules) {
            if (schedule.weekday < 0 || schedule.weekday > 6) {
                throw new BadRequestException('Weekday must be between 0 (Sunday) and 6 (Saturday)');
            }
        }

        // Delete existing schedules
        await this.prisma.classSchedule.deleteMany({
            where: { classId },
        });

        // Create new schedules
        const created = await Promise.all(
            schedules.map((schedule) =>
                this.prisma.classSchedule.create({
                    data: {
                        classId,
                        weekday: schedule.weekday,
                        active: schedule.active ?? true,
                    },
                }),
            ),
        );

        return created;
    }

    async getSchedule(classId: string) {
        await this.findOne(classId);

        return this.prisma.classSchedule.findMany({
            where: { classId },
            orderBy: { weekday: 'asc' },
        });
    }

    // Statistics
    async getClassStatistics(classId: string) {
        await this.findOne(classId);

        const [
            totalEnrollments,
            approvedEnrollments,
            pendingEnrollments,
            totalAttendances,
            presentCount,
            certificatesIssued,
        ] = await Promise.all([
            this.prisma.enrollment.count({ where: { classId } }),
            this.prisma.enrollment.count({ where: { classId, status: 'ENROLLED' } }),
            this.prisma.enrollment.count({ where: { classId, status: 'PENDING' } }),
            this.prisma.attendance.count({ where: { classId } }),
            this.prisma.attendance.count({ where: { classId, present: true } }),
            this.prisma.certificate.count({ where: { classId, status: 'ACTIVE' } }),
        ]);

        const attendanceRate = totalAttendances > 0 ? (presentCount / totalAttendances) * 100 : 0;

        return {
            enrollments: {
                total: totalEnrollments,
                approved: approvedEnrollments,
                pending: pendingEnrollments,
            },
            attendance: {
                total: totalAttendances,
                present: presentCount,
                rate: Math.round(attendanceRate * 100) / 100,
            },
            certificates: certificatesIssued,
        };
    }

    // Bulk Attendance — usado pelo professor para registrar frequência do dia
    async bulkAttendance(
        classId: string,
        date: string,
        records: { studentId: string; present: boolean }[],
        registeredBy: string,
    ) {
        const dateObj = new Date(date);
        await Promise.all(
            records.map(r =>
                this.prisma.attendance.upsert({
                    where: {
                        classId_studentId_date: {
                            classId,
                            studentId: r.studentId,
                            date: dateObj,
                        },
                    },
                    update: { present: r.present },
                    create: {
                        classId,
                        studentId: r.studentId,
                        date: dateObj,
                        present: r.present,
                        registeredBy,
                    },
                }),
            ),
        );

        // SF-01: Emitir evento WebSocket em tempo real
        try {
            this.notifications.notifyAdmins('frequencia_registrada', {
                classId,
                date,
                totalRegistros: records.length,
                timestamp: new Date().toISOString(),
            });
        } catch { /* WS opcional */ }

        return { message: `${records.length} registros salvos`, date };
    }
}


