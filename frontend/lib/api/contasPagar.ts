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
    // ESTOQUE — vínculo 1:1 quando a conta foi gerada por aprovação de Solicitação de Compra.
    // Backend popula via include na listagem e no findOne.
    stockPurchaseRequest?: {
        id: string;
        status: string;
        quantidade: number | string;
        precoUnitario: number | string;
        valorTotal: number | string;
        justificativa: string;
        fornecedor?: string | null;
        urgente: boolean;
        createdAt: string;
        reviewedAt?: string | null;
        reviewNote?: string | null;
        stockItem: {
            id: string;
            nome: string;
            codigoInterno?: string | null;
            categoria: string;
            unidade: string;
            fotoUrl?: string | null;
            quantidadeAtual: number | string;
        };
        requester: { id: string; name: string; role: string };
        reviewer?: { id: string; name: string; role: string } | null;
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

// ─── COMPROVANTES ──────────────────────────────────────────────────────────
// Fluxo: getComprovantePresignedUrl → upload PUT direto pro MinIO → setComprovanteUrl.
// Mantemos os 3 passos explícitos no front para que o admin acompanhe o progresso
// (toast de "anexando…" cobre o tempo do upload).

export interface ComprovantePresignedResponse {
    uploadUrl: string;
    fileKey: string;
    fileUrl: string;
}

export async function getComprovantePresignedUrl(
    contaId: string,
    filename: string,
    contentType: string,
): Promise<ComprovantePresignedResponse> {
    const { data } = await api.post(`/contas-pagar/${contaId}/comprovante/presigned-url`, {
        filename,
        contentType,
    });
    return data;
}

export async function setContaComprovanteUrl(contaId: string, comprovanteUrl: string): Promise<{ comprovante_url: string }> {
    const { data } = await api.patch(`/contas-pagar/${contaId}/comprovante`, { comprovante_url: comprovanteUrl });
    return data;
}

export async function removeContaComprovante(contaId: string): Promise<{ ok: true }> {
    const { data } = await api.delete(`/contas-pagar/${contaId}/comprovante`);
    return data;
}

export async function getContaComprovanteViewUrl(contaId: string): Promise<{ url: string }> {
    const { data } = await api.get(`/contas-pagar/${contaId}/comprovante-view-url`);
    return data;
}

/**
 * Fluxo completo em um helper: pede presigned, faz PUT direto no MinIO,
 * persiste o URL no banco. Usado pelo modal de detalhes.
 */
export async function uploadContaComprovante(contaId: string, file: File): Promise<{ comprovante_url: string }> {
    const presigned = await getComprovantePresignedUrl(contaId, file.name, file.type || 'application/octet-stream');

    // PUT direto pro MinIO (presigned). Não usamos o axios `api` aqui porque
    // ele injeta Authorization, mas a URL temporária do MinIO rejeita Bearer.
    const putRes = await fetch(presigned.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
    });
    if (!putRes.ok) {
        throw new Error(`Falha ao enviar arquivo ao armazenamento (HTTP ${putRes.status}).`);
    }

    return setContaComprovanteUrl(contaId, presigned.fileUrl);
}
