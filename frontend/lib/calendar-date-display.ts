/**
 * Formata datas de «dia civil» (ex.: ausência/imprevisto) sem deslocamento de fuso:
 * valores ISO vindos como meia-noite UTC (ex.: 2026-05-08T00:00:00.000Z) não devem
 * aparecer como 07/05 no Brasil.
 */

export function isoDatePartsYYYYMMDD(iso: string): { y: number; m: number; d: number } | null {
    const trimmed = iso.trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (!m) return null;
    return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

export function formatCalendarDatePtBR(
    isoOrApiDate: string,
    options?: Intl.DateTimeFormatOptions,
): string {
    const locale = 'pt-BR';
    const parts = isoDatePartsYYYYMMDD(isoOrApiDate);
    const defaults: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
    const d = parts ? new Date(parts.y, parts.m - 1, parts.d) : new Date(isoOrApiDate);
    if (!Number.isFinite(d.getTime())) return isoOrApiDate;
    return d.toLocaleDateString(locale, { ...defaults, ...options });
}
