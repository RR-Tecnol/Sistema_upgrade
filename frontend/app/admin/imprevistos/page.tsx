'use client';

import { useEffect, useState } from 'react';
import {
    ExclamationTriangleIcon,
    CheckCircleIcon,
    PlusIcon,
    TrashIcon,
    PencilIcon,
    ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { downloadEnrollmentFileFromUrl } from '@/components/enrollment/EnrollmentDocumentsPreview';
import {
    EmployeeStyleAdminDetailShell,
    EmployeeStyleAttachmentsGrid,
    type EmployeeStyleAttachmentItem,
    EmployeeStylePill,
    EmployeeStyleSectionTitle,
} from '@/components/admin/employee-style-admin-detail';
import api from '@/lib/api/client';
import { formatCalendarDatePtBR } from '@/lib/calendar-date-display';
import { toast } from '@/components/ui/Toast';
import { useAdminFinanceRefresh } from '@/hooks/useAdminFinanceRefresh';
import { AdminListPagination } from '@/components/admin/AdminListPagination';
import { normalizePaginated, ADMIN_PAGE_SIZE_TABLE } from '@/lib/api/pagination';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { ImprevistosSidebarTutorial } from '@/components/admin/adminSidebarTutorials';
import AdminViewModeToggle from '@/components/admin/AdminViewModeToggle';
import { usePersistedAdminViewMode } from '@/hooks/usePersistedAdminViewMode';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';

interface StudentPenaltyPreview {
    totalDays: number;
    percent: number;
    classIdentifier: string | null;
    courseName: string | null;
    usedFallback: boolean;
}

interface Absence {
    id: string;
    userId: string;
    type: string;
    date: string;
    description: string;
    /** Comprovante / atestado (MinIO ou upload) */
    documentUrl?: string | null;
    status: 'PENDING' | 'VALIDATED' | 'REJECTED' | 'PENALIZED';
    adminNote?: string;
    penalty?: number;
    reviewedAt?: string;
    createdAt: string;
    user: { id: string; name: string; role: string; email: string };
}

const TYPE_OPTS = [
    { value: 'ILLNESS',   label: 'Doenca' },
    { value: 'PERSONAL',  label: 'Pessoal' },
    { value: 'EMERGENCY', label: 'Emergencia' },
    { value: 'TRIP',      label: 'Viagem' },
    { value: 'ACCIDENT',  label: 'Acidente' },
    { value: 'OTHER',     label: 'Outro' },
];
const TYPE_MAP: Record<string, string> = Object.fromEntries(TYPE_OPTS.map(o => [o.value, o.label]));

const ROLE_MAP: Record<string, string> = {
    DRIVER: 'Motorista', TEACHER: 'Professor(a)',
    STUDENT: 'Aluno(a)', ADMIN: 'Admin',
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    PENDING:   { label: 'Pendente',       color: '#B89B00', bg: '#FFFDE7', border: '#FEF08A' },
    VALIDATED: { label: 'Validado',       color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
    REJECTED:  { label: 'Rejeitado',      color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    PENALIZED: { label: 'Com Penalidade', color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
};

const fmt = (d: string) => formatCalendarDatePtBR(d, { day: '2-digit', month: '2-digit', year: 'numeric' });

function initialsFromName(name: string) {
    return name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function absenceStatusHeaderBadge(status: Absence['status']) {
    const sc = STATUS_CFG[status] ?? STATUS_CFG.PENDING;
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.2rem 0.6rem',
                borderRadius: 100,
                fontSize: '0.6rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                background: sc.bg,
                color: sc.color,
                border: `1px solid ${sc.border}`,
                textTransform: 'uppercase',
            }}
        >
            <span
                style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: sc.color,
                    display: 'inline-block',
                    boxShadow: `0 0 6px ${sc.color}`,
                }}
            />
            {sc.label}
        </span>
    );
}

function isAbsenceDocImage(url: string): boolean {
    return /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(url);
}

