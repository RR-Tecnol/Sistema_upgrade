'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { classesApi, Class } from '@/lib/api/classes';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toast } from '@/components/ui/Toast';
import {
    PlusIcon,
    PencilIcon,
    ChartBarIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    ArrowPathIcon,
    ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const TurmaDetailWorkspace = dynamic(
    () => import('@/components/admin/turmas/TurmaDetailWorkspace'),
    { ssr: false },
);
const TurmaEstatisticasWorkspace = dynamic(
    () => import('@/components/admin/turmas/TurmaEstatisticasWorkspace'),
    { ssr: false },
);

type TurmaWorkspaceOpen = null | { view: 'detail' | 'stats'; classId: string; openEditOnMount?: boolean };

const ALL_CLASS_STATUSES = [
    'PLANNED',
    'ENROLLMENT_OPEN',
    'ENROLLMENT_CLOSED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
] as const;
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { TurmasSidebarTutorial } from '@/components/admin/adminSidebarTutorials';
import AdminViewModeToggle from '@/components/admin/AdminViewModeToggle';
import { usePersistedAdminViewMode } from '@/hooks/usePersistedAdminViewMode';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { computeClassReadinessWarnings } from '@/lib/admin/classReadiness';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    PLANNED: { label: 'Planejada', color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.04)', border: 'var(--border-subtle)' },
    ENROLLMENT_OPEN: { label: 'Matrículas Abertas', color: 'var(--neon-green)', bg: 'rgba(0,255,138,0.08)', border: 'rgba(0,255,138,0.25)' },
    ENROLLMENT_CLOSED: { label: 'Matrículas Fechadas', color: 'var(--neon-orange)', bg: 'rgba(255,159,10,0.08)', border: 'rgba(255,159,10,0.25)' },
    IN_PROGRESS: { label: 'Em Andamento', color: 'var(--neon-cyan)', bg: 'rgba(0,245,255,0.08)', border: 'rgba(0,245,255,0.25)' },
    COMPLETED: { label: 'Concluída', color: 'var(--neon-purple)', bg: 'rgba(191,90,242,0.08)', border: 'rgba(191,90,242,0.25)' },
    CANCELLED: { label: 'Cancelada', color: 'var(--neon-red)', bg: 'rgba(255,45,85,0.08)', border: 'rgba(255,45,85,0.25)' },
};

const PERIOD_LABELS: Record<string, string> = {
    MORNING: '🌅 Manhã',
    AFTERNOON: '☀ Tarde',
    EVENING: '🌙 Noite',
};

