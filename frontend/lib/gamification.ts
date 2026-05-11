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

/** Estado visual de cada patamar na jornada (frequência global). */
export type RankStepState = 'locked' | 'current' | 'completed';

export function getRankStepStates(freqPct: number): { rank: RankConfig['rank']; state: RankStepState; config: RankConfig; index: number }[] {
    const current = getRankConfig(freqPct);
    const curIdx = RANKS.findIndex((r) => r.rank === current.rank);
    return RANKS.map((config, i) => {
        let state: RankStepState;
        if (i < curIdx) state = 'completed';
        else if (i === curIdx) state = 'current';
        else state = 'locked';
        return { rank: config.rank, state, config, index: i };
    });
}

/** Resumo curto do portão (legado / tooltips). Preferir `getPatamarMissionChecklist` na UI. */
export function getRankGateMissionText(rankIndex: number): string {
    const r = RANKS[rankIndex];
    if (!r) return '';
    if (rankIndex === 0) {
        return 'Registar presença e evoluir a frequência global (próximo: Rank D a partir de 60%).';
    }
    return `Frequência global ≥ ${r.minFreq}% para o patamar ${r.rank} (${r.label}), mais metas por turma nos patamares superiores.`;
}

/** Progresso 0–100 dentro da faixa entre o mínimo do rank anterior e o mínimo do patamar alvo. */
export function progressWithinBand(
    freqPct: number,
    rankIndex: number,
): { pct: number; met: boolean; prevMin: number; gateMin: number } {
    const gate = RANKS[rankIndex];
    if (!gate) return { pct: 0, met: false, prevMin: 0, gateMin: 0 };
    const prevMin = rankIndex > 0 ? RANKS[rankIndex - 1].minFreq : 0;
    const span = gate.minFreq - prevMin;
    const met = freqPct >= gate.minFreq;
    if (span <= 0) return { pct: met ? 100 : Math.min(100, Math.max(0, freqPct)), met, prevMin, gateMin: gate.minFreq };
    const raw = ((freqPct - prevMin) / span) * 100;
    const pct = Math.min(100, Math.max(0, Math.round(raw)));
    return { pct, met, prevMin, gateMin: gate.minFreq };
}

/** Normaliza resposta da API (array directo ou `{ data: [] }`). */
export function normalizeCertificateList(raw: unknown): unknown[] {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)) {
        return (raw as { data: unknown[] }).data;
    }
    return [];
}

/** Certificados válidos para gamificação (ACTIVE ou legado sem `status`). */
export function filterActiveCertificates(certs: unknown[]): unknown[] {
    return certs.filter((c) => {
        const o = c as { status?: string } | null;
        if (!o || typeof o !== 'object') return false;
        return !o.status || o.status === 'ACTIVE';
    });
}

export function countActiveCertificates(certs: unknown[]): number {
    return filterActiveCertificates(certs).length;
}

/** Conta turmas (itens do certificate-progress) com frequência ≥ 75%. */
export function countClassesAtOrAbove75FromProgressItems(
    items: Array<{ attendanceRatePct?: number }> | undefined | null,
): number {
    if (!items?.length) return 0;
    return items.filter((i) => typeof i.attendanceRatePct === 'number' && i.attendanceRatePct >= 75).length;
}

/** Contexto para missões de patamar / dashboard (dados já expostos pela API). */
export interface StudentRankMissionContext {
    freqPct: number;
    presentCount: number;
    certCount: number;
    streak?: number;
    classesAtOrAbove75: number;
    activeEnrollmentCount?: number;
}

export function minimalRankMissionContext(freqPct: number): StudentRankMissionContext {
    return {
        freqPct,
        presentCount: 0,
        certCount: 0,
        streak: 0,
        classesAtOrAbove75: 0,
    };
}

export interface PatamarMissionItem {
    id: string;
    label: string;
    detail: string;
    met: boolean;
    /** 0–1 quando aplicável */
    progress?: number;
    kind: 'global' | 'turmas' | 'cert' | 'presencas' | 'info';
}

