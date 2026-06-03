import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parseLocalDate, todayLocalDate } from '../../common/date.util';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CpmEngine } from '../engines/cpm.engine';
import { EvmEngine } from '../engines/evm.engine';
import { BomEngine } from '../engines/bom.engine';
import { CreateOrdemDto } from './dto/create-ordem.dto';
import { OperacaoRoteiro, StatusOrdemFabricacao } from '@prisma/client';
import { Cron } from '@nestjs/schedule';
import * as QRCode from 'qrcode';

@Injectable()
export class OrdemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly auditLog: AuditLogService,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async findAll(filters: {
    status?: StatusOrdemFabricacao;
    grupoId?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, grupoId, page = 1, limit = 20 } = filters;
    const where: any = { ...(status && { status }), ...(grupoId && { grupoId }) };
    const [data, total] = await Promise.all([
      this.prisma.ordemFabricacao.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          grupo: true,
          responsavel: { select: { id: true, name: true } },
          truck: { select: { id: true, identifier: true, licensePlate: true } },
          operacoes: true,
          _count: { select: { naoConformidades: true, apontamentos: true } },
        },
      }),
      this.prisma.ordemFabricacao.count({ where }),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const ordem = await this.prisma.ordemFabricacao.findUnique({
      where: { id },
      include: {
        grupo: true,
        responsavel: { select: { id: true, name: true, email: true } },
        truck: true,
        bomTemplate: { include: { itens: true } },
        bomItens: { include: { insumo: true } },
        operacoes: { orderBy: { ordemNumero: 'asc' } },
        gateRegistros: true,
        naoConformidades: { orderBy: { createdAt: 'desc' } },
        custos: { include: { fornecedor: true, contaPagar: true } },
        fornecedores: true,
        funcionarios: { include: { funcionario: true } },
        snapshotsEvm: { orderBy: { data: 'asc' } },
        _count: { select: { apontamentos: true, documentos: true } },
      },
    });
    if (!ordem) throw new NotFoundException('Ordem de fabricação não encontrada');
    return ordem;
  }

  async create(dto: CreateOrdemDto, userId: string) {
    // Gera código único: OF-001-2026
    const count = await this.prisma.ordemFabricacao.count();
    const codigo = `OF-${String(count + 1).padStart(3, '0')}-${new Date().getFullYear()}`;

    // Gera QR Code
    const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:3010'}/apontamento/${codigo}`;
    const qrCodeUrl = await QRCode.toDataURL(qrUrl).catch(() => null);

    return this.prisma.$transaction(async (tx) => {
      const ordem = await tx.ordemFabricacao.create({
        data: {
          codigo,
          qrCodeUrl,
          descricaoBau: dto.descricaoBau,
          configuracao: dto.configuracao,
          tipoContratacao: dto.tipoContratacao,
          bomTemplateId: dto.bomTemplateId,
          dataEntradaGalpao: new Date(dto.dataEntradaGalpao),
          dataInicioBaseline: new Date(dto.dataInicioBaseline),
          dataConclusaoBaseline: new Date(dto.dataConclusaoBaseline),
          orcamentoTotal: dto.orcamentoTotal,
          grupoId: dto.grupoId,
          responsavelId: userId,
          alertaCustoPercent: dto.alertaCustoPercent ?? 110,
          observacoes: dto.observacoes,
          // ── Custo de Aquisição (opcionais) ──────────────────────────────
          ...(dto.cursoEspecifico     && { cursoEspecifico:     dto.cursoEspecifico }),
          ...(dto.valorBauComprado    && { valorBauComprado:    dto.valorBauComprado }),
          ...(dto.valorBauDescricao   && { valorBauDescricao:   dto.valorBauDescricao }),
          ...(dto.valorFreteAquisicao && { valorFreteAquisicao: dto.valorFreteAquisicao }),
          ...(dto.valorFreteDescricao && { valorFreteDescricao: dto.valorFreteDescricao }),
        },
      });

      // Cria as 7 operações do roteiro automaticamente
      await this._criarRoteiro(tx, ordem.id, new Date(dto.dataInicioBaseline));

      // Popula BOM do template se fornecido
      if (dto.bomTemplateId) {
        await this._popularBom(tx, ordem.id, dto.bomTemplateId);
      }

      await this.auditLog.log({
        userId,
        action: 'ORDEM_FABRICACAO_CRIADA',
        tableName: 'OrdemFabricacao',
        recordId: ordem.id,
        newData: { codigo, configuracao: dto.configuracao },
      });

      this.notificationsGateway.notifyAdmins('fabricacao_ordem_criada', {
        ordemId: ordem.id,
        codigo,
        configuracao: dto.configuracao,
      });

      return ordem;
    });
  }

  private async _criarRoteiro(tx: any, ordemId: string, dataInicio: Date) {
    const dataBaseNodes = CpmEngine.SEQUENCIA.map((op, idx) => ({
      operacao: op,
      ordemNumero: idx + 1,
      duracaoDias: CpmEngine.DURACAO_PADRAO[op],
      predecessoras: CpmEngine.PREDECESSORAS[op],
    }));

    const cpmResults = CpmEngine.calcular(dataBaseNodes, dataInicio);

    for (const result of cpmResults) {
      await tx.operacaoProducao.create({
        data: {
          ordemId,
          operacao: result.operacao,
          ordemNumero: CpmEngine.SEQUENCIA.indexOf(result.operacao) + 1,
          descricao: result.operacao.replace(/_/g, ' '),
          duracaoPrevistaHoras: CpmEngine.DURACAO_PADRAO[result.operacao] * 8,
          predecessoras: [],
          esDate: result.esDate,
          efDate: result.efDate,
          lsDate: result.lsDate,
          lfDate: result.lfDate,
          folga: result.folga,
          isCritical: result.isCritical,
          pesoEvm: CpmEngine.PESO_EVM[result.operacao],
          // Apenas OP010 começa LIBERADA; demais aguardam predecessoras
          status: result.operacao === 'OP010_VISTORIA_DESMANCHE' ? 'LIBERADA' : 'AGUARDANDO',
        },
      });
    }
  }

  private async _popularBom(tx: any, ordemId: string, templateId: string) {
    const template = await tx.bomTemplate.findUnique({
      where: { id: templateId },
      include: { itens: { include: { insumo: true } } },
    });
    if (!template) return;

    const itens = BomEngine.gerarItensOrdem(template.itens);
    for (const item of itens) {
      await tx.ordemFabricacaoBomItem.create({ data: { ordemId, ...item } });
    }
  }

  // ── CPM RECALCULO ─────────────────────────────────────────────────────────

  async recalcularCpm(ordemId: string) {
    const operacoes = await this.prisma.operacaoProducao.findMany({
      where: { ordemId },
      orderBy: { ordemNumero: 'asc' },
    });
    const ordem = await this.prisma.ordemFabricacao.findUnique({ where: { id: ordemId } });
    if (!ordem) return;

    const nodes = CpmEngine.nodesFromOperacoes(operacoes);
    const results = CpmEngine.calcular(nodes, ordem.dataInicioReal ?? ordem.dataInicioBaseline);

    for (const result of results) {
      await this.prisma.operacaoProducao.updateMany({
        where: { ordemId, operacao: result.operacao },
        data: {
          esDate: result.esDate,
          efDate: result.efDate,
          lsDate: result.lsDate,
          lfDate: result.lfDate,
          folga: result.folga,
          isCritical: result.isCritical,
        },
      });
    }
  }

  // ── EVM ───────────────────────────────────────────────────────────────────

  async calcularEvmAtual(ordemId: string) {
    const ordem = await this.prisma.ordemFabricacao.findUnique({
      where: { id: ordemId },
      include: { operacoes: true },
    });
    if (!ordem) throw new NotFoundException('Ordem não encontrada');

    const bac = Number(ordem.orcamentoTotal);
    const ac  = Number(ordem.custoRealAcumulado);
    const pv  = EvmEngine.calcularPv(bac, ordem.dataInicioBaseline, ordem.dataConclusaoBaseline, new Date());
    const ev  = EvmEngine.calcularEv(bac, ordem.operacoes);

    return EvmEngine.calcular({ bac, ev, pv, ac });
  }

  async gerarSnapshotEvm(ordemId: string) {
    const metrics = await this.calcularEvmAtual(ordemId);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    await this.prisma.snapshotEvm.upsert({
      where: { ordemId_data: { ordemId, data: hoje } },
      update: {
        pv: metrics.pv, ev: metrics.ev, ac: metrics.ac,
        cpi: metrics.cpi, spi: metrics.spi, eac: metrics.eac,
        etc: metrics.etc, vac: metrics.vac, tcpi: metrics.tcpi,
        percentualFisico: metrics.percentualFisico,
      },
      create: {
        ordemId, data: hoje,
        pv: metrics.pv, ev: metrics.ev, ac: metrics.ac,
        cpi: metrics.cpi, spi: metrics.spi, eac: metrics.eac,
        etc: metrics.etc, vac: metrics.vac, tcpi: metrics.tcpi,
        percentualFisico: metrics.percentualFisico,
      },
    });

    return metrics;
  }

  // Cron diário às 23h — snapshot EVM + alertas
  @Cron('0 23 * * *')
  async snapshotEvmDiario() {
    const ordens = await this.prisma.ordemFabricacao.findMany({
      where: { status: { in: ['EM_PRODUCAO', 'BLOQUEADA', 'INSPECAO_FINAL'] } },
    });

    for (const ordem of ordens) {
      const metrics = await this.gerarSnapshotEvm(ordem.id);
      if (metrics.cpi < 0.85 || metrics.spi < 0.85) {
        this.notificationsGateway.notifyAdmins('fabricacao_evm_alerta', {
          ordemId: ordem.id,
          codigo: ordem.codigo,
          cpi: metrics.cpi,
          spi: metrics.spi,
          eac: metrics.eac,
        });
      }
    }
  }

  // ── CUSTO → CONTAPAGAR (FABRICACAO) ──────────────────────────────────────

  async registrarCusto(
    ordemId: string,
    dto: {
      tipo: string;
      oficio?: string;
      descricao: string;
      valor: number;
      operacao?: string;
      dataVencimento: string;
      fornecedorId?: string;
      // Prestador
      tipoPrestador?: string;
      prestadorNome?: string;
      prestadorCpf?: string;
      prestadorCnpj?: string;
      prestadorTelefone?: string;
      prestadorContato?: string;
      // Diária — calendário
      diasTrabalhados?: string[];
      valorDiaria?: number;
    },
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Calcula campos de diária se informado
      const numeroDiarias = dto.diasTrabalhados?.length ?? null;
      const diasParaSalvar = dto.diasTrabalhados?.map(d => new Date(d)) ?? [];

      const custo = await tx.custoOf.create({
        data: {
          ordemId,
          fornecedorId: dto.fornecedorId,
          tipo: dto.tipo as any,
          oficio: dto.oficio,
          descricao: dto.descricao,
          valor: dto.valor,
          ...(dto.operacao ? { operacao: dto.operacao as any } : {}),
          dataVencimento: parseLocalDate(dto.dataVencimento),
          // Prestador
          ...(dto.tipoPrestador  ? { tipoPrestador:     dto.tipoPrestador as any } : {}),
          ...(dto.prestadorNome  ? { prestadorNome:     dto.prestadorNome  } : {}),
          ...(dto.prestadorCpf   ? { prestadorCpf:      dto.prestadorCpf   } : {}),
          ...(dto.prestadorCnpj  ? { prestadorCnpj:     dto.prestadorCnpj  } : {}),
          ...(dto.prestadorTelefone ? { prestadorTelefone: dto.prestadorTelefone } : {}),
          ...(dto.prestadorContato  ? { prestadorContato:  dto.prestadorContato  } : {}),
          // Diária
          ...(diasParaSalvar.length > 0 ? { diasTrabalhados: diasParaSalvar } : {}),
          ...(numeroDiarias !== null ? { numeroDiarias } : {}),
          ...(dto.valorDiaria !== undefined ? { valorDiaria: dto.valorDiaria } : {}),
        },
      });

      // Registra prestador como FuncionarioProducao vinculado à OF (se tiver nome)
      if (dto.prestadorNome) {
        const nomePrestador = dto.prestadorNome.trim();
        const funcaoLabel   = dto.oficio ?? 'Prestador de Serviço';

        // Busca ou cria o FuncionarioProducao pelo documento (CPF/CNPJ) ou nome
        let funcionario = null;
        if (dto.prestadorCpf) {
          funcionario = await tx.funcionarioProducao.findUnique({
            where: { cpf: dto.prestadorCpf },
          });
        } else if (dto.prestadorCnpj) {
          funcionario = await tx.funcionarioProducao.findUnique({
            where: { cnpj: dto.prestadorCnpj },
          });
        } else {
          funcionario = await tx.funcionarioProducao.findFirst({
            where: { nome: nomePrestador },
          });
        }

        if (!funcionario) {
          funcionario = await tx.funcionarioProducao.create({
            data: {
              nome:      nomePrestador,
              funcao:    funcaoLabel,
              cpf:       dto.prestadorCpf,
              cnpj:      dto.prestadorCnpj,
              telefone:  dto.prestadorTelefone,
              contato:   dto.prestadorContato,
              tipoPrestador: dto.tipoPrestador as any ?? 'PF',
              active:    true,
            },
          });
        } else {
          // Atualiza dados de contato caso tenham sido informados e sejam diferentes
          const updateData: any = {};
          if (dto.prestadorTelefone && dto.prestadorTelefone !== funcionario.telefone) {
            updateData.telefone = dto.prestadorTelefone;
          }
          if (dto.prestadorContato && dto.prestadorContato !== funcionario.contato) {
            updateData.contato = dto.prestadorContato;
          }
          if (Object.keys(updateData).length > 0) {
            funcionario = await tx.funcionarioProducao.update({
              where: { id: funcionario.id },
              data: updateData,
            });
          }
        }

        // Vincula o funcionário à OF se ainda não estiver vinculado
        const vincExists = await tx.funcionarioOfVinculo.findFirst({
          where: { funcionarioId: funcionario.id, ordemId },
        });
        if (!vincExists) {
          await tx.funcionarioOfVinculo.create({
            data: { funcionarioId: funcionario.id, ordemId, custoOfId: custo.id },
          });
        }
      }

      // Gera ContaPagar isolada com origem = FABRICACAO
      const ordem = await tx.ordemFabricacao.findUnique({ where: { id: ordemId } });
      const oficioLabel = dto.oficio ? `[${dto.oficio}] ` : '';
      const contaPagar = await tx.contaPagar.create({
        data: {
          tipo_conta: 'fabricacao_carreta',
          descricao: `[${ordem!.codigo}] ${oficioLabel}${dto.descricao}`,
          valor: dto.valor,
          data_vencimento: parseLocalDate(dto.dataVencimento),
          status: 'pendente',
          origem: 'FABRICACAO',
          producaoId: ordemId,
          active: true,
        },
      });

      await tx.custoOf.update({ where: { id: custo.id }, data: { contaPagarId: contaPagar.id } });

      // Recalcula custo real acumulado
      const totalCustos = await tx.custoOf.aggregate({
        where: { ordemId },
        _sum: { valor: true },
      });
      const custoReal = Number(totalCustos._sum.valor ?? 0);
      await tx.ordemFabricacao.update({ where: { id: ordemId }, data: { custoRealAcumulado: custoReal } });

      // Alerta se custo real > alertaCustoPercent% do orçamento
      if (custoReal > Number(ordem!.orcamentoTotal) * (Number(ordem!.alertaCustoPercent) / 100)) {
        this.notificationsGateway.notifyAdmins('fabricacao_custo_excedido', {
          ordemId, codigo: ordem!.codigo, custoReal, orcamento: Number(ordem!.orcamentoTotal),
        });
      }

      return custo;
    });
  }

  /** Retorna todos os prestadores vinculados a uma OF */
  async getPrestadores(ordemId: string) {
    const vinculos = await this.prisma.funcionarioOfVinculo.findMany({
      where: { ordemId },
      include: {
        funcionario: true,
        custoOf: {
          include: { contaPagar: true },
        },
      },
      orderBy: { custoOf: { createdAt: 'desc' } },
    });

    return vinculos.map(v => ({
      id:             v.funcionario.id,
      nome:           v.funcionario.nome,
      funcao:         v.funcionario.funcao,
      tipoPrestador:  (v.funcionario as any).tipoPrestador ?? 'PF',
      cpf:            (v.funcionario as any).cpf,
      cnpj:           (v.funcionario as any).cnpj,
      telefone:       (v.funcionario as any).telefone,
      contato:        (v.funcionario as any).contato,
      custo: v.custoOf ? {
        id:             v.custoOf.id,
        tipo:           v.custoOf.tipo,
        oficio:         v.custoOf.oficio,
        valor:          Number(v.custoOf.valor),
        valorDiaria:    v.custoOf.valorDiaria ? Number(v.custoOf.valorDiaria) : null,
        numeroDiarias:  v.custoOf.numeroDiarias,
        diasTrabalhados: (v.custoOf as any).diasTrabalhados ?? [],
        dataVencimento: v.custoOf.dataVencimento,
        operacao:       v.custoOf.operacao,
        contaPagar:     v.custoOf.contaPagar ? {
          id:     v.custoOf.contaPagar.id,
          status: v.custoOf.contaPagar.status,
        } : null,
      } : null,
    }));
  }


  // ── STATUS ────────────────────────────────────────────────────────────────

  async updateStatus(ordemId: string, novoStatus: StatusOrdemFabricacao, userId: string) {
    const ordem = await this.prisma.ordemFabricacao.findUnique({ where: { id: ordemId } });
    if (!ordem) throw new NotFoundException('Ordem não encontrada');

    const updated = await this.prisma.ordemFabricacao.update({
      where: { id: ordemId },
      data: {
        status: novoStatus,
        // Se iniciando produção, registra data real de início
        ...(novoStatus === 'EM_PRODUCAO' && !ordem.dataInicioReal
          ? { dataInicioReal: new Date() }
          : {}),
        // Se concluindo, registra data real de conclusão
        ...(novoStatus === 'CONCLUIDA' ? { dataConclusaoReal: new Date() } : {}),
        // Limpa ANDON se status sair de BLOQUEADA
        ...(ordem.status === 'BLOQUEADA' && novoStatus !== 'BLOQUEADA'
          ? { andoneAtivo: false }
          : {}),
      },
    });

    await this.auditLog.log({
      userId,
      action: 'ORDEM_STATUS_ATUALIZADO',
      tableName: 'OrdemFabricacao',
      recordId: ordemId,
      newData: { de: ordem.status, para: novoStatus },
    });

    this.notificationsGateway.notifyAdmins('fabricacao_status_atualizado', {
      ordemId,
      codigo: ordem.codigo,
      novoStatus,
    });

    return updated;
  }

  async deletarCusto(ordemId: string, custoId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const custo = await tx.custoOf.findUnique({ where: { id: custoId } });
      if (!custo || custo.ordemId !== ordemId) throw new NotFoundException('Custo não encontrado');

      // Cancela a ContaPagar vinculada
      if (custo.contaPagarId) {
        await tx.contaPagar.update({
          where: { id: custo.contaPagarId },
          data: { status: 'cancelada', active: false },
        });
      }

      // Remove o custo
      await tx.custoOf.delete({ where: { id: custoId } });

      // Recalcula custo real acumulado
      const total = await tx.custoOf.aggregate({
        where: { ordemId },
        _sum: { valor: true },
      });
      await tx.ordemFabricacao.update({
        where: { id: ordemId },
        data: { custoRealAcumulado: Number(total._sum.valor ?? 0) },
      });

      await this.auditLog.log({
        userId,
        action: 'CUSTO_OF_REMOVIDO',
        tableName: 'CustoOf',
        recordId: custoId,
        newData: { ordemId, valor: custo.valor, tipo: custo.tipo },
      });

      return { ok: true };
    });
  }

  async updateCampos(
    ordemId: string,
    dto: {
      observacoes?: string;
      alertaCustoPercent?: number;
      cursoEspecifico?: string;
      valorBauComprado?: number;
      valorBauDescricao?: string;
      valorFreteAquisicao?: number;
      valorFreteDescricao?: string;
    },
    _userId: string,
  ) {
    const ordem = await this.prisma.ordemFabricacao.findUnique({ where: { id: ordemId } });
    if (!ordem) throw new NotFoundException('Ordem não encontrada');

    return this.prisma.ordemFabricacao.update({
      where: { id: ordemId },
      data: {
        ...(dto.observacoes            !== undefined && { observacoes:          dto.observacoes }),
        ...(dto.alertaCustoPercent     !== undefined && { alertaCustoPercent:   dto.alertaCustoPercent }),
        ...(dto.cursoEspecifico        !== undefined && { cursoEspecifico:      dto.cursoEspecifico }),
        ...(dto.valorBauComprado       !== undefined && { valorBauComprado:     dto.valorBauComprado }),
        ...(dto.valorBauDescricao      !== undefined && { valorBauDescricao:    dto.valorBauDescricao }),
        ...(dto.valorFreteAquisicao    !== undefined && { valorFreteAquisicao:  dto.valorFreteAquisicao }),
        ...(dto.valorFreteDescricao    !== undefined && { valorFreteDescricao:  dto.valorFreteDescricao }),
      },
    });
  }
}
