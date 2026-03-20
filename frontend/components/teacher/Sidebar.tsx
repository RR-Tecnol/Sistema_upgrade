'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    HomeIcon,
    ClipboardDocumentCheckIcon,
    ClockIcon,
    CurrencyDollarIcon,
    DocumentTextIcon,
    ArrowRightOnRectangleIcon,
    XMarkIcon,
    ExclamationTriangleIcon,
    Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const navItems = [
    { name: 'Dashboard', href: '/teacher/dashboard', icon: HomeIcon },
    { name: 'Frequência', href: '/teacher/frequencia', icon: ClipboardDocumentCheckIcon },
    { name: 'Histórico', href: '/teacher/historico', icon: ClockIcon },
    { name: 'Reembolsos', href: '/teacher/reembolsos', icon: CurrencyDollarIcon },
    { name: 'Certificados', href: '/teacher/certificados', icon: DocumentTextIcon },
    { name: 'Imprevistos', href: '/teacher/imprevistos', icon: ExclamationTriangleIcon },
    { name: 'Configurações', href: '/teacher/configuracoes', icon: Cog6ToothIcon },
];

interface Props {
    open?: boolean;
    onClose?: () => void;
}

export default function TeacherSidebar({ open = true, onClose }: Props) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [time, setTime] = useState('');

    useEffect(() => {
        const u = localStorage.getItem('user');
        if (u) setUser(JSON.parse(u));
        const tick = () => setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        tick();
        const t = setInterval(tick, 1000);
        return () => clearInterval(t);
    }, []);

    const initials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
        : 'PR';

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    return (
        <>
            {/* Overlay mobile */}
            <div
                className="sidebar-overlay"
                style={{ display: open ? 'block' : 'none' }}
                onClick={onClose}
            />

            <aside className={`sidebar ${open ? 'open' : ''}`}>
                {/* Header amarelo */}
                <div className="sidebar-header">
                    <div style={{ marginBottom: '0.75rem' }}>
                        <img src="/logo-upgrade.png" alt="Upgrade Tecnologia Educacional" style={{ height: 44, width: 'auto', objectFit: 'contain', display: 'block' }} />
                        <div className="sidebar-subtitle">Portal do Professor</div>
                    </div>

                    {/* Relógio */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.4rem 0.75rem', borderRadius: 8,
                        background: 'rgba(0,0,0,0.1)',
                        fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace',
                        color: 'rgba(0,0,0,0.7)',
                    }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#15803D', display: 'inline-block' }} />
                        {time || '00:00:00'} — ONLINE
                    </div>
                </div>

                {/* Botão fechar mobile */}
                <button
                    onClick={onClose}
                    className="hamburger-btn"
                    style={{ position: 'absolute', top: '1rem', right: '0.75rem' }}
                    aria-label="Fechar menu"
                >
                    <XMarkIcon style={{ width: 16, height: 16 }} />
                </button>

                {/* Nav */}
                <nav className="sidebar-nav custom-scrollbar">
                    <div className="sidebar-section-label">Navegação</div>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                        const Icon = item.icon;
                        return (
                            <Link key={item.name} href={item.href} style={{ textDecoration: 'none' }} onClick={onClose}>
                                <div className={`sidebar-link ${isActive ? 'active' : ''}`}>
                                    <Icon style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                                    <span>{item.name}</span>
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="sidebar-footer">
                    <div className="sidebar-user" style={{ marginBottom: '0.5rem' }}>
                        <div className="sidebar-avatar">{initials}</div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="sidebar-user-name">{user?.name || 'Professor'}</div>
                            <div className="sidebar-user-role">PROFESSOR</div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="sidebar-link"
                        style={{ width: '100%', color: '#DC2626', border: 'none', background: 'transparent', cursor: 'pointer' }}
                    >
                        <ArrowRightOnRectangleIcon style={{ width: '1rem', height: '1rem' }} />
                        <span>Sair do Sistema</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
