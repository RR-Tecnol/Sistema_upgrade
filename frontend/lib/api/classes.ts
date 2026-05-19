import api from './client';

export interface Class {
    id: string;
    courseId: string;
    groupId: string;
    cityId: string;
    classIdentifier: string;
    startDate: string;
    endDate: string;
    period: 'MORNING' | 'AFTERNOON' | 'EVENING';
    startTime: string;
    endTime: string;
    vacancies: number;
    reserveSlots?: number;  // REQ-01: vagas de reserva para cotas governamentais
    truckId?: string;
    status: 'PLANNED' | 'ENROLLMENT_OPEN' | 'ENROLLMENT_CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    enrollmentOpenDate?: string;
    enrollmentCloseDate?: string;
    // ── Tipo de rota (REQ-ROUTE-2026) ──
    routeType?: 'INTERCIDADE' | 'INTRAURBANA';
    originCityId?: string;
    originCity?: { id: string; name: string; state: string };
    originNeighborhood?: string;
    destinationNeighborhood?: string;
    createdAt: string;
    updatedAt: string;
    course?: {
        id: string;
        name: string;
    };
    group?: {
        id: string;
        name: string;
    };
    city?: {
        id: string;
        name: string;
        state: string;
    };
    truck?: {
        id: string;
        identifier: string;
    };
    weekendPolicy?: 'FOLLOW_SCHEDULE' | 'WEEKDAYS_ONLY' | 'ALL_WEEKENDS' | 'SELECT_WEEKENDS';
    weekendExtraDates?: string[] | null;
    locationName?: string | null;
    locationAddress?: string | null;
    locationReference?: string | null;
    locationLatitude?: number | null;
    locationLongitude?: number | null;
    acaoTurmas?: {
        id: string;
        acaoId: string;
        turmaId: string;
        acao?: {
            id: string;
            nome: string;
            status: string;
            dataInicio: string;
            dataFim: string;
            cidadeNome?: string;
        };
    }[];
}

export interface CreateClassDto {
    courseId: string;
    groupId: string;
    cityId: string;
    classIdentifier: string;
    startDate: string;
    endDate: string;
    period: 'MORNING' | 'AFTERNOON' | 'EVENING';
    startTime: string;
    endTime: string;
    vacancies: number;
    reserveSlots?: number;  // REQ-01: vagas de reserva para cotas governamentais
    truckId?: string;
    status?: 'PLANNED' | 'ENROLLMENT_OPEN' | 'ENROLLMENT_CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    enrollmentOpenDate?: string;
    enrollmentCloseDate?: string;
    // ── Tipo de rota (REQ-ROUTE-2026) ──
    routeType?: 'INTERCIDADE' | 'INTRAURBANA';
    originCityId?: string;
    originNeighborhood?: string;
    destinationNeighborhood?: string;
    // ── Local físico (REQ-LOCAL-2026) — onde dentro da cidade a turma ocorre ──
    locationName?: string;
    locationAddress?: string;
    locationReference?: string;
    locationLatitude?: number;
    locationLongitude?: number;
    /** Política de fins de semana nos dias letivos previstos (frequência/certificado). */
    weekendPolicy?: 'FOLLOW_SCHEDULE' | 'WEEKDAYS_ONLY' | 'ALL_WEEKENDS' | 'SELECT_WEEKENDS';
    /** Com SELECT_WEEKENDS: datas YYYY-MM-DD (aula em fim de semana específico). */
    weekendExtraDates?: string[];
    /** Override de dias letivos (padrão: duração MA/PI do curso). */
    teachingDaysCount?: number;
    /** false = respeita endDate manual enviado pelo cliente. */
    useAutoEndDate?: boolean;
    /** Vincula turma ao período e herda motor letivo do período */
    acaoId?: string;
}

export interface PreviewClassEndDateDto {
    startDate: string;
    courseId: string;
    groupId: string;
    cityId: string;
    weekendPolicy: CreateClassDto['weekendPolicy'];
    teachingDaysCount?: number;
    weekendExtraDates?: string[];
    scheduleDays?: number[];
    manualEndDate?: string;
    startTime?: string;
    endTime?: string;
}

export interface CourseWorkloadAudit {
    targetHours: number;
    hoursPerSession: number;
    teachingDaysInRange: number;
    projectedHours: number;
    deltaHours: number;
    status: 'ok' | 'short' | 'surplus';
    message: string;
}

export interface OperationalHolidayEntry {
    date: string;
    reason: string;
    source: 'catalog_national' | 'catalog_state' | 'class_occurrence';
}

export interface OperationalSummary {
    courseName: string;
    stateCode: string;
    workloadHoursTarget: number;
    workloadScopeNote?: string;
    teachingDaysTarget: number;
    hoursPerSession: number;
    teachingDaysInRange: number;
    teachingDaysRemaining: number;
    projectedHours: number;
    suggestedEndDate: string;
    holidaysExcluded: OperationalHolidayEntry[];
    weekendPolicy: string;
    weekendPolicyLabel: string;
    calendarDaysInRange: number;
    paymentNote: string;
    suggestedDiasPagamento?: number;
    paymentAdjustmentNote?: string;
    applyPaymentSuggestionRecommended?: boolean;
    teachingDaysTargetSource?: string;
    formulaLabel?: string;
    messages: string[];
}

export interface PreviewClassEndDateResult {
    endDate: string;
    teachingDaysCount: number;
    teachingDaysTarget: number;
    calendarDays: number;
    weekendPolicy: string;
    manualEndDate?: string | null;
    manualMismatch?: boolean;
    teachingDaysInRange?: number;
    workload?: CourseWorkloadAudit | null;
    operationalSummary?: OperationalSummary | null;
}

export const classesApi = {
    getAll: async (filters?: {
        status?: string;
        courseId?: string;
        groupId?: string;
        cityId?: string;
        truckId?: string;
        search?: string;
        page?: number;
        limit?: number;
    }) => {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.courseId) params.append('courseId', filters.courseId);
        if (filters?.groupId) params.append('groupId', filters.groupId);
        if (filters?.cityId) params.append('cityId', filters.cityId);
        if (filters?.truckId) params.append('truckId', filters.truckId);
        if (filters?.search) params.append('search', filters.search);
        if (filters?.page) params.append('page', String(filters.page));
        if (filters?.limit) params.append('limit', String(filters.limit));

        const response = await api.get(`/classes?${params.toString()}`);
        return response.data;
    },

    getOne: async (id: string) => {
        const response = await api.get<Class>(`/classes/${id}`);
        return response.data;
    },

    previewEndDate: async (data: PreviewClassEndDateDto) => {
        const response = await api.post<PreviewClassEndDateResult>('/classes/preview-end-date', data);
        return response.data;
    },

    create: async (data: CreateClassDto) => {
        const response = await api.post<Class>('/classes', data);
        return response.data;
    },

    update: async (id: string, data: Partial<CreateClassDto>) => {
        const response = await api.patch<Class>(`/classes/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/classes/${id}`);
        return response.data;
    },

    updateStatus: async (id: string, status: string) => {
        const response = await api.patch(`/classes/${id}/status`, { status });
        return response.data;
    },

    getStatistics: async (id: string) => {
        const response = await api.get(`/classes/${id}/statistics`);
        return response.data;
    },
};
