'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { acoesApi, type Acao } from '@/lib/api/acoes';
import api from '@/lib/api/acoes';
import { LocationFieldsValue } from '@/components/admin/LocationFields';
import { toast } from '@/components/ui/Toast';
import { AcaoWizardStepBasic } from './AcaoWizardStepBasic';
import { AcaoWizardStepLocation } from './AcaoWizardStepLocation';
import { AcaoWizardStepLogistics } from './AcaoWizardStepLogistics';
import { INITIAL_ACAO_WIZARD_FORM, type AcaoWizardFormState } from './acao-wizard-types';
import { filterCoursesByGroupState } from './course-filter';

const TOTAL_STEPS = 3;

export function AcaoPeriodWizard({
    onClose,
    onCreated,
}: {
    onClose: () => void;
    onCreated: (createdAcao?: Acao) => void;
}) {
    const [form, setForm] = useState<AcaoWizardFormState>(INITIAL_ACAO_WIZARD_FORM);
    const [stepIndex, setStepIndex] = useState(0);
    const [grupos, setGrupos] = useState<any[]>([]);
    const [carretas, setCarretas] = useState<any[]>([]);
    const [cursos, setCursos] = useState<any[]>([]);
    const [stepFieldErrors, setStepFieldErrors] = useState<Record<string, string>>({});
    const [acaoLocation, setAcaoLocation] = useState<LocationFieldsValue>({
        name: null,
        address: null,
        reference: null,
        latitude: null,
        longitude: null,
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const group = grupos.find(g => g.id === form.grupoId);
    const cursosFiltrados = useMemo(() => filterCoursesByGroupState(cursos, group?.state), [cursos, group?.state]);

    useEffect(() => {
        if (!form.grupoId || form.motorCourseId) return;
        const first = cursosFiltrados[0]?.id;
        if (first) setForm(f => (f.motorCourseId === first ? f : { ...f, motorCourseId: first }));
    }, [form.grupoId, form.motorCourseId, cursosFiltrados]);

    useEffect(() => {
        Promise.all([
            api.get('/groups').then(r => (Array.isArray(r.data) ? r.data : r.data?.data || [])),
            api.get('/trucks').then(r => (Array.isArray(r.data) ? r.data : r.data?.data || [])),
            api.get('/courses').then(r => (Array.isArray(r.data) ? r.data : r.data?.data || [])),
        ])
            .then(([g, t, c]) => {
                setGrupos(g);
                setCarretas(t);
                setCursos(c);
            })
            .catch(() => {});
    }, []);

    const inheritedLocation = useMemo(
        (): LocationFieldsValue => ({
            name: acaoLocation.name || form.localExecucao || null,
            address: acaoLocation.address,
            reference: acaoLocation.reference,
            latitude: acaoLocation.latitude,
            longitude: acaoLocation.longitude,
        }),
        [acaoLocation, form.localExecucao],
    );

    const validateStep = (idx: number): string | null => {
        const fieldErr: Record<string, string> = {};
        if (idx === 0) {
            if (!form.nome.trim()) return 'Informe o nome do período.';
            if (!form.grupoId) return 'Selecione o grupo.';
            setStepFieldErrors({});
            return null;
        }
        if (idx === 1) {
            if (!form.cidadeNome.trim()) fieldErr.cidade = 'Informe a cidade.';
            if (!form.carretaId) fieldErr.carretaId = 'Selecione a carreta do período.';
            if (!form.motorCourseId) fieldErr.motorCourseId = 'Selecione o curso de referência do motor.';
            if (!form.calendarReady) fieldErr.calendarPolicy = 'Confirme o calendário letivo antes de avançar.';
            if (!form.dataInicio) fieldErr.dataInicio = 'Informe a data de início.';
            if (!form.dataFim) fieldErr.dataFim = 'Informe a data de fim.';
            setStepFieldErrors(fieldErr);
            if (Object.keys(fieldErr).length > 0) {
                return 'Revise os campos destacados no passo de localização e período.';
            }
            return null;
        }
        setStepFieldErrors({});
        return null;
    };

    const createPeriodo = async (): Promise<Acao> =>
        acoesApi.criar({
            nome: form.nome,
            cidadeNome: form.cidadeNome,
            cidadeId: form.cidadeId || undefined,
            grupoId: form.grupoId,
            carretaId: form.carretaId,
            motorCourseId: form.motorCourseId || undefined,
            period: form.period as 'MORNING' | 'AFTERNOON' | 'EVENING',
            startTime: form.startTime,
            endTime: form.endTime,
            weekendPolicy: form.weekendPolicy,
            weekendExtraDates:
                form.weekendPolicy === 'SELECT_WEEKENDS'
                    ? form.weekendExtraDates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
                    : undefined,
            teachingDaysOverride: form.teachingDaysCountOverride.trim()
                ? Number(form.teachingDaysCountOverride)
                : undefined,
            dataInicio: form.dataInicio,
            dataFim: form.dataFim,
            driverDepartureDate: form.driverDepartureDate?.trim()
                ? `${form.driverDepartureDate.trim()}T12:00:00.000Z`
                : undefined,
            status: form.status,
            permitirInscricoes: form.permitirInscricoes,
            distanciaKm: form.distanciaKm ? Number(form.distanciaKm) : undefined,
            precoCombustivelL: form.precoCombustivelL ? Number(form.precoCombustivelL) : undefined,
            autonomiaKmL: form.autonomiaKmL ? Number(form.autonomiaKmL) : undefined,
            localExecucao: inheritedLocation.name || undefined,
            localEndereco: inheritedLocation.address || undefined,
            localReferencia: inheritedLocation.reference || undefined,
            localLatitude: inheritedLocation.latitude ?? undefined,
            localLongitude: inheritedLocation.longitude ?? undefined,
        } as Partial<Acao>);

    const handleNext = async () => {
        const err = validateStep(stepIndex);
        if (err) {
            setError(err);
            return;
        }
        setError('');

        if (stepIndex < TOTAL_STEPS - 1) {
            setStepIndex(i => i + 1);
            return;
        }

        setSubmitting(true);
        try {
            const acao = await createPeriodo();
            toast.success('Período criado. Vincule turmas e equipe no dashboard do período.');
            onCreated(acao);
            onClose();
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Erro ao criar período');
        } finally {
            setSubmitting(false);
        }
    };

    const stepTitle = () => {
        if (stepIndex === 0) return 'Contexto';
        if (stepIndex === 1) return 'Localização e período';
        return 'Logística';
    };

    const overlay = (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(4px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#fff',
                    borderRadius: 20,
                    width: '100%',
                    maxWidth: 760,
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div
                    style={{
                        padding: '20px 28px 14px',
                        borderBottom: '1px solid #F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#FFFDE7',
                    }}
                >
                    <div>
                        <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.95rem', fontWeight: 900, margin: 0 }}>
                            NOVO PERÍODO DE CURSO
                        </h2>
                        <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#6B7280' }}>
                            Passo {stepIndex + 1} de {TOTAL_STEPS} — {stepTitle()}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>
                        ✕
                    </button>
                </div>

                <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= stepIndex ? '#FFD600' : '#E5E7EB' }} />
                        ))}
                    </div>

                    {error && (
                        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '10px 14px', borderRadius: 9, fontSize: '0.85rem' }}>
                            {error}
                        </div>
                    )}

                    {stepIndex === 0 && <AcaoWizardStepBasic form={form} setForm={setForm} grupos={grupos} />}
                    {stepIndex === 1 && (
                        <AcaoWizardStepLocation
                            form={form}
                            setForm={setForm}
                            carretas={carretas}
                            cursosFiltrados={cursosFiltrados}
                            groupState={group?.state}
                            acaoLocation={acaoLocation}
                            setAcaoLocation={setAcaoLocation}
                            fieldErrors={stepFieldErrors}
                        />
                    )}
                    {stepIndex === 2 && <AcaoWizardStepLogistics form={form} setForm={setForm} />}

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #F3F4F6' }}>
                        <button
                            type="button"
                            onClick={stepIndex === 0 ? onClose : () => setStepIndex(i => i - 1)}
                            disabled={submitting}
                            style={{ padding: '9px 20px', background: 'transparent', border: '1px solid #E5E7EB', borderRadius: 9, cursor: 'pointer' }}
                        >
                            {stepIndex === 0 ? 'Cancelar' : 'Voltar'}
                        </button>
                        <button type="button" onClick={() => void handleNext()} disabled={submitting} className="btn-primary" style={{ minWidth: 180 }}>
                            {submitting ? 'Salvando…' : stepIndex === TOTAL_STEPS - 1 ? '⚡ Criar período' : 'Próximo'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(overlay, document.body);
}
