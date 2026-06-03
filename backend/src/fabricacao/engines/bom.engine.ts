import { OperacaoRoteiro } from '@prisma/client';

export class BomEngine {
  /** Gera os itens do BOM de uma ordem a partir de um template */
  static gerarItensOrdem(
    templateItens: Array<{
      insumoId: string;
      operacao: string;
      quantidadePrevista: any;
      unidade: string;
      isPhantom: boolean;
      observacoes: string | null;
      insumo: { precoUnitario: any };
    }>,
  ) {
    return templateItens.map((item) => ({
      insumoId: item.insumoId,
      operacao: item.operacao as OperacaoRoteiro,
      quantidadePrevista: Number(item.quantidadePrevista),
      quantidadeConsumida: 0,
      unidade: item.unidade,
      custoUnitarioPrev: Number(item.insumo.precoUnitario),
      isPhantom: item.isPhantom,
      observacoes: item.observacoes,
    }));
  }
}
