import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TripStatus } from '@prisma/client';

@Injectable()
export class TripsService {
    constructor(private prisma: PrismaService) {}

    // ── Driver: busca viagens do motorista autenticado ────────────────────────
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

    // ── Admin: busca todas as viagens ─────────────────────────────────────────
    async findAllAdmin(status?: TripStatus, driverUserId?: string) {
        const where: any = {};
        if (status) where.status = status;
        if (driverUserId) where.driverUserId = driverUserId;

        return this.prisma.trip.findMany({
            where,
            orderBy: { departureDate: 'desc' },
            include: {
                originCity:      { select: { name: true, state: true } },
                destinationCity: { select: { name: true, state: true } },
                truck:           { select: { identifier: true, licensePlate: true } },
                driverUser:      { select: { id: true, name: true } },
            },
        });
    }

    // ── Driver: busca viagem única — valida que pertence ao motorista ──────────
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

    // ── Driver: inicia uma viagem: PLANNED → IN_TRANSIT ───────────────────────
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

    // ── Driver: finaliza uma viagem: IN_TRANSIT → COMPLETED ───────────────────
    async completeTrip(id: string, driverUserId: string, kmEnd: number, actualArrivalDate?: string) {
        const trip = await this.findOne(id, driverUserId);
        if (trip.status !== TripStatus.IN_TRANSIT) {
            throw new BadRequestException('Apenas viagens EM TRÂNSITO podem ser finalizadas');
        }
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

    // ── Driver: adiciona nota ao diário de bordo (append) ─────────────────────
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

    /**
     * AUTOMAÇÃO INTELIGENTE — Gera trips PLANNED para todas as datas de aula
     * de uma turma que ainda não têm viagem correspondente.
     *
     * Fluxo:
     *   1. Admin cadastra turma com Schedule (dias da semana) + Truck + Driver
     *   2. Admin chama este endpoint — trips são geradas automaticamente
     *   3. Driver recebe notificação e só precisa iniciar cada viagem no dia
     *
     * @param classId ID da turma
     * @param driverUserId User ID do motorista responsável
     */
    async generateTripsForClass(classId: string, driverUserId: string) {
        const classData = await this.prisma.class.findUnique({
            where: { id: classId },
            include: {
                schedules: { where: { active: true }, orderBy: { weekday: 'asc' } },
                city:      true,
                truck:     true,
            },
        });
        if (!classData) throw new NotFoundException('Turma não encontrada');
        if (!classData.truck) throw new BadRequestException('Turma não tem carreta associada. Vincule uma carreta à turma primeiro.');
        if (!classData.schedules.length) throw new BadRequestException('Turma não tem dias de aula configurados. Configure o Schedule antes de gerar viagens.');

        const driver = await this.prisma.user.findUnique({
            where: { id: driverUserId },
            select: { id: true, name: true, role: true },
        });
        if (!driver) throw new NotFoundException('Motorista não encontrado');
        if (driver.role !== 'DRIVER') throw new BadRequestException('Usuário selecionado não é motorista');

        // Cidade de origem: qualquer cidade diferente do destino da turma
        const originCity = await this.prisma.city.findFirst({
            where: { id: { not: classData.cityId ?? '' } },
            orderBy: { name: 'asc' },
        }) ?? classData.city;

        // Gerar datas de aula baseado nos dias da semana (weekday 0=Dom, 1=Seg…6=Sáb)
        const classWeekdays = classData.schedules.map(s => s.weekday);
        const classDates: Date[] = [];
        const cur = new Date(classData.startDate);
        cur.setHours(0, 0, 0, 0);
        const end = new Date(classData.endDate);

        while (cur <= end) {
            if (classWeekdays.includes(cur.getDay())) {
                classDates.push(new Date(cur));
            }
            cur.setDate(cur.getDate() + 1);
        }

        // Verificar quais datas já têm trip para este motorista + cidade destino
        const existingTrips = await this.prisma.trip.findMany({
            where: {
                driverUserId,
                destinationCityId: classData.cityId ?? undefined,
                departureDate: { gte: classData.startDate, lte: classData.endDate },
            },
            select: { departureDate: true },
        });
        const existingDates = new Set(existingTrips.map(t => t.departureDate.toISOString().slice(0, 10)));

        // Criar trips para datas sem viagem
        const newTrips: any[] = [];
        for (const date of classDates) {
            const dateStr = date.toISOString().slice(0, 10);
            if (existingDates.has(dateStr)) continue;

            const departure = new Date(date);
            departure.setHours(6, 0, 0, 0);
            const expectedArrival = new Date(departure);
            expectedArrival.setHours(10, 0, 0, 0); // +4h estimado

            newTrips.push({
                truckId:             classData.truck!.id,
                originCityId:        originCity?.id ?? classData.cityId,
                destinationCityId:   classData.cityId,
                driverUserId,
                driverName:          driver.name,
                departureDate:       departure,
                expectedArrivalDate: expectedArrival,
                status:              TripStatus.PLANNED,
                notes:               `🤖 Gerada automaticamente — Aula da turma ${classData.classIdentifier} em ${classData.city?.name}/${classData.city?.state}`,
            });
        }

        if (newTrips.length === 0) {
            return {
                message: 'Todas as datas de aula já têm viagem correspondente.',
                generated: 0,
                existing: existingDates.size,
            };
        }

        const created = await Promise.all(
            newTrips.map(trip => this.prisma.trip.create({ data: trip }))
        );

        // Notificar motorista
        try {
            await this.prisma.notification.create({
                data: {
                    userId:         driverUserId,
                    type:           'GENERAL_ANNOUNCEMENT',
                    title:          `🚛 ${created.length} Viagens Agendadas!`,
                    message:        `Turma ${classData.classIdentifier} — ${created.length} dias de aula adicionados à sua agenda automaticamente.`,
                    link:           '/driver/viagens',
                    channel:        'IN_APP',
                    deliveryStatus: 'DELIVERED',
                } as any,
            });
        } catch { /* notification optional */ }

        return {
            message: `${created.length} viagens geradas automaticamente para a turma ${classData.classIdentifier}`,
            generated: created.length,
            existing: existingDates.size,
            trips: created.map(t => ({ id: t.id, departureDate: t.departureDate, status: t.status })),
        };
    }
}
