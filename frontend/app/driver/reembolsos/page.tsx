'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api/client';

const TIPOS = [
    { value: 'FOOD', label: '🍽️ Alimentação' },
    { value: 'EMERGENCY_REPAIR', label: '🔧 Reparo Emergencial' },
    { value: 'CLEANING_MATERIAL', label: '🧹 Material de Limpeza' },
    { value: 'CLASSROOM_MATERIAL', label: '📚 Material de Aula' },
    { value: 'OTHER', label: '📦 Outro' },
];
const STATUS_STYLE: Record<string, { label: string; color: string }> = {
    PENDING:  { label: 'Pendente',  color: '#FBBF24' },
    APPROVED: { label: 'Aprovado',  color: '#10B981' },
    REJECTED: { label: 'Rejeitado', color: '#EF4444' },
};

export default function DriverReembolsos() {
    const [reembolsos, setReembolsos] = useState<any[]>([]);
    const [trips, setTrips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ type: 'FOOD', amount: '', description: '', tripId: '' });

    const load = async () => {
        setLoading(true);
        try {
            const [r, t] = await Promise.all([
                api.get('/reimbursements/my'),
                api.get('/driver/trips?status=IN_TRANSIT'),
            ]);
            setReembolsos(Array.isArray(r.data) ? r.data : (r.data?.data ?? []));
            setTrips(Array.isArray(t.data) ? t.data : []);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleSubmit = async () => {
        if (!form.amount || !form.description) return;
        setSaving(true);
        try {
            await api.post('/reimbursements', {
                type: form.type,
                amount: parseFloat(form.amount.replace(',', '.')),
                description: form.description,
                ...(form.tripId ? { tripId: form.tripId } : {}),
            });
            setShowForm(false);
            setForm({ type: 'FOOD', amount: '', description: '', tripId: '' });
            load();
        } catch { } finally { setSaving(false); }
    };

    const cardStyle: React.CSSProperties = { background: '#1E293B', borderRadius: 14, padding: '1.1rem', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '0.75rem' };
    const inputStyle: React.CSSProperties = { width: '100%', padding: '0.75rem 0.85rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: '#0F172A', color: '#F1F5F9', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: '0.75rem' };

    return (
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h1 style={{ fontFamily: 'Orbitron, sans-serif', color: '#0891B2', fontSize: '1.3rem', fontWeight: 900, letterSpacing: '0.08em' }}>REEMBOLSOS</h1>
                <button onClick={() => setShowForm(true)}
                    style={{ padding: '0.6rem 1.1rem', borderRadius: 10, border: 'none', background: '#FFD600', color: '#000', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}>
                    + Novo
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>Carregando...</div>
            ) : reembolsos.length === 0 ? (
                <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem 1rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💰</div>
                    <div style={{ color: '#64748B', fontSize: '0.85rem' }}>Nenhum reembolso solicitado</div>
                </div>
            ) : reembolsos.map((r: any) => {
                const st = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
                const tipo = TIPOS.find(t => t.value === r.type);
                return (
                    <div key={r.id} style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <div>
                                <div style={{ fontWeight: 700, color: '#F1F5F9', fontSize: '0.92rem' }}>{tipo?.label || r.type}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 2 }}>{r.description}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#FFD600', fontSize: '1rem' }}>
                                    R$ {Number(r.amount).toFixed(2)}
                                </div>
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: st.color, letterSpacing: '0.06em' }}>{st.label}</span>
                            </div>
                        </div>
                        {r.rejectionReason && (
                            <div style={{ fontSize: '0.72rem', color: '#EF4444', background: 'rgba(239,68,68,0.08)', padding: '0.4rem 0.6rem', borderRadius: 6, marginTop: '0.4rem' }}>
                                Motivo: {r.rejectionReason}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Modal formulário */}
            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem' }}
                    onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
                    <div style={{ background: '#1E293B', borderRadius: 20, padding: '1.75rem', width: '100%', maxWidth: 540, border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ fontWeight: 800, color: '#F1F5F9', marginBottom: '1.25rem', fontSize: '1rem' }}>💰 Novo Reembolso</div>

                        <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Tipo de despesa</label>
                        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ ...inputStyle, appearance: 'none' }}>
                            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>

                        <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Valor (R$)</label>
                        <input type="text" inputMode="decimal" placeholder="Ex: 45,90" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={inputStyle} />

                        <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Descrição</label>
                        <textarea rows={3} placeholder="Descreva a despesa..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })
                        } style={{ ...inputStyle, resize: 'vertical' }} />

                        {trips.length > 0 && (
                            <>
                                <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Vincular à viagem (opcional)</label>
                                <select value={form.tripId} onChange={e => setForm({ ...form, tripId: e.target.value })} style={{ ...inputStyle, appearance: 'none' }}>
                                    <option value="">Sem vínculo</option>
                                    {trips.map((t: any) => <option key={t.id} value={t.id}>{t.originCity.name} → {t.destinationCity.name}</option>)}
                                </select>
                            </>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#64748B', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                            <button onClick={handleSubmit} disabled={saving || !form.amount || !form.description}
                                style={{ flex: 2, padding: '0.75rem', borderRadius: 10, border: 'none', background: '#FFD600', color: '#000', cursor: 'pointer', fontWeight: 800, opacity: saving || !form.amount || !form.description ? 0.6 : 1 }}>
                                {saving ? 'Enviando...' : '💾 Enviar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
