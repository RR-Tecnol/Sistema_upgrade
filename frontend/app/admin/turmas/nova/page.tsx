'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { classesApi, CreateClassDto } from '@/lib/api/classes';
import { coursesApi, Course } from '@/lib/api/courses';
import { groupsApi, Group } from '@/lib/api/groups';
import { citiesApi, City } from '@/lib/api/cities';
import { trucksApi, Truck } from '@/lib/api/trucks';
import { AdminCreationSuccessScreen } from '@/components/admin/AdminCreationSuccessScreen';
import { LocationFields, LocationFieldsValue } from '@/components/admin/LocationFields';
import { RouteTypeSelector, RouteType } from '@/components/admin/RouteTypeSelector';
import {
    AcademicCapIcon,
    MapPinIcon,
    ClockIcon,
    ClipboardDocumentCheckIcon,
    ChevronLeftIcon,
    CheckCircleIcon,
    TruckIcon,
    UserGroupIcon,
    CalendarDaysIcon,
    InformationCircleIcon,
    BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

/* ──────────────── TYPES ──────────────── */
type Step = 1 | 2 | 3 | 4;

interface FormState extends CreateClassDto {
    enrollmentOpenDate: string;
    enrollmentCloseDate: string;
    routeType: RouteType;
    originCityId?: string;
    originNeighborhood?: string;
    destinationNeighborhood?: string;
    weekendPolicy: 'FOLLOW_SCHEDULE' | 'WEEKDAYS_ONLY' | 'ALL_WEEKENDS' | 'SELECT_WEEKENDS';
    /** Texto livre: uma data YYYY-MM-DD por linha ou separadas por vírgula (fins de semana específicos). */
    weekendExtraDatesRaw: string;
}

/* ──────────────── CONSTANTS ──────────────── */
const STEPS = [
    { n: 1 as Step, label: 'Curso', icon: AcademicCapIcon },
    { n: 2 as Step, label: 'Localização', icon: MapPinIcon },
    { n: 3 as Step, label: 'Horários', icon: ClockIcon },
    { n: 4 as Step, label: 'Revisão', icon: ClipboardDocumentCheckIcon },
];

const PERIODS = [
    { value: 'MORNING', label: 'Manhã', timeRange: '07:00 – 12:00', icon: '🌅', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
    { value: 'AFTERNOON', label: 'Tarde', timeRange: '13:00 – 18:00', icon: '☀️', color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD' },
    { value: 'EVENING', label: 'Noite', timeRange: '19:00 – 22:00', icon: '🌙', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
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
        weekendExtraDatesRaw: '',
    });

    // Local físico onde a turma ocorre — usado pelo motorista para navegação GPS
    // e pelo aluno para saber onde ir. Todos opcionais (deploy-safe).
    const [location, setLocation] = useState<LocationFieldsValue>({
        name: null, address: null, reference: null, latitude: null, longitude: null,
    });

    /* load data */
    useEffect(() => {
        Promise.all([
            coursesApi.getAll({ active: true }),
            groupsApi.getAll(),
            citiesApi.getAll(),
            trucksApi.getAll({ status: 'AVAILABLE' }),
        ]).then(([c, g, ci, t]) => {
            setCourses(c);
            setGroups(g);
            setCities(ci);
            setTrucks(t);
        }).catch(() => { });
    }, []);

    /* filter cities by group state */
    const filteredCities = selectedGroup ? cities.filter(c => c.state === selectedGroup.state) : cities;
    const filteredTrucks = selectedGroup ? trucks.filter(t => t.state === selectedGroup.state) : trucks;

    const set = (k: keyof FormState, v: any) => {
        setForm(f => ({ ...f, [k]: v }));
        setErrors(e => { const n = { ...e }; delete n[k]; return n; });
    };

    /* auto-fill time on period select */
    const selectPeriod = (p: typeof PERIODS[0]) => {
        set('period', p.value as any);
        const [s, e] = p.timeRange.replace(' ', '').split('–');
        set('startTime', s.trim());
        set('endTime', e.trim());
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

    /* auto-fill end date based on course duration */
    useEffect(() => {
        if (!form.startDate || !selectedCourse || !selectedGroup) return;
        const days = selectedGroup.state === 'MA' ? selectedCourse.durationDaysMA : selectedCourse.durationDaysPI;
        const d = new Date(form.startDate);
        d.setDate(d.getDate() + days);
        set('endDate', d.toISOString().split('T')[0]);
    }, [form.startDate, selectedCourse, selectedGroup]);

    /* validation */
    const validate = (s: Step) => {
        const e: Record<string, string> = {};
        if (s === 1) {
            if (!form.courseId) e.courseId = 'Selecione um curso';
            if (!form.classIdentifier.trim()) e.classIdentifier = 'Identificador obrigatório';
        }
        if (s === 2) {
            if (!form.groupId) e.groupId = 'Selecione o grupo';
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
        if (s === 3) {
            if (!form.startDate) e.startDate = 'Data de início obrigatória';
            if (!form.endDate) e.endDate = 'Data de término obrigatória';
            if (!form.vacancies || form.vacancies < 1) e.vacancies = 'Vagas inválidas';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const next = () => { if (validate(step)) setStep(s => (s < 4 ? s + 1 : s) as Step); };
    const back = () => setStep(s => (s > 1 ? s - 1 : s) as Step);

    /* submit */
    const handleSubmit = async () => {
        setSubmitError(null);
        setSaving(true);
        try {
            const extraDates = form.weekendExtraDatesRaw
                .split(/[\n,;]+/)
                .map(s => s.trim())
                .filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s));
            const payload: CreateClassDto = {
                courseId: form.courseId, groupId: form.groupId,
                cityId: form.cityId, classIdentifier: form.classIdentifier,
                startDate: form.startDate, endDate: form.endDate,
                period: form.period, startTime: form.startTime, endTime: form.endTime,
                vacancies: Number(form.vacancies),
                reserveSlots: Number(form.reserveSlots ?? 0),
                truckId: form.truckId || undefined,
                status: form.status as any,
                enrollmentOpenDate: form.enrollmentOpenDate || undefined,
                enrollmentCloseDate: form.enrollmentCloseDate || undefined,
                // ── Tipo de rota (REQ-ROUTE-2026) ──
                routeType: form.routeType,
                originCityId: form.routeType === 'INTERCIDADE' ? (form.originCityId || undefined) : undefined,
                originNeighborhood: form.routeType === 'INTRAURBANA' ? (form.originNeighborhood || undefined) : undefined,
                destinationNeighborhood: form.routeType === 'INTRAURBANA' ? (form.destinationNeighborhood || undefined) : undefined,
                // ── Local físico (REQ-LOCAL-2026) ──
                locationName: location.name || undefined,
                locationAddress: location.address || undefined,
                locationReference: location.reference || undefined,
                locationLatitude: location.latitude ?? undefined,
                locationLongitude: location.longitude ?? undefined,
                weekendPolicy: form.weekendPolicy,
                weekendExtraDates: form.weekendPolicy === 'SELECT_WEEKENDS' && extraDates.length ? extraDates : undefined,
            };
            const created = await classesApi.create(payload);
            setSuccess(true);
            setTimeout(() => router.push(`/admin/turmas?created=1&createdClassId=${created.id}`), 2000);
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

    const activePeriod = PERIODS.find(p => p.value === form.period)!;

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
                        Programa Qualifica MA &amp; PI · Carreta-Escola itinerante
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
                    <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: '#D4B402', fontWeight: 600 }}>{step} / 4</span>
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
                                                        <span style={{ fontSize: '0.62rem', padding: '0.15rem 0.5rem', borderRadius: 100, background: '#F0F9FF', color: '#0891B2', fontWeight: 700, border: '1px solid #BAE6FD' }}>{c.workloadHours}h</span>
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
                                    <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B89B00', marginBottom: '0.65rem' }}>Detalhes do Curso Selecionado</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                                        {[
                                            ['Carga Horária', `${selectedCourse.workloadHours}h`],
                                            ['Duração MA', `${selectedCourse.durationDaysMA} dias`],
                                            ['Duração PI', `${selectedCourse.durationDaysPI} dias`],
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
                            <FSelect label="Grupo Responsável" required value={form.groupId} error={errors.groupId}
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

                    {/* ══════════ STEP 3: HORÁRIOS ══════════ */}
                    {step === 3 && (
                        <div className="animate-fade-in" style={{ display: 'grid', gap: '1.25rem' }}>
                            <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: 0, padding: '0.6rem 0.9rem', background: '#F9FAFB', borderRadius: 8, borderLeft: '3px solid #FFD600' }}>
                                Configure as datas, período e horários das aulas. O término é calculado automaticamente com base na duração do curso.
                            </p>

                            {/* Period picker */}
                            <div>
                                <label style={LABEL}>Período das Aulas <span style={{ color: '#FFD600' }}>*</span></label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                                    {PERIODS.map(p => {
                                        const sel = form.period === p.value;
                                        return (
                                            <button key={p.value} type="button" onClick={() => selectPeriod(p)}
                                                style={{ padding: '1rem', borderRadius: 12, border: `2px solid ${sel ? p.color : '#E5E7EB'}`, background: sel ? p.bg : '#F9FAFB', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', boxShadow: sel ? `0 4px 14px ${p.color}25` : 'none', transform: sel ? 'scale(1.02)' : 'scale(1)' }}>
                                                <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>{p.icon}</div>
                                                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: sel ? p.color : '#374151' }}>{p.label}</div>
                                                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', color: sel ? p.color : '#9CA3AF', marginTop: '0.2rem' }}>{p.timeRange}</div>
                                                {sel && <div style={{ marginTop: '0.4rem' }}><CheckCircleIcon style={{ width: 14, height: 14, color: p.color, margin: '0 auto' }} /></div>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Times */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <FInput label="Horário de Início" type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} />
                                <FInput label="Horário de Término" type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} />
                            </div>

                            {/* Dates */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <FInput label="Data de Início" required type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} error={errors.startDate} />
                                <div>
                                    <FInput label="Data de Término" required type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} error={errors.endDate} />
                                    {selectedCourse && form.startDate && (
                                        <p style={{ fontSize: '0.67rem', color: '#059669', marginTop: '0.25rem', fontWeight: 600 }}>
                                            ✓ Calculado automaticamente ({selectedGroup?.state === 'PI' ? selectedCourse.durationDaysPI : selectedCourse.durationDaysMA} dias)
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Enrollment dates */}
                            <div style={{ padding: '1rem 1.25rem', borderRadius: 12, background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                                <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6B7280', marginBottom: '0.75rem' }}>Período de Inscrições (opcional)</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <FInput label="Abertura das Inscrições" type="date" value={form.enrollmentOpenDate} onChange={e => set('enrollmentOpenDate', e.target.value)} />
                                    <FInput label="Encerramento das Inscrições" type="date" value={form.enrollmentCloseDate} onChange={e => set('enrollmentCloseDate', e.target.value)} />
                                </div>
                            </div>

                            <div style={{ padding: '1rem 1.25rem', borderRadius: 12, background: '#FFFDE7', border: '1px solid #FEF08A' }}>
                                <div style={{ ...SEC_TITLE, color: '#92400E' }}>Dias de aula (calendário letivo)</div>
                                <p style={{ fontSize: '0.72rem', color: '#78350F', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
                                    Define como o sistema conta <strong>sábados e domingos</strong> para meta de frequência/certificado (junto com feriados da turma e horários em &quot;Editar turma&quot;).
                                </p>
                                <FSelect label="Política de fins de semana" value={form.weekendPolicy}
                                    onChange={e => set('weekendPolicy', e.target.value as FormState['weekendPolicy'])}>
                                    <option value="WEEKDAYS_ONLY">Só dias úteis (seg–sex) — fins de semana não contam</option>
                                    <option value="FOLLOW_SCHEDULE">Seguir horário cadastrado da turma (class_schedules)</option>
                                    <option value="ALL_WEEKENDS">Todos os sábados e domingos no período contam como dia de aula</option>
                                    <option value="SELECT_WEEKENDS">Apenas alguns fins de semana (indicar datas abaixo)</option>
                                </FSelect>
                                {form.weekendPolicy === 'SELECT_WEEKENDS' && (
                                    <div style={{ marginTop: '0.75rem' }}>
                                        <label style={LABEL}>Datas com aula (YYYY-MM-DD)</label>
                                        <textarea
                                            value={form.weekendExtraDatesRaw}
                                            onChange={e => set('weekendExtraDatesRaw', e.target.value)}
                                            placeholder={'2026-05-10\n2026-05-24'}
                                            rows={4}
                                            style={{ ...INPUT, resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem' }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ══════════ STEP 4: REVISÃO ══════════ */}
                    {step === 4 && (
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
                                    ['Período', PERIODS.find(p => p.value === form.period)?.label || '—', false],
                                    ['Horário', `${form.startTime} – ${form.endTime}`, true],
                                    ['Início', form.startDate ? new Date(form.startDate + 'T12:00:00').toLocaleDateString('pt-BR') : '—', false],
                                    ['Término', form.endDate ? new Date(form.endDate + 'T12:00:00').toLocaleDateString('pt-BR') : '—', false],
                                    ['Vagas Totais', String(form.vacancies), true],
                                    ['Vagas Reserva', String(form.reserveSlots ?? 0), true],
                                    ['Carreta', trucks.find(t => t.id === form.truckId)?.identifier || 'Sem carreta', false],
                                    ['Fins de semana', (
                                        form.weekendPolicy === 'WEEKDAYS_ONLY' ? 'Só dias úteis'
                                            : form.weekendPolicy === 'ALL_WEEKENDS' ? 'Todos sáb/dom'
                                                : form.weekendPolicy === 'SELECT_WEEKENDS' ? 'Datas específicas'
                                                    : 'Horário da turma'
                                    ), false],
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
                                    <div style={{ fontSize: '0.75rem', color: '#92400E' }}>
                                        <strong>{selectedCourse.name}</strong> · {selectedCourse.workloadHours}h de carga horária · {selectedCourse.isMulticourse ? 'Multicurso' : 'Padrão'} ·{' '}
                                        {selectedGroup?.state === 'PI' ? `${selectedCourse.durationDaysPI} dias (PI)` : `${selectedCourse.durationDaysMA} dias (MA)`}
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

                    {step < 4
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
