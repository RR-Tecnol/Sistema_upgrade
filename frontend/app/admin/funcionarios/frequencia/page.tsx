'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeprecatedFrequenciaFuncionarios() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/frequencia?tab=professores');
    }, [router]);

    return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: '#6B7280' }}>
            Redirecionando para a nova central de frequência...
        </div>
    );
}
