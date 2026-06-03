import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InsumosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    // 1. Insumos do catálogo próprio de fabricação
    const proprios = await this.prisma.insumoFabricacao.findMany({
      where: { active: true },
      orderBy: { nome: 'asc' },
    });

    // 2. Itens do estoque central com categoria MATERIAL_FABRICACAO
    const central = await this.prisma.stockItem.findMany({
      where: { categoria: 'MATERIAL_FABRICACAO', active: true },
      orderBy: { nome: 'asc' },
    });

    // 3. IDs dos itens próprios para evitar duplicatas (caso haja espelhamento)
    const propriosIds = new Set(proprios.map((i) => i.id));

    // 4. Formata os itens centrais no mesmo shape de InsumoFabricacao
    const centralFormatados = central
      .filter((s) => !propriosIds.has(s.id))
      .map((s) => ({
        id: s.id,
        nome: s.nome,
        codigoInterno: s.codigoInterno ?? null,
        descricao: s.observacoes ?? null,
        unidadeMedida: s.unidade,
        unidade: s.unidade,
        quantidadeAtual: Number(s.quantidadeAtual ?? 0),
        quantidadeMinima: Number(s.quantidadeMinima ?? 0),
        precoUnitario: Number(s.precoUnitario ?? 0),
        active: s.active,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        // Metadados extras para o frontend saber a origem
        _source: 'estoque',
        _stockItemId: s.id,
      }));

    // 5. Marca os próprios com _source para consistência
    const propriosFormatados = proprios.map((i) => ({
      ...i,
      _source: 'fabricacao',
      _stockItemId: null,
    }));

    return [...propriosFormatados, ...centralFormatados];
  }
}
