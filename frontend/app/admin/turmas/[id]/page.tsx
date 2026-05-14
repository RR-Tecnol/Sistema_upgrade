'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const TurmaDetailWorkspace = dynamic(
    () => import('@/components/admin/turmas/TurmaDetailWorkspace'),
    {
        ssr: false,
        loading: () => (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>
                        CARREGANDO MÓDULO DA TURMA...
                    </p>
                </div>
            </div>
        ),
    },
);

export default function TurmaDetailPage() {
    const params = useParams<{ id: string }>();
    const id = params?.id;
    if (!id || typeof id !== 'string') return null;
    return <TurmaDetailWorkspace classId={id} mode="page" />;
}
