'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { acoesApi } from '@/lib/api/acoes';
import { WIZARD_INPUT } from './acao-wizard-styles';

export function CidadeAutocomplete({
    value,
    cidadeId,
    onChange,
}: {
    value: string;
    cidadeId: string;
    onChange: (nome: string, id: string) => void;
}) {
    const [sugestoes, setSugestoes] = useState<{ id: string; name: string; state: string }[]>([]);
    const [open, setOpen] = useState(false);
    const debounce = useRef<NodeJS.Timeout>();
    const wrapRef = useRef<HTMLDivElement>(null);

    const buscar = useCallback((q: string) => {
        clearTimeout(debounce.current);
        if (q.length < 2) {
            setSugestoes([]);
            return;
        }
        debounce.current = setTimeout(async () => {
            try {
                const res = await acoesApi.searchCidades(q);
                setSugestoes(res);
                setOpen(true);
            } catch {
                setSugestoes([]);
            }
        }, 280);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value, '');
        buscar(e.target.value);
    };

    const selecionar = (c: { id: string; name: string; state: string }) => {
        onChange(`${c.name}, ${c.state}`, c.id);
        setSugestoes([]);
        setOpen(false);
    };

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    return (
        <div ref={wrapRef} style={{ position: 'relative' }}>
            <input
                style={{
                    ...WIZARD_INPUT,
                    border: `1.5px solid ${cidadeId ? '#FFD600' : '#E5E7EB'}`,
                }}
                placeholder="Ex: Imperatriz, MA"
                value={value}
                onChange={handleChange}
                onFocus={() => sugestoes.length > 0 && setOpen(true)}
                autoComplete="off"
            />
            {cidadeId && (
                <span
                    style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '0.68rem',
                        background: '#FFFDE7',
                        color: '#B89B00',
                        padding: '2px 7px',
                        borderRadius: 6,
                        border: '1px solid #FEF08A',
                        fontWeight: 700,
                    }}
                >
                    ✓ Vinculada
                </span>
            )}
            {open && sugestoes.length > 0 && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 9999,
                        background: '#fff',
                        border: '1.5px solid #E5E7EB',
                        borderRadius: 10,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        marginTop: 4,
                        overflow: 'hidden',
                    }}
                >
                    {sugestoes.map(c => (
                        <div
                            key={c.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => selecionar(c)}
                            style={{
                                padding: '10px 14px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                borderBottom: '1px solid #F3F4F6',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = '#FFFDE7';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = '#fff';
                            }}
                        >
                            <span style={{ fontSize: '0.75rem' }}>📍</span>
                            <span style={{ fontWeight: 600 }}>{c.name}</span>
                            <span style={{ color: '#9CA3AF', fontSize: '0.78rem' }}>{c.state}</span>
                        </div>
                    ))}
                    <div style={{ padding: '8px 14px', fontSize: '0.75rem', color: '#9CA3AF', background: '#FAFBFC' }}>
                        Ou continue digitando para usar este nome livremente
                    </div>
                </div>
            )}
        </div>
    );
}
