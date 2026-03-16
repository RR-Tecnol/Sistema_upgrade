'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    HomeIcon,
    ClipboardDocumentCheckIcon,
    BanknotesIcon,
    ClockIcon,
    ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

const navItems = [
    { name: 'Dashboard', href: '/teacher/dashboard', icon: HomeIcon },
    { name: 'Frequência', href: '/teacher/frequencia', icon: ClipboardDocumentCheckIcon },
    { name: 'Reembolsos', href: '/teacher/reembolsos', icon: BanknotesIcon },
    { name: 'Histórico', href: '/teacher/historico', icon: ClockIcon },
];

export default function TeacherLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [ready, setReady] = useState(false);
    const [teacherName, setTeacherName] = useState('Professor');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            router.replace('/login');
            return;
        }
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user?.name) setTeacherName(user.name);
        setReady(true);
    }, [router]);

    function handleLogout() {
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        router.replace('/login');
    }

    if (!ready) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0F172A' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 40, height: 40, border: '3px solid #FFD600', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite', margin: '0 auto 1rem' }} />
                    <p style={{ color: '#9CA3AF', fontSize: '0.8rem', fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.1em' }}>VERIFICANDO ACESSO...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#0F172A', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10 }}
                />
            )}

            {/* Sidebar */}
            <aside style={{
                width: 240,
                background: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
                borderRight: '1px solid rgba(255,214,0,0.12)',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                top: 0,
                left: 0,
                height: '100vh',
                zIndex: 20,
                transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.28s ease',
                paddingBottom: '1rem',
            }}>
                {/* Logo */}
                <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid rgba(255,214,0,0.10)' }}>
                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1rem', fontWeight: 700, color: '#FFD600', letterSpacing: '0.08em' }}>
                        UPGRADE
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: 2, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        Portal do Professor
                    </div>
                </div>

                {/* Teacher info */}
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #FFD600, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.5rem' }}>
                        {teacherName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#F1F5F9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{teacherName}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Professor Instrutor</div>
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '0.75rem 0.75rem', overflowY: 'auto' }}>
                    {navItems.map(item => {
                        const active = pathname?.startsWith(item.href);
                        const Icon = item.icon;
                        return (
                            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '0.65rem',
                                    padding: '0.6rem 0.75rem', borderRadius: 8, marginBottom: 2,
                                    background: active ? 'rgba(255,214,0,0.12)' : 'transparent',
                                    color: active ? '#FFD600' : '#94A3B8',
                                    fontWeight: active ? 600 : 400,
                                    fontSize: '0.85rem',
                                    transition: 'all 0.18s',
                                    cursor: 'pointer',
                                    borderLeft: active ? '2px solid #FFD600' : '2px solid transparent',
                                }}>
                                    <Icon style={{ width: 18, height: 18 }} />
                                    {item.name}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div style={{ padding: '0 0.75rem' }}>
                    <button onClick={handleLogout} style={{
                        display: 'flex', alignItems: 'center', gap: '0.65rem',
                        width: '100%', padding: '0.6rem 0.75rem', borderRadius: 8,
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: '#EF4444', fontSize: '0.85rem', fontWeight: 500,
                        transition: 'background 0.18s',
                    }}>
                        <ArrowRightOnRectangleIcon style={{ width: 18, height: 18 }} />
                        Sair
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Header */}
                <header style={{
                    height: 60, background: '#1E293B', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', padding: '0 1.5rem',
                    justifyContent: 'space-between', flexShrink: 0,
                }}>
                    {/* Hamburger — mobile */}
                    <button
                        onClick={() => setSidebarOpen(s => !s)}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 40, height: 40, borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                            cursor: 'pointer', marginRight: '0.75rem', flexShrink: 0,
                        }}
                        aria-label="Abrir menu"
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <rect y="2" width="18" height="2" rx="1" fill="#94A3B8"/>
                            <rect y="8" width="18" height="2" rx="1" fill="#94A3B8"/>
                            <rect y="14" width="18" height="2" rx="1" fill="#94A3B8"/>
                        </svg>
                    </button>
                    <div style={{ fontSize: '0.9rem', color: '#94A3B8' }}>
                        Bem-vindo(a), <span style={{ color: '#F1F5F9', fontWeight: 600 }}>{teacherName}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                        {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                    </div>
                </header>

                {/* Page content */}
                <main style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    {children}
                </main>
            </div>
        </div>
    );
}
