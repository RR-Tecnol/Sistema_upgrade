'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api/client';
import { useAuthStore } from '@/stores/useAuthStore';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import {
    ClipboardDocumentCheckIcon,
    MapPinIcon,
    UserGroupIcon,
    CalendarDaysIcon,
    ArrowRightIcon,
} from '@heroicons/react/24/outline';

export default function TeacherFrequencia() {
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { user: authUser } = useAuthStore();

    useEffect(() => { loadClasses(); }, []);

    async function loadClasses() {
        try {
            const res = await api.get('/classes', { params: { teacherUserId: authUser?.id } });
            const list = Array.isArray(res.data) ? res.data : [];
            setClasses(list);
        } catch {
            setClasses([]);
        } finally {
            setLoading(false);
        }
    }

    const fmtDate = (d: string) =>
        new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

    const statusConfig = (status: string) => {
        switch (status) {
            case 'IN_PROGRESS': return { label: 'Em Andamento', color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' };
            case 'CONCLUDED':   return { label: 'Concluída',    color: '#6366F1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)' };
            case 'PLANNED':     return { label: 'Planejada',    color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
            default:            return { label: status,         color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.25)' };
        }
    };

    const pendentes = classes.filter(c => c.status === 'IN_PROGRESS').length;
    const concluidas = classes.filter(c => c.status === 'CONCLUDED').length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">

            <AdminHeaderHero
                title="FREQUÊNCIA"
                subtitle="Selecione a turma para registrar a presença de hoje"
                badge="PROFESSOR"
                rightSlot={!loading && classes.length > 0 ? (
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                        <div style={{ padding: '0.4rem 0.85rem', borderRadius: 20, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', fontSize: '0.72rem', fontWeight: 700, color: '#10B981' }}>
                            {pendentes} em andamento
                        </div>
                        {concluidas > 0 && (
                            <div style={{ padding: '0.4rem 0.85rem', borderRadius: 20, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', fontSize: '0.72rem', fontWeight: 700, color: '#6366F1' }}>
                                {concluidas} concluída{concluidas !== 1 ? 's' : ''}
                            </div>
                        )}
                    </div>
                ) : undefined}
            />

            {/* Grid de cards */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '0.15em', color: '#9CA3AF' }}>
                        CARREGANDO TURMAS...
                    </p>
                </div>
            ) : classes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB' }}>
                    <ClipboardDocumentCheckIcon style={{ width: 48, height: 48, color: '#D1D5DB', margin: '0 auto 1rem' }} />
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: '#9CA3AF' }}>
                        NENHUMA TURMA ENCONTRADA
                    </p>
                    <p style={{ fontSize: '0.82rem', color: '#D1D5DB', marginTop: 8 }}>
                        Não há turmas ativas atribuídas a você no momento
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1rem' }}>
                    {classes.map((cls, i) => {
                        const st = statusConfig(cls.status);
                        const enrolled = cls._count?.enrollments ?? cls.enrolledCount ?? null;
                        const isActive = cls.status === 'IN_PROGRESS';

                        return (
                            <Link key={cls.id} href={`/teacher/frequencia/${cls.id}`} style={{ textDecoration: 'none' }}>
                                <div
                                    className="animate-fade-in"
                                    style={{
                                        animationDelay: `${i * 50}ms`,
                                        background: '#fff',
                                        borderRadius: 16,
                                        border: `1.5px solid ${isActive ? 'rgba(255,214,0,0.35)' : '#E5E7EB'}`,
                                        padding: '1.25rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1rem',
                                        minHeight: 200,
                                        boxShadow: isActive ? '0 2px 8px rgba(255,214,0,0.1)' : 'none',
                                    }}
                                    onMouseEnter={e => {
                                        const el = e.currentTarget as HTMLElement;
                                        el.style.borderColor = '#FFD600';
                                        el.style.boxShadow = '0 8px 28px rgba(255,214,0,0.2)';
                                        el.style.transform = 'translateY(-3px)';
                                    }}
                                    onMouseLeave={e => {
                                        const el = e.currentTarget as HTMLElement;
                                        el.style.borderColor = isActive ? 'rgba(255,214,0,0.35)' : '#E5E7EB';
                                        el.style.boxShadow = isActive ? '0 2px 8px rgba(255,214,0,0.1)' : 'none';
                                        el.style.transform = 'translateY(0)';
                                    }}
                                >
                                    {/* Topo: ícone + badge status */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{
                                            width: 46, height: 46, borderRadius: 12,
                                            background: 'linear-gradient(135deg, rgba(255,214,0,0.2), rgba(255,179,0,0.12))',
                                            border: '1.5px solid rgba(255,214,0,0.3)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <ClipboardDocumentCheckIcon style={{ width: 22, height: 22, color: '#B89B00' }} />
                                        </div>
                                        <span style={{
                                            fontSize: '0.62rem', fontWeight: 800,
                                            padding: '4px 12px', borderRadius: 20,
                                            background: st.bg, color: st.color,
                                            border: `1px solid ${st.border}`,
                                            letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {st.label}
                                        </span>
                                    </div>

                                    {/* Nome do curso */}
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem', lineHeight: 1.35, marginBottom: 6 }}>
                                            {cls.course?.name || 'Curso'}
                                        </div>
                                        <span style={{
                                            fontFamily: '"JetBrains Mono", monospace',
                                            fontSize: '0.66rem', color: '#9CA3AF',
                                            background: '#F9FAFB', padding: '2px 8px',
                                            borderRadius: 6, border: '1px solid #E5E7EB',
                                        }}>
                                            {cls.classIdentifier}
                                        </span>
                                    </div>

                                    {/* Infos */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#6B7280' }}>
                                            <MapPinIcon style={{ width: 14, height: 14, color: '#FFD600', flexShrink: 0 }} />
                                            <span>{cls.city?.name}{cls.city?.state ? ` — ${cls.city.state}` : ''}</span>
                                        </div>
                                        {enrolled !== null && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#6B7280' }}>
                                                <UserGroupIcon style={{ width: 14, height: 14, color: '#FFD600', flexShrink: 0 }} />
                                                <span>{enrolled} aluno{enrolled !== 1 ? 's' : ''} matriculado{enrolled !== 1 ? 's' : ''}</span>
                                            </div>
                                        )}
                                        {cls.startDate && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#6B7280' }}>
                                                <CalendarDaysIcon style={{ width: 14, height: 14, color: '#FFD600', flexShrink: 0 }} />
                                                <span>Início: {fmtDate(cls.startDate)}</span>
                                            </div>
                                        )}
                                        {cls.endDate && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#6B7280' }}>
                                                <CalendarDaysIcon style={{ width: 14, height: 14, color: '#9CA3AF', flexShrink: 0 }} />
                                                <span>Término: {fmtDate(cls.endDate)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer CTA */}
                                    <div style={{
                                        paddingTop: '0.85rem',
                                        borderTop: '1px solid #F3F4F6',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    }}>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isActive ? '#B89B00' : '#9CA3AF' }}>
                                            {isActive ? '⏳ Marcar frequência de hoje' : '📋 Ver registros de frequência'}
                                        </span>
                                        <div style={{
                                            width: 30, height: 30, borderRadius: 8,
                                            background: isActive ? 'rgba(255,214,0,0.15)' : '#F3F4F6',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <ArrowRightIcon style={{ width: 14, height: 14, color: isActive ? '#B89B00' : '#9CA3AF' }} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
