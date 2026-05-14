'use client';

import { useEffect, useState } from 'react';
import { PlusIcon, CheckCircleIcon, ExclamationTriangleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';
import { createPortal } from 'react-dom';
import SoloLevelingKPICard from '@/components/student/SoloLevelingKPICard';
import { formatCalendarDatePtBR } from '@/lib/calendar-date-display';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import {
    EmployeeStyleAdminDetailShell,
    EmployeeStyleAttachmentsGrid,
    EmployeeStylePill,
    EmployeeStyleSectionTitle,
    portalAbsenceAttachmentDocs,
} from '@/components/admin/employee-style-admin-detail';

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
    documentUrl?: string;
    respondedBy?: { id: string; name: string; email?: string };
    respondedAt?: string;
}

const TYPE_LABELS: Record<AbsenceType, { icon: string; label: string; color: string }> = {
    ILLNESS:   { icon: '🤒', label: 'Doença/Atestado',    color: '#DC2626' },
    PERSONAL:  { icon: '👤', label: 'Pessoal',            color: '#7C3AED' },
    EMERGENCY: { icon: '🚨', label: 'Emergência Familiar', color: '#EA580C' },
    TRIP:      { icon: '✈️', label: 'Viagem',             color: '#0891B2' },
    ACCIDENT:  { icon: '🚗', label: 'Acidente',           color: '#DC2626' },
    OTHER:     { icon: '📝', label: 'Outro',              color: '#6B7280' },
};

/** `penalty` no backend para alunos: percentual sobre o período (1 dia / total dias da turma). */
function fmtStudentPenaltyLabel(pct: number) {
    const x = Number(pct);
    if (!Number.isFinite(x) || x <= 0) return '';
    return `${x.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% da carga prevista (~1 dia do período)`;
}

const STATUS_CFG: Record<AbsenceStatus, { label: string; icon: string; color: string; bg: string; border: string; glow: string }> = {
    PENDING:   { label: 'Aguardando',   icon: '⏳', color: '#B89B00', bg: 'linear-gradient(145deg, #FFFDF5, #FFFDE7)', border: 'rgba(255,214,0,0.35)', glow: 'rgba(255,214,0,0.2)' },
    VALIDATED: { label: 'Validado',     icon: '✅', color: '#059669', bg: 'linear-gradient(145deg, #F0FDF4, #DCFCE7)', border: 'rgba(16,185,129,0.35)', glow: 'rgba(16,185,129,0.2)' },
    REJECTED:  { label: 'Rejeitado',    icon: '❌', color: '#DC2626', bg: 'linear-gradient(145deg, #FEF2F2, #FEE2E2)', border: 'rgba(220,38,38,0.35)', glow: 'rgba(220,38,38,0.15)' },
    PENALIZED: { label: 'Com desconto', icon: '⚠️', color: '#EA580C', bg: 'linear-gradient(145deg, #FFF7ED, #FFEDD5)', border: 'rgba(234,88,12,0.35)', glow: 'rgba(234,88,12,0.15)' },
};

