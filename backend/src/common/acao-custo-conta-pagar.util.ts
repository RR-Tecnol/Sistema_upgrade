import { AcaoCustoTipo } from '@prisma/client';
import type { Prisma, PrismaClient } from '@prisma/client';

type PrismaLike = Pick<PrismaClient, 'contaPagar'> | Prisma.TransactionClient;

export function acaoCustoTipoToContaSlug(tipo: AcaoCustoTipo): string | null {
    switch (tipo) {
        case AcaoCustoTipo.ABASTECIMENTO:
            return 'abastecimento';
        case AcaoCustoTipo.DESPESA_GERAL:
            return 'outros';
        case AcaoCustoTipo.DIARIA_FUNCIONARIO:
            return 'diaria_funcionario';
        default:
            return null;
    }
}

export function buildContaObservacoesFromAcaoCusto(custo: {
    id: string;
    observacoes?: string | null;
    litros?: number | Prisma.Decimal | null;
}): string {
    const parts = ['origem=acao_custo', `acaoCustoId:${custo.id}`];
    if (custo.litros != null && Number(custo.litros) > 0) {
        parts.push(`litros=${Number(custo.litros)}`);
    }
    const extra = custo.observacoes?.trim();
    if (extra && !extra.includes('acaoCustoId:')) {
        parts.push(extra);
    }
    return parts.join(' | ');
}

export async function findContaPagarByAcaoCustoId(prisma: PrismaLike, acaoCustoId: string) {
    return prisma.contaPagar.findFirst({
        where: {
            active: true,
            observacoes: { contains: `acaoCustoId:${acaoCustoId}` },
        },
    });
}

type AcaoCtx = {
    id: string;
    cidadeNome?: string | null;
    dataFim?: Date | null;
};

type CustoCtx = {
    id: string;
    acaoId: string;
    tipo: AcaoCustoTipo;
    descricao: string;
    valor: Prisma.Decimal | number;
    data: Date;
    litros?: number | Prisma.Decimal | null;
    observacoes?: string | null;
};

/** Cria ContaPagar vinculada a um AcaoCusto (idempotente por acaoCustoId). */
export async function createContaPagarForAcaoCusto(
    prisma: PrismaLike,
    acao: AcaoCtx,
    custo: CustoCtx,
) {
    const tipoConta = acaoCustoTipoToContaSlug(custo.tipo);
    if (!tipoConta) return null;

    const existing = await findContaPagarByAcaoCustoId(prisma, custo.id);
    if (existing) return existing;

    return prisma.contaPagar.create({
        data: {
            tipo_conta: tipoConta,
            descricao: custo.descricao,
            valor: custo.valor,
            data_vencimento: custo.data ?? acao.dataFim ?? new Date(),
            status: 'pendente',
            recorrente: false,
            acaoId: acao.id,
            cidade: acao.cidadeNome ?? undefined,
            observacoes: buildContaObservacoesFromAcaoCusto(custo),
        },
    });
}

/** Soft-delete da conta ligada ao custo do período. */
export async function deactivateContaPagarForAcaoCusto(prisma: PrismaLike, acaoCustoId: string) {
    const conta = await findContaPagarByAcaoCustoId(prisma, acaoCustoId);
    if (!conta) return false;
    await prisma.contaPagar.update({
        where: { id: conta.id },
        data: { active: false },
    });
    return true;
}

/** Backfill: custos ABASTECIMENTO / DESPESA_GERAL sem conta correspondente. */
export async function syncMissingContasForAcaoCustos(
    prisma: PrismaLike,
    acao: AcaoCtx,
    custos: CustoCtx[],
): Promise<number> {
    let created = 0;
    for (const c of custos) {
        if (
            c.tipo !== AcaoCustoTipo.ABASTECIMENTO &&
            c.tipo !== AcaoCustoTipo.DESPESA_GERAL
        ) {
            continue;
        }
        const before = await findContaPagarByAcaoCustoId(prisma, c.id);
        if (before) continue;
        const row = await createContaPagarForAcaoCusto(prisma, acao, c);
        if (row) created++;
    }
    return created;
}
