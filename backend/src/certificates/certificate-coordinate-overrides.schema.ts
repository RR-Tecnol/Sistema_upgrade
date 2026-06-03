import { z } from 'zod';

/** Aceita número ou string numérica (variações comuns em JSONB / edição manual). */
const optNum = z.preprocess((v) => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}, z.number().finite().optional());

/**
 * Chaves conhecidas de `coordinateOverrides` (JSONB) para overlay PDF_BASE.
 * Números em pontos PDF (1 pt = 1/72"). Zod evita que JSON corrupto derrube o motor.
 */
export const certificateCoordinateOverridesZod = z
  .object({
    /** Centro horizontal do bloco do nome (pt); se omitido, o nome fica centralizado na página. */
    nameX: optNum,
    nameY: optNum,
    nameSize: optNum,
    detailsY: optNum,
    detailsSize: optNum,
    qrSize: optNum,
    qrX: optNum,
    qrY: optNum,
    /** QR Code na Página 2 (verso) — coordenadas independentes */
    p2QrX: optNum,
    p2QrY: optNum,
    p2QrSize: optNum,
    paragraphX: optNum,
    paragraphY: optNum,
    paragraphW: optNum,
    paragraphH: optNum,
    bodyTextSize: optNum,
    line1Y: optNum,
    line2Y: optNum,
    line3Y: optNum,
    p2CourseBoxX: optNum,
    p2CourseBoxY: optNum,
    p2CourseBoxW: optNum,
    p2CourseBoxH: optNum,
    p2CourseTextSize: optNum,
    dateX: optNum,
    dateY: optNum,
    dateSize: optNum,
    syllabusY: optNum,
    syllabusCol1X: optNum,
    syllabusCol2X: optNum,
    syllabusCol3X: optNum,
    syllabusCol1W: optNum,
    syllabusCol3W: optNum,
    syllabusTextSize: optNum,
    p2WorkloadX: optNum,
    p2WorkloadY: optNum,
    p2WorkloadSize: optNum,
    p2WorkloadW: optNum,
  })
  // Aceita chaves dinâmicas (ex: syllabusBlock0Y, syllabusBlock1Y…) sem descartar
  .catchall(optNum);

export type CertificateCoordinateOverrides = z.infer<typeof certificateCoordinateOverridesZod>;

function dropEmpty(o: CertificateCoordinateOverrides): CertificateCoordinateOverrides | null {
  const e = Object.entries(o).filter(([, v]) => v !== undefined);
  if (e.length === 0) return null;
  return Object.fromEntries(e) as CertificateCoordinateOverrides;
}

/**
 * Aceita `unknown` (JSONB) e devolve um objeto parcial validado, ou `null` se nada válido.
 */
export function parseCertificateCoordinateOverridesFromDb(raw: unknown): CertificateCoordinateOverrides | null {
  if (raw == null) return null;
  const parsed = certificateCoordinateOverridesZod.safeParse(raw);
  if (!parsed.success) {
    return null;
  }
  return dropEmpty(parsed.data);
}

/**
 * Mescla overrides parciais (p.ex. formulário) sobre um base, depois valida.
 */
export function mergeCertificateCoordinateOverrides(
  base: unknown,
  patch: Record<string, number | undefined> | undefined,
): CertificateCoordinateOverrides | null {
  const a = (base && typeof base === 'object' && !Array.isArray(base) ? base : {}) as Record<string, unknown>;
  const b = patch && typeof patch === 'object' ? patch : {};
  const merged: Record<string, unknown> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (v === undefined) continue;
    if (typeof v === 'number' && Number.isFinite(v)) {
      merged[k] = v;
    }
  }
  return parseCertificateCoordinateOverridesFromDb(merged);
}
