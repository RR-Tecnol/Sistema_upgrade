'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from '@/components/ui/Toast';
import {
    BuildingLibraryIcon,
    ExclamationTriangleIcon,
    AcademicCapIcon,
    BanknotesIcon,
    FingerPrintIcon,
    ClipboardDocumentCheckIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/outline';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';

// ── Tipagem ──────────────────────────────────────────────────────────────────
const CLASS_STATUS_UI: Record<string, { bg: string; color: string; label: string }> = {
    PLANNED: { bg: '#F3F4F6', color: '#6B7280', label: 'Planejada' },
    ENROLLMENT_OPEN: { bg: '#DCFCE7', color: '#059669', label: 'Matrículas abertas' },
    ENROLLMENT_CLOSED: { bg: '#E0E7FF', color: '#4F46E5', label: 'Matrículas fechadas' },
    IN_PROGRESS: { bg: '#FFFDE7', color: '#B89B00', label: 'Em andamento' },
    COMPLETED: { bg: '#F5F3FF', color: '#7C3AED', label: 'Concluída' },
    CANCELLED: { bg: '#FEF2F2', color: '#DC2626', label: 'Cancelada' },
};

interface TurmaStats {
    id: string; classIdentifier: string; status: string;
    podeLancarFrequencia?: boolean;
    curso: string; cargaHoraria: number;
    cidade: string; estado: string;
    startDate: string; endDate: string;
    startTime: string | null; endTime: string | null;
    totalAlunos: number; aulasRealizadas: number;
    freqMedia: number | null; alunosEmRisco: number;
    ultimaAula: string | null; freqHojeRegistrada: boolean;
    progressoPct: number; diasRestantes: number;
    certificadosEmitidos: number;
}

interface AlunoEmRisco {
    studentId: string;
    studentName: string;
    studentEmail: string;
    studentPhone: string | null;
    cpf: string | null;
    freqPct: number;
    classId: string;
    classIdentifier: string;
    curso: string;
}

interface DashboardData {
    turmasAtivas: number; turmasPlanejadas?: number; turmasTotal?: number;
    totalAlunosEmRisco: number;
    certElegiveis: number; reembolsosPendentes: number;
    valorPendente: string; checkinHoje: boolean;
    checkinEditado?: boolean; checkinMotivo?: string;
    turmas: TurmaStats[];
    alunosEmRiscoDetalhe: AlunoEmRisco[];
    alertas: { tipo: string; turmaId?: string; turmaIdentifier?: string; mensagem: string; urgente: boolean }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function freqColor(pct: number | null) {
    if (pct === null) return '#9CA3AF';
    if (pct >= 80) return '#10B981';
    if (pct >= 75) return '#F59E0B';
    return '#EF4444';
}

function tempoDesdeUltimaAula(dateStr: string | null): string {
    if (!dateStr) return 'Nunca registrada';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (diff === 0) return 'Hoje';
    if (diff === 1) return 'Ontem';
    if (diff <= 7) return `${diff} dias atrás`;
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function horario(start: string | null, end: string | null): string {
    if (!start) return '';
    return `${start}${end ? '–' + end : ''}`;
}

// ── KpiCard ────────────────────────────────────────────────────────────────────
function KpiCard({
    icon, label, value, sub, color, alert, linkTo, onClick, loading,
}: {
    icon: React.ReactNode; label: string; value: string; sub?: string;
    color: string; alert?: boolean; linkTo?: string; onClick?: () => void; loading?: boolean;
}) {
    const inner = (
        <div
            className="stat-card animate-scale-in"
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                cursor: onClick || linkTo ? 'pointer' : 'default',
                transition: 'all 0.15s',
                border: alert ? `1.5px solid ${color}40` : undefined,
                position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={e => { if (onClick || linkTo) (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { if (onClick || linkTo) (e.currentTarget as HTMLElement).style.transform = ''; }}
        >
            {alert && (
                <div style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 0 3px ${color}30` }} />
            )}
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
                {loading
                    ? <div className="spinner" style={{ width: 18, height: 18, borderColor: color, borderTopColor: 'transparent' }} />
                    : icon}
            </div>
            <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#111827', fontFamily: 'Orbitron, sans-serif', lineHeight: 1 }}>
                    {value}
                </div>
                <div className="stat-label" style={{ marginTop: 3 }}>{label}</div>
                {sub && <div style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: 2 }}>{sub}</div>}
            </div>
        </div>
    );
    return linkTo
        ? <Link href={linkTo} style={{ textDecoration: 'none' }}>{inner}</Link>
        : <>{inner}</>;
}

// ── Dashboard Principal ───────────────────────────────────────────────────────
export default function TeacherDashboard() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [checkingIn, setCheckingIn] = useState(false);
    const [checkingOut, setCheckingOut] = useState(false);       // MEL-07
    const [checkoutDone, setCheckoutDone] = useState(false);     // MEL-07
    const [checkinTime, setCheckinTime] = useState<string | null>(null); // MEL-07

    // Estados do painel de alunos em risco
    const [showRiscoPanel, setShowRiscoPanel] = useState(false);
    const [alertingStu, setAlertingStu] = useState<string | null>(null);
    const [alertedStudents, setAlertedStudents] = useState<Set<string>>(new Set());

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

    useEffect(() => {
        api.get('/classes/teacher/dashboard')
            .then(r => setData(r.data))
            .catch((e: any) => {
                const msg = e?.response?.data?.message;
                toast.error(
                    typeof msg === 'string' ? msg : 'Não foi possível carregar o dashboard. Tente novamente.',
                );
            })
            .finally(() => setLoading(false));
    }, []);

    const handleCheckin = async () => {
        if (!data || data.checkinHoje || checkingIn) return;
        setCheckingIn(true);
        try {
            const res = await api.post('/teachers/me/checkin');
            const already = res.data?.alreadyRegistered === true;
            // MEL-07: guarda hora de entrada
            const hora = new Date(res.data?.checkedAt || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            setCheckinTime(hora);
            setData(d =>
                d
                    ? {
                          ...d,
                          checkinHoje: true,
                          alertas: d.alertas.filter(a => a.tipo !== 'checkin'),
                      }
                    : d,
            );
            toast.success(already ? 'Ponto de hoje já estava registrado.' : 'Ponto de hoje registrado com sucesso!');
        } catch (e: any) {
            const msg = e?.response?.data?.message;
            toast.error(typeof msg === 'string' ? msg : 'Não foi possível registrar o ponto. Tente novamente.');
        } finally {
            setCheckingIn(false);
        }
    };

    // MEL-07: registrar saída
    const handleCheckout = async () => {
        if (!data?.checkinHoje || checkingOut || checkoutDone) return;
        setCheckingOut(true);
        try {
            const res = await api.post('/teachers/me/checkout');
            const already = res.data?.alreadyRegistered === true;
            setCheckoutDone(true);
            toast.success(already ? 'Saída já estava registrada.' : 'Saída registrada com sucesso!');
        } catch (e: any) {
            const msg = e?.response?.data?.message;
            toast.error(typeof msg === 'string' ? msg : 'Não foi possível registrar a saída.');
        } finally {
            setCheckingOut(false);
        }
    };

    // Handler de alerta de risco — chama API, persiste notificação + WS
    const handleSendAlert = async (aluno: AlunoEmRisco) => {
        const key = aluno.studentId + aluno.classId;
        setAlertingStu(key);
        try {
            await api.post(`/classes/${aluno.classId}/aluno-risco`, { studentId: aluno.studentId });
            setAlertedStudents(prev => new Set(prev).add(key));
        } catch (e: any) {
            console.error('Erro ao enviar alerta:', e?.response?.data?.message || e.message);
        } finally {
            setAlertingStu(null);
        }
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            <AdminHeaderHero
                title={`DASHBOARD · ${user?.name?.split(' ')[0] || 'PROFESSOR'}`}
                subtitle={`${greeting}, Professor(a)! ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}`}
                badge="PERFIL PROFESSOR"
                rightSlot={!loading && data ? (
                    <div style={{ padding: '0.45rem 0.8rem', borderRadius: 10, background: 'rgba(255,214,0,0.12)', border: '1px solid rgba(255,214,0,0.35)', textAlign: 'right' }}>
                        <div style={{ fontSize: '0.62rem', color: '#FFD600', fontWeight: 700, letterSpacing: '0.08em' }}>MINHAS TURMAS</div>
                        <div style={{ fontFamily: 'Orbitron', fontSize: '1.6rem', fontWeight: 900, color: '#FFD600', lineHeight: 1 }}>
                            {data.turmasTotal ?? data.turmas.length}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'rgba(255,214,0,0.85)', marginTop: 4 }}>
                            {data.turmasAtivas} em andamento
                            {(data.turmasPlanejadas ?? 0) > 0 ? ` · ${data.turmasPlanejadas} planejada(s)` : ''}
                        </div>
                    </div>
                ) : undefined}
            />

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO DASHBOARD...</p>
                </div>
            ) : !data ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
                    <p style={{ color: 'var(--text-muted)' }}>Não foi possível carregar os dados do dashboard.</p>
                </div>
            ) : (
                <>
                    {/* ── ZONA 1: 5 KPIs ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                        <AnimatedKpiCard
                            label="Turmas Ativas"
                            value={data.turmasAtivas}
                            sub={
                                (data.turmasPlanejadas ?? 0) > 0
                                    ? `${data.turmasPlanejadas} planejada(s) visível(is) no painel`
                                    : data.turmas.find(t => t.podeLancarFrequencia)
                                      ? `próx. encerra em ${data.turmas.find(t => t.podeLancarFrequencia)!.diasRestantes}d`
                                      : 'nenhuma em andamento'
                            }
                            color="#10B981"
                            bg="#F0FDF4"
                            border="#BBF7D0"
                            icon={<BuildingLibraryIcon style={{ width: 18, height: 18 }} />}
                        />
                        <AnimatedKpiCard
                            label="Alunos em Risco"
                            value={data.totalAlunosEmRisco}
                            sub={data.totalAlunosEmRisco > 0 ? (showRiscoPanel ? 'clique para ocultar ▲' : 'clique para ver quem ▼') : 'frequência ok'}
                            color={data.totalAlunosEmRisco > 0 ? '#EF4444' : '#9CA3AF'}
                            bg={data.totalAlunosEmRisco > 0 ? '#FEF2F2' : '#F9FAFB'}
                            border={data.totalAlunosEmRisco > 0 ? '#FECACA' : '#E5E7EB'}
                            icon={<ExclamationTriangleIcon style={{ width: 18, height: 18 }} />}
                        />
                        <AnimatedKpiCard
                            label="Cert. Pendentes"
                            value={data.certElegiveis}
                            sub="aguardando emissão"
                            color={data.certElegiveis > 0 ? '#8B5CF6' : '#9CA3AF'}
                            bg={data.certElegiveis > 0 ? '#F5F3FF' : '#F9FAFB'}
                            border={data.certElegiveis > 0 ? '#DDD6FE' : '#E5E7EB'}
                            icon={<AcademicCapIcon style={{ width: 18, height: 18 }} />}
                        />
                        <AnimatedKpiCard
                            label="Reembolsos"
                            value={0}
                            displayValue={data.reembolsosPendentes > 0 ? `R$ ${Number(data.valorPendente).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                            sub={data.reembolsosPendentes > 0 ? `${data.reembolsosPendentes} pendente(s)` : 'em dia'}
                            color={data.reembolsosPendentes > 0 ? '#F59E0B' : '#9CA3AF'}
                            bg={data.reembolsosPendentes > 0 ? '#FFF7ED' : '#F9FAFB'}
                            border={data.reembolsosPendentes > 0 ? '#FED7AA' : '#E5E7EB'}
                            icon={<BanknotesIcon style={{ width: 18, height: 18 }} />}
                            compact
                        />
                        <AnimatedKpiCard
                            label="Ponto Hoje"
                            value={0}
                            displayValue={checkingIn ? '⏳' : data.checkinHoje ? '✓' : '⚠'}
                            sub={data.checkinHoje
                                ? (checkoutDone ? 'entrada + saída registradas' : checkinTime ? `entrada: ${checkinTime}` : 'check-in registrado')
                                : 'clique para registrar'}
                            color={data.checkinHoje ? '#10B981' : '#F59E0B'}
                            bg={data.checkinHoje ? '#F0FDF4' : '#FFFBEB'}
                            border={data.checkinHoje ? '#BBF7D0' : '#FDE68A'}
                            icon={<FingerPrintIcon style={{ width: 18, height: 18 }} />}
                            onClick={data.checkinHoje || checkingIn ? undefined : handleCheckin}
                        />
                    </div>

                    {/* MEL-07: Botão de saída — aparece quando check-in feito e saída ainda não registrada */}
                    {data.checkinHoje && !checkoutDone && (
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: '1rem', padding: '0.75rem 1rem', borderRadius: 12,
                            background: '#FFF7ED', border: '1px solid rgba(245,158,11,0.35)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ fontSize: '1.1rem' }}>🚪</span>
                                <div>
                                    <div style={{ fontWeight: 700, color: '#92400E', fontSize: '0.82rem' }}>Registrar Saída</div>
                                    <div style={{ fontSize: '0.68rem', color: '#B45309' }}>Entrada registrada{checkinTime ? ` às ${checkinTime}` : ''}. Clique ao encerrar o expediente.</div>
                                </div>
                            </div>
                            <button
                                onClick={handleCheckout}
                                disabled={checkingOut}
                                style={{
                                    padding: '0.5rem 1.1rem', borderRadius: 9,
                                    background: checkingOut ? '#E5E7EB' : 'linear-gradient(135deg,#F59E0B,#D97706)',
                                    border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.82rem',
                                    cursor: checkingOut ? 'not-allowed' : 'pointer',
                                    whiteSpace: 'nowrap', flexShrink: 0,
                                }}
                            >
                                {checkingOut ? 'Registrando…' : '🕒 Bater Saída'}
                            </button>
                        </div>
                    )}

                    {data.checkinEditado && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex gap-3 animate-fade-in mt-4">
                            <ExclamationTriangleIcon className="w-6 h-6 text-red-500 shrink-0" />
                            <div>
                                <h3 className="text-sm font-bold text-red-800">⚠️ Ponto Modificado Pelo Administrador</h3>
                                <p className="text-sm text-red-700 mt-1">
                                    Seu registro de ponto de hoje foi alterado pelo painel administrativo. 
                                    Motivo registrado: <strong>{data.checkinMotivo || 'Não informado'}</strong>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── PAINEL ALUNOS EM RISCO (expansível) ── */}
                    {showRiscoPanel && data.alunosEmRiscoDetalhe && data.alunosEmRiscoDetalhe.length > 0 && (
                        <div className="animate-fade-in" style={{
                            background: '#fff', borderRadius: 16,
                            border: '1.5px solid rgba(239,68,68,0.2)',
                            overflow: 'hidden', boxShadow: '0 2px 12px rgba(239,68,68,0.06)',
                        }}>
                            {/* Header */}
                            <div style={{
                                padding: '0.85rem 1.25rem',
                                background: 'rgba(239,68,68,0.04)',
                                borderBottom: '1px solid rgba(239,68,68,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <span style={{ fontSize: '1rem' }}>⚠️</span>
                                    <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.68rem', fontWeight: 800, color: '#DC2626', letterSpacing: '0.1em' }}>
                                        ALUNOS EM RISCO DE REPROVAÇÃO
                                    </span>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', color: '#DC2626' }}>
                                        {data.alunosEmRiscoDetalhe.length} aluno(s)
                                    </span>
                                </div>
                                <button onClick={() => setShowRiscoPanel(false)}
                                    style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}>
                                    ✕
                                </button>
                            </div>

                            {/* Lista */}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {data.alunosEmRiscoDetalhe.map((aluno, i) => {
                                    const key = aluno.studentId + aluno.classId;
                                    const jaAlertado = alertedStudents.has(key);
                                    const enviando = alertingStu === key;

                                    return (
                                        <div key={key} style={{
                                            padding: '1rem 1.25rem',
                                            borderBottom: i < data.alunosEmRiscoDetalhe.length - 1 ? '1px solid #FEF2F2' : 'none',
                                            display: 'flex', alignItems: 'center', gap: '1rem',
                                            background: i % 2 === 0 ? '#fff' : '#FFFAFA',
                                        }}>
                                            {/* Avatar */}
                                            <div style={{
                                                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                                                background: 'rgba(239,68,68,0.12)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 800, fontSize: '0.78rem', color: '#DC2626',
                                            }}>
                                                {aluno.studentName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                                            </div>

                                            {/* Dados */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {aluno.studentName}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>
                                                    {aluno.curso} · <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem' }}>{aluno.classIdentifier}</span>
                                                </div>
                                                {aluno.studentEmail && (
                                                    <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 1 }}>
                                                        ✉ {aluno.studentEmail}
                                                        {aluno.studentPhone && ` · 📱 ${aluno.studentPhone}`}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Frequência */}
                                            <div style={{ textAlign: 'center', flexShrink: 0 }}>
                                                <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: aluno.freqPct < 60 ? '#DC2626' : '#F59E0B' }}>
                                                    {aluno.freqPct}%
                                                </div>
                                                <div style={{ fontSize: '0.6rem', color: '#9CA3AF', whiteSpace: 'nowrap' }}>frequência</div>
                                            </div>

                                            {/* Botão alerta */}
                                            <div style={{ flexShrink: 0 }}>
                                                {jaAlertado ? (
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', padding: '0.35rem 0.75rem', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', whiteSpace: 'nowrap' }}>
                                                        ✓ Alerta enviado
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSendAlert(aluno)}
                                                        disabled={enviando}
                                                        style={{
                                                            padding: '0.4rem 0.85rem', borderRadius: 8,
                                                            background: enviando ? '#F3F4F6' : 'rgba(239,68,68,0.1)',
                                                            border: '1px solid rgba(239,68,68,0.25)',
                                                            color: enviando ? '#9CA3AF' : '#DC2626',
                                                            fontWeight: 700, fontSize: '0.72rem',
                                                            cursor: enviando ? 'not-allowed' : 'pointer',
                                                            whiteSpace: 'nowrap', transition: 'all 0.15s',
                                                        }}
                                                    >
                                                        {enviando ? '⏳ Enviando...' : '⚠️ Enviar Alerta'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Rodapé */}
                            <div style={{ padding: '0.65rem 1.25rem', background: 'rgba(239,68,68,0.03)', borderTop: '1px solid rgba(239,68,68,0.08)', fontSize: '0.7rem', color: '#9CA3AF' }}>
                                💡 O aluno receberá uma notificação no app e o admin será notificado automaticamente.
                            </div>
                        </div>
                    )}

                    {/* ── ZONA 2: Ações Pendentes ── */}
                    {data.alertas.length > 0 && (
                        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                            <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: data.alertas.some(a => a.urgente) ? '#EF4444' : '#F59E0B', flexShrink: 0 }} />
                                <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.68rem', fontWeight: 800, color: '#111827', letterSpacing: '0.1em' }}>
                                    AÇÕES PENDENTES
                                </span>
                                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#9CA3AF' }}>
                                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                                </span>
                            </div>
                            {data.alertas.map((alerta, i) => (
                                <div key={i} style={{
                                    padding: '0.85rem 1.25rem',
                                    borderBottom: i < data.alertas.length - 1 ? '1px solid #F9FAFB' : 'none',
                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                }}>
                                    <div style={{
                                        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: alerta.urgente ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                        fontSize: '1rem',
                                    }}>
                                        {alerta.tipo === 'freq_pendente' ? '📋'
                                         : alerta.tipo === 'aluno_risco' ? '⚠️'
                                         : alerta.tipo === 'encerrando' ? '📅'
                                         : alerta.tipo === 'checkin' ? '🖐'
                                         : '📌'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827' }}>
                                            {alerta.mensagem}
                                        </div>
                                    </div>
                                    {alerta.tipo === 'freq_pendente' && alerta.turmaId && (
                                        <Link href={`/teacher/frequencia/${alerta.turmaId}`} style={{ textDecoration: 'none' }}>
                                            <button style={{ padding: '0.35rem 0.85rem', borderRadius: 8, background: 'linear-gradient(135deg,#FFD600,#F59E0B)', border: 'none', color: '#0F172A', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                Lançar agora
                                            </button>
                                        </Link>
                                    )}
                                    {alerta.tipo === 'aluno_risco' && alerta.turmaId && (
                                        <button
                                            onClick={() => setShowRiscoPanel(true)}
                                            style={{ padding: '0.35rem 0.85rem', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                        >
                                            Ver quem ↑
                                        </button>
                                    )}
                                    {alerta.tipo === 'checkin' && (
                                        <button onClick={handleCheckin} disabled={checkingIn || data.checkinHoje}
                                            style={{ padding: '0.35rem 0.85rem', borderRadius: 8, background: checkingIn || data.checkinHoje ? '#F3F4F6' : '#F0FDF4', border: '1px solid #BBF7D0', color: checkingIn || data.checkinHoje ? '#9CA3AF' : '#059669', fontWeight: 700, fontSize: '0.72rem', cursor: checkingIn || data.checkinHoje ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                                            {checkingIn ? 'Registrando...' : data.checkinHoje ? 'Já registado' : 'Registrar ponto'}
                                        </button>
                                    )}
                                    {alerta.tipo === 'encerrando' && alerta.turmaId && (
                                        <Link href={`/teacher/frequencia/${alerta.turmaId}`} style={{ textDecoration: 'none' }}>
                                            <button style={{ padding: '0.35rem 0.85rem', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#D97706', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                Ver turma
                                            </button>
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── ZONA 3: Cards de turma enriquecidos ── */}
                    {data.turmas.length === 0 ? (
                        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎓</div>
                            <p style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>NENHUMA TURMA VINCULADA</p>
                            <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: 8 }}>Peça à coordenação para vinculá-lo a um período de curso.</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem', fontWeight: 800, color: '#111827', letterSpacing: '0.1em' }}>MINHAS TURMAS</span>
                                <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>({data.turmas.length})</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                                {data.turmas.map((turma, i) => {
                                    const fc = freqColor(turma.freqMedia);
                                    const ultimaAulaLabel = tempoDesdeUltimaAula(turma.ultimaAula);
                                    const diasLabel = turma.diasRestantes === 0 ? 'Encerra hoje!'
                                        : turma.diasRestantes === 1 ? 'Encerra amanhã'
                                        : `Encerra em ${turma.diasRestantes} dias`;
                                    const statusCfg = CLASS_STATUS_UI[turma.status] || CLASS_STATUS_UI.PLANNED;
                                    const isPlanejada = turma.podeLancarFrequencia === false;

                                    return (
                                        <Link
                                            key={turma.id}
                                            href={`/teacher/frequencia/${turma.id}`}
                                            style={{ textDecoration: 'none', display: 'block' }}
                                        >
                                        <div
                                            className="animate-scale-in"
                                            style={{
                                                animationDelay: `${i * 60}ms`,
                                                background: isPlanejada
                                                    ? 'linear-gradient(180deg, #F9FAFB 0%, #F3F4F6 100%)'
                                                    : '#fff',
                                                borderRadius: 16,
                                                border: isPlanejada
                                                    ? '1px solid #D1D5DB'
                                                    : turma.freqHojeRegistrada
                                                      ? '1.5px solid rgba(16,185,129,0.2)'
                                                      : '1.5px solid rgba(255,214,0,0.3)',
                                                padding: '1.25rem', display: 'flex',
                                                flexDirection: 'column', gap: '1rem',
                                                boxShadow: isPlanejada ? '0 1px 4px rgba(0,0,0,0.04)' : '0 2px 8px rgba(0,0,0,0.04)',
                                                transition: 'all 0.2s',
                                                cursor: 'pointer',
                                            }}
                                            onMouseEnter={e => {
                                                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(0,0,0,0.08)';
                                                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                                            }}
                                            onMouseLeave={e => {
                                                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                                                (e.currentTarget as HTMLElement).style.transform = '';
                                            }}
                                        >
                                            {/* Header do card */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 700, color: isPlanejada ? '#4B5563' : '#111827', fontSize: '0.92rem', marginBottom: 4 }}>
                                                        {turma.curso}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.62rem', color: isPlanejada ? '#6B7280' : '#9CA3AF', background: isPlanejada ? '#E5E7EB' : '#F9FAFB', padding: '2px 7px', borderRadius: 5, border: '1px solid #E5E7EB' }}>
                                                            {turma.classIdentifier}
                                                        </span>
                                                        {turma.startTime && (
                                                            <span style={{ fontSize: '0.65rem', color: '#6B7280', fontWeight: 600 }}>
                                                                🕐 {horario(turma.startTime, turma.endTime)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ flexShrink: 0, marginLeft: '0.5rem' }}>
                                                    {isPlanejada ? (
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.color}33` }}>
                                                            {statusCfg.label}
                                                        </span>
                                                    ) : turma.freqHojeRegistrada ? (
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }}>
                                                            ✓ Freq. hoje
                                                        </span>
                                                    ) : turma.totalAlunos > 0 ? (
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: 'rgba(245,158,11,0.1)', color: '#D97706', border: '1px solid rgba(245,158,11,0.25)' }}>
                                                            ⚠ Pendente
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.color}33` }}>
                                                            {statusCfg.label}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Localização */}
                                            <div style={{ fontSize: '0.75rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                📍 {turma.cidade} — {turma.estado}
                                                {turma.totalAlunos > 0 && (
                                                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#9CA3AF' }}>
                                                        👥 {turma.totalAlunos} aluno{turma.totalAlunos !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>

                                            {isPlanejada && (
                                                <div style={{ fontSize: '0.72rem', color: '#6B7280', lineHeight: 1.45, padding: '0.5rem 0.65rem', borderRadius: 8, background: '#E5E7EB', border: '1px solid #D1D5DB' }}>
                                                    Turma ainda não iniciada. Clique para consultar alunos, calendário e demais informações. O lançamento de frequência libera quando a turma estiver <strong>em andamento</strong>.
                                                </div>
                                            )}

                                            {/* Barra de progresso */}
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Progresso do Curso</span>
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: turma.diasRestantes <= 7 ? '#EF4444' : '#6B7280' }}>
                                                        {diasLabel}
                                                    </span>
                                                </div>
                                                <div style={{ height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', borderRadius: 3, width: `${turma.progressoPct}%`, background: turma.diasRestantes <= 7 ? '#EF4444' : 'linear-gradient(90deg,#FFD600,#F59E0B)', transition: 'width 0.6s ease' }} />
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                                                    <span style={{ fontSize: '0.6rem', color: '#9CA3AF' }}>
                                                        {turma.aulasRealizadas} aula{turma.aulasRealizadas !== 1 ? 's' : ''} realizadas
                                                    </span>
                                                    <span style={{ fontSize: '0.6rem', color: '#9CA3AF' }}>{turma.progressoPct}%</span>
                                                </div>
                                            </div>

                                            {/* Frequência média */}
                                            {!isPlanejada && turma.freqMedia !== null && (
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Frequência Média</span>
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: fc }}>
                                                            {turma.freqMedia}%
                                                            {turma.alunosEmRisco > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowRiscoPanel(true); }}
                                                                    style={{ marginLeft: 6, fontSize: '0.6rem', color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700 }}
                                                                >
                                                                    ⚠ {turma.alunosEmRisco} em risco
                                                                </button>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div style={{ height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', borderRadius: 3, width: `${turma.freqMedia}%`, background: fc, transition: 'width 0.6s ease' }} />
                                                    </div>
                                                    <div style={{ fontSize: '0.6rem', color: '#9CA3AF', marginTop: 3 }}>
                                                        Última aula: {ultimaAulaLabel}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Ações do card */}
                                            <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.5rem', borderTop: isPlanejada ? '1px solid #D1D5DB' : '1px solid #F3F4F6', marginTop: 'auto' }}>
                                                <span style={{
                                                    flex: 1, display: 'block', textAlign: 'center', padding: '0.5rem', borderRadius: 9,
                                                    fontWeight: 700, fontSize: '0.75rem',
                                                    background: isPlanejada ? '#E5E7EB' : turma.freqHojeRegistrada ? '#F0FDF4' : 'linear-gradient(135deg,#FFD600,#F59E0B)',
                                                    color: isPlanejada ? '#4B5563' : turma.freqHojeRegistrada ? '#059669' : '#0F172A',
                                                }}>
                                                    {isPlanejada ? '👁 Ver turma e informações' : turma.freqHojeRegistrada ? '✓ Ver Frequência' : '📋 Lançar Frequência'}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push('/teacher/certificados'); }}
                                                    style={{ padding: '0.5rem 0.85rem', borderRadius: 9, background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 600, fontSize: '0.72rem', cursor: 'pointer' }}
                                                    title="Certificados"
                                                >
                                                    🎓
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push('/teacher/historico'); }}
                                                    style={{ padding: '0.5rem 0.85rem', borderRadius: 9, background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 600, fontSize: '0.72rem', cursor: 'pointer' }}
                                                    title="Histórico"
                                                >
                                                    📊
                                                </button>
                                            </div>
                                        </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* ── ZONA 4: CTA Frequência rápida ── */}
                    {data.turmas.some(t => t.podeLancarFrequencia && !t.freqHojeRegistrada) ? (
                        <Link href="/teacher/frequencia" style={{ textDecoration: 'none', display: 'block' }}>
                            <div style={{
                                background: 'linear-gradient(135deg, #FFD600, #F59E0B)',
                                borderRadius: 12, padding: '1rem 1.5rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                cursor: 'pointer', transition: 'opacity 0.2s', minHeight: 64,
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <ClipboardDocumentCheckIcon style={{ width: 28, height: 28, color: '#0F172A' }} />
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '1rem', fontFamily: 'Orbitron, sans-serif' }}>
                                            REGISTRAR FREQUÊNCIA
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: '#1E293B' }}>
                                            {data.turmas.filter(t => t.podeLancarFrequencia && !t.freqHojeRegistrada).length} turma(s) com lançamento pendente hoje
                                        </div>
                                    </div>
                                </div>
                                <ChevronRightIcon style={{ width: 22, height: 22, color: '#0F172A' }} />
                            </div>
                        </Link>
                    ) : (
                        <Link href="/teacher/frequencia" style={{ textDecoration: 'none', display: 'block' }}>
                            <div style={{
                                background: '#F0FDF4', border: '1.5px solid rgba(16,185,129,0.25)',
                                borderRadius: 12, padding: '1rem 1.5rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                cursor: 'pointer', minHeight: 64,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <ClipboardDocumentCheckIcon style={{ width: 28, height: 28, color: '#059669' }} />
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#059669', fontSize: '1rem', fontFamily: 'Orbitron, sans-serif' }}>
                                            ✓ FREQUÊNCIAS EM DIA
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: '#065F46' }}>Ver frequências registradas</div>
                                    </div>
                                </div>
                                <ChevronRightIcon style={{ width: 22, height: 22, color: '#059669' }} />
                            </div>
                        </Link>
                    )}
                </>
            )}
        </div>
    );
}
