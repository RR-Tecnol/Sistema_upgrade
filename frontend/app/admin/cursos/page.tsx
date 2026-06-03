'use client';

import { useEffect, useMemo, useState } from 'react';
import { coursesApi, Course } from '@/lib/api/courses';
import { toast } from '@/components/ui/Toast';
import {
    PlusIcon,
    MagnifyingGlassIcon,
    EyeIcon,
    ClockIcon,
    AcademicCapIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AdminCollapsibleTutorial, { type AdminTutorialStep } from '@/components/admin/AdminCollapsibleTutorial';
import AdminViewModeToggle from '@/components/admin/AdminViewModeToggle';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { usePersistedAdminViewMode } from '@/hooks/usePersistedAdminViewMode';
import { AdminListPagination } from '@/components/admin/AdminListPagination';
import { normalizePaginated, ADMIN_PAGE_SIZE_CARDS } from '@/lib/api/pagination';

/* ── Course accent colors ── */
const ACCENTS = [
    { color: '#B89B00', bg: '#FFFDE7', border: '#FEF08A' },
    { color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD' },
    { color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
    { color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
    { color: '#0369A1', bg: '#EFF6FF', border: '#BFDBFE' },
];

/* ── Drag-to-scroll hook for table containers ── */
function useDragScroll() {
    return (el: HTMLDivElement | null) => {
        if (!el) return;
        let isDragging = false, startX = 0, scrollLeft = 0;
        el.onmousedown = (e) => { isDragging = true; startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft; el.style.cursor = 'grabbing'; };
        el.onmouseleave = () => { isDragging = false; el.style.cursor = 'grab'; };
        el.onmouseup = () => { isDragging = false; el.style.cursor = 'grab'; };
        el.onmousemove = (e) => { if (!isDragging) return; e.preventDefault(); el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX); };
    };
}

const COURSES_TUTORIAL_STEPS: AdminTutorialStep[] = [
    {
        num: '1',
        color: '#3B82F6',
        title: 'Cadastro e edição do curso',
        body: (
            <>
                Use <strong>Novo Curso</strong> para cadastrar. No botão <strong>Editar</strong>, ajuste nome, descrição, carga horária,
                disponibilidade por estado (MA/PI) e tipo (multicurso/único).
            </>
        ),
    },
    {
        num: '2',
        color: '#F59E0B',
        title: 'Ativação e inativação sem perder histórico',
        body: (
            <>
                O botão <strong>Inativar/Reativar</strong> muda a disponibilidade operacional do curso sem apagar dados históricos,
                turmas já criadas ou vínculos anteriores.
            </>
        ),
    },
    {
        num: '3',
        color: '#10B981',
        title: 'Cards do topo são filtros clicáveis',
        body: (
            <>
                Os KPIs de <strong>Total</strong>, <strong>Ativos</strong>, <strong>Inativos</strong>, <strong>MA</strong> e <strong>PI</strong> funcionam
                como filtros rápidos. Clique no card para aplicar o recorte da lista automaticamente.
            </>
        ),
    },
    {
        num: '4',
        color: '#8B5CF6',
        title: 'Busca e filtros combinados',
        body: (
            <>
                Combine busca por texto + filtro de estado + tipo de curso e alterne entre visualização em
                <strong> Tabela</strong> e <strong>Cards</strong> para análise operacional.
            </>
        ),
    },
    {
        num: '5',
        color: '#EF4444',
        title: 'Conexão com outras áreas do sistema',
        body: (
            <>
                Cursos alimentam diretamente <strong>Turmas</strong>, impactam o fluxo de <strong>Inscrições</strong> e
                refletem em <strong>Certificados</strong>, frequência e relatórios acadêmicos.
            </>
        ),
    },
    {
        num: '6',
        color: '#0EA5E9',
        title: 'Pontos de atenção (Admin/Coordenação)',
        body: (
            <>
                Alterações de carga horária, estado e status do curso podem afetar elegibilidade, regras de
                conclusão e emissão de certificados. Sempre revise os impactos antes de publicar mudanças.
            </>
        ),
    },
];

const formatWorkload = (course: Course) => {
    const maRule = course.stateConfig?.MA;
    const piRule = course.stateConfig?.PI;
    const maHours = maRule?.available ? maRule.workloadHours : null;
    const piHours = piRule?.available ? piRule.workloadHours : null;

    if (maHours !== null && piHours !== null) {
        if (maHours === piHours) {
            return `${maHours}h`;
        }
        return `MA: ${maHours}h | PI: ${piHours}h`;
    }
    if (maHours !== null) return `MA: ${maHours}h`;
    if (piHours !== null) return `PI: ${piHours}h`;
    return `${course.workloadHours || course.workload || 0}h`;
};

export default function CursosPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [summaryMeta, setSummaryMeta] = useState({ active: 0, inactive: 0, multicourse: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [hovered, setHovered] = useState<string | null>(null);
    const [listViewMode, setListViewMode] = usePersistedAdminViewMode('admin:cursos:list', 'table');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [stateFilter, setStateFilter] = useState<string>('all');
    const [multicourseFilter, setMulticourseFilter] = useState<'all' | 'multi' | 'single'>('all');
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const dragScrollRef = useDragScroll();

    useEffect(() => { setPage(1); }, [search, statusFilter, stateFilter, multicourseFilter]);

    useEffect(() => { loadCourses(); }, [page, search, statusFilter, stateFilter, multicourseFilter]);

    const loadCourses = async () => {
        try {
            setLoading(true);
            const [raw, actR, inactR, multiR] = await Promise.all([
                coursesApi.getAll({
                    search: search.trim() || undefined,
                    active: statusFilter === 'all' ? undefined : statusFilter === 'active',
                    state: stateFilter === 'all' ? undefined : stateFilter,
                    isMulticourse: multicourseFilter === 'all' ? undefined : multicourseFilter === 'multi',
                    page,
                    limit: ADMIN_PAGE_SIZE_CARDS,
                }),
                coursesApi.getAll({ active: true, limit: 1, page: 1 }),
                coursesApi.getAll({ active: false, limit: 1, page: 1 }),
                coursesApi.getAll({ isMulticourse: true, limit: 1, page: 1 }),
            ]);
            const norm = normalizePaginated<Course>(raw, ADMIN_PAGE_SIZE_CARDS);
            setCourses(norm.data.sort((a, b) => {
                if (a.active !== b.active) return a.active ? -1 : 1;
                return a.name.localeCompare(b.name, 'pt-BR');
            }));
            setTotal(norm.total);
            setTotalPages(norm.totalPages);
            setSummaryMeta({
                active: normalizePaginated<Course>(actR, 1).total,
                inactive: normalizePaginated<Course>(inactR, 1).total,
                multicourse: normalizePaginated<Course>(multiR, 1).total,
            });
        } catch { /* noop */ } finally { setLoading(false); }
    };

    const handleToggleActive = async (course: Course) => {
        try {
            setTogglingId(course.id);
            await coursesApi.setActive(course.id, !course.active);
            await loadCourses();
            toast.success(course.active ? 'Curso movido para inativo.' : 'Curso reativado com sucesso!');
        } catch {
            toast.error('Erro ao atualizar status do curso.');
        } finally {
            setTogglingId(null);
        }
    };

    const detectedStates = useMemo(() => {
        const dynamic = new Set<string>();
        for (const c of courses) {
            const cfg = c.stateConfig || {};
            Object.entries(cfg).forEach(([uf, rule]) => {
                if (rule?.available) dynamic.add(uf.toUpperCase());
            });
            if (c.availableInMA) dynamic.add('MA');
            if (c.availableInPI) dynamic.add('PI');
        }
        return Array.from(dynamic).sort();
    }, [courses]);

    const summary = useMemo(() => {
        const totalHours = courses.reduce((s, c) => s + (c.workloadHours || c.workload || 0), 0);
        return {
            active: summaryMeta.active,
            inactive: summaryMeta.inactive,
            multicourse: summaryMeta.multicourse,
            totalHours,
            statesCount: detectedStates.length,
        };
    }, [courses, detectedStates.length, summaryMeta]);

    const filtered = courses;

    return (
        <>
        <style>{`
            .drag-scroll { cursor: grab; overflow-x: auto; user-select: none; }
            .drag-scroll::-webkit-scrollbar { height: 5px; }
            .drag-scroll::-webkit-scrollbar-track { background: #FFFDE7; }
            .drag-scroll::-webkit-scrollbar-thumb { background: #FFD600; border-radius: 3px; }
            @keyframes scrollHint { from { left: 0; } to { left: 55%; } }
            @keyframes scrollHintR { from { right: 0; } to { right: 55%; } }
            .cursos-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.85rem; }
            .cursos-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
            .cursos-filter-bar { background: #FFFFFF; border-radius: 14px; border: 1px solid #E5E7EB; padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.75rem; box-shadow: 0 1px 4px rgba(0,0,0,0.05); flex-wrap: wrap; }
            .cursos-filter-search { flex: 1; min-width: 160px; position: relative; }
            .cursos-filter-selects { display: flex; gap: 0.5rem; flex-wrap: wrap; }
            .cursos-filter-toggle { display: flex; align-items: center; gap: 0.5rem; }
            @media (max-width: 640px) {
                .cursos-kpi-grid { grid-template-columns: repeat(2, 1fr); }
                .cursos-card-grid { grid-template-columns: 1fr; }
                .cursos-filter-bar { flex-direction: column; align-items: stretch; gap: 0.6rem; }
                .cursos-filter-search { width: 100%; min-width: unset; }
                .cursos-filter-selects { width: 100%; }
                .cursos-filter-selects select { flex: 1; }
                .cursos-filter-toggle { justify-content: flex-end; }
            }
        `}</style>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">

            <AdminHeaderHero
                title="CURSOS"
                subtitle="Gerencie os cursos profissionalizantes do programa"
                rightSlot={(
                    <Link href="/admin/cursos/novo" className="btn-primary" style={{ textDecoration: 'none' }}>
                        <PlusIcon style={{ width: 15, height: 15 }} />
                        Novo Curso
                    </Link>
                )}
            />
            <AdminCollapsibleTutorial
                storageKey="courses-tutorial-expanded"
                emoji="🎓"
                title="COMO USAR A ÁREA DE CURSOS"
                steps={COURSES_TUTORIAL_STEPS}
            />

            {/* ── KPI STRIP ── */}
            <div className="cursos-kpi-grid">
                {[
                    {
                        key: 'all',
                        label: 'Total de Cursos',
                        value: total,
                        suffix: '',
                        color: '#B89B00',
                        bg: '#FFFDE7',
                        border: '#FEF08A',
                        active: statusFilter === 'all',
                        onClick: () => setStatusFilter('all'),
                    },
                    {
                        key: 'active',
                        label: 'Cursos Ativos',
                        value: summary.active,
                        suffix: '',
                        color: '#059669',
                        bg: '#F0FDF4',
                        border: '#BBF7D0',
                        active: statusFilter === 'active',
                        onClick: () => setStatusFilter('active'),
                    },
                    {
                        key: 'inactive',
                        label: 'Cursos Inativos',
                        value: summary.inactive,
                        suffix: '',
                        color: '#DC2626',
                        bg: '#FEF2F2',
                        border: '#FECACA',
                        active: statusFilter === 'inactive',
                        onClick: () => setStatusFilter('inactive'),
                    },
                    {
                        key: 'states',
                        label: 'Estados Cobertos',
                        value: summary.statesCount,
                        suffix: '',
                        color: '#0891B2',
                        bg: '#F0F9FF',
                        border: '#BAE6FD',
                        active: false,
                        onClick: undefined,
                    },
                    {
                        key: 'hours',
                        label: 'Carga Horária Total',
                        value: summary.totalHours,
                        suffix: 'h',
                        color: '#7C3AED',
                        bg: '#F5F3FF',
                        border: '#DDD6FE',
                        active: false,
                        onClick: undefined,
                    },
                ].map((s, i) => (
                    <button
                        key={s.key}
                        onClick={s.onClick}
                        type="button"
                        style={{
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            textAlign: 'left',
                            cursor: s.onClick ? 'pointer' : 'default',
                            transform: s.active ? 'translateY(-2px)' : 'none',
                        }}
                    >
                    <AnimatedKpiCard
                        label={s.label}
                        value={s.value}
                        suffix={s.suffix}
                        color={s.color}
                        bg={s.bg}
                        border={s.border}
                        delayMs={i * 60}
                    />
                    </button>
                ))}
            </div>

            {/* ── FILTER BAR ── */}
            <div className="cursos-filter-bar">
                <div className="cursos-filter-search">
                    <MagnifyingGlassIcon style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#9CA3AF' }} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou descrição..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                            borderRadius: 9, border: '1.5px solid #E5E7EB',
                            background: '#F9FAFB', fontSize: '0.82rem', color: '#111827',
                            outline: 'none', transition: 'border-color 0.2s',
                        }}
                        onFocus={e => (e.target as HTMLElement).style.borderColor = '#FFD600'}
                        onBlur={e => (e.target as HTMLElement).style.borderColor = '#E5E7EB'}
                    />
                </div>
                <div className="cursos-filter-selects">
                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF', whiteSpace: 'nowrap', alignSelf: 'center' }}>
                        {filtered.length} curso{filtered.length !== 1 ? 's' : ''}
                    </div>
                    <select
                        value={stateFilter}
                        onChange={e => setStateFilter(e.target.value)}
                        style={{ padding: '0.4rem 0.6rem', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', fontSize: '0.75rem' }}
                    >
                        <option value="all">Todos os estados</option>
                        {detectedStates.map(uf => (
                            <option key={uf} value={uf}>{uf}</option>
                        ))}
                    </select>
                    <select
                        value={multicourseFilter}
                        onChange={e => setMulticourseFilter(e.target.value as 'all' | 'multi' | 'single')}
                        style={{ padding: '0.4rem 0.6rem', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', fontSize: '0.75rem' }}
                    >
                        <option value="all">Todos os tipos</option>
                        <option value="multi">Multicurso</option>
                        <option value="single">Curso único</option>
                    </select>
                </div>
                <div className="cursos-filter-toggle">
                    <AdminViewModeToggle mode={listViewMode} onChange={setListViewMode} />
                </div>
            </div>

            {/* ── LOADING ── */}
            {loading && (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO CURSOS...</p>
                </div>
            )}

            {/* ── EMPTY ── */}
            {!loading && filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: '4rem', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB' }}>
                    <AcademicCapIcon style={{ width: 40, height: 40, color: '#D1D5DB', margin: '0 auto 1rem' }} />
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: '#9CA3AF' }}>
                        {search ? 'NENHUM CURSO ENCONTRADO' : 'NENHUM CURSO CADASTRADO'}
                    </p>
                </div>
            )}

            {/* ── TABLE VIEW (com drag-to-scroll) ── */}
            {!loading && filtered.length > 0 && listViewMode === 'table' && (
                <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    {/* Barra de scroll amarela */}
                    <div style={{ padding: '0.35rem 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ height: 3, flex: 1, borderRadius: 2, background: '#FEF08A', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '35%', borderRadius: 2, background: '#FFD600', animation: 'scrollHint 2s ease-in-out infinite alternate' }} />
                        </div>
                        <span style={{ fontSize: '0.58rem', color: '#B89B00', fontWeight: 700, whiteSpace: 'nowrap' }}>← arraste →</span>
                        <div style={{ height: 3, flex: 1, borderRadius: 2, background: '#FEF08A', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: '35%', borderRadius: 2, background: '#FFD600', animation: 'scrollHintR 2s ease-in-out infinite alternate' }} />
                        </div>
                    </div>
                    <div className="drag-scroll" ref={dragScrollRef}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
                            <thead>
                                <tr style={{ background: '#FFFDE7', borderBottom: '2px solid #FEF08A' }}>
                                    {['Curso', 'Carga Horária', 'Turmas', 'Multicurso', 'Status', 'Ações'].map(h => (
                                        <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#B89B00', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((course, idx) => {
                                    const acc = ACCENTS[idx % ACCENTS.length];
                                    const isHov = hovered === course.id;
                                    const initials = course.name.split(' ').filter((w: string) => w.length > 2).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                                    return (
                                        <tr key={course.id}
                                            className="animate-fade-in"
                                            style={{ animationDelay: `${idx * 25}ms`, borderBottom: '1px solid #F3F4F6', background: isHov ? '#FFFDE7' : '#FFFFFF', transition: 'background 0.15s' }}
                                            onMouseEnter={() => setHovered(course.id)}
                                            onMouseLeave={() => setHovered(null)}
                                        >
                                            <td style={{ padding: '0.7rem 1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{ width: 34, height: 34, borderRadius: 9, background: acc.bg, border: `1.5px solid ${acc.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.6rem', color: acc.color, flexShrink: 0 }}>
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{course.name}</div>
                                                        <div style={{ fontSize: '0.72rem', color: '#9CA3AF', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.description}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.7rem 1rem', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <ClockIcon style={{ width: 13, height: 13, color: acc.color, flexShrink: 0 }} />
                                                    <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.82rem', color: acc.color }}>{formatWorkload(course)}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.7rem 1rem' }}>
                                                <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.85rem', color: '#374151' }}>{course._count?.classes || 0}</span>
                                            </td>
                                            <td style={{ padding: '0.7rem 1rem' }}>
                                                {course.isMulticourse
                                                    ? <span style={{ padding: '0.2rem 0.55rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, background: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA' }}>SIM</span>
                                                    : <span style={{ fontSize: '0.72rem', color: '#D1D5DB' }}>—</span>
                                                }
                                            </td>
                                            <td style={{ padding: '0.7rem 1rem', whiteSpace: 'nowrap' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                                    padding: '0.2rem 0.65rem', borderRadius: 100, fontSize: '0.68rem', fontWeight: 700,
                                                    background: course.active ? '#DCFCE7' : '#F3F4F6',
                                                    color: course.active ? '#15803D' : '#9CA3AF',
                                                    border: `1px solid ${course.active ? '#BBF7D0' : '#E5E7EB'}`,
                                                }}>
                                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: course.active ? '#15803D' : '#D1D5DB', display: 'inline-block' }} />
                                                    {course.active ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.7rem 1rem', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                    <Link href={`/admin/cursos/${course.id}`}
                                                        style={{ padding: '0.4rem 0.75rem', borderRadius: 8, background: '#FFFDE7', border: '1px solid #FEF08A', color: '#92730A', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'background 0.15s' }}
                                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEF08A'}
                                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FFFDE7'}
                                                    >
                                                        <EyeIcon style={{ width: 13, height: 13 }} />
                                                        Ver
                                                    </Link>
                                                    <Link href={`/admin/cursos/${course.id}?edit=1`}
                                                        style={{ padding: '0.4rem 0.75rem', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'background 0.15s' }}
                                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#DBEAFE'}
                                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#EFF6FF'}
                                                    >
                                                        ✏️ Editar
                                                    </Link>
                                                    <button
                                                        onClick={() => handleToggleActive(course)}
                                                        disabled={togglingId === course.id}
                                                        style={{
                                                            padding: '0.4rem 0.75rem',
                                                            borderRadius: 8,
                                                            background: course.active ? '#F3F4F6' : '#ECFDF5',
                                                            border: `1px solid ${course.active ? '#E5E7EB' : '#BBF7D0'}`,
                                                            color: course.active ? '#6B7280' : '#15803D',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.3rem',
                                                            opacity: togglingId === course.id ? 0.6 : 1,
                                                        }}
                                                    >
                                                        <CheckCircleIcon style={{ width: 13, height: 13 }} />
                                                        {togglingId === course.id ? '...' : course.active ? 'Inativar' : 'Reativar'}
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

            {/* ── GRID / CARD VIEW ── */}
            {!loading && filtered.length > 0 && listViewMode === 'card' && (
                <div className="cursos-card-grid">
                    {filtered.map((course, idx) => {
                        const acc = ACCENTS[idx % ACCENTS.length];
                        const initials = course.name.split(' ').filter((w: string) => w.length > 2).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                        return (
                            <div key={course.id}
                                className="animate-scale-in"
                                style={{
                                    animationDelay: `${idx * 50}ms`,
                                    background: '#FFFFFF',
                                    borderRadius: 14,
                                    border: `1px solid ${acc.border}`,
                                    borderTop: `3px solid ${acc.color}`,
                                    overflow: 'hidden',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                                    (e.currentTarget as HTMLElement).style.boxShadow = `0 10px 28px ${acc.color}30`;
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.transform = '';
                                    (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
                                }}
                            >
                                <div style={{ padding: '1rem', background: acc.bg }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                                        <div style={{ width: 38, height: 38, borderRadius: 10, background: acc.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.72rem' }}>
                                            {initials}
                                        </div>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                            padding: '0.15rem 0.55rem', borderRadius: 100, fontSize: '0.62rem', fontWeight: 700,
                                            background: course.active ? '#DCFCE7' : '#F3F4F6',
                                            color: course.active ? '#15803D' : '#9CA3AF',
                                            border: `1px solid ${course.active ? '#BBF7D0' : '#E5E7EB'}`,
                                        }}>
                                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: course.active ? '#15803D' : '#D1D5DB', display: 'inline-block' }} />
                                            {course.active ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </div>
                                    <div style={{ fontWeight: 800, color: '#111827', fontSize: '0.9rem', lineHeight: 1.3, marginBottom: '0.3rem' }}>{course.name}</div>
                                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>{course.description}</div>
                                    
                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '0.8rem', 
                                        marginTop: '0.75rem', 
                                        paddingTop: '0.6rem', 
                                        borderTop: '1px dashed rgba(0,0,0,0.06)' 
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <ClockIcon style={{ width: 12, height: 12, color: acc.color, flexShrink: 0 }} />
                                            <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.7rem', color: acc.color, whiteSpace: 'nowrap' }}>
                                                {formatWorkload(course)}
                                            </span>
                                        </div>
                                        <div style={{ width: 1, height: 12, background: 'rgba(0,0,0,0.1)' }} />
                                        <div style={{ fontSize: '0.72rem', color: '#6B7280', whiteSpace: 'nowrap' }}>
                                            <strong>{course._count?.classes || 0}</strong> {course._count?.classes === 1 ? 'turma' : 'turmas'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ 
                                    padding: '0.6rem 0.8rem', 
                                    borderTop: `1px solid ${acc.border}`, 
                                    display: 'flex', 
                                    gap: '0.35rem', 
                                    background: '#FBFBFB' 
                                }}>
                                    <Link href={`/admin/cursos/${course.id}`}
                                        style={{ 
                                            flex: 1, 
                                            justifyContent: 'center', 
                                            padding: '0.4rem 0', 
                                            borderRadius: 7, 
                                            background: '#FFFDE7', 
                                            border: '1px solid #FEF08A', 
                                            color: '#92730A', 
                                            fontSize: '0.7rem', 
                                            fontWeight: 700, 
                                            textDecoration: 'none', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '0.3rem' 
                                        }}>
                                        <EyeIcon style={{ width: 12, height: 12 }} />
                                        Ver
                                    </Link>
                                    <Link href={`/admin/cursos/${course.id}?edit=1`}
                                        style={{ 
                                            padding: '0.4rem 0.55rem', 
                                            borderRadius: 7, 
                                            background: '#EFF6FF', 
                                            border: '1px solid #BFDBFE', 
                                            color: '#1D4ED8', 
                                            fontSize: '0.7rem', 
                                            textDecoration: 'none', 
                                            cursor: 'pointer', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center' 
                                        }}>
                                        ✏️
                                    </Link>
                                    <button
                                        onClick={() => handleToggleActive(course)}
                                        disabled={togglingId === course.id}
                                        style={{
                                            flex: 1.2, 
                                            justifyContent: 'center',
                                            padding: '0.4rem 0', 
                                            borderRadius: 7,
                                            background: course.active ? '#F3F4F6' : '#ECFDF5',
                                            border: `1px solid ${course.active ? '#E5E7EB' : '#BBF7D0'}`,
                                            color: course.active ? '#6B7280' : '#15803D',
                                            fontSize: '0.7rem', 
                                            fontWeight: 700, 
                                            cursor: 'pointer',
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '0.25rem',
                                            opacity: togglingId === course.id ? 0.6 : 1,
                                        }}
                                    >
                                        <CheckCircleIcon style={{ width: 12, height: 12, flexShrink: 0 }} />
                                        <span style={{ whiteSpace: 'nowrap' }}>
                                            {togglingId === course.id ? '...' : course.active ? 'Inativar' : 'Reativar'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <AdminListPagination
                page={page}
                totalPages={totalPages}
                total={total}
                loading={loading}
                onPageChange={setPage}
                itemLabel="curso(s)"
            />
        </div>

        </>
    );
}
