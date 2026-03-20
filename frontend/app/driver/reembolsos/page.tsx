'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api/client';

const TIPOS = [
    { value: 'FOOD',              label: '🍽️ Alimentação' },
    { value: 'EMERGENCY_REPAIR',  label: '🔧 Reparo Emergencial' },
    { value: 'CLEANING_MATERIAL', label: '🧹 Material de Limpeza' },
    { value: 'CLASSROOM_MATERIAL',label: '📚 Material de Aula' },
    { value: 'OTHER',             label: '📦 Outro' },
];

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
    PENDING:  { label: 'Pendente',  bg: 'rgba(251,191,36,0.12)',  color: '#92400E' },
    APPROVED: { label: 'Aprovado',  bg: 'rgba(16,185,129,0.12)', color: '#065F46' },
    REJECTED: { label: 'Rejeitado', bg: 'rgba(239,68,68,0.12)',  color: '#991B1B' },
};

const CSS = `
@keyframes rmb-fade-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
.rmb-page { animation: rmb-fade-in .3s ease; }
.rmb-card {
    background: #FFFFFF;
    border-radius: 14px;
    padding: 1.1rem 1.25rem;
    border: 1px solid #E5E7EB;
    margin-bottom: 0.75rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    transition: box-shadow .2s, border-color .2s;
}
.rmb-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); border-color: rgba(255,214,0,0.4); }
.rmb-modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(8px);
    z-index: 100;
    display: flex; align-items: flex-end; justify-content: center; padding: 1rem;
}
.rmb-modal {
    background: #FFFFFF;
    border-radius: 20px;
    padding: 1.75rem;
    width: 100%; max-width: 540px;
    border: 1px solid rgba(0,0,0,0.08);
    box-shadow: 0 8px 40px rgba(0,0,0,0.15);
    max-height: 90vh; overflow-y: auto;
}
.rmb-input {
    width: 100%; padding: 0.75rem 0.9rem;
    border-radius: 10px;
    border: 1.5px solid #E5E7EB;
    background: #F9FAFB;
    color: #111827;
    font-size: 0.9rem;
    box-sizing: border-box;
    margin-bottom: 0.75rem;
    outline: none;
    transition: border-color .18s;
}
.rmb-input:focus { border-color: #FFD600; box-shadow: 0 0 0 3px rgba(255,214,0,0.15); }
.rmb-label {
    font-size: 0.7rem; color: #6B7280; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
    display: block; margin-bottom: 0.35rem;
}
`;

