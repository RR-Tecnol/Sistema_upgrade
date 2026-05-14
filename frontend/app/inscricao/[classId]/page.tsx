'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEnrollmentStore } from '@/stores/useEnrollmentStore';
import { CheckIcon } from '@heroicons/react/24/solid';
import Step1PersonalData from '@/components/enrollment/Step1PersonalData';
import Step2Contact from '@/components/enrollment/Step2Contact';
import Step3Address from '@/components/enrollment/Step3Address';
import Step4Socioeconomic from '@/components/enrollment/Step4Socioeconomic';
import Step5Professional from '@/components/enrollment/Step5Professional';
import Step6Documents from '@/components/enrollment/Step6Documents';
import Step7Terms from '@/components/enrollment/Step7Terms';
import Step8Confirmation from '@/components/enrollment/Step8Confirmation';
import PreEnrollmentGate from '@/components/enrollment/PreEnrollmentGate';

const steps = [
    { number: 1, title: 'Dados Pessoais', component: Step1PersonalData },
    { number: 2, title: 'Contato', component: Step2Contact },
    { number: 3, title: 'Endereço', component: Step3Address },
    { number: 4, title: 'Socioeconômico', component: Step4Socioeconomic },
    { number: 5, title: 'Profissional', component: Step5Professional },
    { number: 6, title: 'Documentos', component: Step6Documents },
    { number: 7, title: 'Termos', component: Step7Terms },
    { number: 8, title: 'Confirmação', component: Step8Confirmation },
];

