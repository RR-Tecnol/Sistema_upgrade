import type { AcaoStatus } from '@/lib/api/acoes';
import type { LocationFieldsValue } from '@/components/admin/LocationFields';

export type CourseTurmaPlan = {
    courseId: string;
    linkedTurmaId: string | null;
    criarTurma: boolean;
};

export type TurmaCreateDraft = {
    cityId?: string;
    period: string;
    startTime: string;
    endTime: string;
    vacancies: string;
    startDate: string;
    endDate: string;
    weekendPolicy: string;
    weekendExtraDates: string[];
    classLocation: LocationFieldsValue;
};

export type WeekendPolicyKey = 'WEEKDAYS_ONLY' | 'FOLLOW_SCHEDULE' | 'ALL_WEEKENDS' | 'SELECT_WEEKENDS';

export type AcaoWizardFormState = {
    nome: string;
    cidadeNome: string;
    cidadeId: string;
    grupoId: string;
    carretaId: string;
    motorCourseId: string;
    period: string;
    startTime: string;
    endTime: string;
    weekendPolicy: WeekendPolicyKey;
    weekendExtraDates: string[];
    teachingDaysCountOverride: string;
    calendarReady: boolean;
    endDateManual: boolean;
    dataInicio: string;
    dataFim: string;
    localExecucao: string;
    distanciaKm: string;
    precoCombustivelL: string;
    autonomiaKmL: string;
    status: AcaoStatus;
    permitirInscricoes: boolean;
    selectedCourseIds: string[];
    coursePlans: Record<string, CourseTurmaPlan>;
    driverUserIds: string[];
    turmaDrafts: Record<string, TurmaCreateDraft>;
};

export const INITIAL_ACAO_WIZARD_FORM: AcaoWizardFormState = {
    nome: '',
    cidadeNome: '',
    cidadeId: '',
    grupoId: '',
    carretaId: '',
    motorCourseId: '',
    period: 'MORNING',
    startTime: '07:00',
    endTime: '12:00',
    weekendPolicy: 'WEEKDAYS_ONLY',
    weekendExtraDates: [],
    teachingDaysCountOverride: '',
    calendarReady: false,
    endDateManual: false,
    dataInicio: '',
    dataFim: '',
    localExecucao: '',
    distanciaKm: '',
    precoCombustivelL: '',
    autonomiaKmL: '4',
    status: 'PLANEJADA',
    permitirInscricoes: true,
    selectedCourseIds: [],
    coursePlans: {},
    driverUserIds: [],
    turmaDrafts: {},
};

export function defaultTurmaDraft(dataInicio: string, dataFim: string): TurmaCreateDraft {
    return {
        period: 'MORNING',
        startTime: '07:00',
        endTime: '12:00',
        vacancies: '30',
        startDate: dataInicio,
        endDate: dataFim,
        weekendPolicy: 'WEEKDAYS_ONLY',
        weekendExtraDates: [],
        classLocation: {
            name: null,
            address: null,
            reference: null,
            latitude: null,
            longitude: null,
        },
    };
}
