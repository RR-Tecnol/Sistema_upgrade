'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/admin/Sidebar';
import Header from '@/components/admin/Header';

export default function AdminLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [ready, setReady] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        // BUG-01: Verificar token no localStorage antes de renderizar
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            router.replace('/login');
            return;
        }
        setReady(true);
    }, [router]);

    // Fechar sidebar ao navegar entre rotas
    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    if (!ready) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FAFAFA' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 40, height: 40, border: '3px solid #FFD600', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite', margin: '0 auto 1rem' }} />
                    <p style={{ color: '#9CA3AF', fontSize: '0.8rem', fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.1em' }}>VERIFICANDO ACESSO...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-layout">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="admin-main">
                <Header onMenuToggle={() => setSidebarOpen(s => !s)} />
                <main className="admin-content custom-scrollbar">
                    {children}
                </main>
            </div>
        </div>
    );
}
