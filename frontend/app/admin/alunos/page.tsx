'use client';

import { useEffect, useState, useRef } from 'react';
import { studentsApi, Student, StudentFilters, StudentStats } from '@/lib/api/students';
import { PlusIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon, TrashIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';

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

function StatKPI({ label, value, sub, color, bg, border }: { label: string; value: number; sub: string; color: string; bg: string; border: string }) {
    const n = useCountUp(value);
    return (
        <div style={{ padding: '1rem 1.25rem', borderRadius: 14, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color, opacity: 0.7, marginBottom: '0.2rem' }}>{label}</div>
                <div style={{ fontFamily: 'Orbitron', fontSize: '1.8rem', fontWeight: 900, color, lineHeight: 1 }}>{n}</div>
                <div style={{ fontSize: '0.68rem', color, opacity: 0.55, marginTop: '0.2rem' }}>{sub}</div>
            </div>
            {/* Mini bar indicator */}
            <div style={{ width: 3, height: 48, borderRadius: 2, background: color, opacity: 0.25 }} />
        </div>
    );
}

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
    const handleDelete = async () => {
        if (!deleteStudentId) return;
        try { await studentsApi.delete(deleteStudentId); setDeleteStudentId(null); loadStudents(); loadStats(); toast.success('Aluno excluído com sucesso!'); } catch { toast.error('Erro ao excluir aluno'); setDeleteStudentId(null); }
    };

    const stateActive = filters.state;

    return (
        <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">

            {/* ── HEADER ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontFamily: 'Orbitron', fontSize: '2rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '0.3rem' }}>ALUNOS</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Gerencie os alunos cadastrados no sistema</p>
                </div>
                <Link href="/admin/alunos/novo" className="btn-primary" style={{ textDecoration: 'none' }}>
                    <PlusIcon style={{ width: 15, height: 15 }} />
                    Novo Aluno
                </Link>
            </div>

            {/* ── KPI STRIP ── */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                    <StatKPI label="Total de Alunos" value={stats.total} sub="cadastrados" color="#B89B00" bg="#FFFDE7" border="#FEF08A" />
                    <StatKPI label="Maranhão" value={stats.byState.MA} sub="alunos MA" color="#0891B2" bg="#F0F9FF" border="#BAE6FD" />
                    <StatKPI label="Piauí" value={stats.byState.PI} sub="alunos PI" color="#059669" bg="#F0FDF4" border="#BBF7D0" />
                </div>
            )}

            {/* ── FILTER BAR ── */}
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                {/* Search */}
                <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
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

                {/* Estado — dropdown com todos 26+1 estados */}
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
                    <option value='AC'>AC – Acre</option>
                    <option value='AL'>AL – Alagoas</option>
                    <option value='AP'>AP – Amapá</option>
                    <option value='AM'>AM – Amazonas</option>
                    <option value='BA'>BA – Bahia</option>
                    <option value='CE'>CE – Ceará</option>
                    <option value='DF'>DF – Distrito Federal</option>
                    <option value='ES'>ES – Espírito Santo</option>
                    <option value='GO'>GO – Goiás</option>
                    <option value='MA'>MA – Maranhão</option>
                    <option value='MT'>MT – Mato Grosso</option>
                    <option value='MS'>MS – Mato Grosso do Sul</option>
                    <option value='MG'>MG – Minas Gerais</option>
                    <option value='PA'>PA – Pará</option>
                    <option value='PB'>PB – Paraíba</option>
                    <option value='PR'>PR – Paraná</option>
                    <option value='PE'>PE – Pernambuco</option>
                    <option value='PI'>PI – Piauí</option>
                    <option value='RJ'>RJ – Rio de Janeiro</option>
                    <option value='RN'>RN – Rio Grande do Norte</option>
                    <option value='RS'>RS – Rio Grande do Sul</option>
                    <option value='RO'>RO – Rondônia</option>
                    <option value='RR'>RR – Roraima</option>
                    <option value='SC'>SC – Santa Catarina</option>
                    <option value='SP'>SP – São Paulo</option>
                    <option value='SE'>SE – Sergipe</option>
                    <option value='TO'>TO – Tocantins</option>
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

                <div style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                    {total > 0 ? `${total} resultado${total !== 1 ? 's' : ''}` : ''}
                </div>
            </div>

            {/* ── TABLE ── */}
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
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                )}
            </div>

            {/* ── PAGINATION ── */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <button
                        onClick={() => setFilters(f => ({ ...f, page: f.page! - 1 }))}
                        disabled={filters.page === 1}
                        style={{ padding: '0.5rem 0.85rem', borderRadius: 9, background: '#F9FAFB', border: '1px solid #E5E7EB', cursor: filters.page === 1 ? 'not-allowed' : 'pointer', opacity: filters.page === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center' }}
                    >
                        <ChevronLeftIcon style={{ width: 15, height: 15, color: '#6B7280' }} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button key={p} onClick={() => setFilters(f => ({ ...f, page: p }))}
                            style={{
                                width: 34, height: 34, borderRadius: 9, fontSize: '0.8rem', fontWeight: 700,
                                cursor: 'pointer', border: 'none', transition: 'all 0.18s',
                                background: filters.page === p ? '#FFD600' : '#F3F4F6',
                                color: filters.page === p ? '#000' : '#6B7280',
                                boxShadow: filters.page === p ? '0 2px 8px rgba(255,214,0,0.35)' : 'none',
                            }}>
                            {p}
                        </button>
                    ))}
                    <button
                        onClick={() => setFilters(f => ({ ...f, page: f.page! + 1 }))}
                        disabled={filters.page === totalPages}
                        style={{ padding: '0.5rem 0.85rem', borderRadius: 9, background: '#F9FAFB', border: '1px solid #E5E7EB', cursor: filters.page === totalPages ? 'not-allowed' : 'pointer', opacity: filters.page === totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center' }}
                    >
                        <ChevronRightIcon style={{ width: 15, height: 15, color: '#6B7280' }} />
                    </button>
                </div>
            )}
        </div>
        {/* Modal exclusão padrão aluno */}
        {deleteStudentId && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
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
        )}
        <style>{`@keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </>
    );
}
