'use client';

import { useState } from 'react';
import { useEnrollmentStore } from '@/stores/useEnrollmentStore';

export default function Step3Address() {
    const { formData, updateAddress, nextStep, prevStep } = useEnrollmentStore();
    const [data, setData] = useState(formData.address);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loadingCep, setLoadingCep] = useState(false);

    const handleChange = (field: string, value: any) => {
        setData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    };

    const fetchAddressByCep = async (cep: string) => {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return;
        setLoadingCep(true);
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const addr = await res.json();
            if (!addr.erro) {
                setData((prev) => ({
                    ...prev,
                    street: addr.logradouro || prev.street,
                    neighborhood: addr.bairro || prev.neighborhood,
                    city: addr.localidade || prev.city,
                    state: addr.uf || prev.state,
                }));
            }
        } catch { /* silencioso */ } finally { setLoadingCep(false); }
    };

    const handleCepChange = (value: string) => {
        const clean = value.replace(/\D/g, '');
        handleChange('cep', clean);
        if (clean.length === 8) fetchAddressByCep(clean);
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!data.cep) e.cep = 'CEP é obrigatório';
        else if (!/^\d{8}$/.test(data.cep.replace(/\D/g, ''))) e.cep = 'CEP inválido';
        if (!data.street) e.street = 'Logradouro é obrigatório';
        if (!data.number) e.number = 'Número é obrigatório';
        if (!data.neighborhood) e.neighborhood = 'Bairro é obrigatório';
        if (!data.city) e.city = 'Cidade é obrigatória';
        if (!data.state) e.state = 'Estado é obrigatório';
        if (!data.zone) e.zone = 'Zona é obrigatória';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleNext = () => {
        if (validate()) { updateAddress(data); nextStep(); }
    };

    const formatCep = (value: string) => value.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');

    const LABEL: React.CSSProperties = { display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: '0.45rem' };
    const ERROR: React.CSSProperties = { color: '#F87171', fontSize: '0.72rem', marginTop: '0.3rem' };
    const inp = (field: string): React.CSSProperties => ({ borderColor: errors[field] ? '#EF4444' : undefined });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: '0 0 0.25rem' }}>Endereço Residencial</h2>

            {/* CEP */}
            <div>
                <label style={LABEL}>CEP *</label>
                <div style={{ position: 'relative' }}>
                    <input
                        className="enroll-input"
                        type="text"
                        value={data.cep ? formatCep(data.cep) : ''}
                        onChange={(e) => handleCepChange(e.target.value)}
                        maxLength={9}
                        placeholder="00000-000"
                        style={inp('cep')}
                    />
                    {loadingCep && (
                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', color: '#FBBF24' }}>
                            ⏳ buscando...
                        </span>
                    )}
                </div>
                {errors.cep && <p style={ERROR}>{errors.cep}</p>}
                <p style={{ color: '#6B7280', fontSize: '0.75rem', marginTop: '0.35rem' }}>O endereço será preenchido automaticamente</p>
            </div>

            {/* Street + Number */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div>
                    <label style={LABEL}>Logradouro *</label>
                    <input className="enroll-input" type="text" value={data.street || ''} onChange={(e) => handleChange('street', e.target.value)} placeholder="Rua, Avenida..." style={inp('street')} />
                    {errors.street && <p style={ERROR}>{errors.street}</p>}
                </div>
                <div>
                    <label style={LABEL}>Número *</label>
                    <input className="enroll-input" type="text" value={data.number || ''} onChange={(e) => handleChange('number', e.target.value)} placeholder="Nº" style={inp('number')} />
                    {errors.number && <p style={ERROR}>{errors.number}</p>}
                </div>
            </div>

            {/* Complement */}
            <div>
                <label style={LABEL}>Complemento <span style={{ fontSize: '0.62rem', fontWeight: 400, color: '#6B7280' }}>(opcional)</span></label>
                <input className="enroll-input" type="text" value={data.complement || ''} onChange={(e) => handleChange('complement', e.target.value)} placeholder="Apto, Bloco, Casa..." />
            </div>

            {/* Neighborhood */}
            <div>
                <label style={LABEL}>Bairro *</label>
                <input className="enroll-input" type="text" value={data.neighborhood || ''} onChange={(e) => handleChange('neighborhood', e.target.value)} placeholder="Digite o bairro" style={inp('neighborhood')} />
                {errors.neighborhood && <p style={ERROR}>{errors.neighborhood}</p>}
            </div>

            {/* City + State */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div>
                    <label style={LABEL}>Cidade *</label>
                    <input className="enroll-input" type="text" value={data.city || ''} onChange={(e) => handleChange('city', e.target.value)} placeholder="Cidade" style={inp('city')} />
                    {errors.city && <p style={ERROR}>{errors.city}</p>}
                </div>
                <div>
                    <label style={LABEL}>Estado (UF) *</label>
                    <input className="enroll-input" type="text" value={data.state || ''} onChange={(e) => handleChange('state', e.target.value.toUpperCase())} maxLength={2} placeholder="UF" style={inp('state')} />
                    {errors.state && <p style={ERROR}>{errors.state}</p>}
                </div>
            </div>

            {/* Zone */}
            <div>
                <label style={LABEL}>Zona *</label>
                <select className="enroll-select" value={data.zone || ''} onChange={(e) => handleChange('zone', e.target.value)} style={inp('zone')}>
                    <option value="">Selecione</option>
                    <option value="URBAN">Urbana</option>
                    <option value="RURAL">Rural</option>
                </select>
                {errors.zone && <p style={ERROR}>{errors.zone}</p>}
            </div>

            {/* Nav */}
            <div className="nav-row">
                <button className="btn-back" onClick={prevStep}>← Voltar</button>
                <button className="btn-next" onClick={handleNext}>Próximo →</button>
            </div>
        </div>
    );
}
