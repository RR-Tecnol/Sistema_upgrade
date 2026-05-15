'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type RelatorioPeriodOption = { value: string; label: string };

type Props = {
    value: string;
    onChange: (value: string) => void;
    options: RelatorioPeriodOption[];
    'aria-label': string;
    /** Largura mínima do gatilho e do painel (px) */
    minWidth?: number;
    /** Classe extra no botão (ex.: animação de entrada) */
    triggerClassName?: string;
    /** Estilos inline no gatilho (ex.: animação) */
    triggerStyle?: CSSProperties;
};

const DROPDOWN_Z = 120_000;

export default function RelatorioPeriodDropdown({
    value,
    onChange,
    options,
    'aria-label': ariaLabel,
    minWidth = 200,
    triggerClassName = '',
    triggerStyle,
}: Props) {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const listId = useId();

    const selected = options.find((o) => o.value === value) ?? options[0];
    const label = selected?.label ?? value;

    const updateMenuRect = useCallback(() => {
        const el = btnRef.current;
        if (!el) return;
        const menu = menuRef.current;
        const r = el.getBoundingClientRect();
        const w = Math.max(r.width, minWidth);
        if (menu) {
            menu.style.top = `${r.bottom + 8}px`;
            menu.style.left = `${r.left}px`;
            menu.style.minWidth = `${w}px`;
        }
    }, [minWidth]);

    useEffect(() => setMounted(true), []);

    useLayoutEffect(() => {
        if (!open) return;
        updateMenuRect();
    }, [open, updateMenuRect, options.length]);

    useEffect(() => {
        if (!open) return;
        const onScroll = () => updateMenuRect();
        const onResize = () => updateMenuRect();
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onResize);
        };
    }, [open, updateMenuRect]);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            const t = e.target as Node;
            if (btnRef.current?.contains(t)) return;
            if (menuRef.current?.contains(t)) return;
            setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const toggle = () => {
        setOpen((o) => !o);
    };

    const pick = (v: string) => {
        onChange(v);
        setOpen(false);
    };

    const menu = mounted && open && (
        <div
            ref={menuRef}
            className="relatorio-upgrade-dd-panel"
            style={{ zIndex: DROPDOWN_Z }}
            role="listbox"
            id={listId}
            aria-label={ariaLabel}
        >
            {options.map((opt) => {
                const isSel = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="option"
                        aria-selected={isSel}
                        className={`relatorio-upgrade-dd-option${isSel ? ' relatorio-upgrade-dd-option--selected' : ''}`}
                        onClick={() => pick(opt.value)}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );

    return (
        <>
            <button
                type="button"
                ref={btnRef}
                className={`relatorio-upgrade-dd-trigger ${triggerClassName}`.trim()}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                onClick={toggle}
                style={{ minWidth, ...triggerStyle }}
            >
                <span className="relatorio-upgrade-dd-trigger-text">{label}</span>
                <span className={`relatorio-upgrade-dd-chevron${open ? ' relatorio-upgrade-dd-chevron--open' : ''}`} aria-hidden />
            </button>
            {menu ? createPortal(menu, document.body) : null}
        </>
    );
}

