'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    ExclamationTriangleIcon,
    PlusIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    DocumentTextIcon,
    CameraIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import api from '@/lib/api/client';
import { uploadPublicFile } from '@/lib/uploadPublicFile';
import { toast } from '@/components/ui/Toast';
import imageCompression from 'browser-image-compression';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import {
    EmployeeStyleAdminDetailShell,
    EmployeeStyleAttachmentsGrid,
    EmployeeStylePill,
    EmployeeStyleSectionTitle,
    portalAbsenceAttachmentDocs,
} from '@/components/admin/employee-style-admin-detail';
import { formatCalendarDatePtBR } from '@/lib/calendar-date-display';

// ─── Tipos ───────────────────────────────────────────────────────────────────
type AbsenceStatus = 'PENDING' | 'VALIDATED' | 'REJECTED' | 'PENALIZED';
type AbsenceType = 'ILLNESS' | 'PERSONAL' | 'EMERGENCY' | 'TRIP' | 'ACCIDENT' | 'OTHER';

interface Absence {
    id: string;
    type: AbsenceType;
    date: string;
    description: string;
    status: AbsenceStatus;
    adminNote?: string;
    penalty?: number;
    createdAt: string;
    documentUrl?: string | null;
}

// ─── Config visual ───────────────────────────────────────────────────────────
const TYPE_LABELS: Record<AbsenceType, string> = {
    ILLNESS: '🤒 Doença/Atestado',
    PERSONAL: '👤 Pessoal',
    EMERGENCY: '🚨 Emergência Familiar',
    TRIP: '✈️ Viagem',
    ACCIDENT: '🚗 Acidente',
    OTHER: '📝 Outro',
};

function absencePortalAccentGlow(status: AbsenceStatus) {
    switch (status) {
        case 'REJECTED': return 'rgba(220,38,38,0.25)';
        case 'VALIDATED': return 'rgba(21,128,61,0.2)';
        case 'PENALIZED': return 'rgba(234,88,12,0.22)';
        default: return 'rgba(255,214,0,0.25)';
    }
}

