'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import DriverSidebar from '@/components/driver/Sidebar';
import DriverHeader from '@/components/driver/Header';
import { ToastContainer } from '@/components/ui/Toast';

export default function DriverLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [ready, setReady] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            router.replace('/login');
            return;
        }
        setReady(true);
    }, [router]);

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
            <ToastContainer />
            <DriverSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="admin-main">
                <DriverHeader onMenuToggle={() => setSidebarOpen(s => !s)} />
                <main className="admin-content custom-scrollbar">
                    {children}
                </main>
            </div>
        </div>
    );
}
