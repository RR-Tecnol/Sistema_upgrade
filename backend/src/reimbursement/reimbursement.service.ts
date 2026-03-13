import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReimbursementType, ExpenseStatus } from '@prisma/client';

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
  constructor(private prisma: PrismaService) {}

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
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    // Importação dinâmica do MinIO para evitar circular deps
    const { Client } = await import('minio');

    const minioClient = new Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });

    const bucket = 'reimbursements';
    const fileKey = `${userId}/${Date.now()}_${filename}`;

    // Garantir que o bucket existe
    const bucketExists = await minioClient.bucketExists(bucket);
    if (!bucketExists) {
      await minioClient.makeBucket(bucket, 'us-east-1');
    }

    // Presigned URL válida por 15 minutos
    const uploadUrl = await minioClient.presignedPutObject(bucket, fileKey, 900);

    return { uploadUrl, fileKey };
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
        amount: data.amount, // Prisma converte para Decimal(10,2) — nunca Float
        description: data.description,
        receiptUrl: data.receiptUrl,
        status: 'PENDING',
      },
    });
  }

  /**
   * Lista reembolsos — admin vê todos, professor/motorista vê só os seus
   */
  async findAll(requestedBy?: string, status?: ExpenseStatus, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: any = { active: true };
    if (requestedBy) where.requestedBy = requestedBy;
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

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Retorna detalhes de um reembolso específico
   */
  async findOne(id: string) {
    const item = await this.prisma.reimbursement.findFirst({
      where: { id, active: true },
      include: {
        acao: { select: { nome: true, cidadeNome: true, dataInicio: true } },
        employee: { select: { name: true, role: true, email: true } },
      },
    });

    if (!item) throw new NotFoundException(`Reembolso ${id} não encontrado`);
    return item;
  }

  /**
   * ADMIN aprova um reembolso
   */
  async approve(id: string, approvedBy: string) {
    const item = await this.findOne(id);

    if (item.status !== 'PENDING') {
      throw new BadRequestException('Apenas reembolsos com status PENDENTE podem ser aprovados');
    }

    return this.prisma.reimbursement.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
      },
    });
  }

  /**
   * ADMIN rejeita um reembolso com motivo
   */
  async reject(id: string, approvedBy: string, rejectionReason: string) {
    const item = await this.findOne(id);

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
    });
  }

  /**
   * Soft Delete — professor pode cancelar próprio reembolso se ainda PENDING
   */
  async cancel(id: string, requestedBy: string) {
    const item = await this.findOne(id);

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
