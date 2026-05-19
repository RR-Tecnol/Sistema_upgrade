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
    const [unavailable, setUnavailable] = useState<{ start?: boolean; end?: boolean }>({});
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
            const notFound: { start?: boolean; end?: boolean } = {};
            if (hasStart) {
                try {
                    const { data } = await api.get<{ url: string }>(`${apiBase}/${tripId}/odometer-photo-url`, {
                        params: { kind: 'start' },
                    });
                    next.start = data.url;
                } catch (e: any) {
                    // 404 = arquivo não existe no MinIO; não usar URL crua (retorna XML de erro)
                    notFound.start = true;
                }
            }
            if (hasEnd) {
                try {
                    const { data } = await api.get<{ url: string }>(`${apiBase}/${tripId}/odometer-photo-url`, {
                        params: { kind: 'end' },
                    });
                    next.end = data.url;
                } catch {
                    notFound.end = true;
                }
            }
            if (!cancelled) {
                setResolved(next);
                setUnavailable(notFound);
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

    // Fotos antigas (URL na BD mas ficheiro não existe no MinIO) — mostrar aviso
    const hasAnyUnavailable = unavailable.start || unavailable.end;

    return (
        <>
            {hasAnyUnavailable && (
                <div style={{
                    padding: '0.6rem 0.85rem', borderRadius: 8, background: '#FEF3C7',
                    border: '1px solid #FDE68A', fontSize: '0.75rem', color: '#92400E',
                    marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                }}>
                    ⚠️ {unavailable.start && !unavailable.end ? 'Foto de ida' :
                         !unavailable.start && unavailable.end ? 'Foto de chegada' :
                         'Fotos'} não disponível(is) — arquivo não encontrado no armazenamento.
                </div>
            )}
            <EnrollmentDocumentsPreview
                documents={{
                    startOdometer: resolved.start,
                    endOdometer: resolved.end,
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
        </>
    );
}