function isAbsenceDocPdf(url: string): boolean {
    return /\.pdf(\?|#|$)/i.test(url);
}

async function fetchAbsenceDocumentPresigned(absenceId: string): Promise<string | null> {
    try {
        const { data } = await api.get<{ url: string }>(`/admin/absences/${absenceId}/document-presigned-url`);
        return data?.url?.trim() ?? null;
    } catch {
        return null;
    }
}

function absenceAttachmentDocs(entry: { id: string; documentUrl?: string | null }): EmployeeStyleAttachmentItem[] {
    const raw = entry.documentUrl?.trim();
    if (!raw) return [];
    return [
        {
            label: 'Documento / atestado',
            url: raw,
            presign: { kind: 'absence-admin', id: entry.id },
        },
    ];
}

/** Pré-visualização + download do documento do imprevisto (admin). */
function AbsenceDocumentBlock({
    documentUrl,
    absenceId,
    compact,
}: {
    documentUrl?: string | null;
    absenceId: string;
    /** Tabela / cartão: só miniatura + botão baixar */
    compact?: boolean;
}) {
    const url = documentUrl?.trim();
    const [downloading, setDownloading] = useState(false);
    const [viewUrl, setViewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!url) {
            setViewUrl(null);
            return;
        }
        let cancelled = false;
        (async () => {
            const signed = await fetchAbsenceDocumentPresigned(absenceId);
            if (!cancelled) setViewUrl(signed ?? url);
        })();
        return () => {
            cancelled = true;
        };
    }, [absenceId, url]);

    if (!url) return null;

    const href = viewUrl ?? url;

    const download = async () => {
        setDownloading(true);
        try {
            await downloadEnrollmentFileFromUrl(href, `imprevisto_${absenceId}`);
        } finally {
            setDownloading(false);
        }
    };

    if (compact) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {isAbsenceDocImage(href) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={href}
                        alt="Comprovante"
                        style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 10, border: '1px solid #E5E7EB' }}
                    />
                ) : (
                    <span style={{ fontSize: '1.25rem', lineHeight: 1 }} title="Documento anexado">
                        📎
                    </span>
                )}
                <button
                    type="button"
                    title="Baixar documento"
                    disabled={downloading}
                    onClick={e => {
                        e.stopPropagation();
                        download();
                    }}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '0.35rem 0.55rem',
                        borderRadius: 8,
                        border: '1px solid #D1D5DB',
                        background: '#fff',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: '#374151',
                        cursor: downloading ? 'wait' : 'pointer',
                    }}
                >
                    <ArrowDownTrayIcon style={{ width: 14, height: 14 }} />
                    {downloading ? '…' : 'Baixar'}
                </button>
            </div>
        );
    }

    return (
        <div
            style={{
                marginTop: '0.75rem',
                padding: '0.85rem 1rem',
                borderRadius: 12,
                border: '1px solid #E5E7EB',
                background: '#FAFAFA',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#6B7280', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Documento anexado
                </span>
                <button
                    type="button"
                    disabled={downloading}
                    onClick={download}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '0.35rem 0.75rem',
                        borderRadius: 8,
                        border: '1px solid #D1D5DB',
                        background: '#fff',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#111827',
                        cursor: downloading ? 'wait' : 'pointer',
                    }}
                >
                    <ArrowDownTrayIcon style={{ width: 15, height: 15 }} />
                    {downloading ? 'Baixando…' : 'Baixar'}
                </button>
            </div>
            {isAbsenceDocImage(href) && (
                <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #E5E7EB', background: '#fff' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={href} alt="Comprovante do imprevisto" style={{ width: '100%', maxHeight: 280, objectFit: 'contain', display: 'block' }} />
                </div>
            )}
            {isAbsenceDocPdf(href) && (
                <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #E5E7EB', background: '#F3F4F6' }}>
                    <object data={href} type="application/pdf" title="Documento PDF" style={{ width: '100%', height: 240, display: 'block' }}>
                        <div style={{ padding: '0.75rem', fontSize: '0.78rem', color: '#6B7280' }}>
                            Pré-visualização indisponível.{' '}
                            <a href={href} target="_blank" rel="noreferrer" style={{ color: '#2563EB', fontWeight: 700 }}>
                                Abrir PDF
                            </a>
                        </div>
                    </object>
                </div>
            )}
            {!isAbsenceDocImage(href) && !isAbsenceDocPdf(href) && (
                <a href={href} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563EB' }}>
                    Abrir documento num separador ↗
                </a>
            )}
        </div>
    );
}

