/**
 * Validação: penalidade de imprevisto (colaborador) → diária / Contas a pagar.
 * Uso: npm run penalty:verify
 */
import * as fs from 'fs';
import * as path from 'path';
import { Prisma } from '@prisma/client';
import {
    applyEmployeePenaltyToFinance,
    computeEmployeePenaltyPreview,
} from '../src/common/absence-employee-penalty.util';
import { pickNextPlannedTrip, sortPlannedTripsAsc } from '../../frontend/lib/driver-trips';

let passed = 0;
let failed = 0;

function assert(cond: boolean, name: string, detail?: string) {
    if (cond) {
        passed++;
        console.log(`  OK  ${name}`);
    } else {
        failed++;
        console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
    }
}

type MockConta = {
    id: string;
    acaoId: string;
    tipo_conta: string;
    descricao: string;
    valor: Prisma.Decimal | number;
    status: string;
    observacoes: string | null;
    active: boolean;
};

type MockState = {
    employees: Array<{ id: string; userId: string; name: string }>;
    vinculos: Array<{
        acaoId: string;
        employeeId: string;
        valorDiaria: Prisma.Decimal;
        diasTrabalhados: number;
        createdAt: Date;
        employee: { id: string; name: string };
        acao: { id: string; nome: string; dataInicio: Date; dataFim: Date };
    }>;
    contas: MockConta[];
    custos: Array<{ id: string; acaoId: string; tipo: string; descricao: string; valor: number; observacoes: string }>;
};

function buildMockPrisma(state: MockState) {
    return {
        employee: {
            findUnique: async ({ where }: { where: { userId: string } }) =>
                state.employees.find((e) => e.userId === where.userId) ?? null,
        },
        acaoFuncionario: {
            findMany: async ({ where }: { where: { employeeId: string } }) =>
                state.vinculos
                    .filter((v) => v.employeeId === where.employeeId)
                    .map((v) => ({
                        ...v,
                        employee: v.employee,
                        acao: v.acao,
                    })),
            updateMany: async ({
                where,
                data,
            }: {
                where: { acaoId: string; employeeId: string };
                data: { diasTrabalhados: number };
            }) => {
                const v = state.vinculos.find(
                    (x) => x.acaoId === where.acaoId && x.employeeId === where.employeeId,
                );
                if (v) v.diasTrabalhados = data.diasTrabalhados;
                return { count: v ? 1 : 0 };
            },
        },
        acao: {},
        acaoCusto: {
            findFirst: async ({
                where,
            }: {
                where: { acaoId: string; tipo: string; descricao: string };
            }) =>
                state.custos.find(
                    (c) =>
                        c.acaoId === where.acaoId &&
                        c.tipo === where.tipo &&
                        c.descricao === where.descricao,
                ) ?? null,
            update: async ({ where, data }: { where: { id: string }; data: { valor: number; observacoes: string } }) => {
                const c = state.custos.find((x) => x.id === where.id);
                if (c) {
                    c.valor = data.valor;
                    c.observacoes = data.observacoes;
                }
                return c;
            },
        },
        contaPagar: {
            findFirst: async ({
                where,
            }: {
                where: {
                    acaoId?: string;
                    tipo_conta?: string;
                    descricao?: string;
                    active?: boolean;
                };
            }) =>
                state.contas.find(
                    (c) =>
                        (!where.acaoId || c.acaoId === where.acaoId) &&
                        (!where.tipo_conta || c.tipo_conta === where.tipo_conta) &&
                        (!where.descricao || c.descricao === where.descricao) &&
                        (where.active === undefined || c.active === where.active),
                ) ?? null,
            update: async ({
                where,
                data,
            }: {
                where: { id: string };
                data: { valor?: number; observacoes?: string };
            }) => {
                const c = state.contas.find((x) => x.id === where.id);
                if (!c) throw new Error('conta not found');
                if (data.valor != null) c.valor = data.valor;
                if (data.observacoes != null) c.observacoes = data.observacoes;
                return c;
            },
        },
    };
}

console.log('\n=== Penalidade imprevisto (colaborador) — verify ===\n');

