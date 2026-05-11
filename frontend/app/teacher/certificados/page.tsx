'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import api from '@/lib/api/client';
import { formatCertificateIssueError } from '@/lib/certificate-issue-error';
import {
    DocumentArrowDownIcon,
    MagnifyingGlassIcon,
    IdentificationIcon,
} from '@heroicons/react/24/outline';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';

const QRCodeSVG = dynamic(() => import('qrcode.react').then(m => m.QRCodeSVG), { ssr: false });

interface Certificate {
    id: string;
    verificationCode: string;
    issuedAt: string;
    status: string;
    fileUrl?: string | null;
    student: { user: { name: string }; cpf: string };
    class: { classIdentifier: string; course: { name: string; workloadHours: number } };
    issuer?: { name: string };
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
    attendanceRateBeforePenaltyPct?: number;
    imprevistoPenaltyPctSum?: number;
    riskLevel?: 'ok' | 'watch' | 'risk' | 'critical';
}

export default function TeacherCertificados() {
    const [tab, setTab]                   = useState<'eligible' | 'issued'>('eligible');
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [eligible, setEligible]         = useState<EligibleStudent[]>([]);
    const [loading, setLoading]           = useState(true);
    const [selected, setSelected]         = useState<Certificate | null>(null);
    const [issuing, setIssuing]           = useState<string | null>(null);
    const [issueError, setIssueError]     = useState<string | null>(null);
    const [issueSuccess, setIssueSuccess] = useState<string | null>(null);
    const [search, setSearch]             = useState('');
    const [mounted, setMounted]           = useState(false);

    useEffect(() => { setMounted(true); fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [certRes, eligRes] = await Promise.allSettled([
                api.get('/certificates'),
                api.get('/certificates/eligible'),
            ]);
            if (certRes.status === 'fulfilled') {
                const raw = certRes.value.data;
                setCertificates(Array.isArray(raw) ? raw : (raw?.data ?? []));
            }
            if (eligRes.status === 'fulfilled') {
                const raw = eligRes.value.data;
                setEligible(Array.isArray(raw) ? raw : (raw?.data ?? []));
            }
        } catch { /* silencioso */ }
        finally { setLoading(false); }
    };

    const issueCertificate = async (student: EligibleStudent) => {
        setIssuing(student.id);
        setIssueError(null);
        setIssueSuccess(null);
        try {
            await api.post('/certificates', {
                studentId: student.id,
                classId:   student.classId,
            });
            setIssueSuccess(`Certificado emitido para ${student.name}!`);
            window.dispatchEvent(new CustomEvent('certificateIssued', {
                detail: { studentName: student.name, courseName: student.courseName }
            }));
            setTimeout(() => setIssueSuccess(null), 4000);
            await fetchData();
            setTab('issued');
        } catch (err: unknown) {
            setIssueError(formatCertificateIssueError(err));
        } finally {
            setIssuing(null);
        }
    };

    const verifyUrl = (code: string) =>
        typeof window !== 'undefined'
            ? `${window.location.origin}/certificado/verificar/${code}`
            : code;

    const filtered = certificates.filter(c =>
        !search ||
        c.student?.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.verificationCode?.toLowerCase().includes(search.toLowerCase()) ||
        c.class?.course?.name?.toLowerCase().includes(search.toLowerCase())
    );

    const filteredEligible = eligible.filter(s =>
        !search ||
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.courseName?.toLowerCase().includes(search.toLowerCase()) ||
        s.classIdentifier?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">

            <AdminHeaderHero
                title="CERTIFICADOS"
                subtitle="Emita e gerencie certificados das suas turmas"
                badge="PROFESSOR"
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <AnimatedKpiCard
                    label="Emitidos"
                    value={certificates.length}
                    color="#059669"
                    bg="#F0FDF4"
                    border="#BBF7D0"
                    icon={<span>🏆</span>}
                />
                <AnimatedKpiCard
                    label="Elegíveis"
                    value={eligible.length}
                    color="#B89B00"
                    bg="#FFFBEB"
                    border="#FEF08A"
                    icon={<span>⏳</span>}
                />
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', padding: '0.3rem', background: '#F3F4F6', borderRadius: 12, width: 'fit-content' }}>
                {[
                    { key: 'eligible', label: '⏳ Elegiveis para Certificacao', count: eligible.length },
                    { key: 'issued',   label: '🏆 Certificados Emitidos',        count: certificates.length },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key as any)}
                        style={{
                            padding: '0.55rem 1.1rem', borderRadius: 9, fontSize: '0.82rem',
                            fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', border: 'none',
                            background: tab === t.key ? '#FFD600' : 'transparent',
                            color: tab === t.key ? '#000' : '#6B7280',
                            boxShadow: tab === t.key ? '0 2px 8px rgba(255,214,0,0.35)' : 'none',
                        }}
                    >
                        {t.label} <span style={{ opacity: 0.7 }}>({t.count})</span>
                    </button>
                ))}
            </div>

            {/* Toast sucesso */}
            {issueSuccess && (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.1rem' }}>✅</span>
                    <div style={{ fontWeight: 700, color: '#059669', fontSize: '0.85rem' }}>{issueSuccess}</div>
                    <button onClick={() => setIssueSuccess(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#059669', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
                </div>
            )}

            {/* Banner de erro */}
            {issueError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 1 }}>⚠</span>
                    <div>
                        <div style={{ fontWeight: 700, color: '#DC2626', fontSize: '0.85rem', marginBottom: 4 }}>Erro ao Emitir Certificado</div>
                        <div style={{ fontSize: '0.78rem', color: '#7F1D1D', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{issueError}</div>
                    </div>
                    <button onClick={() => setIssueError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '1.1rem', flexShrink: 0 }}>✕</button>
                </div>
            )}

            {/* Busca */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <MagnifyingGlassIcon style={{ width: 18, height: 18, color: '#9CA3AF', flexShrink: 0 }} />
                <input
                    placeholder="Buscar por aluno, curso ou codigo..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.85rem', color: '#111827', background: 'transparent' }}
                />
                {search && (
                    <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1.1rem' }}>✕</button>
                )}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: '#9CA3AF' }}>CARREGANDO...</p>
                </div>
            ) : tab === 'eligible' ? (

                /* ── ABA ELEGIVEIS ── */
                filteredEligible.length === 0 ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎓</div>
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', letterSpacing: '0.15em', color: '#9CA3AF' }}>
                            {search ? 'NENHUM RESULTADO ENCONTRADO' : 'NENHUM ALUNO ELEGIVEL NO MOMENTO'}
                        </p>
                        <p style={{ fontSize: '0.82rem', color: '#9CA3AF', marginTop: '0.5rem' }}>
                            Alunos com presença efectiva ≥ 75% após penalidades (mesmo critério da emissão) aparecerão aqui
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                        {filteredEligible.map((student, i) => (
                            <div key={student.id} className="glass-card animate-scale-in"
                                style={{ animationDelay: `${i * 60}ms`, padding: '1.25rem', borderLeft: '3px solid #FFD600' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 11, background: '#FFD600', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.8rem', color: '#000', flexShrink: 0 }}>
                                        {student.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono, monospace' }}>{student.cpf}</div>
                                    </div>
                                </div>

                                <div style={{ fontSize: '0.8rem', color: '#374151', marginBottom: '0.3rem', fontWeight: 600 }}>{student.courseName}</div>
                                <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.85rem', fontFamily: 'JetBrains Mono, monospace' }}>{student.classIdentifier}</div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                        <span style={{ fontSize: '0.68rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Frequencia</span>
                                        <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.85rem', color: student.attendanceRate >= 75 ? '#059669' : '#DC2626' }}>
                                            {student.attendanceRate}%
                                        </span>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${Math.min(100, student.attendanceRate)}%`, background: student.attendanceRate >= 75 ? '#059669' : '#DC2626' }} />
                                    </div>
                                    {typeof student.imprevistoPenaltyPctSum === 'number' && student.imprevistoPenaltyPctSum > 0 && (
                                        <div style={{ fontSize: '0.65rem', color: '#92400E', marginTop: 6, lineHeight: 1.35 }}>
                                            Penal. imprevisto: −{student.imprevistoPenaltyPctSum}%
                                            {typeof student.attendanceRateBeforePenaltyPct === 'number' && (
                                                <> · antes {student.attendanceRateBeforePenaltyPct}%</>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => issueCertificate(student)}
                                    disabled={issuing === student.id}
                                    className="btn-primary"
                                    style={{ width: '100%', justifyContent: 'center' }}
                                >
                                    {issuing === student.id
                                        ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Emitindo...</>
                                        : '🏆 Emitir Certificado'
                                    }
                                </button>
                            </div>
                        ))}
                    </div>
                )

            ) : (

                /* ── ABA EMITIDOS ── */
                filtered.length === 0 ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
                        <IdentificationIcon style={{ width: 48, height: 48, color: '#D1D5DB', margin: '0 auto 1rem' }} />
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', letterSpacing: '0.15em', color: '#9CA3AF' }}>
                            {search ? 'NENHUM RESULTADO' : 'NENHUM CERTIFICADO EMITIDO AINDA'}
                        </p>
                    </div>
                ) : (
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Codigo</th>
                                    <th>Aluno</th>
                                    <th>Curso</th>
                                    <th>Turma</th>
                                    <th>Emitido em</th>
                                    <th>Emitido por</th>
                                    <th>Status</th>
                                    <th>Acoes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(cert => (
                                    <tr key={cert.id}>
                                        <td>
                                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: '#B89B00', fontWeight: 700 }}>
                                                {cert.verificationCode}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600, color: '#111827' }}>{cert.student?.user?.name}</td>
                                        <td style={{ color: '#374151' }}>{cert.class?.course?.name}</td>
                                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: '#9CA3AF' }}>{cert.class?.classIdentifier}</td>
                                        <td style={{ fontSize: '0.78rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono, monospace' }}>
                                            {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString('pt-BR') : '--'}
                                        </td>
                                        <td style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                                            {cert.issuer?.name ?? 'Sistema'}
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
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                    onClick={() => { setSelected(cert); document.body.style.overflow = 'hidden'; }}
                                                    style={{ padding: '0.35rem 0.75rem', borderRadius: 7, background: '#FFFDE7', border: '1px solid #FEF08A', color: '#92730A', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                >
                                                    🔍 Ver QR
                                                </button>
                                                {cert.fileUrl ? (
                                                    <a href={cert.fileUrl} target="_blank" rel="noopener noreferrer"
                                                        style={{ padding: '0.35rem 0.75rem', borderRadius: 7, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#059669', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                        <DocumentArrowDownIcon style={{ width: 13, height: 13 }} /> PDF
                                                    </a>
                                                ) : (
                                                    <span style={{ padding: '0.35rem 0.75rem', borderRadius: 7, background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#D1D5DB', fontSize: '0.72rem', fontWeight: 700 }}>
                                                        PDF
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {/* Modal QR — createPortal obrigatório (BUG-DRAWER-TRANSFORM: layout com animate-fade-in) */}
            {mounted && selected && createPortal(
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                    onClick={() => { setSelected(null); document.body.style.overflow = ''; }}
                >
                    <div
                        style={{ background: '#fff', borderRadius: 20, maxWidth: 420, width: '100%', padding: '1.75rem', position: 'relative', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', animation: 'slideUp 0.2s' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => { setSelected(null); document.body.style.overflow = ''; }}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#9CA3AF' }}
                        >✕</button>

                        <div style={{ marginBottom: '1.25rem' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏆</div>
                            <h3 style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1rem', color: '#111827', marginBottom: '0.25rem' }}>
                                Certificado de Conclusao
                            </h3>
                            <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '0 0 0.15rem' }}>{selected.student?.user?.name}</p>
                            <p style={{ fontSize: '0.78rem', color: '#9CA3AF', margin: 0 }}>{selected.class?.course?.name}</p>
                        </div>

                        <div style={{ display: 'inline-flex', padding: '1.25rem', borderRadius: 16, background: '#fff', border: '2px solid #FFD600', boxShadow: '0 4px 16px rgba(255,214,0,0.2)', marginBottom: '1.25rem' }}>
                            <QRCodeSVG
                                value={verifyUrl(selected.verificationCode)}
                                size={160}
                                level="H"
                                fgColor="#111827"
                            />
                        </div>

                        <div style={{ padding: '0.65rem 1rem', borderRadius: 10, background: '#FFFDE7', border: '1px solid #FEF08A', marginBottom: '1rem' }}>
                            <div style={{ fontSize: '0.6rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>
                                Codigo de Verificacao
                            </div>
                            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, color: '#B89B00', fontSize: '0.88rem', letterSpacing: '0.1em' }}>
                                {selected.verificationCode}
                            </div>
                        </div>

                        {selected.issuer?.name && (
                            <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.5rem' }}>
                                Emitido por: <strong style={{ color: '#6B7280' }}>{selected.issuer.name}</strong>
                            </p>
                        )}
                        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: 0 }}>
                            Escaneie o QR Code para verificar a autenticidade
                        </p>
                        <style>{`@keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
