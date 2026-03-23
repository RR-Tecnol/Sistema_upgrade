import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { EmployeeRole, EmployeeDepartment } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EmployeesService {
    constructor(private prisma: PrismaService) { }

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
                rg: dto.rg,
                phone: dto.phone,
                email: dto.email,
                specialty: dto.specialty,
                dailyCost: dto.dailyCost,
                contractType: dto.contractType as any,
                monthlySalaryCLT: dto.monthlySalaryCLT,
                travelRuleKm: dto.travelRuleKm ?? 200,
                hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
                notes: dto.notes,
                photoUrl: dto.photoUrl,
                active: dto.active ?? true,
                ...(userId ? { userId } : {}),
            },
        });
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
                ...(dto.rg !== undefined && { rg: dto.rg }),
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
}
