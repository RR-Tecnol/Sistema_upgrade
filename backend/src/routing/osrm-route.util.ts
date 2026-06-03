/**
 * Rota rodoviária via OSRM público (perfil driving = caminho mais rápido por estrada).
 * Usado pelo backend para o mapa admin não depender só do fetch no browser (rate limit / timeout).
 */

const OSRM_BASE =
    process.env.OSRM_URL?.replace(/\/$/, '') || 'https://router.project-osrm.org';

export type LatLngPoint = { lat: number; lng: number };

export async function fetchOsrmDrivingRoute(
    from: LatLngPoint,
    to: LatLngPoint,
): Promise<[number, number][]> {
    const url =
        `${OSRM_BASE}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}` +
        '?overview=full&geometries=geojson&alternatives=false';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return [];
        const data = await res.json();
        if (data.code !== 'Ok' || !data.routes?.[0]?.geometry?.coordinates?.length) {
            return [];
        }
        return data.routes[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng] as [number, number],
        );
    } catch {
        return [];
    } finally {
        clearTimeout(timer);
    }
}
