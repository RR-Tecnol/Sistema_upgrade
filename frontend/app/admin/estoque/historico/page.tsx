'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function RedirectInner() {
    const router = useRouter();
    const sp = useSearchParams();

    useEffect(() => {
        const next = new URLSearchParams();
        next.set('tab', 'movimentacoes');
        next.set('audit', '1');
        sp.forEach((val, key) => {
            if (key === 'tab' || key === 'audit') return;
            next.set(key, val);
        });
        router.replace(`/admin/estoque?${next.toString()}`);
    }, [router, sp]);

    return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6B7280', fontSize: '0.9rem' }}>
            A redirecionar para movimentações e auditoria…
        </div>
    );
}

export default function EstoqueHistoricoRedirectPage() {
    return (
        <Suspense fallback={<div style={{ padding: '2rem' }}>…</div>}>
            <RedirectInner />
        </Suspense>
    );
}
