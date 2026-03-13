import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';

@Injectable()
export class CitiesService {
    constructor(private prisma: PrismaService) { }

    async findAll(state?: string) {
        const where = state ? { state } : {};

        return this.prisma.city.findMany({
            where,
            orderBy: [
                { state: 'asc' },
                { name: 'asc' },
            ],
            include: {
                _count: {
                    select: {
                        classes: true,
                    },
                },
            },
        });
    }

    async findOne(id: string) {
        const city = await this.prisma.city.findUnique({
            where: { id },
            include: {
                classes: {
                    include: {
                        course: true,
                    },
                    orderBy: { startDate: 'desc' },
                    take: 10,
                },
                _count: {
                    select: {
                        classes: true,
                        tripsOrigin: true,
                        tripsDestination: true,
                    },
                },
            },
        });

        if (!city) {
            throw new NotFoundException('City not found');
        }

        return city;
    }

    async create(data: CreateCityDto) {
        // Check if city already exists
        const existing = await this.prisma.city.findFirst({
            where: {
                name: data.name,
                state: data.state,
            },
        });

        if (existing) {
            throw new ConflictException('City already exists in this state');
        }

        return this.prisma.city.create({
            data,
        });
    }

    async update(id: string, data: UpdateCityDto) {
        await this.findOne(id);

        // Check for duplicate if name or state is being changed
        if (data.name || data.state) {
            const existing = await this.prisma.city.findFirst({
                where: {
                    name: data.name,
                    state: data.state,
                    NOT: { id },
                },
            });

            if (existing) {
                throw new ConflictException('City already exists in this state');
            }
        }

        return this.prisma.city.update({
            where: { id },
            data,
        });
    }

    async delete(id: string) {
        await this.findOne(id);

        // Check if city has classes
        const classCount = await this.prisma.class.count({
            where: { cityId: id },
        });

        if (classCount > 0) {
            throw new ConflictException('Cannot delete city with existing classes');
        }

        return this.prisma.city.delete({
            where: { id },
        });
    }

    async findByState(state: string) {
        return this.prisma.city.findMany({
            where: { state },
            orderBy: { name: 'asc' },
        });
    }
}
