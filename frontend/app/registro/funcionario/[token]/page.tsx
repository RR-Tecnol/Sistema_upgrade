'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { CreationSuccessScreen } from '@/components/CreationSuccessScreen';

/* ── Particle System ───────────────────────────────── */
function ParticleField() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number; color: string }[] = [];
        const colors = ['255,214,0', '16,185,129', '8,145,178', '139,92,246'];
        for (let i = 0; i < 40; i++) {
            particles.push({
                x: Math.random() * canvas.width, y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
                r: Math.random() * 2 + 0.5, a: Math.random(),
                color: colors[Math.floor(Math.random() * colors.length)],
            });
        }
        let raf: number;
        function animate() {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                p.a += 0.005;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${p.color}, ${Math.max(0.1, Math.sin(p.a) * 0.5 + 0.5)})`;
                ctx.fill();
            });
            raf = requestAnimationFrame(animate);
        }
        animate();
        const handleResize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
        window.addEventListener('resize', handleResize);
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', handleResize); };
    }, []);
    return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />;
}

const ROLE_LABELS: Record<string, string> = {
    INSTRUCTOR: 'Professor(a) / Instrutor(a)',
    DRIVER: 'Motorista',
    COORDINATOR: 'Coordenador(a)',
    ADMINISTRATIVE: 'Administrativo(a)',
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

function onlyDigits(value: string) {
    return value.replace(/\D/g, '');
}

function formatCpf(value: string) {
    const d = onlyDigits(value).slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatPhone(value: string) {
    const d = onlyDigits(value).slice(0, 11);
    if (!d) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function formatCep(value: string) {
    const d = onlyDigits(value).slice(0, 8);
    if (d.length <= 5) return d;
    return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/* ── Generic Upload Component ───────────────────────────────── */
function FileUploadField({ label, onUpload, value, required = false }: { label: string, onUpload: (url: string) => void, value: string, required?: boolean }) {
    const [uploading, setUploading] = useState(false);
    
    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const res = await axios.post(`${API_BASE_URL}/public/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onUpload(res.data.url);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Erro ao fazer upload do arquivo.');
        } finally {
            setUploading(false);
        }
    };
    
    return (
        <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>{label} {required && '*'}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input type="file" accept=".pdf,image/*" onChange={handleFile} disabled={uploading} style={{ display: 'none' }} id={`file-${label}`} />
                <label htmlFor={`file-${label}`} style={{ background: '#E5E7EB', padding: '0.6rem 1.2rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                    {uploading ? 'Enviando...' : 'Escolher Arquivo'}
                </label>
                {value && <a href={value} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 600 }}>Ver Arquivo Anexado ✓</a>}
            </div>
        </div>
    );
}

