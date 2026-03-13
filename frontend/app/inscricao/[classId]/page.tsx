'use client';

import { useEffect } from 'react';
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
    const { currentStep, setClassId, reset } = useEnrollmentStore();

    useEffect(() => {
        const classId = params.classId as string;
        if (classId) setClassId(classId);
    }, [params.classId, setClassId]);

    const pct = currentStep > 1 ? Math.round(((currentStep - 1) / (steps.length - 1)) * 100) : 0;
    const CurrentStepComponent = steps[currentStep - 1]?.component;

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #FFFDE7 0%, #F4F6FA 50%, #F0F9FF 100%)',
            padding: '2rem 1rem',
            position: 'relative',
        }}>
            {/* Dot grid */}
            <div style={{ position: 'fixed', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none', zIndex: 0 }} />

            <div style={{ maxWidth: 780, margin: '0 auto', position: 'relative', zIndex: 1 }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 11, background: '#FFD600', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.75rem', color: '#000' }}>UG</span>
                        </div>
                        <span style={{ fontFamily: 'Orbitron', fontSize: '1.5rem', fontWeight: 900, color: '#111827', letterSpacing: '0.1em' }}>UPGRADE</span>
                    </div>
                    <h1 style={{ fontFamily: 'Orbitron', fontSize: '1.25rem', fontWeight: 800, color: '#111827', marginBottom: '0.4rem' }}>
                        Formulário de Inscrição
                    </h1>
                    <p style={{ color: '#6B7280', fontSize: '0.85rem' }}>
                        Passo <strong style={{ color: '#B89B00' }}>{currentStep}</strong> de {steps.length} — {steps[currentStep - 1]?.title}
                    </p>
                </div>

                {/* Progress */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden', marginBottom: '1.25rem' }}>
                        <div style={{
                            height: '100%', width: `${pct}%`,
                            background: 'linear-gradient(90deg, #FFD600, #E6BE00)',
                            borderRadius: 3, transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                            boxShadow: '0 0 8px rgba(255,214,0,0.5)',
                        }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        {steps.map((step) => {
                            const done = currentStep > step.number;
                            const active = currentStep === step.number;
                            return (
                                <div key={step.number} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                    <div style={{
                                        width: 30, height: 30, borderRadius: '50%',
                                        background: done ? '#059669' : active ? '#FFD600' : '#F3F4F6',
                                        border: active ? '2px solid #B89B00' : done ? '2px solid #059669' : '2px solid #E5E7EB',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.7rem', fontWeight: 900,
                                        color: done ? '#fff' : active ? '#000' : '#9CA3AF',
                                        transition: 'all 0.3s',
                                        boxShadow: active ? '0 0 0 4px rgba(255,214,0,0.2)' : 'none',
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
                    background: '#FFFFFF', borderRadius: 20, padding: '2rem',
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    marginBottom: '1.25rem', position: 'relative', overflow: 'hidden',
                }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#FFD600' }} />
                    {CurrentStepComponent && <CurrentStepComponent />}
                </div>

                <div style={{ textAlign: 'center' }}>
                    <button
                        onClick={() => {
                            if (confirm('Cancelar inscrição? Todos os dados serão perdidos.')) {
                                reset();
                                router.push('/cursos');
                            }
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '0.82rem', textDecoration: 'underline' }}
                    >
                        Cancelar Inscrição
                    </button>
                </div>
            </div>
        </div>
    );
}
