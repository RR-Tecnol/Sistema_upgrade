'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';

type FeedbackStatus =
    | 'PENDING_STUDENT_RESPONSE'
    | 'SUBMITTED'
    | 'CONTENT_APPROVED'
    | 'APPROVED'
    | 'REJECTED'
    | 'REVERTED'
    | 'EXPIRED';

interface Feedback {
    id: string;
    status: FeedbackStatus;
    ratingGeneral?: number;
    pixAmount?: number;
    pixKey?: string | null;
    pixKeyType?: 'CPF' | 'EMAIL' | 'PHONE' | 'RANDOM' | null;
    submittedAt?: string;
    invitedAt: string;
    createdAt: string;
    class: {
        course: { name: string };
        city?: { name: string; state: string };
    };
    certificate?: { verificationCode: string; issuedAt: string };
}

const CARD_BASE: CSSProperties = {
    borderRadius: 16,
    overflow: 'hidden',
    transition: 'all 0.25s',
    position: 'relative',
    border: '1px solid #E5E7EB',
};

const STATUS_CFG: Record<FeedbackStatus, { label: string; icon: string; color: string; bg: string; border: string; glow: string }> = {
    PENDING_STUDENT_RESPONSE: { label: 'Aguardando sua resposta', icon: '⏳', color: '#B89B00', bg: 'linear-gradient(145deg, #FFFDF5, #FFFDE7)', border: 'rgba(255,214,0,0.35)', glow: 'rgba(255,214,0,0.2)' },
    SUBMITTED:                { label: 'Em análise',              icon: '🔍', color: '#2563EB', bg: 'linear-gradient(145deg, #EFF6FF, #DBEAFE)', border: 'rgba(37,99,235,0.3)', glow: 'rgba(37,99,235,0.15)' },
    CONTENT_APPROVED:        { label: 'Triagem OK — aguarda PIX', icon: '👍', color: '#7C3AED', bg: 'linear-gradient(145deg, #F5F3FF, #EDE9FE)', border: 'rgba(124,58,237,0.35)', glow: 'rgba(124,58,237,0.15)' },
    APPROVED:                 { label: 'PIX aprovado',            icon: '✅', color: '#059669', bg: 'linear-gradient(145deg, #F0FDF4, #DCFCE7)', border: 'rgba(16,185,129,0.35)', glow: 'rgba(16,185,129,0.2)' },
    REJECTED:                 { label: 'Não aprovado',            icon: '❌', color: '#DC2626', bg: 'linear-gradient(145deg, #FEF2F2, #FEE2E2)', border: 'rgba(220,38,38,0.35)', glow: 'rgba(220,38,38,0.15)' },
    REVERTED:                 { label: 'Revertido',               icon: '↩️', color: '#EA580C', bg: 'linear-gradient(145deg, #FFF7ED, #FFEDD5)', border: 'rgba(234,88,12,0.35)', glow: 'rgba(234,88,12,0.15)' },
    EXPIRED:                  { label: 'Expirado',                icon: '⏱️', color: '#6B7280', bg: 'linear-gradient(145deg, #F9FAFB, #F3F4F6)', border: 'rgba(107,114,128,0.3)', glow: 'rgba(107,114,128,0.1)' },
};

