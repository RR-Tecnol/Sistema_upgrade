'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api/client';
import Link from 'next/link';
import { useAuthStore } from '@/stores/useAuthStore';
import {
    AcademicCapIcon,
    CheckCircleIcon,
    TrophyIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { RANKS, getRankConfig, calcXP, calcAchievements, RANK_PREV_KEY, type Achievement } from '@/lib/gamification';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';

// ── Títulos temáticos Solo Leveling ─────────────────────────────────────────
const LEVEL_TITLES: Record<string, string> = {
    'E': 'Recém Chegado',
    'D': 'Aluno Rank-D',
    'C': 'Comprometido',
    'B': 'Aluno Dedicado',
    'A': 'Aluno de Excelência',
    'S': 'Shadow Scholar',
};

interface StudentEnrollment {
    id: string;
    protocol: string;
    status: string;
    class: { id: string; classIdentifier: string; course: { name: string }; city: { name: string; state: string }; startDate: string; endDate: string; period: string };
}

interface AttendanceSummary {
    totalClasses: number;
    presentCount: number;
    absentCount: number;
    rate: number;
}

type CertRisk = 'ok' | 'watch' | 'risk' | 'critical';

interface CertificateProgressPayload {
    worstRisk: CertRisk;
    items: Array<{
        courseName: string;
        classIdentifier: string;
        riskLevel: CertRisk;
        attendanceRatePct: number;
        expectedTeachingDaysSoFar?: number;
        awaitsAttendanceRoll?: boolean;
        calendarLowCoverage?: boolean;
    }>;
}

// ── ProgressOrb — SVG circular com partículas ────────────────────────────────
function ProgressOrb({ value, rankColor, rankLetter, size = 100 }: { value: number; rankColor: string; rankLetter: string; size?: number }) {
    const r    = (size - 14) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (value / 100) * circ;
    const cx   = size / 2;
    const cy   = size / 2;

    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            {/* SVG rings */}
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
                {/* Fundo */}
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E5E7EB" strokeWidth={10} />
                {/* Progresso */}
                <circle
                    cx={cx} cy={cy} r={r} fill="none"
                    stroke={rankColor} strokeWidth={10}
                    strokeDasharray={`${dash} ${circ}`}
                    strokeLinecap="round"
                    style={{
                        transition: 'stroke-dasharray 1.4s cubic-bezier(0.16,1,0.3,1)',
                        filter: `drop-shadow(0 0 6px ${rankColor})`,
                    }}
                />
                {/* Anel externo — estático, sem loop */}
                <circle
                    cx={cx} cy={cy} r={r + 6} fill="none"
                    stroke={rankColor} strokeWidth={1.5}
                    strokeDasharray={`${circ * 0.08} ${circ * 0.92}`}
                    style={{ opacity: 0.25 }}
                />
            </svg>

            {/* Centro — rank + percentual */}
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
            }}>
                <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.6rem', color: rankColor, lineHeight: 1 }}>
                    {rankLetter}
                </div>
                <div style={{ fontSize: '0.54rem', color: rankColor, fontWeight: 800, opacity: 0.75 }}>
                    {value}%
                </div>
            </div>

            {/* 3 partículas flutuantes */}
            {[0, 120, 240].map((deg, i) => {
                const rad = (deg * Math.PI) / 180;
                const r2  = size / 2 - 4;
                const px  = cx + r2 * Math.cos(rad);
                const py  = cy + r2 * Math.sin(rad);
                return (
                    <div
                        key={i}
                        style={{
                            position: 'absolute', width: 5, height: 5, borderRadius: '50%',
                            background: rankColor, opacity: 0.4,
                            top: py - 2.5, left: px - 2.5,
                            animation: `float-particle ${1.5 + i * 0.5}s ease-in-out infinite`,
                            animationDelay: `${i * 0.3}s`,
                        }}
                    />
                );
            })}
        </div>
    );
}

