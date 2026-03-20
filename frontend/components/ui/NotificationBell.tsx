'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api/client';
import { BellIcon } from '@heroicons/react/24/outline';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    link?: string;
    createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
    ENROLLMENT_RECEIVED:  '📋',
    ENROLLMENT_APPROVED:  '✅',
    ENROLLMENT_REJECTED:  '❌',
    CERTIFICATE_AVAILABLE:'🏆',
    ABSENCE_REGISTERED:   '⚠️',
    EXCESSIVE_ABSENCES:   '🚨',
    CLASS_REMINDER:       '📅',
    CLASS_CANCELLED:      '🚫',
    GENERAL_ANNOUNCEMENT: '📢',
};

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<Notification[]>([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Fechar ao clicar fora
    useEffect(() => {
        function handleOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    // Polling simples a cada 30 seg para manter contagem atualizada
    useEffect(() => {
        loadCount();
        const interval = setInterval(loadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    // Carregar lista ao abrir dropdown
    useEffect(() => {
        if (open) loadNotifications();
    }, [open]);

    async function loadCount() {
        try {
            const res = await api.get('/notifications?limit=1');
            setUnread(res.data?.meta?.unreadCount ?? 0);
        } catch { /* silencioso */ }
    }

    async function loadNotifications() {
        setLoading(true);
        try {
            const res = await api.get('/notifications?limit=15');
            setItems(res.data?.data ?? []);
            setUnread(res.data?.meta?.unreadCount ?? 0);
        } catch { /* silencioso */ } finally {
            setLoading(false);
        }
    }

    async function markRead(id: string) {
        await api.patch(`/notifications/${id}/read`).catch(() => {});
        setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnread(u => Math.max(0, u - 1));
    }

    async function markAllRead() {
        await api.patch('/notifications/read-all').catch(() => {});
        setItems(prev => prev.map(n => ({ ...n, read: true })));
        setUnread(0);
    }

    function handleClick(n: Notification) {
        if (!n.read) markRead(n.id);
        if (n.link) {
            setOpen(false);
            router.push(n.link);
        }
    }

    function timeAgo(dateStr: string) {
        const diff = Date.now() - new Date(dateStr).getTime();
        const min = Math.floor(diff / 60000);
        if (min < 1) return 'agora';
        if (min < 60) return `${min}min`;
        const hrs = Math.floor(min / 60);
        if (hrs < 24) return `${hrs}h`;
        return `${Math.floor(hrs / 24)}d`;
    }

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            {/* Bell Button */}
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, borderRadius: 10,
                    background: open ? 'rgba(255,214,0,0.12)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${open ? 'rgba(255,214,0,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    cursor: 'pointer', transition: 'all 0.2s',
                }}
                aria-label="Notificações"
            >
                <BellIcon style={{ width: 18, height: 18, color: open ? '#FFD600' : '#94A3B8' }} />
                {unread > 0 && (
                    <span style={{
                        position: 'absolute', top: -4, right: -4,
                        width: unread > 9 ? 22 : 18, height: 18,
                        borderRadius: 100, fontSize: '0.6rem', fontWeight: 900,
                        background: '#EF4444', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid #fff', animation: 'bellPulse 2s ease-in-out infinite',
                    }}>
                        {unread > 99 ? '99+' : unread}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 8,
                    width: 340, maxWidth: '90vw',
                    background: '#FFFFFF', borderRadius: 16,
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
                    zIndex: 9000, overflow: 'hidden',
                    animation: 'dropIn 0.2s cubic-bezier(0.22,1,0.36,1)',
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.875rem 1rem',
                        borderBottom: '1px solid #F3F4F6',
                        background: 'linear-gradient(135deg, #FFFDE7 0%, #FFFFFF 100%)',
                    }}>
                        <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.72rem', letterSpacing: '0.12em', color: '#111827' }}>
                            🔔 NOTIFICAÇÕES
                            {unread > 0 && (
                                <span style={{ marginLeft: 8, fontSize: '0.65rem', color: '#D97706', fontFamily: 'Inter, sans-serif' }}>
                                    ({unread} não lida{unread !== 1 ? 's' : ''})
                                </span>
                            )}
                        </div>
                        {unread > 0 && (
                            <button onClick={markAllRead} style={{
                                fontSize: '0.65rem', color: '#6B7280', background: 'rgba(0,0,0,0.04)',
                                border: '1px solid #E5E7EB',
                                cursor: 'pointer', fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                                transition: 'all 0.2s',
                            }}>
                                Marcar todas lidas
                            </button>
                        )}
                    </div>

                    {/* Lista */}
                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                        {loading ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.8rem' }}>
                                Carregando...
                            </div>
                        ) : items.length === 0 ? (
                            <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔔</div>
                                <p style={{ fontSize: '0.8rem', color: '#9CA3AF', fontWeight: 600 }}>Nenhuma notificação</p>
                                <p style={{ fontSize: '0.72rem', color: '#D1D5DB', marginTop: '0.25rem' }}>Você está em dia!</p>
                            </div>
                        ) : (
                            items.map(n => (
                                <button
                                    key={n.id}
                                    onClick={() => handleClick(n)}
                                    style={{
                                        width: '100%', textAlign: 'left', padding: '0.85rem 1rem',
                                        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                                        background: n.read ? '#FFFFFF' : 'rgba(255,214,0,0.06)',
                                        border: 'none',
                                        borderBottom: '1px solid #F3F4F6',
                                        borderLeft: n.read ? '3px solid transparent' : '3px solid #FFD600',
                                        cursor: 'pointer', transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                                    onMouseLeave={e => (e.currentTarget.style.background = n.read ? '#FFFFFF' : 'rgba(255,214,0,0.06)')}
                                >
                                    <span style={{ fontSize: '1.2rem', flexShrink: 0, marginTop: '0.1rem' }}>
                                        {TYPE_ICON[n.type] ?? '📢'}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '0.78rem', fontWeight: n.read ? 500 : 700,
                                            color: n.read ? '#6B7280' : '#111827',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>
                                            {n.title}
                                        </div>
                                        <div style={{
                                            fontSize: '0.7rem', color: '#9CA3AF', marginTop: '0.15rem',
                                            overflow: 'hidden', textOverflow: 'ellipsis',
                                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                        }}>
                                            {n.message}
                                        </div>
                                        <div style={{ fontSize: '0.62rem', color: '#D1D5DB', marginTop: '0.25rem', fontFamily: 'JetBrains Mono' }}>
                                            {timeAgo(n.createdAt)}
                                        </div>
                                    </div>
                                    {!n.read && (
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFD600', flexShrink: 0, marginTop: 4, boxShadow: '0 0 6px rgba(255,214,0,0.6)' }} />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes bellPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
                @keyframes dropIn { from { opacity:0; transform:translateY(-8px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
            `}</style>
        </div>
    );
}
