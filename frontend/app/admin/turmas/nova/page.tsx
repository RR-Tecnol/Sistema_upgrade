'use client';

import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/components/ui/Toast';
import { classesApi, CreateClassDto } from '@/lib/api/classes';
import { coursesApi, Course } from '@/lib/api/courses';
import { formatCourseHoursBadge, getCourseContractForState } from '@/lib/course-contract';
import { unwrapListData } from '@/lib/api/pagination';
import { acoesApi, type Acao } from '@/lib/api/acoes';
import { groupsApi } from '@/lib/api/groups';
import { citiesApi, City } from '@/lib/api/cities';
import { trucksApi, Truck } from '@/lib/api/trucks';
import { AdminCreationSuccessScreen } from '@/components/admin/AdminCreationSuccessScreen';
import { LocationFields, LocationFieldsValue } from '@/components/admin/LocationFields';
import { RouteTypeSelector, RouteType } from '@/components/admin/RouteTypeSelector';
import {
    AcademicCapIcon,
    MapPinIcon,
    ClipboardDocumentCheckIcon,
    ChevronLeftIcon,
    CheckCircleIcon,
    TruckIcon,
    UserGroupIcon,
    InformationCircleIcon,
    BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import type { Group } from '@/lib/api/groups';

/** Horas do curso por UF (cadastro em Cursos) — não depende do grupo na etapa 1. */
function formatContratoHorasUf(course: Course, group: Group | null): string {
    if (group) {
        return `${getCourseContractForState(course, group.state).workloadHours}h`;
    }
    const cfg = course.stateConfig;
    if (course.availableInMA && course.availableInPI) {
        const ma = cfg?.MA?.workloadHours;
        const pi = cfg?.PI?.workloadHours;
        if (ma && pi) return ma === pi ? `${ma}h/UF` : `MA ${ma}h · PI ${pi}h`;
        if (ma) return `${ma}h (MA)`;
        if (pi) return `${pi}h (PI)`;
    }
    if (course.availableInMA && cfg?.MA?.workloadHours) return `${cfg.MA.workloadHours}h (MA)`;
    if (course.availableInPI && cfg?.PI?.workloadHours) return `${cfg.PI.workloadHours}h (PI)`;
    return `${course.workloadHours}h`;
}

/* ──────────────── TYPES ──────────────── */
type Step = 1 | 2 | 3;

interface FormState extends CreateClassDto {
    enrollmentOpenDate: string;
    enrollmentCloseDate: string;
    routeType: RouteType;
    originCityId?: string;
    originNeighborhood?: string;
    destinationNeighborhood?: string;
    weekendPolicy: 'FOLLOW_SCHEDULE' | 'WEEKDAYS_ONLY' | 'ALL_WEEKENDS' | 'SELECT_WEEKENDS';
    /** SELECT_WEEKENDS: datas ISO (aula em sáb/dom específico). */
    weekendExtraDates: string[];
    /** Override opcional da duração em dias letivos. */
    teachingDaysCountOverride: string;
}

/* ──────────────── CONSTANTS ──────────────── */
const STEPS = [
    { n: 1 as Step, label: 'Curso', icon: AcademicCapIcon },
    { n: 2 as Step, label: 'Acadêmico', icon: MapPinIcon },
    { n: 3 as Step, label: 'Revisão', icon: ClipboardDocumentCheckIcon },
];

const STATUS_OPTIONS = [
    { value: 'PLANNED', label: 'Planejada', color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', desc: 'Turma criada mas ainda não divulgada' },
    { value: 'ENROLLMENT_OPEN', label: 'Matrículas Abertas', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0', desc: 'Inscrições abertas para alunos' },
];

/* ──────────────── SHARED STYLE UTILS ──────────────── */
const INPUT: React.CSSProperties = {
    width: '100%', padding: '0.65rem 0.9rem', borderRadius: 10,
    border: '1.5px solid #E5E7EB', background: '#F9FAFB',
    fontSize: '0.85rem', color: '#111827', outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
};
const LABEL: React.CSSProperties = {
    display: 'block', fontSize: '0.63rem', fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: '0.1em',
    color: '#6B7280', marginBottom: '0.35rem',
};
const CARD: React.CSSProperties = {
    background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB',
    padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '1rem',
};
const SEC_TITLE: React.CSSProperties = {
    fontFamily: 'Orbitron', fontWeight: 800, fontSize: '0.68rem',
    letterSpacing: '0.12em', color: '#B89B00', textTransform: 'uppercase', marginBottom: '0.25rem',
};

/* ──────────────── REUSABLE FIELD COMPONENTS ──────────────── */
function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
    return (
        <div>
            <label style={LABEL}>{label}{required && <span style={{ color: '#FFD600', marginLeft: 3 }}>*</span>}</label>
            {children}
            {error && <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: '0.25rem', fontWeight: 600 }}>{error}</p>}
        </div>
    );
}

function FInput({ label, required, error, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean; error?: string }) {
    const [f, setF] = useState(false);
    return (
        <Field label={label} required={required} error={error}>
            <input {...rest}
                style={{ ...INPUT, borderColor: f ? '#FFD600' : error ? '#FCA5A5' : '#E5E7EB', boxShadow: f ? '0 0 0 3px rgba(255,214,0,0.15)' : 'none' }}
                onFocus={() => setF(true)} onBlur={() => setF(false)} />
        </Field>
    );
}

