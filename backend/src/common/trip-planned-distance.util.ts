import { PrismaService } from '../prisma/prisma.service';

const ACAO_STATUSES_FOR_DISTANCE = ['PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA'] as const;

export type TripDistanceSource = 'acao' | 'haversine' | 'none';

export interface TripProgressMetrics {
    totalKmPlanned: number;
    distanceSource: TripDistanceSource;
    kmTraveled: number;
    kmRemaining: number;
    progress: number;
}

type LatLng = { latitude: number | null; longitude: number | null };

/**
 * Distância total prevista da viagem: prioriza `Acao.distanciaKm` do período de curso
 * vinculado à turma; fallback haversine entre cidades origem/destino da trip.
 */
export async function resolveTripPlannedDistanceKm(
    prisma: PrismaService,
    trip: {
        classId?: string | null;
        originCity?: LatLng | null;
        destinationCity?: LatLng | null;
    },
    haversineKm: (lat1: number, lng1: number, lat2: number, lng2: number) => number,
): Promise<{ totalKm: number; distanceSource: TripDistanceSource }> {
    if (trip.classId) {
        const link = await prisma.acaoTurma.findFirst({
            where: {
                turmaId: trip.classId,
                acao: { status: { in: [...ACAO_STATUSES_FOR_DISTANCE] } },
            },
            orderBy: { createdAt: 'desc' },
            include: { acao: { select: { distanciaKm: true } } },
        });
        const fromAcao = link?.acao?.distanciaKm != null ? Number(link.acao.distanciaKm) : 0;
        if (fromAcao > 0) {
            return { totalKm: fromAcao, distanceSource: 'acao' };
        }
    }

    const o = trip.originCity;
    const d = trip.destinationCity;
    if (
        o?.latitude != null &&
        o?.longitude != null &&
        d?.latitude != null &&
        d?.longitude != null
    ) {
        const km = haversineKm(o.latitude, o.longitude, d.latitude, d.longitude);
        if (km > 0) {
            return { totalKm: Math.round(km * 10) / 10, distanceSource: 'haversine' };
        }
    }

    return { totalKm: 0, distanceSource: 'none' };
}

/**
 * Progresso: km percorridos desde a origem (GPS) em relação ao total do período.
 */
export function computeTripProgressMetrics(
    totalKmPlanned: number,
    distanceSource: TripDistanceSource,
    haversineKm: (lat1: number, lng1: number, lat2: number, lng2: number) => number,
    opts: {
        originCity?: LatLng | null;
        currentLat?: number | null;
        currentLng?: number | null;
        etaToDestinationKm?: number;
    },
): TripProgressMetrics {
    let kmTraveled = 0;
    const o = opts.originCity;
    if (
        o?.latitude != null &&
        o?.longitude != null &&
        opts.currentLat != null &&
        opts.currentLng != null
    ) {
        kmTraveled = haversineKm(o.latitude, o.longitude, opts.currentLat, opts.currentLng);
    }
    kmTraveled = Math.round(kmTraveled * 10) / 10;

    if (totalKmPlanned > 0) {
        const kmRemaining = Math.max(0, Math.round((totalKmPlanned - kmTraveled) * 10) / 10);
        const progress = Math.min(100, Math.max(0, Math.round((kmTraveled / totalKmPlanned) * 100)));
        return {
            totalKmPlanned,
            distanceSource,
            kmTraveled,
            kmRemaining,
            progress,
        };
    }

    const kmRemaining = Math.max(0, Math.round((opts.etaToDestinationKm ?? 0) * 10) / 10);
    return {
        totalKmPlanned: 0,
        distanceSource: 'none',
        kmTraveled,
        kmRemaining,
        progress: 0,
    };
}

/** ETA em minutos a partir dos km restantes e velocidade média (km/h). */
export function etaMinutesFromKmRemaining(kmRemaining: number, speedKmh: number): number {
    const v = speedKmh > 5 ? speedKmh : 70;
    return Math.max(0, Math.round((kmRemaining / v) * 60));
}

/** Escolhe a viagem IN_TRANSIT relevante (turma/período real, não demo). */
export function pickBestInTransitTrip<T extends { classId?: string | null; notes?: string | null }>(
    trips: T[],
): T | null {
    if (!trips.length) return null;
    const academic = trips.filter(t => t.classId);
    if (academic.length === 1) return academic[0];
    if (academic.length > 1) return academic[0];
    const nonDemo = trips.filter(t => !(t.notes || '').includes('[DEMO:'));
    return nonDemo[0] ?? trips[0];
}
