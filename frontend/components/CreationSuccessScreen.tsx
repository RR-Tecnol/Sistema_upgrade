'use client';

import type { CSSProperties, ReactNode } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

export type CreationSuccessVerb = 'cadastrado' | 'adicionado';

export type CreationSuccessScreenProps = {
    title: string;
    entityName?: string | null;
    successVerb?: CreationSuccessVerb;
    secondaryLine?: string | null;
    redirectMessage: string;
    /** Fundo claro (admin) ou texto claro (inscrição / portais escuros) */
    variant?: 'light' | 'dark';
    /** `start` = canto superior esquerdo (raro); `center` = padrão para telas de sucesso */
    alinhamento?: 'start' | 'center';
    /** Protocolo de inscrição ou código exibido em destaque */
    protocol?: string | null;
    /** Blocos extras (conta criada, próximos passos, etc.) */
    children?: ReactNode;
    linksRodape?: ReactNode;
    minHeight?: string;
    className?: string;
    style?: CSSProperties;
};

/** Tela pós-cadastro / pós-envio — mesmo padrão visual em todo o sistema */
export function CreationSuccessScreen({
    title,
    entityName,
    successVerb = 'cadastrado',
    secondaryLine,
    redirectMessage,
    variant = 'light',
    alinhamento = 'center',
    protocol,
    children,
    linksRodape,
    minHeight = 'min(82vh, calc(100dvh - 9rem))',
    className,
    style,
}: CreationSuccessScreenProps) {
    const trimmed = entityName?.trim();
    const custom = secondaryLine?.trim();
    const showQuote = Boolean(custom || trimmed);
    const isDark = variant === 'dark';
    const center = alinhamento === 'center';

    const titleColor = isDark ? '#fff' : '#111827';
    const bodyColor = isDark ? '#D1D5DB' : '#374151';
    const mutedColor = isDark ? '#6B7280' : '#9CA3AF';

    return (
        <div
            className={className}
            style={{
                width: '100%',
                minHeight,
                padding: center ? '2rem 1.25rem 3rem' : '1.5rem 1.5rem 2rem 0',
                display: 'flex',
                alignItems: center ? 'center' : 'flex-start',
                justifyContent: center ? 'center' : 'flex-start',
                textAlign: center ? 'center' : 'left',
                boxSizing: 'border-box',
                ...style,
            }}
        >
            <div
                className="animate-scale-in"
                style={{
                    textAlign: center ? 'center' : 'left',
                    maxWidth: 520,
                    width: '100%',
                }}
            >
                <div
                    style={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        background: '#DCFCE7',
                        border: '2px solid #BBF7D0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1.25rem',
                        marginLeft: center ? 'auto' : undefined,
                        marginRight: center ? 'auto' : undefined,
                    }}
                >
                    <CheckCircleIcon style={{ width: 36, height: 36, color: '#059669' }} />
                </div>
                <h2
                    style={{
                        fontFamily: 'Orbitron, sans-serif',
                        fontSize: '1.25rem',
                        fontWeight: 900,
                        color: titleColor,
                        margin: '0 0 0.75rem',
                        letterSpacing: '0.04em',
                    }}
                >
                    {title}
                </h2>
                {showQuote && (
                    <p
                        style={{
                            fontSize: '0.92rem',
                            color: bodyColor,
                            margin: '0 0 1rem',
                            lineHeight: 1.6,
                        }}
                    >
                        {custom ? (
                            custom
                        ) : (
                            <>
                                &ldquo;{trimmed}&rdquo; foi {successVerb} com sucesso.
                            </>
                        )}
                    </p>
                )}
                {protocol?.trim() ? (
                    <div
                        style={{
                            padding: '1rem 1.75rem',
                            borderRadius: 14,
                            background: isDark ? 'rgba(251,191,36,0.07)' : '#FFFBEB',
                            border: isDark ? '1px solid rgba(251,191,36,0.3)' : '1px solid #FDE68A',
                            margin: '0 auto 1.25rem',
                            display: 'inline-block',
                            textAlign: 'center',
                        }}
                    >
                        <div
                            style={{
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                color: '#FBBF24',
                                textTransform: 'uppercase',
                                letterSpacing: '0.12em',
                                marginBottom: 6,
                            }}
                        >
                            Protocolo de inscrição
                        </div>
                        <div
                            style={{
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: '1.35rem',
                                fontWeight: 900,
                                color: '#F59E0B',
                                letterSpacing: '0.08em',
                            }}
                        >
                            {protocol.trim()}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: mutedColor, marginTop: 6 }}>
                            Guarde este número para consultar o status
                        </div>
                    </div>
                ) : null}
                {children}
                <p style={{ fontSize: '0.82rem', color: mutedColor, margin: children ? '1rem 0 0' : '0 0 0.5rem' }}>
                    {redirectMessage}
                </p>
                {linksRodape ? (
                    <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', justifyContent: center ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
                        {linksRodape}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
