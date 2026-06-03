import type { Prisma, PrismaClient } from '@prisma/client';

type PrismaLike = Pick<
    PrismaClient,
    'employee' | 'acaoFuncionario' | 'acao' | 'acaoCusto' | 'contaPagar'
> | Prisma.TransactionClient;

function dayStampUtc(d: Date): number {
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function inclusiveCalendarDaysBetweenUtc(start: Date, end: Date): number {
    const a = dayStampUtc(start);
    const b = dayStampUtc(end);
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

function mergeObservacaoToken(observacoes: string | null | undefined, key: string, value: string): string {
    const re = new RegExp(`${key}:[^|]+`, 'gi');
    const token = `${key}:${value}`;
    const raw = (observacoes || '').trim();
    if (!raw) return token;
    if (re.test(raw)) return raw.replace(re, token);
    return `${raw} | ${token}`;
}

export type EmployeePenaltyPreview = {
    employeeId: string;
    employeeName: string;
    acaoId: string;
    acaoNome: string;
    diasCorridosPeriodo: number;
    diasTrabalhadosAtuais: number;
    valorDiaria: number;
    valorTotalAtual: number;
    suggestedPenalty: number;
    valorAposDesconto: number;
    diasAposDesconto: number;
    contaPagarId: string | null;
    contaJaPaga: boolean;
    valorJaPago: number | null;
    reembolsoDevidoSePaga: number | null;
    usedFallbackAcao: boolean;
};

export async function findAcaoFuncionarioForEmployeeAbsence(
    prisma: PrismaLike,
    userId: string,
    absenceDate: Date,
): Promise<{
    vinculo: {
        acaoId: string;
        employeeId: string;
        valorDiaria: Prisma.Decimal;
        diasTrabalhados: number;
        employee: { id: string; name: string };
        acao: { id: string; nome: string; dataInicio: Date; dataFim: Date };
    };
    usedFallbackAcao: boolean;
} | null> {
    const employee = await prisma.employee.findUnique({
        where: { userId },
        select: { id: true, name: true },
    });
    if (!employee) return null;

    const vinculos = await prisma.acaoFuncionario.findMany({
        where: { employeeId: employee.id },
        include: {
            employee: { select: { id: true, name: true } },
            acao: { select: { id: true, nome: true, dataInicio: true, dataFim: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    if (!vinculos.length) return null;

    const absStamp = dayStampUtc(absenceDate);
    const overlaps = vinculos.filter((v) => {
        const s = dayStampUtc(v.acao.dataInicio);
        const e = dayStampUtc(v.acao.dataFim);
        return absStamp >= s && absStamp <= e;
    });
    const pick = overlaps[0] ?? vinculos[0];
    return { vinculo: pick, usedFallbackAcao: overlaps.length === 0 };
}

export async function computeEmployeePenaltyPreview(
    prisma: PrismaLike,
    absence: { userId: string; date: Date },
): Promise<EmployeePenaltyPreview | null> {
    const found = await findAcaoFuncionarioForEmployeeAbsence(prisma, absence.userId, absence.date);
    if (!found) return null;

    const { vinculo, usedFallbackAcao } = found;
    const valorDiaria = Number(vinculo.valorDiaria);
    const diasTrabalhadosAtuais = Math.max(0, vinculo.diasTrabalhados);
    const valorTotalAtual = Math.round(valorDiaria * diasTrabalhadosAtuais * 100) / 100;
    const suggestedPenalty =
        valorDiaria > 0 ? Math.round(valorDiaria * 100) / 100 : Math.round((valorTotalAtual / Math.max(diasTrabalhadosAtuais, 1)) * 100) / 100;
    const diasAposDesconto = Math.max(0, diasTrabalhadosAtuais - 1);
    const valorAposDesconto = Math.round(valorDiaria * diasAposDesconto * 100) / 100;

    const descricao = `Diária - ${vinculo.employee.name}`;
    const conta = await prisma.contaPagar.findFirst({
        where: {
            acaoId: vinculo.acaoId,
            tipo_conta: 'diaria_funcionario',
            descricao,
            active: true,
        },
        select: { id: true, status: true, valor: true, observacoes: true },
    });

    const contaJaPaga = conta?.status === 'paga';
    const valorJaPago = conta ? Number(conta.valor) : null;

    return {
        employeeId: vinculo.employeeId,
        employeeName: vinculo.employee.name,
        acaoId: vinculo.acaoId,
        acaoNome: vinculo.acao.nome,
        diasCorridosPeriodo: inclusiveCalendarDaysBetweenUtc(vinculo.acao.dataInicio, vinculo.acao.dataFim),
        diasTrabalhadosAtuais,
        valorDiaria,
        valorTotalAtual: conta ? Number(conta.valor) : valorTotalAtual,
        suggestedPenalty,
        valorAposDesconto,
        diasAposDesconto,
        contaPagarId: conta?.id ?? null,
        contaJaPaga,
        valorJaPago,
        reembolsoDevidoSePaga: contaJaPaga ? suggestedPenalty : null,
        usedFallbackAcao,
    };
}

/**
 * Aplica desconto de imprevisto PENALIZED na diária do período (ContaPagar + AcaoFuncionario).
 * Se a conta já estiver paga, mantém o valor pago e regista reembolso_devido nas observações.
 */
export async function applyEmployeePenaltyToFinance(
    prisma: PrismaLike,
    params: {
        absenceId: string;
        userId: string;
        absenceDate: Date;
        penaltyAmount: number;
    },
): Promise<{ applied: boolean; message: string; contaPagarId?: string; reembolsoDevido?: number }> {
    const penalty = Math.round(Math.max(0, params.penaltyAmount) * 100) / 100;
    if (penalty <= 0) {
        return { applied: false, message: 'Penalidade zero — nenhum ajuste financeiro.' };
    }

    const found = await findAcaoFuncionarioForEmployeeAbsence(prisma, params.userId, params.absenceDate);
    if (!found) {
        return {
            applied: false,
            message: 'Funcionário não vinculado a um período de curso — penalidade registada sem ajuste em Contas a pagar.',
        };
    }

    const { vinculo } = found;
    const valorDiaria = Number(vinculo.valorDiaria);
    const diasBefore = Math.max(0, vinculo.diasTrabalhados);
    const descricao = `Diária - ${vinculo.employee.name}`;

    let diasFinal = diasBefore;
    let novoValor = Math.round(valorDiaria * diasBefore * 100) / 100;

    const umDia = valorDiaria > 0 ? valorDiaria : penalty;
    if (Math.abs(penalty - umDia) < 0.02 || penalty >= umDia) {
        diasFinal = Math.max(0, diasBefore - 1);
        novoValor = Math.round(valorDiaria * diasFinal * 100) / 100;
    } else {
        novoValor = Math.max(0, Math.round((novoValor - penalty) * 100) / 100);
        if (valorDiaria > 0) {
            diasFinal = Math.max(0, Math.ceil(novoValor / valorDiaria));
            novoValor = Math.round(valorDiaria * diasFinal * 100) / 100;
        }
    }

    const obsBase = `${diasFinal} dia(s) × R$ ${valorDiaria.toFixed(2)}/dia`;
    const conta = await prisma.contaPagar.findFirst({
        where: {
            acaoId: vinculo.acaoId,
            tipo_conta: 'diaria_funcionario',
            descricao,
            active: true,
        },
    });

    await prisma.acaoFuncionario.updateMany({
        where: { acaoId: vinculo.acaoId, employeeId: vinculo.employeeId },
        data: { diasTrabalhados: diasFinal },
    });

    const acaoCusto = await prisma.acaoCusto.findFirst({
        where: { acaoId: vinculo.acaoId, tipo: 'DIARIA_FUNCIONARIO', descricao },
    });
    if (acaoCusto) {
        await prisma.acaoCusto.update({
            where: { id: acaoCusto.id },
            data: {
                valor: novoValor,
                observacoes: obsBase,
            },
        });
    }

    if (!conta) {
        return {
            applied: true,
            message: 'Dias de diária do período atualizados; conta a pagar ainda não existia.',
        };
    }

    const alreadyApplied = (conta.observacoes || '').includes(`absenceId:${params.absenceId}`);
    if (alreadyApplied) {
        return {
            applied: true,
            message: 'Penalidade deste imprevisto já tinha sido aplicada na diária.',
            contaPagarId: conta.id,
        };
    }

    const contaJaPaga = conta.status === 'paga';
    let observacoes = mergeObservacaoToken(conta.observacoes, 'absenceId', params.absenceId);
    observacoes = mergeObservacaoToken(
        observacoes,
        'penalidade_imprevisto',
        penalty.toFixed(2),
    );

    if (contaJaPaga) {
        observacoes = mergeObservacaoToken(
            observacoes,
            'reembolso_devido',
            penalty.toFixed(2),
        );
        await prisma.contaPagar.update({
            where: { id: conta.id },
            data: { observacoes },
        });
        return {
            applied: true,
            message: `Diária já estava paga — registado reembolso devido de R$ ${penalty.toFixed(2)}.`,
            contaPagarId: conta.id,
            reembolsoDevido: penalty,
        };
    }

    observacoes = mergeObservacaoToken(observacoes, 'valor_antes_penalidade', Number(conta.valor).toFixed(2));
    await prisma.contaPagar.update({
        where: { id: conta.id },
        data: {
            valor: novoValor,
            observacoes,
        },
    });

    return {
        applied: true,
        message: `Diária ajustada: R$ ${Number(conta.valor).toFixed(2)} → R$ ${novoValor.toFixed(2)} (−1 dia útil / penalidade).`,
        contaPagarId: conta.id,
    };
}
