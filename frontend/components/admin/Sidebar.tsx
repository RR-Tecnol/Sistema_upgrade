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
    ClockIcon,
    ExclamationTriangleIcon,
    ChatBubbleLeftRightIcon,
    CubeIcon,
    WrenchScrewdriverIcon,
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
            { name: 'Fabricação', href: '/admin/fabricacao', icon: WrenchScrewdriverIcon },
            { name: 'Estoque', href: '/admin/estoque', icon: CubeIcon },
            { name: 'Grupos', href: '/admin/grupos', icon: BuildingOfficeIcon },
        ]
    },
    {
        label: 'Operações de Campo',
        items: [
            { name: 'Períodos de Curso', href: '/admin/acoes', icon: BoltIcon },
            { name: 'Viagens', href: '/admin/viagens', icon: TruckIcon },
            { name: 'Funcionários', href: '/admin/funcionarios', icon: BriefcaseIcon },
            { name: 'Feriados', href: '/admin/feriados', icon: CalendarDaysIcon },
            { name: 'Imprevistos', href: '/admin/imprevistos', icon: ExclamationTriangleIcon },
            { name: 'Reembolsos', href: '/admin/reembolsos', icon: BanknotesIcon },
            { name: 'Feedbacks', href: '/admin/feedbacks', icon: ChatBubbleLeftRightIcon },
            { name: 'Contas a Pagar', href: '/admin/contas-a-pagar', icon: CurrencyDollarIcon },
        ]
    },
    {
        label: 'Sistema',
        items: [
            { name: 'Relatórios', href: '/admin/relatorios', icon: ChartBarIcon },
            { name: 'Histórico', href: '/admin/historico', icon: ClockIcon },
            { name: 'Configurações', href: '/admin/configuracoes', icon: Cog6ToothIcon },
        ]
    },
];

interface SidebarProps {
    open?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ open = false, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [time, setTime] = useState('');

    useEffect(() => {
        const u = sessionStorage.getItem('user') || localStorage.getItem('user');
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
        window.location.href = '/login';
    };

    const initials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
        : 'AD';

    return (
        <>
            {/* Overlay — fecha ao tocar fora no mobile */}
            {open && (
                <div className="sidebar-overlay" onClick={onClose} />
            )}

            <div className={`sidebar ${open ? 'open' : ''}`}>
                {/* Header — yellow background */}
                <div className="sidebar-header">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem' }}>
                        <img src="/logo-upgrade.png" alt="Upgrade Tecnologia Educacional" style={{ height: 44, width: 'auto', objectFit: 'contain', display: 'block' }} />
                        <div className="sidebar-subtitle">Sistema de Gestão</div>
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
                                const allHrefs = navSections.flatMap(s => s.items.map(i => i.href));
                                const hasExactMatch = allHrefs.includes(pathname ?? '');
                                const isActive = pathname === item.href ||
                                    (!hasExactMatch && (pathname?.startsWith(item.href + '/') ?? false));
                                const Icon = item.icon;

                                // Badge especial para Fabricação (destaque visual de novo módulo)
                                const isFabricacao = item.href === '/admin/fabricacao';

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`sidebar-link animate-slide-in ${isActive ? 'active' : ''}`}
                                        style={{ animationDelay: `${index * 25}ms` }}
                                        onClick={onClose}
                                    >
                                        <Icon style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                                        <span>{item.name}</span>
                                        {isFabricacao && !isActive && (
                                            <span style={{
                                                marginLeft: 'auto',
                                                fontSize: '0.55rem',
                                                fontWeight: 800,
                                                letterSpacing: '0.08em',
                                                padding: '0.15rem 0.45rem',
                                                borderRadius: 99,
                                                background: 'rgba(0,0,0,0.12)',
                                                color: 'rgba(0,0,0,0.55)',
                                                textTransform: 'uppercase',
                                            }}>
                                                NOVO
                                            </span>
                                        )}
                                        {isActive && (
                                            <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: 'rgba(0,0,0,0.5)' }} />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                {/* MODO INSPEÇÃO TI — visível apenas para IT_ADMIN */}
                    {user?.role === 'IT_ADMIN' && (
                        <div style={{ marginTop: 8 }}>
                            <div className="sidebar-section-label" style={{ color: '#7C3AED', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 10 }}>🔬</span> Inspeção TI
                            </div>
                            {[
                                { name: 'Portal do Aluno', href: '/student/dashboard', emoji: '🎓' },
                                { name: 'Portal do Professor', href: '/teacher/dashboard', emoji: '📚' },
                                { name: 'Portal do Motorista', href: '/driver/dashboard', emoji: '🚛' },
                            ].map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className="sidebar-link"
                                    onClick={onClose}
                                    style={{ background: 'rgba(124,58,237,0.08)', border: '1px dashed rgba(124,58,237,0.3)', marginBottom: 2 }}
                                >
                                    <span style={{ fontSize: 14 }}>{item.emoji}</span>
                                    <span style={{ fontSize: '0.8rem', color: '#7C3AED', fontWeight: 600 }}>{item.name}</span>
                                </Link>
                            ))}
                        </div>
                    )}
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
        </>
    );
}
