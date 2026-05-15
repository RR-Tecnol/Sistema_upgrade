'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EstoqueBaixaAcaoRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/acoes');
    }, [router]);

    return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6B7280', fontSize: '0.9rem' }}>
            A redirecionar para Ações (baixa de estoque por ação)…
        </div>
    );
}
