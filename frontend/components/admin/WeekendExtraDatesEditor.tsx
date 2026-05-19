'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CalendarDaysIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function isoToBr(iso: string): string {
    if (!ISO_DAY.test(iso)) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

function brToIso(br: string): string | null {
    const parts = br.trim().split('/');
    if (parts.length !== 3) return null;
    const [d, m, y] = parts;
    if (y.length !== 4) return null;
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    if (!ISO_DAY.test(iso)) return null;
    const dt = new Date(`${iso}T12:00:00.000Z`);
    if (Number.isNaN(dt.getTime())) return null;
    if (dt.getUTCFullYear() !== Number(y) || dt.getUTCMonth() + 1 !== Number(m) || dt.getUTCDate() !== Number(d)) {
        return null;
    }
    return iso;
}

function maskBrDateInput(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function DateBrPickerRow({
    iso,
    onChange,
    onRemove,
    canRemove,
    inputStyle,
}: {
    iso: string;
    onChange: (iso: string) => void;
    onRemove: () => void;
    canRemove: boolean;
    inputStyle: CSSProperties;
}) {
    const dateRef = useRef<HTMLInputElement>(null);
    const [text, setText] = useState(() => isoToBr(iso));

    useEffect(() => {
        setText(isoToBr(iso));
    }, [iso]);

    const commitText = () => {
        if (!text.trim()) {
            onChange('');
            return;
        }
        const parsed = brToIso(text);
        if (parsed) {
            onChange(parsed);
            setText(isoToBr(parsed));
        } else {
            setText(isoToBr(iso));
        }
    };

    return (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
                type="text"
                inputMode="numeric"
                placeholder="dd/mm/aaaa"
                value={text}
                onChange={e => setText(maskBrDateInput(e.target.value))}
                onBlur={commitText}
                onKeyDown={e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        commitText();
                    }
                }}
                style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                aria-label="Data com aula"
            />
            <input
                ref={dateRef}
                type="date"
                value={ISO_DAY.test(iso) ? iso : ''}
                onChange={e => {
                    const v = e.target.value;
                    onChange(v);
                    setText(isoToBr(v));
                }}
                tabIndex={-1}
                aria-hidden
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
            />
            <button
                type="button"
                title="Abrir calendário"
                onClick={() => dateRef.current?.showPicker?.()}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.55rem 0.65rem',
                    borderRadius: 8,
                    border: '1px solid #E5E7EB',
                    background: '#fff',
                    cursor: 'pointer',
                    flexShrink: 0,
                }}
            >
                <CalendarDaysIcon style={{ width: 20, height: 20, color: '#374151' }} />
            </button>
            {canRemove && (
                <button
                    type="button"
                    title="Remover data"
                    onClick={onRemove}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.5rem',
                        borderRadius: 8,
                        border: '1px solid #FECACA',
                        background: '#FEF2F2',
                        cursor: 'pointer',
                        flexShrink: 0,
                    }}
                >
                    <XMarkIcon style={{ width: 18, height: 18, color: '#DC2626' }} />
                </button>
            )}
        </div>
    );
}

export function WeekendExtraDatesEditor({
    dates,
    onChange,
    onDirty,
    inputStyle,
    labelStyle,
}: {
    dates: string[];
    onChange: (dates: string[]) => void;
    onDirty: () => void;
    inputStyle: CSSProperties;
    labelStyle: CSSProperties;
}) {
    const rows = dates.length > 0 ? dates : [''];

    const update = (next: string[]) => {
        onChange(next);
        onDirty();
    };

    return (
        <div style={{ marginTop: '0.75rem' }}>
            <label style={labelStyle}>Datas com aula em fim de semana</label>
            <p style={{ fontSize: '0.7rem', color: '#78350F', margin: '0 0 0.65rem', lineHeight: 1.45 }}>
                Formato <strong>dd/mm/aaaa</strong>. Use o ícone de calendário ou o botão + para incluir outro dia.
            </p>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
                {rows.map((iso, i) => (
                    <DateBrPickerRow
                        key={`we-${i}-${iso || 'empty'}`}
                        iso={iso}
                        canRemove={rows.length > 1}
                        onChange={v => {
                            const next = [...rows];
                            next[i] = v;
                            update(next);
                        }}
                        onRemove={() => update(rows.filter((_, j) => j !== i))}
                        inputStyle={inputStyle}
                    />
                ))}
            </div>
            <button
                type="button"
                onClick={() => update([...rows, ''])}
                style={{
                    marginTop: '0.65rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.5rem 0.9rem',
                    borderRadius: 8,
                    border: '1px solid #FCD34D',
                    background: '#FFFBEB',
                    color: '#92400E',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                }}
            >
                <PlusIcon style={{ width: 16, height: 16 }} />
                Adicionar data
            </button>
            {rows.some(d => ISO_DAY.test(d)) && (
                <div style={{ marginTop: '0.65rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {rows.filter(d => ISO_DAY.test(d)).map(d => (
                        <span
                            key={d}
                            style={{
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                padding: '0.25rem 0.55rem',
                                borderRadius: 6,
                                background: '#FEF9C3',
                                color: '#854D0E',
                                border: '1px solid #FDE047',
                            }}
                        >
                            {isoToBr(d)}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
