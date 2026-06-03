import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CreateNcDto } from './dto/create-nc.dto';
import { StatusNaoConformidade } from '@prisma/client';

@Injectable()
export class NcService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly auditLog: AuditLogService,
  ) {}

  async registrar(ordemId: string, dto: CreateNcDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.naoConformidade.count({ where: { ordemId } });
      const codigo = `NC-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

      const nc = await tx.naoConformidade.create({
        data: {
          codigo,
          ordemId,
          operacaoId: dto.operacaoId,
          tipo: dto.tipo,
          descricao: dto.descricao,
          bloqueiaProducao: dto.bloqueiaProducao,
          impactoFinanceiro: dto.impactoFinanceiro,
          impactoDias: dto.impactoDias,
          acaoCorretiva: dto.acaoCorretiva,
          registradoPor: userId,
        },
      });

      if (dto.bloqueiaProducao) {
        // ANDON ON — para a linha de produção
        await tx.ordemFabricacao.update({
          where: { id: ordemId },
          data: { andoneAtivo: true, status: 'BLOQUEADA' },
        });
        await tx.operacaoProducao.updateMany({
          where: { ordemId, status: 'EM_ANDAMENTO' },
          data: { status: 'BLOQUEADA' },
        });
        this.notificationsGateway.notifyAdmins('fabricacao_andon_ativo', {
          ordemId, ncCodigo: codigo, tipo: nc.tipo, descricao: nc.descricao,
        });
      }

      this.notificationsGateway.notifyAdmins('fabricacao_nc_registrada', {
        ordemId, ncCodigo: codigo, bloqueiaProducao: dto.bloqueiaProducao,
      });

      await this.auditLog.log({
        userId, action: 'NC_REGISTRADA', tableName: 'NaoConformidade', recordId: nc.id,
        newData: { codigo, tipo: dto.tipo, bloqueiaProducao: dto.bloqueiaProducao },
      });

      return nc;
    });
  }

  async resolver(ordemId: string, ncId: string, resolucao: string, status: StatusNaoConformidade, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const nc = await tx.naoConformidade.update({
        where: { id: ncId },
        data: { status, resolucao, resolvidoPor: userId },
      });

      // Verifica se ainda há NCs abertas bloqueantes
      const ncsAbertas = await tx.naoConformidade.count({
        where: { ordemId, bloqueiaProducao: true, status: { in: ['ABERTA', 'EM_TRATATIVA'] } },
      });

      if (ncsAbertas === 0) {
        // ANDON OFF — libera a linha
        await tx.ordemFabricacao.update({ where: { id: ordemId }, data: { andoneAtivo: false, status: 'EM_PRODUCAO' } });
        await tx.operacaoProducao.updateMany({ where: { ordemId, status: 'BLOQUEADA' }, data: { status: 'EM_ANDAMENTO' } });
        this.notificationsGateway.notifyAdmins('fabricacao_andon_resolvido', { ordemId });
      }

      return nc;
    });
  }
}
