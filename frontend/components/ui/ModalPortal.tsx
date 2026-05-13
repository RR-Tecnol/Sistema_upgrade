'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Acima de header/sidebar/toasts — modais ancorados ao viewport */
export const MODAL_PORTAL_Z_INDEX = 500_000;

type ModalPortalProps = { children: ReactNode };

/**
 * Ancora modais em `document.body` para não serem cortados nem centralizados
 * apenas dentro de `.admin-content` (overflow-y: auto + ancestrais overflow:hidden).
 */
export function ModalPortal({ children }: ModalPortalProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;
    return createPortal(<>{children}</>, document.body);
}
