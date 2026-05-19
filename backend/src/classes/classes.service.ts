import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CoursesService } from '../courses/courses.service';
import { TrucksService } from '../trucks/trucks.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { Prisma, ClassStatus } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsSenderService } from '../notifications/notifications-sender.service';
import { evaluateCertificateEligibilityForEnrollment } from '../common/certificate-enrollment-evaluation.helper';
import { AuditLogService } from '../audit-log/audit-log.service';
import { paginatedResult, resolvePagination } from '../common/pagination.util';
import { resolveTeacherOrThrow } from '../common/resolve-teacher.util';
import {
    ensureClassTeacherLink,
    syncCourseTeachersToClass,
    syncTeacherToClass,
} from '../common/teacher-academic-link.util';
import {
    previewClassEndDate,
    resolveClassEndDateIso,
} from '../common/class-teaching-end-date.helper';
import { PreviewClassEndDateDto } from './dto/preview-class-end-date.dto';
import { ClassWeekendPolicy } from '@prisma/client';

@Injectable()
export class ClassesService {
    constructor(
        private prisma: PrismaService,
        private coursesService: CoursesService,
        private trucksService: TrucksService,
        private notifications: NotificationsGateway,
        private notificationsSender: NotificationsSenderService,
        private auditLog: AuditLogService,
    ) { }

    private parseDateSafe(dateInput: string | Date | null | undefined): Date | undefined {
        if (!dateInput) return undefined;
        if (dateInput instanceof Date) return dateInput;
        const trimmed = dateInput.trim();
        const isoDay = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
        if (isoDay) {
            const y = Number(isoDay[1]);
            const m = Number(isoDay[2]) - 1;
            const d = Number(isoDay[3]);
            return new Date(Date.UTC(y, m, d, 12, 0, 0, 0));
        }
        return new Date(trimmed);
    }

    /** Data civil no fuso da operação (BR) — alinha professor e API. */
    private getTodayBrasiliaYmd(): string {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
    }

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
        teacherUserId?: string;
        search?: string;
        page?: number;
        limit?: number;
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
        if (filters?.teacherUserId) {
            where.teachers = {
                some: {
                    teacher: { userId: filters.teacherUserId },
                },
            };
        }
        if (filters?.search?.trim()) {
            const q = filters.search.trim();
            where.OR = [
                { classIdentifier: { contains: q, mode: 'insensitive' } },
                { course: { name: { contains: q, mode: 'insensitive' } } },
                { city: { name: { contains: q, mode: 'insensitive' } } },
            ];
        }

        const { skip, page, limit } = resolvePagination(filters?.page, filters?.limit, 12);
        const include = {
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
        };

        const [data, total] = await Promise.all([
            this.prisma.class.findMany({
                where,
                orderBy: { startDate: 'desc' },
                include,
                skip,
                take: limit,
            }),
            this.prisma.class.count({ where }),
        ]);

