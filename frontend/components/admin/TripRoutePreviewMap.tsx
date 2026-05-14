'use client';

/**
 * Pré-visualização da rota A→B (estradas reais via OSRM público, mesmo padrão do MapaMotoristas).
 * Leaflet carregado só no cliente (import dinâmico).
 */
import { useEffect, useRef, useState } from 'react';

export type TripRoutePreviewMapProps = {
    originLat: number;
    originLng: number;
    destLat: number;
    destLng: number;
    height?: number;
};

function ensureLeafletCssLink() {
    if (typeof document === 'undefined') return;
    const id = 'leaflet-css-trip-route-preview';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
}

async function routeOSRM(from: [number, number], to: [number, number]): Promise<[number, number][]> {
    const [fLat, fLng] = from;
    const [tLat, tLng] = to;
    const url = `https://router.project-osrm.org/route/v1/driving/${fLng},${fLat};${tLng},${tLat}?overview=full&geometries=geojson`;
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if (!res.ok) return [from, to];
        const data = await res.json();
        if (data.code !== 'Ok' || !data.routes?.length) return [from, to];
        return data.routes[0].geometry.coordinates.map(
            ([lon, lat]: [number, number]) => [lat, lon] as [number, number],
        );
    } catch {
        return [from, to];
    }
}

function validCoord(lat: number, lng: number) {
    return (
        Number.isFinite(lat) && Number.isFinite(lng) &&
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    );
}

export default function TripRoutePreviewMap({
    originLat,
    originLng,
    destLat,
    destLng,
    height = 300,
}: TripRoutePreviewMapProps) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<unknown>(null);
    const [hint, setHint] = useState<string | null>('Carregando mapa da rota…');

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return undefined;

        if (!validCoord(originLat, originLng) || !validCoord(destLat, destLng)) {
            setHint('Coordenadas inválidas para desenhar a rota.');
            return undefined;
        }

        let cancelled = false;

        (async () => {
            try {
                ensureLeafletCssLink();
                const L = (await import('leaflet')).default;

                if (cancelled || !wrapRef.current) return;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const Leaf = L as any;
                Reflect.deleteProperty(Leaf.Icon.Default.prototype as object, '_getIconUrl');
                Leaf.Icon.Default.mergeOptions({
                    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                });

                const map = Leaf.map(el, {
                    center: [(originLat + destLat) / 2, (originLng + destLng) / 2],
                    zoom: 8,
                    zoomControl: true,
                });
                mapRef.current = map;

                Leaf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution:
                        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Rotas OSRM',
                    maxZoom: 19,
                }).addTo(map);

                setHint('Calculando trajeto pelas estradas…');
                const latlngs: [number, number][] = await routeOSRM(
                    [originLat, originLng],
                    [destLat, destLng],
                );
                if (cancelled || !mapRef.current) return;

                const isStraightFallback = latlngs.length <= 2;
                setHint(
                    isStraightFallback
                        ? 'Serviço de rota indisponível ou sem caminho dirigível — exibindo linha direta entre os pontos. Use Google Maps / Waze para conferir.'
                        : 'Trajeto estimado (dirigível) entre origem e destino.',
                );

                const route = Leaf.polyline(latlngs, {
                    color: '#B45309',
                    weight: 5,
                    opacity: 0.92,
                    lineJoin: 'round',
                }).addTo(map);

                const startIcon = Leaf.divIcon({
                    className: '',
                    html: '<div style="width:26px;height:26px;border-radius:50%;background:#0891B2;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#fff">A</div>',
                    iconSize: [26, 26],
                    iconAnchor: [13, 13],
                });
                const endIcon = Leaf.divIcon({
                    className: '',
                    html: '<div style="width:26px;height:26px;border-radius:50%;background:#15803D;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#fff">B</div>',
                    iconSize: [26, 26],
                    iconAnchor: [13, 13],
                });

                const m1 = Leaf.marker([originLat, originLng], { icon: startIcon }).addTo(map).bindPopup('Origem');
                const m2 = Leaf.marker([destLat, destLng], { icon: endIcon }).addTo(map).bindPopup('Destino');

                try {
                    map.fitBounds(route.getBounds(), { padding: [36, 36], maxZoom: 12 });
                } catch {
                    map.setView([(originLat + destLat) / 2, (originLng + destLng) / 2], 7);
                }
            } catch {
                if (!cancelled) setHint('Não foi possível inicializar o mapa.');
            }
        })();

        return () => {
            cancelled = true;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const m = mapRef.current as any;
            if (m?.remove) {
                try {
                    m.remove();
                } catch {
                    /* noop */
                }
            }
            mapRef.current = null;
        };
    }, [originLat, originLng, destLat, destLng]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
                ref={wrapRef}
                style={{
                    width: '100%',
                    height,
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: '1px solid #E2E8F0',
                    background: '#F1F5F9',
                }}
            />
            {hint && (
                <div
                    style={{
                        fontSize: '.72rem',
                        lineHeight: 1.45,
                        color: hint.startsWith('Serviço') || hint.startsWith('Não foi') ? '#B45309' : '#475569',
                        background: hint.startsWith('Serviço') || hint.startsWith('Não foi') ? '#FFFBEB' : '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: 8,
                        padding: '0.45rem 0.6rem',
                    }}
                >
                    {hint}
                </div>
            )}
        </div>
    );
}
