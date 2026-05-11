'use client';

import { useState, useCallback, useRef } from 'react';

interface DragDropConfig<T> {
    items: T[];
    onDrop: (itemId: string, newStatus: string) => void | Promise<void>;
}

/**
 * Hook reutilizável para kanban drag & drop sem bibliotecas externas.
 * Usa a HTML5 Drag and Drop API nativa.
 * 
 * Uso:
 *   const { dragHandlers, dropHandlers, draggingId, hoveredColumn } = useDragDrop({ items, onDrop });
 * 
 *   // No card:
 *   <div draggable {...dragHandlers(item.id)} style={{ opacity: draggingId === item.id ? 0.5 : 1 }}>
 * 
 *   // Na coluna:
 *   <div {...dropHandlers(columnStatus)} style={{
 *     border: hoveredColumn === columnStatus ? '2px dashed #FFD600' : '2px solid transparent'
 *   }}>
 */
export function useDragDrop<T extends { id: string; status: string }>({
    onDrop,
}: Pick<DragDropConfig<T>, 'onDrop'>) {
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
    const draggingIdRef = useRef<string | null>(null);

    const dragHandlers = useCallback(
        (id: string) => ({
            draggable: true as const,
            onDragStart: (e: React.DragEvent) => {
                e.dataTransfer.setData('text/plain', id);
                e.dataTransfer.effectAllowed = 'move';
                setDraggingId(id);
                draggingIdRef.current = id;
            },
            onDragEnd: () => {
                setDraggingId(null);
                setHoveredColumn(null);
                draggingIdRef.current = null;
            },
        }),
        []
    );

    const dropHandlers = useCallback(
        (targetStatus: string) => ({
            onDragOver: (e: React.DragEvent) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setHoveredColumn(targetStatus);
            },
            onDragLeave: (e: React.DragEvent) => {
                // Only clear if leaving the column container itself
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setHoveredColumn(null);
                }
            },
            onDrop: (e: React.DragEvent) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                setHoveredColumn(null);
                setDraggingId(null);
                if (id) onDrop(id, targetStatus);
            },
        }),
        [onDrop]
    );

    return { dragHandlers, dropHandlers, draggingId, hoveredColumn };
}
