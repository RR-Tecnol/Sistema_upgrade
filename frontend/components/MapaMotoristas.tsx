'use client';
/**
 * MapaMotoristas — F4.1 + F4.2
 * Leaflet vanilla (import dinâmico em useEffect — sem react-leaflet).
 * Trilha e rota estimada seguem estradas reais via OSRM (gratuito, sem key).
 *
 * REGRAS DE KEY: todos os refs (markersRef, trailsRef, routesRef, caches)
 * usam tripKey = driver.trip.id (único por viagem).
 * userId NÃO é usado como key pois pode duplicar em ambiente de teste.
 */
import { useEffect, useRef, useCallback } from 'react';

export interface DriverMarker {
    userId: string;
    name: string;
    status: 'online' | 'offline' | 'stopped';
    lastLocation: {
        lat: number; lng: number;
        speed?: number | null; heading?: number | null;
        capturedAt: string;
    } | null;
    trip: {
        id: string;
        origin: string;
        destination: string;
        originLat?: number | null;
        originLng?: number | null;
        destinationLat?: number | null;
        destinationLng?: number | null;
        truck?: { identifier: string; licensePlate: string } | null;
    };
    eta: { distanciaKm: number; minutos: number; fonte: 'haversine' | 'google' } | null;
    progress: number;
    trail?: { latitude: number; longitude: number }[];
    isCompleted?: boolean;  // F5.15: true = motorista concluiu viagem, pin cinza
}

interface MapaMotoristaProps {
    drivers: DriverMarker[];
    selectedDriverId?: string | null;
    onDriverClick?: (driverId: string) => void;
    routeMode?: 'trail' | 'remaining' | 'both';  // F5.17 — padrão: 'both'
}

const STATUS_COLOR: Record<string, string> = {
    online:  '#22C55E',
    stopped: '#F59E0B',
    offline: '#EF4444',
};

function fmtETA(min: number) {
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60); const m = min % 60;
    return m ? `${h}h${m}min` : `${h}h`;
}

// ── OSRM: rota A→B pelas estradas reais ──────────────────────────────────────
async function routeOSRM(
    from: [number, number],
    to:   [number, number],
): Promise<[number, number][]> {
    const [fLat, fLng] = from;
    const [tLat, tLng] = to;
    const url = `https://router.project-osrm.org/route/v1/driving/${fLng},${fLat};${tLng},${tLat}?overview=full&geometries=geojson`;
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return [from, to];
        const data = await res.json();
        if (data.code !== 'Ok' || !data.routes?.length) return [from, to];
        // GeoJSON retorna [lon, lat] — invertemos para [lat, lon] (Leaflet)
        return data.routes[0].geometry.coordinates.map(
            ([lon, lat]: [number, number]) => [lat, lon] as [number, number]
        );
    } catch {
        return [from, to]; // fallback: linha reta
    }
}

// ── Trilha GPS → estradas: OSRM Route entre cada par consecutivo de pontos ────
// Com 2+ pontos GPS reais, cada segmento vira a rota completa pelas ruas.
async function buildRoadTrail(pts: [number, number][]): Promise<[number, number][]> {
    if (pts.length < 2) return pts;
    const segments = await Promise.all(
        pts.slice(0, -1).map((p, i) => routeOSRM(p, pts[i + 1]))
    );
    const result: [number, number][] = [];
    segments.forEach((seg, i) => {
        if (i === 0) result.push(...seg);
        else result.push(...seg.slice(1)); // remove ponto de junção duplicado
    });
    return result;
}

// ── Fatia X% inicial de uma rota como "trilha percorrida" ────────────────────
// Usado quando há poucos pontos GPS: simula visualmente a trilha pelo progresso.
function sliceByProgress(route: [number, number][], pct: number): [number, number][] {
    if (!route.length || pct <= 0) return [];
    if (pct >= 100) return route;
    const cutIdx = Math.max(1, Math.floor(route.length * pct / 100));
    return route.slice(0, cutIdx);
}

