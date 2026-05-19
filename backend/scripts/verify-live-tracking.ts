/**
 * Valida rastreamento ao vivo: km restantes com base no período (Acao.distanciaKm)
 * e posição GPS atual — motorista + admin.
 *
 * Uso: npx tsx scripts/verify-live-tracking.ts [API_BASE]
 */
import { PrismaClient } from '@prisma/client';
import {
    computeTripProgressMetrics,
    resolveTripPlannedDistanceKm,
} from '../src/common/trip-planned-distance.util';

const API_BASE = process.argv[2] || process.env.API_BASE || 'http://localhost:3001/api';
const PASSWORD = process.env.SEED_PASSWORD || 'RR@@Upgrade';

const prisma = new PrismaClient();

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function assert(cond: unknown, msg: string) {
    if (!cond) throw new Error(`FALHOU: ${msg}`);
}

async function login(email: string): Promise<string> {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: PASSWORD }),
    });
    const body = await res.json().catch(() => ({}));
    assert(res.ok, `login ${email} HTTP ${res.status}: ${JSON.stringify(body).slice(0, 180)}`);
    const token = body.accessToken || body.access_token || body.token;
    assert(token, `token ausente para ${email}`);
    return token;
}

async function main() {
    console.log('═══ Validação rastreamento ao vivo ═══');
    console.log(`API: ${API_BASE}\n`);

    // 1) Viagem académica IN_TRANSIT com período e distância
    const trip = await prisma.trip.findFirst({
        where: {
            status: 'IN_TRANSIT',
            classId: { not: null },
            driverUserId: { not: null },
            NOT: { notes: { contains: '[DEMO:' } },
        },
        include: {
            originCity: { select: { name: true, latitude: true, longitude: true } },
            destinationCity: { select: { name: true, latitude: true, longitude: true } },
            driverUser: { select: { id: true, email: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
    });

    if (!trip?.driverUser?.email) {
        console.log('  AVISO: nenhuma viagem IN_TRANSIT académica com motorista.');
        console.log('  Crie/inicie uma viagem com classId e distância no período, depois rode de novo.\n');
        process.exit(0);
    }

    const { totalKm, distanceSource } = await resolveTripPlannedDistanceKm(
        prisma,
        trip,
        haversineKm,
    );
    assert(totalKm > 0, `período sem distanciaKm (trip ${trip.id.slice(0, 8)})`);

    const oLat = trip.originCity?.latitude;
    const oLng = trip.originCity?.longitude;
    assert(oLat != null && oLng != null, 'cidade origem sem lat/lng');

    // Simula motorista no início da rota (~2 km da origem)
    const latNearOrigin = oLat + 0.018;
    const lngNearOrigin = oLng + 0.012;

    const expected = computeTripProgressMetrics(totalKm, distanceSource, haversineKm, {
        originCity: trip.originCity,
        currentLat: latNearOrigin,
        currentLng: lngNearOrigin,
    });

    console.log(`  Trip: ${trip.originCity?.name} → ${trip.destinationCity?.name}`);
    console.log(`  Motorista: ${trip.driverUser.name} (${trip.driverUser.email})`);
    console.log(`  Total período: ${totalKm} km (${distanceSource})`);
    console.log(
        `  Esperado (~início): restante≈${expected.kmRemaining} km, progresso≈${expected.progress}%\n`,
    );

    assert(
        expected.kmRemaining > totalKm * 0.5,
        `km restante muito baixo no início (${expected.kmRemaining} vs total ${totalKm})`,
    );
    assert(expected.progress < 50, `progresso alto demais no início (${expected.progress}%)`);

    // 2) Login motorista + POST location
    const driverToken = await login(trip.driverUser.email);
    const locRes = await fetch(`${API_BASE}/driver/location`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${driverToken}`,
        },
        body: JSON.stringify({
            latitude: latNearOrigin,
            longitude: lngNearOrigin,
            speed: 45,
            heading: 90,
            source: 'checkin',
            capturedAt: new Date().toISOString(),
        }),
    });
    const locBody = await locRes.json().catch(() => ({}));
    assert(locRes.ok, `POST /driver/location HTTP ${locRes.status}: ${JSON.stringify(locBody).slice(0, 200)}`);
    console.log(`  POST /driver/location: OK (tripId ${locBody.tripId?.slice(0, 8) ?? '?'})`);

    // 3) Performance motorista
    const perfRes = await fetch(`${API_BASE}/driver/me/performance`, {
        headers: { Authorization: `Bearer ${driverToken}` },
    });
    const perf = await perfRes.json().catch(() => ({}));
    assert(perfRes.ok, `GET /driver/me/performance HTTP ${perfRes.status}`);
    assert(perf.currentTrip, 'currentTrip ausente');
    assert(
        perf.currentTrip.totalKmPlanned >= totalKm * 0.9,
        `totalKmPlanned API (${perf.currentTrip.totalKmPlanned}) ≠ período (${totalKm})`,
    );
    assert(
        perf.currentTrip.kmRemaining > 0,
        `kmRemaining zerado (${perf.currentTrip.kmRemaining}) — bug “já chegou”`,
    );
    assert(
        perf.currentTrip.progress < 90,
        `progress ${perf.currentTrip.progress}% no início da viagem`,
    );
    console.log(
        `  GET /driver/me/performance: ${perf.currentTrip.kmRemaining} km restantes, ` +
            `${perf.currentTrip.progress}% progresso, total ${perf.currentTrip.totalKmPlanned} km`,
    );

    // 4) Mapa admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@qualifica.com';
    const adminToken = await login(adminEmail);
    const activeRes = await fetch(`${API_BASE}/driver/location/active`, {
        headers: { Authorization: `Bearer ${adminToken}` },
    });
    const activeBody = await activeRes.json().catch(() => ({}));
    assert(activeRes.ok, `GET /driver/location/active HTTP ${activeRes.status}`);
    const drivers: any[] = activeBody.drivers ?? [];
    const tracked = drivers.find((d) => d.userId === trip.driverUserId);
    assert(tracked, 'motorista não aparece em /driver/location/active');
    assert(
        (tracked.kmRemaining ?? tracked.eta?.distanciaKm ?? 0) > 0,
        `admin kmRemaining zerado (${tracked.kmRemaining})`,
    );
    assert(tracked.progress < 90, `admin progress ${tracked.progress}% no início`);
    console.log(
        `  GET /driver/location/active: ${tracked.name} — ` +
            `${tracked.kmRemaining ?? tracked.eta?.distanciaKm} km restantes, ${tracked.progress}%`,
    );

    console.log('\n✓ Rastreamento ao vivo OK (período + posição atual + motorista + admin)\n');
}

main()
    .catch((e) => {
        console.error('\n✗', e.message || e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