/** Missões objectivas por patamar (rank oficial continua só na frequência global). */
export function getPatamarMissionChecklist(
    rankIndex: number,
    ctx: StudentRankMissionContext,
): PatamarMissionItem[] {
    const { freqPct, presentCount, certCount, classesAtOrAbove75 } = ctx;
    const gate = RANKS[rankIndex];
    if (!gate) return [];

    const pushGlobal = (id: string, min: number): PatamarMissionItem => {
        const met = freqPct >= min;
        return {
            id,
            label: `Frequência global ≥ ${min}%`,
            detail: `Valor actual: ${freqPct}%. Faixa do patamar ${gate.rank}: ${gate.minFreq}%–${gate.maxFreq}%.`,
            met,
            progress: Math.min(1, freqPct / Math.max(min, 1)),
            kind: 'global',
        };
    };

    const pushTurmas = (id: string, need: number): PatamarMissionItem => {
        const met = classesAtOrAbove75 >= need;
        return {
            id,
            label: `${need} turma(s) com frequência ≥ 75%`,
            detail:
                need <= 1
                    ? 'Conta turmas em que a tua frequência na turma já atinge ou supera 75% (dados do progresso para certificado).'
                    : 'Excelência em várias turmas — alinha com o mínimo de aprovação Qualifica em cada módulo.',
            met,
            progress: Math.min(1, need > 0 ? classesAtOrAbove75 / need : 1),
            kind: 'turmas',
        };
    };

    const pushCert = (need: number): PatamarMissionItem => ({
        id: `patamar_cert_${need}`,
        label: `${need} certificado(s) válido(s) (ACTIVE)`,
        detail: 'Certificados emitidos e activos no teu perfil.',
        met: certCount >= need,
        progress: Math.min(1, need > 0 ? certCount / need : 1),
        kind: 'cert',
    });

    switch (rankIndex) {
        case 0:
            return [
                {
                    id: 'e_presence',
                    label: 'Registar pelo menos 1 presença',
                    detail: 'Comparece a aulas registadas pelo formador na plataforma.',
                    met: presentCount >= 1,
                    progress: Math.min(1, presentCount),
                    kind: 'presencas',
                },
                {
                    id: 'e_next_d',
                    label: 'Próximo patamar (D): frequência global ≥ 60%',
                    detail: 'Quando a média global das tuas presenças atingir 60%, o badge passa para Aprendiz.',
                    met: freqPct >= 60,
                    progress: Math.min(1, freqPct / 60),
                    kind: 'info',
                },
            ];
        case 1:
            return [pushGlobal('d_global', 60)];
        case 2:
            return [pushGlobal('c_global', 75), pushTurmas('c_turmas', 1)];
        case 3:
            return [pushGlobal('b_global', 85), pushTurmas('b_turmas', 1)];
        case 4:
            return [pushGlobal('a_global', 90), pushTurmas('a_turmas', 2)];
        case 5:
            return [pushGlobal('s_global', 95), pushTurmas('s_turmas', 2), pushCert(1)];
        default:
            return [];
    }
}

export interface RankNarrativeBlock {
    title: string;
    body: string;
}

export function buildRankJourneyNarrativeBlocks(
    freqPct: number,
    modalRankIndex: number,
    ctx: StudentRankMissionContext,
    achievements: Achievement[],
): {
    globalBlock: RankNarrativeBlock;
    checklist: PatamarMissionItem[];
    unlockedOrdered: Achievement[];
    showRankVsExtrasNote: boolean;
} {
    const gate = RANKS[modalRankIndex];
    const next = RANKS[modalRankIndex + 1];
    const globalBlock: RankNarrativeBlock = {
        title: 'Rank oficial (frequência global)',
        body: gate
            ? `O teu valor actual é ${freqPct}%. O patamar ${gate.rank} (${gate.label}) corresponde à faixa ${gate.minFreq}%–${gate.maxFreq}% na média global de presenças.${
                  next ? ` O patamar seguinte (${next.rank}) começa em ${next.minFreq}%.` : ''
              }`
            : '',
    };
    const checklist = getPatamarMissionChecklist(modalRankIndex, ctx);
    const order = [
        'first_presence',
        'ten_presences',
        'twenty_presences',
        'first_cert',
        'three_certs',
        'streak_7',
        'two_strong_classes',
        'cross_class_presence',
        'rank_c',
        'rank_a',
        'rank_s',
    ];
    const unlocked = achievements.filter((a) => a.unlocked);
    const rank = (i: string) => order.indexOf(i);
    unlocked.sort((a, b) => {
        const ia = rank(a.id);
        const ib = rank(b.id);
        const sa = ia === -1 ? 999 : ia;
        const sb = ib === -1 ? 999 : ib;
        return sa - sb;
    });
    const gateMin = gate?.minFreq ?? 0;
    const globalOk = freqPct >= gateMin;
    const extrasUnmet = checklist.some((m) => !m.met && m.kind !== 'global' && m.kind !== 'info');
    const showRankVsExtrasNote = globalOk && extrasUnmet;

    return { globalBlock, checklist, unlockedOrdered: unlocked, showRankVsExtrasNote };
}

/** Missões do painel do aluno (fonte única; substitui função local no dashboard). */
export interface DashboardMission {
    id: string;
    icon: string;
    title: string;
    description: string;
    xpReward: number;
    completed: boolean;
    progress: number;
}

