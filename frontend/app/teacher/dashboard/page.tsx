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
    const [teacherName, setTeacherName] = useState('Professor');
    const [pendingReimb, setPendingReimb] = useState(0);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user?.name) setTeacherName(user.name.split(' ')[0]);
        loadData();
    }, []);

    async function loadData() {
        try {
            const [classRes, reimRes] = await Promise.all([
                api.get('/classes', { params: { status: 'IN_PROGRESS' } }).catch(() => ({ data: [] })),
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
        <div>
            {/* Header saudação */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F1F5F9', fontFamily: 'Orbitron, sans-serif' }}>
                    {greeting}, {teacherName}! 👋
                </h1>
                <p style={{ color: '#64748B', fontSize: '0.87rem', marginTop: 4 }}>
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
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
                    value="Hoje"
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
            <div style={{ background: '#1E293B', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontWeight: 600, color: '#F1F5F9', fontSize: '0.95rem' }}>Minhas Turmas</h2>
                </div>

                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>Carregando...</div>
                ) : classes.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
                        Nenhuma turma ativa encontrada.
                    </div>
                ) : (
                    classes.map((cls) => (
                        <Link key={cls.id} href={`/teacher/frequencia/${cls.id}`} style={{ textDecoration: 'none' }}>
                            <div style={{
                                padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.04)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                transition: 'background 0.15s', cursor: 'pointer',
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600, color: '#F1F5F9', fontSize: '0.9rem' }}>
                                        {cls.course?.name || 'Curso'}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 2 }}>
                                        {cls.city?.name} — {cls.city?.state} · {cls.classIdentifier}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{
                                        fontSize: '0.7rem', fontWeight: 600, padding: '2px 10px', borderRadius: 20,
                                        background: 'rgba(16,185,129,0.12)', color: '#10B981',
                                    }}>EM ANDAMENTO</span>
                                    <ChevronRightIcon style={{ width: 16, height: 16, color: '#64748B' }} />
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
        <div style={{
            background: '#1E293B', borderRadius: 12, padding: '1.25rem',
            border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '1rem',
        }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F1F5F9', fontFamily: 'Orbitron, sans-serif', lineHeight: 1 }}>
                    {value}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {label}
                </div>
            </div>
        </div>
    );
}
