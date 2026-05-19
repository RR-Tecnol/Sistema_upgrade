import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        // Lê de sessionStorage (por aba) com fallback para localStorage — idêntico a client.ts
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
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
    driverDepartureDate?: string | null;
    motorCourseId?: string;
    period?: 'MORNING' | 'AFTERNOON' | 'EVENING';
    startTime?: string;
    endTime?: string;
    weekendPolicy?: 'FOLLOW_SCHEDULE' | 'WEEKDAYS_ONLY' | 'ALL_WEEKENDS' | 'SELECT_WEEKENDS';
    weekendExtraDates?: string[];
    teachingDaysOverride?: number;
    localExecucao?: string;
    // ── Tipo de rota (REQ-ROUTE-2026) ──
    routeType?: 'INTERCIDADE' | 'INTRAURBANA';
    originCidadeId?: string;
    originCidade?: { id: string; name: string; state: string };
    originNeighborhood?: string;
    destinationNeighborhood?: string;
    // ── Detalhes do local físico (REQ-LOCAL-2026) ──
    localEndereco?: string;
    localReferencia?: string;
    localLatitude?: number;
    localLongitude?: number;
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
    listar: (params?: {
        status?: string;
        grupoId?: string;
        cidadeId?: string;
        search?: string;
        page?: number;
        limit?: number;
    }) => api.get('/acoes', { params }).then(r => r.data),

    buscar: (id: string) =>
        api.get<Acao>(`/acoes/${id}`).then(r => r.data),

    getCalendarioResumo: (id: string) =>
        api.get<{
            temTurma: boolean;
            diasLetivos: number;
            diasCorridos: number;
            weekendPolicy?: string;
            aviso?: string;
            workload?: {
                targetHours: number;
                hoursPerSession: number;
                teachingDaysInRange: number;
                projectedHours: number;
                deltaHours: number;
                status: 'ok' | 'short' | 'surplus';
                message: string;
            } | null;
            paymentNote?: string;
            workloadScopeNote?: string;
            suggestedDiasPagamento?: number;
            paymentAdjustmentNote?: string;
            applyPaymentSuggestionRecommended?: boolean;
            teachingDaysTarget?: number;
            formulaLabel?: string;
            teachingDaysTargetSource?: string;
            motorResumo?: string;
            motorCourseName?: string;
            courseWorkloadHours?: number;
            hoursPerSession?: number;
        }>(`/acoes/${id}/calendario-resumo`).then(r => r.data),

    recalcularMotorPeriodo: (id: string) =>
        api
            .post<{
                previousDataFim: string;
                newDataFim: string;
                motorCourseId: string | null;
                motorCourseName: string | null;
                message: string;
                turmas: Array<{
                    classId: string;
                    classIdentifier: string;
                    courseName: string;
                    workloadHours: number;
                    teachingDaysTarget: number;
                    formulaLabel: string;
                    suggestedEndDate: string;
                    suggestedDiasPagamento: number;
                }>;
            }>(`/acoes/${id}/motor/recalcular`)
            .then(r => r.data),

    previewInstructorDias: (acaoId: string, classIds: string[]) =>
        api
            .post<{
                suggestedDiasPagamento: number;
                teachingDaysTarget: number | null;
                formulaLabel: string;
                workloadHours: number;
                courseNames: string[];
                note: string;
                turmas?: Array<{
                    classId: string;
                    classIdentifier: string;
                    courseName: string;
                    workloadHours: number;
                    teachingDaysTarget: number;
                    suggestedDiasPagamento: number;
                    formulaLabel: string;
                }>;
            }>(`/acoes/${acaoId}/instructor-dias-preview`, { classIds })
            .then(r => r.data),

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

    listTeachers: (acaoId: string) =>
        api.get<Array<{
            teacherId: string;
            userId: string;
            name: string;
            email: string;
            courses: { id: string; name: string }[];
            classIdentifiers: string[];
        }>>(`/acoes/${acaoId}/teachers`).then(r => r.data),

    assignTeacher: (acaoId: string, teacherUserId: string) =>
        api.post(`/acoes/${acaoId}/teachers/${teacherUserId}`).then(r => r.data),

    listTeacherPool: (acaoId: string) =>
        api.get(`/acoes/${acaoId}/teachers/pool`).then(r => r.data),

    assignDriver: (acaoId: string, driverUserId: string) =>
        api.post(`/acoes/${acaoId}/drivers/${driverUserId}`).then(r => r.data),

    assignDriverTurma: (acaoId: string, turmaId: string, driverUserId: string) =>
        api.post(`/acoes/${acaoId}/turmas/${turmaId}/driver/${driverUserId}`).then(r => r.data),

    listTurmasByCourse: (courseId: string, groupId?: string, excludeAcaoId?: string) =>
        api
            .get(`/acoes/turmas-by-course/${courseId}`, {
                params: {
                    ...(groupId ? { groupId } : {}),
                    ...(excludeAcaoId ? { excludeAcaoId } : {}),
                },
            })
            .then(r => r.data),

    /** Turmas do mesmo grupo do período (qualquer curso), exceto já vinculadas ou em outro período ativo. */
    listTurmasElegiveis: (acaoId: string) =>
        api.get(`/acoes/${acaoId}/turmas-elegiveis`).then(r => r.data),

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
    listFuncionarios: (
        acaoId: string,
        params?: { page?: number; limit?: number },
    ) => api.get(`/acoes/${acaoId}/funcionarios`, { params }).then(r => r.data),

    listFuncionariosDisponiveis: (
        acaoId: string,
        params?: { search?: string; role?: string; page?: number; limit?: number },
    ) =>
        api
            .get<{
                employees: Array<{
                    id: string;
                    name: string;
                    role: string;
                    dailyCost?: number | string | null;
                    specialty?: string | null;
                }>;
                total: number;
                page: number;
                limit: number;
                totalPages: number;
            }>(`/acoes/${acaoId}/funcionarios/disponiveis`, { params })
            .then(r => r.data),

    addFuncionario: (
        acaoId: string,
        data: { employeeId: string; valorDiaria?: number; diasTrabalhados?: number; classIds?: string[] },
    ) =>
        api
            .post<{
                diasTrabalhados?: number;
                diasCalculados?: number;
                roleEffects?: {
                    instructor?: { turmasNoPeriodo: number; novosVinculosTurma: number; message: string };
                    driver?: {
                        truckSynced: boolean;
                        turmasAtualizadas: number;
                        tripsGenerated: number;
                        tripsWarning?: string;
                        perClass?: Array<{
                            classId: string;
                            classIdentifier?: string;
                            generated: number;
                            message: string;
                        }>;
                        message: string;
                    };
                };
            }>(`/acoes/${acaoId}/funcionarios`, data)
            .then(r => r.data),

    regenerateFuncionarioTrips: (acaoId: string, employeeId: string) =>
        api
            .post<{
                tripsGenerated: number;
                tripsWarning?: string;
                perClass?: Array<{
                    classId: string;
                    classIdentifier?: string;
                    generated: number;
                    message: string;
                }>;
                message: string;
            }>(`/acoes/${acaoId}/funcionarios/${employeeId}/regenerate-trips`)
            .then(r => r.data),

    updateFuncionarioDias: (acaoId: string, employeeId: string, diasTrabalhados: number) =>
        api.patch(`/acoes/${acaoId}/funcionarios/${employeeId}/dias`, { diasTrabalhados }).then(r => r.data),

    removeFuncionario: (acaoId: string, employeeId: string) =>
        api.delete(`/acoes/${acaoId}/funcionarios/${employeeId}`).then(r => r.data),
};

export default api;
