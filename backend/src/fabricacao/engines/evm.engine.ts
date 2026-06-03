export interface EvmInput {
  bac: number;  // Budget at Completion = orcamentoTotal
  ev: number;   // Earned Value = valorAgregadoTotal
  pv: number;   // Planned Value = calculado pelo baseline
  ac: number;   // Actual Cost = custoRealAcumulado
}

export interface EvmMetrics extends EvmInput {
  cv: number;
  sv: number;
  cpi: number;
  spi: number;
  eac: number;
  etc: number;
  vac: number;
  tcpi: number;
  percentualFisico: number;
  statusCusto: 'GREEN' | 'YELLOW' | 'RED';
  statusPrazo: 'GREEN' | 'YELLOW' | 'RED';
  statusTcpi: 'GREEN' | 'YELLOW' | 'RED';
  interpretacaoCpi: string;
  interpretacaoSpi: string;
}

export class EvmEngine {
  static calcular(input: EvmInput): EvmMetrics {
    const { bac, ev, pv, ac } = input;
    const cpi  = ac > 0 ? ev / ac : 1;
    const spi  = pv > 0 ? ev / pv : 1;
    const cv   = ev - ac;
    const sv   = ev - pv;
    const eac  = ac + (bac - ev) / (cpi > 0.01 ? cpi : 0.01);
    const etc  = eac - ac;
    const vac  = bac - eac;
    const tcpi = (bac - ac) > 0.01 ? (bac - ev) / (bac - ac) : 0;
    const percentualFisico = bac > 0 ? Math.round((ev / bac) * 100) : 0;

    return {
      bac, ev, pv, ac, cv, sv, cpi, spi, eac, etc, vac, tcpi, percentualFisico,
      statusCusto: cpi >= 0.95 ? 'GREEN' : cpi >= 0.85 ? 'YELLOW' : 'RED',
      statusPrazo: spi >= 0.95 ? 'GREEN' : spi >= 0.85 ? 'YELLOW' : 'RED',
      statusTcpi: tcpi <= 1.10 ? 'GREEN' : tcpi <= 1.20 ? 'YELLOW' : 'RED',
      interpretacaoCpi:
        ac === 0
          ? `Sem custo real registrado — CPI calculado como referência. Registre apontamentos financeiros para análise precisa.`
          : cpi > 1
          ? `Eficiente: cada R$1 gasto gera R$${cpi.toFixed(2)} de valor. Abaixo do orçamento.`
          : cpi === 1
          ? `No orçamento: cada R$1 gasto gera R$1.00 de valor. Exatamente dentro do planejado.`
          : `Atenção: cada R$1 gasto gera apenas R$${cpi.toFixed(2)} de valor. Acima do orçamento.`,
      interpretacaoSpi:
        pv === 0
          ? `Sem valor planejado calculado — defina as datas de baseline para análise de prazo.`
          : spi >= 1
          ? `Adiantado: produção ${Math.min(((spi - 1) * 100), 999).toFixed(0)}% mais rápida que o planejado.`
          : `Atrasado: produção ${((1 - spi) * 100).toFixed(0)}% mais lenta que o planejado.`,
    };
  }

  /** Calcula PV com base no tempo decorrido vs baseline (curva linear) */
  static calcularPv(bac: number, dataInicio: Date, dataFim: Date, hoje: Date): number {
    const totalMs = dataFim.getTime() - dataInicio.getTime();
    if (totalMs <= 0) return bac;
    const decorrido = Math.min(
      Math.max(hoje.getTime() - dataInicio.getTime(), 0),
      totalMs,
    );
    return bac * (decorrido / totalMs);
  }

  /** Calcula EV acumulado somando peso × % concluído de cada operação */
  static calcularEv(
    bac: number,
    operacoes: Array<{ pesoEvm: any; percentualConcluido: number }>,
  ): number {
    const totalPeso = operacoes.reduce((acc, op) => acc + Number(op.pesoEvm), 0);
    if (totalPeso === 0) return 0;
    const evPct = operacoes.reduce(
      (acc, op) => acc + (Number(op.pesoEvm) / 100) * op.percentualConcluido,
      0,
    );
    return bac * (evPct / 100);
  }
}
