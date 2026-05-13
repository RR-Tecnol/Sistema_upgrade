'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/api/client';
import { useEnrollmentStore } from '@/stores/useEnrollmentStore';

function maskCPF(v: string) {
    return v.replace(/\D/g, '').slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

const LABEL: React.CSSProperties = {
    display: 'block', fontSize: '0.68rem', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: '0.4rem',
};
const INPUT: React.CSSProperties = {
    width: '100%', padding: '0.7rem 1rem', borderRadius: 10,
    border: '1.5px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
    fontSize: '0.85rem', color: '#fff', outline: 'none', boxSizing: 'border-box',
};
const ERROR: React.CSSProperties = { color: '#F87171', fontSize: '0.72rem', marginTop: '0.25rem' };

export default function Step1PersonalData() {
    const { formData, updatePersonalData, nextStep } = useEnrollmentStore();
    const [data, setData] = useState({ ...formData.personalData });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showPass, setShowPass] = useState(false);
    const [cpfStatus, setCpfStatus] = useState<'idle' | 'checking' | 'new' | 'exists'>('idle');
    const [cpfMaskedEmail, setCpfMaskedEmail] = useState('');
    const cpfDebounce = useRef<ReturnType<typeof setTimeout>>();

    const set = (k: string, v: any) => {
        setData(p => ({ ...p, [k]: v }));
        setErrors(p => ({ ...p, [k]: '' }));
    };

    // CPF early-check: quando aluno termina de digitar 11 dígitos, verifica se já tem conta
    useEffect(() => {
        const cleaned = (data.cpf || '').replace(/\D/g, '');
        if (cleaned.length !== 11) { setCpfStatus('idle'); return; }

        clearTimeout(cpfDebounce.current);
        setCpfStatus('checking');
        cpfDebounce.current = setTimeout(async () => {
            try {
                const res = await api.post('/auth/check-cpf', { cpf: cleaned });
                if (res.data.exists) {
                    setCpfStatus('exists');
                    setCpfMaskedEmail(res.data.maskedEmail || '');
                } else {
                    setCpfStatus('new');
                }
            } catch {
                setCpfStatus('idle');
            }
        }, 500);
    }, [data.cpf]);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!data.fullName?.trim()) e.fullName = 'Nome completo é obrigatório';
        else if (data.fullName.split(' ').filter(Boolean).length < 2) e.fullName = 'Digite nome e sobrenome';
        if (!(data.cpf || '').replace(/\D/g, '').match(/^\d{11}$/)) e.cpf = 'CPF inválido';
        if (!data.birthDate) e.birthDate = 'Data de nascimento é obrigatória';
        if (!data.gender) e.gender = 'Gênero é obrigatório';
        if (!data.raceColor) e.raceColor = 'Raça/Cor é obrigatória';
        if (!data.maritalStatus) e.maritalStatus = 'Estado civil é obrigatório';
        if (!data.motherName?.trim()) e.motherName = 'Nome da mãe é obrigatório';
        if (!data.nationality?.trim()) e.nationality = 'Nacionalidade é obrigatória';
        if (!data.birthCity?.trim()) e.birthCity = 'Cidade de nascimento é obrigatória';
        if (!data.birthState?.trim()) e.birthState = 'Estado de nascimento é obrigatório';
        // Senha
        if (!data.password || data.password.length < 6) e.password = 'Senha de no mínimo 6 caracteres';
        if (data.password !== data.confirmPassword) e.confirmPassword = 'As senhas não coincidem';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleNext = () => {
        if (validate()) { updatePersonalData(data); nextStep(); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header da seção */}
            <div style={{ padding: '0.85rem 1rem', borderRadius: 12, background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', marginBottom: 4 }}>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.65rem', fontWeight: 900, color: '#FBBF24', letterSpacing: '0.08em', marginBottom: 4 }}>PASSO 1 — SEUS DADOS E CONTA</div>
                <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: 0 }}>
                    Ao concluir este formulário, você terá uma <strong style={{ color: '#9CA3AF' }}>conta de acesso</strong> para acompanhar sua inscrição, certificados e frequência no <strong style={{ color: '#9CA3AF' }}>Portal do Aluno</strong>.
                </p>
            </div>

            {/* CPF — verificação antecipada */}
            <div>
                <label style={LABEL}>CPF *</label>
                <div style={{ position: 'relative' }}>
                    <input style={{ ...INPUT, borderColor: cpfStatus === 'exists' ? '#DC2626' : cpfStatus === 'new' ? '#059669' : '#E5E7EB', fontFamily: 'JetBrains Mono, monospace' }}
                        placeholder="000.000.000-00" value={data.cpf || ''}
                        onChange={e => set('cpf', maskCPF(e.target.value))} maxLength={14} />
                    {cpfStatus === 'checking' && (
                        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: '#9CA3AF' }}>⏳ verificando...</span>
                    )}
                    {cpfStatus === 'new' && (
                        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: '#059669', fontWeight: 700 }}>✅ CPF disponível</span>
                    )}
                </div>
                {errors.cpf && <p style={ERROR}>{errors.cpf}</p>}
                {cpfStatus === 'exists' && (
                    <div style={{ marginTop: 8, padding: '0.75rem 1rem', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                        <p style={{ margin: '0 0 6px', fontSize: '0.78rem', color: '#F87171', fontWeight: 700 }}>
                            ⚠️ Este CPF já está cadastrado no sistema.
                        </p>
                        <p style={{ margin: '0 0 8px', fontSize: '0.74rem', color: '#9CA3AF' }}>
                            Conta associada ao e-mail: <strong style={{ color: '#D1D5DB' }}>{cpfMaskedEmail}</strong>
                        </p>
                        <Link href="/login" style={{ display: 'inline-block', padding: '0.4rem 0.9rem', borderRadius: 8, background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', color: '#000', fontWeight: 700, fontSize: '0.75rem', textDecoration: 'none' }}>
                            Fazer login para se inscrever →
                        </Link>
                        <p style={{ margin: '8px 0 0', fontSize: '0.68rem', color: '#6B7280' }}>
                            Ou continue para atualizar seus dados ao se inscrever.
                        </p>
                    </div>
                )}
            </div>

            {/* Nome e nome social */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ gridColumn: '1/-1' }}>
                    <label style={LABEL}>Nome Completo *</label>
                    <input style={{ ...INPUT, borderColor: errors.fullName ? '#DC2626' : '#E5E7EB' }} placeholder="Seu nome e sobrenome" value={data.fullName || ''} onChange={e => set('fullName', e.target.value)} />
                    {errors.fullName && <p style={ERROR}>{errors.fullName}</p>}
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                    <label style={LABEL}>Nome Social <span style={{ fontSize: '0.65rem', fontWeight: 400, color: '#9CA3AF' }}>(opcional — como você prefere ser chamado)</span></label>
                    <input style={INPUT} placeholder="Deixe em branco se não se aplica" value={data.socialName || ''} onChange={e => set('socialName', e.target.value)} />
                </div>
            </div>

            {/* Data de nascimento */}
            <div>
                <label style={LABEL}>Data de Nascimento *</label>
                <input type="date" style={{ ...INPUT, borderColor: errors.birthDate ? '#DC2626' : '#E5E7EB' }} value={data.birthDate || ''} onChange={e => set('birthDate', e.target.value)} />
                {errors.birthDate && <p style={ERROR}>{errors.birthDate}</p>}
            </div>

            {/* Gênero, Raça, Estado Civil */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                    <label style={LABEL}>Gênero *</label>
                    <select
                        className="enroll-select"
                        value={data.gender || ''}
                        onChange={e => set('gender', e.target.value)}
                        style={{ borderColor: errors.gender ? '#EF4444' : undefined }}
                    >
                        <option value="">Selecione</option>
                        <option value="MALE">Masculino</option>
                        <option value="FEMALE">Feminino</option>
                        <option value="NON_BINARY">Não-binário</option>
                        <option value="PREFER_NOT_TO_SAY">Prefiro não dizer</option>
                    </select>
                    {errors.gender && <p style={ERROR}>{errors.gender}</p>}
                </div>
                <div>
                    <label style={LABEL}>Raça/Cor *</label>
                    <select
                        className="enroll-select"
                        value={data.raceColor || ''}
                        onChange={e => set('raceColor', e.target.value)}
                        style={{ borderColor: errors.raceColor ? '#EF4444' : undefined }}
                    >
                        <option value="">Selecione</option>
                        <option value="WHITE">Branca</option>
                        <option value="BLACK">Preta</option>
                        <option value="BROWN">Parda</option>
                        <option value="YELLOW">Amarela</option>
                        <option value="INDIGENOUS">Indígena</option>
                        <option value="PREFER_NOT_TO_SAY">Prefiro não dizer</option>
                    </select>
                    {errors.raceColor && <p style={ERROR}>{errors.raceColor}</p>}
                </div>
                <div>
                    <label style={LABEL}>Estado Civil *</label>
                    <select
                        className="enroll-select"
                        value={data.maritalStatus || ''}
                        onChange={e => set('maritalStatus', e.target.value)}
                        style={{ borderColor: errors.maritalStatus ? '#EF4444' : undefined }}
                    >
                        <option value="">Selecione</option>
                        <option value="SINGLE">Solteiro(a)</option>
                        <option value="MARRIED">Casado(a)</option>
                        <option value="DIVORCED">Divorciado(a)</option>
                        <option value="WIDOWED">Viúvo(a)</option>
                        <option value="SEPARATED">Separado(a)</option>
                    </select>
                    {errors.maritalStatus && <p style={ERROR}>{errors.maritalStatus}</p>}
                </div>
            </div>

            {/* Filiação */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                    <label style={LABEL}>Nome da Mãe *</label>
                    <input style={{ ...INPUT, borderColor: errors.motherName ? '#DC2626' : '#E5E7EB' }} placeholder="Nome completo da mãe" value={data.motherName || ''} onChange={e => set('motherName', e.target.value)} />
                    {errors.motherName && <p style={ERROR}>{errors.motherName}</p>}
                </div>
                <div>
                    <label style={LABEL}>Nome do Pai <span style={{ fontSize: '0.65rem', fontWeight: 400, color: '#9CA3AF' }}>(opcional)</span></label>
                    <input style={INPUT} placeholder="Nome completo do pai" value={data.fatherName || ''} onChange={e => set('fatherName', e.target.value)} />
                </div>
            </div>

            {/* Naturalidade */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                    <label style={LABEL}>Nacionalidade *</label>
                    <input style={{ ...INPUT, borderColor: errors.nationality ? '#DC2626' : '#E5E7EB' }} placeholder="Ex: Brasileira" value={data.nationality || ''} onChange={e => set('nationality', e.target.value)} />
                    {errors.nationality && <p style={ERROR}>{errors.nationality}</p>}
                </div>
                <div>
                    <label style={LABEL}>Cidade de Nascimento *</label>
                    <input style={{ ...INPUT, borderColor: errors.birthCity ? '#DC2626' : '#E5E7EB' }} placeholder="Ex: São Luís" value={data.birthCity || ''} onChange={e => set('birthCity', e.target.value)} />
                    {errors.birthCity && <p style={ERROR}>{errors.birthCity}</p>}
                </div>
                <div>
                    <label style={LABEL}>UF *</label>
                    <input style={{ ...INPUT, borderColor: errors.birthState ? '#DC2626' : '#E5E7EB', textTransform: 'uppercase' }} placeholder="MA" maxLength={2} value={data.birthState || ''} onChange={e => set('birthState', e.target.value.toUpperCase())} />
                    {errors.birthState && <p style={ERROR}>{errors.birthState}</p>}
                </div>
            </div>

            {/* Senha */}
            <div style={{ padding: '1rem 1.25rem', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(251,191,36,0.15)' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FBBF24', marginBottom: 12 }}>🔑 CRIAR SENHA DE ACESSO</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                        <label style={LABEL}>Senha * <span style={{ fontSize: '0.62rem', fontWeight: 400, color: '#6B7280' }}>(mín. 6 caracteres)</span></label>
                        <div style={{ position: 'relative' }}>
                            <input type={showPass ? 'text' : 'password'} style={{ ...INPUT, borderColor: errors.password ? '#EF4444' : undefined, paddingRight: 40 }} placeholder="••••••••" value={data.password || ''} onChange={e => set('password', e.target.value)} />
                            <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#6B7280' }}>
                                {showPass ? '🙈' : '👁'}
                            </button>
                        </div>
                        {errors.password && <p style={ERROR}>{errors.password}</p>}
                    </div>
                    <div>
                        <label style={LABEL}>Confirmar Senha *</label>
                        <input type={showPass ? 'text' : 'password'} style={{ ...INPUT, borderColor: errors.confirmPassword ? '#EF4444' : undefined }} placeholder="••••••••" value={data.confirmPassword || ''} onChange={e => set('confirmPassword', e.target.value)} />
                        {errors.confirmPassword && <p style={ERROR}>{errors.confirmPassword}</p>}
                        {data.password && data.confirmPassword && data.password === data.confirmPassword && !errors.confirmPassword && (
                            <p style={{ color: '#34D399', fontSize: '0.72rem', marginTop: '0.25rem' }}>✅ Senhas iguais</p>
                        )}
                    </div>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '0.7rem', color: '#6B7280' }}>
                    Esta senha será usada para acessar o <strong style={{ color: '#9CA3AF' }}>Portal do Aluno</strong> — onde você acompanha sua inscrição, frequência e certificados.
                </p>
            </div>

            {/* Botão Próximo */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" onClick={handleNext} className="btn-next">
                    Próximo →
                </button>
            </div>
        </div>
    );
}
