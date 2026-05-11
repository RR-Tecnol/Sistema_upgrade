import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

function hrs(h: number) { return new Date(Date.now() - h * 3600000); }
function min(m: number) { return new Date(Date.now() - m * 60000); }

const DEMO_STATUS: Record<string, string> = {
    'carlos.souza.demo@qualifica.com':    '[DEMO:online]',
    'marina.costa.demo@qualifica.com':    '[DEMO:online]',
    'paulo.ramos.demo@qualifica.com':     '[DEMO:online]',
    'diego.alves.demo@qualifica.com':     '[DEMO:online]',
    'ana.lima.demo@qualifica.com':        '[DEMO:stopped]',
    'fabio.nunes.demo@qualifica.com':     '[DEMO:stopped]',
    'roberto.freitas.demo@qualifica.com': '[DEMO:offline]',
    'lea.santos.demo@qualifica.com':      '[DEMO:offline]',
};

export async function seedRastreamento(prisma: PrismaClient, ctx: { truck1: any; truck2: any }) {
    const { truck1 } = ctx;
    console.log('\n━━━ [M4] Rastreamento GPS — 11 motoristas demo ━━━');
    const hash = await bcrypt.hash('RR@@Upgrade', 10);

    const C = (name: string, state: string) => prisma.city.findFirst({ where: { name, state } });
    const slz  = await C('São Luís',         'MA');
    const cax  = await C('Caxias',           'MA');
    const bac  = await C('Bacabal',          'MA');
    const ter  = await C('Teresina',         'PI');
    const flo  = await C('Floriano',         'PI');
    const bar  = await C('Barras',           'PI');
    const pic  = await C('Picos',            'PI');
    const par  = await C('Parnaíba',         'PI');
    const imp  = await C('Imperatriz',       'MA');
    const rbr  = await C('Rio Branco',       'AC');
    const sng  = await C('Senador Guiomard', 'AC');
    const xap  = await C('Cruzeiro do Sul',  'AC');

    if (!slz || !ter) { console.log('  ⚠️  Cidades base ausentes'); return; }

    const MOTORISTAS = [
        { email:'carlos.souza.demo@qualifica.com', name:'Carlos Souza', cpf:'901.000.001-01', phone:'(98) 99001-0001', originId:slz.id, destId:ter.id, pct:45, depHrs:6, expHrs:5,
          trail:[{lat:-2.5297,lng:-44.3028,t:hrs(6),spd:0},{lat:-3.6500,lng:-44.0000,t:hrs(4.5),spd:88},{lat:-4.4497,lng:-43.8842,t:hrs(3),spd:40},{lat:-4.8692,lng:-43.3564,t:min(3),spd:87}]},
        { email:'ana.lima.demo@qualifica.com', name:'Ana Lima', cpf:'901.000.002-02', phone:'(86) 99002-0002', originId:ter.id, destId:flo!.id, pct:30, depHrs:4, expHrs:3,
          trail:[{lat:-5.0892,lng:-42.8019,t:hrs(4),spd:0},{lat:-4.8600,lng:-42.2300,t:hrs(2.5),spd:68},{lat:-4.8233,lng:-42.1689,t:min(10),spd:0}]},
        { email:'roberto.freitas.demo@qualifica.com', name:'Roberto Freitas', cpf:'901.000.003-03', phone:'(68) 99003-0003', originId:sng!.id, destId:rbr!.id, pct:60, depHrs:10, expHrs:2,
          trail:[{lat:-10.1533,lng:-67.7367,t:hrs(10),spd:0},{lat:-10.0600,lng:-67.7900,t:hrs(8),spd:58},{lat:-10.0500,lng:-67.8000,t:hrs(2),spd:0}]},
        { email:'marina.costa.demo@qualifica.com', name:'Marina Costa', cpf:'901.000.004-04', phone:'(98) 99004-0004', originId:cax!.id, destId:slz.id, pct:88, depHrs:5, expHrs:0.5,
          trail:[{lat:-4.8692,lng:-43.3564,t:hrs(5),spd:0},{lat:-3.5000,lng:-44.1500,t:hrs(2),spd:88},{lat:-2.6500,lng:-44.2200,t:hrs(0.5),spd:75},{lat:-2.5400,lng:-44.2900,t:min(3),spd:45}]},
        { email:'paulo.ramos.demo@qualifica.com', name:'Paulo Ramos', cpf:'901.000.005-05', phone:'(86) 99005-0005', originId:bar!.id, destId:ter.id, pct:8, depHrs:0.5, expHrs:4,
          trail:[{lat:-4.2428,lng:-42.2956,t:hrs(0.5),spd:0},{lat:-4.3800,lng:-42.3500,t:min(3),spd:70}]},
        { email:'fabio.nunes.demo@qualifica.com', name:'Fábio Nunes', cpf:'901.000.006-06', phone:'(68) 99006-0006', originId:rbr!.id, destId:sng!.id, pct:50, depHrs:4, expHrs:2,
          trail:[{lat:-9.9754,lng:-67.8249,t:hrs(4),spd:0},{lat:-9.9900,lng:-67.6800,t:hrs(3),spd:65},{lat:-10.0500,lng:-67.5500,t:min(10),spd:0}]},
        { email:'lea.santos.demo@qualifica.com', name:'Léa Santos', cpf:'901.000.007-07', phone:'(98) 99007-0007', originId:slz.id, destId:bac!.id, pct:75, depHrs:5, expHrs:1,
          trail:[{lat:-2.5297,lng:-44.3028,t:hrs(5),spd:0},{lat:-3.7000,lng:-44.6500,t:hrs(3),spd:70},{lat:-4.0500,lng:-44.7500,t:hrs(2),spd:0}]},
        { email:'diego.alves.demo@qualifica.com', name:'Diego Alves', cpf:'901.000.008-08', phone:'(98) 99008-0008', originId:imp!.id, destId:slz.id, pct:35, depHrs:8, expHrs:15,
          trail:[{lat:-5.5261,lng:-47.4916,t:hrs(8),spd:0},{lat:-4.9478,lng:-47.5000,t:hrs(7),spd:80},{lat:-4.2244,lng:-44.7900,t:min(5),spd:88}]},
    ];

    for (const m of MOTORISTAS) {
        const user = await prisma.user.upsert({ where: { email: m.email }, update: { password: hash }, create: { email: m.email, password: hash, name: m.name, phone: m.phone, role: 'DRIVER', active: true }});
        const empEx = await prisma.employee.findFirst({ where: { userId: user.id } });
        if (!empEx) await prisma.employee.create({ data: { cpf: m.cpf, name: m.name, role: 'DRIVER', department: 'LOGISTICS', phone: m.phone, contractType: 'CLT', monthlySalaryCLT: 2800, travelRuleKm: 200, active: true, userId: user.id }});
        await prisma.trip.updateMany({ where: { driverUserId: user.id, status: 'IN_TRANSIT' }, data: { status: 'COMPLETED', actualArrivalDate: hrs(48) }});
        const demoToken = DEMO_STATUS[m.email] ?? '';
        const trip = await prisma.trip.create({ data: { truckId: truck1.id, driverName: m.name, driverUserId: user.id, originCityId: m.originId, destinationCityId: m.destId, departureDate: hrs(m.depHrs), expectedArrivalDate: new Date(Date.now() + m.expHrs*3600000), status: 'IN_TRANSIT', notes: `Demo: ${m.name} ${demoToken}`.trim() }});
        for (const p of m.trail) {
            await prisma.driverLocation.create({ data: { driverUserId: user.id, tripId: trip.id, latitude: p.lat, longitude: p.lng, speed: p.spd, accuracy: 8.5, source: 'GPS_DEVICE', capturedAt: p.t }});
        }
        console.log(`  ✅ ${m.name} (${m.trail.length} pts GPS)`);
    }

    // Motoristas COMPLETED
    const COMPLETED = [
        { email:'tania.melo.demo@qualifica.com',  name:'Tânia Melo',  cpf:'901.000.009-09', phone:'(86) 99009-0009', originId:ter.id, destId:par!.id, endHrs:2 },
        { email:'jonas.pires.demo@qualifica.com', name:'Jonas Pires', cpf:'901.000.010-10', phone:'(86) 99010-0010', originId:flo!.id, destId:pic!.id, endHrs:3 },
    ];
    for (const m of COMPLETED) {
        const user = await prisma.user.upsert({ where: { email: m.email }, update: { password: hash }, create: { email: m.email, password: hash, name: m.name, phone: m.phone, role: 'DRIVER', active: true }});
        const empEx = await prisma.employee.findFirst({ where: { userId: user.id } });
        if (!empEx) await prisma.employee.create({ data: { cpf: m.cpf, name: m.name, role: 'DRIVER', department: 'LOGISTICS', phone: m.phone, contractType: 'CLT', monthlySalaryCLT: 2800, travelRuleKm: 200, active: true, userId: user.id }});
        await prisma.trip.updateMany({ where: { driverUserId: user.id, status: { in: ['IN_TRANSIT','PLANNED'] }}, data: { status: 'COMPLETED', actualArrivalDate: hrs(m.endHrs) }});
        const ex = await prisma.trip.findFirst({ where: { driverUserId: user.id, status: 'COMPLETED' }});
        if (!ex) await prisma.trip.create({ data: { truckId: truck1.id, driverName: m.name, driverUserId: user.id, originCityId: m.originId, destinationCityId: m.destId, departureDate: hrs(m.endHrs+4), expectedArrivalDate: hrs(m.endHrs), actualArrivalDate: hrs(m.endHrs), status: 'COMPLETED', notes: `Demo: ${m.name} — concluída hoje` }});
        console.log(`  ✅ ${m.name} → COMPLETED`);
    }
}

