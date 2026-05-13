import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class DriverLocationService {
    private readonly logger = new Logger(DriverLocationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsGateway,
    ) { }

    // ─────────────────────────────────────────────────────────────
    // F1.6: Job de cleanup LGPD
    // Roda diariamente às 03:00 — deleta localizações com > 7 dias.
    // Localização GPS é dado pessoal sensível — retenção mínima (LGPD art. 18).
    // ─────────────────────────────────────────────────────────────
    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    async cleanupOldLocations(): Promise<void> {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 7);

        try {
            const { count } = await this.prisma.driverLocation.deleteMany({
                where: { capturedAt: { lt: cutoff } },
            });
            if (count > 0) {
                this.logger.log(`LGPD cleanup: ${count} localizações removidas (>7 dias)`);
            }
        } catch (err) {
            this.logger.error(`Erro no cleanup de localizações: ${err}`);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Haversine — distância em km entre dois pontos lat/lng
    // Primário para ETA. Fallback quando Google Maps não disponível.
    // ─────────────────────────────────────────────────────────────
    haversineKm(
        lat1: number, lng1: number,
        lat2: number, lng2: number,
    ): number {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) *
            Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // ─────────────────────────────────────────────────────────────
    // Velocidade média real do motorista hoje (km/h)
    // Calculada do histórico de DriverLocation do dia atual.
    // Fallback: 70 km/h se não houver histórico suficiente.
    // ─────────────────────────────────────────────────────────────
    async getVelocidadeMediaHoje(driverUserId: string): Promise<number> {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const locations = await this.prisma.driverLocation.findMany({
            where: {
                driverUserId,
                capturedAt: { gte: hoje },
                speed: { not: null },
            },
            select: { speed: true },
            orderBy: { capturedAt: 'asc' },
        });

        if (locations.length < 3) return 70; // fallback sem dados suficientes
        const speeds = locations.map(l => l.speed as number).filter(s => s > 5); // ignora velocidade parado
        if (!speeds.length) return 70;
        return speeds.reduce((a, b) => a + b, 0) / speeds.length;
    }

    // ─────────────────────────────────────────────────────────────
    // Cálculo de ETA
    // Usa velocidade média real do dia + Haversine.
    // Se GOOGLE_MAPS_KEY estiver no .env, tenta Google Maps primeiro.
    // Retorna fonte do cálculo para o admin saber o nível de precisão.
    // ─────────────────────────────────────────────────────────────
    async calcularETA(
        driverUserId: string,
        origemLat: number, origemLng: number,
        destinoLat: number, destinoLng: number,
    ): Promise<{ distanciaKm: number; minutos: number; fonte: 'google' | 'haversine' }> {
        const distanciaKm = this.haversineKm(origemLat, origemLng, destinoLat, destinoLng);

        // Tenta Google Maps se chave disponível
        if (process.env.GOOGLE_MAPS_KEY) {
            try {
                const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origemLat},${origemLng}&destination=${destinoLat},${destinoLng}&key=${process.env.GOOGLE_MAPS_KEY}&language=pt-BR`;
                const res = await fetch(url);
                const data: any = await res.json();
                if (data.status === 'OK' && data.routes?.[0]) {
                    const leg = data.routes[0].legs[0];
                    return {
                        distanciaKm: leg.distance.value / 1000,
                        minutos: Math.round(leg.duration.value / 60),
                        fonte: 'google',
                    };
                }
            } catch { /* fallback silencioso para haversine */ }
        }

        // Haversine com velocidade média real
        const velocidade = await this.getVelocidadeMediaHoje(driverUserId);
        return {
            distanciaKm: Math.round(distanciaKm),
            minutos: Math.round((distanciaKm / velocidade) * 60),
            fonte: 'haversine',
        };
    }

    // ─────────────────────────────────────────────────────────────
    // Salvar posição do motorista
    // Chamado por POST /driver/location e POST /driver/location/batch
    // ─────────────────────────────────────────────────────────────
    async saveLocation(dto: {
        driverUserId: string;
        tripId?: string;
        latitude: number;
        longitude: number;
        accuracy?: number;
        speed?: number;
        heading?: number;
        source: string;
        capturedAt: Date;
    }) {
        return this.prisma.driverLocation.create({ data: dto });
    }

    // ─────────────────────────────────────────────────────────────
    // Última posição conhecida de cada motorista com Trip IN_TRANSIT
    // Usado pelo admin para o mapa em tempo real.
    // ─────────────────────────────────────────────────────────────
    async getMotoristaAtivos() {
        // Busca todas as trips IN_TRANSIT com motorista vinculado
        const trips = await this.prisma.trip.findMany({
            where: { status: 'IN_TRANSIT', driverUserId: { not: null } },
            include: {
                driverUser: { select: { id: true, name: true } },
                originCity: { select: { name: true, state: true, latitude: true, longitude: true } },
                destinationCity: { select: { name: true, state: true, latitude: true, longitude: true } },
                truck: { select: { identifier: true, licensePlate: true } },
            },
            orderBy: { updatedAt: 'desc' }, // mais recentes primeiro
        });

        // DEDUP: mantém apenas a trip mais recente por motorista
        // Um motorista pode ter múltiplas trips IN_TRANSIT em ambiente de teste
        const uniqueTrips = trips.reduce((acc, trip) => {
            if (!acc.has(trip.driverUserId!)) {
                acc.set(trip.driverUserId!, trip);
            }
            return acc;
        }, new Map<string, typeof trips[0]>());
        const dedupedTrips = Array.from(uniqueTrips.values());

        const activeDriverIds = dedupedTrips.map(t => t.driverUserId!);

        const result = await Promise.all(dedupedTrips.map(async (trip) => {
            const ultima = await this.prisma.driverLocation.findFirst({
                where: { driverUserId: trip.driverUserId! },
                orderBy: { capturedAt: 'desc' },
            });

            const agora = new Date();
            const diffMin = ultima
                ? (agora.getTime() - new Date(ultima.capturedAt).getTime()) / 60000
                : Infinity;

            // Status: online < 5min | offline > 15min | stopped se speed=0 por > 30min
            let status: 'online' | 'offline' | 'stopped' = 'offline';
            if (diffMin <= 5) status = 'online';
            else if (diffMin <= 15) status = 'stopped';

            // ── BYPASS-DEMO-STATUS — F5.14 ─────────────────────────────────────────────────────────
            // Sobrepõe status calculado por tempo com token semântico no campo Trip.notes.
            // Ativo APENAS quando IS_DEMO_MODE=true no .env — nunca vaza para produção.
            // Como remover: apagar este bloco inteiro. Em produção status é calculado pelo capturedAt.
            // Ver RASTREAMENTO_PRODUCAO_APRESENTACAO.md §REMOÇÃO-BYPASSES.
            if (process.env.IS_DEMO_MODE === 'true' && trip.notes) {
                const demoMatch = trip.notes.match(/\[DEMO:(online|stopped|offline)\]/i);
                if (demoMatch?.[1]) {
                    status = demoMatch[1].toLowerCase() as 'online' | 'offline' | 'stopped';
                }
            }
            // ── FIM BYPASS-DEMO-STATUS ─────────────────────────────────────────────────────────────────────────────

            let eta = null;
            let progress = 0;
            if (ultima && trip.destinationCity.latitude && trip.destinationCity.longitude) {
                eta = await this.calcularETA(
                    trip.driverUserId!,
                    ultima.latitude, ultima.longitude,
                    trip.destinationCity.latitude, trip.destinationCity.longitude,
                );
                // Progresso: distância percorrida / distância total
                if (trip.originCity.latitude && trip.originCity.longitude) {
                    const totalKm = this.haversineKm(
                        trip.originCity.latitude, trip.originCity.longitude,
                        trip.destinationCity.latitude, trip.destinationCity.longitude,
                    );
                    const restanteKm = eta.distanciaKm;
                    progress = totalKm > 0 ? Math.min(100, Math.round(((totalKm - restanteKm) / totalKm) * 100)) : 0;
                }
            }

            return {
                userId: trip.driverUserId,
                name: trip.driverUser?.name,
                trip: {
                    id: trip.id,
                    origin: `${trip.originCity.name}/${trip.originCity.state}`,
                    destination: `${trip.destinationCity.name}/${trip.destinationCity.state}`,
                    originLat: trip.originCity.latitude,
                    originLng: trip.originCity.longitude,
                    destinationLat: trip.destinationCity.latitude,
                    destinationLng: trip.destinationCity.longitude,
                    startedAt: trip.departureDate,
                    truck: trip.truck ? {
                        identifier: trip.truck.identifier,
                        licensePlate: trip.truck.licensePlate
                    } : null
                },
                lastLocation: ultima ? {
                    lat: ultima.latitude,
                    lng: ultima.longitude,
                    speed: ultima.speed,
                    heading: ultima.heading,
                    capturedAt: ultima.capturedAt,
                } : null,
                eta,
                progress,
                status,
            };
        }));

        // ──────────────────────────────────────────────────────────────────
        // PARTE 2: motoristas COMPLETED — F5.15 (BUG-COMPLETED-MAPA)
        // Busca drivers com DriverLocation < 24h que NÃO têm trip IN_TRANSIT
        // ──────────────────────────────────────────────────────────────────
        const vinte4hAtras = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Query bifurcada: mais performática que subquery aninhada com NOT IN
        const recentLocations = await this.prisma.driverLocation.findMany({
            where: {
                driverUserId: { notIn: activeDriverIds },
                capturedAt:   { gte: vinte4hAtras },
            },
            distinct:  ['driverUserId'],
            orderBy:   [{ driverUserId: 'asc' }, { capturedAt: 'desc' }],
            include: {
                user: { select: { id: true, name: true } },
            },
        });

        const completedResults = await Promise.all(recentLocations.map(async (loc) => {
            const lastTrip = await this.prisma.trip.findFirst({
                where: { driverUserId: loc.driverUserId, status: 'COMPLETED' },
                include: {
                    originCity:      { select: { name: true, state: true, latitude: true, longitude: true } },
                    destinationCity: { select: { name: true, state: true, latitude: true, longitude: true } },
                },
                orderBy: { updatedAt: 'desc' },
            });

            return {
                userId: loc.driverUserId,
                name:   loc.user?.name ?? 'Motorista',
                trip: {
                    // Chave virtualizada — evita colapso do cache Leaflet com trips reais
                    id:             lastTrip ? `${lastTrip.id}_COMPLETED` : `VIRTUAL_${loc.driverUserId}_OFFLINE`,
                    origin:         lastTrip ? `${lastTrip.originCity.name}/${lastTrip.originCity.state}` : '—',
                    destination:    lastTrip ? `${lastTrip.destinationCity.name}/${lastTrip.destinationCity.state}` : '—',
                    originLat:      lastTrip?.originCity.latitude      ?? null,
                    originLng:      lastTrip?.originCity.longitude     ?? null,
                    destinationLat: lastTrip?.destinationCity.latitude ?? null,
                    destinationLng: lastTrip?.destinationCity.longitude ?? null,
                    startedAt:      lastTrip?.departureDate ?? loc.capturedAt,
                },
                lastLocation: {
                    lat: loc.latitude, lng: loc.longitude,
                    speed: loc.speed, heading: loc.heading, capturedAt: loc.capturedAt,
                },
                eta:         null,
                progress:    100,
                status:      'offline' as const,
                isCompleted: true,   // flag para frontend aplicar pin cinza
            };
        }));

        // Retorna união: ativos IN_TRANSIT + completados recentes (< 24h)
        return [...result, ...completedResults];
    }

    // ─────────────────────────────────────────────────────────────
    // Trilha completa da viagem (para mapa)
    // ─────────────────────────────────────────────────────────────
    async getTrilha(tripId: string) {
        return this.prisma.driverLocation.findMany({
            where: { tripId },
            orderBy: { capturedAt: 'asc' },
            select: { latitude: true, longitude: true, speed: true, heading: true, capturedAt: true, source: true },
        });
    }

    // ─────────────────────────────────────────────────────────────
    // KPIs e ranking do motorista autenticado
    // ─────────────────────────────────────────────────────────────
    async getPerformance(driverUserId: string) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(hoje.getDate() - hoje.getDay());
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

        // Trip ativa
        const tripAtiva = await this.prisma.trip.findFirst({
            where: { driverUserId, status: 'IN_TRANSIT' },
            include: {
                destinationCity: { select: { name: true, state: true, latitude: true, longitude: true } },
            },
        });

        // Última localização
        const ultimaLoc = await this.prisma.driverLocation.findFirst({
            where: { driverUserId },
            orderBy: { capturedAt: 'desc' },
        });

        let currentTrip = null;
        if (tripAtiva && ultimaLoc && tripAtiva.destinationCity.latitude && tripAtiva.destinationCity.longitude) {
            const eta = await this.calcularETA(
                driverUserId,
                ultimaLoc.latitude, ultimaLoc.longitude,
                tripAtiva.destinationCity.latitude, tripAtiva.destinationCity.longitude,
            );
            currentTrip = {
                destination: `${tripAtiva.destinationCity.name}/${tripAtiva.destinationCity.state}`,
                eta,
                kmRemaining: eta.distanciaKm,
                speed: ultimaLoc.speed,
            };
        }

        // Viagens da semana — pontualidade
        const viagensSemana = await this.prisma.trip.findMany({
            where: {
                driverUserId,
                status: 'COMPLETED',
                updatedAt: { gte: inicioSemana },
            },
        });
        const noPrazoSemana = viagensSemana.filter(t =>
            t.actualArrivalDate && t.expectedArrivalDate &&
            new Date(t.actualArrivalDate) <= new Date(t.expectedArrivalDate)
        ).length;

        // Km rodados no mês — usa kmEnd-kmStart das trips COMPLETED (fonte primária e mais precisa).
        // Fallback para haversine em localizações GPS quando kmEnd não estiver preenchido.
        const tripsCompletadasMes = await this.prisma.trip.findMany({
            where: { driverUserId, status: 'COMPLETED', departureDate: { gte: inicioMes } },
            select: { kmStart: true, kmEnd: true, id: true },
        });
        let kmMes = 0;
        for (const t of tripsCompletadasMes) {
            if (t.kmStart != null && t.kmEnd != null && t.kmEnd > t.kmStart) {
                kmMes += t.kmEnd - t.kmStart;
            } else {
                // Fallback haversine por GPS para trips sem hodômetro
                const locs = await this.prisma.driverLocation.findMany({
                    where: { driverUserId, tripId: t.id },
                    orderBy: { capturedAt: 'asc' },
                    select: { latitude: true, longitude: true },
                });
                for (let i = 1; i < locs.length; i++) {
                    kmMes += this.haversineKm(locs[i-1].latitude, locs[i-1].longitude, locs[i].latitude, locs[i].longitude);
                }
            }
        }

        // Velocidade média do mês
        const locsVelMes = await this.prisma.driverLocation.findMany({
            where: { driverUserId, capturedAt: { gte: inicioMes }, speed: { not: null, gt: 5 } },
            select: { speed: true },
        });
        const velMes = locsVelMes.length
            ? locsVelMes.reduce((a, b) => a + (b.speed ?? 0), 0) / locsVelMes.length
            : 0;

        // Ranking entre todos os motoristas (pontualidade da semana)
        const todosPorPontualidade = await this.prisma.trip.groupBy({
            by: ['driverUserId'],
            where: { status: 'COMPLETED', updatedAt: { gte: inicioSemana }, driverUserId: { not: null } },
            _count: { id: true },
        });

        const posicaoRanking = todosPorPontualidade
            .sort((a, b) => b._count.id - a._count.id)
            .findIndex(d => d.driverUserId === driverUserId) + 1;

        return {
            currentTrip,
            ranking: {
                semana: {
                    viagensNoPrazo: noPrazoSemana,
                    totalViagens: viagensSemana.length,
                    posicao: posicaoRanking || null,
                    totalMotoristas: todosPorPontualidade.length,
                },
                mes: {
                    kmRodados: Math.round(kmMes),
                    velocidadeMedia: Math.round(velMes),
                    viagensCompletas: await this.prisma.trip.count({
                        where: { driverUserId, status: 'COMPLETED', updatedAt: { gte: inicioMes } },
                    }),
                },
            },
        };
    }

    // ─────────────────────────────────────────────────────────────
    // F2.8: Verificação de alertas automáticos após cada posição salva
    // Emite eventos WS para admins via NotificationsGateway.
    // WS em try/catch SEPARADO — falha nunca bloqueia o fluxo principal.
    // ─────────────────────────────────────────────────────────────
    async verificarAlertas(driverUserId: string, driverName: string, tripId?: string): Promise<void> {
        try {
            const ultima = await this.prisma.driverLocation.findFirst({
                where: { driverUserId },
                orderBy: { capturedAt: 'desc' },
            });
            if (!ultima) return;

            const agora = new Date();
            const diffMin = (agora.getTime() - new Date(ultima.capturedAt).getTime()) / 60000;

            // 🔴 SEM SINAL — sem atualização por mais de 15 minutos
            if (diffMin > 15) {
                this.notifications.notifyAdmins('driver_alert', {
                    type: 'no_signal',
                    driverUserId,
                    driverName,
                    tripId,
                    message: `${driverName} sem sinal há ${Math.round(diffMin)} minutos`,
                    timestamp: agora,
                });
                return;
            }

            // 🟡 PARADA LONGA — velocidade zero por mais de 30 minutos
            if (ultima.speed !== null && ultima.speed <= 2) {
                const locAnterior = await this.prisma.driverLocation.findFirst({
                    where: { driverUserId, speed: { gt: 5 } },
                    orderBy: { capturedAt: 'desc' },
                });
                if (locAnterior) {
                    const paradoMin = (agora.getTime() - new Date(locAnterior.capturedAt).getTime()) / 60000;
                    if (paradoMin > 30) {
                        this.notifications.notifyAdmins('driver_alert', {
                            type: 'long_stop',
                            driverUserId,
                            driverName,
                            tripId,
                            message: `${driverName} parado há ${Math.round(paradoMin)} minutos`,
                            timestamp: agora,
                        });
                    }
                }
            }

            // 🟢 CHEGADA PRÓXIMA — ETA < 30 minutos
            if (tripId) {
                const trip = await this.prisma.trip.findUnique({
                    where: { id: tripId },
                    include: { destinationCity: { select: { latitude: true, longitude: true, name: true, state: true } } },
                });
                if (trip?.destinationCity.latitude && trip.destinationCity.longitude) {
                    const eta = await this.calcularETA(
                        driverUserId,
                        ultima.latitude, ultima.longitude,
                        trip.destinationCity.latitude, trip.destinationCity.longitude,
                    );
                    if (eta.minutos < 30) {
                        this.notifications.notifyAdmins('driver_alert', {
                            type: 'arriving_soon',
                            driverUserId,
                            driverName,
                            tripId,
                            message: `${driverName} chegando em ~${eta.minutos} minutos em ${trip.destinationCity.name}/${trip.destinationCity.state}`,
                            eta,
                            timestamp: agora,
                        });
                    }
                }
            }
        } catch (err) {
            // WS SEPARADO — log apenas, nunca propaga erro para o fluxo principal
            this.logger.warn(`verificarAlertas falhou para ${driverUserId}: ${err}`);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // F2.3: Processar lote de posições offline (batch recovery)
    // Ignora duplicatas por driverUserId + capturedAt.
    // ─────────────────────────────────────────────────────────────
    async processarBatch(driverUserId: string, tripId: string | undefined, locations: Array<{
        latitude: number; longitude: number;
        accuracy?: number; speed?: number; heading?: number;
        capturedAt: string; source: string;
    }>): Promise<{ saved: number; skipped: number }> {
        let saved = 0;
        let skipped = 0;

        for (const loc of locations) {
            const capturedAt = new Date(loc.capturedAt);
            // Verifica duplicata por motorista + timestamp exato
            const exists = await this.prisma.driverLocation.findFirst({
                where: { driverUserId, capturedAt },
                select: { id: true },
            });
            if (exists) { skipped++; continue; }

            await this.prisma.driverLocation.create({
                data: { driverUserId, tripId, capturedAt, source: loc.source,
                    latitude: loc.latitude, longitude: loc.longitude,
                    accuracy: loc.accuracy, speed: loc.speed, heading: loc.heading },
            });
            saved++;
        }
        return { saved, skipped };
    }
}
