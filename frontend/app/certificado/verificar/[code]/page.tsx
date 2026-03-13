'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const QRCodeSVG = dynamic(() => import('qrcode.react').then(m => m.QRCodeSVG), { ssr: false });

interface CertificateData {
    id: string;
    verificationCode: string;
    issuedAt: string;
    status: string;
    student: { user: { name: string }; cpf: string };
    class: { classIdentifier: string; course: { name: string; workloadHours: number }; startDate: string; endDate: string };
    issuer: { name: string };
}

export default function VerifyCertificatePage() {
    const params = useParams();
    const code = params.code as string;
    const [cert, setCert] = useState<CertificateData | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (code) verifyCert();
    }, [code]);

    const verifyCert = async () => {
        try {
            const res = await fetch(`/api/certificates/verify/${code}`);
            if (!res.ok) throw new Error();
            setCert(await res.json());
        } catch {
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #FFFDE7 0%, #F4F6FA 60%, #F0F9FF 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
        }}>
            <div style={{ maxWidth: 560, width: '100%' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FFD600', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.8rem', color: '#000' }}>UG</span>
                        </div>
                        <span style={{ fontFamily: 'Orbitron', fontSize: '1.4rem', fontWeight: 900, color: '#111827', letterSpacing: '0.1em' }}>UPGRADE</span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#6B7280' }}>Verificação de Certificado Digital</p>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                        <div className="spinner" style={{ margin: '0 auto 1rem', width: 40, height: 40 }} />
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: '#9CA3AF' }}>VERIFICANDO CÓDIGO...</p>
                    </div>
                ) : notFound || !cert ? (
                    <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #FECACA' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
                        <h2 style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.95rem', color: '#DC2626', marginBottom: '0.75rem', letterSpacing: '0.1em' }}>
                            CERTIFICADO NÃO ENCONTRADO
                        </h2>
                        <p style={{ fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.7 }}>
                            O código <strong style={{ fontFamily: 'JetBrains Mono', color: '#DC2626' }}>{code}</strong> não corresponde a nenhum certificado válido em nossa base de dados.
                        </p>
                    </div>
                ) : cert.status !== 'ACTIVE' ? (
                    <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #FEF08A' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                        <h2 style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.95rem', color: '#92730A', marginBottom: '0.5rem' }}>CERTIFICADO CANCELADO</h2>
                        <p style={{ fontSize: '0.82rem', color: '#6B7280' }}>Este certificado foi cancelado e não é mais válido.</p>
                    </div>
                ) : (
                    /* ── VALID CERTIFICATE ── */
                    <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
                        {/* Yellow top bar */}
                        <div style={{ height: 4, background: 'linear-gradient(90deg, #FFD600, #FFC200)' }} />

                        {/* Valid badge */}
                        <div style={{ textAlign: 'center', padding: '1.5rem 2rem 0' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', borderRadius: 100, background: '#DCFCE7', border: '1px solid #BBF7D0', color: '#059669', fontWeight: 800, fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
                                ✓ CERTIFICADO VÁLIDO E AUTÊNTICO
                            </div>

                            <h2 style={{ fontFamily: 'Orbitron', fontSize: '1.2rem', fontWeight: 900, color: '#111827', marginBottom: '0.35rem' }}>
                                Certificado de Conclusão
                            </h2>
                            <p style={{ fontSize: '0.85rem', color: '#6B7280', marginBottom: '1.5rem' }}>Programa Qualifica Maranhão & Piauí — UPGRADE</p>
                        </div>

                        {/* Info grid */}
                        <div style={{ padding: '0 2rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                {[
                                    { label: 'Aluno(a)', value: cert.student?.user?.name, span: 2 },
                                    { label: 'Curso', value: cert.class?.course?.name, span: 2 },
                                    { label: 'Turma', value: cert.class?.classIdentifier },
                                    { label: 'Carga Horária', value: `${cert.class?.course?.workloadHours || 40}h` },
                                    { label: 'Emitido em', value: new Date(cert.issuedAt).toLocaleDateString('pt-BR') },
                                    { label: 'Código', value: cert.verificationCode, mono: true },
                                ].map((f, i) => (
                                    <div key={i} style={{ padding: '0.75rem', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB', gridColumn: (f as any).span === 2 ? '1 / -1' : undefined }}>
                                        <div style={{ fontSize: '0.6rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>{f.label}</div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', fontFamily: (f as any).mono ? 'JetBrains Mono' : undefined }}>{f.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* QR Code */}
                        <div style={{ textAlign: 'center', padding: '0 2rem 1.5rem' }}>
                            <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: 14, background: '#FFFFFF', border: '2px solid #E5E7EB' }}>
                                <QRCodeSVG value={typeof window !== 'undefined' ? window.location.href : code} size={120} level="H" fgColor="#111827" />
                            </div>
                            <p style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: '0.75rem' }}>
                                Este QR Code confirma a autenticidade deste certificado
                            </p>
                        </div>

                        <div style={{ height: 4, background: 'linear-gradient(90deg, #FFD600, #FFC200)' }} />
                    </div>
                )}
            </div>
        </div>
    );
}
