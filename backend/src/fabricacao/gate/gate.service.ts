import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { OrdemService } from '../ordem/ordem.service';
import { AprovarGateDto } from './dto/aprovar-gate.dto';
import { GATE_CHECKLISTS } from './gate-checklists.constants';
import { CpmEngine } from '../engines/cpm.engine';
import { OperacaoRoteiro, TruckType } from '@prisma/client';

class ConflictException extends BadRequestException {}

@Injectable()
export class GateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly auditLog: AuditLogService,
    private readonly ordemService: OrdemService,
  ) {}

  async getChecklist(ordemId: string, operacao: OperacaoRoteiro) {
    const ordem = await this.prisma.ordemFabricacao.findUnique({ where: { id: ordemId } });
    if (!ordem) throw new NotFoundException('Ordem não encontrada');

    const template = GATE_CHECKLISTS[operacao];
    const itens = template.map((item) => ({
      ...item,
      obrigatorio:
        item.obrigatorio ||
        (item.condicional === 'MULTICOURSE' && ordem.configuracao === TruckType.MULTICOURSE),
    }));

    // Duplo filtro: ordemId + operacao (garante que nunca retorna registro de outro gate)
    const registroExistente = await this.prisma.gateQualidade.findFirst({
      where: { ordemId, operacao },
    });

    return { itens, registroExistente };
  }

  async aprovarGate(ordemId: string, operacao: OperacaoRoteiro, dto: AprovarGateDto, userId: string) {
    const ordem = await this.prisma.ordemFabricacao.findUnique({
      where: { id: ordemId },
      include: { operacoes: true },
    });
    if (!ordem) throw new NotFoundException('Ordem não encontrada');

    const operacaoRecord = ordem.operacoes.find((op) => op.operacao === operacao);
    if (!operacaoRecord) throw new NotFoundException('Operação não encontrada');
    if (operacaoRecord.status === 'CONCLUIDA') throw new ConflictException('Gate já aprovado');

    // Valida itens obrigatórios
    const itensFront = dto.itens ?? [];
    if (itensFront.length > 0) {
      const template = GATE_CHECKLISTS[operacao];
      const obrigatorios = template.filter(
        (i) =>
          i.obrigatorio ||
          (i.condicional === 'MULTICOURSE' && ordem.configuracao === TruckType.MULTICOURSE),
      );
      const faltando = obrigatorios.filter(
        (req) => !itensFront.find((i) => i.item === req.item && i.ok),
      );
      if (faltando.length > 0) {
        throw new BadRequestException(
          `Itens obrigatórios pendentes: ${faltando.map((f) => f.label).join(', ')}`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const fotos = dto.fotosUrls ?? [];

      // Upsert GateQualidade
      await tx.gateQualidade.upsert({
        where: { operacaoId: operacaoRecord.id },
        update: {
          itensChecklist: dto.itens as any,
          fotosUrls: fotos,
          medicoes: dto.medicoes ?? {},
          aprovado: true,
          aprovadoPor: userId,
          aprovadoEm: new Date(),
          observacaoFinal: dto.observacao ?? null,
        },
        create: {
          ordemId,
          operacaoId: operacaoRecord.id,
          operacao,
          itensChecklist: dto.itens as any,
          fotosUrls: fotos,
          medicoes: dto.medicoes ?? {},
          aprovado: true,
          aprovadoPor: userId,
          aprovadoEm: new Date(),
          observacaoFinal: dto.observacao ?? null,
        },
      });

      // Marca operação como CONCLUIDA
      await tx.operacaoProducao.update({
        where: { id: operacaoRecord.id },
        data: {
          status: 'CONCLUIDA',
          gateAprovado: true,
          gateAprovadoPor: userId,
          gateAprovadoEm: new Date(),
          dataConclusaoReal: new Date(),
          percentualConcluido: 100,
        },
      });

      // ── Libera próximas operações baseado no GRAFO de dependências ──────────
      // Substitui a lógica linear (idx+1) por verificação de predecessoras
      const operacoesAtualizadas = await tx.operacaoProducao.findMany({
        where: { ordemId },
      });

      // Conjunto de operações concluídas (inclui a recém-aprovada)
      const concluidas = new Set<string>(
        operacoesAtualizadas
          .filter((op) => op.status === 'CONCLUIDA' || op.id === operacaoRecord.id)
          .map((op) => op.operacao as string),
      );

      const operacoesLiberadas: OperacaoRoteiro[] = [];

      for (const [op, predecessoras] of Object.entries(CpmEngine.PREDECESSORAS)) {
        const opRecord = operacoesAtualizadas.find((o) => o.operacao === op);
        // Só libera operações que ainda estão AGUARDANDO
        if (!opRecord || opRecord.status !== 'AGUARDANDO') continue;
        // Verifica se TODAS as predecessoras estão concluídas
        const todasPredConc = predecessoras.every((pred) => concluidas.has(pred));
        if (todasPredConc) {
          await tx.operacaoProducao.update({
            where: { id: opRecord.id },
            data: { status: 'LIBERADA', dataInicioReal: new Date() },
          });
          operacoesLiberadas.push(op as OperacaoRoteiro);
        }
      }

      // Atualiza status da OF
      const isUltimoGate = operacao === 'OP060_GATE_LIBERACAO';
      const statusNovo: any = isUltimoGate ? 'CONCLUIDA' : 'EM_PRODUCAO';

      await tx.ordemFabricacao.update({
        where: { id: ordemId },
        data: {
          status: statusNovo,
          ...(statusNovo === 'CONCLUIDA' && { dataConclusaoReal: new Date() }),
        },
      });

      return {
        operacaoConcluida: operacao,
        operacoesLiberadas,
        isUltimoGate,
      };

    }).then(async (result) => {
      // ── Pós-transaction: operações com conexões próprias do Prisma ──────────
      // Notificação (não-crítica)
      try {
        this.notificationsGateway.notifyAdmins('fabricacao_gate_aprovado', {
          ordemId,
          codigo: ordem.codigo,
          operacao,
          operacoesLiberadas: result.operacoesLiberadas,
        });
      } catch (_) { /* ignorado */ }

      // Audit log (usa this.prisma, não pode ficar dentro de $transaction)
      try {
        await this.auditLog.log({
          userId,
          action: 'GATE_APROVADO',
          tableName: 'GateQualidade',
          recordId: operacaoRecord.id,
          newData: { ordemId, operacao, operacoesLiberadas: result.operacoesLiberadas },
        });
      } catch (e: any) { console.warn('[Gate] auditLog falhou (ignorado):', e?.message); }

      // OP060: liberar carreta (usa this.prisma, fora da tx)
      if (result.isUltimoGate) {
        try { await this._liberarCarretaParaOperacao(ordemId, ordem, userId); }
        catch (e: any) { console.warn('[Gate] Liberação de carreta falhou (não bloqueia aprovação):', e?.message); }
      }

      // EVM + CPM
      try { await this.ordemService.gerarSnapshotEvm(ordemId); }
      catch (e: any) { console.warn('[Gate] EVM snapshot falhou (ignorado):', e?.message); }
      try { await this.ordemService.recalcularCpm(ordemId); }
      catch (e: any) { console.warn('[Gate] CPM recálculo falhou (ignorado):', e?.message); }

      return {
        operacaoConcluida: result.operacaoConcluida,
        operacoesLiberadas: result.operacoesLiberadas,
      };
    });
  }

  private async _liberarCarretaParaOperacao(ordemId: string, ordem: any, userId: string) {
    let truck: any;

    if (ordem.truckId) {
      truck = await this.prisma.truck.update({
        where: { id: ordem.truckId },
        data: { status: 'AVAILABLE', type: ordem.configuracao },
      });
    } else {
      // Verifica pelo identifier para evitar duplicidade
      const existing = await this.prisma.truck.findFirst({
        where: { identifier: `BÁU-${ordem.codigo}` },
      });

      if (existing) {
        truck = await this.prisma.truck.update({
          where: { id: existing.id },
          data: { status: 'AVAILABLE', type: ordem.configuracao },
        });
      } else {
        // groupId é obrigatório (NOT NULL): usa o da OF ou busca qualquer grupo existente
        let groupId = ordem.grupoId;
        if (!groupId) {
          const anyGroup = await this.prisma.group.findFirst();
          groupId = anyGroup?.id;
        }
        if (!groupId) throw new Error('Nenhum grupo encontrado para criar o veículo');

        truck = await this.prisma.truck.create({
          data: {
            identifier: `BÁU-${ordem.codigo}`,
            licensePlate: `OF-${ordem.codigo}`,
            type: ordem.configuracao,
            status: 'AVAILABLE',
            groupId,
            state: 'MA',
            capacity: 30,
            modelYear: String(new Date().getFullYear()),
          },
        });
        await this.prisma.ordemFabricacao.update({ where: { id: ordemId }, data: { truckId: truck.id } });
      }
    }

    try {
      this.notificationsGateway.notifyAdmins('fabricacao_producao_liberada', {
        ordemId, codigo: ordem.codigo, truckId: truck.id,
      });
    } catch (_) { /* notificação não-crítica */ }

    try {
      await this.auditLog.log({
        userId,
        action: 'PRODUCAO_LIBERADA',
        tableName: 'OrdemFabricacao',
        recordId: ordemId,
        newData: { truckId: truck.id },
      });
    } catch (_) { /* auditLog não-crítico */ }
  }

  private async _getOperacaoId(ordemId: string, operacao: OperacaoRoteiro) {
    const op = await this.prisma.operacaoProducao.findFirst({ where: { ordemId, operacao } });
    return op?.id ?? '';
  }

  async salvarChecklist(ordemId: string, operacao: OperacaoRoteiro, itens: any[]) {
    const operacaoId = await this._getOperacaoId(ordemId, operacao);

    // ── Calcula progresso proporcional pelo checklist ──────────────────────────
    const safeItens = Array.isArray(itens) ? itens : [];
    const total     = safeItens.length;
    const okCount   = safeItens.filter((i) => i.ok).length;
    const pct       = total > 0 ? Math.round((okCount / total) * 100) : 0;

    // ── Upsert do GateQualidade ─────────────────────────────────────────────
    // operacaoId é NOT NULL @unique — só cria se tiver um ID válido
    if (!operacaoId) {
      console.warn(`[Gate] salvarChecklist: operacaoId não encontrado para ordemId=${ordemId} operacao=${operacao}. Checklist não salvo.`);
      return { ok: false, error: 'Operação não encontrada na OF', percentualConcluido: pct };
    }

    const existing = await this.prisma.gateQualidade.findFirst({ where: { ordemId, operacao } });

    if (existing) {
      await this.prisma.gateQualidade.update({
        where: { id: existing.id },
        data: { itensChecklist: safeItens },
      });
    } else {
      await this.prisma.gateQualidade.create({
        data: {
          ordemId,
          operacaoId,
          operacao,
          itensChecklist: safeItens,
          fotosUrls: [],
          medicoes: {},
          aprovado: false,
          // aprovadoPor é FK nullable → não enviar
        },
      });
    }

    // ── Auto-transição: LIBERADA → EM_ANDAMENTO ao marcar o 1º item ──────────
    try {
      const opRecord = await this.prisma.operacaoProducao.findUnique({ where: { id: operacaoId } });
      if (opRecord) {
        if (okCount > 0 && (opRecord.status === 'LIBERADA' || opRecord.status === 'EM_ANDAMENTO')) {
          await this.prisma.operacaoProducao.update({
            where: { id: operacaoId },
            data: {
              status: 'EM_ANDAMENTO',
              percentualConcluido: Number(pct),
              dataInicioReal: opRecord.dataInicioReal ?? new Date(),
            },
          });
        } else if (okCount === 0 && opRecord.status === 'EM_ANDAMENTO') {
          await this.prisma.operacaoProducao.update({
            where: { id: operacaoId },
            data: { percentualConcluido: 0 },
          });
        }
      }
    } catch (e: any) {
      console.warn('[Gate] Auto-transição EM_ANDAMENTO falhou (ignorado):', e?.message);
    }

    return { ok: true, percentualConcluido: pct };
  }
}
