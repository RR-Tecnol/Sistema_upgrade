'use client';

import { useEffect, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

// ── Singleton state (simples, sem Context) ────────────────────────────────────
let _items: ToastItem[] = [];
let _listeners: ((items: ToastItem[]) => void)[] = [];

function notify(items: ToastItem[]) {
    _listeners.forEach(l => l(items));
}

export const toast = {
    success: (message: string, duration = 4000) => addToast(message, 'success', duration),
    error:   (message: string, duration = 5000) => addToast(message, 'error',   duration),
    warning: (message: string, duration = 4000) => addToast(message, 'warning', duration),
    info:    (message: string, duration = 3500) => addToast(message, 'info',    duration),
};

function addToast(message: string, type: ToastType, duration: number) {
    const id = `${Date.now()}-${Math.random()}`;
    _items = [{ id, message, type, duration }, ..._items.slice(0, 4)];
    notify(_items);
    setTimeout(() => removeToast(id), duration);
    return id;
}

function removeToast(id: string) {
    _items = _items.filter(i => i.id !== id);
    notify(_items);
}

// ── Toast Provider (montar no layout raiz) ────────────────────────────────────
export function ToastContainer() {
    const [items, setItems] = useState<ToastItem[]>([]);

    useEffect(() => {
        _listeners.push(setItems);
        return () => { _listeners = _listeners.filter(l => l !== setItems); };
    }, []);

    if (items.length === 0) return null;

    const ICON: Record<ToastType, string> = { success:'✓', error:'✕', warning:'⚠', info:'ℹ' };
    const BG:   Record<ToastType, string> = {
        success: 'linear-gradient(135deg,#059669,#047857)',
        error:   'linear-gradient(135deg,#DC2626,#B91C1C)',
        warning: 'linear-gradient(135deg,#D97706,#B45309)',
        info:    'linear-gradient(135deg,#2563EB,#1D4ED8)',
    };

    return (
        <div style={{
            position: 'fixed', top: 20, right: 20, zIndex: 99999,
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
            pointerEvents: 'none',
        }}>
            {items.map(item => (
                <div
                    key={item.id}
                    style={{
                        background: BG[item.type],
                        color: '#fff',
                        padding: '0.75rem 1.1rem',
                        borderRadius: 12,
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        minWidth: 260,
                        maxWidth: 380,
                        animation: 'toastIn 0.25s cubic-bezier(0.22,1,0.36,1)',
                        pointerEvents: 'auto',
                    }}
                    onClick={() => removeToast(item.id)}
                >
                    <span style={{
                        width: 22, height: 22, borderRadius: 7,
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.8rem', fontWeight: 900, flexShrink: 0,
                    }}>{ICON[item.type]}</span>
                    <span style={{ lineHeight: 1.4 }}>{item.message}</span>
                </div>
            ))}
            <style>{`@keyframes toastIn { from { opacity:0; transform:translateX(20px) scale(0.95); } to { opacity:1; transform:translateX(0) scale(1); } }`}</style>
        </div>
    );
}
