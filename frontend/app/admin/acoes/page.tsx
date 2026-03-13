'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { acoesApi, Acao, AcaoStatus, AcaoEstatisticas } from '@/lib/api/acoes';
import api from '@/lib/api/acoes'; // axios com interceptor de auth

// ── Utilitários ───────────────────────────────────────────────────

const statusConfig: Record<AcaoStatus, { label: string; color: string; bg: string; border: string }> = {
    PLANEJADA: { label: 'Planejada', color: '#92400E', bg: '#FFF9C4', border: '#FFE97A' },
    EM_ANDAMENTO: { label: 'Em Andamento', color: '#065F46', bg: '#DCFCE7', border: '#BBF7D0' },
    CONCLUIDA: { label: 'Concluída', color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE' },
    CANCELADA: { label: 'Cancelada', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
};

const statusDot: Record<AcaoStatus, string> = {
    PLANEJADA: '#D97706',
    EM_ANDAMENTO: '#059669',
    CONCLUIDA: '#1D4ED8',
    CANCELADA: '#DC2626',
};

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ── CidadeAutocomplete ────────────────────────────────────────────

function CidadeAutocomplete({
    value, cidadeId, onChange
}: {
    value: string;
    cidadeId: string;
    onChange: (nome: string, id: string) => void;
}) {
    const [sugestoes, setSugestoes] = useState<{ id: string; name: string; state: string }[]>([]);
    const [open, setOpen] = useState(false);
    const debounce = useRef<NodeJS.Timeout>();
    const wrapRef = useRef<HTMLDivElement>(null);

    const buscar = useCallback((q: string) => {
        clearTimeout(debounce.current);
        if (q.length < 2) { setSugestoes([]); return; }
        debounce.current = setTimeout(async () => {
            try {
                const res = await acoesApi.searchCidades(q);
                setSugestoes(res);
                setOpen(true);
            } catch { setSugestoes([]); }
        }, 280);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value, ''); // digitou livremente: limpa cidadeId
        buscar(e.target.value);
    };

    const selecionar = (c: { id: string; name: string; state: string }) => {
        onChange(`${c.name}, ${c.state}`, c.id); // preencheu FK
        setSugestoes([]);
        setOpen(false);
    };

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const INPUT_STYLE: React.CSSProperties = {
        width: '100%', padding: '0.65rem 0.9rem', borderRadius: 9,
        border: `1.5px solid ${cidadeId ? '#FFD600' : '#E5E7EB'}`, background: '#F9FAFB',
        fontSize: '0.85rem', color: '#111827', outline: 'none',
    };

    return (
        <div ref={wrapRef} style={{ position: 'relative' }}>
            <input
                style={INPUT_STYLE}
                placeholder="Ex: Imperatriz, MA"
                value={value}
                onChange={handleChange}
                onFocus={() => sugestoes.length > 0 && setOpen(true)}
                autoComplete="off"
            />
            {cidadeId && (
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.68rem', background: '#FFFDE7', color: '#B89B00', padding: '2px 7px', borderRadius: 6, border: '1px solid #FEF08A', fontWeight: 700 }}>✓ Vinculada</span>
            )}
            {open && sugestoes.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4, overflow: 'hidden' }}>
                    {sugestoes.map(c => (
                        <div key={c.id} onClick={() => selecionar(c)}
                            style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #F3F4F6' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#FFFDE7')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                            <span style={{ fontSize: '0.75rem' }}>📍</span>
                            <span style={{ fontWeight: 600 }}>{c.name}</span>
                            <span style={{ color: '#9CA3AF', fontSize: '0.78rem' }}>{c.state}</span>
                            <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: '#B89B00', background: '#FFFDE7', padding: '1px 6px', borderRadius: 4, border: '1px solid #FEF08A' }}>vincular</span>
                        </div>
                    ))}
                    <div style={{ padding: '8px 14px', fontSize: '0.75rem', color: '#9CA3AF', background: '#FAFBFC' }}>Ou continue digitando para usar este nome livremente</div>
                </div>
            )}
        </div>
    );
}

