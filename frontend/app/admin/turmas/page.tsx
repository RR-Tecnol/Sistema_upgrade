'use client';

import { useEffect, useState } from 'react';
import { classesApi, Class } from '@/lib/api/classes';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toast } from '@/components/ui/Toast';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    ChartBarIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

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
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [stateFilter, setStateFilter] = useState<'all' | 'MA' | 'PI'>('all');
    const [search, setSearch] = useState('');
    const [deleteClassId, setDeleteClassId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => { loadClasses(); }, [statusFilter]);

    const loadClasses = async () => {
        try {
            setLoading(true);
            const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined;
            const data = await classesApi.getAll(filters);
            setClasses(data);
        } catch (error) {
            console.error('Error loading classes:', error);
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
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontFamily: 'Orbitron', fontSize: '2rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                        TURMAS
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Gerencie as turmas dos cursos profissionalizantes</p>
                </div>
                <Link href="/admin/turmas/nova" className="btn-primary">
                    <PlusIcon style={{ width: 16, height: 16 }} />
                    Nova Turma
                </Link>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                {[
                    { label: 'Total', value: stats.total, color: 'var(--neon-yellow)' },
                    { label: 'Matrículas Abertas', value: stats.open, color: 'var(--neon-green)' },
                    { label: 'Em Andamento', value: stats.active, color: 'var(--neon-cyan)' },
                    { label: 'Concluídas', value: stats.done, color: 'var(--neon-purple)' },
                ].map((s, i) => (
                    <div key={i} className="stat-card animate-scale-in" style={{ animationDelay: `${i * 60}ms`, padding: '1rem' }}>
                        <div className="stat-label">{s.label}</div>
                        <div style={{ fontFamily: 'Orbitron', fontSize: '1.75rem', fontWeight: 800, color: s.color, textShadow: `0 0 16px ${s.color}` }}>{s.value}</div>
                    </div>
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

            {/* Table */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
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
                ) : (
                    <div style={{ overflowX: 'auto' }}>
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
                                        <tr key={item.id}>
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
                                                    <Link href={`/admin/turmas/${item.id}`} title="Editar"
                                                        style={{ padding: '0.4rem', borderRadius: 7, background: 'rgba(0,245,255,0.08)', color: 'var(--neon-cyan)', border: '1px solid rgba(0,245,255,0.2)', display: 'flex', transition: 'all 0.2s' }}>
                                                        <PencilIcon style={{ width: 14, height: 14 }} />
                                                    </Link>
                                                    <Link href={`/admin/turmas/${item.id}/estatisticas`} title="Estatísticas"
                                                        style={{ padding: '0.4rem', borderRadius: 7, background: 'rgba(191,90,242,0.08)', color: 'var(--neon-purple)', border: '1px solid rgba(191,90,242,0.2)', display: 'flex', transition: 'all 0.2s' }}>
                                                        <ChartBarIcon style={{ width: 14, height: 14 }} />
                                                    </Link>
                                                    <button onClick={() => handleDelete(item.id)} title="Excluir"
                                                        style={{ padding: '0.4rem', borderRadius: 7, background: 'rgba(255,45,85,0.08)', color: 'var(--neon-red)', border: '1px solid rgba(255,45,85,0.2)', cursor: 'pointer', display: 'flex', transition: 'all 0.2s' }}>
                                                        <TrashIcon style={{ width: 14, height: 14 }} />
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
        </div>

        <ConfirmModal
            isOpen={!!deleteClassId}
            title="EXCLUIR TURMA"
            message="Tem certeza que deseja excluir esta turma? Alunos matriculados e registros de frequência serão removidos."
            confirmLabel="Excluir"
            danger
            loading={deleting}
            onConfirm={() => deleteClassId && handleDelete(deleteClassId)}
            onCancel={() => setDeleteClassId(null)}
        />
        </>
    );
}
