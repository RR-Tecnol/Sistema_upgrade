'use client';

import { useEffect, useState } from 'react';
import {
    ExclamationTriangleIcon,
    PlusIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';

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
}

const TYPE_LABELS: Record<AbsenceType, string> = {
    ILLNESS: '🤒 Doença/Atestado',
    PERSONAL: '👤 Pessoal',
    EMERGENCY: '🚨 Emergência Familiar',
    TRIP: '✈️ Viagem/Capacitação',
    ACCIDENT: '🚗 Acidente',
    OTHER: '📝 Outro',
};

const STATUS_CONFIG: Record<AbsenceStatus, { label: string; color: string; bg: string; border: string }> = {
    PENDING:   { label: 'Aguardando ADM',  color: '#B89B00', bg: '#FFFDE7', border: '#FEF08A' },
    VALIDATED: { label: 'Validado',         color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
    REJECTED:  { label: 'Rejeitado',        color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    PENALIZED: { label: 'Com Penalidade',   color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
};

function ModalRegistrar({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [form, setForm] = useState({ type: 'ILLNESS' as AbsenceType, date: '', description: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!form.date || !form.description.trim()) {
            toast.error('Preencha a data e a descrição.');
            return;
        }
        try {
            setLoading(true);
            await api.post('/driver/absences', form);
            toast.success('Imprevisto registrado! O ADM será notificado.');
            onSuccess();
            onClose();
        } catch {
            toast.error('Erro ao registrar. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ padding: '18px 24px 14px', background: '#FFFDE7', borderBottom: '1px solid #FEF08A', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFD600', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ExclamationTriangleIcon style={{ width: 18, height: 18 }} />
                    </div>
                    <div>
                        <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.82rem', fontWeight: 900, margin: 0, color: '#111827' }}>REGISTRAR IMPREVISTO</h2>
                        <p style={{ fontSize: '0.72rem', color: '#92730A', margin: 0 }}>O ADM irá analisar e validar sua ausência</p>
                    </div>
                    <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                </div>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Tipo do imprevisto</label>
                        <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as AbsenceType }))}
                            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 9, border: '1.5px solid #E5E7EB', fontSize: '0.85rem', background: '#F9FAFB' }}>
                            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Data da ausência</label>
                        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 9, border: '1.5px solid #E5E7EB', fontSize: '0.85rem', background: '#F9FAFB' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Descrição / Justificativa</label>
                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            rows={3} placeholder="Descreva o motivo da ausência..."
                            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 9, border: '1.5px solid #E5E7EB', fontSize: '0.85rem', background: '#F9FAFB', resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>
                    <p style={{ fontSize: '0.72rem', color: '#92730A', background: '#FFFDE7', padding: '0.6rem 0.85rem', borderRadius: 9, border: '1px solid #FEF08A', margin: 0 }}>
                        ⚠️ O administrador analisará sua justificativa. Caso não confirmada com documentação, pode haver retenção de horas/pagamento.
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={onClose} style={{ flex: 1, padding: 10, background: '#F3F4F6', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#6B7280' }}>Cancelar</button>
                        <button onClick={handleSubmit} disabled={loading}
                            style={{ flex: 2, padding: 10, background: '#FFD600', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: '#000' }}>
                            {loading ? '...' : '✅ Registrar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TeacherImprevistos() {
    const [absences, setAbsences] = useState<Absence[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const load = async () => {
        try {
            setLoading(true);
            const r = await api.get('/driver/absences');
            setAbsences(r.data ?? r ?? []);
        } catch { setAbsences([]); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontFamily: 'Orbitron', fontSize: '1.8rem', fontWeight: 900, background: 'linear-gradient(135deg, #B89B00, #FFD600)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.25rem' }}>IMPREVISTOS</h1>
                    <p style={{ color: '#6B7280', fontSize: '0.82rem' }}>Registre ausências e aguarde a análise do administrador</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.2rem', background: '#FFD600', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
                    <PlusIcon style={{ width: 16, height: 16 }} /> Registrar Imprevisto
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                {[
                    { label: 'Total', v: absences.length, color: '#0891B2', bg: '#F0F9FF' },
                    { label: 'Pendentes', v: absences.filter(a => a.status === 'PENDING').length, color: '#B89B00', bg: '#FFFDE7' },
                    { label: 'Validados', v: absences.filter(a => a.status === 'VALIDATED').length, color: '#15803D', bg: '#F0FDF4' },
                    { label: 'Penalizados', v: absences.filter(a => a.status === 'PENALIZED').length, color: '#EA580C', bg: '#FFF7ED' },
                ].map((s, i) => (
                    <div key={i} style={{ padding: '0.75rem 1rem', borderRadius: 12, background: s.bg }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: s.color, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>{s.label}</div>
                        <div style={{ fontFamily: 'Orbitron', fontSize: '1.6rem', fontWeight: 900, color: s.color }}>{s.v}</div>
                    </div>
                ))}
            </div>

            {loading ? <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                : absences.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: 16, border: '1px dashed #E5E7EB' }}>
                        <ExclamationTriangleIcon style={{ width: 40, height: 40, color: '#D1D5DB', margin: '0 auto 1rem' }} />
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: '#9CA3AF' }}>NENHUM IMPREVISTO</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {absences.map((a) => {
                            const sc = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.PENDING;
                            return (
                                <div key={a.id} style={{ background: '#fff', borderRadius: 14, borderLeft: `4px solid ${sc.color}`, border: `1px solid #E5E7EB`, padding: '1rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                                </div>
                            );
                        })}
                    </div>
                )}

            {showModal && <ModalRegistrar onClose={() => setShowModal(false)} onSuccess={load} />}
        </div>
    );
}