export default function TurmasPage() {
    const searchParams = useSearchParams();
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [stateFilter, setStateFilter] = useState<'all' | 'MA' | 'PI'>('all');
    const [search, setSearch] = useState('');
    const [deleteClassId, setDeleteClassId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [statusModalClass, setStatusModalClass] = useState<Class | null>(null);
    const [statusDetail, setStatusDetail] = useState<Class | null>(null);
    const [statusDetailLoading, setStatusDetailLoading] = useState(false);
    const [statusTarget, setStatusTarget] = useState('');
    const [statusSaving, setStatusSaving] = useState(false);
    const [listViewMode, setListViewMode] = usePersistedAdminViewMode('admin:turmas:list', 'table');
    const [turmaWorkspace, setTurmaWorkspace] = useState<TurmaWorkspaceOpen>(null);

    useEffect(() => {
        if (!turmaWorkspace) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setTurmaWorkspace(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [turmaWorkspace]);

    useEffect(() => { loadClasses(); }, [statusFilter]);

    useEffect(() => {
        if (!statusModalClass) {
            setStatusDetail(null);
            setStatusDetailLoading(false);
            return;
        }
        let cancelled = false;
        setStatusDetail(null);
        setStatusDetailLoading(true);
        classesApi
            .getOne(statusModalClass.id)
            .then((d) => {
                if (!cancelled) setStatusDetail(d);
            })
            .catch(() => {
                if (!cancelled) setStatusDetail(null);
            })
            .finally(() => {
                if (!cancelled) setStatusDetailLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [statusModalClass?.id]);

    const statusReadinessWarnings = useMemo(() => {
        const base = statusDetail ?? statusModalClass;
        if (!base || !statusTarget) return [];
        return computeClassReadinessWarnings(base as Class & { enrollments?: Array<{ status?: string }>; _count?: { enrollments?: number } }, statusTarget);
    }, [statusDetail, statusModalClass, statusTarget]);

    useEffect(() => {
        if (searchParams.get('created') !== '1') return;
        const createdId = searchParams.get('createdClassId');
        toast.success(createdId ? `Turma criada com sucesso (${createdId.slice(0, 8)}...)` : 'Turma criada com sucesso!');
        loadClasses();

        // Evita toast duplicado em futuras navegações/back
        const url = new URL(window.location.href);
        url.searchParams.delete('created');
        url.searchParams.delete('createdClassId');
        window.history.replaceState({}, '', url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const loadClasses = async () => {
        try {
            setLoading(true);
            const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined;
            const data = await classesApi.getAll(filters);
            setClasses(data);
        } catch (error) {
            /* silencioso — lista vazia exibida ao usuário */
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeleting(true);
        try {
            await classesApi.delete(id);
            setDeleteClassId(null);
            await loadClasses();
            toast.success('Turma excluída com sucesso!');
        } catch {
            toast.error('Erro ao excluir turma. Verifique se não há alunos matriculados.');
        } finally {
            setDeleting(false);
        }
    };

    const handleOpenStatusModal = (item: Class) => {
        setStatusModalClass(item);
        setStatusTarget(item.status === 'CANCELLED' ? 'PLANNED' : item.status);
    };

    const handleSaveStatus = async () => {
        if (!statusModalClass || !statusTarget) return;
        setStatusSaving(true);
        try {
            await classesApi.updateStatus(statusModalClass.id, statusTarget);
            toast.success('Status da turma atualizado com sucesso.');
            const postSave = computeClassReadinessWarnings(
                (statusDetail ?? statusModalClass) as Class & { enrollments?: Array<{ status?: string }>; _count?: { enrollments?: number } },
                statusTarget,
            );
            if (postSave.some((w) => w.severity === 'warning')) {
                toast.warning('Status gravado. Ainda há avisos de consistência — reveja no módulo da turma ou em Períodos de curso.');
            }
            setStatusModalClass(null);
            setStatusDetail(null);
            await loadClasses();
        } catch {
            toast.error('Não foi possível atualizar o status da turma.');
        } finally {
            setStatusSaving(false);
        }
    };

    const filtered = classes.filter(c => {
        const matchSearch =
            c.classIdentifier?.toLowerCase().includes(search.toLowerCase()) ||
            c.course?.name?.toLowerCase().includes(search.toLowerCase()) ||
            c.city?.name?.toLowerCase().includes(search.toLowerCase());
        const matchState = stateFilter === 'all' || c.city?.state === stateFilter;
        return matchSearch && matchState;
    });

    const stats = {
        total: classes.length,
        open: classes.filter(c => c.status === 'ENROLLMENT_OPEN').length,
        active: classes.filter(c => c.status === 'IN_PROGRESS').length,
        done: classes.filter(c => c.status === 'COMPLETED').length,
    };

    return (
        <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
            <AdminHeaderHero
                title="TURMAS"
                subtitle="Gerencie as turmas dos cursos profissionalizantes"
                rightSlot={(
                    <Link href="/admin/turmas/nova" className="btn-primary">
                        <PlusIcon style={{ width: 16, height: 16 }} />
                        Nova Turma
                    </Link>
                )}
            />
            <TurmasSidebarTutorial />

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                {[
                    { label: 'Total', value: stats.total, color: 'var(--neon-yellow)' },
                    { label: 'Matrículas Abertas', value: stats.open, color: 'var(--neon-green)' },
                    { label: 'Em Andamento', value: stats.active, color: 'var(--neon-cyan)' },
                    { label: 'Concluídas', value: stats.done, color: 'var(--neon-purple)' },
                ].map((s, i) => (
                    <AnimatedKpiCard
                        key={s.label}
                        label={s.label}
                        value={s.value}
                        color={s.color}
                        bg="#FFFFFF"
                        border="#FFD600"
                        delayMs={i * 60}
                    />
                ))}
            </div>

            {/* Filters */}
            <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 360 }}>
                        <MagnifyingGlassIcon style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Buscar turmas..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="form-input"
                            style={{ paddingLeft: '2.25rem', paddingTop: '0.55rem', paddingBottom: '0.55rem', fontSize: '0.82rem' }}
                        />
                    </div>

                    {/* Status filters */}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {[
                            { key: 'all', label: 'Todas' },
                            { key: 'ENROLLMENT_OPEN', label: 'Abertas' },
                            { key: 'IN_PROGRESS', label: 'Andamento' },
                            { key: 'COMPLETED', label: 'Concluídas' },
                        ].map(f => {
                            const cfg = f.key !== 'all' && STATUS_CONFIG[f.key];
                            const active = statusFilter === f.key;
                            return (
                                <button
                                    key={f.key}
                                    onClick={() => setStatusFilter(f.key)}
                                    style={{
                                        padding: '0.4rem 0.85rem',
                                        borderRadius: 8,
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        border: active ? `1px solid ${cfg ? cfg.color : 'var(--neon-yellow)'}` : '1px solid var(--border-subtle)',
                                        background: active ? (cfg ? cfg.bg : 'rgba(255,214,0,0.1)') : 'transparent',
                                        color: active ? (cfg ? cfg.color : 'var(--neon-yellow)') : 'var(--text-muted)',
                                    }}
                                >
                                    {f.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Divisor */}
                    <div style={{ width: 1, height: 24, background: 'var(--border-subtle)', flexShrink: 0 }} />

                    {/* Estado MA/PI — REQ-13 */}
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {([{ key: 'all', label: '🌎 Todos' }, { key: 'MA', label: '🟡 MA' }, { key: 'PI', label: '🟢 PI' }] as const).map(f => (
                            <button
                                key={f.key}
                                onClick={() => setStateFilter(f.key as any)}
                                style={{
                                    padding: '0.4rem 0.85rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', border: 'none',
                                    background: stateFilter === f.key ? 'rgba(255,214,0,0.15)' : 'transparent',
                                    color: stateFilter === f.key ? 'var(--neon-yellow)' : 'var(--text-muted)',
                                    outline: stateFilter === f.key ? '1px solid rgba(255,214,0,0.4)' : 'none',
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <AdminViewModeToggle mode={listViewMode} onChange={setListViewMode} />
            </div>

            {/* Table */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <style>{`
                    .turmas-drag { cursor: grab; overflow-x: auto; }
                    .turmas-drag:active { cursor: grabbing; }
                    .turmas-drag::-webkit-scrollbar { height: 5px; }
                    .turmas-drag::-webkit-scrollbar-track { background: rgba(255,214,0,0.05); }
                    .turmas-drag::-webkit-scrollbar-thumb { background: #FFD600; border-radius: 3px; }
                    @keyframes tSlide { from { left: 0; } to { left: 55%; } }
                `}</style>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'Orbitron', letterSpacing: '0.12em' }}>CARREGANDO TURMAS...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <FunnelIcon style={{ width: 36, height: 36, margin: '0 auto 0.75rem', opacity: 0.3 }} />
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', letterSpacing: '0.12em' }}>NENHUMA TURMA ENCONTRADA</p>
                    </div>
                ) : listViewMode === 'card' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, padding: 14 }}>
                        {filtered.map((item, idx) => {
                            const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.PLANNED;
                            const borderAccent = item.city?.state === 'MA' ? '#FFD600' : '#00F5FF';
                            return (
                                <div
                                    key={item.id}
                                    className="adm-kpi-card adm-scale-in"
                                    style={{
                                        animationDelay: `${idx * 30}ms`,
                                        background: '#fff',
                                        borderStyle: 'solid',
                                        borderWidth: '1px 1px 1px 4px',
                                        borderLeftColor: borderAccent,
                                        borderTopColor: `${cfg.border}`,
                                        borderRightColor: `${cfg.border}`,
                                        borderBottomColor: `${cfg.border}`,
                                    }}
                                >
                                    <div className="adm-kpi-grid" />
                                    <div className="adm-kpi-topline" style={{ background: `linear-gradient(90deg, transparent, ${borderAccent}, transparent)` }} />
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        title="Abrir módulo Gerenciar turma"
                                        onClick={() => setTurmaWorkspace({ view: 'detail', classId: item.id })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setTurmaWorkspace({ view: 'detail', classId: item.id });
                                            }
                                        }}
                                        style={{ position: 'relative', zIndex: 1, padding: '14px 14px 10px', cursor: 'pointer' }}
                                    >
                                        <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--neon-yellow)', fontSize: '0.85rem', marginBottom: 6 }}>{item.classIdentifier}</div>
                                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: 4 }}>{item.course?.name || '—'}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.city?.name || '—'} · {PERIOD_LABELS[item.period] || item.period}</div>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginTop: 4 }}>{item.startTime} – {item.endTime}</div>
                                        <div style={{ marginTop: 8 }}>
                                            <span style={{ padding: '0.25rem 0.6rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
                                        </div>
                                        <div style={{ fontSize: '0.72rem', marginTop: 8, fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)' }}>{new Date(item.startDate).toLocaleDateString('pt-BR')} → {new Date(item.endDate).toLocaleDateString('pt-BR')}</div>
                                        <div style={{ fontFamily: 'Orbitron', fontWeight: 800, color: 'var(--neon-yellow)', fontSize: '0.9rem', marginTop: 6 }}>{item.vacancies} vagas</div>
                                        {item.truck ? <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>Carreta: {item.truck.identifier}</div> : null}
                                    </div>
                                    <div style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(148,163,184,.22)', padding: '10px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        <button
                                            type="button"
                                            title="Editar dados da turma"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTurmaWorkspace({ view: 'detail', classId: item.id, openEditOnMount: true });
                                            }}
                                            style={{ padding: '0.4rem', borderRadius: 7, background: 'rgba(0,245,255,0.08)', color: 'var(--neon-cyan)', border: '1px solid rgba(0,245,255,0.2)', display: 'flex', cursor: 'pointer' }}
                                        >
                                            <PencilIcon style={{ width: 14, height: 14 }} />
                                        </button>
                                        <button
                                            type="button"
                                            title="Estatísticas e visão geral"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTurmaWorkspace({ view: 'stats', classId: item.id });
                                            }}
                                            style={{ padding: '0.4rem', borderRadius: 7, background: 'rgba(191,90,242,0.08)', color: 'var(--neon-purple)', border: '1px solid rgba(191,90,242,0.2)', display: 'flex', cursor: 'pointer' }}
                                        >
                                            <ChartBarIcon style={{ width: 14, height: 14 }} />
                                        </button>
                                        <button
                                            type="button"
                                            title="Alterar status"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenStatusModal(item);
                                            }}
                                            style={{
                                                padding: '0.4rem',
                                                borderRadius: 7,
                                                background: 'rgba(14,116,144,0.08)',
                                                color: '#0E7490',
                                                border: '1px solid rgba(14,116,144,0.22)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                            }}
                                        >
                                            <ArrowsRightLeftIcon style={{ width: 14, height: 14 }} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                item.status === 'CANCELLED' ? handleOpenStatusModal(item) : setDeleteClassId(item.id);
                                            }}
                                            title={item.status === 'CANCELLED' ? 'Reativar' : 'Cancelar turma'}
                                            style={{
                                                padding: '0.4rem',
                                                borderRadius: 7,
                                                background: item.status === 'CANCELLED' ? 'rgba(0,245,255,0.08)' : 'rgba(255,45,85,0.08)',
                                                color: item.status === 'CANCELLED' ? 'var(--neon-cyan)' : 'var(--neon-red)',
                                                border: item.status === 'CANCELLED' ? '1px solid rgba(0,245,255,0.2)' : '1px solid rgba(255,45,85,0.2)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                            }}
                                        >
                                            <ArrowPathIcon style={{ width: 14, height: 14 }} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div>
                    <div style={{ padding: '0.3rem 1rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ height: 3, flex: 1, borderRadius: 2, background: 'rgba(255,214,0,0.12)', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '35%', borderRadius: 2, background: '#FFD600', animation: 'tSlide 2s ease-in-out infinite alternate' }} />
                        </div>
                        <span style={{ fontSize: '0.58rem', color: '#B89B00', fontWeight: 700, whiteSpace: 'nowrap' }}>← arraste →</span>
                        <div style={{ height: 3, flex: 1, borderRadius: 2, background: 'rgba(255,214,0,0.12)' }} />
                    </div>
                    <div
                        className="turmas-drag"
                        ref={(el) => {
                            if (!el) return;
                            let isDragging = false, startX = 0, scrollLeft = 0;
                            el.onmousedown = (e) => { isDragging = true; startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft; };
                            el.onmouseleave = () => { isDragging = false; };
                            el.onmouseup = () => { isDragging = false; };
                            el.onmousemove = (e) => { if (!isDragging) return; e.preventDefault(); el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX); };
                        }}
                    >
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Turma</th>
                                    <th>Curso</th>
                                    <th>Cidade</th>
                                    <th>Período</th>
                                    <th>Datas</th>
                                    <th>Vagas</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((item) => {
                                    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.PLANNED;
                                    return (
                                        <tr
                                            key={item.id}
                                            onClick={() => setTurmaWorkspace({ view: 'detail', classId: item.id })}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td>
                                                <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--neon-yellow)', fontSize: '0.8rem' }}>{item.classIdentifier}</div>
                                                {item.truck && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Carreta: {item.truck.identifier}</div>}
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>{item.course?.name || '—'}</div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{item.group?.name || '—'}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{item.city?.name || '—'}</div>
                                                <span style={{
                                                    display: 'inline-block', marginTop: '0.1rem',
                                                    padding: '0.1rem 0.45rem', borderRadius: 100, fontSize: '0.6rem', fontWeight: 700,
                                                    background: item.city?.state === 'MA' ? 'rgba(255,214,0,0.08)' : 'rgba(0,245,255,0.08)',
                                                    color: item.city?.state === 'MA' ? 'var(--neon-yellow)' : 'var(--neon-cyan)',
                                                    border: `1px solid ${item.city?.state === 'MA' ? 'rgba(255,214,0,0.25)' : 'rgba(0,245,255,0.25)'}`,
                                                }}>{item.city?.state || '—'}</span>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '0.82rem' }}>{PERIOD_LABELS[item.period] || item.period}</div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginTop: '0.1rem' }}>{item.startTime} – {item.endTime}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)' }}>{new Date(item.startDate).toLocaleDateString('pt-BR')}</div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>→ {new Date(item.endDate).toLocaleDateString('pt-BR')}</div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{ fontFamily: 'Orbitron', fontWeight: 800, color: 'var(--neon-yellow)', fontSize: '1rem' }}>{item.vacancies}</span>
                                            </td>
                                            <td>
                                                <span style={{ padding: '0.25rem 0.6rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap' }}>
                                                    {cfg.label}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                    <button
                                                        type="button"
                                                        title="Editar dados da turma"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setTurmaWorkspace({ view: 'detail', classId: item.id, openEditOnMount: true });
                                                        }}
                                                        style={{ padding: '0.4rem', borderRadius: 7, background: 'rgba(0,245,255,0.08)', color: 'var(--neon-cyan)', border: '1px solid rgba(0,245,255,0.2)', display: 'flex', transition: 'all 0.2s', cursor: 'pointer' }}
                                                    >
                                                        <PencilIcon style={{ width: 14, height: 14 }} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title="Estatísticas e visão geral"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setTurmaWorkspace({ view: 'stats', classId: item.id });
                                                        }}
                                                        style={{ padding: '0.4rem', borderRadius: 7, background: 'rgba(191,90,242,0.08)', color: 'var(--neon-purple)', border: '1px solid rgba(191,90,242,0.2)', display: 'flex', transition: 'all 0.2s', cursor: 'pointer' }}
                                                    >
                                                        <ChartBarIcon style={{ width: 14, height: 14 }} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title="Alterar status"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenStatusModal(item);
                                                        }}
                                                        style={{
                                                            padding: '0.4rem',
                                                            borderRadius: 7,
                                                            background: 'rgba(14,116,144,0.08)',
                                                            color: '#0E7490',
                                                            border: '1px solid rgba(14,116,144,0.22)',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            transition: 'all 0.2s',
                                                        }}
                                                    >
                                                        <ArrowsRightLeftIcon style={{ width: 14, height: 14 }} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            item.status === 'CANCELLED' ? handleOpenStatusModal(item) : setDeleteClassId(item.id);
                                                        }}
                                                        title={item.status === 'CANCELLED' ? 'Reativar' : 'Cancelar turma'}
                                                        style={{
                                                            padding: '0.4rem',
                                                            borderRadius: 7,
                                                            background: item.status === 'CANCELLED' ? 'rgba(0,245,255,0.08)' : 'rgba(255,45,85,0.08)',
                                                            color: item.status === 'CANCELLED' ? 'var(--neon-cyan)' : 'var(--neon-red)',
                                                            border: item.status === 'CANCELLED' ? '1px solid rgba(0,245,255,0.2)' : '1px solid rgba(255,45,85,0.2)',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            transition: 'all 0.2s',
                                                        }}
                                                    >
                                                        <ArrowPathIcon style={{ width: 14, height: 14 }} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    </div>
                )}
            </div>
        </div>

        <ConfirmModal
            isOpen={!!deleteClassId}
            title="CANCELAR TURMA"
            message="Tem certeza que deseja cancelar esta turma? Depois você poderá reativar escolhendo um novo status."
            confirmLabel="Cancelar turma"
            danger
            loading={deleting}
            onConfirm={() => deleteClassId && handleDelete(deleteClassId)}
            onCancel={() => setDeleteClassId(null)}
        />

        {turmaWorkspace && typeof document !== 'undefined' &&
            createPortal(
                <div
                    className="fade-backdrop"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9998,
                        background: 'rgba(15,23,42,0.5)',
                        backdropFilter: 'blur(4px)',
                    }}
                    onClick={() => setTurmaWorkspace(null)}
                >
                    <div
                        className="slide-right"
                        style={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            bottom: 0,
                            width: '100%',
                            maxWidth: 920,
                            background: '#F1F5F9',
                            boxShadow: '-12px 0 48px rgba(0,0,0,0.2)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div
                            style={{
                                flexShrink: 0,
                                padding: '0.85rem 1.1rem',
                                borderBottom: '1px solid rgba(15,23,42,0.08)',
                                background: 'linear-gradient(135deg, #FFD600 0%, #F59E0B 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.75rem',
                            }}
                        >
                            <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.72rem', color: '#0F172A', letterSpacing: '0.1em' }}>
                                {turmaWorkspace.view === 'detail' ? 'MÓDULO — GERENCIAR TURMA' : 'MÓDULO — ESTATÍSTICAS'}
                            </span>
                            <button
                                type="button"
                                aria-label="Fechar módulo"
                                onClick={() => setTurmaWorkspace(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#0F172A', lineHeight: 1 }}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', WebkitOverflowScrolling: 'touch' }}>
                            {turmaWorkspace.view === 'detail' ? (
                                <TurmaDetailWorkspace
                                    classId={turmaWorkspace.classId}
                                    mode="drawer"
                                    openEditOnMount={!!turmaWorkspace.openEditOnMount}
                                    onClose={() => setTurmaWorkspace(null)}
                                    onUpdated={loadClasses}
                                    onRequestStats={() =>
                                        setTurmaWorkspace({ view: 'stats', classId: turmaWorkspace.classId })
                                    }
                                />
                            ) : (
                                <TurmaEstatisticasWorkspace
                                    classId={turmaWorkspace.classId}
                                    mode="drawer"
                                    onClose={() => setTurmaWorkspace(null)}
                                    onBackToTurma={() =>
                                        setTurmaWorkspace({ view: 'detail', classId: turmaWorkspace.classId })
                                    }
                                />
                            )}
                        </div>
                    </div>
                </div>,
                document.body,
            )}

        {statusModalClass && (
            <div
                className="modal-overlay"
                onClick={() => setStatusModalClass(null)}
                style={{ zIndex: 10050 }}
            >
                <div className="modal-content modal-content--sm" onClick={e => e.stopPropagation()}>
                    <h3 style={{ fontFamily: 'Orbitron', fontSize: '0.95rem', marginBottom: 10, color: '#111827' }}>
                        Alterar status da turma
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                        Turma: <strong style={{ fontFamily: 'JetBrains Mono' }}>{statusModalClass.classIdentifier}</strong>
                    </p>
                    <div className="modal-status-options" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                        {ALL_CLASS_STATUSES.map((s) => {
                            const c = STATUS_CONFIG[s] || STATUS_CONFIG.PLANNED;
                            const isSelected = statusTarget === s;
                            return (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setStatusTarget(s)}
                                    style={{
                                        padding: '0.65rem 1rem',
                                        borderRadius: 10,
                                        cursor: 'pointer',
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        minWidth: 0,
                                        display: 'grid',
                                        gridTemplateColumns: 'auto 1fr auto',
                                        alignItems: 'center',
                                        gap: 10,
                                        border: `1.5px solid ${isSelected ? c.color : '#E5E7EB'}`,
                                        background: isSelected ? c.bg : 'transparent',
                                        textAlign: 'left',
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: '50%',
                                            background: c.color,
                                            flexShrink: 0,
                                            boxShadow: isSelected ? `0 0 8px ${c.color}` : 'none',
                                        }}
                                    />
                                    <span
                                        style={{
                                            fontSize: '0.82rem',
                                            fontWeight: 700,
                                            color: isSelected ? c.color : '#374151',
                                            minWidth: 0,
                                            overflowWrap: 'break-word',
                                        }}
                                    >
                                        {c.label}
                                    </span>
                                    {(statusDetail?.status ?? statusModalClass.status) === s ? (
                                        <span style={{ fontSize: '0.65rem', color: '#9CA3AF', whiteSpace: 'nowrap' }}>Atual</span>
                                    ) : (
                                        <span />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {statusDetailLoading ? (
                        <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: 14 }}>Carregando verificações…</p>
                    ) : statusDetail ? (
                        statusReadinessWarnings.length > 0 ? (
                            <div
                                style={{
                                    marginBottom: 16,
                                    padding: '0.75rem 0.9rem',
                                    borderRadius: 10,
                                    background: '#FFFBEB',
                                    border: '1px solid #FDE68A',
                                }}
                            >
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#92400E', letterSpacing: '0.06em', marginBottom: 8 }}>
                                    Antes de confirmar
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#78350F', fontSize: '0.78rem', lineHeight: 1.45 }}>
                                    {statusReadinessWarnings.map((w) => (
                                        <li key={w.code} style={{ marginBottom: 6 }}>
                                            <strong>{w.severity === 'warning' ? 'Atenção: ' : 'Info: '}</strong>
                                            {w.message}
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href="/admin/acoes"
                                    style={{
                                        display: 'inline-block',
                                        marginTop: 8,
                                        fontSize: '0.76rem',
                                        fontWeight: 700,
                                        color: '#B45309',
                                    }}
                                >
                                    Abrir períodos de curso →
                                </Link>
                            </div>
                        ) : (
                            <div
                                style={{
                                    marginBottom: 16,
                                    padding: '0.75rem 0.9rem',
                                    borderRadius: 10,
                                    background: '#ECFDF5',
                                    border: '1px solid #A7F3D0',
                                }}
                            >
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#047857', letterSpacing: '0.06em', marginBottom: 6 }}>
                                    Verificação rápida
                                </div>
                                <p style={{ margin: 0, color: '#065F46', fontSize: '0.78rem', lineHeight: 1.45, fontWeight: 600 }}>
                                    Com os dados atuais, não há inconsistências para o estado que escolheu. Pode confirmar.
                                </p>
                            </div>
                        )
                    ) : (
                        <p style={{ fontSize: '0.76rem', color: '#94A3B8', marginBottom: 14 }}>
                            Não foi possível carregar o detalhe da turma para verificações automáticas.
                        </p>
                    )}

                    <div className="modal-actions-row">
                        <button type="button" className="btn-ghost" onClick={() => setStatusModalClass(null)}>
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={handleSaveStatus}
                            disabled={statusSaving || statusTarget === (statusDetail?.status ?? statusModalClass.status)}
                        >
                            {statusSaving ? 'Salvando...' : 'Confirmar'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
