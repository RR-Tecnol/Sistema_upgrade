import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReimbursementType, ExpenseStatus } from '@prisma/client';
import { MinioService } from './minio.service';
import {
  looksLikeAlreadyPresignedGetUrl,
  parseMinioPublicUrlToBucketKey,
} from './minio-public-url.util';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsSenderService } from '../notifications/notifications-sender.service';

/**
 * ReimbursementService — REQ-10
 * 
 * Portal de Reembolso para professores e motoristas registrarem
 * despesas imprevistas de campo com foto do recibo via mobile.
 * 
 * REGRA DA REUNIÃO (00:20:04 — 00:22:00):
 * "O professor registra: comprei material de limpeza, material de aula,
 * tira uma foto do recibo e o admin aprova o reembolso."
 * 
 * Upload: foto vai diretamente para MinIO (bucket: reimbursements)
 * via Presigned URL — servidor NestJS não toca no arquivo (02_LIVRO_DE_REGRAS.md §4)
 */
@Injectable()
export class ReimbursementService {
  private readonly logger = new Logger(ReimbursementService.name);

  constructor(
      private prisma: PrismaService,
      private minio: MinioService,
      private notifications: NotificationsGateway,
      private notificationsSender: NotificationsSenderService,
  ) {}

  /**
   * Gera uma Presigned URL do MinIO para o professor/motorista
   * fazer o upload da foto do recibo diretamente do celular.
   * 
   * O NestJS não recebe o arquivo — apenas gera a URL assinada.
   * Isso economiza banda e RAM do servidor (pesquisa REQ-10).
   */
  async getPresignedUploadUrl(
    userId: string,
    filename: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; fileKey: string; fileUrl: string }> {
      const bucket = process.env.MINIO_BUCKET_REIMBURSEMENT || 'reimbursements';
      const fileKey = `${userId}/${Date.now()}_${filename}`;
      const uploadUrl = await this.minio.presignedPutUrl(bucket, fileKey, 900);
      
      const minioEndpoint = process.env.MINIO_ENDPOINT || 'localhost';
      const minioPort = process.env.MINIO_PORT || '9010';
      const useSSL = process.env.MINIO_USE_SSL === 'true';
      const protocol = useSSL ? 'https' : 'http';
      const fileUrl = `${protocol}://${minioEndpoint}:${minioPort}/${bucket}/${fileKey}`;
      
      return { uploadUrl, fileKey, fileUrl };
  }

  /**
   * Cria uma solicitação de reembolso.
   * A foto já foi enviada ao MinIO — aqui registramos os metadados.
   */
  async create(data: {
    requestedBy: string;
    employeeId?: string;
    acaoId?: string;
    type: ReimbursementType;
    amount: number;
    description: string;
    receiptUrl?: string; // opcional — sem MinIO usa string vazia
  }) {
    return this.prisma.reimbursement.create({
      data: {
        requestedBy: data.requestedBy,
        employeeId: data.employeeId,
        acaoId: data.acaoId,
        type: data.type,
        amount: data.amount,
        description: data.description,
        receiptUrl: data.receiptUrl,
        status: 'PENDING',
      },
    }).then(async reimbursement => {
      // PASSO 3.1: notificar admins — WS em try/catch SEPARADO (nunca dentro de $transaction)
      try {
        const requester = await this.prisma.user.findUnique({
          where: { id: data.requestedBy },
          select: { name: true },
        });
        this.notifications.notifyAdmins('reembolso_solicitado', {
          reimbursementId: reimbursement.id,
          userId: data.requestedBy,
          amount: data.amount,
          type: data.type,
          timestamp: new Date().toISOString(),
          actorName: requester?.name ?? undefined,
          actorUserId: data.requestedBy,
        });

        if (requester) {
          await this.notificationsSender.reimbursementRequested(requester.name, data.amount).catch(() => {});
        }
      } catch { /* WS nunca causa rollback */ }
      return reimbursement;
    });
  }

