import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TripStatus } from '@prisma/client';
import { NotificationsSenderService } from '../notifications/notifications-sender.service';
import { MinioService } from '../reimbursement/minio.service';

/** Extrai bucket + chave a partir da URL gravada no Trip (mesmo formato do presigned upload). */
/** Include compartilhado: lista admin + retorno de validação de auditoria. */
const TRIP_ADMIN_LIST_INCLUDE = {
    originCity: { select: { name: true, state: true } },
    destinationCity: { select: { name: true, state: true } },
    truck: { select: { identifier: true, licensePlate: true } },
    driverUser: { select: { id: true, name: true } },
    auditValidatedBy: { select: { id: true, name: true } },
    _count: { select: { locations: true } },
} as const;

export function parseTripOdometerStoredUrl(stored: string): { bucket: string; objectKey: string } | null {
    const s = String(stored ?? '').trim();
    if (!s) return null;
    try {
        const u = new URL(s);
        const segments = u.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
        if (segments.length < 2) return null;
        return { bucket: segments[0], objectKey: segments.slice(1).join('/') };
    } catch {
        return null;
    }
}

@Injectable()
export class TripsService {
    constructor(
        private prisma: PrismaService,
        private notificationsSender: NotificationsSenderService,
        private minioService: MinioService,
    ) {}

    /** GET assinado para o admin pré-visualizar fotos MinIO privadas no browser. */
    async getOdometerPhotoPresignedUrlForAdmin(tripId: string, kind: 'start' | 'end'): Promise<{ url: string }> {
        const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
        if (!trip) throw new NotFoundException('Viagem não encontrada');
        const raw = kind === 'start' ? trip.startOdometerPhotoUrl : trip.endOdometerPhotoUrl;
        if (!raw?.trim()) throw new NotFoundException('Foto não disponível para esta viagem');
        const parsed = parseTripOdometerStoredUrl(raw);
        if (!parsed) throw new BadRequestException('URL da foto armazenada é inválida');
        const url = await this.minioService.presignedGetUrl(parsed.bucket, parsed.objectKey, 3600);
        return { url };
    }

