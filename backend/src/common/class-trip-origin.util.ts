import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_ACAO_STATUSES = ['PLANEJADA', 'EM_ANDAMENTO'] as const;

/**
 * Cidade de onde a carreta parte (ida) e para onde volta após o curso.
 * Prioridade: turma.originCityId → período.originCidadeId.
 */
export async function resolveClassTripOriginCityId(
    prisma: PrismaService,
    classRef: { id: string; originCityId: string | null },
    acaoId?: string,
): Promise<string> {
    if (classRef.originCityId) return classRef.originCityId;

    if (acaoId) {
        const acao = await prisma.acao.findUnique({
            where: { id: acaoId },
            select: { originCidadeId: true },
        });
        if (acao?.originCidadeId) return acao.originCidadeId;
    }

    const link = await prisma.acaoTurma.findFirst({
        where: {
            turmaId: classRef.id,
            acao: { status: { in: [...ACTIVE_ACAO_STATUSES] } },
        },
        orderBy: { createdAt: 'desc' },
        include: { acao: { select: { originCidadeId: true } } },
    });
    if (link?.acao?.originCidadeId) return link.acao.originCidadeId;

    throw new BadRequestException(
        'Defina a cidade de origem da carreta na turma (intercidade) ou no período (origem da rota) antes de gerar viagens.',
    );
}

/** Data base da viagem de ida: período.driverDepartureDate ou início letivo da turma. */
export async function resolveIdaDepartureBaseDate(
    prisma: PrismaService,
    classRef: { startDate: Date },
    acaoId?: string,
): Promise<Date> {
    if (acaoId) {
        const acao = await prisma.acao.findUnique({
            where: { id: acaoId },
            select: { driverDepartureDate: true },
        });
        if (acao?.driverDepartureDate) {
            return new Date(acao.driverDepartureDate);
        }
    }
    return new Date(classRef.startDate);
}

/** Combina data base com horário HH:mm (horário local do servidor, alinhado ao restante do módulo de viagens). */
export function combineDateAndTime(baseDate: Date, timeStr: string): Date {
    const [h, m] = (timeStr || '07:00').split(':').map(Number);
    const d = new Date(baseDate);
    d.setHours(h || 7, m || 0, 0, 0);
    return d;
}