function ModalNovaAcao({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [form, setForm] = useState({
        nome: '', cidadeNome: '', cidadeId: '', grupoId: '', carretaId: '',
        dataInicio: '', dataFim: '', localExecucao: '',
        distanciaKm: '', precoCombustivelL: '', autonomiaKmL: '4',
        status: 'PLANEJADA' as AcaoStatus, permitirInscricoes: true,
    });
    const [grupos, setGrupos] = useState<any[]>([]);
    const [carretas, setCarretas] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        Promise.all([
            api.get('/groups').then(r => r.data),
            api.get('/trucks').then(r => r.data),
        ]).then(([g, t]) => {
            setGrupos(Array.isArray(g) ? g : g.data || []);
            setCarretas(Array.isArray(t) ? t : t.data || []);
        }).catch(() => { });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.cidadeNome.trim()) { setError('Informe o nome da cidade'); return; }
        setLoading(true);
        setError('');
        try {
            await acoesApi.criar({
                ...form,
                distanciaKm: form.distanciaKm ? Number(form.distanciaKm) : undefined,
                precoCombustivelL: form.precoCombustivelL ? Number(form.precoCombustivelL) : undefined,
                autonomiaKmL: form.autonomiaKmL ? Number(form.autonomiaKmL) : undefined,
                carretaId: form.carretaId || undefined,
                cidadeId: form.cidadeId || undefined,
            } as any);
            onCreated();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Erro ao criar ação');
        } finally {
            setLoading(false);
        }
    };

    const INPUT: React.CSSProperties = {
        width: '100%', padding: '0.65rem 0.9rem', borderRadius: 9,
        border: '1.5px solid #E5E7EB', background: '#F9FAFB',
        fontSize: '0.85rem', color: '#111827', outline: 'none',
    };
    const LABEL: React.CSSProperties = {
        display: 'block', fontSize: '0.68rem', fontWeight: 700,
        textTransform: 'uppercase' as const, letterSpacing: '0.08em',
        color: '#6B7280', marginBottom: '0.35rem',
    };

    const overlay = (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'slideUp 0.25s' }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ padding: '20px 28px 14px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFDE7' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FFD600', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>⚡</div>
                        <div>
                            <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.95rem', fontWeight: 900, color: '#111827', margin: 0, letterSpacing: '0.06em' }}>NOVO PERÍODO DE CURSO</h2>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9CA3AF' }}>Preencha os dados do período de curso</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: '1.2rem', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}>✕</button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '10px 14px', borderRadius: 9, fontSize: '0.85rem' }}>{error}</div>}

                    {/* Básico */}
                    <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B89B00', marginBottom: 12 }}>📋 Informações Básicas</div>
                        <div style={{ display: 'grid', gap: 12 }}>
                            <div>
                                <label style={LABEL}>Nome do Período de Curso *</label>
                                <input style={INPUT} placeholder="Ex: Qualifica Imperatriz – Junho 2025" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={LABEL}>Status</label>
                                    <select style={{ ...INPUT, cursor: 'pointer' }} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as AcaoStatus }))}>
                                        <option value="PLANEJADA">Planejada</option>
                                        <option value="EM_ANDAMENTO">Em Andamento</option>
                                        <option value="CONCLUIDA">Concluída</option>
                                        <option value="CANCELADA">Cancelada</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={LABEL}>Local de Execução</label>
                                    <input style={INPUT} placeholder="Ex: Ginásio Municipal" value={form.localExecucao} onChange={e => setForm(f => ({ ...f, localExecucao: e.target.value }))} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                                <input type="checkbox" id="permitir" checked={form.permitirInscricoes} onChange={e => setForm(f => ({ ...f, permitirInscricoes: e.target.checked }))} style={{ accentColor: '#FFD600', width: 15, height: 15 }} />
                                <label htmlFor="permitir" style={{ fontSize: '0.83rem', color: '#374151', fontWeight: 500, cursor: 'pointer' }}>Permitir inscrições online para este período de curso</label>
                            </div>
                        </div>
                    </div>

                    {/* Localização */}
                    <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B89B00', marginBottom: 12 }}>📍 Localização e Período</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={LABEL}>Cidade * <span style={{ fontSize: '0.62rem', color: '#9CA3AF', fontWeight: 400 }}>— digite ou selecione da base</span></label>
                                <CidadeAutocomplete
                                    value={form.cidadeNome}
                                    cidadeId={form.cidadeId}
                                    onChange={(nome, id) => setForm(f => ({ ...f, cidadeNome: nome, cidadeId: id }))}
                                />
                            </div>
                            <div>
                                <label style={LABEL}>Grupo *</label>
                                <select style={{ ...INPUT, cursor: 'pointer' }} value={form.grupoId} onChange={e => setForm(f => ({ ...f, grupoId: e.target.value }))} required>
                                    <option value="">Selecione o grupo</option>
                                    {grupos.map((g: any) => <option key={g.id} value={g.id}>{g.name} — {g.state}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={LABEL}>Carreta (opcional)</label>
                                <select style={{ ...INPUT, cursor: 'pointer' }} value={form.carretaId} onChange={e => setForm(f => ({ ...f, carretaId: e.target.value }))}>
                                    <option value="">Sem carreta vinculada</option>
                                    {carretas.map((c: any) => <option key={c.id} value={c.id}>{c.identifier} — {c.licensePlate}</option>)}
                                </select>
                            </div>
                            <div />
                            <div>
                                <label style={LABEL}>Data de Início *</label>
                                <input type="date" style={INPUT} value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} required />
                            </div>
                            <div>
                                <label style={LABEL}>Data de Fim *</label>
                                <input type="date" style={INPUT} value={form.dataFim} onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))} required />
                            </div>
                        </div>
                    </div>

                    {/* Logística */}
                    <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B89B00', marginBottom: 12 }}>⛽ Logística (opcional)</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={LABEL}>Distância (km)</label>
                                <input type="number" step="0.1" placeholder="350" style={INPUT} value={form.distanciaKm} onChange={e => setForm(f => ({ ...f, distanciaKm: e.target.value }))} />
                            </div>
                            <div>
                                <label style={LABEL}>Combustível (R$/L)</label>
                                <input type="number" step="0.01" placeholder="6.50" style={INPUT} value={form.precoCombustivelL} onChange={e => setForm(f => ({ ...f, precoCombustivelL: e.target.value }))} />
                            </div>
                            <div>
                                <label style={LABEL}>Autonomia (km/L)</label>
                                <input type="number" step="0.1" placeholder="4.0" style={INPUT} value={form.autonomiaKmL} onChange={e => setForm(f => ({ ...f, autonomiaKmL: e.target.value }))} />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid #F3F4F6' }}>
                        <button type="button" onClick={onClose} style={{ padding: '9px 20px', background: 'transparent', border: '1px solid #E5E7EB', color: '#6B7280', borderRadius: 9, cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}>Cancelar</button>
                        <button type="submit" disabled={loading} className="btn-primary" style={{ minWidth: 160 }}>
                            {loading ? 'Criando...' : '⚡ Criar Período de Curso'}
                        </button>
                    </div>
                </form>
            </div>
            <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </div>
    );

    return createPortal(overlay, document.body);
}

