'use client';

import { useRef, useCallback } from 'react';

/**
 * Hook que permite arrastar um container scrollável com o mouse,
 * igual ao comportamento de arrastar em dispositivos touch.
 * 
 * Uso:
 *   const { ref, isDragging } = useDragScroll();
 *   <div ref={ref} style={{ overflowX: 'auto', cursor: isDragging ? 'grabbing' : 'grab' }}>
 *     ...conteúdo wide...
 *   </div>
 */
export function useDragScroll<T extends HTMLElement = HTMLDivElement>() {
    const ref = useRef<T>(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if (!ref.current) return;
        isDragging.current = true;
        startX.current = e.pageX - ref.current.offsetLeft;
        scrollLeft.current = ref.current.scrollLeft;
        ref.current.style.cursor = 'grabbing';
        ref.current.style.userSelect = 'none';
    }, []);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging.current || !ref.current) return;
        e.preventDefault();
        const x = e.pageX - ref.current.offsetLeft;
        const walk = (x - startX.current) * 1.5;
        ref.current.scrollLeft = scrollLeft.current - walk;
    }, []);

    const onMouseUp = useCallback(() => {
        isDragging.current = false;
        if (!ref.current) return;
        ref.current.style.cursor = 'grab';
        ref.current.style.userSelect = '';
    }, []);

    const handlers = {
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onMouseLeave: onMouseUp,
    };

    return { ref, handlers, isDragging: isDragging.current };
}
