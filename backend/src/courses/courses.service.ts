import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';
import { InstitutionsService } from '../institutions/institutions.service';
import { NotificationType } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsSenderService } from '../notifications/notifications-sender.service';
import * as fs from 'fs';
import * as path from 'path';

type CourseStateRule = { available: boolean; durationDays: number };
type CourseStateConfigMap = Record<string, Record<string, CourseStateRule>>;

@Injectable()
export class CoursesService {
    private readonly stateConfigPath: string;
    private stateConfigCache: CourseStateConfigMap | null = null;

    constructor(
        private prisma: PrismaService,
        private readonly institutions: InstitutionsService,
        private readonly notifications: NotificationsGateway,
        private readonly notificationsSender: NotificationsSenderService,
    ) {
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        this.stateConfigPath = path.join(dataDir, 'course-state-config.json');
    }

    private readStateConfigMap(): CourseStateConfigMap {
        if (this.stateConfigCache) return this.stateConfigCache;
        try {
            if (fs.existsSync(this.stateConfigPath)) {
                const raw = fs.readFileSync(this.stateConfigPath, 'utf-8');
                this.stateConfigCache = JSON.parse(raw);
                return this.stateConfigCache || {};
            }
        } catch {
            // fallback silencioso
        }
        this.stateConfigCache = {};
        return this.stateConfigCache;
    }

    private writeStateConfigMap(next: CourseStateConfigMap): void {
        this.stateConfigCache = next;
        fs.writeFileSync(this.stateConfigPath, JSON.stringify(next, null, 2), 'utf-8');
    }

    private defaultStateConfigForCourse(course: { durationDaysMA: number; durationDaysPI: number; availableInMA: boolean; availableInPI: boolean }): Record<string, CourseStateRule> {
        return {
            MA: { available: !!course.availableInMA, durationDays: Math.max(1, Number(course.durationDaysMA) || 1) },
            PI: { available: !!course.availableInPI, durationDays: Math.max(1, Number(course.durationDaysPI) || 1) },
        };
    }

    private sanitizeStateConfig(input: any, fallback: Record<string, CourseStateRule>): Record<string, CourseStateRule> {
        const next: Record<string, CourseStateRule> = { ...fallback };
        if (!input || typeof input !== 'object') return next;

        for (const [rawUf, rawRule] of Object.entries(input)) {
            const uf = String(rawUf || '').trim().toUpperCase();
            if (!/^[A-Z]{2}$/.test(uf)) continue;
            const ruleObj = (rawRule || {}) as any;
            const available = typeof ruleObj.available === 'boolean'
                ? ruleObj.available
                : next[uf]?.available ?? true;
            const durationCandidate = Number(ruleObj.durationDays ?? next[uf]?.durationDays ?? 1);
            next[uf] = {
                available,
                durationDays: Number.isFinite(durationCandidate) && durationCandidate > 0 ? Math.floor(durationCandidate) : 1,
            };
        }

        if (!next.MA) next.MA = { available: true, durationDays: fallback.MA?.durationDays || 30 };
        if (!next.PI) next.PI = { available: true, durationDays: fallback.PI?.durationDays || 30 };
        return next;
    }

    private getCourseStateConfig(course: { id: string; durationDaysMA: number; durationDaysPI: number; availableInMA: boolean; availableInPI: boolean }): Record<string, CourseStateRule> {
        const map = this.readStateConfigMap();
        const fallback = this.defaultStateConfigForCourse(course);
        return this.sanitizeStateConfig(map[course.id], fallback);
    }

    private persistCourseStateConfig(courseId: string, config: Record<string, CourseStateRule>): void {
        const map = this.readStateConfigMap();
        map[courseId] = this.sanitizeStateConfig(config, {
            MA: { available: true, durationDays: 30 },
            PI: { available: true, durationDays: 30 },
        });
        this.writeStateConfigMap(map);
    }

    private notificationLinkByRole(role: string): string {
        if (role === 'STUDENT') return '/student/enrollments';
        if (role === 'TEACHER') return '/teacher/frequencia';
        return '/admin/cursos';
    }

    private async collectImpactedUsers(courseId: string): Promise<{ id: string; role: string }[]> {
        const [admins, teachers, students] = await Promise.all([
            this.prisma.user.findMany({
                where: { role: { in: ['ADMIN', 'COORDINATOR', 'FINANCIAL', 'IT_ADMIN'] }, active: true },
                select: { id: true, role: true },
            }),
            this.prisma.classTeacher.findMany({
                where: { class: { courseId } },
                select: { teacher: { select: { userId: true } } },
            }),
            this.prisma.enrollment.findMany({
                where: {
                    class: { courseId },
                    status: { in: ['PENDING', 'APPROVED', 'ENROLLED'] },
                },
                select: { student: { select: { userId: true } } },
            }),
        ]);

        const ids = new Set<string>(admins.map(a => a.id));
        teachers.forEach(t => ids.add(t.teacher.userId));
        students.forEach(s => ids.add(s.student.userId));

        if (!ids.size) return [];

        return this.prisma.user.findMany({
            where: { id: { in: Array.from(ids) }, active: true },
            select: { id: true, role: true },
        });
    }

