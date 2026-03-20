'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';
import {
    CalendarDaysIcon,
    PlusIcon,
    TrashIcon,
    CheckCircleIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';

/* ── Tipos ─────────────────────────────────────────── */
interface Holiday {
    id: string;
    classId: string;
    date: string;
    reason: string;
    description?: string;
    type?: 'NATIONAL' | 'LOCAL' | 'WEATHER' | 'OTHER';
    active: boolean;
    newEndDate?: string;
    createdAt: string;
}

interface Class {
    id: string;
    classIdentifier: string;
    course?: { name: string };
    city?: { name: string; state: string };
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    NATIONAL: { label: 'Feriado Nacional', color: '#1D4ED8', bg: '#EFF6FF', icon: '🇧🇷' },
    LOCAL: { label: 'Feriado Local', color: '#059669', bg: '#F0FDF4', icon: '📍' },
    WEATHER: { label: 'Imprevisto Climático', color: '#D97706', bg: '#FFFBEB', icon: '⛈️' },
    OTHER: { label: 'Outro Imprevisto', color: '#7C3AED', bg: '#F5F3FF', icon: '⚠️' },
};

const fmtDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

/** Infere o tipo do feriado a partir do campo reason/description quando type não existe */
function inferType(h: Holiday): string {
    if (h.type) return h.type; // Se a API retornar o campo, usa
    const r = (h.reason || h.description || '').toLowerCase();
    if (r.includes('\ud83c\udde7\ud83c\uddf7') || r.includes('nacional') || r.includes('tiradentes') ||
        r.includes('carnaval') || r.includes('trabalho') || r.includes('independ') ||
        r.includes('aparecida') || r.includes('finados') || r.includes('rep\u00fablica') ||
        r.includes('natal') || r.includes('ano novo') || r.includes('corpus')) {
        return 'NATIONAL';
    }
    if (r.includes('\u26c8') || r.includes('chuva') || r.includes('clima') || r.includes('enchente') ||
        r.includes('temporal') || r.includes('inundac')) {
        return 'WEATHER';
    }
    if (r.includes('local') || r.includes('municipal') || r.includes('estadual')) {
        return 'LOCAL';
    }
    return 'OTHER';
}

/* ── Feriados Nacionais Brasileiros 2025/2026 ── FEAT-FERIADO ── */
const FERIADOS_NACIONAIS: { date: string; reason: string }[] = [
    // 2025
    { date: '2025-01-01', reason: '🇧🇷 Ano Novo' },
    { date: '2025-03-03', reason: '🇧🇷 Carnaval (2ª feira)' },
    { date: '2025-03-04', reason: '🇧🇷 Carnaval (3ª feira)' },
    { date: '2025-04-18', reason: '🇧🇷 Sexta-feira Santa' },
    { date: '2025-04-21', reason: '🇧🇷 Tiradentes' },
    { date: '2025-05-01', reason: '🇧🇷 Dia do Trabalho' },
    { date: '2025-06-19', reason: '🇧🇷 Corpus Christi' },
    { date: '2025-09-07', reason: '🇧🇷 Independência do Brasil' },
    { date: '2025-10-12', reason: '🇧🇷 Nossa Senhora Aparecida' },
    { date: '2025-11-02', reason: '🇧🇷 Finados' },
    { date: '2025-11-15', reason: '🇧🇷 Proclamação da República' },
    { date: '2025-11-20', reason: '🇧🇷 Consciência Negra' },
    { date: '2025-12-25', reason: '🇧🇷 Natal' },
    // 2026
    { date: '2026-01-01', reason: '🇧🇷 Ano Novo' },
    { date: '2026-02-16', reason: '🇧🇷 Carnaval (2ª feira)' },
    { date: '2026-02-17', reason: '🇧🇷 Carnaval (3ª feira)' },
    { date: '2026-04-03', reason: '🇧🇷 Sexta-feira Santa' },
    { date: '2026-04-21', reason: '🇧🇷 Tiradentes' },
    { date: '2026-05-01', reason: '🇧🇷 Dia do Trabalho' },
    { date: '2026-06-04', reason: '🇧🇷 Corpus Christi' },
    { date: '2026-09-07', reason: '🇧🇷 Independência do Brasil' },
    { date: '2026-10-12', reason: '🇧🇷 Nossa Senhora Aparecida' },
    { date: '2026-11-02', reason: '🇧🇷 Finados' },
    { date: '2026-11-15', reason: '🇧🇷 Proclamação da República' },
    { date: '2026-11-20', reason: '🇧🇷 Consciência Negra' },
    { date: '2026-12-25', reason: '🇧🇷 Natal' },
];

/* ── Formulário Nova Ocorrência ─────────────────────── */
function ModalNovaOcorrencia({
    classes,
    onClose,
    onCreated,
}: {
    classes: Class[];
    onClose: () => void;
    onCreated: () => void;
}) {
    const [form, setForm] = useState({
        classId: '',
        date: '',
        reason: '',
        type: 'NATIONAL' as 'NATIONAL' | 'LOCAL' | 'WEATHER' | 'OTHER',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{ newEndDate?: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.classId) { setError('Selecione uma turma'); return; }
        if (!form.date) { setError('Selecione a data'); return; }
        if (!form.reason.trim()) { setError('Informe a descrição'); return; }
        setLoading(true); setError('');
        try {
            // Incluir prefixo do tipo no reason para que inferType() classifique corretamente
            const TYPE_PREFIX: Record<string, string> = {
                NATIONAL: '🇧🇷 ',
                LOCAL: '[LOCAL] 📍 ',
                WEATHER: '[WEATHER] ⛈️ ',
                OTHER: '[OTHER] ⚠️ ',
            };
            const prefix = TYPE_PREFIX[form.type] ?? '';
            // Evitar prefixo duplo
            const reasonWithType = form.reason.startsWith(prefix.trim())
                ? form.reason
                : `${prefix}${form.reason}`;

            const res = await api.post(`/holiday/class/${form.classId}`, {
                date: form.date,
                reason: reasonWithType,
            });
            setResult(res.data);
            setTimeout(() => { onCreated(); onClose(); }, 2000);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Erro ao registrar ocorrência');
        } finally { setLoading(false); }
    };

    const INPUT: React.CSSProperties = {
        width: '100%', padding: '0.65rem 0.9rem', borderRadius: 9,
        border: '1.5px solid #E5E7EB', background: '#F9FAFB',
        fontSize: '0.85rem', color: '#111827', outline: 'none',
    };
    const LABEL: React.CSSProperties = {
        display: 'block', fontSize: '0.63rem', fontWeight: 800,
        textTransform: 'uppercase' as const, letterSpacing: '0.1em',
        color: '#6B7280', marginBottom: '0.35rem',
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', animation: 'slideUp 0.25s' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ padding: '18px 24px 14px', background: '#FFF9C4', borderBottom: '1px solid #FEF08A', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CalendarDaysIcon style={{ width: 18, height: 18, color: '#fff' }} />
                    </div>
                    <div>
                        <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.88rem', fontWeight: 900, color: '#111827', margin: 0 }}>REGISTRAR OCORRÊNCIA</h2>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: '#9CA3AF' }}>Feriado ou imprevisto — recalcula data final da turma</p>
                    </div>
                    <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '10px 14px', borderRadius: 9, fontSize: '0.83rem' }}>{error}</div>}
                    {result && (
                        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '10px 14px', borderRadius: 9, fontSize: '0.83rem', color: '#065F46' }}>
                            ✅ Ocorrência registrada! {result.newEndDate && `Nova data de término: ${fmtDate(result.newEndDate)}`}
                        </div>
                    )}

                    <div>
                        <label style={LABEL}>Turma *</label>
                        <select style={{ ...INPUT, cursor: 'pointer' }} value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))} required>
                            <option value="">Selecione a turma...</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.classIdentifier} — {c.course?.name} ({c.city?.name}/{c.city?.state})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={LABEL}>Data da Ocorrência *</label>
                            <input type="date" style={INPUT} required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                        </div>
                        <div>
                            <label style={LABEL}>Tipo</label>
                            <select style={{ ...INPUT, cursor: 'pointer' }} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'NATIONAL' | 'LOCAL' | 'WEATHER' | 'OTHER' }))}>
                                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                                    <option key={k} value={k}>{v.icon} {v.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={LABEL}>Descrição *</label>
                        <input style={INPUT} placeholder="Ex: Carnaval Municipal, Chuva forte impossibilitou aulas..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} required />
                    </div>

                    <div style={{ background: '#FFFDE7', border: '1px solid #FEF08A', borderRadius: 9, padding: '10px 14px', fontSize: '0.75rem', color: '#92400E' }}>
                        ⚠️ <strong>Regra automática:</strong> ao registrar a ocorrência, a data final da turma será recalculada automaticamente (REQ-08)
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                        <button type="button" onClick={onClose} style={{ padding: '9px 20px', background: 'transparent', border: '1px solid #E5E7EB', color: '#6B7280', borderRadius: 9, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Cancelar</button>
                        <button type="submit" disabled={loading} className="btn-primary" style={{ minWidth: 160 }}>
                            {loading ? 'Registrando...' : '📅 Registrar Ocorrência'}
                        </button>
                    </div>
                </form>
            </div>
            <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </div>
    );
}

/* ── Página Principal ───────────────────────────────── */
export default function FeriadosPage() {
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filterType, setFilterType] = useState('');
    const [deleting, setDeleting] = useState<string | null>(null);
    const [preloading, setPreloading] = useState(false);
    const [preloadResult, setPreloadResult] = useState<{ ok: number; skip: number } | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const classRes = await api.get('/classes?status=IN_PROGRESS');
            const cls: Class[] = Array.isArray(classRes.data) ? classRes.data : (classRes.data?.data ?? []);
            setClasses(cls);
            if (cls.length > 0) {
                const results = await Promise.allSettled(
                    cls.map(c => api.get(`/holiday/class/${c.id}`).then(r => (Array.isArray(r.data) ? r.data : [])))
                );
                const allHolidays: Holiday[] = results
                    .filter(r => r.status === 'fulfilled')
                    .flatMap(r => (r as PromiseFulfilledResult<Holiday[]>).value);
                setHolidays(allHolidays);
            } else {
                setHolidays([]);
            }
        } catch { setHolidays([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
    const handleRemove = async (id: string) => {
        setDeleting(id);
        try { await api.delete(`/holiday/${id}`); toast.success('Ocorrência removida!'); await load(); }
        catch { toast.error('Erro ao remover ocorrência'); }
        finally { setDeleting(null); setConfirmRemoveId(null); }
    };

    /* FEAT-FERIADO: Pré-carregar feriados nacionais 2025/2026 para todas as turmas ativas */
    const handlePreloadNacional = async () => {
        if (!classes.length) {
            toast.warning('Nenhuma turma ativa (IN_PROGRESS) encontrada.');
            return;
        }
        setPreloading(true);
        let ok = 0; let skip = 0;
        for (const cls of classes) {
            for (const f of FERIADOS_NACIONAIS) {
                try {
                    await api.post(`/holiday/class/${cls.id}`, { date: f.date, reason: f.reason });
                    ok++;
                } catch {
                    skip++; // já existe ou fora do período
                }
            }
        }
        setPreloadResult({ ok, skip });
        setPreloading(false);
        await load();
    };

    const filtered = filterType ? holidays.filter(h => inferType(h) === filterType) : holidays;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 className="gradient-text" style={{ fontFamily: 'Orbitron', fontSize: '1.7rem', fontWeight: 900, letterSpacing: '0.08em', margin: 0 }}>
                        FERIADOS
                    </h1>
                    <p style={{ color: '#9CA3AF', fontSize: '0.82rem', margin: '4px 0 0' }}>
                        Registre feriados e imprevistos — data final de turmas é recalculada automaticamente (REQ-08)
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* FEAT-FERIADO: botão de pré-carga */}
                    <button onClick={handlePreloadNacional} disabled={preloading}
                        title={`Registrar os ${FERIADOS_NACIONAIS.length} feriados nacionais (2025–2026) automaticamente para todas as turmas ativas`}
                        style={{
                            padding: '8px 14px', borderRadius: 10, fontSize: '0.78rem', fontWeight: 700,
                            cursor: preloading ? 'not-allowed' : 'pointer',
                            border: '1px solid #BBF7D0', background: '#F0FDF4', color: '#059669',
                            opacity: preloading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                        🇧🇷 {preloading ? 'Carregando...' : `Pré-carregar ${FERIADOS_NACIONAIS.length} Feriados Nacionais 2025/2026`}
                    </button>
                    <button className="btn-primary" onClick={() => setShowModal(true)}>
                        <PlusIcon style={{ width: 16, height: 16 }} /> Registrar Ocorrência
                    </button>
                </div>
            </div>

            {/* Banner resultado pré-carga */}
            {preloadResult && (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 600 }}>
                        ✅ Pré-carga concluída: <strong>{preloadResult.ok}</strong> feriados registrados,{' '}
                        <strong>{preloadResult.skip}</strong> ignorados (já existiam ou fora do período da turma)
                    </div>
                    <button onClick={() => setPreloadResult(null)} style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', fontSize: '1rem', flexShrink: 0 }}>✕</button>
                </div>
            )}

            {/* KPIs rápidos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                {Object.entries(TYPE_CONFIG).map(([k, v]) => {
                    const count = holidays.filter(h => inferType(h) === k).length;
                    return (
                        <div key={k} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: `1px solid ${v.color}22`, borderLeft: `4px solid ${v.color}` }}>
                            <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{v.icon}</div>
                            <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.5rem', color: v.color }}>{count}</div>
                            <div style={{ fontSize: '0.68rem', color: '#6B7280', fontWeight: 600 }}>{v.label}</div>
                        </div>
                    );
                })}
            </div>

            {/* Filtros */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => setFilterType('')} style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, border: !filterType ? '1px solid #B89B00' : '1px solid #E5E7EB', background: !filterType ? '#FFFDE7' : 'transparent', color: !filterType ? '#B89B00' : '#6B7280', cursor: 'pointer' }}>
                    Todos ({holidays.length})
                </button>
                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <button key={k} onClick={() => setFilterType(k)}
                        style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, border: filterType === k ? `1px solid ${v.color}` : '1px solid #E5E7EB', background: filterType === k ? v.bg : 'transparent', color: filterType === k ? v.color : '#6B7280', cursor: 'pointer' }}>
                        {v.icon} {v.label}
                    </button>
                ))}
            </div>

            {/* Lista */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F3F4F6', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ margin: '0 auto 1rem' }} /><p style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>Carregando ocorrências...</p></div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF' }}>
                        <CheckCircleIcon style={{ width: 36, height: 36, margin: '0 auto 8px', opacity: 0.3 }} />
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', letterSpacing: '0.12em' }}>NENHUMA OCORRÊNCIA REGISTRADA</p>
                        <p style={{ fontSize: '0.78rem', color: '#9CA3AF', marginTop: 6 }}>
                            Use o botão <strong>Pré-carregar Feriados Nacionais</strong> para cadastrar automaticamente os feriados de 2025/2026
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Tipo</th>
                                    <th>Data</th>
                                    <th>Descrição</th>
                                    <th>Turma</th>
                                    <th>Nova Data Final</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(h => {
                                    const cfg = TYPE_CONFIG[inferType(h)] ?? TYPE_CONFIG['OTHER'];
                                    const cls = classes.find(c => c.id === h.classId);
                                    return (
                                        <tr key={h.id} style={{ opacity: h.active ? 1 : 0.5 }}>
                                            <td>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: '0.68rem', fontWeight: 700, border: `1px solid ${cfg.color}30` }}>
                                                    {cfg.icon} {cfg.label}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', fontWeight: 600, color: '#111827' }}>
                                                    {fmtDate(h.date.split('T')[0])}
                                                </div>
                                            </td>
                                            <td style={{ maxWidth: 220, fontSize: '0.82rem', color: '#374151' }}>{h.reason ?? h.description ?? '—'}</td>
                                            <td>
                                                {cls ? (
                                                    <div>
                                                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#B89B00', fontWeight: 700 }}>{cls.classIdentifier}</div>
                                                        <div style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>{cls.city?.name}/{cls.city?.state}</div>
                                                    </div>
                                                ) : <span style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>—</span>}
                                            </td>
                                            <td>
                                                {h.newEndDate ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                        <ClockIcon style={{ width: 13, height: 13, color: '#D97706' }} />
                                                        <span style={{ fontSize: '0.78rem', color: '#D97706', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                                                            {fmtDate(h.newEndDate.split('T')[0])}
                                                        </span>
                                                    </div>
                                                ) : <span style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>Auto-calculado</span>}
                                            </td>
                                            <td>
                                                <button onClick={() => handleRemove(h.id)} disabled={deleting === h.id}
                                                    title="Remover ocorrência"
                                                    style={{ padding: '5px', borderRadius: 7, background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', display: 'flex', opacity: deleting === h.id ? 0.5 : 1 }}>
                                                    <TrashIcon style={{ width: 14, height: 14 }} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && <ModalNovaOcorrencia classes={classes} onClose={() => setShowModal(false)} onCreated={load} />}
        </div>
    );
}