export default function DriverReembolsos() {
    const [reembolsos, setReembolsos] = useState<any[]>([]);
    const [trips, setTrips]           = useState<any[]>([]);
    const [loading, setLoading]       = useState(true);
    const [showForm, setShowForm]     = useState(false);
    const [saving, setSaving]         = useState(false);
    const [form, setForm]             = useState({ type: 'FOOD', amount: '', description: '' });

    const load = async () => {
        setLoading(true);
        try {
            const [r, t] = await Promise.all([
                api.get('/reimbursements'),
                api.get('/driver/trips?status=IN_TRANSIT').catch(() => ({ data: [] })),
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
                // tripId não existe no schema Reimbursement
            });
            setShowForm(false);
            setForm({ type: 'FOOD', amount: '', description: '' });
            load();
        } catch { } finally { setSaving(false); }
    };

    return (
        <>
        <style>{CSS}</style>
        <div className="rmb-page" style={{ maxWidth: 580, margin: '0 auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{
                        fontFamily: 'Orbitron, sans-serif',
                        fontSize: '2rem', fontWeight: 900,
                        letterSpacing: '0.08em', margin: 0,
                        background: 'linear-gradient(135deg, #FFD600, #F59E0B)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>REEMBOLSOS</h1>
                    <p style={{ color: '#6B7280', fontSize: '0.82rem', margin: '0.25rem 0 0' }}>
                        Solicite e acompanhe seus pedidos de reembolso
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    style={{
                        padding: '0.65rem 1.25rem', borderRadius: 10, border: 'none',
                        background: 'linear-gradient(135deg,#FFD600,#F59E0B)',
                        color: '#0F172A', fontWeight: 800, fontSize: '0.82rem',
                        cursor: 'pointer', boxShadow: '0 4px 12px rgba(255,214,0,0.35)',
                    }}>
                    + Novo
                </button>
            </div>

            {/* Resumo rápido */}
            {reembolsos.length > 0 && (
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem',
                    marginBottom: '1.25rem',
                }}>
                    {[
                        { label: 'Pendentes', count: reembolsos.filter(r => r.status === 'PENDING').length, color: '#92400E', bg: 'rgba(255,214,0,0.1)' },
                        { label: 'Aprovados', count: reembolsos.filter(r => r.status === 'APPROVED').length, color: '#065F46', bg: 'rgba(16,185,129,0.1)' },
                        { label: 'Rejeitados', count: reembolsos.filter(r => r.status === 'REJECTED').length, color: '#991B1B', bg: 'rgba(239,68,68,0.1)' },
                    ].map((s, i) => (
                        <div key={i} style={{
                            background: s.bg, borderRadius: 12, padding: '0.75rem 1rem',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.35rem', fontWeight: 900, color: s.color }}>{s.count}</div>
                            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: s.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Lista */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
                    Carregando reembolsos...
                </div>
            ) : reembolsos.length === 0 ? (
                <div className="rmb-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💰</div>
                    <div style={{ color: '#9CA3AF', fontSize: '0.85rem', fontWeight: 600 }}>
                        Nenhum reembolso solicitado
                    </div>
                    <p style={{ color: '#D1D5DB', fontSize: '0.75rem', marginTop: '0.4rem' }}>
                        Clique em &quot;+ Novo&quot; para solicitar seu primeiro reembolso
                    </p>
                </div>
            ) : reembolsos.map((r: any) => {
                const st   = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
                const tipo = TIPOS.find(t => t.value === r.type);
                const data = r.createdAt ? new Date(r.createdAt).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' }) : '';
                return (
                    <div key={r.id} className="rmb-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.92rem', marginBottom: '0.2rem' }}>
                                    {tipo?.label || r.type}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.4rem' }}>
                                    {r.description}
                                </div>
                                {data && <div style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>📅 {data}</div>}
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '1rem' }}>
                                <div style={{ fontFamily: 'Orbitron, monospace', fontWeight: 900, color: '#111827', fontSize: '1.05rem', marginBottom: '0.3rem' }}>
                                    R$ {Number(r.amount).toFixed(2)}
                                </div>
                                <span style={{
                                    fontSize: '0.65rem', fontWeight: 700,
                                    color: st.color, background: st.bg,
                                    padding: '0.2rem 0.6rem', borderRadius: 20,
                                    letterSpacing: '0.06em', whiteSpace: 'nowrap',
                                }}>
                                    {st.label}
                                </span>
                            </div>
                        </div>
                        {r.rejectionReason && (
                            <div style={{
                                fontSize: '0.72rem', color: '#991B1B',
                                background: 'rgba(239,68,68,0.08)',
                                padding: '0.4rem 0.7rem', borderRadius: 8, marginTop: '0.6rem',
                                borderLeft: '3px solid #EF4444',
                            }}>
                                ❌ Motivo: {r.rejectionReason}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Modal Novo Reembolso */}
            {showForm && (
                <div className="rmb-modal-overlay"
                    onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
                    <div className="rmb-modal">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <div>
                                <div style={{ fontFamily: 'Orbitron', fontWeight: 800, color: '#111827', fontSize: '1rem' }}>
                                    💰 Novo Reembolso
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.2rem' }}>
                                    Preencha os dados da despesa
                                </div>
                            </div>
                            <button onClick={() => setShowForm(false)} style={{
                                background: '#F3F4F6', border: 'none', borderRadius: 8,
                                width: 32, height: 32, cursor: 'pointer', fontSize: '1rem', color: '#6B7280',
                            }}>✕</button>
                        </div>

                        <label className="rmb-label">Tipo de despesa</label>
                        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                            className="rmb-input" style={{ appearance: 'none' }}>
                            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>

                        <label className="rmb-label">Valor (R$)</label>
                        <input type="text" inputMode="decimal" placeholder="Ex: 45,90"
                            value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                            className="rmb-input" />

                        <label className="rmb-label">Descrição</label>
                        <textarea rows={3} placeholder="Descreva a despesa com detalhes..."
                            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                            className="rmb-input" style={{ resize: 'vertical' }} />

                        {trips.length > 0 && (
                            <>
                                <label className="rmb-label">Vincular à viagem (opcional)</label>
                                <select className="rmb-input" style={{ appearance: 'none' }}>
                                    <option value="">Sem vínculo</option>
                                    {trips.map((t: any) => (
                                        <option key={t.id} value={t.id}>
                                            {t.originCity?.name} → {t.destinationCity?.name}
                                        </option>
                                    ))}
                                </select>
                            </>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <button onClick={() => setShowForm(false)} style={{
                                flex: 1, padding: '0.8rem', borderRadius: 10,
                                border: '1.5px solid #E5E7EB', background: '#F9FAFB',
                                color: '#6B7280', cursor: 'pointer', fontWeight: 600,
                            }}>Cancelar</button>
                            <button onClick={handleSubmit}
                                disabled={saving || !form.amount || !form.description}
                                style={{
                                    flex: 2, padding: '0.8rem', borderRadius: 10, border: 'none',
                                    background: 'linear-gradient(135deg,#FFD600,#F59E0B)',
                                    color: '#0F172A', cursor: 'pointer', fontWeight: 800,
                                    opacity: saving || !form.amount || !form.description ? 0.5 : 1,
                                    boxShadow: '0 4px 12px rgba(255,214,0,0.3)',
                                }}>
                                {saving ? 'Enviando...' : '💾 Enviar Solicitação'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </>
    );
}
