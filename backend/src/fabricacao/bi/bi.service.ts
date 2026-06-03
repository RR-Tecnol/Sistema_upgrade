import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BiService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [
      total, por_status, custo_total, custos_por_tipo, top_ofs,
      todas_ofs, custos_raw, prestadores_custo,
    ] = await Promise.all([
      this.prisma.ordemFabricacao.count(),

      this.prisma.ordemFabricacao.groupBy({
        by: ['status'],
        _count: { status: true },
      }),

      this.prisma.ordemFabricacao.aggregate({
        _sum: {
          orcamentoTotal: true, custoRealAcumulado: true,
          valorBauComprado: true, valorFreteAquisicao: true,
        },
        _avg: { orcamentoTotal: true, custoRealAcumulado: true },
      }),

      this.prisma.custoOf.groupBy({
        by: ['tipo'],
        _sum: { valor: true },
        _count: { tipo: true },
        _avg: { valor: true },
      }),

      // Top 8 OFs pelo custo real
      this.prisma.ordemFabricacao.findMany({
        take: 8,
        orderBy: { custoRealAcumulado: 'desc' },
        select: {
          codigo: true, descricaoBau: true, status: true, cursoEspecifico: true,
          custoRealAcumulado: true, orcamentoTotal: true,
          valorBauComprado: true, valorFreteAquisicao: true,
          dataInicioBaseline: true, dataConclusaoBaseline: true, dataConclusaoReal: true,
        },
      }),

      // Todas as OFs para scatter e linha do tempo
      this.prisma.ordemFabricacao.findMany({
        orderBy: { dataInicioBaseline: 'asc' },
        select: {
          codigo: true, status: true,
          orcamentoTotal: true, custoRealAcumulado: true,
          valorBauComprado: true, valorFreteAquisicao: true,
          dataInicioBaseline: true, dataConclusaoBaseline: true,
          cursoEspecifico: true,
        },
      }),

      // Custo mensal agrupado por dataVencimento
      this.prisma.custoOf.findMany({
        select: { valor: true, tipo: true, dataVencimento: true, ordemId: true },
        orderBy: { dataVencimento: 'asc' },
      }),

      // Ranking de prestadores por custo total
      this.prisma.custoOf.groupBy({
        by: ['prestadorNome', 'tipoPrestador'],
        where: { prestadorNome: { not: null } },
        _sum: { valor: true },
        _count: { id: true },
        orderBy: { _sum: { valor: 'desc' } },
        take: 10,
      }),
    ]);

    const totalBau   = Number(custo_total._sum.valorBauComprado   ?? 0);
    const totalFrete = Number(custo_total._sum.valorFreteAquisicao ?? 0);
    const orcTotal   = Number(custo_total._sum.orcamentoTotal     ?? 0);
    const custoTotal = Number(custo_total._sum.custoRealAcumulado ?? 0);

    // Tendência mensal de custos
    const meses: Record<string, { mes: string; servicos: number; aquisicao: number; total: number }> = {};
    custos_raw.forEach(c => {
      const d = new Date(c.dataVencimento);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!meses[key]) meses[key] = { mes: label, servicos: 0, aquisicao: 0, total: 0 };
      const val = Number(c.valor);
      if (['BAU_COMPRA', 'FRETE_AQUISICAO'].includes(c.tipo)) meses[key].aquisicao += val;
      else meses[key].servicos += val;
      meses[key].total += val;
    });
    const tendencia_mensal = Object.entries(meses)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    // Scatter: orçamento vs custo real por OF
    const scatter_ofs = todas_ofs.map(o => ({
      codigo: o.codigo,
      status: o.status,
      orcamento: Number(o.orcamentoTotal),
      custo_real: Number(o.custoRealAcumulado),
      aquisicao: Number(o.valorBauComprado ?? 0) + Number(o.valorFreteAquisicao ?? 0),
      cpi: Number(o.orcamentoTotal) > 0 ? Number(o.custoRealAcumulado) / Number(o.orcamentoTotal) : 0,
      margem_pct: Number(o.orcamentoTotal) > 0
        ? ((Number(o.orcamentoTotal) - Number(o.custoRealAcumulado)) / Number(o.orcamentoTotal)) * 100
        : 0,
    }));

    // Estrutura de custo (waterfall)
    const bau_total    = todas_ofs.reduce((s, o) => s + Number(o.valorBauComprado ?? 0), 0);
    const frete_total  = todas_ofs.reduce((s, o) => s + Number(o.valorFreteAquisicao ?? 0), 0);
    const servico_total = custos_por_tipo
      .filter(c => ['SERVICO_DIARIA','SERVICO_PACOTE','MAO_DE_OBRA','PORTEIRA_FECHADA'].includes(c.tipo))
      .reduce((s, c) => s + Number(c._sum.valor ?? 0), 0);
    const material_total = custos_por_tipo
      .filter(c => c.tipo === 'MATERIAL')
      .reduce((s, c) => s + Number(c._sum.valor ?? 0), 0);
    const outros_total = custos_por_tipo
      .filter(c => !['SERVICO_DIARIA','SERVICO_PACOTE','MAO_DE_OBRA','PORTEIRA_FECHADA','MATERIAL','BAU_COMPRA','FRETE_AQUISICAO'].includes(c.tipo))
      .reduce((s, c) => s + Number(c._sum.valor ?? 0), 0);

    const waterfall = [
      { name: 'Compra Baú', value: bau_total, acumulado: bau_total },
      { name: 'Frete', value: frete_total, acumulado: bau_total + frete_total },
      { name: 'Serviços', value: servico_total, acumulado: bau_total + frete_total + servico_total },
      { name: 'Materiais', value: material_total, acumulado: bau_total + frete_total + servico_total + material_total },
      { name: 'Outros', value: outros_total, acumulado: bau_total + frete_total + servico_total + material_total + outros_total },
    ];

    return {
      total,
      por_status: por_status.map(s => ({ status: s.status, count: s._count.status })),
      orcamento_total:   orcTotal,
      custo_real_total:  custoTotal,
      ticket_medio_orca: Number(custo_total._avg.orcamentoTotal ?? 0),
      ticket_medio_real: Number(custo_total._avg.custoRealAcumulado ?? 0),
      aquisicao_bau:     totalBau,
      aquisicao_frete:   totalFrete,
      aquisicao_total:   totalBau + totalFrete,
      margem_global_pct: orcTotal > 0 ? ((orcTotal - custoTotal) / orcTotal) * 100 : 0,
      custos_por_tipo: custos_por_tipo.map(c => ({
        tipo: c.tipo,
        total: Number(c._sum.valor ?? 0),
        count: c._count.tipo,
        media: Number(c._avg.valor ?? 0),
      })),
      top_ofs,
      tendencia_mensal,
      scatter_ofs,
      waterfall,
      prestadores_custo: prestadores_custo.map(p => ({
        nome: p.prestadorNome,
        tipo: p.tipoPrestador,
        total: Number(p._sum.valor ?? 0),
        lancamentos: p._count.id,
      })),
    };
  }
}

