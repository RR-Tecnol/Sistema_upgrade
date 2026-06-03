'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api/client';
import {
    UserIcon,
    AcademicCapIcon,
    TruckIcon,
    CheckCircleIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { CreationSuccessScreen } from '@/components/CreationSuccessScreen';

type Role = 'TEACHER' | 'DRIVER';

interface FormData {
    // Step 1 — Perfil
    role: Role | '';
    name: string;
    email: string;
    phone: string;
    cpf: string;
    password: string;
    confirmPassword: string;
    // Step 2 — Dados pessoais
    birthDate: string;
    gender: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
    // Step 3 — Específico por papel
    specialty: string;
    licenseNumber: string;
    licenseCategory: string;
    experienceYears: string;
}

const INITIAL: FormData = {
    role: '', name: '', email: '', phone: '', cpf: '', password: '', confirmPassword: '',
    birthDate: '', gender: '', street: '', number: '', neighborhood: '', city: '', state: 'MA', cep: '',
    specialty: '', licenseNumber: '', licenseCategory: 'B', experienceYears: '',
};

function maskCPF(v: string) {
    return v.replace(/\D/g, '').slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskPhone(v: string) {
    return v.replace(/\D/g, '').slice(0, 11)
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

export default function RegistroPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<FormData>(INITIAL);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const set = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));

    const validateStep = () => {
        setError('');
        if (step === 1) {
            if (!form.role) return setError('Selecione um perfil'), false;
            if (!form.name.trim() || form.name.split(' ').length < 2) return setError('Digite o nome completo'), false;
            if (!form.email.includes('@')) return setError('E-mail inválido'), false;
            if (form.cpf.replace(/\D/g, '').length !== 11) return setError('CPF inválido'), false;
            if (form.password.length < 6) return setError('Senha mínima de 6 caracteres'), false;
            if (form.password !== form.confirmPassword) return setError('Senhas não coincidem'), false;
        }
        if (step === 2) {
            if (!form.birthDate) return setError('Data de nascimento é obrigatória'), false;
            if (!form.cep.replace(/\D/g, '')) return setError('CEP é obrigatório'), false;
        }
        if (step === 3) {
            if (form.role === 'TEACHER' && !form.specialty.trim()) return setError('Informe sua especialidade'), false;
            if (form.role === 'DRIVER' && !form.licenseNumber.trim()) return setError('Informe o número da CNH'), false;
        }
        return true;
    };

    const handleNext = () => { if (validateStep()) setStep(s => s + 1); };
    const handleBack = () => { setError(''); setStep(s => s - 1); };

    const handleSubmit = async () => {
        if (!validateStep()) return;
        setLoading(true);
        setError('');
        try {
            await api.post('/register', {
                role: form.role,
                name: form.name.trim(),
                email: form.email.trim(),
                phone: form.phone,
                cpf: form.cpf.replace(/\D/g, ''),
                password: form.password,
                birthDate: form.birthDate || undefined,
                gender: form.gender || undefined,
                street: form.street || undefined,
                number: form.number || undefined,
                neighborhood: form.neighborhood || undefined,
                city: form.city || undefined,
                state: form.state || undefined,
                cep: form.cep.replace(/\D/g, '') || undefined,
                specialty: form.specialty || undefined,
                licenseNumber: form.licenseNumber || undefined,
                licenseCategory: form.licenseCategory || undefined,
                experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
            });
            setSuccess(true);
        } catch (err: any) {
            const msg = err?.response?.data?.message;
            setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Erro ao enviar cadastro. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const STEPS = ['Perfil', 'Dados', 'Especialização'];

    if (success) {
        return (
            <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <div style={{ width: '100%', maxWidth: 520 }}>
                    <CreationSuccessScreen
                        title="CADASTRO ENVIADO!"
                        entityName={form.name.trim()}
                        redirectMessage="Aguarde a aprovação do administrador. Você receberá um e-mail quando sua conta for liberada."
                        alinhamento="center"
                        minHeight="auto"
                        linksRodape={(
                            <Link href="/login" style={{ display: 'inline-block', padding: '0.75rem 2rem', borderRadius: 10, background: '#FFD600', color: '#000', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}>
                                Ir para o Login
                            </Link>
                        )}
                    />
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <style>{`
            .reg-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
            @media (max-width: 480px) {
                .reg-2col { grid-template-columns: 1fr; }
            }
        `}</style>
            <div style={{ width: '100%', maxWidth: 540 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <img src="/logo-upgrade.png" alt="Upgrade" style={{ height: 48, objectFit: 'contain' }} />
                    <p style={{ color: '#9CA3AF', fontSize: '0.78rem', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Auto-Cadastro de Profissionais
                    </p>
                </div>

                {/* Step indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '2rem' }}>
                    {STEPS.map((label, i) => {
                        const n = i + 1;
                        const done = step > n;
                        const active = step === n;
                        return (
                            <div key={n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                                {i > 0 && <div style={{ position: 'absolute', left: 0, top: 17, width: '50%', height: 2, background: done ? '#FFD600' : '#E5E7EB' }} />}
                                {i < STEPS.length - 1 && <div style={{ position: 'absolute', right: 0, top: 17, width: '50%', height: 2, background: step > n ? '#FFD600' : '#E5E7EB' }} />}
                                <div style={{
                                    width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: done ? '#FFD600' : active ? '#111827' : '#E5E7EB',
                                    color: done ? '#000' : active ? '#FFD600' : '#9CA3AF',
                                    fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.75rem', zIndex: 1, border: active ? '2px solid #FFD600' : 'none',
                                    transition: 'all 0.3s',
                                }}>
                                    {done ? '✓' : n}
                                </div>
                                <div style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: active ? '#111827' : '#9CA3AF', marginTop: '0.35rem' }}>
                                    {label}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Card */}
                <div style={{ background: '#fff', borderRadius: 20, padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB' }}>
                    {error && (
                        <div style={{ padding: '0.75rem 1rem', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.82rem', fontWeight: 600, marginBottom: '1.25rem' }}>
                            ⚠️ {error}
                        </div>
                    )}

                    {/* ── STEP 1: PERFIL ── */}
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <h2 style={{ fontFamily: 'Orbitron', fontSize: '1rem', fontWeight: 900, color: '#111827', marginBottom: '0.3rem' }}>Qual é seu perfil?</h2>
                                <p style={{ fontSize: '0.78rem', color: '#6B7280' }}>Selecione como você vai atuar no programa Upgrade.</p>
                            </div>
                            <div className="reg-2col">
                                {([
                                    { role: 'TEACHER', label: 'Professor', desc: 'Ministra cursos profissionalizantes', icon: <AcademicCapIcon style={{ width: 28 }} /> },
                                    { role: 'DRIVER', label: 'Motorista', desc: 'Operador de carreta-escola', icon: <TruckIcon style={{ width: 28 }} /> },
                                ] as const).map(opt => (
                                    <button key={opt.role} type="button" onClick={() => set('role', opt.role)}
                                        style={{
                                            padding: '1.25rem 1rem', borderRadius: 14, textAlign: 'center', cursor: 'pointer',
                                            border: `2px solid ${form.role === opt.role ? '#FFD600' : '#E5E7EB'}`,
                                            background: form.role === opt.role ? '#FFFDE7' : '#FAFAFA',
                                            transition: 'all 0.2s',
                                        }}>
                                        <div style={{ color: form.role === opt.role ? '#B89B00' : '#9CA3AF', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>{opt.icon}</div>
                                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#111827', marginBottom: '0.2rem' }}>{opt.label}</div>
                                        <div style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{opt.desc}</div>
                                    </button>
                                ))}
                            </div>
                            <div className="reg-2col">
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Nome Completo *</label>
                                    <input className="form-input" placeholder="João da Silva" value={form.name} onChange={e => set('name', e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>E-mail *</label>
                                    <input className="form-input" type="email" placeholder="joao@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>CPF *</label>
                                    <input className="form-input" placeholder="000.000.000-00" value={form.cpf} onChange={e => set('cpf', maskCPF(e.target.value))} style={{ fontFamily: 'JetBrains Mono' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Telefone</label>
                                    <input className="form-input" placeholder="(99) 99999-9999" value={form.phone} onChange={e => set('phone', maskPhone(e.target.value))} style={{ fontFamily: 'JetBrains Mono' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Senha *</label>
                                    <input className="form-input" type="password" placeholder="Mín. 6 caracteres" value={form.password} onChange={e => set('password', e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Confirmar Senha *</label>
                                    <input className="form-input" type="password" placeholder="Repita a senha" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 2: DADOS PESSOAIS ── */}
                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <h2 style={{ fontFamily: 'Orbitron', fontSize: '1rem', fontWeight: 900, color: '#111827', marginBottom: '0.3rem' }}>Dados Pessoais</h2>
                                <p style={{ fontSize: '0.78rem', color: '#6B7280' }}>Informe seus dados pessoais e endereço.</p>
                            </div>
                            <div className="reg-2col">
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Data de Nascimento *</label>
                                    <input className="form-input" type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Gênero</label>
                                    <select className="form-input" value={form.gender} onChange={e => set('gender', e.target.value)}>
                                        <option value="">Selecione...</option>
                                        <option value="MALE">Masculino</option>
                                        <option value="FEMALE">Feminino</option>
                                        <option value="OTHER">Outro / Prefiro não informar</option>
                                    </select>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Rua</label>
                                    <input className="form-input" placeholder="Rua / Avenida" value={form.street} onChange={e => set('street', e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Número</label>
                                    <input className="form-input" placeholder="123" value={form.number} onChange={e => set('number', e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>CEP *</label>
                                    <input className="form-input" placeholder="00000-000" value={form.cep} onChange={e => set('cep', e.target.value)} style={{ fontFamily: 'JetBrains Mono' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Bairro</label>
                                    <input className="form-input" placeholder="Bairro" value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Cidade</label>
                                    <input className="form-input" placeholder="São Luís" value={form.city} onChange={e => set('city', e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Estado</label>
                                    <select className="form-input" value={form.state} onChange={e => set('state', e.target.value)}>
                                        <option value="MA">Maranhão (MA)</option>
                                        <option value="PI">Piauí (PI)</option>
                                        <option value="PA">Pará (PA)</option>
                                        <option value="TO">Tocantins (TO)</option>
                                        <option value="outros">Outro</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 3: ESPECIALIZAÇÃO ── */}
                    {step === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <h2 style={{ fontFamily: 'Orbitron', fontSize: '1rem', fontWeight: 900, color: '#111827', marginBottom: '0.3rem' }}>
                                    {form.role === 'TEACHER' ? '🎓 Informações do Professor' : '🚛 Informações do Motorista'}
                                </h2>
                                <p style={{ fontSize: '0.78rem', color: '#6B7280' }}>Informações específicas do seu perfil profissional.</p>
                            </div>

                            {form.role === 'TEACHER' && (
                                <div style={{ display: 'grid', gap: '0.75rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Especialidade / Área de Atuação *</label>
                                        <input className="form-input" placeholder="Ex: Informática, Costura Industrial, Gastronomia..." value={form.specialty} onChange={e => set('specialty', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Anos de Experiência</label>
                                        <input className="form-input" type="number" min="0" placeholder="Ex: 5" value={form.experienceYears} onChange={e => set('experienceYears', e.target.value)} />
                                    </div>
                                </div>
                            )}

                            {form.role === 'DRIVER' && (
                                <div className="reg-2col">
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Número da CNH *</label>
                                        <input className="form-input" placeholder="00000000000" value={form.licenseNumber} onChange={e => set('licenseNumber', e.target.value)} style={{ fontFamily: 'JetBrains Mono' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Categoria CNH *</label>
                                        <select className="form-input" value={form.licenseCategory} onChange={e => set('licenseCategory', e.target.value)}>
                                            <option value="B">B</option>
                                            <option value="C">C</option>
                                            <option value="D">D</option>
                                            <option value="E">E</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Anos de Experiência</label>
                                        <input className="form-input" type="number" min="0" placeholder="Ex: 3" value={form.experienceYears} onChange={e => set('experienceYears', e.target.value)} />
                                    </div>
                                </div>
                            )}

                            {/* Resumo antes de enviar */}
                            <div style={{ padding: '1rem', borderRadius: 12, background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: '0.78rem', color: '#6B7280' }}>
                                <div style={{ fontWeight: 700, color: '#374151', marginBottom: '0.5rem' }}>📋 Confirme seus dados:</div>
                                <div><strong>Nome:</strong> {form.name}</div>
                                <div><strong>E-mail:</strong> {form.email}</div>
                                <div><strong>CPF:</strong> {form.cpf}</div>
                                <div><strong>Perfil:</strong> {form.role === 'TEACHER' ? 'Professor' : 'Motorista'}</div>
                            </div>
                        </div>
                    )}

                    {/* Navegação */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem' }}>
                        {step > 1 && (
                            <button type="button" onClick={handleBack}
                                style={{ flex: 1, padding: '0.75rem', borderRadius: 12, border: '1.5px solid #E5E7EB', background: 'transparent', color: '#6B7280', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                                <ArrowLeftIcon style={{ width: 14 }} /> Voltar
                            </button>
                        )}
                        {step < 3 ? (
                            <button type="button" onClick={handleNext}
                                style={{ flex: 2, padding: '0.75rem', borderRadius: 12, background: '#FFD600', border: 'none', color: '#000', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                                Próximo <ArrowRightIcon style={{ width: 14 }} />
                            </button>
                        ) : (
                            <button type="button" onClick={handleSubmit} disabled={loading}
                                style={{ flex: 2, padding: '0.75rem', borderRadius: 12, background: '#059669', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', opacity: loading ? 0.7 : 1 }}>
                                {loading ? 'Enviando...' : <><CheckCircleIcon style={{ width: 16 }} /> Enviar Cadastro</>}
                            </button>
                        )}
                    </div>
                </div>

                {/* Link login */}
                <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: '#9CA3AF' }}>
                    Já tem conta?{' '}
                    <Link href="/login" style={{ color: '#FFD600', fontWeight: 700, textDecoration: 'none' }}>Fazer login</Link>
                </p>
            </div>
        </div>
    );
}
