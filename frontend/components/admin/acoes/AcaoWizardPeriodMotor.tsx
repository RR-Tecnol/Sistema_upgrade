'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { TeachingCalendarMotorPanel } from '@/components/admin/TeachingCalendarMotorPanel';
import { WeekendExtraDatesEditor } from '@/components/admin/WeekendExtraDatesEditor';
import { classesApi, type PreviewClassEndDateResult } from '@/lib/api/classes';
import type { Course } from '@/lib/api/courses';
import { getCourseContractForState } from '@/lib/course-contract';
import { TEACHING_PERIOD_LIST, buildFormulaLabel } from '@/lib/teaching-period-presets';
import { toast } from '@/components/ui/Toast';
import { WIZARD_INPUT, WIZARD_LABEL } from './acao-wizard-styles';
import type { AcaoWizardFormState, WeekendPolicyKey } from './acao-wizard-types';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const SEC_TITLE: React.CSSProperties = {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: '0.68rem',
    fontWeight: 800,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: '0.5rem',
};

type Props = {
    form: AcaoWizardFormState;
    setForm: React.Dispatch<React.SetStateAction<AcaoWizardFormState>>;
    cursos: Course[];
    groupState?: string;
    grupoId: string;
    cidadeId: string;
    errors?: Record<string, string>;
};

