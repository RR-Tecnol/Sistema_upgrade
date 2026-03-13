import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        // Try direct token first, then auth-storage (Zustand persist)
        let token = localStorage.getItem('token');
        if (!token) {
            try {
                const authStorage = localStorage.getItem('auth-storage');
                if (authStorage) {
                    const parsed = JSON.parse(authStorage);
                    token = parsed?.state?.token || null;
                }
            } catch { /* ignore */ }
        }
        if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ── Tipos ────────────────────────────────────────────────────────

export type AcaoStatus = 'PLANEJADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
export type AcaoCustoTipo = 'ABASTECIMENTO' | 'DESPESA_GERAL' | 'DIARIA_FUNCIONARIO';

export interface Acao {
    id: string;
    nome: string;
    cidadeNome: string;       // Nome digitado/escolhido (sempre presente)
    cidadeId?: string;        // FK opcional para correlação com City
    grupoId: string;
    carretaId?: string;
    status: AcaoStatus;
    dataInicio: string;
    dataFim: string;
    localExecucao?: string;
    distanciaKm?: number;
    precoCombustivelL?: number;
    autonomiaKmL?: number;
    observacoes?: string;
    permitirInscricoes: boolean;
    createdAt: string;
    updatedAt: string;
    cidade?: { id: string; name: string; state: string };
    grupo?: { id: string; name: string; state: string };
    carreta?: { id: string; identifier: string; licensePlate: string; type: string };
    turmas?: AcaoTurma[];
    custos?: AcaoCusto[];
    equipe?: AcaoEquipe[];
    funcionarios?: AcaoFuncionario[];
    resumoFinanceiro?: ResumoFinanceiro;
    _count?: { turmas: number; custos: number; equipe: number };
}

export interface AcaoTurma {
    id: string;
    acaoId: string;
    turmaId: string;
    turma?: {
        id: string;
        classIdentifier: string;
        startDate: string;
        endDate: string;
        status: string;
        vacancies: number;
        course?: { id: string; name: string };
        _count?: { enrollments: number };
    };
}

export interface AcaoCusto {
    id: string;
    acaoId: string;
    tipo: AcaoCustoTipo;
    descricao: string;
    valor: number;
    data: string;
    litros?: number;
    funcionarioId?: string;
    observacoes?: string;
    funcionario?: { id: string; name: string };
}

export interface AcaoEquipe {
    id: string;
    acaoId: string;
    userId: string;
    funcao: string;
    diaria: number;
    diasTrabalhados: number;
    user?: { id: string; name: string; email: string; role: string };
}

export interface ResumoFinanceiro {
    estimado: {
        combustivel: number;
        diarias: number;
        total: number;
        litrosEstimados: number;
    };
    real: {
        abastecimentos: number;
        despesasGerais: number;
        diariasPagas: number;
        total: number;
    };
    economia: number;
}

export interface AcaoFuncionario {
    id: string;
    acaoId: string;
    employeeId: string;
    valorDiaria: number;
    diasTrabalhados: number;
    employee?: {
        id: string;
        name: string;
        role: string;
        department: string;
        specialty?: string;
        dailyCost?: number;
        photoUrl?: string;
        active: boolean;
        phone?: string;
        email?: string;
    };
}

export interface AcaoEstatisticas {
    total: number;
    planejadas: number;
    emAndamento: number;
    concluidas: number;
    canceladas: number;
}

// ── API Calls ────────────────────────────────────────────────────

export const acoesApi = {
    listar: (params?: { status?: string; grupoId?: string; cidadeId?: string; search?: string }) =>
        api.get<Acao[]>('/acoes', { params }).then(r => r.data),

    buscar: (id: string) =>
        api.get<Acao>(`/acoes/${id}`).then(r => r.data),

    estatisticas: () =>
        api.get<AcaoEstatisticas>('/acoes/estatisticas').then(r => r.data),

    criar: (data: Partial<Acao>) =>
        api.post<Acao>('/acoes', data).then(r => r.data),

    atualizar: (id: string, data: Partial<Acao>) =>
        api.patch<Acao>(`/acoes/${id}`, data).then(r => r.data),

    atualizarStatus: (id: string, status: AcaoStatus) =>
        api.patch(`/acoes/${id}/status`, { status }).then(r => r.data),

    excluir: (id: string) =>
        api.delete(`/acoes/${id}`).then(r => r.data),

    // Turmas
    addTurma: (acaoId: string, turmaId: string) =>
        api.post(`/acoes/${acaoId}/turmas/${turmaId}`).then(r => r.data),

    removeTurma: (acaoId: string, turmaId: string) =>
        api.delete(`/acoes/${acaoId}/turmas/${turmaId}`).then(r => r.data),

    // Equipe
    addEquipe: (acaoId: string, data: { userId: string; funcao: string; diaria: number }) =>
        api.post(`/acoes/${acaoId}/equipe`, data).then(r => r.data),

    updateDias: (acaoId: string, userId: string, diasTrabalhados: number) =>
        api.patch(`/acoes/${acaoId}/equipe/${userId}/dias`, { diasTrabalhados }).then(r => r.data),

    removeEquipe: (acaoId: string, userId: string) =>
        api.delete(`/acoes/${acaoId}/equipe/${userId}`).then(r => r.data),

    // Custos
    addCusto: (acaoId: string, data: Partial<AcaoCusto>) =>
        api.post(`/acoes/${acaoId}/custos`, data).then(r => r.data),

    // Cidades autocomplete
    searchCidades: (q: string) =>
        api.get<{ id: string; name: string; state: string }[]>('/acoes/cidades-autocomplete', { params: { q } }).then(r => r.data),

    removeCusto: (acaoId: string, custoId: string) =>
        api.delete(`/acoes/${acaoId}/custos/${custoId}`).then(r => r.data),

    // Funcionários
    listFuncionarios: (acaoId: string) =>
        api.get(`/acoes/${acaoId}/funcionarios`).then(r => r.data),

    addFuncionario: (acaoId: string, data: { employeeId: string; valorDiaria: number; diasTrabalhados?: number }) =>
        api.post(`/acoes/${acaoId}/funcionarios`, data).then(r => r.data),

    updateFuncionarioDias: (acaoId: string, employeeId: string, diasTrabalhados: number) =>
        api.patch(`/acoes/${acaoId}/funcionarios/${employeeId}/dias`, { diasTrabalhados }).then(r => r.data),

    removeFuncionario: (acaoId: string, employeeId: string) =>
        api.delete(`/acoes/${acaoId}/funcionarios/${employeeId}`).then(r => r.data),
};

export default api;
