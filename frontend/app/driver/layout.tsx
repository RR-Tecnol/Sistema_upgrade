'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import DriverSidebar from '@/components/driver/Sidebar';
import DriverHeader from '@/components/driver/Header';
import { ToastContainer } from '@/components/ui/Toast';
import Tutorial, { TutorialButton } from '@/components/ui/Tutorial';

const DRIVER_STEPS = [
    { icon: '🚛', title: 'Bem-vindo ao Portal do Motorista', description: 'Gerencie suas viagens, solicite reembolsos, registre imprevistos e acompanhe a manutenção da carreta.' },
    { icon: '📍', title: 'Viagens', description: 'Visualize as viagens atribuídas a você com datas, destinos e status. Você será notificado ao ser designado para uma nova rota.' },
    { icon: '💰', title: 'Reembolsos', description: 'Solicite reembolso de despesas de campo como alimentação e reparos emergenciais. Anexe o comprovante e aguarde aprovação.' },
    { icon: '🔧', title: 'Manutenção', description: 'Registre e acompanhe as manutenções da carreta. Documente qualquer problema encontrado durante as viagens.' },
    { icon: '⚠️', title: 'Imprevistos', description: 'Registre qualquer imprevisto ou ausência que ocorreu. O administrador será notificado automaticamente.' },
];

export default function DriverLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [ready, setReady] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);

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
            <Tutorial storageKey="tutorial-driver-v1" steps={DRIVER_STEPS} portalName="Portal do Motorista" forceOpen={showTutorial} onClose={() => setShowTutorial(false)} />
            <TutorialButton onClick={() => setShowTutorial(true)} />
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