export function AcaoWizardPeriodMotor({ form, setForm, cursos, groupState, grupoId, cidadeId, errors = {} }: Props) {
    const previewRequestId = useRef(0);
    const [previewFull, setPreviewFull] = useState<PreviewClassEndDateResult | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [motorOpen, setMotorOpen] = useState(true);

    const selectedCourse = useMemo(
        () => cursos.find(c => c.id === form.motorCourseId) ?? null,
        [cursos, form.motorCourseId],
    );

    const courseContract = useMemo(() => {
        if (!selectedCourse || !groupState) return null;
        return getCourseContractForState(selectedCourse, groupState);
    }, [selectedCourse, groupState]);

    const courseContractHint = courseContract
        ? buildFormulaLabel(courseContract.workloadHours, form.startTime, form.endTime)
        : '';

    const invalidateMotorPreview = useCallback(() => {
        previewRequestId.current += 1;
        setPreviewFull(null);
        setPreviewError(null);
        setForm(f => ({ ...f, endDateManual: false }));
    }, [setForm]);

    const selectPeriod = (p: (typeof TEACHING_PERIOD_LIST)[0]) => {
        invalidateMotorPreview();
        setForm(f => ({
            ...f,
            period: p.period,
            startTime: p.startTime,
            endTime: p.endTime,
            dataFim: '',
        }));
    };

    const parseExtraWeekendDates = useCallback(
        () => form.weekendExtraDates.filter(s => ISO_DAY.test(s)),
        [form.weekendExtraDates],
    );

    const calendarReady = form.calendarReady;

    useEffect(() => {
        if (!calendarReady || !form.dataInicio || !form.motorCourseId || !grupoId || !cidadeId) {
            setPreviewFull(null);
            setPreviewError(null);
            return;
        }
        const override = form.teachingDaysCountOverride.trim();
        const teachingDaysCount = override ? Number(override) : undefined;
        const requestId = ++previewRequestId.current;
        const snapshot = {
            startDate: form.dataInicio,
            startTime: form.startTime,
            endTime: form.endTime,
            manualEndDate: form.endDateManual ? form.dataFim : undefined,
        };
        const timer = setTimeout(async () => {
            setPreviewLoading(true);
            setPreviewError(null);
            try {
                const res = await classesApi.previewEndDate({
                    startDate: snapshot.startDate,
                    courseId: form.motorCourseId,
                    groupId: grupoId,
                    cityId: cidadeId,
                    weekendPolicy: form.weekendPolicy,
                    teachingDaysCount: Number.isFinite(teachingDaysCount) && teachingDaysCount! > 0 ? teachingDaysCount : undefined,
                    weekendExtraDates: parseExtraWeekendDates(),
                    manualEndDate: snapshot.manualEndDate,
                    startTime: snapshot.startTime,
                    endTime: snapshot.endTime,
                });
                if (requestId !== previewRequestId.current) return;
                setPreviewFull(res);
                if (!snapshot.manualEndDate && res.endDate) {
                    setForm(f => (f.dataFim === res.endDate ? f : { ...f, dataFim: res.endDate! }));
                }
            } catch (err: unknown) {
                if (requestId !== previewRequestId.current) return;
                setPreviewFull(null);
                const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
                const text = Array.isArray(msg) ? msg.join(' ') : msg || 'Não foi possível calcular o término.';
                setPreviewError(text);
                toast.error(text);
            } finally {
                if (requestId === previewRequestId.current) setPreviewLoading(false);
            }
        }, 400);
        return () => {
            clearTimeout(timer);
            previewRequestId.current += 1;
        };
    }, [
        calendarReady,
        form.dataInicio,
        form.motorCourseId,
        grupoId,
        cidadeId,
        form.weekendPolicy,
        form.teachingDaysCountOverride,
        form.startTime,
        form.endTime,
        form.endDateManual,
        form.endDateManual ? form.dataFim : null,
        form.weekendExtraDates,
        parseExtraWeekendDates,
        setForm,
    ]);

    const endPreview = previewFull
        ? {
              endDate: previewFull.endDate,
              teachingDaysCount: previewFull.teachingDaysCount,
              calendarDays: previewFull.calendarDays,
              manualMismatch: previewFull.manualMismatch,
          }
        : null;

    if (!grupoId || !cidadeId) {
        return (
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#6B7280', lineHeight: 1.5 }}>
                Selecione o grupo (passo 1) e a cidade para liberar o motor de calendário letivo.
            </p>
        );
    }

    return (
        <div style={{ display: 'grid', gap: '1.1rem' }}>
            <div>
                <label style={WIZARD_LABEL}>
                    Curso de referência (motor) <span style={{ color: '#FFD600' }}>*</span>
                </label>
                <select
                    style={{ ...WIZARD_INPUT, cursor: 'pointer' }}
                    value={form.motorCourseId}
                    onChange={e => {
                        invalidateMotorPreview();
                        setForm(f => ({
                            ...f,
                            motorCourseId: e.target.value,
                            calendarReady: false,
                            dataFim: '',
                        }));
                    }}
                >
                    <option value="">Selecione o curso da UF do grupo</option>
                    {cursos.map(c => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
                {errors.motorCourseId && (
                    <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: 6, fontWeight: 600 }}>{errors.motorCourseId}</p>
                )}
            </div>

            {courseContract && selectedCourse && (
                <div
                    style={{
                        padding: '0.75rem 1rem',
                        borderRadius: 10,
                        background: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        fontSize: '0.75rem',
                        color: '#1E40AF',
                        lineHeight: 1.45,
                    }}
                >
                    Motor em <strong>{selectedCourse.name}</strong> ({courseContract.stateCode}): meta{' '}
                    <strong>{courseContract.workloadHours}h</strong> — encontros letivos = horas ÷ turno ({form.startTime}–
                    {form.endTime}). Dias e data fim calculados aqui (mesmo motor de Nova Turma).
                </div>
            )}

            <div style={{ padding: '1rem 1.1rem', borderRadius: 12, background: '#FFFDE7', border: '1px solid #FEF08A' }}>
                <div style={SEC_TITLE}>1. Calendário letivo (personalizado)</div>
                <p style={{ fontSize: '0.72rem', color: '#78350F', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
                    Política de fins de semana + feriados do catálogo. O término usa <strong>dias letivos</strong>, não dias corridos.
                </p>
                <label style={WIZARD_LABEL}>Política de fins de semana</label>
                <select
                    style={{ ...WIZARD_INPUT, cursor: 'pointer' }}
                    value={form.weekendPolicy}
                    onChange={e => {
                        const policy = e.target.value as WeekendPolicyKey;
                        invalidateMotorPreview();
                        setForm(f => ({
                            ...f,
                            weekendPolicy: policy,
                            calendarReady: false,
                            endDateManual: false,
                            weekendExtraDates:
                                policy === 'SELECT_WEEKENDS' && f.weekendExtraDates.length === 0
                                    ? ['']
                                    : policy === 'SELECT_WEEKENDS'
                                      ? f.weekendExtraDates
                                      : [],
                        }));
                    }}
                >
                    <option value="WEEKDAYS_ONLY">Só dias úteis (seg–sex)</option>
                    <option value="FOLLOW_SCHEDULE">Seguir horário cadastrado da turma</option>
                    <option value="ALL_WEEKENDS">Todos os sábados e domingos</option>
                    <option value="SELECT_WEEKENDS">Fins de semana em datas específicas</option>
                </select>
                {form.weekendPolicy === 'SELECT_WEEKENDS' && (
                    <WeekendExtraDatesEditor
                        dates={form.weekendExtraDates}
                        inputStyle={WIZARD_INPUT}
                        labelStyle={WIZARD_LABEL}
                        onChange={dates => setForm(f => ({ ...f, weekendExtraDates: dates }))}
                        onDirty={() => {
                            setForm(f => ({ ...f, calendarReady: false, endDateManual: false }));
                            invalidateMotorPreview();
                        }}
                    />
                )}
                {selectedCourse && courseContract && (
                    <div style={{ marginTop: '0.75rem' }}>
                        <label style={WIZARD_LABEL}>Dias letivos (opcional — override)</label>
                        <input
                            type="number"
                            min={1}
                            style={WIZARD_INPUT}
                            placeholder={`Automático: ${buildFormulaLabel(courseContract.workloadHours, form.startTime, form.endTime).split('=').pop()?.trim() || 'motor'}`}
                            value={form.teachingDaysCountOverride}
                            onChange={e => {
                                setForm(f => ({
                                    ...f,
                                    teachingDaysCountOverride: e.target.value,
                                    calendarReady: false,
                                    endDateManual: false,
                                }));
                                setPreviewFull(null);
                            }}
                        />
                    </div>
                )}
                {errors.calendarPolicy && (
                    <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: '0.5rem', fontWeight: 600 }}>{errors.calendarPolicy}</p>
                )}
                <button
                    type="button"
                    onClick={() => {
                        setPreviewError(null);
                        setForm(f => ({
                            ...f,
                            calendarReady: true,
                            dataInicio: f.dataInicio || new Date().toISOString().slice(0, 10),
                        }));
                    }}
                    style={{
                        marginTop: '0.85rem',
                        padding: '0.55rem 1.1rem',
                        borderRadius: 8,
                        border: 'none',
                        background: calendarReady ? '#059669' : '#B89B00',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                    }}
                >
                    {calendarReady ? '✓ Calendário confirmado' : 'Confirmar calendário e liberar horários'}
                </button>
            </div>

            <div style={{ display: 'grid', gap: '1.1rem', opacity: calendarReady ? 1 : 0.45, pointerEvents: calendarReady ? 'auto' : 'none' }}>
                <p
                    style={{
                        fontSize: '0.78rem',
                        color: '#6B7280',
                        margin: 0,
                        padding: '0.6rem 0.9rem',
                        background: '#F9FAFB',
                        borderRadius: 8,
                        borderLeft: '3px solid #FFD600',
                    }}
                >
                    {previewLoading
                        ? 'Calculando término…'
                        : endPreview
                          ? `${endPreview.teachingDaysCount} dias letivos → término ${new Date(endPreview.endDate + 'T12:00:00').toLocaleDateString('pt-BR')} (${endPreview.calendarDays} dias calendário)`
                          : 'Confirme o calendário acima e informe a data de início'}
                </p>

                <div>
                    <label style={WIZARD_LABEL}>
                        Período das aulas <span style={{ color: '#FFD600' }}>*</span>
                    </label>
                    {courseContractHint && (
                        <p style={{ fontSize: '0.72rem', color: '#1D4ED8', margin: '0 0 0.75rem', fontWeight: 600, lineHeight: 1.45 }}>
                            Contrato estimado: {courseContractHint}
                        </p>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.65rem' }}>
                        {TEACHING_PERIOD_LIST.map(p => {
                            const sel = form.period === p.period;
                            return (
                                <button
                                    key={p.period}
                                    type="button"
                                    onClick={() => selectPeriod(p)}
                                    style={{
                                        padding: '0.85rem',
                                        borderRadius: 12,
                                        border: `2px solid ${sel ? p.color : '#E5E7EB'}`,
                                        background: sel ? p.bg : '#F9FAFB',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <div style={{ fontSize: '1.35rem', marginBottom: '0.25rem' }}>{p.icon}</div>
                                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: sel ? p.color : '#374151' }}>{p.label}</div>
                                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', color: sel ? p.color : '#9CA3AF', marginTop: '0.2rem' }}>
                                        {p.timeRange}
                                    </div>
                                    {sel && <CheckCircleIcon style={{ width: 14, height: 14, color: p.color, margin: '0.35rem auto 0' }} />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <button
                        type="button"
                        onClick={() => setMotorOpen(o => !o)}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            borderRadius: 10,
                            border: '2px solid #BFDBFE',
                            background: motorOpen ? '#EFF6FF' : '#F8FAFC',
                            cursor: 'pointer',
                            textAlign: 'left',
                        }}
                    >
                        <span style={{ fontFamily: 'Orbitron', fontSize: '0.68rem', fontWeight: 800, color: '#1D4ED8', letterSpacing: '0.08em' }}>
                            RESUMO OPERACIONAL DO MOTOR
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: '#6B7280' }}>
                            {!motorOpen && previewFull?.operationalSummary?.suggestedEndDate && (
                                <span style={{ fontWeight: 600 }}>
                                    Término:{' '}
                                    {new Date(previewFull.operationalSummary.suggestedEndDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                                </span>
                            )}
                            {previewLoading && <span>Calculando…</span>}
                            {motorOpen ? <ChevronUpIcon style={{ width: 18, height: 18, color: '#1D4ED8' }} /> : <ChevronDownIcon style={{ width: 18, height: 18, color: '#1D4ED8' }} />}
                        </span>
                    </button>
                    {motorOpen && (
                        <div style={{ marginTop: '0.65rem' }}>
                            <TeachingCalendarMotorPanel
                                preview={previewFull}
                                loading={previewLoading}
                                manualEndDate={form.endDateManual ? form.dataFim : undefined}
                            />
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                        <label style={WIZARD_LABEL}>Horário de início</label>
                        <input
                            type="time"
                            style={WIZARD_INPUT}
                            value={form.startTime}
                            onChange={e => {
                                invalidateMotorPreview();
                                setForm(f => ({ ...f, startTime: e.target.value, dataFim: '' }));
                            }}
                        />
                    </div>
                    <div>
                        <label style={WIZARD_LABEL}>Horário de término</label>
                        <input
                            type="time"
                            style={WIZARD_INPUT}
                            value={form.endTime}
                            onChange={e => {
                                invalidateMotorPreview();
                                setForm(f => ({ ...f, endTime: e.target.value, dataFim: '' }));
                            }}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                        <label style={WIZARD_LABEL}>
                            Data de início <span style={{ color: '#FFD600' }}>*</span>
                        </label>
                        <input
                            type="date"
                            style={WIZARD_INPUT}
                            value={form.dataInicio}
                            onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))}
                        />
                        {errors.dataInicio && (
                            <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: 6, fontWeight: 600 }}>{errors.dataInicio}</p>
                        )}
                    </div>
                    <div>
                        <label style={WIZARD_LABEL}>
                            Data de fim <span style={{ color: '#FFD600' }}>*</span>
                        </label>
                        <input
                            type="date"
                            style={WIZARD_INPUT}
                            value={form.dataFim}
                            onChange={e => setForm(f => ({ ...f, endDateManual: true, dataFim: e.target.value }))}
                        />
                        {endPreview && !form.endDateManual && (
                            <p style={{ fontSize: '0.67rem', color: '#059669', marginTop: '0.25rem', fontWeight: 600 }}>
                                ✓ {endPreview.teachingDaysCount} dias letivos → {endPreview.calendarDays} dias calendário
                            </p>
                        )}
                        {form.endDateManual && endPreview?.manualMismatch && (
                            <p style={{ fontSize: '0.67rem', color: '#B45309', marginTop: '0.25rem', fontWeight: 600 }}>
                                Data manual — calculado seria {new Date(endPreview.endDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </p>
                        )}
                        {errors.dataFim && (
                            <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: 6, fontWeight: 600 }}>{errors.dataFim}</p>
                        )}
                    </div>
                </div>

                {previewError && <p style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600, margin: 0 }}>{previewError}</p>}

                <p style={{ fontSize: '0.68rem', color: '#6B7280', margin: 0, lineHeight: 1.45 }}>
                    Datas do período definem o cálculo de diárias (aba Funcionários). Turmas vinculadas no dashboard herdam referência acadêmica.
                </p>
            </div>
        </div>
    );
}
