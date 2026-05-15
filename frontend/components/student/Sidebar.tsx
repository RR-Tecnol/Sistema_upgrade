'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    HomeIcon,
    CalendarDaysIcon,
    AcademicCapIcon,
    TrophyIcon,
    DocumentTextIcon,
    Cog6ToothIcon,
    ArrowLeftOnRectangleIcon,
    BellIcon,
    UserCircleIcon,
    ExclamationTriangleIcon,
    SparklesIcon,
    ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/stores/useAuthStore';
import { loadRankCache, RANKS, getRankConfig } from '@/lib/gamification';

interface SidebarProps {
    open: boolean;
    onClose: () => void;
}

const NAV_ITEMS = [
    { href: '/student/dashboard',      icon: HomeIcon,              label: 'Dashboard' },
    { href: '/student/hunter-profile', icon: SparklesIcon,          label: 'Perfil do Aluno', badge: 'NEW' },
    { href: '/student/attendance',     icon: CalendarDaysIcon,      label: 'Frequência' },
    { href: '/student/classes',        icon: AcademicCapIcon,       label: 'Minhas Turmas' },
    { href: '/student/enrollments',    icon: DocumentTextIcon,      label: 'Inscrições' },
    { href: '/student/certificates',   icon: TrophyIcon,            label: 'Certificados' },
    { href: '/student/imprevistos',    icon: ExclamationTriangleIcon, label: 'Imprevistos' },
    { href: '/student/feedback',       icon: ChatBubbleLeftRightIcon, label: 'Feedback', badge: 'PIX' },
    { href: '/student/notifications',  icon: BellIcon,              label: 'Notificações' },
    { href: '/student/profile',        icon: UserCircleIcon,        label: 'Meu Perfil' },
    { href: '/student/configuracoes',  icon: Cog6ToothIcon,         label: 'Configurações' },
];

export default function StudentSidebar({ open, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const [rankInfo, setRankInfo] = useState<{ rank: string; label: string; color: string; xp: number } | null>(null);

    useEffect(() => {
        const cached = loadRankCache();
        if (cached) setRankInfo(cached);
    }, []);

    const initials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
        : 'AL';

    const handleLogout = () => {
        logout();
        sessionStorage.clear();
        window.location.href = '/login';
    };

    const rankColor = rankInfo?.color ?? '#FFD600';

    return (
        <>
            {/* Overlay mobile */}
            {open && (
                <div
                    onClick={onClose}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(2px)', zIndex: 998,
                    }}
                    className="lg-hide"
                />
            )}

            {/* Sidebar */}
            <aside
                className={`student-sidebar ${open ? 'open' : ''}`}
                style={{
                    position: 'fixed', top: 0, left: 0, bottom: 0,
                    width: 260, background: '#FFFFFF',
                    borderRight: '1px solid #E5E7EB',
                    display: 'flex', flexDirection: 'column',
                    zIndex: 999, transform: open ? 'translateX(0)' : 'translateX(-100%)',
                    transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
                    boxShadow: open ? '4px 0 24px rgba(0,0,0,0.08)' : 'none',
                }}
            >
                {/* Header com avatar e rank */}
                <div style={{
                    padding: '1.5rem 1.25rem', borderBottom: '1px solid #F3F4F6',
                    background: 'linear-gradient(135deg, #FFFDE7 0%, #FFFFFF 100%)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        {/* Avatar com rank */}
                        <div style={{
                            width: 48, height: 48, borderRadius: 14,
                            background: rankColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1rem',
                            color: rankInfo?.rank === 'S' ? '#000' : '#000',
                            boxShadow: `0 4px 12px ${rankColor}40`,
                            border: `2px solid ${rankColor}`,
                            flexShrink: 0,
                        }}>
                            {rankInfo ? rankInfo.rank : initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontWeight: 700, fontSize: '0.88rem', color: '#111827',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                                {user?.name?.split(' ')[0] || 'Aluno'}
                            </div>
                            {rankInfo ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                                    <span style={{
                                        fontFamily: 'Orbitron', fontWeight: 800, fontSize: '0.55rem',
                                        color: rankColor, letterSpacing: '0.06em',
                                    }}>
                                        {rankInfo.rank}-RANK · {rankInfo.label}
                                    </span>
                                </div>
                            ) : (
                                <div style={{ fontSize: '0.62rem', color: '#B89B00', fontWeight: 700 }}>ALUNO</div>
                            )}
                            {rankInfo && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                                    <div style={{ width: 60, height: 4, borderRadius: 2, background: '#E5E7EB', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%', borderRadius: 2,
                                            width: `${Math.min(100, (rankInfo.xp % 100))}%`,
                                            background: rankColor,
                                            transition: 'width 0.8s ease',
                                        }} />
                                    </div>
                                    <span style={{ fontSize: '0.52rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono' }}>
                                        {rankInfo.xp}xp
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1, padding: '0.75rem 0.75rem', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {NAV_ITEMS.map(item => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onClose}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        padding: '0.7rem 0.9rem', borderRadius: 10,
                                        background: isActive ? 'linear-gradient(135deg, #FFD600 0%, #F59E0B 100%)' : 'transparent',
                                        color: isActive ? '#0F172A' : '#6B7280',
                                        textDecoration: 'none', fontWeight: isActive ? 700 : 500,
                                        fontSize: '0.82rem', transition: 'all 0.18s',
                                        boxShadow: isActive ? '0 2px 8px rgba(255,214,0,0.3)' : 'none',
                                        border: isActive ? 'none' : '1px solid transparent',
                                        position: 'relative',
                                    }}
                                    onMouseEnter={e => {
                                        if (!isActive) {
                                            (e.currentTarget as HTMLElement).style.background = 'rgba(255,214,0,0.08)';
                                            (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,214,0,0.2)';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (!isActive) {
                                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                                            (e.currentTarget as HTMLElement).style.border = '1px solid transparent';
                                        }
                                    }}
                                >
                                    <Icon style={{ width: 18, height: 18, flexShrink: 0 }} />
                                    <span>{item.label}</span>
                                    {item.badge && (
                                        <span style={{
                                            marginLeft: 'auto', padding: '0.1rem 0.45rem', borderRadius: 100,
                                            background: isActive ? 'rgba(0,0,0,0.15)' : '#FFD600',
                                            color: isActive ? '#0F172A' : '#0F172A',
                                            fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.06em',
                                        }}>
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* Footer — Logout */}
                <div style={{ padding: '0.75rem', borderTop: '1px solid #F3F4F6' }}>
                    <button
                        onClick={handleLogout}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.7rem 0.9rem', borderRadius: 10,
                            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                            color: '#DC2626', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                            transition: 'all 0.18s',
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)';
                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)';
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.06)';
                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.15)';
                        }}
                    >
                        <ArrowLeftOnRectangleIcon style={{ width: 18, height: 18 }} />
                        Sair
                    </button>
                </div>
            </aside>

            <style>{`
                @media (min-width: 769px) {
                    .student-sidebar { transform: translateX(0) !important; }
                    .lg-hide { display: none !important; }
                }
            `}</style>
        </>
    );
}
