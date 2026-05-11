import api from './client';

export interface ContaPagar {
    id: string;
    tipo_conta: string;
    tipo_espontaneo?: string;
    descricao: string;
    valor: number;
    data_vencimento: string;
    data_pagamento?: string;
    status: 'pendente' | 'paga' | 'vencida' | 'cancelada';
    recorrente: boolean;
    observacoes?: string;
    comprovante_url?: string;
    cidade?: string;
    acaoId?: string;
    acao?: { id: string; nome: string } | null;
    courseFeedback?: {
        id: string;
        status?: string;
        resubmittedAfterReject?: boolean;
        rejectionReason?: string | null;
        studentSubmitSequence?: number;
        currentPhotoUrl?: string | null;
        socialPostProofUrl?: string | null;
        student?: { user?: { name?: string; email?: string } };
    } | null;
    createdAt: string;
    updatedAt: string;
}

export interface ContasPagarResponse {
    contas: ContaPagar[];
    total: number;
    totaisPorStatus: { pendente: number; paga: number; vencida: number; cancelada: number };
}

export interface CreateContaPagarData {
    tipo_conta: string;
    tipo_espontaneo?: string;
    descricao: string;
    valor: number;
    data_vencimento: string;
    status?: 'pendente' | 'paga' | 'vencida' | 'cancelada';
    recorrente?: boolean;
    observacoes?: string;
    acao_id?: string;
    cidade?: string;
}

export async function getContasPagar(filters?: {
    tipo_conta?: string;
    status?: string;
    cidade?: string;
    data_inicio?: string;
    data_fim?: string;
    search?: string;
    includeDeleted?: boolean; // PASSO 3.9: buscar contas excluídas
}): Promise<ContasPagarResponse> {
    const params = new URLSearchParams();
    if (filters?.tipo_conta) params.set('tipo_conta', filters.tipo_conta);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.cidade) params.set('cidade', filters.cidade);
    if (filters?.data_inicio) params.set('data_inicio', filters.data_inicio);
    if (filters?.data_fim) params.set('data_fim', filters.data_fim);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.includeDeleted) params.set('includeDeleted', 'true');
    const { data } = await api.get(`/contas-pagar?${params.toString()}`);
    return data;
}

export async function createContaPagar(body: CreateContaPagarData): Promise<ContaPagar> {
    const { data } = await api.post('/contas-pagar', body);
    return data;
}

export async function updateContaPagar(id: string, body: Partial<CreateContaPagarData> & { data_pagamento?: string; status?: string }): Promise<ContaPagar> {
    const { data } = await api.put(`/contas-pagar/${id}`, body);
    return data;
}

export async function marcarComoPaga(id: string): Promise<ContaPagar> {
    const { data } = await api.patch(`/contas-pagar/${id}/pagar`);
    return data;
}

export async function deleteContaPagar(id: string): Promise<void> {
    await api.delete(`/contas-pagar/${id}`);
}

// PASSO 3.9: restaurar conta excluída (soft delete reversal)
export async function restoreContaPagar(id: string): Promise<ContaPagar> {
    const { data } = await api.patch(`/contas-pagar/${id}/restore`);
    return data;
}
