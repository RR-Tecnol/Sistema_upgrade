// frontend/lib/gamification.ts
// ─── SISTEMA DE RANK SOLO LEVELING (adaptado para educação) ─────────────────
// Fonte única canônica — sem duplicação em pages

export interface RankConfig {
    rank: 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
    label: string;
    minFreq: number;
    maxFreq: number;
    color: string;
    glow: string;
    bg: string;
    border: string;
    icon: string;
    description: string;
}

export const RANKS: RankConfig[] = [
    { rank: 'E', label: 'INICIANTE',    minFreq: 0,  maxFreq: 59,
      color: '#9CA3AF', glow: 'rgba(156,163,175,0.25)', bg: '#F3F4F6',
      border: 'rgba(156,163,175,0.4)', icon: '⚪', description: 'Sua jornada começa agora' },
    { rank: 'D', label: 'APRENDIZ',     minFreq: 60, maxFreq: 74,
      color: '#6B7280', glow: 'rgba(107,114,128,0.25)', bg: '#F9FAFB',
      border: 'rgba(107,114,128,0.4)', icon: '🔵', description: 'Você está aprendendo o caminho' },
    { rank: 'C', label: 'COMPROMETIDO', minFreq: 75, maxFreq: 84,
      color: '#10B981', glow: 'rgba(16,185,129,0.25)', bg: '#F0FDF4',
      border: 'rgba(16,185,129,0.4)', icon: '🟢', description: 'Frequência mínima atingida!' },
    { rank: 'B', label: 'DEDICADO',     minFreq: 85, maxFreq: 89,
      color: '#0891B2', glow: 'rgba(8,145,178,0.25)', bg: '#E0F2FE',
      border: 'rgba(8,145,178,0.4)', icon: '🔷', description: 'Sua dedicação é notável' },
    { rank: 'A', label: 'EXCELENTE',    minFreq: 90, maxFreq: 94,
      color: '#7C3AED', glow: 'rgba(124,58,237,0.25)', bg: '#F5F3FF',
      border: 'rgba(124,58,237,0.4)', icon: '💜', description: 'Desempenho excepcional!' },
    { rank: 'S', label: 'LENDÁRIO',     minFreq: 95, maxFreq: 100,
      color: '#FFD600', glow: 'rgba(255,214,0,0.35)', bg: '#FFFDE7',
      border: 'rgba(255,214,0,0.6)', icon: '⭐', description: 'Você é uma lenda!' },
];

export function getRankConfig(freqPct: number): RankConfig {
    return [...RANKS].reverse().find(r => freqPct >= r.minFreq) ?? RANKS[0];
}

export function calcXP(presentCount: number, certCount: number): number {
    return presentCount * 10 + certCount * 100;
}

export function calcXPToNext(freqPct: number): { current: number; needed: number; pct: number } {
    const rank = getRankConfig(freqPct);
    const nextIdx = RANKS.findIndex(r => r.rank === rank.rank) + 1;
    if (nextIdx >= RANKS.length) return { current: 100, needed: 100, pct: 100 };
    const next = RANKS[nextIdx];
    const span = next.minFreq - rank.minFreq;
    const progress = freqPct - rank.minFreq;
    return {
        current: Math.round(progress),
        needed: span,
        pct: Math.min(100, Math.round((progress / span) * 100)),
    };
}

export interface Achievement {
    id: string;
    title: string;
    description: string;
    xp: number;
    unlocked: boolean;
    icon: string;
    progress?: number; // 0.0 a 1.0
}

export function calcAchievements(
    freqPct: number,
    presentCount: number,
    certCount: number,
    streak: number = 0,
): Achievement[] {
    return [
        { id: 'first_presence', title: 'Primeira Presença', description: 'Compareceu pela primeira vez', xp: 50, unlocked: presentCount >= 1, icon: '👣', progress: Math.min(1, presentCount / 1) },
        { id: 'ten_presences', title: '10 Presenças', description: 'Acumulou 10 presenças', xp: 100, unlocked: presentCount >= 10, icon: '🔟', progress: Math.min(1, presentCount / 10) },
        { id: 'twenty_presences', title: '20 Presenças', description: 'Acumulou 20 presenças', xp: 150, unlocked: presentCount >= 20, icon: '💪', progress: Math.min(1, presentCount / 20) },
        { id: 'first_cert', title: 'Primeiro Certificado', description: '1 Certificado conquistado', xp: 100, unlocked: certCount >= 1, icon: '🏆', progress: Math.min(1, certCount / 1) },
        { id: 'three_certs', title: 'Colecionador', description: '3 Certificados conquistados', xp: 300, unlocked: certCount >= 3, icon: '👑', progress: Math.min(1, certCount / 3) },
        { id: 'streak_7', title: 'Sequência 7 dias', description: '7 dias consecutivos de presença', xp: 70, unlocked: streak >= 7, icon: '🔥', progress: Math.min(1, streak / 7) },
        { id: 'rank_c', title: 'Rank C Atingido', description: 'Frequência ≥ 75%', xp: 150, unlocked: freqPct >= 75, icon: '🟢', progress: Math.min(1, freqPct / 75) },
        { id: 'rank_a', title: 'Alta Performance', description: 'Frequência ≥ 90%', xp: 250, unlocked: freqPct >= 90, icon: '🚀', progress: Math.min(1, freqPct / 90) },
        { id: 'rank_s', title: 'Rank S — LENDÁRIO', description: 'Frequência ≥ 95%', xp: 500, unlocked: freqPct >= 95, icon: '⭐', progress: Math.min(1, freqPct / 95) },
    ];
}

export function getNotifXP(title: string): number | null {
    const t = title.toLowerCase();
    if (t.includes('certificado')) return 100;
    if (t.includes('aprovad') || t.includes('matrícula')) return 50;
    if (t.includes('rank') || t.includes('conquista')) return 75;
    return null;
}

// Cache helpers
export const RANK_CACHE_KEY = 'student_rank_cache';
export const RANK_PREV_KEY  = 'student_rank_prev';

export function loadRankCache(): { rank: string; label: string; color: string; xp: number } | null {
    try {
        const c = localStorage.getItem(RANK_CACHE_KEY);
        return c ? JSON.parse(c) : null;
    } catch { return null; }
}

export function saveRankCache(info: { rank: string; label: string; color: string; xp: number }) {
    try { localStorage.setItem(RANK_CACHE_KEY, JSON.stringify(info)); } catch {}
}