export default function MapaMotoristas({ drivers, selectedDriverId, onDriverClick, routeMode = 'both' }: MapaMotoristaProps) {
    const mapDivRef  = useRef<HTMLDivElement>(null);
    const mapRef     = useRef<any>(null);
    const LRef       = useRef<any>(null);

    // Todos os refs keyed por tripKey = driver.trip.id (NUNCA por userId)
    const markersRef = useRef<Map<string, any>>(new Map());
    const trailsRef  = useRef<Map<string, any>>(new Map());
    const routesRef  = useRef<Map<string, any>>(new Map()); // pin de destino
    const remainingRef = useRef<Map<string, any>>(new Map()); // F5.17: linha rota restante

    // Cache de rotas OSRM (A→B completa e trilha percorrida), por tripKey
    const fullRouteCacheRef     = useRef<Map<string, [number, number][]>>(new Map());
    const trailCacheRef         = useRef<Map<string, [number, number][]>>(new Map());

    // ── INICIALIZAÇÃO: uma única vez, com fix para StrictMode ─────────────────
    useEffect(() => {
        const div = mapDivRef.current;
        if (!div) return;

        // StrictMode executa o effect duas vezes — o _leaflet_id evita dupla init
        if ((div as any)._leaflet_id || mapRef.current) return;

        import('leaflet').then((L) => {
            if ((div as any)._leaflet_id || mapRef.current) return; // check pós-async

            LRef.current = L;
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            const map = L.map(div, { center: [-5.0, -44.5], zoom: 6, zoomControl: true });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19,
            }).addTo(map);
            // F5.16: canvas renderer melhora performance com 11+ motoristas (evita SVG lag)
            (map as any)._canvasRenderer = L.canvas();
            mapRef.current = map;
        });

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                markersRef.current.clear();
                trailsRef.current.clear();
                routesRef.current.clear();
                remainingRef.current.clear();
            }
        };
    }, []);

    // ── ATUALIZAÇÃO DO MAPA ────────────────────────────────────────────────────
    const updateMap = useCallback(async () => {
        const L   = LRef.current;
        const map = mapRef.current;
        if (!L || !map) return;

        // Remove layers de trips que saíram — key = tripId
        const activeKeys = new Set(drivers.map(d => d.trip.id));
        markersRef.current.forEach((m, k) => { if (!activeKeys.has(k)) { m.remove(); markersRef.current.delete(k); } });
        trailsRef.current.forEach((l, k)  => { if (!activeKeys.has(k)) { l.remove(); trailsRef.current.delete(k); } });
        routesRef.current.forEach((l, k)  => { if (!activeKeys.has(k)) { l.remove(); routesRef.current.delete(k); } });
        remainingRef.current.forEach((l, k) => { if (!activeKeys.has(k)) { l.remove(); remainingRef.current.delete(k); } }); // F5.17

        // F5.17-fix: loop sequencial (não Promise.all) para evitar rate limit OSRM
        // com 11+ drivers — cada driver espera o anterior antes de chamar OSRM.
        for (const driver of drivers) {
            if (!driver.lastLocation) continue;
            if (!mapRef.current) return; // BUG-LEAFLET-ASYNC: guard entre iterações (prev driver teve await)
            try {

            // ── BUG FIX: lat/lng DEVEM ser declarados aqui, logo após o null-check ──
            const { lat, lng } = driver.lastLocation;

            const tripKey    = driver.trip.id;           // key única por viagem
            // F5.15: pin cinza para COMPLETED
            const isCompleted = driver.isCompleted === true
                             || driver.trip.id.includes('_COMPLETED')
                             || driver.trip.id.includes('VIRTUAL_');
            const color      = isCompleted ? '#94A3B8' : (STATUS_COLOR[driver.status] || STATUS_COLOR.offline);
            const isSelected = driver.userId === selectedDriverId;
            const size       = isSelected ? 38 : 32;

            // ── ÍCONE DO MOTORISTA ────────────────────────────────────────────
            const icon = L.divIcon({
                className: '',
                html: `<div style="
                    width:${size}px;height:${size}px;border-radius:50%;
                    background:${color};
                    border:${isSelected ? '3px solid #FFD600' : '2px solid #fff'};
                    box-shadow:0 2px 8px rgba(0,0,0,.4)${isSelected ? ',0 0 0 4px rgba(255,214,0,.35)' : ''};
                    display:flex;align-items:center;justify-content:center;
                    font-size:13px;font-weight:900;color:#fff;cursor:pointer;
                ">${driver.name?.charAt(0).toUpperCase() || '?'}</div>`,
                iconSize: [size, size], iconAnchor: [size / 2, size / 2],
            });

            const popupHtml = `
                <div style="font-family:system-ui;min-width:180px;padding:4px 0">
                    <div style="font-weight:800;font-size:.85rem;margin-bottom:.3rem;">${driver.name}</div>
                    <div style="font-size:.75rem;color:#6B7280;margin-bottom:.3rem;">
                        ${driver.trip.origin} → ${driver.trip.destination}
                    </div>
                    ${driver.eta ? `<div style="font-size:.75rem;color:#0891B2;font-weight:700;">
                        ETA: ${fmtETA(driver.eta.minutos)} · ${Math.round(driver.eta.distanciaKm)}km
                    </div>` : ''}
                    ${driver.lastLocation.speed != null ? `<div style="font-size:.72rem;color:#059669;">
                        ${Math.round(driver.lastLocation.speed)} km/h
                    </div>` : ''}
                    <div style="font-size:.65rem;color:#9CA3AF;margin-top:.3rem;">
                        ${new Date(driver.lastLocation.capturedAt).toLocaleTimeString('pt-BR')}
                    </div>
                </div>`;

            // ── MARKER (keyed por tripKey) ────────────────────────────────────
            if (markersRef.current.has(tripKey)) {
                markersRef.current.get(tripKey).setLatLng([lat, lng]).setIcon(icon);
            } else {
                const marker = L.marker([lat, lng], { icon }).addTo(mapRef.current!).bindPopup(popupHtml);
                // Clique no pin → abre DriverDrawer (usa userId para o drawer)
                marker.on('click', () => onDriverClick?.(driver.userId));
                markersRef.current.set(tripKey, marker);
            }

            // ── ROTA COMPLETA A→B (OSRM, cacheada por tripKey) ───────────────
            const hasOrigin = !!(driver.trip.originLat && driver.trip.originLng);
            const hasDest   = !!(driver.trip.destinationLat && driver.trip.destinationLng);

            let fullRoute: [number, number][] = fullRouteCacheRef.current.get(tripKey) ?? [];

            if (!fullRoute.length && hasOrigin && hasDest) {
                fullRoute = await routeOSRM(
                    [driver.trip.originLat!,      driver.trip.originLng!],
                    [driver.trip.destinationLat!, driver.trip.destinationLng!]
                );
                if (!mapRef.current) return; // BUG-LEAFLET-ASYNC: componente desmontado durante await OSRM
                if (fullRoute.length > 2) fullRouteCacheRef.current.set(tripKey, fullRoute);
            }

            // ── F5.17: LÓGICA DE 3 MODOS DE VISUALIZAÇÃO ─────────────────────
            // mode = 'trail' | 'remaining' | 'both'
            // trailPts    = linha sólida colorida (onde já foi)
            // remainPts   = linha pontilhada amarela #FFD600 (onde vai)
            let trailPts:   [number, number][] = [];
            let remainPts:  [number, number][] = [];

            const mode = routeMode;

            if (fullRoute.length > 1) {
                // Encontra o ponto da malha viária mais próximo da posição atual do motorista
                let closestIdx = 0;
                let minDist = Infinity;
                for (let i = 0; i < fullRoute.length; i++) {
                    // Calculo de distância euclidiana simples serve p/ achar vizinho geografico
                    const d = Math.pow(fullRoute[i][0] - lat, 2) + Math.pow(fullRoute[i][1] - lng, 2);
                    if (d < minDist) {
                        minDist = d;
                        closestIdx = i;
                    }
                }

                if (isCompleted || driver.progress >= 100) {
                    closestIdx = fullRoute.length - 1;
                }

                if ((mode === 'trail' || mode === 'both') && !isCompleted) {
                    // OSRM perfeito cortado até o ponto mais próximo da malha viária,
                    // + coordenada GPS real como âncora final → linha termina no pin.
                    trailPts = [...fullRoute.slice(0, closestIdx + 1), [lat, lng]];
                }

                if ((mode === 'remaining' || mode === 'both') && driver.progress < 100 && !isCompleted && hasDest) {
                    // Coordenada GPS real como âncora inicial → linha começa no pin.
                    remainPts = [[lat, lng], ...fullRoute.slice(closestIdx)];
                }
            } else {
                // sem rota completa — fallback: only trail from GPS points
                if ((mode === 'trail' || mode === 'both') && (driver.trail?.length ?? 0) >= 2) {
                    trailPts = driver.trail!.map(p => [p.latitude, p.longitude]);
                }
            }

            // ── DESENHA TRILHA PERCORRIDA ─────────────────────────────────────
            if (trailPts.length > 1) {
                if (trailsRef.current.has(tripKey)) {
                    trailsRef.current.get(tripKey).setLatLngs(trailPts);
                } else {
                    trailsRef.current.set(tripKey,
                        L.polyline(trailPts, { color, weight: 4, opacity: 0.9 }).addTo(mapRef.current!));
                }
            } else if (trailsRef.current.has(tripKey)) {
                // modo 'remaining': remove trilha se existia
                trailsRef.current.get(tripKey).remove();
                trailsRef.current.delete(tripKey);
            }

            // ── DESENHA ROTA RESTANTE (F5.17) ────────────────────────────────
            if (remainPts.length > 1) {
                if (remainingRef.current.has(tripKey)) {
                    remainingRef.current.get(tripKey).setLatLngs(remainPts);
                } else {
                    remainingRef.current.set(tripKey,
                        L.polyline(remainPts, {
                            color:     '#FFD600',  // amarelo institucional — futuro/estimativa
                            weight:    3,
                            opacity:   0.80,
                            dashArray: '10 8',    // pontilhado = trecho estimado
                        }).addTo(mapRef.current!));
                }
            } else if (remainingRef.current.has(tripKey)) {
                // modo 'trail': remove rota restante se existia
                remainingRef.current.get(tripKey).remove();
                remainingRef.current.delete(tripKey);
            }

            // ── PIN DE DESTINO (routesRef — independente do modo) ─────────────
            if (hasDest && !routesRef.current.has(tripKey)) {
                const destIcon = L.divIcon({
                    className: '',
                    html: `<div style="width:14px;height:14px;border-radius:50%;
                        background:${color};border:2px solid #fff;opacity:.8;"></div>`,
                    iconSize: [14, 14], iconAnchor: [7, 7],
                });
                const destMarker = L.marker(
                    [driver.trip.destinationLat!, driver.trip.destinationLng!],
                    { icon: destIcon }
                ).addTo(mapRef.current!).bindTooltip(`📍 ${driver.trip.destination}`, { permanent: false });
                routesRef.current.set(tripKey, destMarker);
            }
            } catch (err) {
                console.warn('[MapaMotoristas] Erro ao renderizar driver', driver.userId, err);
                // Continua para o próximo driver — não quebra o mapa inteiro
                continue;
            }
        }

        // ── CENTRALIZA NO MOTORISTA SELECIONADO ───────────────────────────────────
        if (selectedDriverId) {
            const sel = drivers.find(d => d.userId === selectedDriverId);
            if (sel?.lastLocation) {
                mapRef.current?.setView([sel.lastLocation.lat, sel.lastLocation.lng], 10, { animate: true });
                // Abre popup do marker (key = tripKey do motorista selecionado)
                const selKey = sel.trip.id;
                markersRef.current.get(selKey)?.openPopup();
            }
        }
    }, [drivers, selectedDriverId, onDriverClick, routeMode]);  // F5.17: routeMode no deps

    // Dispara updateMap após mapa estar pronto (async import)
    useEffect(() => {
        if (mapRef.current && LRef.current) {
            updateMap();
        } else {
            const t = setTimeout(updateMap, 900);
            return () => clearTimeout(t);
        }
    }, [updateMap]);

    return (
        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)' }}>
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <div ref={mapDivRef} style={{ height: 420, width: '100%', background: '#1E293B' }} />

            {/* Legenda — F5.17: dinâmica por routeMode */}
            <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 500, pointerEvents: 'none',
                background: 'rgba(15,23,42,0.92)', borderRadius: 8, padding: '6px 12px',
                display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                {[['#22C55E','Online'],['#F59E0B','Parado'],['#EF4444','Sem sinal'],['#94A3B8','Concluído']].map(([c,l]) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                        <span style={{ fontSize: '.7rem', color: '#94A3B8' }}>{l}</span>
                    </div>
                ))}
                <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,.15)' }} />
                {(routeMode === 'trail' || routeMode === 'both') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="#22C55E" strokeWidth="3" strokeLinecap="round"/></svg>
                        <span style={{ fontSize: '.7rem', color: '#94A3B8' }}>Percorrido</span>
                    </div>
                )}
                {(routeMode === 'remaining' || routeMode === 'both') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="#FFD600" strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round"/></svg>
                        <span style={{ fontSize: '.7rem', color: '#94A3B8' }}>Rota restante</span>
                    </div>
                )}
            </div>
        </div>
    );
}
