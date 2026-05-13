'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellIcon } from '@heroicons/react/24/outline';
import { useNotifications, type Notification as HookNotification } from '@/hooks/useNotifications';

const TYPE_ICON: Record<string, string> = {
    ENROLLMENT_RECEIVED: '📋',
    ENROLLMENT_APPROVED: '✅',
    ENROLLMENT_REJECTED: '❌',
    CERTIFICATE_AVAILABLE: '🏆',
    ABSENCE_REGISTERED: '⚠️',
    EXCESSIVE_ABSENCES: '🚨',
    CLASS_REMINDER: '📅',
    CLASS_CANCELLED: '🚫',
    GENERAL_ANNOUNCEMENT: '📢',
    nova_inscricao: '📋',
    inscricao_aprovada: '✅',
    inscricao_rejeitada: '❌',
    frequencia_registrada: '✓',
    imprevisto_cadastrado: '⚠️',
    imprevisto_cadastrado_por_admin: '📌',
    imprevisto_revisado: '✔️',
    reembolso_solicitado: '💰',
    reembolso_revisado: '💵',
    custo_excessivo: '⚠️',
    JUSTIFICATION_APPROVED: '✅',
    JUSTIFICATION_REJECTED: '❌',
    FEEDBACK_INVITATION: '🎁',
    geral: '📢',
};

const XP_BY_TYPE: Record<string, number | null> = {
    CERTIFICATE_AVAILABLE: 100,
    ENROLLMENT_APPROVED: 50,
    ENROLLMENT_RECEIVED: null,
    ENROLLMENT_REJECTED: null,
    ABSENCE_REGISTERED: null,
    EXCESSIVE_ABSENCES: null,
    CLASS_REMINDER: null,
    CLASS_CANCELLED: null,
    GENERAL_ANNOUNCEMENT: null,
};

function getNotifXP(notif: HookNotification): number | null {
    if (notif.type in XP_BY_TYPE) return XP_BY_TYPE[notif.type];
    const t = (notif.title || notif.message || '').toLowerCase();
    if (t.includes('certificado') || t.includes('certificate')) return 100;
    if (t.includes('rank') || t.includes('aprovad')) return 50;
    if (t.includes('frequência') || t.includes('mínimo')) return 10;
    return null;
}

function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'agora';
    if (min < 60) return `${min}min`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
}

/**
 * UX-12: mesma fonte que o admin header — `useNotifications` (REST inicial + Socket.IO).
 */
export default function NotificationBell() {
    const router = useRouter();
    const {
        notifications,
        unreadCount,
        connected,
        markAllRead,
        markOneRead,
        refetch,
    } = useNotifications();

    const [open, setOpen] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const items = notifications.slice(0, 15);

    useEffect(() => {
        function handleOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    useEffect(() => {
        if (!open) return;
        (async () => {
            setSyncing(true);
            await refetch();
            setSyncing(false);
        })();
    }, [open, refetch]);

    async function handleMarkAllRead() {
        await markAllRead();
    }

    async function handleClick(n: HookNotification) {
        if (!n.read) await markOneRead(n.id);
        if (n.link) {
            setOpen(false);
            router.push(n.link);
        }
    }

    const displayTitle = (n: HookNotification) =>
        n.title?.trim() || n.message?.slice(0, 72) || 'Notificação';

    const displaySubtitle = (n: HookNotification) =>
        n.title?.trim() ? n.message : null;

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
                type="button"
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
                {connected && (
                    <span
                        title="Tempo real (WebSocket)"
                        style={{
                            position: 'absolute',
                            top: 2,
                            left: 2,
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: '#10B981',
                            border: '1.5px solid rgba(15,23,42,0.9)',
                            zIndex: 1,
                        }}
                    />
                )}
                <BellIcon style={{ width: 18, height: 18, color: open ? '#FFD600' : '#94A3B8' }} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: -4, right: -4,
                        width: unreadCount > 9 ? 22 : 18, height: 18,
                        borderRadius: 100, fontSize: '0.6rem', fontWeight: 900,
                        background: '#EF4444', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid #fff', animation: 'bellPulse 2s ease-in-out infinite',
                    }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

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
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.875rem 1rem',
                        borderBottom: '1px solid #F3F4F6',
                        background: 'linear-gradient(135deg, #FFFDE7 0%, #FFFFFF 100%)',
                    }}>
                        <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.72rem', letterSpacing: '0.12em', color: '#111827' }}>
                            🔔 NOTIFICAÇÕES
                            {connected && (
                                <span style={{ marginLeft: 8, fontSize: '0.58rem', color: '#059669', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
                                    ● AO VIVO
                                </span>
                            )}
                            {unreadCount > 0 && (
                                <span style={{ marginLeft: 8, fontSize: '0.65rem', color: '#D97706', fontFamily: 'Inter, sans-serif' }}>
                                    ({unreadCount} não lida{unreadCount !== 1 ? 's' : ''})
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={() => void handleMarkAllRead()}
                                style={{
                                    fontSize: '0.65rem', color: '#6B7280', background: 'rgba(0,0,0,0.04)',
                                    border: '1px solid #E5E7EB',
                                    cursor: 'pointer', fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                                    transition: 'all 0.2s',
                                }}
                            >
                                Marcar todas lidas
                            </button>
                        )}
                    </div>

                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                        {syncing ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.8rem' }}>
                                A sincronizar...
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
                                    type="button"
                                    onClick={() => void handleClick(n)}
                                    style={{
                                        width: '100%', textAlign: 'left', padding: '0.85rem 1rem',
                                        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                                        background: n.read ? '#FFFFFF' : 'rgba(255,214,0,0.06)',
                                        border: 'none',
                                        borderBottom: '1px solid #F3F4F6',
                                        borderLeft: n.read ? '3px solid transparent' : '3px solid #FFD600',
                                        cursor: 'pointer', transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'; }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLButtonElement).style.background =
                                            n.read ? '#FFFFFF' : 'rgba(255,214,0,0.06)';
                                    }}
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
                                            {displayTitle(n)}
                                            {(() => {
                                                const xp = getNotifXP(n);
                                                if (!xp) return null;
                                                return (
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                                                        marginLeft: '0.4rem', padding: '0.1rem 0.45rem', borderRadius: 100,
                                                        background: 'rgba(255,214,0,0.15)', border: '1px solid rgba(255,214,0,0.3)',
                                                        fontSize: '0.58rem', fontWeight: 800, color: '#B89B00',
                                                        fontFamily: 'JetBrains Mono', verticalAlign: 'middle',
                                                    }}>
                                                        ⚡+{xp}xp
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        {displaySubtitle(n) && (
                                            <div style={{
                                                fontSize: '0.7rem', color: '#9CA3AF', marginTop: '0.15rem',
                                                overflow: 'hidden', textOverflow: 'ellipsis',
                                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                            }}>
                                                {n.message}
                                            </div>
                                        )}
                                        <div style={{ fontSize: '0.62rem', color: '#D1D5DB', marginTop: '0.25rem', fontFamily: 'JetBrains Mono' }}>
                                            {timeAgo(n.timestamp)}
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
