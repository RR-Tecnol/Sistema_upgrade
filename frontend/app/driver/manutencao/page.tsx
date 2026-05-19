'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api/client';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { CreationSuccessScreen } from '@/components/CreationSuccessScreen';

interface Maintenance {
    id: string;
    truckId: string;
    tipo: string;
    titulo?: string;
    descricao?: string;
    status: string;
    prioridade?: string;
    dataAgendada?: string;
    dataConclusao?: string;
    custoEstimado?: number;
    custoReal?: number;
    truck?: { identifier: string; licensePlate: string };
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    agendada:     { label: 'Pendente',     color: '#D97706', bg: 'rgba(251,191,36,0.12)' },
    em_andamento: { label: 'Em Andamento', color: '#2563EB', bg: 'rgba(37,99,235,0.10)' },
    concluida:    { label: 'Concluída',    color: '#059669', bg: 'rgba(5,150,105,0.10)' },
    cancelada:    { label: 'Cancelada',    color: '#DC2626', bg: 'rgba(220,38,38,0.10)' },
    PENDING:     { label: 'Pendente',     color: '#D97706', bg: 'rgba(251,191,36,0.12)' },
    IN_PROGRESS: { label: 'Em Andamento', color: '#2563EB', bg: 'rgba(37,99,235,0.10)' },
    COMPLETED:   { label: 'Concluída',    color: '#059669', bg: 'rgba(5,150,105,0.10)' },
    CANCELLED:   { label: 'Cancelada',    color: '#DC2626', bg: 'rgba(220,38,38,0.10)' },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
    baixa:   { label: 'Baixa',   color: '#10B981' },
    media:   { label: 'Média',   color: '#F59E0B' },
    alta:    { label: 'Alta',    color: '#EF4444' },
    critica: { label: 'Crítica', color: '#7C3AED' },
    LOW:     { label: 'Baixa',   color: '#10B981' },
    MEDIUM:  { label: 'Média',   color: '#F59E0B' },
    HIGH:    { label: 'Alta',    color: '#EF4444' },
    CRITICAL:{ label: 'Crítica', color: '#7C3AED' },
};

const TYPE_MAP: Record<string, { label: string; icon: string; color: string }> = {
    preventiva:  { label: 'Preventiva',           icon: '🔧', color: '#059669' },
    corretiva:   { label: 'Corretiva/Emergência',  icon: '🔨', color: '#DC2626' },
    pneu:        { label: 'Troca de Pneu',         icon: '🛞', color: '#7C3AED' },
    revisao:     { label: 'Revisão Geral',         icon: '🔩', color: '#2563EB' },
    eletrica:    { label: 'Elétrica',              icon: '⚡', color: '#D97706' },
    funilaria:   { label: 'Funilaria/Carroceria',  icon: '🚛', color: '#6B7280' },
    outro:       { label: 'Outro',                 icon: '🔧', color: '#6B7280' },
    PREVENTIVE:  { label: 'Preventiva',            icon: '🔧', color: '#059669' },
    CORRECTIVE:  { label: 'Corretiva/Emergência',  icon: '🔨', color: '#DC2626' },
    TIRE_CHANGE: { label: 'Troca de Pneu',         icon: '🛞', color: '#7C3AED' },
    OIL_CHANGE:  { label: 'Troca de Óleo',         icon: '🛢️', color: '#2563EB' },
    ELECTRICAL:  { label: 'Elétrica',              icon: '⚡', color: '#D97706' },
    BODY:        { label: 'Funilaria/Carroceria',  icon: '🚛', color: '#6B7280' },
};

