import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { NotificationsSenderService } from '../notifications/notifications-sender.service';
import { EmployeeRole, EmployeeDepartment, NotificationType, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class EmployeesService {
    constructor(
        private prisma: PrismaService,
        private notifications: NotificationsSenderService,
    ) { }

    private isMissingDriverCheckinsTable(error: unknown): boolean {
        const err = error as { code?: string; message?: string };
        if (err?.code === 'P2021') {
            return (err?.message || '').includes('driver_checkins');
        }
        return (err?.message || '').includes('driver_checkins');
    }

    async create(dto: CreateEmployeeDto) {
        // Check CPF uniqueness
        if (dto.cpf) {
            const existing = await this.prisma.employee.findUnique({ where: { cpf: dto.cpf } });
            if (existing) throw new ConflictException('CPF já cadastrado');
        }
        // Check email uniqueness
        if (dto.email) {
            const existing = await this.prisma.employee.findUnique({ where: { email: dto.email } });
            if (existing) throw new ConflictException('E-mail já cadastrado');
        }

        // Se senha fornecida, criar User de acesso com role mapeado
        let userId: string | undefined;
        if (dto.password && dto.password.length >= 6) {
            if (!dto.email) {
                throw new Error('E-mail é obrigatório para criar acesso ao sistema. Preencha o campo de e-mail.');
            }
            // Verificar se já existe User com esse email
            const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
            if (existingUser) throw new ConflictException('E-mail já cadastrado como usuário do sistema');

            const roleMap: Record<string, string> = {
                INSTRUCTOR: 'TEACHER',
                NURSE: 'TEACHER',
                TECHNICIAN: 'TEACHER',
                ADMINISTRATIVE: 'TEACHER',
                OTHER: 'TEACHER',
                COORDINATOR: 'COORDINATOR',
                DRIVER: 'DRIVER',
            };
            const userRole = roleMap[dto.role] ?? 'TEACHER';
            const hashed = await bcrypt.hash(dto.password, 10);
            const user = await this.prisma.user.create({
                data: {
                    name: dto.name,
                    email: dto.email,
                    password: hashed,
                    role: userRole as any,
                },
            });
            userId = user.id;
        }


        return this.prisma.employee.create({
            data: {
                name: dto.name,
                role: dto.role,
                department: dto.department,
                cpf: dto.cpf,
                phone: dto.phone,
                email: dto.email,
                specialty: dto.specialty,
                dailyCost: dto.dailyCost,
                contractType: dto.contractType as any,
                monthlySalaryCLT: dto.monthlySalaryCLT,
                travelRuleKm: dto.travelRuleKm ?? 200,
                hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
                notes: dto.notes,
                photoUrl: dto.photoUrl ?? (dto.documents as any)?.general?.selfieUrl ?? undefined,
                documents: dto.documents ?? undefined,
                active: dto.active ?? true,
                ...(userId ? { userId } : {}),
            },
        });
    }

    // ============================================
    // CADASTRO SEGURO DE FUNCIONÁRIOS (LINKS)
    // ============================================

    async createRegistrationToken(adminId: string, role: any, department: any) {
        const tokenStr = crypto.randomBytes(32).toString('hex');
        
        const token = await this.prisma.employeeRegistrationToken.create({
            data: {
                token: tokenStr,
                role,
                department,
                createdBy: adminId,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
            }
        });

        return { token: token.token, expiresAt: token.expiresAt };
    }

    async validateRegistrationToken(tokenStr: string) {
        const token = await this.prisma.employeeRegistrationToken.findUnique({
            where: { token: tokenStr },
            include: { request: true }
        });

        if (!token) throw new NotFoundException('Link inválido ou não encontrado.');
        if (token.revoked) throw new BadRequestException('Este link foi revogado.');
        if (token.used || token.request) throw new BadRequestException('Este link já foi utilizado.');
        if (new Date() > token.expiresAt) throw new BadRequestException('Este link expirou.');

        return { role: token.role, department: token.department };
    }

    async submitRegistration(tokenStr: string, dto: any) {
        const token = await this.prisma.employeeRegistrationToken.findUnique({
            where: { token: tokenStr },
            include: { request: true }
        });

        if (!token) throw new NotFoundException('Link inválido.');
        if (token.used || token.revoked || new Date() > token.expiresAt) {
            throw new BadRequestException('Link inválido ou expirado.');
        }

        const existingRequest = await this.prisma.employeeRegistrationRequest.findFirst({
            where: {
                OR: [ { cpf: dto.cpf }, { email: dto.email } ],
                status: 'PENDING'
            }
        });

        if (existingRequest) {
            throw new ConflictException('Já existe uma solicitação pendente com este CPF ou E-mail.');
        }

        const request = await this.prisma.employeeRegistrationRequest.create({
            data: {
                tokenId: token.id,
                name: dto.name,
                cpf: dto.cpf,
                email: dto.email,
                phone: dto.phone,
                birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
                submittedData: dto.submittedData,
            }
        });

        await this.prisma.employeeRegistrationToken.update({
            where: { id: token.id },
            data: { used: true }
        });

        return { message: 'Cadastro enviado com sucesso para análise.' };
    }

    async getRegistrationRequests() {
        return this.prisma.employeeRegistrationRequest.findMany({
            where: { status: 'PENDING' },
            include: {
                token: { select: { role: true, department: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async approveRegistrationRequest(
        id: string,
        adminId: string,
        options?: { dailyCost?: number },
    ) {
        const request = await this.prisma.employeeRegistrationRequest.findUnique({
            where: { id },
            include: { token: true }
        });

        if (!request) throw new NotFoundException('Solicitação não encontrada.');
        if (request.status !== 'PENDING') throw new BadRequestException('Solicitação já processada.');

        const data = request.submittedData as any;
        
        let userId: string | undefined;
        if (data.password && data.password.length >= 6) {
            const existingUser = await this.prisma.user.findUnique({ where: { email: request.email } });
            if (existingUser) throw new ConflictException('E-mail já cadastrado no sistema.');

            const roleMap: Record<string, string> = {
                INSTRUCTOR: 'TEACHER',
                NURSE: 'TEACHER',
                TECHNICIAN: 'TEACHER',
                COORDINATOR: 'COORDINATOR',
                DRIVER: 'DRIVER',
                ADMIN: 'ADMIN',   // IT_ADMIN pode convidar Admins
            };
            const userRole = roleMap[request.token.role] || 'TEACHER';

            const hashed = await bcrypt.hash(data.password, 10);
            const user = await this.prisma.user.create({
                data: {
                    name: request.name,
                    email: request.email,
                    password: hashed,
                    role: userRole as any,
                    // ADMIN e COORDINATOR exigem setup de TOTP no primeiro login
                    requiresTwoFactorSetup: ['ADMIN', 'COORDINATOR'].includes(userRole),
                } as any,
            });
            userId = user.id;
        }

        const dailyCostFromAdmin = options?.dailyCost;
        if (dailyCostFromAdmin == null || Number.isNaN(Number(dailyCostFromAdmin)) || Number(dailyCostFromAdmin) <= 0) {
            throw new BadRequestException('Defina um valor de diária válido para aprovar o cadastro.');
        }

        const employee = await this.prisma.employee.create({
            data: {
                name: request.name,
                cpf: request.cpf,
                email: request.email,
                phone: request.phone,
                role: request.token.role,
                department: request.token.department,
                active: true,
                dailyCost: Number(dailyCostFromAdmin),
                photoUrl: data.documents?.selfieUrl || data.photoUrl,
                specialty: data.teacher?.fieldOfStudy || data.driver?.cnhCategory || data.coordinator?.formation || data.specialty, 
                contractType: data.contractType || 'CLT',
                userId: userId,
                hireDate: new Date(),
                documents: {
                    general: data.documents,
                    teacher: data.teacher,
                    driver: data.driver,
                    coordinator: data.coordinator,
                    address: data.address
                }
            }
        });

        // Resolve the Teacher creation bug
        if (request.token.role === 'INSTRUCTOR' && userId) {
            await this.prisma.teacher.create({
                data: {
                    userId: userId,
                    cpf: request.cpf,
                    birthDate: request.birthDate || new Date(),
                    photoUrl: data.photoUrl,
                    education: data.teacher?.education || data.education || 'Não informada',
                    specialties: data.teacher?.fieldOfStudy || data.specialty || 'Geral',
                    experience: data.teacher?.experienceTime || data.experience,
                    certifications: data.teacher?.professionalReg || data.certifications,
                    resumeUrl: data.teacher?.experienceUrl || data.resumeUrl,
                    contractType: (data.contractType || 'CLT') as any,
                    hireDate: new Date(),
                    documents: {
                        diplomaUrl: data.teacher?.diplomaUrl,
                        certificatesUrl: data.teacher?.certificatesUrl,
                        experienceUrl: data.teacher?.experienceUrl,
                    }
                }
            });
        }

        await this.prisma.employeeRegistrationRequest.update({
            where: { id },
            data: {
                status: 'APPROVED',
                reviewedBy: adminId,
                reviewedAt: new Date()
            }
        });

        return employee;
    }

    async findAll(filters?: {
        role?: string;
        department?: string;
        active?: string;
        search?: string;
    }) {
        const where: any = {};
        if (filters?.role) where.role = filters.role as EmployeeRole;
        if (filters?.department) where.department = filters.department as EmployeeDepartment;
        if (filters?.active !== undefined) where.active = filters.active === 'true';
        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
                { cpf: { contains: filters.search, mode: 'insensitive' } },
                { specialty: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        const [employees, total] = await Promise.all([
            this.prisma.employee.findMany({
                where,
                orderBy: [{ active: 'desc' }, { name: 'asc' }],
            }),
            this.prisma.employee.count({ where }),
        ]);

        // KPIs
        const [byRole, byDept, activeCount] = await Promise.all([
            this.prisma.employee.groupBy({ by: ['role'], _count: { _all: true }, where: { active: true } }),
            this.prisma.employee.groupBy({ by: ['department'], _count: { _all: true }, where: { active: true } }),
            this.prisma.employee.count({ where: { active: true } }),
        ]);

        return { employees, total, activeCount, byRole, byDept };
    }

    async findOne(id: string) {
        const emp = await this.prisma.employee.findUnique({ where: { id } });
        if (!emp) throw new NotFoundException('Funcionário não encontrado');
        return emp;
    }

    async update(id: string, dto: Partial<CreateEmployeeDto>) {
        await this.findOne(id);
        return this.prisma.employee.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.role !== undefined && { role: dto.role }),
                ...(dto.department !== undefined && { department: dto.department }),
                ...(dto.cpf !== undefined && { cpf: dto.cpf }),
                ...(dto.phone !== undefined && { phone: dto.phone }),
                ...(dto.email !== undefined && { email: dto.email }),
                ...(dto.specialty !== undefined && { specialty: dto.specialty }),
                ...(dto.dailyCost !== undefined && { dailyCost: dto.dailyCost }),
                ...(dto.contractType !== undefined && { contractType: dto.contractType as any }),
                ...(dto.monthlySalaryCLT !== undefined && { monthlySalaryCLT: dto.monthlySalaryCLT }),
                ...(dto.travelRuleKm !== undefined && { travelRuleKm: dto.travelRuleKm }),
                ...(dto.hireDate !== undefined && { hireDate: new Date(dto.hireDate) }),
                ...(dto.notes !== undefined && { notes: dto.notes }),
                ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl }),
                ...(dto.documents !== undefined && { documents: dto.documents as any }),
                ...(dto.active !== undefined && { active: dto.active }),
            },
        });
    }

    async toggleActive(id: string) {
        const emp = await this.findOne(id);
        return this.prisma.employee.update({
            where: { id },
            data: { active: !emp.active },
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.employee.update({
            where: { id },
            data: { active: false },
        });
    }

    // ─── PASSO 3.2: Frequência de funcionários ────────────────────────────────

    // Registra/atualiza presença de múltiplos funcionários em uma data
    async bulkAttendance(
        registeredBy: string,
        date: string,
        records: { employeeId: string; present: boolean; justified?: boolean; justification?: string }[],
    ) {
        const [y, m, d] = date.split('-').map(Number);
        const dateObj = new Date(Date.UTC(y, m - 1, d)); // sempre meia-noite UTC

        // Um funcionário = uma linha por dia: último estado do payload vence (evita duplicar no mesmo request)
        const byEmployee = new Map<string, (typeof records)[number]>();
        for (const r of records) {
            byEmployee.set(r.employeeId, r);
        }
        const merged = [...byEmployee.values()];

        await Promise.all(merged.map(r =>
            this.prisma.employeeAttendance.upsert({
                where: { employeeId_date: { employeeId: r.employeeId, date: dateObj } },
                update: {
                    present: r.present,
                    justified: r.justified ?? false,
                    justification: r.justification ?? null,
                    registeredBy,
                    registeredAt: new Date(),
                },
                create: {
                    employeeId: r.employeeId,
                    date: dateObj,
                    present: r.present,
                    justified: r.justified ?? false,
                    justification: r.justification ?? null,
                    registeredBy,
                },
            })
        ));
        return { saved: merged.length, date };
    }

    // Retorna frequência de todos os funcionários em uma data
    async getAttendanceByDate(date: string) {
        const [y, m, d] = date.split('-').map(Number);
        const dateObj = new Date(Date.UTC(y, m - 1, d));
        return this.prisma.employeeAttendance.findMany({
            where: { date: dateObj },
            include: { employee: { select: { id: true, name: true, role: true, department: true } } },
        });
    }

    // Resumo de frequência por funcionário em um intervalo
    async getAttendanceSummary(startDate: string, endDate: string, role?: string) {
        const [sy, sm, sd] = startDate.split('-').map(Number);
        const [ey, em, ed] = endDate.split('-').map(Number);
        const start = new Date(Date.UTC(sy, sm - 1, sd));
        const end   = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999));

        const empWhere: Prisma.EmployeeWhereInput = { active: true };
        if (role) {
            empWhere.role = (role === 'TEACHER' ? 'INSTRUCTOR' : role) as EmployeeRole;
        }

        const employees = await this.prisma.employee.findMany({
            where: empWhere,
            include: { user: { select: { id: true, role: true } } },
            orderBy: { name: 'asc' },
        });
        if (!employees.length) return [];

        const byId = new Map(
            employees.map((e) => [
                e.id,
                { employee: { id: e.id, name: e.name, role: e.role }, present: 0, absent: 0, justified: 0 },
            ]),
        );
        const employeeIds = employees.map((e) => e.id);
        const userById = new Map(
            employees
                .filter((e) => e.userId)
                .map((e) => [e.userId as string, e.id] as const),
        );

        // Manual (employee_attendance) tem precedência sobre check-in automático no mesmo dia.
        const records = await this.prisma.employeeAttendance.findMany({
            where: { employeeId: { in: employeeIds }, date: { gte: start, lte: end } },
            include: { employee: { select: { id: true, name: true, role: true } } },
        });

        const manualDayKey = new Set<string>();
        for (const r of records) {
            manualDayKey.add(`${r.employeeId}#${r.date.toISOString().slice(0, 10)}`);
            const entry = byId.get(r.employeeId);
            if (!entry) continue;
            if (r.present) entry.present += 1;
            else if (r.justified) entry.justified += 1;
            else entry.absent += 1;
        }

        const startIso = startDate;
        const endIso = endDate;

        // Check-ins de professor contam como presença se o dia não tem registro manual.
        if (!role || role === 'TEACHER') {
            const teacherUserIds = employees
                .filter((e) => e.user?.role === 'TEACHER' || e.user?.role === 'COORDINATOR')
                .map((e) => e.userId)
                .filter(Boolean) as string[];
            if (teacherUserIds.length) {
                const tcs = await this.prisma.teacherCheckin.findMany({
                    where: { userId: { in: teacherUserIds }, date: { gte: startIso, lte: endIso } },
                    select: { userId: true, date: true },
                });
                for (const tc of tcs) {
                    const employeeId = userById.get(tc.userId);
                    if (!employeeId) continue;
                    const key = `${employeeId}#${tc.date}`;
                    if (manualDayKey.has(key)) continue;
                    const entry = byId.get(employeeId);
                    if (!entry) continue;
                    entry.present += 1;
                }
            }
        }

        // Check-ins de motorista contam como presença se o dia não tem registro manual.
        if (!role || role === 'DRIVER') {
            const driverUserIds = employees
                .filter((e) => e.user?.role === 'DRIVER')
                .map((e) => e.userId)
                .filter(Boolean) as string[];
            if (driverUserIds.length) {
                try {
                    const dcs = await this.prisma.driverCheckin.findMany({
                        where: { userId: { in: driverUserIds }, date: { gte: startIso, lte: endIso } },
                        select: { userId: true, date: true },
                    });
                    for (const dc of dcs) {
                        const employeeId = userById.get(dc.userId);
                        if (!employeeId) continue;
                        const key = `${employeeId}#${dc.date}`;
                        if (manualDayKey.has(key)) continue;
                        const entry = byId.get(employeeId);
                        if (!entry) continue;
                        entry.present += 1;
                    }
                } catch (error) {
                    if (!this.isMissingDriverCheckinsTable(error)) throw error;
                }
            }
        }

        return [...byId.values()].map((e) => ({
            ...e,
            total: e.present + e.absent + e.justified,
            rate:
                e.present + e.absent + e.justified > 0
                    ? Math.round((e.present / (e.present + e.absent + e.justified)) * 100)
                    : 0,
        }));
    }

    // ─── FREQUÊNCIA UNIFICADA (PASSO 4.1) ────────────────────────────────────

    /**
     * Retorna frequência unificada de funcionários em uma data.
     * Funde EmployeeAttendance com TeacherCheckin.
     * Se o professor tem TeacherCheckin mas não tem EmployeeAttendance, gera "virtual presente".
     */
    async getUnifiedAttendance(date: string, role?: string) {
        const [y, m, d] = date.split('-').map(Number);
        const dateObj = new Date(Date.UTC(y, m - 1, d));
        const nextDay = new Date(Date.UTC(y, m - 1, d + 1));

        // 1. Buscar todos os funcionários ativos com seus Users vinculados
        const where: any = { active: true };
        if (role) {
            const employeeRole = role === 'TEACHER' ? 'INSTRUCTOR' : role;
            where.role = employeeRole as EmployeeRole;
        }

        const employees = await this.prisma.employee.findMany({
            where,
            include: { user: { select: { id: true, name: true, email: true, role: true } } },
            orderBy: { name: 'asc' },
        });

        // 2. Buscar EmployeeAttendance existentes para essa data
        const empAttendances = await this.prisma.employeeAttendance.findMany({
            where: { date: dateObj },
            include: { registrar: { select: { id: true, name: true } } },
        });
        const empAttendanceMap = new Map(empAttendances.map(a => [a.employeeId, a]));

        // 3. Buscar TeacherCheckins do dia para todos os usuários de professores
        const teacherUserIds = employees
            .filter(e => e.user?.role === 'TEACHER' || e.user?.role === 'COORDINATOR')
            .map(e => e.userId)
            .filter(Boolean) as string[];

        const teacherCheckins = teacherUserIds.length > 0
            ? await this.prisma.teacherCheckin.findMany({
                where: { userId: { in: teacherUserIds }, date },
            })
            : [];
        const checkinByUserId = new Map(teacherCheckins.map(c => [c.userId, c]));

        // 4. Buscar DriverCheckins do dia para motoristas
        const driverUserIds = employees
            .filter(e => e.user?.role === 'DRIVER')
            .map(e => e.userId)
            .filter(Boolean) as string[];

        let driverCheckins: Array<{ userId: string; checkedAt: Date | null }> = [];
        if (driverUserIds.length > 0) {
            try {
                driverCheckins = await this.prisma.driverCheckin.findMany({
                    where: { userId: { in: driverUserIds }, date },
                    select: { userId: true, checkedAt: true },
                });
            } catch (error) {
                if (!this.isMissingDriverCheckinsTable(error)) {
                    throw error;
                }
                // Ambiente sem migration de driver_checkins: mantém frequência funcional sem check-in automático.
                driverCheckins = [];
            }
        }
        const driverCheckinByUserId = new Map(driverCheckins.map(c => [c.userId, c]));

        // 5. Montar resposta unificada
        return employees.map(emp => {
            const empAtt = empAttendanceMap.get(emp.id);
            const checkin = emp.userId ? checkinByUserId.get(emp.userId) : null;
            const driverCheckin = emp.userId ? driverCheckinByUserId.get(emp.userId) : null;
            const autoCheckin = checkin || driverCheckin;

            let present: boolean | null = empAtt?.present ?? null;
            let source: 'MANUAL' | 'AUTO_CHECKIN' | 'ADMIN_OVERRIDE' | 'PENDING' = 'PENDING';
            let checkinTime: string | null = null;
            let adminOverrideReason: string | null = null;

            if (empAtt) {
                // Existe registro manual/override
                source = (empAtt.justification?.startsWith('[ADMIN_OVERRIDE]')) ? 'ADMIN_OVERRIDE' : 'MANUAL';
                if (source === 'ADMIN_OVERRIDE') {
                    adminOverrideReason = empAtt.justification?.replace('[ADMIN_OVERRIDE] ', '') ?? null;
                }
                present = empAtt.present;
            } else if (autoCheckin) {
                // Sem EmployeeAttendance mas tem checkin automático → virtual presente
                present = true;
                source = 'AUTO_CHECKIN';
                checkinTime = 'checkedAt' in autoCheckin
                    ? (autoCheckin as any).checkedAt?.toISOString() ?? null
                    : null;
            }

            return {
                employee: {
                    id: emp.id,
                    name: emp.name,
                    role: emp.role,
                    department: emp.department,
                    userId: emp.userId,
                    userName: emp.user?.name,
                },
                attendanceId: empAtt?.id ?? null,
                present,
                justified: empAtt?.justified ?? false,
                source,
                checkinTime,
                adminOverrideReason,
                registeredAt: empAtt?.registeredAt ?? null,
                registrar: (empAtt as any)?.registrar ?? null,
                date,
            };
        });
    }

    /**
     * ADM altera o ponto de um funcionário e notifica o usuário.
     * O motivo é armazenado no campo justification com prefixo [ADMIN_OVERRIDE].
     */
    async adminOverrideAttendance(
        attendanceId: string | null,
        employeeId: string,
        date: string,
        present: boolean,
        reason: string,
        adminId: string,
        notifyUser = true,
    ) {
        const [y, m, d] = date.split('-').map(Number);
        const dateObj = new Date(Date.UTC(y, m - 1, d));

        // Encontrar o Employee para saber o userId
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            include: { user: { select: { id: true, name: true } } },
        });
        if (!employee) throw new NotFoundException('Funcionário não encontrado');

        const justification = `[ADMIN_OVERRIDE] ${reason}`;

        // Upsert do registro de frequência
        const updated = await this.prisma.employeeAttendance.upsert({
            where: { employeeId_date: { employeeId, date: dateObj } },
            create: {
                employeeId,
                date: dateObj,
                present,
                justified: true,
                justification,
                registeredBy: adminId,
            },
            update: {
                present,
                justified: true,
                justification,
                registeredBy: adminId,
                registeredAt: new Date(),
            },
        });

        // Notificar o usuário afetado se ele tiver conta no sistema
        if (notifyUser && employee.userId) {
            const adminUser = await this.prisma.user.findUnique({
                where: { id: adminId },
                select: { name: true },
            });
            const adminName = adminUser?.name || 'Administrador';

            const statusText = present ? 'PRESENÇA' : 'FALTA';
            await this.prisma.notification.create({
                data: {
                    userId: employee.userId,
                    type: 'GENERAL_ANNOUNCEMENT',
                    title: '⚠️ Ponto Alterado pelo RH',
                    message: `Seu registro de ponto do dia ${y}-${m}-${d} foi alterado para ${statusText} por ${adminName}. Motivo: ${reason}`,
                    channel: 'IN_APP',
                } as any,
            });
        }

        return updated;
    }

    /**
     * Retorna o histórico de registros (datas) para alimentar o calendário no Frontend.
     */
    async getHistorySummary(role?: string) {
        const whereEmp: any = { active: true };
        if (role) {
            whereEmp.role = (role === 'TEACHER' ? 'INSTRUCTOR' : role) as EmployeeRole;
        }

        const employees = await this.prisma.employee.findMany({
            where: whereEmp,
            select: { id: true, userId: true },
        });

        const empIds = employees.map(e => e.id);
        const userIds = employees.map(e => e.userId).filter(Boolean) as string[];

        const results: { date: string; present: boolean }[] = [];

        // Manuais
        const manual = await this.prisma.employeeAttendance.findMany({
            where: { employeeId: { in: empIds } },
            select: { date: true, present: true },
        });
        manual.forEach(m => results.push({ date: m.date.toISOString(), present: m.present }));

        // Automáticos (Professor)
        if (!role || role === 'TEACHER') {
            const teacherC = await this.prisma.teacherCheckin.findMany({
                where: { userId: { in: userIds } },
                select: { date: true },
            });
            teacherC.forEach(t => results.push({ date: `${t.date}T12:00:00Z`, present: true }));
        }

        // Automáticos (Motorista)
        if (!role || role === 'DRIVER') {
            try {
                const driverC = await this.prisma.driverCheckin.findMany({
                    where: { userId: { in: userIds } },
                    select: { date: true },
                });
                driverC.forEach(t => results.push({ date: `${t.date}T12:00:00Z`, present: true }));
            } catch (error) {
                if (!this.isMissingDriverCheckinsTable(error)) {
                    throw error;
                }
                // Ambiente sem migration de driver_checkins: ignora check-ins automáticos de motorista.
            }
        }

        return results;
    }

    /**
     * Painel admin: frequência completa de um funcionário no intervalo, fundindo manual + check-ins.
     */
    async getIndividualAttendanceDetail(employeeId: string, startDate?: string, endDate?: string) {
        const end = endDate || new Date().toISOString().split('T')[0];
        const startDefault = new Date();
        startDefault.setUTCDate(startDefault.getUTCDate() - 120);
        const start = startDate || startDefault.toISOString().split('T')[0];

        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            include: {
                user: { select: { id: true, name: true, email: true, phone: true, role: true } },
            },
        });
        if (!employee) throw new NotFoundException('Funcionário não encontrado');

        const [sy, sm, sd] = start.split('-').map(Number);
        const [ey, em, ed] = end.split('-').map(Number);
        const startObj = new Date(Date.UTC(sy, sm - 1, sd));
        const endObj = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999));

        const manuals = await this.prisma.employeeAttendance.findMany({
            where: { employeeId, date: { gte: startObj, lte: endObj } },
            include: { registrar: { select: { id: true, name: true } } },
            orderBy: { date: 'asc' },
        });

        let teacherCheckins: { date: string; checkedAt: Date }[] = [];
        let driverCheckins: { date: string; checkedAt: Date | null }[] = [];
        if (employee.userId) {
            teacherCheckins = await this.prisma.teacherCheckin.findMany({
                where: {
                    userId: employee.userId,
                    date: { gte: start, lte: end },
                },
                select: { date: true, checkedAt: true },
                orderBy: { date: 'asc' },
            });
            try {
                driverCheckins = await this.prisma.driverCheckin.findMany({
                    where: {
                        userId: employee.userId,
                        date: { gte: start, lte: end },
                    },
                    select: { date: true, checkedAt: true },
                    orderBy: { date: 'asc' },
                });
            } catch (error) {
                if (!this.isMissingDriverCheckinsTable(error)) throw error;
            }
        }

        const utcDayKey = (d: Date) => d.toISOString().split('T')[0];
        const manualMap = new Map(manuals.map(m => [utcDayKey(m.date), m]));
        const tcMap = new Map(teacherCheckins.map(c => [c.date, c]));
        const dcMap = new Map(driverCheckins.map(c => [c.date, c]));

        const allDates = new Set<string>();
        manuals.forEach(m => allDates.add(utcDayKey(m.date)));
        teacherCheckins.forEach(c => allDates.add(c.date));
        driverCheckins.forEach(c => allDates.add(c.date));

        const sortedDates = Array.from(allDates).filter(d => d >= start && d <= end).sort();

        const timeline = sortedDates.map(dateStr => {
            const empAtt = manualMap.get(dateStr);
            const tc = tcMap.get(dateStr);
            const dc = dcMap.get(dateStr);
            const auto = tc || dc;

            let present: boolean | null = empAtt?.present ?? null;
            let source: 'MANUAL' | 'AUTO_CHECKIN' | 'ADMIN_OVERRIDE' | 'PENDING' = 'PENDING';
            let checkinTime: string | null = null;
            let adminOverrideReason: string | null = null;

            if (empAtt) {
                source = (empAtt.justification?.startsWith('[ADMIN_OVERRIDE]')) ? 'ADMIN_OVERRIDE' : 'MANUAL';
                if (source === 'ADMIN_OVERRIDE') {
                    adminOverrideReason = empAtt.justification?.replace('[ADMIN_OVERRIDE] ', '') ?? null;
                }
                present = empAtt.present;
            } else if (auto) {
                present = true;
                source = 'AUTO_CHECKIN';
                checkinTime = auto.checkedAt?.toISOString() ?? null;
            }

            const justificationClean =
                empAtt?.justification &&
                !empAtt.justification.startsWith('[ADMIN_OVERRIDE]') &&
                !empAtt.justification.startsWith('[AUTO')
                    ? empAtt.justification
                    : null;

            return {
                date: dateStr,
                present,
                justified: empAtt?.justified ?? false,
                justification: justificationClean,
                source,
                checkinTime,
                adminOverrideReason,
                registrar: empAtt?.registrar ?? null,
                attendanceId: empAtt?.id ?? null,
            };
        });

        let presentCount = 0;
        let absentCount = 0;
        for (const row of timeline) {
            if (row.present === true) presentCount++;
            else if (row.present === false) absentCount++;
        }
        const decided = presentCount + absentCount;
        const rate = decided > 0 ? Math.round((presentCount / decided) * 100) : 0;

        const profile = {
            id: employee.id,
            name: employee.name,
            role: employee.role,
            department: employee.department,
            cpf: employee.cpf,
            email: employee.email,
            phone: employee.phone,
            specialty: employee.specialty,
            dailyCost: employee.dailyCost != null ? Number(employee.dailyCost) : null,
            hireDate: employee.hireDate?.toISOString() ?? null,
            photoUrl: employee.photoUrl,
            travelRuleKm: employee.travelRuleKm,
            notes: employee.notes,
            user: employee.user,
        };

        return {
            profile,
            period: { start, end },
            summary: {
                presentCount,
                absentCount,
                pendingCount: 0,
                decidedDays: decided,
                rate,
            },
            timeline,
        };
    }

    // ─── SISTEMA DE PONTO DO MOTORISTA (PASSO 4.2) ────────────────────────────

    /**
     * Motorista bate ponto. Cria registro em driverCheckin e sincroniza EmployeeAttendance.
     */
    async registerDriverCheckin(userId: string, note?: string) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Evitar duplicata no mesmo dia
        const existing = await this.prisma.driverCheckin.findFirst({
            where: { userId, date: today },
        });
        if (existing) {
            return { ...existing, alreadyRegistered: true };
        }

        let checkin;
        try {
            checkin = await this.prisma.driverCheckin.create({
                data: { userId, date: today, note },
            });
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                const row = await this.prisma.driverCheckin.findFirst({ where: { userId, date: today } });
                if (row) return { ...row, alreadyRegistered: true };
            }
            throw e;
        }

        // Sincronizar com EmployeeAttendance
        const employee = await this.prisma.employee.findFirst({
            where: { userId },
        });
        if (employee) {
            const dateObj = new Date(Date.UTC(
                Number(today.split('-')[0]),
                Number(today.split('-')[1]) - 1,
                Number(today.split('-')[2]),
            ));
            await this.prisma.employeeAttendance.upsert({
                where: { employeeId_date: { employeeId: employee.id, date: dateObj } },
                create: {
                    employeeId: employee.id,
                    date: dateObj,
                    present: true,
                    justified: false,
                    justification: '[AUTO_DRIVER_CHECKIN]',
                    registeredBy: userId,
                },
                update: {
                    present: true,
                    justification: '[AUTO_DRIVER_CHECKIN]',
                    registeredAt: new Date(),
                },
            });
        }

        return { ...checkin, alreadyRegistered: false };
    }

    async getDriverCheckins(userId: string) {
        return this.prisma.driverCheckin.findMany({
            where: { userId },
            orderBy: { checkedAt: 'desc' },
            take: 30,
        });
    }
}