    /** GET assinado para o motorista (só a própria viagem). */
    async getOdometerPhotoPresignedUrlForDriver(tripId: string, driverUserId: string, kind: 'start' | 'end'): Promise<{ url: string }> {
        const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
        if (!trip) throw new NotFoundException('Viagem não encontrada');
        if (trip.driverUserId !== driverUserId) throw new ForbiddenException('Acesso negado');
        const raw = kind === 'start' ? trip.startOdometerPhotoUrl : trip.endOdometerPhotoUrl;
        if (!raw?.trim()) throw new NotFoundException('Foto não disponível para esta viagem');
        const parsed = parseTripOdometerStoredUrl(raw);
        if (!parsed) throw new BadRequestException('URL da foto armazenada é inválida');
        const url = await this.minioService.presignedGetUrl(parsed.bucket, parsed.objectKey, 3600);
        return { url };
    }

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
            include: TRIP_ADMIN_LIST_INCLUDE,
        });
    }

    /** Admin/coordenador confirma que analisou a viagem concluída como válida operacionalmente. */
    async validateAuditTrip(tripId: string, adminUserId: string) {
        const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
        if (!trip) throw new NotFoundException('Viagem não encontrada');
        if (trip.status !== TripStatus.COMPLETED) {
            throw new BadRequestException('Só é possível validar viagens já concluídas pelo motorista.');
        }
        if (trip.auditValidatedAt) {
            return this.prisma.trip.findUniqueOrThrow({
                where: { id: tripId },
                include: TRIP_ADMIN_LIST_INCLUDE,
            });
        }
        return this.prisma.trip.update({
            where: { id: tripId },
            data: {
                auditValidatedAt: new Date(),
                auditValidatedByUserId: adminUserId,
            },
            include: TRIP_ADMIN_LIST_INCLUDE,
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
    async startTrip(id: string, driverUserId: string, kmStart?: number, startOdometerPhotoUrl?: string, actualDepartureDate?: string) {
        const trip = await this.findOne(id, driverUserId);
        if (trip.status !== TripStatus.PLANNED) {
            throw new BadRequestException('Apenas viagens PLANEJADAS podem ser iniciadas');
        }
        const today = new Date();
        if (trip.departureDate.toDateString() !== today.toDateString()) {
            throw new BadRequestException('A viagem só pode ser iniciada no dia da partida agendada');
        }
        if (trip.driverDecision === 'REJECTED') {
            throw new BadRequestException('Esta viagem foi recusada. Aguarde reatribuição do administrador.');
        }
        if (!startOdometerPhotoUrl) {
            throw new BadRequestException('Foto inicial do hodômetro é obrigatória para iniciar a viagem');
        }
        const updated = await this.prisma.trip.update({
            where: { id },
            data: {
                status: TripStatus.IN_TRANSIT,
                ...(kmStart != null ? { kmStart } : {}),
                startOdometerPhotoUrl,
                driverDecision: 'ACCEPTED',
                driverDecisionAt: new Date(),
                driverDecisionReason: null,
                departureDate: actualDepartureDate ? new Date(actualDepartureDate) : trip.departureDate,
            },
        });

        const adminIds = await this.notificationsSender.getAdminAndCoordinatorIds().catch(() => []);
        await this.notificationsSender.sendToMany(
            adminIds,
            {
                type: 'GENERAL_ANNOUNCEMENT' as any,
                title: '🚛 Viagem iniciada',
                message: `${trip.driverName || 'Motorista'} iniciou a viagem ${trip.id.slice(0, 8)} (${trip.originCity?.name || 'Origem'} → ${trip.destinationCity?.name || 'Destino'}).`,
                channel: 'IN_APP' as any,
                link: '/admin/viagens',
            },
        ).catch(() => undefined);

        return updated;
    }

    // ── Driver: finaliza uma viagem: IN_TRANSIT → COMPLETED ───────────────────
    async completeTrip(id: string, driverUserId: string, endOdometerPhotoUrl: string, gpsDistanceKm?: number, kmEnd?: number, actualArrivalDate?: string) {
        const trip = await this.findOne(id, driverUserId);
        if (trip.status !== TripStatus.IN_TRANSIT) {
            throw new BadRequestException('Apenas viagens EM TRÂNSITO podem ser finalizadas');
        }
        
        // Se a quilometragem final não foi fornecida, tentamos deduzir pelo GPS
        let finalKm = kmEnd;
        if (!finalKm && trip.kmStart != null && gpsDistanceKm != null) {
            finalKm = Math.round(trip.kmStart + gpsDistanceKm);
        }

        if (trip.kmStart && finalKm && finalKm <= trip.kmStart) {
            throw new BadRequestException('Km final deve ser maior que km inicial');
        }
        const updated = await this.prisma.trip.update({
            where: { id },
            data: {
                status: TripStatus.COMPLETED,
                kmEnd: finalKm,
                gpsDistanceKm,
                endOdometerPhotoUrl,
                actualArrivalDate: actualArrivalDate ? new Date(actualArrivalDate) : new Date(),
            },
        });

        const adminIds = await this.notificationsSender.getAdminAndCoordinatorIds().catch(() => []);
        await this.notificationsSender.sendToMany(
            adminIds,
            {
                type: 'GENERAL_ANNOUNCEMENT' as any,
                title: '🏁 Viagem finalizada',
                message: `${trip.driverName || 'Motorista'} finalizou a viagem ${trip.id.slice(0, 8)} (${trip.originCity?.name || 'Origem'} → ${trip.destinationCity?.name || 'Destino'}).`,
                channel: 'IN_APP' as any,
                link: '/admin/viagens',
            },
        ).catch(() => undefined);

        return updated;
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

    async respondTrip(id: string, driverUserId: string, decision: 'ACCEPTED' | 'REJECTED', reason?: string) {
        const trip = await this.findOne(id, driverUserId);
        if (trip.status !== TripStatus.PLANNED) {
            throw new BadRequestException('Somente viagens planejadas podem ser aceitas ou recusadas');
        }
        if (trip.driverDecision === 'ACCEPTED' && decision === 'ACCEPTED') return trip;
        if (decision === 'REJECTED' && !reason?.trim()) {
            throw new BadRequestException('Informe o motivo da recusa');
        }

        const updated = await this.prisma.trip.update({
            where: { id },
            data: {
                driverDecision: decision,
                driverDecisionAt: new Date(),
                driverDecisionReason: decision === 'REJECTED' ? reason?.trim() ?? null : null,
            },
        });

        if (decision === 'REJECTED') {
            const marker = `[TRIP_REJECT:${trip.id}]`;
            const existingAbsence = await this.prisma.absence.findFirst({
                where: {
                    userId: driverUserId,
                    active: true,
                    description: { contains: marker },
                },
                select: { id: true },
            });
            if (!existingAbsence) {
                await this.prisma.absence.create({
                    data: {
                        userId: driverUserId,
                        type: 'OTHER' as any,
                        date: new Date(),
                        status: 'PENDING' as any,
                        description: `${marker} Recusa de viagem ${trip.id.slice(0, 8)} — ${trip.originCity?.name || 'Origem'} → ${trip.destinationCity?.name || 'Destino'}. Motivo: ${reason?.trim() || 'Não informado'}`,
                        adminNote: 'Gerado automaticamente pela recusa de viagem no portal do motorista.',
                    },
                });
            }
        }

        const title = decision === 'ACCEPTED' ? '✅ Viagem aceita pelo motorista' : '⚠️ Viagem recusada pelo motorista';
        const message = decision === 'ACCEPTED'
            ? `${trip.driverName || 'Motorista'} aceitou a viagem ${trip.id.slice(0, 8)}`
            : `${trip.driverName || 'Motorista'} recusou a viagem ${trip.id.slice(0, 8)}. Motivo: ${reason?.trim() || 'Não informado'}`;
        const adminIds = await this.notificationsSender.getAdminAndCoordinatorIds().catch(() => []);
        await this.notificationsSender.sendToMany(
            adminIds,
            {
                type: 'GENERAL_ANNOUNCEMENT' as any,
                title,
                message,
                channel: 'IN_APP' as any,
                link: '/admin/viagens',
            },
        ).catch(() => undefined);

        return updated;
    }

    async createManualTrip(input: {
        truckId: string;
        originCityId: string;
        destinationCityId: string;
        departureDate: string;
        expectedArrivalDate: string;
        driverUserId: string;
        notes?: string;
        originCep?: string;
        destinationCep?: string;
        originLatitude?: number;
        originLongitude?: number;
        destinationLatitude?: number;
        destinationLongitude?: number;
    }) {
        const driver = await this.prisma.user.findUnique({ where: { id: input.driverUserId } });
        if (!driver || driver.role !== 'DRIVER') {
            throw new BadRequestException('Motorista inválido');
        }

        const oLat = Number(input.originLatitude);
        const oLng = Number(input.originLongitude);
        const dLat = Number(input.destinationLatitude);
        const dLng = Number(input.destinationLongitude);
        const validPair = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && a >= -90 && a <= 90 && b >= -180 && b <= 180;
        if (!validPair(oLat, oLng) || !validPair(dLat, dLng)) {
            throw new BadRequestException(
                'Coordenadas de origem e destino obrigatórias (GPS válido). Use CEP + geocódigo ou latitude/longitude, como na criação de turmas.',
            );
        }
        const cepDigits = (s?: string) => (s ?? '').replace(/\D/g, '');
        const oCep = cepDigits(input.originCep);
        const dCep = cepDigits(input.destinationCep);
        if (oCep.length !== 8 || dCep.length !== 8) {
            throw new BadRequestException('CEP de origem e destino obrigatórios (8 dígitos cada) para ancoragem da rota e histórico operacional.');
        }

        const trip = await this.prisma.trip.create({
            data: {
                truckId: input.truckId,
                originCityId: input.originCityId,
                destinationCityId: input.destinationCityId,
                departureDate: new Date(input.departureDate),
                expectedArrivalDate: new Date(input.expectedArrivalDate),
                driverUserId: input.driverUserId,
                driverName: driver.name || 'Motorista',
                driverPhone: driver.phone ?? null,
                notes: input.notes ?? null,
                originCep: oCep,
                destinationCep: dCep,
                originLatitude: oLat,
                originLongitude: oLng,
                destinationLatitude: dLat,
                destinationLongitude: dLng,
                status: TripStatus.PLANNED,
                driverDecision: 'PENDING',
            },
        });
        await this.notificationsSender.send({
            userId: input.driverUserId,
            type: 'TRIP_SCHEDULED' as any,
            title: '🚛 Nova viagem atribuída',
            message: 'Uma nova viagem foi atribuída para você. Acesse Viagens para aceitar ou recusar.',
            link: '/driver/viagens',
        }).catch(() => undefined);
        return trip;
    }

    async assignDriver(id: string, driverUserId: string) {
        const trip = await this.prisma.trip.findUnique({ where: { id } });
        if (!trip) throw new NotFoundException('Viagem não encontrada');
        if (trip.status !== TripStatus.PLANNED) throw new BadRequestException('Só é possível reatribuir viagens planejadas');
        const driver = await this.prisma.user.findUnique({ where: { id: driverUserId } });
        if (!driver || driver.role !== 'DRIVER') throw new BadRequestException('Motorista inválido');

        const updated = await this.prisma.trip.update({
            where: { id },
            data: {
                driverUserId,
                driverName: driver.name || 'Motorista',
                driverPhone: driver.phone ?? null,
                driverDecision: 'PENDING',
                driverDecisionAt: null,
                driverDecisionReason: null,
                rejectionPenalty: null,
                rejectionPenaltyBy: null,
                rejectionPenaltyAt: null,
            },
        });
        await this.notificationsSender.send({
            userId: driverUserId,
            type: 'TRIP_SCHEDULED' as any,
            title: '🚛 Viagem atribuída',
            message: 'Uma viagem foi vinculada ao seu perfil. Verifique em Viagens.',
            link: '/driver/viagens',
        }).catch(() => undefined);
        return updated;
    }

    async applyRejectionPenalty(id: string, adminId: string, penaltyAmount?: number, adminNote?: string) {
        const trip = await this.prisma.trip.findUnique({ where: { id } });
        if (!trip) throw new NotFoundException('Viagem não encontrada');
        if (trip.driverDecision !== 'REJECTED') throw new BadRequestException('A penalização só pode ser aplicada para viagem recusada');

        const penalty = Number(penaltyAmount || 0);
        return this.prisma.trip.update({
            where: { id },
            data: {
                rejectionPenalty: penalty > 0 ? penalty : null,
                rejectionPenaltyBy: penalty > 0 ? adminId : null,
                rejectionPenaltyAt: penalty > 0 ? new Date() : null,
                notes: adminNote ? `${trip.notes || ''}\n[PENALIDADE] ${adminNote}`.trim() : trip.notes,
            },
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

        // Notificar motorista sobre a agenda
        try {
            await this.prisma.notification.create({
                data: {
                    userId:         driverUserId,
                    type:           'TRIP_SCHEDULED',
                    title:          `🚛 ${created.length} Viagens Agendadas!`,
                    message:        `Turma ${classData.classIdentifier} — ${created.length} dias de aula adicionados à sua agenda automaticamente.`,
                    channel:        'IN_APP',
                    data:           { link: '/driver/viagens' },
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
