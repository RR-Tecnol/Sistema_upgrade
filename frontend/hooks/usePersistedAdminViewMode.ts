'use client';

import { useCallback, useEffect, useState } from 'react';

/** Modo visual padrão do admin: cartões operacionais vs tabela denso. */
export type AdminViewMode = 'card' | 'table';

const PREFIX = 'admin:view:';

function keyFor(storageKey: string) {
    return `${PREFIX}${storageKey}`;
}

export function usePersistedAdminViewMode(
    storageKey: string,
    defaultMode: AdminViewMode = 'card',
): [AdminViewMode, (m: AdminViewMode) => void] {
    const [mode, setModeState] = useState<AdminViewMode>(defaultMode);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(keyFor(storageKey));
            if (raw === 'card' || raw === 'table') setModeState(raw);
        } catch {
            /* ignore */
        }
    }, [storageKey]);

    const setMode = useCallback(
        (m: AdminViewMode) => {
            setModeState(m);
            try {
                localStorage.setItem(keyFor(storageKey), m);
            } catch {
                /* ignore */
            }
        },
        [storageKey],
    );

    return [mode, setMode];
}
