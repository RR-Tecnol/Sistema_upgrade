import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';

@Injectable()
export class CoursesService {
    constructor(private prisma: PrismaService) { }

    async findAll(filters?: { state?: string; active?: boolean; isMulticourse?: boolean }) {
        const where: any = {};

        if (filters?.active !== undefined) {
            where.active = filters.active;
        }

        if (filters?.isMulticourse !== undefined) {
            where.isMulticourse = filters.isMulticourse;
        }

        if (filters?.state) {
            if (filters.state === 'MA') {
                where.availableInMA = true;
            } else if (filters.state === 'PI') {
                where.availableInPI = true;
            }
        }

        return this.prisma.course.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: {
                        modules: true,
                        teachers: true,
                        classes: true,
                    },
                },
            },
        });
    }

    async findOne(id: string) {
        const course = await this.prisma.course.findUnique({
            where: { id },
            include: {
                modules: {
                    orderBy: { order: 'asc' },
                },
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
                classes: {
                    include: {
                        city: true,
                        group: true,
                    },
                    orderBy: { startDate: 'desc' },
                    take: 10,
                },
                _count: {
                    select: {
                        modules: true,
                        teachers: true,
                        classes: true,
                        materials: true,
                    },
                },
            },
        });

        if (!course) {
            throw new NotFoundException('Course not found');
        }

        return course;
    }

    async create(data: CreateCourseDto) {
        // Check if course name already exists
        const existing = await this.prisma.course.findFirst({
            where: { name: data.name },
        });

        if (existing) {
            throw new ConflictException('Course name already exists');
        }

        return this.prisma.course.create({
            data,
            include: {
                _count: {
                    select: {
                        modules: true,
                        teachers: true,
                    },
                },
            },
        });
    }

    async update(id: string, data: UpdateCourseDto) {
        await this.findOne(id);

        // Check for duplicate name if being changed
        if (data.name) {
            const existing = await this.prisma.course.findFirst({
                where: {
                    name: data.name,
                    NOT: { id },
                },
            });

            if (existing) {
                throw new ConflictException('Course name already exists');
            }
        }

        return this.prisma.course.update({
            where: { id },
            data,
        });
    }

    async delete(id: string) {
        await this.findOne(id);

        // Check if course has classes
        const classCount = await this.prisma.class.count({
            where: { courseId: id },
        });

        if (classCount > 0) {
            throw new ConflictException('Cannot delete course with existing classes');
        }

        // Soft delete
        return this.prisma.course.update({
            where: { id },
            data: { active: false },
        });
    }

    // Course Modules Management
    async addModule(courseId: string, data: CreateCourseModuleDto) {
        await this.findOne(courseId);

        return this.prisma.courseModule.create({
            data: {
                ...data,
                courseId,
            },
        });
    }

    async updateModule(moduleId: string, data: UpdateCourseModuleDto) {
        const module = await this.prisma.courseModule.findUnique({
            where: { id: moduleId },
        });

        if (!module) {
            throw new NotFoundException('Course module not found');
        }

        return this.prisma.courseModule.update({
            where: { id: moduleId },
            data,
        });
    }

    async deleteModule(moduleId: string) {
        const module = await this.prisma.courseModule.findUnique({
            where: { id: moduleId },
        });

        if (!module) {
            throw new NotFoundException('Course module not found');
        }

        return this.prisma.courseModule.delete({
            where: { id: moduleId },
        });
    }

    // Teacher Assignment
    async assignTeacher(courseId: string, teacherId: string) {
        await this.findOne(courseId);

        // Check if teacher exists
        const teacher = await this.prisma.teacher.findUnique({
            where: { id: teacherId },
        });

        if (!teacher) {
            throw new NotFoundException('Teacher not found');
        }

        // Check if already assigned
        const existing = await this.prisma.teacherCourse.findFirst({
            where: {
                courseId,
                teacherId,
            },
        });

        if (existing) {
            throw new ConflictException('Teacher already assigned to this course');
        }

        return this.prisma.teacherCourse.create({
            data: {
                courseId,
                teacherId,
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

    async removeTeacher(courseId: string, teacherId: string) {
        const assignment = await this.prisma.teacherCourse.findFirst({
            where: {
                courseId,
                teacherId,
            },
        });

        if (!assignment) {
            throw new NotFoundException('Teacher assignment not found');
        }

        return this.prisma.teacherCourse.delete({
            where: { id: assignment.id },
        });
    }
}
