import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTruckMaintenanceDto } from './dto/create-truck-maintenance.dto';
import { UpdateTruckMaintenanceDto } from './dto/update-truck-maintenance.dto';

@Injectable()
export class TruckMaintenanceService {
    constructor(private prisma: PrismaService) { }

    // ── CRUD ──────────────────────────────────────────────────────────────────

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

        const data: any = {
            truckId: dto.truckId,
            tipo: dto.tipo,
            titulo: dto.titulo,
            descricao: dto.descricao,
            status: dto.status ?? 'agendada',
            prioridade: dto.prioridade ?? 'media',
            kmAtual: dto.kmAtual,
            kmProximo: dto.kmProximo,
            dataAgendada: dto.dataAgendada ? new Date(dto.dataAgendada) : undefined,
            dataConclusao: dto.dataConclusao ? new Date(dto.dataConclusao) : undefined,
            custoEstimado: dto.custoEstimado,
            custoReal: dto.custoReal,
            fornecedor: dto.fornecedor,
            responsavel: dto.responsavel,
            observacoes: dto.observacoes,
        };

        const maintenance = await this.prisma.truckMaintenance.create({ data });

        // Atualizar status da carreta
        if (['em_andamento', 'agendada'].includes(maintenance.status)) {
            await this.prisma.truck.update({
                where: { id: dto.truckId },
                data: { status: 'MAINTENANCE' },
            });
        }

        // Criar ContaPagar imediatamente ao registrar com o status de pagamento escolhido
        const valor = Number(dto.custoReal ?? dto.custoEstimado ?? 0);
        if (valor > 0) {
            const statusPag = dto.statusPagamento ?? 'pendente';
            const conta = await this.prisma.contaPagar.create({
                data: {
                    tipo_conta: 'manutencao',
                    tipo_espontaneo: dto.tipo,
                    descricao: `[MANUTENÇÃO] ${dto.titulo} — ${truck.identifier || truck.licensePlate}`,
                    valor,
                    data_vencimento: dto.dataConclusao
                        ? new Date(dto.dataConclusao)
                        : dto.dataAgendada
                            ? new Date(dto.dataAgendada)
                            : new Date(),
                    status: statusPag,
                    recorrente: false,
                    observacoes: dto.observacoes,
                    fornecedor: dto.fornecedor || undefined,
                } as any,
            });
            await this.prisma.truckMaintenance.update({
                where: { id: maintenance.id },
                data: { contaPagarId: conta.id },
            });
        }

        return maintenance;
    }

    async update(id: string, dto: UpdateTruckMaintenanceDto) {
        const existing = await this.findOne(id);
        const existingAny = existing as any;

        const data: any = { ...dto };
        if (dto.dataAgendada) data.dataAgendada = new Date(dto.dataAgendada);
        if (dto.dataConclusao) data.dataConclusao = new Date(dto.dataConclusao);

        const updated = await this.prisma.truckMaintenance.update({ where: { id }, data });

        // Sincronizar ContaPagar
        if (existingAny.contaPagarId) {
            const novoValor = Number(dto.custoReal ?? dto.custoEstimado ?? existing.custoReal ?? existing.custoEstimado ?? 0);
            const updateData: any = {};
            if (novoValor > 0) updateData.valor = novoValor;
            if ((dto as any).statusPagamento) updateData.status = (dto as any).statusPagamento;
            if (dto.dataConclusao) updateData.data_vencimento = new Date(dto.dataConclusao);
            if (dto.observacoes !== undefined) updateData.observacoes = dto.observacoes;
            if (Object.keys(updateData).length > 0) {
                await this.prisma.contaPagar.update({
                    where: { id: existingAny.contaPagarId },
                    data: updateData,
                }).catch(() => { });
            }
        } else {
            // Criar ContaPagar se ainda não existia e agora há um custo informado
            const valor = Number(dto.custoReal ?? dto.custoEstimado ?? 0);
            if (valor > 0) {
                const truck = existing.truck as any;
                const conta = await this.prisma.contaPagar.create({
                    data: {
                        tipo_conta: 'manutencao',
                        tipo_espontaneo: existing.tipo,
                        descricao: `[MANUTENÇÃO] ${existing.titulo} — ${truck?.identifier || truck?.licensePlate || ''}`,
                        valor,
                        data_vencimento: updated.dataConclusao ?? updated.dataAgendada ?? new Date(),
                        status: (dto as any).statusPagamento ?? 'pendente',
                        recorrente: false,
                        observacoes: updated.observacoes,
                        fornecedor: updated.fornecedor || undefined,
                    } as any,
                });
                await this.prisma.truckMaintenance.update({ where: { id }, data: { contaPagarId: conta.id } });
            }
        }

        // Se concluída → liberar carreta se não houver outras abertas
        if (dto.status === 'concluida' && existing.status !== 'concluida') {
            const openCount = await this.prisma.truckMaintenance.count({
                where: { truckId: updated.truckId, id: { not: id }, status: { in: ['agendada', 'em_andamento'] } },
            });
            if (openCount === 0) {
                await this.prisma.truck.update({
                    where: { id: updated.truckId },
                    data: { status: 'AVAILABLE', lastMaintenanceDate: new Date() },
                });
            }
        }

        // Se cancelada → verificar se deve liberar carreta
        if (dto.status === 'cancelada' && existing.status !== 'cancelada') {
            const openCount = await this.prisma.truckMaintenance.count({
                where: { truckId: updated.truckId, id: { not: id }, status: { in: ['agendada', 'em_andamento'] } },
            });
            if (openCount === 0) {
                await this.prisma.truck.update({ where: { id: updated.truckId }, data: { status: 'AVAILABLE' } });
            }
        }

        return updated;
    }

    async remove(id: string) {
        const existing = await this.findOne(id) as any;
        // Remover ContaPagar vinculada automaticamente
        if (existing.contaPagarId) {
            await this.prisma.contaPagar.delete({ where: { id: existing.contaPagarId } }).catch(() => { });
        }
        return this.prisma.truckMaintenance.delete({ where: { id } });
    }

    // ── STATS ─────────────────────────────────────────────────────────────────

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