function FSelect({ label, required, error, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; required?: boolean; error?: string }) {
    const [f, setF] = useState(false);
    return (
        <Field label={label} required={required} error={error}>
            <select {...rest}
                style={{ ...INPUT, cursor: 'pointer', borderColor: f ? '#FFD600' : error ? '#FCA5A5' : '#E5E7EB', boxShadow: f ? '0 0 0 3px rgba(255,214,0,0.15)' : 'none' }}
                onFocus={() => setF(true)} onBlur={() => setF(false)}>
                {children}
            </select>
        </Field>
    );
}

/* ──────────────── INFO PILL ──────────────── */
function InfoPill({ icon, label, value, color = '#B89B00', bg = '#FFFDE7' }: { icon: React.ReactNode; label: string; value: string; color?: string; bg?: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.85rem', borderRadius: 9, background: bg, border: `1px solid ${color}33` }}>
            <span style={{ color, flexShrink: 0 }}>{icon}</span>
            <span style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#111827' }}>{value}</span>
        </div>
    );
}

/* ──────────────── MAIN PAGE ──────────────── */
export default function NovaTurmaPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const acaoIdParam = searchParams.get('acaoId') || '';
    const [periodo, setPeriodo] = useState<Acao | null>(null);
    const [loadingPeriodo, setLoadingPeriodo] = useState(!!acaoIdParam);
    const [step, setStep] = useState<Step>(1);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    /* data */
    const [courses, setCourses] = useState<Course[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const modoAvulso = !acaoIdParam;

    const [form, setForm] = useState<FormState>({
        courseId: '', groupId: '', cityId: '', classIdentifier: '',
        startDate: '', endDate: '',
        period: 'MORNING', startTime: '07:00', endTime: '12:00',
        vacancies: 30, reserveSlots: 0, truckId: undefined,
        status: 'PLANNED',
        enrollmentOpenDate: '', enrollmentCloseDate: '',
        routeType: 'INTERCIDADE',
        originCityId: undefined,
        originNeighborhood: undefined,
        destinationNeighborhood: undefined,
        weekendPolicy: 'WEEKDAYS_ONLY',
        weekendExtraDates: [],
        teachingDaysCountOverride: '',
    });

    // Local físico onde a turma ocorre — usado pelo motorista para navegação GPS
    // e pelo aluno para saber onde ir. Todos opcionais (deploy-safe).
    const [location, setLocation] = useState<LocationFieldsValue>({
        name: null, address: null, reference: null, latitude: null, longitude: null,
    });

    /* load data */
    useEffect(() => {
        Promise.all([
            coursesApi.getAll({ active: true, limit: 500, page: 1 }),
            groupsApi.getAll({ limit: 500, page: 1 }),
            citiesApi.getAll(),
            trucksApi.getAll({ status: 'AVAILABLE', limit: 500, page: 1 }),
        ]).then(([c, g, ci, t]) => {
            setCourses(unwrapListData(c));
            setGroups(unwrapListData(g));
            setCities(ci);
            setTrucks(unwrapListData(t));
        }).catch(() => { });
    }, []);

    useEffect(() => {
        if (!acaoIdParam) {
            setLoadingPeriodo(false);
            return;
        }
        setLoadingPeriodo(true);
        acoesApi
            .buscar(acaoIdParam)
            .then(a => {
                setPeriodo(a);
                setForm(f => ({
                    ...f,
                    groupId: a.grupoId,
                    courseId: a.motorCourseId || f.courseId,
                    cityId: a.cidadeId || f.cityId,
                    truckId: a.carretaId || f.truckId,
                    startDate: a.dataInicio?.slice(0, 10) || f.startDate,
                    endDate: a.dataFim?.slice(0, 10) || f.endDate,
                    period: (a as { period?: string }).period as FormState['period'] || f.period,
                    startTime: (a as { startTime?: string }).startTime || f.startTime,
                    endTime: (a as { endTime?: string }).endTime || f.endTime,
                    weekendPolicy: ((a as { weekendPolicy?: string }).weekendPolicy as FormState['weekendPolicy']) || f.weekendPolicy,
                }));
                if (a.grupo) setSelectedGroup(a.grupo as Group);
                if (a.localExecucao || a.localEndereco) {
                    setLocation({
                        name: a.localExecucao || null,
                        address: a.localEndereco || null,
                        reference: a.localReferencia || null,
                        latitude: a.localLatitude ?? null,
                        longitude: a.localLongitude ?? null,
                    });
                }
            })
            .catch(() => toast.error('Período de curso não encontrado'))
            .finally(() => setLoadingPeriodo(false));
    }, [acaoIdParam]);

    /* filter cities by group state */
    const filteredCities = selectedGroup ? cities.filter(c => c.state === selectedGroup.state) : cities;
    const filteredTrucks = selectedGroup ? trucks.filter(t => t.state === selectedGroup.state) : trucks;

    const set = (k: keyof FormState, v: any) => {
        setForm(f => ({ ...f, [k]: v }));
        setErrors(e => { const n = { ...e }; delete n[k]; return n; });
    };

    /* auto-generate identifier */
    const buildIdentifier = useCallback(() => {
        const c = courses.find(x => x.id === form.courseId);
        const ci = cities.find(x => x.id === form.cityId);
        const g = groups.find(x => x.id === form.groupId);
        if (!c || !ci || !g) return;
        const abbr = c.name.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();
        const year = new Date().getFullYear();
        set('classIdentifier', `${abbr}-${ci.name.slice(0, 4).toUpperCase()}-${g.state}-${year}`);
    }, [form.courseId, form.cityId, form.groupId, courses, cities, groups]);

    useEffect(() => { buildIdentifier(); }, [form.courseId, form.cityId, form.groupId]);

    useEffect(() => {
        if (form.courseId) {
            const c = courses.find(x => x.id === form.courseId);
            if (c) setSelectedCourse(c);
        }
    }, [form.courseId, courses]);

    useEffect(() => {
        if (form.groupId) {
            const g = groups.find(x => x.id === form.groupId);
            if (g) setSelectedGroup(g);
        }
    }, [form.groupId, groups]);

    const groupForContract = selectedGroup ?? groups.find(g => g.id === form.groupId) ?? null;
    const courseContract =
        selectedCourse && groupForContract
            ? getCourseContractForState(selectedCourse, groupForContract.state)
            : null;

    /* validation */
    const validate = (s: Step) => {
        const e: Record<string, string> = {};
        if (s === 1) {
            if (!form.courseId) e.courseId = 'Selecione um curso';
            if (!form.classIdentifier.trim()) e.classIdentifier = 'Identificador obrigatório';
        }
        if (s === 2) {
            if (!form.groupId) e.groupId = 'Selecione o grupo';
            if (!form.vacancies || form.vacancies < 1) e.vacancies = 'Vagas inválidas';
            if (form.routeType === 'INTERCIDADE') {
                if (!form.originCityId) e.originCityId = 'Selecione a cidade de origem';
                if (!form.cityId) e.cityId = 'Selecione a cidade de destino';
                if (form.originCityId && form.cityId && form.originCityId === form.cityId)
                    e.cityId = 'Origem e destino não podem ser a mesma cidade';
            }
            if (form.routeType === 'INTRAURBANA') {
                if (!form.cityId) e.cityId = 'Selecione a cidade';
                if (!form.originNeighborhood?.trim()) e.originNeighborhood = 'Informe o bairro/ponto de origem';
                if (!form.destinationNeighborhood?.trim()) e.destinationNeighborhood = 'Informe o bairro/ponto de destino';
            }
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const next = () => {
        if (!validate(step)) return;
        setStep(s => (s < 3 ? s + 1 : s) as Step);
    };
    const back = () => setStep(s => (s > 1 ? s - 1 : s) as Step);

    /* submit */
    const handleSubmit = async () => {
        setSubmitError(null);
        setSaving(true);
        try {
            if (!validate(2)) {
                setStep(2);
                setSaving(false);
                return;
            }
            const hoje = new Date().toISOString().slice(0, 10);
            const payload: CreateClassDto = {
                courseId: form.courseId,
                groupId: form.groupId,
                cityId: form.cityId,
                classIdentifier: form.classIdentifier,
                startDate: periodo?.dataInicio?.slice(0, 10) || hoje,
                endDate: periodo?.dataFim?.slice(0, 10) || hoje,
                period: (periodo as { period?: string })?.period as CreateClassDto['period'] || form.period,
                startTime: (periodo as { startTime?: string })?.startTime || form.startTime,
                endTime: (periodo as { endTime?: string })?.endTime || form.endTime,
                vacancies: Number(form.vacancies),
                reserveSlots: Number(form.reserveSlots ?? 0),
                truckId: periodo?.carretaId || form.truckId || undefined,
                status: form.status as CreateClassDto['status'],
                enrollmentOpenDate: form.enrollmentOpenDate || undefined,
                enrollmentCloseDate: form.enrollmentCloseDate || undefined,
                routeType: form.routeType,
                originCityId: form.routeType === 'INTERCIDADE' ? (form.originCityId || undefined) : undefined,
                originNeighborhood: form.routeType === 'INTRAURBANA' ? (form.originNeighborhood || undefined) : undefined,
                destinationNeighborhood: form.routeType === 'INTRAURBANA' ? (form.destinationNeighborhood || undefined) : undefined,
                locationName: location.name || undefined,
                locationAddress: location.address || undefined,
                locationReference: location.reference || undefined,
                locationLatitude: location.latitude ?? undefined,
                locationLongitude: location.longitude ?? undefined,
                ...(acaoIdParam
                    ? { acaoId: acaoIdParam, useAutoEndDate: false }
                    : { useAutoEndDate: true }),
            };
            const created = await classesApi.create(payload);
            setSuccess(true);
            setTimeout(
                () => router.push(acaoIdParam ? `/admin/acoes/${acaoIdParam}?tab=turmas` : `/admin/turmas?created=1&createdClassId=${created.id}`),
                2000,
            );
        } catch (err: any) {
            const rawMsg = err?.response?.data?.message;
            const rawStr = Array.isArray(rawMsg) ? rawMsg.join(' · ') : (rawMsg || '');
            // BUG-E1: Traduzir mensagens de erro do backend para PT-BR
            const msgMap: Record<string, string> = {
                'Truck has overlapping': '🚛 Este caminhão já está alocado em outra turma no mesmo período. Escolha outro veículo ou ajuste as datas da turma.',
                'Truck not available': '🚛 Caminhão indisponível no período selecionado. Verifique a grade de alocação ou escolha outro veículo.',
                'classIdentifier already exists': '🔠 Identificador de turma já cadastrado. Use um código único (ex: INF-CIDADE-MA-2026).',
                'City not found': '📍 Cidade não encontrada. Verifique o cadastro de cidades.',
                'Course not found': '📚 Curso não encontrado.',
                'Group not found': '🏢 Grupo não encontrado.',
                'vacancies': '🪑 Número de vagas inválido.',
            };
            let translated = '';
            for (const [key, ptMsg] of Object.entries(msgMap)) {
                if (rawStr.includes(key)) { translated = ptMsg; break; }
            }
            setSubmitError(translated || rawStr || 'Erro ao criar turma. Verifique os dados e tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    /* ── SUCCESS SCREEN ── */
    if (success) {
        return (
            <AdminCreationSuccessScreen
                title="TURMA CRIADA!"
                entityName={form.classIdentifier}
                redirectMessage="Redirecionando para a lista de turmas..."
            />
        );
    }

    if (loadingPeriodo && acaoIdParam) {
        return <p style={{ padding: '2rem', textAlign: 'center', color: '#6B7280' }}>Carregando período…</p>;
    }

    /* ═══════════════════════════════════════ RENDER ═══════════════════════════════════════ */
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 860, margin: '0 auto' }} className="animate-fade-in">

            {/* ── PAGE HEADER ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Link href="/admin/turmas"
                    style={{ width: 38, height: 38, borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', transition: 'all 0.18s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FFFDE7'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                >
                    <ChevronLeftIcon style={{ width: 16, height: 16, color: '#6B7280' }} />
                </Link>
                <div>
                    <h1 className="gradient-text" style={{ fontFamily: 'Orbitron', fontSize: '1.7rem', fontWeight: 900, letterSpacing: '0.08em' }}>NOVA TURMA</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                        {modoAvulso
                            ? 'Turma avulsa — vincule depois em Períodos de curso → aba Turmas'
                            : 'Vinculada ao período · motor letivo herdado'}
                    </p>
                </div>

                {/* Program badge */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                    {['MA', 'PI'].map(s => (
                        <span key={s} style={{ padding: '0.3rem 0.75rem', borderRadius: 8, fontSize: '0.7rem', fontWeight: 800, background: s === 'MA' ? '#EFF6FF' : '#F0FDF4', color: s === 'MA' ? '#1D4ED8' : '#059669', border: `1px solid ${s === 'MA' ? '#BFDBFE' : '#BBF7D0'}` }}>{s}</span>
                    ))}
                </div>
            </div>

            {/* ── CONTEXT BANNER (program info) ── */}
            <div style={{ background: '#FFFDE7', borderRadius: 12, border: '1px solid #FEF08A', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <InformationCircleIcon style={{ width: 18, height: 18, color: '#B89B00', flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: '0.76rem', color: '#92400E', lineHeight: 1.5 }}>
                    <strong>Qualifica MA &amp; PI</strong> — Programa de qualificação profissional em parceria com governos estaduais do Maranhão e Piauí.
                    As <strong>Carretas-Escola</strong> são unidades móveis equipadas que levam cursos técnicos gratuitos diretamente às cidades do interior,
                    democratizando o acesso ao conhecimento para cidadãos em situação de vulnerabilidade social.
                </div>
            </div>

            {/* ── STEP PROGRESS BAR ── */}
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', padding: '1rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center' }}>
                {STEPS.map((s, i) => {
                    const active = step === s.n;
                    const done = step > s.n;
                    const Icon = s.icon;
                    return (
                        <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 0 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.3s',
                                    background: done ? '#059669' : active ? '#FFD600' : '#F3F4F6',
                                    border: `2px solid ${done ? '#059669' : active ? '#FFD600' : '#E5E7EB'}`,
                                    boxShadow: active ? '0 3px 12px rgba(255,214,0,0.35)' : 'none',
                                }}>
                                    {done ? <CheckCircleIcon style={{ width: 16, height: 16, color: '#fff' }} />
                                        : <Icon style={{ width: 16, height: 16, color: active ? '#000' : '#9CA3AF' }} />}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: active ? '#B89B00' : done ? '#059669' : '#9CA3AF' }}>Etapa {s.n}</div>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: active ? '#111827' : done ? '#374151' : '#9CA3AF', whiteSpace: 'nowrap' }}>{s.label}</div>
                                </div>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div style={{ flex: 1, height: 2, background: done ? '#059669' : '#E5E7EB', borderRadius: 2, margin: '0 0.6rem', transition: 'background 0.4s' }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── FORM CARD ── */}
            <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                {/* Section header */}
                <div style={{ padding: '0.9rem 1.5rem', background: '#FFFDE7', borderBottom: '2px solid #FEF08A', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {(() => { const S = STEPS[step - 1]; const Icon = S.icon; return (<><Icon style={{ width: 16, height: 16, color: '#B89B00' }} /><span style={{ fontFamily: 'Orbitron', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', color: '#B89B00' }}>{S.label.toUpperCase()}</span></>); })()}
                    <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: '#D4B402', fontWeight: 600 }}>{step} / 3</span>
                </div>

                <div style={{ padding: '1.5rem' }}>

                    {/* ══════════ STEP 1: CURSO ══════════ */}
                    {step === 1 && (
                        <div className="animate-fade-in" style={{ display: 'grid', gap: '1.25rem' }}>
                            <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: 0, padding: '0.6rem 0.9rem', background: '#F9FAFB', borderRadius: 8, borderLeft: '3px solid #FFD600' }}>
                                Selecione o curso que será ministrado nesta turma pela Carreta-Escola itinerante.
                            </p>

                            {/* Course selector grid */}
                            <div>
                                <label style={{ ...LABEL }}>Curso <span style={{ color: '#FFD600' }}>*</span></label>
                                {courses.length === 0 ? (
                                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.82rem', background: '#F9FAFB', borderRadius: 10, border: '1px dashed #E5E7EB' }}>
                                        Carregando cursos...
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '0.65rem', maxHeight: 340, overflowY: 'auto', paddingRight: '0.25rem' }} className="custom-scrollbar">
                                        {courses.map(c => {
                                            const sel = form.courseId === c.id;
                                            return (
                                                <button key={c.id} type="button"
                                                    onClick={() => { set('courseId', c.id); setSelectedCourse(c); }}
                                                    style={{
                                                        textAlign: 'left', padding: '0.85rem 1rem', borderRadius: 11, cursor: 'pointer', transition: 'all 0.2s',
                                                        background: sel ? '#FFFDE7' : '#F9FAFB',
                                                        border: `2px solid ${sel ? '#FFD600' : '#E5E7EB'}`,
                                                        boxShadow: sel ? '0 3px 12px rgba(255,214,0,0.2)' : 'none',
                                                        transform: sel ? 'scale(1.01)' : 'scale(1)',
                                                    }}
                                                    onMouseEnter={e => { if (!sel) { (e.currentTarget as HTMLElement).style.borderColor = '#FEF08A'; (e.currentTarget as HTMLElement).style.background = '#FFFDE7'; } }}
                                                    onMouseLeave={e => { if (!sel) { (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; } }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                                        <div style={{ width: 28, height: 28, borderRadius: 7, background: sel ? '#FFD600' : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                                                            <AcademicCapIcon style={{ width: 14, height: 14, color: sel ? '#000' : '#9CA3AF' }} />
                                                        </div>
                                                        <div style={{ minWidth: 0 }}>
                                                            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#111827', lineHeight: 1.3 }}>{c.name}</div>
                                                        </div>
                                                        {sel && <CheckCircleIcon style={{ width: 16, height: 16, color: '#059669', marginLeft: 'auto', flexShrink: 0, marginTop: 2 }} />}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: '0.62rem', padding: '0.15rem 0.5rem', borderRadius: 100, background: '#F0F9FF', color: '#0891B2', fontWeight: 700, border: '1px solid #BAE6FD' }} title={c.availableInMA && c.availableInPI ? `${c.workloadHours}h total no cadastro` : undefined}>{formatCourseHoursBadge(c, selectedGroup?.state)}</span>
                                                        {c.availableInMA && <span style={{ fontSize: '0.62rem', padding: '0.15rem 0.5rem', borderRadius: 100, background: '#EFF6FF', color: '#1D4ED8', fontWeight: 700, border: '1px solid #BFDBFE' }}>MA</span>}
                                                        {c.availableInPI && <span style={{ fontSize: '0.62rem', padding: '0.15rem 0.5rem', borderRadius: 100, background: '#F0FDF4', color: '#059669', fontWeight: 700, border: '1px solid #BBF7D0' }}>PI</span>}
                                                        {c.isMulticourse && <span style={{ fontSize: '0.62rem', padding: '0.15rem 0.5rem', borderRadius: 100, background: '#FFF7ED', color: '#EA580C', fontWeight: 700, border: '1px solid #FED7AA' }}>Multicurso</span>}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {errors.courseId && <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: '0.35rem', fontWeight: 600 }}>{errors.courseId}</p>}
                            </div>

                            {/* Course detail preview */}
                            {selectedCourse && (
                                <div className="animate-fade-in" style={{ padding: '1rem 1.25rem', borderRadius: 12, background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                                    <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B89B00', marginBottom: '0.65rem' }}>Contrato do curso</div>
                                    <p style={{ fontSize: '0.72rem', color: '#6B7280', margin: '0 0 0.65rem', lineHeight: 1.45 }}>
                                        {selectedCourse.availableInMA && selectedCourse.availableInPI
                                            ? `Cadastro: ${formatCourseHoursBadge(selectedCourse)} (cada UF com a sua carga — não soma 120h).`
                                            : `Cadastro: ${selectedCourse.workloadHours}h.`}
                                        {groupForContract
                                            ? ` Turma em ${groupForContract.state}: meta ${courseContract?.workloadHours ? `${courseContract.workloadHours}h` : formatContratoHorasUf(selectedCourse, groupForContract)} — turno e datas vêm do período de curso ao vincular.`
                                            : ' Carga por UF definida no cadastro do curso (etapa 2 define o grupo).'}
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                        {[
                                            ['Horas na UF', formatContratoHorasUf(selectedCourse, groupForContract)],
                                            ['Datas / turno', 'Período de curso'],
                                            ['Tipo', selectedCourse.isMulticourse ? 'Multicurso' : 'Padrão'],
                                        ].map(([k, v]) => (
                                            <div key={k} style={{ padding: '0.5rem 0.75rem', borderRadius: 8, background: '#fff', border: '1px solid #E5E7EB' }}>
                                                <div style={{ fontSize: '0.58rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k}</div>
                                                <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, color: '#111827', fontSize: '0.85rem', marginTop: '0.1rem' }}>{v}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {selectedCourse.prerequisites && (
                                        <div style={{ marginTop: '0.65rem', fontSize: '0.72rem', color: '#6B7280' }}>
                                            <strong style={{ color: '#374151' }}>Pré-requisitos:</strong> {selectedCourse.prerequisites}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* BUG-11: Identificador com tooltip explicativo */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                                    <label style={LABEL} >Identificador da Turma <span style={{ color: '#FFD600' }}>*</span></label>
                                    <div style={{ position: 'relative', display: 'inline-flex' }}
                                        onMouseEnter={e => { const t = (e.currentTarget as HTMLElement).querySelector('.tooltip-box') as HTMLElement; if (t) t.style.display = 'block'; }}
                                        onMouseLeave={e => { const t = (e.currentTarget as HTMLElement).querySelector('.tooltip-box') as HTMLElement; if (t) t.style.display = 'none'; }}>
                                        <InformationCircleIcon style={{ width: 14, height: 14, color: '#9CA3AF', cursor: 'help', flexShrink: 0 }} />
                                        <div className="tooltip-box" style={{
                                            display: 'none', position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
                                            background: '#1F2937', color: '#F9FAFB', borderRadius: 10, padding: '0.75rem 1rem',
                                            fontSize: '0.72rem', lineHeight: 1.6, width: 300, zIndex: 9999,
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                        }}>
                                            <div style={{ fontWeight: 800, marginBottom: '0.35rem', color: '#FFD600', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Padrão de Nomenclatura</div>
                                            <div style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#FCD34D' }}>CURSO</strong>-<strong style={{ color: '#86EFAC' }}>CIDADE</strong>-<strong style={{ color: '#93C5FD' }}>ESTADO</strong>-<strong style={{ color: '#F9A8D4' }}>ANO</strong></div>
                                            <div style={{ color: '#D1D5DB', fontSize: '0.68rem' }}>
                                                Exemplos:<br />
                                                • <code style={{ color: '#FCD34D' }}>ELE-SAOLUIS-MA-2025</code><br />
                                                • <code style={{ color: '#FCD34D' }}>INF-TERES-PI-2026</code><br />
                                                • <code style={{ color: '#FCD34D' }}>COS-IMPER-MA-2025</code><br />
                                            </div>
                                            <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', background: 'rgba(255,214,0,0.1)', borderRadius: 6, fontSize: '0.65rem', color: '#FDE68A' }}>
                                                ⚠️ Deve ser único no sistema. O campo é preenchido automaticamente ao selecionar curso, cidade e grupo — mas pode ser editado manualmente.
                                            </div>
                                            <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderWidth: 6, borderStyle: 'solid', borderColor: '#1F2937 transparent transparent transparent' }} />
                                        </div>
                                    </div>
                                </div>
                                <input
                                    style={{ ...INPUT, borderColor: errors.classIdentifier ? '#FCA5A5' : '#E5E7EB' }}
                                    placeholder="Ex: ELE-SAOLUIS-MA-2025"
                                    value={form.classIdentifier}
                                    onChange={e => set('classIdentifier', e.target.value.toUpperCase())}
                                />
                                {errors.classIdentifier && <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: '0.25rem', fontWeight: 600 }}>{errors.classIdentifier}</p>}
                            </div>
                        </div>
                    )}

                    {/* ══════════ STEP 2: LOCALIZAÇÃO ══════════ */}
                    {step === 2 && (
                        <div className="animate-fade-in" style={{ display: 'grid', gap: '1.25rem' }}>
                            <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: 0, padding: '0.6rem 0.9rem', background: '#F9FAFB', borderRadius: 8, borderLeft: '3px solid #FFD600' }}>
                                Defina o grupo responsável, o tipo de deslocamento e a rota da Carreta-Escola.
                            </p>

                            {/* Grupo */}
                            {periodo && (
                                <div style={{ padding: '0.75rem 1rem', borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: '0.78rem', color: '#1E40AF' }}>
                                    <strong>Período:</strong> {periodo.nome} · {periodo.cidadeNome} ·{' '}
                                    {periodo.dataInicio?.slice(0, 10)} → {periodo.dataFim?.slice(0, 10)} · motor letivo do período
                                </div>
                            )}

                            {modoAvulso && (
                                <div style={{ padding: '0.75rem 1rem', borderRadius: 10, background: '#F0FDF4', border: '1px solid #BBF7D0', fontSize: '0.78rem', color: '#065F46', lineHeight: 1.45 }}>
                                    <strong>Motor letivo no período de curso.</strong> Turno, datas e calendário não são cadastrados aqui.
                                    Vincule esta turma em <strong>Períodos de curso → aba Turmas</strong> — o período aplica o motor automaticamente.
                                </div>
                            )}

                            <FSelect label="Grupo Responsável" required value={form.groupId} error={errors.groupId}
                                disabled={!!periodo?.grupoId}
                                onChange={e => {
                                    set('groupId', e.target.value);
                                    set('cityId', '');
                                    set('truckId', undefined);
                                    setForm(f => ({ ...f, originCityId: undefined }));
                                    const g = groups.find(x => x.id === e.target.value);
                                    setSelectedGroup(g || null);
                                }}>
                                <option value="">Selecione o grupo...</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name} — {g.state}</option>
                                ))}
                            </FSelect>

                            {/* Seletor de Rota */}
                            <RouteTypeSelector
                                routeType={form.routeType || 'INTERCIDADE'}
                                originCityId={form.originCityId}
                                cityId={form.cityId}
                                originNeighborhood={form.originNeighborhood}
                                destinationNeighborhood={form.destinationNeighborhood}
                                cities={filteredCities}
                                errors={errors}
                                onChange={patch => setForm(f => ({
                                    ...f,
                                    ...patch,
                                    cityId: patch.cityId !== undefined ? patch.cityId : f.cityId,
                                }))}
                            />

                            {/* Carreta */}
                            <div>
                                <label style={LABEL}>Carreta-Escola Alocada</label>
                                {!form.groupId ? (
                                    <div style={{ padding: '0.8rem 1rem', borderRadius: 10, background: '#F9FAFB', border: '1px dashed #E5E7EB', fontSize: '0.78rem', color: '#9CA3AF' }}>
                                        Selecione o grupo para ver as carretas disponíveis
                                    </div>
                                ) : filteredTrucks.length === 0 ? (
                                    <div style={{ padding: '1rem', borderRadius: 10, background: '#FFF7ED', border: '1px solid #FED7AA', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                                        <TruckIcon style={{ width: 18, height: 18, color: '#EA580C', flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.78rem', color: '#9A3412' }}>Nenhuma carreta disponível para {selectedGroup?.state || 'este estado'}.</span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem' }}>
                                        <button type="button" onClick={() => set('truckId', undefined)}
                                            style={{ textAlign: 'left', padding: '0.75rem 1rem', borderRadius: 10, cursor: 'pointer', transition: 'all 0.18s', background: !form.truckId ? '#F3F4F6' : '#F9FAFB', border: `1.5px solid ${!form.truckId ? '#9CA3AF' : '#E5E7EB'}` }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#6B7280' }}>Sem carreta</div>
                                            <div style={{ fontSize: '0.67rem', color: '#9CA3AF', marginTop: '0.15rem' }}>Aula presencial em sede</div>
                                        </button>
                                        {filteredTrucks.map(t => {
                                            const sel = form.truckId === t.id;
                                            return (
                                                <button key={t.id} type="button" onClick={() => set('truckId', t.id)}
                                                    style={{ textAlign: 'left', padding: '0.75rem 1rem', borderRadius: 10, cursor: 'pointer', transition: 'all 0.18s', background: sel ? '#FFFDE7' : '#F9FAFB', border: `1.5px solid ${sel ? '#FFD600' : '#E5E7EB'}`, boxShadow: sel ? '0 2px 8px rgba(255,214,0,0.2)' : 'none' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                                                        <TruckIcon style={{ width: 14, height: 14, color: sel ? '#B89B00' : '#9CA3AF' }} />
                                                        <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#111827' }}>{t.identifier}</span>
                                                        {sel && <CheckCircleIcon style={{ width: 13, height: 13, color: '#059669', marginLeft: 'auto' }} />}
                                                    </div>
                                                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', color: '#9CA3AF' }}>{t.licensePlate}</div>
                                                    <div style={{ fontSize: '0.65rem', color: '#6B7280', marginTop: '0.15rem' }}>Cap. {t.capacity} · {t.roomsCount} sala(s)</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Vagas + Reserva + Status */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <FInput label="Vagas Totais" required type="number" min="1" max="500"
                                    value={form.vacancies}
                                    onChange={e => set('vacancies', Number(e.target.value))}
                                    error={errors.vacancies}
                                />
                                <div>
                                    <FInput label="Vagas de Reserva" type="number" min="0" max="100"
                                        value={form.reserveSlots ?? 0}
                                        onChange={e => set('reserveSlots', Number(e.target.value))}
                                    />
                                    <p style={{ fontSize: '0.64rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                                        Para cotas governamentais (REQ-01)
                                    </p>
                                </div>
                                <FSelect label="Status Inicial" value={form.status as string}
                                    onChange={e => set('status', e.target.value as any)}>
                                    {STATUS_OPTIONS.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </FSelect>
                            </div>

                            {/* Local físico específico (REQ-LOCAL-2026) */}
                            {form.cityId && (
                                <div className="animate-fade-in">
                                    <LocationFields
                                        value={location}
                                        onChange={setLocation}
                                        cityContext={(() => {
                                            const c = cities.find(x => x.id === form.cityId);
                                            return c ? `${c.name}, ${c.state}, Brasil` : undefined;
                                        })()}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* ══════════ STEP 3: REVISÃO ══════════ */}
                    {step === 3 && (
                        <div className="animate-fade-in" style={{ display: 'grid', gap: '1.1rem' }}>

                            {/* Quick pills */}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <InfoPill icon={<AcademicCapIcon style={{ width: 14, height: 14 }} />} label="Curso" value={selectedCourse?.name || '—'} />
                                {form.routeType === 'INTERCIDADE' ? (
                                    <>
                                        <InfoPill icon={<MapPinIcon style={{ width: 14, height: 14 }} />} label="Origem" value={cities.find(c => c.id === form.originCityId)?.name || '—'} color="#1D4ED8" bg="#EFF6FF" />
                                        <InfoPill icon={<MapPinIcon style={{ width: 14, height: 14 }} />} label="Destino" value={cities.find(c => c.id === form.cityId)?.name || '—'} color="#059669" bg="#F0FDF4" />
                                    </>
                                ) : (
                                    <>
                                        <InfoPill icon={<MapPinIcon style={{ width: 14, height: 14 }} />} label="Cidade" value={cities.find(c => c.id === form.cityId)?.name || '—'} color="#0891B2" bg="#F0F9FF" />
                                        <InfoPill icon={<MapPinIcon style={{ width: 14, height: 14 }} />} label="Rota" value={`${form.originNeighborhood || '?'} → ${form.destinationNeighborhood || '?'}`} color="#059669" bg="#F0FDF4" />
                                    </>
                                )}
                                <InfoPill icon={<BuildingOfficeIcon style={{ width: 14, height: 14 }} />} label="Grupo" value={selectedGroup?.name || '—'} color="#EA580C" bg="#FFF7ED" />
                            </div>

                            {/* Badge tipo de rota */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{
                                    padding: '0.3rem 0.85rem', borderRadius: 100, fontSize: '0.72rem', fontWeight: 800,
                                    background: form.routeType === 'INTERCIDADE' ? '#EFF6FF' : '#F0FDF4',
                                    color: form.routeType === 'INTERCIDADE' ? '#1D4ED8' : '#059669',
                                    border: `1px solid ${form.routeType === 'INTERCIDADE' ? '#BFDBFE' : '#BBF7D0'}`,
                                }}>
                                    {form.routeType === 'INTERCIDADE' ? '🚌 Intercidade' : '🏙️ Intraurbana'}
                                </span>
                                {form.routeType === 'INTERCIDADE' && form.originCityId && form.cityId && (
                                    <span style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 600 }}>
                                        {cities.find(c => c.id === form.originCityId)?.name} → {cities.find(c => c.id === form.cityId)?.name}
                                    </span>
                                )}
                                {form.routeType === 'INTRAURBANA' && form.originNeighborhood && form.destinationNeighborhood && (
                                    <span style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 600 }}>
                                        {form.originNeighborhood} → {form.destinationNeighborhood}
                                    </span>
                                )}
                            </div>

                            {/* Summary grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                {[
                                    ['Identificador', form.classIdentifier, true],
                                    ['Status', STATUS_OPTIONS.find(s => s.value === form.status)?.label || '—', false],
                                    ...(modoAvulso && !periodo
                                        ? [['Calendário letivo', 'Definido ao vincular ao período de curso', false] as const]
                                        : [
                                            ['Turno', form.period === 'AFTERNOON' ? 'Tarde' : form.period === 'EVENING' ? 'Noite' : 'Manhã', false],
                                            ['Horário', `${(periodo as { startTime?: string })?.startTime || form.startTime} – ${(periodo as { endTime?: string })?.endTime || form.endTime}`, true],
                                            ['Início', form.startDate ? new Date(form.startDate + 'T12:00:00').toLocaleDateString('pt-BR') : (periodo?.dataInicio ? new Date(periodo.dataInicio.slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR') : '—'), false],
                                            ['Término', form.endDate ? new Date(form.endDate + 'T12:00:00').toLocaleDateString('pt-BR') : (periodo?.dataFim ? new Date(periodo.dataFim.slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR') : '—'), false],
                                        ]),
                                    ['Vagas Totais', String(form.vacancies), true],
                                    ['Vagas Reserva', String(form.reserveSlots ?? 0), true],
                                    ['Carreta', periodo?.carreta?.identifier || trucks.find(t => t.id === (periodo?.carretaId || form.truckId))?.identifier || '—', false],
                                    ['Período vinculado', periodo?.nome || (modoAvulso ? 'Nenhum (vincular depois)' : '—'), false],
                                ].map(([k, v, mono]) => (
                                    <div key={k as string} style={{ padding: '0.65rem 0.9rem', borderRadius: 10, background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9CA3AF', marginBottom: '0.2rem' }}>{k}</div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#111827', fontFamily: mono ? 'JetBrains Mono' : 'inherit' }}>{v}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Course info */}
                            {selectedCourse && (
                                <div style={{ padding: '0.85rem 1.1rem', borderRadius: 10, background: '#FFFDE7', border: '1px solid #FEF08A', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <AcademicCapIcon style={{ width: 18, height: 18, color: '#B89B00', flexShrink: 0 }} />
                                    <div style={{ fontSize: '0.75rem', color: '#92400E', lineHeight: 1.45 }}>
                                        <strong>{selectedCourse.name}</strong>
                                        {courseContract
                                            ? ` · ${courseContract.workloadHours}h (${courseContract.stateCode}) — motor no período de curso`
                                            : ` · ${formatCourseHoursBadge(selectedCourse, selectedGroup?.state)}`}
                                    </div>
                                </div>
                            )}

                            {/* Enrollment period */}
                            {(form.enrollmentOpenDate || form.enrollmentCloseDate) && (
                                <div style={{ padding: '0.75rem 1rem', borderRadius: 10, background: '#F0FDF4', border: '1px solid #BBF7D0', fontSize: '0.75rem', color: '#065F46' }}>
                                    <strong>Inscrições:</strong>{' '}
                                    {form.enrollmentOpenDate ? new Date(form.enrollmentOpenDate + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                                    {' até '}
                                    {form.enrollmentCloseDate ? new Date(form.enrollmentCloseDate + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── ERROR BANNER ── */}
                {submitError && (
                    <div style={{ margin: '0 1.5rem 1rem', padding: '0.75rem 1rem', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                        <span style={{ color: '#DC2626', fontWeight: 800, flexShrink: 0 }}>✕</span>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#DC2626', marginBottom: '0.15rem' }}>Erro ao criar turma</div>
                            <div style={{ fontSize: '0.73rem', color: '#991B1B' }}>{submitError}</div>
                        </div>
                        <button onClick={() => setSubmitError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: '1.1rem' }}>×</button>
                    </div>
                )}

                {/* ── FOOTER ── */}
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFAFA' }}>
                    <button onClick={step > 1 ? back : () => router.push('/admin/turmas')}
                        style={{ padding: '0.6rem 1.25rem', borderRadius: 10, background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.18s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#E5E7EB'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#F3F4F6'}>
                        {step === 1 ? 'Cancelar' : 'Voltar'}
                    </button>

                    {/* Step dots */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {STEPS.map(s => (
                            <div key={s.n} style={{ width: s.n === step ? 22 : 7, height: 7, borderRadius: 4, background: s.n === step ? '#FFD600' : s.n < step ? '#059669' : '#E5E7EB', transition: 'all 0.3s' }} />
                        ))}
                    </div>

                    {step < 3
                        ? <button onClick={next} className="btn-primary" style={{ minWidth: 130 }}>Próxima Etapa</button>
                        : <button onClick={handleSubmit} disabled={saving} className="btn-primary" style={{ minWidth: 150, opacity: saving ? 0.7 : 1 }}>
                            {saving ? 'Criando Turma...' : 'Criar Turma'}
                        </button>
                    }
                </div>
            </div>
        </div>
    );
}
