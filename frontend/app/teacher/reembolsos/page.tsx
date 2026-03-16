'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api/client';
import imageCompression from 'browser-image-compression';

import { CameraIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline';

const TIPOS = [
    { value: 'ALIMENTACAO', label: 'Alimentação' },
    { value: 'HOSPEDAGEM', label: 'Hospedagem' },
    { value: 'TRANSPORTE', label: 'Transporte' },
    { value: 'MATERIAL', label: 'Material' },
    { value: 'OUTRO', label: 'Outro' },
];

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
    PENDING: { bg: 'rgba(255,214,0,0.12)', color: '#FFD600', label: 'Pendente' },
    APPROVED: { bg: 'rgba(16,185,129,0.12)', color: '#10B981', label: 'Aprovado' },
    REJECTED: { bg: 'rgba(239,68,68,0.12)', color: '#EF4444', label: 'Rejeitado' },
};

function fmtCurr(value: number | string) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? 'R$ 0,00' : num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function TeacherReembolsos() {
    const [reembolsos, setReembolsos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tipo, setTipo] = useState('ALIMENTACAO');
    const [valor, setValor] = useState('');
    const [descricao, setDescricao] = useState('');
    const [fotoPreview, setFotoPreview] = useState<string | null>(null);
    const [fotoFile, setFotoFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadReembolsos();
    }, []);

    async function loadReembolsos() {
        try {
            const res = await api.get('/reimbursements');
            setReembolsos(Array.isArray(res.data) ? res.data : []);
        } catch {
            setReembolsos([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            // Comprime imagem para max 500KB / 1200px antes do preview e upload
            const options = {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 1200,
                useWebWorker: true,
            };
            const compressed = await imageCompression(file, options);
            setFotoFile(compressed as unknown as File);
            const reader = new FileReader();
            reader.onload = ev => setFotoPreview(ev.target?.result as string);
            reader.readAsDataURL(compressed);
        } catch {
            // Fallback sem compressão
            setFotoFile(file);
            const reader = new FileReader();
            reader.onload = ev => setFotoPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!valor || parseFloat(valor.replace(',', '.')) <= 0) {
            showToast('Informe um valor válido.', 'error');
            return;
        }

        setSubmitting(true);
        try {
            let receiptUrl: string | undefined;

            // Upload foto se selecionada
            if (fotoFile) {
                try {
                    const urlRes = await api.post('/reimbursements/presigned-url', {
                        filename: fotoFile.name,
                        contentType: fotoFile.type,
                    });
                    await fetch(urlRes.data.uploadUrl, {
                        method: 'PUT',
                        body: fotoFile,
                        headers: { 'Content-Type': fotoFile.type },
                    });
                    receiptUrl = urlRes.data.fileUrl;
                } catch {
                    // MinIO indisponível — continua sem URL
                }
            }

            await api.post('/reimbursements', {
                category: tipo,
                amount: parseFloat(valor.replace(',', '.')),
                description: descricao,
                ...(receiptUrl ? { receiptUrl } : {}),
            });

            showToast('Solicitação enviada com sucesso!', 'success');
            setTipo('ALIMENTACAO');
            setValor('');
            setDescricao('');
            setFotoPreview(null);
            setFotoFile(null);
            loadReembolsos();
        } catch (err: any) {
            showToast(err?.response?.data?.message || 'Erro ao enviar solicitação.', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    function showToast(msg: string, type: 'success' | 'error') {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    }

    return (
        <div>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 999,
                    background: toast.type === 'success' ? '#10B981' : '#EF4444',
                    color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 10,
                    fontWeight: 600, fontSize: '0.88rem', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}>
                    {toast.type === 'success' ? '✓ ' : '✕ '}{toast.msg}
                </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F1F5F9', fontFamily: 'Orbitron, sans-serif' }}>REEMBOLSOS</h1>
                <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: 4 }}>Solicite reembolso por despesas do campo</p>
            </div>

            {/* Formulário */}
            <div style={{ background: '#1E293B', borderRadius: 12, padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F1F5F9', marginBottom: '1.25rem' }}>Nova Solicitação</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Tipo */}
                    <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipo de Despesa</label>
                        <select
                            value={tipo}
                            onChange={e => setTipo(e.target.value)}
                            style={{ width: '100%', minHeight: 44, background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0 0.75rem', color: '#F1F5F9', fontSize: '0.9rem' }}
                        >
                            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>

                    {/* Valor */}
                    <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valor (R$)</label>
                        <input
                            type="number" step="0.01" min="0" placeholder="0,00"
                            value={valor}
                            onChange={e => setValor(e.target.value)}
                            style={{ width: '100%', minHeight: 44, background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0 0.75rem', color: '#F1F5F9', fontSize: '0.9rem', boxSizing: 'border-box' }}
                        />
                    </div>

                    {/* Descrição */}
                    <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descrição</label>
                        <textarea
                            placeholder="Descreva a despesa..."
                            value={descricao}
                            onChange={e => setDescricao(e.target.value)}
                            rows={3}
                            style={{ width: '100%', background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.6rem 0.75rem', color: '#F1F5F9', fontSize: '0.9rem', resize: 'none', boxSizing: 'border-box' }}
                        />
                    </div>

                    {/* Foto (câmera traseira nativa no mobile) */}
                    <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Comprovante (foto)</label>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFotoChange}
                            style={{ display: 'none' }}
                        />
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.6rem 1rem', minHeight: 44, borderRadius: 8,
                                background: 'rgba(255,214,0,0.08)', border: '1px dashed rgba(255,214,0,0.3)',
                                color: '#FFD600', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                            }}
                        >
                            <CameraIcon style={{ width: 20, height: 20 }} />
                            {fotoFile ? 'Trocar foto' : 'Tirar / Selecionar foto'}
                        </button>

                        {fotoPreview && (
                            <div style={{ position: 'relative', display: 'inline-block', marginTop: '0.75rem' }}>
                                <img src={fotoPreview} alt="Preview do comprovante" style={{ maxWidth: 200, maxHeight: 150, borderRadius: 8, objectFit: 'cover', border: '2px solid rgba(255,214,0,0.3)' }} />
                                <button
                                    type="button"
                                    onClick={() => { setFotoPreview(null); setFotoFile(null); }}
                                    style={{ position: 'absolute', top: -8, right: -8, background: '#EF4444', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <XMarkIcon style={{ width: 14, height: 14 }} />
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            minHeight: 52, borderRadius: 10, border: 'none',
                            background: submitting ? '#475569' : 'linear-gradient(135deg, #FFD600, #F59E0B)',
                            color: '#0F172A', fontWeight: 700, fontSize: '0.9rem',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.05em',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        }}
                    >
                        <PaperAirplaneIcon style={{ width: 18, height: 18 }} />
                        {submitting ? 'ENVIANDO...' : 'ENVIAR SOLICITAÇÃO'}
                    </button>
                </form>
            </div>

            {/* Histórico */}
            <div>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F1F5F9', marginBottom: '1rem' }}>Minhas Solicitações</h2>
                {loading ? (
                    <div style={{ textAlign: 'center', color: '#64748B', padding: '2rem' }}>Carregando...</div>
                ) : reembolsos.length === 0 ? (
                    <div style={{ background: '#1E293B', borderRadius: 12, padding: '2rem', textAlign: 'center', color: '#64748B', border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.85rem' }}>
                        Nenhuma solicitação encontrada.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {reembolsos.map(r => {
                            const st = STATUS_COLORS[r.status] || STATUS_COLORS.PENDING;
                            return (
                                <div key={r.id} style={{
                                    background: '#1E293B', borderRadius: 10,
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    padding: '0.875rem 1rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#F1F5F9', fontSize: '0.88rem' }}>
                                            {TIPOS.find(t => t.value === r.category)?.label || r.category}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 2 }}>
                                            {r.description || 'Sem descrição'} · {new Date(r.createdAt || Date.now()).toLocaleDateString('pt-BR')}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700, color: '#F1F5F9', fontSize: '0.95rem', fontFamily: 'Orbitron, sans-serif' }}>
                                            {fmtCurr(r.amount)}
                                        </div>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: st.bg, color: st.color }}>
                                            {st.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
