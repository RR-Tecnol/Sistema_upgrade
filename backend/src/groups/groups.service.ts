import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.group.findMany({
            orderBy: [
                { state: 'asc' },
                { name: 'asc' },
            ],
            include: {
                _count: {
                    select: {
                        trucks: true,
                        classes: true,
                    },
                },
            },
        });
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
