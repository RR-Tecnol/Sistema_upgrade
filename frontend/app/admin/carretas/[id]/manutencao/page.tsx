'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
@keyframes mn-fade{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
@keyframes mn-scan{0%,100%{top:0;opacity:.7}50%{top:100%;opacity:.1}}
@keyframes mn-grid{0%,100%{opacity:.06}50%{opacity:.15}}
@keyframes mn-ring{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes mn-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.6)}}
@keyframes mn-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes mn-glow{0%,100%{box-shadow:var(--glow-a)}50%{box-shadow:var(--glow-b)}}
@keyframes mn-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes mn-3d-in{from{opacity:0;transform:perspective(400px) rotateY(-25deg) scale(.85)}to{opacity:1;transform:perspective(400px) rotateY(0deg) scale(1)}}
@keyframes mn-count{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}
`;

/* ── helpers ── */
const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

interface Maintenance { id: string; truckId: string; tipo: string; titulo: string; descricao?: string; status: string; prioridade: string; kmAtual?: number; kmProximo?: number; dataAgendada?: string; dataConclusao?: string; custoEstimado?: number; custoReal?: number; statusPagamento?: string; fornecedor?: string; responsavel?: string; observacoes?: string; contaPagarId?: string; }
interface Stats { truck: { id: string; identifier: string; licensePlate: string; status: string; modelYear?: string; capacity: number; lastMaintenanceDate?: string }; totalGasto: number; emAndamento: number; concluidas: number; agendadas: number; custosPorMes: { mes: string; custo: number }[]; }

const TIPO: { [k: string]: { label: string; icon: string; color: string; grad: string } } = {
    preventiva: { label: 'Preventiva', icon: '🛡️', color: '#10B981', grad: 'linear-gradient(135deg,#10B981,#059669)' },
    corretiva: { label: 'Corretiva', icon: '🔧', color: '#EF4444', grad: 'linear-gradient(135deg,#EF4444,#DC2626)' },
    revisao: { label: 'Revisão', icon: '🔍', color: '#3B82F6', grad: 'linear-gradient(135deg,#3B82F6,#2563EB)' },
    pneu: { label: 'Pneus', icon: '⚙️', color: '#6366F1', grad: 'linear-gradient(135deg,#6366F1,#4F46E5)' },
    eletrica: { label: 'Elétrica', icon: '⚡', color: '#F59E0B', grad: 'linear-gradient(135deg,#F59E0B,#D97706)' },
    outro: { label: 'Personalizada', icon: '✏️', color: '#EC4899', grad: 'linear-gradient(135deg,#EC4899,#DB2777)' },
};
const STATUS_MAP: { [k: string]: { label: string; color: string; bg: string } } = {
    agendada: { label: 'Agendada', color: '#3B82F6', bg: '#EFF6FF' },
    em_andamento: { label: 'Em Andamento', color: '#F59E0B', bg: '#FFFBEB' },
    concluida: { label: 'Concluída', color: '#10B981', bg: '#ECFDF5' },
    cancelada: { label: 'Cancelada', color: '#9CA3AF', bg: '#F9FAFB' },
};
const PRIO_MAP: { [k: string]: { label: string; color: string } } = {
    baixa: { label: 'Baixa', color: '#10B981' }, media: { label: 'Média', color: '#3B82F6' },
    alta: { label: 'Alta', color: '#F59E0B' }, critica: { label: 'Crítica', color: '#EF4444' },
};
const TRUCK_STATUS: { [k: string]: { label: string; color: string } } = {
    AVAILABLE: { label: 'Disponível', color: '#10B981' }, IN_USE: { label: 'Em Ação', color: '#FFD600' },
    MAINTENANCE: { label: 'Em Manutenção', color: '#EF4444' }, INACTIVE: { label: 'Inativo', color: '#9CA3AF' },
};

/* ── CountUp ── */
function useCountUp(target: number, dur = 900) {
    const [c, setC] = useState(0); const r = useRef(0);
    useEffect(() => {
        if (!target) { setC(0); return; }
        const s = Date.now();
        const t = () => { const p = Math.min((Date.now() - s) / dur, 1); setC((1 - Math.pow(1 - p, 3)) * target); if (p < 1) r.current = requestAnimationFrame(t); };
        r.current = requestAnimationFrame(t); return () => cancelAnimationFrame(r.current);
    }, [target, dur]); return c;
}

/* ── KPI Card ── */
function KpiCard({ icon, label, value, color, isCurrency = false, delay = 0 }: { icon: string; label: string; value: number; color: string; isCurrency?: boolean; delay?: number }) {
    const n = useCountUp(value); const [hov, setHov] = useState(false);
    return (
        <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
            position: 'relative', overflow: 'hidden', borderRadius: 20, padding: '20px 22px',
            background: '#fff', border: `1px solid ${hov ? color + '60' : color + '20'}`, borderTop: `3px solid ${color}`,
            boxShadow: hov ? `0 0 30px ${color}25,0 10px 24px rgba(0,0,0,.09)` : '0 2px 8px rgba(0,0,0,.05)',
            transform: hov ? `perspective(600px) rotateX(-3deg) translateY(-5px) scale(1.02)` : 'none',
            transition: 'all .35s cubic-bezier(.175,.885,.32,1.275)',
            animation: `mn-fade .5s ${delay}ms both`,
        }}>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(${color}05 1px,transparent 1px),linear-gradient(90deg,${color}05 1px,transparent 1px)`, backgroundSize: '22px 22px', animation: 'mn-grid 4s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, height: 1.5, background: `linear-gradient(90deg,transparent,${color}60,transparent)`, animation: 'mn-scan 3.5s ease-in-out infinite' }} />
            {/* 3D icon */}
            <div style={{
                width: 44, height: 44, borderRadius: 14, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
                background: hov ? `linear-gradient(135deg,${color},${color}cc)` : `linear-gradient(135deg,${color}22,${color}08)`,
                border: `1.5px solid ${color}35`,
                boxShadow: hov ? `0 6px 18px ${color}50,inset 0 1px 0 rgba(255,255,255,.3)` : `0 3px 8px ${color}20`,
                transform: hov ? 'perspective(200px) rotateX(-8deg) rotateY(5deg) scale(1.1)' : 'perspective(200px) rotateX(-4deg) rotateY(2deg)',
                transition: 'all .35s easeout', animation: 'mn-float 3s ease-in-out infinite',
            }}>{icon}</div>
            <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: isCurrency ? '1rem' : '1.8rem', color, lineHeight: 1, marginBottom: 4, filter: hov ? `drop-shadow(0 0 8px ${color}90)` : 'none', transition: 'filter .3s' }}>
                {isCurrency ? fmtBRL(n) : Math.round(n)}
            </div>
            <div style={{ fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: '#9CA3AF' }}>{label}</div>
        </div>
    );
}

