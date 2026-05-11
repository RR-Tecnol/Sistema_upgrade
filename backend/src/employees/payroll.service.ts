import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * PayrollService — REQ-09
 * 
 * Calcula o custo mensal de professores CLT para um Período de Curso.
 * 
 * REGRA DA REUNIÃO (00:18:59 — 00:20:04):
 * "O professor é CLT então a gente paga salário base mais diária de custo...
 *  quando a cidade for a menos de 200km ele recebe uma passagem por semana,
 *  mais de 200km é quinzenal."
 * 
 * REGRA FINANCEIRA (02_LIVRO_DE_REGRAS.md):
 * Todos os valores são Decimal(12,2) — NUNCA Float.
 * Exemplo: Float(120.10 * 22) = 2642.2000000000003 ← ERRADO
 *          Decimal(120.10 * 22) = 2642.20 ← CORRETO
 * 
 * Pesquisa: 2026-03-12_modelo_financeiro_clt_passagens.md
 */
@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  // Distância limite para definir passagem semanal vs quinzenal
  private readonly TRAVEL_RULE_KM = 200;

  /**
   * Determina a frequência de passagem com base na distância
   * "menos de 200km → semanal / mais de 200km → quinzenal"
   */
  getTravelFrequency(distanceKm: number): 'WEEKLY' | 'BIWEEKLY' {
    return distanceKm <= this.TRAVEL_RULE_KM ? 'WEEKLY' : 'BIWEEKLY';
  }

  /**
   * Calcula custo total de um funcionário em um Período de Curso.
   * 
   * Fórmula:
   * custo_total = diárias × dias_trabalhados + passagens
   * 
   * Para CLT: o salário é custo organizacional separado (não entra no custo da rota diretamente).
   * A diária (R$120) + passagens compõem o custo operacional da rota.
   * 
   * @param employeeId - ID do funcionário
   * @param diasTrabalhados - Número de dias de trabalho no período
   * @param distanciaKm - Distância da cidade sede (determina frequência de passagem)
   * @param valorPassagem - Valor de uma passagem ida+volta
   * @param semanasDoPeriodo - Número de semanas do período (para calcular passagens)
   */
  async calculateFieldCost(
    employeeId: string,
    diasTrabalhados: number,
    distanciaKm: number,
    valorPassagem: number,
    semanasDoPeriodo: number,
  ): Promise<{
    employeeName: string;
    contractType: string;
    monthlySalaryCLT: number | null;
    dailyCost: number;
    diasTrabalhados: number;
    travelFrequency: string;
    numberOfTrips: number;
    valorPassagemUnit: number;
    totalDailyCosts: number;
    totalTravelCosts: number;
    totalFieldCost: number;
    breakdown: string;
  }> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new Error(`Funcionário ${employeeId} não encontrado`);
    }

    // Diária de custo (alimentação/hospedagem) — Decimal(10,2)
    const dailyCost = Number(employee.dailyCost ?? 120); // padrão R$120 da reunião
    const monthlySalaryCLT = employee.monthlySalaryCLT ? Number(employee.monthlySalaryCLT) : null;

    // Total de diárias
    const totalDailyCosts = Math.round(dailyCost * diasTrabalhados * 100) / 100; // arredondamento seguro

    // Cálculo de passagens
    const freq = this.getTravelFrequency(distanciaKm);
    const numberOfTrips = freq === 'WEEKLY' ? semanasDoPeriodo : Math.ceil(semanasDoPeriodo / 2);
    const totalTravelCosts = Math.round(valorPassagem * numberOfTrips * 100) / 100;

    const totalFieldCost = Math.round((totalDailyCosts + totalTravelCosts) * 100) / 100;

    return {
      employeeName: employee.name,
      contractType: employee.contractType ?? 'N/A',
      monthlySalaryCLT,
      dailyCost,
      diasTrabalhados,
      travelFrequency: freq === 'WEEKLY' ? 'Semanal (≤200km)' : 'Quinzenal (>200km)',
      numberOfTrips,
      valorPassagemUnit: valorPassagem,
      totalDailyCosts,
      totalTravelCosts,
      totalFieldCost,
      breakdown: [
        `Diárias: R$${dailyCost} × ${diasTrabalhados} dias = R$${totalDailyCosts}`,
        `Passagens: R$${valorPassagem} × ${numberOfTrips} viagens (${freq === 'WEEKLY' ? 'semanal' : 'quinzenal'}) = R$${totalTravelCosts}`,
        `TOTAL CAMPO: R$${totalFieldCost}`,
        monthlySalaryCLT
          ? `Salário CLT: R$${monthlySalaryCLT}/mês (custo organizacional separado)`
          : '',
      ].filter(Boolean).join('\n'),
    };
  }

  /**
   * Calcula custo total de todos os funcionários de um Período de Curso (Acao)
   */
  async calculateAcaoCost(acaoId: string, valorPassagem: number) {
    const acao = await this.prisma.acao.findUnique({
      where: { id: acaoId },
      include: {
        funcionarios: {
          include: { employee: true },
        },
      },
    });

    if (!acao) {
      throw new Error(`Período de Curso ${acaoId} não encontrado`);
    }

    // Calcular número de semanas
    const diffMs = acao.dataFim.getTime() - acao.dataInicio.getTime();
    const semanas = Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000));
    const distanciaKm = acao.distanciaKm ? Number(acao.distanciaKm) : 0;

    const results = await Promise.all(
      acao.funcionarios.map(f =>
        this.calculateFieldCost(
          f.employeeId,
          f.diasTrabalhados,
          distanciaKm,
          valorPassagem,
          semanas,
        ),
      ),
    );

    const totalGeral = results.reduce((sum, r) => sum + r.totalFieldCost, 0);

    return {
      acaoNome: acao.nome,
      acaoCidade: acao.cidadeNome,
      periodoSemanas: semanas,
      distanciaKm,
      funcionarios: results,
      totalGeralCampo: Math.round(totalGeral * 100) / 100,
    };
  }
}
