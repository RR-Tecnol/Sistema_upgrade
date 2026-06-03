'use client';

/**
 * Envia posição GPS ao entrar em qualquer página do portal motorista
 * (viagem IN_TRANSIT) e a cada 3 min enquanto a aba estiver aberta.
 */
import { useEffect, useState } from 'react';
import api from '@/lib/api/client';
import { useDriverTracking } from '@/hooks/useDriverTracking';
import { pickActiveInTransitTrip } from '@/lib/driver-trips';

type Props = { onLocationSent?: () => void };

export default function DriverLocationSync({ onLocationSent }: Props) {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await api.get('/driver/trips');
                const trips = Array.isArray(res.data) ? res.data : [];
                const inTransit = trips.filter((t: { status?: string }) => t.status === 'IN_TRANSIT');
                if (!cancelled) {
                    setEnabled(!!pickActiveInTransitTrip(inTransit));
                }
            } catch {
                if (!cancelled) setEnabled(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    useDriverTracking({
        enabled,
        onLocationSent: () => {
            onLocationSent?.();
            window.dispatchEvent(new CustomEvent('driver:location-sent'));
        },
    });

    return null;
}