// ── QuickDrawer — createPortal, slide da direita ─────────────────────────────
function QuickDrawer({ open, onClose, title, children }: {
    open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
    useEffect(() => {
        if (!open) return;
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [open, onClose]);

    if (!open) return null;

    return createPortal(
        <div
            className="fade-backdrop"
            style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="slide-right"
                style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0,
                    width: '100%', maxWidth: 400,
                    background: '#fff', boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
                    display: 'flex', flexDirection: 'column', overflowY: 'auto',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '1.25rem 1.5rem', flexShrink: 0,
                    background: 'linear-gradient(135deg, #FFD600, #F59E0B)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.8rem', color: '#000', letterSpacing: '0.1em' }}>
                        {title}
                    </span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#000', lineHeight: 1 }}>✕</button>
                </div>
                {/* Body */}
                <div style={{ flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}

// ── Missões ──────────────────────────────────────────────────────────────────
interface DailyMission {
    id: string; icon: string; title: string; description: string;
    xpReward: number; completed: boolean;
    progress: number; // 0.0 a 1.0
}

function calcDailyMissions(
    attendance: { rate: number; presentCount: number; totalClasses: number },
    certificates: any[],
): DailyMission[] {
    return [
        { id: 'freq_75', icon: '📊', title: 'Frequência ≥ 75%', description: `Atual: ${attendance.rate}% — mínimo para aprovação`, xpReward: 50, completed: attendance.rate >= 75, progress: Math.min(1, attendance.rate / 75) },
        { id: 'freq_90', icon: '🚀', title: 'Frequência ≥ 90%', description: 'Desempenho excepcional — Rank A', xpReward: 100, completed: attendance.rate >= 90, progress: Math.min(1, attendance.rate / 90) },
        { id: 'pres_5',  icon: '✅', title: '5 Presenças',       description: `${attendance.presentCount} / 5 presenças registradas`, xpReward: 25, completed: attendance.presentCount >= 5, progress: Math.min(1, attendance.presentCount / 5) },
        { id: 'pres_20', icon: '💪', title: '20 Presenças',      description: `${attendance.presentCount} / 20 presenças registradas`, xpReward: 75, completed: attendance.presentCount >= 20, progress: Math.min(1, attendance.presentCount / 20) },
        { id: 'cert_1',  icon: '🏆', title: 'Primeiro Certificado', description: 'Conclua um curso com ≥ 75% de presença', xpReward: 150, completed: certificates.length >= 1, progress: Math.min(1, certificates.length / 1) },
        { id: 'cert_3',  icon: '👑', title: '3 Certificados',    description: `${certificates.length} / 3 certificados obtidos`, xpReward: 300, completed: certificates.length >= 3, progress: Math.min(1, certificates.length / 3) },
    ];
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function StudentDashboard() {
    const { user } = useAuthStore();
    const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
    const [attendance, setAttendance] = useState<AttendanceSummary>({ totalClasses: 0, presentCount: 0, absentCount: 0, rate: 0 });
    const [certificates, setCertificates] = useState<any[]>([]);
    const [certProgress, setCertProgress] = useState<CertificateProgressPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [levelUpData, setLevelUpData] = useState<{ from: string; to: string; toColor: string; toLabel: string } | null>(null);
    const [mounted, setMounted] = useState(false);
    const [drawer, setDrawer] = useState<'matriculas' | 'frequencia' | 'certificados' | null>(null);
    const [selectedMission, setSelectedMission] = useState<DailyMission | null>(null);
    const [showFreqDetail, setShowFreqDetail] = useState(false);

    useEffect(() => { setMounted(true); }, []);
    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [enrollRes, certRes, progRes] = await Promise.allSettled([
                api.get('/students/me/enrollments'),
                api.get('/students/me/certificates'),
                api.get('/students/me/certificate-progress'),
            ]);
            if (enrollRes.status === 'fulfilled') {
                const data = enrollRes.value.data || [];
                setEnrollments(Array.isArray(data) ? data : data.data || []);
            }
            if (certRes.status === 'fulfilled') {
                setCertificates(Array.isArray(certRes.value.data) ? certRes.value.data : []);
            }
            if (progRes.status === 'fulfilled' && progRes.value.data) {
                setCertProgress(progRes.value.data as CertificateProgressPayload);
            } else {
                setCertProgress(null);
            }
            try {
                const attRes = await api.get('/students/me/attendance-summary');
                if (attRes.data && typeof attRes.data.rate === 'number') {
                    setAttendance(attRes.data);
                    try {
                        const rankCfgNow = getRankConfig(attRes.data.rate);
                        const prevRankStr = localStorage.getItem(RANK_PREV_KEY);
                        const currentRankStr = rankCfgNow.rank;
                        if (prevRankStr && prevRankStr !== currentRankStr) {
                            const prevIdx = RANKS.findIndex(r => r.rank === prevRankStr);
                            const curIdx = RANKS.indexOf(rankCfgNow);
                            if (curIdx > prevIdx) {
                                setLevelUpData({ from: prevRankStr, to: rankCfgNow.rank, toColor: rankCfgNow.color, toLabel: rankCfgNow.label });
                            }
                        }
                        localStorage.setItem(RANK_PREV_KEY, currentRankStr);
                    } catch {}
                }
            } catch {}
        } catch {}
        finally { setLoading(false); }
    };

    const closeDrawer = useCallback(() => setDrawer(null), []);

    const activeEnrollments = enrollments.filter(e => ['ENROLLED', 'APPROVED'].includes(e.status));
    const PERIOD: Record<string, string> = { MORNING: '🌅 Manhã', AFTERNOON: '☀ Tarde', EVENING: '🌙 Noite' };

    const certAlertItems = (certProgress?.items ?? []).filter(i => i.riskLevel !== 'ok').slice(0, 5);
    const worst = certProgress?.worstRisk ?? 'ok';

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem', width: 40, height: 40 }} />
                <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO...</p>
            </div>
        </div>
    );

    // ── Cálculos de gamificação ──────────────────────────────────────────────
    const rankCfg      = getRankConfig(attendance.rate);
    const rankIdx      = RANKS.indexOf(rankCfg);
    const nextRank     = RANKS[rankIdx + 1] ?? null;
    const allAchievements = calcAchievements(attendance.rate, attendance.presentCount, certificates.length);
    const achievements    = allAchievements.filter(a => a.unlocked);
    const xp              = calcXP(attendance.presentCount, certificates.length);
    const progressToNext = nextRank
        ? Math.min(100, Math.round(((attendance.rate - rankCfg.minFreq) / (nextRank.minFreq - rankCfg.minFreq)) * 100))
        : 100;
    const faltaParaProximo = nextRank ? nextRank.minFreq - attendance.rate : 0;
    const aulasParaProximo = nextRank && attendance.totalClasses > 0
        ? Math.max(1, Math.ceil(faltaParaProximo * attendance.totalClasses / 100))
        : 0;

    return (
        <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
            <AdminHeaderHero
                title={`OLÁ, ${user?.name?.split(' ')[0]?.toUpperCase() || 'ALUNO'}`}
                subtitle={new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                badge="PORTAL DO ALUNO"
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.75rem' }}>
                <AnimatedKpiCard
                    label="Matrículas Ativas"
                    value={activeEnrollments.length}
                    color="#B89B00"
                    bg="#FFFDE7"
                    border="#FEF08A"
                    sub="toque para ver detalhes"
                    onClick={() => setDrawer('matriculas')}
                    compact
                />
                <AnimatedKpiCard
                    label="Frequência"
                    value={attendance.rate}
                    displayValue={`${attendance.rate}%`}
                    color={attendance.rate >= 75 ? '#059669' : '#DC2626'}
                    bg={attendance.rate >= 75 ? '#F0FDF4' : '#FEF2F2'}
                    border={attendance.rate >= 75 ? '#BBF7D0' : '#FECACA'}
                    sub={attendance.rate >= 75 ? 'toque para ver detalhes' : '⚠ atenção'}
                    onClick={() => setDrawer('frequencia')}
                    compact
                />
                <AnimatedKpiCard
                    label="Certificados"
                    value={certificates.length}
                    color="#7C3AED"
                    bg="#F5F3FF"
                    border="#DDD6FE"
                    sub={certificates.length > 0 ? 'toque para ver detalhes' : 'conclua um curso'}
                    onClick={() => setDrawer('certificados')}
                    compact
                />
                <AnimatedKpiCard
                    label="Inscrições"
                    value={enrollments.length}
                    color="#0891B2"
                    bg="#F0F9FF"
                    border="#BAE6FD"
                    sub={`${enrollments.filter(e => e.status === 'PENDING').length} pendente(s)`}
                    onClick={() => { window.location.href = '/student/enrollments'; }}
                    compact
                />
            </div>

            {certProgress && certProgress.items.length > 0 && worst !== 'ok' && (
                <div style={{
                    padding: '1rem 1.25rem',
                    borderRadius: 16,
                    border: worst === 'critical' ? '2px solid #FECACA' : '2px solid #FDE68A',
                    background: worst === 'critical' ? 'linear-gradient(135deg,#FEF2F2,#FFF7ED)' : 'linear-gradient(135deg,#FFFBEB,#FFFDE7)',
                    boxShadow: worst === 'critical' ? '0 4px 20px rgba(220,38,38,0.12)' : '0 4px 18px rgba(245,158,11,0.15)',
                }}>
                    <div style={{ fontFamily: 'Orbitron', fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.1em', color: worst === 'critical' ? '#991B1B' : '#92400E', marginBottom: '0.5rem' }}>
                        {worst === 'critical' ? '⚠️ FREQUÊNCIA E CERTIFICADO' : worst === 'risk' ? '⚡ ATENÇÃO À FREQUÊNCIA' : '👁️ ACOMPANHAMENTO DE FREQUÊNCIA'}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#374151', margin: '0 0 0.75rem', lineHeight: 1.55 }}>
                        {worst === 'critical'
                            ? 'Uma ou mais turmas estão abaixo do mínimo de 75% para o certificado. Contacte a administração e acompanhe em Certificados.'
                            : worst === 'risk'
                                ? 'Você está no limite da regra de presença em alguma turma. Veja o detalhe em Certificados e Frequência.'
                                : 'Há turmas em acompanhamento (poucos lançamentos de frequência ou limite de faltas). Consulte Certificados.'}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        {certAlertItems.map(it => (
                            <div key={it.classIdentifier + it.courseName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#111827' }}>{it.courseName}</span>
                                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.72rem', fontWeight: 800, color: it.riskLevel === 'critical' ? '#DC2626' : '#D97706' }}>
                                    {it.awaitsAttendanceRoll ? 'Aguardando lançamentos' : `${it.attendanceRatePct}%`}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                        <Link href="/student/certificates" style={{ padding: '0.45rem 0.9rem', borderRadius: 9, background: '#FFD600', color: '#0F172A', fontWeight: 800, fontSize: '0.75rem', textDecoration: 'none' }}>
                            Certificados
                        </Link>
                        <Link href="/student/attendance" style={{ padding: '0.45rem 0.9rem', borderRadius: 9, border: '1px solid #E5E7EB', color: '#374151', fontWeight: 700, fontSize: '0.75rem', textDecoration: 'none' }}>
                            Frequência
                        </Link>
                        <Link href="/student/notifications" style={{ padding: '0.45rem 0.9rem', borderRadius: 9, border: '1px solid #FECACA', color: '#991B1B', fontWeight: 700, fontSize: '0.75rem', textDecoration: 'none' }}>
                            Notificações
                        </Link>
                    </div>
                </div>
            )}

            {/* ── PAINEL DO CAÇADOR — com ProgressOrb + Rank Trail + dica ── */}
            {attendance.totalClasses > 0 && (
                <div style={{
                    background: '#fff', borderRadius: 18,
                    border: `2px solid ${rankCfg.color}30`,
                    padding: '1.25rem 1.5rem',
                    boxShadow: `0 4px 24px ${rankCfg.glow}`,
                    position: 'relative', overflow: 'hidden',
                }}>
                    <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: `${rankCfg.color}08`, pointerEvents: 'none' }} />

                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
                        <div>
                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#9CA3AF', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>
                                ⚔️ STATUS DO CAÇADOR
                            </div>
                            <div style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', fontWeight: 800, color: '#111827', letterSpacing: '0.06em' }}>
                                SISTEMA UPGRADE — PAINEL DE PROGRESSÃO
                            </div>
                        </div>
                        {/* Rank badge — hover via JS, sem loop */}
                        <div
                            style={{
                                width: 56, height: 56, borderRadius: 14,
                                background: rankCfg.bg, border: `2px solid ${rankCfg.color}`,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                boxShadow: `0 2px 12px ${rankCfg.glow}`,
                                transition: 'transform 0.2s, box-shadow 0.2s',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${rankCfg.glow}`; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 12px ${rankCfg.glow}`; }}
                        >
                            <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.3rem', color: rankCfg.color, lineHeight: 1 }}>{rankCfg.rank}</div>
                            <div style={{ fontSize: '0.5rem', color: rankCfg.color, fontWeight: 800 }}>RANK</div>
                        </div>
                    </div>

                    {/* Rank info + ProgressOrb */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
                        <ProgressOrb
                            value={attendance.rate}
                            rankColor={rankCfg.color}
                            rankLetter={rankCfg.rank}
                            size={100}
                        />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.95rem', color: rankCfg.color }}>
                                {rankCfg.rank}-RANK · {rankCfg.label}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 1 }}>
                                {LEVEL_TITLES[rankCfg.rank] ?? rankCfg.description}
                            </div>
                            <div style={{ marginTop: '0.5rem', fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1rem', color: rankCfg.color }}>
                                {xp} XP
                            </div>
                            <div style={{ fontSize: '0.6rem', color: '#9CA3AF' }}>pontos de experiência</div>
                        </div>
                    </div>

                    {/* Rank Trail — E→D→C→B→A→S */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.85rem', position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
                        {RANKS.map((r, i) => {
                            const curIdx  = RANKS.indexOf(rankCfg);
                            const isPast  = curIdx > i;
                            const isCur   = r.rank === rankCfg.rank;
                            return (
                                <div key={r.rank} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                    <div style={{
                                        width: isCur ? 32 : 24, height: isCur ? 32 : 24,
                                        borderRadius: isCur ? 8 : 6, flexShrink: 0,
                                        background: isCur ? r.color : isPast ? `${r.color}60` : '#E5E7EB',
                                        border: `${isCur ? 2 : 1}px solid ${isCur ? r.color : isPast ? `${r.color}40` : '#E5E7EB'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontFamily: 'Orbitron', fontWeight: 900,
                                        fontSize: isCur ? '0.75rem' : '0.6rem',
                                        color: isCur ? '#fff' : isPast ? r.color : '#D1D5DB',
                                        transition: 'all 0.3s',
                                        ...(isCur ? { boxShadow: `0 2px 10px ${r.color}60` } : {}),
                                    }}>
                                        {r.rank}
                                    </div>
                                    {i < RANKS.length - 1 && (
                                        <div style={{ width: 12, height: 1.5, background: isPast ? `${r.color}60` : '#E5E7EB', borderRadius: 1 }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Barra de progresso */}
                    {nextRank ? (
                        <div style={{ marginBottom: '0.75rem', position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: '0.62rem', color: '#9CA3AF', fontWeight: 600 }}>
                                    Progresso → Rank {nextRank.rank} ({nextRank.label})
                                </span>
                                <span style={{ fontSize: '0.62rem', color: rankCfg.color, fontWeight: 700 }}>
                                    {attendance.rate}% / {nextRank.minFreq}%
                                </span>
                            </div>
                            <div style={{ height: 8, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden', position: 'relative' }}>
                                <div style={{
                                    height: '100%', borderRadius: 4,
                                    width: `${progressToNext}%`,
                                    background: `linear-gradient(90deg, ${rankCfg.color}, ${nextRank.color})`,
                                    transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)',
                                    position: 'relative', overflow: 'hidden',
                                }}>
                                    {/* Shimmer na barra */}
                                    <div style={{
                                        position: 'absolute', inset: 0,
                                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)',
                                        animation: 'xp-shimmer 1.8s ease-in-out infinite',
                                    }} />
                                </div>
                            </div>
                            {/* Dica de progresso — ETAPA 5 */}
                            <div style={{
                                marginTop: 6, padding: '0.45rem 0.8rem', borderRadius: 8,
                                background: `${rankCfg.color}0A`, border: `1px solid ${rankCfg.color}20`,
                                fontSize: '0.68rem', color: '#6B7280',
                            }}>
                                ⚡ Mais <strong style={{ color: rankCfg.color }}>{faltaParaProximo}%</strong> de frequência = Rank {nextRank.rank} ·
                                {' '}≈ <strong style={{ color: rankCfg.color }}>{aulasParaProximo}</strong> aula(s) a mais. Você consegue!
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '0.5rem 0.85rem', borderRadius: 8, background: '#FFFDE7', border: '1px solid #FFD600', marginBottom: '1rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                            <span style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', fontWeight: 800, color: '#B89B00' }}>⭐ RANK MÁXIMO — SHADOW SCHOLAR ⭐</span>
                        </div>
                    )}

                    {/* Conquistas */}
                    {achievements.length > 0 && (
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Conquistas Desbloqueadas</div>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {achievements.map(a => (
                                    <span key={a.id} style={{ padding: '0.2rem 0.6rem', borderRadius: 100, background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: '0.68rem', fontWeight: 600, color: '#374151' }}>
                                        {a.icon} {a.title}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── MISSÕES ── */}
            {attendance.totalClasses > 0 && (() => {
                const missions  = calcDailyMissions(attendance, certificates);
                const completed = missions.filter(m => m.completed).length;
                const totalXP   = missions.filter(m => m.completed).reduce((acc, m) => acc + m.xpReward, 0);
                return (
                    <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{
                                padding: '0.85rem 1.25rem',
                                background: 'linear-gradient(135deg, #FFD600 0%, #F59E0B 100%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ fontSize: '1rem' }}>⚔️</span>
                                <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.72rem', color: '#0F172A', letterSpacing: '0.1em' }}>MISSÕES</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.55)', fontWeight: 600 }}>{completed}/{missions.length} concluídas</span>
                                <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.8rem', color: '#0F172A' }}>+{totalXP} XP</span>
                            </div>
                        </div>
                        <div style={{ height: 3, background: '#F3F4F6' }}>
                            <div style={{ height: '100%', width: `${(completed / missions.length) * 100}%`, background: 'linear-gradient(90deg, #FFD600, #F59E0B)', transition: 'width 0.8s ease' }} />
                        </div>
                        <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.6rem' }}>
                            {missions.map(m => (
                                <div key={m.id}
                                    onClick={() => setSelectedMission(m)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        padding: '0.75rem 0.9rem', borderRadius: 10,
                                        background: m.completed
                                            ? 'linear-gradient(145deg, #f0fdf4, #dcfce7)'
                                            : 'linear-gradient(145deg, #fffdf5, #fffde7)',
                                        border: `1.5px solid ${m.completed ? 'rgba(16,185,129,0.35)' : 'rgba(255,214,0,0.3)'}`,
                                        borderLeft: `4px solid ${m.completed ? '#10B981' : 'rgba(255,214,0,0.6)'}`,
                                        transition: 'all 0.2s',
                                        cursor: 'pointer',
                                        position: 'relative',
                                    }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px) scale(1.02)';
                                        (e.currentTarget as HTMLDivElement).style.boxShadow = m.completed
                                            ? '0 8px 20px rgba(16,185,129,0.2)'
                                            : '0 8px 20px rgba(245,158,11,0.15)';
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLDivElement).style.transform = 'none';
                                        (e.currentTarget as HTMLDivElement).style.boxShadow = '';
                                    }}
                                >
                                    <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: m.completed ? '#DCFCE7' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                                        {m.completed ? '✓' : m.icon}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: m.completed ? '#059669' : '#374151', textDecoration: m.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                                        <div style={{ fontSize: '0.62rem', color: '#9CA3AF', marginTop: 1 }}>{m.description}</div>
                                        {/* Mini progress bar */}
                                        <div style={{ marginTop: 4, height: 3, borderRadius: 2, background: '#E5E7EB', overflow: 'hidden', width: '80%' }}>
                                            <div style={{
                                                height: '100%', borderRadius: 2,
                                                width: `${Math.round(m.progress * 100)}%`,
                                                background: m.completed
                                                    ? 'linear-gradient(90deg, #10B981, #059669)'
                                                    : 'linear-gradient(90deg, #F59E0B, #FFD600)',
                                                transition: 'width 0.8s ease',
                                            }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                                        <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.7rem', color: m.completed ? '#059669' : '#9CA3AF' }}>+{m.xpReward}xp</div>
                                        <div style={{ fontSize: '0.55rem', color: m.completed ? 'rgba(16,185,129,0.6)' : 'rgba(245,158,11,0.5)', fontWeight: 600 }}>
                                            {m.completed ? '✓ detalhes' : '→ progresso'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* ── Frequência + Quick Links ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                {/* Frequência Geral com ProgressOrb — CLICÁVEL */}
                <div
                    className="glass-card"
                    onClick={() => setShowFreqDetail(true)}
                    style={{ cursor: 'pointer', transition: 'all 0.22s ease' }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px) scale(1.01)';
                        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 28px rgba(255,214,0,0.18)';
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.transform = 'none';
                        (e.currentTarget as HTMLDivElement).style.boxShadow = '';
                    }}
                >
                    <div className="card-header">
                        <div className="card-title"><CheckCircleIcon style={{ width: 16, height: 16, color: '#FFD600' }} /> Frequência Geral</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <ProgressOrb
                            value={attendance.rate}
                            rankColor={attendance.rate >= 75 ? '#059669' : '#DC2626'}
                            rankLetter={attendance.rate >= 75 ? '✓' : '!'}
                            size={100}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1 }}>
                            {[
                                { label: 'Presenças',    value: attendance.presentCount,  color: '#059669', bg: '#DCFCE7' },
                                { label: 'Faltas',       value: attendance.absentCount,    color: '#DC2626', bg: '#FEF2F2' },
                                { label: 'Total Aulas',  value: attendance.totalClasses,   color: '#374151', bg: '#F3F4F6' },
                            ].map(item => (
                                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0.75rem', borderRadius: 8, background: item.bg }}>
                                    <span style={{ fontSize: '0.78rem', color: item.color, fontWeight: 600 }}>{item.label}</span>
                                    <span style={{ fontFamily: 'Orbitron', fontWeight: 900, color: item.color, fontSize: '0.9rem' }}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Dica de rank no card também */}
                    {nextRank && attendance.totalClasses > 0 && (
                        <div style={{ marginTop: '0.85rem', padding: '0.5rem 0.75rem', borderRadius: 8, background: `${rankCfg.color}0A`, border: `1px solid ${rankCfg.color}20`, fontSize: '0.68rem', color: '#6B7280' }}>
                            ⚡ Mais <strong style={{ color: rankCfg.color }}>{faltaParaProximo}%</strong> = Rank {nextRank.rank} · ≈ {aulasParaProximo} aula(s)
                        </div>
                    )}
                    {attendance.rate < 75 && attendance.totalClasses > 0 && (
                        <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.85rem', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: '0.75rem', color: '#DC2626', fontWeight: 600 }}>
                            ⚠ Atenção: frequência abaixo do mínimo exigido (75%)
                        </div>
                    )}
                    <div style={{ textAlign: 'center', fontSize: '0.65rem', color: '#9CA3AF', marginTop: '0.6rem', fontWeight: 600 }}>
                        👆 Clique para ver detalhes
                    </div>
                </div>

                {/* Acesso Rápido */}
                <div className="glass-card">
                    <div className="card-header">
                        <div className="card-title">⚡ Acesso Rápido</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {[
                            { href: '/student/attendance',  icon: '📋', label: 'Ver Frequência',   sub: 'Calendário de presenças',          color: '#FFD600' },
                            { href: '/student/enrollments', icon: '📄', label: 'Minhas Inscrições', sub: `${enrollments.length} inscrição(ões)`, color: '#0891B2' },
                            { href: '/student/certificates',icon: '🏆', label: 'Certificados',      sub: `${certificates.length} emitido(s)`,    color: '#7C3AED' },
                            { href: '/student/classes',     icon: '🎓', label: 'Minhas Turmas',     sub: `${activeEnrollments.length} ativa(s)`, color: '#059669' },
                        ].map(l => (
                            <Link key={l.href} href={l.href} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.75rem 0.9rem', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB', textDecoration: 'none', transition: 'all 0.2s' }}
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

            {/* Matrículas Ativas */}
            {activeEnrollments.length > 0 && (
                <div className="glass-card">
                    <div className="card-header">
                        <div className="card-title"><AcademicCapIcon style={{ width: 16, height: 16, color: '#FFD600' }} /> Matrículas Ativas</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
                        {activeEnrollments.map((e, i) => (
                            <div key={e.id} className="animate-scale-in" style={{ animationDelay: `${i * 60}ms`, padding: '1rem', borderRadius: 12, background: '#FFFDE7', border: '1px solid #FEF08A', borderLeft: '3px solid #FFD600' }}>
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

        {/* ── QUICK ACTION DRAWERS — createPortal ── */}

        {/* Drawer: Matrículas */}
        <QuickDrawer open={drawer === 'matriculas'} onClose={closeDrawer} title="MINHAS MATRÍCULAS">
            {activeEnrollments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎓</div>
                    Nenhuma matrícula ativa no momento.
                </div>
            ) : activeEnrollments.map(e => (
                <div key={e.id} style={{ padding: '1rem', borderRadius: 12, background: 'linear-gradient(145deg,#fffdf5,#fffde7)', border: '1px solid rgba(255,214,0,0.25)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 6 }}>
                        <span style={{ padding: '0.15rem 0.6rem', borderRadius: 100, background: '#DCFCE7', color: '#059669', fontSize: '0.6rem', fontWeight: 800, border: '1px solid #BBF7D0' }}>● ATIVA</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#111827', marginBottom: 3 }}>{e.class?.course?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span>📋 {e.class?.classIdentifier}</span>
                        <span>📍 {e.class?.city?.name} / {e.class?.city?.state}</span>
                        <span>{PERIOD[e.class?.period] || e.class?.period}</span>
                        {e.class?.startDate && <span>📅 {new Date(e.class.startDate).toLocaleDateString('pt-BR')} → {e.class?.endDate ? new Date(e.class.endDate).toLocaleDateString('pt-BR') : '?'}</span>}
                    </div>
                    {/* Link específico para a turma — usa e.class.id (UUID) */}
                    <Link href={e.class?.id ? `/student/classes/${e.class.id}` : '/student/classes'} onClick={closeDrawer}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.75rem', padding: '0.5rem', borderRadius: 9, background: 'linear-gradient(135deg,#FFD600,#F59E0B)', color: '#000', textDecoration: 'none', fontWeight: 700, fontSize: '0.78rem' }}>
                        Ver esta turma →
                    </Link>
                </div>
            ))}
            <Link href="/student/enrollments" onClick={closeDrawer}
                style={{ display: 'block', textAlign: 'center', padding: '0.65rem', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#374151', textDecoration: 'none', fontWeight: 600, fontSize: '0.82rem', marginTop: 'auto' }}>
                Ver Todas as Inscrições →
            </Link>
        </QuickDrawer>

        {/* Drawer: Frequência */}
        <QuickDrawer open={drawer === 'frequencia'} onClose={closeDrawer} title="MINHA FREQUÊNCIA">
            <div style={{ textAlign: 'center', padding: '1rem', borderRadius: 12, background: attendance.rate >= 75 ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${attendance.rate >= 75 ? '#BBF7D0' : '#FECACA'}` }}>
                <div style={{ fontFamily: 'Orbitron', fontSize: '3rem', fontWeight: 900, color: attendance.rate >= 75 ? '#059669' : '#DC2626', lineHeight: 1 }}>
                    {attendance.rate}%
                </div>
                <div style={{ fontSize: '0.72rem', color: attendance.rate >= 75 ? '#059669' : '#DC2626', marginTop: 4, fontWeight: 700 }}>
                    {attendance.rate >= 75 ? '✓ Frequência regular' : '⚠ Abaixo do mínimo (75%)'}
                </div>
            </div>
            {[
                { label: 'Presenças',  v: attendance.presentCount,  c: '#059669', bg: '#DCFCE7' },
                { label: 'Faltas',     v: attendance.absentCount,    c: '#DC2626', bg: '#FEF2F2' },
                { label: 'Total',      v: attendance.totalClasses,   c: '#374151', bg: '#F3F4F6' },
            ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.85rem', borderRadius: 9, background: s.bg }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: s.c }}>{s.label}</span>
                    <span style={{ fontFamily: 'Orbitron', fontWeight: 900, color: s.c, fontSize: '1rem' }}>{s.v}</span>
                </div>
            ))}
            {nextRank && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: 10, background: `${rankCfg.color}12`, border: `1px solid ${rankCfg.color}30` }}>
                    <div style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', fontWeight: 800, color: rankCfg.color, marginBottom: 4 }}>
                        ⚡ QUANTO FALTA PARA O RANK {nextRank.rank}?
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 600 }}>
                        Mais {faltaParaProximo}% de frequência = Rank {nextRank.rank} ({nextRank.label})
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 3 }}>
                        ≈ {aulasParaProximo} aula(s) a mais. Você consegue!
                    </div>
                </div>
            )}
            <Link href="/student/attendance" onClick={closeDrawer}
                style={{ display: 'block', textAlign: 'center', padding: '0.65rem', borderRadius: 10, background: 'linear-gradient(135deg,#FFD600,#F59E0B)', color: '#000', textDecoration: 'none', fontWeight: 700, fontSize: '0.82rem', marginTop: 'auto' }}>
                Ver Calendário Completo →
            </Link>
        </QuickDrawer>

        {/* Drawer: Certificados */}
        <QuickDrawer open={drawer === 'certificados'} onClose={closeDrawer} title="MEUS CERTIFICADOS">
            {certificates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏆</div>
                    Conclua um curso com ≥ 75% de frequência para receber um certificado.
                </div>
            ) : certificates.map((cert: any) => (
                <div key={cert.id} style={{ padding: '1rem', borderRadius: 12, background: '#FFFDE7', border: '1px solid #FEF08A' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#111827', marginBottom: 4 }}>
                        {cert.class?.course?.name || 'Curso'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono', marginBottom: 8 }}>
                        {cert.class?.classIdentifier} · {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString('pt-BR') : '—'}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {cert.fileUrl && (
                            <a href={cert.fileUrl} download={`cert-${cert.verificationCode}.pdf`} onClick={e => e.stopPropagation()}
                                style={{ flex: 1, padding: '0.45rem', borderRadius: 8, background: '#FFD600', color: '#000', textDecoration: 'none', fontWeight: 700, fontSize: '0.72rem', textAlign: 'center', display: 'block' }}>
                                ⬇ Download PDF
                            </a>
                        )}
                        <Link href="/student/certificates" onClick={closeDrawer}
                            style={{ flex: 1, padding: '0.45rem', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#374151', textDecoration: 'none', fontWeight: 600, fontSize: '0.72rem', textAlign: 'center', display: 'block' }}>
                            Ver QR Code
                        </Link>
                    </div>
                </div>
            ))}
            <Link href="/student/certificates" onClick={closeDrawer}
                style={{ display: 'block', textAlign: 'center', padding: '0.65rem', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#374151', textDecoration: 'none', fontWeight: 600, fontSize: '0.82rem', marginTop: 'auto' }}>
                Ver Todos os Certificados →
            </Link>
        </QuickDrawer>

        {/* ── MODAL DE MISSÃO ── */}
        {selectedMission && mounted && createPortal(
            <div
                onClick={() => setSelectedMission(null)}
                style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn 0.2s ease',
                }}
            >
                <div
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: '#FFFFFF', borderRadius: 20, padding: '1.5rem',
                        width: '100%', maxWidth: 420, margin: '0 1rem',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
                        animation: 'slideUp 0.25s cubic-bezier(.4,0,.2,1)',
                        border: selectedMission.completed
                            ? '2px solid rgba(16,185,129,0.4)'
                            : '2px solid rgba(245,158,11,0.4)',
                    }}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                width: 52, height: 52, borderRadius: 14,
                                background: selectedMission.completed
                                    ? 'linear-gradient(135deg, #10B981, #059669)'
                                    : 'linear-gradient(135deg, #F59E0B, #FFD600)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.75rem',
                                boxShadow: selectedMission.completed
                                    ? '0 4px 12px rgba(16,185,129,0.35)'
                                    : '0 4px 12px rgba(245,158,11,0.35)',
                            }}>
                                {selectedMission.icon}
                            </div>
                            <div>
                                <div style={{
                                    fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.7rem',
                                    color: selectedMission.completed ? '#059669' : '#92400E',
                                    letterSpacing: '0.08em', marginBottom: '0.2rem',
                                }}>
                                    {selectedMission.completed ? '✅ MISSÃO CONCLUÍDA' : '⏳ EM PROGRESSO'}
                                </div>
                                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>
                                    {selectedMission.title}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedMission(null)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#9CA3AF', padding: '0.25rem', lineHeight: 1 }}
                        >✕</button>
                    </div>

                    {/* Descrição */}
                    <p style={{ fontSize: '0.88rem', color: '#374151', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                        {selectedMission.description}
                    </p>

                    {/* Barra de progresso */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600 }}>PROGRESSO</span>
                            <span style={{
                                fontSize: '0.75rem', fontWeight: 700,
                                color: selectedMission.completed ? '#10B981' : '#F59E0B',
                            }}>
                                {Math.round(selectedMission.progress * 100)}%
                            </span>
                        </div>
                        <div style={{ height: 8, background: '#F3F4F6', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{
                                height: '100%',
                                width: `${Math.round(selectedMission.progress * 100)}%`,
                                background: selectedMission.completed
                                    ? 'linear-gradient(90deg, #10B981, #059669)'
                                    : 'linear-gradient(90deg, #F59E0B, #FFD600)',
                                borderRadius: 8,
                                transition: 'width 0.6s ease',
                            }} />
                        </div>
                    </div>

                    {/* XP reward */}
                    <div style={{
                        background: selectedMission.completed ? '#F0FDF4' : '#FFFBEB',
                        border: `1px solid ${selectedMission.completed ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                        borderRadius: 12, padding: '0.75rem 1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <span style={{ fontSize: '0.82rem', color: '#374151', fontWeight: 600 }}>
                            {selectedMission.completed ? 'XP Obtido' : 'XP ao Concluir'}
                        </span>
                        <span style={{
                            fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.1rem',
                            color: selectedMission.completed ? '#10B981' : '#F59E0B',
                        }}>
                            +{selectedMission.xpReward} XP
                        </span>
                    </div>

                    {/* Botão fechar */}
                    <button
                        onClick={() => setSelectedMission(null)}
                        style={{
                            width: '100%', marginTop: '1rem', padding: '0.65rem',
                            background: '#0F172A', color: '#FFD600', border: 'none', borderRadius: 10,
                            fontFamily: 'Orbitron', fontWeight: 700, fontSize: '0.75rem',
                            letterSpacing: '0.08em', cursor: 'pointer',
                        }}
                    >FECHAR</button>
                </div>
            </div>,
            document.body
        )}

        {/* ── MODAL DE FREQUÊNCIA DETALHADA ── */}
        {showFreqDetail && mounted && createPortal(
            <div
                onClick={() => setShowFreqDetail(false)}
                style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(4px)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn 0.2s ease',
                }}
            >
                <div
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: '#FFFFFF', borderRadius: 20, padding: '1.5rem',
                        width: '100%', maxWidth: 380, margin: '0 1rem',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
                        border: '2px solid rgba(255,214,0,0.35)',
                        animation: 'slideUp 0.25s cubic-bezier(.4,0,.2,1)',
                    }}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontSize: '1.25rem' }}>📊</span>
                            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>Frequência Geral</span>
                        </div>
                        <button
                            onClick={() => setShowFreqDetail(false)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#9CA3AF' }}
                        >✕</button>
                    </div>

                    {/* Big number */}
                    <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                        <div style={{
                            fontFamily: 'Orbitron', fontWeight: 900, fontSize: '3rem',
                            color: attendance.rate >= 90 ? '#7C3AED' : attendance.rate >= 75 ? '#10B981' : '#EF4444',
                            lineHeight: 1, animation: 'trophyBounce 0.5s ease',
                        }}>
                            {attendance.rate}%
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '0.25rem', fontWeight: 600 }}>
                            FREQUÊNCIA GERAL
                        </div>
                    </div>

                    {/* Linhas de dados */}
                    {[
                        { label: 'Presenças',   value: attendance.presentCount,  color: '#10B981', bg: '#F0FDF4' },
                        { label: 'Faltas',      value: attendance.absentCount,   color: '#EF4444', bg: '#FEF2F2' },
                        { label: 'Total Aulas', value: attendance.totalClasses,   color: '#374151', bg: '#F9FAFB' },
                    ].map(row => (
                        <div key={row.label} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: row.bg, borderRadius: 10,
                            padding: '0.6rem 1rem', marginBottom: '0.5rem',
                        }}>
                            <span style={{ fontSize: '0.85rem', color: '#374151', fontWeight: 600 }}>{row.label}</span>
                            <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1rem', color: row.color }}>
                                {row.value}
                            </span>
                        </div>
                    ))}

                    {/* Rank badge */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        marginTop: '0.5rem', padding: '0.75rem 1rem', borderRadius: 12,
                        background: rankCfg.bg, border: `1.5px solid ${rankCfg.border}`,
                    }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                            background: rankCfg.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.1rem', color: '#fff',
                            boxShadow: `0 2px 8px ${rankCfg.glow}`,
                        }}>
                            {rankCfg.rank}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'Orbitron', fontWeight: 800, fontSize: '0.72rem', color: rankCfg.color }}>
                                RANK {rankCfg.rank} · {rankCfg.label}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#6B7280' }}>{rankCfg.description}</div>
                        </div>
                    </div>

                    {/* Hint de próximo rank */}
                    {nextRank && (
                        <div style={{
                            marginTop: '0.75rem', background: '#FFFBEB',
                            border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10,
                            padding: '0.6rem 1rem', fontSize: '0.78rem', color: '#92400E',
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                        }}>
                            <span>⚡</span>
                            <span>
                                Mais <strong>{faltaParaProximo}%</strong> de frequência → Rank {nextRank.rank}
                                {aulasParaProximo > 0 && ` (≈ ${aulasParaProximo} aula${aulasParaProximo > 1 ? 's' : ''})`}
                            </span>
                        </div>
                    )}

                    {/* Link para página de frequência */}
                    <Link href="/student/attendance"
                        onClick={() => setShowFreqDetail(false)}
                        style={{
                            display: 'block', width: '100%', marginTop: '1rem', padding: '0.65rem',
                            background: 'linear-gradient(135deg, #FFD600, #F59E0B)',
                            color: '#0F172A', border: 'none', borderRadius: 10,
                            fontFamily: 'Orbitron', fontWeight: 700, fontSize: '0.75rem',
                            letterSpacing: '0.08em', cursor: 'pointer', textAlign: 'center',
                            textDecoration: 'none',
                        }}
                    >VER CALENDÁRIO COMPLETO</Link>

                    <button
                        onClick={() => setShowFreqDetail(false)}
                        style={{
                            width: '100%', marginTop: '0.5rem', padding: '0.55rem',
                            background: 'transparent', color: '#9CA3AF', border: '1px solid #E5E7EB', borderRadius: 10,
                            fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
                        }}
                    >FECHAR</button>
                </div>
            </div>,
            document.body
        )}

        {/* ── LEVEL-UP OVERLAY ── */}
        {levelUpData && mounted && (() => {
            const lud = levelUpData;
            return createPortal(
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', animation: 'fadeIn 0.3s ease' }}
                    onClick={() => setLevelUpData(null)}
                >
                    <style>{`
                        @keyframes rankPulse { 0%{transform:scale(0.5) rotate(-5deg);opacity:0} 60%{transform:scale(1.15) rotate(2deg);opacity:1} 80%{transform:scale(0.95) rotate(0deg)} 100%{transform:scale(1) rotate(0deg);opacity:1} }
                        @keyframes glowPulse { 0%,100%{box-shadow:0 0 30px ${lud.toColor}60} 50%{box-shadow:0 0 80px ${lud.toColor}} }
                    `}</style>
                    <div style={{ textAlign: 'center', padding: '2rem', position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse at center, ${lud.toColor}20 0%, transparent 70%)` }} />
                        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                            <div key={i} style={{
                                position: 'absolute', width: 6, height: 6, borderRadius: '50%',
                                background: lud.toColor, opacity: 0.3,
                                top: '50%', left: '50%',
                                transform: `rotate(${deg}deg) translateX(${80 + i * 10}px)`,
                                animation: `float-particle ${1.2 + i * 0.2}s ease-in-out infinite`,
                                animationDelay: `${i * 0.15}s`,
                                pointerEvents: 'none',
                            }} />
                        ))}
                        <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1rem', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.3em', marginBottom: '1rem', animation: 'fadeIn 0.5s 0.2s both' }}>⚔️ RANK UP ⚔️</div>
                        <div style={{ width: 140, height: 140, borderRadius: 28, margin: '0 auto 1.5rem', background: lud.toColor, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: `rankPulse 0.6s cubic-bezier(0.16,1,0.3,1) both, glowPulse 2s 0.6s infinite` }}>
                            <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '4rem', color: '#000', lineHeight: 1 }}>{lud.to}</div>
                            <div style={{ fontFamily: 'Orbitron', fontWeight: 800, fontSize: '0.6rem', color: 'rgba(0,0,0,0.6)', letterSpacing: '0.1em' }}>RANK</div>
                        </div>
                        <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.8rem', color: lud.toColor, letterSpacing: '0.1em', marginBottom: '0.25rem', textShadow: `0 0 20px ${lud.toColor}`, animation: 'fadeIn 0.5s 0.5s both' }}>
                            {lud.toLabel}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.85rem', animation: 'fadeIn 0.5s 0.6s both' }}>
                            {LEVEL_TITLES[lud.to] ?? ''}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                            <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.2rem', color: '#6B7280' }}>{lud.from}</span>
                            <span style={{ color: lud.toColor, fontSize: '1.5rem' }}>→</span>
                            <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.2rem', color: lud.toColor }}>{lud.to}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>Toque em qualquer lugar para continuar</div>
                    </div>
                </div>,
                document.body
            );
        })()}
        </>
    );
}
