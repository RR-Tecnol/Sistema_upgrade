'use client';

import { useState } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';

export const ENROLLMENT_DOC_LABELS: Record<string, string> = {
    photo: 'Selfie de rosto',
    identidade: 'Documento de identidade (RG/CNH)',
    cpfDoc: 'CPF',
    addressProof: 'Comprovante de residência',
    educationProof: 'Comprovante de escolaridade',
};

function isPdfUrl(url: string): boolean {
    const u = url.split('?')[0]?.toLowerCase() ?? '';
    return u.endsWith('.pdf');
}

type Variant = 'dark' | 'light';

export type EnrollmentDocumentsMap = Partial<Record<string, string | null | undefined>> | null | undefined;

/** Chaves obrigatórias no fluxo de inscrição (`Step6Documents`) — mesma regra para o Kanban admin. */
export const REQUIRED_ENROLLMENT_DOC_KEYS = ['photo', 'identidade', 'addressProof'] as const;

const OPTIONAL_ENROLLMENT_DOC_KEYS = ['cpfDoc', 'educationProof'] as const;

export type MissingEnrollmentDocEntry = { key: string; label: string; required: boolean };

function enrollmentDocValuePresent(v: unknown): boolean {
    return v != null && String(v).trim().length > 0;
}

function extensionFromDocumentUrl(url: string): string {
    try {
        const pathname = new URL(url.trim()).pathname.toLowerCase();
        if (pathname.endsWith('.pdf')) return '.pdf';
        if (pathname.endsWith('.png')) return '.png';
        if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return '.jpg';
    } catch {
        /* URL relativa ou inválida */
    }
    return '';
}

/**
 * Tenta gravar o ficheiro via blob (útil com MinIO público e CORS permitindo GET).
 * Se falhar, abre o URL num separador para o admin gravar manualmente.
 */
export async function downloadEnrollmentFileFromUrl(url: string, baseFileName: string): Promise<'blob' | 'tab'> {
    const trimmed = url.trim();
    if (!trimmed) return 'tab';

    const ext = extensionFromDocumentUrl(trimmed);
    const safeBase = baseFileName.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 120);
    const downloadName = (safeBase + ext).replace(/^\.+/, '') || 'documento';

    try {
        const res = await fetch(trimmed, { mode: 'cors', credentials: 'omit' });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = downloadName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
        return 'blob';
    } catch {
        window.open(trimmed, '_blank', 'noopener,noreferrer');
        return 'tab';
    }
}

/** Documentos ainda não enviados (obrigatórios primeiro, depois opcionais). */
export function getMissingEnrollmentDocumentEntries(documents: EnrollmentDocumentsMap): MissingEnrollmentDocEntry[] {
    const d = documents || {};
    const out: MissingEnrollmentDocEntry[] = [];
    for (const key of REQUIRED_ENROLLMENT_DOC_KEYS) {
        if (!enrollmentDocValuePresent(d[key])) {
            out.push({ key, label: ENROLLMENT_DOC_LABELS[key] || key, required: true });
        }
    }
    for (const key of OPTIONAL_ENROLLMENT_DOC_KEYS) {
        if (!enrollmentDocValuePresent(d[key])) {
            out.push({ key, label: ENROLLMENT_DOC_LABELS[key] || key, required: false });
        }
    }
    return out;
}

