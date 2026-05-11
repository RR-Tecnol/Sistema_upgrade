'use client';

import { Fragment, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    RANKS,
    getRankConfig,
    getRankStepStates,
    progressWithinBand,
    calcXPToNext,
    buildRankJourneyNarrativeBlocks,
    minimalRankMissionContext,
    type RankConfig,
    type StudentRankMissionContext,
    type Achievement,
} from '@/lib/gamification';

function ChevronRight({ color, size = 14 }: { color: string; size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            style={{ flexShrink: 0, color, filter: color !== '#CBD5E1' ? `drop-shadow(0 0 4px ${color}55)` : undefined }}
        >
            <path
                d="M10 7l5 5-5 5"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export interface RankJourneyTrailProps {
    freqPct: number;
    /** Trail compacto (ex.: dashboard) */
    compact?: boolean;
    /** Sem cartão exterior — encaixar dentro de painéis já estilizados */
    embedded?: boolean;
    sectionTitle?: string;
    /** Dados para missões por turma / presenças / certificados (sem isto usa-se só a % global). */
    missionContext?: StudentRankMissionContext;
    /** Lista completa de conquistas (ex.: `calcAchievements(...)`) para o bloco “O teu percurso”. */
    achievements?: Achievement[];
}

export default function RankJourneyTrail({
    freqPct,
    compact = false,
    embedded = false,
    sectionTitle = 'JORNADA DE RANKS',
    missionContext,
    achievements,
}: RankJourneyTrailProps) {
    const [modalRank, setModalRank] = useState<RankConfig['rank'] | null>(null);
    const steps = getRankStepStates(freqPct);
    const nodeSize = compact ? 34 : 46;
    const fontRank = compact ? '0.82rem' : '1.05rem';
    const connectorH = compact ? 2 : 3;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setModalRank(null);
        };
        if (modalRank) window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [modalRank]);

    const modalIdx = modalRank ? RANKS.findIndex((r) => r.rank === modalRank) : -1;
    const modalConfig = modalIdx >= 0 ? RANKS[modalIdx] : null;
    const band = modalIdx >= 0 ? progressWithinBand(freqPct, modalIdx) : null;
    const xpToNext = calcXPToNext(freqPct);
    const current = getRankConfig(freqPct);
    const curIdx = RANKS.findIndex((r) => r.rank === current.rank);
    const nextAfterModal =
        modalIdx >= 0 && modalIdx < RANKS.length - 1 ? RANKS[modalIdx + 1] : null;

    const ctx: StudentRankMissionContext = missionContext ?? minimalRankMissionContext(freqPct);
    const narrative =
        modalIdx >= 0
            ? buildRankJourneyNarrativeBlocks(freqPct, modalIdx, ctx, achievements ?? [])
            : null;

    return (
        <>
            <div
                style={{
                    background: embedded ? 'transparent' : '#fff',
                    borderRadius: embedded ? 0 : 16,
                    padding: embedded ? 0 : compact ? '1rem' : '1.5rem',
                    border: embedded ? 'none' : '1px solid #E5E7EB',
                    boxShadow: embedded ? 'none' : '0 2px 14px rgba(15,23,42,0.06)',
                }}
            >
                <h2
                    style={{
                        fontFamily: 'Orbitron, sans-serif',
                        fontSize: compact ? '0.68rem' : '0.75rem',
                        fontWeight: 800,
                        letterSpacing: '0.15em',
                        color: '#6B7280',
                        marginBottom: compact ? '0.75rem' : '1rem',
                    }}
                >
                    🎯 {sectionTitle}
                </h2>
                <div
                    style={{
                        width: '100%',
                        overflowX: 'auto',
                        overflowY: 'visible',
                        /** Margem inferior para o indicador do rank actual (bottom: -6px + animação) não cortar a borda. */
                        paddingBottom: compact ? 16 : 20,
                        WebkitOverflowScrolling: 'touch',
                        /** Espaço lateral para glow/scale do patamar actual (ex.: S) não ser cortado. */
                        paddingLeft: compact ? 10 : 14,
                        paddingRight: compact ? 18 : 22,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0,
                            minWidth: 'min-content',
                            paddingTop: compact ? 4 : 6,
                            paddingBottom: compact ? 6 : 8,
                        }}
                    >
                    {steps.map((step, i) => {
                        const { config, state } = step;
                        const isCurrent = state === 'current';
                        const isCompleted = state === 'completed';
                        const isLocked = state === 'locked';
                        const nextCfg = i < RANKS.length - 1 ? RANKS[i + 1] : null;
                        const segmentFilled = nextCfg ? freqPct >= nextCfg.minFreq : true;
                        const fromColor = config.color;
                        const toColor = nextCfg?.color ?? fromColor;

                        return (
                            <Fragment key={config.rank}>
                                <button
                                    type="button"
                                    aria-pressed={modalRank === config.rank}
                                    aria-label={`Rank ${config.rank}, ${config.label}. Ver missão do patamar.`}
                                    onClick={() => setModalRank(config.rank)}
                                    style={{
                                        width: nodeSize,
                                        height: nodeSize,
                                        minWidth: nodeSize,
                                        borderRadius: compact ? 10 : 12,
                                        background:
                                            isCompleted || isCurrent
                                                ? `linear-gradient(145deg, ${config.color}22, ${config.color}0d)`
                                                : '#F3F4F6',
                                        border: `${isCurrent ? 3 : 2}px solid ${
                                            isLocked ? '#E5E7EB' : config.color
                                        }`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        boxShadow: isCurrent
                                            ? `0 0 20px ${config.color}55, 0 4px 14px rgba(15,23,42,0.12)`
                                            : isCompleted
                                              ? `0 2px 10px ${config.color}33`
                                              : 'none',
                                        transform: isCurrent ? 'scale(1.08)' : 'scale(1)',
                                        transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease, border-color 0.2s',
                                        padding: 0,
                                        color: 'inherit',
                                        flexShrink: 0,
                                    }}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.transform = isCurrent
                                            ? 'scale(1.1)'
                                            : 'scale(1.06)';
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.transform = isCurrent
                                            ? 'scale(1.08)'
                                            : 'scale(1)';
                                    }}
                                >
                                    <span
                                        style={{
                                            fontFamily: 'Orbitron, sans-serif',
                                            fontWeight: 900,
                                            fontSize: fontRank,
                                            color: isLocked ? '#D1D5DB' : config.color,
                                            lineHeight: 1,
                                        }}
                                    >
                                        {config.rank}
                                    </span>
                                    {isCompleted && (
                                        <span
                                            style={{
                                                position: 'absolute',
                                                top: -5,
                                                right: -5,
                                                width: compact ? 14 : 17,
                                                height: compact ? 14 : 17,
                                                borderRadius: '50%',
                                                background: '#10B981',
                                                color: '#fff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: compact ? '0.55rem' : '0.62rem',
                                                fontWeight: 900,
                                                border: '2px solid #fff',
                                                boxShadow: '0 2px 8px rgba(16,185,129,0.45)',
                                            }}
                                        >
                                            ✓
                                        </span>
                                    )}
                                    {isCurrent && !isCompleted && (
                                        <span
                                            style={{
                                                position: 'absolute',
                                                bottom: 3,
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                width: 10,
                                                height: 10,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    width: 6,
                                                    height: 6,
                                                    borderRadius: '50%',
                                                    background: config.color,
                                                    boxShadow: `0 0 10px ${config.color}`,
                                                    animation: 'rankTrailDotPulse 1.8s ease-in-out infinite',
                                                }}
                                            />
                                        </span>
                                    )}
                                </button>
                                {i < RANKS.length - 1 && nextCfg && (
                                    <div
                                        style={{
                                            flex: 1,
                                            minWidth: compact ? 12 : 18,
                                            maxWidth: 120,
                                            display: 'flex',
                                            alignItems: 'center',
                                            height: nodeSize,
                                            padding: '0 2px',
                                        }}
                                    >
                                        <div
                                            style={{
                                                flex: 1,
                                                height: connectorH,
                                                borderRadius: 99,
                                                background: segmentFilled
                                                    ? `linear-gradient(90deg, ${fromColor}aa, ${toColor})`
                                                    : '#E5E7EB',
                                                position: 'relative',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {segmentFilled && (
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        background:
                                                            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
                                                        animation: 'xp-shimmer 2s ease-in-out infinite',
                                                    }}
                                                />
                                            )}
                                        </div>
                                        <ChevronRight color={segmentFilled ? toColor : '#CBD5E1'} size={compact ? 12 : 14} />
                                    </div>
                                )}
                            </Fragment>
                        );
                    })}
                    </div>
                </div>
                <p
                    style={{
                        margin: compact ? '0.65rem 0 0' : '0.85rem 0 0',
                        fontSize: compact ? '0.65rem' : '0.72rem',
                        color: '#94A3B8',
                        lineHeight: 1.45,
                    }}
                >
                    Toque num patamar para ver a <strong style={{ color: '#475569' }}>missão</strong> e o progresso até esse rank.
                </p>
            </div>

            {modalRank && modalConfig && band && typeof document !== 'undefined' &&
                createPortal(
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="rank-journey-modal-title"
                        onClick={() => setModalRank(null)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(15,23,42,0.55)',
                            backdropFilter: 'blur(6px)',
                            zIndex: 10000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1rem',
                        }}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
                                borderRadius: 20,
                                padding: '1.75rem',
                                maxWidth: 520,
                                width: '100%',
                                border: `2px solid ${modalConfig.color}44`,
                                boxShadow: `0 24px 48px rgba(15,23,42,0.18), 0 0 0 1px rgba(255,255,255,0.8) inset, 0 0 40px ${modalConfig.color}22`,
                                animation: 'scaleIn 0.28s cubic-bezier(0.22,1,0.36,1)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                <div
                                    style={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: 14,
                                        background: `linear-gradient(145deg, ${modalConfig.color}33, ${modalConfig.color}12)`,
                                        border: `2px solid ${modalConfig.color}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontFamily: 'Orbitron, sans-serif',
                                        fontWeight: 900,
                                        fontSize: '1.5rem',
                                        color: modalConfig.rank === 'S' ? '#B45309' : modalConfig.color,
                                    }}
                                >
                                    {modalConfig.rank}
                                </div>
                                <div>
                                    <h3
                                        id="rank-journey-modal-title"
                                        style={{
                                            fontFamily: 'Orbitron, sans-serif',
                                            fontSize: '1rem',
                                            fontWeight: 900,
                                            color: '#0F172A',
                                            margin: 0,
                                            letterSpacing: '0.04em',
                                        }}
                                    >
                                        Rank {modalConfig.rank} — {modalConfig.label}
                                    </h3>
                                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                                        Faixa de frequência: <strong>{modalConfig.minFreq}%</strong> a{' '}
                                        <strong>{modalConfig.maxFreq}%</strong>
                                    </p>
                                </div>
                            </div>

                            {narrative && (
                                <>
                                    <div
                                        style={{
                                            padding: '0.85rem 1rem',
                                            borderRadius: 12,
                                            background: '#F8FAFC',
                                            border: '1px solid #E2E8F0',
                                            marginBottom: '0.85rem',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.66rem',
                                                fontWeight: 800,
                                                color: '#475569',
                                                letterSpacing: '0.08em',
                                                marginBottom: 6,
                                            }}
                                        >
                                            {narrative.globalBlock.title}
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#334155', lineHeight: 1.5 }}>
                                            {narrative.globalBlock.body}
                                        </p>
                                    </div>

                                    {narrative.showRankVsExtrasNote && (
                                        <div
                                            style={{
                                                padding: '0.65rem 0.85rem',
                                                borderRadius: 10,
                                                background: '#FFFBEB',
                                                border: '1px solid #FDE68A',
                                                marginBottom: '0.85rem',
                                                fontSize: '0.76rem',
                                                color: '#78350F',
                                                lineHeight: 1.45,
                                            }}
                                        >
                                            O teu <strong>rank oficial</strong> segue só a <strong>frequência global</strong>. Os
                                            requisitos por turma ou certificado abaixo são metas de consolidação — podes estar num
                                            patamar alto na global e ainda cumprir estes extras em várias turmas.
                                        </div>
                                    )}

                                    <div style={{ marginBottom: '0.85rem' }}>
                                        <div
                                            style={{
                                                fontSize: '0.66rem',
                                                fontWeight: 800,
                                                color: '#64748B',
                                                letterSpacing: '0.08em',
                                                marginBottom: 8,
                                            }}
                                        >
                                            REQUISITOS DESTE PATAMAR
                                        </div>
                                        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {narrative.checklist.map((item) => (
                                                <li key={item.id}>
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                                        <span
                                                            aria-hidden
                                                            style={{
                                                                flexShrink: 0,
                                                                width: 22,
                                                                height: 22,
                                                                borderRadius: '50%',
                                                                border: item.met ? 'none' : '2px solid #CBD5E1',
                                                                background: item.met ? '#10B981' : 'transparent',
                                                                color: '#fff',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '0.7rem',
                                                                fontWeight: 900,
                                                                marginTop: 2,
                                                            }}
                                                        >
                                                            {item.met ? '✓' : ''}
                                                        </span>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div
                                                                style={{
                                                                    fontSize: '0.82rem',
                                                                    fontWeight: 700,
                                                                    color: item.met ? '#059669' : '#0F172A',
                                                                    lineHeight: 1.35,
                                                                }}
                                                            >
                                                                {item.label}
                                                            </div>
                                                            {item.detail ? (
                                                                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748B', lineHeight: 1.4 }}>
                                                                    {item.detail}
                                                                </p>
                                                            ) : null}
                                                            {typeof item.progress === 'number' && !item.met && item.progress > 0 && item.progress < 1 ? (
                                                                <div
                                                                    style={{
                                                                        marginTop: 6,
                                                                        height: 5,
                                                                        borderRadius: 4,
                                                                        background: '#E2E8F0',
                                                                        overflow: 'hidden',
                                                                        maxWidth: 200,
                                                                    }}
                                                                >
                                                                    <div
                                                                        style={{
                                                                            height: '100%',
                                                                            width: `${Math.round(item.progress * 100)}%`,
                                                                            background: modalConfig.color,
                                                                            borderRadius: 4,
                                                                            transition: 'width 0.35s ease',
                                                                        }}
                                                                    />
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div style={{ marginBottom: '0.85rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                                                Progresso de frequência global neste degrau (até {band.gateMin}%)
                                            </span>
                                            <span
                                                style={{
                                                    fontFamily: 'JetBrains Mono, monospace',
                                                    fontSize: '0.72rem',
                                                    fontWeight: 800,
                                                    color: band.met ? '#059669' : modalConfig.color,
                                                }}
                                            >
                                                {band.met ? 'Concluída' : `${band.pct}%`}
                                            </span>
                                        </div>
                                        <div style={{ height: 10, borderRadius: 6, background: '#E2E8F0', overflow: 'hidden' }}>
                                            <div
                                                style={{
                                                    height: '100%',
                                                    borderRadius: 6,
                                                    width: `${band.met ? 100 : band.pct}%`,
                                                    background: `linear-gradient(90deg, ${modalConfig.color}99, ${modalConfig.color})`,
                                                    transition: 'width 0.7s cubic-bezier(0.22,1,0.36,1)',
                                                    boxShadow: `0 0 14px ${modalConfig.color}55`,
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        background:
                                                            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)',
                                                        animation: 'xp-shimmer 2s ease-in-out infinite',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {narrative.unlockedOrdered.length > 0 && (
                                        <div style={{ marginBottom: '0.85rem' }}>
                                            <div
                                                style={{
                                                    fontSize: '0.66rem',
                                                    fontWeight: 800,
                                                    color: '#64748B',
                                                    letterSpacing: '0.08em',
                                                    marginBottom: 8,
                                                }}
                                            >
                                                O TEU PERCURSO (CONQUISTAS DESBLOQUEADAS)
                                            </div>
                                            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {narrative.unlockedOrdered.map((a) => (
                                                    <li
                                                        key={a.id}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 10,
                                                            fontSize: '0.78rem',
                                                            color: '#334155',
                                                        }}
                                                    >
                                                        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{a.icon}</span>
                                                        <span>
                                                            <strong>{a.title}</strong>
                                                            <span style={{ color: '#94A3B8' }}> · +{a.xp} XP</span>
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            )}

                            {modalIdx < curIdx && (
                                <p style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600, marginBottom: '0.75rem' }}>
                                    Este patamar já faz parte da tua jornada concluída.
                                </p>
                            )}
                            {modalIdx > curIdx && nextAfterModal && (
                                <p style={{ fontSize: '0.78rem', color: '#92400E', marginBottom: '0.75rem', lineHeight: 1.45 }}>
                                    Ainda em jornada: o teu rank actual é <strong>{current.rank}</strong>. Falta frequência global
                                    para desbloqueares patamares à frente.
                                </p>
                            )}

                            {curIdx < RANKS.length - 1 && (
                                <div
                                    style={{
                                        padding: '0.75rem 0.9rem',
                                        borderRadius: 10,
                                        background: '#FFFBEB',
                                        border: '1px solid #FDE68A',
                                        fontSize: '0.76rem',
                                        color: '#78350F',
                                        marginBottom: '1rem',
                                    }}
                                >
                                    <strong>Próximo passo global:</strong> Rank {RANKS[curIdx + 1].rank} (
                                    {RANKS[curIdx + 1].minFreq}%) — progresso no rank actual:{' '}
                                    <strong>{xpToNext.pct}%</strong>
                                    {freqPct < RANKS[curIdx + 1].minFreq && (
                                        <span>
                                            {' '}
                                            · faltam <strong>{Math.max(0, RANKS[curIdx + 1].minFreq - freqPct)}</strong> pontos percentuais
                                            de frequência.
                                        </span>
                                    )}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setModalRank(null)}
                                style={{
                                    width: '100%',
                                    padding: '0.65rem 1rem',
                                    borderRadius: 12,
                                    border: 'none',
                                    background: '#0F172A',
                                    color: '#fff',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                }}
                            >
                                Fechar
                            </button>
                        </div>
                    </div>,
                    document.body,
                )}

            <style>{`
                @keyframes scaleIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                @keyframes rankTrailDotPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.75; } }
            `}</style>
        </>
    );
}
