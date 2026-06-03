import type { PreviewClassEndDateDto } from '@/lib/api/classes';
import type { LocationFieldsValue } from '@/components/admin/LocationFields';
import type { AcaoWizardFormState, CourseTurmaPlan } from './acao-wizard-types';

/** Turma retornada por GET /acoes/turmas-by-course */
export type TurmaListRow = {
    id: string;
    classIdentifier: string;
    courseId?: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    period?: string;
    weekendPolicy?: string;
    weekendExtraDates?: unknown;
    cityId?: string;
    truckId?: string | null;
    locationName?: string | null;
    locationAddress?: string | null;
    locationReference?: string | null;
    locationLatitude?: number | null;
    locationLongitude?: number | null;
    city?: { id: string; name: string; state: string };
    course?: { id?: string; name?: string };
};

export function toIsoDateOnly(value: string | Date): string {
    if (typeof value === 'string') return value.slice(0, 10);
    return value.toISOString().slice(0, 10);
}

export function parseWeekendExtraDates(raw: unknown): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d));
    return [];
}

export function findTurmaInCatalog(
    turmasByCourse: Record<string, TurmaListRow[]>,
    courseId: string,
    turmaId: string | null | undefined,
): TurmaListRow | null {
    if (!turmaId) return null;
    return (turmasByCourse[courseId] || []).find(t => t.id === turmaId) ?? null;
}

/** Turmas já escolhidas no passo 1 (não marcadas para criar nova). */
export function collectLinkedTurmas(
    form: Pick<AcaoWizardFormState, 'selectedCourseIds' | 'coursePlans'>,
    turmasByCourse: Record<string, TurmaListRow[]>,
): TurmaListRow[] {
    const out: TurmaListRow[] = [];
    for (const courseId of form.selectedCourseIds) {
        const plan = form.coursePlans[courseId];
        if (!plan || plan.criarTurma || !plan.linkedTurmaId) continue;
        const turma = findTurmaInCatalog(turmasByCourse, courseId, plan.linkedTurmaId);
        if (turma) out.push(turma);
    }
    return out;
}

export type PeriodHydration = {
    cidadeNome: string;
    cidadeId: string;
    dataInicio: string;
    dataFim: string;
    carretaId?: string;
    localExecucao: string;
    location: LocationFieldsValue;
};

/** Agrega cidade/datas/local das turmas vinculadas para o passo 2. */
export function buildPeriodHydrationFromLinkedTurmas(turmas: TurmaListRow[]): PeriodHydration | null {
    if (turmas.length === 0) return null;

    const cityIds = [...new Set(turmas.map(t => t.cityId || t.city?.id).filter(Boolean))];
    const first = turmas[0];
    const city = first.city;
    if (!city && !first.cityId) return null;

    const starts = turmas.map(t => toIsoDateOnly(t.startDate));
    const ends = turmas.map(t => toIsoDateOnly(t.endDate));
    const dataInicio = starts.sort()[0];
    const dataFim = ends.sort().reverse()[0];

    const truckIds = [...new Set(turmas.map(t => t.truckId).filter(Boolean))] as string[];

    const locSource = turmas.find(t => t.locationName || t.locationAddress) ?? first;

    return {
        cidadeNome: city ? `${city.name}, ${city.state}` : '',
        cidadeId: (city?.id || first.cityId || cityIds[0] || '') as string,
        dataInicio,
        dataFim,
        carretaId: truckIds.length === 1 ? truckIds[0] : undefined,
        localExecucao: locSource.locationName || '',
        location: {
            name: locSource.locationName ?? null,
            address: locSource.locationAddress ?? null,
            reference: locSource.locationReference ?? null,
            latitude: locSource.locationLatitude ?? null,
            longitude: locSource.locationLongitude ?? null,
        },
    };
}

/** Multicurso: mesma cidade operacional; alerta se carretas das turmas divergem. */
export function validateMulticursoLinkedTurmas(
    form: Pick<AcaoWizardFormState, 'selectedCourseIds' | 'coursePlans'>,
    turmasByCourse: Record<string, TurmaListRow[]>,
): string | null {
    const linked = collectLinkedTurmas(form, turmasByCourse);
    if (linked.length < 2) return null;

    const cityIds = new Set(linked.map(t => t.cityId || t.city?.id).filter(Boolean));
    if (cityIds.size > 1) {
        return 'Multicurso: as turmas vinculadas precisam ser da mesma cidade. Ajuste os vínculos ou crie turmas novas.';
    }

    const trucks = new Set(linked.map(t => t.truckId).filter(Boolean));
    if (trucks.size > 1) {
        return 'Multicurso: turmas vinculadas usam carretas diferentes. Escolha turmas compatíveis ou defina a carreta no passo 2.';
    }

    return null;
}

export function buildPreviewParamsFromTurma(
    turma: TurmaListRow,
    courseId: string,
    groupId: string,
): PreviewClassEndDateDto {
    const cityId = turma.cityId || turma.city?.id || '';
    return {
        startDate: toIsoDateOnly(turma.startDate),
        courseId,
        groupId,
        cityId,
        weekendPolicy: (turma.weekendPolicy as PreviewClassEndDateDto['weekendPolicy']) || 'WEEKDAYS_ONLY',
        weekendExtraDates: parseWeekendExtraDates(turma.weekendExtraDates),
        startTime: turma.startTime || '07:00',
        endTime: turma.endTime || '12:00',
    };
}

export function motorHintFromTurma(turma: TurmaListRow | null): string {
    if (!turma) {
        return 'Estimativa com dias letivos (úteis + feriados). Defina turno ao criar turma ou vincule uma existente.';
    }
    return `Motor da turma ${turma.classIdentifier}: ${turma.startTime}–${turma.endTime}, política ${turma.weekendPolicy || 'WEEKDAYS_ONLY'}.`;
}

export function coursePlansSignature(plans: Record<string, CourseTurmaPlan>): string {
    return Object.entries(plans)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([cid, p]) => `${cid}:${p.linkedTurmaId ?? ''}:${p.criarTurma ? 1 : 0}`)
        .join('|');
}