export function EnrollmentDocumentsPreview({
    documents,
    variant = 'dark',
    adminDownloads = false,
    enableLightbox = false,
}: {
    documents: EnrollmentDocumentsMap;
    variant?: Variant;
    /** Exibe botões de download (modal admin de inscrições / revisão). */
    adminDownloads?: boolean;
    /** Permite expandir preview em tela cheia ao clicar no ficheiro. */
    enableLightbox?: boolean;
}) {
    const [downloading, setDownloading] = useState<string | null>(null);
    const [lightbox, setLightbox] = useState<{ key: string; title: string; url: string; pdf: boolean } | null>(null);

    const entries = Object.entries(documents || {}).filter(([, v]) => v && String(v).trim().length > 0);
    if (entries.length === 0) return null;

    const card =
        variant === 'dark'
            ? {
                  wrap: { borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', padding: '0.9rem 1.1rem' } as const,
                  title: { fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#FBBF24', marginBottom: '0.65rem' } as const,
                  label: { fontSize: '0.68rem', fontWeight: 700, color: variant === 'dark' ? '#9CA3AF' : '#6B7280', marginBottom: 6 } as const,
                  frame: { borderRadius: 10, overflow: 'hidden' as const, border: '1px solid rgba(255,255,255,0.08)', background: '#0a0a0a', maxHeight: 220 } as const,
              }
            : {
                  wrap: { borderRadius: 12, border: '1px solid #E5E7EB', background: '#F9FAFB', padding: '0.9rem 1.1rem' } as const,
                  title: { fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#B45309', marginBottom: '0.65rem' } as const,
                  label: { fontSize: '0.68rem', fontWeight: 700, color: '#6B7280', marginBottom: 6 } as const,
                  frame: { borderRadius: 10, overflow: 'hidden' as const, border: '1px solid #E5E7EB', background: '#fff', maxHeight: 280 } as const,
              };

    const btnOutline =
        variant === 'dark'
            ? { border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#E5E7EB' }
            : { border: '1px solid #D1D5DB', background: '#fff', color: '#374151' };

    const handleDownloadOne = async (key: string, url: string) => {
        const id = `one:${key}`;
        setDownloading(id);
        try {
            const ext = extensionFromDocumentUrl(url);
            await downloadEnrollmentFileFromUrl(url, `${key}${ext}`);
        } finally {
            setDownloading(null);
        }
    };

    const handleDownloadAll = async () => {
        setDownloading('all');
        try {
            for (const [key, raw] of entries) {
                const url = String(raw).trim();
                const ext = extensionFromDocumentUrl(url);
                await downloadEnrollmentFileFromUrl(url, `${key}${ext}`);
                await new Promise((r) => setTimeout(r, 280));
            }
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div style={card.wrap}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    marginBottom: adminDownloads ? '0.75rem' : 0,
                }}
            >
                <p style={{ ...card.title, marginBottom: adminDownloads ? 0 : card.title.marginBottom }}>Documentos enviados</p>
                {adminDownloads && (
                    <button
                        type="button"
                        disabled={!!downloading}
                        onClick={() => handleDownloadAll()}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            padding: '0.4rem 0.65rem',
                            borderRadius: 8,
                            cursor: downloading ? 'wait' : 'pointer',
                            opacity: downloading ? 0.65 : 1,
                            ...btnOutline,
                        }}
                    >
                        <ArrowDownTrayIcon style={{ width: 14, height: 14 }} />
                        {downloading === 'all' ? 'Baixando…' : `Baixar todos (${entries.length})`}
                    </button>
                )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {entries.map(([key, raw]) => {
                    const url = String(raw).trim();
                    const title = ENROLLMENT_DOC_LABELS[key] || key;
                    const pdf = isPdfUrl(url);
                    const busy = downloading === `one:${key}` || downloading === 'all';

                    return (
                        <div key={key}>
                            <div
                                style={{
                                    ...card.label,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 8,
                                    flexWrap: 'wrap',
                                }}
                            >
                                <span>{title}</span>
                                {adminDownloads && <span style={{ fontSize: '0.6rem', color: '#9CA3AF' }}>Clique na prévia para ampliar</span>}
                            </div>
                            <div
                                style={{ ...card.frame, cursor: enableLightbox ? 'zoom-in' : 'default' }}
                                onClick={() => {
                                    if (!enableLightbox) return;
                                    setLightbox({ key, title, url, pdf });
                                }}
                            >
                                {pdf ? (
                                    <object
                                        data={url}
                                        type="application/pdf"
                                        title={title}
                                        style={{ width: '100%', height: 240, display: 'block' }}
                                    >
                                        <div
                                            style={{
                                                padding: '1rem',
                                                fontSize: '0.78rem',
                                                color: variant === 'dark' ? '#9CA3AF' : '#6B7280',
                                            }}
                                        >
                                            Pré-visualização de PDF não disponível neste navegador.
                                        </div>
                                    </object>
                                ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={url}
                                        alt={title}
                                        style={{ width: '100%', height: 'auto', maxHeight: 220, objectFit: 'contain', display: 'block' }}
                                    />
                                )}
                            </div>
                            {adminDownloads && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                                    <button
                                        type="button"
                                        disabled={!!downloading}
                                        onClick={() => handleDownloadOne(key, url)}
                                        title="Baixar este arquivo"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 5,
                                            fontSize: '0.62rem',
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            padding: '0.28rem 0.5rem',
                                            borderRadius: 6,
                                            cursor: busy ? 'wait' : 'pointer',
                                            opacity: busy ? 0.65 : 1,
                                            flexShrink: 0,
                                            ...btnOutline,
                                        }}
                                    >
                                        <ArrowDownTrayIcon style={{ width: 12, height: 12 }} />
                                        {busy ? '…' : 'Download'}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {lightbox && (
                <ModalPortal>
                    <div
                        className="modal-overlay"
                        style={{ zIndex: MODAL_PORTAL_Z_INDEX + 20, background: 'rgba(0,0,0,0.88)' }}
                        onClick={() => setLightbox(null)}
                    >
                        <div
                            style={{
                                width: 'min(94vw, 1220px)',
                                maxHeight: '92vh',
                                background: '#0b1220',
                                border: '1px solid rgba(255,255,255,0.16)',
                                borderRadius: 14,
                                padding: '0.75rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                                boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
                            }}
                            onClick={(ev) => ev.stopPropagation()}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                <div style={{ color: '#F8FAFC', fontSize: '0.82rem', fontWeight: 700 }}>{lightbox.title}</div>
                                <button
                                    type="button"
                                    onClick={() => setLightbox(null)}
                                    style={{
                                        border: '1px solid rgba(255,255,255,0.25)',
                                        background: 'rgba(255,255,255,0.08)',
                                        color: '#fff',
                                        borderRadius: 8,
                                        padding: '0.25rem 0.55rem',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                    }}
                                >
                                    Fechar
                                </button>
                            </div>
                            <div style={{ minHeight: 220, maxHeight: '80vh', overflow: 'auto', borderRadius: 10, background: '#020617' }}>
                                {lightbox.pdf ? (
                                    <iframe
                                        src={lightbox.url}
                                        title={lightbox.title}
                                        style={{ width: '100%', height: '76vh', border: 'none', display: 'block' }}
                                    />
                                ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={lightbox.url}
                                        alt={lightbox.title}
                                        style={{ width: '100%', height: 'auto', objectFit: 'contain', display: 'block' }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}
