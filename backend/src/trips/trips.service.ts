import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TripStatus } from '@prisma/client';
import { NotificationsSenderService } from '../notifications/notifications-sender.service';
import { MinioService } from '../reimbursement/minio.service';
import { resolveBrowserViewUrl } from '../common/minio-browser-url.util';
import { parseMinioPublicUrlToBucketKey } from '../reimbursement/minio-public-url.util';
import { paginatedResult, resolvePagination } from '../common/pagination.util';
import { dateKeyUTC, startOfUTCDay } from '../common/class-teaching-days.util';
import {
    combineDateAndTime,
    resolveClassTripOriginCityId,
    resolveIdaDepartureBaseDate,
} from '../common/class-trip-origin.util';

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
    const parsed = parseMinioPublicUrlToBucketKey(String(stored ?? '').trim());
    if (!parsed) return null;
    return { bucket: parsed.bucket, objectKey: parsed.key };
}

async function resolveOdometerPhotoViewUrl(raw: string, minio: MinioService): Promise<string> {
    const browserUrl = resolveBrowserViewUrl(raw);
    if (browserUrl) return browserUrl;
    const parsed = parseTripOdometerStoredUrl(raw);
    if (!parsed) throw new BadRequestException('URL da foto armazenada é inválida');
    return minio.presignedGetUrl(parsed.bucket, parsed.objectKey, 3600);
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
        const url = await resolveOdometerPhotoViewUrl(raw, this.minioService);
        return { url };
    }

    /** GET assinado para o motorista (só a própria viagem). */
    async getOdometerPhotoPresignedUrlForDriver(tripId: string, driverUserId: string, kind: 'start' | 'end'): Promise<{ url: string }> {
        const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
        if (!trip) throw new NotFoundException('Viagem não encontrada');
        if (trip.driverUserId !== driverUserId) throw new ForbiddenException('Acesso negado');
        const raw = kind === 'start' ? trip.startOdometerPhotoUrl : trip.endOdometerPhotoUrl;
        if (!raw?.trim()) throw new NotFoundException('Foto não disponível para esta viagem');
        const url = await resolveOdometerPhotoViewUrl(raw, this.minioService);
        return { url };
    }

    // ── Driver: busca viagens do motorista autenticado ────────────────────────
    async findByDriver(driverUserId: string, status?: TripStatus) {
        const where: any = { driverUserId };
        if (status) where.status = status;

        return this.prisma.trip.findMany({
            where,
            orderBy: { departureDate: 'asc' },
            include: {
                originCity:      { select: { name: true, state: true } },
                destinationCity: { select: { name: true, state: true } },
                truck:           { select: { identifier: true, licensePlate: true } },
                class: {
                    select: {
                        id: true,
                        classIdentifier: true,
                        startDate: true,
                        endDate: true,
                        startTime: true,
                        endTime: true,
                        period: true,
                        course: { select: { id: true, name: true } },
                    },
                },
            },
        });
    }

    // ── Admin: busca todas as viagens ─────────────────────────────────────────
    async findAllAdmin(
        status?: TripStatus,
        driverUserId?: string,
        opts?: { page?: number; limit?: number },
    ) {
        const where: any = {};
        if (status) where.status = status;
        if (driverUserId) where.driverUserId = driverUserId;

        const { skip, page, limit } = resolvePagination(opts?.page, opts?.limit, 12);
        const [data, total] = await Promise.all([
            this.prisma.trip.findMany({
                where,
                orderBy: { departureDate: 'desc' },
                include: TRIP_ADMIN_LIST_INCLUDE,
                skip,
                take: limit,
            }),
            this.prisma.trip.count({ where }),
        ]);
        return paginatedResult(data, total, page, limit);
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
        const todayKey = dateKeyUTC(startOfUTCDay(new Date()));
        const depKey = dateKeyUTC(startOfUTCDay(new Date(trip.departureDate)));
        if (depKey !== todayKey) {
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
            include: { class: { include: { acaoTurmas: true } }, originCity: true, destinationCity: true }
        });

        if (updated.classId && updated.class?.status === 'PLANNED') {
            if (updated.destinationCityId === updated.class.cityId) {
                await this.prisma.class.update({
                    where: { id: updated.classId },
                    data: { status: 'IN_PROGRESS' }
                });
                for (const at of updated.class.acaoTurmas) {
                    const acao = await this.prisma.acao.findUnique({ where: { id: at.acaoId } });
                    if (acao && acao.status === 'PLANEJADA') {
                        await this.prisma.acao.update({
                            where: { id: acao.id },
                            data: { status: 'EM_ANDAMENTO' }
                        });
                    }
                }
            }
        }

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
     * Gera até 2 viagens PLANNED por turma: ida (origem → cidade do curso no início) e volta (cidade do curso → origem no fim).
     */
    async generateTripsForClass(classId: string, driverUserId: string, acaoId?: string) {
        const classData = await this.prisma.class.findUnique({
            where: { id: classId },
            include: {
                city: true,
                truck: true,
                course: { select: { name: true } },
            },
        });
        if (!classData) throw new NotFoundException('Turma não encontrada');
        if (!classData.truck) {
            throw new BadRequestException('Turma não tem carreta associada. Vincule uma carreta à turma primeiro.');
        }
        if (!classData.cityId) {
            throw new BadRequestException('Turma sem cidade do curso. Informe a cidade de destino.');
        }

        const driver = await this.prisma.user.findUnique({
            where: { id: driverUserId },
            select: { id: true, name: true, role: true },
        });
        if (!driver) throw new NotFoundException('Motorista não encontrado');
        if (driver.role !== 'DRIVER') throw new BadRequestException('Usuário selecionado não é motorista');

        const originCityId = await resolveClassTripOriginCityId(this.prisma, classData, acaoId);
        const destCityId = classData.cityId;

        const idaBase = await resolveIdaDepartureBaseDate(this.prisma, classData, acaoId);
        const startDay = startOfUTCDay(idaBase);
        const endDay = startOfUTCDay(new Date(classData.endDate));
        const rangeEnd = new Date(endDay);
        rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);

        const startKey = dateKeyUTC(startDay);
        const endKey = dateKeyUTC(endDay);

        const isCanonicalLeg = (t: { originCityId: string; destinationCityId: string; departureDate: Date }) => {
            const dk = dateKeyUTC(startOfUTCDay(new Date(t.departureDate)));
            const isIda =
                t.originCityId === originCityId &&
                t.destinationCityId === destCityId &&
                dk === startKey;
            const isVolta =
                t.originCityId === destCityId &&
                t.destinationCityId === originCityId &&
                dk === endKey;
            return isIda || isVolta;
        };

        const plannedInRange = await this.prisma.trip.findMany({
            where: {
                classId,
                driverUserId,
                status: TripStatus.PLANNED,
                departureDate: { gte: startDay, lt: rangeEnd },
            },
            select: { id: true, originCityId: true, destinationCityId: true, departureDate: true },
        });

        const legacyIds = plannedInRange.filter(t => !isCanonicalLeg(t)).map(t => t.id);
        if (legacyIds.length) {
            await this.prisma.trip.deleteMany({ where: { id: { in: legacyIds } } });
        }

        const existingCanonical = plannedInRange.filter(t => !legacyIds.includes(t.id));
        const hasIda = existingCanonical.some(
            t =>
                t.originCityId === originCityId &&
                t.destinationCityId === destCityId &&
                dateKeyUTC(startOfUTCDay(new Date(t.departureDate))) === startKey,
        );
        const hasVolta = existingCanonical.some(
            t =>
                t.originCityId === destCityId &&
                t.destinationCityId === originCityId &&
                dateKeyUTC(startOfUTCDay(new Date(t.departureDate))) === endKey,
        );

        const courseName = classData.course?.name || 'Curso';
        const buildPayload = (
            leg: 'IDA' | 'VOLTA',
            oId: string,
            dId: string,
            baseDate: Date,
            departTime: string,
            arrivalTime: string,
        ) => {
            const departure = combineDateAndTime(baseDate, departTime);
            let expectedArrival = combineDateAndTime(baseDate, arrivalTime);
            if (expectedArrival <= departure) {
                expectedArrival = new Date(departure.getTime() + 4 * 60 * 60 * 1000);
            }
            const legLabel = leg === 'IDA' ? 'Ida' : 'Volta';
            return {
                classId,
                truckId: classData.truck!.id,
                originCityId: oId,
                destinationCityId: dId,
                driverUserId,
                driverName: driver.name,
                departureDate: departure,
                expectedArrivalDate: expectedArrival,
                status: TripStatus.PLANNED,
                notes: `${legLabel} — turma ${classData.classIdentifier} — ${courseName}`,
            };
        };

        const startTime = classData.startTime || '07:00';
        const endTime = classData.endTime || '12:00';
        const toCreate: ReturnType<typeof buildPayload>[] = [];

        if (!hasIda) {
            toCreate.push(
                buildPayload('IDA', originCityId, destCityId, idaBase, startTime, endTime),
            );
        }
        if (!hasVolta) {
            toCreate.push(
                buildPayload('VOLTA', destCityId, originCityId, new Date(classData.endDate), endTime, endTime),
            );
        }

        const existingCount = (hasIda ? 1 : 0) + (hasVolta ? 1 : 0);

        if (toCreate.length === 0) {
            return {
                message: 'Ida e volta já estão agendadas para esta turma.',
                generated: 0,
                existing: existingCount,
            };
        }

        const created = await Promise.all(toCreate.map(trip => this.prisma.trip.create({ data: trip })));

        try {
            await this.prisma.notification.create({
                data: {
                    userId: driverUserId,
                    type: 'TRIP_SCHEDULED',
                    title: `🚛 ${created.length} viagem(ns) agendada(s)`,
                    message: `Turma ${classData.classIdentifier}: ${created.map(t => (t.notes?.startsWith('Ida') ? 'ida' : 'volta')).join(' e ')}.`,
                    channel: 'IN_APP',
                    data: { link: '/driver/viagens' },
                    deliveryStatus: 'DELIVERED',
                } as any,
            });
        } catch { /* notification optional */ }

        return {
            message: `${created.length} viagem(ns) gerada(s) para ${classData.classIdentifier} (ida/volta).`,
            generated: created.length,
            existing: existingCount,
            trips: created.map(t => ({ id: t.id, departureDate: t.departureDate, status: t.status, notes: t.notes })),
        };
    }
}
