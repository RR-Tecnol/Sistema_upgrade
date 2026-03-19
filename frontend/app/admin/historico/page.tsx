'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api/client';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

interface AuditLog {
    id: string;
    userId: string | null;
    action: string;
    tableName: string;
    recordId: string | null;
    ipAddress: string | null;
    createdAt: string;
    user?: { id: string; name: string; email: string; role: string } | null;
}

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
    CREATE: { bg: '#DCFCE7', color: '#059669' },
    UPDATE: { bg: '#DBEAFE', color: '#2563EB' },
    DELETE: { bg: '#FEE2E2', color: '#DC2626' },
    APPROVE: { bg: '#FEF9C3', color: '#D97706' },
    REJECT: { bg: '#FEE2E2', color: '#DC2626' },
    LOGIN: { bg: '#F0F9FF', color: '#0891B2' },
};

function getActionStyle(action: string) {
    const key = Object.keys(ACTION_COLORS).find(k => action.toUpperCase().startsWith(k));
    return key ? ACTION_COLORS[key] : { bg: '#F3F4F6', color: '#6B7280' };
}

function fmtDate(d: string) {
    return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function HistoricoPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterTable, setFilterTable] = useState('');
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 450);
        return () => clearTimeout(t);
    }, [search]);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = { page: String(page), limit: '50' };
            if (debouncedSearch) params.action = debouncedSearch;
            if (filterTable) params.tableName = filterTable;
            if (filterFrom) params.from = filterFrom;
            if (filterTo) params.to = filterTo;
            const res = await api.get('/audit-logs', { params });
            setLogs(res.data.data ?? []);
            setTotal(res.data.total ?? 0);
            setTotalPages(res.data.totalPages ?? 1);
        } catch {
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, filterTable, filterFrom, filterTo]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const TABLES = ['users', 'enrollments', 'employees', 'trips', 'classes', 'reimbursements', 'certificates', 'notifications'];

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Hero Header */}
            <div style={{
                position: 'relative', borderRadius: 20, overflow: 'hidden',
                background: 'linear-gradient(135deg, #0A0A0A 0%, #1C1C2E 50%, #0A0A0A 100%)',
                border: '1px solid rgba(255,214,0,0.15)', padding: '1.75rem 2rem',
                boxShadow: '0 0 50px rgba(255,214,0,0.04)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg,#FFD600,#B89B00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 0 18px rgba(255,214,0,0.4)' }}>📋</div>
                    <div>
                        <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.5rem', letterSpacing: '0.1em', color: '#FFFFFF', textShadow: '0 0 24px rgba(255,214,0,0.35)', margin: 0 }}>HISTÓRICO DE ATIVIDADES</h1>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', letterSpacing: '0.1em', margin: '0.2rem 0 0' }}>AUDITORIA DO SISTEMA — {total} REGISTRO{total !== 1 ? 'S' : ''}</p>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                    <MagnifyingGlassIcon style={{ width: 14, height: 14, position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
                    <input className="form-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por ação..." style={{ paddingLeft: '2.1rem', fontSize: '0.82rem' }} />
                </div>
                <select className="form-input" value={filterTable} onChange={e => setFilterTable(e.target.value)} style={{ width: 160, fontSize: '0.82rem' }}>
                    <option value="">Todos os módulos</option>
                    {TABLES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input className="form-input" type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={{ width: 145, fontSize: '0.82rem' }} />
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>até</span>
                <input className="form-input" type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} style={{ width: 145, fontSize: '0.82rem' }} />
                {(search || filterTable || filterFrom || filterTo) && (
                    <button className="btn-ghost" onClick={() => { setSearch(''); setFilterTable(''); setFilterFrom(''); setFilterTo(''); setPage(1); }} style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem', color: '#6B7280' }}>✕ Limpar</button>
                )}
            </div>

            {/* Tabela */}
            <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                {loading ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: '#9CA3AF' }}>
                        <div className="spinner" style={{ margin: '0 auto 1rem', width: 36, height: 36 }} />
                        Carregando histórico...
                    </div>
                ) : logs.length === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📭</div>
                        <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.72rem', letterSpacing: '0.15em', color: '#9CA3AF' }}>NENHUM REGISTRO ENCONTRADO</div>
                    </div>
                ) : (
                    <>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Data/Hora</th>
                                    <th>Ação</th>
                                    <th>Módulo</th>
                                    <th>Registro</th>
                                    <th>Usuário</th>
                                    <th>IP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log, i) => {
                                    const style = getActionStyle(log.action);
                                    return (
                                        <tr key={log.id} className="animate-fade-in" style={{ animationDelay: `${i * 20}ms` }}>
                                            <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: '#6B7280', whiteSpace: 'nowrap' }}>
                                                {fmtDate(log.createdAt)}
                                            </td>
                                            <td>
                                                <span style={{ display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: 100, background: style.bg, color: style.color, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: '#374151', fontWeight: 600 }}>{log.tableName}</td>
                                            <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: '#9CA3AF', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {log.recordId ? log.recordId.substring(0, 8) + '...' : '—'}
                                            </td>
                                            <td>
                                                {log.user ? (
                                                    <div>
                                                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#111827' }}>{log.user.name}</div>
                                                        <div style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>{log.user.role}</div>
                                                    </div>
                                                ) : <span style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>Sistema</span>}
                                            </td>
                                            <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: '#9CA3AF' }}>
                                                {log.ipAddress || '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Paginação */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.25rem', borderTop: '1px solid #F3F4F6' }}>
                                <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                                    Página <strong>{page}</strong> de <strong>{totalPages}</strong> — {total} registros
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost" style={{ padding: '0.4rem 0.7rem', fontSize: '0.78rem' }}>← Anterior</button>
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost" style={{ padding: '0.4rem 0.7rem', fontSize: '0.78rem' }}>Próxima →</button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
