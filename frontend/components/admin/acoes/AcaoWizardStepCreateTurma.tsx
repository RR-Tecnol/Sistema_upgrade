'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api/acoes';
import { classesApi, type CourseWorkloadAudit } from '@/lib/api/classes';
import { LocationFields, type LocationFieldsValue } from '@/components/admin/LocationFields';
import { WIZARD_INPUT, WIZARD_LABEL, WIZARD_SEC_TITLE } from './acao-wizard-styles';
import type { TurmaCreateDraft } from './acao-wizard-types';

type CityRow = { id: string; name: string; state: string };

const PERIOD_PRESETS: Record<string, { startTime: string; endTime: string }> = {
    MORNING: { startTime: '07:00', endTime: '12:00' },
    AFTERNOON: { startTime: '13:00', endTime: '18:00' },
    EVENING: { startTime: '19:00', endTime: '22:00' },
};

export function AcaoWizardStepCreateTurma({
    courseId,
    courseName,
    grupoId,
    cidadeId,
    cidadeNome,
    draft,
    onDraftChange,
    inheritedLocation,
}: {
    courseId: string;
    courseName: string;
    grupoId: string;
    cidadeId?: string;
    cidadeNome?: string;
    draft: TurmaCreateDraft;
    onDraftChange: (d: TurmaCreateDraft) => void;
    inheritedLocation?: LocationFieldsValue;
}) {
    const [cidades, setCidades] = useState<CityRow[]>([]);
    const [cargaHoraria, setCargaHoraria] = useState<CourseWorkloadAudit | null>(null);
    const previewRequestId = useRef(0);

    useEffect(() => {
        api.get('/cities')
            .then(r => {
                const list = Array.isArray(r.data) ? r.data : r.data?.data || [];
                setCidades(list);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        const city = cidadeId || draft.cityId;
        if (!courseId || !city || !draft.startDate) {
            setCargaHoraria(null);
            return;
        }
        const requestId = ++previewRequestId.current;
        const timer = setTimeout(() => {
            classesApi
                .previewEndDate({
                    startDate: draft.startDate,
                    courseId,
                    groupId: grupoId,
                    cityId: city,
                    weekendPolicy: (draft.weekendPolicy || 'WEEKDAYS_ONLY') as 'WEEKDAYS_ONLY',
                    weekendExtraDates: draft.weekendExtraDates?.length ? draft.weekendExtraDates : undefined,
                    manualEndDate: draft.endDate || undefined,
                    startTime: draft.startTime,
                    endTime: draft.endTime,
                })
                .then(res => {
                    if (requestId !== previewRequestId.current) return;
                    if (res.endDate && !draft.endDate) {
                        onDraftChange({ ...draft, endDate: res.endDate });
                    }
                    setCargaHoraria(res.workload?.status && res.workload.status !== 'ok' ? res.workload : null);
                })
                .catch(() => {
                    if (requestId === previewRequestId.current) setCargaHoraria(null);
                });
        }, 280);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        courseId,
        grupoId,
        cidadeId,
        draft.startDate,
        draft.endDate,
        draft.startTime,
        draft.endTime,
        draft.weekendPolicy,
        draft.weekendExtraDates?.join(','),
    ]);

    const set = (patch: Partial<TurmaCreateDraft & { cityId?: string }>) => {
        onDraftChange({ ...draft, ...patch });
    };

    const selectPeriod = (period: string) => {
        const preset = PERIOD_PRESETS[period];
        onDraftChange({
            ...draft,
            period,
            startTime: preset?.startTime ?? draft.startTime,
            endTime: preset?.endTime ?? draft.endTime,
        });
    };

    const effectiveCityId = cidadeId || (draft as TurmaCreateDraft & { cityId?: string }).cityId || '';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={WIZARD_SEC_TITLE}>🎓 Turma: {courseName}</div>
            <p style={{ fontSize: '0.78rem', color: '#065F46', margin: 0, padding: '8px 12px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0' }}>
                Período já criado. Defina a turma que será vinculada e publicada com inscrições abertas.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                    <label style={WIZARD_LABEL}>Cidade *</label>
                    <select
                        style={{ ...WIZARD_INPUT, cursor: 'pointer' }}
                        value={effectiveCityId}
                        onChange={e => set({ cityId: e.target.value } as Partial<TurmaCreateDraft>)}
                        required
                        disabled={!!cidadeId}
                    >
                        <option value="">Selecione...</option>
                        {cidades.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name} — {c.state}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label style={WIZARD_LABEL}>Turno</label>
                    <select
                        style={{ ...WIZARD_INPUT, cursor: 'pointer' }}
                        value={draft.period}
                        onChange={e => selectPeriod(e.target.value)}
                    >
                        <option value="MORNING">Manhã</option>
                        <option value="AFTERNOON">Tarde</option>
                        <option value="EVENING">Noite</option>
                    </select>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                    <label style={WIZARD_LABEL}>Início</label>
                    <input type="time" style={WIZARD_INPUT} value={draft.startTime} onChange={e => set({ startTime: e.target.value })} />
                </div>
                <div>
                    <label style={WIZARD_LABEL}>Fim</label>
                    <input type="time" style={WIZARD_INPUT} value={draft.endTime} onChange={e => set({ endTime: e.target.value })} />
                </div>
                <div>
                    <label style={WIZARD_LABEL}>Vagas *</label>
                    <input
                        type="number"
                        min={1}
                        max={500}
                        style={WIZARD_INPUT}
                        value={draft.vacancies}
                        onChange={e => set({ vacancies: e.target.value })}
                        required
                    />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                    <label style={WIZARD_LABEL}>Data de Início *</label>
                    <input
                        type="date"
                        style={WIZARD_INPUT}
                        value={draft.startDate}
                        onChange={e => set({ startDate: e.target.value })}
                        required
                    />
                </div>
                <div>
                    <label style={WIZARD_LABEL}>Data de Fim *</label>
                    <input
                        type="date"
                        style={WIZARD_INPUT}
                        value={draft.endDate}
                        onChange={e => set({ endDate: e.target.value })}
                        required
                    />
                    {cargaHoraria && (
                        <p
                            role="alert"
                            style={{
                                fontSize: '0.65rem',
                                marginTop: 6,
                                fontWeight: 600,
                                color: cargaHoraria.status === 'short' ? '#991B1B' : '#92400E',
                            }}
                        >
                            {cargaHoraria.message}
                        </p>
                    )}
                </div>
            </div>

            <div>
                <div style={{ ...WIZARD_SEC_TITLE, marginBottom: 8, color: '#065F46' }}>📌 Local físico</div>
                <LocationFields
                    value={draft.classLocation}
                    onChange={loc => set({ classLocation: loc })}
                    cityContext={cidadeNome ? `${cidadeNome}, Brasil` : undefined}
                />
                {(inheritedLocation?.name || inheritedLocation?.address) && (
                    <p style={{ fontSize: '0.68rem', color: '#059669', marginTop: 6 }}>Herdado do período — pode editar.</p>
                )}
            </div>
        </div>
    );
}

/** Cria turma no backend e vincula ao período */
export async function createTurmaForAcao(opts: {
    acaoId: string;
    courseId: string;
    grupoId: string;
    cityId: string;
    draft: TurmaCreateDraft;
    courseName: string;
    cityState?: string;
}): Promise<string> {
    const { acoesApi } = await import('@/lib/api/acoes');
    const now = new Date();
    const classIdentifier = `${opts.courseName.slice(0, 4).toUpperCase()}-${(opts.cityState || 'XX').slice(0, 2)}-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const classRes = await api.post('/classes', {
        courseId: opts.courseId,
        groupId: opts.grupoId,
        cityId: opts.cityId,
        classIdentifier,
        startDate: opts.draft.startDate,
        endDate: opts.draft.endDate,
        period: opts.draft.period,
        startTime: opts.draft.startTime,
        endTime: opts.draft.endTime,
        vacancies: Number(opts.draft.vacancies),
        reserveSlots: 4,
        status: 'ENROLLMENT_OPEN',
        locationName: opts.draft.classLocation.name || undefined,
        locationAddress: opts.draft.classLocation.address || undefined,
        locationReference: opts.draft.classLocation.reference || undefined,
        locationLatitude: opts.draft.classLocation.latitude ?? undefined,
        locationLongitude: opts.draft.classLocation.longitude ?? undefined,
        weekendPolicy: opts.draft.weekendPolicy || 'WEEKDAYS_ONLY',
        weekendExtraDates: opts.draft.weekendExtraDates?.length ? opts.draft.weekendExtraDates : undefined,
        useAutoEndDate: true,
    });
    const classId = classRes.data?.id as string;
    if (classId) {
        await acoesApi.addTurma(opts.acaoId, classId);
    }
    return classId;
}