export default function StudentFeedbackList() {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const load = async () => {
        try {
            setLoading(true);
            const r = await api.get('/feedbacks/my');
            setFeedbacks(r.data ?? []);
        } catch {
            setFeedbacks([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

    const pending = feedbacks.filter(f => f.status === 'PENDING_STUDENT_RESPONSE');
    const rejectedRedo = feedbacks.filter(f => f.status === 'REJECTED');
    const history = feedbacks.filter(
        f => f.status !== 'PENDING_STUDENT_RESPONSE' && f.status !== 'REJECTED',
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
            <AdminHeaderHero
                title="FEEDBACK & PIX"
                subtitle="Avalie seus cursos e receba uma recompensa em PIX"
                badge="PORTAL DO ALUNO"
            />

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem', width: 40, height: 40 }} />
                    <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem', letterSpacing: '0.15em', color: '#9CA3AF' }}>CARREGANDO...</p>
                </div>
            ) : feedbacks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'linear-gradient(145deg, #FFFDF5, #FFFDE7)', borderRadius: 20, border: '2px dashed rgba(255,214,0,0.4)' }}>
                    <div style={{ width: 72, height: 72, borderRadius: 20, margin: '0 auto 1rem', background: 'linear-gradient(135deg, #FFD600, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(255,214,0,0.3)' }}>
                        <ChatBubbleLeftRightIcon style={{ width: 36, height: 36, color: '#0F172A' }} />
                    </div>
                    <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.12em', color: '#B89B00', marginBottom: '0.5rem' }}>NENHUM FEEDBACK DISPONÍVEL</p>
                    <p style={{ fontSize: '0.85rem', color: '#6B7280', maxWidth: 340, margin: '0 auto' }}>Ainda não completou nenhum curso — ao finalizar, você receberá um convite aqui para avaliar e ganhar um PIX. 🎁</p>
                </div>
            ) : (
                <>
                    {/* Pending */}
                    {rejectedRedo.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.12em' }}>⚠️ Correção pedida — reenvie o feedback</div>
                            {rejectedRedo.map((fb, idx) => (
                                <div key={fb.id} className="animate-scale-in"
                                    onClick={() => router.push(`/student/feedback/${fb.id}`)}
                                    style={{
                                        animationDelay: `${idx * 60}ms`, borderRadius: 16,
                                        background: 'linear-gradient(145deg, #FEF2F2, #FEE2E2)',
                                        border: '2px solid rgba(220,38,38,0.35)',
                                        cursor: 'pointer',
                                        ...CARD_BASE,
                                        boxShadow: '0 4px 16px rgba(220,38,38,0.12)',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.01)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                                >
                                    <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(220,38,38,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>✏️</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#991B1B', marginBottom: 2 }}>{fb.class.course.name}</div>
                                            <div style={{ fontSize: '0.76rem', color: '#64748B' }}>Veja o motivo e envie novamente todos os dados.</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {pending.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#B89B00', textTransform: 'uppercase', letterSpacing: '0.12em' }}>🎁 Convites Pendentes — Responda e ganhe PIX!</div>
                            {pending.map((fb, idx) => (
                                <div key={fb.id} className="animate-scale-in"
                                    onClick={() => router.push(`/student/feedback/${fb.id}`)}
                                    style={{
                                        animationDelay: `${idx * 60}ms`, borderRadius: 16,
                                        background: 'linear-gradient(135deg, #FFD600 0%, #F59E0B 100%)',
                                        cursor: 'pointer',
                                        ...CARD_BASE,
                                        boxShadow: '0 4px 16px rgba(255,214,0,0.3)',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.01)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(255,214,0,0.4)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(255,214,0,0.3)'; }}
                                >
                                    <div style={{ padding: '1.15rem 1.35rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', flexShrink: 0 }}>🎁</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A', marginBottom: 2 }}>{fb.class.course.name}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.55)', marginBottom: 4 }}>
                                                {fb.class.city && `${fb.class.city.name}/${fb.class.city.state} · `}Certificado em {fmt(fb.invitedAt)}
                                            </div>
                                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A' }}>Responder agora e ganhe seu PIX →</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* History */}
                    {history.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.12em' }}>📋 Histórico</div>
                            {history.map((fb, idx) => {
                                const cfg = STATUS_CFG[fb.status] ?? STATUS_CFG.SUBMITTED;
                                return (
                                    <div key={fb.id} className="animate-scale-in"
                                        onClick={() => router.push(`/student/feedback/${fb.id}`)}
                                        style={{
                                            animationDelay: `${(pending.length + rejectedRedo.length + idx) * 60}ms`, borderRadius: 16,
                                            background: cfg.bg, border: `2px solid ${cfg.border}`, borderLeft: `5px solid ${cfg.color}`,
                                            overflow: 'hidden', cursor: 'pointer', transition: 'all 0.25s', position: 'relative',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.01)'; e.currentTarget.style.boxShadow = `0 8px 24px ${cfg.glow}`; }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                                    >
                                        <div style={{ padding: '0.85rem 1.15rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: 0 }}>
                                                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${cfg.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', border: `1px solid ${cfg.color}25`, flexShrink: 0 }}>{cfg.icon}</div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: cfg.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fb.class.course.name}</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                                                        {fb.submittedAt ? `Enviado em ${fmt(fb.submittedAt)}` : `Convidado em ${fmt(fb.invitedAt)}`}
                                                        {fb.ratingGeneral && ` · ⭐ ${fb.ratingGeneral}/5`}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: 100, background: `${cfg.color}15`, border: `1px solid ${cfg.border}`, flexShrink: 0 }}>
                                                <span style={{ fontSize: '0.85rem' }}>{cfg.icon}</span>
                                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: cfg.color, textTransform: 'uppercase' }}>{cfg.label}</span>
                                            </div>
                                        </div>
                                        {(fb.status === 'APPROVED' || fb.status === 'SUBMITTED' || fb.status === 'CONTENT_APPROVED') && (
                                            <div style={{ padding: '0.5rem 1.15rem 0.85rem', borderTop: `1px solid ${cfg.border}`, display: 'grid', gap: 4 }}>
                                                {fb.status === 'APPROVED' && fb.pixAmount && (
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669' }}>💰 PIX: R$ {Number(fb.pixAmount).toFixed(2)}</span>
                                                )}
                                                <span style={{ fontSize: '0.7rem', color: '#475569' }}>
                                                    🔑 Chave: <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{fb.pixKey?.trim() || 'não informada'}</span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
