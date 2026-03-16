'use client';

import { BellIcon, MagnifyingGlassIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useEffect, useState, useRef } from 'react';

interface HeaderProps {
    onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
    const [user, setUser] = useState<any>(null);
    const [currentDate, setCurrentDate] = useState('');
    const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);

    const notificationsRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setUser(JSON.parse(userData));

        const now = new Date();
        setCurrentDate(now.toLocaleDateString('pt-BR', {
            weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
        }));

        // Escutar evento de atualização de usuário (disparado por configurações/perfil)
        const handleUserUpdated = () => {
            const updated = localStorage.getItem('user');
            if (updated) setUser(JSON.parse(updated));
        };
        window.addEventListener('userUpdated', handleUserUpdated);

        // Click outside handler for notifications and user menu
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setShowNotificationsPanel(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('userUpdated', handleUserUpdated);
        };
    }, []);

    const initials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
        : 'AD';

    const handleLogout = () => {
        localStorage.removeItem('user');
        setUser(null);
        setShowUserMenu(false);
    };

    return (
        <header className="admin-topbar">
            {/* Botão Hamburger — visível apenas em mobile */}
            <button className="hamburger-btn" onClick={onMenuToggle} aria-label="Abrir menu">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect y="2" width="18" height="2" rx="1" fill="#374151"/>
                    <rect y="8" width="18" height="2" rx="1" fill="#374151"/>
                    <rect y="14" width="18" height="2" rx="1" fill="#374151"/>
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
                    <button
                        onClick={() => setShowNotificationsPanel(!showNotificationsPanel)}
                        style={{
                            position: 'relative', padding: '0.45rem', borderRadius: 8,
                            background: '#F9FAFB', border: '1px solid #E5E7EB',
                            cursor: 'pointer', display: 'flex', transition: 'all 0.2s',
                        }}>
                        <BellIcon style={{ width: 16, height: 16, color: '#6B7280' }} />
                        <span style={{ position: 'absolute', top: '0.35rem', right: '0.35rem', width: 6, height: 6, borderRadius: '50%', background: '#FFD600', boxShadow: '0 0 0 2px #fff' }} />
                    </button>

                    {showNotificationsPanel && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                            width: 300, background: '#fff', borderRadius: 8,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100,
                            border: '1px solid #E5E7EB',
                        }}>
                            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', fontWeight: 600, fontSize: '0.875rem' }}>
                                Notificações
                            </div>
                            <div style={{ padding: '1rem', fontSize: '0.8rem', color: '#6B7280' }}>
                                Nenhuma notificação nova.
                            </div>
                            {/* Example notification item */}
                            {/* <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB' }}>
                                <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>Novo aluno matriculado!</p>
                                <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>João Silva se matriculou no curso de React.</p>
                            </div> */}
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />

                {/* User */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', position: 'relative' }} ref={userMenuRef}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>{user?.name || 'Administrador'}</div>
                        <div style={{ fontSize: '0.62rem', color: '#B89B00', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{user?.role || 'ADMIN'}</div>
                    </div>
                    <div
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        style={{
                            width: 34, height: 34, borderRadius: 9,
                            background: '#FFD600', color: '#000',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.65rem',
                            boxShadow: '0 2px 8px rgba(255,214,0,0.35)',
                            cursor: 'pointer', transition: 'transform 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
                    >
                        {initials}
                    </div>

                    {showUserMenu && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                            width: 180, background: '#fff', borderRadius: 8,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100,
                            border: '1px solid #E5E7EB',
                            overflow: 'hidden',
                        }}>
                            <a href="/settings" style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#374151',
                                textDecoration: 'none', transition: 'background-color 0.2s',
                            }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <Cog6ToothIcon style={{ width: 16, height: 16 }} />
                                Configurações
                            </a>
                            <button
                                onClick={handleLogout}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    width: '100%', textAlign: 'left',
                                    padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#EF4444',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    transition: 'background-color 0.2s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <ArrowRightOnRectangleIcon style={{ width: 16, height: 16 }} />
                                Sair
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
