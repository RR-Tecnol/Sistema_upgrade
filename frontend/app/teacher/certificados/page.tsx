'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api/client';
import { IdentificationIcon } from '@heroicons/react/24/outline';

interface Certificate {
    id: string;
    studentName: string;
    courseName: string;
    className: string;
    issuedAt: string;
    protocol: string;
    pdfUrl?: string;
}

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function TeacherCertificados() {
    const [certs, setCerts] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        api.get('/certificates')
            .then(r => setCerts((Array.isArray(r.data) ? r.data : r.data?.data ?? []).map((c: any) => ({ ...c, studentName: c.student?.user?.name ?? c.studentName ?? '—', courseName: c.class?.course?.name ?? c.courseName ?? '—', className: c.class?.classIdentifier ?? c.className ?? '—', protocol: c.verificationCode ?? c.protocol ?? '—', pdfUrl: c.fileUrl || c.pdfUrl || null }))))
            .catch(() => setCerts([]))
            .finally(() => setLoading(false));
    }, []);

    const filtered = certs.filter(c =>
        !search || c.studentName?.toLowerCase().includes(search.toLowerCase()) || c.protocol?.includes(search)
    );

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.08em', margin: 0 }}>CERTIFICADOS</h1>
                    <p style={{ color: '#6B7280', fontSize: '0.85rem', margin: 0 }}>
                        Certificados das suas turmas â€” {certs.length} emitido{certs.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Busca */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '0.85rem 1.1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <input
                    className="form-input"
                    placeholder="Buscar por aluno ou protocolo..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ fontSize: '0.85rem' }}
                />
            </div>

            {/* Lista */}
            {loading ? (
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '3rem', textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem', width: 36, height: 36 }} />
                    <div style={{ color: '#9CA3AF', fontSize: '0.82rem' }}>Carregando certificados...</div>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '4rem', textAlign: 'center' }}>
                    <IdentificationIcon style={{ width: 48, height: 48, color: '#D1D5DB', margin: '0 auto 1rem' }} />
                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.72rem', letterSpacing: '0.12em', color: '#9CA3AF' }}>NENHUM CERTIFICADO ENCONTRADO</div>
                    <p style={{ color: '#9CA3AF', fontSize: '0.78rem', marginTop: '0.5rem' }}>
                        {search ? 'Tente outro filtro.' : 'Os certificados das suas turmas aparecerÃ£o aqui apÃ³s a emissÃ£o.'}
                    </p>
                </div>
            ) : (
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Aluno</th>
                                <th>Curso</th>
                                <th>Turma</th>
                                <th>EmissÃ£o</th>
                                <th>Protocolo</th>
                                <th>PDF</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((c, i) => (
                                <tr key={c.id} className="animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                                    <td style={{ fontWeight: 600, color: '#111827' }}>{c.studentName || 'â€”'}</td>
                                    <td style={{ color: '#374151' }}>{c.courseName || 'â€”'}</td>
                                    <td style={{ color: '#6B7280' }}>{c.className || 'â€”'}</td>
                                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: '#6B7280', whiteSpace: 'nowrap' }}>{c.issuedAt ? fmtDate(c.issuedAt) : 'â€”'}</td>
                                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: '#9CA3AF' }}>{c.protocol || 'â€”'}</td>
                                    <td>
                                        {c.pdfUrl ? (
                                            <a href={c.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}>
                                                ðŸ“„ PDF
                                            </a>
                                        ) : (
                                            <span style={{ fontSize: '0.72rem', color: '#D1D5DB' }}>â€”</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

