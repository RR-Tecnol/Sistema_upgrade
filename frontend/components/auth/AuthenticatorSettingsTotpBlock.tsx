'use client';

import { useId } from 'react';

export type AuthenticatorSettingsTotpVariant = 'setup' | 'disabling';

export interface AuthenticatorSettingsTotpBlockProps {
    variant: AuthenticatorSettingsTotpVariant;
    qrCodeUrl?: string | null;
    value: string;
    onChange: (digits: string) => void;
    error?: string | null;
    onCancel: () => void;
    onConfirm: () => void;
    loading?: boolean;
    confirmDisabled?: boolean;
}

const YELLOW = '#FFD600';
const BLACK = '#0F172A';
const WHITE = '#fff';

export default function AuthenticatorSettingsTotpBlock({
    variant,
    qrCodeUrl,
    value,
    onChange,
    error,
    onCancel,
    onConfirm,
    loading = false,
    confirmDisabled = false,
}: AuthenticatorSettingsTotpBlockProps) {
    const inputId = useId();
    const isSetup = variant === 'setup';
    const canConfirm = !confirmDisabled && !loading;

    return (
        <div
            style={{
                width: 'min(100%, 320px)',
                minWidth: 260,
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                alignItems: 'stretch',
            }}
        >
            {isSetup && qrCodeUrl ? (
                <div
                    style={{
                        textAlign: 'center',
                        padding: '1.1rem 1rem',
                        background: WHITE,
                        borderRadius: 14,
                        border: `2px solid ${YELLOW}`,
                        boxShadow: '0 8px 28px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(0,0,0,0.04)',
                    }}
                >
                    <img src={qrCodeUrl} alt="QR Code para Google Authenticator" style={{ width: 160, height: 160, display: 'block', margin: '0 auto' }} />
                    <div
                        style={{
                            fontSize: '0.72rem',
                            color: '#475569',
                            marginTop: 10,
                            lineHeight: 1.45,
                            fontWeight: 600,
                        }}
                    >
                        Escaneie com <strong style={{ color: BLACK }}>Google Authenticator</strong> ou <strong style={{ color: BLACK }}>Authy</strong>
                    </div>
                </div>
            ) : null}

            {!isSetup ? (
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#334155', lineHeight: 1.5, fontWeight: 600 }}>
                    Digite o código de <strong style={{ color: BLACK }}>6 dígitos</strong> do app para confirmar a desativação.
                </p>
            ) : null}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
                <label
                    htmlFor={inputId}
                    style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: '#64748B',
                    }}
                >
                    Código do Authenticator
                </label>
                <span style={{ fontSize: '0.72rem', color: '#64748B', marginTop: -4, lineHeight: 1.35 }}>
                    Seis números exibidos no app (atualizam a cada 30 segundos).
                </span>
                <input
                    id={inputId}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={value}
                    onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="• • • • • •"
                    aria-label="Código de 6 dígitos do Google Authenticator"
                    style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '14px 18px',
                        borderRadius: 12,
                        border: `2px solid ${value.length > 0 ? YELLOW : '#E2E8F0'}`,
                        background: value.length > 0 ? '#FFFBEB' : WHITE,
                        fontSize: '1.85rem',
                        fontWeight: 800,
                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                        letterSpacing: '0.45em',
                        textAlign: 'center',
                        color: BLACK,
                        outline: 'none',
                        boxShadow: value.length > 0 ? '0 0 0 3px rgba(255, 214, 0, 0.35)' : 'none',
                        transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
                    }}
                />
            </div>

            {error ? (
                <div
                    style={{
                        fontSize: '0.75rem',
                        color: '#B91C1C',
                        fontWeight: 600,
                        padding: '0.55rem 0.75rem',
                        borderRadius: 10,
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                    }}
                >
                    {error}
                </div>
            ) : null}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                    type="button"
                    onClick={onCancel}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: 10,
                        border: '2px solid #E2E8F0',
                        background: WHITE,
                        color: BLACK,
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                    }}
                >
                    Cancelar
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={!canConfirm}
                    style={{
                        padding: '0.5rem 1.15rem',
                        borderRadius: 10,
                        border: 'none',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: canConfirm ? 'pointer' : 'not-allowed',
                        ...(isSetup
                            ? {
                                  background: canConfirm ? YELLOW : '#E5E7EB',
                                  color: canConfirm ? BLACK : '#9CA3AF',
                                  boxShadow: canConfirm ? '0 4px 14px rgba(255, 214, 0, 0.45)' : 'none',
                              }
                            : {
                                  background: canConfirm ? '#DC2626' : '#E5E7EB',
                                  color: canConfirm ? '#fff' : '#9CA3AF',
                                  boxShadow: canConfirm ? '0 4px 14px rgba(220, 38, 38, 0.25)' : 'none',
                              }),
                    }}
                >
                    {loading ? (isSetup ? 'Ativando...' : 'Desativando...') : isSetup ? 'Confirmar e ativar' : 'Confirmar desativação'}
                </button>
            </div>
        </div>
    );
}
