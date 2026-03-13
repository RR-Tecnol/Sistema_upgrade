'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    HomeIcon,
    AcademicCapIcon,
    UserGroupIcon,
    TruckIcon,
    BuildingOfficeIcon,
    UsersIcon,
    DocumentTextIcon,
    ChartBarIcon,
    Cog6ToothIcon,
    ArrowRightOnRectangleIcon,
    ClipboardDocumentCheckIcon,
    IdentificationIcon,
    BoltIcon,
    CurrencyDollarIcon,
    BriefcaseIcon,
    CalendarDaysIcon,
    BanknotesIcon,
} from '@heroicons/react/24/outline';

const navSections = [
    {
        label: 'Principal',
        items: [
            { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon },
        ]
    },
    {
        label: 'Gestão Acadêmica',
        items: [
            { name: 'Cursos', href: '/admin/cursos', icon: AcademicCapIcon },
            { name: 'Turmas', href: '/admin/turmas', icon: UserGroupIcon },
            { name: 'Inscrições', href: '/admin/inscricoes', icon: DocumentTextIcon },
            { name: 'Alunos', href: '/admin/alunos', icon: UsersIcon },
            { name: 'Frequência', href: '/admin/frequencia', icon: ClipboardDocumentCheckIcon },
            { name: 'Certificados', href: '/admin/certificados', icon: IdentificationIcon },
        ]
    },
    {
        label: 'Infraestrutura',
        items: [
            { name: 'Carretas', href: '/admin/carretas', icon: TruckIcon },
            { name: 'Grupos', href: '/admin/grupos', icon: BuildingOfficeIcon },
        ]
    },
    {
        label: 'Operações de Campo',
        items: [
            { name: 'Períodos de Curso', href: '/admin/acoes', icon: BoltIcon }, // REQ-07
            { name: 'Funcionários', href: '/admin/funcionarios', icon: BriefcaseIcon },
            { name: 'Feriados & Imprevistos', href: '/admin/feriados', icon: CalendarDaysIcon }, // REQ-08
            { name: 'Reembolsos', href: '/admin/reembolsos', icon: BanknotesIcon }, // REQ-10
            { name: 'Contas a Pagar', href: '/admin/contas-a-pagar', icon: CurrencyDollarIcon },
        ]
    },
    {
        label: 'Sistema',
        items: [
            { name: 'Relatórios', href: '/admin/relatorios', icon: ChartBarIcon },
            { name: 'Configurações', href: '/admin/configuracoes', icon: Cog6ToothIcon },
        ]
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [time, setTime] = useState('');

    useEffect(() => {
        const u = localStorage.getItem('user');
        if (u) setUser(JSON.parse(u));

        const tick = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        tick();
        const t = setInterval(tick, 1000);
        return () => clearInterval(t);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('student');
        router.push('/login');
    };

    const initials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
        : 'AD';

    return (
        <div className="sidebar">
            {/* Header — yellow background */}
            <div className="sidebar-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div
                        style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: '#000',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.7rem', color: '#FFD600' }}>UG</span>
                    </div>
                    <div>
                        <div className="sidebar-logo">UPGRADE</div>
                        <div className="sidebar-subtitle">Sistema de Gestão</div>
                    </div>
                </div>

                {/* Clock */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.4rem 0.75rem', borderRadius: 8,
                    background: 'rgba(0,0,0,0.1)',
                    fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace',
                    color: 'rgba(0,0,0,0.7)',
                }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#15803D', display: 'inline-block' }} />
                    {time || '00:00:00'}
                    <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: 'rgba(0,0,0,0.5)', letterSpacing: '0.1em' }}>ONLINE</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav custom-scrollbar">
                {navSections.map((section) => (
                    <div key={section.label}>
                        <div className="sidebar-section-label">{section.label}</div>
                        {section.items.map((item, index) => {
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`sidebar-link animate-slide-in ${isActive ? 'active' : ''}`}
                                    style={{ animationDelay: `${index * 25}ms` }}
                                >
                                    <Icon style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                                    <span>{item.name}</span>
                                    {isActive && (
                                        <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: 'rgba(0,0,0,0.5)' }} />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="sidebar-footer">
                <div className="sidebar-user" style={{ marginBottom: '0.6rem' }}>
                    <div className="sidebar-avatar">{initials}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="sidebar-user-name">{user?.name || 'Administrador'}</div>
                        <div className="sidebar-user-role">{user?.role || 'ADMIN'}</div>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="btn-ghost"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', color: '#DC2626', borderColor: '#FEE2E2' }}
                >
                    <ArrowRightOnRectangleIcon style={{ width: '0.9rem', height: '0.9rem' }} />
                    Sair do Sistema
                </button>
            </div>
        </div>
    );
}