// â”€â”€â”€ Modal de revisÃ£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ModalReview({ absence, onClose, onSaved }: { absence: Absence; onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState({ status: 'VALIDATED' as 'VALIDATED' | 'REJECTED' | 'PENALIZED', adminNote: '', penalty: '' });
    const [loading, setLoading] = useState(false);
    const [studentPenaltyEst, setStudentPenaltyEst] = useState<StudentPenaltyPreview | null>(null);

    useEffect(() => {
        if (absence.user.role !== 'STUDENT') {
            setStudentPenaltyEst(null);
            return;
        }
        let cancelled = false;
        api
            .get<StudentPenaltyPreview>(`/admin/absences/${absence.id}/student-penalty-preview`)
            .then((res) => {
                if (!cancelled) setStudentPenaltyEst(res.data);
            })
            .catch(() => {
                if (!cancelled) setStudentPenaltyEst(null);
            });
        return () => {
            cancelled = true;
        };
    }, [absence.id, absence.user.role]);

    const handleSave = async () => {
        try {
            setLoading(true);
            await api.patch(`/admin/absences/${absence.id}/review`, {
                status: form.status,
                adminNote: form.adminNote || undefined,
                penalty:
                    absence.user.role !== 'STUDENT' && form.status === 'PENALIZED' && form.penalty.trim()
                        ? Number(form.penalty)
                        : undefined,
            });
            toast.success('Imprevisto revisado com sucesso!');
            onSaved(); onClose();
        } catch { toast.error('Erro ao revisar imprevisto.'); }
        finally { setLoading(false); }
    };
    return (
        <ModalPortal>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: MODAL_PORTAL_Z_INDEX, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '18px 24px 14px', background: '#FFFDE7', borderBottom: '1px solid #FEF08A', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFD600', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ExclamationTriangleIcon style={{ width: 18, height: 18, color: '#000' }} />
                    </div>
                    <div>
                        <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.82rem', fontWeight: 900, color: '#111827', margin: 0 }}>REVISAR IMPREVISTO</h2>
                        <p style={{ fontSize: '0.72rem', color: '#92730A', margin: 0 }}>{absence.user.name} - {fmt(absence.date)}</p>
                    </div>
                    <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1.2rem' }}>×</button>
                </div>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem 1rem', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                            <span style={{ fontSize: '0.72rem', background: '#FFFDE7', border: '1px solid #FEF08A', color: '#B89B00', borderRadius: 100, padding: '0.15rem 0.55rem', fontWeight: 700 }}>{ROLE_MAP[absence.user.role]}</span>
                            <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>{TYPE_MAP[absence.type] ?? absence.type}</span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.5, margin: 0 }}>{absence.description}</p>
                    </div>
                    <AbsenceDocumentBlock documentUrl={absence.documentUrl} absenceId={absence.id} />
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Decisao</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {(['VALIDATED', 'REJECTED', 'PENALIZED'] as const).map(s => (
                                <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))}
                                    style={{ flex: 1, padding: '8px 4px', borderRadius: 9, border: `2px solid ${form.status === s ? STATUS_CFG[s].color : '#E5E7EB'}`, background: form.status === s ? STATUS_CFG[s].bg : '#fff', color: form.status === s ? STATUS_CFG[s].color : '#9CA3AF', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                                    {STATUS_CFG[s].label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Nota para o usuario <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(opcional)</span></label>
                        <textarea value={form.adminNote} onChange={e => setForm(f => ({ ...f, adminNote: e.target.value }))} rows={2} placeholder="Ex: Atestado verificado e aprovado..." style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 9, border: '1.5px solid #E5E7EB', fontSize: '0.85rem', color: '#111827', background: '#F9FAFB', resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>
                    {form.status === 'PENALIZED' && absence.user.role === 'STUDENT' && (
                        <div
                            style={{
                                padding: '0.85rem 1rem',
                                borderRadius: 10,
                                border: '1.5px solid #FED7AA',
                                background: '#FFF7ED',
                                fontSize: '0.78rem',
                                color: '#9A3412',
                                lineHeight: 1.55,
                            }}
                        >
                            <div style={{ fontWeight: 800, marginBottom: 6, color: '#C2410C' }}>
                                Penalidade pedagógica (aluno)
                            </div>
                            <p style={{ margin: '0 0 0.5rem' }}>
                                Para alunos, cada imprevisto com penalidade conta como <strong>1 dia descontado</strong> relativamente ao período planejado da turma — o mesmo que{' '}
                                <strong>{typeof studentPenaltyEst?.percent === 'number'
                                    ? studentPenaltyEst.percent.toLocaleString('pt-BR', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })
                                    : '···'}%</strong>{' '}
                                da carga prevista desde o início até o fim da turma.
                            </p>
                            {studentPenaltyEst ? (
                                <ul style={{ margin: '0 0 0', paddingLeft: '1.1rem', color: '#7C2D12' }}>
                                    <li>Dias totais considerados neste período: <strong>{studentPenaltyEst.totalDays}</strong></li>
                                    {studentPenaltyEst.courseName ? <li>Curso: <strong>{studentPenaltyEst.courseName}</strong></li> : null}
                                    {studentPenaltyEst.classIdentifier ? (
                                        <li>Turma: <strong>{studentPenaltyEst.classIdentifier}</strong></li>
                                    ) : null}
                                    {studentPenaltyEst.usedFallback ? (
                                        <li>Não há matrícula ENROLLED/APPROVED ativa — cálculo usou base provisória de 180 dias.</li>
                                    ) : null}
                                </ul>
                            ) : (
                                <p style={{ margin: 0, fontStyle: 'italic', opacity: 0.9 }}>A carregar dados da turma…</p>
                            )}
                            <p style={{ margin: '0.65rem 0 0', fontSize: '0.72rem', opacity: 0.9 }}>
                                Não são aplicados valores em dinheiro; o campo no sistema guarda apenas o percentual calculado neste passo (1 dia ↗ período da turma).
                            </p>
                        </div>
                    )}
                    {form.status === 'PENALIZED' && absence.user.role !== 'STUDENT' && (
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#EA580C', display: 'block', marginBottom: 6 }}>Valor da retencao (R$)</label>
                            <input type="number" step="0.01" value={form.penalty} onChange={e => setForm(f => ({ ...f, penalty: e.target.value }))} placeholder="0.00" style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 9, border: '1.5px solid #FED7AA', fontSize: '0.85rem', color: '#EA580C', background: '#FFF7ED' }} />
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                        <button onClick={onClose} style={{ flex: 1, padding: '10px', background: '#F3F4F6', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#6B7280' }}>Cancelar</button>
                        <button onClick={handleSave} disabled={loading} style={{ flex: 2, padding: '10px', background: '#FFD600', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, boxShadow: 'none' }} /> Salvando...</> : 'Salvar Revisao'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </ModalPortal>
    );
}

// â”€â”€â”€ Modal Editar imprevisto (PASSO 3.6) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ModalEdit({ absence, onClose, onSaved }: { absence: Absence; onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState({ type: absence.type, date: absence.date.split('T')[0], description: absence.description });
    const [loading, setLoading] = useState(false);
    const handleSave = async () => {
        if (!form.description.trim()) { toast.error('Informe a descricao.'); return; }
        try {
            setLoading(true);
            await api.patch(`/admin/absences/${absence.id}`, form);
            toast.success('Imprevisto atualizado!');
            onSaved(); onClose();
        } catch { toast.error('Erro ao atualizar imprevisto.'); }
        finally { setLoading(false); }
    };
    return (
        <ModalPortal>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: MODAL_PORTAL_Z_INDEX, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '16px 22px 12px', background: '#EFF6FF', borderBottom: '1px solid #BFDBFE', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <PencilIcon style={{ width: 18, height: 18, color: '#2563EB' }} />
                    <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.82rem', fontWeight: 900, color: '#1E3A8A', margin: 0 }}>EDITAR IMPREVISTO</h2>
                    <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1.2rem' }}>×</button>
                </div>
                <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Tipo</label>
                        <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 9, border: '1.5px solid #E5E7EB', fontSize: '0.85rem', background: '#F9FAFB' }}>
                            {TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Data</label>
                        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 9, border: '1.5px solid #E5E7EB', fontSize: '0.85rem', background: '#F9FAFB' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Descricao</label>
                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 9, border: '1.5px solid #E5E7EB', fontSize: '0.85rem', background: '#F9FAFB', resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>
                    <AbsenceDocumentBlock documentUrl={absence.documentUrl} absenceId={absence.id} />
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={onClose} style={{ flex: 1, padding: '10px', background: '#F3F4F6', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#6B7280' }}>Cancelar</button>
                        <button onClick={handleSave} disabled={loading} style={{ flex: 2, padding: '10px', background: '#2563EB', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, boxShadow: 'none' }} /> Salvando...</> : 'Salvar Edicao'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </ModalPortal>
    );
}

// â”€â”€â”€ Modal Criar imprevisto pelo ADM (PASSO 3.6) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ModalCreate({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState({ userId: '', type: 'OTHER', date: new Date().toISOString().split('T')[0], description: '' });
    const [users, setUsers] = useState<{ id: string; name: string; role: string }[]>([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        api.get('/users').then(r => setUsers(r.data ?? [])).catch(() => {});
    }, []);
    const handleSave = async () => {
        if (!form.userId) { toast.error('Selecione o usuario.'); return; }
        if (!form.description.trim()) { toast.error('Informe a descricao.'); return; }
        try {
            setLoading(true);
            await api.post('/admin/absences', form);
            toast.success('Imprevisto criado com sucesso!');
            onSaved(); onClose();
        } catch { toast.error('Erro ao criar imprevisto.'); }
        finally { setLoading(false); }
    };
    return (
        <ModalPortal>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: MODAL_PORTAL_Z_INDEX, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '16px 22px 12px', background: '#F0FDF4', borderBottom: '1px solid #BBF7D0', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <PlusIcon style={{ width: 18, height: 18, color: '#059669' }} />
                    <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.82rem', fontWeight: 900, color: '#065F46', margin: 0 }}>NOVO IMPREVISTO</h2>
                    <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1.2rem' }}>×</button>
                </div>
                <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Usuario <span style={{ color: '#DC2626' }}>*</span></label>
                        <select value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 9, border: '1.5px solid #E5E7EB', fontSize: '0.85rem', background: '#F9FAFB' }}>
                            <option value="">Selecione o usuario...</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({ROLE_MAP[u.role] ?? u.role})</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Tipo</label>
                        <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 9, border: '1.5px solid #E5E7EB', fontSize: '0.85rem', background: '#F9FAFB' }}>
                            {TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Data</label>
                        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 9, border: '1.5px solid #E5E7EB', fontSize: '0.85rem', background: '#F9FAFB' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Descricao <span style={{ color: '#DC2626' }}>*</span></label>
                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Descreva o imprevisto..." style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 9, border: '1.5px solid #E5E7EB', fontSize: '0.85rem', background: '#F9FAFB', resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={onClose} style={{ flex: 1, padding: '10px', background: '#F3F4F6', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#6B7280' }}>Cancelar</button>
                        <button onClick={handleSave} disabled={loading} style={{ flex: 2, padding: '10px', background: '#059669', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, boxShadow: 'none' }} /> Criando...</> : '+ Criar Imprevisto'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </ModalPortal>
    );
}