/* ── Maintenance Card ── */
function MCard({ m, onEdit, onDelete }: { m: Maintenance; onEdit: (m: Maintenance) => void; onDelete: (id: string) => void }) {
    const [hov, setHov] = useState(false);
    const t = TIPO[m.tipo] || TIPO.outro; const s = STATUS_MAP[m.status] || STATUS_MAP.agendada; const p = PRIO_MAP[m.prioridade] || PRIO_MAP.media;
    return (
        <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
            position: 'relative', overflow: 'hidden', borderRadius: 18,
            background: '#fff', border: `1px solid ${hov ? t.color + '50' : t.color + '20'}`, borderLeft: `5px solid ${t.color}`,
            boxShadow: hov ? `0 0 24px ${t.color}15,0 8px 24px rgba(0,0,0,.08)` : '0 2px 6px rgba(0,0,0,.04)',
            transform: hov ? 'perspective(800px) rotateX(-1.5deg) rotateY(2deg) translateY(-4px)' : 'none',
            transition: 'all .3s cubic-bezier(.175,.885,.32,1.275)',
            animation: 'mn-fade .4s both',
        }}>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(${t.color}04 1px,transparent 1px),linear-gradient(90deg,${t.color}04 1px,transparent 1px)`, backgroundSize: '26px 26px', animation: 'mn-grid 5s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, height: 1.5, background: `linear-gradient(90deg,transparent,${t.color}35,transparent)`, animation: 'mn-scan 4.5s ease-in-out infinite' }} />
            <div style={{ position: 'relative', zIndex: 1, padding: '16px 18px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                            background: hov ? t.grad : `linear-gradient(135deg,${t.color}22,${t.color}08)`,
                            border: `1.5px solid ${t.color}35`,
                            boxShadow: hov ? `0 6px 16px ${t.color}45,inset 0 1px 0 rgba(255,255,255,.3)` : `0 2px 6px ${t.color}20`,
                            transform: hov ? 'perspective(200px) rotateX(-6deg) rotateY(4deg)' : 'perspective(200px) rotateX(-2deg)',
                            transition: 'all .3s ease',
                        }}>{t.icon}</div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                                <span style={{ padding: '2px 10px', borderRadius: 20, background: t.color + '15', border: `1px solid ${t.color}30`, fontSize: '0.65rem', fontWeight: 700, color: t.color }}>{t.label}</span>
                                <span style={{ padding: '2px 9px', borderRadius: 20, background: p.color + '15', color: p.color, border: `1px solid ${p.color}30`, fontSize: '0.62rem', fontWeight: 700 }}>⚑ {p.label}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.color}30`, fontSize: '0.63rem', fontWeight: 700 }}>
                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, animation: 'mn-pulse 2s infinite', display: 'inline-block' }} />
                                    {s.label}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => onEdit(m)} style={{ padding: '6px 10px', borderRadius: 9, border: 'none', cursor: 'pointer', background: '#F0FDF4', color: '#10B981', fontSize: '0.82rem', transition: 'all .2s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#DCFCE7'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#F0FDF4'}>✏️</button>
                        <button onClick={() => onDelete(m.id)} style={{ padding: '6px 10px', borderRadius: 9, border: 'none', cursor: 'pointer', background: '#FEF2F2', color: '#EF4444', fontSize: '0.82rem', transition: 'all .2s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEE2E2'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FEF2F2'}>🗑</button>
                    </div>
                </div>
                {/* Título */}
                <h3 style={{ fontFamily: 'Orbitron', fontWeight: 700, fontSize: '0.85rem', color: '#111827', margin: '0 0 8px', letterSpacing: '.02em', filter: hov ? `drop-shadow(0 0 4px ${t.color}50)` : 'none', transition: 'filter .3s' }}>{m.titulo}</h3>
                {/* Meta info */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: '0.72rem', color: '#6B7280', marginBottom: 8 }}>
                    {m.fornecedor && <span>🏭 {m.fornecedor}</span>}
                    {m.responsavel && <span>👤 {m.responsavel}</span>}
                    {m.dataAgendada && <span>📅 {fmtDate(m.dataAgendada)}</span>}
                    {m.dataConclusao && <span>✅ Concluído {fmtDate(m.dataConclusao)}</span>}
                    {m.kmAtual && <span>📍 {m.kmAtual.toLocaleString()} km</span>}
                </div>
                {m.descricao && <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: '0 0 10px', lineHeight: 1.45 }}>{m.descricao}</p>}
                {/* Custos */}
                {(m.custoEstimado || m.custoReal) && (
                    <div style={{ display: 'flex', gap: 14, paddingTop: 10, borderTop: `1px solid ${t.color}12` }}>
                        {m.custoEstimado != null && <span style={{ fontSize: '0.71rem', color: '#9CA3AF' }}>Estimado: <strong style={{ color: t.color, fontFamily: 'Orbitron', fontSize: '0.73rem' }}>{fmtBRL(m.custoEstimado)}</strong></span>}
                        {m.custoReal != null && <span style={{ fontSize: '0.71rem', color: '#9CA3AF' }}>Real: <strong style={{ color: '#10B981', fontFamily: 'Orbitron', fontSize: '0.73rem' }}>{fmtBRL(m.custoReal)}</strong></span>}
                        {m.contaPagarId && <span style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: 8, background: '#ECFDF5', color: '#10B981', fontSize: '0.63rem', fontWeight: 700, border: '1px solid #BBF7D0' }}>📑 Conta Criada</span>}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── BarChart ── */
function BarChart({ data }: { data: { mes: string; custo: number }[] }) {
    const max = Math.max(...data.map(d => d.custo), 1);
    return (
        <div>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: '#9CA3AF', marginBottom: 16 }}>CUSTOS POR MÊS</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90 }}>
                {data.map((d, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ fontSize: '0.55rem', color: '#9CA3AF', fontFamily: 'Orbitron' }}>{d.custo > 0 ? `${(d.custo / 1000).toFixed(1)}k` : ''}</div>
                        <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', height: 60 }}>
                            <div style={{
                                width: '100%', borderRadius: '4px 4px 0 0',
                                background: d.custo > 0 ? 'linear-gradient(180deg,#60A5FA,#2563EB)' : '#F3F4F6',
                                height: `${(d.custo / max) * 100}%`, minHeight: d.custo > 0 ? 4 : 0,
                                boxShadow: d.custo > 0 ? '0 0 10px rgba(59,130,246,.5)' : 'none',
                                transition: 'height 1.2s ease',
                            }} />
                        </div>
                        <div style={{ fontSize: '0.55rem', color: '#9CA3AF', textAlign: 'center' }}>{d.mes}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Modal ── */
function Modal({ truckId, editing, onClose, onSaved }: { truckId: string; editing: Maintenance | null; onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState({
        tipo: editing?.tipo ?? 'preventiva', titulo: editing?.titulo ?? '', descricao: editing?.descricao ?? '',
        status: editing?.status ?? 'agendada', prioridade: editing?.prioridade ?? 'media',
        kmAtual: editing?.kmAtual?.toString() ?? '', kmProximo: editing?.kmProximo?.toString() ?? '',
        dataAgendada: editing?.dataAgendada?.split('T')[0] ?? '', dataConclusao: editing?.dataConclusao?.split('T')[0] ?? '',
        custoEstimado: editing?.custoEstimado?.toString() ?? '', custoReal: editing?.custoReal?.toString() ?? '',
        fornecedor: editing?.fornecedor ?? '', responsavel: editing?.responsavel ?? '', observacoes: editing?.observacoes ?? '',
        statusPagamento: editing?.statusPagamento ?? 'pendente',
    });
    const [saving, setSaving] = useState(false); const [err, setErr] = useState('');
    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const save = async () => {
        if (!form.titulo.trim()) { setErr('Título obrigatório'); return; }
        setSaving(true);
        try {
            const body: any = {
                truckId, tipo: form.tipo, titulo: form.titulo, descricao: form.descricao || undefined, status: form.status, prioridade: form.prioridade,
                kmAtual: form.kmAtual ? Number(form.kmAtual) : undefined, kmProximo: form.kmProximo ? Number(form.kmProximo) : undefined,
                dataAgendada: form.dataAgendada || undefined, dataConclusao: form.dataConclusao || undefined,
                custoEstimado: form.custoEstimado ? Number(form.custoEstimado) : undefined, custoReal: form.custoReal ? Number(form.custoReal) : undefined,
                fornecedor: form.fornecedor || undefined, responsavel: form.responsavel || undefined, observacoes: form.observacoes || undefined, statusPagamento: form.statusPagamento,
            };
            editing ? await api.patch(`/truck-maintenance/${editing.id}`, body) : await api.post('/truck-maintenance', body);
            onSaved();
        } catch (e: any) { setErr(e?.response?.data?.message || 'Erro ao salvar'); } finally { setSaving(false); }
    };

    const inp = { width: '100%', boxSizing: 'border-box' as const, padding: '8px 12px', borderRadius: 9, border: '1.5px solid #E5E7EB', fontSize: '0.78rem', color: '#111827', background: '#FAFAFA', outline: 'none', transition: 'border-color .2s' };
    const lbl = { fontSize: '0.65rem', fontWeight: 700, color: '#6B7280', marginBottom: 4, display: 'block', textTransform: 'uppercase' as const, letterSpacing: '.06em' };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(10px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ width: '100%', maxWidth: 600, maxHeight: '88vh', overflowY: 'auto', background: '#fff', borderRadius: 22, boxShadow: '0 0 60px rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.1)', animation: 'mn-3d-in .35s both' }}>
                {/* Header */}
                <div style={{ padding: '16px 22px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg,#1e3a5f,#1e40af)', borderRadius: '22px 22px 0 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(0,0,0,.3)' }}>🔧</div>
                        <span style={{ fontFamily: 'Orbitron', fontWeight: 700, fontSize: '0.92rem', color: '#fff', letterSpacing: '.04em' }}>{editing ? 'Editar Manutenção' : 'Nova Manutenção'}</span>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,.15)', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#fff', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
                <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {err && <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', color: '#DC2626', fontSize: '0.78rem', border: '1px solid #FECACA' }}>{err}</div>}

                    {/* Tipo — cards visuais grandes 3D */}
                    <div>
                        <label style={lbl}>Tipo de Manutenção</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                            {Object.entries(TIPO).map(([k, v]) => {
                                const active = form.tipo === k;
                                return (
                                    <button key={k} onClick={() => set('tipo', k)} style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        gap: 4, padding: '8px 6px', borderRadius: 10, cursor: 'pointer',
                                        height: 72,
                                        border: `2px solid ${active ? v.color : v.color + '28'}`,
                                        background: active ? v.grad : `linear-gradient(145deg,#fff,${v.color}06)`,
                                        boxShadow: active
                                            ? `0 5px 14px ${v.color}35, inset 0 1px 0 rgba(255,255,255,.35)`
                                            : `0 1px 4px rgba(0,0,0,.06), inset 0 1px 0 rgba(255,255,255,.8)`,
                                        transform: active ? 'translateY(-2px) scale(1.02)' : 'none',
                                        transition: 'all .2s cubic-bezier(.175,.885,.32,1.275)',
                                        outline: 'none',
                                    }}>
                                        <div style={{
                                            width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1.1rem',
                                            background: active ? 'rgba(255,255,255,.22)' : `linear-gradient(135deg,${v.color}20,${v.color}06)`,
                                            boxShadow: active ? `0 3px 10px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.3)` : `0 2px 6px ${v.color}20`,
                                            border: `1px solid ${active ? 'rgba(255,255,255,.25)' : v.color + '28'}`,
                                            transition: 'all .2s ease',
                                        }}>{v.icon}</div>
                                        <span style={{
                                            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '.02em',
                                            color: active ? '#fff' : v.color,
                                        }}>{v.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Título */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <label style={lbl}>Título *</label>
                        <input value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ex: Troca de óleo motor" style={inp}
                            onFocus={e => (e.target as HTMLElement).style.borderColor = '#3B82F6'} onBlur={e => (e.target as HTMLElement).style.borderColor = '#E5E7EB'} />
                    </div>

                    {/* Descrição */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <label style={lbl}>Descrição</label>
                        <textarea value={form.descricao} onChange={e => set('descricao', e.target.value)} rows={2} placeholder="Detalhes..." style={{ ...inp, resize: 'vertical' as const }} />
                    </div>

                    {/* Status + Prioridade */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[{ k: 'status', l: 'Status', opts: [['agendada', '📅 Agendada'], ['em_andamento', '🔄 Em Andamento'], ['concluida', '✅ Concluída (gera Conta)'], ['cancelada', '❌ Cancelada']] },
                        { k: 'prioridade', l: 'Prioridade', opts: [['baixa', '🟢 Baixa'], ['media', '🔵 Média'], ['alta', '🟡 Alta'], ['critica', '🔴 Crítica']] }
                        ].map(({ k, l, opts }) => (
                            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                <label style={lbl}>{l}</label>
                                <select value={(form as any)[k]} onChange={e => set(k, e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                                    {opts.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>

                    {/* Datas */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[{ k: 'dataAgendada', l: 'Data Agendada' }, { k: 'dataConclusao', l: 'Data de Conclusão' }].map(({ k, l }) => (
                            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                <label style={lbl}>{l}</label>
                                <input type="date" value={(form as any)[k]} onChange={e => set(k, e.target.value)} style={inp} />
                            </div>
                        ))}
                    </div>

                    {/* KMs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[{ k: 'kmAtual', l: 'KM Atual' }, { k: 'kmProximo', l: 'KM Próxima' }].map(({ k, l }) => (
                            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                <label style={lbl}>{l}</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" value={(form as any)[k]} onChange={e => set(k, e.target.value)} style={{ ...inp, paddingRight: 36 }} />
                                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '0.68rem', color: '#9CA3AF' }}>km</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Custo */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[{ k: 'custoEstimado', l: 'Custo Estimado (R$)' }, { k: 'custoReal', l: 'Custo Real (R$)' }].map(({ k, l }) => (
                            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                <label style={lbl}>{l}</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'Orbitron' }}>R$</span>
                                    <input type="number" step="0.01" value={(form as any)[k]} onChange={e => set(k, e.target.value)} style={{ ...inp, paddingLeft: 40 }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Fornecedor + Responsável */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[{ k: 'fornecedor', l: 'Fornecedor / Oficina', ph: 'Nome da oficina' }, { k: 'responsavel', l: 'Responsável', ph: 'Nome do responsável' }].map(({ k, l, ph }) => (
                            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                <label style={lbl}>{l}</label>
                                <input value={(form as any)[k]} onChange={e => set(k, e.target.value)} placeholder={ph} style={inp} />
                            </div>
                        ))}
                    </div>

                    {/* Status Pagamento */}
                    <div>
                        <label style={lbl}>Status do Pagamento</label>
                        <div style={{ display: 'flex', gap: 10 }}>
                            {[{ v: 'pendente', icon: '🔥', label: 'Pendente' }, { v: 'paga', icon: '✅', label: 'Pago' }].map(opt => (
                                <button key={opt.v} onClick={() => set('statusPagamento', opt.v)} style={{
                                    flex: 1, padding: '10px', borderRadius: 12, border: `2px solid ${form.statusPagamento === opt.v ? '#FFD600' : '#E5E7EB'}`, cursor: 'pointer',
                                    background: form.statusPagamento === opt.v ? '#FFFDE7' : '#F9FAFB',
                                    fontWeight: 700, fontSize: '0.78rem', transition: 'all .2s',
                                    boxShadow: form.statusPagamento === opt.v ? '0 0 12px rgba(255,214,0,.35)' : 'none',
                                }}>{opt.icon} {opt.label}</button>
                            ))}
                        </div>
                    </div>

                    {/* Observações */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <label style={lbl}>Observações</label>
                        <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' as const }} />
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '12px 22px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: 10, justifyContent: 'flex-end', background: '#FAFAFA', borderRadius: '0 0 22px 22px' }}>
                    <button onClick={onClose} style={{ padding: '10px 22px', borderRadius: 12, border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>Cancelar</button>
                    <button onClick={save} disabled={saving} style={{
                        padding: '10px 28px', borderRadius: 12, border: 'none', cursor: 'pointer',
                        background: saving ? '#E5E7EB' : 'linear-gradient(135deg,#1e40af,#2563EB)',
                        color: '#fff', fontWeight: 800, fontSize: '0.8rem', fontFamily: 'Orbitron', letterSpacing: '.04em',
                        boxShadow: saving ? 'none' : '0 0 18px rgba(37,99,235,.5)', transition: 'all .25s',
                    }}>{saving ? '...' : `${editing ? 'Atualizar' : 'Registrar'} →`}</button>
                </div>
            </div>
        </div>
    );
}

/* ── Página Principal ── */
export default function ManutencaoPage() {
    const params = useParams(); const router = useRouter();
    const truckId = params.id as string;
    const [stats, setStats] = useState<Stats | null>(null);
    const [list, setList] = useState<Maintenance[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false); const [editing, setEditing] = useState<Maintenance | null>(null);
    const [search, setSearch] = useState(''); const [fStatus, setFStatus] = useState('todos'); const [fTipo, setFTipo] = useState('todos');

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [s, l] = await Promise.all([api.get(`/truck-maintenance/truck/${truckId}/stats`), api.get(`/truck-maintenance/truck/${truckId}`)]);
            setStats(s.data); setList(l.data);
        } catch { /* silencioso — estado vazio exibido ao usuário */ } finally { setLoading(false); }
    }, [truckId]);

    useEffect(() => { load(); }, [load]);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const del = async (id: string) => {
        try { await api.delete(`/truck-maintenance/${id}`); toast.success('Manutenção excluída!'); load(); }
        catch { toast.error('Erro ao excluir manutenção'); }
        finally { setConfirmDeleteId(null); }
    };
    const saved = () => { setModal(false); setEditing(null); load(); };

    const filtered = list.filter(m =>
        (fStatus === 'todos' || m.status === fStatus) &&
        (fTipo === 'todos' || m.tipo === fTipo) &&
        (!search || m.titulo.toLowerCase().includes(search.toLowerCase()) || (m.fornecedor ?? '').toLowerCase().includes(search.toLowerCase()))
    );

    const truck = stats?.truck; const tsc = TRUCK_STATUS[truck?.status ?? 'AVAILABLE'];

    if (loading && !stats) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid #3B82F6', borderTopColor: 'transparent', animation: 'mn-ring .8s linear infinite' }} />
            <p style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '.18em', color: '#9CA3AF' }}>CARREGANDO...</p>
        </div>
    );

    return (<>
        <style>{CSS}</style>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#9CA3AF', animation: 'mn-fade .3s both' }}>
                <button onClick={() => router.push('/admin/carretas')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B82F6', fontWeight: 700, fontFamily: 'Orbitron', fontSize: '0.7rem' }}>← Carretas</button>
                <span>/</span><span style={{ color: '#6B7280' }}>Controle de Manutenção</span>
            </div>

            {/* Hero */}
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, padding: '26px 32px', background: 'linear-gradient(135deg,#1e3a5f 0%,#1e40af 60%,#1d4ed8 100%)', boxShadow: '0 8px 32px rgba(30,64,175,.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, animation: 'mn-fade .4s both' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)', backgroundSize: '28px 28px', animation: 'mn-grid 6s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent)', animation: 'mn-scan 4s ease-in-out infinite' }} />
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', boxShadow: '0 8px 24px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.3)', transform: 'perspective(200px) rotateX(-5deg) rotateY(3deg)', animation: 'mn-float 3s ease-in-out infinite' }}>🚛</div>
                    <div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'rgba(255,255,255,.6)', marginBottom: 4 }}>Controle de Manutenção</div>
                        <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.5rem', color: '#fff', letterSpacing: '.05em', textShadow: '0 0 20px rgba(255,255,255,.3)' }}>
                            {truck?.identifier ?? '...'} — {truck?.licensePlate ?? ''}
                        </div>
                    </div>
                </div>
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ padding: '6px 16px', borderRadius: 20, background: 'rgba(255,255,255,.15)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, border: '1px solid rgba(255,255,255,.2)', backdropFilter: 'blur(4px)' }}>
                        <span style={{ marginRight: 6, width: 7, height: 7, borderRadius: '50%', background: tsc?.color, display: 'inline-block', animation: 'mn-pulse 2s infinite', verticalAlign: 'middle' }} />
                        {tsc?.label}
                    </span>
                    <button onClick={() => { setEditing(null); setModal(true); }} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: 14, border: 'none', cursor: 'pointer',
                        background: '#fff', color: '#1e40af', fontWeight: 800, fontSize: '0.8rem', fontFamily: 'Orbitron', letterSpacing: '.04em',
                        boxShadow: '0 4px 16px rgba(0,0,0,.25)', transition: 'all .25s',
                    }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                    >+ Nova Manutenção</button>
                </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem' }}>
                <KpiCard icon="💰" label="Total Gasto" value={stats?.totalGasto ?? 0} color="#EF4444" isCurrency delay={0} />
                <KpiCard icon="🔧" label="Em Andamento" value={stats?.emAndamento ?? 0} color="#F59E0B" delay={70} />
                <KpiCard icon="✅" label="Concluídas" value={stats?.concluidas ?? 0} color="#10B981" delay={140} />
                <KpiCard icon="📅" label="Agendadas" value={stats?.agendadas ?? 0} color="#3B82F6" delay={210} />
            </div>

            {/* 2 Colunas: Lista + Sidebar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.25rem', alignItems: 'start' }}>

                {/* Coluna esquerda: busca + filtros + lista */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Barra de filtros */}
                    <div style={{ background: '#fff', borderRadius: 16, padding: '12px 16px', border: '1px solid #F3F4F6', boxShadow: '0 2px 6px rgba(0,0,0,.04)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, position: 'relative', minWidth: 180 }}>
                            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', color: '#9CA3AF' }}>🔍</span>
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar manutenção..." style={{ width: '100%', boxSizing: 'border-box' as const, padding: '8px 12px 8px 34px', borderRadius: 9, border: '1.5px solid #E5E7EB', fontSize: '0.78rem', color: '#111827', background: '#FAFAFA', outline: 'none' }} />
                        </div>
                        {[{ k: 'fStatus', v: fStatus, s: setFStatus, opts: [['todos', 'Status'], ['agendada', 'Agendada'], ['em_andamento', 'Em Andamento'], ['concluida', 'Concluída'], ['cancelada', 'Cancelada']] },
                        { k: 'fTipo', v: fTipo, s: setFTipo, opts: [['todos', 'Tipo'], ...Object.entries(TIPO).map(([k, v]) => [k, v.label])] }
                        ].map(({ k, v, s, opts }) => (
                            <select key={k} value={v} onChange={e => s(e.target.value)} style={{ padding: '8px 12px', borderRadius: 9, border: '1.5px solid #E5E7EB', fontSize: '0.78rem', color: '#374151', background: '#FAFAFA', cursor: 'pointer', outline: 'none' }}>
                                {opts.map(([ov, ol]) => <option key={ov} value={ov}>{ol}</option>)}
                            </select>
                        ))}
                        <span style={{ fontSize: '0.7rem', color: '#9CA3AF', whiteSpace: 'nowrap' }}>{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Lista */}
                    {filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: 18, border: '1px solid #F3F4F6' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: 12, animation: 'mn-float 3s ease-in-out infinite' }}>🔧</div>
                            <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '.15em', color: '#9CA3AF', marginBottom: 16 }}>NENHUM REGISTRO</p>
                            <button onClick={() => { setEditing(null); setModal(true); }} style={{ padding: '10px 22px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#1e40af,#2563EB)', color: '#fff', fontWeight: 800, fontSize: '0.75rem', fontFamily: 'Orbitron', boxShadow: '0 0 14px rgba(37,99,235,.4)' }}>+ Nova Manutenção</button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            {filtered.map(m => <MCard key={m.id} m={m} onEdit={m => { setEditing(m); setModal(true); }} onDelete={del} />)}
                        </div>
                    )}
                </div>

                {/* Sidebar direita: info carreta + gráfico */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: 80 }}>
                    {/* Card da carreta */}
                    <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', border: '1px solid #F3F4F6', boxShadow: '0 4px 16px rgba(0,0,0,.06)', animation: 'mn-fade .5s 300ms both' }}>
                        <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#1e40af)', padding: '20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)', backgroundSize: '20px 20px' }} />
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <div style={{ width: 64, height: 64, borderRadius: 20, margin: '0 auto 12px', background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', boxShadow: '0 8px 24px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.25)', transform: 'perspective(200px) rotateX(-5deg)', animation: 'mn-float 3s ease-in-out infinite' }}>🚛</div>
                                <div style={{ fontFamily: 'Orbitron', color: '#fff', fontWeight: 900, fontSize: '1rem', letterSpacing: '.04em' }}>{truck?.identifier}</div>
                                <div style={{ color: 'rgba(255,255,255,.7)', fontSize: '0.72rem', marginTop: 4 }}>{truck?.licensePlate}</div>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,.15)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, border: '1px solid rgba(255,255,255,.2)' }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: tsc?.color, display: 'inline-block', animation: 'mn-pulse 2s infinite' }} />
                                    {tsc?.label}
                                </span>
                            </div>
                        </div>
                        <div style={{ padding: '16px' }}>
                            {[{ l: 'Capacidade', v: `${truck?.capacity} vagas` }, { l: 'Ano', v: truck?.modelYear ?? '—' }, { l: 'Última Manutenção', v: fmtDate(truck?.lastMaintenanceDate) }].map(({ l, v }) => (
                                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F3F4F6', fontSize: '0.72rem' }}>
                                    <span style={{ color: '#9CA3AF' }}>{l}</span>
                                    <span style={{ fontWeight: 700, color: '#111827', fontFamily: l === 'Capacidade' || l === 'Ano' ? 'Orbitron' : 'inherit' }}>{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Gráfico */}
                    {stats?.custosPorMes && (
                        <div style={{ background: '#fff', borderRadius: 20, padding: '18px 16px', border: '1px solid #F3F4F6', boxShadow: '0 4px 16px rgba(0,0,0,.06)', animation: 'mn-fade .5s 400ms both' }}>
                            <BarChart data={stats.custosPorMes} />
                        </div>
                    )}
                </div>
            </div>
        </div>

        {modal && <Modal truckId={truckId} editing={editing} onClose={() => { setModal(false); setEditing(null); }} onSaved={saved} />}
    </>);
}
