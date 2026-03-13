'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    HomeIcon,
    AcademicCapIcon,
    ClipboardDocumentCheckIcon,
    DocumentTextIcon,
    IdentificationIcon,
    UserCircleIcon,
    ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

const navItems = [
    { name: 'Dashboard', href: '/student/dashboard', icon: HomeIcon },
    { name: 'Minhas Turmas', href: '/student/classes', icon: AcademicCapIcon },
    { name: 'Frequência', href: '/student/attendance', icon: ClipboardDocumentCheckIcon },
    { name: 'Inscrições', href: '/student/enrollments', icon: DocumentTextIcon },
    { name: 'Certificados', href: '/student/certificates', icon: IdentificationIcon },
    { name: 'Meu Perfil', href: '/student/profile', icon: UserCircleIcon },
];

export default function StudentSidebar() {
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
        localStorage.removeItem('user');
        localStorage.removeItem('student');
        router.push('/login');
    };

    return (
        <div className="sidebar">
            {/* Header — yellow */}
            <div className="sidebar-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.7rem', color: '#FFD600' }}>UG</span>
                    </div>
                    <div>
                        <div className="sidebar-logo">UPGRADE</div>
                        <div className="sidebar-subtitle">Portal do Aluno</div>
                    </div>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.4rem 0.75rem', borderRadius: 8,
                    background: 'rgba(0,0,0,0.1)',
                    fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace',
                    color: 'rgba(0,0,0,0.7)',
                }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#15803D', display: 'inline-block' }} />
                    {time || '00:00:00'}
                </div>
            </div>

            {/* Nav */}
            <nav className="sidebar-nav custom-scrollbar">
                <div className="sidebar-section-label">Navegação</div>
                {navItems.map((item, index) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`sidebar-link animate-slide-in ${isActive ? 'active' : ''}`}
                            style={{ animationDelay: `${index * 30}ms` }}
                        >
                            <Icon style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                            <span>{item.name}</span>
                            {isActive && <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: 'rgba(0,0,0,0.5)' }} />}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="sidebar-footer">
                <div className="sidebar-user" style={{ marginBottom: '0.6rem' }}>
                    <div className="sidebar-avatar">{initials}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="sidebar-user-name">{user?.name || 'Aluno'}</div>
                        <div className="sidebar-user-role">ALUNO</div>
                    </div>
                </div>
                <button onClick={handleLogout} className="btn-ghost"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', color: '#DC2626', borderColor: '#FEE2E2' }}>
                    <ArrowRightOnRectangleIcon style={{ width: '0.9rem', height: '0.9rem' }} />
                    Sair
                </button>
            </div>
        </div>
    );
}
