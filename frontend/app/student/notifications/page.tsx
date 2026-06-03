'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api/client';
import {
    BellIcon,
    CheckCircleIcon,
    TrashIcon,
    FunnelIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { getNotifXP } from '@/lib/gamification';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    link?: string;
    data?: { link?: string } | null;
    createdAt: string;
}

const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string; bg: string }> = {
    ENROLLMENT_RECEIVED:   { icon: '📋', label: 'Inscrição',    color: '#0891B2', bg: '#E0F2FE' },
    ENROLLMENT_APPROVED:   { icon: '✅', label: 'Aprovada',     color: '#059669', bg: '#DCFCE7' },
    ENROLLMENT_REJECTED:   { icon: '❌', label: 'Rejeitada',    color: '#DC2626', bg: '#FEF2F2' },
    CERTIFICATE_AVAILABLE: { icon: '🏆', label: 'Certificado',  color: '#7C3AED', bg: '#F5F3FF' },
    ABSENCE_REGISTERED:    { icon: '⚠️', label: 'Falta',        color: '#F59E0B', bg: '#FFFBEB' },
    EXCESSIVE_ABSENCES:    { icon: '🚨', label: 'Alerta',       color: '#DC2626', bg: '#FEF2F2' },
    CLASS_REMINDER:        { icon: '📅', label: 'Lembrete',     color: '#0891B2', bg: '#E0F2FE' },
    CLASS_CANCELLED:       { icon: '🚫', label: 'Cancelamento', color: '#DC2626', bg: '#FEF2F2' },
    GENERAL_ANNOUNCEMENT:  { icon: '📢', label: 'Aviso',        color: '#6B7280', bg: '#F3F4F6' },
};

const FILTERS = [
    { id: 'all', label: 'Todas' },
    { id: 'unread', label: 'Não lidas' },
    { id: 'CERTIFICATE_AVAILABLE', label: '🏆 Certificados' },
    { id: 'ENROLLMENT_APPROVED', label: '✅ Aprovações' },
    { id: 'ABSENCE_REGISTERED', label: '⚠️ Faltas' },
    { id: 'EXCESSIVE_ABSENCES', label: '🚨 Frequência' },
    { id: 'GENERAL_ANNOUNCEMENT', label: '📢 Avisos' },
];

