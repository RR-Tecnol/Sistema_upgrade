import { ContaPagarStatus } from '@prisma/client';

/** Mapeia status do formulário de manutenção → enum ContaPagar. */
export function mapMaintenancePaymentToContaStatus(status?: string | null): ContaPagarStatus {
    const s = (status || 'pendente').toLowerCase();
    if (s === 'paga' || s === 'pago') return ContaPagarStatus.paga;
    if (s === 'vencida' || s === 'vencido') return ContaPagarStatus.vencida;
    if (s === 'cancelada') return ContaPagarStatus.cancelada;
    return ContaPagarStatus.pendente;
}

export function buildContaObservacoesFromMaintenance(input: {
    maintenanceId: string;
    fornecedor?: string | null;
    responsavel?: string | null;
    observacoes?: string | null;
}): string {
    const parts = ['origem=truck_maintenance', `truckMaintenanceId:${input.maintenanceId}`];
    if (input.fornecedor?.trim()) parts.push(`fornecedor=${input.fornecedor.trim()}`);
    if (input.responsavel?.trim()) parts.push(`responsavel=${input.responsavel.trim()}`);
    const extra = input.observacoes?.trim();
    if (extra && !extra.includes('truckMaintenanceId:')) {
        parts.push(extra);
    }
    return parts.join(' | ');
}
