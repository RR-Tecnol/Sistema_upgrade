/** Viagem mínima para ordenação / próxima PLANNED. */
export type DriverTripLike = {
    status: string;
    departureDate: string;
    driverDecision?: string | null;
    notes?: string | null;
};

/** Chave YYYY-M-D no fuso local do browser (evita off-by-one com UTC na VPS). */
export function tripDateKey(d: Date | string): string {
    const x = new Date(d);
    return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`;
}

/** True se a data de partida da viagem é hoje (dia civil local). */
export function isDepartureDay(departureDate: string): boolean {
    return tripDateKey(departureDate) === tripDateKey(new Date());
}

/** Ida antes da volta quando as notas seguem o padrão gerado pelo sistema. */
export function tripLegOrder(notes?: string | null): number {
    if (!notes) return 2;
    const n = notes.trim().toLowerCase();
    if (n.startsWith('ida')) return 0;
    if (n.startsWith('volta')) return 1;
    return 2;
}

export function comparePlannedTrips<T extends DriverTripLike>(a: T, b: T): number {
    const diff = new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime();
    if (diff !== 0) return diff;
    return tripLegOrder(a.notes) - tripLegOrder(b.notes);
}

export function needsDriverResponse(trip: { driverDecision?: string | null }): boolean {
    const d = trip.driverDecision ?? 'PENDING';
    return d === 'PENDING';
}

export function isDriverAccepted(trip: { driverDecision?: string | null }): boolean {
    return trip.driverDecision === 'ACCEPTED';
}

export function isDriverRejected(trip: { driverDecision?: string | null }): boolean {
    return trip.driverDecision === 'REJECTED';
}

/**
 * Próxima viagem a iniciar: PLANNED com menor departureDate (ida antes da volta).
 * Ignora recusadas. A API devolve trips por departureDate DESC — não usar .find() na lista bruta.
 */
export function pickNextPlannedTrip<T extends DriverTripLike>(trips: T[]): T | null {
    const planned = trips.filter(
        t => t.status === 'PLANNED' && !isDriverRejected(t),
    );
    if (!planned.length) return null;
    return [...planned].sort(comparePlannedTrips)[0];
}

/** Ordena PLANNED por partida ascendente (ida primeiro). */
export function sortPlannedTripsAsc<T extends DriverTripLike>(trips: T[]): T[] {
    return [...trips].sort(comparePlannedTrips);
}

type TripWithClass = DriverTripLike & { classId?: string | null; id?: string };

/**
 * Viagem EM_TRÂNSITO a exibir no dashboard: prioriza viagem académica (classId)
 * e ignora demos de rastreamento quando houver viagem real.
 */
export function pickActiveInTransitTrip<T extends TripWithClass>(trips: T[]): T | null {
    const active = trips.filter(t => t.status === 'IN_TRANSIT');
    if (!active.length) return null;
    const academic = active.filter(t => t.classId);
    if (academic.length === 1) return academic[0];
    if (academic.length > 1) {
        return [...academic].sort(comparePlannedTrips)[0];
    }
    const nonDemo = active.filter(t => !(t.notes || '').includes('[DEMO:'));
    return nonDemo[0] ?? active[0];
}
