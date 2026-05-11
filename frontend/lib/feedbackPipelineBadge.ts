/**
 * Etiquetas do pipeline de feedback — mesma lógica na lista admin e na ficha de detalhe.
 */

export type FeedbackPipelineBadge = {
    label: string;
    icon: string;
    color: string;
    bg: string;
    border: string;
};

/** Campos mínimos para derivar o badge (lista ou detalhe). */
export type FeedbackPipelineInput = {
    status: string;
    rewardStatus?: 'PENDING' | 'PAID' | 'CANCELLED' | null;
    contaPagar?: { status: string } | null;
};

export function pipelineBadgeForFeedback(fb: FeedbackPipelineInput): FeedbackPipelineBadge {
    const { status } = fb;
    if (status === 'PENDING_STUDENT_RESPONSE') {
        return { label: 'Aguardando envio', icon: '✏️', color: '#B89B00', bg: '#FFFDF5', border: 'rgba(255,214,0,0.35)' };
    }
    if (status === 'SUBMITTED') {
        return { label: 'Aguardando triagem', icon: '🔍', color: '#2563EB', bg: '#EFF6FF', border: 'rgba(37,99,235,0.3)' };
    }
    if (status === 'CONTENT_APPROVED') {
        return { label: 'Triagem OK', icon: '👍', color: '#7C3AED', bg: '#F5F3FF', border: 'rgba(124,58,237,0.35)' };
    }
    if (status === 'REJECTED') {
        return { label: 'Rejeitado', icon: '❌', color: '#DC2626', bg: '#FEF2F2', border: 'rgba(220,38,38,0.35)' };
    }
    if (status === 'APPROVED') {
        const liquidado = fb.rewardStatus === 'PAID' || fb.contaPagar?.status === 'paga';
        if (liquidado) {
            return { label: 'Pago', icon: '✅', color: '#059669', bg: '#F0FDF4', border: 'rgba(16,185,129,0.35)' };
        }
        return { label: 'Pendente pagamento', icon: '💳', color: '#B45309', bg: '#FFFBEB', border: 'rgba(180,83,9,0.35)' };
    }
    if (status === 'REVERTED') {
        return { label: 'Revertido', icon: '↩️', color: '#EA580C', bg: '#FFF7ED', border: 'rgba(234,88,12,0.35)' };
    }
    if (status === 'EXPIRED') {
        return { label: 'Expirado', icon: '⏱️', color: '#6B7280', bg: '#F9FAFB', border: 'rgba(107,114,128,0.3)' };
    }
    return { label: status, icon: '•', color: '#6B7280', bg: '#F9FAFB', border: 'rgba(107,114,128,0.3)' };
}
