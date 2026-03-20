'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api/client';

interface Maintenance {
    id: string;
    truckId: string;
    tipo: string;        // campos em PT do schema
    titulo?: string;
    descricao?: string;
    status: string;      // 'agendada' | 'em_andamento' | 'concluida' | 'cancelada'
    prioridade?: string; // 'baixa' | 'media' | 'alta' | 'critica'
    dataAgendada?: string;
    dataConclusao?: string;
    custoEstimado?: number;
    custoReal?: number;
    truck?: { identifier: string; licensePlate: string };
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    agendada:     { label: 'Pendente',     color: '#D97706', bg: 'rgba(251,191,36,0.12)' },
    em_andamento: { label: 'Em Andamento', color: '#2563EB', bg: 'rgba(37,99,235,0.10)' },
    concluida:    { label: 'ConcluÃ­da',    color: '#059669', bg: 'rgba(5,150,105,0.10)' },
    cancelada:    { label: 'Cancelada',    color: '#DC2626', bg: 'rgba(220,38,38,0.10)' },
    // legacy aliases
    PENDING:     { label: 'Pendente',     color: '#D97706', bg: 'rgba(251,191,36,0.12)' },
    IN_PROGRESS: { label: 'Em Andamento', color: '#2563EB', bg: 'rgba(37,99,235,0.10)' },
    COMPLETED:   { label: 'ConcluÃ­da',    color: '#059669', bg: 'rgba(5,150,105,0.10)' },
    CANCELLED:   { label: 'Cancelada',    color: '#DC2626', bg: 'rgba(220,38,38,0.10)' },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
    baixa:   { label: 'Baixa',   color: '#10B981' },
    media:   { label: 'MÃ©dia',   color: '#F59E0B' },
    alta:    { label: 'Alta',    color: '#EF4444' },
    critica: { label: 'CrÃ­tica', color: '#7C3AED' },
    LOW:     { label: 'Baixa',   color: '#10B981' },
    MEDIUM:  { label: 'MÃ©dia',   color: '#F59E0B' },
    HIGH:    { label: 'Alta',    color: '#EF4444' },
    CRITICAL:{ label: 'CrÃ­tica', color: '#7C3AED' },
};

const TYPE_MAP: Record<string, { label: string; icon: string; color: string }> = {
    // PT values (schema atual)
    preventiva:  { label: 'Preventiva',           icon: 'ðŸ”§', color: '#059669' },
    corretiva:   { label: 'Corretiva/EmergÃªncia', icon: 'ðŸ”¨', color: '#DC2626' },
    pneu:        { label: 'Troca de Pneu',        icon: 'ðŸ›ž', color: '#7C3AED' },
    revisao:     { label: 'RevisÃ£o Geral',         icon: 'ðŸ”©', color: '#2563EB' },
    eletrica:    { label: 'ElÃ©trica',             icon: 'âš¡', color: '#D97706' },
    funilaria:   { label: 'Funilaria/Carroceria',  icon: 'ðŸš›', color: '#6B7280' },
    // EN aliases
    PREVENTIVE:  { label: 'Preventiva',           icon: 'ðŸ”§', color: '#059669' },
    CORRECTIVE:  { label: 'Corretiva/EmergÃªncia', icon: 'ðŸ”¨', color: '#DC2626' },
    TIRE_CHANGE: { label: 'Troca de Pneu',        icon: 'ðŸ›ž', color: '#7C3AED' },
    OIL_CHANGE:  { label: 'Troca de Ã“leo',        icon: 'ðŸ›¢ï¸', color: '#2563EB' },
    ELECTRICAL:  { label: 'ElÃ©trica',             icon: 'âš¡', color: '#D97706' },
    BODY:        { label: 'Funilaria/Carroceria',  icon: 'ðŸš›', color: '#6B7280' },
};

