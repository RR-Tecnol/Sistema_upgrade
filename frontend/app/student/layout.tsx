'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import StudentSidebar from '@/components/student/Sidebar';
import StudentHeader from '@/components/student/Header';
import { ToastContainer } from '@/components/ui/Toast';
import Tutorial, { TutorialButton } from '@/components/ui/Tutorial';

const STUDENT_STEPS = [
    { icon: '🎓', title: 'Bem-vindo ao Portal do Aluno!', description: 'Aqui você acompanha sua frequência, inscrições, certificados e muito mais. Use o menu lateral para navegar.' },
    { icon: '📅', title: 'Sua Frequência', description: 'Veja seu calendário de presenças e faltas. Clique em qualquer dia para detalhes. Frequência ≥ 75% é obrigatória para aprovação.' },
    { icon: '📝', title: 'Inscrições', description: 'Veja suas matrículas ativas e explore cursos disponíveis. Use a aba "Cursos Disponíveis" para se inscrever em novas turmas.' },
    { icon: '🏆', title: 'Certificados', description: 'Ao concluir um curso, seu certificado digital aparece aqui com QR Code para verificação instantânea.' },
    { icon: '⚙️', title: 'Configurações', description: 'Atualize seu nome, preferências de notificação e segurança da conta a qualquer momento.' },
];

export default function StudentLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [ready, setReady] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showTutorial, setShowTutorial] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) { router.replace('/login'); return; }
        setReady(true);
    }, [router]);

    useEffect(() => { setSidebarOpen(false); }, [pathname]);

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
            <Tutorial storageKey="tutorial-student-v1" steps={STUDENT_STEPS} portalName="Portal do Aluno" />
            {showTutorial && (
                <Tutorial storageKey={`tutorial-student-reopen-${Date.now()}`} steps={STUDENT_STEPS} portalName="Portal do Aluno" />
            )}
            <TutorialButton onClick={() => { localStorage.removeItem('tutorial-student-v1'); window.location.reload(); }} />
            <StudentSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="admin-main">
                <StudentHeader onToggleSidebar={() => setSidebarOpen(s => !s)} sidebarOpen={sidebarOpen} />
                <main className="admin-content custom-scrollbar">
                    {children}
                </main>
            </div>
        </div>
    );
}
