'use client';

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';
import { useAdminFinanceRefresh } from '@/hooks/useAdminFinanceRefresh';
import {
    MagnifyingGlassIcon,
    CheckCircleIcon,
    XCircleIcon,
    EyeIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { AdminListPagination } from '@/components/admin/AdminListPagination';
import { normalizePaginated, ADMIN_PAGE_SIZE_TABLE } from '@/lib/api/pagination';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { InscricoesSidebarTutorial } from '@/components/admin/adminSidebarTutorials';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import {
    EnrollmentDocumentsPreview,
    ENROLLMENT_DOC_LABELS,
    REQUIRED_ENROLLMENT_DOC_KEYS,
    getMissingEnrollmentDocumentEntries,
} from '@/components/enrollment/EnrollmentDocumentsPreview';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';
import {
    EmployeeStyleAdminDetailShell,
    EmployeeStylePill,
    EmployeeStyleSectionTitle,
} from '@/components/admin/employee-style-admin-detail';
import { customConfirm } from '@/components/ui/ConfirmModal';
import StudentDocumentUploadList, {
    buildDocumentsPayload,
    parseStudentDocumentsFromApi,
} from '@/components/documents/StudentDocumentUploadList';

interface Enrollment {
    id: string;
    protocol: string;
    status: string;
    createdAt: string;
    student: {
        id?: string;
        user?: { name?: string };
        fullName?: string;
        cpf?: string;
        /** JSON da inscrição pública (URLs MinIO / data URLs por chave) */
        documents?: Record<string, string> | null;
    };
    class: { classIdentifier?: string; name?: string; course?: { name: string } };
    reviewedAt?: string;
    rejectionReason?: string;
    notes?: string;
}

interface EnrollmentDetail {
    id: string;
    protocol: string;
    status: string;
    createdAt: string;
    reviewedAt?: string;
    rejectionReason?: string;
    notes?: string;
    student: Enrollment['student'] & {
        user?: { name?: string; email?: string; phone?: string };
        contact?: { email?: string; phone?: string; phoneAlt?: string };
        address?: { city?: string; state?: string; neighborhood?: string; street?: string; number?: string };
    };
    reviewer?: { name?: string };
    consents?: {
        termsAccepted?: boolean;
        dataProcessing?: boolean;
        imageUse?: boolean;
        attendanceCommitment?: boolean;
        privacyPolicyAccepted?: boolean;
    };
    class: Enrollment['class'] & {
        startDate?: string;
        endDate?: string;
        period?: string;
        enrollmentOpenDate?: string;
        enrollmentCloseDate?: string;
        vacancies?: number;
        _count?: { enrollments?: number };
    };
}

type DocReviewState = 'PENDING' | 'VALID' | 'INVALID';
type DocReviewMap = Record<string, DocReviewState>;

/** Payload guardado serializado em `enrollment.notes` (PATCH status / revisão docs). */
type EnrollmentStoredNotesPayload = {
    docReview?: DocReviewMap;
    updatedAt?: string;
    approvedByAdmin?: boolean;
    approvedAsException?: boolean;
    approvedAt?: string;
};

const DOC_REVIEW_PRETTY: Record<DocReviewState, { label: string; emoji: string; color: string }> = {
    VALID: { label: 'validado pela equipe', emoji: '✅', color: '#166534' },
    INVALID: { label: 'marcado como inválido na revisão', emoji: '❌', color: '#991B1B' },
    PENDING: { label: 'aguardando revisão', emoji: '⏳', color: '#92400E' },
};

function enrollmentDocLabelHuman(key: string): string {
    return ENROLLMENT_DOC_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
}

function stripEnrollmentNotesPrefix(raw: string): string {
    return raw.trim().replace(/^observa[çc][õo]es do fluxo:\s*/i, '').trim();
}

function parseEnrollmentStoredNotes(raw: string): EnrollmentStoredNotesPayload | null {
    const candidate = stripEnrollmentNotesPrefix(raw);
    if (!candidate.startsWith('{')) return null;
    try {
        const parsed = JSON.parse(candidate) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        const o = parsed as Record<string, unknown>;
        const flowKeys = new Set([
            'docReview',
            'updatedAt',
            'approvedAt',
            'approvedByAdmin',
            'approvedAsException',
        ]);
        if (!Object.keys(o).some((k) => flowKeys.has(k))) return null;
        return parsed as EnrollmentStoredNotesPayload;
    } catch {
        return null;
    }
}

/** Exibe texto livre ou o JSON estrutural de revisão/aprovação em linguagem natural. */
function EnrollmentFlowNotesHumanized({ notes }: { notes: string }): ReactNode {
    const structured = parseEnrollmentStoredNotes(notes);
    if (!structured) {
        return <span style={{ whiteSpace: 'pre-wrap' }}>{notes}</span>;
    }

    const { docReview, updatedAt, approvedAt, approvedByAdmin, approvedAsException } = structured;
    const entries = docReview && typeof docReview === 'object' ? Object.entries(docReview) : [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: 4 }}>
            {approvedByAdmin ? (
                <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.55, color: '#166534', background: 'rgba(220,252,231,0.85)', border: '1px solid #BBF7D0', borderRadius: 8, padding: '0.55rem 0.7rem' }}>
                    <strong>Documentação aprovada pelo administrador</strong>
                    {approvedAt ? (
                        <>
                            {' '}em{' '}
                            <time dateTime={approvedAt} style={{ fontWeight: 700 }}>
                                {new Date(approvedAt).toLocaleString('pt-BR')}
                            </time>
                        </>
                    ) : null}
                    .
                    {approvedAsException ? ' Neste caso tratou-se de uma aprovação excepcional (ainda havia pendências na documentação).' : ''}
                </p>
            ) : null}
            {updatedAt ? (
                <p style={{ margin: 0, fontSize: '0.75rem', lineHeight: 1.45, color: '#57534E' }}>
                    <strong>Última gravação da revisão documental:</strong>{' '}
                    <time dateTime={updatedAt}>{new Date(updatedAt).toLocaleString('pt-BR')}</time>
                </p>
            ) : null}
            {entries.length > 0 ? (
                <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#78716C', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Situação por documento enviado
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.78rem', lineHeight: 1.45 }}>
                        {entries.map(([key, st]) => {
                            const raw = typeof st === 'string' ? st.toUpperCase() : '';
                            const norm: DocReviewState =
                                raw === 'VALID' || raw === 'INVALID' || raw === 'PENDING' ? raw : 'PENDING';
                            const cfg = DOC_REVIEW_PRETTY[norm];
                            return (
                                <li key={key} style={{ color: '#44403C' }}>
                                    <span style={{ fontWeight: 700 }}>{enrollmentDocLabelHuman(key)}</span>
                                    {' — '}
                                    <span style={{ color: cfg.color, fontWeight: 700 }}>
                                        {cfg.emoji} {cfg.label}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ) : !approvedByAdmin && !updatedAt ? (
                <span style={{ fontSize: '0.78rem' }}>(Registro de fluxo sem detalhe visível)</span>
            ) : null}
        </div>
    );
}

type DocsAuditSummary = {
    total: number;
    withFile: number;
    missing: number;
    valid: number;
    invalid: number;
    pendingReview: number;
    requiredMissing: number;
    requiredPendingValidation: number;
};

const STATUS_COLUMNS = [
    { key: 'PENDING', label: 'Pendentes', color: '#F59E0B', bg: '#FFFBEB', border: '#FEF08A', icon: '⏳' },
    { key: 'WAITLIST', label: 'Lista de Espera', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', icon: '🕒' },
    { key: 'DOCUMENT_PENDING', label: 'Docs. Pendentes', color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA', icon: '📄' },
    { key: 'APPROVED', label: 'Aprovados', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0', icon: '✅' },
    { key: 'ENROLLED', label: 'Matriculados', color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD', icon: '🎓' },
    { key: 'REJECTED', label: 'Rejeitados', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: '❌' },
];

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pendente', DOCUMENT_PENDING: 'Docs Pendentes',
    APPROVED: 'Aprovado', ENROLLED: 'Matriculado', REJECTED: 'Rejeitado', WAITLIST: 'Lista de Espera',
};

const ALL_ENROLLMENT_STATUSES = ['PENDING', 'WAITLIST', 'DOCUMENT_PENDING', 'APPROVED', 'ENROLLED', 'REJECTED'] as const;

// Admin com controle total (avisos de criticidade são tratados no fluxo de confirmação).
const VALID_TRANSITIONS: Record<string, string[]> = {
    PENDING: [...ALL_ENROLLMENT_STATUSES],
    WAITLIST: [...ALL_ENROLLMENT_STATUSES],
    DOCUMENT_PENDING: [...ALL_ENROLLMENT_STATUSES],
    APPROVED: [...ALL_ENROLLMENT_STATUSES],
    ENROLLED: [...ALL_ENROLLMENT_STATUSES],
    REJECTED: [...ALL_ENROLLMENT_STATUSES],
};

function initialsFromName(name: string) {
    return name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function enrollmentAccentGlow(status: string): string {
    switch (status) {
        case 'REJECTED': return 'rgba(220,38,38,0.22)';
        case 'APPROVED': return 'rgba(5,150,105,0.2)';
        case 'ENROLLED': return 'rgba(8,145,178,0.2)';
        case 'DOCUMENT_PENDING': return 'rgba(234,88,12,0.22)';
        case 'WAITLIST': return 'rgba(124,58,237,0.2)';
        case 'PENDING': return 'rgba(245,158,11,0.25)';
        default: return 'rgba(255,214,0,0.22)';
    }
}

function EnrollmentStatusBadge({ status }: { status: string }) {
    const col = STATUS_COLUMNS.find((c) => c.key === status);
    if (!col) {
        return (
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 100,
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    background: '#F3F4F6',
                    color: '#6B7280',
                    border: '1px solid #E5E7EB',
                    textTransform: 'uppercase',
                }}
            >
                {STATUS_LABELS[status] || status}
            </span>
        );
    }
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.6rem',
                borderRadius: 100,
                fontSize: '0.6rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                background: col.bg,
                color: col.color,
                border: `1px solid ${col.border}`,
                textTransform: 'uppercase',
            }}
        >
            {col.icon} {STATUS_LABELS[status] || col.label}
        </span>
    );
}

const isFinalStatus = (status: string) => status === 'ENROLLED' || status === 'REJECTED';

function KanbanMissingDocsHint({ documents }: { documents: Enrollment['student']['documents'] }) {
    const missing = getMissingEnrollmentDocumentEntries(documents);
    if (missing.length === 0) return null;
    const requiredCount = missing.filter((m) => m.required).length;
    const title = missing.map((m) => m.label).join(' · ');
    const maxChips = 4;
    const shown = missing.slice(0, maxChips);
    const rest = missing.length - shown.length;
    return (
        <div
            title={title}
            style={{
                marginTop: '0.55rem',
                padding: '0.45rem 0.55rem',
                borderRadius: 8,
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
            }}
        >
            <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#B45309', letterSpacing: '0.06em', marginBottom: 5 }}>
                {requiredCount > 0 ? `Falta${requiredCount > 1 ? 'm' : ''} ${requiredCount} obrig.` : 'Opcionais em falta'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {shown.map((m) => (
                    <span
                        key={m.key}
                        style={{
                            fontSize: '0.58rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            background: m.required ? '#FEF3C7' : '#F3F4F6',
                            color: m.required ? '#92400E' : '#6B7280',
                            border: `1px solid ${m.required ? '#FCD34D' : '#E5E7EB'}`,
                        }}
                    >
                        {m.label}
                    </span>
                ))}
                {rest > 0 && (
                    <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#B45309', alignSelf: 'center' }}>+{rest}</span>
                )}
            </div>
        </div>
    );
}

export default function InscricoesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [totalPending, setTotalPending] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Enrollment | null>(null);
    const [selectedDetail, setSelectedDetail] = useState<EnrollmentDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selectedDocs, setSelectedDocs] = useState<Enrollment | null>(null);
    const [selectedDocsDetail, setSelectedDocsDetail] = useState<EnrollmentDetail | null>(null);
    const [docsLoading, setDocsLoading] = useState(false);
    const [docReviews, setDocReviews] = useState<DocReviewMap>({});
    const [docsModalDraft, setDocsModalDraft] = useState<Record<string, string>>({});
    const [docsModalSaving, setDocsModalSaving] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectModal, setRejectModal] = useState<string | null>(null);
    const [view, setView] = useState<'kanban' | 'list'>('kanban');
    /** UX-13: só a vista lista — evita linha «sumir» ao aprovar com filtro «Pendente» activo */
    const [listStatusFilter, setListStatusFilter] = useState<string>('');
    const [processing, setProcessing] = useState<string | null>(null);

    // ── Drag & Drop state ─────────────────────────────────────────────────────
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);

    // ── Horizontal scroll (arrastar tela para o lado) ─────────────────────────
    const kanbanRef = useRef<HTMLDivElement>(null);
    const isDraggingScroll = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const handleScrollMouseDown = (e: React.MouseEvent) => {
        // Only trigger scroll if clicking on the kanban container background (not a card)
        if ((e.target as HTMLElement).closest('[data-card]')) return;
        isDraggingScroll.current = true;
        startX.current = e.pageX - (kanbanRef.current?.offsetLeft || 0);
        scrollLeft.current = kanbanRef.current?.scrollLeft || 0;
    };
    const handleScrollMouseMove = useCallback((e: MouseEvent) => {
        if (!isDraggingScroll.current || !kanbanRef.current) return;
        e.preventDefault();
        const x = e.pageX - (kanbanRef.current.offsetLeft || 0);
        const walk = (x - startX.current) * 1.5;
        kanbanRef.current.scrollLeft = scrollLeft.current - walk;
    }, []);
    const handleScrollMouseUp = useCallback(() => { isDraggingScroll.current = false; }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleScrollMouseMove);
        window.addEventListener('mouseup', handleScrollMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleScrollMouseMove);
            window.removeEventListener('mouseup', handleScrollMouseUp);
        };
    }, [handleScrollMouseMove, handleScrollMouseUp]);

    // ── Data ──────────────────────────────────────────────────────────────────
    const fetchEnrollments = useCallback(async () => {
        setLoading(true);
        try {
            const [res, pendRes] = await Promise.all([
                api.get('/enrollments', {
                    params: {
                        page,
                        limit: ADMIN_PAGE_SIZE_TABLE,
                        ...(listStatusFilter ? { status: listStatusFilter } : {}),
                        ...(search.trim() ? { search: search.trim() } : {}),
                    },
                }),
                api.get('/enrollments', { params: { status: 'PENDING', limit: 1, page: 1 } }),
            ]);
            const norm = normalizePaginated<Enrollment>(res.data, ADMIN_PAGE_SIZE_TABLE);
            setEnrollments(norm.data);
            setTotal(norm.total);
            setTotalPages(norm.totalPages);
            const pend = normalizePaginated<Enrollment>(pendRes.data, 1);
            setTotalPending(pend.total);
        } catch (e) {
            /* silencioso — estado vazio exibido ao usuário */
        } finally {
            setLoading(false);
        }
    }, [page, listStatusFilter, search]);

    useEffect(() => { setPage(1); }, [listStatusFilter, search]);

    useEffect(() => { fetchEnrollments(); }, [fetchEnrollments]);

    useAdminFinanceRefresh(fetchEnrollments, ['inscricoes']);

    /** Deep-link a partir do painel do dashboard (`?open=<enrollmentId>`). */
    useEffect(() => {
        const openId = searchParams.get('open');
        if (!openId || loading) return;
        const found = enrollments.find((e) => e.id === openId);
        if (found) {
            setSelected(found);
            setView('kanban');
            router.replace('/admin/inscricoes', { scroll: false });
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const res = await api.get(`/enrollments/${openId}`);
                if (!cancelled && res.data) {
                    setSelected(res.data as Enrollment);
                    setView('kanban');
                }
            } catch {
                /* inscrição inexistente ou sem permissão */
            } finally {
                if (!cancelled) router.replace('/admin/inscricoes', { scroll: false });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [loading, enrollments, searchParams, router]);

    useEffect(() => {
        if (!selected?.id) {
            setSelectedDetail(null);
            return;
        }
        setDetailLoading(true);
        api.get(`/enrollments/${selected.id}`)
            .then(res => setSelectedDetail(res.data))
            .catch(() => setSelectedDetail(null))
            .finally(() => setDetailLoading(false));
    }, [selected?.id]);

    useEffect(() => {
        if (!selectedDocs?.id) {
            setSelectedDocsDetail(null);
            setDocReviews({});
            return;
        }
        setDocsLoading(true);
        api.get(`/enrollments/${selectedDocs.id}`)
            .then(res => setSelectedDocsDetail(res.data))
            .catch(() => setSelectedDocsDetail(null))
            .finally(() => setDocsLoading(false));
    }, [selectedDocs?.id]);

    useEffect(() => {
        const rawNotes = selectedDocsDetail?.notes || selectedDocs?.notes || '';
        if (!rawNotes) {
            setDocReviews({});
            return;
        }
        try {
            const parsed = JSON.parse(rawNotes);
            if (parsed && typeof parsed === 'object' && parsed.docReview && typeof parsed.docReview === 'object') {
                setDocReviews(parsed.docReview as DocReviewMap);
                return;
            }
        } catch {
            // notas legadas em texto puro
        }
        setDocReviews({});
    }, [selectedDocsDetail?.notes, selectedDocs?.notes]);

    useEffect(() => {
        if (!selectedDocs) {
            setDocsModalDraft({});
            return;
        }
        const raw = selectedDocsDetail?.student?.documents ?? selectedDocs.student?.documents;
        setDocsModalDraft(parseStudentDocumentsFromApi(raw));
    }, [selectedDocs?.id, selectedDocsDetail?.id, selectedDocsDetail?.student?.documents, selectedDocs?.student?.documents]);

    useEffect(() => {
        const modalOpen = !!(selected || selectedDocs || rejectModal);
        document.body.style.overflow = modalOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [selected, selectedDocs, rejectModal]);

    const updateStatus = async (id: string, status: string, reason?: string) => {
        const enrollment = enrollments.find(e => e.id === id);
        if (!enrollment) return;
        // Valida transição localmente antes de chamar API
        const validTargets = VALID_TRANSITIONS[enrollment.status] ?? [];
        if (!validTargets.includes(status)) {
            toast.error(`Não é possível mover de "${STATUS_LABELS[enrollment.status] || enrollment.status}" para "${STATUS_LABELS[status] || status}"`);
            return;
        }

        const flowRank: Record<string, number> = {
            PENDING: 1,
            WAITLIST: 2,
            DOCUMENT_PENDING: 3,
            APPROVED: 4,
            ENROLLED: 5,
            REJECTED: 6,
        };
        const missingRequiredDocs = getMissingEnrollmentDocumentEntries(enrollment.student?.documents).filter((d) => d.required).length;
        const isBackward = (flowRank[status] ?? 99) < (flowRank[enrollment.status] ?? 99);
        const criticalReason =
            status === 'REJECTED'
                ? 'Movimento para REJEITADO'
                : status === 'ENROLLED'
                    ? 'Confirmação de matrícula'
                    : isFinalStatus(enrollment.status) && !isFinalStatus(status)
                        ? 'Reabertura de status final'
                        : isBackward
                            ? 'Retorno de etapa no funil'
                            : status === 'APPROVED' && missingRequiredDocs > 0
                                ? 'Aprovação com documentação obrigatória pendente'
                                : null;

        if (criticalReason) {
            const ok = await customConfirm({
                title: 'Confirmar transição crítica?',
                message: `${criticalReason}. Deseja realmente mover de "${STATUS_LABELS[enrollment.status] || enrollment.status}" para "${STATUS_LABELS[status] || status}"?`,
                confirmLabel: 'Sim, confirmar',
                cancelLabel: 'Cancelar',
                danger: status === 'REJECTED' || (status === 'APPROVED' && missingRequiredDocs > 0),
            });
            if (!ok) return;
        }

        setProcessing(id);
        setEnrollments(prev => prev.map(e => e.id === id ? { ...e, status } : e));
        try {
            await api.patch(`/enrollments/${id}/status`, { status, rejectionReason: reason });
            setListStatusFilter('');
            toast.success(
                `Status: ${STATUS_LABELS[status] || status}. Filtro da lista: Todos — o registo continua visível.`,
            );
            setSelected(null);
            setRejectModal(null);
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Erro ao atualizar inscrição';
            toast.error(msg);
            fetchEnrollments();
        } finally {
            setProcessing(null);
        }
    };

    // ── Drag & Drop handlers ──────────────────────────────────────────────────
    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggingId(id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('enrollment_id', id);
        // Ghost image
        const el = e.currentTarget as HTMLElement;
        el.style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        (e.currentTarget as HTMLElement).style.opacity = '1';
        setDraggingId(null);
        setDragOverCol(null);
    };

    const handleDragOver = (e: React.DragEvent, colKey: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverCol(colKey);
    };

    const handleDrop = (e: React.DragEvent, targetStatus: string) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('enrollment_id');
        const enrollment = enrollments.find(e => e.id === id);
        if (!enrollment || enrollment.status === targetStatus) { setDragOverCol(null); return; }
        // Valida transição
        const valid = VALID_TRANSITIONS[enrollment.status] ?? [];
        if (!valid.includes(targetStatus)) {
            toast.error(`Não é possível mover de "${STATUS_LABELS[enrollment.status] || enrollment.status}" para "${STATUS_LABELS[targetStatus] || targetStatus}"`);
            setDragOverCol(null); return;
        }
        if (targetStatus === 'REJECTED') {
            setRejectModal(id);
        } else {
            updateStatus(id, targetStatus);
        }
        setDragOverCol(null);
    };

    const getName = (e: Enrollment) => e.student?.user?.name || e.student?.fullName || 'Aluno';
    const getCourse = (e: Enrollment) => e.class?.course?.name || e.class?.classIdentifier || '—';

    const getDocumentsState = (documents: Enrollment['student']['documents']) => {
        const d = (documents || {}) as Record<string, string | undefined>;
        const presentCount = Object.values(d).filter(v => !!v && String(v).trim().length > 0).length;
        const missingRequired = REQUIRED_ENROLLMENT_DOC_KEYS.filter(k => !(d[k] && String(d[k]).trim().length > 0)).length;
        if (presentCount === 0 || missingRequired > 0) {
            return { bg: '#FEF2F2', border: '#FCA5A5', text: '#B91C1C', label: 'Pendente' };
        }
        if (presentCount < Object.keys(ENROLLMENT_DOC_LABELS).length) {
            return { bg: '#EFF6FF', border: '#93C5FD', text: '#1D4ED8', label: 'Parcial' };
        }
        return { bg: '#F0FDF4', border: '#86EFAC', text: '#166534', label: 'Completo' };
    };

    const summarizeDocAudit = (
        documents: Enrollment['student']['documents'] | EnrollmentDetail['student']['documents'] | undefined,
        reviews: DocReviewMap,
    ): DocsAuditSummary => {
        const keys = Object.keys(ENROLLMENT_DOC_LABELS);
        const docs = (documents || {}) as Record<string, string | undefined>;
        let withFile = 0;
        let missing = 0;
        let valid = 0;
        let invalid = 0;
        let pendingReview = 0;
        let requiredMissing = 0;
        let requiredPendingValidation = 0;

        for (const key of keys) {
            const has = !!docs[key] && String(docs[key]).trim().length > 0;
            if (has) withFile++;
            else missing++;
            if (!has && REQUIRED_ENROLLMENT_DOC_KEYS.includes(key as any)) requiredMissing++;

            const st = reviews[key] || 'PENDING';
            if (has) {
                if (st === 'VALID') valid++;
                else if (st === 'INVALID') invalid++;
                else pendingReview++;
            }
            if (has && REQUIRED_ENROLLMENT_DOC_KEYS.includes(key as any) && st !== 'VALID') {
                requiredPendingValidation++;
            }
        }

        return {
            total: keys.length,
            withFile,
            missing,
            valid,
            invalid,
            pendingReview,
            requiredMissing,
            requiredPendingValidation,
        };
    };

    const persistDocReview = async (enrollmentId: string, nextReviews: DocReviewMap) => {
        const payload = JSON.stringify({
            docReview: nextReviews,
            updatedAt: new Date().toISOString(),
        });
        await api.patch(`/enrollments/${enrollmentId}/status`, {
            status: 'DOCUMENT_PENDING',
            notes: payload,
        });
    };

    const setDocReviewState = async (docKey: string, state: DocReviewState) => {
        if (!selectedDocs) return;
        const next = { ...docReviews, [docKey]: state };
        setDocReviews(next);
        try {
            await persistDocReview(selectedDocs.id, next);
            toast.success(`Documento ${state === 'VALID' ? 'validado' : state === 'INVALID' ? 'invalidado' : 'marcado como pendente'}.`);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Falha ao salvar revisão documental.');
            setDocReviews(docReviews);
        }
    };

    const saveStudentDocumentsFromModal = async () => {
        const studentId = selectedDocsDetail?.student?.id ?? selectedDocs?.student?.id;
        if (!studentId || !selectedDocs) {
            toast.error('Não foi possível identificar o aluno.');
            return;
        }
        setDocsModalSaving(true);
        try {
            await api.put(`/admin/students/${studentId}`, { documents: buildDocumentsPayload(docsModalDraft) });
            toast.success('Documentação do aluno actualizada.');
            await fetchEnrollments();
            const detailRes = await api.get(`/enrollments/${selectedDocs.id}`);
            setSelectedDocsDetail(detailRes.data);
            setSelectedDocs(detailRes.data as Enrollment);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Erro ao guardar documentos do aluno.');
        } finally {
            setDocsModalSaving(false);
        }
    };

    const approveReviewedDocuments = async () => {
        if (!selectedDocs) return;
        const summary = summarizeDocAudit(
            selectedDocsDetail?.student?.documents ?? selectedDocs.student?.documents ?? undefined,
            docReviews,
        );
        const fullyReviewedRequired = summary.requiredMissing === 0 && summary.requiredPendingValidation === 0;
        const noDocs = summary.withFile === 0;

        let title = 'Aprovar documentação revisada?';
        let message = 'Após confirmar, a inscrição sai de Docs Pendentes e avança para Aprovado. Deseja continuar?';
        let danger = false;

        if (!fullyReviewedRequired) {
            danger = true;
            title = noDocs
                ? 'Aprovar sem nenhum documento?'
                : 'Aprovar com documentação incompleta/não validada?';
            message = noDocs
                ? 'Você está aprovando esta inscrição sem nenhum documento enviado. Isso é uma exceção administrativa. Tem certeza?'
                : `Ainda existem pendências de documentação (${summary.requiredMissing} obrigatórios ausentes e ${summary.requiredPendingValidation} obrigatórios não validados). Se continuar, será uma aprovação excepcional. Deseja realmente prosseguir?`;
        }

        const ok = await customConfirm({
            title,
            message,
            confirmLabel: 'Sim, aprovar',
            cancelLabel: 'Cancelar',
            danger,
        });
        if (!ok) return;
        const notes = JSON.stringify({
            docReview: docReviews,
            approvedByAdmin: true,
            approvedAsException: !fullyReviewedRequired,
            approvedAt: new Date().toISOString(),
        });
        try {
            await updateStatus(selectedDocs.id, 'APPROVED', notes);
            setSelectedDocs(null);
            await fetchEnrollments();
            toast.success('Documentação revisada e inscrição aprovada.');
        } catch {
            // updateStatus já trata toast
        }
    };

    const searchFiltered = enrollments;
    const listFiltered = searchFiltered;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
            <AdminHeaderHero
                title="INSCRIÇÕES"
                subtitle="Gerencie e aprove as inscrições — arraste os cards para mudar o status"
                badge={totalPending > 0 ? `${totalPending} pendente${totalPending > 1 ? 's' : ''}` : undefined}
                rightSlot={(
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {/* Dica de drag */}
                    {view === 'kanban' && (
                        <span style={{ fontSize: '0.7rem', color: '#9CA3AF', padding: '0.35rem 0.75rem', borderRadius: 8, background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
                            ↔ Arraste p/ navegar | Segure card p/ mover
                        </span>
                    )}
                    {(['kanban', 'list'] as const).map(v => {
                        const active = view === v;
                        return (
                            <button key={v} type="button" onClick={() => setView(v)}
                                style={{
                                    padding: '0.38rem 0.85rem',
                                    borderRadius: 100,
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    fontFamily: 'Orbitron, system-ui, sans-serif',
                                    letterSpacing: '0.06em',
                                    cursor: 'pointer',
                                    border: `1px solid ${active ? '#0F172A' : '#E5E7EB'}`,
                                    background: active ? '#0F172A' : '#F9FAFB',
                                    color: active ? '#FFD600' : '#6B7280',
                                    transition: 'all 0.15s ease',
                                }}>
                                {v === 'kanban' ? 'KANBAN' : 'LISTA'}
                            </button>
                        );
                    })}
                    <button onClick={fetchEnrollments} className="btn-ghost" style={{ padding: '0.5rem 0.75rem' }}>
                        <ArrowPathIcon style={{ width: 15, height: 15 }} />
                    </button>
                    </div>
                )}
            />
            <InscricoesSidebarTutorial />

            {/* Stats bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '0.75rem' }}>
                {STATUS_COLUMNS.map(col => {
                    const count = enrollments.filter(e => e.status === col.key).length;
                    return (
                        <AnimatedKpiCard
                            key={col.key}
                            label={col.label}
                            value={count}
                            color={col.color}
                            bg={col.bg}
                            border={col.border}
                            icon={<span>{col.icon}</span>}
                        />
                    );
                })}
                <AnimatedKpiCard
                    label="Total"
                    value={enrollments.length}
                    color="#6B7280"
                    bg="#F3F4F6"
                    border="#D1D5DB"
                    icon={<span>📋</span>}
                />
            </div>

            {/* Search */}
            <div style={{ position: 'relative', maxWidth: 400 }}>
                <MagnifyingGlassIcon style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#9CA3AF' }} />
                <input type="text" placeholder="Buscar por nome, protocolo ou curso..." value={search}
                    onChange={e => setSearch(e.target.value)} className="form-input"
                    style={{ paddingLeft: '2.25rem', paddingTop: '0.55rem', paddingBottom: '0.55rem', fontSize: '0.82rem' }}
                />
            </div>

            {view === 'list' && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Filtrar lista:
                    </span>
                    <button
                        type="button"
                        onClick={() => setListStatusFilter('')}
                        style={{
                            padding: '0.35rem 0.85rem',
                            borderRadius: 8,
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            border: !listStatusFilter ? '1px solid #FFD600' : '1px solid #E5E7EB',
                            background: !listStatusFilter ? '#FFFDE7' : '#fff',
                            color: !listStatusFilter ? '#B89B00' : '#6B7280',
                            cursor: 'pointer',
                        }}
                    >
                        Todos
                    </button>
                    {STATUS_COLUMNS.map(col => (
                        <button
                            key={col.key}
                            type="button"
                            onClick={() => setListStatusFilter(col.key)}
                            style={{
                                padding: '0.35rem 0.85rem',
                                borderRadius: 8,
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                border: listStatusFilter === col.key ? `1px solid ${col.color}` : '1px solid #E5E7EB',
                                background: listStatusFilter === col.key ? col.bg : '#fff',
                                color: listStatusFilter === col.key ? col.color : '#6B7280',
                                cursor: 'pointer',
                            }}
                        >
                            {col.icon} {col.label}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => setListStatusFilter('WAITLIST')}
                        style={{
                            padding: '0.35rem 0.85rem',
                            borderRadius: 8,
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            border: listStatusFilter === 'WAITLIST' ? '1px solid #8B5CF6' : '1px solid #E5E7EB',
                            background: listStatusFilter === 'WAITLIST' ? '#F5F3FF' : '#fff',
                            color: listStatusFilter === 'WAITLIST' ? '#6D28D9' : '#6B7280',
                            cursor: 'pointer',
                        }}
                    >
                        📋 Lista de espera
                    </button>
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ color: 'var(--text-muted)', fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em' }}>CARREGANDO INSCRIÇÕES...</p>
                </div>
            ) : view === 'kanban' ? (

                /* ════════════════════════════════════════════════════
                   KANBAN VIEW — Drag cards entre colunas
                   + Arrastar horizontalmente na área de fundo
                   ════════════════════════════════════════════════════ */
                <div
                    ref={kanbanRef}
                    onMouseDown={handleScrollMouseDown}
                    style={{
                        display: 'flex',
                        gap: '1rem',
                        overflowX: 'auto',
                        paddingBottom: '1rem',
                        cursor: isDraggingScroll.current ? 'grabbing' : 'grab',
                        userSelect: 'none',
                        WebkitOverflowScrolling: 'touch',
                    }}
                    className="custom-scrollbar"
                >
                    {STATUS_COLUMNS.map(col => {
                        const cards = searchFiltered.filter(e => e.status === col.key);
                        const isOver = dragOverCol === col.key;
                        return (
                            <div
                                key={col.key}
                                onDragOver={e => handleDragOver(e, col.key)}
                                onDragLeave={() => setDragOverCol(null)}
                                onDrop={e => handleDrop(e, col.key)}
                                style={{
                                    flexShrink: 0,
                                    width: 260,
                                    borderRadius: 14,
                                    border: isOver ? `2px dashed ${col.color}` : `1px solid ${col.border}`,
                                    background: isOver ? col.bg : col.bg,
                                    overflow: 'hidden',
                                    transition: 'border 0.15s, transform 0.15s',
                                    transform: isOver ? 'scale(1.01)' : 'scale(1)',
                                    boxShadow: isOver ? `0 8px 24px rgba(0,0,0,0.12)` : 'none',
                                }}
                            >
                                {/* Column header */}
                                <div style={{ padding: '0.85rem 1rem', borderBottom: `2px solid ${col.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: col.bg }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.82rem', color: col.color }}>
                                        <span>{col.icon}</span><span>{col.label}</span>
                                    </div>
                                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: col.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900 }}>
                                        {cards.length}
                                    </span>
                                </div>

                                {/* Drop zone hint */}
                                {isOver && (
                                    <div style={{ margin: '0.5rem', padding: '0.6rem', borderRadius: 8, background: `${col.color}20`, border: `1.5px dashed ${col.color}`, textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: col.color }}>
                                        ↓ Soltar aqui para mover
                                    </div>
                                )}

                                {/* Cards */}
                                <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', minHeight: 120, maxHeight: 520, overflowY: 'auto' }} className="custom-scrollbar">
                                    {cards.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#9CA3AF', fontSize: '0.78rem', border: '1.5px dashed #E5E7EB', borderRadius: 10, margin: '0.25rem' }}>
                                            Arraste um card aqui
                                        </div>
                                    ) : cards.map((e, i) => (
                                        <div
                                            key={e.id}
                                            data-card="true"
                                            draggable={!isFinalStatus(e.status)}
                                            onDragStart={ev => !isFinalStatus(e.status) && handleDragStart(ev, e.id)}
                                            onDragEnd={handleDragEnd}
                                            className="animate-fade-in"
                                            style={{
                                                background: '#FFFFFF',
                                                border: draggingId === e.id ? `2px solid ${col.color}` : '1px solid rgba(0,0,0,0.08)',
                                                borderRadius: 10,
                                                padding: '0.85rem',
                                                cursor: isFinalStatus(e.status) ? 'default' : 'grab',
                                                transition: 'all 0.2s',
                                                animationDelay: `${i * 30}ms`,
                                                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                                                opacity: isFinalStatus(e.status) ? 0.75 : draggingId === e.id ? 0.5 : 1,
                                            }}
                                            onMouseEnter={el => {
                                                if (!draggingId) {
                                                    (el.currentTarget as HTMLElement).style.borderColor = col.color + '60';
                                                    (el.currentTarget as HTMLElement).style.boxShadow = `0 4px 12px rgba(0,0,0,0.1)`;
                                                    (el.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                                                }
                                            }}
                                            onMouseLeave={el => {
                                                (el.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.08)';
                                                (el.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                                                (el.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                                            }}
                                        >
                                            {/* Área branca clicável: dados do aluno */}
                                            <button
                                                type="button"
                                                onClick={() => setSelected(e)}
                                                style={{
                                                    width: '100%',
                                                    textAlign: 'left',
                                                    background: '#FFFFFF',
                                                    border: '1px solid #E5E7EB',
                                                    borderRadius: 8,
                                                    padding: '0.55rem',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                                    <span style={{ fontSize: '0.68rem', fontFamily: 'JetBrains Mono', color: '#9CA3AF' }}>{e.protocol}</span>
                                                    <span style={{ fontSize: '0.62rem', color: '#C4B5FD', letterSpacing: '0.05em', cursor: 'grab' }}>⠿ drag</span>
                                                </div>
                                                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827', marginBottom: '0.2rem', lineHeight: 1.3 }}>{getName(e)}</p>
                                                <p style={{ fontSize: '0.72rem', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.2rem' }}>{getCourse(e)}</p>
                                                <p style={{ fontSize: '0.62rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono' }}>
                                                    {new Date(e.createdAt).toLocaleDateString('pt-BR')}
                                                </p>
                                            </button>

                                            {/* Área laranja clicável: documentação */}
                                            {(() => {
                                                const docState = getDocumentsState(e.student?.documents);
                                                return (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedDocs(e)}
                                                style={{
                                                    width: '100%',
                                                    textAlign: 'left',
                                                    marginTop: '0.55rem',
                                                    background: docState.bg,
                                                    border: `1px solid ${docState.border}`,
                                                    borderRadius: 8,
                                                    padding: '0.5rem',
                                                    cursor: 'pointer',
                                                    transition: 'all .15s ease',
                                                }}
                                            >
                                                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: docState.text, letterSpacing: '0.08em', marginBottom: 4 }}>
                                                    DOCUMENTAÇÃO (CLIQUE PARA REVISAR)
                                                </div>
                                                <span
                                                    className="animate-pulse"
                                                    style={{
                                                        display: 'inline-block',
                                                        fontSize: '0.6rem',
                                                        fontWeight: 800,
                                                        color: docState.text,
                                                        marginBottom: 4,
                                                        padding: '2px 8px',
                                                        borderRadius: 999,
                                                        border: `1px solid ${docState.border}`,
                                                        background: '#fff',
                                                        letterSpacing: '0.05em',
                                                        textTransform: 'uppercase',
                                                    }}
                                                >
                                                    {docState.label}
                                                </span>
                                                <KanbanMissingDocsHint documents={e.student?.documents} />
                                            </button>
                                                );
                                            })()}
                                            {/* Quick actions */}
                                            {(e.status === 'PENDING' || e.status === 'WAITLIST') && (
                                                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.65rem' }} onClick={ev => ev.stopPropagation()}>
                                                    <button onClick={() => updateStatus(e.id, 'APPROVED')} disabled={processing === e.id}
                                                        style={{ flex: 1, padding: '0.35rem', borderRadius: 6, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#059669', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
                                                        ✓ Aprovar
                                                    </button>
                                                    <button onClick={() => setRejectModal(e.id)}
                                                        style={{ flex: 1, padding: '0.35rem', borderRadius: 6, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
                                                        ✕ Rejeitar
                                                    </button>
                                                </div>
                                            )}
                                            {e.status === 'APPROVED' && (
                                                <div style={{ marginTop: '0.65rem' }} onClick={ev => ev.stopPropagation()}>
                                                    <button onClick={() => updateStatus(e.id, 'ENROLLED')} disabled={processing === e.id}
                                                        style={{ width: '100%', padding: '0.35rem', borderRadius: 6, background: '#F0F9FF', border: '1px solid #BAE6FD', color: '#0891B2', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
                                                        🎓 Confirmar Matrícula
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ── LIST VIEW ── */
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Protocolo</th><th>Aluno</th><th>Curso</th>
                                    <th>Docs</th><th>Data</th><th>Status</th><th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {listFiltered.map(e => {
                                    const col = STATUS_COLUMNS.find(c => c.key === e.status);
                                    const missingDocs = getMissingEnrollmentDocumentEntries(e.student?.documents);
                                    const missingTitle = missingDocs.map((m) => m.label).join(' · ');
                                    const docState = getDocumentsState(e.student?.documents);
                                    return (
                                        <tr key={e.id}>
                                            <td><span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', color: '#374151' }}>{e.protocol}</span></td>
                                            <td><span style={{ fontWeight: 600, color: '#111827' }}>{getName(e)}</span></td>
                                            <td style={{ color: '#6B7280' }}>{getCourse(e)}</td>
                                            <td title={missingDocs.length ? missingTitle : undefined} style={{ maxWidth: 200, fontSize: '0.72rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-start' }}>
                                                    <span
                                                        className="animate-pulse"
                                                        style={{
                                                            display: 'inline-block',
                                                            padding: '0.15rem 0.5rem',
                                                            borderRadius: 999,
                                                            fontWeight: 800,
                                                            fontSize: '0.62rem',
                                                            background: '#fff',
                                                            color: docState.text,
                                                            border: `1px solid ${docState.border}`,
                                                            whiteSpace: 'nowrap',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.04em',
                                                        }}
                                                    >
                                                        {docState.label}
                                                    </span>
                                                    {missingDocs.length > 0 && (
                                                        <span
                                                            style={{
                                                                display: 'inline-block',
                                                                padding: '0.15rem 0.5rem',
                                                                borderRadius: 999,
                                                                fontWeight: 700,
                                                                background: '#FFFBEB',
                                                                color: '#B45309',
                                                                border: '1px solid #FDE68A',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {missingDocs.length} em falta
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '0.78rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono' }}>{new Date(e.createdAt).toLocaleDateString('pt-BR')}</td>
                                            <td>
                                                <span style={{ padding: '0.2rem 0.65rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, background: col?.bg || '#F3F4F6', color: col?.color || '#6B7280', border: `1px solid ${col?.border || '#E5E7EB'}`, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                                                    {STATUS_LABELS[e.status] || e.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                                    <button
                                                        onClick={() => setSelected(e)}
                                                        title="Ver dados do aluno"
                                                        style={{ padding: '0.35rem', borderRadius: 7, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', cursor: 'pointer', display: 'flex' }}
                                                    >
                                                        <EyeIcon style={{ width: 14, height: 14 }} />
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedDocs(e)}
                                                        title="Revisar documentação"
                                                        style={{ padding: '0.35rem', borderRadius: 7, background: docState.bg, border: `1px solid ${docState.border}`, color: docState.text, cursor: 'pointer', display: 'flex', fontSize: '0.65rem', fontWeight: 800 }}
                                                    >
                                                        DOCS
                                                    </button>
                                                    {(e.status === 'PENDING' || e.status === 'WAITLIST') && <>
                                                        <button onClick={() => updateStatus(e.id, 'APPROVED')} style={{ padding: '0.35rem', borderRadius: 7, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#059669', cursor: 'pointer', display: 'flex' }}>
                                                            <CheckCircleIcon style={{ width: 14, height: 14 }} />
                                                        </button>
                                                        <button onClick={() => setRejectModal(e.id)} style={{ padding: '0.35rem', borderRadius: 7, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', cursor: 'pointer', display: 'flex' }}>
                                                            <XCircleIcon style={{ width: 14, height: 14 }} />
                                                        </button>
                                                    </>}
                                                    {e.status === 'APPROVED' && (
                                                        <button
                                                            onClick={() => updateStatus(e.id, 'ENROLLED')}
                                                            style={{ padding: '0.35rem 0.45rem', borderRadius: 7, background: '#F0F9FF', border: '1px solid #BAE6FD', color: '#0891B2', cursor: 'pointer', display: 'flex', fontSize: '0.65rem', fontWeight: 800 }}
                                                            title="Confirmar matrícula"
                                                        >
                                                            MATR.
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <AdminListPagination
                page={page}
                totalPages={totalPages}
                total={total}
                loading={loading}
                onPageChange={setPage}
                itemLabel="inscrição(ões)"
            />

            {/* Detail Modal */}
            {selected ? (() => {
                const stCol = STATUS_COLUMNS.find((c) => c.key === selected.status);
                const accentColor = stCol?.color ?? '#6366F1';
                return (
                    <EmployeeStyleAdminDetailShell
                        onClose={() => setSelected(null)}
                        accentColor={accentColor}
                        accentGlow={enrollmentAccentGlow(selected.status)}
                        initials={initialsFromName(getName(selected))}
                        statusBadge={<EnrollmentStatusBadge status={selected.status} />}
                        headline={getName(selected)}
                        headerTags={(
                            <>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.7rem', borderRadius: 100, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.72rem', fontWeight: 600, color: '#E7E5E4', fontFamily: 'JetBrains Mono, monospace' }}>
                                    📋 {selected.protocol}
                                </span>
                                <span
                                    title={getCourse(selected)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        padding: '0.28rem 0.7rem',
                                        borderRadius: 100,
                                        background: `${accentColor}22`,
                                        border: `1px solid ${accentColor}55`,
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        color: accentColor,
                                        maxWidth: 280,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    🎓 {getCourse(selected)}
                                </span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.7rem', borderRadius: 100, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '0.72rem', fontWeight: 700, color: '#CBD5E1' }}>
                                    🏷️ {selected.class?.classIdentifier || '—'}
                                </span>
                            </>
                        )}
                        footer={(
                            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={() => setSelected(null)}
                                    style={{
                                        flex: selected.status === 'PENDING' || selected.status === 'APPROVED' ? 1 : undefined,
                                        width: selected.status === 'PENDING' || selected.status === 'APPROVED' ? undefined : '100%',
                                        minWidth: 120,
                                        padding: '0.75rem',
                                        borderRadius: 12,
                                        border: '1.5px solid #E2E8F0',
                                        background: 'transparent',
                                        color: '#6B7280',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    ✕ Fechar
                                </button>
                                {selected.status === 'PENDING' ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => { setRejectModal(selected.id); setSelected(null); }}
                                            className="btn-danger"
                                            style={{
                                                flex: 1,
                                                justifyContent: 'center',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                padding: '0.75rem',
                                                borderRadius: 12,
                                                minWidth: 120,
                                            }}
                                        >
                                            <XCircleIcon style={{ width: 16, height: 16 }} /> Rejeitar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateStatus(selected.id, 'APPROVED')}
                                            disabled={!!processing}
                                            style={{
                                                flex: 2,
                                                justifyContent: 'center',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                padding: '0.75rem',
                                                borderRadius: 12,
                                                border: 'none',
                                                background: 'linear-gradient(135deg, #FFD600, #B89B00)',
                                                color: '#000',
                                                fontWeight: 900,
                                                fontSize: '0.88rem',
                                                cursor: processing ? 'not-allowed' : 'pointer',
                                                boxShadow: '0 4px 20px rgba(255,214,0,0.4)',
                                                minWidth: 160,
                                                opacity: processing ? 0.7 : 1,
                                            }}
                                        >
                                            {processing ? '...' : <><CheckCircleIcon style={{ width: 16, height: 16 }} /> Aprovar inscrição</>}
                                        </button>
                                    </>
                                ) : null}
                                {selected.status === 'APPROVED' ? (
                                    <button
                                        type="button"
                                        onClick={() => updateStatus(selected.id, 'ENROLLED')}
                                        disabled={!!processing}
                                        style={{
                                            flex: 2,
                                            justifyContent: 'center',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '0.75rem',
                                            borderRadius: 12,
                                            border: '1px solid #93C5FD',
                                            background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)',
                                            color: '#1E40AF',
                                            fontWeight: 900,
                                            fontSize: '0.88rem',
                                            cursor: processing ? 'not-allowed' : 'pointer',
                                            minWidth: 160,
                                            opacity: processing ? 0.7 : 1,
                                        }}
                                    >
                                        {processing ? '...' : '🎓 Confirmar matrícula'}
                                    </button>
                                ) : null}
                            </div>
                        )}
                    >
                        <div>
                            <EmployeeStyleSectionTitle icon="📋" title="Resumo" color="#B89B00" />
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem' }}>
                                <EmployeeStylePill icon="👤" label="Nome" value={getName(selected)} accent="#6366F1" />
                                <EmployeeStylePill icon="🎓" label="Curso" value={getCourse(selected)} accent="#6366F1" />
                                <EmployeeStylePill icon="🏷️" label="Turma" value={selected.class?.classIdentifier || '—'} accent="#6366F1" />
                                <EmployeeStylePill icon="📆" label="Inscrito em" value={new Date(selected.createdAt).toLocaleString('pt-BR')} accent="#6366F1" />
                            </div>
                        </div>
                        {detailLoading ? (
                            <div style={{ fontSize: '0.82rem', color: '#64748B', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '0.85rem 1rem' }}>
                                Carregando dados completos…
                            </div>
                        ) : null}
                        {selectedDetail ? (
                            <div>
                                <EmployeeStyleSectionTitle icon="🪪" title="Identificação e turma" color="#6366F1" />
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem' }}>
                                    <EmployeeStylePill icon="📇" label="CPF" value={selectedDetail.student?.cpf || '—'} accent="#6366F1" />
                                    <EmployeeStylePill icon="📧" label="E-mail" value={selectedDetail.student?.contact?.email || selectedDetail.student?.user?.email || '—'} accent="#6366F1" />
                                    <EmployeeStylePill icon="📱" label="Telefone" value={selectedDetail.student?.contact?.phone || selectedDetail.student?.user?.phone || '—'} accent="#6366F1" />
                                    <EmployeeStylePill icon="📞" label="Telefone alt." value={selectedDetail.student?.contact?.phoneAlt || '—'} accent="#6366F1" />
                                    <EmployeeStylePill
                                        icon="🏠"
                                        label="Endereço"
                                        value={
                                            selectedDetail.student?.address
                                                ? `${selectedDetail.student.address.street || ''}, ${selectedDetail.student.address.number || 's/n'} - ${selectedDetail.student.address.neighborhood || ''}`
                                                : '—'
                                        }
                                        accent="#6366F1"
                                    />
                                    <EmployeeStylePill
                                        icon="📍"
                                        label="Cidade / UF"
                                        value={
                                            selectedDetail.student?.address
                                                ? `${selectedDetail.student.address.city || '—'} / ${selectedDetail.student.address.state || '—'}`
                                                : '—'
                                        }
                                        accent="#6366F1"
                                    />
                                    <EmployeeStylePill
                                        icon="📅"
                                        label="Janela de inscrição"
                                        value={`${selectedDetail.class?.enrollmentOpenDate ? new Date(selectedDetail.class.enrollmentOpenDate).toLocaleDateString('pt-BR') : '--'} até ${selectedDetail.class?.enrollmentCloseDate ? new Date(selectedDetail.class.enrollmentCloseDate).toLocaleDateString('pt-BR') : '--'}`}
                                        accent="#6366F1"
                                    />
                                    <EmployeeStylePill icon="👥" label="Vagas da turma" value={`${selectedDetail.class?._count?.enrollments ?? 0}/${selectedDetail.class?.vacancies ?? 0}`} accent="#6366F1" />
                                    <EmployeeStylePill icon="🕐" label="Revisado em" value={selectedDetail.reviewedAt ? new Date(selectedDetail.reviewedAt).toLocaleString('pt-BR') : 'Ainda não revisado'} accent="#6366F1" />
                                    <EmployeeStylePill icon="✅" label="Revisado por" value={selectedDetail.reviewer?.name || '—'} accent="#6366F1" />
                                </div>
                                {(selectedDetail.rejectionReason || selectedDetail.notes) ? (
                                    <div style={{ marginTop: '0.85rem', display: 'grid', gap: 8 }}>
                                        {selectedDetail.rejectionReason ? (
                                            <div style={{ fontSize: '0.78rem', color: '#7F1D1D', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '0.6rem 0.75rem' }}>
                                                <strong>Motivo da rejeição:</strong> {selectedDetail.rejectionReason}
                                            </div>
                                        ) : null}
                                        {selectedDetail.notes ? (
                                            <div style={{ fontSize: '0.78rem', color: '#78350F', background: '#FFFBEB', border: '1px solid #FEF08A', borderRadius: 8, padding: '0.6rem 0.75rem' }}>
                                                <strong>Observações do fluxo</strong>
                                                <EnrollmentFlowNotesHumanized notes={selectedDetail.notes} />
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                                {selectedDetail.consents ? (
                                    <div style={{ marginTop: '0.85rem' }}>
                                        <EmployeeStyleSectionTitle icon="🔐" title="Consentimentos (LGPD)" color="#64748B" />
                                        <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '0.7rem 0.8rem', background: '#fff' }}>
                                            <div style={{ fontSize: '0.76rem', color: '#374151', lineHeight: 1.7 }}>
                                                Termos: {selectedDetail.consents.termsAccepted ? 'Sim' : 'Não'} •
                                                Tratamento de dados: {selectedDetail.consents.dataProcessing ? 'Sim' : 'Não'} •
                                                Uso de imagem: {selectedDetail.consents.imageUse ? 'Sim' : 'Não'} •
                                                Compromisso frequência: {selectedDetail.consents.attendanceCommitment ? 'Sim' : 'Não'} •
                                                Política de privacidade: {selectedDetail.consents.privacyPolicyAccepted ? 'Sim' : 'Não'}
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                        <div>
                            <EmployeeStyleSectionTitle icon="📎" title="Documentação enviada" color="#3B82F6" />
                            <EnrollmentDocumentsPreview
                                documents={selectedDetail?.student?.documents ?? selected.student?.documents ?? undefined}
                                variant="light"
                                adminDownloads
                                enableLightbox
                            />
                        </div>
                    </EmployeeStyleAdminDetailShell>
                );
            })() : null}

            {/* Documentos do card laranja */}
            {selectedDocs ? (() => {
                const stColDocs = STATUS_COLUMNS.find((c) => c.key === selectedDocs.status);
                const accentColorDocs = stColDocs?.color ?? '#EA580C';
                const docsCtaReady = !docsLoading;
                return (
                    <EmployeeStyleAdminDetailShell
                        onClose={() => setSelectedDocs(null)}
                        accentColor={accentColorDocs}
                        accentGlow={enrollmentAccentGlow(selectedDocs.status)}
                        initials={initialsFromName(getName(selectedDocs))}
                        statusBadge={<EnrollmentStatusBadge status={selectedDocs.status} />}
                        headline={getName(selectedDocs)}
                        headerTags={(
                            <>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.7rem', borderRadius: 100, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.72rem', fontWeight: 600, color: '#E7E5E4', fontFamily: 'JetBrains Mono, monospace' }}>
                                    📋 {selectedDocs.protocol}
                                </span>
                                <span
                                    title={getCourse(selectedDocs)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        padding: '0.28rem 0.7rem',
                                        borderRadius: 100,
                                        background: `${accentColorDocs}22`,
                                        border: `1px solid ${accentColorDocs}55`,
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        color: accentColorDocs,
                                        maxWidth: 280,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    🎓 {getCourse(selectedDocs)}
                                </span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.7rem', borderRadius: 100, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '0.72rem', fontWeight: 700, color: '#CBD5E1' }}>
                                    📄 Revisão de documentação
                                </span>
                            </>
                        )}
                        footer={(
                            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedDocs(null)}
                                    style={{
                                        flex: docsCtaReady ? 1 : undefined,
                                        width: docsCtaReady ? undefined : '100%',
                                        padding: '0.75rem',
                                        borderRadius: 12,
                                        border: '1.5px solid #E2E8F0',
                                        background: 'transparent',
                                        color: '#6B7280',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    ✕ Fechar
                                </button>
                                {docsCtaReady ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (selectedDocs.status === 'APPROVED') {
                                                updateStatus(selectedDocs.id, 'ENROLLED');
                                                setSelectedDocs(null);
                                                return;
                                            }
                                            approveReviewedDocuments();
                                        }}
                                        style={{
                                            flex: 2,
                                            padding: '0.75rem',
                                            borderRadius: 12,
                                            border: selectedDocs.status === 'APPROVED' ? '1px solid #93C5FD' : '1px solid #86EFAC',
                                            background: selectedDocs.status === 'APPROVED'
                                                ? 'linear-gradient(135deg,#EFF6FF,#DBEAFE)'
                                                : 'linear-gradient(135deg,#DCFCE7,#BBF7D0)',
                                            color: selectedDocs.status === 'APPROVED' ? '#1E40AF' : '#14532D',
                                            fontWeight: 900,
                                            fontSize: '0.88rem',
                                            letterSpacing: '0.04em',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {selectedDocs.status === 'APPROVED' ? 'Confirmar matrícula' : 'Aprovar documentação revisada'}
                                    </button>
                                ) : null}
                            </div>
                        )}
                    >
                        <div>
                            <EmployeeStyleSectionTitle icon="⚠️" title="Pendências" color="#EA580C" />
                            {(() => {
                                const missing = getMissingEnrollmentDocumentEntries(selectedDocsDetail?.student?.documents ?? selectedDocs.student?.documents);
                                if (missing.length === 0) {
                                    return (
                                        <div style={{ borderRadius: 10, border: '1px solid #BBF7D0', background: '#F0FDF4', color: '#166534', fontSize: '0.78rem', fontWeight: 700, padding: '0.55rem 0.75rem' }}>
                                            Documentação completa.
                                        </div>
                                    );
                                }
                                return (
                                    <div style={{ borderRadius: 10, border: '1px solid #FCD34D', background: '#FFFBEB', padding: '0.55rem 0.7rem' }}>
                                        <div style={{ fontSize: '0.66rem', color: '#B45309', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 4 }}>
                                            ITENS PENDENTES
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {missing.map((m) => (
                                                <span key={m.key} style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 999, border: `1px solid ${m.required ? '#F59E0B' : '#D1D5DB'}`, color: m.required ? '#92400E' : '#4B5563', background: m.required ? '#FEF3C7' : '#F9FAFB' }}>
                                                    {m.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                        <div>
                            <EmployeeStyleSectionTitle icon="📤" title="Anexar em nome do aluno" color="#0369A1" />
                            <p style={{ fontSize: '0.76rem', color: '#64748B', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
                                Os ficheiros ficam no perfil do aluno e aparecem na pré-visualização abaixo após guardar.
                            </p>
                            <StudentDocumentUploadList
                                value={docsModalDraft}
                                onChange={setDocsModalDraft}
                                variant="adminLight"
                            />
                            <button
                                type="button"
                                onClick={() => void saveStudentDocumentsFromModal()}
                                disabled={docsModalSaving}
                                style={{
                                    marginTop: '0.75rem',
                                    padding: '0.5rem 1rem',
                                    borderRadius: 10,
                                    border: '1px solid #86EFAC',
                                    background: '#DCFCE7',
                                    color: '#14532D',
                                    fontWeight: 800,
                                    fontSize: '0.8rem',
                                    cursor: docsModalSaving ? 'wait' : 'pointer',
                                    opacity: docsModalSaving ? 0.75 : 1,
                                }}
                            >
                                {docsModalSaving ? 'A guardar…' : 'Guardar documentos no perfil do aluno'}
                            </button>
                        </div>
                        {docsLoading ? (
                            <div style={{ fontSize: '0.82rem', color: '#64748B', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '0.85rem 1rem' }}>
                                Carregando documentos…
                            </div>
                        ) : (
                            <>
                                {(() => {
                                    const docs = selectedDocsDetail?.student?.documents ?? selectedDocs.student?.documents;
                                    const summary = summarizeDocAudit(docs, docReviews);
                                    return (
                                        <div>
                                            <EmployeeStyleSectionTitle icon="📊" title="Resumo da auditoria" color="#7C3AED" />
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
                                                {[
                                                    { k: 'Enviados', v: summary.withFile, c: '#1D4ED8', bg: '#EFF6FF', bd: '#BFDBFE' },
                                                    { k: 'Faltando', v: summary.missing, c: '#B91C1C', bg: '#FEF2F2', bd: '#FECACA' },
                                                    { k: 'Validados', v: summary.valid, c: '#166534', bg: '#F0FDF4', bd: '#BBF7D0' },
                                                    { k: 'Inválidos', v: summary.invalid, c: '#7F1D1D', bg: '#FEF2F2', bd: '#FCA5A5' },
                                                    { k: 'Pend. revisão', v: summary.pendingReview, c: '#92400E', bg: '#FFFBEB', bd: '#FCD34D' },
                                                ].map((x) => (
                                                    <div key={x.k} style={{ border: `1px solid ${x.bd}`, background: x.bg, borderRadius: 8, padding: '0.45rem 0.5rem' }}>
                                                        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: x.c, letterSpacing: '0.06em' }}>{x.k}</div>
                                                        <div style={{ fontSize: '1rem', fontWeight: 900, color: x.c, lineHeight: 1.2 }}>{x.v}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                                <div>
                                    <EmployeeStyleSectionTitle icon="🔍" title="Pré-visualização" color="#3B82F6" />
                                    <EnrollmentDocumentsPreview
                                        documents={selectedDocsDetail?.student?.documents ?? selectedDocs.student?.documents ?? undefined}
                                        variant="light"
                                        adminDownloads
                                        enableLightbox
                                    />
                                </div>
                                <div>
                                    <EmployeeStyleSectionTitle icon="✔️" title="Validação por documento" color="#059669" />
                                    <div style={{ display: 'grid', gap: 8 }}>
                                        {Object.entries(ENROLLMENT_DOC_LABELS).map(([docKey, label]) => {
                                            const docs = (selectedDocsDetail?.student?.documents ?? selectedDocs.student?.documents ?? {}) as Record<string, string | undefined>;
                                            const exists = !!docs[docKey] && String(docs[docKey]).trim().length > 0;
                                            const state = docReviews[docKey] || 'PENDING';
                                            return (
                                                <div key={docKey} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '0.5rem 0.65rem', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                                                    <div style={{ fontSize: '0.74rem', color: '#111827', fontWeight: 700 }}>
                                                        {label} {!exists ? <span style={{ color: '#DC2626', fontWeight: 800 }}>(não enviado)</span> : null}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button
                                                            type="button"
                                                            disabled={!exists}
                                                            onClick={() => setDocReviewState(docKey, 'VALID')}
                                                            style={{ padding: '0.28rem 0.55rem', borderRadius: 7, border: '1px solid #86EFAC', background: state === 'VALID' ? '#DCFCE7' : '#F0FDF4', color: '#166534', fontSize: '0.66rem', fontWeight: 800, cursor: exists ? 'pointer' : 'not-allowed', opacity: exists ? 1 : 0.5 }}
                                                        >
                                                            Validar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={!exists}
                                                            onClick={() => setDocReviewState(docKey, 'INVALID')}
                                                            style={{ padding: '0.28rem 0.55rem', borderRadius: 7, border: '1px solid #FCA5A5', background: state === 'INVALID' ? '#FEE2E2' : '#FEF2F2', color: '#991B1B', fontSize: '0.66rem', fontWeight: 800, cursor: exists ? 'pointer' : 'not-allowed', opacity: exists ? 1 : 0.5 }}
                                                        >
                                                            Invalidar
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </EmployeeStyleAdminDetailShell>
                );
            })() : null}

            {/* Reject reason modal */}
            {rejectModal && (
                <ModalPortal>
                <div className="modal-overlay" style={{ zIndex: MODAL_PORTAL_Z_INDEX }} onClick={() => { setRejectModal(null); setRejectReason(''); }}>
                    <div className="modal-content" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ fontFamily: 'Orbitron', fontSize: '1rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>Motivo da Rejeição</h3>
                        <p style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: '1rem' }}>Informe o motivo para rejeitar esta inscrição.</p>
                        <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                            placeholder="Ex: documentação incompleta, requisitos não atendidos..."
                            className="form-input" style={{ height: 100, resize: 'none', marginBottom: '1rem' }} />
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancelar</button>
                            <button onClick={() => updateStatus(rejectModal, 'REJECTED', rejectReason)} disabled={!!processing} className="btn-danger" style={{ flex: 1, justifyContent: 'center' }}>
                                {processing ? '...' : 'Confirmar Rejeição'}
                            </button>
                        </div>
                    </div>
                </div>
                </ModalPortal>
            )}
        </div>
    );
}