        return paginatedResult(data, total, page, limit);
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
                acaoTurmas: {
                    include: {
                        acao: {
                            select: {
                                id: true,
                                nome: true,
                                status: true,
                                dataInicio: true,
                                dataFim: true,
                                cidadeNome: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
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

    async previewEndDate(dto: PreviewClassEndDateDto) {
        const course = await this.coursesService.findOne(dto.courseId);
        return previewClassEndDate(this.prisma, {
            startDate: dto.startDate,
            courseId: dto.courseId,
            groupId: dto.groupId,
            cityId: dto.cityId,
            weekendPolicy: dto.weekendPolicy,
            teachingDaysCount: dto.teachingDaysCount,
            weekendExtraDates: dto.weekendExtraDates,
            scheduleDays: dto.scheduleDays,
            manualEndDate: dto.manualEndDate,
            classId: dto.classId,
            startTime: dto.startTime,
            endTime: dto.endTime,
            stateConfig: (course as { stateConfig?: Record<string, { available: boolean; durationDays: number; workloadHours?: number }> }).stateConfig,
        });
    }

    async create(data: CreateClassDto) {
        const { acaoId, ...createData } = data;
        let acaoMotor: {
            dataInicio: Date;
            dataFim: Date;
            period: string;
            startTime: string;
            endTime: string;
            weekendPolicy: ClassWeekendPolicy;
            weekendExtraDates: unknown;
            carretaId: string | null;
            grupoId: string;
            cidadeId: string | null;
            localExecucao: string | null;
            localEndereco: string | null;
            localReferencia: string | null;
            localLatitude: number | null;
            localLongitude: number | null;
        } | null = null;

        if (acaoId) {
            const acao = await this.prisma.acao.findUnique({ where: { id: acaoId } });
            if (!acao) throw new NotFoundException('Período de curso não encontrado');
            acaoMotor = acao;
            createData.groupId = acao.grupoId;
            if (acao.cidadeId) createData.cityId = acao.cidadeId;
            createData.startDate = acao.dataInicio.toISOString().slice(0, 10);
            createData.endDate = acao.dataFim.toISOString().slice(0, 10);
            createData.period = acao.period as CreateClassDto['period'];
            createData.startTime = acao.startTime;
            createData.endTime = acao.endTime;
            createData.weekendPolicy = acao.weekendPolicy;
            createData.weekendExtraDates = Array.isArray(acao.weekendExtraDates)
                ? (acao.weekendExtraDates as string[])
                : undefined;
            createData.useAutoEndDate = false;
            if (acao.carretaId) createData.truckId = acao.carretaId;
            if (acao.localExecucao) createData.locationName = acao.localExecucao;
            if (acao.localEndereco) createData.locationAddress = acao.localEndereco;
            if (acao.localReferencia) createData.locationReference = acao.localReferencia;
            if (acao.localLatitude != null) createData.locationLatitude = acao.localLatitude;
            if (acao.localLongitude != null) createData.locationLongitude = acao.localLongitude;
        }

        // Verify course exists
        await this.coursesService.findOne(createData.courseId);

        // Verify group exists
        const group = await this.prisma.group.findUnique({
            where: { id: createData.groupId },
        });
        if (!group) {
            throw new NotFoundException('Group not found');
        }

        // Verify city exists
        const city = await this.prisma.city.findUnique({
            where: { id: createData.cityId },
        });
        if (!city) {
            throw new NotFoundException('City not found');
        }

        const { weekendExtraDates, teachingDaysCount, useAutoEndDate, ...classRest } =
            createData as CreateClassDto & { weekendExtraDates?: string[] };

        const courseForState = await this.coursesService.findOne(createData.courseId);
        const endDateIso = acaoMotor
            ? createData.endDate
            : await resolveClassEndDateIso(this.prisma, {
                  startDate: createData.startDate,
                  endDate: createData.endDate,
                  courseId: createData.courseId,
                  groupId: createData.groupId,
                  cityId: createData.cityId,
                  weekendPolicy: createData.weekendPolicy ?? ClassWeekendPolicy.WEEKDAYS_ONLY,
                  teachingDaysCount,
                  weekendExtraDates,
                  useAutoEndDate,
                  startTime: createData.startTime,
                  endTime: createData.endTime,
                  stateConfig: (courseForState as { stateConfig?: Record<string, { available: boolean; durationDays: number; workloadHours?: number }> }).stateConfig,
              });

        // Período já reservou a carreta — turma vinculada herda sem revalidar conflito operacional
        if (createData.truckId && !acaoId) {
            const availability = await this.trucksService.checkAvailability(
                createData.truckId,
                this.parseDateSafe(createData.startDate) as Date,
                this.parseDateSafe(endDateIso) as Date,
            );

            if (!availability.available) {
                throw new ConflictException(`Truck not available: ${availability.reason} `);
            }
        }

        // Check for duplicate class identifier
        const existing = await this.prisma.class.findFirst({
            where: {
                classIdentifier: createData.classIdentifier,
            },
        });

        if (existing) {
            throw new ConflictException('Class identifier already exists');
        }

        // Create class
        const newClass = await this.prisma.class.create({
            data: {
                ...classRest,
                startDate: this.parseDateSafe(createData.startDate) as Date,
                endDate: this.parseDateSafe(endDateIso) as Date,
                enrollmentOpenDate: createData.enrollmentOpenDate ? this.parseDateSafe(createData.enrollmentOpenDate) : null,
                enrollmentCloseDate: createData.enrollmentCloseDate ? this.parseDateSafe(createData.enrollmentCloseDate) : null,
                weekendExtraDates: Array.isArray(weekendExtraDates) && weekendExtraDates.length
                    ? weekendExtraDates.filter(x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x))
                    : undefined,
            },
            include: {
                course: true,
                group: true,
                city: true,
                truck: true,
            },
        });

        // Update truck status if assigned
        if (createData.truckId) {
            await this.trucksService.updateStatus(createData.truckId, 'IN_USE');
        }

        const inherited = await syncCourseTeachersToClass(this.prisma, newClass.id);

        if (acaoId) {
            const { syncTurmaLinkedToAcao } = await import('../common/academic-ecosystem-sync.util');
            try {
                await this.prisma.acaoTurma.create({ data: { acaoId, turmaId: newClass.id } });
            } catch {
                /* já vinculada */
            }
            await syncTurmaLinkedToAcao(this.prisma, acaoId, newClass.id);
        }

        return { ...newClass, inheritedClassTeachers: inherited.classLinks, acaoId: acaoId ?? undefined };
    }

    async update(id: string, data: UpdateClassDto) {
        const existingClass = await this.findOne(id);

        const { weekendExtraDates, teachingDaysCount, useAutoEndDate, ...restUpdate } =
            data as UpdateClassDto & {
                weekendExtraDates?: string[];
                teachingDaysCount?: number;
                useAutoEndDate?: boolean;
            };

        const startIso =
            data.startDate ??
            (existingClass.startDate instanceof Date
                ? existingClass.startDate.toISOString().slice(0, 10)
                : String(existingClass.startDate).slice(0, 10));
        const endIsoInput =
            data.endDate ??
            (existingClass.endDate instanceof Date
                ? existingClass.endDate.toISOString().slice(0, 10)
                : String(existingClass.endDate).slice(0, 10));

        const shouldRecalcEnd =
            useAutoEndDate !== false &&
            (data.startDate != null ||
                data.weekendPolicy != null ||
                weekendExtraDates !== undefined ||
                teachingDaysCount != null ||
                useAutoEndDate === true);

        const endDateIso = shouldRecalcEnd
            ? await resolveClassEndDateIso(this.prisma, {
                  startDate: startIso,
                  endDate: endIsoInput,
                  courseId: existingClass.courseId,
                  groupId: existingClass.groupId,
                  cityId: existingClass.cityId,
                  weekendPolicy:
                      data.weekendPolicy ??
                      existingClass.weekendPolicy ??
                      ClassWeekendPolicy.WEEKDAYS_ONLY,
                  teachingDaysCount,
                  weekendExtraDates: weekendExtraDates as string[] | undefined,
                  useAutoEndDate: true,
                  classId: id,
              })
            : endIsoInput;

        // Verify truck availability if being changed
        if (data.truckId) {
            const availability = await this.trucksService.checkAvailability(
                data.truckId,
                this.parseDateSafe(startIso) as Date,
                this.parseDateSafe(endDateIso) as Date,
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

        const updateData: any = { ...restUpdate };
        if (data.startDate) updateData.startDate = this.parseDateSafe(startIso);
        updateData.endDate = this.parseDateSafe(endDateIso);
        if (data.enrollmentOpenDate) updateData.enrollmentOpenDate = this.parseDateSafe(data.enrollmentOpenDate);
        if (data.enrollmentCloseDate) updateData.enrollmentCloseDate = this.parseDateSafe(data.enrollmentCloseDate);
        if (weekendExtraDates !== undefined) {
            updateData.weekendExtraDates = Array.isArray(weekendExtraDates) && weekendExtraDates.length
                ? weekendExtraDates.filter(x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x))
                : [];
        }

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
        await this.findOne(id);

        // Check if class has enrollments before deactivating
        const enrollmentCount = await this.prisma.enrollment.count({
            where: { classId: id },
        });

        if (enrollmentCount > 0) {
            throw new ConflictException('Turma tem inscrições — não pode ser desativada');
        }

        // Soft delete: marcar como CANCELLED em vez de remover do banco
        return this.prisma.class.update({
            where: { id },
            data: { status: 'CANCELLED' },
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
    async assignTeacher(classId: string, teacherIdOrUserId: string, isSubstitute: boolean = false) {
        await this.findOne(classId);

        const teacher = await resolveTeacherOrThrow(this.prisma, teacherIdOrUserId);
        const teacherId = teacher.id;

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

        const sync = await syncTeacherToClass(this.prisma, classId, teacherIdOrUserId, isSubstitute);
        if (sync.classLinks === 0) {
            await ensureClassTeacherLink(this.prisma, classId, teacher.id, isSubstitute);
        }

        const assignment = await this.prisma.classTeacher.findFirst({
            where: { classId, teacherId: teacher.id },
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

        return {
            ...assignment,
            syncedToCourse: sync.courseLinks > 0,
            academicSync: sync,
        };
    }

    async removeTeacher(classId: string, teacherIdOrUserId: string) {
        const teacher = await resolveTeacherOrThrow(this.prisma, teacherIdOrUserId);

        const assignment = await this.prisma.classTeacher.findFirst({
            where: {
                classId,
                teacherId: teacher.id,
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

    /** Recalcula alertas de certificado (calendário letivo + 75%) para alunos da turma. */
    private async notifyCertificateRiskForClass(classId: string, studentIds: string[]): Promise<void> {
        const unique = [...new Set(studentIds)];
        if (!unique.length) return;
        const cls = await this.prisma.class.findUnique({
            where: { id: classId },
            include: { course: { select: { name: true } } },
        });
        if (!cls?.course) return;

        const studentsMeta = await this.prisma.student.findMany({
            where: { id: { in: unique } },
            select: { id: true, userId: true },
        });
        const userIdByStudent = new Map(studentsMeta.map(s => [s.id, s.userId]));
        for (const sid of unique) {
            const uid = userIdByStudent.get(sid);
            if (!uid) continue;

            const breakdown = await evaluateCertificateEligibilityForEnrollment(this.prisma, sid, classId);
            if (!breakdown) continue;

            await this.notificationsSender.maybeNotifyCertificateAttendanceRisk(uid, classId, cls.course.name, {
                attendanceRatePct: breakdown.attendanceRateAfterPenaltyPct,
                remainingUnjustifiedSlots: breakdown.remainingUnjustifiedSlots,
                unjustifiedAbsenceCount: breakdown.unjustifiedAbsenceCount,
                totalSessions: breakdown.totalSessions,
                riskLevel: breakdown.riskLevelAfterPenalty,
            }).catch(() => {});
        }
    }

    /**
     * Ajustar presença/justificativa de um aluno num dia (ex.: após aprovar falta).
     * Dispara reavaliação de alertas de certificado.
     */
    async patchAttendanceSlot(
        classId: string,
        body: { date: string; studentId: string; justified?: boolean; present?: boolean },
        registeredBy: string,
        userRole?: string,
    ) {
        await this.findOne(classId);
        const todayBr = this.getTodayBrasiliaYmd();
        if (userRole === 'TEACHER' && body.date > todayBr) {
            throw new BadRequestException('Não é permitido alterar frequência em datas futuras.');
        }
        const teacherRetroSlot = userRole === 'TEACHER' && body.date < todayBr;
        const [y, m, d] = body.date.split('-').map(Number);
        const dateObj = new Date(Date.UTC(y, m - 1, d));
        const existing = await this.prisma.attendance.findUnique({
            where: {
                classId_studentId_date: {
                    classId,
                    studentId: body.studentId,
                    date: dateObj,
                },
            },
        });
        if (!existing) {
            throw new NotFoundException('Não há registo de frequência para este aluno nesta data');
        }
        const data: Record<string, unknown> = { registeredBy, registeredAt: new Date() };
        if (body.present !== undefined) data.present = body.present;
        if (body.justified !== undefined) data.justified = body.justified;
        await this.prisma.attendance.update({
            where: { id: existing.id },
            data: data as any,
        });
        if (teacherRetroSlot) {
            await this.auditLog.log({
                userId: registeredBy,
                action: 'ATTENDANCE_TEACHER_RETROACTIVE_SLOT',
                tableName: 'attendances',
                recordId: existing.id,
                newData: {
                    date: body.date,
                    studentId: body.studentId,
                    present: body.present,
                    justified: body.justified,
                },
            });
            this.notifications.notifyAdmins('frequencia_retroativa_professor', {
                classId,
                date: body.date,
                studentId: body.studentId,
                actorUserId: registeredBy,
                slotPatch: true,
                timestamp: new Date().toISOString(),
            });
        }
        await this.notifyCertificateRiskForClass(classId, [body.studentId]);
        return { ok: true };
    }

    // Bulk Attendance — usado pelo professor para registrar frequência do dia
    async bulkAttendance(
        classId: string,
        date: string,
        records: { studentId: string; present: boolean; justified?: boolean }[],
        registeredBy: string,
        userRole?: string,
    ) {
        const todayBr = this.getTodayBrasiliaYmd();
        const isTeacher = userRole === 'TEACHER';
        if (isTeacher && date > todayBr) {
            throw new BadRequestException(
                'Não é permitido lançar ou alterar frequência para datas futuras. Use apenas a data de hoje ou datas passadas.',
            );
        }
        const retroactiveTeacher = isTeacher && date < todayBr;

        if (retroactiveTeacher) {
            await this.auditLog.log({
                userId: registeredBy,
                action: 'ATTENDANCE_TEACHER_RETROACTIVE_BULK',
                tableName: 'attendances',
                recordId: classId,
                newData: {
                    date,
                    recordCount: records.length,
                    presentCount: records.filter(r => r.present).length,
                    studentIds: records.map(r => r.studentId),
                },
            });
        }

        // Normalizar para meia-noite UTC — elimina diferenças de timezone
        // que causariam dois registros distintos no unique constraint [classId, studentId, date]
        const [y, m, d] = date.split('-').map(Number);
        const dateObj = new Date(Date.UTC(y, m - 1, d));

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
                    update: {
                        present: r.present,
                        registeredBy,
                        registeredAt: new Date(),
                        ...(r.justified !== undefined ? { justified: r.justified } : {}),
                    },
                    create: {
                        classId,
                        studentId: r.studentId,
                        date: dateObj,
                        present: r.present,
                        justified: r.justified ?? false,
                        registeredBy,
                    },
                }),
            ),
        );

        if (retroactiveTeacher) {
            await this.auditLog.log({
                userId: registeredBy,
                action: 'ATTENDANCE_TEACHER_RETROACTIVE_BULK',
                tableName: 'attendances',
                recordId: classId,
                newData: {
                    date,
                    recordCount: records.length,
                    presentCount: records.filter(r => r.present).length,
                    studentIds: records.map(r => r.studentId),
                },
            });
        }

        // SF-01: Emitir evento WebSocket em tempo real
        try {
            const teacher = await this.prisma.user.findUnique({ where: { id: registeredBy }, select: { name: true } });
            this.notifications.notifyAdmins('frequencia_registrada', {
                classId,
                date,
                totalRegistros: records.length,
                timestamp: new Date().toISOString(),
                actorName: teacher?.name ?? undefined,
                actorUserId: registeredBy,
                retroactiveTeacherEdit: retroactiveTeacher,
            });

            const cls = await this.prisma.class.findUnique({ where: { id: classId }, select: { course: { select: { name: true } } } });
            if (cls) {
                const absentRecords = records.filter(r => !r.present);
                for (const r of absentRecords) {
                    const student = await this.prisma.student.findUnique({ where: { id: r.studentId }, select: { userId: true } });
                    if (student?.userId) {
                        await this.notificationsSender.absenceRegistered(
                            student.userId,
                            cls.course.name,
                            date,
                            registeredBy,
                            teacher?.name || undefined,
                        ).catch(() => {});
                    }
                }

                const uniqueStudentIds = [...new Set(records.map(r => r.studentId))];
                await this.notifyCertificateRiskForClass(classId, uniqueStudentIds);
            }
        } catch { /* WS opcional */ }

        return {
            message: `${records.length} registros salvos`,
            date,
            retroactiveTeacherEdit: retroactiveTeacher,
        };
    }

    // EXEC-06: Histórico de frequência lançada pelo professor
    async getTeacherAttendanceHistory(teacherUserId: string) {        return this.prisma.attendance.findMany({
            where: { registeredBy: teacherUserId },
            select: {
                id: true,
                date: true,
                present: true,
                class: {
                    select: {
                        id: true,
                        classIdentifier: true,
                        course: { select: { name: true } },
                        city: { select: { name: true, state: true } },
                    },
                },
                student: {
                    select: {
                        user: { select: { name: true } },
                    },
                },
            },
            orderBy: { date: 'desc' },
            take: 200,
        });
    }

    // Histórico de frequência por turma — usado pelo calendário do ADM e professor
    async getAttendanceHistory(classId: string) {
        await this.findOne(classId);
        return this.prisma.attendance.findMany({
            where: { classId },
            select: {
                date: true,
                present: true,
                studentId: true,
            },
            orderBy: { date: 'asc' },
        });
    }

    /** Central ADM: cadastro + frequência individual do aluno numa turma, por período */
    async getStudentAttendanceDetailForAdmin(classId: string, studentId: string, startDate?: string, endDate?: string) {
        await this.findOne(classId);

        const enrollment = await this.prisma.enrollment.findFirst({
            where: { classId, studentId },
            select: { id: true, status: true },
        });
        if (!enrollment) {
            throw new NotFoundException('Aluno não encontrado nesta turma');
        }

        const end = endDate || new Date().toISOString().split('T')[0];
        const startFallback = new Date();
        startFallback.setUTCDate(startFallback.getUTCDate() - 180);
        const start = startDate || startFallback.toISOString().split('T')[0];

        const [sy, sm, sd] = start.split('-').map(Number);
        const [ey, em, ed] = end.split('-').map(Number);
        const startObj = new Date(Date.UTC(sy, sm - 1, sd));
        const endObj = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999));

        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
            include: {
                user: { select: { name: true, email: true, phone: true } },
                contact: true,
                address: true,
            },
        });
        if (!student) throw new NotFoundException('Aluno não encontrado');

        const cls = await this.prisma.class.findUnique({
            where: { id: classId },
            include: {
                course: { select: { name: true, workloadHours: true } },
                city: { select: { name: true, state: true } },
                teachers: {
                    include: {
                        teacher: {
                            include: {
                                user: { select: { name: true } },
                            },
                        },
                    },
                    take: 12,
                },
            },
        });

        const records = await this.prisma.attendance.findMany({
            where: {
                classId,
                studentId,
                date: { gte: startObj, lte: endObj },
            },
            include: {
                registrar: { select: { name: true } },
            },
            orderBy: { date: 'desc' },
        });

        const presentCount = records.filter(r => r.present).length;
        const absentCount = records.filter(r => !r.present).length;
        const total = records.length;
        const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

        return {
            profile: {
                id: student.id,
                cpf: student.cpf,
                birthDate: student.birthDate,
                gender: student.gender,
                socialName: student.socialName,
                photoUrl: student.photoUrl,
                user: student.user,
                contact: student.contact,
                address: student.address,
            },
            enrollment: { status: enrollment.status },
            class: cls
                ? {
                      id: cls.id,
                      classIdentifier: cls.classIdentifier,
                      course: cls.course,
                      city: cls.city,
                      mainTeacherName:
                          (cls.teachers?.find(t => !t.isSubstitute) ?? cls.teachers?.[0])?.teacher?.user
                              ?.name ?? null,
                  }
                : null,
            period: { start, end },
            summary: {
                presentCount,
                absentCount,
                totalMarkedDays: total,
                rate,
                certificateMinimumPercent: 75,
                meetsCertificateAttendance: rate >= 75,
            },
            records: records.map(r => ({
                id: r.id,
                date: r.date.toISOString().split('T')[0],
                present: r.present,
                justified: r.justified,
                justification: r.justification,
                registrarName: r.registrar?.name,
                registeredAt: r.registeredAt.toISOString(),
            })),
        };
    }

    // ── DASHBOARD AGREGADO DO PROFESSOR — uma única chamada, todos os dados ─────
    async getTeacherDashboard(teacherUserId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().slice(0, 10);

        /** Visíveis no portal (como aluno): planejadas em cinza + em andamento; exclui canceladas. */
        const TEACHER_VISIBLE_CLASS_STATUSES = [
            'PLANNED',
            'ENROLLMENT_OPEN',
            'ENROLLMENT_CLOSED',
            'IN_PROGRESS',
            'COMPLETED',
        ] as const;

        // 1. Todas as turmas vinculadas ao professor (não só IN_PROGRESS)
        const turmas = await this.prisma.class.findMany({
            where: {
                status: { in: [...TEACHER_VISIBLE_CLASS_STATUSES] },
                teachers: { some: { teacher: { userId: teacherUserId } } },
            },
            include: {
                course: { select: { name: true, workloadHours: true } },
                city:   { select: { name: true, state: true } },
                enrollments: {
                    // FIX-2: sem filtro de status — precisamos do studentInfo
                    // para todos os alunos com registro de frequência (independente do status)
                    // totalAlunos será calculado filtrando por ENROLLED depois
                    select: {
                        id: true,
                        studentId: true,
                        status: true,
                        student: {
                            select: {
                                cpf: true,
                                user: { select: { name: true, email: true, phone: true } },
                            },
                        },
                    },
                },
                attendances: {
                    select: { studentId: true, present: true, date: true },
                },
                certificates: {
                    where: { status: 'ACTIVE' },
                    select: { id: true },
                },
            },
            orderBy: { endDate: 'asc' },
        });

        // 2. Processar cada turma
        const turmasProcessadas = turmas.map(c => {
            const atts = c.attendances;
            // FIX-2: contar apenas matrículas ativas para totalAlunos
            const totalAlunos = c.enrollments.filter((e: any) =>
                ['ENROLLED', 'APPROVED'].includes(e.status)
            ).length;

            const datasUnicas = new Set(
                atts.map(a => new Date(a.date).toISOString().slice(0, 10))
            );
            const aulasRealizadas = datasUnicas.size;

            const totalPresentes = atts.filter(a => a.present).length;
            const freqMedia = atts.length > 0
                ? Math.round((totalPresentes / atts.length) * 1000) / 10
                : null;

            const ultimaAulaDate = atts.length > 0
                ? new Date(Math.max(...atts.map(a => new Date(a.date).getTime())))
                : null;

            const freqHojeRegistrada = atts.some(a =>
                new Date(a.date).toISOString().slice(0, 10) === todayStr
            );

            // Mapa de info dos alunos matriculados (sem queries N+1)
            const studentInfo = new Map<string, { nome: string; email: string; phone: string | null; cpf: string | null }>();
            c.enrollments.forEach((e: any) => {
                studentInfo.set(e.studentId, {
                    nome: e.student?.user?.name || 'Aluno',
                    email: e.student?.user?.email || '',
                    phone: e.student?.user?.phone ?? null,
                    cpf: e.student?.cpf ?? null,
                });
            });

            // Alunos em risco (<75%) com detalhes completos por studentId
            const presencasPorAluno = new Map<string, { total: number; presentes: number }>();
            atts.forEach(a => {
                if (!presencasPorAluno.has(a.studentId))
                    presencasPorAluno.set(a.studentId, { total: 0, presentes: 0 });
                const entry = presencasPorAluno.get(a.studentId)!;
                entry.total++;
                if (a.present) entry.presentes++;
            });
            const alunosEmRiscoDetalhe = Array.from(presencasPorAluno.entries())
                .filter(([, v]) => v.total > 0 && v.presentes / v.total < 0.75)
                .map(([sid, v]) => ({
                    studentId: sid,
                    studentName: studentInfo.get(sid)?.nome || 'Aluno',
                    studentEmail: studentInfo.get(sid)?.email || '',
                    studentPhone: studentInfo.get(sid)?.phone ?? null,
                    cpf: studentInfo.get(sid)?.cpf ?? null,
                    freqPct: Math.round((v.presentes / v.total) * 100),
                    classId: c.id,
                    classIdentifier: c.classIdentifier,
                    curso: c.course.name,
                }));
            const alunosEmRisco = alunosEmRiscoDetalhe.length;

            const inicio = new Date(c.startDate).getTime();
            const fim    = new Date(c.endDate).getTime();
            const agora  = Date.now();
            const progressoPct = fim > inicio
                ? Math.min(100, Math.round(((agora - inicio) / (fim - inicio)) * 100))
                : 0;
            const diasRestantes = Math.max(0,
                Math.ceil((fim - agora) / 86400000)
            );

            const podeLancarFrequencia = c.status === 'IN_PROGRESS';

            return {
                id: c.id,
                classIdentifier: c.classIdentifier,
                status: c.status,
                podeLancarFrequencia,
                curso: c.course.name,
                cargaHoraria: c.course.workloadHours,
                cidade: c.city?.name ?? '—',
                estado: c.city?.state ?? '—',
                startDate: c.startDate,
                endDate: c.endDate,
                startTime: c.startTime,
                endTime: c.endTime,
                totalAlunos,
                aulasRealizadas,
                freqMedia,
                alunosEmRisco,
                alunosEmRiscoDetalhe,
                ultimaAula: ultimaAulaDate,
                freqHojeRegistrada,
                progressoPct,
                diasRestantes,
                certificadosEmitidos: c.certificates.length,
            };
        });

        const statusSortOrder: Record<string, number> = {
            IN_PROGRESS: 0,
            ENROLLMENT_OPEN: 1,
            ENROLLMENT_CLOSED: 2,
            PLANNED: 3,
            COMPLETED: 4,
        };
        turmasProcessadas.sort(
            (a, b) =>
                (statusSortOrder[a.status] ?? 9) - (statusSortOrder[b.status] ?? 9) ||
                new Date(a.endDate).getTime() - new Date(b.endDate).getTime(),
        );

        const turmasEmAndamento = turmasProcessadas.filter(t => t.status === 'IN_PROGRESS');
        const turmasPlanejadas = turmasProcessadas.filter(t => t.status === 'PLANNED');

        // 3. Reembolsos pendentes
        const reembolsos = await this.prisma.reimbursement.findMany({
            where: { requestedBy: teacherUserId },
            select: { status: true, amount: true },
        });
        const reembolsosPendentes = reembolsos.filter(r => r.status === 'PENDING');
        const valorPendente = reembolsosPendentes
            .reduce((acc, r) => acc + Number(r.amount), 0);

        // 4. Checkin de hoje (select explícito — compatível se migration checkoutAt ainda não aplicada)
        let checkinHoje: { id: string } | null = null;
        try {
            checkinHoje = await this.prisma.teacherCheckin.findFirst({
                where: { userId: teacherUserId, date: todayStr },
                select: { id: true },
            });
        } catch {
            checkinHoje = null;
        }

        const employee = await this.prisma.employee.findFirst({
            where: { userId: teacherUserId },
        });

        let checkinEditado = false;
        let checkinMotivo = null;

        if (employee) {
            const dateObj = new Date(Date.UTC(
                Number(todayStr.split('-')[0]),
                Number(todayStr.split('-')[1]) - 1,
                Number(todayStr.split('-')[2]),
            ));
            const attendance = await this.prisma.employeeAttendance.findUnique({
                where: { employeeId_date: { employeeId: employee.id, date: dateObj } },
            });
            if (attendance && attendance.justification?.startsWith('[ADMIN_OVERRIDE]')) {
                checkinEditado = true;
                checkinMotivo = attendance.justification.replace('[ADMIN_OVERRIDE] ', '');
            }
        }

        // 5. Certificados elegíveis nas turmas do professor
        const certElegiveis = await this.prisma.enrollment.count({
            where: {
                status: { in: ['ENROLLED', 'APPROVED'] },
                class: {
                    teachers: { some: { teacher: { userId: teacherUserId } } },
                },
            },
        });

        // 6. KPIs globais (risco só em turmas em andamento)
        const totalAlunosEmRisco = turmasEmAndamento.reduce(
            (acc, t) => acc + t.alunosEmRisco, 0
        );

        // 7. Agregar todos os alunos em risco (lista raiz, sem duplicatas studentId+classId)
        const alunosEmRiscoDetalhe = turmasEmAndamento.flatMap(t => t.alunosEmRiscoDetalhe ?? []);
        // 8. Alertas automáticos (frequência / encerramento só para turmas em andamento)
        const alertas: {
            tipo: string; turmaId?: string;
            turmaIdentifier?: string; mensagem: string; urgente: boolean;
        }[] = [];

        turmasEmAndamento
            .filter(t => !t.freqHojeRegistrada && t.totalAlunos > 0)
            .forEach(t => alertas.push({
                tipo: 'freq_pendente', turmaId: t.id, turmaIdentifier: t.classIdentifier,
                mensagem: `Lançar frequência — ${t.classIdentifier} (${t.startTime}–${t.endTime})`,
                urgente: true,
            }));

        turmasEmAndamento
            .filter(t => t.alunosEmRisco > 0)
            .forEach(t => alertas.push({
                tipo: 'aluno_risco', turmaId: t.id, turmaIdentifier: t.classIdentifier,
                mensagem: `${t.alunosEmRisco} aluno(s) com frequência < 75% — ${t.classIdentifier}`,
                urgente: t.alunosEmRisco >= 3,
            }));

        turmasEmAndamento
            .filter(t => t.diasRestantes > 0 && t.diasRestantes <= 7)
            .forEach(t => alertas.push({
                tipo: 'encerrando', turmaId: t.id, turmaIdentifier: t.classIdentifier,
                mensagem: `${t.classIdentifier} encerra em ${t.diasRestantes} dia(s)`,
                urgente: t.diasRestantes <= 3,
            }));

        if (!checkinHoje) {
            alertas.push({ tipo: 'checkin', mensagem: 'Registrar ponto de hoje', urgente: false });
        }

        return {
            turmasAtivas: turmasEmAndamento.length,
            turmasPlanejadas: turmasPlanejadas.length,
            turmasTotal: turmasProcessadas.length,
            totalAlunosEmRisco,
            certElegiveis,
            reembolsosPendentes: reembolsosPendentes.length,
            valorPendente: valorPendente.toFixed(2),
            checkinHoje: !!checkinHoje,
            checkinEditado,
            checkinMotivo,
            turmas: turmasProcessadas,
            alunosEmRiscoDetalhe,   // lista raiz com todos alunos em risco (todas as turmas)
            alertas,
        };
    }

    // ── ALERTA DE RISCO — notificação persistente + WebSocket ────────────────────
    async sendRiskAlert(classId: string, studentId: string, teacherUserId: string) {
        // 1. Dados do aluno
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
            select: {
                cpf: true, userId: true,
                user: { select: { id: true, name: true, email: true } },
            },
        });
        if (!student) throw new NotFoundException('Aluno não encontrado');

        // 2. Dados da turma
        const classData = await this.prisma.class.findUnique({
            where: { id: classId },
            select: { classIdentifier: true, course: { select: { name: true } } },
        });
        if (!classData) throw new NotFoundException('Turma não encontrada');

        // 3. Professor
        const teacher = await this.prisma.user.findUnique({
            where: { id: teacherUserId },
            select: { name: true },
        });

        // 4. Frequência atual do aluno nesta turma
        const atts = await this.prisma.attendance.findMany({
            where: { classId, studentId },
            select: { present: true },
        });
        const freqPct = atts.length > 0
            ? Math.round((atts.filter(a => a.present).length / atts.length) * 100)
            : 0;

        // 5. Notificação persistente para o ALUNO
        await this.prisma.notification.create({
            data: {
                userId: student.userId,
                type: 'GENERAL_ANNOUNCEMENT',
                title: '⚠️ Frequência abaixo do mínimo',
                message: `Sua frequência na turma ${classData.classIdentifier} (${classData.course.name}) está em ${freqPct}%, abaixo do mínimo exigido de 75%. Por favor, comparecer às próximas aulas para regularizar sua situação.`,
                channel: 'IN_APP',
                deliveryStatus: 'DELIVERED',
                // FIX-1: campo 'link' não existe na tabela — usar campo 'data' jsonb
                data: { link: '/student/certificados', freqPct, classIdentifier: classData.classIdentifier },
            } as any,
        });

        // 6. Notificação para TODOS os ADMINs/COORDs
        const admins = await this.prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'COORDINATOR'] }, active: true },
            select: { id: true },
        });
        for (const admin of admins) {
            await this.prisma.notification.create({
                data: {
                    userId: admin.id,
                    type: 'GENERAL_ANNOUNCEMENT',
                    title: '⚠️ Aluno em risco de reprovação',
                    message: `Prof. ${teacher?.name ?? 'Professor'} alertou ${student.user.name} sobre frequência de ${freqPct}% na turma ${classData.classIdentifier}. Ação pode ser necessária.`,
                    channel: 'IN_APP',
                    deliveryStatus: 'DELIVERED',
                } as any,
            });
        }

        // 7. WebSocket em tempo real (try/catch — não falha o request se WS indisponível)
        try {
            this.notifications.notifyUser(student.userId, 'nova_notificacao', {
                title: '⚠️ Frequência abaixo do mínimo',
                message: `Turma ${classData.classIdentifier}: ${freqPct}% de frequência`,
            });
            this.notifications.notifyAdmins('aluno_risco_alertado', {
                studentName: student.user.name,
                classIdentifier: classData.classIdentifier,
                freqPct,
                teacherName: teacher?.name ?? 'Professor',
                actorName: teacher?.name ?? 'Professor',
                actorUserId: teacherUserId,
            });
        } catch { /* WS opcional */ }

        return {
            success: true,
            message: `Alerta enviado para ${student.user.name}. Admins notificados.`,
            studentName: student.user.name,
            freqPct,
        };
    }
}