// —— Próxima viagem motorista (front helper) ——
const trips = [
    { status: 'PLANNED', departureDate: '2026-06-03T12:00:00.000Z' },
    { status: 'PLANNED', departureDate: '2026-05-18T12:00:00.000Z' },
    { status: 'COMPLETED', departureDate: '2026-05-01T12:00:00.000Z' },
];
const next = pickNextPlannedTrip(trips);
assert(next?.departureDate.startsWith('2026-05-18'), 'pickNextPlannedTrip escolhe ida (menor data)', next?.departureDate);
const sorted = sortPlannedTripsAsc(trips.filter((t) => t.status === 'PLANNED'));
assert(sorted[0].departureDate.startsWith('2026-05-18'), 'sortPlannedTripsAsc ida primeiro');

// —— Preview mock: 12 dias × R$200 ——
const baseState = (): MockState => ({
    employees: [{ id: 'emp-1', userId: 'user-1', name: 'Davi Teste' }],
    vinculos: [
        {
            acaoId: 'acao-1',
            employeeId: 'emp-1',
            valorDiaria: new Prisma.Decimal(200),
            diasTrabalhados: 12,
            createdAt: new Date(),
            employee: { id: 'emp-1', name: 'Davi Teste' },
            acao: {
                id: 'acao-1',
                nome: 'QUALIFICA-MA-3',
                dataInicio: new Date('2026-05-18T12:00:00.000Z'),
                dataFim: new Date('2026-06-03T12:00:00.000Z'),
            },
        },
    ],
    contas: [
        {
            id: 'conta-1',
            acaoId: 'acao-1',
            tipo_conta: 'diaria_funcionario',
            descricao: 'Diária - Davi Teste',
            valor: 2400,
            status: 'pendente',
            observacoes: '12 dia(s) × R$ 200.00/dia',
            active: true,
        },
    ],
    custos: [
        {
            id: 'custo-1',
            acaoId: 'acao-1',
            tipo: 'DIARIA_FUNCIONARIO',
            descricao: 'Diária - Davi Teste',
            valor: 2400,
            observacoes: '12 dia(s) × R$ 200.00/dia',
        },
    ],
});

