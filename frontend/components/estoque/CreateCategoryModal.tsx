'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { stockApi, StockCategory } from '@/lib/api/stock';

/**
 * Modal compacto para o admin criar uma nova categoria customizada de StockItem.
 * Coexiste com os 8 enums default — o backend gera slug, força isDefault=false
 * e força o enum `categoria` do item para 'OUTRO' quando uma custom é vinculada.
 *
 * IMPORTANTE: usa createPortal(document.body) para escapar de stacking contexts
 * dos componentes pais (transform/filter/perspective fazem `position: fixed`
 * virar relativo ao ancestral, o que reduzia o backdrop a só uma parte da tela).
 */
const EMOJI_PRESETS = ['🎁', '🚧', '🛠️', '🪛', '🔋', '🧰', '🎨', '📱', '💼', '🎯', '⚙️', '🪪', '🎒', '🩹', '🧪'];
const COLOR_PRESETS = ['#FF8C42', '#7C3AED', '#10B981', '#3B82F6', '#DC2626', '#F59E0B', '#0891B2', '#EC4899', '#14B8A6'];

interface Props {
    open: boolean;
    onClose: () => void;
    onCreated: (cat: StockCategory) => void;
}

export function CreateCategoryModal({ open, onClose, onCreated }: Props) {
    const [nome, setNome] = useState('');
    const [icon, setIcon] = useState('🎁');
    const [color, setColor] = useState('#FF8C42');
    const [draftColor, setDraftColor] = useState('#FF8C42');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [showPicker, setShowPicker] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Garante que document.body só seja referenciado no client (evita SSR mismatch)
    useEffect(() => { setMounted(true); }, []);

    // Bloqueia scroll do body enquanto o modal está aberto
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [open]);

    // Fecha com ESC
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open || !mounted) return null;

    const submit = async () => {
        setErr(null);
        if (nome.trim().length < 2) {
            setErr('Nome muito curto (mínimo 2 caracteres)');
            return;
        }
        setSaving(true);
        try {
            const created = await stockApi.categories.create({
                nome: nome.trim(),
                icon,
                color,
                description: description.trim() || undefined,
            });
            onCreated(created);
            setNome('');
            setDescription('');
        } catch (e: any) {
            setErr(e?.response?.data?.message ?? 'Erro ao criar categoria');
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div
            onClick={onClose}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                width: '100vw', height: '100vh',
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 600000, padding: '1.5rem',
                animation: 'cat-modal-fade .18s ease-out',
            }}>
            <style>{`
                @keyframes cat-modal-fade { from { opacity: 0; } to { opacity: 1; } }
                @keyframes cat-modal-pop { from { opacity: 0; transform: translateY(12px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
                .cat-modal .react-colorful { width: 100%; height: 200px; }
                .cat-modal .react-colorful__saturation { border-radius: 10px 10px 0 0; }
                .cat-modal .react-colorful__hue { height: 22px; border-radius: 0 0 10px 10px; }
                .cat-modal .react-colorful__pointer { width: 22px; height: 22px; }
            `}</style>
            <div
                className="cat-modal"
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#fff', borderRadius: 16,
                    maxWidth: 540, width: '100%',
                    maxHeight: 'calc(100vh - 3rem)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)',
                    overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                    animation: 'cat-modal-pop .22s ease-out',
                }}>
                <div style={{
                    padding: '1rem 1.25rem', background: '#111827', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexShrink: 0,
                }}>
                    <div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.65, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Orbitron, sans-serif', fontWeight: 700 }}>Estoque</div>
                        <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: '1.05rem', marginTop: 2 }}>+ Nova categoria customizada</div>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Fechar" style={{
                        background: 'transparent', color: '#fff', border: 'none',
                        fontSize: '1.6rem', cursor: 'pointer', lineHeight: 1, padding: 4,
                    }}>×</button>
                </div>

                <div style={{
                    padding: '1.25rem', display: 'grid', gap: '1rem',
                    overflowY: 'auto', flex: 1,
                }}>
                    <div>
                        <label style={LABEL}>Nome da categoria *</label>
                        <input value={nome} onChange={(e) => setNome(e.target.value)}
                            placeholder="Ex: Brinquedos, Sinalização, Tecnologia..."
                            maxLength={60} style={INPUT}/>
                    </div>

                    <div>
                        <label style={LABEL}>Ícone</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {EMOJI_PRESETS.map((e) => (
                                <button key={e} type="button" onClick={() => setIcon(e)} style={{
                                    width: 38, height: 38, borderRadius: 10, fontSize: '1.15rem',
                                    background: icon === e ? `${color}20` : '#F9FAFB',
                                    border: `1.5px solid ${icon === e ? color : '#E5E7EB'}`,
                                    cursor: 'pointer',
                                }}>{e}</button>
                            ))}
                            <input value={icon} onChange={(e) => setIcon(e.target.value)}
                                placeholder="🎯" maxLength={4}
                                style={{ ...INPUT, width: 70, textAlign: 'center', padding: '0.45rem' }}/>
                        </div>
                    </div>

                    <div>
                        <label style={LABEL}>Cor</label>
                        {/* Linha 1: presets + swatch da cor personalizada (se houver) + toggle do picker */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 10 }}>
                            {COLOR_PRESETS.map((c) => {
                                const isActive = color.toLowerCase() === c.toLowerCase();
                                return (
                                    <button key={c} type="button" onClick={() => { setColor(c); setDraftColor(c); }} style={{
                                        width: 32, height: 32, borderRadius: 9,
                                        background: c, cursor: 'pointer',
                                        border: isActive ? '3px solid #111827' : '1.5px solid #E5E7EB',
                                        boxShadow: isActive ? `0 0 10px ${c}80` : 'none',
                                        transition: 'all .15s',
                                    }} title={c}/>
                                );
                            })}

                            {/* Swatch da cor personalizada — só aparece quando a cor confirmada não é um preset */}
                            {(() => {
                                const isCustom = !COLOR_PRESETS.some(
                                    (c) => c.toLowerCase() === color.toLowerCase(),
                                );
                                if (!isCustom) return null;
                                return (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDraftColor(color);
                                            setShowPicker(true);
                                        }}
                                        title={`Cor personalizada (${color.toUpperCase()}) — clique para editar`}
                                        style={{
                                            position: 'relative',
                                            width: 32, height: 32, borderRadius: 9,
                                            background: color, cursor: 'pointer',
                                            border: '3px solid #111827',
                                            boxShadow: `0 0 10px ${color}80`,
                                            transition: 'all .15s',
                                            display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
                                        }}>
                                        <span style={{
                                            position: 'absolute', top: -6, right: -6,
                                            background: '#111827', color: '#FFD600',
                                            fontSize: '0.55rem', fontWeight: 900,
                                            padding: '1px 5px', borderRadius: 999,
                                            fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.05em',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                                        }}>★</span>
                                    </button>
                                );
                            })()}

                            <button
                                type="button"
                                onClick={() => {
                                    setDraftColor(color);
                                    setShowPicker((s) => !s);
                                }}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '6px 12px', borderRadius: 9, cursor: 'pointer',
                                    background: showPicker ? color : '#F9FAFB',
                                    color: showPicker ? '#fff' : '#374151',
                                    border: `1.5px solid ${showPicker ? color : '#E5E7EB'}`,
                                    fontFamily: 'Orbitron, sans-serif', fontWeight: 700,
                                    fontSize: '0.66rem', letterSpacing: '0.06em', textTransform: 'uppercase',
                                    boxShadow: showPicker ? `0 0 10px ${color}55` : 'none',
                                    transition: 'all .15s',
                                }}>
                                🎨 {showPicker ? 'Fechar paleta' : 'Paleta completa'}
                            </button>
                        </div>

                        {/* Paleta de cores expandida (HSV picker visual) */}
                        {showPicker && (
                            <div style={{
                                padding: '0.8rem',
                                borderRadius: 12,
                                background: '#FAFAFA',
                                border: '1px solid #E5E7EB',
                                display: 'flex', flexDirection: 'column', gap: 10,
                            }}>
                                <HexColorPicker color={draftColor} onChange={setDraftColor} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 10,
                                        background: draftColor, border: '1.5px solid #E5E7EB',
                                        boxShadow: `0 0 12px ${draftColor}40`,
                                        flexShrink: 0,
                                    }} />
                                    <div style={{ flex: 1 }}>
                                        <label style={{ ...LABEL, fontSize: '0.55rem', marginBottom: 4 }}>HEX</label>
                                        <HexColorInput
                                            color={draftColor}
                                            onChange={setDraftColor}
                                            prefixed
                                            style={{
                                                ...INPUT,
                                                fontFamily: 'JetBrains Mono, monospace',
                                                fontWeight: 700, letterSpacing: '0.08em',
                                                textTransform: 'uppercase',
                                            }}
                                        />
                                    </div>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                    paddingTop: 2,
                                }}>
                                    <div style={{ fontSize: '0.66rem', color: '#6B7280', lineHeight: 1.35 }}>
                                        Cor selecionada na paleta: <strong style={{ color: draftColor }}>{draftColor.toUpperCase()}</strong>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setColor(draftColor);
                                            setShowPicker(false);
                                        }}
                                        style={{
                                            flexShrink: 0,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '8px 12px',
                                            borderRadius: 10,
                                            border: 'none',
                                            cursor: 'pointer',
                                            background: `linear-gradient(135deg, ${draftColor}, ${draftColor}CC)`,
                                            color: '#fff',
                                            fontFamily: 'Orbitron, sans-serif',
                                            fontWeight: 800,
                                            fontSize: '0.68rem',
                                            letterSpacing: '0.06em',
                                            textTransform: 'uppercase',
                                            boxShadow: `0 0 14px ${draftColor}55`,
                                        }}
                                    >
                                        ✓ Usar esta cor
                                    </button>
                                </div>
                                <p style={{ fontSize: '0.66rem', color: '#9CA3AF', margin: 0, lineHeight: 1.4 }}>
                                    Arraste o ponto na área superior e confirme em “Usar esta cor”. Só a cor confirmada será salva na categoria.
                                </p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label style={LABEL}>Descrição (opcional)</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                            placeholder="Quando usar esta categoria?" rows={2} maxLength={300}
                            style={{ ...INPUT, resize: 'vertical', fontFamily: 'inherit' }}/>
                    </div>

                    {/* PRÉVIA */}
                    <div style={{
                        padding: '0.8rem 1rem', borderRadius: 12,
                        background: `${color}10`, border: `1.5px solid ${color}40`,
                        display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 11,
                            background: `${color}25`, border: `1.5px solid ${color}80`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem',
                            flexShrink: 0,
                            boxShadow: `0 0 10px ${color}30`,
                        }}>{icon}</div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 800, color: color, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {nome || 'Prévia da categoria'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {description || 'Sem descrição'}
                            </div>
                        </div>
                    </div>

                    {err && (
                        <div style={{
                            padding: '0.65rem 0.9rem', borderRadius: 10,
                            background: '#FEF2F2', border: '1px solid #FECACA',
                            color: '#991B1B', fontSize: '0.8rem', fontWeight: 600,
                        }}>{err}</div>
                    )}
                </div>

                {/* Footer fixo */}
                <div style={{
                    padding: '0.9rem 1.25rem',
                    background: '#FAFAFA',
                    borderTop: '1px solid #E5E7EB',
                    display: 'flex', gap: 8, justifyContent: 'flex-end',
                    flexShrink: 0,
                }}>
                    <button type="button" onClick={onClose} disabled={saving} style={BTN_GHOST}>Cancelar</button>
                    <button type="button" onClick={submit} disabled={saving || !nome.trim()} style={{
                        ...BTN_PRIMARY,
                        opacity: saving || !nome.trim() ? 0.6 : 1,
                        cursor: saving || !nome.trim() ? 'not-allowed' : 'pointer',
                    }}>
                        {saving ? 'Salvando…' : '+ Criar categoria'}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

const LABEL: React.CSSProperties = {
    display: 'block', fontSize: '0.65rem', fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: '0.1em',
    color: '#6B7280', marginBottom: '0.4rem',
    fontFamily: 'Orbitron, sans-serif',
};

const INPUT: React.CSSProperties = {
    width: '100%', padding: '0.55rem 0.8rem', borderRadius: 10,
    border: '1.5px solid #E5E7EB', background: '#F9FAFB',
    fontSize: '0.85rem', color: '#111827', outline: 'none', boxSizing: 'border-box',
};

const BTN_GHOST: React.CSSProperties = {
    padding: '0.6rem 1.1rem', borderRadius: 10, fontSize: '0.8rem',
    fontWeight: 700, background: '#fff', color: '#374151',
    border: '1.5px solid #E5E7EB', cursor: 'pointer',
    fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.04em',
};

const BTN_PRIMARY: React.CSSProperties = {
    padding: '0.6rem 1.2rem', borderRadius: 10, fontSize: '0.8rem',
    fontWeight: 800, background: '#111827', color: '#FFD600',
    border: 'none',
    fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.06em',
    boxShadow: '0 4px 14px rgba(255,214,0,0.25)',
};
