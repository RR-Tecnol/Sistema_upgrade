'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
    XMarkIcon,
    AcademicCapIcon,
    TruckIcon,
    UserIcon,
    CalendarDaysIcon,
    CheckCircleIcon,
    XCircleIcon,
    ChartPieIcon,
} from '@heroicons/react/24/outline';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';

type EmployeeTimelineRow = {
    date: string;
    present: boolean | null;
    justified: boolean;
    justification: string | null;
    source: 'MANUAL' | 'AUTO_CHECKIN' | 'ADMIN_OVERRIDE' | 'PENDING';
    checkinTime: string | null;
    adminOverrideReason: string | null;
    registrar: { id: string; name: string } | null;
    attendanceId: string | null;
};

type EmployeePayload = {
    profile: Record<string, unknown>;
    period: { start: string; end: string };
    summary: {
        presentCount: number;
        absentCount: number;
        pendingCount: number;
        decidedDays: number;
        rate: number;
    };
    timeline: EmployeeTimelineRow[];
};

type StudentPayload = {
    profile: Record<string, unknown>;
    enrollment: { status: string };
    class: {
        id: string;
        classIdentifier: string;
        course: { name: string; workloadHours?: number };
        city: { name: string; state: string };
        /** Professor titular (não substituto), quando existir na turma */
        mainTeacherName?: string | null;
    } | null;
    period: { start: string; end: string };
    summary: {
        presentCount: number;
        absentCount: number;
        totalMarkedDays: number;
        rate: number;
        certificateMinimumPercent: number;
        meetsCertificateAttendance: boolean;
    };
    records: Array<{
        id: string;
        date: string;
        present: boolean;
        justified: boolean;
        justification: string | null;
        registrarName?: string;
        registeredAt: string;
    }>;
};

const TEACHER_FOCUS = [
    'Registro diário na Central de Frequência (presença/falta ou override administrativo).',
    'Check-in automático pelo app do professor, quando disponível para o dia.',
    'Coerência com turmas em que leciona — use o painel do professor para lançar frequência dos alunos.',
    'Documentação pedagógica e vínculo à área académica (coordenação de cursos).',
];

const DRIVER_FOCUS = [
    'Check-in de motorista (app) sincronizado com o registo de ponto diário.',
    'Registo manual ou override na Central ADM quando não houver check-in automático.',
    'Controlo operacional: escala de viagens e conformidade com logística da turma/período.',
    'Parâmetros de viagem (ex.: regra de km / diárias) consultáveis no cadastro do funcionário.',
];

const STUDENT_FOCUS = [
    'Frequência por dia letivo na turma selecionada — cada linha é um dia com marcação.',
    'Percentual global das aulas já registadas no período (presentes vs faltas).',
    'Para certificação, referência de 75% de presença nas regras académicas do sistema.',
    'Justificativas e fotos de turma, quando existentes, ficam ligadas ao registo do dia.',
];

function ProfileIcon({ kind }: { kind: 'teacher' | 'driver' | 'student' }) {
    if (kind === 'teacher') return <AcademicCapIcon className="w-8 h-8 text-blue-500" />;
    if (kind === 'driver') return <TruckIcon className="w-8 h-8 text-amber-600" />;
    return <UserIcon className="w-8 h-8 text-emerald-600" />;
}

