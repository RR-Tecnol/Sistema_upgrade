'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const TurmaEstatisticasWorkspace = dynamic(
    () => import('@/components/admin/turmas/TurmaEstatisticasWorkspace'),
    {
        ssr: false,
        loading: () => (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                <p style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>
                    CARREGANDO ESTATÍSTICAS...
                </p>
            </div>
        ),
    },
);

export default function EstatisticasTurmaPage() {
    const params = useParams<{ id: string }>();
    const id = params?.id;
    if (!id || typeof id !== 'string') return null;
    return <TurmaEstatisticasWorkspace classId={id} mode="page" />;
}
