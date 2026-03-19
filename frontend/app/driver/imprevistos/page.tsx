'use client';

import { useEffect, useState } from 'react';
import {
    ExclamationTriangleIcon,
    PlusIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';

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

    const handleSubmit = async () => {
        if (!form.date || !form.description.trim()) {
            toast.error('Preencha a data e a descrição do imprevisto.');
            return;
        }
        try {
            setLoading(true);
            await api.post('/driver/absences', form);
            toast.success('Imprevisto registrado! Aguardando análise do administrador.');
            onSuccess();
            onClose();
        } catch {
            toast.error('Não foi possível registrar o imprevisto. Tente novamente.');
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

    const load = async () => {
        try {
            setLoading(true);
            const data = await api.get('/driver/absences');
            setAbsences(data?.data ?? data ?? []);
        } catch {
            setAbsences([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const counts = {
        total: absences.length,
        pending: absences.filter(a => a.status === 'PENDING').length,
        validated: absences.filter(a => a.status === 'VALIDATED').length,
        penalized: absences.filter(a => a.status === 'PENALIZED').length,
    };

    const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">

            {/* HEADER */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontFamily: 'Orbitron', fontSize: '1.8rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '0.25rem', background: 'linear-gradient(135deg, #B89B00, #FFD600)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        IMPREVISTOS
                    </h1>
                    <p style={{ color: '#6B7280', fontSize: '0.82rem' }}>Registre e acompanhe suas ausências e imprevistos</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.2rem', background: '#FFD600', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: '#000', boxShadow: '0 2px 8px rgba(255,214,0,0.35)' }}>
                    <PlusIcon style={{ width: 16, height: 16 }} />
                    Registrar Imprevisto
                </button>
            </div>

            {/* KPIS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                {[
                    { label: 'Total', value: counts.total, color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD' },
                    { label: 'Pendentes', value: counts.pending, color: '#B89B00', bg: '#FFFDE7', border: '#FEF08A' },
                    { label: 'Validados', value: counts.validated, color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
                    { label: 'Com Penalidade', value: counts.penalized, color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
                ].map((s, i) => (
                    <div key={i} style={{ padding: '0.85rem 1rem', borderRadius: 12, background: s.bg, border: `1px solid ${s.border}` }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: s.color, opacity: 0.7, marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontFamily: 'Orbitron', fontSize: '1.6rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                    </div>
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
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showModal && <ModalRegistrar onClose={() => setShowModal(false)} onSuccess={load} />}
        </div>
    );
}
