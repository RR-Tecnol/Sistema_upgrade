'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { coursesApi } from '@/lib/api/courses';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';
import { AcademicCapIcon, ClockIcon, UserGroupIcon, ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';

interface CourseDetail {
    id: string;
    name: string;
    description?: string;
    workloadHours: number;
    durationDaysMA: number;
    durationDaysPI: number;
    prerequisites?: string;
    syllabus?: string;
    availableInMA?: boolean;
    availableInPI?: boolean;
    isMulticourse: boolean;
    active: boolean;
    createdAt: string;
    modules?: CourseModuleItem[];
    teachers?: TeacherCourseItem[];
    _count?: {
        modules?: number;
        teachers?: number;
        classes?: number;
        materials?: number;
    };
    classes?: ClassItem[];
    stateConfig?: Record<string, { available: boolean; durationDays: number; workloadHours?: number }>;
}

type EditForm = {
    name: string;
    description: string;
    workloadHours: string;
    durationDaysMA: string;
    durationDaysPI: string;
    prerequisites: string;
    syllabus: string;
    availableInMA: boolean;
    availableInPI: boolean;
    isMulticourse: boolean;
    active: boolean;
    stateConfig?: Record<string, { available: boolean; durationDays: number; workloadHours?: number }>;
};

interface ClassItem {
    id: string;
    classIdentifier: string;
    status: string;
    startDate: string;
    endDate: string;
    vacancies: number;
    period?: string;
    startTime?: string;
    endTime?: string;
    enrollmentOpenDate?: string;
    enrollmentCloseDate?: string;
    routeType?: string;
    locationName?: string;
    city?: { name: string; state: string };
    originCity?: { name: string; state: string };
    truck?: { id: string; identifier: string; licensePlate?: string; state?: string };
    teachers?: Array<{ teacher?: { user?: { name?: string; email?: string } } }>;
    schedules?: Array<{ weekday: number; active: boolean }>;
    _count?: { enrollments: number };
}

interface CourseModuleItem {
    id: string;
    moduleName: string;
    room: number;
    startTime: string;
    endTime: string;
    order: number;
}

interface TeacherCourseItem {
    id: string;
    teacher?: {
        id?: string;
        user?: {
            name?: string;
            email?: string;
        };
    };
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    PLANNED:          { label: 'Planejada',          color: '#0891B2', bg: '#F0F9FF' },
    ENROLLMENT_OPEN:  { label: 'Inscrições Abertas', color: '#059669', bg: '#F0FDF4' },
    IN_PROGRESS:      { label: 'Em Andamento',       color: '#D97706', bg: '#FFFBEB' },
    COMPLETED:        { label: 'Concluída',           color: '#6B7280', bg: '#F3F4F6' },
    CANCELLED:        { label: 'Cancelada',           color: '#DC2626', bg: '#FEF2F2' },
};

const PERIOD_LABEL: Record<string, string> = {
    MORNING: 'Manhã',
    AFTERNOON: 'Tarde',
    EVENING: 'Noite',
    FULL_TIME: 'Integral',
};

const WEEKDAY_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function modulesFromSyllabus(syllabus?: string): CourseModuleItem[] {
    if (!syllabus) return [];
    return syllabus
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map((line, idx) => {
            const cleaned = line.replace(/^m[oó]dulo\s*\d+\s*[:.-]?\s*/i, '').trim() || line;
            return {
                id: `syllabus-${idx}`,
                moduleName: cleaned,
                order: idx + 1,
                room: 0,
                startTime: '--:--',
                endTime: '--:--',
            };
        });
}

export default function CursoDetalhePage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [course, setCourse] = useState<CourseDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [availableTeachers, setAvailableTeachers] = useState<{ id: string; name: string; email?: string }[]>([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [assigningTeacher, setAssigningTeacher] = useState(false);
    const [form, setForm] = useState<EditForm>({
        name: '',
        description: '',
        workloadHours: '',
        durationDaysMA: '',
        durationDaysPI: '',
        prerequisites: '',
        syllabus: '',
        availableInMA: true,
        availableInPI: true,
        isMulticourse: false,
        active: true,
        stateConfig: {
            MA: { available: true, durationDays: 1, workloadHours: 60 },
            PI: { available: true, durationDays: 1, workloadHours: 60 }
        }
    });

    const hydrateForm = (data: CourseDetail) => {
        setForm({
            name: data.name ?? '',
            description: data.description ?? '',
            workloadHours: String(data.workloadHours ?? ''),
            durationDaysMA: String(data.durationDaysMA ?? ''),
            durationDaysPI: String(data.durationDaysPI ?? ''),
            prerequisites: data.prerequisites ?? '',
            syllabus: data.syllabus ?? '',
            availableInMA: Boolean(data.availableInMA ?? true),
            availableInPI: Boolean(data.availableInPI ?? true),
            isMulticourse: Boolean(data.isMulticourse),
            active: Boolean(data.active),
            stateConfig: {
                MA: {
                    available: data.stateConfig?.MA?.available ?? Boolean(data.availableInMA ?? true),
                    durationDays: data.stateConfig?.MA?.durationDays ?? Number(data.durationDaysMA ?? 1),
                    workloadHours: data.stateConfig?.MA?.workloadHours ?? data.workloadHours,
                },
                PI: {
                    available: data.stateConfig?.PI?.available ?? Boolean(data.availableInPI ?? true),
                    durationDays: data.stateConfig?.PI?.durationDays ?? Number(data.durationDaysPI ?? 1),
                    workloadHours: data.stateConfig?.PI?.workloadHours ?? data.workloadHours,
                }
            }
        });
    };

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        coursesApi.getOne(id)
            .then(res => {
                setCourse(res as unknown as CourseDetail);
                hydrateForm(res as unknown as CourseDetail);
            })
            .catch(() => setError('Curso não encontrado ou erro ao carregar.'))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (searchParams.get('edit') === '1') setIsEditing(true);
    }, [searchParams]);

    useEffect(() => {
        api.get('/users?role=TEACHER')
            .then(r => {
                const list = Array.isArray(r.data) ? r.data : r.data?.data || [];
                setAvailableTeachers(list.filter((u: { active?: boolean }) => u.active !== false));
            })
            .catch(() => setAvailableTeachers([]));
    }, []);

    const canSave = useMemo(() => {
        const whMA = Number(form.stateConfig?.MA?.workloadHours);
        const whPI = Number(form.stateConfig?.PI?.workloadHours);
        const dma = Number(form.durationDaysMA);
        const dpi = Number(form.durationDaysPI);
        return (
            form.name.trim().length >= 3 &&
            form.description.trim().length > 0 &&
            (!form.availableInMA || (Number.isFinite(whMA) && whMA > 0)) &&
            (!form.availableInPI || (Number.isFinite(whPI) && whPI > 0)) &&
            Number.isFinite(dma) && dma > 0 &&
            Number.isFinite(dpi) && dpi > 0 &&
            (form.availableInMA || form.availableInPI)
        );
    }, [form]);

    const handleSave = async () => {
        if (!id || !course) return;
        if (!canSave) {
            toast.error('Preencha os campos obrigatórios e mantenha ao menos um estado disponível.');
            return;
        }
        try {
            setSaving(true);
            const maHours = form.availableInMA ? Number(form.stateConfig?.MA?.workloadHours) : 0;
            const piHours = form.availableInPI ? Number(form.stateConfig?.PI?.workloadHours) : 0;
            const legacyWorkload = Math.max(maHours, piHours) || Number(form.workloadHours) || 60;

            const payload = {
                name: form.name.trim(),
                description: form.description.trim(),
                workloadHours: legacyWorkload,
                durationDaysMA: Number(form.durationDaysMA),
                durationDaysPI: Number(form.durationDaysPI),
                prerequisites: form.prerequisites.trim() || undefined,
                syllabus: form.syllabus.trim() || '',
                availableInMA: form.availableInMA,
                availableInPI: form.availableInPI,
                isMulticourse: form.isMulticourse,
                active: form.active,
                stateConfig: {
                    MA: {
                        available: form.availableInMA,
                        durationDays: Number(form.durationDaysMA),
                        workloadHours: form.availableInMA ? Number(form.stateConfig?.MA?.workloadHours) : undefined,
                    },
                    PI: {
                        available: form.availableInPI,
                        durationDays: Number(form.durationDaysPI),
                        workloadHours: form.availableInPI ? Number(form.stateConfig?.PI?.workloadHours) : undefined,
                    }
                }
            };
            const updated = await coursesApi.update(id, payload);
            const merged = { ...course, ...(updated as unknown as CourseDetail) };
            setCourse(merged);
            hydrateForm(merged);
            setIsEditing(false);
            toast.success('Curso atualizado com sucesso.');
        } catch {
            toast.error('Erro ao salvar alterações do curso.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        if (course) hydrateForm(course);
        setIsEditing(false);
    };

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
            <p style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO CURSO...</p>
        </div>
    );

    if (error || !course) return (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
            <AcademicCapIcon style={{ width: 48, height: 48, color: '#D1D5DB', margin: '0 auto 1rem' }} />
            <p style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', letterSpacing: '0.15em', color: '#9CA3AF', marginBottom: '1.5rem' }}>{error || 'CURSO NÃO ENCONTRADO'}</p>
            <button onClick={() => router.back()} className="btn-primary">Voltar</button>
        </div>
    );

    const classes = course.classes || [];
    const modules = (course.modules && course.modules.length > 0) ? course.modules : modulesFromSyllabus(course.syllabus);
    const modulesAreDerived = !course.modules || course.modules.length === 0;
    const teachers = course.teachers || [];
    const activeClasses = classes.filter(c => c.status === 'IN_PROGRESS').length;
    const totalEnrollments = classes.reduce((acc, c) => acc + (c._count?.enrollments ?? 0), 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">

            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Link href="/admin/cursos" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#9CA3AF', textDecoration: 'none', fontWeight: 500 }}>
                    <ArrowLeftIcon style={{ width: 14, height: 14 }} /> Cursos
                </Link>
                <span style={{ color: '#D1D5DB', fontSize: '0.78rem' }}>/</span>
                <span style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 600 }}>{course.name}</span>
            </div>

            {/* Header */}
            <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '1.5rem', background: '#FFFDE7', borderBottom: '2px solid #FEF08A', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: '#FFD600', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <AcademicCapIcon style={{ width: 26, height: 26, color: '#000' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <h1 style={{ fontFamily: 'Orbitron', fontSize: '1.2rem', fontWeight: 900, color: '#111827', margin: 0 }}>{course.name}</h1>
                            <span style={{ padding: '0.2rem 0.65rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, background: course.active ? '#DCFCE7' : '#F3F4F6', color: course.active ? '#15803D' : '#9CA3AF', border: `1px solid ${course.active ? '#BBF7D0' : '#E5E7EB'}` }}>
                                {course.active ? '● Ativo' : '○ Inativo'}
                            </span>
                            {course.isMulticourse && <span style={{ padding: '0.2rem 0.65rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, background: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA' }}>Multicurso</span>}
                        </div>
                        {course.description && <p style={{ margin: '0.4rem 0 0', fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.5 }}>{course.description}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                style={{ padding: '0.5rem 0.85rem', borderRadius: 9, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                                ✏️ Editar Curso
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={handleCancelEdit}
                                    disabled={saving}
                                    style={{ padding: '0.5rem 0.85rem', borderRadius: 9, background: '#fff', border: '1px solid #E5E7EB', color: '#6B7280', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!canSave || saving}
                                    style={{ padding: '0.5rem 0.85rem', borderRadius: 9, background: '#FFD600', border: '1px solid #EAB308', color: '#111827', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', opacity: (!canSave || saving) ? 0.6 : 1 }}
                                >
                                    {saving ? 'Salvando...' : 'Salvar'}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {isEditing && (
                    <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #E5E7EB', background: '#FFFFFF' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
                            <div>
                                <label className="form-label">Nome *</label>
                                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div>
                                <label className="form-label">Carga Horária MA (h) *</label>
                                <input 
                                    className="form-input" 
                                    type="number" 
                                    min={1} 
                                    disabled={!form.availableInMA}
                                    value={form.stateConfig?.MA?.workloadHours ?? ''} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        setForm(f => ({
                                            ...f,
                                            stateConfig: {
                                                ...f.stateConfig,
                                                MA: { 
                                                    available: f.availableInMA,
                                                    durationDays: Number(f.durationDaysMA),
                                                    workloadHours: val !== '' ? Number(val) : undefined 
                                                },
                                                PI: f.stateConfig?.PI || { available: f.availableInPI, durationDays: Number(f.durationDaysPI), workloadHours: Number(f.workloadHours) }
                                            }
                                        }));
                                    }} 
                                />
                            </div>
                            <div>
                                <label className="form-label">Carga Horária PI (h) *</label>
                                <input 
                                    className="form-input" 
                                    type="number" 
                                    min={1} 
                                    disabled={!form.availableInPI}
                                    value={form.stateConfig?.PI?.workloadHours ?? ''} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        setForm(f => ({
                                            ...f,
                                            stateConfig: {
                                                ...f.stateConfig,
                                                MA: f.stateConfig?.MA || { available: f.availableInMA, durationDays: Number(f.durationDaysMA), workloadHours: Number(f.workloadHours) },
                                                PI: { 
                                                    available: f.availableInPI,
                                                    durationDays: Number(f.durationDaysPI),
                                                    workloadHours: val !== '' ? Number(val) : undefined 
                                                }
                                            }
                                        }));
                                    }} 
                                />
                            </div>
                            <div>
                                <label className="form-label">Duração MA (dias) *</label>
                                <input className="form-input" type="number" min={1} value={form.durationDaysMA} onChange={e => setForm(f => ({ ...f, durationDaysMA: e.target.value }))} />
                            </div>
                            <div>
                                <label className="form-label">Duração PI (dias) *</label>
                                <input className="form-input" type="number" min={1} value={form.durationDaysPI} onChange={e => setForm(f => ({ ...f, durationDaysPI: e.target.value }))} />
                            </div>
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <label className="form-label">Descrição *</label>
                            <textarea className="form-input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <label className="form-label">Pré-requisitos</label>
                            <input className="form-input" value={form.prerequisites} onChange={e => setForm(f => ({ ...f, prerequisites: e.target.value }))} />
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <label className="form-label">Ementa</label>
                            <textarea className="form-input" rows={4} value={form.syllabus} onChange={e => setForm(f => ({ ...f, syllabus: e.target.value }))} style={{ resize: 'vertical' }} />
                        </div>
                        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#374151' }}>
                                <input 
                                    type="checkbox" 
                                    checked={form.availableInMA} 
                                    onChange={e => {
                                        const checked = e.target.checked;
                                        setForm(f => ({ 
                                            ...f, 
                                            availableInMA: checked,
                                            stateConfig: {
                                                ...f.stateConfig,
                                                MA: { 
                                                    available: checked,
                                                    durationDays: Number(f.durationDaysMA),
                                                    workloadHours: f.stateConfig?.MA?.workloadHours ?? Number(f.workloadHours)
                                                },
                                                PI: f.stateConfig?.PI || { available: f.availableInPI, durationDays: Number(f.durationDaysPI), workloadHours: Number(f.workloadHours) }
                                            }
                                        }));
                                    }} 
                                />
                                Disponível no MA
                            </label>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#374151' }}>
                                <input 
                                    type="checkbox" 
                                    checked={form.availableInPI} 
                                    onChange={e => {
                                        const checked = e.target.checked;
                                        setForm(f => ({ 
                                            ...f, 
                                            availableInPI: checked,
                                            stateConfig: {
                                                ...f.stateConfig,
                                                MA: f.stateConfig?.MA || { available: f.availableInMA, durationDays: Number(f.durationDaysMA), workloadHours: Number(f.workloadHours) },
                                                PI: { 
                                                    available: checked,
                                                    durationDays: Number(f.durationDaysPI),
                                                    workloadHours: f.stateConfig?.PI?.workloadHours ?? Number(f.workloadHours)
                                                }
                                            }
                                        }));
                                    }} 
                                />
                                Disponível no PI
                            </label>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#374151' }}>
                                <input type="checkbox" checked={form.isMulticourse} onChange={e => setForm(f => ({ ...f, isMulticourse: e.target.checked }))} />
                                Multicurso
                            </label>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#374151' }}>
                                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
                                Curso ativo
                            </label>
                        </div>
                    </div>
                )}

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', padding: '1rem 1.5rem', gap: '0.75rem' }}>
                    {[
                        { icon: <ClockIcon style={{ width: 16, height: 16 }} />, label: 'Carga Horária MA', value: course.stateConfig?.MA?.workloadHours ?? course.workloadHours, displayValue: `${course.stateConfig?.MA?.workloadHours ?? course.workloadHours}h`, color: '#B89B00', bg: '#FFFDE7', border: '#FEF08A' },
                        { icon: <ClockIcon style={{ width: 16, height: 16 }} />, label: 'Carga Horária PI', value: course.stateConfig?.PI?.workloadHours ?? course.workloadHours, displayValue: `${course.stateConfig?.PI?.workloadHours ?? course.workloadHours}h`, color: '#D97706', bg: '#FFFBEB', border: '#FCD34D' },
                        { icon: <UserGroupIcon style={{ width: 16, height: 16 }} />, label: 'Turmas Ativas', value: activeClasses, displayValue: String(activeClasses), color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
                        { icon: <CheckCircleIcon style={{ width: 16, height: 16 }} />, label: 'Total de Turmas', value: classes.length, displayValue: String(classes.length), color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD' },
                        { icon: <CheckCircleIcon style={{ width: 16, height: 16 }} />, label: 'Módulos', value: modules.length, displayValue: String(modules.length), color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
                        { icon: <UserGroupIcon style={{ width: 16, height: 16 }} />, label: 'Professores', value: teachers.length, displayValue: String(teachers.length), color: '#BE185D', bg: '#FDF2F8', border: '#FBCFE8' },
                        { icon: <UserGroupIcon style={{ width: 16, height: 16 }} />, label: 'Alunos vinculados', value: totalEnrollments, displayValue: String(totalEnrollments), color: '#0D9488', bg: '#F0FDFA', border: '#99F6E4' },
                        { icon: <ClockIcon style={{ width: 16, height: 16 }} />, label: 'Duração MA', value: course.durationDaysMA, displayValue: `${course.durationDaysMA} dias`, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
                        { icon: <ClockIcon style={{ width: 16, height: 16 }} />, label: 'Duração PI', value: course.durationDaysPI, displayValue: `${course.durationDaysPI} dias`, color: '#0D9488', bg: '#F0FDFA', border: '#99F6E4' },
                    ].map((item, idx) => (
                        <AnimatedKpiCard
                            key={item.label}
                            label={item.label}
                            value={item.value}
                            displayValue={item.displayValue}
                            color={item.color}
                            bg={item.bg}
                            border={item.border}
                            icon={item.icon}
                            compact
                            delayMs={idx * 55}
                        />
                    ))}
                </div>

                {course.prerequisites && (
                    <div style={{ padding: '0 1.5rem 1rem' }}>
                        <div style={{ fontSize: '0.72rem', color: '#6B7280', background: '#F9FAFB', borderRadius: 8, padding: '0.6rem 0.85rem', borderLeft: '3px solid #FEF08A' }}>
                            <strong style={{ color: '#374151' }}>Pré-requisitos:</strong> {course.prerequisites}
                        </div>
                    </div>
                )}
                {course.syllabus && (
                    <div style={{ padding: '0 1.5rem 1rem' }}>
                        <div style={{ fontSize: '0.72rem', color: '#6B7280', background: '#F9FAFB', borderRadius: 8, padding: '0.6rem 0.85rem', borderLeft: '3px solid #BAE6FD' }}>
                            <strong style={{ color: '#374151' }}>Ementa:</strong> {course.syllabus}
                        </div>
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '1rem' }}>
                <div className="glass-card" style={{ padding: '1rem' }}>
                    <h3 style={{ fontFamily: 'Orbitron', fontSize: '0.72rem', letterSpacing: '0.1em', color: '#6B7280', marginBottom: '0.75rem' }}>
                        MÓDULOS DO CURSO ({modules.length}) {modulesAreDerived ? '• DERIVADOS DA EMENTA' : ''}
                    </h3>
                    {modules.length === 0 ? (
                        <p style={{ color: '#9CA3AF', fontSize: '0.78rem' }}>Nenhum módulo cadastrado.</p>
                    ) : (
                        <div style={{ display: 'grid', gap: 8 }}>
                            {modules
                                .slice()
                                .sort((a, b) => a.order - b.order)
                                .map(mod => (
                                    <div key={mod.id} style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '0.65rem 0.75rem', background: '#fff' }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#111827' }}>
                                            {mod.order}. {mod.moduleName}
                                        </div>
                                        {!modulesAreDerived && (
                                            <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 4 }}>
                                                Sala {mod.room} • {mod.startTime} às {mod.endTime}
                                            </div>
                                        )}
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
                <div className="glass-card" style={{ padding: '1rem' }}>
                    <h3 style={{ fontFamily: 'Orbitron', fontSize: '0.72rem', letterSpacing: '0.1em', color: '#6B7280', marginBottom: '0.75rem' }}>
                        PROFESSORES VINCULADOS ({teachers.length})
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: 10 }}>
                        Ao vincular aqui, o professor é propagado para todas as turmas ativas deste curso (e períodos que as usem).
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                        <select
                            value={selectedTeacherId}
                            onChange={e => setSelectedTeacherId(e.target.value)}
                            style={{ flex: 1, minWidth: 200, padding: '0.5rem 0.65rem', borderRadius: 8, border: '1px solid #E5E7EB' }}
                        >
                            <option value="">Selecione um professor…</option>
                            {availableTeachers.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="btn-primary"
                            disabled={!selectedTeacherId || assigningTeacher}
                            onClick={async () => {
                                if (!selectedTeacherId || !id) return;
                                setAssigningTeacher(true);
                                try {
                                    const res = await coursesApi.assignTeacher(id, selectedTeacherId);
                                    const n = res?.propagatedClasses ?? res?.academicSync?.classLinks ?? 0;
                                    toast.success(`Professor vinculado ao curso${n ? ` e a ${n} turma(s)` : ''}.`);
                                    setSelectedTeacherId('');
                                    const updated = await coursesApi.getOne(id);
                                    setCourse(updated);
                                } catch (e: any) {
                                    toast.error(e?.response?.data?.message || 'Erro ao vincular professor.');
                                } finally {
                                    setAssigningTeacher(false);
                                }
                            }}
                        >
                            {assigningTeacher ? 'Vinculando…' : '+ Vincular'}
                        </button>
                    </div>
                    {teachers.length === 0 ? (
                        <p style={{ color: '#9CA3AF', fontSize: '0.78rem' }}>Nenhum professor vinculado ao curso.</p>
                    ) : (
                        <div style={{ display: 'grid', gap: 8 }}>
                            {teachers.map(t => (
                                <div key={t.id} style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '0.65rem 0.75rem', background: '#fff' }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#111827' }}>
                                        {t.teacher?.user?.name || 'Professor'}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 4 }}>
                                        {t.teacher?.user?.email || 'Sem e-mail cadastrado'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Turmas Vinculadas */}
            <div>
                <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.1em', color: '#374151', marginBottom: '1rem' }}>
                    TURMAS VINCULADAS <span style={{ color: '#9CA3AF', fontSize: '0.65rem' }}>({classes.length})</span>
                </h2>

                {classes.length === 0 ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem', color: '#9CA3AF' }}>
                        <UserGroupIcon style={{ width: 36, height: 36, margin: '0 auto 0.75rem', opacity: 0.3 }} />
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.68rem', letterSpacing: '0.12em' }}>NENHUMA TURMA VINCULADA</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '0.65rem' }}>
                        {classes.map(cls => {
                            const st = STATUS_MAP[cls.status] || STATUS_MAP['PLANNED'];
                            return (
                                <div key={cls.id} className="glass-card animate-fade-in" style={{ padding: '0.9rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                    <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: '0.82rem', color: '#111827', flex: 1, minWidth: 160 }}>
                                        {cls.classIdentifier}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                                        {cls.city ? `${cls.city.name} — ${cls.city.state}` : '—'}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono' }}>
                                        {new Date(cls.startDate).toLocaleDateString('pt-BR')} → {new Date(cls.endDate).toLocaleDateString('pt-BR')}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#374151' }}>
                                        {cls._count?.enrollments ?? 0}/{cls.vacancies} alunos
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#374151' }}>
                                        {PERIOD_LABEL[cls.period || ''] || cls.period || 'Período n/d'} • {cls.startTime || '--:--'}-{cls.endTime || '--:--'}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#374151' }}>
                                        Professores: {cls.teachers?.length ?? 0} • Motorista/Carreta: {cls.truck?.identifier || 'Não vinculada'}
                                    </div>
                                    {cls.teachers && cls.teachers.length > 0 && (
                                        <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                                            Equipe docente: {cls.teachers.map(t => t.teacher?.user?.name || 'Professor').join(', ')}
                                        </div>
                                    )}
                                    {(cls.enrollmentOpenDate || cls.enrollmentCloseDate) && (
                                        <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                                            Janela de inscrição: {cls.enrollmentOpenDate ? new Date(cls.enrollmentOpenDate).toLocaleDateString('pt-BR') : '--'} até {cls.enrollmentCloseDate ? new Date(cls.enrollmentCloseDate).toLocaleDateString('pt-BR') : '--'}
                                        </div>
                                    )}
                                    {cls.schedules && cls.schedules.length > 0 && (
                                        <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                                            Dias: {cls.schedules.map(s => WEEKDAY_LABEL[s.weekday] ?? `D${s.weekday}`).join(', ')}
                                        </div>
                                    )}
                                    {(cls.locationName || cls.routeType || cls.originCity) && (
                                        <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                                            {cls.routeType === 'INTRAURBANA' ? 'Rota intraurbana' : 'Rota intercidade'} • Origem: {cls.originCity ? `${cls.originCity.name}/${cls.originCity.state}` : 'n/d'} • Local: {cls.locationName || 'n/d'}
                                        </div>
                                    )}
                                    <span style={{ padding: '0.2rem 0.65rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, background: st.bg, color: st.color, border: `1px solid ${st.color}44`, whiteSpace: 'nowrap' }}>
                                        {st.label}
                                    </span>
                                    <Link href={`/admin/turmas/${cls.id}`} style={{ padding: '0.35rem 0.75rem', borderRadius: 7, background: '#FFFDE7', border: '1px solid #FEF08A', color: '#92730A', fontSize: '0.7rem', fontWeight: 700, textDecoration: 'none' }}>
                                        Ver
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
