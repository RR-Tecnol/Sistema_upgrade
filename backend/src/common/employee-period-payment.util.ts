/**
 * Cálculo de remuneração de funcionário no período de curso (CLT vs diária).
 * Alinhado a `AcoesService.calcularResumoFinanceiro`.
 */

export function isCltContract(contractType?: string | null): boolean {
    return String(contractType || '').toUpperCase() === 'CLT';
}

export function funcionarioAcaoCustoDescricao(name: string, contractType?: string | null): string {
    return isCltContract(contractType) ? `CLT - ${name}` : `Diária - ${name}`;
}

export type CltPeriodPaymentSettings = {
    diasUteisReferenciaMes: number;
    kmLimitePassagemSemanal: number;
    valorPassagemViagem: number;
};

export function computeCltPeriodPayment(params: {
    monthlySalaryCLT: number;
    diasTrabalhados: number;
    travelRuleKm?: number | null;
    settings: CltPeriodPaymentSettings;
}): { valorTotal: number; salarioProporcional: number; passagens: number; observacoes: string } {
    const dias = Math.max(0, params.diasTrabalhados || 0);
    const diasUteisMes = Math.max(1, params.settings.diasUteisReferenciaMes || 22);
    const salarioProporcional =
        (Number(params.monthlySalaryCLT) / diasUteisMes) * dias;

    const kmLimite = params.travelRuleKm ?? params.settings.kmLimitePassagemSemanal;
    const semanas = Math.ceil(dias / 5);
    const viagens =
        kmLimite <= params.settings.kmLimitePassagemSemanal
            ? semanas * 2
            : Math.ceil(semanas / 2) * 2;
    const passagens = viagens * params.settings.valorPassagemViagem;
    const valorTotal = salarioProporcional + passagens;

    const observacoes =
        `CLT: ${dias} dia(s) × salário proporcional R$ ${salarioProporcional.toFixed(2)}` +
        (passagens > 0 ? ` + passagens R$ ${passagens.toFixed(2)}` : '');

    return { valorTotal, salarioProporcional, passagens, observacoes };
}

export function computeDiariaPeriodPayment(valorDiaria: number, diasTrabalhados: number): {
    valorTotal: number;
    observacoes: string;
} {
    const dias = Math.max(0, diasTrabalhados || 0);
    const vd = Number(valorDiaria) || 0;
    const valorTotal = vd * dias;
    return {
        valorTotal,
        observacoes: `${dias} dia(s) × R$ ${vd.toFixed(2)}/dia`,
    };
}

export function computeFuncionarioPeriodPayment(params: {
    contractType?: string | null;
    valorDiaria: number;
    diasTrabalhados: number;
    monthlySalaryCLT?: number | null;
    travelRuleKm?: number | null;
    settings: CltPeriodPaymentSettings;
}): { valorTotal: number; valorDiariaRecord: number; observacoes: string; descricaoSuffix: 'CLT' | 'Diária' } {
    if (isCltContract(params.contractType)) {
        const monthly = Number(params.monthlySalaryCLT);
        if (!monthly || monthly <= 0) {
            throw new Error('Funcionário CLT sem salário mensal definido.');
        }
        const clt = computeCltPeriodPayment({
            monthlySalaryCLT: monthly,
            diasTrabalhados: params.diasTrabalhados,
            travelRuleKm: params.travelRuleKm,
            settings: params.settings,
        });
        const ratePerDay = monthly / Math.max(1, params.settings.diasUteisReferenciaMes);
        return {
            valorTotal: clt.valorTotal,
            valorDiariaRecord: ratePerDay,
            observacoes: clt.observacoes,
            descricaoSuffix: 'CLT',
        };
    }

    const diaria = computeDiariaPeriodPayment(params.valorDiaria, params.diasTrabalhados);
    return {
        valorTotal: diaria.valorTotal,
        valorDiariaRecord: params.valorDiaria,
        observacoes: diaria.observacoes,
        descricaoSuffix: 'Diária',
    };
}
