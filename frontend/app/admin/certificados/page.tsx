'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api/client';
import dynamic from 'next/dynamic';

const QRCodeSVG = dynamic(() => import('qrcode.react').then(m => m.QRCodeSVG), { ssr: false });

interface Certificate {
    id: string;
    verificationCode: string;
    issuedAt: string;
    status: string;
    student: { user: { name: string }; cpf: string };
    class: { classIdentifier: string; course: { name: string; workloadHours: number } };
    issuer: { name: string };
}

interface EligibleStudent {
    id: string;
    name: string;
    cpf: string;
    enrollmentId: string;
    classId: string;
    courseName: string;
    classIdentifier: string;
    attendanceRate: number;
}

export default function CertificadosPage() {
    const [tab, setTab] = useState<'issued' | 'eligible'>('eligible');
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [eligible, setEligible] = useState<EligibleStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Certificate | null>(null);
    const [issuing, setIssuing] = useState<string | null>(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [certRes, eligRes] = await Promise.allSettled([
                api.get('/certificates'),
                api.get('/certificates/eligible'),
            ]);

            if (certRes.status === 'fulfilled') {
                setCertificates(certRes.value.data || []);
            }
            if (eligRes.status === 'fulfilled') {
                setEligible(eligRes.value.data || []);
            } else {
                // Mock eligible students if endpoint not ready
                setEligible([
                    { id: '1', name: 'Ana Silva', cpf: '123.456.789-01', enrollmentId: 'enr1', classId: 'cls1', courseName: 'Informática Básica', classIdentifier: 'INF-001/MA', attendanceRate: 92 },
                    { id: '2', name: 'Carlos Sousa', cpf: '987.654.321-00', enrollmentId: 'enr2', classId: 'cls1', courseName: 'Informática Básica', classIdentifier: 'INF-001/MA', attendanceRate: 88 },
                    { id: '3', name: 'Maria Oliveira', cpf: '111.222.333-44', enrollmentId: 'enr3', classId: 'cls2', courseName: 'Costura Industrial', classIdentifier: 'COS-002/PI', attendanceRate: 81 },
                ]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const [issueError, setIssueError] = useState<string | null>(null);

    const issueCertificate = async (student: EligibleStudent) => {
        setIssuing(student.id);
        setIssueError(null);
        try {
            await api.post('/certificates', {
                studentId: student.id,
                classId: student.classId,
                enrollmentId: student.enrollmentId,
            });
            await fetchData();
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Erro desconhecido.';
            setIssueError(`Erro ao emitir certificado: ${msg}. Verifique se o aluno tem status ENROLLED e frequência ≥ 75%.`);
        } finally {
            setIssuing(null);
        }
    };


    const verifyUrl = (code: string) => `${window.location.origin}/certificado/verificar/${code}`;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontFamily: 'Orbitron', fontSize: '2rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                        CERTIFICADOS
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Emita e gerencie certificados digitais de conclusão</p>
                </div>
                <div style={{ display: 'flex', gap: '0.85rem' }}>
                    <div style={{ padding: '0.6rem 1.1rem', borderRadius: 10, background: '#F0FDF4', border: '1px solid #BBF7D0', fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>
                        🏆 {certificates.length} emitido{certificates.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ padding: '0.6rem 1.1rem', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FEF08A', fontSize: '0.8rem', color: '#92730A', fontWeight: 700 }}>
                        ⏳ {eligible.length} elegível{eligible.length !== 1 ? 'is' : ''}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', padding: '0.3rem', background: '#F3F4F6', borderRadius: 12, width: 'fit-content' }}>
                {[
                    { key: 'eligible', label: '⏳ Elegíveis para Certificação', count: eligible.length },
                    { key: 'issued', label: '🏆 Certificados Emitidos', count: certificates.length },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key as any)}
                        style={{
                            padding: '0.55rem 1.1rem', borderRadius: 9, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', border: 'none',
                            background: tab === t.key ? '#FFD600' : 'transparent',
                            color: tab === t.key ? '#000' : '#6B7280',
                            boxShadow: tab === t.key ? '0 2px 8px rgba(255,214,0,0.35)' : 'none',
                        }}
                    >
                        {t.label} <span style={{ opacity: 0.7 }}>({t.count})</span>
                    </button>
                ))}
            </div>

            {/* ── Erro de emissão ── */}
            {issueError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 1 }}>⚠</span>
                    <div>
                        <div style={{ fontWeight: 700, color: '#DC2626', fontSize: '0.85rem', marginBottom: 4 }}>Erro ao Emitir Certificado</div>
                        <div style={{ fontSize: '0.78rem', color: '#7F1D1D', lineHeight: 1.6 }}>{issueError}</div>
                        <div style={{ fontSize: '0.74rem', color: '#9CA3AF', marginTop: 6 }}>
                            Possíveis causas: matrícula sem status ENROLLED, frequência abaixo de 75%, ou turma não concluída (COMPLETED).
                        </div>
                    </div>
                    <button onClick={() => setIssueError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>✕</button>
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO...</p>
                </div>
            ) : tab === 'eligible' ? (
                /* ── ELIGIBLE STUDENTS ── */
                eligible.length === 0 ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎓</div>
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>NENHUM ALUNO ELEGÍVEL NO MOMENTO</p>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Alunos com frequência ≥ 75% em turmas concluídas aparecerão aqui</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                        {eligible.map((student, i) => (
                            <div key={student.id} className="glass-card animate-scale-in" style={{ animationDelay: `${i * 60}ms`, padding: '1.25rem', borderLeft: '3px solid #FFD600' }}>
                                {/* Student */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 11, background: '#FFD600', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.8rem', color: '#000', flexShrink: 0 }}>
                                        {student.name.split(' ').map(n => n[0]).slice(0, 2).join('')}

                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono' }}>{student.cpf}</div>
                                    </div>
                                </div>

                                <div style={{ fontSize: '0.8rem', color: '#374151', marginBottom: '0.4rem', fontWeight: 600 }}>{student.courseName}</div>
                                <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.85rem', fontFamily: 'JetBrains Mono' }}>{student.classIdentifier}</div>

                                {/* Attendance */}
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                        <span style={{ fontSize: '0.68rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Frequência</span>
                                        <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.85rem', color: student.attendanceRate >= 75 ? '#059669' : '#DC2626' }}>
                                            {student.attendanceRate}%
                                        </span>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${student.attendanceRate}%`, background: student.attendanceRate >= 75 ? '#059669' : '#DC2626' }} />
                                    </div>
                                </div>

                                <button
                                    onClick={() => issueCertificate(student)}
                                    disabled={issuing === student.id}
                                    className="btn-primary"
                                    style={{ width: '100%', justifyContent: 'center' }}
                                >
                                    {issuing === student.id ? (
                                        <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Emitindo...</>
                                    ) : (
                                        '🏆 Emitir Certificado'
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                /* ── ISSUED CERTIFICATES ── */
                certificates.length === 0 ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>NENHUM CERTIFICADO EMITIDO AINDA</p>
                    </div>
                ) : (
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Aluno</th>
                                    <th>Curso</th>
                                    <th>Turma</th>
                                    <th>Emitido em</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {certificates.map(cert => (
                                    <tr key={cert.id}>
                                        <td><span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#B89B00', fontWeight: 700 }}>{cert.verificationCode}</span></td>
                                        <td style={{ fontWeight: 600, color: '#111827' }}>{cert.student?.user?.name}</td>
                                        <td style={{ color: '#374151' }}>{cert.class?.course?.name}</td>
                                        <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#9CA3AF' }}>{cert.class?.classIdentifier}</td>
                                        <td style={{ fontSize: '0.78rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono' }}>
                                            {new Date(cert.issuedAt).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '0.2rem 0.6rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700,
                                                background: cert.status === 'ACTIVE' ? '#DCFCE7' : '#FEF2F2',
                                                color: cert.status === 'ACTIVE' ? '#059669' : '#DC2626',
                                                border: `1px solid ${cert.status === 'ACTIVE' ? '#BBF7D0' : '#FECACA'}`,
                                                textTransform: 'uppercase',
                                            }}>
                                                {cert.status === 'ACTIVE' ? 'Ativo' : 'Cancelado'}
                                            </span>
                                        </td>
                                        <td>
                                            <button onClick={() => setSelected(cert)}
                                                style={{ padding: '0.4rem 0.85rem', borderRadius: 7, background: '#FFFDE7', border: '1px solid #FEF08A', color: '#92730A', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                                                🔍 Ver QR
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {/* QR Code Modal */}
            {selected && (
                <div className="modal-overlay" onClick={() => setSelected(null)}>
                    <div className="modal-content" style={{ maxWidth: 420, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelected(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#9CA3AF' }}>✕</button>

                        <div style={{ marginBottom: '1.25rem' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏆</div>
                            <h3 style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1rem', color: '#111827', marginBottom: '0.25rem' }}>
                                Certificado de Conclusão
                            </h3>
                            <p style={{ fontSize: '0.82rem', color: '#6B7280' }}>{selected.student?.user?.name}</p>
                            <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>{selected.class?.course?.name}</p>
                        </div>

                        {/* QR Code */}
                        <div style={{ display: 'inline-flex', padding: '1.25rem', borderRadius: 16, background: '#FFFFFF', border: '2px solid #FFD600', boxShadow: '0 4px 16px rgba(255,214,0,0.2)', marginBottom: '1.25rem' }}>
                            <QRCodeSVG
                                value={typeof window !== 'undefined' ? verifyUrl(selected.verificationCode) : selected.verificationCode}
                                size={160}
                                level="H"
                                fgColor="#111827"
                            />
                        </div>

                        <div style={{ padding: '0.65rem 1rem', borderRadius: 10, background: '#FFFDE7', border: '1px solid #FEF08A', marginBottom: '1rem' }}>
                            <div style={{ fontSize: '0.6rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Código de Verificação</div>
                            <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 900, color: '#B89B00', fontSize: '0.88rem', letterSpacing: '0.1em' }}>{selected.verificationCode}</div>
                        </div>

                        <p style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>Escaneie o QR Code para verificar a autenticidade do certificado</p>
                    </div>
                </div>
            )}
        </div>
    );
}
