'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import api from '@/lib/api/client';
import dynamic from 'next/dynamic';

const QRCodeSVG = dynamic(() => import('qrcode.react').then(m => m.QRCodeSVG), { ssr: false });

interface Certificate {
    id: string;
    verificationCode: string;
    issuedAt: string;
    status: string;
    class: {
        classIdentifier: string;
        course: { name: string; workloadHours: number };
        startDate: string;
        endDate: string;
    };
}

export default function StudentCertificatesPage() {
    const [certs, setCerts] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Certificate | null>(null);
    const { user } = useAuthStore();

    useEffect(() => { fetchCerts(); }, []);

    const fetchCerts = async () => {
        try {
            const res = await api.get('/students/me/certificates');
            setCerts(Array.isArray(res.data) ? res.data : []);
        } catch {
            setCerts([]); // show empty state
        } finally {
            setLoading(false);
        }
    };

    const verifyUrl = (code: string) => `${typeof window !== 'undefined' ? window.location.origin : 'https://upgrade.app'}/certificado/verificar/${code}`;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="gradient-text" style={{ fontFamily: 'Orbitron', fontSize: '2rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                    CERTIFICADOS
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Seus certificados de conclusão de cursos</p>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO...</p>
                </div>
            ) : certs.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏆</div>
                    <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        NENHUM CERTIFICADO AINDA
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 380, margin: '0 auto', lineHeight: 1.7 }}>
                        Conclua um curso com frequência ≥ 75% para receber seu certificado digital de conclusão.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                    {certs.map((cert, i) => (
                        <div
                            key={cert.id}
                            className="glass-card animate-scale-in"
                            style={{
                                animationDelay: `${i * 80}ms`,
                                padding: '1.5rem',
                                borderTop: '3px solid #FFD600',
                                cursor: 'pointer',
                                transition: 'all 0.25s',
                            }}
                            onClick={() => { setSelected(cert); document.body.style.overflow = 'hidden'; }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(255,214,0,0.2)';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                                (e.currentTarget as HTMLElement).style.boxShadow = '';
                            }}
                        >
                            {/* Badge */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                <div style={{ fontSize: '2rem' }}>🏆</div>
                                <span style={{
                                    padding: '0.2rem 0.65rem', borderRadius: 100, fontSize: '0.62rem', fontWeight: 700,
                                    background: cert.status === 'ACTIVE' ? '#DCFCE7' : '#FEF2F2',
                                    color: cert.status === 'ACTIVE' ? '#059669' : '#DC2626',
                                    border: `1px solid ${cert.status === 'ACTIVE' ? '#BBF7D0' : '#FECACA'}`,
                                    textTransform: 'uppercase' as const,
                                }}>
                                    {cert.status === 'ACTIVE' ? '✓ Válido' : 'Cancelado'}
                                </span>
                            </div>

                            <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827', marginBottom: '0.35rem', lineHeight: 1.3 }}>
                                {cert.class?.course?.name}
                            </h3>
                            <p style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono', marginBottom: '1rem' }}>
                                {cert.class?.classIdentifier}
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                                {[
                                    { label: 'Carga Horária', value: `${cert.class?.course?.workloadHours || 40}h` },
                                    { label: 'Emitido em', value: new Date(cert.issuedAt).toLocaleDateString('pt-BR') },
                                ].map(f => (
                                    <div key={f.label} style={{ padding: '0.5rem', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                                        <div style={{ fontSize: '0.6rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{f.label}</div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginTop: '0.15rem' }}>{f.value}</div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ padding: '0.5rem 0.75rem', borderRadius: 8, background: '#FFFDE7', border: '1px solid #FEF08A', fontSize: '0.72rem', color: '#92730A', fontFamily: 'JetBrains Mono' }}>
                                🔑 {cert.verificationCode}
                            </div>

                            <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '0.75rem', textAlign: 'center' as const }}>Clique para ver o QR Code</p>
                        </div>
                    ))}
                </div>
            )}

            {/* QR Modal */}
            {selected && (
                <div className="modal-overlay" onClick={() => { setSelected(null); document.body.style.overflow = ''; }}>
                    <div className="modal-content" style={{ maxWidth: 400, textAlign: 'center' as const }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelected(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#9CA3AF' }}>✕</button>

                        {/* Certificate details */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏆</div>
                            <h3 style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.95rem', color: '#111827', marginBottom: '0.25rem' }}>
                                Certificado de Conclusão
                            </h3>
                            <p style={{ fontWeight: 700, color: '#374151', fontSize: '0.88rem', marginBottom: '0.15rem' }}>{user?.name}</p>
                            <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>{selected.class?.course?.name}</p>
                        </div>

                        <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: 14, background: '#FFFFFF', border: '2px solid #FFD600', boxShadow: '0 4px 16px rgba(255,214,0,0.2)', marginBottom: '1.25rem' }}>
                            <QRCodeSVG
                                value={verifyUrl(selected.verificationCode)}
                                size={150}
                                level="H"
                                fgColor="#111827"
                            />
                        </div>

                        <div style={{ padding: '0.65rem 1rem', borderRadius: 10, background: '#FFFDE7', border: '1px solid #FEF08A', marginBottom: '0.85rem' }}>
                            <div style={{ fontSize: '0.58rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Código de Verificação</div>
                            <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 900, color: '#B89B00', fontSize: '0.85rem', letterSpacing: '0.08em' }}>{selected.verificationCode}</div>
                        </div>

                        <p style={{ fontSize: '0.7rem', color: '#9CA3AF', lineHeight: 1.6 }}>
                            Mostre este QR Code para comprovar a autenticidade do seu certificado. Qualquer pessoa pode verificar em nosso site.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
