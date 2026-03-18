import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TripStatus } from '@prisma/client';

@Injectable()
export class TripsService {
    constructor(private prisma: PrismaService) {}

    // Busca viagens do motorista autenticado, com filtro opcional por status
    async findByDriver(driverUserId: string, status?: TripStatus) {
        const where: any = { driverUserId };
        if (status) where.status = status;

        return this.prisma.trip.findMany({
            where,
            orderBy: { departureDate: 'desc' },
            include: {
                originCity:      { select: { name: true, state: true } },
                destinationCity: { select: { name: true, state: true } },
                truck:           { select: { identifier: true, licensePlate: true } },
            },
        });
    }

    // Busca viagem única — valida que pertence ao motorista
    async findOne(id: string, driverUserId: string) {
        const trip = await this.prisma.trip.findUnique({
            where: { id },
            include: {
                originCity:      { select: { name: true, state: true } },
                destinationCity: { select: { name: true, state: true } },
                truck:           { select: { identifier: true, licensePlate: true } },
            },
        });
        if (!trip) throw new NotFoundException('Viagem não encontrada');
        if (trip.driverUserId !== driverUserId) throw new ForbiddenException('Acesso negado');
        return trip;
    }

    // Inicia uma viagem: PLANNED → IN_TRANSIT
    async startTrip(id: string, driverUserId: string, kmStart: number, actualDepartureDate?: string) {
        const trip = await this.findOne(id, driverUserId);
        if (trip.status !== TripStatus.PLANNED) {
            throw new BadRequestException('Apenas viagens PLANEJADAS podem ser iniciadas');
        }
        return this.prisma.trip.update({
            where: { id },
            data: {
                status: TripStatus.IN_TRANSIT,
                kmStart,
                departureDate: actualDepartureDate ? new Date(actualDepartureDate) : trip.departureDate,
            },
        });
    }

    // Finaliza uma viagem: IN_TRANSIT → COMPLETED
    async completeTrip(id: string, driverUserId: string, kmEnd: number, actualArrivalDate?: string) {
        const trip = await this.findOne(id, driverUserId);
        if (trip.status !== TripStatus.IN_TRANSIT) {
            throw new BadRequestException('Apenas viagens EM TRÂNSITO podem ser finalizadas');
        }
        // Valida coerência de quilometragem
        if (trip.kmStart && kmEnd <= trip.kmStart) {
            throw new BadRequestException('Km final deve ser maior que km inicial');
        }
        return this.prisma.trip.update({
            where: { id },
            data: {
                status: TripStatus.COMPLETED,
                kmEnd,
                actualArrivalDate: actualArrivalDate ? new Date(actualArrivalDate) : new Date(),
            },
        });
    }

    // Adiciona nota ao diário de bordo (append — nunca sobrescreve)
    async addNote(id: string, driverUserId: string, note: string) {
        const trip = await this.findOne(id, driverUserId);
        const now = new Date();
        const timestamp = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')} ${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}`;
        const appendedNotes = trip.notes
            ? `${trip.notes}\n[${timestamp}] ${note}`
            : `[${timestamp}] ${note}`;
        return this.prisma.trip.update({
            where: { id },
            data: { notes: appendedNotes },
        });
    }
}
