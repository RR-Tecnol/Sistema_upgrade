'use client';
/**
 * useDriverTracking — F3.1
 * Hook de rastreamento GPS do motorista.
 * - Polling a cada 3 minutos enquanto viagem IN_TRANSIT
 * - Fila offline em sessionStorage (BUG-SESSION-01: nunca localStorage)
 * - Flush automático ao reconectar (evento 'online')
 * - Para automaticamente ao chamar stop() ou ao desmontar
 */
import { useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api/client';

const POLL_INTERVAL_MS = 3 * 60 * 1000; // 3 minutos
const OFFLINE_QUEUE_KEY = 'driver_location_queue';

interface QueuedLocation {
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    capturedAt: string;
    source: 'polling' | 'checkin' | 'batch';
}

function getQueue(): QueuedLocation[] {
    try {
        const raw = sessionStorage.getItem(OFFLINE_QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function addToQueue(loc: QueuedLocation) {
    const q = getQueue();
    q.push(loc);
    sessionStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
}

function clearQueue() {
    sessionStorage.removeItem(OFFLINE_QUEUE_KEY);
}

async function flushQueue() {
    const q = getQueue();
    if (!q.length) return;
    try {
        await api.post('/driver/location/batch', { locations: q });
        clearQueue();
    } catch { /* mantém na fila para próxima tentativa */ }
}

async function getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocalização não suportada neste dispositivo'));
            return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false, // false = mais rápido e menos bateria
            timeout: 10000,
            maximumAge: 60000,
        });
    });
}

async function sendLocation(source: QueuedLocation['source']) {
    try {
        const pos = await getCurrentPosition();
        const payload: QueuedLocation = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? undefined,
            speed: pos.coords.speed != null ? pos.coords.speed * 3.6 : undefined, // m/s → km/h
            heading: pos.coords.heading ?? undefined,
            capturedAt: new Date(pos.timestamp).toISOString(),
            source,
        };
        await api.post('/driver/location', payload);
    } catch (err: any) {
        // Sem internet ou GPS negado → enfileira para batch posterior
        if (err?.message !== 'Geolocalização não suportada neste dispositivo') {
            try {
                const pos = await getCurrentPosition();
                addToQueue({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    speed: pos.coords.speed != null ? pos.coords.speed * 3.6 : undefined,
                    capturedAt: new Date(pos.timestamp).toISOString(),
                    source: 'batch',
                });
            } catch { /* GPS negado — não enfileira */ }
        }
    }
}

interface UseDriverTrackingOptions {
    enabled: boolean; // true apenas quando Trip está IN_TRANSIT
}

export function useDriverTracking({ enabled }: UseDriverTrackingOptions) {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stop = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const start = useCallback(() => {
        stop(); // limpa intervalo anterior se existia
        // Envia posição imediatamente ao iniciar
        sendLocation('checkin');
        // Polling a cada 3 minutos
        intervalRef.current = setInterval(() => {
            sendLocation('polling');
        }, POLL_INTERVAL_MS);
    }, [stop]);

    // Inicia/para conforme enabled mudar
    useEffect(() => {
        if (enabled) {
            start();
        } else {
            stop();
        }
        return stop;
    }, [enabled, start, stop]);

    // Flush da fila quando voltar online
    useEffect(() => {
        const handleOnline = () => { flushQueue(); };
        window.addEventListener('online', handleOnline);
        // Tenta flush imediato ao montar (caso haja fila de sessão anterior)
        flushQueue();
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    return { start, stop, sendCheckin: () => sendLocation('checkin') };
}
