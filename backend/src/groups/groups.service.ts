import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { paginatedResult, resolvePagination } from '../common/pagination.util';

@Injectable()
export class GroupsService {
    constructor(private prisma: PrismaService) { }

    async findAll(opts?: { page?: number; limit?: number; search?: string }) {
        const where: any = {};
        if (opts?.search?.trim()) {
            where.name = { contains: opts.search.trim(), mode: 'insensitive' };
        }
        const { skip, page, limit } = resolvePagination(opts?.page, opts?.limit, 12);
        const include = {
            _count: {
                select: {
                    trucks: true,
                    classes: true,
                },
            },
        };
        const [data, total] = await Promise.all([
            this.prisma.group.findMany({
                where,
                orderBy: [{ state: 'asc' }, { name: 'asc' }],
                include,
                skip,
                take: limit,
            }),
            this.prisma.group.count({ where }),
        ]);
        return paginatedResult(data, total, page, limit);
    }

    async findOne(id: string) {
        const group = await this.prisma.group.findUnique({
            where: { id },
            include: {
                trucks: {
                    orderBy: { identifier: 'asc' },
                },
                classes: {
                    include: {
                        course: true,
                        city: true,
                    },
                    orderBy: { startDate: 'desc' },
                    take: 20,
                },
                _count: {
                    select: {
                        trucks: true,
                        classes: true,
                    },
                },
            },
        });

        if (!group) {
            throw new NotFoundException('Group not found');
        }

        return group;
    }

    async create(data: CreateGroupDto) {
        // Check if group name already exists
        const existing = await this.prisma.group.findUnique({
            where: { name: data.name },
        });

        if (existing) {
            throw new ConflictException('Group name already exists');
        }

        return this.prisma.group.create({
            data,
        });
    }

    async update(id: string, data: UpdateGroupDto) {
        await this.findOne(id);

        // Check for duplicate name if being changed
        if (data.name) {
            const existing = await this.prisma.group.findFirst({
                where: {
                    name: data.name,
                    NOT: { id },
                },
            });

            if (existing) {
                throw new ConflictException('Group name already exists');
            }
        }

        return this.prisma.group.update({
            where: { id },
            data,
        });
    }

    async delete(id: string) {
        await this.findOne(id);

        // Check if group has trucks
        const truckCount = await this.prisma.truck.count({
            where: { groupId: id },
        });

        if (truckCount > 0) {
            throw new ConflictException('Cannot delete group with existing trucks');
        }

        // Check if group has classes
        const classCount = await this.prisma.class.count({
            where: { groupId: id },
        });

        if (classCount > 0) {
            throw new ConflictException('Cannot delete group with existing classes');
        }

        return this.prisma.group.delete({
            where: { id },
        });
    }

    async findByState(state: string) {
        return this.prisma.group.findMany({
            where: { state },
            orderBy: { name: 'asc' },
        });
    }
}