// â”€â”€â”€ PÃ¡gina principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function AdminImprevistos() {
    const [absences, setAbsences] = useState<Absence[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [kpiCounts, setKpiCounts] = useState({ total: 0, pending: 0, validated: 0, rejected: 0, penalized: 0 });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [reviewing, setReviewing] = useState<Absence | null>(null);
    const [editing, setEditing] = useState<Absence | null>(null);
    const [creating, setCreating] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [listViewMode, setListViewMode] = usePersistedAdminViewMode('admin:imprevistos:list', 'table');
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
    const [detailing, setDetailing] = useState<Absence | null>(null);

    useEffect(() => {
        const hasOpenModal = !!reviewing || !!editing || creating || !!deleteId || !!detailing;
        document.body.style.overflow = hasOpenModal ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [reviewing, editing, creating, deleteId, detailing]);

    const load = async () => {
        try {
            setLoading(true);
            const params = { page, limit: ADMIN_PAGE_SIZE_TABLE, ...(filter ? { status: filter } : {}) };
            const [r, allR, pendR, valR, rejR, penR] = await Promise.all([
                api.get('/admin/absences', { params }),
                api.get('/admin/absences', { params: { limit: 1, page: 1 } }),
                api.get('/admin/absences', { params: { status: 'PENDING', limit: 1, page: 1 } }),
                api.get('/admin/absences', { params: { status: 'VALIDATED', limit: 1, page: 1 } }),
                api.get('/admin/absences', { params: { status: 'REJECTED', limit: 1, page: 1 } }),
                api.get('/admin/absences', { params: { status: 'PENALIZED', limit: 1, page: 1 } }),
            ]);
            const norm = normalizePaginated<Absence>(r.data, ADMIN_PAGE_SIZE_TABLE);
            setAbsences(norm.data);
            setTotal(norm.total);
            setTotalPages(norm.totalPages);
            setKpiCounts({
                total: normalizePaginated<Absence>(allR.data, 1).total,
                pending: normalizePaginated<Absence>(pendR.data, 1).total,
                validated: normalizePaginated<Absence>(valR.data, 1).total,
                rejected: normalizePaginated<Absence>(rejR.data, 1).total,
                penalized: normalizePaginated<Absence>(penR.data, 1).total,
            });
        } catch { setAbsences([]); setTotal(0); setTotalPages(1); }
        finally { setLoading(false); }
    };

    useEffect(() => { setPage(1); }, [filter]);

    useEffect(() => { load(); }, [filter, page]);

    useAdminFinanceRefresh(load, ['imprevistos']);

    /** UX-3: após rever, voltar a «Todos» para o registo não «sumir» do filtro Pendentes */
    const afterReviewSaved = () => {
        setFilter('');
    };

    const stats = kpiCounts;

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/admin/absences/${deleteId}`);
            setDeleteId(null);
            load();
            toast.success('Imprevisto excluido.');
        } catch { toast.error('Erro ao excluir imprevisto.'); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
            <AdminHeaderHero
                title="IMPREVISTOS"
                subtitle="Gerencie ausências e imprevistos de motoristas, professores e alunos"
                rightSlot={(
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Filtros de status */}
                    {[
                        { k: '', label: 'Todos' },
                        { k: 'PENDING', label: 'Pendentes' },
                        { k: 'VALIDATED', label: 'Validados' },
                        { k: 'REJECTED', label: 'Rejeitados' },
                        { k: 'PENALIZED', label: 'Penalizados' },
                    ].map(f => (
                        <button key={f.k} onClick={() => { setFilter(f.k); setPage(1); }}
                            style={{ padding: '0.45rem 0.85rem', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.72rem', transition: 'all 0.15s', background: filter === f.k ? '#FFD600' : '#F3F4F6', color: filter === f.k ? '#000' : '#6B7280' }}>
                            {f.label}
                        </button>
                    ))}
                    {/* PASSO 3.6: Botao criar */}
                    <button onClick={() => setCreating(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <PlusIcon style={{ width: 15, height: 15 }} /> Novo
                    </button>
                    </div>
                )}
            />
            <ImprevistosSidebarTutorial />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                <AnimatedKpiCard label="Total" value={stats.total} color="#B89B00" bg="#FFFDE7" border="#FEF08A" />
                <AnimatedKpiCard label="Pendentes" value={stats.pending} color="#D97706" bg="#FFFBEB" border="#FDE68A" delayMs={50} />
                <AnimatedKpiCard label="Validados" value={stats.validated} color="#15803D" bg="#F0FDF4" border="#BBF7D0" delayMs={100} />
                <AnimatedKpiCard label="Rejeitados" value={stats.rejected} color="#DC2626" bg="#FEF2F2" border="#FECACA" delayMs={150} />
                <AnimatedKpiCard label="Penalizados" value={stats.penalized} color="#EA580C" bg="#FFF7ED" border="#FED7AA" delayMs={200} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <AdminViewModeToggle mode={listViewMode} onChange={setListViewMode} />
            </div>

            {/* LISTA */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO...</p>
                </div>
            ) : absences.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB' }}>
                    <CheckCircleIcon style={{ width: 40, height: 40, color: '#D1D5DB', margin: '0 auto 1rem' }} />
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: '#9CA3AF' }}>NENHUM IMPREVISTO ENCONTRADO</p>
                </div>
            ) : listViewMode === 'card' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                    {absences.map((a, i) => {
                        const sc = STATUS_CFG[a.status] ?? STATUS_CFG.PENDING;
                        const expanded = expandedCardId === a.id;
                        return (
                            <div key={a.id} className="adm-kpi-card adm-scale-in" style={{ animationDelay: `${i * 25}ms`, background: '#fff', borderStyle: 'solid', borderWidth: '1px 1px 1px 4px', borderLeftColor: sc.color, borderTopColor: `${sc.border}`, borderRightColor: `${sc.border}`, borderBottomColor: `${sc.border}` }}>
                                <div className="adm-kpi-grid" />
                                <div
                                    style={{ position: 'relative', zIndex: 1, padding: '14px 14px 10px', cursor: 'pointer' }}
                                    onClick={() => setDetailing(a)}
                                >
                                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#111827' }}>{a.user?.name ?? '—'}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{ROLE_MAP[a.user?.role] ?? a.user?.role}</div>
                                    <div style={{ fontSize: '0.82rem', color: '#374151', marginTop: 8 }}>{TYPE_MAP[a.type] ?? a.type} · {fmt(a.date)}</div>
                                    <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '8px 0 0', lineHeight: 1.4 }}>{a.description}</p>
                                    {expanded && (
                                        <div style={{ marginTop: 12 }}>
                                            <EmployeeStyleSectionTitle icon="📁" title="Documentação" color="#3B82F6" />
                                            <EmployeeStyleAttachmentsGrid docs={absenceAttachmentDocs(a)} />
                                        </div>
                                    )}
                                    <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <span style={{ padding: '0.2rem 0.65rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{sc.label}</span>
                                        <button type="button" onClick={(ev) => { ev.stopPropagation(); setExpandedCardId(expanded ? null : a.id); }} style={{ padding: '0.22rem 0.6rem', borderRadius: 100, fontSize: '0.62rem', fontWeight: 700, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#1D4ED8', cursor: 'pointer' }}>
                                            {expanded ? 'Ocultar doc' : 'Expandir doc'}
                                        </button>
                                    </div>
                                </div>
                                <div style={{ position: 'relative', zIndex: 1, borderTop: '1px solid #F3F4F6', padding: '10px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <button type="button" onClick={() => setDetailing(a)} style={{ padding: '0.4rem 0.75rem', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>Ver</button>
                                    {a.status === 'PENDING' && (
                                        <button type="button" onClick={() => setReviewing(a)} style={{ padding: '0.4rem 0.75rem', borderRadius: 8, background: '#FFFDE7', border: '1px solid #FEF08A', color: '#92730A', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>Revisar</button>
                                    )}
                                    <button type="button" onClick={() => setEditing(a)} title="Editar" style={{ padding: '0.4rem 0.55rem', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#2563EB', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><PencilIcon style={{ width: 13, height: 13 }} /></button>
                                    <button type="button" onClick={() => setDeleteId(a.id)} title="Excluir" style={{ padding: '0.4rem 0.55rem', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><TrashIcon style={{ width: 13, height: 13 }} /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#FFFDE7', borderBottom: '2px solid #FEF08A' }}>
                                {['Usuario/Perfil', 'Tipo', 'Data', 'Descricao', 'Doc.', 'Status', 'Acoes'].map(h => (
                                    <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#B89B00', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {absences.map((a, i) => {
                                const sc = STATUS_CFG[a.status] ?? STATUS_CFG.PENDING;
                                return (
                                    <tr key={a.id} className="animate-fade-in" style={{ animationDelay: `${i * 25}ms`, borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }} onClick={() => setDetailing(a)}>
                                        <td style={{ padding: '0.7rem 1rem' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>{a.user?.name ?? '—'}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{ROLE_MAP[a.user?.role] ?? a.user?.role}</div>
                                        </td>
                                        <td style={{ padding: '0.7rem 1rem', fontSize: '0.82rem', color: '#374151' }}>{TYPE_MAP[a.type] ?? a.type}</td>
                                        <td style={{ padding: '0.7rem 1rem', fontSize: '0.82rem', color: '#374151', whiteSpace: 'nowrap' }}>{fmt(a.date)}</td>
                                        <td style={{ padding: '0.7rem 1rem', maxWidth: 220 }}>
                                            <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description}</p>
                                        </td>
                                        <td style={{ padding: '0.7rem 1rem', verticalAlign: 'middle' }}>
                                            {a.documentUrl ? (
                                                <AbsenceDocumentBlock documentUrl={a.documentUrl} absenceId={a.id} compact />
                                            ) : (
                                                <span style={{ color: '#D1D5DB', fontSize: '0.8rem' }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '0.7rem 1rem' }}>
                                            <span style={{ padding: '0.2rem 0.65rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{sc.label}</span>
                                        </td>
                                        <td style={{ padding: '0.7rem 1rem' }} onClick={(e) => e.stopPropagation()}>
                                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                <button type="button" onClick={() => setDetailing(a)} style={{ padding: '0.4rem 0.75rem', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                                                    Ver
                                                </button>
                                                {a.status === 'PENDING' && (
                                                    <button type="button" onClick={() => setReviewing(a)} style={{ padding: '0.4rem 0.75rem', borderRadius: 8, background: '#FFFDE7', border: '1px solid #FEF08A', color: '#92730A', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                                                        Revisar
                                                    </button>
                                                )}
                                                <button type="button" onClick={() => setEditing(a)} title="Editar" style={{ padding: '0.4rem 0.55rem', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#2563EB', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                    <PencilIcon style={{ width: 13, height: 13 }} />
                                                </button>
                                                <button type="button" onClick={() => setDeleteId(a.id)} title="Excluir" style={{ padding: '0.4rem 0.55rem', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                    <TrashIcon style={{ width: 13, height: 13 }} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <AdminListPagination
                page={page}
                totalPages={totalPages}
                total={total}
                loading={loading}
                onPageChange={setPage}
                itemLabel="imprevisto(s)"
            />

            {/* Modais */}
            {reviewing && (
                <ModalReview
                    absence={reviewing}
                    onClose={() => setReviewing(null)}
                    onSaved={afterReviewSaved}
                />
            )}
            {editing && <ModalEdit absence={editing} onClose={() => setEditing(null)} onSaved={load} />}
            {detailing && (() => {
                const sc = STATUS_CFG[detailing.status] ?? STATUS_CFG.PENDING;
                const u = detailing.user;
                const name = u?.name ?? '—';
                return (
                    <EmployeeStyleAdminDetailShell
                        onClose={() => setDetailing(null)}
                        accentColor={sc.color}
                        accentGlow={sc.color === '#DC2626' ? 'rgba(220,38,38,0.25)' : sc.color === '#15803D' ? 'rgba(21,128,61,0.2)' : 'rgba(255,214,0,0.25)'}
                        initials={initialsFromName(name)}
                        statusBadge={absenceStatusHeaderBadge(detailing.status)}
                        headline={name}
                        headerTags={(
                            <>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.7rem', borderRadius: 100, background: `${sc.color}22`, border: `1px solid ${sc.color}50`, fontSize: '0.72rem', fontWeight: 700, color: sc.color }}>
                                    ⚠️ {TYPE_MAP[detailing.type] ?? detailing.type}
                                </span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.7rem', borderRadius: 100, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.72rem', fontWeight: 600, color: '#E7E5E4' }}>
                                    {ROLE_MAP[u?.role ?? ''] ?? u?.role ?? '—'}
                                </span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.28rem 0.7rem', borderRadius: 100, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                                    📅 Ausência · {fmt(detailing.date)}
                                </span>
                            </>
                        )}
                        footer={(
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button type="button" onClick={() => setDetailing(null)} style={{ flex: 1, padding: '0.75rem', borderRadius: 12, border: '1.5px solid #E2E8F0', background: 'transparent', color: '#6B7280', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                                    ✕ Fechar
                                </button>
                                {detailing.status === 'PENDING' ? (
                                    <button
                                        type="button"
                                        onClick={() => { setReviewing(detailing); setDetailing(null); }}
                                        style={{ flex: 2, padding: '0.75rem', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #FFD600, #B89B00)', color: '#000', fontWeight: 900, fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,214,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    >
                                        ⚡ Revisar imprevisto
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => { setEditing(detailing); setDetailing(null); }}
                                        style={{ flex: 2, padding: '0.75rem', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #FFD600, #B89B00)', color: '#000', fontWeight: 900, fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,214,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    >
                                        ✏️ Editar imprevisto
                                    </button>
                                )}
                            </div>
                        )}
                    >
                        <div>
                            <EmployeeStyleSectionTitle icon="🪪" title="Identificação" color="#6366F1" />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                                <EmployeeStylePill icon="👤" label="Solicitante" value={name} accent="#6366F1" />
                                <EmployeeStylePill icon="🏷️" label="Perfil" value={ROLE_MAP[u?.role ?? ''] ?? u?.role} accent="#6366F1" />
                                <EmployeeStylePill icon="📧" label="E-mail" value={u?.email} accent="#6366F1" />
                                <EmployeeStylePill icon="🆔" label="ID do registro" value={detailing.id.slice(0, 8) + '…'} accent="#6366F1" />
                            </div>
                        </div>
                        <div>
                            <EmployeeStyleSectionTitle icon="🧾" title="Dados do imprevisto" color="#7C3AED" />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                                <EmployeeStylePill icon="📅" label="Data da ausência" value={fmt(detailing.date)} accent="#7C3AED" />
                                <EmployeeStylePill icon="📆" label="Registrado em" value={fmt(detailing.createdAt)} accent="#7C3AED" />
                                {detailing.reviewedAt ? <EmployeeStylePill icon="✅" label="Revisado em" value={fmt(detailing.reviewedAt)} accent="#7C3AED" /> : null}
                                {detailing.penalty != null && detailing.penalty > 0 ? (
                                    <EmployeeStylePill
                                        icon={u?.role === 'STUDENT' ? '📉' : '💸'}
                                        label={u?.role === 'STUDENT' ? 'Impacto pedagógico' : 'Penalidade (R$)'}
                                        value={
                                            u?.role === 'STUDENT'
                                                ? `${Number(detailing.penalty).toLocaleString('pt-BR', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}% (~1 dia do período)`
                                                : Number(detailing.penalty).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                        }
                                        accent="#EA580C"
                                    />
                                ) : null}
                            </div>
                            <div style={{ marginTop: '0.75rem', background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: 12, padding: '0.85rem 1rem' }}>
                                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#7C3AED', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Justificativa informada</div>
                                <div style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.65 }}>{detailing.description}</div>
                            </div>
                        </div>
                        {detailing.adminNote ? (
                            <div>
                                <EmployeeStyleSectionTitle icon="💬" title="Resposta da administração" color="#0891B2" />
                                <div style={{ background: 'rgba(8,145,178,0.06)', border: '1.5px solid rgba(8,145,178,0.22)', borderRadius: 14, padding: '1rem 1.1rem', fontSize: '0.9rem', color: '#374151', lineHeight: 1.7 }}>
                                    {detailing.adminNote}
                                </div>
                            </div>
                        ) : null}
                        <div>
                            <EmployeeStyleSectionTitle icon="📁" title="Documentos anexados" color="#3B82F6" />
                            <EmployeeStyleAttachmentsGrid docs={absenceAttachmentDocs(detailing)} />
                        </div>
                        <div>
                            <EmployeeStyleSectionTitle icon="🕐" title="Sistema" color="#6B7280" />
                            <EmployeeStylePill icon="🔗" label="Protocolo" value={detailing.id} accent="#6B7280" />
                        </div>
                    </EmployeeStyleAdminDetailShell>
                );
            })()}
            {creating && (
                <ModalCreate
                    onClose={() => setCreating(false)}
                    onSaved={() => {
                        setFilter('');
                    }}
                />
            )}

            {/* Modal confirmacao exclusao */}
            {deleteId && (
                <ModalPortal>
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: MODAL_PORTAL_Z_INDEX, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setDeleteId(null)}>
                    <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 400, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '16px 20px 12px', background: '#FEF2F2', borderBottom: '1px solid #FECACA', borderRadius: '18px 18px 0 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <TrashIcon style={{ width: 18, height: 18, color: '#DC2626' }} />
                            <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.8rem', fontWeight: 900, color: '#111827', margin: 0 }}>EXCLUIR IMPREVISTO</h2>
                            <button onClick={() => setDeleteId(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1.1rem' }}>×</button>
                        </div>
                        <div style={{ padding: '18px 20px' }}>
                            <p style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.6, margin: '0 0 1.25rem' }}>Tem certeza? O imprevisto sera desativado e nao aparecera mais na lista.</p>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button onClick={() => setDeleteId(null)} style={{ padding: '9px 20px', background: '#F3F4F6', border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#6B7280' }}>Cancelar</button>
                                <button onClick={handleDelete} style={{ padding: '9px 20px', background: '#DC2626', border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>Excluir</button>
                            </div>
                        </div>
                    </div>
                </div>
                </ModalPortal>
            )}
        </div>
    );
}