export default function RegistroFuncionarioPage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tokenData, setTokenData] = useState<{ role: string; department: string } | null>(null);

    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    // Common Text Fields
    const [name, setName] = useState('');
    const [cpf, setCpf] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [cep, setCep] = useState('');
    const [street, setStreet] = useState('');
    const [number, setNumber] = useState('');
    const [addressNoNumber, setAddressNoNumber] = useState(false);
    const [addressNoNumberNote, setAddressNoNumberNote] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [city, setCity] = useState('');
    const [stateUf, setStateUf] = useState('');
    const [cepLoading, setCepLoading] = useState(false);

    // Common Uploads
    const [docUrl, setDocUrl] = useState('');
    const [addressUrl, setAddressUrl] = useState('');
    const [selfieUrl, setSelfieUrl] = useState('');
    const [criminalRecordUrl, setCriminalRecordUrl] = useState('');
    const [noCriminalRecord, setNoCriminalRecord] = useState(false);

    // Teacher Fields
    const [education, setEducation] = useState('');
    const [fieldOfStudy, setFieldOfStudy] = useState('');
    const [professionalReg, setProfessionalReg] = useState('');
    const [diplomaUrl, setDiplomaUrl] = useState('');
    const [certificatesUrl, setCertificatesUrl] = useState('');
    const [experienceUrl, setExperienceUrl] = useState('');

    // Driver Fields
    const [cnhNumber, setCnhNumber] = useState('');
    const [cnhCategory, setCnhCategory] = useState('');
    const [cnhExpiration, setCnhExpiration] = useState('');
    const [cnhUrl, setCnhUrl] = useState('');
    const [transportCourseUrl, setTransportCourseUrl] = useState('');
    const [toxicologicalUrl, setToxicologicalUrl] = useState('');
    const [cnhRecordUrl, setCnhRecordUrl] = useState('');

    // Coordinator Fields
    const [experienceTime, setExperienceTime] = useState('');
    const [specializationUrl, setSpecializationUrl] = useState('');

    // Acesso
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (!token) return;
        const validateToken = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/employees/registration/${token}`);
                setTokenData(res.data);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Link inválido ou expirado.');
            } finally {
                setLoading(false);
            }
        };
        validateToken();
    }, [token]);

    useEffect(() => {
        const digits = onlyDigits(cep);
        if (digits.length !== 8) return;
        let cancelled = false;
        const fetchCep = async () => {
            setCepLoading(true);
            try {
                const res = await axios.get(`https://viacep.com.br/ws/${digits}/json/`);
                const data = res.data || {};
                if (cancelled || data.erro) return;
                setStreet((prev) => prev || data.logradouro || '');
                setNeighborhood((prev) => prev || data.bairro || '');
                setCity((prev) => prev || data.localidade || '');
                setStateUf((prev) => prev || data.uf || '');
            } catch {
                // Consulta CEP falhou - mantém preenchimento manual
            } finally {
                if (!cancelled) setCepLoading(false);
            }
        };
        fetchCep();
        return () => { cancelled = true; };
    }, [cep]);

    const handleSubmit = async () => {
        if (password !== confirmPassword) {
            alert('As senhas não coincidem!');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name,
                cpf: onlyDigits(cpf),
                email,
                phone: onlyDigits(phone),
                birthDate: birthDate ? new Date(birthDate).toISOString() : undefined,
                submittedData: {
                    address: {
                        cep: onlyDigits(cep),
                        street,
                        number: addressNoNumber ? 'S/N' : number,
                        noNumber: addressNoNumber,
                        noNumberNote: addressNoNumber ? addressNoNumberNote : '',
                        neighborhood,
                        city,
                        stateUf,
                    },
                    documents: { docUrl, addressUrl, selfieUrl, criminalRecordUrl: noCriminalRecord ? 'Não possui' : criminalRecordUrl },
                    ...(isTeacher ? { teacher: { education, fieldOfStudy, professionalReg, diplomaUrl, certificatesUrl, experienceUrl } } : {}),
                    ...(isDriver ? { driver: { cnhNumber, cnhCategory, cnhExpiration, cnhUrl, transportCourseUrl, toxicologicalUrl, cnhRecordUrl } } : {}),
                    ...(isCoordinator ? { coordinator: { experienceTime, specializationUrl, education } } : {}),
                    password
                }
            };
            await axios.post(`${API_BASE_URL}/employees/registration/${token}`, payload);
            setSuccess(true);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Erro ao enviar cadastro.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A' }}>
                <div style={{ textAlign: 'center', color: '#fff' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem', width: 48, height: 48, borderTopColor: '#FFD600' }} />
                    <div style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.2em', fontSize: '0.8rem' }}>VALIDANDO LINK SEGURO...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A' }}>
                <div style={{ background: '#111827', padding: '3rem', borderRadius: 24, textAlign: 'center', border: '1px solid #374151', maxWidth: 400 }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚫</div>
                    <h2 style={{ fontFamily: 'Orbitron, sans-serif', color: '#EF4444', marginBottom: '1rem' }}>ACESSO NEGADO</h2>
                    <p style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>{error}</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A', position: 'relative' }}>
                <ParticleField />
                <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 560, padding: '2rem' }}>
                    <div className="animate-scale-in" style={{ background: 'rgba(17,24,39,0.85)', backdropFilter: 'blur(16px)', borderRadius: 28, border: '1px solid rgba(16,185,129,0.25)', boxShadow: '0 32px 100px rgba(0,0,0,0.35)', padding: '1.5rem 1.25rem 2rem' }}>
                        <CreationSuccessScreen
                            variant="dark"
                            alinhamento="center"
                            title="CADASTRO ENVIADO!"
                            secondaryLine="Seus dados foram submetidos com sucesso. A equipe do RH irá analisar sua solicitação em breve. Quando aprovado, você receberá um aviso e poderá acessar o sistema."
                            redirectMessage="Em breve você receberá retorno pelo e-mail informado no cadastro."
                            minHeight="auto"
                        />
                    </div>
                </div>
            </div>
        );
    }

    const roleName = tokenData ? ROLE_LABELS[tokenData.role] || 'Funcionário' : '';
    const isTeacher = tokenData?.role === 'INSTRUCTOR';
    const isDriver = tokenData?.role === 'DRIVER';
    const isCoordinator = tokenData?.role === 'COORDINATOR';

    const steps = ['Identificação', 'Endereço', 'Documentos Obrigatórios', isTeacher ? 'Área Acadêmica' : isDriver ? 'CNH e Permissões' : isCoordinator ? 'Formação' : 'Dados Profissionais', 'Acesso Seguro'];

    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: '#F3F4F6', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ width: '380px', background: 'linear-gradient(135deg, #0A0A0A, #1C1C2E)', padding: '3rem 2rem', display: 'flex', flexDirection: 'column', color: '#fff', position: 'relative', overflow: 'hidden' }}>
                <ParticleField />
                <div style={{ position: 'relative', zIndex: 10 }}>
                    <div style={{ display: 'inline-block', padding: '0.5rem 1rem', background: 'rgba(255,214,0,0.1)', border: '1px solid rgba(255,214,0,0.3)', borderRadius: 100, color: '#FFD600', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.1em', marginBottom: '2rem' }}>
                        PORTAL DO COLABORADOR
                    </div>
                    <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '2.2rem', fontWeight: 900, lineHeight: 1.1, marginBottom: '1rem' }}>
                        BEM-VINDO À <span style={{ color: '#FFD600' }}>UPGRADE</span>
                    </h1>
                    <p style={{ color: '#9CA3AF', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '3rem' }}>
                        Preencha seus dados para completar seu cadastro como <strong>{roleName}</strong>. Este é um ambiente 100% seguro.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {steps.map((s, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', opacity: step >= i ? 1 : 0.4, transition: 'all 0.3s' }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: step >= i ? '#FFD600' : 'rgba(255,255,255,0.1)', color: step >= i ? '#000' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem' }}>
                                    {step > i ? '✓' : i + 1}
                                </div>
                                <div style={{ fontWeight: step >= i ? 700 : 500, fontSize: '0.9rem', color: step >= i ? '#fff' : '#9CA3AF' }}>{s}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, padding: '4rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <div className="animate-fade-in" style={{ background: '#fff', borderRadius: 24, padding: '3rem', boxShadow: '0 10px 40px rgba(0,0,0,0.04)', maxWidth: 640, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>{steps[step]}</h2>
                        <div style={{ width: 40, height: 4, background: '#FFD600', borderRadius: 2 }} />
                    </div>

                    <div style={{ flex: 1 }}>
                        {step === 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: 600 }}>Nome Completo *</label>
                                    <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Como está em seu documento" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: 600 }}>CPF *</label>
                                    <input className="form-input" value={cpf} onChange={e => setCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" maxLength={14} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: 600 }}>Data de Nascimento *</label>
                                    <input type="date" className="form-input" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: 600 }}>E-mail Profissional/Pessoal *</label>
                                    <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="exemplo@email.com" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: 600 }}>Telefone / WhatsApp *</label>
                                    <input className="form-input" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} />
                                </div>
                            </div>
                        )}

                        {step === 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label" style={{ fontWeight: 600 }}>CEP *</label>
                                        <input className="form-input" value={cep} onChange={e => setCep(formatCep(e.target.value))} placeholder="00000-000" maxLength={9} />
                                        {cepLoading && <div style={{ fontSize: '0.68rem', color: '#6B7280', marginTop: 5 }}>Buscando endereço do CEP...</div>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" style={{ fontWeight: 600 }}>Cidade *</label>
                                        <input className="form-input" value={city} onChange={e => setCity(e.target.value)} placeholder="Sua cidade" />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label" style={{ fontWeight: 600 }}>Rua *</label>
                                        <input className="form-input" value={street} onChange={e => setStreet(e.target.value)} placeholder="Logradouro" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" style={{ fontWeight: 600 }}>Número *</label>
                                        <input className="form-input" value={number} onChange={e => setNumber(e.target.value)} placeholder="Nº" disabled={addressNoNumber} />
                                    </div>
                                </div>
                                <div style={{ marginTop: '-0.25rem' }}>
                                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#374151', fontWeight: 600 }}>
                                        <input
                                            type="checkbox"
                                            checked={addressNoNumber}
                                            onChange={(e) => {
                                                setAddressNoNumber(e.target.checked);
                                                if (e.target.checked) setNumber('');
                                            }}
                                        />
                                        Minha residência não possui número (usar S/N)
                                    </label>
                                    {addressNoNumber && (
                                        <input
                                            className="form-input"
                                            value={addressNoNumberNote}
                                            onChange={e => setAddressNoNumberNote(e.target.value)}
                                            placeholder="Descreva referência do local (opcional)"
                                            style={{ marginTop: '0.5rem' }}
                                        />
                                    )}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label" style={{ fontWeight: 600 }}>Bairro *</label>
                                        <input className="form-input" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" style={{ fontWeight: 600 }}>Estado (UF) *</label>
                                        <input className="form-input" value={stateUf} onChange={e => setStateUf(e.target.value)} placeholder="Ex: SP" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                <FileUploadField label="Frente e Verso do RG ou CNH (PDF ou Foto)" value={docUrl} onUpload={setDocUrl} required />
                                <FileUploadField label="Comprovante de Residência (luz, água, atualizado)" value={addressUrl} onUpload={setAddressUrl} required />
                                <FileUploadField label="Selfie de Rosto (Foto com fundo claro)" value={selfieUrl} onUpload={setSelfieUrl} required />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                                    {!noCriminalRecord && (
                                        <FileUploadField label="Certidão de Antecedentes Criminais" value={criminalRecordUrl} onUpload={setCriminalRecordUrl} required />
                                    )}
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginTop: noCriminalRecord ? '0' : '0.5rem' }}>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <input type="checkbox" checked={noCriminalRecord} onChange={e => { setNoCriminalRecord(e.target.checked); if(e.target.checked) setCriminalRecordUrl(''); }} style={{ appearance: 'none', width: 20, height: 20, borderRadius: 6, border: '2px solid #374151', background: noCriminalRecord ? '#10B981' : 'transparent', cursor: 'pointer', transition: 'all 0.2s' }} />
                                            {noCriminalRecord && <span style={{ position: 'absolute', color: '#fff', fontSize: '0.7rem', pointerEvents: 'none' }}>✓</span>}
                                        </div>
                                        <span style={{ fontSize: '0.85rem', color: noCriminalRecord ? '#10B981' : '#9CA3AF', fontWeight: 600, transition: 'color 0.2s' }}>
                                            Não possuo este documento no momento
                                        </span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                {isTeacher ? (
                                    <>
                                        <div className="form-group">
                                            <label className="form-label" style={{ fontWeight: 600 }}>Grau de Escolaridade *</label>
                                            <input className="form-input" value={education} onChange={e => setEducation(e.target.value)} placeholder="Ex: Ensino Superior Completo" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label" style={{ fontWeight: 600 }}>Área de Formação / Disciplina *</label>
                                            <input className="form-input" value={fieldOfStudy} onChange={e => setFieldOfStudy(e.target.value)} placeholder="Ex: Matemática, Letras" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label" style={{ fontWeight: 600 }}>Nº de Registro Profissional (se aplicável)</label>
                                            <input className="form-input" value={professionalReg} onChange={e => setProfessionalReg(e.target.value)} placeholder="Ex: CREF 123456" />
                                        </div>
                                        <div style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                                            <FileUploadField label="Diploma de Graduação (Frente/Verso)" value={diplomaUrl} onUpload={setDiplomaUrl} required />
                                            <FileUploadField label="Certificados Adicionais (Pós, Mestrado)" value={certificatesUrl} onUpload={setCertificatesUrl} />
                                            <FileUploadField label="Comprovante de Experiência (Opcional)" value={experienceUrl} onUpload={setExperienceUrl} />
                                        </div>
                                    </>
                                ) : isDriver ? (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div className="form-group">
                                                <label className="form-label" style={{ fontWeight: 600 }}>Número da CNH *</label>
                                                <input className="form-input" value={cnhNumber} onChange={e => setCnhNumber(e.target.value)} />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label" style={{ fontWeight: 600 }}>Categoria (D, E) *</label>
                                                <input className="form-input" value={cnhCategory} onChange={e => setCnhCategory(e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label" style={{ fontWeight: 600 }}>Data de Validade da CNH *</label>
                                            <input type="date" className="form-input" value={cnhExpiration} onChange={e => setCnhExpiration(e.target.value)} />
                                        </div>
                                        <div style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                                            <FileUploadField label="Foto da CNH (com anotação EAR)" value={cnhUrl} onUpload={setCnhUrl} required />
                                            <FileUploadField label="Certificado Curso de Transporte" value={transportCourseUrl} onUpload={setTransportCourseUrl} required />
                                            <FileUploadField label="Exame Toxicológico Válido" value={toxicologicalUrl} onUpload={setToxicologicalUrl} required />
                                            <FileUploadField label="Prontuário da CNH (DETRAN)" value={cnhRecordUrl} onUpload={setCnhRecordUrl} required />
                                        </div>
                                    </>
                                ) : isCoordinator ? (
                                    <>
                                        <div className="form-group">
                                            <label className="form-label" style={{ fontWeight: 600 }}>Formação (Pedagogia/Gestão) *</label>
                                            <input className="form-input" value={education} onChange={e => setEducation(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label" style={{ fontWeight: 600 }}>Tempo de Experiência na Área *</label>
                                            <input className="form-input" value={experienceTime} onChange={e => setExperienceTime(e.target.value)} placeholder="Ex: 5 anos" />
                                        </div>
                                        <div style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                                            <FileUploadField label="Diploma de Graduação" value={diplomaUrl} onUpload={setDiplomaUrl} required />
                                            <FileUploadField label="Certificado Especialização/Gestão" value={specializationUrl} onUpload={setSpecializationUrl} required />
                                        </div>
                                    </>
                                ) : (
                                    <div className="form-group">
                                        <label className="form-label" style={{ fontWeight: 600 }}>Especialidade / Função</label>
                                        <input className="form-input" value={education} onChange={e => setEducation(e.target.value)} placeholder="Qual a sua principal função?" />
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 4 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                <div style={{ background: 'rgba(5,150,105,0.05)', padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(5,150,105,0.2)', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                        <div style={{ fontSize: '1.5rem' }}>🔒</div>
                                        <div style={{ fontWeight: 800, color: '#059669' }}>CRIE SUA SENHA DE ACESSO</div>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: '#047857', margin: 0 }}>Esta senha será usada junto com seu e-mail para acessar o painel do funcionário na Plataforma Upgrade.</p>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: 600 }}>Senha *</label>
                                    <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: 600 }}>Confirmar Senha *</label>
                                    <input type="password" className="form-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Digite novamente a senha" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #E5E7EB' }}>
                        {step > 0 ? (
                            <button onClick={() => setStep(s => s - 1)} className="btn-ghost" style={{ padding: '0.8rem 1.5rem', color: '#6B7280', fontWeight: 600 }}>
                                ← Voltar
                            </button>
                        ) : <div />}
                        
                        {step < 4 ? (
                            <button onClick={() => setStep(s => s + 1)} style={{ padding: '0.8rem 2rem', background: '#111827', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                                Próximo →
                            </button>
                        ) : (
                            <button onClick={handleSubmit} disabled={saving} style={{ padding: '0.8rem 2rem', background: 'linear-gradient(135deg, #FFD600, #B89B00)', color: '#000', border: 'none', borderRadius: 12, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,214,0,0.4)', opacity: saving ? 0.7 : 1 }}>
                                {saving ? 'Processando...' : 'Concluir Cadastro'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