export default function StudentNotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [unreadCount, setUnreadCount] = useState(0);
    const LIMIT = 15;

    useEffect(() => { fetchNotifications(); }, [page, filter]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            let url = `/notifications?limit=${LIMIT}&page=${page}`;
            if (filter === 'unread') url += '&read=false';
            else if (filter !== 'all') url += `&type=${filter}`;

            const res = await api.get(url);
            const data = res.data?.data ?? res.data ?? [];
            const list = Array.isArray(data) ? data : [];
            setNotifications(list.map((n: Notification) => ({
                ...n,
                link: n.link || (n.data && typeof n.data === 'object' ? (n.data as { link?: string }).link : undefined),
            })));
            setUnreadCount(res.data?.meta?.unreadCount ?? 0);
            setTotalPages(res.data?.meta?.totalPages ?? 1);
        } catch {
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    const markRead = async (id: string) => {
        await api.patch(`/notifications/${id}/read`).catch(() => {});
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(c => Math.max(0, c - 1));
    };

    const markAllRead = async () => {
        await api.patch('/notifications/read-all').catch(() => {});
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    const deleteNotif = async (id: string) => {
        await api.delete(`/notifications/${id}`).catch(() => {});
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleClick = (n: Notification) => {
        if (!n.read) markRead(n.id);
        const href = n.link || (n.data && typeof n.data === 'object' ? (n.data as { link?: string }).link : undefined);
        if (href) router.push(href);
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const min = Math.floor(diff / 60000);
        if (min < 1) return 'agora';
        if (min < 60) return `${min} min atrás`;
        const hrs = Math.floor(min / 60);
        if (hrs < 24) return `${hrs}h atrás`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days} dia${days > 1 ? 's' : ''} atrás`;
        return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    const filtered = notifications;
    const stats = {
        total: notifications.length,
        unread: unreadCount,
        certs: notifications.filter(n => n.type === 'CERTIFICATE_AVAILABLE').length,
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
        <style>{`
            .notif-kpi { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; }
            @media (max-width: 640px) { .notif-kpi { grid-template-columns: repeat(2, 1fr); } }
        `}</style>
            <AdminHeaderHero
                title="NOTIFICAÇÕES"
                subtitle="Acompanhe alertas, aprovações e conquistas"
                badge="PORTAL DO ALUNO"
                rightSlot={unreadCount > 0 ? (
                    <button onClick={markAllRead} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircleIcon style={{ width: 16, height: 16 }} />
                        Marcar todas como lidas
                    </button>
                ) : undefined}
            />

            <div className="notif-kpi">
                <AnimatedKpiCard label="Total" value={stats.total} color="#6B7280" bg="#F3F4F6" border="#E5E7EB" compact />
                <AnimatedKpiCard label="Não Lidas" value={stats.unread} color="#B89B00" bg="#FFFDE7" border="#FEF08A" compact />
                <AnimatedKpiCard label="Certificados" value={stats.certs} color="#7C3AED" bg="#F5F3FF" border="#DDD6FE" compact />
            </div>

            {/* Filters */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
                padding: '0.5rem', background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB',
            }}>
                <FunnelIcon style={{ width: 16, height: 16, color: '#9CA3AF', marginLeft: '0.5rem' }} />
                {FILTERS.map(f => (
                    <button
                        key={f.id}
                        onClick={() => { setFilter(f.id); setPage(1); }}
                        style={{
                            padding: '0.4rem 0.85rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: filter === f.id ? '#FFD600' : 'transparent',
                            color: filter === f.id ? '#0F172A' : '#6B7280',
                            fontWeight: filter === f.id ? 700 : 500, fontSize: '0.78rem',
                            transition: 'all 0.15s',
                        }}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Notifications List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: '#9CA3AF' }}>CARREGANDO...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{
                    background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB',
                    padding: '5rem 2rem', textAlign: 'center',
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔔</div>
                    <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.15em', color: '#9CA3AF', marginBottom: '0.5rem' }}>
                        NENHUMA NOTIFICAÇÃO
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>
                        {filter === 'unread' ? 'Você está em dia! Nenhuma notificação não lida.' : 'Nenhuma notificação encontrada com este filtro.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filtered.map((n, i) => {
                        const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.GENERAL_ANNOUNCEMENT;
                        const xp = getNotifXP(n.title);
                        return (
                            <div
                                key={n.id}
                                className="animate-scale-in"
                                style={{
                                    animationDelay: `${i * 40}ms`,
                                    background: n.read ? '#FFFFFF' : 'linear-gradient(135deg, #FFFDF5 0%, #FFFDE7 100%)',
                                    border: `1px solid ${n.read ? '#E5E7EB' : 'rgba(255,214,0,0.3)'}`,
                                    borderLeft: `4px solid ${n.read ? '#E5E7EB' : '#FFD600'}`,
                                    borderRadius: 14, padding: '1rem 1.25rem',
                                    display: 'flex', alignItems: 'flex-start', gap: '1rem',
                                    cursor: (n.link || (n.data && typeof n.data === 'object' && (n.data as { link?: string }).link)) ? 'pointer' : 'default',
                                    transition: 'all 0.2s',
                                }}
                                onClick={() => handleClick(n)}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; }}
                            >
                                {/* Icon */}
                                <div style={{
                                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                                    background: cfg.bg, border: `1px solid ${cfg.color}30`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.3rem',
                                }}>
                                    {cfg.icon}
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                        <span style={{
                                            padding: '0.15rem 0.5rem', borderRadius: 6,
                                            background: cfg.bg, color: cfg.color,
                                            fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
                                        }}>
                                            {cfg.label}
                                        </span>
                                        {xp && (
                                            <span style={{
                                                padding: '0.1rem 0.45rem', borderRadius: 100,
                                                background: 'rgba(255,214,0,0.15)', border: '1px solid rgba(255,214,0,0.3)',
                                                fontSize: '0.55rem', fontWeight: 800, color: '#B89B00',
                                                fontFamily: 'JetBrains Mono',
                                            }}>
                                                ⚡+{xp}xp
                                            </span>
                                        )}
                                        {!n.read && (
                                            <span style={{
                                                width: 8, height: 8, borderRadius: '50%',
                                                background: '#FFD600', boxShadow: '0 0 6px rgba(255,214,0,0.6)',
                                            }} />
                                        )}
                                    </div>
                                    <h3 style={{
                                        fontWeight: n.read ? 600 : 800, fontSize: '0.92rem',
                                        color: n.read ? '#6B7280' : '#111827', marginBottom: '0.2rem',
                                    }}>
                                        {n.title}
                                    </h3>
                                    <p style={{
                                        fontSize: '0.78rem', color: '#9CA3AF', lineHeight: 1.5,
                                        overflow: 'hidden', display: '-webkit-box',
                                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                    }}>
                                        {n.message}
                                    </p>
                                    <div style={{
                                        fontSize: '0.65rem', color: '#D1D5DB', marginTop: '0.4rem',
                                        fontFamily: 'JetBrains Mono',
                                    }}>
                                        {timeAgo(n.createdAt)}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
                                    {!n.read && (
                                        <button
                                            onClick={e => { e.stopPropagation(); markRead(n.id); }}
                                            style={{
                                                padding: '0.35rem 0.6rem', borderRadius: 6,
                                                background: '#F0FDF4', border: '1px solid #BBF7D0',
                                                color: '#059669', fontSize: '0.65rem', fontWeight: 600,
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem',
                                            }}
                                        >
                                            <CheckCircleIcon style={{ width: 12, height: 12 }} />
                                            Lida
                                        </button>
                                    )}
                                    <button
                                        onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
                                        style={{
                                            padding: '0.35rem 0.6rem', borderRadius: 6,
                                            background: '#FEF2F2', border: '1px solid #FECACA',
                                            color: '#DC2626', fontSize: '0.65rem', fontWeight: 600,
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem',
                                        }}
                                    >
                                        <TrashIcon style={{ width: 12, height: 12 }} />
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    padding: '1rem', background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB',
                }}>
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        style={{
                            padding: '0.45rem 0.75rem', borderRadius: 8,
                            background: page === 1 ? '#F3F4F6' : '#FFD600',
                            border: 'none', cursor: page === 1 ? 'not-allowed' : 'pointer',
                            color: page === 1 ? '#9CA3AF' : '#0F172A',
                            display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, fontSize: '0.78rem',
                        }}
                    >
                        <ChevronLeftIcon style={{ width: 14, height: 14 }} />
                        Anterior
                    </button>
                    <span style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: 600, padding: '0 0.75rem' }}>
                        Página {page} de {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        style={{
                            padding: '0.45rem 0.75rem', borderRadius: 8,
                            background: page === totalPages ? '#F3F4F6' : '#FFD600',
                            border: 'none', cursor: page === totalPages ? 'not-allowed' : 'pointer',
                            color: page === totalPages ? '#9CA3AF' : '#0F172A',
                            display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, fontSize: '0.78rem',
                        }}
                    >
                        Próxima
                        <ChevronRightIcon style={{ width: 14, height: 14 }} />
                    </button>
                </div>
            )}
        </div>
    );
}
