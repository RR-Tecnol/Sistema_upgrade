'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/admin/Sidebar';
import Header from '@/components/admin/Header';
import { ToastContainer } from '@/components/ui/Toast';
import Tutorial, { TutorialButton } from '@/components/ui/Tutorial';
import { ConfirmModalRoot } from '@/components/ui/ConfirmModal';
import { useAnimacoes } from '@/hooks/useAnimacoes';

const ADMIN_STEPS = [
    { icon: '⚙️', title: 'Bem-vindo ao Painel Administrativo', description: 'Central de controle do Sistema Qualifica. Gerencie alunos, turmas, funcionários, finanças, frequência e muito mais.' },
    { icon: '📊', title: 'Dashboard & BI', description: 'Acompanhe métricas em tempo real: inscrições, frequência, custos e rotas. O painel BI mostra análises por estado e período.' },
    { icon: '👥', title: 'Alunos & Turmas', description: 'Cadastre alunos, crie turmas, aprove inscrições no kanban e registre a frequência diária com 2 botões (P/F) touch-friendly.' },
    { icon: '👷', title: 'Funcionários & Frequência', description: 'Cadastre funcionários, gerencie contratos e registre a frequência diária. Acesse Operações → Freq. Funcionários.' },
    { icon: '💰', title: 'Financeiro', description: 'Aprove reembolsos, gerencie Contas a Pagar (com soft delete e restauração) e configure parâmetros financeiros nas Configurações.' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [ready, setReady] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    useAnimacoes(); // ANIMACOES: aplica preferência do usuário

    useEffect(() => {
        // SEGURANÇA: sessionStorage (isolado por aba) com fallback legacy localStorage
        const token = sessionStorage.getItem('token') || sessionStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('access_token');
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
        <>
            <ToastContainer />
            <ConfirmModalRoot />
            <Tutorial storageKey="tutorial-admin-v1" steps={ADMIN_STEPS} portalName="Painel Administrativo" forceOpen={showTutorial} onClose={() => setShowTutorial(false)} />
            <TutorialButton onClick={() => setShowTutorial(true)} />
            <div className="admin-layout">
                <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                <div className="admin-main">
                    <Header onMenuToggle={() => setSidebarOpen(s => !s)} />
                    <main className="admin-content custom-scrollbar">
                        {children}
                    </main>
                </div>
            </div>
        </>
    );
}
