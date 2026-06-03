import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import {
    buildContaObservacoesFromMaintenance,
    mapMaintenancePaymentToContaStatus,
} from '../common/truck-maintenance-conta-pagar.util';
import { CreateTruckMaintenanceDto } from './dto/create-truck-maintenance.dto';
import { UpdateTruckMaintenanceDto } from './dto/update-truck-maintenance.dto';

@Injectable()
export class TruckMaintenanceService {
    constructor(
        private prisma: PrismaService,
        private readonly notifications: NotificationsGateway,
    ) { }

    private emitFinanceiroListagemRefresh(source: string, extra: Record<string, unknown> = {}) {
        try {
            this.notifications.notifyFinanceiroListagemRefresh({ source, ...extra });
        } catch { /* WS nunca bloqueia */ }
    }

    private resolveContaValor(
        custoReal?: number | Prisma.Decimal | null,
        custoEstimado?: number | Prisma.Decimal | null,
    ): number {
        const v = Number(custoReal ?? custoEstimado ?? 0);
        return Math.round(Math.max(0, v) * 100) / 100;
    }

    private parseDateSafe(dateInput: string | Date | null | undefined): Date | undefined {
        if (!dateInput) return undefined;
        if (dateInput instanceof Date) return dateInput;
        const trimmed = dateInput.trim();
        const isoDay = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
        if (isoDay) {
            const y = Number(isoDay[1]);
            const m = Number(isoDay[2]) - 1;
            const d = Number(isoDay[3]);
            return new Date(Date.UTC(y, m, d, 12, 0, 0, 0));
        }
        return new Date(trimmed);
    }

    private resolveContaVencimento(
        dataConclusao?: Date | string | null,
        dataAgendada?: Date | string | null,
    ): Date {
        const d1 = this.parseDateSafe(dataConclusao);
        if (d1) return d1;
        const d2 = this.parseDateSafe(dataAgendada);
        if (d2) return d2;
        return new Date();
    }

    private async createContaPagarForMaintenance(
        prisma: Prisma.TransactionClient | PrismaService,
        maintenance: {
            id: string;
            tipo: string;
            titulo: string;
            fornecedor?: string | null;
            responsavel?: string | null;
            cidade?: string | null;
            observacoes?: string | null;
        },
        truck: { identifier?: string | null; licensePlate?: string | null },
        valor: number,
        statusPagamento: string | undefined,
        dataVencimento: Date,
    ) {
        return prisma.contaPagar.create({
            data: {
                tipo_conta: 'manutencao',
                tipo_espontaneo: maintenance.tipo,
                descricao: `[MANUTENÇÃO] ${maintenance.titulo} — ${truck.identifier || truck.licensePlate || 'Carreta'}`,
                valor,
                data_vencimento: dataVencimento,
                status: mapMaintenancePaymentToContaStatus(statusPagamento),
                recorrente: false,
                cidade: maintenance.cidade?.trim() || undefined,
                observacoes: buildContaObservacoesFromMaintenance({
                    maintenanceId: maintenance.id,
                    fornecedor: maintenance.fornecedor,
                    responsavel: maintenance.responsavel,
                    observacoes: maintenance.observacoes,
                }),
            },
        });
    }

    private async syncTruckDates(truckId: string) {
        const all = await this.prisma.truckMaintenance.findMany({ where: { truckId } });

        const concluidaDates = all
            .filter(m => m.status === 'concluida' && m.dataConclusao)
            .map(m => new Date(m.dataConclusao!).getTime());
        const lastMaintenanceDate = concluidaDates.length > 0
            ? new Date(Math.max(...concluidaDates))
            : null;

        const agendadaDates = all
            .filter(m => m.status === 'agendada' && m.dataAgendada)
            .map(m => new Date(m.dataAgendada!).getTime());
        const nextMaintenanceDate = agendadaDates.length > 0
            ? new Date(Math.min(...agendadaDates))
            : null;

        await this.prisma.truck.update({
            where: { id: truckId },
            data: {
                lastMaintenanceDate: lastMaintenanceDate,
                nextMaintenanceDate: nextMaintenanceDate,
            },
        });
    }

