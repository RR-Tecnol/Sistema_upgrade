'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/client';
import { EnrollmentDocumentsPreview } from '@/components/enrollment/EnrollmentDocumentsPreview';

type Scope = 'admin' | 'driver';

/**
 * Pré-visualização das fotos do hodômetro com o mesmo layout das inscrições.
 * Obtém URL MinIO assinada (GET) — o URL gravado na BD é inacessível no browser (bucket privado).
 */
const DEFAULT_EMPTY = 'O motorista ainda não enviou fotos do hodômetro nesta viagem.';

export function TripOdometerPhotosPreview({
    tripId,
    startUrl,
    endUrl,
    scope = 'admin',
    emptyMessage = DEFAULT_EMPTY,
}: {
    tripId: string;
    startUrl?: string | null;
    endUrl?: string | null;
    scope?: Scope;
    emptyMessage?: string;
}) {
    const apiBase = scope === 'admin' ? '/admin/trips' : '/driver/trips';
    const [resolved, setResolved] = useState<{ start?: string; end?: string }>({});
    const needsFetch = !!(String(startUrl ?? '').trim() || String(endUrl ?? '').trim());
    const [loading, setLoading] = useState(needsFetch);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            const hasStart = !!(startUrl && String(startUrl).trim());
            const hasEnd = !!(endUrl && String(endUrl).trim());
            if (!hasStart && !hasEnd) {
                if (!cancelled) setLoading(false);
                return;
            }
            const next: { start?: string; end?: string } = {};
            try {
                if (hasStart) {
                    const { data } = await api.get<{ url: string }>(`${apiBase}/${tripId}/odometer-photo-url`, {
                        params: { kind: 'start' },
                    });
                    next.start = data.url;
                }
                if (hasEnd) {
                    const { data } = await api.get<{ url: string }>(`${apiBase}/${tripId}/odometer-photo-url`, {
                        params: { kind: 'end' },
                    });
                    next.end = data.url;
                }
            } catch {
                if (hasStart) next.start = String(startUrl).trim();
                if (hasEnd) next.end = String(endUrl).trim();
            }
            if (!cancelled) {
                setResolved(next);
                setLoading(false);
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [tripId, startUrl, endUrl, apiBase]);

    if (loading) {
        return (
            <div
                style={{
                    borderRadius: 12,
                    border: '1px solid #E5E7EB',
                    background: '#F9FAFB',
                    padding: '1rem 1.1rem',
                    fontSize: '0.82rem',
                    color: '#64748B',
                }}
            >
                A carregar fotos…
            </div>
        );
    }

    return (
        <EnrollmentDocumentsPreview
            documents={{
                startOdometer: resolved.start ?? startUrl ?? undefined,
                endOdometer: resolved.end ?? endUrl ?? undefined,
            }}
            variant="light"
            adminDownloads
            enableLightbox
            heading="Fotos comprobatórias"
            customLabels={{
                startOdometer: 'Hodômetro — ida (saída)',
                endOdometer: 'Hodômetro — volta (chegada)',
            }}
            emptyMessage={emptyMessage}
        />
    );
}