  /**
   * Lista reembolsos — admin vê todos, professor/motorista vê só os seus.
   * Admin pode filtrar por `employeeId` (vínculo directo ou mesmo `requestedBy` do User do funcionário).
   */
  async findAll(
    requestedBy?: string,
    status?: ExpenseStatus,
    page = 1,
    limit = 20,
    opts?: { employeeId?: string },
  ) {
    const skip = (page - 1) * limit;

    const where: any = { active: true };
    if (requestedBy) {
      where.requestedBy = requestedBy;
    } else if (opts?.employeeId) {
      const emp = await this.prisma.employee.findUnique({
        where: { id: opts.employeeId },
        select: { userId: true },
      });
      const orClause: Array<{ employeeId: string } | { requestedBy: string }> = [
        { employeeId: opts.employeeId },
      ];
      if (emp?.userId) {
        orClause.push({ requestedBy: emp.userId });
      }
      where.OR = orClause;
    }
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.reimbursement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          acao: { select: { nome: true, cidadeNome: true } },
          employee: { select: { name: true, role: true } },
        },
      }),
      this.prisma.reimbursement.count({ where }),
    ]);

    // Fetch users for fallback when employee is null
    const userIds = [...new Set(items.map(i => i.requestedBy))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, role: true },
    });

    const enrichedItems = items.map(item => {
      const user = users.find(u => u.id === item.requestedBy);
      return {
        ...item,
        employee: item.employee || (user ? { name: user.name, role: user.role } : null) as any,
      };
    });

    return {
      data: enrichedItems,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Carrega reembolso por ID (uso interno — sem checagem de dono/papel). */
  private async loadReimbursementById(id: string) {
    const item = await this.prisma.reimbursement.findFirst({
      where: { id, active: true },
      include: {
        acao: { select: { nome: true, cidadeNome: true, dataInicio: true } },
        employee: { select: { name: true, role: true, email: true } },
      },
    });

    if (!item) throw new NotFoundException(`Reembolso ${id} não encontrado`);

    if (!item.employee) {
      const user = await this.prisma.user.findUnique({
        where: { id: item.requestedBy },
        select: { name: true, role: true, email: true },
      });
      if (user) {
        item.employee = { name: user.name, role: user.role, email: user.email } as any;
      }
    }

    return item;
  }

  /**
   * Detalhe de um reembolso — só admin/financeiro/coordenador ou o próprio solicitante.
   */
  async findOneForCaller(id: string, caller: { id: string; role: string }) {
    const item = await this.loadReimbursementById(id);

    const privileged = ['IT_ADMIN', 'ADMIN', 'COORDINATOR', 'FINANCIAL'].includes(caller.role);
    if (privileged) return item;

    if (item.requestedBy === caller.id) return item;

    throw new ForbiddenException('Você não tem permissão para ver este reembolso');
  }

  /**
   * URL GET assinada para pré-visualização do recibo (bucket privado).
   */
  async getPresignedReceiptViewUrl(id: string, caller: { id: string; role: string }) {
    const item = await this.loadReimbursementById(id);

    const privileged = ['IT_ADMIN', 'ADMIN', 'COORDINATOR', 'FINANCIAL'].includes(caller.role);
    if (!privileged && item.requestedBy !== caller.id) {
      throw new ForbiddenException('Você não tem permissão para ver este recibo');
    }

    const raw = item.receiptUrl?.trim();
    if (!raw) {
      throw new BadRequestException('Este reembolso não tem comprovante anexado');
    }

    if (looksLikeAlreadyPresignedGetUrl(raw)) {
      return { url: raw, expiresIn: 0 };
    }

    const parsed = parseMinioPublicUrlToBucketKey(raw);
    if (!parsed) {
      throw new BadRequestException('URL do comprovante não reconhecida para leitura segura');
    }

    const expirySeconds = 3600;
    try {
      const url = await this.minio.presignedGetUrl(parsed.bucket, parsed.key, expirySeconds);
      return { url, expiresIn: expirySeconds };
    } catch {
      throw new BadRequestException('Não foi possível gerar link de visualização do recibo');
    }
  }

  /**
   * ADMIN aprova um reembolso
   */
  async approve(id: string, approvedBy: string) {
    const item = await this.loadReimbursementById(id);
    const approver = await this.prisma.user.findUnique({ where: { id: approvedBy }, select: { name: true } });

    if (item.status !== 'PENDING') {
      throw new BadRequestException('Apenas reembolsos com status PENDENTE podem ser aprovados');
    }

    const employeeLabel = item.employee?.name || 'Funcionário';

    const updated = await this.prisma.$transaction(async (tx) => {
      // Hardening §5: update condicional evita corrida entre aprovações simultâneas.
      const gate = await tx.reimbursement.updateMany({
        where: { id, status: 'PENDING', active: true },
        data: {
          status: 'APPROVED',
          approvedBy,
          approvedAt: new Date(),
        },
      });
      if (gate.count === 0) {
        throw new BadRequestException('Apenas reembolsos com status PENDENTE podem ser aprovados');
      }

      const u = await tx.reimbursement.findUnique({
        where: { id },
      });
      if (!u) {
        throw new NotFoundException(`Reembolso ${id} não encontrado`);
      }

      // Idempotência: evita duplicar ContaPagar ao repetir chamada.
      const marker = `reimbursementId:${id}`;
      const existingConta = await tx.contaPagar.findFirst({
        where: {
          observacoes: { contains: marker },
        },
        select: { id: true },
      });
      if (!existingConta) {
        const motivoLimpo = item.description?.trim() || 'Sem descrição';
        await tx.contaPagar.create({
          data: {
            tipo_conta: 'funcionario',
            descricao: `Reembolso de Despesas: ${employeeLabel} — ${motivoLimpo}`,
            valor: item.amount,
            data_vencimento: new Date(),
            status: 'pendente',
            observacoes: `origem=reembolso | ${marker} | categoria=${item.type} | motivo=${motivoLimpo}`,
            comprovante_url: item.receiptUrl ?? undefined,
          },
        });
      }

      return u;
    });

    try {
      const notificationId = await this.notificationsSender
        .reimbursementStatusChanged(item.requestedBy, true, Number(item.amount), undefined, approvedBy, approver?.name || undefined)
        .catch(() => undefined as string | undefined);

      this.notifications.notifyUser(item.requestedBy, 'reembolso_revisado', {
        reimbursementId: id,
        status: 'APPROVED',
        amount: item.amount,
        reviewedByName: approver?.name || null,
        actorName: approver?.name ?? undefined,
        actorUserId: approvedBy,
        timestamp: new Date().toISOString(),
        ...(notificationId ? { notificationId } : {}),
      });

      // UX-5: outras abas / perfil financeiro refrescam Contas a pagar + Reembolsos
      this.notifications.notifyFinanceiroListagemRefresh({
        source: 'reimbursement_approve',
        reimbursementId: id,
      });
    } catch { /* WS nunca bloqueia resposta */ }

    return updated;
  }

  /**
   * ADMIN rejeita um reembolso com motivo
   */
  async reject(id: string, approvedBy: string, rejectionReason: string) {
    const item = await this.loadReimbursementById(id);
    const approver = await this.prisma.user.findUnique({ where: { id: approvedBy }, select: { name: true } });

    if (item.status !== 'PENDING') {
      throw new BadRequestException('Apenas reembolsos com status PENDENTE podem ser rejeitados');
    }

    return this.prisma.reimbursement.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedBy,
        rejectedAt: new Date(),
        rejectionReason,
      },
    }).then(async updated => {
      // PASSO 3.1: notificar o solicitante — WS em try/catch SEPARADO
      try {
        const notificationId = await this.notificationsSender
          .reimbursementStatusChanged(
            item.requestedBy,
            false,
            Number(item.amount),
            rejectionReason,
            approvedBy,
            approver?.name || undefined,
          )
          .catch(() => undefined as string | undefined);

        this.notifications.notifyUser(item.requestedBy, 'reembolso_revisado', {
          reimbursementId: id,
          status: 'REJECTED',
          amount: item.amount,
          rejectionReason,
          reviewedByName: approver?.name || null,
          actorName: approver?.name ?? undefined,
          actorUserId: approvedBy,
          timestamp: new Date().toISOString(),
          ...(notificationId ? { notificationId } : {}),
        });

        this.notifications.notifyFinanceiroListagemRefresh({
          source: 'reimbursement_reject',
          reimbursementId: id,
        });
      } catch { /* WS nunca causa rollback */ }
      return updated;
    });
  }

  /**
   * Soft Delete — professor pode cancelar próprio reembolso se ainda PENDING
   */
  async cancel(id: string, requestedBy: string) {
    const item = await this.loadReimbursementById(id);

    if (item.requestedBy !== requestedBy) {
      throw new ForbiddenException('Você só pode cancelar seus próprios reembolsos');
    }

    if (item.status !== 'PENDING') {
      throw new BadRequestException('Apenas reembolsos com status PENDENTE podem ser cancelados');
    }

    // Soft Delete (02_LIVRO_DE_REGRAS.md §3)
    return this.prisma.reimbursement.update({
      where: { id },
      data: { active: false },
    });
  }
}