// ── CSS futurista completo (Ações KPI) ───────────────────────────────────────
const ACOES_CSS = `
@keyframes ac-fade-up   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
@keyframes ac-scan      { 0%{transform:translateY(-100%);opacity:0} 10%{opacity:.6} 90%{opacity:.6} 100%{transform:translateY(400%);opacity:0} }
@keyframes ac-grid      { 0%,100%{opacity:.18} 50%{opacity:.42} }
@keyframes ac-glow-pulse{ 0%,100%{opacity:.55} 50%{opacity:1} }
@keyframes ac-float-num { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
@keyframes ac-ring      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
.ac-kpi {
  position:relative; overflow:hidden;
  transition:transform .28s ease, box-shadow .28s ease, border-color .28s ease;
}
.ac-kpi:hover {
  transform:perspective(700px) rotateX(-3deg) rotateY(4deg) translateY(-5px);
}
`;

// ── KPI Card — dark futurista total ──────────────────────────────────────────
function KpiCard({ label, value, icon, color, bgColor: _bg, delay }: { label: string; value: number; icon: string; color: string; bgColor: string; delay: number }) {
    const [displayed, setDisplayed] = useState(0);
    const [hovered, setHovered] = useState(false);

    useEffect(() => {
        let start = 0;
        const step = Math.max(1, Math.ceil(value / 20));
        const timer = setTimeout(() => {
            const interval = setInterval(() => {
                start = Math.min(start + step, value);
                setDisplayed(start);
                if (start >= value) clearInterval(interval);
            }, 40);
            return () => clearInterval(interval);
        }, delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return (
        <div
            className="ac-kpi"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                borderRadius: 18,
                padding: '20px 22px',
                background: '#fff',
                border: `1px solid ${hovered ? color + '70' : color + '28'}`,
                borderLeft: `4px solid ${color}`,
                boxShadow: hovered
                    ? `0 0 28px ${color}22, 0 8px 28px rgba(0,0,0,.1), inset 0 1px 0 ${color}12`
                    : `0 1px 6px rgba(0,0,0,.07), inset 0 1px 0 ${color}08`,
                animation: `ac-fade-up .5s ${delay}ms both`,
            }}
        >
            {/* Grid animado de fundo */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                backgroundImage: `linear-gradient(${color}08 1px,transparent 1px),linear-gradient(90deg,${color}08 1px,transparent 1px)`,
                backgroundSize: '28px 28px',
                animation: 'ac-grid 4s ease-in-out infinite',
            }} />

            {/* Linha scan */}
            <div style={{
                position: 'absolute', left: 0, right: 0, height: 1.5,
                background: `linear-gradient(90deg,transparent,${color}55,transparent)`,
                animation: 'ac-scan 3.5s ease-in-out infinite',
                pointerEvents: 'none',
            }} />

            {/* Anel decorativo canto superior direito */}
            <div style={{
                position: 'absolute', top: -18, right: -18, width: 70, height: 70,
                border: `1px solid ${color}18`, borderRadius: '50%',
                animation: 'ac-ring 10s linear infinite', pointerEvents: 'none',
            }} />

            {/* Conteúdo */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                        background: `linear-gradient(135deg,${color}22,${color}0a)`,
                        border: `1px solid ${color}45`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem',
                        boxShadow: `0 0 10px ${color}25`,
                    }}>{icon}</div>
                    <span style={{
                        color: '#6B7280', fontSize: '.8rem', fontWeight: 600,
                        letterSpacing: '.04em',
                    }}>{label}</span>
                    {/* dot pulsante */}
                    <div style={{
                        marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%',
                        background: color, boxShadow: `0 0 6px ${color}`,
                        animation: 'ac-glow-pulse 2s infinite',
                    }} />
                </div>
                <div style={{
                    fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.8rem',
                    color: color, lineHeight: 1,
                    filter: `drop-shadow(0 0 10px ${color}80)`,
                    animation: 'ac-float-num 3s ease-in-out infinite',
                }}>{displayed}</div>
            </div>
        </div>
    );
}