    async findAll(truckId?: string) {
        return this.prisma.truckMaintenance.findMany({
            where: truckId ? { truckId } : undefined,
            include: { truck: { select: { identifier: true, licensePlate: true, status: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const m = await this.prisma.truckMaintenance.findUnique({
            where: { id },
            include: { truck: true },
        });
        if (!m) throw new NotFoundException('Manutenção não encontrada');
        return m;
    }

    async create(dto: CreateTruckMaintenanceDto) {
        const truck = await this.prisma.truck.findUnique({ where: { id: dto.truckId } });
        if (!truck) throw new NotFoundException('Carreta não encontrada');

        const valor = this.resolveContaValor(dto.custoReal, dto.custoEstimado);
        const dataVencimento = this.resolveContaVencimento(dto.dataConclusao, dto.dataAgendada);
        const cidade = dto.cidade?.trim() || '';
        if (valor > 0 && !cidade) {
            throw new BadRequestException(
                'Informe a cidade da manutenção para gerar o lançamento em Contas a pagar.',
            );
        }

        const result = await this.prisma.$transaction(async (tx) => {
            const maintenance = await tx.truckMaintenance.create({
                data: {
                    truckId: dto.truckId,
                    tipo: dto.tipo,
                    titulo: dto.titulo,
                    descricao: dto.descricao,
                    status: dto.status ?? 'agendada',
                    prioridade: dto.prioridade ?? 'media',
                    kmAtual: dto.kmAtual,
                    kmProximo: dto.kmProximo,
                    dataAgendada: dto.dataAgendada ? this.parseDateSafe(dto.dataAgendada) : undefined,
                    dataConclusao: dto.dataConclusao ? this.parseDateSafe(dto.dataConclusao) : undefined,
                    custoEstimado: dto.custoEstimado,
                    custoReal: dto.custoReal,
                    fornecedor: dto.fornecedor,
                    responsavel: dto.responsavel,
                    cidade: dto.cidade?.trim() || undefined,
                    observacoes: dto.observacoes,
                    statusPagamento: dto.statusPagamento ?? 'pendente',
                },
            });

            let contaPagarId: string | undefined;
            if (valor > 0) {
                const conta = await this.createContaPagarForMaintenance(
                    tx,
                    maintenance,
                    truck,
                    valor,
                    dto.statusPagamento,
                    dataVencimento,
                );
                contaPagarId = conta.id;
                await tx.truckMaintenance.update({
                    where: { id: maintenance.id },
                    data: { contaPagarId: conta.id },
                });
            }

            if (['em_andamento', 'agendada'].includes(maintenance.status)) {
                await tx.truck.update({
                    where: { id: dto.truckId },
                    data: { status: 'MAINTENANCE' },
                });
            }

            return { maintenance, contaPagarId };
        });

        if (result.contaPagarId) {
            this.emitFinanceiroListagemRefresh('truck_maintenance_create_conta', {
                truckMaintenanceId: result.maintenance.id,
                contaPagarId: result.contaPagarId,
            });
        }

        await this.syncTruckDates(dto.truckId);
        return this.findOne(result.maintenance.id);
    }

    async update(id: string, dto: UpdateTruckMaintenanceDto) {
        const existing = await this.findOne(id);

        const data: Record<string, unknown> = { ...dto };
        if (dto.dataAgendada) data.dataAgendada = this.parseDateSafe(dto.dataAgendada);
        if (dto.dataConclusao) data.dataConclusao = this.parseDateSafe(dto.dataConclusao);

        const valor = this.resolveContaValor(
            dto.custoReal ?? existing.custoReal,
            dto.custoEstimado ?? existing.custoEstimado,
        );
        const dataVencimento = this.resolveContaVencimento(
            dto.dataConclusao ?? existing.dataConclusao,
            dto.dataAgendada ?? existing.dataAgendada,
        );
        const cidadeNova =
            dto.cidade !== undefined ? dto.cidade?.trim() || '' : existing.cidade?.trim() || '';
        if (valor > 0 && !cidadeNova) {
            throw new BadRequestException(
                'Informe a cidade da manutenção para gerar o lançamento em Contas a pagar.',
            );
        }

        const updated = await this.prisma.$transaction(async (tx) => {
            const row = await tx.truckMaintenance.update({ where: { id }, data });

            if (existing.contaPagarId) {
                const updateData: Prisma.ContaPagarUpdateInput = {};
                if (valor > 0) updateData.valor = valor;
                if (dto.statusPagamento != null) {
                    updateData.status = mapMaintenancePaymentToContaStatus(dto.statusPagamento);
                }
                if (dto.dataConclusao || dto.dataAgendada) {
                    updateData.data_vencimento = dataVencimento;
                }
                if (dto.cidade !== undefined) {
                    updateData.cidade = dto.cidade?.trim() || null;
                }
                if (
                    dto.observacoes !== undefined ||
                    dto.fornecedor !== undefined ||
                    dto.responsavel !== undefined
                ) {
                    updateData.observacoes = buildContaObservacoesFromMaintenance({
                        maintenanceId: id,
                        fornecedor: dto.fornecedor ?? row.fornecedor,
                        responsavel: dto.responsavel ?? row.responsavel,
                        observacoes: dto.observacoes ?? row.observacoes,
                    });
                }
                if (Object.keys(updateData).length > 0) {
                    await tx.contaPagar.update({
                        where: { id: existing.contaPagarId },
                        data: updateData,
                    });
                }
            } else if (valor > 0) {
                const truck = existing.truck;
                const conta = await this.createContaPagarForMaintenance(
                    tx,
                    row,
                    truck,
                    valor,
                    dto.statusPagamento ?? row.statusPagamento ?? undefined,
                    dataVencimento,
                );
                await tx.truckMaintenance.update({
                    where: { id },
                    data: { contaPagarId: conta.id },
                });
            }

            return row;
        });

        if (existing.contaPagarId || (valor > 0 && !existing.contaPagarId)) {
            this.emitFinanceiroListagemRefresh('truck_maintenance_update_conta', {
                truckMaintenanceId: id,
                contaPagarId: updated.contaPagarId ?? existing.contaPagarId,
            });
        }

        if (dto.status === 'concluida' && existing.status !== 'concluida') {
            const openCount = await this.prisma.truckMaintenance.count({
                where: { truckId: updated.truckId, id: { not: id }, status: { in: ['agendada', 'em_andamento'] } },
            });
            if (openCount === 0) {
                await this.prisma.truck.update({
                    where: { id: updated.truckId },
                    data: { status: 'AVAILABLE' },
                });
            }
        }

        if (dto.status === 'cancelada' && existing.status !== 'cancelada') {
            const openCount = await this.prisma.truckMaintenance.count({
                where: { truckId: updated.truckId, id: { not: id }, status: { in: ['agendada', 'em_andamento'] } },
            });
            if (openCount === 0) {
                await this.prisma.truck.update({ where: { id: updated.truckId }, data: { status: 'AVAILABLE' } });
            }
        }

        await this.syncTruckDates(updated.truckId);
        return this.findOne(id);
    }

    async remove(id: string) {
        const existing = await this.findOne(id);
        const updated = await this.prisma.truckMaintenance.update({ where: { id }, data: { status: 'cancelada' } });
        
        const openCount = await this.prisma.truckMaintenance.count({
            where: { truckId: existing.truckId, id: { not: id }, status: { in: ['agendada', 'em_andamento'] } },
        });
        if (openCount === 0) {
            await this.prisma.truck.update({ where: { id: existing.truckId }, data: { status: 'AVAILABLE' } });
        }

        await this.syncTruckDates(existing.truckId);
        return updated;
    }

    async stats(truckId: string) {
        const truck = await this.prisma.truck.findUnique({
            where: { id: truckId },
            select: { identifier: true, licensePlate: true, status: true, lastMaintenanceDate: true, capacity: true, modelYear: true },
        });
        if (!truck) throw new NotFoundException('Carreta não encontrada');

        const all = await this.prisma.truckMaintenance.findMany({ where: { truckId } });

        const totalGasto = all
            .filter(m => m.custoReal != null)
            .reduce((acc, m) => acc + Number(m.custoReal ?? 0), 0);

        const emAndamento = all.filter(m => m.status === 'em_andamento').length;
        const concluidas = all.filter(m => m.status === 'concluida').length;
        const agendadas = all.filter(m => m.status === 'agendada').length;
        const canceladas = all.filter(m => m.status === 'cancelada').length;

        const proxima = all
            .filter(m => m.status === 'agendada' && m.dataAgendada)
            .sort((a, b) => new Date(a.dataAgendada!).getTime() - new Date(b.dataAgendada!).getTime())[0] || null;

        const hoje = new Date();
        const custosPorMes: { mes: string; custo: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
            const mesLabel = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
            const custo = all
                .filter(m => {
                    if (!m.dataConclusao) return false;
                    const dc = new Date(m.dataConclusao);
                    return dc.getFullYear() === d.getFullYear() && dc.getMonth() === d.getMonth();
                })
                .reduce((acc, m) => acc + Number(m.custoReal ?? 0), 0);
            custosPorMes.push({ mes: mesLabel, custo });
        }

        return { truck, totalGasto, emAndamento, concluidas, agendadas, canceladas, proxima, custosPorMes };
    }
}
