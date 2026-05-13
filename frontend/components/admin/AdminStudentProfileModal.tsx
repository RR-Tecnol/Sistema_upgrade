'use client';

import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import Link from 'next/link';
import { XMarkIcon, UserCircleIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { studentsApi, type Student } from '@/lib/api/students';
import { ENROLLMENT_DOC_LABELS, downloadEnrollmentFileFromUrl } from '@/components/enrollment/EnrollmentDocumentsPreview';
import { toast } from '@/components/ui/Toast';

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const fmtCpf = (s?: string) => (s ? s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '—');
const fmtPhone = (s?: string) => (s ? s.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : '—');
const fmtCep = (s?: string) => (s ? s.replace(/(\d{5})(\d{3})/, '$1-$2') : '—');

const GENDER_MAP: Record<string, string> = {
    MALE: 'Masculino',
    FEMALE: 'Feminino',
    NON_BINARY: 'Não-binário',
    PREFER_NOT_TO_SAY: 'Prefiro não informar',
};
const RACE_MAP: Record<string, string> = {
    WHITE: 'Branco',
    BLACK: 'Preto',
    BROWN: 'Pardo',
    YELLOW: 'Amarelo',
    INDIGENOUS: 'Indígena',
    PREFER_NOT_TO_SAY: 'Prefiro não informar',
};
const CIVIL_MAP: Record<string, string> = {
    SINGLE: 'Solteiro(a)',
    MARRIED: 'Casado(a)',
    DIVORCED: 'Divorciado(a)',
    WIDOWED: 'Viúvo(a)',
    SEPARATED: 'Separado(a)',
};
const EDU_MAP: Record<string, string> = {
    NO_FORMAL_EDUCATION: 'Sem escolaridade',
    ELEMENTARY_INCOMPLETE: 'Fund. Incompleto',
    ELEMENTARY_COMPLETE: 'Fund. Completo',
    HIGH_SCHOOL_INCOMPLETE: 'Médio Incompleto',
    HIGH_SCHOOL_COMPLETE: 'Médio Completo',
    HIGHER_INCOMPLETE: 'Superior Incompleto',
    HIGHER_COMPLETE: 'Superior Completo',
    POSTGRADUATE: 'Pós-graduação',
};
const EMP_MAP: Record<string, string> = {
    EMPLOYED_CLT: 'Empregado CLT',
    EMPLOYED_PJ: 'Empregado PJ',
    SELF_EMPLOYED: 'Autônomo',
    UNEMPLOYED: 'Desempregado',
    STUDENT: 'Estudante',
    HOMEMAKER: 'Do Lar',
    RETIRED: 'Aposentado',
    OTHER: 'Outro',
};
const INC_MAP: Record<string, string> = {
    UP_TO_1_MW: 'Até 1 SM',
    FROM_1_TO_2_MW: '1–2 SM',
    FROM_2_TO_3_MW: '2–3 SM',
    FROM_3_TO_5_MW: '3–5 SM',
    ABOVE_5_MW: 'Acima de 5 SM',
    PREFER_NOT_TO_SAY: 'Não informado',
};
const CAREER_MAP: Record<string, string> = {
    SEEK_EMPLOYMENT: 'Conseguir Emprego',
    ENTREPRENEURSHIP: 'Empreender',
    SELF_EMPLOYED: 'Trabalho Autônomo',
    NOT_SURE: 'Ainda não sei',
    OTHER: 'Outro',
};
const ZONE_MAP: Record<string, string> = { URBAN: 'Urbana', RURAL: 'Rural' };
const PROG_MAP: Record<string, string> = {
    NONE: 'Nenhum',
    BOLSA_FAMILIA: 'Bolsa Família',
    BPC: 'BPC/LOAS',
    AUXILIO_BRASIL: 'Auxílio Brasil',
    OTHER: 'Outro',
};
const ENROLL_STATUS_MAP: Record<string, string> = {
    PENDING: 'Pendente',
    APPROVED: 'Aprovado',
    REJECTED: 'Rejeitado',
    ENROLLED: 'Matriculado',
    DOCUMENT_PENDING: 'Doc. Pendente',
    WAITLIST: 'Lista Espera',
    DROPOUT: 'Desistência',
};

function Row({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.18rem' }}>
            <div
                style={{
                    fontSize: '.62rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '.09em',
                    color: '#9CA3AF',
                }}
            >
                {label}
            </div>
            <div
                style={{
                    fontSize: '.85rem',
                    fontWeight: 600,
                    color: value ? '#111827' : '#D1D5DB',
                    fontFamily: mono ? '"JetBrains Mono",monospace' : 'inherit',
                    wordBreak: 'break-word',
                }}
            >
                {value || '—'}
            </div>
        </div>
    );
}

function Section({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
    return (
        <div
            style={{
                background: '#fff',
                border: '1.5px solid #F3F4F6',
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,.05)',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '.75rem',
                    padding: '.85rem 1.1rem',
                    borderBottom: '1px solid #F9FAFB',
                    background: '#FAFBFC',
                }}
            >
                <span style={{ fontSize: '1.1rem' }}>{emoji}</span>
                <span
                    style={{
                        fontSize: '.72rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '.1em',
                        color: '#374151',
                    }}
                >
                    {title}
                </span>
            </div>
            <div style={{ padding: '1rem 1.1rem' }}>{children}</div>
        </div>
    );
}

type Props = {
    open: boolean;
    onClose: () => void;
    studentId: string | null;
    /** Destaca a matrícula ligada ao feedback (mesmo `classId`) */
    highlightClassId?: string | null;
};

export default function AdminStudentProfileModal({ open, onClose, studentId, highlightClassId }: Props) {
    const [loading, setLoading] = useState(false);
    const [student, setStudent] = useState<Student | null>(null);

    useEffect(() => {
        if (!open || !studentId) {
            setStudent(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const d = await studentsApi.getById(studentId);
                if (!cancelled) setStudent(d as Student);
            } catch {
                if (!cancelled) {
                    toast.error('Não foi possível carregar o cadastro do aluno.');
                    setStudent(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [open, studentId]);

    const s = student as any;
    const enr = s?.enrollments || [];
    const att = s?.attendances || [];
    const certs = s?.certificates || [];
    const consents = s?.legalConsents || [];
    const docs = s?.documents && typeof s.documents === 'object' ? (s.documents as Record<string, string>) : null;

    const attendanceByClass = (att as any[]).reduce(
        (acc: Record<string, { present: number; absent: number; courseName: string }>, cur: any) => {
            const k = cur.classId || 'sem_turma';
            if (!acc[k]) acc[k] = { present: 0, absent: 0, courseName: cur.class?.course?.name || 'Sem curso' };
            if (cur.present) acc[k].present += 1;
            else acc[k].absent += 1;
            return acc;
        },
        {},
    );

    const isImageUrl = (url: string) =>
        /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url) || url.includes('image');

    return (
        <Transition show={open} as={Fragment}>
            <Dialog as="div" className="relative z-[200000]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-start justify-center p-3 sm:p-6">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-150"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl border-2 border-amber-400/50 bg-white shadow-2xl transition-all">
                                <div
                                    className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5"
                                    style={{
                                        background: 'linear-gradient(135deg,#0a1f3d 0%,#133660 100%)',
                                    }}
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
                                            <UserCircleIcon className="h-7 w-7 text-amber-300" />
                                        </div>
                                        <div className="min-w-0">
                                            <Dialog.Title className="font-orbitron text-sm font-black uppercase tracking-wide text-white">
                                                Perfil do aluno
                                            </Dialog.Title>
                                            <p className="truncate text-xs text-slate-300">
                                                Cadastro completo, documentos e vínculos — mesma ficha da Central de Alunos
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                                        aria-label="Fechar"
                                    >
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                <div className="max-h-[calc(100vh-8rem)] overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
                                    {loading && (
                                        <div className="flex justify-center py-16">
                                            <div
                                                className="h-10 w-10 animate-spin rounded-full border-2 border-amber-400 border-t-transparent"
                                                aria-hidden
                                            />
                                        </div>
                                    )}

                                    {!loading && !s && (
                                        <p className="py-8 text-center text-sm text-slate-500">Sem dados para mostrar.</p>
                                    )}

                                    {!loading && s && (
                                        <div className="flex flex-col gap-4">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <Link
                                                    href={`/admin/alunos/${studentId}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 rounded-xl border-2 border-amber-500/60 bg-amber-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-amber-950 shadow-sm transition hover:bg-amber-100"
                                                >
                                                    Abrir ficha completa
                                                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                                                </Link>
                                            </div>

                                            <div className="flex flex-wrap items-start gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                                                {s.photoUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={s.photoUrl}
                                                        alt=""
                                                        className="h-24 w-24 shrink-0 rounded-full border-2 border-amber-400/50 object-cover shadow-md"
                                                    />
                                                ) : (
                                                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-700 to-slate-800 font-orbitron text-xl font-black text-white">
                                                        {(s.user?.name || '?')
                                                            .split(/\s+/)
                                                            .filter(Boolean)
                                                            .slice(0, 2)
                                                            .map((n: string) => n[0])
                                                            .join('')
                                                            .toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-lg font-black text-slate-900">
                                                        {s.socialName || s.user?.name}
                                                    </h3>
                                                    <p className="font-mono text-xs text-slate-500">{fmtCpf(s.cpf)}</p>
                                                    <p className="mt-1 text-sm text-slate-600">{s.user?.email}</p>
                                                    <p className="text-sm text-slate-600">{fmtPhone(s.user?.phone)}</p>
                                                </div>
                                            </div>

                                            <Section emoji="🔐" title="Acesso e identificação">
                                                <div
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))',
                                                        gap: '1rem',
                                                    }}
                                                >
                                                    <Row label="Nome completo" value={s.user?.name} />
                                                    <Row label="Nome social" value={s.socialName} />
                                                    <Row label="E-mail" value={s.user?.email} mono />
                                                    <Row label="Telefone" value={fmtPhone(s.user?.phone)} mono />
                                                    <Row label="CPF" value={fmtCpf(s.cpf)} mono />
                                                    <Row label="Data de nascimento" value={fmt(s.birthDate)} />
                                                    <Row label="Gênero" value={GENDER_MAP[s.gender] || s.gender} />
                                                    <Row label="Raça/cor" value={RACE_MAP[s.raceColor] || s.raceColor} />
                                                    <Row label="Estado civil" value={CIVIL_MAP[s.maritalStatus] || s.maritalStatus} />
                                                    <Row label="Nacionalidade" value={s.nationality} />
                                                    <Row
                                                        label="Naturalidade"
                                                        value={s.birthCity ? `${s.birthCity}/${s.birthState}` : undefined}
                                                    />
                                                </div>
                                            </Section>

                                            {docs && Object.keys(docs).some((k) => docs[k] && String(docs[k]).trim()) && (
                                                <Section emoji="📁" title="Documentos e imagens enviados">
                                                    <div style={{ marginBottom: '0.75rem' }}>
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                const entries = Object.entries(docs).filter(
                                                                    ([, v]) => v && String(v).trim().length > 0,
                                                                );
                                                                const prefix = (s.cpf || 'aluno').replace(/\D/g, '') || 'aluno';
                                                                for (const [key, raw] of entries) {
                                                                    await downloadEnrollmentFileFromUrl(
                                                                        String(raw).trim(),
                                                                        `${prefix}_${key}`,
                                                                    );
                                                                    await new Promise((r) => setTimeout(r, 280));
                                                                }
                                                            }}
                                                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
                                                        >
                                                            Baixar todos
                                                        </button>
                                                    </div>
                                                    <div className="grid gap-3 sm:grid-cols-2">
                                                        {(['identidade', 'cpfDoc', 'addressProof', 'educationProof', 'photo'] as const).map(
                                                            (key) => {
                                                                const href = docs[key];
                                                                if (!href || !String(href).trim()) return null;
                                                                const url = String(href).trim();
                                                                const label = ENROLLMENT_DOC_LABELS[key] || key;
                                                                return (
                                                                    <div
                                                                        key={key}
                                                                        className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3"
                                                                    >
                                                                        <div className="text-xs font-bold text-slate-800">{label}</div>
                                                                        {isImageUrl(url) ? (
                                                                            // eslint-disable-next-line @next/next/no-img-element
                                                                            <img
                                                                                src={url}
                                                                                alt={label}
                                                                                className="max-h-40 w-full rounded-lg border object-contain"
                                                                            />
                                                                        ) : null}
                                                                        <div className="flex flex-wrap gap-2">
                                                                            <a
                                                                                href={url}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="text-xs font-bold text-blue-600 underline"
                                                                            >
                                                                                Abrir link
                                                                            </a>
                                                                            <button
                                                                                type="button"
                                                                                className="text-xs font-bold text-slate-600 underline"
                                                                                onClick={() =>
                                                                                    downloadEnrollmentFileFromUrl(
                                                                                        url,
                                                                                        `${(s.cpf || 'aluno').replace(/\D/g, '') || 'aluno'}_${key}`,
                                                                                    )
                                                                                }
                                                                            >
                                                                                Baixar
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                </Section>
                                            )}

                                            <Section emoji="👨‍👩‍👧" title="Filiação">
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                    <Row label="Nome da mãe" value={s.motherName} />
                                                    <Row label="Nome do pai" value={s.fatherName} />
                                                </div>
                                            </Section>

                                            {s.contact && (
                                                <Section emoji="📬" title="Contato e preferências">
                                                    <div
                                                        style={{
                                                            display: 'grid',
                                                            gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))',
                                                            gap: '1rem',
                                                        }}
                                                    >
                                                        <Row label="Telefone alternativo" value={fmtPhone(s.contact.phoneAlt)} mono />
                                                        <Row
                                                            label="Possui WhatsApp"
                                                            value={s.contact.hasWhatsapp ? 'Sim' : 'Não'}
                                                        />
                                                        <Row
                                                            label="Aceita WhatsApp"
                                                            value={s.contact.allowWhatsappContact ? 'Sim' : 'Não'}
                                                        />
                                                        <Row label="Aceita e-mail" value={s.contact.allowEmailContact ? 'Sim' : 'Não'} />
                                                    </div>
                                                </Section>
                                            )}

                                            {s.address && (
                                                <Section emoji="📍" title="Endereço">
                                                    <div
                                                        style={{
                                                            display: 'grid',
                                                            gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))',
                                                            gap: '1rem',
                                                        }}
                                                    >
                                                        <Row label="CEP" value={fmtCep(s.address.cep)} mono />
                                                        <Row label="Logradouro" value={s.address.street} />
                                                        <Row label="Número" value={s.address.number} />
                                                        <Row label="Complemento" value={s.address.complement} />
                                                        <Row label="Bairro" value={s.address.neighborhood} />
                                                        <Row label="Cidade" value={s.address.city} />
                                                        <Row label="Estado" value={s.address.state} />
                                                        <Row label="Zona" value={ZONE_MAP[s.address.zone] || s.address.zone} />
                                                    </div>
                                                </Section>
                                            )}

                                            {s.socioeconomic && (
                                                <Section emoji="📊" title="Socioeconómico e acessibilidade">
                                                    <div
                                                        style={{
                                                            display: 'grid',
                                                            gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))',
                                                            gap: '1rem',
                                                        }}
                                                    >
                                                        <Row
                                                            label="Escolaridade"
                                                            value={EDU_MAP[s.socioeconomic.educationLevel] || s.socioeconomic.educationLevel}
                                                        />
                                                        <Row
                                                            label="Situação de emprego"
                                                            value={EMP_MAP[s.socioeconomic.employmentStatus] || s.socioeconomic.employmentStatus}
                                                        />
                                                        <Row
                                                            label="Renda familiar"
                                                            value={INC_MAP[s.socioeconomic.familyIncome] || s.socioeconomic.familyIncome}
                                                        />
                                                        <Row
                                                            label="Membros na família"
                                                            value={String(s.socioeconomic.familyMembersCount ?? '')}
                                                        />
                                                        <Row
                                                            label="Programa social"
                                                            value={PROG_MAP[s.socioeconomic.socialProgram] || s.socioeconomic.socialProgram}
                                                        />
                                                        <Row label="PcD" value={s.socioeconomic.hasDisability ? 'Sim' : 'Não'} />
                                                        {s.socioeconomic.hasDisability ? (
                                                            <>
                                                                <Row label="Tipo de deficiência" value={s.socioeconomic.disabilityType} />
                                                                <Row
                                                                    label="Precisa adaptação"
                                                                    value={s.socioeconomic.disabilityAdaptation ? 'Sim' : 'Não'}
                                                                />
                                                            </>
                                                        ) : null}
                                                    </div>
                                                </Section>
                                            )}

                                            {s.professional && (
                                                <Section emoji="🎯" title="Carreira e motivação">
                                                    <div
                                                        style={{
                                                            display: 'grid',
                                                            gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))',
                                                            gap: '1rem',
                                                        }}
                                                    >
                                                        <Row
                                                            label="Objetivo"
                                                            value={CAREER_MAP[s.professional.careerGoal] || s.professional.careerGoal}
                                                        />
                                                        <Row label="Qualificação anterior" value={s.professional.previousQualification} />
                                                        <Row label="Área de interesse" value={s.professional.professionalInterest} />
                                                        <Row label="Como nos conheceu" value={s.professional.howHeardAbout} />
                                                    </div>
                                                    {s.professional.motivation ? (
                                                        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                                                            {s.professional.motivation}
                                                        </div>
                                                    ) : null}
                                                </Section>
                                            )}

                                            <Section emoji="📋" title="Matrículas">
                                                {enr.length === 0 ? (
                                                    <p className="text-sm text-slate-500">Nenhuma matrícula.</p>
                                                ) : (
                                                    <div className="flex flex-col gap-2">
                                                        {enr.map((e: any) => {
                                                            const hl = highlightClassId && e.classId === highlightClassId;
                                                            return (
                                                                <div
                                                                    key={e.id}
                                                                    className={`rounded-xl border p-3 ${hl ? 'border-amber-500 bg-amber-50/80' : 'border-slate-200 bg-white'}`}
                                                                >
                                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                                        <span className="font-bold text-slate-900">
                                                                            {e.class?.course?.name || '—'}
                                                                        </span>
                                                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                                                                            {ENROLL_STATUS_MAP[e.status] || e.status}
                                                                        </span>
                                                                    </div>
                                                                    <div className="mt-1 text-xs text-slate-500">
                                                                        {e.class?.city?.name}
                                                                        {e.class?.city?.state ? `/${e.class.city.state}` : ''} ·{' '}
                                                                        <span className="font-mono">{e.protocol}</span>
                                                                        {hl ? (
                                                                            <span className="ml-2 font-bold text-amber-800">
                                                                                · Turma deste feedback
                                                                            </span>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </Section>

                                            <Section emoji="📈" title="Frequência (resumo por turma)">
                                                {Object.keys(attendanceByClass).length === 0 ? (
                                                    <p className="text-sm text-slate-500">Sem histórico de frequência carregado.</p>
                                                ) : (
                                                    <div className="flex flex-col gap-2">
                                                        {Object.entries(attendanceByClass).map(([cid, data]) => {
                                                            const total = data.present + data.absent;
                                                            const rate = total ? Math.round((data.present / total) * 100) : 0;
                                                            return (
                                                                <div key={cid} className="rounded-lg border border-slate-200 p-3 text-sm">
                                                                    <div className="flex justify-between gap-2 font-bold text-slate-800">
                                                                        <span>{data.courseName}</span>
                                                                        <span className={rate >= 75 ? 'text-emerald-700' : 'text-red-600'}>
                                                                            {rate}%
                                                                        </span>
                                                                    </div>
                                                                    <div className="mt-1 text-xs text-slate-500">
                                                                        P: {data.present} · F: {data.absent}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </Section>

                                            <Section emoji="🏅" title="Certificados">
                                                {certs.length === 0 ? (
                                                    <p className="text-sm text-slate-500">Nenhum certificado listado.</p>
                                                ) : (
                                                    <div className="flex flex-col gap-2">
                                                        {certs.map((c: any) => (
                                                            <div key={c.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                                                                <div className="font-bold">{c.class?.course?.name || 'Curso'}</div>
                                                                <div className="text-xs text-slate-500">
                                                                    Emitido: {fmt(c.issuedAt)} · {c.verificationCode || ''}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </Section>

                                            {consents.length > 0 && (
                                                <Section emoji="🧾" title="Consentimentos (LGPD)">
                                                    <ul className="space-y-2 text-xs text-slate-600">
                                                        {consents.slice(0, 20).map((c: any) => (
                                                            <li key={c.id} className="rounded-lg border border-slate-100 bg-slate-50/80 p-2">
                                                                <div className="font-mono font-bold text-slate-800">{fmt(c.recordedAt)}</div>
                                                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.65rem]">
                                                                    {c.termsAccepted ? <span>✓ Termos</span> : null}
                                                                    {c.dataProcessingConsent ? <span>✓ Tratamento dados</span> : null}
                                                                    {c.imageUseAuthorization ? <span>✓ Imagem</span> : null}
                                                                    {c.attendanceCommitment ? <span>✓ Frequência</span> : null}
                                                                    {c.privacyPolicyAccepted ? <span>✓ Privacidade</span> : null}
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </Section>
                                            )}
                                        </div>
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
