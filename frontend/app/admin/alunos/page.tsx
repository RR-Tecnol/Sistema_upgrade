'use client';

import { useEffect, useState } from 'react';
import { studentsApi, Student, StudentFilters, StudentStats } from '@/lib/api/students';
import { PlusIcon, MagnifyingGlassIcon, EyeIcon, TrashIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { AdminListPagination } from '@/components/admin/AdminListPagination';
import Link from 'next/link';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { AlunosSidebarTutorial } from '@/components/admin/adminSidebarTutorials';
import AdminViewModeToggle from '@/components/admin/AdminViewModeToggle';
import { usePersistedAdminViewMode } from '@/hooks/usePersistedAdminViewMode';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';

export default function AlunosPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [stats, setStats] = useState<StudentStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<StudentFilters>({ page: 1, limit: 12 });
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [hovered, setHovered] = useState<string | null>(null);
    // REQ-13: filtro por curso
    const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
    const [courseFilter, setCourseFilter] = useState('');

    useEffect(() => { loadStudents(); loadStats(); }, [filters]);
    useEffect(() => {
        api.get('/courses').then(r => setCourses(r.data?.data ?? r.data ?? [])).catch(() => {});
    }, []);

    // BUG-03: Live-search com debounce — busca ao digitar sem precisar Enter
    useEffect(() => {
        const timeout = setTimeout(() => {
            setFilters(f => ({ ...f, search: search.trim() || undefined, page: 1 }));
        }, 450);
        return () => clearTimeout(timeout);
    }, [search]);

    const loadStudents = async () => {
        try { setLoading(true); const r = await studentsApi.getAll(filters); setStudents(r.data); setTotalPages(r.meta.totalPages); setTotal(r.meta.total || 0); }
        catch { /* noop */ } finally { setLoading(false); }
    };

    const loadStats = async () => {
        try { setStats(await studentsApi.getStats()); } catch { /* noop */ }
    };

    const handleSearch = () => setFilters({ ...filters, search, page: 1 });
    const handleFilterState = (state?: string) => setFilters({ ...filters, state: state as any, page: 1 });
    const handleFilterCourse = (courseId: string) => {
        setCourseFilter(courseId);
        setFilters({ ...filters, courseId: courseId || undefined, page: 1 } as any);
    };
    const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);
    const [deleteStudentName, setDeleteStudentName] = useState('');
    const [listViewMode, setListViewMode] = usePersistedAdminViewMode('admin:alunos:list', 'table');
    const handleDelete = async () => {
        if (!deleteStudentId) return;
        try { await studentsApi.delete(deleteStudentId); setDeleteStudentId(null); loadStudents(); loadStats(); toast.success('Aluno excluído com sucesso!'); } catch { toast.error('Erro ao excluir aluno'); setDeleteStudentId(null); }
    };

    const stateActive = filters.state;
    const statesFromStats = Object.keys(stats?.byState || {}).sort();

    return (
        <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">

            <AdminHeaderHero
                title="ALUNOS"
                subtitle="Gerencie os alunos cadastrados no sistema"
                rightSlot={(
                    <Link href="/admin/alunos/novo" className="btn-primary" style={{ textDecoration: 'none' }}>
                        <PlusIcon style={{ width: 15, height: 15 }} />
                        Novo Aluno
                    </Link>
                )}
            />
            <AlunosSidebarTutorial />

            {/* ── KPI STRIP ── */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                    <AnimatedKpiCard label="Total de Alunos" value={stats.total} sub="cadastrados" color="#B89B00" bg="#FFFDE7" border="#FEF08A" />
                    {statesFromStats.slice(0, 3).map((uf, idx) => (
                        <AnimatedKpiCard
                            key={uf}
                            label={uf}
                            value={stats.byState[uf] || 0}
                            sub={`alunos ${uf}`}
                            color={idx === 0 ? '#0891B2' : idx === 1 ? '#059669' : '#7C3AED'}
                            bg={idx === 0 ? '#F0F9FF' : idx === 1 ? '#F0FDF4' : '#F5F3FF'}
                            border={idx === 0 ? '#BAE6FD' : idx === 1 ? '#BBF7D0' : '#DDD6FE'}
                            delayMs={(idx + 1) * 60}
                        />
                    ))}
                </div>
            )}

            {/* ── FILTER BAR ── */}
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                {/* Search */}
                <div className="alunos-filter-search" style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                    <MagnifyingGlassIcon style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#9CA3AF' }} />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="Buscar por nome, CPF ou email..."
                        style={{
                            width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                            borderRadius: 9, border: '1.5px solid #E5E7EB',
                            background: '#F9FAFB', fontSize: '0.82rem', color: '#111827',
                            outline: 'none', transition: 'border-color 0.2s',
                        }}
                        onFocus={e => (e.target as HTMLElement).style.borderColor = '#FFD600'}
                        onBlur={e => (e.target as HTMLElement).style.borderColor = '#E5E7EB'}
                    />
                </div>
                <button onClick={handleSearch} className="btn-primary" style={{ padding: '0.55rem 1rem', fontSize: '0.8rem' }}>
                    Buscar
                </button>

                <div style={{ width: 1, height: 28, background: '#E5E7EB', flexShrink: 0 }} />

                {/* Estado — dropdown dinâmico conforme dados reais */}
                <select
                    value={filters.state || ''}
                    onChange={e => handleFilterState(e.target.value || undefined)}
                    style={{
                        padding: '0.5rem 0.85rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
                        border: `1.5px solid ${filters.state ? '#FFD600' : '#E5E7EB'}`,
                        background: filters.state ? '#FFFDE7' : '#F9FAFB',
                        color: '#111827', cursor: 'pointer', outline: 'none', transition: 'all 0.2s',
                        boxShadow: filters.state ? '0 2px 8px rgba(255,214,0,0.2)' : 'none',
                        minWidth: 130,
                    }}
                >
                    <option value=''>🗺 Todos os Estados</option>
                    {statesFromStats.map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                    ))}
                </select>

                {/* REQ-13: Filtro por Curso */}
                {courses.length > 0 && (
                    <>
                        <div style={{ width: 1, height: 28, background: '#E5E7EB', flexShrink: 0 }} />
                        <select
                            value={courseFilter}
                            onChange={e => handleFilterCourse(e.target.value)}
                            style={{
                                padding: '0.5rem 0.85rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
                                border: `1.5px solid ${courseFilter ? '#FFD600' : '#E5E7EB'}`,
                                background: courseFilter ? '#FFFDE7' : '#F9FAFB',
                                color: '#111827', cursor: 'pointer', outline: 'none', transition: 'all 0.2s',
                                boxShadow: courseFilter ? '0 2px 8px rgba(255,214,0,0.2)' : 'none',
                            }}
                        >
                            <option value="">🎓 Todos os Cursos</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </>
                )}

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <AdminViewModeToggle mode={listViewMode} onChange={setListViewMode} />
                    <span style={{ fontSize: '0.72rem', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                        {total > 0 ? `${total} resultado${total !== 1 ? 's' : ''}` : ''}
                    </span>
                </div>
            </div>

            {/* ── TABLE / CARDS ── */}
            <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem' }}>
                        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO...</p>
                    </div>
                ) : students.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem' }}>
                        <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                            <span style={{ fontSize: '1.75rem' }}>👥</span>
                        </div>
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>NENHUM ALUNO ENCONTRADO</p>
                        <p style={{ fontSize: '0.78rem', color: '#D1D5DB', marginTop: '0.4rem' }}>Tente ajustar os filtros ou cadastre um novo aluno</p>
                    </div>
                ) : listViewMode === 'card' ? (
                    <div className="alunos-card-grid">
                        {students.map((student, idx) => {
                            const initials = student.user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
                            const isMA = student.address?.state === 'MA';
                            const accent = isMA ? '#0891B2' : '#059669';
                            return (
                                <div
                                    key={student.id}
                                    className="adm-kpi-card adm-scale-in"
                                    style={{
                                        animationDelay: `${idx * 30}ms`,
                                        background: '#fff',
                                        borderStyle: 'solid',
                                        borderWidth: '1px 1px 1px 4px',
                                        borderLeftColor: accent,
                                        borderTopColor: `${accent}33`,
                                        borderRightColor: `${accent}22`,
                                        borderBottomColor: `${accent}22`,
                                    }}
                                >
                                    <div className="adm-kpi-grid" />
                                    <div className="adm-kpi-scan" style={{ background: `linear-gradient(90deg, transparent, ${accent}44, transparent)` }} />
                                    <div className="adm-kpi-topline" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
                                    <div style={{ position: 'relative', zIndex: 1, padding: '14px 14px 10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                            <div style={{
                                                width: 40, height: 40, borderRadius: 10, background: accent, color: '#fff',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.7rem',
                                            }}>{initials}</div>
                                            <div>
                                                <div style={{ fontWeight: 800, color: '#111827', fontSize: '0.88rem' }}>{student.user.name}</div>
                                                <div style={{ fontSize: '0.72rem', color: '#64748B', fontFamily: 'JetBrains Mono' }}>{student.cpf}</div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.74rem', color: '#374151', marginBottom: 4 }}>{student.user.email}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{student.user.phone}</div>
                                        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                            {student.address ? (
                                                <span style={{ padding: '0.2rem 0.6rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 800, background: isMA ? '#E0F2FE' : '#DCFCE7', color: isMA ? '#0369A1' : '#15803D', border: `1px solid ${isMA ? '#BAE6FD' : '#BBF7D0'}` }}>{student.address.state}</span>
                                            ) : null}
                                            <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.85rem', color: '#B89B00' }}>Mat.: {student._count?.enrollments || 0}</span>
                                            <span style={{ padding: '0.2rem 0.55rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, background: student.active ? '#DCFCE7' : '#F3F4F6', color: student.active ? '#15803D' : '#9CA3AF', border: `1px solid ${student.active ? '#BBF7D0' : '#E5E7EB'}` }}>{student.active ? 'Ativo' : 'Inativo'}</span>
                                        </div>
                                    </div>
                                    <div style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(148,163,184,.2)', padding: '10px 12px', display: 'flex', gap: 8 }}>
                                        <Link href={`/admin/alunos/${student.id}`} style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: 8, background: '#FFFDE7', border: '1px solid #FEF08A', color: '#92730A', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none' }}>Ver</Link>
                                        <button type="button" onClick={() => { setDeleteStudentId(student.id); setDeleteStudentName(student.user.name); }} style={{ flex: 1, padding: '8px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Excluir</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                        <thead>
                            <tr style={{ background: '#FFFDE7', borderBottom: '2px solid #FEF08A' }}>
                                {['Aluno', 'CPF', 'Contato', 'Estado', 'Matrículas', 'Status', 'Ações'].map(h => (
                                    <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#B89B00', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((student, idx) => {
                                const initials = student.user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
                                const isHov = hovered === student.id;
                                const isMA = student.address?.state === 'MA';
                                return (
                                    <tr
                                        key={student.id}
                                        className="animate-fade-in"
                                        style={{ animationDelay: `${idx * 25}ms`, borderBottom: '1px solid #F3F4F6', background: isHov ? '#FFFDE7' : '#FFFFFF', transition: 'background 0.15s' }}
                                        onMouseEnter={() => setHovered(student.id)}
                                        onMouseLeave={() => setHovered(null)}
                                    >
                                        {/* Aluno */}
                                        <td style={{ padding: '0.65rem 1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                                <div style={{
                                                    width: 32, height: 32, borderRadius: 9,
                                                    background: isMA ? '#0891B2' : '#059669',
                                                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.6rem', flexShrink: 0,
                                                }}>
                                                    {initials}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{student.user.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        {/* CPF */}
                                        <td style={{ padding: '0.65rem 1rem', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#6B7280', whiteSpace: 'nowrap' }}>{student.cpf}</td>
                                        {/* Contato */}
                                        <td style={{ padding: '0.65rem 1rem' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{student.user.email}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono' }}>{student.user.phone}</div>
                                        </td>
                                        {/* Estado */}
                                        <td style={{ padding: '0.65rem 1rem' }}>
                                            {student.address && (
                                                <span style={{
                                                    padding: '0.2rem 0.6rem', borderRadius: 100, fontSize: '0.68rem', fontWeight: 800,
                                                    background: isMA ? '#E0F2FE' : '#DCFCE7',
                                                    color: isMA ? '#0369A1' : '#15803D',
                                                    border: `1px solid ${isMA ? '#BAE6FD' : '#BBF7D0'}`,
                                                    letterSpacing: '0.08em',
                                                }}>{student.address.state}</span>
                                            )}
                                        </td>
                                        {/* Matrículas */}
                                        <td style={{ padding: '0.65rem 1rem' }}>
                                            <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.88rem', color: '#B89B00' }}>
                                                {student._count?.enrollments || 0}
                                            </span>
                                        </td>
                                        {/* Status */}
                                        <td style={{ padding: '0.65rem 1rem' }}>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                                padding: '0.2rem 0.65rem', borderRadius: 100, fontSize: '0.68rem', fontWeight: 700,
                                                background: student.active ? '#DCFCE7' : '#F3F4F6',
                                                color: student.active ? '#15803D' : '#9CA3AF',
                                                border: `1px solid ${student.active ? '#BBF7D0' : '#E5E7EB'}`,
                                            }}>
                                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: student.active ? '#15803D' : '#D1D5DB', display: 'inline-block' }} />
                                                {student.active ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        {/* Ações */}
                                        <td style={{ padding: '0.65rem 1rem' }}>
                                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                <Link href={`/admin/alunos/${student.id}`}
                                                    style={{ padding: '0.4rem 0.75rem', borderRadius: 8, background: '#FFFDE7', border: '1px solid #FEF08A', color: '#92730A', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.15s' }}
                                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEF08A'}
                                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FFFDE7'}
                                                >
                                                    <EyeIcon style={{ width: 13, height: 13 }} />
                                                    Ver
                                                </Link>
                                                <button onClick={() => { setDeleteStudentId(student.id); setDeleteStudentName(student.user.name); }}
                                                    style={{ padding: '0.4rem 0.75rem', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.15s' }}
                                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEE2E2'}
                                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FEF2F2'}
                                                >
                                                    <TrashIcon style={{ width: 13, height: 13 }} />
                                                    Excluir
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
            </div>

            {/* ── PAGINATION ── */}
            <AdminListPagination
                page={filters.page ?? 1}
                totalPages={totalPages}
                total={total}
                loading={loading}
                onPageChange={(p) => setFilters(f => ({ ...f, page: p }))}
                itemLabel="aluno(s)"
            />
        </div>
        {/* Modal exclusão padrão aluno */}
        {deleteStudentId && (
            <ModalPortal>
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: MODAL_PORTAL_Z_INDEX, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
                onClick={() => setDeleteStudentId(null)}>
                <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', animation: 'slideUp 0.2s' }}
                    onClick={e => e.stopPropagation()}>
                    <div style={{ padding: '18px 24px 14px', background: '#FEF2F2', borderBottom: '1px solid #FECACA', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrashIcon style={{ width: 18, height: 18, color: '#fff' }} />
                        </div>
                        <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 900, color: '#111827', margin: 0 }}>EXCLUIR ALUNO</h2>
                        <button onClick={() => setDeleteStudentId(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                    </div>
                    <div style={{ padding: '20px 24px' }}>
                        <p style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
                            Tem certeza que deseja excluir o aluno <strong>"{deleteStudentName}"</strong>?<br />
                            Esta ação removerá todos os dados vinculados e não pode ser desfeita.
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button onClick={() => setDeleteStudentId(null)} style={{ padding: '9px 20px', background: 'transparent', border: '1px solid #E5E7EB', color: '#6B7280', borderRadius: 9, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Cancelar</button>
                            <button onClick={handleDelete} style={{ padding: '9px 20px', background: '#DC2626', border: 'none', color: '#fff', borderRadius: 9, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <TrashIcon style={{ width: 14, height: 14 }} /> Excluir
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            </ModalPortal>
        )}
        <style>{`@keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </>
    );
}
