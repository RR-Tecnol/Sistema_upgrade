'use client';

import { useState } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';

export type EmployeePreviewDoc = {
    key: string;
    label: string;
    url: string;
};

function isPdfUrl(url: string): boolean {
    const u = url.split('?')[0]?.toLowerCase() ?? '';
    return u.endsWith('.pdf');
}

function extensionFromUrl(url: string): string {
    try {
        const pathname = new URL(url.trim()).pathname.toLowerCase();
        if (pathname.endsWith('.pdf')) return '.pdf';
        if (pathname.endsWith('.png')) return '.png';
        if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return '.jpg';
        if (pathname.endsWith('.webp')) return '.webp';
    } catch {
        // URL relativa
    }
    return '';
}

async function downloadFileFromUrl(url: string, baseFileName: string): Promise<'blob' | 'tab'> {
    const trimmed = url.trim();
    if (!trimmed) return 'tab';

    const ext = extensionFromUrl(trimmed);
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

export function EmployeeDocumentsPreview({ docs }: { docs: EmployeePreviewDoc[] }) {
    const [downloading, setDownloading] = useState<string | null>(null);
    const [lightbox, setLightbox] = useState<{ key: string; title: string; url: string; pdf: boolean } | null>(null);

    if (!docs.length) {
        return (
            <div style={{ padding: '1rem', background: '#F3F4F6', borderRadius: '12px', fontSize: '0.8rem', color: '#9CA3AF', textAlign: 'center', fontStyle: 'italic' }}>
                Nenhum documento anexado.
            </div>
        );
    }

    const handleDownloadOne = async (key: string, url: string) => {
        const id = `one:${key}`;
        setDownloading(id);
        try {
            const ext = extensionFromUrl(url);
            await downloadFileFromUrl(url, `${key}${ext}`);
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {docs.map((doc, idx) => {
                const pdf = isPdfUrl(doc.url);
                const busy = downloading === `one:${doc.key}`;
                return (
                    <div key={`${doc.key}-${idx}`} style={{ border: '1px solid #E5E7EB', borderRadius: '12px', background: '#fff', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 0.9rem' }}>
                            <span style={{ fontSize: '1.1rem' }}>📄</span>
                            <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 700, color: '#111827' }}>{doc.label}</span>
                            <button
                                type="button"
                                onClick={() => setLightbox({ key: doc.key, title: doc.label, url: doc.url, pdf })}
                                style={{ border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#1D4ED8', borderRadius: 8, padding: '0.25rem 0.55rem', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer' }}
                            >
                                Ver
                            </button>
                            <button
                                type="button"
                                disabled={!!busy}
                                onClick={() => handleDownloadOne(doc.key, doc.url)}
                                style={{ border: '1px solid #BBF7D0', background: '#ECFDF5', color: '#047857', borderRadius: 8, padding: '0.25rem 0.55rem', fontSize: '0.68rem', fontWeight: 800, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                            >
                                <ArrowDownTrayIcon style={{ width: 12, height: 12 }} />
                                Download
                            </button>
                        </div>
                    </div>
                );
            })}

            {lightbox && (
                <ModalPortal>
                    <div
                        className="modal-overlay"
                        style={{ zIndex: MODAL_PORTAL_Z_INDEX + 5, background: 'rgba(15,23,42,0.88)' }}
                        onClick={() => setLightbox(null)}
                    >
                        <div
                            className="modal-content"
                            style={{ width: 'min(96vw, 1120px)', maxHeight: '92vh', overflow: 'hidden', padding: 0, borderRadius: 14 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.9rem', borderBottom: '1px solid #E5E7EB', background: '#fff' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A' }}>{lightbox.title}</div>
                                <button onClick={() => setLightbox(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1.15rem', lineHeight: 1 }}>✕</button>
                            </div>
                            <div style={{ background: '#0B1220', maxHeight: 'calc(92vh - 46px)', overflow: 'auto' }}>
                                {lightbox.pdf ? (
                                    <object data={lightbox.url} type="application/pdf" title={lightbox.title} style={{ width: '100%', height: 'calc(92vh - 46px)', display: 'block', background: '#fff' }}>
                                        <div style={{ padding: '1rem', color: '#E2E8F0', fontSize: '0.85rem' }}>
                                            Pré-visualização de PDF indisponível. Use o botão de download.
                                        </div>
                                    </object>
                                ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={lightbox.url} alt={lightbox.title} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain', background: '#fff' }} />
                                )}
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}
