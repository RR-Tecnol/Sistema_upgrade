'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';
import {
    CalendarDaysIcon,
    PlusIcon,
    TrashIcon,
    CheckCircleIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { FeriadosSidebarTutorial } from '@/components/admin/adminSidebarTutorials';
import AdminViewModeToggle from '@/components/admin/AdminViewModeToggle';
import { usePersistedAdminViewMode } from '@/hooks/usePersistedAdminViewMode';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';
import { AdminListPagination } from '@/components/admin/AdminListPagination';
import { ADMIN_PAGE_SIZE_TABLE } from '@/lib/api/pagination';

/* ── Tipos ─────────────────────────────────────────── */
interface Holiday {
    id: string;
    classId?: string | null;
    date: string;
    reason: string;
    description?: string;
    type?: 'NATIONAL' | 'LOCAL' | 'WEATHER' | 'OTHER';
    active: boolean;
    newEndDate?: string;
    createdAt?: string;
    source?: 'catalog' | 'class';
    scope?: 'NATIONAL' | 'STATE';
    stateCode?: string | null;
}

interface Class {
    id: string;
    classIdentifier: string;
    status?: string;
    course?: { name: string };
    city?: { name: string; state: string };
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    NATIONAL: { label: 'Feriado Nacional', color: '#1D4ED8', bg: '#EFF6FF', icon: '🇧🇷' },
    LOCAL: { label: 'Feriado Local', color: '#059669', bg: '#F0FDF4', icon: '📍' },
    WEATHER: { label: 'Imprevisto Climático', color: '#D97706', bg: '#FFFBEB', icon: '⛈️' },
    OTHER: { label: 'Outro Imprevisto', color: '#7C3AED', bg: '#F5F3FF', icon: '⚠️' },
};

const fmtDate = (d: string | undefined | null) => {
    if (!d) return '';
    const dateStr = d.includes('T') ? d.split('T')[0] : d;
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
};

/** Infere o tipo do feriado a partir do campo reason/description quando type não existe */
function inferType(h: Holiday): string {
    if (h.type) return h.type; // Se a API retornar o campo, usa
    const r = (h.reason || h.description || '').toLowerCase();
    if (r.includes('🇧🇷') || r.includes('nacional') || r.includes('tiradentes') ||
        r.includes('carnaval') || r.includes('trabalho') || r.includes('independ') ||
        r.includes('aparecida') || r.includes('finados') || r.includes('república') ||
        r.includes('natal') || r.includes('ano novo') || r.includes('corpus')) {
        return 'NATIONAL';
    }
    if (r.includes('⛈') || r.includes('chuva') || r.includes('clima') || r.includes('enchente') ||
        r.includes('temporal') || r.includes('inundac') || r.includes('[weather]')) {
        return 'WEATHER';
    }
    if (r.includes('📍') || r.includes('local') || r.includes('municipal') || r.includes('estadual') || r.includes('[local]')) {
        return 'LOCAL';
    }
    if (r.includes('⚠') || r.includes('[other]')) {
        return 'OTHER';
    }
    return 'OTHER';
}

/** Remove prefixos legados como [OTHER], [LOCAL], [WEATHER] que ficaram salvos no banco. */
function cleanReason(text: string | undefined | null): string {
    if (!text) return '—';
    return text
        .replace(/^\[OTHER\]\s*/i, '')
        .replace(/^\[LOCAL\]\s*/i, '')
        .replace(/^\[WEATHER\]\s*/i, '')
        .replace(/^\[NATIONAL\]\s*/i, '')
        .trim() || '—';
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
            // Incluir emoji do tipo no reason para que inferType() classifique corretamente
            // sem poluir a exibição com tags como [OTHER], [LOCAL], etc.
            const TYPE_EMOJI: Record<string, string> = {
                NATIONAL: '🇧🇷 ',
                LOCAL: '📍 ',
                WEATHER: '⛈️ ',
                OTHER: '⚠️ ',
            };
            const prefix = TYPE_EMOJI[form.type] ?? '';
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
        <ModalPortal>
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: MODAL_PORTAL_Z_INDEX, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
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
        </ModalPortal>
    );
}

