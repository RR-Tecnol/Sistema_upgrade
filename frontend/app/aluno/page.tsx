'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api/client';
import {
    AcademicCapIcon,
    DocumentCheckIcon,
    CalendarDaysIcon,
    MapPinIcon,
    TruckIcon,
    ArrowRightOnRectangleIcon,
    ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';

/* ── Tipos ─────────────────────────────────────────── */
interface Enrollment {
    id: string;
    status: string;
    createdAt: string;
    class: {
        id: string;
        classIdentifier: string;
        startDate: string;
        endDate: string;
        period: string;
        status: string;
        course?: { name: string; workloadHours: number };
        city?: { name: string; state: string };
        truck?: { identifier: string; currentCity?: string };
    };
    attendanceRate?: number;
}

interface Certificate {
    id: string;
    verificationCode: string;
    issuedAt: string;
    status: string;
    class?: { classIdentifier: string; course?: { name: string } };
}

const PERIOD_LABELS: Record<string, string> = {
    MORNING: '☀️ Manhã',
    AFTERNOON: '🌤 Tarde',
    EVENING: '🌙 Noite',
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    APPROVED: { label: 'Aprovado', color: '#059669', bg: '#F0FDF4' },
    PENDING: { label: 'Aguardando', color: '#D97706', bg: '#FFFBEB' },
    COMPLETED: { label: 'Concluído', color: '#1D4ED8', bg: '#EFF6FF' },
    REJECTED: { label: 'Não aprovado', color: '#DC2626', bg: '#FEF2F2' },
    IN_PROGRESS: { label: 'Em andamento', color: '#7C3AED', bg: '#F5F3FF' },
};

const fmtDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

/* ── Card de Turma ─────────────────────────────────── */
function TurmaCard({ enrollment }: { enrollment: Enrollment }) {
    const st = STATUS_LABELS[enrollment.status] ?? STATUS_LABELS.PENDING;
    const cls = enrollment.class;
    const rate = enrollment.attendanceRate ?? null;

    return (
        <div style={{
            background: '#fff', borderRadius: 16, border: '1px solid #F3F4F6',
            padding: '1.25rem', borderLeft: '4px solid #FFD600',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                    <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.8rem', color: '#B89B00', letterSpacing: '0.08em' }}>
                        {cls.classIdentifier}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', marginTop: 2 }}>
                        {cls.course?.name ?? '—'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 2 }}>
                        Carga horária: {cls.course?.workloadHours ?? '—'}h
                    </div>
                </div>
                <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700,
                    background: st.bg, color: st.color, border: `1px solid ${st.color}30`,
                }}>
                    {st.label}
                </span>
            </div>

            {/* Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CalendarDaysIcon style={{ width: 13, height: 13, color: '#9CA3AF' }} />
                    <span style={{ fontSize: '0.75rem', color: '#374151' }}>
                        {fmtDate(cls.startDate?.split('T')[0])} → {fmtDate(cls.endDate?.split('T')[0])}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <MapPinIcon style={{ width: 13, height: 13, color: '#9CA3AF' }} />
                    <span style={{ fontSize: '0.75rem', color: '#374151' }}>
                        {cls.city?.name}/{cls.city?.state}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>{PERIOD_LABELS[cls.period] ?? cls.period}</span>
                </div>
                {cls.truck && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <TruckIcon style={{ width: 13, height: 13, color: '#9CA3AF' }} />
                        <span style={{ fontSize: '0.72rem', color: '#374151', fontFamily: 'JetBrains Mono' }}>
                            {cls.truck.identifier}
                            {cls.truck.currentCity ? ` · ${cls.truck.currentCity}` : ''}
                        </span>
                    </div>
                )}
            </div>

            {/* Frequência */}
            {rate !== null && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280' }}>
                            Minha Frequência
                        </span>
                        <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.85rem', color: rate >= 80 ? '#059669' : rate >= 75 ? '#D97706' : '#DC2626' }}>
                            {rate.toFixed(1)}%
                        </span>
                    </div>
                    <div style={{ height: 6, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${rate}%`, background: rate >= 80 ? '#059669' : rate >= 75 ? '#D97706' : '#DC2626', borderRadius: 3, transition: 'width 0.6s ease' }} />
                    </div>
                    {rate < 75 && (
                        <p style={{ fontSize: '0.68rem', color: '#DC2626', marginTop: 4, fontWeight: 600 }}>
                            ⚠️ Frequência abaixo do mínimo de 75%
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

/* ── Página Principal ───────────────────────────────── */
export default function PortalAlunoPage() {
    const router = useRouter();
    const [tab, setTab] = useState<'turmas' | 'certificados'>('turmas');
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) setUser(JSON.parse(stored));
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [enrollRes, certRes] = await Promise.allSettled([
                api.get('/enrollments/my'),
                api.get('/certificates/my'),
            ]);
            if (enrollRes.status === 'fulfilled') setEnrollments(enrollRes.value.data ?? []);
            if (certRes.status === 'fulfilled') setCertificates(certRes.value.data ?? []);
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    const activeEnrollments = enrollments.filter(e => ['APPROVED', 'IN_PROGRESS'].includes(e.status));
    const completedEnrollments = enrollments.filter(e => e.status === 'COMPLETED');

    return (
        <div style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <header style={{ background: '#111827', borderBottom: '3px solid #FFD600', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFD600', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.7rem', color: '#111827' }}>
                        UP
                    </div>
                    <div>
                        <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.85rem', color: '#FFD600', letterSpacing: '0.1em' }}>PORTAL DO ALUNO</div>
                        <div style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>Sistema Upgrade — Qualificação Profissional</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#F9FAFB' }}>{user?.name || 'Aluno'}</div>
                        <div style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>{user?.cpf || ''}</div>
                    </div>
                    <button onClick={handleLogout}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#9CA3AF', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                        <ArrowRightOnRectangleIcon style={{ width: 14, height: 14 }} /> Sair
                    </button>
                </div>
            </header>

            <main style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem 1rem' }}>
                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                    {[
                        { label: 'Turmas Ativas', value: activeEnrollments.length, color: '#B89B00', icon: <AcademicCapIcon style={{ width: 18, height: 18 }} /> },
                        { label: 'Cursos Concluídos', value: completedEnrollments.length, color: '#059669', icon: <ClipboardDocumentCheckIcon style={{ width: 18, height: 18 }} /> },
                        { label: 'Certificados', value: certificates.length, color: '#1D4ED8', icon: <DocumentCheckIcon style={{ width: 18, height: 18 }} /> },
                    ].map((k, i) => (
                        <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1px solid #F3F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                            <div style={{ color: k.color, marginBottom: 4 }}>{k.icon}</div>
                            <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.5rem', color: k.color }}>{k.value}</div>
                            <div style={{ fontSize: '0.68rem', color: '#6B7280', fontWeight: 600, marginTop: 2 }}>{k.label}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, padding: 4, background: '#F3F4F6', borderRadius: 12, width: 'fit-content', marginBottom: 20 }}>
                    {[
                        { key: 'turmas', label: '🎓 Minhas Turmas' },
                        { key: 'certificados', label: '🏆 Meus Certificados' },
                    ].map(t => (
                        <button key={t.key} onClick={() => setTab(t.key as any)}
                            style={{
                                padding: '8px 18px', borderRadius: 9, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                                border: 'none', transition: 'all 0.2s',
                                background: tab === t.key ? '#FFD600' : 'transparent',
                                color: tab === t.key ? '#000' : '#6B7280',
                                boxShadow: tab === t.key ? '0 2px 8px rgba(255,214,0,0.35)' : 'none',
                            }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Conteúdo */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF' }}>
                        <div style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</div>
                        <p style={{ fontSize: '0.8rem' }}>Carregando seus dados...</p>
                    </div>
                ) : tab === 'turmas' ? (
                    <div>
                        {enrollments.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: 16, border: '1px solid #F3F4F6' }}>
                                <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎓</div>
                                <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#374151' }}>Você não possui turmas ainda</p>
                                <p style={{ fontSize: '0.78rem', color: '#9CA3AF', marginTop: 4 }}>Quando sua inscrição for aprovada, ela aparecerá aqui</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: 12 }}>
                                {enrollments.length > 0 && <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9CA3AF', marginBottom: -4 }}>Todas as Matrículas ({enrollments.length})</p>}
                                {enrollments.map(e => <TurmaCard key={e.id} enrollment={e} />)}
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        {certificates.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: 16, border: '1px solid #F3F4F6' }}>
                                <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏆</div>
                                <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#374151' }}>Nenhum certificado emitido ainda</p>
                                <p style={{ fontSize: '0.78rem', color: '#9CA3AF', marginTop: 4 }}>Certificados são emitidos após concluir o curso com ≥80% de frequência</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: 12 }}>
                                {certificates.map(cert => (
                                    <div key={cert.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #F3F4F6', padding: '1.25rem', borderLeft: '4px solid #FFD600', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div>
                                                <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.7rem', color: '#B89B00', letterSpacing: '0.1em' }}>
                                                    {cert.verificationCode}
                                                </div>
                                                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#111827', marginTop: 2 }}>
                                                    {cert.class?.course?.name}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 2 }}>
                                                    Turma: {cert.class?.classIdentifier} · Emitido em {new Date(cert.issuedAt).toLocaleDateString('pt-BR')}
                                                </div>
                                            </div>
                                            <a
                                                href={`/certificado/verificar/${cert.verificationCode}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ padding: '8px 14px', borderRadius: 9, background: '#FFFDE7', border: '1px solid #FEF08A', color: '#92400E', fontWeight: 700, fontSize: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                🔍 Verificar
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Aviso sobre localização da carreta */}
                {activeEnrollments.length > 0 && tab === 'turmas' && (
                    <div style={{ marginTop: 16, background: '#EFF6FF', borderRadius: 12, padding: '0.85rem 1.1rem', border: '1px solid #BFDBFE', fontSize: '0.75rem', color: '#1E40AF' }}>
                        <TruckIcon style={{ width: 14, height: 14, display: 'inline', marginRight: 5 }} />
                        <strong>Localização da Carreta:</strong> A city e o local exatos da carreta são exibidos em cada turma acima. Para informações em tempo real, consulte o administrador.
                    </div>
                )}
            </main>
        </div>
    );
}
