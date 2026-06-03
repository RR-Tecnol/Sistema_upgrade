import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdemService } from '../ordem/ordem.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CreateApontamentoDto } from './dto/create-apontamento.dto';
import { parseLocalDate } from '../../common/date.util';

@Injectable()
export class ApontamentoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordemService: OrdemService,
    private readonly auditLog: AuditLogService,
  ) {}

  async registrar(ordemId: string, dto: CreateApontamentoDto, userId: string) {
    try {
      return await this._registrarInterno(ordemId, dto, userId);
    } catch (e: any) {
      console.error('[APONTAMENTO 500]', e);
      throw new HttpException(
        { message: e?.message ?? 'Erro interno', detail: e?.code ?? null, meta: e?.meta ?? null },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async _registrarInterno(ordemId: string, dto: CreateApontamentoDto, userId: string) {
    // Dados financeiros coletados dentro da tx para gerar FORA (evita abort cascade)
    const pendingFinancial: Array<{
      ordemCodigo: string;
      nome: string;
      valor: number;
      data: string;
    }> = [];

    // Rastreia materiais consumidos para auditoria
    const materiaisAuditoria: Array<{ nome: string; quantidade: number; origem: string; stockItemId?: string; insumoId?: string }> = [];

    // ── TRANSAÇÃO PRINCIPAL: apontamento + débito de estoque ─────────────────
    const apontamento = await this.prisma.$transaction(async (tx) => {
      // PRÉ-PROCESSAMENTO: normaliza insumoId → stockItemId para itens do estoque central
      // Isso garante que o JSON gravado em materiaisConsumidos tenha o campo certo
      const materiaisNormalizados: Array<{ insumoId?: string; stockItemId?: string; quantidade: number }> = [];
      for (const mat of (dto.materiaisConsumidos ?? [])) {
        if (mat.insumoId && !mat.stockItemId) {
          const existe = await tx.insumoFabricacao.findUnique({ where: { id: mat.insumoId }, select: { id: true } });
          if (!existe) {
            // insumoId é na realidade um StockItem ID — normaliza
            materiaisNormalizados.push({ stockItemId: mat.insumoId, quantidade: mat.quantidade });
            continue;
          }
        }
        materiaisNormalizados.push(mat);
      }

      // 1. Cria o apontamento com os materiais JÁ normalizados
      const ap = await tx.apontamentoDiario.create({
        data: {
          ordemId,
          operacaoId: dto.operacaoId,
          funcionarioId: dto.funcionarioId,
          data: parseLocalDate(dto.data),
          horasTrabalhadas: dto.horasTrabalhadas,
          percentualAvanco: dto.percentualAvanco,
          descricaoAtividade: dto.descricaoAtividade,
          materiaisConsumidos: materiaisNormalizados,  // ← dados normalizados
          fotoUrls: dto.fotoUrls ?? [],
          observacoes: dto.observacoes,
        },
      });

      // 2. Atualiza percentual da operação (soma acumulada — máximo 100)
      const totalAvanco = await tx.apontamentoDiario.aggregate({
        where: { operacaoId: dto.operacaoId },
        _sum: { percentualAvanco: true },
      });
      const pct = Math.min(Number(totalAvanco._sum.percentualAvanco ?? 0), 100);
      await tx.operacaoProducao.update({
        where: { id: dto.operacaoId },
        data: {
          percentualConcluido: pct,
          ...(pct === 100 && { status: 'GATE_PENDENTE' }),
        },
      });

      // 3. Processa materiais consumidos
      if (dto.materiaisConsumidos?.length) {
        const ordem = await tx.ordemFabricacao.findUnique({ where: { id: ordemId } });

        // Busca nomes para o histórico
        let nomeFunc = 'N/A';
        let nomeOp   = dto.operacaoId;
        const func = await tx.funcionarioProducao
          .findUnique({ where: { id: dto.funcionarioId }, select: { nome: true } })
          .catch(() => null);
        if (func) nomeFunc = func.nome;
        const op = await tx.operacaoProducao
          .findUnique({ where: { id: dto.operacaoId }, select: { operacao: true } })
          .catch(() => null);
        if (op) nomeOp = String(op.operacao);

        const dataFmt = parseLocalDate(dto.data).toLocaleDateString('pt-BR');

        for (const mat of materiaisNormalizados) {
          // ── Caso A: catálogo próprio de fabricação (InsumoFabricacao) ──────
          if (mat.insumoId) {
            const insumo = await tx.insumoFabricacao.findUnique({ where: { id: mat.insumoId } });
            // Pré-normalizado: se chegou com insumoId é garantidamente um InsumoFabricacao
            if (insumo) {
              const precoUnit  = Number(insumo.precoUnitario);
              const valorTotal = precoUnit * mat.quantidade;

              await tx.movimentoInsumo.create({
                data: {
                  insumoId: mat.insumoId, ordemId, tipo: 'SAIDA',
                  quantidade: mat.quantidade, precoUnitario: precoUnit, valorTotal,
                  registradoPor: userId,
                  observacoes: `Apontamento OF ${ordem?.codigo ?? ordemId} | Op: ${nomeOp} | Func: ${nomeFunc} | ${dataFmt}`,
                },
              });
              await tx.insumoFabricacao.update({
                where: { id: mat.insumoId },
                data: { quantidadeAtual: { decrement: mat.quantidade } },
              });
              await tx.ordemFabricacaoBomItem.updateMany({
                where: { ordemId, insumoId: mat.insumoId },
                data: { quantidadeConsumida: { increment: mat.quantidade } },
              });
              if (valorTotal > 0 && ordem) {
                pendingFinancial.push({ ordemCodigo: ordem.codigo, nome: insumo.nome, valor: valorTotal, data: dto.data });
              }
              materiaisAuditoria.push({ nome: insumo.nome, quantidade: mat.quantidade, origem: 'catalogo_fabricacao', insumoId: mat.insumoId });
            }
          }

          // ── Caso B: estoque central (StockItem categoria MATERIAL_FABRICACAO) ──
          if (mat.stockItemId) {
            const stockItem = await tx.stockItem.findUnique({ where: { id: mat.stockItemId } });
            if (!stockItem) {
              console.error(`[APONTAMENTO] StockItem não encontrado: ${mat.stockItemId}`);
              continue;
            }

            const precoUnit  = Number(stockItem.precoUnitario ?? 0);
            const valorTotal = precoUnit * mat.quantidade;

            const obsDetalhada =
              `[FABRICAÇÃO] OF ${ordem?.codigo ?? ordemId} | Operação: ${nomeOp} | Funcionário: ${nomeFunc} | ` +
              `Data: ${dataFmt} | Qtd: ${mat.quantidade} ${stockItem.unidade} | ` +
              `Atividade: ${(dto.descricaoAtividade ?? '').substring(0, 80)}`;

            // Registro de auditoria no histórico de estoque (AJUSTE = consumo da central sem truck)
            await tx.stockMovement.create({
              data: {
                type: 'AJUSTE',
                stockItemId: mat.stockItemId,
                quantidade: -mat.quantidade,
                registeredBy: userId,
                observacao: obsDetalhada,
              },
            });
            await tx.stockItem.update({
              where: { id: mat.stockItemId },
              data: { quantidadeAtual: { decrement: mat.quantidade } },
            });

            if (valorTotal > 0 && ordem) {
              pendingFinancial.push({ ordemCodigo: ordem.codigo, nome: stockItem.nome, valor: valorTotal, data: dto.data });
            }
            materiaisAuditoria.push({ nome: stockItem.nome, quantidade: mat.quantidade, origem: 'estoque_central', stockItemId: mat.stockItemId });
          }
        }
      }

      // 4. Recalcula EV acumulado (EVM)
      const operacoes  = await tx.operacaoProducao.findMany({ where: { ordemId } });
      const ordemAtual = await tx.ordemFabricacao.findUnique({ where: { id: ordemId } });
      if (ordemAtual) {
        const ev = operacoes.reduce(
          (acc, op) => acc + (Number(op.pesoEvm) / 100) * op.percentualConcluido * Number(ordemAtual.orcamentoTotal) / 100,
          0,
        );
        await tx.ordemFabricacao.update({ where: { id: ordemId }, data: { valorAgregadoTotal: ev } });
      }

      return ap;
    });

    // ── PÓS-TRANSAÇÃO: registros financeiros e auditoria ─────────────────────

    // Registros financeiros (CustoOf + ContaPagar)
    for (const fin of pendingFinancial) {
      try {
        await this._gerarCustoEContaPagar(this.prisma, ordemId, fin.ordemCodigo, fin.nome, fin.valor, fin.data);
      } catch (e) {
        console.error(`[APONTAMENTO] Falha ao gerar registro financeiro para "${fin.nome}":`, e);
      }
    }

    // Recalcula custo acumulado
    if (pendingFinancial.length > 0) {
      try {
        const totalCustos = await this.prisma.custoOf.aggregate({ where: { ordemId }, _sum: { valor: true } });
        await this.prisma.ordemFabricacao.update({
          where: { id: ordemId },
          data: { custoRealAcumulado: Number(totalCustos._sum.valor ?? 0) },
        });
      } catch (e) {
        console.error('[APONTAMENTO] Erro ao recalcular custoRealAcumulado:', e);
      }
    }

    // ── Auditoria: registra no Histórico de Atividades do Sistema ─────────────
    const ordem = await this.prisma.ordemFabricacao.findUnique({
      where: { id: ordemId },
      select: { codigo: true },
    }).catch(() => null);

    // Apontamento registrado
    await this.auditLog.log({
      userId,
      action: 'APONTAMENTO_REGISTRADO',
      tableName: 'apontamentos_diarios',
      recordId: apontamento.id,
      newData: {
        ordemId,
        ordemCodigo: ordem?.codigo,
        operacaoId: dto.operacaoId,
        funcionarioId: dto.funcionarioId,
        data: dto.data,
        horasTrabalhadas: dto.horasTrabalhadas,
        percentualAvanco: dto.percentualAvanco,
        descricaoAtividade: dto.descricaoAtividade.substring(0, 120),
        totalMateriais: materiaisAuditoria.length,
      },
    });

    // Auditoria por material consumido
    for (const mat of materiaisAuditoria) {
      await this.auditLog.log({
        userId,
        action: 'MATERIAL_CONSUMIDO_FABRICACAO',
        tableName: mat.origem === 'estoque_central' ? 'stock_items' : 'insumos_fabricacao',
        recordId: mat.stockItemId ?? mat.insumoId,
        newData: {
          ordemId,
          ordemCodigo: ordem?.codigo,
          apontamentoId: apontamento.id,
          material: mat.nome,
          quantidade: mat.quantidade,
          origem: mat.origem,
          stockItemId: mat.stockItemId,
          insumoId: mat.insumoId,
        },
      });
    }

    return apontamento;
  }

  /** Cria CustoOf + ContaPagar vinculados para um material consumido */
  private async _gerarCustoEContaPagar(
    prisma: PrismaService,
    ordemId: string,
    codigoOrdem: string,
    nomeItem: string,
    valorTotal: number,
    data: string,
  ) {
    const descricao = `Material: ${nomeItem}`;
    const custo = await prisma.custoOf.create({
      data: {
        ordemId,
        tipo: 'MATERIAL' as any,
        descricao,
        valor: valorTotal,
        dataVencimento: parseLocalDate(data),
      },
    });
    const contaPagar = await prisma.contaPagar.create({
      data: {
        tipo_conta: 'fabricacao_carreta',
        descricao: `[${codigoOrdem}] ${descricao}`,
        valor: valorTotal,
        data_vencimento: parseLocalDate(data),
        status: 'pendente',
        origem: 'FABRICACAO',
        producaoId: ordemId,
        active: true,
      },
    });
    await prisma.custoOf.update({
      where: { id: custo.id },
      data: { contaPagarId: contaPagar.id },
    });
  }
}
