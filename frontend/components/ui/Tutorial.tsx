'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';

export interface TutorialStep {
    title: string;
    description: string;
    icon: string;
}

interface TutorialProps {
    storageKey: string;
    steps: TutorialStep[];
    portalName: string;
    /** Quando true, força exibição mesmo se já visto */
    forceOpen?: boolean;
    onClose?: () => void;
}

export function TutorialButton({ onClick }: { onClick: () => void }) {
    return (
        <button onClick={onClick} title="Ajuda — Tutorial do portal"
            style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 8000, width: 44, height: 44, borderRadius: '50%', background: '#FFD600', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(255,214,0,0.45)', fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.1rem', color: '#000', transition: 'transform 0.2s, box-shadow 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.12)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(255,214,0,0.6)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(255,214,0,0.45)'; }}>
            ?
        </button>
    );
}

export default function Tutorial({ storageKey, steps, portalName, forceOpen, onClose }: TutorialProps) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (forceOpen) { setOpen(true); setStep(0); document.body.style.overflow = 'hidden'; return; }
        const seen = localStorage.getItem(storageKey);
        if (!seen) { setOpen(true); document.body.style.overflow = 'hidden'; }
    }, [storageKey, forceOpen]);

    const close = () => {
        localStorage.setItem(storageKey, '1');
        setOpen(false);
        document.body.style.overflow = '';
        onClose?.();
    };

    if (!open) return null;
    const current = steps[step];
    const isLast = step === steps.length - 1;
    const progress = Math.round(((step + 1) / steps.length) * 100);

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div className="animate-scale-in" style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem 1rem', background: 'linear-gradient(135deg, #111827, #1F2937)', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,214,0,0.06) 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div>
                            <div style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', fontWeight: 800, color: '#FFD600', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Bem-vindo ao</div>
                            <div style={{ fontFamily: 'Orbitron', fontSize: '0.95rem', fontWeight: 900, color: '#fff', letterSpacing: '0.06em' }}>{portalName}</div>
                        </div>
                        <button onClick={close} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <XMarkIcon style={{ width: 16, height: 16 }} />
                        </button>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: '#FFD600', borderRadius: 2, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ marginTop: '0.35rem', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Passo {step + 1} de {steps.length}</div>
                </div>
                <div style={{ padding: '1.75rem 1.5rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '0.75rem', lineHeight: 1 }}>{current.icon}</div>
                        <h3 style={{ fontFamily: 'Orbitron', fontSize: '0.9rem', fontWeight: 900, color: '#111827', marginBottom: '0.6rem', letterSpacing: '0.04em' }}>{current.title}</h3>
                        <p style={{ fontSize: '0.85rem', color: '#6B7280', lineHeight: 1.65 }}>{current.description}</p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginBottom: '1.25rem' }}>
                        {steps.map((_, i) => (
                            <button key={i} onClick={() => setStep(i)} style={{ width: i === step ? 20 : 8, height: 8, borderRadius: 4, background: i === step ? '#FFD600' : '#E5E7EB', border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: 0 }} />
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                        {step > 0 && (
                            <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, padding: '0.7rem', borderRadius: 12, border: '1.5px solid #E5E7EB', background: '#F9FAFB', color: '#6B7280', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                                <ChevronLeftIcon style={{ width: 15, height: 15 }} /> Anterior
                            </button>
                        )}
                        <button onClick={isLast ? close : () => setStep(s => s + 1)}
                            style={{ flex: 2, padding: '0.7rem', borderRadius: 12, border: 'none', background: isLast ? '#059669' : '#FFD600', color: isLast ? '#fff' : '#000', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', boxShadow: `0 4px 14px ${isLast ? 'rgba(5,150,105,0.35)' : 'rgba(255,214,0,0.35)'}`, transition: 'all 0.2s' }}>
                            {isLast ? '✅ Entendido!' : <><span>Próximo</span> <ChevronRightIcon style={{ width: 15, height: 15 }} /></>}
                        </button>
                    </div>
                    <button onClick={close} style={{ display: 'block', width: '100%', marginTop: '0.6rem', padding: '0.45rem', background: 'none', border: 'none', color: '#9CA3AF', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}>
                        Não mostrar novamente
                    </button>
                </div>
            </div>
        </div>
    );
}
