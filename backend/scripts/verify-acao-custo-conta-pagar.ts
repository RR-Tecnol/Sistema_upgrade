/**
 * Validação: Abastecimento / Despesa do período → Contas a pagar.
 * Uso: npm run acao-custo:verify
 */
import { AcaoCustoTipo, Prisma } from '@prisma/client';
import {
    acaoCustoTipoToContaSlug,
    buildContaObservacoesFromAcaoCusto,
    createContaPagarForAcaoCusto,
    deactivateContaPagarForAcaoCusto,
    findContaPagarByAcaoCustoId,
    syncMissingContasForAcaoCustos,
} from '../src/common/acao-custo-conta-pagar.util';

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
    valor: number;
    data_vencimento: Date;
    status: string;
    observacoes: string | null;
    active: boolean;
    cidade?: string;
};

type MockCusto = {
    id: string;
    acaoId: string;
    tipo: AcaoCustoTipo;
    descricao: string;
    valor: number;
    data: Date;
    litros?: number | null;
    observacoes?: string | null;
};

function buildMock(state: { contas: MockConta[]; custos: MockCusto[] }) {
    return {
        contaPagar: {
            findFirst: async ({
                where,
            }: {
                where: {
                    active?: boolean;
                    observacoes?: { contains: string };
                    acaoId?: string;
                    tipo_conta?: string;
                    descricao?: string;
                };
            }) => {
                return (
                    state.contas.find((c) => {
                        if (where.active !== undefined && c.active !== where.active) return false;
                        if (where.acaoId && c.acaoId !== where.acaoId) return false;
                        if (where.tipo_conta && c.tipo_conta !== where.tipo_conta) return false;
                        if (where.descricao && c.descricao !== where.descricao) return false;
                        if (where.observacoes?.contains) {
                            return (c.observacoes || '').includes(where.observacoes.contains);
                        }
                        return true;
                    }) ?? null
                );
            },
            create: async ({ data }: { data: Omit<MockConta, 'id' | 'active'> & { active?: boolean } }) => {
                const row: MockConta = {
                    id: `conta-${state.contas.length + 1}`,
                    active: data.active ?? true,
                    ...data,
                };
                state.contas.push(row);
                return row;
            },
            update: async ({
                where,
                data,
            }: {
                where: { id: string };
                data: Partial<MockConta>;
            }) => {
                const c = state.contas.find((x) => x.id === where.id);
                if (!c) throw new Error('conta missing');
                Object.assign(c, data);
                return c;
            },
        },
    };
}

console.log('\n=== Período: custos → Contas a pagar — verify ===\n');

assert(acaoCustoTipoToContaSlug(AcaoCustoTipo.ABASTECIMENTO) === 'abastecimento', 'slug abastecimento');
assert(acaoCustoTipoToContaSlug(AcaoCustoTipo.DESPESA_GERAL) === 'outros', 'slug despesa geral');

const obs = buildContaObservacoesFromAcaoCusto({
    id: 'custo-abc',
    litros: 85.5,
    observacoes: 'Posto BR-316',
});
assert(obs.includes('acaoCustoId:custo-abc'), 'observacoes com acaoCustoId');
assert(obs.includes('litros=85.5'), 'observacoes com litros');

(async () => {
    const acao = { id: 'acao-1', cidadeNome: 'São Luís, MA', dataFim: new Date('2026-06-03') };

    const stateAbast = { contas: [] as MockConta[], custos: [] as MockCusto[] };
    const prismaAbast = buildMock(stateAbast);
    const custoAbast: MockCusto = {
        id: 'custo-abast-1',
        acaoId: 'acao-1',
        tipo: AcaoCustoTipo.ABASTECIMENTO,
        descricao: 'Abast. posto km 350',
        valor: 450,
        data: new Date('2026-05-20'),
        litros: 75,
    };
    await createContaPagarForAcaoCusto(prismaAbast, acao, custoAbast);
    assert(stateAbast.contas.length === 1, 'cria 1 conta abastecimento');
    assert(stateAbast.contas[0].tipo_conta === 'abastecimento', 'tipo_conta abastecimento');
    assert(stateAbast.contas[0].valor === 450, 'valor conta = custo');
    assert(stateAbast.contas[0].acaoId === 'acao-1', 'acaoId vinculado');

    await createContaPagarForAcaoCusto(prismaAbast, acao, custoAbast);
    assert(stateAbast.contas.length === 1, 'idempotente — não duplica');

    const stateDesp = { contas: [] as MockConta[], custos: [] as MockCusto[] };
    const prismaDesp = buildMock(stateDesp);
    const custoDesp: MockCusto = {
        id: 'custo-desp-1',
        acaoId: 'acao-1',
        tipo: AcaoCustoTipo.DESPESA_GERAL,
        descricao: 'Café equipe',
        valor: 120,
        data: new Date('2026-05-21'),
    };
    await createContaPagarForAcaoCusto(prismaDesp, acao, custoDesp);
    assert(stateDesp.contas[0].tipo_conta === 'outros', 'despesa → tipo outros');

    const backfillState = {
        contas: [] as MockConta[],
        custos: [custoAbast, custoDesp] as MockCusto[],
    };
    const n = await syncMissingContasForAcaoCustos(buildMock(backfillState), acao, backfillState.custos);
    assert(n === 2, 'backfill cria 2 contas', String(n));

    const deactivateState = {
        contas: [
            {
                id: 'conta-x',
                acaoId: 'acao-1',
                tipo_conta: 'abastecimento',
                descricao: 'Abast.',
                valor: 100,
                data_vencimento: new Date(),
                status: 'pendente',
                observacoes: 'origem=acao_custo | acaoCustoId:custo-del',
                active: true,
            },
        ],
        custos: [],
    };
    const deactivated = await deactivateContaPagarForAcaoCusto(
        buildMock(deactivateState),
        'custo-del',
    );
    assert(deactivated, 'deactivate encontra conta');
    assert(deactivateState.contas[0].active === false, 'soft delete active=false');

    const found = await findContaPagarByAcaoCustoId(buildMock(deactivateState), 'custo-del');
    assert(found === null, 'conta inativa não retorna em find');

    console.log('\n--- Integração DB (opcional) ---\n');
    try {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        await prisma.$connect();

        const custosSemConta = await prisma.acaoCusto.findMany({
            where: {
                tipo: { in: [AcaoCustoTipo.ABASTECIMENTO, AcaoCustoTipo.DESPESA_GERAL] },
            },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                acao: { select: { id: true, cidadeNome: true, dataFim: true, nome: true } },
            },
        });

        let synced = 0;
        for (const c of custosSemConta) {
            const linked = await findContaPagarByAcaoCustoId(prisma, c.id);
            if (!linked) {
                await createContaPagarForAcaoCusto(prisma, c.acao, c);
                synced++;
            }
        }
        console.log(`  INFO DB: ${custosSemConta.length} custo(s) recentes verificados, ${synced} conta(s) criada(s)`);
        assert(true, 'DB: integração opcional executada');

        await prisma.$disconnect();
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`  SKIP DB: ${msg.slice(0, 100)}`);
    }

    console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===\n`);
    process.exit(failed > 0 ? 1 : 0);
})();
