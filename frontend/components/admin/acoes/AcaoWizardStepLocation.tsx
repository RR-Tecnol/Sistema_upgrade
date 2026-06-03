'use client';

import { useMemo } from 'react';
import { LocationFields, type LocationFieldsValue } from '@/components/admin/LocationFields';
import type { Course } from '@/lib/api/courses';
import { CidadeAutocomplete } from './CidadeAutocomplete';
import { AcaoWizardPeriodMotor } from './AcaoWizardPeriodMotor';
import { WIZARD_INPUT, WIZARD_LABEL, WIZARD_SEC_TITLE } from './acao-wizard-styles';
import type { AcaoWizardFormState } from './acao-wizard-types';

type TruckRow = { id: string; identifier: string; licensePlate?: string };

export function AcaoWizardStepLocation({
    form,
    setForm,
    carretas,
    cursosFiltrados,
    groupState,
    acaoLocation,
    setAcaoLocation,
    fieldErrors = {},
}: {
    form: AcaoWizardFormState;
    setForm: React.Dispatch<React.SetStateAction<AcaoWizardFormState>>;
    carretas: TruckRow[];
    cursosFiltrados: Course[];
    groupState?: string;
    acaoLocation: LocationFieldsValue;
    setAcaoLocation: (v: LocationFieldsValue) => void;
    fieldErrors?: Record<string, string>;
}) {
    const carretaLabel = useMemo(() => {
        const c = carretas.find(t => t.id === form.carretaId);
        return c ? `${c.identifier} — ${c.licensePlate ?? ''}` : '';
    }, [carretas, form.carretaId]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={WIZARD_SEC_TITLE}>📍 Localização e período</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                    <label style={WIZARD_LABEL}>
                        Cidade * <span style={{ fontSize: '0.62rem', color: '#9CA3AF', fontWeight: 400 }}>— digite ou selecione</span>
                    </label>
                    <CidadeAutocomplete
                        value={form.cidadeNome}
                        cidadeId={form.cidadeId}
                        onChange={(nome, id) =>
                            setForm(f => ({
                                ...f,
                                cidadeNome: nome,
                                cidadeId: id,
                                calendarReady: false,
                                dataFim: '',
                            }))
                        }
                    />
                    {fieldErrors.cidade && (
                        <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: 6, fontWeight: 600 }}>{fieldErrors.cidade}</p>
                    )}
                </div>
                <div>
                    <label style={WIZARD_LABEL}>
                        Carreta <span style={{ color: '#FFD600' }}>*</span>
                    </label>
                    <select
                        style={{ ...WIZARD_INPUT, cursor: 'pointer' }}
                        value={form.carretaId}
                        onChange={e => setForm(f => ({ ...f, carretaId: e.target.value }))}
                        required
                    >
                        <option value="">Selecione a carreta do período</option>
                        {carretas.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.identifier} — {c.licensePlate}
                            </option>
                        ))}
                    </select>
                    <p style={{ fontSize: '0.68rem', color: '#6B7280', marginTop: 6, lineHeight: 1.4 }}>
                        Define qual carreta o motorista utilizará neste período (obrigatório).
                    </p>
                    {fieldErrors.carretaId && (
                        <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: 6, fontWeight: 600 }}>{fieldErrors.carretaId}</p>
                    )}
                    {form.carretaId && carretaLabel && (
                        <p style={{ fontSize: '0.68rem', color: '#065F46', marginTop: 4, fontWeight: 600 }}>✓ {carretaLabel}</p>
                    )}
                </div>
            </div>

            {form.cidadeNome.trim() && (
                <div>
                    <div style={{ ...WIZARD_SEC_TITLE, marginBottom: 12 }}>📌 Local físico exato</div>
                    <LocationFields
                        value={acaoLocation}
                        onChange={setAcaoLocation}
                        cityContext={`${form.cidadeNome.trim()}, Brasil`}
                    />
                    <p style={{ fontSize: '0.68rem', color: '#6B7280', marginTop: 8, lineHeight: 1.5 }}>
                        Estes dados serão herdados pelas turmas vinculadas a este período.
                    </p>
                </div>
            )}

            <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 16 }}>
                <div style={{ ...WIZARD_SEC_TITLE, marginBottom: 12 }}>📅 Motor letivo (igual Nova Turma)</div>
                <AcaoWizardPeriodMotor
                    form={form}
                    setForm={setForm}
                    cursos={cursosFiltrados}
                    groupState={groupState}
                    grupoId={form.grupoId}
                    cidadeId={form.cidadeId}
                    errors={fieldErrors}
                />
            </div>
        </div>
    );
}