    private async notifyCourseUpdated(
        courseId: string,
        courseName: string,
        context: { becameInactive?: boolean; becameActive?: boolean } = {},
    ): Promise<void> {
        const impacted = await this.collectImpactedUsers(courseId);
        if (!impacted.length) return;

        const title = context.becameInactive
            ? 'Curso inativado'
            : context.becameActive
                ? 'Curso reativado'
                : 'Curso atualizado';
        const message = context.becameInactive
            ? `O curso "${courseName}" foi inativado pela coordenação/administração.`
            : context.becameActive
                ? `O curso "${courseName}" foi reativado e voltou a estar disponível.`
                : `O curso "${courseName}" recebeu atualizações de informações.`;
        const wsEvent = context.becameInactive
            ? 'curso_inativado'
            : context.becameActive
                ? 'curso_reativado'
                : 'curso_atualizado';

        for (const user of impacted) {
            try {
                const { id: notificationId } = await this.notificationsSender.send({
                    userId: user.id,
                    type: NotificationType.GENERAL_ANNOUNCEMENT,
                    title,
                    message,
                    link: this.notificationLinkByRole(user.role),
                    extraData: { courseId, kind: wsEvent },
                });
                this.notifications.notifyUser(user.id, wsEvent, {
                    courseId,
                    courseName,
                    timestamp: new Date().toISOString(),
                    notificationId,
                });
            } catch {
                // Notificação não deve quebrar fluxo principal
            }
        }

        this.notifications.notifyAdmins('curso_atualizado', {
            courseId,
            courseName,
            timestamp: new Date().toISOString(),
        });
    }

    async findAll(filters?: { state?: string; active?: boolean; isMulticourse?: boolean }) {
        const where: any = {};

        if (filters?.active !== undefined) {
            where.active = filters.active;
        }

        if (filters?.isMulticourse !== undefined) {
            where.isMulticourse = filters.isMulticourse;
        }

        const courses = await this.prisma.course.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                institution: { select: { id: true, name: true, shortName: true } },
                _count: {
                    select: {
                        modules: true,
                        teachers: true,
                        classes: true,
                    },
                },
            },
        });

        const stateFilter = filters?.state?.toUpperCase();
        const enriched = courses.map((course: any) => ({
            ...course,
            stateConfig: this.getCourseStateConfig(course),
        }));

        if (!stateFilter) return enriched;
        return enriched.filter((course: any) => !!course.stateConfig?.[stateFilter]?.available);
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
                        originCity: true,
                        truck: {
                            select: {
                                id: true,
                                identifier: true,
                                licensePlate: true,
                                state: true,
                            },
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
                        schedules: {
                            where: { active: true },
                            orderBy: { weekday: 'asc' },
                        },
                        _count: {
                            select: {
                                enrollments: true,
                                teachers: true,
                                materials: true,
                                certificates: true,
                            },
                        },
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

        return {
            ...course,
            stateConfig: this.getCourseStateConfig(course as any),
        };
    }

    async create(data: CreateCourseDto) {
        // Check if course name already exists
        const existing = await this.prisma.course.findFirst({
            where: { name: data.name },
        });

        if (existing) {
            throw new ConflictException('Course name already exists');
        }

        const { institutionId: instOpt, stateConfig, ...rest } = data;
        const institutionId = instOpt ?? (await this.institutions.getDefaultInstitutionId());

        const normalizedStateConfig = this.sanitizeStateConfig(stateConfig, {
            MA: { available: rest.availableInMA ?? true, durationDays: Number(rest.durationDaysMA) || 30 },
            PI: { available: rest.availableInPI ?? true, durationDays: Number(rest.durationDaysPI) || 30 },
        });

        const created = await this.prisma.course.create({
            data: {
                ...rest,
                availableInMA: normalizedStateConfig.MA.available,
                availableInPI: normalizedStateConfig.PI.available,
                durationDaysMA: normalizedStateConfig.MA.durationDays,
                durationDaysPI: normalizedStateConfig.PI.durationDays,
                institutionId,
            },
            include: {
                _count: {
                    select: {
                        modules: true,
                        teachers: true,
                    },
                },
            },
        });
        this.persistCourseStateConfig(created.id, normalizedStateConfig);
        return { ...created, stateConfig: normalizedStateConfig };
    }

    async update(id: string, data: UpdateCourseDto) {
        const before = await this.findOne(id);

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

        const currentStateConfig = this.getCourseStateConfig(before as any);
        const mergedStateConfig = this.sanitizeStateConfig((data as any).stateConfig, currentStateConfig);

        if (data.availableInMA !== undefined) mergedStateConfig.MA.available = !!data.availableInMA;
        if (data.durationDaysMA !== undefined) mergedStateConfig.MA.durationDays = Math.max(1, Number(data.durationDaysMA) || 1);
        if (data.availableInPI !== undefined) mergedStateConfig.PI.available = !!data.availableInPI;
        if (data.durationDaysPI !== undefined) mergedStateConfig.PI.durationDays = Math.max(1, Number(data.durationDaysPI) || 1);

        const { stateConfig: _discardStateConfig, ...dbPatch } = data as any;
        const updated = await this.prisma.course.update({
            where: { id },
            data: {
                ...dbPatch,
                availableInMA: mergedStateConfig.MA.available,
                availableInPI: mergedStateConfig.PI.available,
                durationDaysMA: mergedStateConfig.MA.durationDays,
                durationDaysPI: mergedStateConfig.PI.durationDays,
            },
        });
        this.persistCourseStateConfig(id, mergedStateConfig);

        const becameInactive = before.active && updated.active === false;
        const becameActive = !before.active && updated.active === true;
        await this.notifyCourseUpdated(id, updated.name, { becameInactive, becameActive }).catch(() => {});

        return { ...updated, stateConfig: mergedStateConfig };
    }

    async delete(id: string) {
        const current = await this.findOne(id);

        // Check if course has classes
        const classCount = await this.prisma.class.count({
            where: { courseId: id },
        });

        if (classCount > 0) {
            throw new ConflictException('Cannot delete course with existing classes');
        }

        // Soft delete
        const updated = await this.prisma.course.update({
            where: { id },
            data: { active: false },
        });
        await this.notifyCourseUpdated(id, updated.name, { becameInactive: current.active }).catch(() => {});
        return updated;
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
