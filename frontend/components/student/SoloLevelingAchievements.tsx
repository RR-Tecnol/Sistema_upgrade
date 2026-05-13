'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { type Achievement } from '@/lib/gamification';

interface AchievementBadgeProps {
    achievement: Achievement;
    size?: 'sm' | 'md' | 'lg';
    onClick?: () => void;
}

/**
 * Badge individual de conquista — estilo Solo Leveling.
 */
function AchievementBadge({ achievement, size = 'md', onClick }: AchievementBadgeProps) {
    const [hovered, setHovered] = useState(false);

    const sizes = {
        sm: { pad: '0.2rem 0.55rem', iconSize: '0.75rem', textSize: '0.62rem', gap: '0.3rem' },
        md: { pad: '0.35rem 0.75rem', iconSize: '0.9rem', textSize: '0.7rem', gap: '0.4rem' },
        lg: { pad: '0.5rem 1rem', iconSize: '1.1rem', textSize: '0.82rem', gap: '0.5rem' },
    };
    const s = sizes[size];

    const baseColor = achievement.unlocked ? '#10B981' : '#9CA3AF';
    const bgColor = achievement.unlocked
        ? 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)'
        : 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)';
    const borderColor = achievement.unlocked ? 'rgba(16,185,129,0.35)' : '#E5E7EB';
    const glowColor = achievement.unlocked ? 'rgba(16,185,129,0.25)' : 'transparent';

    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: s.gap,
                padding: s.pad,
                borderRadius: 100,
                background: bgColor,
                border: `1.5px solid ${borderColor}`,
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: hovered && onClick ? 'scale(1.08)' : 'none',
                boxShadow: hovered && onClick
                    ? `0 4px 16px ${glowColor}, 0 0 0 2px ${baseColor}30`
                    : `0 1px 3px rgba(0,0,0,0.04)`,
                opacity: achievement.unlocked ? 1 : 0.6,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Shimmer effect when unlocked and hovered */}
            {achievement.unlocked && hovered && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                        animation: 'badge-shimmer 0.6s ease',
                        pointerEvents: 'none',
                    }}
                />
            )}

            <span style={{
                fontSize: s.iconSize,
                filter: achievement.unlocked ? 'none' : 'grayscale(1)',
                transition: 'filter 0.2s',
            }}>
                {achievement.icon}
            </span>

            <span style={{
                fontSize: s.textSize,
                fontWeight: 600,
                color: baseColor,
                whiteSpace: 'nowrap',
            }}>
                {achievement.title}
            </span>

            {/* XP indicator quando desbloqueado */}
            {achievement.unlocked && (
                <span style={{
                    marginLeft: '0.15rem',
                    padding: '0.1rem 0.35rem',
                    borderRadius: 100,
                    background: 'rgba(16,185,129,0.15)',
                    fontFamily: 'Orbitron, sans-serif',
                    fontWeight: 800,
                    fontSize: '0.52rem',
                    color: '#059669',
                }}>
                    +{achievement.xp}
                </span>
            )}

            {/* Lock icon quando não desbloqueado */}
            {!achievement.unlocked && (
                <span style={{
                    marginLeft: '0.1rem',
                    fontSize: '0.55rem',
                    color: '#9CA3AF',
                }}>
                    🔒
                </span>
            )}

            <style jsx>{`
                @keyframes badge-shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
}

interface AchievementDetailModalProps {
    achievement: Achievement;
    onClose: () => void;
}

/**
 * Modal de detalhe da conquista — mostra progresso e XP.
 */
function AchievementDetailModal({ achievement, onClose }: AchievementDetailModalProps) {
    const progressPct = Math.round((achievement.progress ?? 0) * 100);

    return createPortal(
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(4px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                animation: 'fadeIn 0.2s ease',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#fff',
                    borderRadius: 20,
                    width: '100%',
                    maxWidth: 380,
                    boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
                    overflow: 'hidden',
                    animation: 'slideUp 0.25s cubic-bezier(.4,0,.2,1)',
                    border: achievement.unlocked
                        ? '2px solid rgba(16,185,129,0.4)'
                        : '2px solid rgba(245,158,11,0.4)',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '1.25rem',
                    background: achievement.unlocked
                        ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    textAlign: 'center',
                    position: 'relative',
                }}>
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            background: 'rgba(0,0,0,0.15)',
                            border: 'none',
                            borderRadius: '50%',
                            width: 28,
                            height: 28,
                            cursor: 'pointer',
                            color: '#fff',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        ✕
                    </button>

                    {/* Icon */}
                    <div style={{
                        width: 72,
                        height: 72,
                        borderRadius: 20,
                        background: 'rgba(255,255,255,0.2)',
                        margin: '0 auto 0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2.2rem',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                        animation: achievement.unlocked ? 'trophy-bounce 0.5s ease' : 'none',
                    }}>
                        {achievement.icon}
                    </div>

                    {/* Status */}
                    <div style={{
                        fontFamily: 'Orbitron, sans-serif',
                        fontWeight: 900,
                        fontSize: '0.65rem',
                        color: 'rgba(255,255,255,0.8)',
                        letterSpacing: '0.12em',
                        marginBottom: '0.25rem',
                    }}>
                        {achievement.unlocked ? '✅ CONQUISTA DESBLOQUEADA' : '⏳ EM PROGRESSO'}
                    </div>

                    {/* Title */}
                    <div style={{
                        fontWeight: 800,
                        fontSize: '1.15rem',
                        color: '#fff',
                        textShadow: '0 2px 4px rgba(0,0,0,0.15)',
                    }}>
                        {achievement.title}
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '1.25rem' }}>
                    {/* Description */}
                    <p style={{
                        fontSize: '0.88rem',
                        color: '#374151',
                        textAlign: 'center',
                        marginBottom: '1.25rem',
                        lineHeight: 1.5,
                    }}>
                        {achievement.description}
                    </p>

                    {/* Progress bar */}
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.7rem', color: '#6B7280', fontWeight: 600 }}>PROGRESSO</span>
                            <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                color: achievement.unlocked ? '#10B981' : '#F59E0B',
                            }}>
                                {progressPct}%
                            </span>
                        </div>
                        <div style={{
                            height: 10,
                            background: '#F3F4F6',
                            borderRadius: 10,
                            overflow: 'hidden',
                            position: 'relative',
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${progressPct}%`,
                                background: achievement.unlocked
                                    ? 'linear-gradient(90deg, #10B981, #059669)'
                                    : 'linear-gradient(90deg, #F59E0B, #FFD600)',
                                borderRadius: 10,
                                transition: 'width 0.6s ease',
                                position: 'relative',
                                overflow: 'hidden',
                            }}>
                                {/* Shimmer */}
                                <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                                    animation: 'xp-shimmer 1.5s ease-in-out infinite',
                                }} />
                            </div>
                        </div>
                    </div>

                    {/* XP Reward */}
                    <div style={{
                        background: achievement.unlocked ? '#F0FDF4' : '#FFFBEB',
                        border: `1px solid ${achievement.unlocked ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                        borderRadius: 12,
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <span style={{ fontSize: '0.82rem', color: '#374151', fontWeight: 600 }}>
                            {achievement.unlocked ? '⚡ XP Obtido' : '⚡ XP ao Concluir'}
                        </span>
                        <span style={{
                            fontFamily: 'Orbitron, sans-serif',
                            fontWeight: 900,
                            fontSize: '1.1rem',
                            color: achievement.unlocked ? '#10B981' : '#F59E0B',
                        }}>
                            +{achievement.xp} XP
                        </span>
                    </div>

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        style={{
                            width: '100%',
                            marginTop: '1rem',
                            padding: '0.65rem',
                            background: '#0F172A',
                            color: '#FFD600',
                            border: 'none',
                            borderRadius: 10,
                            fontFamily: 'Orbitron, sans-serif',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            letterSpacing: '0.08em',
                            cursor: 'pointer',
                        }}
                    >
                        FECHAR
                    </button>
                </div>

                <style jsx>{`
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideUp {
                        from { opacity: 0; transform: translateY(30px) scale(0.95); }
                        to { opacity: 1; transform: translateY(0) scale(1); }
                    }
                    @keyframes trophy-bounce {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.15); }
                    }
                    @keyframes xp-shimmer {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(200%); }
                    }
                `}</style>
            </div>
        </div>,
        document.body
    );
}

interface SoloLevelingAchievementsProps {
    achievements: Achievement[];
    showLocked?: boolean;
    maxVisible?: number;
    size?: 'sm' | 'md' | 'lg';
    layout?: 'inline' | 'grid';
}

/**
 * Seção de Conquistas Desbloqueadas — estilo Solo Leveling.
 * Exibe badges clicáveis com modal de detalhe.
 */
export default function SoloLevelingAchievements({
    achievements,
    showLocked = false,
    maxVisible = 10,
    size = 'md',
    layout = 'inline',
}: SoloLevelingAchievementsProps) {
    const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
    const [showAll, setShowAll] = useState(false);

    const unlocked = achievements.filter(a => a.unlocked);
    const locked = achievements.filter(a => !a.unlocked);
    const displayList = showLocked ? [...unlocked, ...locked] : unlocked;
    const visibleList = showAll ? displayList : displayList.slice(0, maxVisible);
    const hasMore = displayList.length > maxVisible && !showAll;

    const totalXP = unlocked.reduce((acc, a) => acc + a.xp, 0);

    if (unlocked.length === 0 && !showLocked) {
        return (
            <div style={{
                padding: '1rem',
                borderRadius: 12,
                background: 'linear-gradient(145deg, #FFFDF5, #FFFDE7)',
                border: '1.5px dashed rgba(255,214,0,0.4)',
                textAlign: 'center',
            }}>
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>🏆</span>
                <span style={{
                    fontFamily: 'Orbitron, sans-serif',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    color: '#B89B00',
                    letterSpacing: '0.1em',
                }}>
                    NENHUMA CONQUISTA AINDA
                </span>
                <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                    Continue sua jornada para desbloquear conquistas!
                </p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.65rem',
            }}>
                <div style={{
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                }}>
                    🏆 Conquistas Desbloqueadas
                </div>
                {totalXP > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: 100,
                        background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)',
                        border: '1px solid rgba(16,185,129,0.25)',
                    }}>
                        <span style={{ fontSize: '0.6rem' }}>⚡</span>
                        <span style={{
                            fontFamily: 'Orbitron, sans-serif',
                            fontWeight: 800,
                            fontSize: '0.6rem',
                            color: '#059669',
                        }}>
                            {totalXP} XP
                        </span>
                    </div>
                )}
            </div>

            {/* Badges */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: layout === 'grid' ? '0.5rem' : '0.4rem',
                ...(layout === 'grid' ? {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                } : {}),
            }}>
                {visibleList.map((achievement, idx) => (
                    <div key={achievement.id} className="animate-scale-in" style={{ animationDelay: `${idx * 50}ms` }}>
                        <AchievementBadge
                            achievement={achievement}
                            size={size}
                            onClick={() => setSelectedAchievement(achievement)}
                        />
                    </div>
                ))}

                {hasMore && (
                    <button
                        onClick={() => setShowAll(true)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.35rem 0.75rem',
                            borderRadius: 100,
                            background: '#F9FAFB',
                            border: '1px solid #E5E7EB',
                            cursor: 'pointer',
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            color: '#6B7280',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = '#FFD600';
                            e.currentTarget.style.background = '#FFFDF5';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = '#E5E7EB';
                            e.currentTarget.style.background = '#F9FAFB';
                        }}
                    >
                        +{displayList.length - maxVisible} mais
                    </button>
                )}
            </div>

            {/* Modal */}
            {selectedAchievement && (
                <AchievementDetailModal
                    achievement={selectedAchievement}
                    onClose={() => setSelectedAchievement(null)}
                />
            )}
        </div>
    );
}