/* ── Página Principal ───────────────────────────────── */
export default function FeriadosPage() {
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filterType, setFilterType] = useState('');
    const [page, setPage] = useState(1);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [preloading, setPreloading] = useState(false);
    const [preloadResult, setPreloadResult] = useState<{ ok: number; skip: number; detail?: string } | null>(null);
    const [listViewMode, setListViewMode] = usePersistedAdminViewMode('admin:feriados:list', 'table');

    const load = async () => {
        setLoading(true);
        try {
            const catalogRes = await api.get('/holiday/catalog');
            const catalog: Holiday[] = (Array.isArray(catalogRes.data) ? catalogRes.data : []).map(h => ({
                ...h,
                classId: null,
                source: 'catalog' as const,
                active: true,
            }));

            let classHolidays: Holiday[] = [];
            let cls: Class[] = [];
            try {
                const classRes = await api.get('/classes');
                cls = Array.isArray(classRes.data) ? classRes.data : (classRes.data?.data ?? []);
            } catch { /* lista de turmas opcional para ocorrência por turma */ }

            const turmasModal = cls.filter(c => c.status === 'IN_PROGRESS' || c.status === 'OPEN' || c.status === 'PLANNED');
            setClasses(turmasModal.length ? turmasModal : cls);

            const inProgress = cls.filter(c => c.status === 'IN_PROGRESS');
            if (inProgress.length > 0) {
                const results = await Promise.allSettled(
                    inProgress.map(c =>
                        api.get(`/holiday/class/${c.id}`).then(r => (Array.isArray(r.data) ? r.data : [])),
                    ),
                );
                classHolidays = results
                    .filter(r => r.status === 'fulfilled')
                    .flatMap(r =>
                        (r as PromiseFulfilledResult<Holiday[]>).value.map(h => ({
                            ...h,
                            source: 'class' as const,
                        })),
                    );
            }

            setHolidays([...catalog, ...classHolidays]);
        } catch {
            setHolidays([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
    const [confirmRemoveDesc, setConfirmRemoveDesc] = useState('');
    const [confirmRemoveSource, setConfirmRemoveSource] = useState<'catalog' | 'class'>('class');
    const [removeMotivo, setRemoveMotivo] = useState('');
    const handleRemove = async (id: string, source: 'catalog' | 'class') => {
        setDeleting(id);
        try {
            if (source === 'catalog') {
                await api.delete(`/holiday/catalog/${id}`);
                toast.success('Feriado removido do catálogo global.');
            } else {
                await api.delete(`/holiday/${id}`);
                toast.success('Ocorrência removida da turma!');
            }
            await load();
        } catch {
            toast.error('Erro ao remover feriado');
        } finally {
            setDeleting(null);
            setConfirmRemoveId(null);
        }
    };

    /** BUG-15: catálogo global — não exige turma IN_PROGRESS */
    const handlePreloadNacional = async () => {
        setPreloading(true);
        try {
            const res = await api.post<{ ok: number; skip: number }>(
                '/holiday/preload-national-catalog',
                { years: [2025, 2026] },
            );
            const { ok, skip } = res.data;
            setPreloadResult({
                ok,
                skip,
                detail: 'Catálogo global do sistema (válido para todas as turmas ao calcular calendário e diárias).',
            });
            toast.success('Feriados nacionais carregados no catálogo.');
        } catch {
            toast.error('Não foi possível pré-carregar feriados nacionais.');
        } finally {
            setPreloading(false);
            await load();
        }
    };

    /** BUG-15: feriados estaduais no catálogo por UF (sem turma obrigatória). */
    const handlePreloadEstaduais = async () => {
        setPreloading(true);
        try {
            const y = new Date().getFullYear();
            const res = await api.post<{ ok: number; skip: number; statesProcessed: number }>(
                '/holiday/preload-state-catalog',
                { years: [y, y + 1] },
            );
            const { ok, skip, statesProcessed } = res.data;
            setPreloadResult({
                ok,
                skip,
                detail: `${statesProcessed} UF(s) no catálogo global — turmas usam o estado da cidade ao montar o calendário.`,
            });
            toast.success('Pré-carga de feriados estaduais concluída.');
        } catch {
            toast.error('Não foi possível pré-carregar feriados estaduais.');
        } finally {
            setPreloading(false);
            await load();
        }
    };

    const holidayTurmaLabel = (h: Holiday) => {
        if (h.source === 'catalog') {
            if (h.scope === 'STATE' && h.stateCode) return `Sistema · ${h.stateCode}`;
            return 'Sistema · Nacional';
        }
        const cls = classes.find(c => c.id === h.classId);
        return cls ? `${cls.classIdentifier} · ${cls.city?.name}/${cls.city?.state}` : 'Turma';
    };

    const filteredAll = useMemo(
        () => (filterType ? holidays.filter(h => inferType(h) === filterType) : holidays),
        [holidays, filterType],
    );
    const totalPages = Math.max(1, Math.ceil(filteredAll.length / ADMIN_PAGE_SIZE_TABLE));
    const pageItems = useMemo(() => {
        const start = (page - 1) * ADMIN_PAGE_SIZE_TABLE;
        return filteredAll.slice(start, start + ADMIN_PAGE_SIZE_TABLE);
    }, [filteredAll, page]);

    useEffect(() => { setPage(1); }, [filterType]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-in">
            <AdminHeaderHero
                title="FERIADOS"
                subtitle="Catálogo global de feriados + ocorrências por turma. Pré-carga nacional/estadual não exige turma ativa (BUG-15)."
                rightSlot={(
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* FEAT-FERIADO: botão de pré-carga */}
                    <button onClick={handlePreloadNacional} disabled={preloading}
                        title={`Registrar os ${FERIADOS_NACIONAIS.length} feriados nacionais (2025–2026) no catálogo global do sistema`}
                        style={{
                            padding: '8px 14px', borderRadius: 10, fontSize: '0.78rem', fontWeight: 700,
                            cursor: preloading ? 'not-allowed' : 'pointer',
                            border: '1px solid #BBF7D0', background: '#F0FDF4', color: '#059669',
                            opacity: preloading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                        🇧🇷 {preloading ? 'Carregando...' : `Pré-carregar ${FERIADOS_NACIONAIS.length} Feriados Nacionais 2025/2026`}
                    </button>
                    <button onClick={handlePreloadEstaduais} disabled={preloading}
                        title="Registrar feriados estaduais fixos de todas as UFs mapeadas no catálogo global (anos atual e seguinte)"
                        style={{
                            padding: '8px 14px', borderRadius: 10, fontSize: '0.78rem', fontWeight: 700,
                            cursor: preloading ? 'not-allowed' : 'pointer',
                            border: '1px solid #A7F3D0', background: '#ECFDF5', color: '#047857',
                            opacity: preloading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                        📍 {preloading ? 'Carregando...' : `Pré-carregar Feriados Estaduais (UF da turma) ${new Date().getFullYear()}/${new Date().getFullYear() + 1}`}
                    </button>
                    <button className="btn-primary" onClick={() => setShowModal(true)}>
                        <PlusIcon style={{ width: 16, height: 16 }} /> Registrar Ocorrência
                    </button>
                    </div>
                )}
            />
            <FeriadosSidebarTutorial />

            {/* Banner resultado pré-carga */}
            {preloadResult && (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 600 }}>
                        ✅ Pré-carga concluída: <strong>{preloadResult.ok}</strong> feriados registrados,{' '}
                        <strong>{preloadResult.skip}</strong> ignorados (já existiam ou indisponíveis para a UF).
                        {preloadResult.detail ? <> {' '}— {preloadResult.detail}</> : null}
                    </div>
                    <button onClick={() => setPreloadResult(null)} style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', fontSize: '1rem', flexShrink: 0 }}>✕</button>
                </div>
            )}

            {/* KPIs rápidos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                {Object.entries(TYPE_CONFIG).map(([k, v]) => {
                    const count = holidays.filter(h => inferType(h) === k).length;
                    return (
                        <AnimatedKpiCard
                            key={k}
                            label={v.label}
                            value={count}
                            color={v.color}
                            bg={v.bg}
                            border={v.color}
                            sub={v.icon}
                        />
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
                <div style={{ marginLeft: 'auto', alignSelf: 'center' }}>
                    <AdminViewModeToggle mode={listViewMode} onChange={setListViewMode} />
                </div>
            </div>

            {/* Lista */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F3F4F6', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ margin: '0 auto 1rem' }} /><p style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>Carregando ocorrências...</p></div>
                ) : filteredAll.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF' }}>
                        <CheckCircleIcon style={{ width: 36, height: 36, margin: '0 auto 8px', opacity: 0.3 }} />
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', letterSpacing: '0.12em' }}>NENHUMA OCORRÊNCIA REGISTRADA</p>
                        <p style={{ fontSize: '0.78rem', color: '#9CA3AF', marginTop: 6 }}>
                            Use <strong>Pré-carregar Feriados Nacionais</strong> ou{' '}
                            <strong>Estaduais</strong> — funciona mesmo sem turma em andamento
                        </p>
                    </div>
                ) : listViewMode === 'card' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, padding: 14 }}>
                        {pageItems.map((h, idx) => {
                            const cfg = TYPE_CONFIG[inferType(h)] ?? TYPE_CONFIG['OTHER'];
                            const turmaLabel = holidayTurmaLabel(h);
                            return (
                                <div
                                    key={h.id}
                                    className="adm-kpi-card adm-scale-in"
                                    style={{
                                        animationDelay: `${idx * 28}ms`,
                                        background: '#fff',
                                        opacity: h.active ? 1 : 0.55,
                                        borderStyle: 'solid',
                                        borderWidth: '1px 1px 1px 4px',
                                        borderLeftColor: cfg.color,
                                        borderTopColor: `${cfg.color}33`,
                                        borderRightColor: `${cfg.color}22`,
                                        borderBottomColor: `${cfg.color}22`,
                                    }}
                                >
                                    <div className="adm-kpi-grid" />
                                    <div style={{ position: 'relative', zIndex: 1, padding: '12px 14px' }}>
                                        <div style={{ marginBottom: 6 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: '0.65rem', fontWeight: 700, border: `1px solid ${cfg.color}30` }}>{cfg.icon} {cfg.label}</span></div>
                                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', fontWeight: 700, color: '#111827' }}>{fmtDate(h.date.split('T')[0])}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#374151', marginTop: 8, lineHeight: 1.35 }}>{cleanReason(h.reason ?? h.description)}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#92400E', marginTop: 8, fontFamily: 'JetBrains Mono' }}>{turmaLabel}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#D97706', marginTop: 4, fontWeight: 600 }}>
                                            {h.source === 'catalog'
                                                ? 'Catálogo global'
                                                : h.newEndDate
                                                    ? <>Nova fim: {fmtDate(h.newEndDate.split('T')[0])}</>
                                                    : 'Fim: auto-calculado'}
                                        </div>
                                    </div>
                                    <div style={{ position: 'relative', zIndex: 1, borderTop: '1px solid #F3F4F6', padding: '8px 12px' }}>
                                        <button type="button" onClick={() => { setConfirmRemoveId(h.id); setConfirmRemoveDesc(h.reason || h.date?.split('T')[0] || ''); setConfirmRemoveSource(h.source === 'catalog' ? 'catalog' : 'class'); setRemoveMotivo(''); }} disabled={deleting === h.id} title="Remover" style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <TrashIcon style={{ width: 14, height: 14 }} /> Remover
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
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
                                {pageItems.map(h => {
                                    const cfg = TYPE_CONFIG[inferType(h)] ?? TYPE_CONFIG['OTHER'];
                                    const turmaLabel = holidayTurmaLabel(h);
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
                                            <td style={{ maxWidth: 220, fontSize: '0.82rem', color: '#374151' }}>{cleanReason(h.reason ?? h.description)}</td>
                                            <td>
                                                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#B89B00', fontWeight: 700 }}>{turmaLabel}</span>
                                            </td>
                                            <td>
                                                {h.source === 'catalog' ? (
                                                    <span style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>Catálogo</span>
                                                ) : h.newEndDate ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                        <ClockIcon style={{ width: 13, height: 13, color: '#D97706' }} />
                                                        <span style={{ fontSize: '0.78rem', color: '#D97706', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                                                            {fmtDate(h.newEndDate.split('T')[0])}
                                                        </span>
                                                    </div>
                                                ) : <span style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>Auto-calculado</span>}
                                            </td>
                                            <td>
                                                <button onClick={() => { setConfirmRemoveId(h.id); setConfirmRemoveDesc(h.reason || h.date?.split('T')[0] || ''); setConfirmRemoveSource(h.source === 'catalog' ? 'catalog' : 'class'); setRemoveMotivo(''); }} disabled={deleting === h.id}
                                                    title="Remover"
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

            <AdminListPagination
                page={page}
                totalPages={totalPages}
                total={filteredAll.length}
                loading={loading}
                onPageChange={setPage}
                itemLabel="feriado(s)/ocorrência(s)"
            />

            {showModal && <ModalNovaOcorrencia classes={classes} onClose={() => setShowModal(false)} onCreated={load} />}

            {/* PASSO 3.8: Modal de confirmação com motivo de exclusão */}
            {confirmRemoveId && (
                <ModalPortal>
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: MODAL_PORTAL_Z_INDEX, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                    onClick={() => setConfirmRemoveId(null)}
                >
                    <div
                        style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{ padding: '1.1rem 1.4rem', background: '#FEF2F2', borderBottom: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>🗑️</div>
                            <div>
                                <div style={{ fontFamily: 'Orbitron', fontSize: '0.78rem', fontWeight: 900, color: '#111827' }}>REMOVER FERIADO</div>
                                <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 2 }}>{confirmRemoveDesc}</div>
                            </div>
                            <button onClick={() => setConfirmRemoveId(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
                        </div>
                        {/* Body */}
                        <div style={{ padding: '1.25rem 1.4rem' }}>
                            <p style={{ fontSize: '0.83rem', color: '#374151', marginBottom: '1rem', lineHeight: 1.6 }}>
                                O feriado será removido e o prazo da turma será recalculado automaticamente.
                            </p>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                                Motivo da remoção <span style={{ color: '#DC2626' }}>*</span>
                            </label>
                            <textarea
                                className="form-input"
                                rows={3}
                                placeholder="Ex: Data incorreta, feriado não se aplica a esta turma..."
                                value={removeMotivo}
                                onChange={e => setRemoveMotivo(e.target.value)}
                                autoFocus
                                style={{ resize: 'none', fontSize: '0.85rem' }}
                            />
                        </div>
                        {/* Footer */}
                        <div style={{ padding: '0.85rem 1.4rem', borderTop: '1px solid #F3F4F6', display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setConfirmRemoveId(null)} className="btn-ghost" style={{ fontSize: '0.82rem' }}>Cancelar</button>
                            <button
                                onClick={() => { if (confirmRemoveId) handleRemove(confirmRemoveId, confirmRemoveSource); }}
                                disabled={!removeMotivo.trim() || deleting === confirmRemoveId}
                                style={{
                                    padding: '0.55rem 1.1rem', borderRadius: 9, border: 'none',
                                    background: removeMotivo.trim() ? '#DC2626' : '#9CA3AF',
                                    color: '#fff', fontSize: '0.82rem', fontWeight: 700,
                                    cursor: removeMotivo.trim() ? 'pointer' : 'not-allowed',
                                    opacity: deleting === confirmRemoveId ? 0.6 : 1,
                                }}
                            >
                                {deleting === confirmRemoveId ? 'Removendo...' : '🗑️ Confirmar Remoção'}
                            </button>
                        </div>
                    </div>
                </div>
                </ModalPortal>
            )}
        </div>
    );
}