/** Campos dentro do modal: fundo amarelo-opaco exclusivo da caixa — texto legível em slate */
function PeriodDateRangeBar({
    start,
    end,
    onStartChange,
    onEndChange,
    onLast120Days,
}: {
    start: string;
    end: string;
    onStartChange: (v: string) => void;
    onEndChange: (v: string) => void;
    onLast120Days: () => void;
}) {
    const inputClass =
        'w-full rounded-xl border-2 border-amber-400/70 bg-white pl-10 pr-3 py-2.5 text-sm font-mono text-slate-900 shadow-inner outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-300/80';

    return (
        <div className="rounded-2xl border border-amber-400/70 bg-white/95 p-4 shadow-inner">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4 mb-3">
                <p className="font-orbitron text-[0.65rem] font-bold uppercase tracking-[0.12em] text-amber-900">
                    Período de consulta
                </p>
                <button
                    type="button"
                    onClick={onLast120Days}
                    className="self-start rounded-lg border-2 border-amber-600/50 bg-amber-200/80 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-950 shadow-sm transition hover:bg-amber-300/90 sm:self-auto"
                >
                    Últimos ~120 dias
                </button>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-4">
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <label className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-600">Início</label>
                    <div className="relative">
                        <CalendarDaysIcon
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700"
                            aria-hidden
                        />
                        <input
                            type="date"
                            value={start}
                            onChange={e => onStartChange(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                </div>
                <div
                    className="hidden shrink-0 pb-2 text-lg font-black text-amber-800 sm:flex sm:items-center"
                    aria-hidden
                >
                    →
                </div>
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <label className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-600">Fim</label>
                    <div className="relative">
                        <CalendarDaysIcon
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700"
                            aria-hidden
                        />
                        <input
                            type="date"
                            value={end}
                            onChange={e => onEndChange(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function FrequencySummaryCards({
    periodStart,
    periodEnd,
    presentCount,
    absentCount,
    rateLabel,
    rateDisplay,
}: {
    periodStart: string;
    periodEnd: string;
    presentCount: number;
    absentCount: number;
    rateLabel: string;
    rateDisplay: string;
}) {
    const shell =
        'flex flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-amber-400/55 bg-white/90 px-3 py-4 text-center shadow-sm min-h-[108px] min-w-[100px]';

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className={shell}>
                <CalendarDaysIcon className="h-5 w-5 text-amber-800" aria-hidden />
                <span className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-600">Período</span>
                <span className="text-[0.7rem] font-mono leading-snug text-slate-900">
                    {periodStart}
                    <span className="mx-0.5 text-amber-700">→</span>
                    {periodEnd}
                </span>
            </div>
            <div className={shell}>
                <CheckCircleIcon className="h-5 w-5 text-emerald-400" aria-hidden />
                <span className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-600">Presenças</span>
                <span className="font-orbitron text-2xl font-bold text-emerald-400">{presentCount}</span>
            </div>
            <div className={shell}>
                <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden />
                <span className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-600">Faltas</span>
                <span className="font-orbitron text-2xl font-bold text-red-400">{absentCount}</span>
            </div>
            <div className={shell}>
                <ChartPieIcon className="h-5 w-5 text-amber-700" aria-hidden />
                <span className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-600 leading-tight">
                    {rateLabel}
                </span>
                <span className="font-orbitron text-2xl font-bold text-amber-900">{rateDisplay}</span>
            </div>
        </div>
    );
}

export default function IndividualAttendanceDetailModal({
    open,
    onClose,
    mode,
    employeeId,
    employeeRoleApi,
    classId,
    studentId,
}: {
    open: boolean;
    onClose: () => void;
    mode: 'employee' | 'student';
    employeeId?: string;
    /** TEACHER | DRIVER — alinha com EmployeeFrequencyTab */
    employeeRoleApi?: 'TEACHER' | 'DRIVER';
    classId?: string;
    studentId?: string;
}) {
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [employeeData, setEmployeeData] = useState<EmployeePayload | null>(null);
    const [studentData, setStudentData] = useState<StudentPayload | null>(null);
    const [start, setStart] = useState(() => {
        const s = new Date();
        s.setUTCDate(s.getUTCDate() - 120);
        return s.toISOString().split('T')[0];
    });
    const [end, setEnd] = useState(() => new Date().toISOString().split('T')[0]);
    const fetchSeq = useRef(0);

    useEffect(() => {
        if (!open) {
            setEmployeeData(null);
            setStudentData(null);
            setLoadError(false);
            setLoading(false);
            return;
        }
        if (!start || !end) return;

        const seq = ++fetchSeq.current;
        setLoading(true);
        setLoadError(false);
        setEmployeeData(null);
        setStudentData(null);

        const load = async () => {
            try {
                if (mode === 'employee' && employeeId) {
                    const res = await api.get(`/employees/attendance/individual/${employeeId}`, {
                        params: { start, end },
                    });
                    if (seq !== fetchSeq.current) return;
                    setEmployeeData(res.data);
                    setStudentData(null);
                } else if (mode === 'student' && classId && studentId) {
                    const res = await api.get(`/classes/${classId}/attendance/student/${studentId}`, {
                        params: { start, end },
                    });
                    if (seq !== fetchSeq.current) return;
                    setStudentData(res.data);
                    setEmployeeData(null);
                }
            } catch {
                if (seq !== fetchSeq.current) return;
                toast.error('Não foi possível carregar o detalhe de frequência.');
                setEmployeeData(null);
                setStudentData(null);
                setLoadError(true);
            } finally {
                if (seq === fetchSeq.current) setLoading(false);
            }
        };
        load();
    }, [open, mode, employeeId, classId, studentId, start, end]);

    const focusItems =
        mode === 'student'
            ? STUDENT_FOCUS
            : employeeRoleApi === 'DRIVER'
              ? DRIVER_FOCUS
              : TEACHER_FOCUS;

    const profileKind = mode === 'student' ? 'student' : employeeRoleApi === 'DRIVER' ? 'driver' : 'teacher';

    return (
        <Transition appear show={open} as={Fragment}>
            <Dialog as="div" className="relative z-[500]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/70" aria-hidden />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-150"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="isolate w-full max-w-3xl transform overflow-hidden rounded-2xl border-2 border-amber-400/90 bg-gradient-to-b from-amber-50 via-amber-100 to-yellow-50 text-slate-900 shadow-2xl ring-1 ring-black/10 transition-all max-h-[90vh] flex flex-col">
                                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-amber-400/70 bg-amber-200/50 p-5 backdrop-blur-[2px]">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <ProfileIcon kind={profileKind} />
                                        <div className="min-w-0">
                                            <Dialog.Title className="truncate font-orbitron text-lg font-bold text-slate-900">
                                                Frequência individual
                                            </Dialog.Title>
                                            <p className="mt-0.5 text-xs text-slate-600">
                                                Dados cadastrais, resumo do período e critérios por perfil
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="rounded-lg p-2 text-slate-600 transition hover:bg-white/60 hover:text-slate-900"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                                    <PeriodDateRangeBar
                                        start={start}
                                        end={end}
                                        onStartChange={setStart}
                                        onEndChange={setEnd}
                                        onLast120Days={() => {
                                            const e = new Date();
                                            setEnd(e.toISOString().split('T')[0]);
                                            const s = new Date();
                                            s.setUTCDate(s.getUTCDate() - 120);
                                            setStart(s.toISOString().split('T')[0]);
                                        }}
                                    />

                                    {loading ? (
                                        <div className="py-12 text-center">
                                            <div className="spinner mx-auto mb-3" />
                                            <p className="font-orbitron text-xs tracking-widest text-slate-500">
                                                A CARREGAR...
                                            </p>
                                        </div>
                                    ) : mode === 'employee' && employeeData ? (
                                        <EmployeeDetailBody data={employeeData} focusItems={focusItems} />
                                    ) : mode === 'student' && studentData ? (
                                        <StudentDetailBody data={studentData} focusItems={focusItems} />
                                    ) : loadError ? (
                                        <div
                                            className="rounded-xl border border-amber-300/80 bg-white/90 p-6 text-center shadow-sm"
                                            role="alert"
                                        >
                                            <p className="text-sm font-semibold text-slate-900">
                                                Não foi possível carregar os dados.
                                            </p>
                                            <p className="mt-2 text-xs text-slate-600">
                                                Verifique a ligação e tente fechar e abrir novamente.
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="py-8 text-center text-sm text-slate-600">
                                            Sem dados para este período ou perfil.
                                        </p>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

function EmployeeDetailBody({
    data,
    focusItems,
}: {
    data: EmployeePayload;
    focusItems: string[];
}) {
    const p = data.profile as {
        name: string;
        role: string;
        department: string;
        cpf?: string | null;
        email?: string | null;
        phone?: string | null;
        specialty?: string | null;
        hireDate?: string | null;
        dailyCost?: number | null;
        travelRuleKm?: number | null;
        notes?: string | null;
        user?: { email?: string; phone?: string };
    };

    return (
        <>
            <section className="rounded-xl border border-amber-300/80 bg-white/95 p-4 shadow-sm">
                <h3 className="mb-3 font-orbitron text-[0.65rem] tracking-[0.15em] text-amber-950">
                    CADASTRO
                </h3>
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <div>
                        <span className="text-xs text-slate-500">Nome</span>
                        <div className="font-semibold">{p.name}</div>
                    </div>
                    <div>
                        <span className="text-xs text-slate-500">Cargo / Departamento</span>
                        <div>
                            {p.role} · {p.department}
                        </div>
                    </div>
                    {p.cpf && (
                        <div>
                            <span className="text-xs text-slate-500">CPF</span>
                            <div className="font-mono text-xs">{p.cpf}</div>
                        </div>
                    )}
                    {(p.email || p.user?.email) && (
                        <div>
                            <span className="text-xs text-slate-500">E-mail</span>
                            <div>{p.email || p.user?.email}</div>
                        </div>
                    )}
                    {(p.phone || p.user?.phone) && (
                        <div>
                            <span className="text-xs text-slate-500">Telefone</span>
                            <div>{p.phone || p.user?.phone}</div>
                        </div>
                    )}
                    {p.specialty && (
                        <div>
                            <span className="text-xs text-slate-500">Especialidade</span>
                            <div>{p.specialty}</div>
                        </div>
                    )}
                    {p.hireDate && (
                        <div>
                            <span className="text-xs text-slate-500">Admissão</span>
                            <div>{new Date(p.hireDate).toLocaleDateString('pt-BR')}</div>
                        </div>
                    )}
                    {p.dailyCost != null && (
                        <div>
                            <span className="text-xs text-slate-500">Diária (referência)</span>
                            <div>
                                {p.dailyCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                        </div>
                    )}
                    {p.travelRuleKm != null && (
                        <div>
                            <span className="text-xs text-slate-500">Regra km (viagem)</span>
                            <div>{p.travelRuleKm} km</div>
                        </div>
                    )}
                </div>
                {p.notes && (
                    <p className="mt-3 border-t border-amber-200/80 pt-3 text-xs text-slate-600">
                        Notas: {p.notes}
                    </p>
                )}
            </section>

            <section className="rounded-xl border border-amber-300/80 bg-white/95 p-4 shadow-sm">
                <h3 className="mb-2 font-orbitron text-[0.65rem] tracking-[0.15em] text-amber-950">
                    O QUE VERIFICAR NESTE PERFIL
                </h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {focusItems.map(t => (
                        <li key={t}>{t}</li>
                    ))}
                </ul>
            </section>

            <section className="rounded-xl border border-amber-300/80 bg-white/90 p-4 shadow-inner">
                <div className="mb-4">
                    <FrequencySummaryCards
                        periodStart={data.period.start}
                        periodEnd={data.period.end}
                        presentCount={data.summary.presentCount}
                        absentCount={data.summary.absentCount}
                        rateLabel="Taxa (dias decididos)"
                        rateDisplay={`${data.summary.rate}%`}
                    />
                </div>

                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                    Linha do tempo
                </h4>
                <div className="max-h-56 overflow-y-auto rounded-lg border border-amber-300/70 bg-white">
                    <table className="w-full border-collapse text-xs [&_td]:border-b [&_td]:border-amber-200/70 [&_td]:px-2 [&_td]:py-2 [&_th]:border-b [&_th]:border-amber-300 [&_th]:bg-amber-200/70 [&_th]:px-2 [&_th]:py-2 [&_th]:text-left [&_th]:text-[0.6rem] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-700">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Estado</th>
                                <th>Origem</th>
                                <th>Detalhe</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.timeline.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-6 text-center text-slate-500">
                                        Nenhum registo neste período.
                                    </td>
                                </tr>
                            ) : (
                                data.timeline
                                    .slice()
                                    .reverse()
                                    .map(row => (
                                        <tr key={row.date}>
                                            <td className="font-mono whitespace-nowrap">{row.date}</td>
                                            <td>
                                                {row.present === true ? (
                                                    <span className="font-bold text-emerald-700">Presente</span>
                                                ) : row.present === false ? (
                                                    <span className="font-bold text-red-600">Falta</span>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td>
                                                {row.source === 'AUTO_CHECKIN'
                                                    ? 'App / check-in'
                                                    : row.source === 'ADMIN_OVERRIDE'
                                                      ? 'Override ADM'
                                                      : row.source === 'MANUAL'
                                                        ? 'Manual'
                                                        : '—'}
                                            </td>
                                            <td className="max-w-[200px] truncate" title={row.checkinTime || row.adminOverrideReason || ''}>
                                                {row.checkinTime && (
                                                    <span className="block font-mono">
                                                        {new Date(row.checkinTime).toLocaleString('pt-BR')}
                                                    </span>
                                                )}
                                                {row.adminOverrideReason && (
                                                    <span className="text-slate-600">{row.adminOverrideReason}</span>
                                                )}
                                                {row.registrar && (
                                                    <span className="block text-slate-500">
                                                        Por {row.registrar.name}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    );
}

function formatPtDate(iso?: string | null) {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
}

function StudentDetailBody({
    data,
    focusItems,
}: {
    data: StudentPayload;
    focusItems: string[];
}) {
    const p = data.profile as {
        cpf?: string | null;
        birthDate?: string | null;
        gender?: string | null;
        socialName?: string | null;
        photoUrl?: string | null;
        user?: { name?: string; email?: string; phone?: string };
        contact?: { email?: string; phone?: string };
        address?: {
            street?: string;
            number?: string;
            city?: string;
            state?: string;
            neighborhood?: string;
        };
    };

    const addr = p.address;
    const hasAddress =
        addr &&
        [addr.street, addr.number, addr.city, addr.state, addr.neighborhood].some(
            v => typeof v === 'string' && v.trim().length > 0,
        );

    return (
        <>
            <section className="rounded-xl border border-amber-300/80 bg-white/95 p-4 shadow-sm">
                <h3 className="mb-3 font-orbitron text-[0.65rem] tracking-[0.15em] text-amber-950">
                    CADASTRO DO ALUNO
                </h3>
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <div>
                        <span className="text-xs text-slate-500">Nome</span>
                        <div className="font-semibold">{p.user?.name || '—'}</div>
                    </div>
                    {p.socialName && (
                        <div>
                            <span className="text-xs text-slate-500">Nome social</span>
                            <div>{p.socialName}</div>
                        </div>
                    )}
                    <div>
                        <span className="text-xs text-slate-500">CPF</span>
                        <div className="font-mono text-xs">{p.cpf || '—'}</div>
                    </div>
                    <div>
                        <span className="text-xs text-slate-500">Nascimento</span>
                        <div>{formatPtDate(p.birthDate)}</div>
                    </div>
                    <div>
                        <span className="text-xs text-slate-500">Género</span>
                        <div>{p.gender || '—'}</div>
                    </div>
                    {(p.contact?.email || p.user?.email) && (
                        <div>
                            <span className="text-xs text-slate-500">Contacto</span>
                            <div>{p.contact?.email || p.user?.email}</div>
                        </div>
                    )}
                    {(p.contact?.phone || p.user?.phone) && (
                        <div>
                            <span className="text-xs text-slate-500">Telefone</span>
                            <div>{p.contact?.phone || p.user?.phone}</div>
                        </div>
                    )}
                    {hasAddress && addr && (
                        <div className="sm:col-span-2">
                            <span className="text-xs text-slate-500">Morada</span>
                            <div>
                                {[addr.street, addr.number].filter(Boolean).join(', ') || '—'} —{' '}
                                {[addr.neighborhood, addr.city, addr.state].filter(Boolean).join(' · ') || '—'}
                            </div>
                        </div>
                    )}
                </div>
                {data.class && (
                    <div className="mt-3 space-y-1 border-t border-amber-200/80 pt-3 text-sm">
                        <p>
                            <strong>Turma:</strong> {data.class.classIdentifier} — {data.class.course?.name}{' '}
                            <span className="text-slate-500">
                                ({data.class.city?.name}/{data.class.city?.state})
                            </span>
                        </p>
                        {data.class.mainTeacherName ? (
                            <p className="text-slate-700">
                                <strong>Professor(a) titular:</strong> {data.class.mainTeacherName}
                            </p>
                        ) : (
                            <p className="text-xs text-slate-500">
                                Professor(a) titular ainda não associado a esta turma no sistema.
                            </p>
                        )}
                    </div>
                )}
                <p className="mt-2 text-xs text-slate-600">
                    Estado da matrícula: <strong>{data.enrollment.status}</strong>
                </p>
            </section>

            <section className="rounded-xl border border-amber-300/80 bg-white/95 p-4 shadow-sm">
                <h3 className="mb-2 font-orbitron text-[0.65rem] tracking-[0.15em] text-amber-950">
                    CRITÉRIOS ACADÉMICOS (ALUNO)
                </h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {focusItems.map(t => (
                        <li key={t}>{t}</li>
                    ))}
                </ul>
            </section>

            <section className="rounded-xl border border-amber-300/80 bg-white/90 p-4 shadow-inner">
                <div className="mb-4">
                    <FrequencySummaryCards
                        periodStart={data.period.start}
                        periodEnd={data.period.end}
                        presentCount={data.summary.presentCount}
                        absentCount={data.summary.absentCount}
                        rateLabel="Taxa"
                        rateDisplay={`${data.summary.rate}%`}
                    />
                </div>
                <p
                    className={`mb-4 text-sm font-semibold ${
                        data.summary.meetsCertificateAttendance ? 'text-emerald-700' : 'text-orange-700'
                    }`}
                >
                    Meta certificação: {data.summary.certificateMinimumPercent}% —{' '}
                    {data.summary.meetsCertificateAttendance
                        ? 'Percentual do período igual ou acima da referência.'
                        : 'Percentual do período abaixo da referência (avaliar recuperação / contexto da turma).'}
                </p>

                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                    Registos por dia
                </h4>
                {data.records.length === 0 ? (
                    <div
                        className="rounded-lg border border-amber-400/60 bg-amber-100/70 px-4 py-5 text-sm text-slate-800"
                        role="status"
                    >
                        <p className="font-semibold text-amber-950">Nenhuma marcação neste intervalo de datas</p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-600">
                            Não há lançamentos de presença ou falta para este aluno na turma entre{' '}
                            <span className="font-mono text-slate-800">{data.period.start}</span> e{' '}
                            <span className="font-mono text-slate-800">{data.period.end}</span>. Ajuste
                            as datas acima ou aguarde o professor / coordenação registar frequência.
                        </p>
                    </div>
                ) : (
                    <div className="max-h-56 overflow-y-auto rounded-lg border border-amber-300/70 bg-white">
                        <table className="w-full border-collapse text-xs [&_td]:border-b [&_td]:border-amber-200/70 [&_td]:px-2 [&_td]:py-2 [&_th]:border-b [&_th]:border-amber-300 [&_th]:bg-amber-200/70 [&_th]:px-2 [&_th]:py-2 [&_th]:text-left [&_th]:text-[0.6rem] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-700">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Presença</th>
                                    <th>Registado por</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.records.map(row => (
                                    <tr key={row.id}>
                                        <td className="font-mono whitespace-nowrap">{row.date}</td>
                                        <td>{row.present ? '✓ Presente' : '✕ Falta'}</td>
                                        <td className="truncate max-w-[140px]" title={row.registrarName}>
                                            {row.registrarName || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </>
    );
}
