'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import TeacherSidebar from '@/components/teacher/Sidebar';
import TeacherHeader from '@/components/teacher/Header';
import { ToastContainer } from '@/components/ui/Toast';
import Tutorial, { TutorialButton } from '@/components/ui/Tutorial';

const TEACHER_STEPS = [
    { icon: '👩‍🏫', title: 'Bem-vindo ao Portal do Professor', description: 'Registre a frequência de suas turmas, solicite reembolsos, registre imprevistos e acompanhe suas atividades.' },
    { icon: '📋', title: 'Registro de Frequência', description: 'Selecione a turma e a data, marque P (Presente) ou F (Falta) para cada aluno e salve. O histórico fica disponível para consulta.' },
    { icon: '💰', title: 'Reembolsos', description: 'Solicite reembolsos de despesas de campo (alimentação, material, reparos). Acompanhe o status de aprovação.' },
    { icon: '⚠️', title: 'Imprevistos', description: 'Registre ausências ou imprevistos que ocorreram durante as atividades. O administrador será notificado.' },
    { icon: '🕐', title: 'Ponto / Histórico', description: 'Registre seu ponto de entrada e consulte o histórico de atividades. Use o botão de check-in na página de histórico.' },
];

export default function TeacherLayout({ children }: { children: ReactNode }) {
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

    // Fechar sidebar ao navegar
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
            <Tutorial storageKey="tutorial-teacher-v1" steps={TEACHER_STEPS} portalName="Portal do Professor" forceOpen={showTutorial} onClose={() => setShowTutorial(false)} />
            <TutorialButton onClick={() => setShowTutorial(true)} />
            <TeacherSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="admin-main">
                <TeacherHeader onMenuToggle={() => setSidebarOpen(s => !s)} />
                <main className="admin-content custom-scrollbar">
                    {children}
                </main>
            </div>
        </div>
    );
}
