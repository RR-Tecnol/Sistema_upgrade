import { OperacaoRoteiro } from '@prisma/client';

export interface CpmNode {
  operacao: OperacaoRoteiro;
  ordemNumero: number;
  duracaoDias: number;
  predecessoras: OperacaoRoteiro[];
}

export interface CpmResult {
  operacao: OperacaoRoteiro;
  esDate: Date;
  efDate: Date;
  lsDate: Date;
  lfDate: Date;
  folga: number;
  isCritical: boolean;
}

export class CpmEngine {
  /** Duração padrão em dias úteis por operação */
  static readonly DURACAO_PADRAO: Record<OperacaoRoteiro, number> = {
    OP010_VISTORIA_DESMANCHE:  5,   // FASE 1 — Aquisição e Legalização
    OP020_SERRALHERIA:        10,   // FASE 2 — Estrutura Externa (longa)
    OP025_ELETRICA_AUTOMOTIVA: 3,   // FASE 3 — Elétrica Automotiva (paralela com OP020)
    OP030_INFRAESTRUTURA:      4,   // FASE 4 — Estrutura Interna (paralela com OP020 tardio)
    OP040_ACABAMENTO:          8,   // Serviço Interno — ponto de sincronização
    OP050_MARCENARIA:          4,   // Serviço de Acabamento
    OP060_GATE_LIBERACAO:      1,   // Gate de Liberação Final
  };

  /** Peso EVM padrão por operação (soma = 100%) */
  static readonly PESO_EVM: Record<OperacaoRoteiro, number> = {
    OP010_VISTORIA_DESMANCHE:   8,  // Processo burocrático de aquisição
    OP020_SERRALHERIA:         25,  // Maior esforço — serralheria completa
    OP025_ELETRICA_AUTOMOTIVA:  7,  // Serviço especializado, curta duração
    OP030_INFRAESTRUTURA:      10,  // Ferro, elétrica e tubulação interna
    OP040_ACABAMENTO:          28,  // Maior complexidade: MDF, AC, móveis, testes
    OP050_MARCENARIA:          17,  // Plotagem + marcenaria + limpeza
    OP060_GATE_LIBERACAO:       5,  // Inspeção final e documentação
  };

  /**
   * Dependências FS (Finish-to-Start) — grafo de paralelismo real.
   *
   * Fluxo:
   *   OP010 ──▶ OP020 (Estrutura Externa)  ─────────────────────────────────╮
   *         ╰─▶ OP025 (Elétrica Automotiva) ──▶ OP030 (Estrutura Interna) ──╯──▶ OP040 ──▶ OP050 ──▶ OP060
   *
   * OP020 e OP025 correm em paralelo após OP010.
   * OP030 inicia após OP025 (OP020 ainda pode estar em andamento).
   * OP040 é o ponto de sincronização — aguarda OP020 E OP030.
   */
  static readonly PREDECESSORAS: Record<OperacaoRoteiro, OperacaoRoteiro[]> = {
    OP010_VISTORIA_DESMANCHE:  [],
    OP020_SERRALHERIA:         ['OP010_VISTORIA_DESMANCHE'],
    OP025_ELETRICA_AUTOMOTIVA: ['OP010_VISTORIA_DESMANCHE'],
    OP030_INFRAESTRUTURA:      ['OP010_VISTORIA_DESMANCHE'],
    OP040_ACABAMENTO:          ['OP010_VISTORIA_DESMANCHE'],
    OP050_MARCENARIA:          ['OP010_VISTORIA_DESMANCHE'],
    OP060_GATE_LIBERACAO:      [
      'OP010_VISTORIA_DESMANCHE',
      'OP020_SERRALHERIA',
      'OP025_ELETRICA_AUTOMOTIVA',
      'OP030_INFRAESTRUTURA',
      'OP040_ACABAMENTO',
      'OP050_MARCENARIA',
    ],
  };

  /**
   * Sequência topológica para criação das operações.
   * OP025 deve vir antes de OP030 (dependência direta).
   */
  static readonly SEQUENCIA: OperacaoRoteiro[] = [
    'OP010_VISTORIA_DESMANCHE',
    'OP020_SERRALHERIA',
    'OP025_ELETRICA_AUTOMOTIVA',
    'OP030_INFRAESTRUTURA',
    'OP040_ACABAMENTO',
    'OP050_MARCENARIA',
    'OP060_GATE_LIBERACAO',
  ];

  static calcular(nodes: CpmNode[], dataInicio: Date): CpmResult[] {
    const esMap = new Map<OperacaoRoteiro, Date>();
    const efMap = new Map<OperacaoRoteiro, Date>();

    // Forward Pass
    for (const node of nodes) {
      let es = new Date(dataInicio);
      for (const pred of node.predecessoras) {
        const predEf = efMap.get(pred);
        if (predEf && predEf > es) es = new Date(predEf);
      }
      const ef = CpmEngine.addDias(es, node.duracaoDias);
      esMap.set(node.operacao, es);
      efMap.set(node.operacao, ef);
    }

    // Data de conclusão do projeto = max EF
    const dataFim = new Date(Math.max(...Array.from(efMap.values()).map((d) => d.getTime())));

    const lsMap = new Map<OperacaoRoteiro, Date>();
    const lfMap = new Map<OperacaoRoteiro, Date>();

    // Backward Pass
    for (const node of [...nodes].reverse()) {
      const successors = nodes.filter((n) => n.predecessoras.includes(node.operacao));
      let lf = new Date(dataFim);
      if (successors.length > 0) {
        lf = new Date(Math.min(...successors.map((s) => lsMap.get(s.operacao)!.getTime())));
      }
      const ls = CpmEngine.addDias(lf, -node.duracaoDias);
      lfMap.set(node.operacao, lf);
      lsMap.set(node.operacao, ls);
    }

    return nodes.map((node) => {
      const ef = efMap.get(node.operacao)!;
      const lf = lfMap.get(node.operacao)!;
      const folgaDias = Math.round((lf.getTime() - ef.getTime()) / 86_400_000);
      return {
        operacao: node.operacao,
        esDate: esMap.get(node.operacao)!,
        efDate: ef,
        lsDate: lsMap.get(node.operacao)!,
        lfDate: lf,
        folga: folgaDias,
        isCritical: folgaDias <= 0,
      };
    });
  }

  static nodesFromOperacoes(
    operacoes: Array<{ operacao: OperacaoRoteiro; duracaoPrevistaHoras: any }>,
  ): CpmNode[] {
    return operacoes.map((op) => ({
      operacao: op.operacao,
      ordemNumero: CpmEngine.SEQUENCIA.indexOf(op.operacao) + 1,
      duracaoDias: Math.ceil(Number(op.duracaoPrevistaHoras) / 8),
      predecessoras: CpmEngine.PREDECESSORAS[op.operacao],
    }));
  }

  private static addDias(date: Date, dias: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + dias);
    return d;
  }
}
