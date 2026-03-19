'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/client';
import { DocumentTextIcon, EyeIcon } from '@heroicons/react/24/outline';

interface Enrollment {
    id: string;
    protocol: string;
    status: string;
    createdAt: string;
    class: {
        name: string;
        course: { name: string };
        city: { name: string };
    };
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    PENDING:  { label: 'Pendente',        color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    APPROVED: { label: 'Aprovado',        color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
    ENROLLED: { label: 'Matriculado',     color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    REJECTED: { label: 'Rejeitado',       color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    WAITLIST: { label: 'Lista de Espera', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
};

const FILTERS = ['ALL', 'PENDING', 'APPROVED', 'ENROLLED', 'REJECTED', 'WAITLIST'];
const FILTER_LABELS: Record<string, string> = {
    ALL: 'Todas', PENDING: 'Pendentes', APPROVED: 'Aprovadas', ENROLLED: 'Matriculado', REJECTED: 'Rejeitadas', WAITLIST: 'Espera',
};

export default function StudentEnrollments() {
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        api.get('/students/me/enrollments')
            .then(r => setEnrollments(Array.isArray(r.data) ? r.data : []))
            .catch(() => setEnrollments([]))
            .finally(() => setLoading(false));
    }, []);

    const filtered = enrollments.filter(e => filter === 'ALL' || e.status === filter);

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.08em', margin: 0 }}>INSCRIÇÕES</h1>
                    <p style={{ color: '#6B7280', fontSize: '0.85rem', margin: 0 }}>
                        {enrollments.length} inscrição{enrollments.length !== 1 ? 'ões' : ''} encontrada{enrollments.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Filtros */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {FILTERS.map(f => {
                    const isActive = filter === f;
                    const cfg = f !== 'ALL' ? STATUS_CFG[f] : null;
                    const count = f === 'ALL' ? enrollments.length : enrollments.filter(e => e.status === f).length;
                    return (
                        <button key={f} onClick={() => setFilter(f)} style={{
                            padding: '0.4rem 0.85rem', borderRadius: 100, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
                            border: `1.5px solid ${isActive ? (cfg?.border || '#FFD600') : '#E5E7EB'}`,
                            background: isActive ? (cfg?.bg || '#FFF9C4') : 'transparent',
                            color: isActive ? (cfg?.color || '#92400E') : '#6B7280',
                            transition: 'all 0.15s',
                        }}>
                            {FILTER_LABELS[f]} {count > 0 && <span style={{ marginLeft: '0.25rem', background: 'rgba(0,0,0,0.08)', borderRadius: 10, padding: '0 0.35rem', fontSize: '0.65rem' }}>{count}</span>}
                        </button>
                    );
                })}
            </div>

            {/* Lista */}
            {loading ? (
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '3rem', textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem', width: 36, height: 36 }} />
                    <div style={{ color: '#9CA3AF', fontSize: '0.82rem' }}>Carregando suas inscrições...</div>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '4rem', textAlign: 'center' }}>
                    <DocumentTextIcon style={{ width: 48, height: 48, color: '#D1D5DB', margin: '0 auto 1rem' }} />
                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.72rem', letterSpacing: '0.12em', color: '#9CA3AF' }}>NENHUMA INSCRIÇÃO ENCONTRADA</div>
                    <p style={{ color: '#9CA3AF', fontSize: '0.78rem', marginTop: '0.5rem' }}>
                        {filter !== 'ALL' ? 'Tente outro filtro.' : 'Suas inscrições aparecerão aqui após se inscrever em um curso.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filtered.map((enrollment, i) => {
                        const cfg = STATUS_CFG[enrollment.status] || { label: enrollment.status, color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' };
                        return (
                            <div key={enrollment.id} className="animate-scale-in" style={{ animationDelay: `${i * 50}ms`, background: '#FFFFFF', borderRadius: 14, border: `1.5px solid ${cfg.border}`, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'box-shadow 0.2s', cursor: 'default' }}
                                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
                                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)')}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                                            <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827', margin: 0 }}>{enrollment.class.course.name}</h3>
                                            <span style={{ padding: '0.18rem 0.6rem', borderRadius: 100, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                                                {cfg.label.toUpperCase()}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem', color: '#6B7280' }}>
                                            <span>📋 Turma: <strong style={{ color: '#374151' }}>{enrollment.class.name}</strong></span>
                                            <span>📍 {enrollment.class.city.name}</span>
                                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem' }}>🔑 {enrollment.protocol}</span>
                                            <span>📅 {new Date(enrollment.createdAt).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                    </div>
                                    <button style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', cursor: 'pointer', color: '#6B7280', transition: 'all 0.15s', display: 'flex' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#FFFDE7'; e.currentTarget.style.borderColor = '#FFD600'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
                                    >
                                        <EyeIcon style={{ width: '1.1rem', height: '1.1rem' }} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
