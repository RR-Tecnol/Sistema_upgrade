'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { coursesApi, type Course } from '@/lib/api/courses';
import { classesApi } from '@/lib/api/classes';
import { acoesApi } from '@/lib/api/acoes';
import { groupsApi, type Group } from '@/lib/api/groups';
import { citiesApi, type City } from '@/lib/api/cities';
import { trucksApi, type Truck } from '@/lib/api/trucks';
import { toast } from '@/components/ui/Toast';

type CreateMode = 'individual' | 'full';
type Step = 1 | 2 | 3 | 4;

export default function GestaoAcademicaNovoPage() {
    const router = useRouter();
    // FUTURE_DEPLOY: Fluxo completo da Gestão Integrada em stand-by neste deploy.
    // O código completo desta tela está preservado abaixo para retomada futura.
    const STANDBY_GESTAO_INTEGRADA = true;
    const [mode, setMode] = useState<CreateMode>('individual');
    const [step, setStep] = useState<Step>(1);
    const [loading, setLoading] = useState(false);

    const [courses, setCourses] = useState<Course[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [trucks, setTrucks] = useState<Truck[]>([]);

    const [stateUf, setStateUf] = useState<'MA' | 'PI'>('MA');
    const [periodName, setPeriodName] = useState('');
    const [periodStart, setPeriodStart] = useState('');
    const [periodEnd, setPeriodEnd] = useState('');

    const [courseMode, setCourseMode] = useState<'existing' | 'new'>('existing');
    const [courseId, setCourseId] = useState('');
    const [newCourseName, setNewCourseName] = useState('');
    const [newCourseDesc, setNewCourseDesc] = useState('');
    const [newCourseSyllabus, setNewCourseSyllabus] = useState('');
    const [newCourseWorkload, setNewCourseWorkload] = useState(120);
    const [newCourseDuration, setNewCourseDuration] = useState(30);

    const [groupId, setGroupId] = useState('');
    const [cityId, setCityId] = useState('');
    const [truckId, setTruckId] = useState('');
    const [classIdentifier, setClassIdentifier] = useState('');
    const [periodClass, setPeriodClass] = useState<'MORNING' | 'AFTERNOON' | 'EVENING'>('MORNING');
    const [startTime, setStartTime] = useState('07:00');
    const [endTime, setEndTime] = useState('12:00');
    const [vacancies, setVacancies] = useState(30);

    useEffect(() => {
        if (!STANDBY_GESTAO_INTEGRADA) return;
        router.replace('/admin/cursos');
    }, [router]);

    useEffect(() => {
        Promise.all([
            coursesApi.getAll({ active: true }).catch(() => []),
            groupsApi.getAll().catch(() => []),
            citiesApi.getAll().catch(() => []),
            trucksApi.getAll({ status: 'AVAILABLE' }).catch(() => []),
        ]).then(([c, g, ci, t]) => {
            setCourses(c);
            setGroups(g);
            setCities(ci);
            setTrucks(t);
        });
    }, []);

    const citiesByState = useMemo(() => cities.filter(c => c.state === stateUf), [cities, stateUf]);
    const groupsByState = useMemo(() => groups.filter(g => g.state === stateUf), [groups, stateUf]);
    const trucksByState = useMemo(() => trucks.filter(t => t.state === stateUf), [trucks, stateUf]);
    const coursesByState = useMemo(
        () => courses.filter(c => (stateUf === 'MA' ? c.availableInMA : c.availableInPI)),
        [courses, stateUf],
    );

    const canGoStep2 = periodName.trim().length >= 3 && !!periodStart && !!periodEnd;
    const canGoStep3 = courseMode === 'existing'
        ? !!courseId
        : newCourseName.trim().length >= 3 && newCourseDesc.trim().length >= 10 && newCourseSyllabus.trim().length >= 10;
    const canGoStep4 = !!groupId && !!cityId && !!classIdentifier.trim();

    const generateClassIdentifier = () => {
        const city = cities.find(c => c.id === cityId);
        if (!city) return;
        const prefix = courseMode === 'existing'
            ? (courses.find(c => c.id === courseId)?.name || 'CUR')
            : (newCourseName || 'CUR');
        const abbr = prefix.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();
        setClassIdentifier(`${abbr}-${city.name.slice(0, 4).toUpperCase()}-${stateUf}-${new Date().getFullYear()}`);
    };

    useEffect(() => {
        if (!cityId) return;
        generateClassIdentifier();
    }, [cityId, courseId, newCourseName, stateUf]);

    const submitFullFlow = async () => {
        setLoading(true);
        try {
            let finalCourseId = courseId;
            if (courseMode === 'new') {
                const createdCourse = await coursesApi.create({
                    name: newCourseName.trim(),
                    description: newCourseDesc.trim(),
                    workloadHours: Number(newCourseWorkload),
                    durationDaysMA: stateUf === 'MA' ? Number(newCourseDuration) : 30,
                    durationDaysPI: stateUf === 'PI' ? Number(newCourseDuration) : 30,
                    prerequisites: '',
                    syllabus: newCourseSyllabus.trim(),
                    availableInMA: stateUf === 'MA',
                    availableInPI: stateUf === 'PI',
                    isMulticourse: false,
                });
                finalCourseId = createdCourse.id;
            }

            if (!finalCourseId) throw new Error('Curso inválido no fluxo');

            const createdClass = await classesApi.create({
                courseId: finalCourseId,
                groupId,
                cityId,
                classIdentifier: classIdentifier.trim(),
                startDate: periodStart,
                endDate: periodEnd,
                period: periodClass,
                startTime,
                endTime,
                vacancies,
                reserveSlots: 0,
                truckId: truckId || undefined,
                status: 'PLANNED',
                enrollmentOpenDate: periodStart,
                enrollmentCloseDate: periodEnd,
            });

            const group = groups.find(g => g.id === groupId);
            const city = cities.find(c => c.id === cityId);
            const truck = trucks.find(t => t.id === truckId);

            const createdPeriod = await acoesApi.criar({
                nome: periodName.trim(),
                cidadeNome: city?.name || 'Cidade',
                cidadeId: cityId,
                grupoId: groupId,
                carretaId: truck?.id,
                dataInicio: new Date(`${periodStart}T00:00:00`).toISOString(),
                dataFim: new Date(`${periodEnd}T00:00:00`).toISOString(),
                status: 'PLANEJADA',
                routeType: 'INTERCIDADE',
                permitirInscricoes: true,
                observacoes: `Fluxo completo integrado (${stateUf})`,
            });

            await acoesApi.addTurma(createdPeriod.id, createdClass.id);

            toast.success('Fluxo completo criado com sucesso: período + curso + turma vinculada.');
            router.push('/admin/gestao-academica');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Erro ao criar fluxo completo integrado.');
        } finally {
            setLoading(false);
        }
    };

    if (STANDBY_GESTAO_INTEGRADA) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-fade-in">
            <div className="glass-card" style={{ padding: '1rem' }}>
                <h1 style={{ fontFamily: 'Orbitron', fontSize: '1rem', letterSpacing: '0.1em', color: '#111827' }}>NOVA OPERAÇÃO INTEGRADA</h1>
                <p style={{ color: '#6B7280', fontSize: '0.8rem', marginTop: 4 }}>
                    Mantém os módulos atuais e adiciona o fluxo completo em uma única experiência.
                </p>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setMode('individual')} style={{ border: `1px solid ${mode === 'individual' ? '#FFD600' : '#E5E7EB'}`, background: mode === 'individual' ? '#FFFDE7' : '#fff', borderRadius: 9, padding: '0.5rem 0.8rem', fontWeight: 700, fontSize: '0.77rem', cursor: 'pointer' }}>
                    Criação Individual
                </button>
                <button type="button" onClick={() => setMode('full')} style={{ border: `1px solid ${mode === 'full' ? '#FFD600' : '#E5E7EB'}`, background: mode === 'full' ? '#FFFDE7' : '#fff', borderRadius: 9, padding: '0.5rem 0.8rem', fontWeight: 700, fontSize: '0.77rem', cursor: 'pointer' }}>
                    Fluxo Completo Integrado
                </button>
            </div>

            {mode === 'individual' && (
                <div className="glass-card" style={{ padding: '1rem', display: 'grid', gap: 10 }}>
                    <Link href="/admin/cursos/novo" style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '0.75rem 0.9rem', textDecoration: 'none', color: '#111827' }}>
                        <strong>Criar Curso</strong>
                        <div style={{ color: '#6B7280', fontSize: '0.74rem' }}>Módulo existente preservado.</div>
                    </Link>
                    <Link href="/admin/acoes" style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '0.75rem 0.9rem', textDecoration: 'none', color: '#111827' }}>
                        <strong>Criar Período de Curso</strong>
                        <div style={{ color: '#6B7280', fontSize: '0.74rem' }}>Módulo existente preservado.</div>
                    </Link>
                    <Link href="/admin/turmas/nova" style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '0.75rem 0.9rem', textDecoration: 'none', color: '#111827' }}>
                        <strong>Criar Turma</strong>
                        <div style={{ color: '#6B7280', fontSize: '0.74rem' }}>Módulo existente preservado.</div>
                    </Link>
                </div>
            )}

            {mode === 'full' && (
                <div className="glass-card" style={{ padding: '1rem', display: 'grid', gap: 12 }}>
                    <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>Etapa {step} de 4</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {[1, 2, 3, 4].map(n => (
                            <div key={n} style={{ height: 6, flex: 1, borderRadius: 999, background: n <= step ? '#FFD600' : '#E5E7EB' }} />
                        ))}
                    </div>

                    {step === 1 && (
                        <div style={{ display: 'grid', gap: 8 }}>
                            <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>Estado</label>
                            <select value={stateUf} onChange={e => setStateUf(e.target.value as 'MA' | 'PI')} className="form-input">
                                <option value="MA">Maranhão (MA)</option>
                                <option value="PI">Piauí (PI)</option>
                            </select>
                            <input className="form-input" placeholder="Nome do período (ex.: Qualifica São Luís Q3)" value={periodName} onChange={e => setPeriodName(e.target.value)} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <input className="form-input" type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
                                <input className="form-input" type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div style={{ display: 'grid', gap: 8 }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button type="button" onClick={() => setCourseMode('existing')} style={{ borderRadius: 8, border: `1px solid ${courseMode === 'existing' ? '#FFD600' : '#E5E7EB'}`, padding: '0.45rem 0.7rem', background: courseMode === 'existing' ? '#FFFDE7' : '#fff', fontWeight: 700, fontSize: '0.73rem' }}>Curso Existente</button>
                                <button type="button" onClick={() => setCourseMode('new')} style={{ borderRadius: 8, border: `1px solid ${courseMode === 'new' ? '#FFD600' : '#E5E7EB'}`, padding: '0.45rem 0.7rem', background: courseMode === 'new' ? '#FFFDE7' : '#fff', fontWeight: 700, fontSize: '0.73rem' }}>Criar Curso no Fluxo</button>
                            </div>
                            {courseMode === 'existing' ? (
                                <select value={courseId} onChange={e => setCourseId(e.target.value)} className="form-input">
                                    <option value="">Selecione um curso...</option>
                                    {coursesByState.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            ) : (
                                <>
                                    <input className="form-input" placeholder="Nome do curso" value={newCourseName} onChange={e => setNewCourseName(e.target.value)} />
                                    <textarea className="form-input" rows={3} placeholder="Descrição" value={newCourseDesc} onChange={e => setNewCourseDesc(e.target.value)} />
                                    <textarea className="form-input" rows={4} placeholder="Ementa (fonte oficial dos módulos)" value={newCourseSyllabus} onChange={e => setNewCourseSyllabus(e.target.value)} />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        <input className="form-input" type="number" min={1} value={newCourseWorkload} onChange={e => setNewCourseWorkload(Number(e.target.value))} />
                                        <input className="form-input" type="number" min={1} value={newCourseDuration} onChange={e => setNewCourseDuration(Number(e.target.value))} />
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div style={{ display: 'grid', gap: 8 }}>
                            <select className="form-input" value={groupId} onChange={e => setGroupId(e.target.value)}>
                                <option value="">Grupo</option>
                                {groupsByState.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                            <select className="form-input" value={cityId} onChange={e => setCityId(e.target.value)}>
                                <option value="">Cidade</option>
                                {citiesByState.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select className="form-input" value={truckId} onChange={e => setTruckId(e.target.value)}>
                                <option value="">Sem carreta</option>
                                {trucksByState.map(t => <option key={t.id} value={t.id}>{t.identifier}</option>)}
                            </select>
                            <input className="form-input" placeholder="Identificador da turma" value={classIdentifier} onChange={e => setClassIdentifier(e.target.value.toUpperCase())} />
                        </div>
                    )}

                    {step === 4 && (
                        <div style={{ display: 'grid', gap: 8 }}>
                            <div style={{ fontSize: '0.76rem', color: '#374151' }}><strong>Estado:</strong> {stateUf}</div>
                            <div style={{ fontSize: '0.76rem', color: '#374151' }}><strong>Período:</strong> {periodName}</div>
                            <div style={{ fontSize: '0.76rem', color: '#374151' }}><strong>Curso:</strong> {courseMode === 'existing' ? (courses.find(c => c.id === courseId)?.name || '—') : newCourseName}</div>
                            <div style={{ fontSize: '0.76rem', color: '#374151' }}><strong>Turma:</strong> {classIdentifier}</div>
                            <div style={{ fontSize: '0.76rem', color: '#374151' }}><strong>Datas:</strong> {periodStart} até {periodEnd}</div>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <button type="button" onClick={() => setStep(s => Math.max(1, s - 1) as Step)} className="btn-ghost">
                            Voltar
                        </button>
                        {step < 4 && (
                            <button
                                type="button"
                                onClick={() => setStep(s => Math.min(4, s + 1) as Step)}
                                className="btn-primary"
                                disabled={(step === 1 && !canGoStep2) || (step === 2 && !canGoStep3) || (step === 3 && !canGoStep4)}
                            >
                                Próximo
                            </button>
                        )}
                        {step === 4 && (
                            <button type="button" onClick={submitFullFlow} className="btn-primary" disabled={loading}>
                                {loading ? 'Criando fluxo...' : 'Criar Fluxo Completo'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

