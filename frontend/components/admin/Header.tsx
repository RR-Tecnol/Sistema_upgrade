import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useEffect, useState, useRef } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuthStore } from '@/stores/useAuthStore';

interface HeaderProps {
    onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
    // useAuthStore é reativo — atualiza automaticamente quando nome muda nas configurações
    const { user } = useAuthStore();
    const [currentDate, setCurrentDate] = useState('');
    const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
    const { notifications, unreadCount, connected, markAllRead } = useNotifications();

    const notificationsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const now = new Date();
        setCurrentDate(now.toLocaleDateString('pt-BR', {
            weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
        }));

        const handleClickOutside = (event: MouseEvent) => {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setShowNotificationsPanel(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const initials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
        : 'AD';

    return (
        <header className="admin-topbar">
            {/* Botão Hamburger — visível apenas em mobile */}
            <button className="hamburger-btn" onClick={onMenuToggle} aria-label="Abrir menu">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect y="2" width="18" height="2" rx="1" fill="#374151" />
                    <rect y="8" width="18" height="2" rx="1" fill="#374151" />
                    <rect y="14" width="18" height="2" rx="1" fill="#374151" />
                </svg>
            </button>

            {/* Search */}
            <div style={{ flex: 1, maxWidth: 420 }}>
                <div style={{ position: 'relative' }}>
                    <MagnifyingGlassIcon style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#9CA3AF' }} />
                    <input
                        type="text"
                        placeholder="Buscar alunos, cursos, turmas..."
                        className="form-input"
                        style={{ paddingLeft: '2.25rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', fontSize: '0.82rem', background: '#F9FAFB', borderColor: '#E5E7EB' }}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
                {/* Date */}
                <div style={{ fontSize: '0.72rem', color: '#9CA3AF', display: 'none' }} className="md:block">
                    {currentDate}
                </div>

                {/* Notifications */}
                <div style={{ position: 'relative' }} ref={notificationsRef}>
                    {/* Indicador WS */}
                    {connected && (
                        <span style={{
                            position: 'absolute', top: -3, left: -3, width: 7, height: 7,
                            borderRadius: '50%', background: '#10B981',
                            border: '1.5px solid #fff', zIndex: 1,
                        }} title="WebSocket conectado" />
                    )}
                    <button
                        onClick={() => { setShowNotificationsPanel(!showNotificationsPanel); if (!showNotificationsPanel) markAllRead(); }}
                        style={{
                            position: 'relative', padding: '0.45rem', borderRadius: 8,
                            background: unreadCount > 0 ? '#FEF2F2' : '#F9FAFB',
                            border: `1px solid ${unreadCount > 0 ? '#FECACA' : '#E5E7EB'}`,
                            cursor: 'pointer', display: 'flex', transition: 'all 0.2s',
                        }}>
                        <BellIcon style={{ width: 18, height: 18, color: unreadCount > 0 ? '#EF4444' : '#6B7280' }} />
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute', top: '-4px', right: '-4px',
                                minWidth: 16, height: 16, borderRadius: '50%',
                                background: '#EF4444',
                                color: '#fff', fontSize: '0.55rem', fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '2px solid #fff',
                            }}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotificationsPanel && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                            width: 340, background: '#fff', borderRadius: 12,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 200,
                            border: '1px solid #E5E7EB', overflow: 'hidden',
                        }}>
                            {/* Header painel */}
                            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFDE7' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#111827' }}>Notificações</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {connected && <span style={{ fontSize: '0.62rem', color: '#10B981', fontWeight: 700 }}>● AO VIVO</span>}
                                    {notifications.length > 0 && (
                                        <button onClick={markAllRead} style={{ fontSize: '0.68rem', color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Marcar como lidas</button>
                                    )}
                                </div>
                            </div>

                            {/* Lista */}
                            <div className="custom-scrollbar" style={{ maxHeight: 360, overflowY: 'auto' }}>
                                {notifications.length === 0 ? (
                                    <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.82rem' }}>
                                        Nenhuma notificação
                                    </div>
                                ) : notifications.map(n => {
                                    const icons: Record<string, string> = {
                                        nova_inscricao: '👤',
                                        inscricao_aprovada: '✅',
                                        frequencia_registrada: '✓',
                                        custo_excessivo: '⚠️',
                                    };
                                    return (
                                        <div key={n.id} style={{
                                            padding: '0.7rem 1rem',
                                            borderBottom: '1px solid #F9FAFB',
                                            background: n.read ? '#fff' : '#FFFDE7',
                                            display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
                                            transition: 'background 0.15s',
                                        }}>
                                            <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>{icons[n.type] || '🔔'}</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontSize: '0.78rem', color: '#111827', fontWeight: n.read ? 400 : 600, marginBottom: '0.15rem', lineHeight: 1.3 }}>{n.message}</p>
                                                <p style={{ fontSize: '0.65rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono, monospace' }}>
                                                    {new Date(n.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', flexShrink: 0, marginTop: 4 }} />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />

                {/* User — apenas exibição, sem dropdown (navegação via sidebar) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>{user?.name || 'Administrador'}</div>
                        <div style={{ fontSize: '0.62rem', color: '#B89B00', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{user?.role || 'ADMIN'}</div>
                    </div>
                    <div
                        style={{
                            width: 34, height: 34, borderRadius: 9,
                            background: '#FFD600', color: '#000',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.65rem',
                            boxShadow: '0 2px 8px rgba(255,214,0,0.35)',
                        }}
                    >
                        {initials}
                    </div>
                </div>
            </div>
        </header>
    );
}