export default function EnrollmentPage() {
    const params = useParams();
    const router = useRouter();
    const { currentStep, classId: storedClassId, setClassId, reset } = useEnrollmentStore();
    const [confirmCancel, setConfirmCancel] = useState(false);
    // gateShown: false = mostra tela de pre-gate; true = entrou no formulário
    const [gateShown, setGateShown] = useState(false);

    useEffect(() => {
        const classId = params.classId as string;
        if (classId) {
            // Se mudou de turma, reinicia tudo
            if (classId !== storedClassId) {
                reset();
                setGateShown(false);
            }
            setClassId(classId);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.classId]);

    const pct = currentStep > 1 ? Math.round(((currentStep - 1) / (steps.length - 1)) * 100) : 0;
    const CurrentStepComponent = steps[currentStep - 1]?.component;

    return (
        <div style={{
            minHeight: '100vh',
            background: '#080808',
            padding: '2rem 1rem',
            position: 'relative',
            fontFamily: '"Inter", system-ui, sans-serif',
            color: '#fff',
        }}>
            {/* Grid background */}
            <div style={{
                position: 'fixed', inset: 0,
                backgroundImage: 'linear-gradient(rgba(251,191,36,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.03) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
                pointerEvents: 'none', zIndex: 0,
            }} />
            {/* Glow orb */}
            <div style={{
                position: 'fixed', top: '-10%', left: '50%', transform: 'translateX(-50%)',
                width: 600, height: 400,
                background: 'radial-gradient(ellipse at top, rgba(251,191,36,0.07) 0%, transparent 70%)',
                pointerEvents: 'none', zIndex: 0,
            }} />

            <style suppressHydrationWarning>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulseGlow {
                    0%,100% { box-shadow: 0 0 20px rgba(251,191,36,0.3); }
                    50% { box-shadow: 0 0 40px rgba(251,191,36,0.6); }
                }
                .enroll-input {
                    width: 100%;
                    padding: 0.7rem 1rem;
                    border-radius: 10px;
                    border: 1.5px solid rgba(255,255,255,0.08);
                    background: rgba(255,255,255,0.04);
                    font-size: 0.88rem;
                    color: #fff;
                    outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    box-sizing: border-box;
                }
                .enroll-input::placeholder { color: #4B5563; }
                .enroll-input:focus {
                    border-color: rgba(251,191,36,0.6);
                    box-shadow: 0 0 0 3px rgba(251,191,36,0.1);
                }
                .enroll-input:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .enroll-select {
                    width: 100%;
                    padding: 0.7rem 1rem;
                    border-radius: 10px;
                    border: 1.5px solid rgba(255,255,255,0.08);
                    background: rgba(255,255,255,0.04);
                    font-size: 0.88rem;
                    color: #fff;
                    outline: none;
                    cursor: pointer;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    color-scheme: dark;
                    box-sizing: border-box;
                }
                .enroll-select option { background: #111827; color: #fff; }
                .enroll-select:focus {
                    border-color: rgba(251,191,36,0.6);
                    box-shadow: 0 0 0 3px rgba(251,191,36,0.1);
                }
                .enroll-label {
                    display: block;
                    font-size: 0.68rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: #9CA3AF;
                    margin-bottom: 0.45rem;
                }
                .enroll-error { color: #F87171; font-size: 0.72rem; margin-top: 0.3rem; }
                .enroll-hint { color: #6B7280; font-size: 0.75rem; margin-top: 0.35rem; }
                .btn-next {
                    padding: 0.8rem 2rem;
                    border-radius: 12px;
                    border: none;
                    background: linear-gradient(135deg, #FBBF24, #F59E0B);
                    color: #000;
                    font-weight: 800;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.25s;
                    box-shadow: 0 4px 20px rgba(251,191,36,0.3);
                    position: relative;
                    overflow: hidden;
                }
                .btn-next::before {
                    content: '';
                    position: absolute;
                    top: 0; left: -100%; width: 100%; height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
                    transition: left 0.4s;
                }
                .btn-next:hover::before { left: 100%; }
                .btn-next:hover { transform: scale(1.04); box-shadow: 0 0 30px rgba(251,191,36,0.5); }
                .btn-next:disabled { background: #374151; color: #6B7280; cursor: not-allowed; box-shadow: none; transform: none; }
                .btn-back {
                    padding: 0.8rem 1.75rem;
                    border-radius: 12px;
                    border: 1px solid rgba(251,191,36,0.3);
                    background: transparent;
                    color: #FBBF24;
                    font-weight: 600;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.25s;
                }
                .btn-back:hover {
                    background: rgba(251,191,36,0.08);
                    border-color: rgba(251,191,36,0.7);
                }
                .enroll-checkbox {
                    width: 18px; height: 18px;
                    border-radius: 5px;
                    accent-color: #FBBF24;
                    cursor: pointer;
                    flex-shrink: 0;
                }
                .enroll-card {
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(251,191,36,0.12);
                    border-radius: 14px;
                    padding: 1.25rem 1.5rem;
                }
                .enroll-section-title {
                    font-size: 0.65rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.12em;
                    color: #FBBF24;
                    margin-bottom: 1rem;
                }
                .step-h2 {
                    font-size: 1.3rem;
                    font-weight: 800;
                    color: #fff;
                    margin-bottom: 1.5rem;
                }
                .nav-row {
                    display: flex;
                    justify-content: space-between;
                    padding-top: 1.5rem;
                    margin-top: 1rem;
                    border-top: 1px solid rgba(255,255,255,0.06);
                    flex-wrap: wrap;
                    gap: 0.75rem;
                }
            `}</style>

            <div style={{ maxWidth: 780, margin: '0 auto', position: 'relative', zIndex: 1 }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem', animation: 'fadeUp 0.6s ease both' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{
                            width: 42, height: 42, borderRadius: 12,
                            background: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            animation: 'pulseGlow 2s ease-in-out infinite',
                        }}>
                            <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: '#000' }}>U</span>
                        </div>
                        <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.4rem', fontWeight: 900, color: '#fff', letterSpacing: '0.1em' }}>UPGRADE</span>
                    </div>
                    <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1rem', fontWeight: 800, color: '#9CA3AF', marginBottom: '0.35rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Formulário de Inscrição
                    </h1>
                    <p style={{ color: '#6B7280', fontSize: '0.83rem' }}>
                        Passo <strong style={{ color: '#FBBF24' }}>{currentStep}</strong> de {steps.length} — {steps[currentStep - 1]?.title}
                    </p>
                </div>

                {/* Progress */}
                <div style={{ marginBottom: '2rem' }}>
                    {/* Bar */}
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: '1.25rem' }}>
                        <div style={{
                            height: '100%', width: `${pct}%`,
                            background: 'linear-gradient(90deg, #FBBF24, #F59E0B)',
                            borderRadius: 2, transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                            boxShadow: '0 0 12px rgba(251,191,36,0.5)',
                        }} />
                    </div>
                    {/* Dots */}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        {steps.map((step) => {
                            const done = currentStep > step.number;
                            const active = currentStep === step.number;
                            return (
                                <div key={step.number} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                    <div style={{
                                        width: 30, height: 30, borderRadius: '50%',
                                        background: done
                                            ? 'linear-gradient(135deg, #059669, #047857)'
                                            : active
                                                ? 'linear-gradient(135deg, #FBBF24, #F59E0B)'
                                                : 'rgba(255,255,255,0.04)',
                                        border: active
                                            ? '2px solid #FBBF24'
                                            : done
                                                ? '2px solid #059669'
                                                : '1px solid rgba(255,255,255,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.68rem', fontWeight: 900,
                                        color: done ? '#fff' : active ? '#000' : '#4B5563',
                                        transition: 'all 0.3s',
                                        boxShadow: active ? '0 0 0 4px rgba(251,191,36,0.15)' : done ? '0 0 0 3px rgba(5,150,105,0.15)' : 'none',
                                    }}>
                                        {done ? <CheckIcon style={{ width: 13, height: 13 }} /> : step.number}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Form card */}
                <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 20,
                    padding: '2rem',
                    border: '1px solid rgba(251,191,36,0.12)',
                    boxShadow: '0 0 50px rgba(251,191,36,0.04), 0 20px 40px rgba(0,0,0,0.3)',
                    marginBottom: '1.25rem',
                    position: 'relative',
                    overflow: 'hidden',
                    animation: 'fadeUp 0.5s ease both',
                }}>
                    {/* Top accent line */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                        background: 'linear-gradient(90deg, transparent, #FBBF24, transparent)',
                    }} />
                    {/* Grid animated bg */}
                    <div style={{
                        position: 'absolute', inset: 0, pointerEvents: 'none',
                        backgroundImage: 'linear-gradient(rgba(251,191,36,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.02) 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                    }} />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        {!gateShown ? (
                            <PreEnrollmentGate
                                classId={params.classId as string}
                                onContinueNew={() => setGateShown(true)}
                            />
                        ) : (
                            CurrentStepComponent && <CurrentStepComponent />
                        )}
                    </div>
                </div>

                {/* Cancel */}
                {!confirmCancel ? (
                    <div style={{ textAlign: 'center' }}>
                        <button
                            onClick={() => setConfirmCancel(true)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4B5563', fontSize: '0.8rem', textDecoration: 'underline' }}
                        >
                            Cancelar Inscrição
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', padding: '0.75rem', borderRadius: 12, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}>
                        <span style={{ fontSize: '0.82rem', color: '#F87171', fontWeight: 600 }}>⚠️ Cancelar inscrição? Todos os dados serão perdidos.</span>
                        <button onClick={() => { reset(); router.push('/cursos'); }}
                            style={{ padding: '0.35rem 0.9rem', borderRadius: 8, background: '#DC2626', border: 'none', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>Sim, cancelar</button>
                        <button onClick={() => setConfirmCancel(false)}
                            style={{ padding: '0.35rem 0.9rem', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#9CA3AF', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>Continuar</button>
                    </div>
                )}
            </div>
        </div>
    );
}