function fmtDate(d?: string) {
    if (!d) return 'â€”';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtCost(v?: number | null) {
    if (v == null || v === 0) return 'â€”';
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// â”€â”€ Modal de Detalhes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ModalDetalhes({ m, onClose }: { m: Maintenance; onClose: () => void }) {
    const st = STATUS_MAP[m.status] || STATUS_MAP.agendada;
    const pr = m.prioridade ? PRIORITY_MAP[m.prioridade] : null;
    const tp = TYPE_MAP[m.tipo] || { label: m.tipo || 'ManutenÃ§Ã£o', icon: 'ðŸ”§', color: '#6B7280' };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>{tp.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'Orbitron', fontSize: '0.9rem', fontWeight: 900, color: '#fff' }}>{m.titulo || tp.label.toUpperCase()}</div>
                        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                            ðŸš› {m.truck?.licensePlate || 'VeÃ­culo'} Â· {fmtDate(m.dataAgendada)}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 8, padding: '4px 8px', fontSize: '1rem' }}>âœ•</button>
                </div>

                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ padding: '0.3rem 0.8rem', borderRadius: 100, background: st.bg, color: st.color, fontSize: '0.72rem', fontWeight: 800, border: `1px solid ${st.color}30` }}>{st.label.toUpperCase()}</span>
                        {pr && <span style={{ padding: '0.3rem 0.8rem', borderRadius: 100, background: `${pr.color}18`, color: pr.color, fontSize: '0.72rem', fontWeight: 800 }}>PRIORIDADE {pr.label.toUpperCase()}</span>}
                    </div>

                    {m.descricao ? (
                        <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '12px 14px', border: '1px solid #E5E7EB' }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9CA3AF', letterSpacing: '0.1em', marginBottom: 6 }}>DESCRIÃ‡ÃƒO COMPLETA</div>
                            <p style={{ fontSize: '0.85rem', color: '#111827', lineHeight: 1.6, margin: 0 }}>{m.descricao}</p>
                        </div>
                    ) : (
                        <div style={{ color: '#9CA3AF', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>Sem descriÃ§Ã£o registrada.</div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[
                            { label: 'Data Agendada',  value: fmtDate(m.dataAgendada),   icon: 'ðŸ“…' },
                            { label: 'Data ConclusÃ£o', value: fmtDate(m.dataConclusao),  icon: 'âœ…' },
                            { label: 'Custo Real',     value: fmtCost(m.custoReal),      icon: 'ðŸ’°' },
                            { label: 'Custo Est.',     value: fmtCost(m.custoEstimado),  icon: 'ðŸ“‹' },
                        ].map(item => (
                            <div key={item.label} style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 12px', border: '1px solid #F3F4F6' }}>
                                <div style={{ fontSize: '0.6rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 4 }}>{item.icon} {item.label}</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>{item.value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ padding: '0 20px 20px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '9px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#F59E0B,#D97706)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>Fechar</button>
                </div>
            </div>
        </div>
    );
}

// â”€â”€ Modal de Nova ManutenÃ§Ã£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ModalNovaManutencao({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState({ tipo: 'CORRECTIVE', descricao: '', km: '', custo: '', prioridade: 'HIGH' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSave = async () => {
        if (!form.descricao.trim()) { setError('Informe a descriÃ§Ã£o do problema.'); return; }
        setSaving(true); setError('');
        try {
            const truckRes = await api.get('/trucks').catch(() => ({ data: [] }));
            const trucks = Array.isArray(truckRes.data) ? truckRes.data : (truckRes.data?.data ?? []);
            const truckId = trucks[0]?.id;

            if (truckId) {
                await api.post('/truck-maintenance', {
                    truckId, type: form.tipo, description: form.descricao,
                    status: 'PENDING', priority: form.prioridade,
                    cost: form.custo ? parseFloat(form.custo) : undefined,
                    scheduledDate: new Date().toISOString(),
                }).catch(() => {});
            }

            if (form.custo && parseFloat(form.custo) > 0) {
                await api.post('/reimbursements', {
                    type: 'EMERGENCY_REPAIR',
                    amount: parseFloat(form.custo),
                    description: `[MANUTENÃ‡ÃƒO] ${form.descricao}${form.km ? ` â€” km ${form.km}` : ''}`,
                }).catch(() => {});
            }

            setSuccess(true);
            setTimeout(() => { onSaved(); onClose(); }, 1800);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Erro ao registrar. Tente novamente.');
        } finally { setSaving(false); }
    };

    const INPUT: React.CSSProperties = {
        width: '100%', padding: '0.65rem 0.9rem', borderRadius: 9,
        border: '1.5px solid #E5E7EB', background: '#F9FAFB',
        fontSize: '0.85rem', color: '#111827', outline: 'none',
        boxSizing: 'border-box' as const,
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
                <div style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', padding: '16px 20px', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>ðŸ”§</div>
                    <div>
                        <div style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 900, color: '#fff' }}>REGISTRAR MANUTENÃ‡ÃƒO</div>
                        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.75)' }}>EmergÃªncia ou imprevisto â€” cria reembolso automaticamente</div>
                    </div>
                    <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.1rem' }}>âœ•</button>
                </div>

                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <div style={{ padding: '10px 14px', borderRadius: 9, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.82rem' }}>âš ï¸ {error}</div>}
                    {success && <div style={{ padding: '10px 14px', borderRadius: 9, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#059669', fontSize: '0.82rem' }}>âœ… Registrado! {parseFloat(form.custo || '0') > 0 ? 'Reembolso criado automaticamente.' : ''}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase' as const, color: '#6B7280', marginBottom: 5 }}>Tipo</label>
                            <select style={{ ...INPUT, cursor: 'pointer' }} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                                {Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase' as const, color: '#6B7280', marginBottom: 5 }}>Prioridade</label>
                            <select style={{ ...INPUT, cursor: 'pointer' }} value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value }))}>
                                {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase' as const, color: '#6B7280', marginBottom: 5 }}>DescriÃ§Ã£o do Problema *</label>
                        <textarea style={{ ...INPUT, resize: 'none', fontFamily: 'inherit' } as any} rows={3}
                            placeholder="Ex: Pneu furado na BR-135, km 342. NecessÃ¡rio troca imediata."
                            value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase' as const, color: '#6B7280', marginBottom: 5 }}>Km Atual (HodÃ´metro)</label>
                            <input type="number" style={INPUT} placeholder="Ex: 145320" value={form.km} onChange={e => setForm(f => ({ ...f, km: e.target.value }))} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase' as const, color: '#6B7280', marginBottom: 5 }}>Custo (R$) â€” gera reembolso</label>
                            <input type="number" step="0.01" style={INPUT} placeholder="0,00" value={form.custo} onChange={e => setForm(f => ({ ...f, custo: e.target.value }))} />
                        </div>
                    </div>

                    {form.custo && parseFloat(form.custo) > 0 && (
                        <div style={{ padding: '10px 14px', borderRadius: 9, background: '#FFFDE7', border: '1px solid #FEF08A', fontSize: '0.78rem', color: '#92400E' }}>
                            ðŸ” <strong>Reembolso automÃ¡tico:</strong> pedido de <strong>R$ {parseFloat(form.custo).toFixed(2).replace('.', ',')}</strong> serÃ¡ criado para aprovaÃ§Ã£o do admin.
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid #E5E7EB', background: 'transparent', color: '#6B7280', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Cancelar</button>
                        <button onClick={handleSave} disabled={saving || success}
                            style={{ padding: '9px 24px', borderRadius: 9, background: saving || success ? '#9CA3AF' : 'linear-gradient(135deg, #F59E0B, #D97706)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: saving || success ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(245,158,11,0.35)' }}>
                            {saving ? 'â³ Salvando...' : success ? 'âœ… Registrado!' : 'ðŸ”§ Registrar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function DriverManutencao() {
    const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selected, setSelected] = useState<Maintenance | null>(null);

    const load = async () => {
        try {
            const res = await api.get('/truck-maintenance');
            const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
            setMaintenances(data);
        } catch { setMaintenances([]); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const filtered = maintenances.filter(m => (!filter || m.status === filter) && (!search || [m.titulo, m.descricao, m.truck?.licensePlate, m.truck?.identifier].some(f => f?.toLowerCase().includes(search.toLowerCase()))));

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #FFFDE7, #FFF9C4)', borderRadius: 18, border: '1px solid rgba(255,214,0,0.4)', padding: '1.5rem 1.75rem', boxShadow: '0 4px 20px rgba(255,214,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg,#F59E0B,#D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(245,158,11,0.4)' }}>ðŸ”§</div>
                        <div>
                            <h1 className="gradient-text" style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.5rem', letterSpacing: '0.08em', margin: 0 }}>MANUTENÃ‡ÃƒO</h1>
                            <p style={{ color: '#B45309', fontSize: '0.65rem', letterSpacing: '0.1em', margin: '0.15rem 0 0' }}>HISTÃ“RICO E SOLICITAÃ‡Ã•ES DO VEÃCULO</p>
                        </div>
                    </div>
                    <button onClick={() => setShowModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', borderRadius: 10, background: 'linear-gradient(135deg, #F59E0B, #D97706)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(245,158,11,0.4)' }}>
                        ðŸ“‹ Registrar OcorrÃªncia
                    </button>
                </div>
            </div>

                        {/* Busca + Filtros */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.25rem' }}>
                <input
                    type="text"
                    placeholder="🔍 Buscar por título, descrição, placa..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        flex: '1 1 220px', minWidth: 200, padding: '0.45rem 0.85rem',
                        borderRadius: 9, border: '1.5px solid #E5E7EB', background: '#F9FAFB',
                        fontSize: '0.82rem', color: '#111827', outline: 'none',
                        transition: 'border-color 0.15s',
                    }}
                    onFocus={e => (e.target.style.borderColor = '#FFD600')}
                    onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                />
            </div>
{/* Filtros */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {[{ v: '', label: 'Todas' }, { v: 'agendada', label: 'Pendente' }, { v: 'em_andamento', label: 'Em Andamento' }, { v: 'concluida', label: 'ConcluÃ­da' }].map(({ v: s, label }) => {
                    const isActive = filter === s;
                    const cfg = s ? (STATUS_MAP[s] || { color: '#6B7280', bg: '#F3F4F6' }) : { label: 'Todas', color: '#6B7280', bg: '#F3F4F6' };
                    return (
                        <button key={s || 'all'} onClick={() => setFilter(s)} style={{ padding: '0.4rem 0.9rem', borderRadius: 100, border: `1.5px solid ${isActive ? cfg.color : '#E5E7EB'}`, background: isActive ? cfg.bg : 'transparent', color: isActive ? cfg.color : '#6B7280', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>{label}</button>
                    );
                })}
                {filtered.length > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#9CA3AF' }}>
                        {filtered.length} registro{filtered.length !== 1 ? 's' : ''} Â· <em>clique para detalhes</em>
                    </span>
                )}
            </div>

            {/* Lista */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem', width: 36, height: 36 }} />
                    <div style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>Carregando manutenÃ§Ãµes...</div>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>ðŸ”§</div>
                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem', letterSpacing: '0.12em', color: '#9CA3AF' }}>NENHUM REGISTRO DE MANUTENÃ‡ÃƒO</div>
                    <p style={{ color: '#9CA3AF', fontSize: '0.78rem', marginTop: '0.5rem' }}>Use o botÃ£o acima para registrar uma ocorrÃªncia.</p>
                    <button onClick={() => setShowModal(true)} style={{ marginTop: '1rem', padding: '0.6rem 1.5rem', borderRadius: 10, background: 'linear-gradient(135deg, #F59E0B, #D97706)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                        ðŸ“‹ Registrar Primeira OcorrÃªncia
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {filtered.map((m, i) => {
                        const st = STATUS_MAP[m.status] || STATUS_MAP.agendada;
                        const pr = m.prioridade ? PRIORITY_MAP[m.prioridade] : null;
                        const tp = TYPE_MAP[m.tipo] || { label: m.tipo || 'ManutenÃ§Ã£o', icon: 'ðŸ”§', color: '#6B7280' };
                        const descResumo = m.descricao
                            ? (m.descricao.length > 90 ? m.descricao.slice(0, 90) + 'â€¦' : m.descricao)
                            : 'Sem descriÃ§Ã£o registrada';

                        return (
                            <div
                                key={m.id}
                                onClick={() => setSelected(m)}
                                className="animate-scale-in"
                                style={{
                                    animationDelay: `${i * 30}ms`,
                                    background: '#FFFFFF',
                                    borderRadius: 14,
                                    border: '1.5px solid #E5E7EB',
                                    padding: '1rem 1.25rem',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                                    cursor: 'pointer',
                                    transition: 'all 0.18s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                }}
                                onMouseEnter={e => {
                                    const el = e.currentTarget as HTMLElement;
                                    el.style.boxShadow = '0 6px 20px rgba(245,158,11,0.15)';
                                    el.style.borderColor = '#FCD34D';
                                    el.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={e => {
                                    const el = e.currentTarget as HTMLElement;
                                    el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
                                    el.style.borderColor = '#E5E7EB';
                                    el.style.transform = '';
                                }}
                            >
                                {/* Ãcone tipo */}
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${tp.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0, border: `1px solid ${tp.color}25` }}>
                                    {tp.icon}
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#111827' }}>{m.titulo || tp.label}</span>
                                        {m.truck && <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>Â· ðŸš› {m.truck.licensePlate}</span>}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#6B7280', lineHeight: 1.4, marginBottom: '0.3rem' }}>{descResumo}</div>
                                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.68rem', color: '#9CA3AF' }}>
                                        {m.dataAgendada && <span>ðŸ“… {fmtDate(m.dataAgendada)}</span>}
                                        {m.custoReal != null && Number(m.custoReal) > 0 && <span>ðŸ’° {fmtCost(m.custoReal)}</span>}
                                    </div>
                                </div>

                                {/* Badges + chevron */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 }}>
                                    <span style={{ padding: '0.2rem 0.65rem', borderRadius: 100, background: st.bg, color: st.color, fontSize: '0.62rem', fontWeight: 800, whiteSpace: 'nowrap' }}>{st.label.toUpperCase()}</span>
                                    {pr && <span style={{ padding: '0.18rem 0.55rem', borderRadius: 100, background: `${pr.color}18`, color: pr.color, fontSize: '0.6rem', fontWeight: 700 }}>{pr.label}</span>}
                                    <span style={{ fontSize: '0.85rem', color: '#D1D5DB' }}>â€º</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showModal && <ModalNovaManutencao onClose={() => setShowModal(false)} onSaved={load} />}
            {selected && <ModalDetalhes m={selected} onClose={() => setSelected(null)} />}
        </div>
    );
}