function fmtDate(d?: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtCost(v?: number | null) {
    if (v == null || v === 0) return '—';
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Modal de Detalhes
function ModalDetalhes({ m, onClose }: { m: Maintenance; onClose: () => void }) {
    const st = STATUS_MAP[m.status] || STATUS_MAP.agendada;
    const pr = m.prioridade ? PRIORITY_MAP[m.prioridade] : null;
    const tp = TYPE_MAP[m.tipo] || { label: m.tipo || 'Manutenção', icon: '🔧', color: '#6B7280' };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>{tp.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'Orbitron', fontSize: '0.9rem', fontWeight: 900, color: '#fff' }}>{m.titulo || tp.label.toUpperCase()}</div>
                        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                            🚛 {m.truck?.licensePlate || 'Veículo'} · {fmtDate(m.dataAgendada)}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 8, padding: '4px 8px', fontSize: '1rem' }}>✕</button>
                </div>
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ padding: '0.3rem 0.8rem', borderRadius: 100, background: st.bg, color: st.color, fontSize: '0.72rem', fontWeight: 800, border: `1px solid ${st.color}30` }}>{st.label.toUpperCase()}</span>
                        {pr && <span style={{ padding: '0.3rem 0.8rem', borderRadius: 100, background: `${pr.color}18`, color: pr.color, fontSize: '0.72rem', fontWeight: 800 }}>PRIORIDADE {pr.label.toUpperCase()}</span>}
                    </div>
                    {m.descricao ? (
                        <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '12px 14px', border: '1px solid #E5E7EB' }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9CA3AF', letterSpacing: '0.1em', marginBottom: 6 }}>DESCRIÇÃO COMPLETA</div>
                            <p style={{ fontSize: '0.85rem', color: '#111827', lineHeight: 1.6, margin: 0 }}>{m.descricao}</p>
                        </div>
                    ) : (
                        <div style={{ color: '#9CA3AF', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>Sem descrição registrada.</div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[
                            { label: 'Data Agendada',  value: fmtDate(m.dataAgendada),  icon: '📅' },
                            { label: 'Data Conclusão', value: fmtDate(m.dataConclusao), icon: '✅' },
                            { label: 'Custo Real',     value: fmtCost(m.custoReal),     icon: '💰' },
                            { label: 'Custo Est.',     value: fmtCost(m.custoEstimado), icon: '📋' },
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

// Modal Nova Manutenção
function ModalNovaManutencao({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState({ tipo: 'corretiva', descricao: '', km: '', custo: '', prioridade: 'alta' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const [truckId, setTruckId] = useState<string | null>(null);
    const [availableTrucks, setAvailableTrucks] = useState<any[]>([]);

    // BUG 5 — km sugerido automaticamente da última viagem e carretas
    useEffect(() => {
        Promise.all([
            api.get('/driver/trips').catch(() => ({ data: [] })),
            api.get('/trucks').catch(() => ({ data: [] }))
        ]).then(([tripsRes, trucksRes]) => {
            const trips = Array.isArray(tripsRes.data) ? tripsRes.data : [];
            const trks = Array.isArray(trucksRes.data) ? trucksRes.data : (trucksRes.data?.data || []);
            setAvailableTrucks(trks);

            const active = trips.find((t: any) => t.status === 'IN_TRANSIT');
            const lastCompleted = trips.find((t: any) => t.status === 'COMPLETED' && t.truckId);
            const kmSugerido = active?.kmStart || lastCompleted?.kmEnd;
            if (kmSugerido) setForm(f => ({ ...f, km: String(kmSugerido) }));
            
            const autoId = active?.truckId || lastCompleted?.truckId || null;
            if (autoId) setTruckId(autoId);
            else if (trks.length === 1) setTruckId(trks[0].id);
        });
    }, []);

    const handleSave = async () => {
        if (!form.descricao.trim()) { setError('Informe a descrição do problema.'); return; }
        setSaving(true); setError('');
        try {
            if (truckId) {
                await api.post('/truck-maintenance', {
                    truckId, tipo: form.tipo, titulo: `Ocorrência — ${TYPE_MAP[form.tipo]?.label || form.tipo}`,
                    descricao: form.descricao, status: 'agendada', prioridade: form.prioridade,
                    custoEstimado: form.custo ? parseFloat(form.custo) : undefined,
                    dataAgendada: new Date().toISOString(),
                });
            } else {
                throw new Error('Nenhuma carreta vinculada à sua conta/viagem atual.');
            }
            if (form.custo && parseFloat(form.custo) > 0) {
                await api.post('/reimbursements', {
                    type: 'EMERGENCY_REPAIR', amount: parseFloat(form.custo),
                    description: `[MANUTENÇÃO] ${form.descricao}${form.km ? ` — km ${form.km}` : ''}`,
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
        fontSize: '0.85rem', color: '#111827', outline: 'none', boxSizing: 'border-box' as const,
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
                <div style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', padding: '16px 20px', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 1 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🔧</div>
                    <div>
                        <div style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 900, color: '#fff' }}>REGISTRAR MANUTENÇÃO</div>
                        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.75)' }}>Emergência ou imprevisto — cria reembolso automaticamente</div>
                    </div>
                    <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
                </div>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <div style={{ padding: '10px 14px', borderRadius: 9, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.82rem' }}>⚠️ {error}</div>}
                    {success && (
                        <div style={{ marginBottom: 8 }}>
                            <CreationSuccessScreen
                                title="MANUTENÇÃO REGISTRADA!"
                                secondaryLine={parseFloat(form.custo || '0') > 0 ? 'Ocorrência salva e pedido de reembolso enviado automaticamente.' : 'Ocorrência registrada com sucesso.'}
                                redirectMessage="Esta janela fechará em instantes..."
                                alinhamento="center"
                                minHeight="auto"
                            />
                        </div>
                    )}
                    {availableTrucks.length > 0 && (
                        <div>
                            <label style={{ display: 'block', fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase' as const, color: '#6B7280', marginBottom: 5 }}>Carreta / Veículo *</label>
                            <select style={{ ...INPUT, cursor: 'pointer', borderColor: !truckId ? '#EF4444' : '#E5E7EB' }} 
                                value={truckId || ''} onChange={e => setTruckId(e.target.value || null)}>
                                <option value="" disabled>Selecione a carreta...</option>
                                {availableTrucks.map(t => (
                                    <option key={t.id} value={t.id}>{t.licensePlate} {t.identifier ? `— ${t.identifier}` : ''}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase' as const, color: '#6B7280', marginBottom: 5 }}>Tipo</label>
                            <select style={{ ...INPUT, cursor: 'pointer' }} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                                {['preventiva','corretiva','pneu','revisao','eletrica','funilaria','outro'].map(k => (
                                    <option key={k} value={k}>{TYPE_MAP[k]?.icon} {TYPE_MAP[k]?.label || k}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase' as const, color: '#6B7280', marginBottom: 5 }}>Prioridade</label>
                            <select style={{ ...INPUT, cursor: 'pointer' }} value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value }))}>
                                {['baixa','media','alta','critica'].map(k => <option key={k} value={k}>{PRIORITY_MAP[k]?.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase' as const, color: '#6B7280', marginBottom: 5 }}>Descrição do Problema *</label>
                        <textarea style={{ ...INPUT, resize: 'none', fontFamily: 'inherit' } as React.CSSProperties} rows={3}
                            placeholder="Ex: Pneu furado na BR-135, km 342. Necessário troca imediata."
                            value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase' as const, color: '#6B7280', marginBottom: 5 }}>Km Atual (Hodômetro) — sugestão</label>
                            <input type="number" style={INPUT} placeholder="Carregando..." value={form.km} onChange={e => setForm(f => ({ ...f, km: e.target.value }))} />
                            {form.km && <div style={{ fontSize: '0.65rem', color: '#059669', marginTop: -8, marginBottom: 8 }}>✓ Valor da última viagem — edite se necessário</div>}
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase' as const, color: '#6B7280', marginBottom: 5 }}>Custo (R$) — gera reembolso</label>
                            <input type="number" step="0.01" style={INPUT} placeholder="0,00" value={form.custo} onChange={e => setForm(f => ({ ...f, custo: e.target.value }))} />
                        </div>
                    </div>
                    {form.custo && parseFloat(form.custo) > 0 && (
                        <div style={{ padding: '10px 14px', borderRadius: 9, background: '#FFFDE7', border: '1px solid #FEF08A', fontSize: '0.78rem', color: '#92400E' }}>
                            📝 <strong>Reembolso automático:</strong> pedido de <strong>R$ {parseFloat(form.custo).toFixed(2).replace('.', ',')}</strong> será criado para aprovação do admin.
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid #E5E7EB', background: 'transparent', color: '#6B7280', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Cancelar</button>
                        <button onClick={handleSave} disabled={saving || success}
                            style={{ padding: '9px 24px', borderRadius: 9, background: saving || success ? '#9CA3AF' : 'linear-gradient(135deg, #F59E0B, #D97706)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: saving || success ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(245,158,11,0.35)' }}>
                            {saving ? '⏳ Salvando...' : success ? '✅ Registrado!' : '🔧 Registrar'}
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
    const [mounted, setMounted] = useState(false);

    const load = async () => {
        try {
            const res = await api.get('/truck-maintenance');
            const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
            setMaintenances(data);
        } catch { setMaintenances([]); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);
    useEffect(() => { setMounted(true); }, []);

    const filtered = maintenances.filter(m =>
        (!filter || m.status === filter) &&
        (!search || [m.titulo, m.descricao, m.truck?.licensePlate, m.truck?.identifier]
            .some(f => f?.toLowerCase().includes(search.toLowerCase())))
    );

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <AdminHeaderHero
                title="MANUTENÇÃO"
                subtitle="Histórico e solicitações do veículo"
                badge="MOTORISTA"
                rightSlot={<button onClick={() => setShowModal(true)} className="btn-primary">📋 Registrar Ocorrência</button>}
            />

            {/* Busca */}
            <input type="text" placeholder="🔍 Buscar por título, descrição, placa..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '0.45rem 0.85rem', borderRadius: 9, border: '1.5px solid #E5E7EB', background: '#F9FAFB', fontSize: '0.82rem', color: '#111827', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => (e.target.style.borderColor = '#FFD600')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
            />

            {/* Filtros */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {[{ v: '', label: 'Todas' }, { v: 'agendada', label: 'Pendente' }, { v: 'em_andamento', label: 'Em Andamento' }, { v: 'concluida', label: 'Concluída' }].map(({ v: s, label }) => {
                    const isActive = filter === s;
                    const cfg = s ? (STATUS_MAP[s] || { color: '#6B7280', bg: '#F3F4F6' }) : { color: '#6B7280', bg: '#F3F4F6' };
                    return (
                        <button key={s || 'all'} onClick={() => setFilter(s)} style={{ padding: '0.4rem 0.9rem', borderRadius: 100, border: `1.5px solid ${isActive ? cfg.color : '#E5E7EB'}`, background: isActive ? cfg.bg : 'transparent', color: isActive ? cfg.color : '#6B7280', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>{label}</button>
                    );
                })}
                {filtered.length > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#9CA3AF' }}>
                        {filtered.length} registro{filtered.length !== 1 ? 's' : ''} · <em>clique para detalhes</em>
                    </span>
                )}
            </div>

            {/* Lista */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem', width: 36, height: 36 }} />
                    <div style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>Carregando manutenções...</div>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔧</div>
                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem', letterSpacing: '0.12em', color: '#9CA3AF' }}>NENHUM REGISTRO DE MANUTENÇÃO</div>
                    <p style={{ color: '#9CA3AF', fontSize: '0.78rem', marginTop: '0.5rem' }}>Use o botão acima para registrar uma ocorrência.</p>
                    <button onClick={() => setShowModal(true)} style={{ marginTop: '1rem', padding: '0.6rem 1.5rem', borderRadius: 10, background: 'linear-gradient(135deg, #F59E0B, #D97706)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                        📋 Registrar Primeira Ocorrência
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {filtered.map((m, i) => {
                        const st = STATUS_MAP[m.status] || STATUS_MAP.agendada;
                        const pr = m.prioridade ? PRIORITY_MAP[m.prioridade] : null;
                        const tp = TYPE_MAP[m.tipo] || { label: m.tipo || 'Manutenção', icon: '🔧', color: '#6B7280' };
                        const descResumo = m.descricao
                            ? (m.descricao.length > 90 ? m.descricao.slice(0, 90) + '…' : m.descricao)
                            : 'Sem descrição registrada';
                        return (
                            <div key={m.id} onClick={() => setSelected(m)} className="animate-scale-in"
                                style={{ animationDelay: `${i * 30}ms`, background: '#FFFFFF', borderRadius: 14, border: '1.5px solid #E5E7EB', padding: '1rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.18s', display: 'flex', alignItems: 'center', gap: '1rem' }}
                                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 6px 20px rgba(245,158,11,0.15)'; el.style.borderColor = '#FCD34D'; el.style.transform = 'translateY(-1px)'; }}
                                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; el.style.borderColor = '#E5E7EB'; el.style.transform = ''; }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${tp.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0, border: `1px solid ${tp.color}25` }}>{tp.icon}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#111827' }}>{m.titulo || tp.label}</span>
                                        {m.truck && <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>· 🚛 {m.truck.licensePlate}</span>}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#6B7280', lineHeight: 1.4, marginBottom: '0.3rem' }}>{descResumo}</div>
                                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.68rem', color: '#9CA3AF' }}>
                                        {m.dataAgendada && <span>📅 {fmtDate(m.dataAgendada)}</span>}
                                        {m.custoReal != null && Number(m.custoReal) > 0 && <span>💰 {fmtCost(m.custoReal)}</span>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 }}>
                                    <span style={{ padding: '0.2rem 0.65rem', borderRadius: 100, background: st.bg, color: st.color, fontSize: '0.62rem', fontWeight: 800, whiteSpace: 'nowrap' }}>{st.label.toUpperCase()}</span>
                                    {pr && <span style={{ padding: '0.18rem 0.55rem', borderRadius: 100, background: `${pr.color}18`, color: pr.color, fontSize: '0.6rem', fontWeight: 700 }}>{pr.label}</span>}
                                    <span style={{ fontSize: '0.85rem', color: '#D1D5DB' }}>›</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {mounted && showModal && createPortal(
                <ModalNovaManutencao onClose={() => setShowModal(false)} onSaved={load} />,
                document.body
            )}
            {mounted && selected && createPortal(
                <ModalDetalhes m={selected} onClose={() => setSelected(null)} />,
                document.body
            )}
        </div>
    );
}