// Modal de registro
function ModalRegistrar({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [form, setForm] = useState({ type: 'ILLNESS' as AbsenceType, date: '', description: '' });
    const [loading, setLoading] = useState(false);
    const [docFile, setDocFile] = useState<File | null>(null);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const handleSubmit = async () => {
        if (!form.date || !form.description.trim()) { toast.error('Preencha todos os campos.'); return; }
        try {
            setLoading(true);
            let documentUrl: string | undefined;
            if (docFile) {
                setUploadingDoc(true);
                try {
                    const formData = new FormData();
                    formData.append('file', docFile);
                    // Mesmo endpoint que inscrições/funcionários (`UploadsModule` → `POST /api/public/upload`)
                    const uploadRes = await api.post<{ url?: string; filename?: string }>('/public/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });
                    documentUrl = uploadRes.data?.url?.trim() || undefined;
                    if (!documentUrl) {
                        toast.error('O servidor não devolveu o endereço do ficheiro. Tente novamente.');
                        return;
                    }
                } catch (err: unknown) {
                    const raw = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
                    const msg = Array.isArray(raw) ? raw.join(' ') : raw;
                    toast.error(
                        typeof msg === 'string' && msg.trim()
                            ? msg
                            : 'Falha ao enviar o documento. Use JPG, PNG ou PDF até 5 MB.',
                    );
                    return;
                } finally {
                    setUploadingDoc(false);
                }
            }
            await api.post('/absences', { ...form, ...(documentUrl ? { documentUrl } : {}) });
            toast.success('Imprevisto registrado!');
            onSuccess();
            onClose();
        } catch { toast.error('Erro ao registrar.'); } finally { setLoading(false); }
    };

    const content = (
        <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden', animation: 'modalSlideUp 0.25s ease-out' }}>
                <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, #FFD600, #F59E0B)', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>⚠️</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', fontWeight: 800, color: 'rgba(0,0,0,0.5)', letterSpacing: '0.12em' }}>REGISTRO DE OBSTÁCULO</div>
                            <h2 style={{ fontFamily: 'Orbitron', fontSize: '1rem', fontWeight: 900, margin: 0, color: '#0F172A' }}>NOVO IMPREVISTO</h2>
                        </div>
                        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,0,0,0.1)', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem', maxHeight: '70vh', overflowY: 'auto' }}>
                    <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#374151', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>Tipo do Obstáculo</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                            {Object.entries(TYPE_LABELS).map(([key, cfg]) => (
                                <button key={key} type="button" onClick={() => setForm(f => ({ ...f, type: key as AbsenceType }))}
                                    style={{ padding: '0.65rem 0.5rem', borderRadius: 10, background: form.type === key ? `${cfg.color}15` : '#F9FAFB', border: `2px solid ${form.type === key ? cfg.color : '#E5E7EB'}`, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                                    <span style={{ fontSize: '1.25rem' }}>{cfg.icon}</span>
                                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: form.type === key ? cfg.color : '#6B7280', textAlign: 'center' }}>{cfg.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#374151', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>📅 Data da Ausência</label>
                        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: '100%', padding: '0.7rem 0.85rem', borderRadius: 10, border: '2px solid #E5E7EB', fontSize: '0.88rem', background: '#F9FAFB' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#374151', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>✏️ Justificativa</label>
                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Explique o motivo..." style={{ width: '100%', padding: '0.7rem 0.85rem', borderRadius: 10, border: '2px solid #E5E7EB', fontSize: '0.88rem', background: '#F9FAFB', resize: 'vertical', minHeight: 80 }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#374151', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>📎 Documento <span style={{ fontWeight: 500, color: '#9CA3AF', textTransform: 'none' }}>(opcional)</span></label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', borderRadius: 12, border: `2px dashed ${docFile ? '#10B981' : '#D1D5DB'}`, background: docFile ? '#F0FDF4' : '#F9FAFB', cursor: 'pointer' }}>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,.pdf,application/pdf"
                                style={{ display: 'none' }}
                                onChange={e => { if (e.target.files?.[0]) setDocFile(e.target.files[0]); }}
                            />
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: docFile ? '#10B981' : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>{docFile ? '✅' : '📎'}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: docFile ? '#059669' : '#374151' }}>{docFile ? docFile.name : 'Anexar documento'}</div>
                                <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 2 }}>{docFile ? `${(docFile.size / 1024).toFixed(0)} KB` : 'JPG, PNG ou PDF (máx. 5 MB)'}</div>
                            </div>
                            {docFile && <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setDocFile(null); }} style={{ width: 28, height: 28, borderRadius: 8, background: '#FEE2E2', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>}
                        </label>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button onClick={onClose} style={{ flex: 1, padding: '0.75rem', background: '#F3F4F6', border: '2px solid #E5E7EB', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: '#6B7280' }}>Cancelar</button>
                        <button onClick={handleSubmit} disabled={loading || uploadingDoc} style={{ flex: 2, padding: '0.75rem', background: loading ? '#E5E7EB' : 'linear-gradient(135deg, #FFD600, #F59E0B)', border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '0.85rem', color: '#0F172A', fontFamily: 'Orbitron' }}>{uploadingDoc ? '⏳ Enviando...' : loading ? '⏳...' : '✅ ENVIAR'}</button>
                    </div>
                </div>
            </div>
            <style jsx global>{`@keyframes modalSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
        </div>
    );

    if (!mounted) return null;
    return createPortal(content, document.body);
}

// Página principal
export default function StudentImprevistos() {
    const [absences, setAbsences] = useState<Absence[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);

    const load = async () => {
        try { setLoading(true); const r = await api.get('/absences'); setAbsences(r.data ?? []); }
        catch { setAbsences([]); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    useEffect(() => {
        const modalOpen = !!(selectedAbsence || showModal);
        document.body.style.overflow = modalOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [selectedAbsence, showModal]);

    const fmt = (d: string) => formatCalendarDatePtBR(d, { month: 'short' });
    const fmtDetailDate = (d: string) =>
        formatCalendarDatePtBR(d, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const fmtShort = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const totalCount = absences.length;
    const pendingCount = absences.filter(a => a.status === 'PENDING').length;
    const validatedCount = absences.filter(a => a.status === 'VALIDATED').length;
    const rejectedCount = absences.filter(a => a.status === 'REJECTED').length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
            <AdminHeaderHero
                title="IMPREVISTOS"
                subtitle="Comunique obstáculos que impediram sua missão"
                badge="PORTAL DO ALUNO"
                rightSlot={(
                    <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.75rem 1.35rem', background: '#0F172A', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 800, fontSize: '0.82rem', color: '#FFD600', fontFamily: 'Orbitron', letterSpacing: '0.06em', boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
                        <PlusIcon style={{ width: 18, height: 18 }} />Registrar Ausência
                    </button>
                )}
            />

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.85rem' }}>
                <SoloLevelingKPICard icon="📊" label="Total" value={totalCount} color="#0891B2" bgGradient="linear-gradient(145deg, #F0F9FF, #E0F2FE)" borderColor="rgba(8,145,178,0.35)" animDelay={0} />
                <SoloLevelingKPICard icon="⏳" label="Pendentes" value={pendingCount} color="#B89B00" bgGradient="linear-gradient(145deg, #FFFDF5, #FFFDE7)" borderColor="rgba(255,214,0,0.35)" isActive={pendingCount > 0} animDelay={80} />
                <SoloLevelingKPICard icon="✅" label="Validados" value={validatedCount} color="#059669" bgGradient="linear-gradient(145deg, #F0FDF4, #DCFCE7)" borderColor="rgba(16,185,129,0.35)" animDelay={160} />
                <SoloLevelingKPICard icon="❌" label="Rejeitados" value={rejectedCount} color="#DC2626" bgGradient="linear-gradient(145deg, #FEF2F2, #FEE2E2)" borderColor="rgba(220,38,38,0.35)" animDelay={240} />
            </div>

            {/* Lista */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem', width: 40, height: 40 }} />
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: '#9CA3AF' }}>CARREGANDO...</p>
                </div>
            ) : absences.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'linear-gradient(145deg, #FFFDF5, #FFFDE7)', borderRadius: 20, border: '2px dashed rgba(255,214,0,0.4)' }}>
                    <div style={{ width: 72, height: 72, borderRadius: 20, margin: '0 auto 1rem', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(16,185,129,0.3)' }}>
                        <CheckCircleIcon style={{ width: 36, height: 36, color: '#fff' }} />
                    </div>
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.12em', color: '#059669', marginBottom: '0.5rem' }}>CAMINHO LIVRE!</p>
                    <p style={{ fontSize: '0.85rem', color: '#6B7280', maxWidth: 300, margin: '0 auto' }}>Você não tem nenhum imprevisto registrado. 🚀</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {absences.map((absence, idx) => {
                        const statusCfg = STATUS_CFG[absence.status] ?? STATUS_CFG.PENDING;
                        const typeCfg = TYPE_LABELS[absence.type] ?? TYPE_LABELS.OTHER;
                        return (
                            <div key={absence.id} className="animate-scale-in" onClick={() => setSelectedAbsence(absence)}
                                style={{ animationDelay: `${idx * 60}ms`, borderRadius: 16, background: statusCfg.bg, border: `2px solid ${statusCfg.border}`, borderLeft: `5px solid ${statusCfg.color}`, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.25s', position: 'relative' }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.01)'; e.currentTarget.style.boxShadow = `0 8px 24px ${statusCfg.glow}`; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                                {absence.status === 'PENDING' && <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 80% 20%, rgba(255,214,0,0.08), transparent 60%)', pointerEvents: 'none' }} />}
                                <div style={{ padding: '0.85rem 1.15rem', borderBottom: `1px solid ${statusCfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${typeCfg.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', border: `1px solid ${typeCfg.color}25` }}>{typeCfg.icon}</div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: statusCfg.color }}>{typeCfg.label}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#9CA3AF', fontFamily: 'monospace' }}>📅 {fmt(absence.date)}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: 100, background: `${statusCfg.color}15`, border: `1px solid ${statusCfg.border}` }}>
                                        <span style={{ fontSize: '0.85rem' }}>{statusCfg.icon}</span>
                                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: statusCfg.color, textTransform: 'uppercase' }}>{statusCfg.label}</span>
                                    </div>
                                </div>
                                <div style={{ padding: '0.85rem 1.15rem', position: 'relative', zIndex: 1 }}>
                                    <p style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{absence.description}</p>
                                    {absence.documentUrl && (
                                        <div style={{ marginTop: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.7rem', borderRadius: 8, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                                            <DocumentTextIcon style={{ width: 14, height: 14, color: '#7C3AED' }} />
                                            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#7C3AED' }}>Documento anexado</span>
                                        </div>
                                    )}
                                    {/* Preview da resposta do admin — SEMPRE APARECE */}
                                    <div style={{ marginTop: '0.65rem', padding: '0.55rem 0.75rem', borderRadius: 8, background: absence.status === 'PENDING' ? 'rgba(255,214,0,0.08)' : 'rgba(0,0,0,0.04)', border: `1px solid ${absence.status === 'PENDING' ? 'rgba(255,214,0,0.2)' : 'rgba(0,0,0,0.08)'}` }}>
                                        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>💬 Coordenação</div>
                                        {absence.status === 'PENDING' ? (
                                            <div style={{ fontSize: '0.72rem', color: '#92730A', fontStyle: 'italic' }}>Aguardando análise...</div>
                                        ) : absence.adminNote ? (
                                            <div style={{ fontSize: '0.75rem', color: '#374151', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{absence.adminNote}</div>
                                        ) : (
                                            <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontStyle: 'italic' }}>Sem observações adicionais</div>
                                        )}
                                    </div>
                                    {absence.penalty && absence.penalty > 0 && (
                                        <div style={{ marginTop: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.7rem', borderRadius: 8, background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.2)' }}>
                                            <span style={{ fontSize: '0.75rem' }}>📉</span>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#EA580C' }}>Penalidade: {fmtStudentPenaltyLabel(Number(absence.penalty))}</span>
                                        </div>
                                    )}
                                    <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: '0.58rem', color: '#9CA3AF', fontWeight: 600 }}>👆 ver detalhes</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Banner rejeitados */}
            {rejectedCount > 0 && (
                <div style={{ padding: '1rem 1.25rem', borderRadius: 14, background: 'linear-gradient(135deg, #FEF2F2, #FEE2E2)', border: '1.5px solid rgba(220,38,38,0.3)', display: 'flex', alignItems: 'center', gap: '0.85rem' }} className="animate-fade-in">
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #DC2626, #B91C1C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', boxShadow: '0 4px 12px rgba(220,38,38,0.25)' }}>⚠️</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#DC2626', marginBottom: 2 }}>Atenção: {rejectedCount} imprevisto(s) rejeitado(s)</div>
                        <div style={{ fontSize: '0.75rem', color: '#B91C1C', lineHeight: 1.4 }}>Imprevistos rejeitados <strong>não protegem sua frequência</strong>.</div>
                    </div>
                </div>
            )}

            {showModal && <ModalRegistrar onClose={() => setShowModal(false)} onSuccess={load} />}
            {selectedAbsence && (() => {
                const a = selectedAbsence;
                const statusCfg = STATUS_CFG[a.status] ?? STATUS_CFG.PENDING;
                const typeCfg = TYPE_LABELS[a.type] ?? TYPE_LABELS.OTHER;
                return (
                    <EmployeeStyleAdminDetailShell
                        onClose={() => setSelectedAbsence(null)}
                        accentColor={typeCfg.color}
                        accentGlow={statusCfg.glow}
                        initials={a.type.slice(0, 2).toUpperCase()}
                        statusBadge={(
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.6rem', borderRadius: 100, fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.08em', background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}`, textTransform: 'uppercase' }}>
                                <span>{statusCfg.icon}</span> {statusCfg.label}
                            </span>
                        )}
                        headline={typeCfg.label}
                        headerTags={(
                            <>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.7rem', borderRadius: 100, background: `${typeCfg.color}22`, border: `1px solid ${typeCfg.color}44`, fontSize: '0.72rem', fontWeight: 700, color: '#E2E8F0' }}>
                                    📅 {fmtDetailDate(a.date)}
                                </span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.28rem 0.7rem', borderRadius: 100, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '0.72rem', fontWeight: 700, color: '#CBD5E1' }}>
                                    🎓 Aluno
                                </span>
                            </>
                        )}
                        footer={(
                            <button
                                type="button"
                                onClick={() => setSelectedAbsence(null)}
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
                                <EmployeeStylePill icon={typeCfg.icon} label="Tipo" value={typeCfg.label} accent={typeCfg.color} />
                                <EmployeeStylePill icon="📆" label="Data da ausência" value={fmtDetailDate(a.date)} accent="#6366F1" />
                                <EmployeeStylePill icon="📌" label="Situação" value={statusCfg.label} accent={statusCfg.color} />
                                {a.penalty != null && a.penalty > 0 ? (
                                    <EmployeeStylePill icon="📉" label="Impacto no curso" value={fmtStudentPenaltyLabel(Number(a.penalty))} accent="#EA580C" />
                                ) : null}
                            </div>
                        </div>
                        <div>
                            <EmployeeStyleSectionTitle icon="🧾" title="Sua justificativa" color="#7C3AED" />
                            <div style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: 12, padding: '0.85rem 1rem', fontSize: '0.88rem', color: '#374151', lineHeight: 1.65 }}>
                                {a.description}
                            </div>
                        </div>
                        <div>
                            <EmployeeStyleSectionTitle icon="💬" title="Resposta do coordenador" color={statusCfg.color} />
                            <div style={{ padding: '1rem 1.15rem', borderRadius: 14, background: a.status === 'PENDING' ? 'linear-gradient(145deg, #FFFDF5, #FFFDE7)' : a.status === 'VALIDATED' ? 'linear-gradient(145deg, #F0FDF4, #DCFCE7)' : a.status === 'REJECTED' ? 'linear-gradient(145deg, #FEF2F2, #FEE2E2)' : 'linear-gradient(145deg, #FFF7ED, #FFEDD5)', border: `1.5px solid ${statusCfg.border}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: a.adminNote || a.status === 'PENDING' ? '0.65rem' : 0 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: statusCfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '1rem', color: '#fff' }}>👤</span>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: statusCfg.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Coordenação</div>
                                        {a.respondedBy?.name ? (
                                            <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 1 }}>
                                                {a.respondedBy.name}
                                                {a.respondedAt && <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', color: '#9CA3AF' }}>• {fmtShort(a.respondedAt)}</span>}
                                            </div>
                                        ) : a.status !== 'PENDING' ? <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 1 }}>Administrador</div> : null}
                                    </div>
                                </div>
                                {a.status === 'PENDING' ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.85rem', borderRadius: 8, background: 'rgba(255,214,0,0.15)', border: '1px dashed rgba(184,155,0,0.3)' }}>
                                        <span style={{ fontSize: '1rem' }}>⏳</span>
                                        <span style={{ fontSize: '0.78rem', color: '#92730A', fontWeight: 600 }}>Aguardando análise do coordenador...</span>
                                    </div>
                                ) : a.adminNote ? (
                                    <p style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.6, margin: 0 }}>{a.adminNote}</p>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.85rem', borderRadius: 8, background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)' }}>
                                        <span style={{ fontSize: '0.85rem' }}>📝</span>
                                        <span style={{ fontSize: '0.78rem', color: '#6B7280', fontStyle: 'italic' }}>Nenhuma observação adicional foi registrada.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <EmployeeStyleSectionTitle icon="📁" title="Documentos anexados" color="#3B82F6" />
                            <EmployeeStyleAttachmentsGrid docs={portalAbsenceAttachmentDocs(a.id, a.documentUrl)} />
                        </div>
                    </EmployeeStyleAdminDetailShell>
                );
            })()}
        </div>
    );
}