// ── Card de Ação ─────────────────────────────────────────────────

function AcaoCard({ acao }: { acao: Acao }) {
    const cfg = statusConfig[acao.status];
    const dot = statusDot[acao.status];
    const inicio = new Date(acao.dataInicio);
    const fim = new Date(acao.dataFim);
    const hoje = new Date();
    const totalDias = Math.max(1, Math.ceil((fim.getTime() - inicio.getTime()) / 86400000));
    const diasPassados = Math.max(0, Math.ceil((hoje.getTime() - inicio.getTime()) / 86400000));
    const progresso = Math.min(100, Math.round((diasPassados / totalDias) * 100));
    const [hov, setHov] = useState(false);
    const accentColor = dot;

    return (
        <Link href={`/admin/acoes/${acao.id}`} style={{ textDecoration: 'none' }}>
            <div
                onMouseEnter={() => setHov(true)}
                onMouseLeave={() => setHov(false)}
                style={{
                    position: 'relative', overflow: 'hidden',
                    borderRadius: 18, cursor: 'pointer',
                    background: '#fff',
                    border: `1px solid ${hov ? accentColor + '60' : accentColor + '22'}`,
                    borderLeft: `4px solid ${accentColor}`,
                    boxShadow: hov
                        ? `0 0 22px ${accentColor}18, 0 8px 24px rgba(0,0,0,.1)`
                        : `0 1px 6px rgba(0,0,0,.07)`,
                    transition: 'border-color .25s, box-shadow .25s, transform .28s',
                    transform: hov ? 'perspective(700px) rotateX(-2deg) rotateY(3deg) translateY(-5px)' : 'none',
                    display: 'flex', flexDirection: 'column',
                    animation: 'ac-fade-up .5s both',
                }}
            >
                {/* Grid animado */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    backgroundImage: `linear-gradient(${accentColor}07 1px,transparent 1px),linear-gradient(90deg,${accentColor}07 1px,transparent 1px)`,
                    backgroundSize: '26px 26px',
                    animation: 'ac-grid 5s ease-in-out infinite',
                }} />

                {/* Scan line */}
                <div style={{
                    position: 'absolute', left: 0, right: 0, height: 1.5,
                    background: `linear-gradient(90deg,transparent,${accentColor}45,transparent)`,
                    animation: 'ac-scan 4s ease-in-out infinite',
                    pointerEvents: 'none',
                }} />

                {/* Anel decorativo */}
                <div style={{
                    position: 'absolute', top: -24, right: -24, width: 90, height: 90,
                    border: `1px solid ${accentColor}15`, borderRadius: '50%',
                    animation: 'ac-ring 12s linear infinite', pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', top: -10, right: -10, width: 50, height: 50,
                    border: `1px solid ${accentColor}10`, borderRadius: '50%',
                    animation: 'ac-ring 8s linear infinite reverse', pointerEvents: 'none',
                }} />

                {/* Linha top accent */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg,transparent,${accentColor},transparent)`,
                    opacity: hov ? 0.9 : 0.4, transition: 'opacity .25s',
                }} />

                {/* Conteúdo principal */}
                <div style={{ position: 'relative', zIndex: 1, padding: '18px 20px', flex: 1 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                            background: `linear-gradient(135deg,${accentColor}25,${accentColor}08)`,
                            border: `1px solid ${accentColor}40`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.15rem',
                            boxShadow: `0 0 12px ${accentColor}25`,
                        }}>⚡</div>
                        <span style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px', borderRadius: 20,
                            background: `${accentColor}18`, border: `1px solid ${accentColor}40`,
                            fontSize: '0.7rem', fontWeight: 700, color: cfg.color,
                        }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot, display: 'inline-block', boxShadow: `0 0 4px ${dot}`, animation: 'ac-glow-pulse 2s infinite' }} />
                            {cfg.label}
                        </span>
                    </div>

                    {/* Nome */}
                    <h3 style={{
                        fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: '0.82rem',
                        color: '#111827', margin: '0 0 12px', lineHeight: 1.35,
                        letterSpacing: '.02em',
                    }}>{acao.nome}</h3>

                    {/* Meta */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
                        <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>📍 {acao.cidade?.name}, {acao.cidade?.state}</span>
                        {acao.carreta && <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>🚛 {acao.carreta.identifier}</span>}
                        <span style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>📅 {fmtDate(acao.dataInicio)} → {fmtDate(acao.dataFim)}</span>
                    </div>

                    {/* Barra de progresso */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', borderRadius: 3,
                                background: `linear-gradient(90deg,${accentColor},#FFD600)`,
                                width: `${progresso}%`, transition: 'width 1.2s ease',
                                boxShadow: `0 0 8px ${accentColor}80`,
                            }} />
                        </div>
                        <span style={{
                            fontSize: '0.68rem', color: accentColor, width: 32, textAlign: 'right',
                            fontFamily: 'Orbitron', fontWeight: 700,
                        }}>{progresso}%</span>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    position: 'relative', zIndex: 1,
                    padding: '12px 20px',
                    borderTop: `1px solid ${accentColor}20`,
                    background: 'rgba(0,0,0,.02)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', gap: 14 }}>
                        {[
                            { v: acao._count?.turmas ?? 0, l: 'Turmas' },
                            { v: acao._count?.equipe ?? 0, l: 'Equipe' },
                            { v: acao._count?.custos ?? 0, l: 'Custos' },
                        ].map(({ v, l }) => (
                            <span key={l} style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>
                                <strong style={{ color: accentColor, fontFamily: 'Orbitron', fontSize: '0.78rem' }}>{v}</strong> {l}
                            </span>
                        ))}
                    </div>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '5px 12px', borderRadius: 9,
                        background: 'linear-gradient(135deg,#FFD600,#E6A800)',
                        color: '#000', fontWeight: 800, fontSize: '0.68rem',
                        letterSpacing: '.04em', fontFamily: 'Orbitron, sans-serif',
                        boxShadow: hov ? '0 0 18px rgba(255,214,0,.6)' : '0 0 10px rgba(255,214,0,.35)',
                        transition: 'box-shadow .25s',
                    }}>
                        ⚡ Ver
                    </span>
                </div>
            </div>
        </Link>
    );
}

