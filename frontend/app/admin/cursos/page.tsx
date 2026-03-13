'use client';

import { useEffect, useState, useRef } from 'react';
import { coursesApi, Course } from '@/lib/api/courses';
import {
    PlusIcon,
    MagnifyingGlassIcon,
    TrashIcon,
    EyeIcon,
    ClockIcon,
    AcademicCapIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

/* ── Modal de confirmação de exclusão (layout padrão do sistema) ── */
function ModalExclusao({ nome, onConfirm, onCancel }: { nome: string; onConfirm: () => void; onCancel: () => void }) {
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={onCancel}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', animation: 'slideUp 0.2s' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ padding: '18px 24px 14px', background: '#FEF2F2', borderBottom: '1px solid #FECACA', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrashIcon style={{ width: 18, height: 18, color: '#fff' }} />
                    </div>
                    <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 900, color: '#111827', margin: 0 }}>EXCLUIR CURSO</h2>
                    <button onClick={onCancel} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
                </div>
                <div style={{ padding: '20px 24px' }}>
                    <p style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
                        Tem certeza que deseja excluir o curso <strong>"{nome}"</strong>? Esta ação não pode ser desfeita. Cursos vinculados a turmas ativas não podem ser excluídos.
                    </p>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button onClick={onCancel} style={{ padding: '9px 20px', background: 'transparent', border: '1px solid #E5E7EB', color: '#6B7280', borderRadius: 9, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Cancelar</button>
                        <button onClick={onConfirm} style={{ padding: '9px 20px', background: '#DC2626', border: 'none', color: '#fff', borderRadius: 9, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <TrashIcon style={{ width: 14, height: 14 }} /> Excluir
                        </button>
                    </div>
                </div>
            </div>
            <style>{`@keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </div>
    );
}

/* ── Animated count-up ── */
function useCountUp(target: number, duration = 900) {
    const [count, setCount] = useState(0);
    const raf = useRef(0);
    useEffect(() => {
        if (target === 0) { setCount(0); return; }
        const start = Date.now();
        const tick = () => {
            const p = Math.min((Date.now() - start) / duration, 1);
            setCount(Math.round((1 - Math.pow(1 - p, 3)) * target));
            if (p < 1) raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf.current);
    }, [target, duration]);
    return count;
}

/* ── Course accent colors (no purple) ── */
const ACCENTS = [
    { color: '#B89B00', bg: '#FFFDE7', border: '#FEF08A' },  // yellow
    { color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD' },  // cyan
    { color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },  // green
    { color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },  // orange
    { color: '#0369A1', bg: '#EFF6FF', border: '#BFDBFE' },  // blue
];

export default function CursosPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [hovered, setHovered] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
    const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);

    useEffect(() => { loadCourses(); }, []);

    const loadCourses = async () => {
        try { setLoading(true); setCourses(await coursesApi.getAll()); }
        catch { /* noop */ } finally { setLoading(false); }
    };

    const handleDelete = async (course: Course) => {
        try { await coursesApi.delete(course.id); setDeletingCourse(null); loadCourses(); } catch { alert('Erro ao excluir curso. Verifique se há turmas vinculadas.'); setDeletingCourse(null); }
    };

    const filtered = courses.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase())
    );

    const totalHours = courses.reduce((s, c) => s + (c.workloadHours || c.workload || 0), 0);
    const activeCount = courses.filter(c => c.active).length;

    const nTotal = useCountUp(courses.length);
    const nActive = useCountUp(activeCount);
    const nHours = useCountUp(totalHours);

    return (
        <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">

            {/* ── HEADER ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontFamily: 'Orbitron', fontSize: '2rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '0.3rem' }}>CURSOS</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Gerencie os cursos profissionalizantes do programa</p>
                </div>
                <Link href="/admin/cursos/novo" className="btn-primary" style={{ textDecoration: 'none' }}>
                    <PlusIcon style={{ width: 15, height: 15 }} />
                    Novo Curso
                </Link>
            </div>

            {/* ── KPI STRIP ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
                {[
                    { label: 'Total de Cursos', value: nTotal, suffix: '', color: '#B89B00', bg: '#FFFDE7', border: '#FEF08A' },
                    { label: 'Cursos Ativos', value: nActive, suffix: '', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
                    { label: 'Carga Horária Total', value: nHours, suffix: 'h', color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD' },
                ].map((s, i) => (
                    <div key={i} className="animate-scale-in" style={{
                        animationDelay: `${i * 60}ms`,
                        padding: '1rem 1.25rem',
                        borderRadius: 14, background: s.bg, border: `1px solid ${s.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <div>
                            <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: s.color, opacity: 0.65, marginBottom: '0.25rem' }}>{s.label}</div>
                            <div style={{ fontFamily: 'Orbitron', fontSize: '1.75rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>
                                {s.value}{s.suffix}
                            </div>
                        </div>
                        <div style={{ width: 3, height: 44, borderRadius: 2, background: s.color, opacity: 0.2 }} />
                    </div>
                ))}
            </div>

            {/* ── FILTER BAR (search + view toggle) ── */}
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ flex: 1, position: 'relative' }}>
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
                <div style={{ fontSize: '0.72rem', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                    {filtered.length} curso{filtered.length !== 1 ? 's' : ''}
                </div>
                <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />
                {/* View toggle */}
                {['table', 'grid'].map(m => (
                    <button key={m} onClick={() => setViewMode(m as any)}
                        title={m === 'table' ? 'Tabela' : 'Cards'}
                        style={{
                            padding: '0.45rem 0.65rem', borderRadius: 8, border: 'none', cursor: 'pointer', transition: 'all 0.18s',
                            background: viewMode === m ? '#FFD600' : '#F3F4F6',
                            color: viewMode === m ? '#000' : '#9CA3AF',
                        }}>
                        {m === 'table'
                            ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="3" rx="1" fill="currentColor" /><rect x="8" y="1" width="5" height="3" rx="1" fill="currentColor" /><rect x="1" y="5.5" width="5" height="3" rx="1" fill="currentColor" /><rect x="8" y="5.5" width="5" height="3" rx="1" fill="currentColor" /><rect x="1" y="10" width="5" height="3" rx="1" fill="currentColor" /><rect x="8" y="10" width="5" height="3" rx="1" fill="currentColor" /></svg>
                            : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" /><rect x="7.5" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" /><rect x="1" y="7.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" /><rect x="7.5" y="7.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" /></svg>
                        }
                    </button>
                ))}
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

            {/* ── TABLE VIEW ── */}
            {!loading && filtered.length > 0 && viewMode === 'table' && (
                <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                                        style={{ animationDelay: `${idx * 25}ms`, borderBottom: '1px solid #F3F4F6', background: isHov ? '#FFFDE7' : '#FFFFFF', transition: 'background 0.15s', cursor: 'default' }}
                                        onMouseEnter={() => setHovered(course.id)}
                                        onMouseLeave={() => setHovered(null)}
                                    >
                                        {/* Curso */}
                                        <td style={{ padding: '0.7rem 1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: 34, height: 34, borderRadius: 9, background: acc.bg, border: `1.5px solid ${acc.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.6rem', color: acc.color, flexShrink: 0 }}>
                                                    {initials}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.85rem' }}>{course.name}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.description}</div>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Carga */}
                                        <td style={{ padding: '0.7rem 1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <ClockIcon style={{ width: 13, height: 13, color: acc.color, flexShrink: 0 }} />
                                                <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.82rem', color: acc.color }}>{course.workloadHours || course.workload}h</span>
                                            </div>
                                        </td>
                                        {/* Turmas */}
                                        <td style={{ padding: '0.7rem 1rem' }}>
                                            <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.85rem', color: '#374151' }}>{course._count?.classes || 0}</span>
                                        </td>
                                        {/* Multicurso */}
                                        <td style={{ padding: '0.7rem 1rem' }}>
                                            {course.isMulticourse
                                                ? <span style={{ padding: '0.2rem 0.55rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, background: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA' }}>SIM</span>
                                                : <span style={{ fontSize: '0.72rem', color: '#D1D5DB' }}>—</span>
                                            }
                                        </td>
                                        {/* Status */}
                                        <td style={{ padding: '0.7rem 1rem' }}>
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
                                        {/* Ações */}
                                        <td style={{ padding: '0.7rem 1rem' }}>
                                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                <Link href={`/admin/cursos/${course.id}`}
                                                    style={{ padding: '0.4rem 0.75rem', borderRadius: 8, background: '#FFFDE7', border: '1px solid #FEF08A', color: '#92730A', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'background 0.15s' }}
                                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEF08A'}
                                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FFFDE7'}
                                                >
                                                    <EyeIcon style={{ width: 13, height: 13 }} />
                                                    Ver
                                                </Link>
                                                <button onClick={() => setDeletingCourse(course)}
                                                    style={{ padding: '0.4rem 0.75rem', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'background 0.15s' }}
                                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEE2E2'}
                                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FEF2F2'}
                                                >
                                                    <TrashIcon style={{ width: 13, height: 13 }} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── GRID / CARD VIEW ── */}
            {!loading && filtered.length > 0 && viewMode === 'grid' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
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
                                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                                    (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${acc.color}22`;
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.transform = '';
                                    (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
                                }}
                            >
                                {/* Card header */}
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
                                </div>

                                {/* Card footer */}
                                <div style={{ padding: '0.75rem 1rem', borderTop: `1px solid ${acc.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <ClockIcon style={{ width: 12, height: 12, color: acc.color }} />
                                            <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.75rem', color: acc.color }}>{course.workloadHours || course.workload}h</span>
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{course._count?.classes || 0} turmas</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                                        <Link href={`/admin/cursos/${course.id}`}
                                            style={{ padding: '0.35rem 0.65rem', borderRadius: 7, background: '#FFFDE7', border: '1px solid #FEF08A', color: '#92730A', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <EyeIcon style={{ width: 12, height: 12 }} />
                                            Ver
                                        </Link>
                                        <button onClick={() => setDeletingCourse(course)}
                                            style={{ padding: '0.35rem 0.55rem', borderRadius: 7, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                            <TrashIcon style={{ width: 12, height: 12 }} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
        {/* FEAT-CUR3: Modal de confirmação de exclusão */}
        {deletingCourse && (
            <ModalExclusao
                nome={deletingCourse.name}
                onConfirm={() => handleDelete(deletingCourse!)}
                onCancel={() => setDeletingCourse(null)}
            />
        )}
        </>
    );
}
