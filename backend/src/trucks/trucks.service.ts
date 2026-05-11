import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTruckDto } from './dto/create-truck.dto';
import { UpdateTruckDto } from './dto/update-truck.dto';
import { TruckStatus } from '@prisma/client';
import { NotificationsSenderService } from '../notifications/notifications-sender.service';

@Injectable()
export class TrucksService {
    constructor(
        private prisma: PrismaService,
        private notificationsSender: NotificationsSenderService,
    ) { }

    async findAll(filters?: { status?: TruckStatus; groupId?: string; type?: string; state?: string }) {
        const where: any = {};

        if (filters?.status) {
            where.status = filters.status;
        }

        if (filters?.groupId) {
            where.groupId = filters.groupId;
        }

        if (filters?.type) {
            where.type = filters.type;
        }

        if (filters?.state) {
            where.state = filters.state;
        }

        return this.prisma.truck.findMany({
            where,
            orderBy: { identifier: 'asc' },
            include: {
                group: true,
                _count: {
                    select: {
                        classes: true,
                        trips: true,
                        expenses: true,
                    },
                },
            },
        });
    }

    async findOne(id: string) {
        const truck = await this.prisma.truck.findUnique({
            where: { id },
            include: {
                group: true,
                classes: {
                    include: {
                        course: true,
                        city: true,
                    },
                    orderBy: { startDate: 'desc' },
                    take: 10,
                },
                trips: {
                    include: {
                        originCity: true,
                        destinationCity: true,
                    },
                    orderBy: { departureDate: 'desc' },
                    take: 10,
                },
                expenses: {
                    orderBy: { expenseDate: 'desc' },
                    take: 10,
                },
                _count: {
                    select: {
                        classes: true,
                        trips: true,
                        expenses: true,
                    },
                },
            },
        });

        if (!truck) {
            throw new NotFoundException('Truck not found');
        }

        return truck;
    }

    async create(data: CreateTruckDto) {
        // Check if identifier already exists
        const existing = await this.prisma.truck.findUnique({
            where: { identifier: data.identifier },
        });

        if (existing) {
            throw new ConflictException('Truck identifier already exists');
        }

        // Check if license plate already exists
        const existingPlate = await this.prisma.truck.findUnique({
            where: { licensePlate: data.licensePlate },
        });

        if (existingPlate) {
            throw new ConflictException('License plate already exists');
        }

        // Verify group exists
        const group = await this.prisma.group.findUnique({
            where: { id: data.groupId },
        });

        if (!group) {
            throw new NotFoundException('Group not found');
        }

        // PASSO 1.5: converter strings ISO para Date antes de passar ao Prisma
        // O DTO valida com @IsDateString() mas Prisma exige DateTime (objeto Date)
        const { lastMaintenanceDate, nextMaintenanceDate, ...rest } = data;

        return this.prisma.truck.create({
            data: {
                ...rest,
                ...(lastMaintenanceDate ? { lastMaintenanceDate: new Date(lastMaintenanceDate) } : {}),
                ...(nextMaintenanceDate ? { nextMaintenanceDate: new Date(nextMaintenanceDate) } : {}),
            },
            include: {
                group: true,
            },
        });
    }

    async update(id: string, data: UpdateTruckDto) {
        await this.findOne(id);

        // Check for duplicate identifier if being changed
        if (data.identifier) {
            const existing = await this.prisma.truck.findFirst({
                where: {
                    identifier: data.identifier,
                    NOT: { id },
                },
            });

            if (existing) {
                throw new ConflictException('Truck identifier already exists');
            }
        }

        // Check for duplicate license plate if being changed
        if (data.licensePlate) {
            const existing = await this.prisma.truck.findFirst({
                where: {
                    licensePlate: data.licensePlate,
                    NOT: { id },
                },
            });

            if (existing) {
                throw new ConflictException('License plate already exists');
            }
        }

        // Verify group exists if being changed
        if (data.groupId) {
            const group = await this.prisma.group.findUnique({
                where: { id: data.groupId },
            });

            if (!group) {
                throw new NotFoundException('Group not found');
            }
        }

        // PASSO 1.5: converter strings ISO para Date antes de passar ao Prisma (igual ao create)
        const { lastMaintenanceDate, nextMaintenanceDate, ...rest } = data;

        return this.prisma.truck.update({
            where: { id },
            data: {
                ...rest,
                ...(lastMaintenanceDate ? { lastMaintenanceDate: new Date(lastMaintenanceDate) } : {}),
                ...(nextMaintenanceDate ? { nextMaintenanceDate: new Date(nextMaintenanceDate) } : {}),
            },
            include: {
                group: true,
            },
        });
    }

    async delete(id: string) {
        await this.findOne(id);

        // Check if truck has active classes
        const activeClasses = await this.prisma.class.count({
            where: {
                truckId: id,
                status: {
                    in: ['ENROLLMENT_OPEN', 'ENROLLMENT_CLOSED', 'IN_PROGRESS'],
                },
            },
        });

        if (activeClasses > 0) {
            throw new ConflictException('Cannot delete truck with active classes');
        }

        return this.prisma.truck.update({
            where: { id },
            data: { status: 'INACTIVE' },
        });
    }

    async updateStatus(id: string, status: TruckStatus) {
        await this.findOne(id);

        return this.prisma.truck.update({
            where: { id },
            data: { status },
        });
    }

    async checkAvailability(id: string, startDate: Date, endDate: Date) {
        const truck = await this.findOne(id);

        // Check if truck is available
        if (truck.status !== 'AVAILABLE') {
            return {
                available: false,
                reason: `Truck is currently ${truck.status.toLowerCase()}`,
            };
        }

        // Check for overlapping classes
        const overlappingClasses = await this.prisma.class.count({
            where: {
                truckId: id,
                AND: [
                    {
                        startDate: {
                            lte: endDate,
                        },
                    },
                    {
                        endDate: {
                            gte: startDate,
                        },
                    },
                ],
                status: {
                    not: 'CANCELLED',
                },
            },
        });

        if (overlappingClasses > 0) {
            return {
                available: false,
                reason: 'Truck has overlapping classes in this period',
            };
        }

        // Check for overlapping trips
        const overlappingTrips = await this.prisma.trip.count({
            where: {
                truckId: id,
                AND: [
                    {
                        departureDate: {
                            lte: endDate,
                        },
                    },
                    {
                        OR: [
                            {
                                expectedArrivalDate: {
                                    gte: startDate,
                                },
                            },
                            {
                                actualArrivalDate: {
                                    gte: startDate,
                                },
                            },
                        ],
                    },
                ],
                status: {
                    not: 'COMPLETED',
                },
            },
        });

        if (overlappingTrips > 0) {
            return {
                available: false,
                reason: 'Truck has overlapping trips in this period',
            };
        }

        return {
            available: true,
            reason: 'Truck is available for this period',
        };
    }

    async scheduleMaintenance(id: string, date: Date) {
        const truck = await this.findOne(id);

        const updated = await this.prisma.truck.update({
            where: { id },
            data: {
                nextMaintenanceDate: date,
                status: 'MAINTENANCE',
            },
        });

        await this.notificationsSender.truckMaintenanceAlert(
            truck.identifier,
            `Manutenção agendada para ${date.toISOString().slice(0, 10)}`,
            true // adminOnly = true (já que não temos o ID do motorista aqui)
        ).catch(() => {});

        return updated;
    }
}
