'use client';

/**
 * FUTURE_DEPLOY: esta rota antes apontava para /admin/feedbacks?tab=pix-batch (UI de lote).
 * O lote está em stand-by; mantemos apenas redireccionamento único para a lista principal.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPixRewardsRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/admin/feedbacks');
    }, [router]);

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
            <div className="spinner" style={{ width: 36, height: 36 }} />
            <p style={{ fontSize: '0.85rem', color: '#6B7280', fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.08em' }}>
                Redirecionando para lista de feedbacks...
            </p>
        </div>
    );
}
