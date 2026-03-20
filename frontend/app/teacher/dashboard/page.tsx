'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api/client';

import {
    ClipboardDocumentCheckIcon,
    UserGroupIcon,
    BanknotesIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/outline';

export default function TeacherDashboard() {
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [teacherName, setTeacherName] = useState('');
    const [pendingReimb, setPendingReimb] = useState(0);

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
            const parsed = JSON.parse(stored);
            setUser(parsed);
            if (parsed?.name) setTeacherName(parsed.name.split(' ')[0]);
        }
        loadData();
    }, []);

    async function loadData() {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const [classRes, reimRes] = await Promise.all([
                api.get('/classes', { params: { status: 'IN_PROGRESS', teacherUserId: user.id } }).catch(() => ({ data: [] })),
                api.get('/reimbursements', { params: { status: 'PENDING' } }).catch(() => ({ data: [] })),
            ]);
            setClasses(Array.isArray(classRes.data) ? classRes.data : []);
            setPendingReimb(Array.isArray(reimRes.data) ? reimRes.data.length : 0);
        } finally {
            setLoading(false);
        }
    }

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

    return (
        <div className="animate-fade-in">
            {/* ── Banner amarelo padrão (igual student/driver) ── */}
            <div style={{
                borderRadius: 18, overflow: 'hidden', position: 'relative',
                background: 'linear-gradient(135deg, #FFD600 0%, #FFC107 60%, #FFB300 100%)',
                padding: '1.75rem 2rem',
                boxShadow: '0 4px 20px rgba(255,214,0,0.3)',
                marginBottom: '2rem',
            }}>
                <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(0,0,0,0.06)' }} />
                <div style={{ position: 'absolute', bottom: -30, left: 200, width: 120, height: 120, borderRadius: '50%', background: 'rgba(0,0,0,0.04)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', position: 'relative' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1rem', color: '#FFD600', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', flexShrink: 0 }}>
                        {user?.name ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : 'PR'}
                    </div>
                    <div>
                        <p style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '0.2rem' }}>Portal do Professor</p>
                        <h1 style={{ fontFamily: 'Orbitron', fontSize: '1.4rem', fontWeight: 900, color: '#000', letterSpacing: '0.04em', lineHeight: 1.2 }}>
                            Olá, {teacherName}!
                        </h1>
                        <p style={{ fontSize: '0.82rem', color: 'rgba(0,0,0,0.6)', marginTop: '0.25rem' }}>
                            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <KpiCard
                    icon={<UserGroupIcon style={{ width: 24, height: 24 }} />}
                    label="Turmas Ativas"
                    value={loading ? '...' : String(classes.length)}
                    color="#10B981"
                />
                <KpiCard
                    icon={<ClipboardDocumentCheckIcon style={{ width: 24, height: 24 }} />}
                    label="Próxima Aula"
                    value={loading ? '...' : classes.length === 0 ? '—' : (() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const upcoming = classes
                            .map((c: any) => c.startDate ? new Date(c.startDate) : null)
                            .filter((d: Date | null): d is Date => d !== null && d >= today)
                            .sort((a: Date, b: Date) => a.getTime() - b.getTime());
                        if (upcoming.length === 0) return 'Em andamento';
                        const diff = Math.ceil((upcoming[0].getTime() - today.getTime()) / 86400000);
                        return diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : upcoming[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                    })()}
                    color="#FFD600"
                />
                <KpiCard
                    icon={<BanknotesIcon style={{ width: 24, height: 24 }} />}
                    label="Reembolsos Pendentes"
                    value={loading ? '...' : String(pendingReimb)}
                    color="#F59E0B"
                />
            </div>


            {/* Botão destaque Frequência */}
            <Link href="/teacher/frequencia" style={{ textDecoration: 'none', display: 'block', marginBottom: '2rem' }}>
                <div style={{
                    background: 'linear-gradient(135deg, #FFD600, #F59E0B)',
                    borderRadius: 12, padding: '1rem 1.5rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', transition: 'opacity 0.2s', minHeight: 64,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <ClipboardDocumentCheckIcon style={{ width: 28, height: 28, color: '#0F172A' }} />
                        <div>
                            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '1rem', fontFamily: 'Orbitron, sans-serif' }}>
                                REGISTRAR FREQUÊNCIA
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#1E293B' }}>Marcar presença de hoje</div>
                        </div>
                    </div>
                    <ChevronRightIcon style={{ width: 22, height: 22, color: '#0F172A' }} />
                </div>
            </Link>

            {/* Lista de turmas */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem', fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.06em' }}>MINHAS TURMAS</h2>
                </div>

                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>Carregando...</div>
                ) : classes.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
                        Nenhuma turma ativa encontrada.
                    </div>
                ) : (
                    classes.map((cls) => (
                        <Link key={cls.id} href={`/teacher/frequencia/${cls.id}`} style={{ textDecoration: 'none' }}>
                            <div style={{
                                padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                transition: 'background 0.15s', cursor: 'pointer',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#FFFBEB')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                <div>
                                    <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.9rem' }}>
                                        {cls.course?.name || 'Curso'}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginTop: 2 }}>
                                        {cls.city?.name} — {cls.city?.state} · {cls.classIdentifier}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span className="badge badge-green">EM ANDAMENTO</span>
                                    <ChevronRightIcon style={{ width: 16, height: 16, color: '#9CA3AF' }} />
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
    return (
        <div className="stat-card animate-scale-in" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', fontFamily: 'Orbitron, sans-serif', lineHeight: 1 }}>
                    {value}
                </div>
                <div className="stat-label" style={{ marginTop: 4 }}>
                    {label}
                </div>
            </div>
        </div>
    );
}
