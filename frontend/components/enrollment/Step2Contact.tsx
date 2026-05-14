'use client';

import { useState } from 'react';
import { useEnrollmentStore } from '@/stores/useEnrollmentStore';

export default function Step2Contact() {
    const { formData, updateContact, nextStep, prevStep } = useEnrollmentStore();
    const [data, setData] = useState(formData.contact);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (field: string, value: any) => {
        setData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!data.email) e.email = 'E-mail é obrigatório';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = 'E-mail inválido';
        if (!data.phone) e.phone = 'Telefone é obrigatório';
        else if (!/^\d{10,11}$/.test(data.phone.replace(/\D/g, ''))) e.phone = 'Telefone inválido';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleNext = () => {
        if (validate()) { updateContact(data); nextStep(); }
    };

    const formatPhone = (value: string) => {
        const n = value.replace(/\D/g, '');
        if (n.length <= 10) return n.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        return n.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    };

    const S = {
        label: { display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: '0.45rem' },
        input: { width: '100%', padding: '0.7rem 1rem', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', fontSize: '0.88rem', color: '#fff', outline: 'none', boxSizing: 'border-box' as const },
        error: { color: '#F87171', fontSize: '0.72rem', marginTop: '0.3rem' },
        hint: { color: '#6B7280', fontSize: '0.75rem', marginTop: '0.35rem' },
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: '0 0 0.25rem' }}>Informações de Contato</h2>

            {/* Email */}
            <div>
                <label style={S.label}>E-mail *</label>
                <input
                    className="enroll-input"
                    type="email"
                    value={data.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="seu@email.com"
                    style={{ borderColor: errors.email ? '#EF4444' : undefined }}
                />
                {errors.email && <p style={S.error}>{errors.email}</p>}
                <p style={S.hint}>Usaremos este e-mail para enviar atualizações sobre sua inscrição</p>
            </div>

            {/* Phone */}
            <div>
                <label style={S.label}>Telefone Principal *</label>
                <input
                    className="enroll-input"
                    type="tel"
                    value={data.phone ? formatPhone(data.phone) : ''}
                    onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, ''))}
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                    style={{ borderColor: errors.phone ? '#EF4444' : undefined }}
                />
                {errors.phone && <p style={S.error}>{errors.phone}</p>}
            </div>

            {/* Has WhatsApp */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1rem', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <input
                    type="checkbox"
                    id="hasWhatsApp"
                    checked={data.hasWhatsApp || false}
                    onChange={(e) => handleChange('hasWhatsApp', e.target.checked)}
                    className="enroll-checkbox"
                />
                <label htmlFor="hasWhatsApp" style={{ color: '#D1D5DB', fontSize: '0.88rem', cursor: 'pointer' }}>
                    Este número tem WhatsApp
                </label>
            </div>

            {/* Alternative Phone */}
            <div>
                <label style={S.label}>Telefone Alternativo <span style={{ fontSize: '0.62rem', fontWeight: 400, color: '#6B7280' }}>(opcional)</span></label>
                <input
                    className="enroll-input"
                    type="tel"
                    value={data.phoneAlt ? formatPhone(data.phoneAlt) : ''}
                    onChange={(e) => handleChange('phoneAlt', e.target.value.replace(/\D/g, ''))}
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                />
            </div>

            {/* Permissions */}
            <div style={{ padding: '1rem 1.25rem', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(251,191,36,0.1)' }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FBBF24', marginBottom: '0.9rem' }}>Autorização de Contato</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {[
                        { id: 'allowWhatsAppContact', label: 'Autorizo contato via WhatsApp', field: 'allowWhatsAppContact' },
                        { id: 'allowEmailContact', label: 'Autorizo contato via E-mail', field: 'allowEmailContact' },
                    ].map(item => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <input
                                type="checkbox"
                                id={item.id}
                                checked={(data as any)[item.field] !== undefined ? (data as any)[item.field] : true}
                                onChange={(e) => handleChange(item.field, e.target.checked)}
                                className="enroll-checkbox"
                            />
                            <label htmlFor={item.id} style={{ color: '#D1D5DB', fontSize: '0.86rem', cursor: 'pointer' }}>{item.label}</label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Nav */}
            <div className="nav-row">
                <button className="btn-back" onClick={prevStep}>← Voltar</button>
                <button className="btn-next" onClick={handleNext}>Próximo →</button>
            </div>
        </div>
    );
}
