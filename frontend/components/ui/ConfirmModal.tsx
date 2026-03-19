'use client';

import { useEffect, useRef } from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmModal({
    isOpen,
    title = 'Confirmar ação',
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    danger = false,
    loading = false,
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    const confirmRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => confirmRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (!isOpen) return;
            if (e.key === 'Escape') onCancel();
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const confirmBg = danger
        ? 'linear-gradient(135deg, #DC2626, #B91C1C)'
        : 'linear-gradient(135deg, #FFD600, #B89B00)';
    const confirmColor = danger ? '#fff' : '#000';
    const confirmShadow = danger
        ? '0 4px 16px rgba(220,38,38,0.4)'
        : '0 4px 16px rgba(255,214,0,0.4)';
    const iconEmoji = danger ? '🗑️' : '⚠️';

    return (
        <div
            className="modal-overlay"
            onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
            style={{ zIndex: 9998 }}
        >
            <div
                className="modal-content animate-scale-in"
                style={{ maxWidth: 400 }}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-modal-title"
            >
                {/* Icon */}
                <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: danger ? 'rgba(220,38,38,0.1)' : 'rgba(255,214,0,0.1)',
                    border: `1.5px solid ${danger ? 'rgba(220,38,38,0.25)' : 'rgba(255,214,0,0.25)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.6rem', margin: '0 auto 1.25rem',
                }}>
                    {iconEmoji}
                </div>

                {/* Title */}
                <h3 id="confirm-modal-title" style={{
                    fontFamily: 'Orbitron, sans-serif', fontWeight: 900,
                    fontSize: '0.95rem', color: '#111827',
                    textAlign: 'center', marginBottom: '0.6rem',
                }}>
                    {title}
                </h3>

                {/* Message */}
                <p style={{
                    fontSize: '0.85rem', color: '#6B7280',
                    textAlign: 'center', lineHeight: 1.65,
                    marginBottom: '1.5rem',
                }}>
                    {message}
                </p>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        style={{
                            flex: 1, padding: '0.75rem', borderRadius: 12,
                            border: '1.5px solid #E5E7EB', background: 'transparent',
                            color: '#6B7280', fontWeight: 700, fontSize: '0.85rem',
                            cursor: 'pointer', transition: 'all 0.15s',
                        }}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmRef}
                        onClick={onConfirm}
                        disabled={loading}
                        style={{
                            flex: 1.5, padding: '0.75rem', borderRadius: 12,
                            border: 'none', background: confirmBg, color: confirmColor,
                            fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer',
                            boxShadow: confirmShadow, transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            opacity: loading ? 0.7 : 1,
                        }}
                    >
                        {loading
                            ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Aguarde...</>
                            : confirmLabel
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