// ── Página Principal ──────────────────────────────────────────────

export default function AcoesPage() {
    const [acoes, setAcoes] = useState<Acao[]>([]);
    const [estatisticas, setEstatisticas] = useState<AcaoEstatisticas | null>(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const [loadError, setLoadError] = useState('');

    const load = async () => {
        setLoading(true);
        setLoadError('');
        try {
            const [a, e] = await Promise.all([
                acoesApi.listar({ search: search || undefined, status: filterStatus as AcaoStatus || undefined }),
                acoesApi.estatisticas(),
            ]);
            setAcoes(a);
            setEstatisticas(e);
        } catch (err: any) {
            if (err?.response?.status === 401) {
                // Token expirado — redireciona para login
                localStorage.removeItem('token');
                window.location.href = '/login';
                return;
            }
            setAcoes([]);
            setLoadError('Erro ao carregar períodos de curso. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [search, filterStatus]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-in">
            <style>{ACOES_CSS}</style>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.7rem', fontWeight: 900, letterSpacing: '0.08em', margin: 0 }}>PERÍODOS DE CURSO</h1>
                    <p style={{ color: '#9CA3AF', fontSize: '0.82rem', margin: '4px 0 0' }}>Gerencie os períodos de curso da Upgrade em cada cidade</p>
                </div>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    ⚡ Novo Período de Curso
                </button>
            </div>

            {/* KPIs */}
            {estatisticas && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
                    <KpiCard label="Total de Períodos" value={estatisticas.total} icon="⚡" color="#B89B00" bgColor="rgba(255,214,0,.07)" delay={0} />
                    <KpiCard label="Planejadas" value={estatisticas.planejadas} icon="📋" color="#D97706" bgColor="rgba(251,191,36,.09)" delay={80} />
                    <KpiCard label="Em Andamento" value={estatisticas.emAndamento} icon="🚀" color="#059669" bgColor="rgba(16,185,129,.08)" delay={160} />
                    <KpiCard label="Concluídas" value={estatisticas.concluidas} icon="✅" color="#1D4ED8" bgColor="rgba(37,99,235,.07)" delay={240} />
                    <KpiCard label="Canceladas" value={estatisticas.canceladas} icon="❌" color="#DC2626" bgColor="rgba(239,68,68,.07)" delay={320} />
                </div>
            )}

            {/* Filtros */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: '0.9rem' }}>🔍</span>
                    <input
                        type="text"
                        placeholder="Pesquisar períodos de curso..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px 10px 38px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: '0.88rem', color: '#111827', outline: 'none', background: '#fff' }}
                        onFocus={e => (e.target.style.borderColor = '#FFD600')}
                        onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    style={{ padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: '0.88rem', color: '#374151', outline: 'none', cursor: 'pointer', background: '#fff', minWidth: 180 }}
                >
                    <option value="">Todos os status</option>
                    <option value="PLANEJADA">Planejadas</option>
                    <option value="EM_ANDAMENTO">Em Andamento</option>
                    <option value="CONCLUIDA">Concluídas</option>
                    <option value="CANCELADA">Canceladas</option>
                </select>
            </div>

            {/* Conteúdo */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} style={{ height: 210, background: '#fff', borderRadius: 16, border: '1px solid #F3F4F6', animation: 'shimmerBg 1.5s infinite' }} />
                    ))}
                </div>
            ) : acoes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1px solid #F3F4F6' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 12, opacity: 0.35 }}>⚡</div>
                    <h3 style={{ color: '#374151', fontSize: '1.1rem', margin: '0 0 6px', fontFamily: 'Orbitron' }}>Nenhum período de curso encontrado</h3>
                    <p style={{ color: '#9CA3AF', fontSize: '0.85rem', margin: 0 }}>Crie o primeiro período de curso para começar a gerenciar as operações de campo.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {acoes.map(acao => <AcaoCard key={acao.id} acao={acao} />)}
                </div>
            )}

            {showModal && <ModalNovaAcao onClose={() => setShowModal(false)} onCreated={load} />}
            <style>{`@keyframes shimmerBg { 0%,100% { opacity:0.7; } 50% { opacity:0.4; } }`}</style>
        </div>
    );
}
