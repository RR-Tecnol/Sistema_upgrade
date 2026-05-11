'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api/client';
import { useAuthStore } from '@/stores/useAuthStore';
import {
    RANKS,
    getRankConfig,
    calcXP,
    calcAchievements,
    calcXPToNext,
    saveRankCache,
    type RankConfig,
    type Achievement,
} from '@/lib/gamification';
import { ShareIcon, ClockIcon } from '@heroicons/react/24/outline';
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

interface XPHistoryItem {
    id: string;
    type: 'presence' | 'certificate' | 'achievement' | 'streak' | 'rank_up';
    label: string;
    xp: number;
    date: string;
    icon: string;
}

function xpHistoryAccent(type: XPHistoryItem['type']): { color: string; bg: string; border: string } {
    switch (type) {
        case 'presence':
            return { color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' };
        case 'certificate':
            return { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' };
        case 'achievement':
            return { color: '#B89B00', bg: '#FFFDE7', border: '#FEF08A' };
        case 'streak':
            return { color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' };
        case 'rank_up':
            return { color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD' };
        default:
            return { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' };
    }
}

export default function HunterProfilePage() {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        freqPct: 0, presentCount: 0, absentCount: 0,
        certCount: 0, classCount: 0, streak: 0,
    });
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [xpHistory, setXpHistory] = useState<XPHistoryItem[]>([]);
    const [rankConfig, setRankConfig] = useState<RankConfig>(RANKS[0]);
    const [showShareModal, setShowShareModal] = useState(false);
    const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [attendanceRes, certsRes, classesRes] = await Promise.all([
                api.get('/students/me/attendance-summary').catch(() => ({ data: null })),
                api.get('/certificates').catch(() => ({ data: [] })),
                api.get('/students/me/classes').catch(() => ({ data: [] })),
            ]);

            const att = attendanceRes.data || {};
            const certs = Array.isArray(certsRes.data) ? certsRes.data : [];
            const classes = Array.isArray(classesRes.data) ? classesRes.data : [];

            const freqPct = att.rate ?? 0;
            const presentCount = att.presentCount ?? 0;
            const absentCount = att.absentCount ?? 0;
            const certCount = certs.length;
            const classCount = classes.length;
            const streak = att.streak ?? 0;

            setStats({ freqPct, presentCount, absentCount, certCount, classCount, streak });

            const rank = getRankConfig(freqPct);
            setRankConfig(rank);

            const achs = calcAchievements(freqPct, presentCount, certCount, streak);
            setAchievements(achs);

            // Gerar histórico de XP simulado baseado em dados reais
            const history: XPHistoryItem[] = [];
            const now = new Date();

            // Adicionar XP de presenças
            for (let i = 0; i < Math.min(presentCount, 10); i++) {
                const date = new Date(now);
                date.setDate(date.getDate() - i * 2);
                history.push({
                    id: `pres_${i}`,
                    type: 'presence',
                    label: 'Presença registrada',
                    xp: 10,
                    date: date.toISOString(),
                    icon: '✅',
                });
            }

            // Adicionar XP de certificados
            certs.forEach((cert: any, i: number) => {
                const date = cert.issuedAt ? new Date(cert.issuedAt) : new Date(now);
                history.push({
                    id: `cert_${i}`,
                    type: 'certificate',
                    label: `Certificado: ${cert.courseName || 'Curso'}`,
                    xp: 100,
                    date: date.toISOString(),
                    icon: '🏆',
                });
            });

            // Adicionar conquistas desbloqueadas
            achs.filter(a => a.unlocked).forEach((a, i) => {
                const date = new Date(now);
                date.setDate(date.getDate() - (i + 1) * 3);
                history.push({
                    id: `ach_${a.id}`,
                    type: 'achievement',
                    label: `Conquista: ${a.title}`,
                    xp: a.xp,
                    date: date.toISOString(),
                    icon: a.icon,
                });
            });

            // Ordenar por data (mais recente primeiro)
            history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setXpHistory(history.slice(0, 15));

            // Salvar no cache para o Header
            const rankIdx = RANKS.findIndex(r => r.rank === rank.rank);
            const totalXP = calcXP(presentCount, certCount);
            saveRankCache({ rank: rank.rank, label: rank.label, color: rank.color, xp: totalXP });
        } catch (err) {
            console.error('Erro ao carregar perfil:', err);
        } finally {
            setLoading(false);
        }
    };

    const totalXP = calcXP(stats.presentCount, stats.certCount);
    const xpToNext = calcXPToNext(stats.freqPct);
    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const rankIdx = RANKS.findIndex(r => r.rank === rankConfig.rank);

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const min = Math.floor(diff / 60000);
        if (min < 1) return 'agora';
        if (min < 60) return `${min}min`;
        const hrs = Math.floor(min / 60);
        if (hrs < 24) return `${hrs}h`;
        const days = Math.floor(hrs / 24);
        return `${days}d`;
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1.5rem' }}>
                <div className="spinner" style={{ width: 48, height: 48 }} />
                <p style={{ fontFamily: 'Orbitron', fontSize: '0.72rem', letterSpacing: '0.2em', color: '#9CA3AF' }}>CARREGANDO PERFIL...</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} className="animate-fade-in">
            {/* ── HERO HEADER ── */}
            <div style={{
                background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
                borderRadius: 20, padding: '2rem', position: 'relative', overflow: 'hidden',
                border: `2px solid ${rankConfig.color}40`,
                boxShadow: `0 8px 32px ${rankConfig.color}30, inset 0 1px 0 rgba(255,255,255,0.05)`,
            }}>
                {/* Partículas de fundo animadas */}
                <div style={{ position: 'absolute', inset: 0, opacity: 0.3, pointerEvents: 'none' }}>
                    {[...Array(12)].map((_, i) => (
                        <div key={i} style={{
                            position: 'absolute',
                            width: 4 + Math.random() * 4,
                            height: 4 + Math.random() * 4,
                            borderRadius: '50%',
                            background: rankConfig.color,
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animation: `float ${3 + Math.random() * 3}s ease-in-out infinite`,
                            animationDelay: `${Math.random() * 2}s`,
                            boxShadow: `0 0 8px ${rankConfig.color}`,
                        }} />
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
                    {/* Rank Orb Grande */}
                    <div style={{
                        width: 140, height: 140, borderRadius: '50%',
                        background: `radial-gradient(circle at 30% 30%, ${rankConfig.color}, ${rankConfig.color}80 60%, transparent)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 0 40px ${rankConfig.color}60, 0 0 80px ${rankConfig.color}30, inset 0 0 30px rgba(0,0,0,0.3)`,
                        border: `3px solid ${rankConfig.color}`,
                        position: 'relative', flexShrink: 0,
                    }}>
                        <span style={{
                            fontFamily: 'Orbitron', fontSize: '3.5rem', fontWeight: 900,
                            color: rankConfig.rank === 'S' ? '#000' : '#fff',
                            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                        }}>
                            {rankConfig.rank}
                        </span>
                        {/* Anel externo animado */}
                        <div style={{
                            position: 'absolute', inset: -8,
                            border: `2px solid ${rankConfig.color}40`,
                            borderRadius: '50%',
                            animation: 'pulse 2s ease-in-out infinite',
                        }} />
                    </div>

                    {/* Info do Caçador */}
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <span style={{
                                padding: '0.25rem 0.75rem', borderRadius: 100,
                                background: `${rankConfig.color}20`, border: `1px solid ${rankConfig.color}50`,
                                fontFamily: 'Orbitron', fontSize: '0.65rem', fontWeight: 800,
                                color: rankConfig.color, letterSpacing: '0.1em',
                            }}>
                                {rankConfig.rank}-RANK
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                {LEVEL_TITLES[rankConfig.rank]}
                            </span>
                        </div>
                        <h1 style={{
                            fontFamily: 'Orbitron', fontSize: '1.8rem', fontWeight: 900,
                            color: '#fff', marginBottom: '0.25rem', letterSpacing: '0.04em',
                        }}>
                            {user?.name || 'Caçador'}
                        </h1>
                        <p style={{ color: rankConfig.color, fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem' }}>
                            {rankConfig.description}
                        </p>

                        {/* Barra de progresso para próximo rank */}
                        <div style={{ marginTop: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>
                                    Progresso para {rankIdx < RANKS.length - 1 ? `Rank ${RANKS[rankIdx + 1].rank}` : 'MAX'}
                                </span>
                                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem', color: rankConfig.color, fontWeight: 700 }}>
                                    {xpToNext.pct}%
                                </span>
                            </div>
                            <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', borderRadius: 4,
                                    width: `${xpToNext.pct}%`,
                                    background: `linear-gradient(90deg, ${rankConfig.color}80, ${rankConfig.color})`,
                                    transition: 'width 1s ease-out',
                                    boxShadow: `0 0 10px ${rankConfig.color}60`,
                                }} />
                            </div>
                        </div>
                    </div>

                    {/* Botão Compartilhar */}
                    <button
                        onClick={() => setShowShareModal(true)}
                        style={{
                            padding: '0.75rem 1.25rem', borderRadius: 12,
                            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                            color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            transition: 'all 0.2s',
                        }}
                    >
                        <ShareIcon style={{ width: 18, height: 18 }} />
                        Compartilhar
                    </button>
                </div>
            </div>

            {/* ── RANK TRAIL ── */}
            <div style={{
                background: '#fff', borderRadius: 16, padding: '1.5rem',
                border: '1px solid #E5E7EB',
            }}>
                <h2 style={{
                    fontFamily: 'Orbitron', fontSize: '0.75rem', fontWeight: 800,
                    letterSpacing: '0.15em', color: '#6B7280', marginBottom: '1rem',
                }}>
                    🎯 JORNADA DE RANKS
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {RANKS.map((r, i) => {
                        const isUnlocked = stats.freqPct >= r.minFreq;
                        const isCurrent = r.rank === rankConfig.rank;
                        return (
                            <div key={r.rank} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 12,
                                    background: isUnlocked
                                        ? `linear-gradient(135deg, ${r.color}20, ${r.color}10)`
                                        : '#F3F4F6',
                                    border: `2px solid ${isUnlocked ? r.color : '#E5E7EB'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    position: 'relative',
                                    boxShadow: isCurrent ? `0 0 16px ${r.color}50` : 'none',
                                    transform: isCurrent ? 'scale(1.15)' : 'scale(1)',
                                    transition: 'all 0.3s',
                                }}>
                                    <span style={{
                                        fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1rem',
                                        color: isUnlocked ? r.color : '#D1D5DB',
                                    }}>
                                        {r.rank}
                                    </span>
                                    {isUnlocked && (
                                        <span style={{
                                            position: 'absolute', top: -4, right: -4,
                                            width: 16, height: 16, borderRadius: '50%',
                                            background: '#10B981', color: '#fff',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.6rem', fontWeight: 900,
                                        }}>✓</span>
                                    )}
                                </div>
                                {i < RANKS.length - 1 && (
                                    <div style={{
                                        width: 24, height: 2, borderRadius: 1,
                                        background: stats.freqPct >= RANKS[i + 1].minFreq ? RANKS[i + 1].color : '#E5E7EB',
                                    }} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── ESTATÍSTICAS (mesmo padrão admin: AnimatedKpiCard + count-up) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: '0.85rem' }}>
                <AnimatedKpiCard
                    label="Presenças"
                    value={stats.presentCount}
                    color="#059669"
                    bg="#F0FDF4"
                    border="#BBF7D0"
                    icon={<span aria-hidden>✅</span>}
                    compact
                    delayMs={0}
                />
                <AnimatedKpiCard
                    label="Faltas"
                    value={stats.absentCount}
                    color="#DC2626"
                    bg="#FEF2F2"
                    border="#FECACA"
                    icon={<span aria-hidden>❌</span>}
                    compact
                    delayMs={55}
                />
                <AnimatedKpiCard
                    label="Certificados"
                    value={stats.certCount}
                    color="#7C3AED"
                    bg="#F5F3FF"
                    border="#DDD6FE"
                    icon={<span aria-hidden>🏆</span>}
                    compact
                    delayMs={110}
                />
                <AnimatedKpiCard
                    label="Turmas"
                    value={stats.classCount}
                    color="#0891B2"
                    bg="#F0F9FF"
                    border="#BAE6FD"
                    icon={<span aria-hidden>📚</span>}
                    compact
                    delayMs={165}
                />
                <AnimatedKpiCard
                    label="Conquistas"
                    value={unlockedCount}
                    suffix={`/${achievements.length}`}
                    color="#EA580C"
                    bg="#FFF7ED"
                    border="#FED7AA"
                    icon={<span aria-hidden>⭐</span>}
                    compact
                    delayMs={220}
                />
                <AnimatedKpiCard
                    label="XP Total"
                    value={totalXP}
                    color="#B89B00"
                    bg="#FFFDE7"
                    border="#FEF08A"
                    icon={<span aria-hidden>⚡</span>}
                    compact
                    delayMs={275}
                />
            </div>

            {/* ── CONQUISTAS (cards estilo admin: borda accent + hover + scan line) ── */}
            <div
                className="adm-entity-card"
                style={{
                    borderRadius: 16,
                    padding: '1.5rem',
                    border: '1px solid rgba(0,0,0,0.08)',
                    background: '#FFF',
                    boxShadow: '0 4px 24px rgba(15,23,42,0.06)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h2 style={{
                        fontFamily: 'Orbitron', fontSize: '0.75rem', fontWeight: 800,
                        letterSpacing: '0.15em', color: '#475569',
                    }}>
                        🏅 CONQUISTAS ({unlockedCount}/{achievements.length})
                    </h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(188px, 1fr))', gap: '0.85rem' }}>
                    {achievements.map((a, i) => {
                        const accent = a.unlocked ? '#FFD600' : '#CBD5E1';
                        const glow = a.unlocked ? 'rgba(255,214,0,0.35)' : 'rgba(148,163,184,0.15)';
                        return (
                            <button
                                key={a.id}
                                type="button"
                                onClick={() => setSelectedAchievement(a)}
                                className="adm-scale-in student-ach-card"
                                style={{
                                    animationDelay: `${i * 42}ms`,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    padding: '1rem 1rem 0.85rem',
                                    borderRadius: 14,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    border: `1px solid ${a.unlocked ? 'rgba(255,214,0,0.45)' : '#E5E7EB'}`,
                                    borderLeftWidth: 4,
                                    borderLeftColor: accent,
                                    background: a.unlocked
                                        ? 'linear-gradient(145deg, #FFFDE7 0%, #FFFFFF 55%, #FFFBEB 100%)'
                                        : 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
                                    boxShadow: a.unlocked
                                        ? `0 2px 14px ${glow}, inset 0 1px 0 rgba(255,255,255,0.9)`
                                        : '0 2px 8px rgba(15,23,42,0.05)',
                                    opacity: a.unlocked ? 1 : 0.72,
                                    transition: 'transform 0.22s ease, box-shadow 0.22s ease',
                                }}
                            >
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        right: 0,
                                        top: 0,
                                        height: 2,
                                        opacity: a.unlocked ? 0.85 : 0.35,
                                        pointerEvents: 'none',
                                        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                                    }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                                    <span
                                        className={a.unlocked ? 'student-ach-icon-pop' : ''}
                                        style={{
                                            fontSize: '1.45rem',
                                            filter: a.unlocked ? 'none' : 'grayscale(1)',
                                            lineHeight: 1,
                                        }}
                                    >
                                        {a.icon}
                                    </span>
                                    <span style={{
                                        fontWeight: 800,
                                        fontSize: '0.82rem',
                                        color: a.unlocked ? '#0F172A' : '#94A3B8',
                                        letterSpacing: '-0.02em',
                                    }}>
                                        {a.title}
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.7rem', color: a.unlocked ? '#64748B' : '#94A3B8', marginBottom: '0.5rem', lineHeight: 1.35 }}>
                                    {a.description}
                                </p>
                                {!a.unlocked && a.progress !== undefined && (
                                    <div style={{ height: 5, borderRadius: 3, background: '#E2E8F0', overflow: 'hidden', marginBottom: 6 }}>
                                        <div
                                            className="student-ach-progress-fill"
                                            style={{
                                                height: '100%',
                                                borderRadius: 3,
                                                width: `${(a.progress ?? 0) * 100}%`,
                                                background: 'linear-gradient(90deg, #FFD600, #F59E0B)',
                                            }}
                                        />
                                    </div>
                                )}
                                {a.unlocked && (
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        padding: '0.2rem 0.55rem',
                                        borderRadius: 100,
                                        background: 'linear-gradient(135deg, rgba(255,214,0,0.35), rgba(245,158,11,0.2))',
                                        border: '1px solid rgba(184,155,0,0.45)',
                                        fontSize: '0.62rem',
                                        fontWeight: 900,
                                        color: '#92400E',
                                        fontFamily: 'JetBrains Mono, monospace',
                                        boxShadow: '0 0 12px rgba(255,214,0,0.25)',
                                    }}>
                                        ⚡+{a.xp}xp
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── HISTÓRICO DE XP (linhas estilo entity-card admin + cor por tipo) ── */}
            <div
                className="adm-entity-card"
                style={{
                    borderRadius: 16,
                    padding: '1.5rem',
                    border: '1px solid rgba(0,0,0,0.08)',
                    background: '#FFF',
                    boxShadow: '0 4px 24px rgba(15,23,42,0.06)',
                }}
            >
                <h2 style={{
                    fontFamily: 'Orbitron', fontSize: '0.75rem', fontWeight: 800,
                    letterSpacing: '0.15em', color: '#475569', marginBottom: '1rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                    <ClockIcon style={{ width: 16, height: 16, color: '#0891B2' }} />
                    HISTÓRICO DE XP
                </h2>
                {xpHistory.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8', fontSize: '0.85rem' }}>
                        Nenhum XP registrado ainda. Continue estudando!
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                        {xpHistory.map((h, i) => {
                            const tone = xpHistoryAccent(h.type);
                            return (
                                <div
                                    key={h.id}
                                    className="adm-scale-in student-xp-row"
                                    style={{
                                        animationDelay: `${i * 35}ms`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.78rem 1rem',
                                        borderRadius: 12,
                                        border: `1px solid ${tone.border}`,
                                        borderLeftWidth: 4,
                                        borderLeftColor: tone.color,
                                        background: `linear-gradient(100deg, ${tone.bg} 0%, #FFFFFF 72%)`,
                                        boxShadow: `0 2px 12px ${tone.color}18`,
                                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                    }}
                                >
                                    <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{h.icon}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F172A' }}>{h.label}</div>
                                        <div style={{ fontSize: '0.65rem', color: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}>
                                            {timeAgo(h.date)}
                                        </div>
                                    </div>
                                    <span
                                        className="student-xp-badge"
                                        style={{
                                            padding: '0.28rem 0.65rem',
                                            borderRadius: 100,
                                            background: `linear-gradient(135deg, ${tone.bg}, #FFFDE7)`,
                                            border: `1px solid ${tone.border}`,
                                            fontSize: '0.72rem',
                                            fontWeight: 900,
                                            color: tone.color,
                                            fontFamily: 'JetBrains Mono, monospace',
                                            boxShadow: `0 0 14px ${tone.color}33`,
                                            flexShrink: 0,
                                        }}
                                    >
                                        +{h.xp}xp
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── MODAL DE CONQUISTA ── */}
            {selectedAchievement && typeof document !== 'undefined' && createPortal(
                <div
                    onClick={() => setSelectedAchievement(null)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)', zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#fff', borderRadius: 20, padding: '2rem',
                            maxWidth: 400, width: '100%', textAlign: 'center',
                            animation: 'scaleIn 0.25s ease-out',
                        }}
                    >
                        <div style={{
                            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 1rem',
                            background: selectedAchievement.unlocked ? '#FFFDE7' : '#F3F4F6',
                            border: `3px solid ${selectedAchievement.unlocked ? '#FFD600' : '#E5E7EB'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '2.5rem',
                            filter: selectedAchievement.unlocked ? 'none' : 'grayscale(1)',
                        }}>
                            {selectedAchievement.icon}
                        </div>
                        <h3 style={{ fontFamily: 'Orbitron', fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                            {selectedAchievement.title}
                        </h3>
                        <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
                            {selectedAchievement.description}
                        </p>
                        {selectedAchievement.unlocked ? (
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                padding: '0.4rem 1rem', borderRadius: 100,
                                background: '#10B981', color: '#fff',
                                fontSize: '0.8rem', fontWeight: 700,
                            }}>
                                ✓ Desbloqueada • +{selectedAchievement.xp}xp
                            </div>
                        ) : (
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '0.5rem' }}>
                                    Progresso: {Math.round((selectedAchievement.progress ?? 0) * 100)}%
                                </div>
                                <div style={{ height: 6, borderRadius: 3, background: '#E5E7EB', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', borderRadius: 3,
                                        width: `${(selectedAchievement.progress ?? 0) * 100}%`,
                                        background: '#FFD600',
                                    }} />
                                </div>
                            </div>
                        )}
                        <button
                            onClick={() => setSelectedAchievement(null)}
                            style={{
                                marginTop: '1.5rem', padding: '0.6rem 1.5rem', borderRadius: 10,
                                background: '#111827', color: '#fff', border: 'none',
                                cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                            }}
                        >
                            Fechar
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* ── MODAL DE COMPARTILHAR ── */}
            {showShareModal && typeof document !== 'undefined' && createPortal(
                <div
                    onClick={() => setShowShareModal(false)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)', zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
                            borderRadius: 20, padding: '2rem', maxWidth: 380, width: '100%',
                            textAlign: 'center', border: `2px solid ${rankConfig.color}40`,
                            animation: 'scaleIn 0.25s ease-out',
                        }}
                    >
                        <div style={{
                            width: 100, height: 100, borderRadius: '50%', margin: '0 auto 1rem',
                            background: `radial-gradient(circle at 30% 30%, ${rankConfig.color}, ${rankConfig.color}80 60%, transparent)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 0 30px ${rankConfig.color}50`,
                            border: `3px solid ${rankConfig.color}`,
                        }}>
                            <span style={{
                                fontFamily: 'Orbitron', fontSize: '2.5rem', fontWeight: 900,
                                color: rankConfig.rank === 'S' ? '#000' : '#fff',
                            }}>
                                {rankConfig.rank}
                            </span>
                        </div>
                        <h3 style={{ fontFamily: 'Orbitron', fontSize: '1.2rem', fontWeight: 900, color: '#fff', marginBottom: '0.25rem' }}>
                            {user?.name || 'Caçador'}
                        </h3>
                        <p style={{ color: rankConfig.color, fontSize: '0.8rem', fontWeight: 600, marginBottom: '1rem' }}>
                            {rankConfig.rank}-RANK • {rankConfig.label}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div>
                                <div style={{ fontFamily: 'Orbitron', fontSize: '1.3rem', fontWeight: 900, color: '#FFD600' }}>{totalXP}</div>
                                <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>XP Total</div>
                            </div>
                            <div>
                                <div style={{ fontFamily: 'Orbitron', fontSize: '1.3rem', fontWeight: 900, color: '#10B981' }}>{stats.certCount}</div>
                                <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Certificados</div>
                            </div>
                            <div>
                                <div style={{ fontFamily: 'Orbitron', fontSize: '1.3rem', fontWeight: 900, color: '#7C3AED' }}>{unlockedCount}</div>
                                <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Conquistas</div>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.7rem', color: '#64748B', marginBottom: '1rem' }}>
                            Compartilhe seu perfil nas redes sociais!
                        </p>
                        <button
                            onClick={() => setShowShareModal(false)}
                            style={{
                                padding: '0.6rem 1.5rem', borderRadius: 10,
                                background: rankConfig.color, color: '#000', border: 'none',
                                cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                            }}
                        >
                            Fechar
                        </button>
                    </div>
                </div>,
                document.body
            )}

            <style>{`
                @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                @keyframes pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.7; } }
                @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                @keyframes student-ach-pop { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
                @keyframes student-xp-shine { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.12); } }
                .student-ach-icon-pop { animation: student-ach-pop 2.2s ease-in-out infinite; }
                .student-ach-card:hover {
                    transform: translateY(-4px) scale(1.01);
                    box-shadow: 0 12px 28px rgba(255, 214, 0, 0.22), 0 4px 12px rgba(15, 23, 42, 0.08) !important;
                }
                .student-ach-progress-fill { transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1); }
                .student-xp-row:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.1) !important;
                }
                .student-xp-badge { animation: student-xp-shine 2.5s ease-in-out infinite; }
            `}</style>
        </div>
    );
}
