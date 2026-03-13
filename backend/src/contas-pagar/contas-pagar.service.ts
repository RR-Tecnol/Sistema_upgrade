import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContaPagarDto } from './dto/create-conta-pagar.dto';
import { ContaPagarStatus } from '@prisma/client';

@Injectable()
export class ContasPagarService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateContaPagarDto) {
        return this.prisma.contaPagar.create({
            data: {
                tipo_conta: dto.tipo_conta,
                tipo_espontaneo: dto.tipo_espontaneo,
                descricao: dto.descricao,
                valor: dto.valor,
                data_vencimento: new Date(dto.data_vencimento),
                status: dto.status || 'pendente',
                recorrente: dto.recorrente ?? false,
                observacoes: dto.observacoes,
                cidade: dto.cidade,
                acaoId: dto.acao_id || undefined,
            },
            include: { acao: { select: { id: true, nome: true } } },
        });
    }

    async findAll(filters?: {
        tipo_conta?: string;
        status?: string;
        cidade?: string;
        data_inicio?: string;
        data_fim?: string;
        search?: string;
    }) {
        const where: any = {};
        if (filters?.tipo_conta) where.tipo_conta = filters.tipo_conta;
        if (filters?.status) where.status = filters.status as ContaPagarStatus;
        if (filters?.cidade) where.cidade = { contains: filters.cidade, mode: 'insensitive' };
        if (filters?.data_inicio || filters?.data_fim) {
            where.data_vencimento = {};
            if (filters.data_inicio) where.data_vencimento.gte = new Date(filters.data_inicio);
            if (filters.data_fim) where.data_vencimento.lte = new Date(filters.data_fim + 'T23:59:59');
        }
        if (filters?.search) {
            where.OR = [
                { descricao: { contains: filters.search, mode: 'insensitive' } },
                { cidade: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        const [contas, total] = await Promise.all([
            this.prisma.contaPagar.findMany({
                where,
                orderBy: { data_vencimento: 'asc' },
                include: { acao: { select: { id: true, nome: true } } },
            }),
            this.prisma.contaPagar.count({ where }),
        ]);

        // KPIs por status
        const kpis = await this.prisma.contaPagar.groupBy({
            by: ['status'],
            _sum: { valor: true },
            _count: { _all: true },
        });

        const totaisPorStatus = {
            pendente: 0, paga: 0, vencida: 0, cancelada: 0,
        };
        kpis.forEach(k => {
            totaisPorStatus[k.status] = Number(k._sum.valor ?? 0);
        });

        return { contas, total, totaisPorStatus };
    }

    async findOne(id: string) {
        const conta = await this.prisma.contaPagar.findUnique({
            where: { id },
            include: { acao: { select: { id: true, nome: true } } },
        });
        if (!conta) throw new NotFoundException('Conta não encontrada');
        return conta;
    }

    async update(id: string, dto: Partial<CreateContaPagarDto> & { data_pagamento?: string; status?: ContaPagarStatus }) {
        await this.findOne(id);
        return this.prisma.contaPagar.update({
            where: { id },
            data: {
                ...(dto.tipo_conta !== undefined && { tipo_conta: dto.tipo_conta }),
                ...(dto.tipo_espontaneo !== undefined && { tipo_espontaneo: dto.tipo_espontaneo }),
                ...(dto.descricao !== undefined && { descricao: dto.descricao }),
                ...(dto.valor !== undefined && { valor: dto.valor }),
                ...(dto.data_vencimento !== undefined && { data_vencimento: new Date(dto.data_vencimento) }),
                ...(dto.data_pagamento !== undefined && { data_pagamento: new Date(dto.data_pagamento) }),
                ...(dto.status !== undefined && { status: dto.status }),
                ...(dto.recorrente !== undefined && { recorrente: dto.recorrente }),
                ...(dto.observacoes !== undefined && { observacoes: dto.observacoes }),
                ...(dto.cidade !== undefined && { cidade: dto.cidade }),
                ...(dto.acao_id !== undefined && { acaoId: dto.acao_id || null }),
            },
            include: { acao: { select: { id: true, nome: true } } },
        });
    }

    async marcarComoPaga(id: string) {
        await this.findOne(id);
        return this.prisma.contaPagar.update({
            where: { id },
            data: { status: 'paga', data_pagamento: new Date() },
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.contaPagar.delete({ where: { id } });
    }

    async updateAnexo(id: string, comprovante_url: string) {
        await this.findOne(id);
        return this.prisma.contaPagar.update({
            where: { id },
            data: { comprovante_url },
        });
    }
}
