/**
 * Parseia resposta de `BadRequestException` na emissão de certificado (Nest pode devolver objeto com `reasons`).
 */
export function formatCertificateIssueError(err: unknown): string {
    const ax = err as {
        response?: {
            data?: Record<string, unknown> & {
                message?: unknown;
                reasons?: unknown;
                attendanceRateBeforePenaltyPct?: unknown;
                attendanceRateAfterPenaltyPct?: unknown;
                imprevistoPenaltyPctSum?: unknown;
            };
        };
    };
    const data = ax?.response?.data;
    if (!data || typeof data !== 'object') {
        return err instanceof Error ? err.message : 'Erro desconhecido.';
    }

    let head = 'Não foi possível emitir o certificado.';

    const rawMsg = data.message;
    if (typeof rawMsg === 'string') {
        head = rawMsg;
    } else if (Array.isArray(rawMsg)) {
        head = rawMsg.map(String).filter(Boolean).join(' ');
    } else if (rawMsg && typeof rawMsg === 'object') {
        const inner = (rawMsg as Record<string, unknown>).message;
        if (typeof inner === 'string') head = inner;
    }

    const parts: string[] = [head];

    const pctAfter = Number(data.attendanceRateAfterPenaltyPct);
    const pctBefore = Number(data.attendanceRateBeforePenaltyPct);
    const pen = Number(data.imprevistoPenaltyPctSum);

    if (Number.isFinite(pctBefore) && Number.isFinite(pctAfter)) {
        parts.push(`Presença efectiva antes das penalidades: ${pctBefore}%.`);
        parts.push(`Após penalidades de imprevisto: ${pctAfter}%.`);
    } else if (Number.isFinite(pctAfter)) {
        parts.push(`Presença efectiva (após penalidades quando aplicável): ${pctAfter}%.`);
    }
    if (Number.isFinite(pen) && pen > 0) {
        parts.push(`Total de penalidades de imprevisto no período: ${pen}% da carga.`);
    }

    const reasons = data.reasons;
    if (Array.isArray(reasons) && reasons.length > 0) {
        parts.push(reasons.filter(r => typeof r === 'string' && r.trim()).map(r => `• ${String(r)}`).join('\n'));
    }

    return parts.filter(Boolean).join('\n');
}