const STATUS_CONFIG: Record<AbsenceStatus, { label: string; color: string; bg: string; border: string; Icon: any }> = {
    PENDING:   { label: 'Aguardando',  color: '#B89B00', bg: '#FFFDE7', border: '#FEF08A', Icon: ClockIcon },
    VALIDATED: { label: 'Validado',    color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', Icon: CheckCircleIcon },
    REJECTED:  { label: 'Rejeitado',   color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', Icon: XCircleIcon },
    PENALIZED: { label: 'Com Penalidade', color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA', Icon: ExclamationTriangleIcon },
};

// ─── Modal de registro ───────────────────────────────────────────────────────
function ModalRegistrar({
    onClose, onSuccess,
}: { onClose: () => void; onSuccess: () => void }) {
    const [form, setForm] = useState({ type: 'ILLNESS' as AbsenceType, date: '', description: '' });
    const [loading, setLoading] = useState(false);
    const [fotoPreview, setFotoPreview] = useState<string | null>(null);
    const [fotoFile, setFotoFile]       = useState<File | null>(null);
    const [compressing, setCompressing] = useState(false);
    const fileRef                       = useRef<HTMLInputElement>(null);

    async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setCompressing(true);
        try {
            const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true });
            setFotoFile(compressed as unknown as File);
            const reader = new FileReader();
            reader.onload = ev => setFotoPreview(ev.target?.result as string);
            reader.readAsDataURL(compressed);
        } catch {
            setFotoFile(file);
            const reader = new FileReader();
            reader.onload = ev => setFotoPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        } finally { setCompressing(false); }
    }

    const handleSubmit = async () => {
        if (!form.date || !form.description.trim()) {
            toast.error('Preencha a data e a descrição do imprevisto.');
            return;
        }
        try {
            setLoading(true);
            let documentUrl: string | undefined;
            if (fotoFile) {
                documentUrl = await uploadPublicFile(fotoFile);
            }
            await api.post('/absences', {
                ...form,
                ...(documentUrl ? { documentUrl } : {}),
            });
            toast.success('Imprevisto registrado! Aguardando análise do administrador.');
            onSuccess();
            onClose();
        } catch (e: any) {
            const msg = e?.response?.data?.message || e?.message;
            toast.error(typeof msg === 'string' ? msg : 'Não foi possível registrar o imprevisto. Verifique o anexo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'slideUp 0.2s' }}
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ padding: '18px 24px 14px', background: '#FFFDE7', borderBottom: '1px solid #FEF08A', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFD600', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ExclamationTriangleIcon style={{ width: 18, height: 18, color: '#000' }} />
                    </div>
                    <div>
                        <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.82rem', fontWeight: 900, color: '#111827', margin: 0 }}>REGISTRAR IMPREVISTO</h2>
                        <p style={{ fontSize: '0.72rem', color: '#92730A', margin: 0 }}>Informe a ausência ao administrador</p>
                    </div>
                    <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                </div>

                {/* Body */}
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Tipo do imprevisto</label>
                        <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as AbsenceType }))}
                            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 9, border: '1.5px solid #E5E7EB', fontSize: '0.85rem', color: '#111827', background: '#F9FAFB' }}>
                            {Object.entries(TYPE_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Data da ausência</label>
                        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 9, border: '1.5px solid #E5E7EB', fontSize: '0.85rem', color: '#111827', background: '#F9FAFB' }} />
                    </div>

                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Descrição / Justificativa</label>
                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            rows={3} placeholder="Descreva detalhadamente o motivo da ausência..."
                            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 9, border: '1.5px solid #E5E7EB', fontSize: '0.85rem', color: '#111827', background: '#F9FAFB', resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>

                    {/* Upload de documento / atestado */}
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Documento / Atestado (opcional)</label>
                        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFotoChange} style={{ display: 'none' }} />
                        <button type="button" onClick={() => fileRef.current?.click()}
                            disabled={compressing}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.55rem 1rem', borderRadius: 9, marginBottom: fotoPreview ? '0.6rem' : 0,
                                background: 'rgba(255,214,0,0.08)', border: '1px dashed rgba(255,214,0,0.5)',
                                color: '#B89B00', cursor: compressing ? 'wait' : 'pointer', fontSize: '0.82rem', fontWeight: 600,
                                width: '100%',
                            }}>
                            <CameraIcon style={{ width: 16, height: 16 }} />
                            {compressing ? 'Comprimindo...' : fotoFile ? 'Trocar documento' : 'Tirar / Selecionar foto'}
                        </button>
                        {fotoPreview && (
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                <img src={fotoPreview} alt="Preview" style={{ maxWidth: 200, maxHeight: 140, borderRadius: 8, objectFit: 'cover', border: '2px solid rgba(255,214,0,0.35)' }} />
                                <button type="button" onClick={() => { setFotoPreview(null); setFotoFile(null); }}
                                    style={{ position: 'absolute', top: -8, right: -8, background: '#EF4444', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <XMarkIcon style={{ width: 13, height: 13 }} />
                                </button>
                            </div>
                        )}
                    </div>

                    <p style={{ fontSize: '0.72rem', color: '#92730A', background: '#FFFDE7', padding: '0.6rem 0.85rem', borderRadius: 9, border: '1px solid #FEF08A', margin: 0 }}>
                        ⚠️ O administrador será notificado e irá analisar e validar o imprevisto. Documentos (atestados, BO) podem ser solicitados.
                    </p>

                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                        <button onClick={onClose} style={{ flex: 1, padding: '10px', background: '#F3F4F6', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#6B7280' }}>
                            Cancelar
                        </button>
                        <button onClick={handleSubmit} disabled={loading}
                            style={{ flex: 2, padding: '10px', background: '#FFD600', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <><PlusIcon style={{ width: 15, height: 15 }} /> Registrar</>}
                        </button>
                    </div>
                </div>
                <style>{`@keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
            </div>
        </div>
    );
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function DriverImprevistoPage() {
    const [absences, setAbsences] = useState<Absence[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [detailing, setDetailing] = useState<Absence | null>(null);

    useEffect(() => { setMounted(true); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const data = await api.get('/absences');
            setAbsences(data?.data ?? data ?? []);
        } catch {
            setAbsences([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    useEffect(() => {
        const modalOpen = !!(detailing || (mounted && showModal));
        document.body.style.overflow = modalOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [detailing, showModal, mounted]);

    const counts = {
        total: absences.length,
        pending: absences.filter(a => a.status === 'PENDING').length,
        validated: absences.filter(a => a.status === 'VALIDATED').length,
        penalized: absences.filter(a => a.status === 'PENALIZED').length,
    };

    const fmt = (d: string) => formatCalendarDatePtBR(d);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">

            <AdminHeaderHero
                title="IMPREVISTOS"
                subtitle="Registre e acompanhe suas ausências e imprevistos"
                badge="MOTORISTA"
                rightSlot={(
                    <button onClick={() => setShowModal(true)} className="btn-primary">
                        <PlusIcon style={{ width: 16, height: 16 }} />
                        Registrar Imprevisto
                    </button>
                )}
            />

            {/* KPIS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
                {[
                    { label: 'Total', value: counts.total, color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD' },
                    { label: 'Pendentes', value: counts.pending, color: '#B89B00', bg: '#FFFDE7', border: '#FEF08A' },
                    { label: 'Validados', value: counts.validated, color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
                    { label: 'Com Penalidade', value: counts.penalized, color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
                ].map((s, i) => (
                    <AnimatedKpiCard key={i} label={s.label} value={s.value} color={s.color} bg={s.bg} border={s.border} compact />
                ))}
            </div>

            {/* LISTA */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '0.15em', color: '#9CA3AF' }}>CARREGANDO...</p>
                </div>
            ) : absences.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB' }}>
                    <ExclamationTriangleIcon style={{ width: 40, height: 40, color: '#D1D5DB', margin: '0 auto 1rem' }} />
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: '#9CA3AF' }}>NENHUM IMPREVISTO REGISTRADO</p>
                    <p style={{ fontSize: '0.82rem', color: '#D1D5DB', marginTop: 8 }}>Clique em "Registrar Imprevisto" quando precisar comunicar uma ausência</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {absences.map((a, i) => {
                        const sc = STATUS_CONFIG[a.status];
                        const StIcon = sc.Icon;
                        return (
                            <div key={a.id} className="animate-fade-in" style={{ animationDelay: `${i * 30}ms`, background: '#fff', borderRadius: 14, border: `1px solid #E5E7EB`, borderLeft: `4px solid ${sc.color}`, padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                <div style={{ width: 38, height: 38, borderRadius: 10, background: sc.bg, border: `1.5px solid ${sc.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <StIcon style={{ width: 18, height: 18, color: sc.color }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>{TYPE_LABELS[a.type]}</span>
                                            <span style={{ padding: '0.15rem 0.55rem', borderRadius: 100, fontSize: '0.62rem', fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{sc.label}</span>
                                        </div>
                                        <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{fmt(a.date)}</span>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: '#6B7280', lineHeight: 1.5, margin: '0 0 0.4rem' }}>{a.description}</p>
                                    {a.adminNote && (
                                        <div style={{ padding: '0.4rem 0.65rem', borderRadius: 8, background: sc.bg, border: `1px solid ${sc.border}` }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: sc.color }}>💬 ADM: </span>
                                            <span style={{ fontSize: '0.72rem', color: '#374151' }}>{a.adminNote}</span>
                                        </div>
                                    )}
                                    {a.penalty && (
                                        <div style={{ marginTop: 6, padding: '0.35rem 0.65rem', borderRadius: 8, background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#EA580C' }}>⚠️ Retenção aplicada: R$ {Number(a.penalty).toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div style={{ marginTop: 10 }}>
                                        <button type="button" onClick={() => setDetailing(a)} style={{ padding: '0.35rem 0.7rem', borderRadius: 8, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#1D4ED8', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                                            Ver detalhes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {detailing && (() => {
                const a = detailing;
                const sc = STATUS_CONFIG[a.status];
                const typeHead = TYPE_LABELS[a.type];
                return (
                    <EmployeeStyleAdminDetailShell
                        onClose={() => setDetailing(null)}
                        accentColor={sc.color}
                        accentGlow={absencePortalAccentGlow(a.status)}
                        initials={a.type.slice(0, 2).toUpperCase()}
                        statusBadge={(
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.6rem', borderRadius: 100, fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.08em', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, textTransform: 'uppercase' }}>
                                {sc.label}
                            </span>
                        )}
                        headline={typeHead}
                        headerTags={(
                            <>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.7rem', borderRadius: 100, background: `${sc.color}22`, border: `1px solid ${sc.border}`, fontSize: '0.72rem', fontWeight: 700, color: sc.color }}>
                                    📅 {fmt(a.date)}
                                </span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.28rem 0.7rem', borderRadius: 100, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '0.72rem', fontWeight: 700, color: '#CBD5E1' }}>
                                    🚗 Motorista
                                </span>
                            </>
                        )}
                        footer={(
                            <button
                                type="button"
                                onClick={() => setDetailing(null)}
                                style={{
                                    width: '100%',
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
                        )}
                    >
                        <div>
                            <EmployeeStyleSectionTitle icon="🪪" title="Resumo" color="#6366F1" />
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem' }}>
                                <EmployeeStylePill icon="🏷️" label="Tipo" value={typeHead} accent="#6366F1" />
                                <EmployeeStylePill icon="📆" label="Data da ausência" value={fmt(a.date)} accent="#6366F1" />
                                <EmployeeStylePill icon="📌" label="Situação" value={sc.label} accent={sc.color} />
                                {a.penalty != null && a.penalty > 0 ? (
                                    <EmployeeStylePill icon="💸" label="Penalidade" value={Number(a.penalty).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} accent="#EA580C" />
                                ) : null}
                            </div>
                        </div>
                        <div>
                            <EmployeeStyleSectionTitle icon="🧾" title="Justificativa" color="#7C3AED" />
                            <div style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: 12, padding: '0.85rem 1rem', fontSize: '0.88rem', color: '#374151', lineHeight: 1.65 }}>
                                {a.description}
                            </div>
                        </div>
                        {a.adminNote ? (
                            <div>
                                <EmployeeStyleSectionTitle icon="💬" title="Resposta da administração" color="#0891B2" />
                                <div style={{ background: 'rgba(8,145,178,0.06)', border: '1.5px solid rgba(8,145,178,0.22)', borderRadius: 14, padding: '1rem 1.1rem', fontSize: '0.88rem', color: '#374151', lineHeight: 1.7 }}>
                                    {a.adminNote}
                                </div>
                            </div>
                        ) : null}
                        <div>
                            <EmployeeStyleSectionTitle icon="📁" title="Documentos anexados" color="#3B82F6" />
                            <EmployeeStyleAttachmentsGrid docs={portalAbsenceAttachmentDocs(a.id, a.documentUrl)} />
                        </div>
                    </EmployeeStyleAdminDetailShell>
                );
            })()}

            {mounted && showModal && createPortal(
                <ModalRegistrar onClose={() => setShowModal(false)} onSuccess={load} />,
                document.body
            )}
        </div>
    );
}
