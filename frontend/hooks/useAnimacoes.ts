'use client';

import { useEffect } from 'react';
import api from '@/lib/api/client';

/**
 * useAnimacoes — aplica/remove classe `no-animations` no <body>
 * com base na preferência do usuário autenticado.
 *
 * Reaplica automaticamente ao ouvir o evento `userUpdated`
 * (disparado por configuracoes/page.tsx após salvar preferências).
 *
 * globals.css deve ter:
 *   body.no-animations * { animation: none !important; transition: none !important; }
 */
export function useAnimacoes() {
    useEffect(() => {
        const apply = () => {
            api.get('/users/me/preferences')
                .then(res => {
                    const animacoes = res.data?.animacoes;
                    if (animacoes === false) {
                        document.body.classList.add('no-animations');
                    } else {
                        document.body.classList.remove('no-animations');
                    }
                })
                .catch(() => {
                    document.body.classList.remove('no-animations');
                });
        };

        apply(); // aplica ao montar

        // BUG-ANIMACOES-NO-REALTIME: reaplica quando configurações forem salvas
        window.addEventListener('userUpdated', apply);

        return () => {
            window.removeEventListener('userUpdated', apply);
            document.body.classList.remove('no-animations');
        };
    }, []);
}
