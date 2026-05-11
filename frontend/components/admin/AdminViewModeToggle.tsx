'use client';

import type { CSSProperties } from 'react';
import type { AdminViewMode } from '@/hooks/usePersistedAdminViewMode';

/**
 * Toggle padrão Cartões | Tabela para o painel admin.
 * Estética alinhada a Contas a pagar / Viagens: Orbitron nos rótulos compactos,
 * fundo neutro, estado ativo escuro + acento dourado (#FFD600) como nas pills de filtro.
 */
export default function AdminViewModeToggle({
    mode,
    onChange,
    className,
    style,
}: {
    mode: AdminViewMode;
    onChange: (m: AdminViewMode) => void;
    className?: string;
    style?: CSSProperties;
}) {
    const btn = (active: boolean): CSSProperties => ({
        padding: '0.4rem 0.9rem',
        borderRadius: 100,
        fontSize: '0.68rem',
        fontWeight: 800,
        fontFamily: 'Orbitron, system-ui, sans-serif',
        letterSpacing: '0.06em',
        cursor: 'pointer',
        border: `1.5px solid ${active ? '#0F172A' : '#E5E7EB'}`,
        background: active ? 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)' : '#FAFAFA',
        color: active ? '#FFD600' : '#64748B',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease, color 0.18s ease',
        boxShadow: active ? '0 2px 12px rgba(15, 23, 42, 0.35), inset 0 1px 0 rgba(255,255,255,0.06)' : '0 1px 2px rgba(15, 23, 42, 0.04)',
    });

    return (
        <div
            role="group"
            aria-label="Modo de visualização"
            className={className}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                padding: '4px 6px',
                borderRadius: 999,
                border: '1px solid rgba(253, 224, 71, 0.35)',
                background: 'linear-gradient(180deg, #FFFBEB 0%, #F8FAFC 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
                ...style,
            }}
        >
            {(['card', 'table'] as const).map((m) => (
                <button
                    key={m}
                    type="button"
                    onClick={() => onChange(m)}
                    style={btn(mode === m)}
                    onMouseEnter={(e) => {
                        const el = e.currentTarget;
                        if (mode !== m) {
                            el.style.borderColor = 'rgba(253, 224, 71, 0.85)';
                            el.style.background = '#FFFEF5';
                            el.style.color = '#0F172A';
                            el.style.transform = 'translateY(-1px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        const el = e.currentTarget;
                        const active = mode === m;
                        el.style.borderColor = active ? '#0F172A' : '#E5E7EB';
                        el.style.background = active ? 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)' : '#FAFAFA';
                        el.style.color = active ? '#FFD600' : '#64748B';
                        el.style.transform = '';
                    }}
                >
                    {m === 'card' ? 'CARTÕES' : 'TABELA'}
                </button>
            ))}
        </div>
    );
}
