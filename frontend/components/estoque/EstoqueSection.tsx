'use client';

import React, { useState } from 'react';

// ═══════════════════════════════════════════════════════════════════
//   Animações compartilhadas (mesmo motion-language dos KPIs)
//   Prefixo `est-sec-` para não colidir com keyframes de outras telas.
// ═══════════════════════════════════════════════════════════════════
export const ESTOQUE_SECTION_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
@keyframes est-sec-fade-up { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
@keyframes est-sec-scan { 0%,100%{top:0;opacity:.55} 50%{top:100%;opacity:.18} }
@keyframes est-sec-grid { 0%,100%{opacity:.06} 50%{opacity:.14} }
@keyframes est-sec-ring { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes est-sec-pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.35)} }
@keyframes est-sec-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
`;

// ═══════════════════════════════════════════════════════════════════
//   EstoqueSection — container padronizado de seção
// ═══════════════════════════════════════════════════════════════════
interface EstoqueSectionProps {
    children: React.ReactNode;
    /** ms de atraso do fade-up para encadear seções. */
    delay?: number;
    /** Cor de destaque (linha lateral + accent topo). Default amarelo do tema. */
    accent?: string;
    /** Esconde animações internas (scan/grid/ring) — útil quando há muito conteúdo dentro. */
    minimal?: boolean;
}

export function EstoqueSection({ children, delay = 0, accent = '#FFD600', minimal = false }: EstoqueSectionProps) {
    const [hov, setHov] = useState(false);
    return (
        <section
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '1.4rem 1.5rem 1.25rem',
                borderRadius: 18,
                background: '#FFFFFF',
                borderStyle: 'solid',
                borderWidth: '1px 1px 1px 4px',
                borderTopColor: `${accent}25`,
                borderRightColor: `${accent}25`,
                borderBottomColor: `${accent}25`,
                borderLeftColor: accent,
                boxShadow: hov
                    ? `0 0 28px ${accent}22, 0 10px 28px rgba(0,0,0,.07)`
                    : `0 2px 10px rgba(0,0,0,.05)`,
                animation: `est-sec-fade-up .5s ${delay}ms both`,
                transition: 'box-shadow .3s',
            }}>
            {!minimal && (
                <>
                    <div style={{
                        position: 'absolute', inset: 0, pointerEvents: 'none',
                        backgroundImage: `linear-gradient(${accent}07 1px,transparent 1px),linear-gradient(90deg,${accent}07 1px,transparent 1px)`,
                        backgroundSize: '24px 24px',
                        animation: 'est-sec-grid 5s ease-in-out infinite',
                    }} />
                    <div style={{
                        position: 'absolute', left: 0, right: 0, height: 1.5,
                        background: `linear-gradient(90deg,transparent,${accent}45,transparent)`,
                        animation: 'est-sec-scan 4s ease-in-out infinite',
                        top: 0, pointerEvents: 'none',
                    }} />
                </>
            )}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg,transparent,${accent},transparent)`,
                opacity: hov ? 1 : 0.5, transition: 'opacity .3s', pointerEvents: 'none',
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
                {children}
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════════
//   EstoqueSectionHeader — header padronizado (ícone gradient + título + ação)
// ═══════════════════════════════════════════════════════════════════
interface EstoqueSectionHeaderProps {
    icon: string;
    title: string;
    subtitle?: string;
    accent?: string;
    /** Slot à direita (Link "Ver todos →" ou botão). */
    action?: React.ReactNode;
    /** Quando true, mostra o dot pulsando ao lado do ícone (status "ativo"). */
    pulse?: boolean;
}

export function EstoqueSectionHeader({
    icon, title, subtitle, accent = '#FFD600', action, pulse = true,
}: EstoqueSectionHeaderProps) {
    return (
        <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            gap: 16, marginBottom: 16,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div style={{
                    position: 'relative',
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: `linear-gradient(135deg, ${accent}25, ${accent}08)`,
                    border: `1px solid ${accent}50`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem',
                    boxShadow: `0 0 10px ${accent}30`,
                }}>
                    <span style={{ animation: 'est-sec-float 3.4s ease-in-out infinite' }}>{icon}</span>
                    {pulse && (
                        <div style={{
                            position: 'absolute', top: -3, right: -3,
                            width: 8, height: 8, borderRadius: '50%',
                            background: accent,
                            boxShadow: `0 0 6px ${accent}`,
                            animation: 'est-sec-pulse-dot 1.8s infinite',
                        }} />
                    )}
                </div>
                <div style={{ minWidth: 0 }}>
                    <h3 style={{
                        fontFamily: 'Orbitron, sans-serif', fontWeight: 800,
                        fontSize: '0.95rem', letterSpacing: '0.08em',
                        color: '#111827', margin: 0, textTransform: 'uppercase',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {title}
                    </h3>
                    {subtitle && (
                        <p style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 3, marginBottom: 0, lineHeight: 1.4 }}>
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
            {action && (
                <div style={{ flexShrink: 0 }}>{action}</div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//   EstoqueSectionAction — link/botão de ação padronizado para o header
// ═══════════════════════════════════════════════════════════════════
interface EstoqueSectionActionProps {
    href?: string;
    onClick?: () => void;
    children: React.ReactNode;
    accent?: string;
}

export function EstoqueSectionAction({ href, onClick, children, accent = '#B89B00' }: EstoqueSectionActionProps) {
    const baseStyle: React.CSSProperties = {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 9,
        fontFamily: 'Orbitron, sans-serif', fontWeight: 700,
        fontSize: '0.66rem', letterSpacing: '0.08em', textTransform: 'uppercase',
        color: accent,
        background: `${accent}10`,
        border: `1px solid ${accent}30`,
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'all .2s',
    };
    if (href) {
        // import Link dinamicamente é overkill; o pai usa <a> via Next/link no consumidor
        return <a href={href} style={baseStyle}>{children}</a>;
    }
    return <button type="button" onClick={onClick} style={baseStyle}>{children}</button>;
}

// ═══════════════════════════════════════════════════════════════════
//   EstoqueEmptyState — vazio padronizado dentro de uma seção
// ═══════════════════════════════════════════════════════════════════
export function EstoqueEmptyState({ icon, label }: { icon: string; label: string }) {
    return (
        <div style={{
            padding: '2.5rem 1rem', textAlign: 'center',
            color: '#9CA3AF', fontSize: '0.78rem',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
            <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: '#F9FAFB', border: '1px dashed #E5E7EB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem',
            }}>{icon}</div>
            <span style={{ fontWeight: 600 }}>{label}</span>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//   EstoqueLoadingState — loading padronizado dentro de uma seção
// ═══════════════════════════════════════════════════════════════════
export function EstoqueLoadingState({ label = 'Carregando…' }: { label?: string }) {
    return (
        <div style={{
            padding: '2.5rem 1rem', textAlign: 'center',
            color: '#9CA3AF', fontSize: '0.78rem',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
            <div style={{
                width: 36, height: 36, borderRadius: '50%',
                border: '2px solid #F3F4F6', borderTopColor: '#FFD600',
                animation: 'est-sec-ring 0.9s linear infinite',
            }} />
            <span style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.7rem' }}>
                {label}
            </span>
        </div>
    );
}
