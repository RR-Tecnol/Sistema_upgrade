'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import NotificationBell from '@/components/ui/NotificationBell';
import { useAuthStore } from '@/stores/useAuthStore';
import { RANKS, getRankConfig, saveRankCache, loadRankCache } from '@/lib/gamification';

interface HeaderProps {
    onToggleSidebar?: () => void;
    sidebarOpen?: boolean;
}

export default function StudentHeader({ onToggleSidebar, sidebarOpen = false }: HeaderProps) {
    const { user } = useAuthStore();
    const [rankInfo, setRankInfo] = useState<{ rank: string; label: string; color: string; xp: number } | null>(null);

    const initials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
        : 'AL';

    useEffect(() => {
        // 1. Cache imediato — sem latência
        const cached = loadRankCache();
        if (cached) setRankInfo(cached);

        // 2. Atualizar em background com dados reais
        const token = sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) return;

        fetch('/api/students/me/attendance-summary', {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (!data || typeof data.rate !== 'number') return;
                const r = getRankConfig(data.rate);
                const rIdx = RANKS.indexOf(r);
                const info = {
                    rank: r.rank,
                    label: r.label,
                    color: r.color,
                    xp: (data.presentCount ?? 0) * 10 + rIdx * 20,
                };
                setRankInfo(info);
                saveRankCache(info);
            })
            .catch(() => {});
    }, []);

    const rankColor = rankInfo?.color ?? '#FFD600';

    return (
        <header className="admin-topbar">
            {/* Hamburger button */}
            <button
                onClick={onToggleSidebar}
                className="hamburger-btn"
                style={{
                    border: `1px solid ${sidebarOpen ? 'rgba(255,214,0,0.5)' : 'rgba(0,0,0,0.1)'}`,
                    background: sidebarOpen ? 'rgba(255,214,0,0.1)' : 'transparent',
                }}
                aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
            >
                {sidebarOpen
                    ? <XMarkIcon style={{ width: 16, height: 16, color: '#FFD600' }} />
                    : <Bars3Icon style={{ width: 16, height: 16, color: '#6B7280' }} />
                }
            </button>

            {/* Title */}
            <div style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', fontWeight: 800, color: '#B89B00', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Portal do Aluno
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
                {/* Notifications */}
                <NotificationBell />

                <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />

                {/* ── Mini HUD de Rank (clicável para perfil de caçador) ── */}
                <Link href="/student/hunter-profile" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    {rankInfo ? (
                        /* Com dados de rank */
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', lineHeight: 1.1 }}>
                                {user?.name || 'Aluno'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: 2 }}>
                                <span style={{
                                    fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.58rem',
                                    color: rankColor, letterSpacing: '0.06em',
                                }}>
                                    {rankInfo.rank}-RANK
                                </span>
                                {/* Mini barra de XP */}
                                <div style={{ width: 56, height: 4, borderRadius: 2, background: '#E5E7EB', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', borderRadius: 2,
                                        width: `${Math.min(100, rankInfo.xp % 100)}%`,
                                        background: rankColor,
                                        transition: 'width 0.8s ease',
                                    }} />
                                </div>
                                <span style={{ fontSize: '0.55rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono' }}>
                                    {rankInfo.xp}xp
                                </span>
                            </div>
                        </div>
                    ) : (
                        /* Sem dados: nome + ALUNO */
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>
                                {user?.name || 'Aluno'}
                            </div>
                            <div style={{ fontSize: '0.62rem', color: '#B89B00', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>ALUNO</div>
                        </div>
                    )}

                    {/* Avatar — letra do rank quando disponível, iniciais caso contrário */}
                    <div style={{
                        width: 34, height: 34, borderRadius: 9,
                        background: rankColor,
                        color: rankInfo?.rank === 'S' ? '#000' : '#000',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.65rem',
                        boxShadow: `0 2px 8px ${rankColor}55`,
                        cursor: 'pointer', transition: 'all 0.3s',
                    }}>
                        {rankInfo ? rankInfo.rank : initials}
                    </div>
                </Link>
            </div>
        </header>
    );
}
