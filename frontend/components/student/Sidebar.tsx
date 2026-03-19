'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    HomeIcon,
    AcademicCapIcon,
    ClipboardDocumentCheckIcon,
    DocumentTextIcon,
    IdentificationIcon,
    UserCircleIcon,
    ArrowRightOnRectangleIcon,
    XMarkIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const navItems = [
    { name: 'Dashboard', href: '/student/dashboard', icon: HomeIcon },
    { name: 'Minhas Turmas', href: '/student/classes', icon: AcademicCapIcon },
    { name: 'Frequência', href: '/student/attendance', icon: ClipboardDocumentCheckIcon },
    { name: 'Inscrições', href: '/student/enrollments', icon: DocumentTextIcon },
    { name: 'Certificados', href: '/student/certificates', icon: IdentificationIcon },
    { name: 'Meu Perfil', href: '/student/profile', icon: UserCircleIcon },
    { name: 'Imprevistos', href: '/student/imprevistos', icon: ExclamationTriangleIcon },
];

interface Props {
    open?: boolean;
    onClose?: () => void;
}

export default function StudentSidebar({ open = false, onClose }: Props) {
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
        : 'AL';

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        localStorage.removeItem('student');
        router.push('/login');
    };

    return (
        <>
            {/* Overlay escuro — fecha ao clicar fora (mobile) */}
            <div
                className="sidebar-overlay"
                style={{ display: open ? 'block' : 'none' }}
                onClick={onClose}
            />

            <aside className={`sidebar ${open ? 'open' : ''}`}>
                {/* Logo */}
                <div className="sidebar-header">
                    <div style={{ marginBottom: '0.6rem' }}>
                        <img src="/logo-upgrade.png" alt="Upgrade Tecnologia Educacional" style={{ height: 40, width: 'auto', objectFit: 'contain', display: 'block' }} />
                        <div className="sidebar-subtitle">Portal do Aluno</div>
                    </div>
                    {/* Relógio */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.6rem', borderRadius: 7, background: 'rgba(0,0,0,0.08)', fontSize: '0.68rem', fontFamily: 'JetBrains Mono, monospace', color: 'rgba(0,0,0,0.65)' }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#15803D', display: 'inline-block' }} />
                        {time || '00:00:00'}
                    </div>
                </div>

                {/* Botão fechar (mobile — só aparece quando sidebar está aberta) */}
                {open && (
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute', top: '1rem', right: '0.75rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 30, height: 30, borderRadius: 7,
                            border: '1px solid rgba(0,0,0,0.15)', background: 'rgba(0,0,0,0.05)',
                            cursor: 'pointer',
                        }}
                        aria-label="Fechar menu"
                    >
                        <XMarkIcon style={{ width: 14, height: 14, color: '#000' }} />
                    </button>
                )}

                {/* Nav */}
                <nav className="sidebar-nav custom-scrollbar">
                    <div className="sidebar-section-label">Navegação</div>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                style={{ textDecoration: 'none' }}
                                onClick={onClose}
                            >
                                <div className={`sidebar-link ${isActive ? 'active' : ''}`}>
                                    <Icon style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                                    <span>{item.name}</span>
                                    {isActive && <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: '#000', opacity: 0.4 }} />}
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
                            <div className="sidebar-user-name">{user?.name || 'Aluno'}</div>
                            <div className="sidebar-user-role">ALUNO</div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', color: '#DC2626', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                        <ArrowRightOnRectangleIcon style={{ width: '1rem', height: '1rem' }} />
                        <span>Sair</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