export function getDashboardMissions(
    attendance: { rate: number; presentCount: number; totalClasses: number },
    certCount: number,
    classesAtOrAbove75: number,
): DashboardMission[] {
    const { rate, presentCount } = attendance;
    return [
        {
            id: 'freq_75',
            icon: '📊',
            title: 'Frequência global ≥ 75%',
            description: `Actual: ${rate}% — alinha com aprovação e patamar C`,
            xpReward: 50,
            completed: rate >= 75,
            progress: Math.min(1, rate / 75),
        },
        {
            id: 'freq_90',
            icon: '🚀',
            title: 'Frequência global ≥ 90%',
            description: 'Desempenho excepcional — patamar A',
            xpReward: 100,
            completed: rate >= 90,
            progress: Math.min(1, rate / 90),
        },
        {
            id: 'pres_5',
            icon: '✅',
            title: '5 presenças',
            description: `${presentCount} / 5 presenças registadas`,
            xpReward: 25,
            completed: presentCount >= 5,
            progress: Math.min(1, presentCount / 5),
        },
        {
            id: 'pres_20',
            icon: '💪',
            title: '20 presenças',
            description: `${presentCount} / 20 presenças registadas`,
            xpReward: 75,
            completed: presentCount >= 20,
            progress: Math.min(1, presentCount / 20),
        },
        {
            id: 'turma_75_1',
            icon: '📚',
            title: '1 turma com ≥ 75%',
            description: `${classesAtOrAbove75} / 1 turma(s) com frequência na turma ≥ 75%`,
            xpReward: 40,
            completed: classesAtOrAbove75 >= 1,
            progress: Math.min(1, classesAtOrAbove75 / 1),
        },
        {
            id: 'turma_75_2',
            icon: '🎯',
            title: '2 turmas com ≥ 75%',
            description: `${classesAtOrAbove75} / 2 turmas — meta extra para patamares A/S`,
            xpReward: 90,
            completed: classesAtOrAbove75 >= 2,
            progress: Math.min(1, classesAtOrAbove75 / 2),
        },
        {
            id: 'cert_1',
            icon: '🏆',
            title: 'Primeiro certificado',
            description: 'Certificado válido (ACTIVE) no perfil',
            xpReward: 150,
            completed: certCount >= 1,
            progress: Math.min(1, certCount / 1),
        },
        {
            id: 'cert_3',
            icon: '👑',
            title: '3 certificados',
            description: `${certCount} / 3 certificados válidos`,
            xpReward: 300,
            completed: certCount >= 3,
            progress: Math.min(1, certCount / 3),
        },
    ];
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
    classesAtOrAbove75: number = 0,
): Achievement[] {
    const twoTurmas = classesAtOrAbove75 >= 2;
    const transversal = classesAtOrAbove75 >= 1 && presentCount >= 20;
    return [
        { id: 'first_presence', title: 'Primeira Presença', description: 'Compareceu pela primeira vez', xp: 50, unlocked: presentCount >= 1, icon: '👣', progress: Math.min(1, presentCount / 1) },
        { id: 'ten_presences', title: '10 Presenças', description: 'Acumulou 10 presenças', xp: 100, unlocked: presentCount >= 10, icon: '🔟', progress: Math.min(1, presentCount / 10) },
        { id: 'twenty_presences', title: '20 Presenças', description: 'Acumulou 20 presenças', xp: 150, unlocked: presentCount >= 20, icon: '💪', progress: Math.min(1, presentCount / 20) },
        { id: 'first_cert', title: 'Primeiro Certificado', description: '1 Certificado conquistado', xp: 100, unlocked: certCount >= 1, icon: '🏆', progress: Math.min(1, certCount / 1) },
        { id: 'three_certs', title: 'Colecionador', description: '3 Certificados conquistados', xp: 300, unlocked: certCount >= 3, icon: '👑', progress: Math.min(1, certCount / 3) },
        { id: 'streak_7', title: 'Sequência 7 dias', description: '7 dias consecutivos de presença', xp: 70, unlocked: streak >= 7, icon: '🔥', progress: Math.min(1, streak / 7) },
        {
            id: 'two_strong_classes',
            title: 'Duas turmas fortes',
            description: 'Duas turmas com frequência na turma ≥ 75%',
            xp: 120,
            unlocked: twoTurmas,
            icon: '📚',
            progress: Math.min(1, classesAtOrAbove75 / 2),
        },
        {
            id: 'cross_class_presence',
            title: 'Presença transversal',
            description: 'Pelo menos 1 turma ≥ 75% e 20 presenças registadas',
            xp: 130,
            unlocked: transversal,
            icon: '🎯',
            progress: Math.min(1, (classesAtOrAbove75 >= 1 ? 0.5 : 0) + (presentCount >= 20 ? 0.5 : Math.min(0.5, presentCount / 40))),
        },
        { id: 'rank_c', title: 'Rank C Atingido', description: 'Frequência global ≥ 75%', xp: 150, unlocked: freqPct >= 75, icon: '🟢', progress: Math.min(1, freqPct / 75) },
        { id: 'rank_a', title: 'Alta Performance', description: 'Frequência global ≥ 90%', xp: 250, unlocked: freqPct >= 90, icon: '🚀', progress: Math.min(1, freqPct / 90) },
        { id: 'rank_s', title: 'Rank S — LENDÁRIO', description: 'Frequência global ≥ 95%', xp: 500, unlocked: freqPct >= 95, icon: '⭐', progress: Math.min(1, freqPct / 95) },
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