export async function refreshDriverTimestamps(prisma: PrismaClient) {
    console.log('\n🔄 REFRESH timestamps motoristas demo...');
    const OFFSETS: Record<string, number> = {
        'carlos.souza.demo@qualifica.com': 3, 'marina.costa.demo@qualifica.com': 3,
        'paulo.ramos.demo@qualifica.com': 3, 'diego.alves.demo@qualifica.com': 3,
        'ana.lima.demo@qualifica.com': 10, 'fabio.nunes.demo@qualifica.com': 10,
        'roberto.freitas.demo@qualifica.com': 120, 'lea.santos.demo@qualifica.com': 120,
    };
    for (const [email, offsetMin] of Object.entries(OFFSETS)) {
        const user = await prisma.user.findFirst({ where: { email }});
        if (!user) continue;
        const ul = await prisma.driverLocation.findFirst({ where: { driverUserId: user.id }, orderBy: { capturedAt: 'desc' }});
        if (!ul) continue;
        await prisma.driverLocation.update({ where: { id: ul.id }, data: { capturedAt: new Date(Date.now() - offsetMin*60000) }});
        const s = offsetMin <= 5 ? '🟢' : offsetMin <= 15 ? '🟡' : '🔴';
        console.log(`  ${s} ${email} → now - ${offsetMin}min`);
    }
    console.log('✅ Refresh concluído.');
}
