'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    HomeIcon,
    TruckIcon,
    CurrencyDollarIcon,
    WrenchScrewdriverIcon,
    MapPinIcon,
    ArrowRightOnRectangleIcon,
    XMarkIcon,
    ExclamationTriangleIcon,
    Cog6ToothIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const navItems = [
    { name: 'Dashboard',     href: '/driver/dashboard',    icon: HomeIcon },
    { name: 'Frequência',    href: '/driver/frequencia',   icon: ClockIcon },
    { name: 'Minhas Viagens',href: '/driver/viagens',      icon: TruckIcon },
    { name: 'Meu Veículo',   href: '/driver/veiculo',      icon: TruckIcon },
    { name: 'Reembolsos',    href: '/driver/reembolsos',   icon: CurrencyDollarIcon },
    { name: 'Manutenção',    href: '/driver/manutencao',   icon: WrenchScrewdriverIcon },
    { name: 'Minha Rota',    href: '/driver/rota',         icon: MapPinIcon },
    { name: 'Imprevistos',   href: '/driver/imprevistos',  icon: ExclamationTriangleIcon },
    { name: 'Configurações', href: '/driver/configuracoes',icon: Cog6ToothIcon },
];

interface Props {
    open?: boolean;
    onClose?: () => void;
}

export default function DriverSidebar({ open = true, onClose }: Props) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [time, setTime] = useState('');

    useEffect(() => {
        const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (raw) { try { setUser(JSON.parse(raw)); } catch {} }
        const tick = () => setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        tick();
        const t = setInterval(tick, 1000);
        return () => clearInterval(t);
    }, []);

    const initials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
        : 'MT';

    const handleLogout = () => {
        ['token','access_token','user','auth-storage'].forEach(k => {
            sessionStorage.removeItem(k);
            localStorage.removeItem(k);
        });
        window.location.href = '/login';
    };

    return (
        <>
            {open && (
                <div
                    className="sidebar-overlay"
                    onClick={onClose}
                />
            )}

            <aside className={`sidebar ${open ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div style={{ marginBottom: '0.75rem' }}>
                        <img src="/logo-upgrade.png" alt="Upgrade Tecnologia Educacional" style={{ height: 44, width: 'auto', objectFit: 'contain', display: 'block' }} />
                        <div className="sidebar-subtitle">Portal do Motorista</div>
                    </div>

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

                <button
                    onClick={onClose}
                    aria-label="Fechar menu"
                    onMouseEnter={e => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.transform = 'translateY(-1px) scale(1.04)';
                        el.style.background = 'rgba(17,24,39,0.2)';
                    }}
                    onMouseLeave={e => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.transform = 'translateY(0) scale(1)';
                        el.style.background = 'rgba(17,24,39,0.12)';
                    }}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '0.75rem',
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        border: '1px solid rgba(17,24,39,0.18)',
                        background: 'rgba(17,24,39,0.12)',
                        color: '#0F172A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all .18s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,.08)',
                    }}
                >
                    <XMarkIcon style={{ width: 17, height: 17, strokeWidth: 2.3 }} />
                </button>

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

                <div className="sidebar-footer">
                    <div className="sidebar-user" style={{ marginBottom: '0.5rem' }}>
                        <div className="sidebar-avatar">{initials}</div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="sidebar-user-name">{user?.name || 'Motorista'}</div>
                            <div className="sidebar-user-role">MOTORISTA</div>
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
