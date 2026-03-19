'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api/client';
import Link from 'next/link';
import {
    AcademicCapIcon,
    ClockIcon,
    TrophyIcon,
    CalendarIcon,
    CheckCircleIcon,
    XCircleIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface StudentEnrollment {
    id: string;
    protocol: string;
    status: string;
    class: { classIdentifier: string; course: { name: string }; city: { name: string; state: string }; startDate: string; endDate: string; period: string };
}

interface AttendanceSummary {
    totalClasses: number;
    presentCount: number;
    absentCount: number;
    rate: number;
}

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        const steps = 30;
        const step = value / steps;
        let current = 0;
        const timer = setInterval(() => {
            current = Math.min(current + step, value);
            setDisplay(Math.floor(current));
            if (current >= value) clearInterval(timer);
        }, 30);
        return () => clearInterval(timer);
    }, [value]);
    return <>{display}{suffix}</>;
}

function CircularProgress({ value, size = 80, color = '#FFD600' }: { value: number; size?: number; color?: string }) {
    const r = (size - 12) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (value / 100) * circ;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={10} />
            <circle
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth={10}
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)' }}
            />
        </svg>
    );
}

export default function StudentDashboard() {
    const [user, setUser] = useState<any>(null);
    const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
    const [attendance, setAttendance] = useState<AttendanceSummary>({ totalClasses: 0, presentCount: 0, absentCount: 0, rate: 0 });
    const [certificates, setCertificates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const u = localStorage.getItem('user');
        if (u) setUser(JSON.parse(u));
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [enrollRes, certRes] = await Promise.allSettled([
                api.get('/students/me/enrollments'),
                api.get('/students/me/certificates'),
            ]);

            if (enrollRes.status === 'fulfilled') {
                const data = enrollRes.value.data || [];
                setEnrollments(Array.isArray(data) ? data : data.data || []);
            }
            if (certRes.status === 'fulfilled') {
                setCertificates(Array.isArray(certRes.value.data) ? certRes.value.data : []);
            }

            // EXEC-04: buscar frequência real do endpoint
            try {
                const attRes = await api.get('/students/me/attendance-summary');
                if (attRes.data && typeof attRes.data.rate === 'number') {
                    setAttendance(attRes.data);
                }
            } catch {
                // sem dados de frequência ainda — mantém zeros
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const activeEnrollments = enrollments.filter(e => ['ENROLLED', 'APPROVED'].includes(e.status));
    const initials = user?.name ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : 'AL';

    const PERIOD: Record<string, string> = { MORNING: '🌅 Manhã', AFTERNOON: '☀ Tarde', EVENING: '🌙 Noite' };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem', width: 40, height: 40 }} />
                <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO...</p>
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
            {/* Welcome banner */}
            <div style={{
                borderRadius: 18, overflow: 'hidden', position: 'relative',
                background: 'linear-gradient(135deg, #FFD600 0%, #FFC107 60%, #FFB300 100%)',
                padding: '1.75rem 2rem',
                boxShadow: '0 4px 20px rgba(255,214,0,0.3)',
            }}>
                <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(0,0,0,0.06)' }} />
                <div style={{ position: 'absolute', bottom: -30, left: 200, width: 120, height: 120, borderRadius: '50%', background: 'rgba(0,0,0,0.04)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', position: 'relative' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1rem', color: '#FFD600', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', flexShrink: 0 }}>
                        {initials}
                    </div>
                    <div>
                        <p style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '0.2rem' }}>Portal do Aluno</p>
                        <h1 style={{ fontFamily: 'Orbitron', fontSize: '1.4rem', fontWeight: 900, color: '#000', letterSpacing: '0.04em', lineHeight: 1.2 }}>
                            Olá, {user?.name?.split(' ')[0] || 'Aluno'}!
                        </h1>
                        <p style={{ fontSize: '0.82rem', color: 'rgba(0,0,0,0.6)', marginTop: '0.25rem' }}>Bem-vindo ao seu painel acadêmico UPGRADE</p>
                    </div>
                </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                {[
                    { icon: <AcademicCapIcon style={{ width: 20, height: 20 }} />, label: 'Matrículas Ativas', value: activeEnrollments.length, color: '#92400E', iconBg: '#FFD600', suffix: '' },
                    { icon: <CheckCircleIcon style={{ width: 20, height: 20 }} />, label: 'Frequência', value: attendance.rate, color: attendance.rate >= 75 ? '#059669' : '#DC2626', iconBg: attendance.rate >= 75 ? '#D1FAE5' : '#FEE2E2', suffix: '%' },
                    { icon: <TrophyIcon style={{ width: 20, height: 20 }} />, label: 'Certificados', value: certificates.length, color: '#7C3AED', iconBg: '#EDE9FE', suffix: '' },
                    { icon: <DocumentTextIcon style={{ width: 20, height: 20 }} />, label: 'Inscrições', value: enrollments.length, color: '#0891B2', iconBg: '#E0F2FE', suffix: '' },
                ].map((s, i) => (
                    <div key={i} className="stat-card animate-scale-in" style={{ animationDelay: `${i * 80}ms` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.85rem' }}>
                            <div style={{ width: 40, height: 40, borderRadius: 11, background: s.iconBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 3px 10px ${s.iconBg}55` }}>
                                {s.icon}
                            </div>
                        </div>
                        <div className="stat-label">{s.label}</div>
                        <div style={{ fontFamily: 'Orbitron', fontSize: '2rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>
                            <AnimatedNumber value={s.value} suffix={s.suffix} />
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                {/* Attendance Circle */}
                <div className="glass-card">
                    <div className="card-header">
                        <div className="card-title"><CheckCircleIcon style={{ width: 16, height: 16, color: '#FFD600' }} /> Frequência Geral</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            <CircularProgress value={attendance.rate} size={100} color={attendance.rate >= 75 ? '#059669' : '#DC2626'} />
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                <span style={{ fontFamily: 'Orbitron', fontSize: '1.1rem', fontWeight: 900, color: attendance.rate >= 75 ? '#059669' : '#DC2626', lineHeight: 1 }}>{attendance.rate}%</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1 }}>
                            {[
                                { label: 'Presenças', value: attendance.presentCount, color: '#059669', bg: '#DCFCE7' },
                                { label: 'Faltas', value: attendance.absentCount, color: '#DC2626', bg: '#FEF2F2' },
                                { label: 'Total de Aulas', value: attendance.totalClasses, color: '#374151', bg: '#F3F4F6' },
                            ].map(item => (
                                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0.75rem', borderRadius: 8, background: item.bg }}>
                                    <span style={{ fontSize: '0.78rem', color: item.color, fontWeight: 600 }}>{item.label}</span>
                                    <span style={{ fontFamily: 'Orbitron', fontWeight: 900, color: item.color, fontSize: '0.9rem' }}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {attendance.rate < 75 && (
                        <div style={{ marginTop: '1rem', padding: '0.6rem 0.85rem', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: '0.75rem', color: '#DC2626', fontWeight: 600 }}>
                            ⚠ Atenção: frequência abaixo do mínimo exigido (75%)
                        </div>
                    )}
                </div>

                {/* Quick Links */}
                <div className="glass-card">
                    <div className="card-header">
                        <div className="card-title">⚡ Acesso Rápido</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {[
                            { href: '/student/attendance', icon: '📋', label: 'Ver Frequência', sub: 'Calendário de presenças', color: '#FFD600' },
                            { href: '/student/enrollments', icon: '📄', label: 'Minhas Inscrições', sub: `${enrollments.length} inscrição(ões)`, color: '#0891B2' },
                            { href: '/student/certificates', icon: '🏆', label: 'Certificados', sub: `${certificates.length} emitido(s)`, color: '#7C3AED' },
                            { href: '/student/classes', icon: '🎓', label: 'Minhas Turmas', sub: `${activeEnrollments.length} ativa(s)`, color: '#059669' },
                        ].map(l => (
                            <Link key={l.href} href={l.href} style={{
                                display: 'flex', alignItems: 'center', gap: '0.85rem',
                                padding: '0.75rem 0.9rem', borderRadius: 10,
                                background: '#F9FAFB', border: '1px solid #E5E7EB',
                                textDecoration: 'none', transition: 'all 0.2s',
                            }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = l.color; (e.currentTarget as HTMLElement).style.background = l.color + '0D'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; }}
                            >
                                <span style={{ fontSize: '1.25rem' }}>{l.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{l.label}</div>
                                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{l.sub}</div>
                                </div>
                                <span style={{ color: '#D1D5DB', fontSize: '1rem' }}>›</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Active Enrollments */}
            {activeEnrollments.length > 0 && (
                <div className="glass-card">
                    <div className="card-header">
                        <div className="card-title"><AcademicCapIcon style={{ width: 16, height: 16, color: '#FFD600' }} /> Matrículas Ativas</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
                        {activeEnrollments.map((e, i) => (
                            <div key={e.id} className="animate-scale-in" style={{
                                animationDelay: `${i * 60}ms`,
                                padding: '1rem', borderRadius: 12,
                                background: '#FFFDE7', border: '1px solid #FEF08A',
                                borderLeft: '3px solid #FFD600',
                            }}>
                                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: '0.4rem' }}>{e.class?.course?.name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.6rem' }}>
                                    {e.class?.classIdentifier} · {e.class?.city?.name}/{e.class?.city?.state}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                                    <span style={{ color: '#9CA3AF' }}>{PERIOD[e.class?.period] || e.class?.period}</span>
                                    <span style={{ fontFamily: 'JetBrains Mono', color: '#B89B00', fontWeight: 600 }}>
                                        {e.class?.startDate ? new Date(e.class.startDate).toLocaleDateString('pt-BR') : '—'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
