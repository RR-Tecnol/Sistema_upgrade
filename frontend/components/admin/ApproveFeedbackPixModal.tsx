'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type Props = {
    onClose: () => void;
    onConfirm: (amount: number) => void;
    confirming?: boolean;
    /** Valor inicial do campo em R$ (string para o input controlado). */
    defaultAmount?: string;
    title?: string;
    subtitle?: string;
};

export default function ApproveFeedbackPixModal({
    onClose,
    onConfirm,
    confirming = false,
    defaultAmount = '50.00',
    title = 'Pagamento via Conta a Pagar',
    subtitle = 'Informe o valor a pagar em PIX. Será criada uma Conta a Pagar no financeiro.',
}: Props) {
    const [amount, setAmount] = useState(defaultAmount);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    if (!mounted) return null;

    return createPortal(
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(6px)',
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#fff',
                    borderRadius: 20,
                    width: '100%',
                    maxWidth: 420,
                    boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
                    overflow: 'hidden',
                }}
            >
                <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                    <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
                        {title}
                    </h3>
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)' }}>
                        {subtitle}
                    </p>
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label
                            style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                color: '#374151',
                                textTransform: 'uppercase',
                                display: 'block',
                                marginBottom: 8,
                            }}
                        >
                            Valor do PIX (R$)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            disabled={confirming}
                            style={{
                                width: '100%',
                                padding: '0.75rem 0.85rem',
                                borderRadius: 10,
                                border: '2px solid #E5E7EB',
                                fontSize: '1.1rem',
                                fontFamily: 'JetBrains Mono, monospace',
                                fontWeight: 700,
                                background: '#F9FAFB',
                            }}
                        />
                    </div>
                    <div
                        style={{
                            padding: '0.75rem 1rem',
                            borderRadius: 12,
                            background: '#F0FDF4',
                            border: '1.5px solid rgba(16,185,129,0.3)',
                            fontSize: '0.78rem',
                            color: '#059669',
                            lineHeight: 1.5,
                        }}
                    >
                        Uma <strong>Conta a Pagar</strong> será criada com vencimento em 5 dias. O aluno recebe notificação.
                        Gestione liquidação em <strong>Contas a pagar</strong>.
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={confirming}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                background: '#F3F4F6',
                                border: '2px solid #E5E7EB',
                                borderRadius: 12,
                                cursor: confirming ? 'not-allowed' : 'pointer',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                color: '#6B7280',
                                opacity: confirming ? 0.65 : 1,
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => onConfirm(parseFloat(amount))}
                            disabled={
                                confirming ||
                                !amount ||
                                Number.isNaN(parseFloat(amount)) ||
                                parseFloat(amount) < 0.01
                            }
                            style={{
                                flex: 2,
                                padding: '0.75rem',
                                background:
                                    confirming ||
                                    !amount ||
                                    Number.isNaN(parseFloat(amount)) ||
                                    parseFloat(amount) < 0.01
                                        ? '#E5E7EB'
                                        : 'linear-gradient(135deg, #10B981, #059669)',
                                border: 'none',
                                borderRadius: 12,
                                cursor:
                                    confirming ||
                                    !amount ||
                                    Number.isNaN(parseFloat(amount)) ||
                                    parseFloat(amount) < 0.01
                                        ? 'not-allowed'
                                        : 'pointer',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                color:
                                    confirming ||
                                    !amount ||
                                    Number.isNaN(parseFloat(amount)) ||
                                    parseFloat(amount) < 0.01
                                        ? '#9CA3AF'
                                        : '#fff',
                            }}
                        >
                            {confirming ? 'A guardar…' : 'Confirmar e gerar Conta a Pagar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