(async () => {
    const statePending = baseState();
    const prismaPending = buildMockPrisma(statePending);
    const preview = await computeEmployeePenaltyPreview(prismaPending, {
        userId: 'user-1',
        date: new Date('2026-05-20T12:00:00.000Z'),
    });
    assert(preview != null, 'preview encontrou vínculo');
    assert(preview!.suggestedPenalty === 200, 'suggestedPenalty = 1 diária', String(preview?.suggestedPenalty));
    assert(preview!.valorAposDesconto === 2200, 'valor após 1 dia = 2200', String(preview?.valorAposDesconto));
    assert(preview!.diasAposDesconto === 11, 'dias após = 11', String(preview?.diasAposDesconto));

    const apply1 = await applyEmployeePenaltyToFinance(prismaPending, {
        absenceId: 'abs-001',
        userId: 'user-1',
        absenceDate: new Date('2026-05-20T12:00:00.000Z'),
        penaltyAmount: 200,
    });
    assert(apply1.applied, 'apply pendente: applied');
    const contaAfter = statePending.contas[0];
    assert(Number(contaAfter.valor) === 2200, 'conta pendente valor 2200', String(contaAfter.valor));
    assert(statePending.vinculos[0].diasTrabalhados === 11, 'diasTrabalhados 11');
    assert((contaAfter.observacoes || '').includes('absenceId:abs-001'), 'observacoes com absenceId');
    assert((contaAfter.observacoes || '').includes('penalidade_imprevisto:200.00'), 'observacoes penalidade');

    const applyDup = await applyEmployeePenaltyToFinance(prismaPending, {
        absenceId: 'abs-001',
        userId: 'user-1',
        absenceDate: new Date('2026-05-20T12:00:00.000Z'),
        penaltyAmount: 200,
    });
    assert(applyDup.applied && applyDup.message.includes('já tinha sido aplicada'), 'idempotência segunda aplicação');

    // —— Conta já paga → reembolso_devido ——
    const statePaid = baseState();
    statePaid.contas[0].status = 'paga';
    statePaid.contas[0].valor = 2400;
    const prismaPaid = buildMockPrisma(statePaid);
    const applyPaid = await applyEmployeePenaltyToFinance(prismaPaid, {
        absenceId: 'abs-paid',
        userId: 'user-1',
        absenceDate: new Date('2026-05-20T12:00:00.000Z'),
        penaltyAmount: 200,
    });
    assert(applyPaid.reembolsoDevido === 200, 'reembolso devido quando paga');
    assert(Number(statePaid.contas[0].valor) === 2400, 'valor pago mantido');
    assert((statePaid.contas[0].observacoes || '').includes('reembolso_devido:200.00'), 'token reembolso_devido');

    // —— parseAbsencePenaltyMeta (front) ——
    const { parseAbsencePenaltyMeta } = await import('../../frontend/lib/contasPagarHelpers');
    const meta = parseAbsencePenaltyMeta({
        observacoes:
            '11 dia(s) × R$ 200.00/dia | absenceId:abs-001 | penalidade_imprevisto:200.00 | valor_antes_penalidade:2400.00',
    });
    assert(meta.hasPenalty && meta.penalidadeImprevisto === 200, 'parseAbsencePenaltyMeta penalidade');
    assert(meta.valorAntesPenalidade === 2400, 'parseAbsencePenaltyMeta valor antes');
    const metaReemb = parseAbsencePenaltyMeta({
        observacoes: '12 dia(s) | absenceId:x | penalidade_imprevisto:200.00 | reembolso_devido:200.00',
    });
    assert(metaReemb.reembolsoDevido === 200, 'parseAbsencePenaltyMeta reembolso');

    // —— Integração DB (opcional) ——
    console.log('\n--- Integração DB (opcional) ---\n');
    try {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        await prisma.$connect();

        const penalized = await prisma.absence.findFirst({
            where: { active: true, status: 'PENALIZED', penalty: { gt: 0 }, user: { role: { not: 'STUDENT' } } },
            include: { user: { select: { id: true, role: true } } },
            orderBy: { reviewedAt: 'desc' },
        });

        if (penalized && penalized.user.role !== 'STUDENT') {
            const prev = await computeEmployeePenaltyPreview(prisma, {
                userId: penalized.userId,
                date: penalized.date,
            });
            if (prev) {
                console.log(
                    `  INFO imprevisto ${penalized.id.slice(0, 8)}… período=${prev.acaoNome} diária=${prev.valorDiaria} total=${prev.valorTotalAtual}`,
                );
                const sync = await applyEmployeePenaltyToFinance(prisma, {
                    absenceId: penalized.id,
                    userId: penalized.userId,
                    absenceDate: penalized.date,
                    penaltyAmount: Number(penalized.penalty),
                });
                assert(sync.applied, 'DB: sync penalidade existente', sync.message);
            } else {
                console.log('  SKIP DB: imprevisto penalizado sem AcaoFuncionario');
            }
        } else {
            console.log('  SKIP DB: nenhum imprevisto PENALIZED de colaborador');
        }

        const migPath = path.join(
            __dirname,
            '../prisma/migrations/20260519130000_acao_driver_departure_date/migration.sql',
        );
        assert(fs.existsSync(migPath), 'repo: migration driverDepartureDate presente');

        const migration = await prisma.$queryRaw<Array<{ column_name: string }>>`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'acoes' AND column_name = 'driverDepartureDate'
        `;
        if (migration.length === 1) {
            assert(true, 'DB: coluna acoes.driverDepartureDate aplicada');
        } else {
            console.log(
                '  WARN DB: coluna driverDepartureDate ainda não aplicada — na VPS: npx prisma migrate deploy',
            );
        }

        await prisma.$disconnect();
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`  SKIP DB: ${msg.slice(0, 120)}`);
    }

    console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===\n`);
    process.exit(failed > 0 ? 1 : 0);
})();
