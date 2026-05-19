'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import api from '@/lib/api/client';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';
import { normalizePreviewUrl } from '@/components/ui/UnifiedDocumentPreview';
import { resolveMediaUrl } from '@/lib/resolve-media-url';

/** Presigned GET: reembolso (titular/admin), documento imprevisto (admin ou portal /absences). */
export type EmployeeAttachmentPresign =
    | { kind: 'reimbursement'; id: string }
    | { kind: 'absence-admin'; id: string }
    | { kind: 'absence-portal'; id: string };

async function fetchPresignedViewUrl(presign: EmployeeAttachmentPresign): Promise<string | null> {
    try {
        if (presign.kind === 'reimbursement') {
            const { data } = await api.get<{ url: string }>(`/reimbursements/${presign.id}/receipt-presigned-url`);
            return data?.url?.trim() ?? null;
        }
        const path =
            presign.kind === 'absence-admin'
                ? `/admin/absences/${presign.id}/document-presigned-url`
                : `/absences/${presign.id}/document-presigned-url`;
        const { data } = await api.get<{ url: string }>(path);
        return data?.url?.trim() ?? null;
    } catch {
        return null;
    }
}

/** Mesmos blocos visuais de `EmployeeDetailModal` em `funcionários`. */
export function EmployeeStyleSectionTitle({ icon, title, color }: { icon: string; title: string; color: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <div
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: `${color}18`,
                    border: `1.5px solid ${color}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                }}
            >
                {icon}
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{title}</span>
            <div style={{ flex: 1, height: 1, background: `${color}20` }} />
        </div>
    );
}

export function EmployeeStylePill({
    icon,
    label,
    value,
    accent,
    /** Permite várias linhas no valor (evita reticências em textos longos). */
    valueWrap,
}: {
    icon: string;
    label: string;
    value?: string | number | null;
    accent?: string;
    valueWrap?: boolean;
}) {
    if (value === null || value === undefined || value === '') return null;
    return (
        <div
            style={{
                background: accent ? `${accent}08` : '#F8FAFC',
                border: `1.5px solid ${accent ? `${accent}22` : '#E2E8F0'}`,
                borderRadius: 14,
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: valueWrap ? 'flex-start' : 'center',
                gap: '0.75rem',
                minWidth: 0,
            }}
        >
            <span style={{ fontSize: '1.3rem', flexShrink: 0, marginTop: valueWrap ? '0.1rem' : undefined }}>{icon}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
                <div
                    style={{
                        fontSize: '0.6rem',
                        fontWeight: 800,
                        color: accent ?? '#94A3B8',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        marginBottom: '0.18rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {label}
                </div>
                <div
                    style={{
                        fontSize: '0.92rem',
                        fontWeight: 700,
                        color: '#0F172A',
                        lineHeight: 1.35,
                        whiteSpace: valueWrap ? 'normal' : 'nowrap',
                        overflow: valueWrap ? 'visible' : 'hidden',
                        textOverflow: valueWrap ? 'clip' : 'ellipsis',
                        wordBreak: valueWrap ? 'break-word' : undefined,
                    }}
                >
                    {value}
                </div>
            </div>
        </div>
    );
}

export function EmployeeStyleAdminDetailShell({
    onClose,
    accentColor,
    accentGlow = 'rgba(255,214,0,0.25)',
    initials,
    photoUrl,
    statusBadge,
    headline,
    headerTags,
    children,
    footer,
}: {
    onClose: () => void;
    accentColor: string;
    accentGlow?: string;
    initials: string;
    /** URL da foto (MinIO/storage) — se falhar, mostra iniciais. */
    photoUrl?: string | null;
    /** Badge de status livre no mesmo lugar do funcionário (“ATIVO”, “Aguardando…”, etc.). */
    statusBadge?: ReactNode;
    headline: string;
    headerTags?: ReactNode;
    children: ReactNode;
    footer: ReactNode;
}) {
    const [photoFailed, setPhotoFailed] = useState(false);
    const resolvedPhoto = photoUrl ? resolveMediaUrl(photoUrl) || photoUrl : null;
    const showPhoto = !!resolvedPhoto && !photoFailed;

    return (
        <ModalPortal>
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: MODAL_PORTAL_Z_INDEX,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.65)',
                    backdropFilter: 'blur(10px)',
                    padding: '0.75rem',
                }}
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <div
                    style={{
                        width: '100%',
                        maxWidth: 1200,
                        height: 'calc(100vh - 1.5rem)',
                        background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
                        boxShadow: '0 16px 42px rgba(0,0,0,0.35)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        borderRadius: 18,
                        animation: 'slideInRight 0.3s cubic-bezier(0.22,1,0.36,1)',
                    }}
                >
                    <div
                        style={{
                            background: `linear-gradient(135deg, #0A0A0A 0%, ${accentColor}22 100%)`,
                            borderBottom: `3px solid ${accentColor}`,
                            padding: '1.75rem 1.75rem 1.25rem',
                            position: 'relative',
                            overflow: 'hidden',
                            flexShrink: 0,
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundImage:
                                    'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
                                backgroundSize: '32px 32px',
                                pointerEvents: 'none',
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                top: -40,
                                right: -40,
                                width: 200,
                                height: 200,
                                borderRadius: '50%',
                                background: `radial-gradient(circle, ${accentGlow} 0%, transparent 70%)`,
                                pointerEvents: 'none',
                            }}
                        />

                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: 8,
                                width: 32,
                                height: 32,
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1,
                            }}
                        >
                            ✕
                        </button>

                        <div style={{ position: 'relative', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                            <div
                                style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: 20,
                                    flexShrink: 0,
                                    background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10)`,
                                    border: `2.5px solid ${accentColor}70`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontFamily: 'Orbitron, sans-serif',
                                    fontWeight: 900,
                                    fontSize: '1.6rem',
                                    color: accentColor,
                                    boxShadow: `0 0 30px ${accentGlow}, inset 0 1px 0 rgba(255,255,255,0.1)`,
                                    overflow: 'hidden',
                                }}
                            >
                                {showPhoto ? (
                                    <img
                                        src={resolvedPhoto!}
                                        alt=""
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={() => setPhotoFailed(true)}
                                    />
                                ) : (
                                    initials.slice(0, 2)
                                )}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                {statusBadge ? <div style={{ marginBottom: '0.4rem' }}>{statusBadge}</div> : null}

                                <div
                                    style={{
                                        fontFamily: 'Orbitron, sans-serif',
                                        fontWeight: 900,
                                        fontSize: '1.15rem',
                                        color: '#FFFFFF',
                                        letterSpacing: '0.04em',
                                        lineHeight: 1.2,
                                        marginBottom: '0.5rem',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {headline}
                                </div>

                                {headerTags ? <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>{headerTags}</div> : null}
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            flex: 1,
                            padding: '1.25rem 1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.25rem',
                            overflowY: 'auto',
                            minHeight: 0,
                        }}
                        className="custom-scrollbar"
                    >
                        {children}
                    </div>

                    <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #E2E8F0', background: '#FFFFFF', flexShrink: 0 }}>{footer}</div>
                </div>
            </div>
            <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        </ModalPortal>
    );
}

function isImageDoc(url?: string) {
    return !!url && /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(url);
}

function isPdfDoc(url?: string) {
    return !!url && /\.pdf(\?.*)?$/i.test(url);
}

function isMarkedNaoPossui(url?: string | null) {
    if (!url) return false;
    return ['não possui', 'nao possui', 'não tem', 'nao tem'].includes(url.trim().toLowerCase());
}

export type EmployeeStyleAttachmentItem = {
    label: string;
    url?: string | null;
    /** Obtém GET assinado no backend (bucket MinIO privado). Usa apenas ids estáveis para não re-disparar efeitos. */
    presign?: EmployeeAttachmentPresign;
};

/** Lista de um anexo para o grid (titular do reembolso — mesmo endpoint que admin). */
export function portalReimbursementAttachmentDocs(id: string, receiptUrl?: string | null): EmployeeStyleAttachmentItem[] {
    const raw = receiptUrl?.trim();
    if (!raw) return [];
    return [{ label: 'Comprovante', url: raw, presign: { kind: 'reimbursement', id } }];
}

/** Lista de um anexo — portal `GET /absences/:id/document-presigned-url`. */
export function portalAbsenceAttachmentDocs(id: string, documentUrl?: string | null): EmployeeStyleAttachmentItem[] {
    const raw = documentUrl?.trim();
    if (!raw) return [];
    return [{ label: 'Documento / atestado', url: raw, presign: { kind: 'absence-portal', id } }];
}

function AttachmentResolvedCard({
    label,
    raw,
    normalizedFallback,
    presign,
}: {
    label: string;
    raw: string;
    normalizedFallback: string;
    presign?: EmployeeAttachmentPresign;
}) {
    const [displayUrl, setDisplayUrl] = useState(normalizedFallback);

    useEffect(() => {
        let cancelled = false;

        async function resolve() {
            if (presign) {
                try {
                    const u = await fetchPresignedViewUrl(presign);
                    if (!cancelled && u?.trim()) {
                        setDisplayUrl(u.trim());
                        return;
                    }
                } catch {
                    /* Fallback abaixo */
                }
            }
            if (!cancelled) setDisplayUrl(normalizedFallback);
        }

        resolve();
        return () => {
            cancelled = true;
        };
    }, [presign?.kind, presign?.id, normalizedFallback]);

    const href = displayUrl.trim() || normalizedFallback;

    return (
        <a
            href={href || '#'}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
                if (!href) e.preventDefault();
            }}
            style={{ textDecoration: 'none', border: '1px solid #DBEAFE', borderRadius: 10, background: '#fff', overflow: 'hidden' }}
        >
            <div
                style={{
                    width: '100%',
                    minHeight: 112,
                    maxHeight: 320,
                    background: '#F8FAFC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.45rem',
                    boxSizing: 'border-box',
                }}
            >
                {isImageDoc(href) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={href}
                        alt={label}
                        style={{
                            maxWidth: '100%',
                            maxHeight: 280,
                            width: 'auto',
                            height: 'auto',
                            objectFit: 'contain',
                            display: 'block',
                        }}
                    />
                ) : isPdfDoc(href) ? (
                    <span style={{ fontSize: '2rem' }}>📄</span>
                ) : (
                    <span style={{ fontSize: '2rem' }}>📎</span>
                )}
            </div>
            <div style={{ padding: '0.5rem 0.6rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1D4ED8' }}>{label}</div>
                <div style={{ fontSize: '0.65rem', color: '#6B7280', marginTop: 2 }}>{isPdfDoc(href) ? 'Abrir PDF' : 'Abrir arquivo'} ↗</div>
            </div>
        </a>
    );
}

/** Grade de anexos idêntica à de funcionários (`buildDocCards` + markup). URLs relativas são normalizadas; `presign` resolve MinIO privado. */
export function EmployeeStyleAttachmentsGrid({ docs }: { docs: EmployeeStyleAttachmentItem[] }) {
    const normalized = docs
        .filter((d) => (d.url != null && String(d.url).trim().length > 0) || !!d.presign)
        .map((d) => ({
            label: d.label,
            raw: String(d.url ?? '').trim(),
            normalizedFallback: normalizePreviewUrl(d.url),
            presign: d.presign,
        }))
        .filter((d) => d.normalizedFallback.length > 0 || !!d.presign);

    if (!normalized.length) {
        return (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '0.85rem 1rem', fontSize: '0.82rem', color: '#B91C1C', fontWeight: 600 }}>
                Nenhum documento anexado a este registro. Solicite ao solicitante ou anexe pela edição quando disponível.
            </div>
        );
    }

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '0.65rem',
                background: 'rgba(59,130,246,0.05)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid rgba(59,130,246,0.2)',
            }}
        >
            {normalized.map((doc) =>
                isMarkedNaoPossui(doc.raw || doc.normalizedFallback) ? (
                    <div key={doc.label} style={{ border: '1px solid #FDE68A', borderRadius: 10, background: '#FFFBEB', overflow: 'hidden' }}>
                        <div style={{ height: 92, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '1.8rem' }}>📄</span>
                        </div>
                        <div style={{ padding: '0.5rem 0.6rem' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E' }}>{doc.label}</div>
                            <div style={{ fontSize: '0.65rem', color: '#B45309', marginTop: 2, fontWeight: 700 }}>não possui</div>
                        </div>
                    </div>
                ) : (
                    <AttachmentResolvedCard
                        key={doc.label}
                        label={doc.label}
                        raw={doc.raw}
                        normalizedFallback={doc.normalizedFallback}
                        presign={doc.presign}
                    />
                ),
            )}
        </div>
    );
}
