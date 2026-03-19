'use client';

import { useEffect, useState } from 'react';
import {
    ExclamationTriangleIcon,
    PlusIcon,
    CheckCircleIcon,
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
    TRIP: '✈️ Viagem',
    ACCIDENT: '🚗 Acidente',
    OTHER: '📝 Outro',
};

const STATUS_CFG: Record<AbsenceStatus, { label: string; color: string; bg: string; border: string }> = {
    PENDING:   { label: 'Aguardando',     color: '#B89B00', bg: '#FFFDE7', border: '#FEF08A' },
    VALIDATED: { label: 'Validado ✅',    color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
    REJECTED:  { label: 'Rejeitado',      color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    PENALIZED: { label: 'Com desconto',   color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
};

function ModalRegistrar({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [form, setForm] = useState({ type: 'ILLNESS' as AbsenceType, date: '', description: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!form.date || !form.description.trim()) {
            toast.error('Preencha todos os campos obrigatórios.');
            return;
        }
        try {
            setLoading(true);
            await api.post('/driver/absences', form);
            toast.success('Imprevisto registrado com sucesso!');
            onSuccess();
            onClose();
        } catch {
            toast.error('Erro ao registrar imprevisto.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ padding: '18px 24px 14px', background: 'linear-gradient(135deg, #FFFDE7, #FFF9C4)', borderBottom: '1px solid #FEF08A', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFD600', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ExclamationTriangleIcon style={{ width: 18, height: 18 }} />
                    </div>
                    <div>
                        <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.82rem', fontWeight: 900, margin: 0, color: '#111827' }}>REGISTRAR IMPREVISTO</h2>
                        <p style={{ fontSize: '0.72rem', color: '#92730A', margin: 0 }}>Aluno — comunique sua ausência ao ADM</p>
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
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Justificativa</label>
                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            rows={3} placeholder="Explique o motivo da sua ausência..."
                            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 9, border: '1.5px solid #E5E7EB', fontSize: '0.85rem', background: '#F9FAFB', resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>
                    <div style={{ padding: '0.6rem 0.85rem', borderRadius: 9, background: '#F0F9FF', border: '1px solid #BAE6FD', fontSize: '0.72rem', color: '#0369A1' }}>
                        ℹ️ Sua ausência será analisada pelo administrador. Em caso de ausência não justificada, pode haver impacto na sua frequência mínima exigida.
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={onClose} style={{ flex: 1, padding: 10, background: '#F3F4F6', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#6B7280' }}>Cancelar</button>
                        <button onClick={handleSubmit} disabled={loading}
                            style={{ flex: 2, padding: 10, background: loading ? '#E5E7EB' : '#FFD600', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: '#000' }}>
                            {loading ? 'Enviando...' : '✅ Registrar Ausência'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function StudentImprevistos() {
    const [absences, setAbsences] = useState<Absence[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const load = async () => {
        try {
            setLoading(true);
            const r = await api.get('/driver/absences');
            setAbsences(r.data ?? []);
        } catch { setAbsences([]); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontFamily: 'Orbitron', fontSize: '1.8rem', fontWeight: 900, background: 'linear-gradient(135deg, #B89B00, #FFD600)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.2rem' }}>IMPREVISTOS</h1>
                    <p style={{ color: '#6B7280', fontSize: '0.82rem' }}>Registre e acompanhe suas ausências justificadas</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.2rem', background: '#FFD600', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', boxShadow: '0 2px 8px rgba(255,214,0,0.3)' }}>
                    <PlusIcon style={{ width: 16, height: 16 }} /> Registrar Ausência
                </button>
            </div>

            {/* KPI strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                {[
                    { label: 'Total', v: absences.length, c: '#0891B2', bg: '#F0F9FF' },
                    { label: 'Pendentes', v: absences.filter(a => a.status === 'PENDING').length, c: '#B89B00', bg: '#FFFDE7' },
                    { label: 'Validados', v: absences.filter(a => a.status === 'VALIDATED').length, c: '#15803D', bg: '#F0FDF4' },
                    { label: 'Rejeitados', v: absences.filter(a => a.status === 'REJECTED').length, c: '#DC2626', bg: '#FEF2F2' },
                ].map((s, i) => (
                    <div key={i} style={{ padding: '0.75rem 1rem', borderRadius: 12, background: s.bg }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: s.c, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>{s.label}</div>
                        <div style={{ fontFamily: 'Orbitron', fontSize: '1.6rem', fontWeight: 900, color: s.c }}>{s.v}</div>
                    </div>
                ))}
            </div>

            {loading ? <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                : absences.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: 16, border: '1px dashed #E5E7EB' }}>
                        <CheckCircleIcon style={{ width: 40, height: 40, color: '#D1D5DB', margin: '0 auto 1rem' }} />
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: '#9CA3AF' }}>SEM AUSÊNCIAS REGISTRADAS</p>
                        <p style={{ fontSize: '0.82rem', color: '#D1D5DB', marginTop: 8 }}>Ótimo! Nenhuma falta registrada ainda.</p>
                    </div>
                ) : (
                    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#FFFDE7', borderBottom: '2px solid #FEF08A' }}>
                                    {['Tipo', 'Data', 'Descrição', 'Status'].map(h => (
                                        <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#B89B00' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {absences.map((a) => {
                                    const sc = STATUS_CFG[a.status] ?? STATUS_CFG.PENDING;
                                    return (
                                        <tr key={a.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                            <td style={{ padding: '0.7rem 1rem', fontSize: '0.85rem', color: '#374151', fontWeight: 600 }}>{TYPE_LABELS[a.type]}</td>
                                            <td style={{ padding: '0.7rem 1rem', fontSize: '0.8rem', color: '#6B7280', whiteSpace: 'nowrap' }}>{fmt(a.date)}</td>
                                            <td style={{ padding: '0.7rem 1rem', maxWidth: 240 }}>
                                                <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description}</p>
                                                {a.adminNote && <p style={{ fontSize: '0.7rem', color: sc.color, margin: '2px 0 0', fontWeight: 600 }}>💬 {a.adminNote}</p>}
                                            </td>
                                            <td style={{ padding: '0.7rem 1rem' }}>
                                                <span style={{ padding: '0.2rem 0.65rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, whiteSpace: 'nowrap' }}>
                                                    {sc.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

            {showModal && <ModalRegistrar onClose={() => setShowModal(false)} onSuccess={load} />}
        </div>
    );
}
