/**
 * Valida listagem e estatísticas de períodos de curso (GET /acoes).
 * Uso: npx tsx scripts/verify-acoes-api.ts [API_BASE]
 */
import { PrismaClient } from '@prisma/client';

const API_BASE = process.argv[2] || process.env.API_BASE || 'http://localhost:3001/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@qualifica.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'RR@@Upgrade';

const prisma = new PrismaClient();

function assert(cond: unknown, msg: string) {
    if (!cond) throw new Error(msg);
}

async function testPrisma() {
    const include = {
        cidade: { select: { id: true, name: true, state: true } },
        grupo: { select: { id: true, name: true, state: true } },
        carreta: { select: { id: true, identifier: true, licensePlate: true, type: true } },
        _count: { select: { turmas: true, custos: true, equipe: true } },
    };
    const [acoes, total] = await Promise.all([
        prisma.acao.findMany({
            include,
            orderBy: { dataInicio: 'desc' },
            take: 12,
        }),
        prisma.acao.count(),
    ]);
    assert(Array.isArray(acoes), 'findMany acoes');
    console.log(`  Prisma: ${acoes.length} acoes (total ${total})`);

    const stats = await Promise.all([
        prisma.acao.count(),
        prisma.acao.count({ where: { status: 'PLANEJADA' } }),
        prisma.acao.count({ where: { status: 'EM_ANDAMENTO' } }),
        prisma.acao.count({ where: { status: 'CONCLUIDA' } }),
        prisma.acao.count({ where: { status: 'CANCELADA' } }),
    ]);
    console.log(`  Prisma stats: total=${stats[0]} planejadas=${stats[1]}`);
}

async function testHttp() {
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const loginBody = await loginRes.json().catch(() => ({}));
    assert(loginRes.ok, `login HTTP ${loginRes.status}: ${JSON.stringify(loginBody).slice(0, 200)}`);
    const token =
        loginBody.accessToken ||
        loginBody.access_token ||
        loginBody.token ||
        loginBody.data?.accessToken;
    assert(token, 'token JWT ausente no login');

    const headers = { Authorization: `Bearer ${token}` };

    const listRes = await fetch(`${API_BASE}/acoes?page=1&limit=12`, { headers });
    const listBody = await listRes.json().catch(() => ({}));
    assert(listRes.ok, `GET /acoes HTTP ${listRes.status}: ${JSON.stringify(listBody).slice(0, 300)}`);
    const items = listBody.data ?? listBody.items ?? listBody;
    const arr = Array.isArray(items) ? items : items?.data;
    assert(Array.isArray(arr) || typeof listBody.total === 'number', 'resposta /acoes inválida');
    console.log(`  HTTP GET /acoes: ${listRes.status} (${listBody.total ?? arr?.length ?? '?'} registos)`);

    const statsRes = await fetch(`${API_BASE}/acoes/estatisticas`, { headers });
    const statsBody = await statsRes.json().catch(() => ({}));
    assert(statsRes.ok, `GET /acoes/estatisticas HTTP ${statsRes.status}: ${JSON.stringify(statsBody).slice(0, 200)}`);
    assert(typeof statsBody.total === 'number', 'estatisticas sem campo total');
    console.log(
        `  HTTP GET /acoes/estatisticas: total=${statsBody.total} planejadas=${statsBody.planejadas}`,
    );
}

async function main() {
    console.log('Verificação períodos de curso');
    console.log(`API: ${API_BASE}`);
    await testPrisma();
    await testHttp();
    console.log('\n✓ Períodos de curso OK (Prisma + API)');
}

main()
    .catch((e) => {
        console.error('\n✗', e.message || e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
