'use client';

import { useEffect, useState } from 'react';
import {
    ExclamationTriangleIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    FunnelIcon,
} from '@heroicons/react/24/outline';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Absence {
    id: string;
    userId: string;
    type: string;
    date: string;
    description: string;
    status: 'PENDING' | 'VALIDATED' | 'REJECTED' | 'PENALIZED';
    adminNote?: string;
    penalty?: number;
    reviewedAt?: string;
    createdAt: string;
    user: { id: string; name: string; role: string; email: string };
}

const TYPE_MAP: Record<string, string> = {
    ILLNESS: '🤒 Doença',
    PERSONAL: '👤 Pessoal',
    EMERGENCY: '🚨 Emergência',
    TRIP: '✈️ Viagem',
    ACCIDENT: '🚗 Acidente',
    OTHER: '📝 Outro',
};

const ROLE_MAP: Record<string, string> = {
    DRIVER: '🚛 Motorista',
    TEACHER: '👩‍🏫 Professor(a)',
    STUDENT: '🎓 Aluno(a)',
    ADMIN: '⚙️ Admin',
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    PENDING:   { label: 'Pendente',       color: '#B89B00', bg: '#FFFDE7', border: '#FEF08A' },
    VALIDATED: { label: 'Validado',       color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
    REJECTED:  { label: 'Rejeitado',      color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    PENALIZED: { label: 'Com Penalidade', color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
};

// ─── Modal de revisão ─────────────────────────────────────────────────────────
function ModalReview({ absence, onClose, onSaved }: { absence: Absence; onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState({ status: 'VALIDATED' as 'VALIDATED' | 'REJECTED' | 'PENALIZED', adminNote: '', penalty: '' });
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        try {
            setLoading(true);
            await api.patch(`/admin/absences/${absence.id}/review`, {
                status: form.status,
                adminNote: form.adminNote || undefined,
                penalty: form.penalty ? Number(form.penalty) : undefined,
            });
            toast.success('Imprevisto revisado com sucesso!');
            onSaved();
            onClose();
        } catch {
            toast.error('Erro ao revisar imprevisto.');
        } finally {
            setLoading(false);
        }
    };

    const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'slideUp 0.2s' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ padding: '18px 24px 14px', background: '#FFFDE7', borderBottom: '1px solid #FEF08A', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFD600', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ExclamationTriangleIcon style={{ width: 18, height: 18, color: '#000' }} />
                    </div>
                    <div>
                        <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.82rem', fontWeight: 900, color: '#111827', margin: 0 }}>REVISAR IMPREVISTO</h2>
                        <p style={{ fontSize: '0.72rem', color: '#92730A', margin: 0 }}>{absence.user.name} — {fmt(absence.date)}</p>
                    </div>
                    <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1.2rem' }}>✕</button>
                </div>

                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Detalhes */}
                    <div style={{ padding: '0.75rem 1rem', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                            <span style={{ fontSize: '0.72rem', background: '#FFFDE7', border: '1px solid #FEF08A', color: '#B89B00', borderRadius: 100, padding: '0.15rem 0.55rem', fontWeight: 700 }}>{ROLE_MAP[absence.user.role]}</span>
                            <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>{TYPE_MAP[absence.type] ?? absence.type}</span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.5, margin: 0 }}>{absence.description}</p>
                    </div>

                    {/* Decisão */}
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Decisão</label>
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
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Nota para o usuário <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(opcional)</span></label>
                        <textarea value={form.adminNote} onChange={e => setForm(f => ({ ...f, adminNote: e.target.value }))}
                            rows={2} placeholder="Ex: Atestado verificado e aprovado..."
                            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 9, border: '1.5px solid #E5E7EB', fontSize: '0.85rem', color: '#111827', background: '#F9FAFB', resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>

                    {form.status === 'PENALIZED' && (
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#EA580C', display: 'block', marginBottom: 6 }}>Valor da retenção (R$)</label>
                            <input type="number" value={form.penalty} onChange={e => setForm(f => ({ ...f, penalty: e.target.value }))}
                                placeholder="0.00" step="0.01"
                                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 9, border: '1.5px solid #FED7AA', fontSize: '0.85rem', color: '#EA580C', background: '#FFF7ED' }} />
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                        <button onClick={onClose} style={{ flex: 1, padding: '10px', background: '#F3F4F6', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#6B7280' }}>Cancelar</button>
                        <button onClick={handleSave} disabled={loading}
                            style={{ flex: 2, padding: '10px', background: '#FFD600', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : '✅ Salvar Revisão'}
                        </button>
                    </div>
                </div>
                <style>{`@keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
            </div>
        </div>
    );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AdminImprevistos() {
    const [absences, setAbsences] = useState<Absence[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('PENDING');
    const [reviewing, setReviewing] = useState<Absence | null>(null);

    const load = async () => {
        try {
            setLoading(true);
            const r = await api.get(`/admin/absences?status=${filter || ''}`);
            setAbsences(r.data ?? r ?? []);
        } catch {
            setAbsences([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [filter]);

    const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
            {/* HEADER */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontFamily: 'Orbitron', fontSize: '2rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '0.3rem' }}>IMPREVISTOS</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Gerencie ausências e imprevistos de motoristas, professores e alunos</p>
                </div>

                {/* Filtro status */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                        { k: '', label: 'Todos' },
                        { k: 'PENDING', label: '🕐 Pendentes' },
                        { k: 'VALIDATED', label: '✅ Validados' },
                        { k: 'REJECTED', label: '❌ Rejeitados' },
                        { k: 'PENALIZED', label: '⚠️ Penalizados' },
                    ].map(f => (
                        <button key={f.k} onClick={() => setFilter(f.k)}
                            style={{ padding: '0.45rem 0.85rem', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.72rem', transition: 'all 0.15s', background: filter === f.k ? '#FFD600' : '#F3F4F6', color: filter === f.k ? '#000' : '#6B7280' }}>
                            {f.label}
                        </button>
                    ))}
                </div>
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
            ) : (
                <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#FFFDE7', borderBottom: '2px solid #FEF08A' }}>
                                {['Usuário/Perfil', 'Tipo', 'Data', 'Descrição', 'Status', 'Ações'].map(h => (
                                    <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#B89B00', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {absences.map((a, i) => {
                                const sc = STATUS_CFG[a.status] ?? STATUS_CFG.PENDING;
                                return (
                                    <tr key={a.id} className="animate-fade-in" style={{ animationDelay: `${i * 25}ms`, borderBottom: '1px solid #F3F4F6' }}>
                                        <td style={{ padding: '0.7rem 1rem' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>{a.user?.name ?? '—'}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{ROLE_MAP[a.user?.role] ?? a.user?.role}</div>
                                        </td>
                                        <td style={{ padding: '0.7rem 1rem', fontSize: '0.82rem', color: '#374151' }}>{TYPE_MAP[a.type] ?? a.type}</td>
                                        <td style={{ padding: '0.7rem 1rem', fontSize: '0.82rem', color: '#374151', whiteSpace: 'nowrap' }}>{fmt(a.date)}</td>
                                        <td style={{ padding: '0.7rem 1rem', maxWidth: 240 }}>
                                            <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description}</p>
                                        </td>
                                        <td style={{ padding: '0.7rem 1rem' }}>
                                            <span style={{ padding: '0.2rem 0.65rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{sc.label}</span>
                                        </td>
                                        <td style={{ padding: '0.7rem 1rem' }}>
                                            {a.status === 'PENDING' ? (
                                                <button onClick={() => setReviewing(a)}
                                                    style={{ padding: '0.4rem 0.85rem', borderRadius: 8, background: '#FFFDE7', border: '1px solid #FEF08A', color: '#92730A', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                                                    Revisar
                                                </button>
                                            ) : (
                                                <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                                                    {a.adminNote ? `💬 ${a.adminNote.slice(0, 30)}…` : '—'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {reviewing && <ModalReview absence={reviewing} onClose={() => setReviewing(null)} onSaved={load} />}
        </div>
    );
}
