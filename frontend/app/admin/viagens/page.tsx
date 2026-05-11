'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import api from '@/lib/api/client';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AdminViewModeToggle from '@/components/admin/AdminViewModeToggle';
import { usePersistedAdminViewMode } from '@/hooks/usePersistedAdminViewMode';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';
import { LocationFields, type LocationFieldsValue } from '@/components/admin/LocationFields';
import { toast } from '@/components/ui/Toast';
import { viaCepMatchesCity, type CatalogCityForCepMatch } from '@/lib/brazilCepCityMatch';
import {
    TruckIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    CheckCircleIcon,
    UserCircleIcon,
} from '@heroicons/react/24/outline';

const TripRoutePreviewMap = dynamic(
    () => import('@/components/admin/TripRoutePreviewMap'),
    {
        ssr: false,
        loading: () => (
            <div
                style={{
                    height: 280,
                    borderRadius: 10,
                    border: '1px dashed #CBD5E1',
                    background: '#F8FAFC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '.8rem',
                    color: '#64748B',
                }}
            >
                Carregando prévia da rota…
            </div>
        ),
    },
);

/**
 * Junta `type="date"` + `type="time"` no formato que o backend aceita (`new Date(...)`).
 * Em muitos navegadores, `datetime-local` fica com valor vazio até a hora ser escolhida (--:--), o que bloqueava o envio.
 */
function combineDateTimeLocal(dateYmd: string, timeHm: string): string | null {
    const d = String(dateYmd ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
    const tRaw = String(timeHm ?? '').trim();
    if (!tRaw) return `${d}T00:00:00`;
    if (/^\d{2}:\d{2}$/.test(tRaw)) return `${d}T${tRaw}:00`;
    if (/^\d{2}:\d{2}:\d{2}$/.test(tRaw)) return `${d}T${tRaw}`;
    return null;
}

/** Aceita número ou string colada com vírgula decimal (pt-BR). */
function parseGeoNumber(v: unknown): number {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const raw = String(v ?? '').trim();
    if (!raw) return NaN;
    let s = raw.replace(/\s/g, '');
    if (/e/i.test(s)) return Number(s);
    if (s.includes(',')) {
        s = s.replace(/\./g, '').replace(',', '.');
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
}

function validBounds(lat: number, lng: number): boolean {
    return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const p1 = toRad(aLat);
    const p2 = toRad(bLat);
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const h = sinLat * sinLat + Math.cos(p1) * Math.cos(p2) * sinLng * sinLng;
    return 2 * R * Math.asin(Math.sqrt(h));
}

async function geocodeViaBackendStrict(query: string, uf?: string): Promise<{ lat: number; lng: number } | null> {
    try {
        const params: { q: string; uf?: string } = { q: query };
        const u = uf?.trim().toUpperCase();
        if (u && /^[A-Z]{2}$/.test(u)) params.uf = u;
        const res = await api.get<{ lat: number | null; lng: number | null }>('/cities/geocode/address', { params });
        const lat = Number(res.data?.lat);
        const lng = Number(res.data?.lng);
        return validBounds(lat, lng) ? { lat, lng } : null;
    } catch {
        return null;
    }
}

type CepGeocodeResolved = {
    lat: number;
    lng: number;
    localidade: string;
    uf: string;
    ibge: string;
};

async function resolveCepFull(cepDigitsValue: string): Promise<CepGeocodeResolved | null> {
    if (cepDigitsValue.length !== 8) return null;
    try {
        const viaCepRes = await fetch(`https://viacep.com.br/ws/${cepDigitsValue}/json/`);
        const viaCepData = await viaCepRes.json();
        if (!viaCepRes.ok || viaCepData?.erro) return null;
        const localidade = String(viaCepData.localidade ?? '').trim();
        const uf = String(viaCepData.uf ?? '').trim().toUpperCase();
        const ibge = viaCepData.ibge != null ? String(viaCepData.ibge) : '';
        const cepFmt = `${cepDigitsValue.slice(0, 5)}-${cepDigitsValue.slice(5)}`;
        const queryParts = [
            cepFmt,
            viaCepData.logradouro,
            viaCepData.bairro,
            localidade,
            uf,
            'Brasil',
        ].filter(Boolean);
        const coords = await geocodeViaBackendStrict(queryParts.join(', '), uf);
        if (!coords) return null;
        return { ...coords, localidade, uf, ibge };
    } catch {
        return null;
    }
}

type Trip = {
    id: string;
    status: string;
    driverDecision?: string;
    driverDecisionReason?: string | null;
    rejectionPenalty?: number | null;
    originCep?: string | null;
    destinationCep?: string | null;
    originLatitude?: number | null;
    originLongitude?: number | null;
    destinationLatitude?: number | null;
    destinationLongitude?: number | null;
    departureDate: string;
    expectedArrivalDate: string;
    originCity?: { name: string };
    destinationCity?: { name: string };
    truck?: { licensePlate: string };
    driverUser?: { id: string; name: string };
    origin?: string;
    destination?: string;
    originCityName?: string;
    destinationCityName?: string;
    startOdometerPhotoUrl?: string | null;
    endOdometerPhotoUrl?: string | null;
    notes?: string | null;
    createdAt?: string;
    updatedAt?: string;
};

export default function AdminViagensPage() {
    const [trips, setTrips] = useState<Trip[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [trucks, setTrucks] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [assignModal, setAssignModal] = useState<{ tripId: string; driverUserId: string; search: string } | null>(null);
    const [detailTrip, setDetailTrip] = useState<Trip | null>(null);
    const [detailTab, setDetailTab] = useState<'resumo' | 'rastreio' | 'auditoria'>('resumo');
    const [collapseManualTrip, setCollapseManualTrip] = useState(false);
    const [tripsViewMode, setTripsViewMode] = usePersistedAdminViewMode('admin:viagens:list', 'card');

    const emptyLocationFields = (): LocationFieldsValue => ({
        name: null,
        address: null,
        postalCode: null,
        reference: null,
        latitude: null,
        longitude: null,
    });

    const [form, setForm] = useState({
        truckId: '',
        originCityId: '',
        destinationCityId: '',
        departureDateOnly: '',
        departureTime: '',
        expectedArrivalDateOnly: '',
        expectedArrivalTime: '',
        driverUserId: '',
        notes: '',
    });

    /** Mesmo modelo que turmas/ações: CEP ViaCEP + geocode backend + nome/endereço/referência. */
    const [originLocation, setOriginLocation] = useState<LocationFieldsValue>(() => emptyLocationFields());
    const [destinationLocation, setDestinationLocation] = useState<LocationFieldsValue>(() => emptyLocationFields());

    const originCityContext = useMemo(() => {
        const c = cities.find((x: any) => x.id === form.originCityId);
        if (!c?.name) return undefined;
        return [c.name, c.state].filter(Boolean).join(', ') + ', Brasil';
    }, [cities, form.originCityId]);
    const destinationCityContext = useMemo(() => {
        const c = cities.find((x: any) => x.id === form.destinationCityId);
        if (!c?.name) return undefined;
        return [c.name, c.state].filter(Boolean).join(', ') + ', Brasil';
    }, [cities, form.destinationCityId]);

    const originCatalogCity: CatalogCityForCepMatch | null = useMemo(() => {
        const c = cities.find((x: any) => x.id === form.originCityId);
        if (!c?.name?.trim()) return null;
        return { name: c.name.trim(), state: String(c.state ?? '').trim(), ibgeCode: c.ibgeCode ?? null };
    }, [cities, form.originCityId]);

    const destinationCatalogCity: CatalogCityForCepMatch | null = useMemo(() => {
        const c = cities.find((x: any) => x.id === form.destinationCityId);
        if (!c?.name?.trim()) return null;
        return { name: c.name.trim(), state: String(c.state ?? '').trim(), ibgeCode: c.ibgeCode ?? null };
    }, [cities, form.destinationCityId]);

    const toText = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    const routeFromTrip = (t: Trip) => {
        const origin =
            toText(t.originCity?.name) ||
            toText(t.originCityName) ||
            toText(t.origin) ||
            toText(t.originCep) ||
            (t.originLatitude != null && t.originLongitude != null ? `${t.originLatitude}, ${t.originLongitude}` : '') ||
            'Origem não informada';
        const destination =
            toText(t.destinationCity?.name) ||
            toText(t.destinationCityName) ||
            toText(t.destination) ||
            toText(t.destinationCep) ||
            (t.destinationLatitude != null && t.destinationLongitude != null ? `${t.destinationLatitude}, ${t.destinationLongitude}` : '') ||
            'Destino não informado';
        return { origin, destination };
    };

    /** Só exibe subtítulo quando há CEP efetivamente preenchido (evita “- / —” na UI). */
    const routeCepSubtitle = (t: Trip): string | null => {
        const o = toText(t.originCep);
        const d = toText(t.destinationCep);
        if (!o && !d) return null;
        return `${o || '—'} / ${d || '—'}`;
    };

    /** Só exibe quando origem ou destino tiver par lat/lng completo (evita “-, - → -, -”). */
    const routeCoordsSubtitle = (t: Trip): string | null => {
        const hasO = t.originLatitude != null && t.originLongitude != null;
        const hasD = t.destinationLatitude != null && t.destinationLongitude != null;
        if (!hasO && !hasD) return null;
        const oStr = hasO ? `${t.originLatitude}, ${t.originLongitude}` : 'sem coordenadas';
        const dStr = hasD ? `${t.destinationLatitude}, ${t.destinationLongitude}` : 'sem coordenadas';
        return `${oStr} → ${dStr}`;
    };

    const normalizeTrip = (raw: any): Trip => {
        const source = raw || {};
        const originName = toText(source.originCity?.name) || toText(source.originCityName) || toText(source.origin);
        const destinationName = toText(source.destinationCity?.name) || toText(source.destinationCityName) || toText(source.destination);
        return {
            ...source,
            originCity: source.originCity?.name ? source.originCity : { name: originName || 'Origem não informada' },
            destinationCity: source.destinationCity?.name ? source.destinationCity : { name: destinationName || 'Destino não informado' },
        };
    };

    const load = async () => {
        setLoading(true);
        try {
            const [t, d, tr, c] = await Promise.all([
                api.get('/admin/trips'),
                api.get('/users', { params: { role: 'DRIVER' } }),
                api.get('/trucks'),
                api.get('/cities').catch(() => ({ data: [] })),
            ]);
            const tripRows = Array.isArray(t.data) ? t.data : [];
            setTrips(tripRows.map(normalizeTrip));
            setDrivers(Array.isArray(d.data) ? d.data : []);
            setTrucks(Array.isArray(tr.data) ? tr.data : []);
            const cityRows = Array.isArray(c.data) ? c.data : (c.data?.data ?? []);
            setCities(cityRows);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const kpis = useMemo(() => ({
        planned: trips.filter(t => t.status === 'PLANNED').length,
        transit: trips.filter(t => t.status === 'IN_TRANSIT').length,
        rejected: trips.filter(t => t.driverDecision === 'REJECTED').length,
        penalized: trips.filter(t => Number(t.rejectionPenalty || 0) > 0).length,
    }), [trips]);

    const cepDigits = (v: string | null | undefined) => String(v || '').replace(/\D/g, '');

    const createTrip = async () => {
        const departureDate = combineDateTimeLocal(form.departureDateOnly, form.departureTime);
        const expectedArrivalDate = combineDateTimeLocal(form.expectedArrivalDateOnly, form.expectedArrivalTime);
        const missing: string[] = [];
        if (!form.driverUserId) missing.push('motorista');
        if (!form.truckId) missing.push('veículo');
        if (!form.originCityId) missing.push('cidade de origem');
        if (!form.destinationCityId) missing.push('cidade de destino');
        if (!departureDate) missing.push('data de saída');
        if (!expectedArrivalDate) missing.push('data de chegada prevista');
        if (missing.length > 0) {
            toast.error(`Preencha: ${missing.join(', ')}. Dica: data e hora estão em campos separados; se não informar hora, usa-se 00:00.`);
            return;
        }

        const oLat = parseGeoNumber(originLocation.latitude);
        const oLng = parseGeoNumber(originLocation.longitude);
        const dLat = parseGeoNumber(destinationLocation.latitude);
        const dLng = parseGeoNumber(destinationLocation.longitude);
        const hasPair = (la: number, ln: number) => validBounds(la, ln);
        const oCep = cepDigits(originLocation.postalCode);
        const dCep = cepDigits(destinationLocation.postalCode);

        if (oCep.length !== 8 || dCep.length !== 8) {
            toast.error('Informe CEP válido na origem e no destino (8 dígitos). Use «Buscar por CEP» para preencher endereço e coordenadas automaticamente.');
            return;
        }
        if (!hasPair(oLat, oLng) || !hasPair(dLat, dLng)) {
            toast.error('Preencha origem e destino com «Buscar por CEP» após escolher a cidade correta (as coordenadas ficam definidas apenas pelo CEP neste formulário).');
            return;
        }

        if (!originCatalogCity || !destinationCatalogCity) {
            toast.error('Selecione cidade de origem e destino cadastradas antes de salvar.');
            return;
        }

        const [originResolved, destinationResolved] = await Promise.all([
            resolveCepFull(oCep),
            resolveCepFull(dCep),
        ]);
        if (!originResolved || !destinationResolved) {
            toast.error('Não foi possível validar coordenadas a partir do CEP em origem/destino. Refaça «Buscar por CEP» nos dois blocos antes de salvar.');
            return;
        }

        const originCityMatch = viaCepMatchesCity(
            { localidade: originResolved.localidade, uf: originResolved.uf, ibge: originResolved.ibge },
            originCatalogCity,
        );
        const destCityMatch = viaCepMatchesCity(
            { localidade: destinationResolved.localidade, uf: destinationResolved.uf, ibge: destinationResolved.ibge },
            destinationCatalogCity,
        );
        if (!originCityMatch.ok) {
            toast.error(`Origem: CEP não corresponde à cidade selecionada — ${originCityMatch.detail}.`);
            return;
        }
        if (!destCityMatch.ok) {
            toast.error(`Destino: CEP não corresponde à cidade selecionada — ${destCityMatch.detail}.`);
            return;
        }

        const originDistanceKm = haversineKm(oLat, oLng, originResolved.lat, originResolved.lng);
        const destinationDistanceKm = haversineKm(dLat, dLng, destinationResolved.lat, destinationResolved.lng);
        const MAX_CEP_DIVERGENCE_KM = 2;
        if (originDistanceKm > MAX_CEP_DIVERGENCE_KM || destinationDistanceKm > MAX_CEP_DIVERGENCE_KM) {
            toast.error(
                `Coordenadas divergentes do CEP. Origem: ${originDistanceKm.toFixed(2)} km, Destino: ${destinationDistanceKm.toFixed(2)} km (máx ${MAX_CEP_DIVERGENCE_KM} km). Refaça «Buscar por CEP» para evitar rota incorreta.`,
            );
            return;
        }

        const detailBlock = (label: string, loc: LocationFieldsValue) => {
            const parts = [loc.name, loc.address, loc.reference].map((x) => String(x || '').trim()).filter(Boolean);
            return parts.length ? `${label}: ${parts.join(' · ')}` : '';
        };
        const locNotes = [detailBlock('[Ponto origem]', originLocation), detailBlock('[Ponto destino]', destinationLocation)]
            .filter(Boolean)
            .join('\n');
        const notesCombined = [form.notes?.trim(), locNotes].filter(Boolean).join('\n\n');

        setSaving(true);
        try {
            await api.post('/admin/trips/manual', {
                truckId: form.truckId,
                originCityId: form.originCityId,
                destinationCityId: form.destinationCityId,
                departureDate,
                expectedArrivalDate,
                driverUserId: form.driverUserId,
                notes: notesCombined || undefined,
                originCep: oCep,
                destinationCep: dCep,
                originLatitude: oLat,
                originLongitude: oLng,
                destinationLatitude: dLat,
                destinationLongitude: dLng,
            });
            toast.success('Viagem criada e motorista notificado.');
            setForm({
                truckId: '',
                originCityId: '',
                destinationCityId: '',
                departureDateOnly: '',
                departureTime: '',
                expectedArrivalDateOnly: '',
                expectedArrivalTime: '',
                driverUserId: '',
                notes: '',
            });
            setOriginLocation(emptyLocationFields());
            setDestinationLocation(emptyLocationFields());
            await load();
        } catch (e: any) {
            const msg = e?.response?.data?.message;
            toast.error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Não foi possível criar a viagem.'));
        } finally {
            setSaving(false);
        }
    };

    const applyPenalty = async (tripId: string) => {
        const raw = window.prompt('Valor da penalização (R$):', '0');
        if (raw == null) return;
        const value = Number(String(raw).replace(',', '.'));
        const note = window.prompt('Observação da penalização (opcional):') || '';
        await api.patch(`/admin/trips/${tripId}/rejection-penalty`, { penaltyAmount: value, adminNote: note });
        await load();
    };

    const openAssignModal = (tripId: string) => {
        setAssignModal({ tripId, driverUserId: '', search: '' });
    };

    const confirmAssignDriver = async () => {
        if (!assignModal?.tripId || !assignModal.driverUserId) return;
        setAssigning(true);
        await api.patch(`/admin/trips/${assignModal.tripId}/assign-driver`, { driverUserId: assignModal.driverUserId });
        setAssignModal(null);
        await load();
        setAssigning(false);
    };

    const statusBadge = (status: string) => {
        const map: Record<string, { label: string; bg: string; color: string; border: string }> = {
            PLANNED: { label: 'Planejada', bg: '#ECFEFF', color: '#0E7490', border: '#A5F3FC' },
            IN_TRANSIT: { label: 'Em trânsito', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
            COMPLETED: { label: 'Concluída', bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
            CANCELED: { label: 'Cancelada', bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
        };
        return map[status] || { label: status, bg: '#F8FAFC', color: '#334155', border: '#E2E8F0' };
    };

    const decisionBadge = (decision?: string) => {
        const map: Record<string, { label: string; bg: string; color: string; border: string }> = {
            PENDING: { label: 'Pendente', bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
            ACCEPTED: { label: 'Aceito', bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
            REJECTED: { label: 'Recusado', bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
        };
        return map[decision || 'PENDING'] || map.PENDING;
    };

    const openPhoto = (url?: string | null) => {
        if (!url) return;
        window.open(url, '_blank', 'noopener,noreferrer');
    };
    const fmtDateTime = (d?: string) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
    const tripDurationHours = (start?: string, end?: string) => {
        if (!start || !end) return null;
        const ms = new Date(end).getTime() - new Date(start).getTime();
        if (!Number.isFinite(ms) || ms <= 0) return null;
        return (ms / 3600000);
    };
    const linkedClassFromNotes = (notes?: string | null) => {
        const m = String(notes || '').match(/turma\s+([A-Z0-9._/-]+)/i);
        return m?.[1] || null;
    };

    const filteredDrivers = assignModal
        ? drivers.filter((d) => {
            const q = assignModal.search.trim().toLowerCase();
            if (!q) return true;
            return (
                d.name?.toLowerCase().includes(q)
                || d.email?.toLowerCase().includes(q)
                || String(d.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''))
            );
        })
        : [];

    const originLat = parseGeoNumber(originLocation.latitude);
    const originLng = parseGeoNumber(originLocation.longitude);
    const destLat = parseGeoNumber(destinationLocation.latitude);
    const destLng = parseGeoNumber(destinationLocation.longitude);
    const hasOriginCoords = validBounds(originLat, originLng);
    const hasDestCoords = validBounds(destLat, destLng);
    const hasBothCoords = hasOriginCoords && hasDestCoords;

    const mapInputStyle: CSSProperties = {
        width: '100%',
        minHeight: 42,
        borderRadius: 12,
        border: '1px solid #E2E8F0',
        background: '#FFFFFF',
        padding: '.62rem .78rem',
        fontSize: '.86rem',
        color: '#0F172A',
        outline: 'none',
    };

    const routeGoogleUrl = hasBothCoords
        ? `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`
        : '#';
    const routeWazeUrl = hasBothCoords
        ? `https://www.waze.com/ul?ll=${destLat}%2C${destLng}&navigate=yes&from=${originLat}%2C${originLng}`
        : '#';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <AdminHeaderHero title="VIAGENS" subtitle="Vínculo de motorista, aceite/recusa e penalização" badge="ADMIN" />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '0.75rem' }}>
                <AnimatedKpiCard label="Planejadas" value={kpis.planned} color="#0891B2" bg="#F0F9FF" border="#BAE6FD" compact />
                <AnimatedKpiCard label="Em Trânsito" value={kpis.transit} color="#059669" bg="#F0FDF4" border="#BBF7D0" compact />
                <AnimatedKpiCard label="Recusadas" value={kpis.rejected} color="#DC2626" bg="#FEF2F2" border="#FECACA" compact />
                <AnimatedKpiCard label="Penalizadas" value={kpis.penalized} color="#D97706" bg="#FFF7ED" border="#FED7AA" compact />
            </div>

            <div
                className="glass-card"
                style={{
                    padding: '1.15rem',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,.95fr)',
                    gap: '1rem',
                    border: '1px solid #FDE68A',
                    boxShadow: '0 14px 35px rgba(245, 158, 11, 0.18)',
                    background: 'linear-gradient(135deg, #FFFDF1 0%, #FFFFFF 60%)',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
                            <strong
                                role="button"
                                tabIndex={0}
                                onClick={() => setCollapseManualTrip(v => !v)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setCollapseManualTrip(v => !v);
                                    }
                                }}
                                style={{ color: '#854D0E', letterSpacing: '.02em', fontSize: '.98rem', cursor: 'pointer', userSelect: 'none', transition: 'all .18s ease' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.02)';
                                    e.currentTarget.style.textShadow = '0 0 14px rgba(245,158,11,.35)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.textShadow = 'none';
                                }}
                            >
                                CRIAR VIAGEM MANUAL {collapseManualTrip ? '▸' : '▾'}
                            </strong>
                            <span style={{ fontSize: '.76rem', color: '#A16207' }}>Fluxo premium com vínculo, agenda e apoio visual de rota</span>
                        </div>
                        <span style={{ fontSize: '.75rem', padding: '0.2rem .55rem', borderRadius: 999, background: '#FEF9C3', color: '#854D0E', border: '1px solid #FDE68A' }}>Notificação automática ativa</span>
                    </div>
                    {!collapseManualTrip && (
                    <>
                    <div style={{ background: '#FFFFFF', border: '1px solid #FDE68A', borderRadius: 14, padding: '.8rem' }}>
                        <div style={{ fontSize: '.68rem', color: '#92400E', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.6rem' }}>Vínculo e agenda</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '.55rem' }}>
                            <select style={mapInputStyle} value={form.driverUserId} onChange={e => setForm(f => ({ ...f, driverUserId: e.target.value }))}>
                                <option value="">Motorista</option>
                                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                            <select style={mapInputStyle} value={form.truckId} onChange={e => setForm(f => ({ ...f, truckId: e.target.value }))}>
                                <option value="">Veículo</option>
                                {trucks.map(t => <option key={t.id} value={t.id}>{t.licensePlate || t.identifier}</option>)}
                            </select>
                        </div>
                        <div style={{ fontSize: '.65rem', color: '#A16207', lineHeight: 1.4, marginTop: 2 }}>
                            Saída e chegada em <strong>data</strong> + <strong>hora</strong> separados (evita o bug do calendário com hora <code>--:--</code> que impedia salvar).
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '.55rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: '.62rem', fontWeight: 700, color: '#92400E', letterSpacing: '.06em' }}>DATA SAÍDA</span>
                                <input
                                    style={mapInputStyle}
                                    type="date"
                                    value={form.departureDateOnly}
                                    onChange={(e) => setForm((f) => ({ ...f, departureDateOnly: e.target.value }))}
                                    aria-label="Data de saída"
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: '.62rem', fontWeight: 700, color: '#92400E', letterSpacing: '.06em' }}>HORA SAÍDA (opc.)</span>
                                <input
                                    style={mapInputStyle}
                                    type="time"
                                    value={form.departureTime}
                                    onChange={(e) => setForm((f) => ({ ...f, departureTime: e.target.value }))}
                                    aria-label="Hora de saída"
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: '.62rem', fontWeight: 700, color: '#92400E', letterSpacing: '.06em' }}>DATA CHEGADA</span>
                                <input
                                    style={mapInputStyle}
                                    type="date"
                                    value={form.expectedArrivalDateOnly}
                                    onChange={(e) => setForm((f) => ({ ...f, expectedArrivalDateOnly: e.target.value }))}
                                    aria-label="Data de chegada prevista"
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: '.62rem', fontWeight: 700, color: '#92400E', letterSpacing: '.06em' }}>HORA CHEGADA (opc.)</span>
                                <input
                                    style={mapInputStyle}
                                    type="time"
                                    value={form.expectedArrivalTime}
                                    onChange={(e) => setForm((f) => ({ ...f, expectedArrivalTime: e.target.value }))}
                                    aria-label="Hora de chegada prevista"
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ background: '#FFFFFF', border: '1px solid #FDE68A', borderRadius: 14, padding: '.8rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                        <div>
                            <div style={{ fontSize: '.68rem', color: '#92400E', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.45rem' }}>Origem e destino</div>
                            <div style={{ fontSize: '.74rem', color: '#78350F', lineHeight: 1.45, marginBottom: '.55rem' }}>
                                Primeiro escolha a <strong>cidade correta</strong> nos selects; o <strong>CEP</strong> será validado contra município/UF cadastrados (preferindo <strong>código IBGE</strong> da cidade quando estiver no cadastro). Use «Buscar por CEP» para preencher endereço e GPS — edição manual de coordenadas fica bloqueada para evitar rota errada.
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '.55rem' }}>
                                <select style={mapInputStyle} value={form.originCityId} onChange={(e) => setForm((f) => ({ ...f, originCityId: e.target.value }))}>
                                    <option value="">Cidade origem (obrig.)</option>
                                    {cities.map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.name}{c.state ? ` / ${c.state}` : ''}</option>
                                    ))}
                                </select>
                                <select style={mapInputStyle} value={form.destinationCityId} onChange={(e) => setForm((f) => ({ ...f, destinationCityId: e.target.value }))}>
                                    <option value="">Cidade destino (obrig.)</option>
                                    {cities.map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.name}{c.state ? ` / ${c.state}` : ''}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <LocationFields
                            compact
                            value={originLocation}
                            onChange={setOriginLocation}
                            cityContext={originCityContext}
                            blockTitle="ORIGEM — ponto exato (coleta / saída)"
                            blockSubtitle="CEP obrigatório após ViaCEP/geocódigo. Opcionalmente nome do local (ex.: empresa), rua/número e referência para o motorista."
                            cepLabel="CEP da origem (obrigatório para rota)"
                            showOptionalHint={false}
                            strictCepMode
                            strictSelectedCity={originCatalogCity}
                        />
                        <LocationFields
                            compact
                            value={destinationLocation}
                            onChange={setDestinationLocation}
                            cityContext={destinationCityContext}
                            blockTitle="DESTINO — ponto exato (entrega / chegada)"
                            blockSubtitle="Mesmo padrão da origem. Use CEP válido antes de criar a viagem."
                            cepLabel="CEP do destino (obrigatório para rota)"
                            showOptionalHint={false}
                            strictCepMode
                            strictSelectedCity={destinationCatalogCity}
                        />
                    </div>

                    <input style={mapInputStyle} placeholder="Observações (opcional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                    <button className="btn-primary" disabled={saving} onClick={createTrip} style={{ justifyContent: 'center', minHeight: 46, boxShadow: '0 10px 20px rgba(234,179,8,.35)', fontWeight: 800 }}>
                        {saving ? 'Salvando...' : 'Criar Viagem e Notificar Motorista'}
                    </button>
                    </>
                    )}
                    {collapseManualTrip && (
                        <div style={{ border: '1px dashed #FCD34D', borderRadius: 12, background: 'rgba(255,251,235,.8)', color: '#92400E', padding: '.8rem .9rem', fontSize: '.82rem' }}>
                            Módulo recolhido. Clique em <b>CRIAR VIAGEM MANUAL</b> para expandir novamente.
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                    <div style={{ borderRadius: 14, border: '1px solid #E2E8F0', background: '#FFFFFF', overflow: 'hidden' }}>
                        <div style={{ padding: '.65rem .8rem', borderBottom: '1px solid #E2E8F0', background: 'linear-gradient(90deg,#FFF7ED,#FFFBEB)', fontSize: '.74rem', fontWeight: 800, color: '#92400E', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                            Mapa de rota
                        </div>
                        <div style={{ padding: '.7rem', display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
                            <div style={{ fontSize: '.78rem', color: '#475569', lineHeight: 1.5, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '.65rem .75rem' }}>
                                Cada bloco <strong>Origem</strong> / <strong>Destino</strong> também mostra o ponto isolado nos cartões (após CEP ou «Buscar coordenadas»).
                                {hasBothCoords
                                    ? ' Abaixo aparece o trajeto completo na malha rodoviária entre os dois pontos (estimativa; confira navegação com Google Maps ou Waze).'
                                    : ' Defina latitude e longitude válidas nos dois pontos para ver o mapa da viagem inteira aqui ao lado.'}
                            </div>
                            {hasBothCoords ? (
                                <TripRoutePreviewMap
                                    key={`${originLat.toFixed(5)}:${originLng.toFixed(5)}→${destLat.toFixed(5)}:${destLng.toFixed(5)}`}
                                    originLat={originLat}
                                    originLng={originLng}
                                    destLat={destLat}
                                    destLng={destLng}
                                    height={300}
                                />
                            ) : null}
                        </div>
                    </div>

                    <div style={{ borderRadius: 14, border: '1px solid #E2E8F0', background: '#FFFFFF', padding: '.7rem' }}>
                        <div style={{ fontSize: '.74rem', fontWeight: 700, color: '#334155', marginBottom: '.5rem' }}>Navegação rápida</div>
                        <div style={{ display: 'flex', gap: '.5rem' }}>
                            <a
                                href={routeGoogleUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ pointerEvents: hasBothCoords ? 'auto' : 'none', opacity: hasBothCoords ? 1 : .45, flex: 1, textAlign: 'center', textDecoration: 'none', borderRadius: 10, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#1D4ED8', fontSize: '.74rem', fontWeight: 700, padding: '.52rem .6rem' }}
                            >
                                Abrir no Google Maps
                            </a>
                            <a
                                href={routeWazeUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ pointerEvents: hasBothCoords ? 'auto' : 'none', opacity: hasBothCoords ? 1 : .45, flex: 1, textAlign: 'center', textDecoration: 'none', borderRadius: 10, border: '1px solid #A7F3D0', background: '#ECFDF5', color: '#047857', fontSize: '.74rem', fontWeight: 700, padding: '.52rem .6rem' }}
                            >
                                Abrir no Waze
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                    <span style={{ fontFamily: 'Orbitron', fontSize: '.68rem', fontWeight: 800, letterSpacing: '.12em', color: '#475569' }}>LISTAGEM DE VIAGENS ({loading ? '…' : trips.length})</span>
                    <AdminViewModeToggle mode={tripsViewMode} onChange={setTripsViewMode} />
                </div>
                {!loading && tripsViewMode === 'table' ? (
                    <div className="glass-card" style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid #E2E8F0', background: '#fff' }}>
                        {trips.length === 0 ? (
                            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B', fontSize: '.85rem' }}>Nenhuma viagem cadastrada.</div>
                        ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.76rem', minWidth: 880 }}>
                            <thead>
                                <tr style={{ background: '#F8FAFC', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>
                                    {(['Ref.', 'Status', 'Rota', 'Motorista', 'Ida', 'Chegada', 'Aceite', 'Ações'] as const).map(h => (
                                        <th key={h} style={{ padding: '10px 8px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', fontSize: '.6rem', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {trips.map((t, idx) => {
                                    const { origin, destination } = routeFromTrip(t);
                                    const st = statusBadge(t.status);
                                    const dec = decisionBadge(t.driverDecision);
                                    return (
                                        <tr
                                            key={t.id}
                                            onClick={() => { setDetailTrip(t); setDetailTab('resumo'); }}
                                            style={{
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #F1F5F9',
                                                background: idx % 2 === 0 ? '#fff' : '#FAFBFC',
                                            }}
                                        >
                                            <td style={{ padding: '8px', fontFamily: 'JetBrains Mono, monospace', fontSize: '.7rem', color: '#475569' }}>{String(t.id).slice(0, 8)}…</td>
                                            <td style={{ padding: '8px', whiteSpace: 'nowrap' }}><span style={{ padding: '.12rem .45rem', borderRadius: 999, fontSize: '.65rem', border: `1px solid ${st.border}`, background: st.bg, color: st.color, fontWeight: 700 }}>{st.label}</span></td>
                                            <td style={{ padding: '8px', maxWidth: 200, wordBreak: 'break-word', color: '#0F172A', fontWeight: 600 }}>{origin} → {destination}</td>
                                            <td style={{ padding: '8px', color: '#334155' }}>{t.driverUser?.name || t.driverName || '—'}</td>
                                            <td style={{ padding: '8px', whiteSpace: 'nowrap', color: '#334155' }}>{fmtDateTime(t.departureDate)}</td>
                                            <td style={{ padding: '8px', whiteSpace: 'nowrap', color: '#334155' }}>{fmtDateTime(t.actualArrivalDate || t.expectedArrivalDate)}{t.actualArrivalDate ? '' : ' *'}</td>
                                            <td style={{ padding: '8px' }}><span style={{ padding: '.12rem .45rem', borderRadius: 999, fontSize: '.65rem', border: `1px solid ${dec.border}`, background: dec.bg, color: dec.color, fontWeight: 700 }}>{dec.label}</span></td>
                                            <td style={{ padding: '8px', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                                                {t.startOdometerPhotoUrl ? (
                                                    <button type="button" className="btn-ghost" style={{ padding: '2px 6px', fontSize: '.65rem', marginRight: 4 }} onClick={() => openPhoto(t.startOdometerPhotoUrl)}>📷</button>
                                                ) : null}
                                                {t.endOdometerPhotoUrl ? (
                                                    <button type="button" className="btn-ghost" style={{ padding: '2px 6px', fontSize: '.65rem', marginRight: 4 }} onClick={() => openPhoto(t.endOdometerPhotoUrl)}>🏁</button>
                                                ) : null}
                                                {t.driverDecision === 'REJECTED' ? (
                                                    <button type="button" className="btn-ghost" style={{ padding: '2px 6px', fontSize: '.65rem', marginRight: 4 }} onClick={() => applyPenalty(t.id)}>Penal.</button>
                                                ) : null}
                                                {t.status === 'PLANNED' ? (
                                                    <button type="button" className="btn-ghost" style={{ padding: '2px 6px', fontSize: '.65rem' }} onClick={() => openAssignModal(t.id)}>Vincular</button>
                                                ) : null}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        )}
                    </div>
                ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
                {loading ? (
                    <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '1rem', color: '#64748B' }}>Carregando viagens...</div>
                ) : trips.map((t, idx) => {
                    const { origin, destination } = routeFromTrip(t);
                    const cepSub = routeCepSubtitle(t);
                    const coordSub = routeCoordsSubtitle(t);
                    const st = statusBadge(t.status);
                    const dec = decisionBadge(t.driverDecision);
                    const durationPlanned = tripDurationHours(t.departureDate, t.expectedArrivalDate);
                    const durationReal = tripDurationHours(t.departureDate, t.actualArrivalDate);
                    const linkedClass = linkedClassFromNotes(t.notes);
                    return (
                        <div
                            key={t.id}
                            className="adm-kpi-card adm-scale-in"
                            onClick={() => { setDetailTrip(t); setDetailTab('resumo'); }}
                            style={{
                                animationDelay: `${idx * 35}ms`,
                                background: '#fff',
                                borderTopColor: `${st.border}`,
                                borderRightColor: `${st.border}`,
                                borderBottomColor: `${st.border}`,
                                borderLeftColor: st.color,
                                cursor: 'pointer',
                            }}
                        >
                            <div className="adm-kpi-grid" />
                            <div className="adm-kpi-scan" style={{ background: `linear-gradient(90deg, transparent, ${st.color}66, transparent)` }} />
                            <div className="adm-kpi-topline" style={{ background: `linear-gradient(90deg, transparent, ${st.color}, transparent)` }} />
                            <div className="adm-kpi-ring" style={{ borderColor: `${st.color}2A` }} />
                            <div className="adm-kpi-ring adm-kpi-ring-sm" style={{ borderColor: `${st.color}1F` }} />
                            <div className="adm-kpi-dot" style={{ background: st.color }} />

                            <div style={{ position: 'relative', zIndex: 1, padding: '14px 14px 10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                                    <div style={{ fontFamily: 'Orbitron', fontSize: '.62rem', fontWeight: 800, letterSpacing: '.1em', color: '#6B7280' }}>VIAGEM #{String(t.id).slice(0, 8)}</div>
                                    <span style={{ display: 'inline-flex', padding: '.2rem .55rem', borderRadius: 999, fontSize: '.7rem', border: `1px solid ${st.border}`, background: st.bg, color: st.color }}>{st.label}</span>
                                </div>

                                <div style={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.35, marginBottom: 3 }}>{origin} → {destination}</div>
                                {cepSub ? <div style={{ fontSize: '.72rem', color: '#64748B' }}>CEP: {cepSub}</div> : null}
                                {coordSub ? <div style={{ fontSize: '.68rem', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>{coordSub}</div> : null}

                                <div style={{ marginTop: 8, display: 'grid', gap: 5 }}>
                                    <div style={{ fontSize: '.75rem', color: '#334155' }}><b>Motorista:</b> {t.driverUser?.name || '-'}</div>
                                    <div style={{ fontSize: '.75rem', color: '#334155' }}><b>Ida:</b> {fmtDateTime(t.departureDate)}</div>
                                    <div style={{ fontSize: '.75rem', color: '#334155' }}>
                                        <b>Volta/chegada:</b> {fmtDateTime(t.actualArrivalDate || t.expectedArrivalDate)} {t.actualArrivalDate ? '(real)' : '(prevista)'}
                                    </div>
                                    <div style={{ fontSize: '.75rem', color: '#334155' }}>
                                        <b>Período da viagem:</b> {durationReal ? `${durationReal.toFixed(2)}h (real)` : durationPlanned ? `${durationPlanned.toFixed(2)}h (planejado)` : 'não calculável'}
                                    </div>
                                    <div style={{ fontSize: '.75rem', color: '#334155' }}>
                                        <b>Curso/Turma atrelado:</b> {linkedClass || 'não identificado no registro'}
                                    </div>
                                    <div style={{ fontSize: '.75rem', color: '#334155' }}>
                                        <b>Aceite:</b>{' '}
                                        <span style={{ display: 'inline-flex', padding: '.16rem .5rem', borderRadius: 999, border: `1px solid ${dec.border}`, background: dec.bg, color: dec.color }}>
                                            {dec.label}
                                        </span>
                                    </div>
                                    {t.driverDecisionReason ? <div style={{ fontSize: '.72rem', color: '#64748B' }}>Motivo: {t.driverDecisionReason}</div> : null}
                                    <div style={{ fontSize: '.75rem', color: '#334155' }}>
                                        <b>Penalização:</b> {t.rejectionPenalty ? `R$ ${Number(t.rejectionPenalty).toFixed(2)}` : '-'}
                                    </div>
                                    {t.notes ? <div style={{ fontSize: '.72rem', color: '#64748B', whiteSpace: 'pre-wrap' }}><b>Notas:</b> {t.notes}</div> : null}
                                </div>

                                {(t.startOdometerPhotoUrl || t.endOdometerPhotoUrl) && (
                                    <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {t.startOdometerPhotoUrl ? (
                                            <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); openPhoto(t.startOdometerPhotoUrl); }}>📷 Foto início</button>
                                        ) : null}
                                        {t.endOdometerPhotoUrl ? (
                                            <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); openPhoto(t.endOdometerPhotoUrl); }}>🏁 Foto final</button>
                                        ) : null}
                                    </div>
                                )}
                            </div>

                            <div style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(148,163,184,.2)', padding: '10px 14px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {t.driverDecision === 'REJECTED' && (
                                    <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); applyPenalty(t.id); }}>Penalizar</button>
                                )}
                                {t.status === 'PLANNED' && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); openAssignModal(t.id); }}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '0.5rem 0.95rem',
                                            borderRadius: 10,
                                            border: '1px solid rgba(15, 23, 42, 0.88)',
                                            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 55%, #0F172A 100%)',
                                            color: '#FDE047',
                                            fontFamily: 'Orbitron, system-ui, sans-serif',
                                            fontSize: '0.62rem',
                                            fontWeight: 800,
                                            letterSpacing: '0.08em',
                                            textTransform: 'uppercase',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                            e.currentTarget.style.boxShadow = '0 8px 22px rgba(253, 224, 71, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = '';
                                            e.currentTarget.style.boxShadow = '0 4px 14px rgba(15, 23, 42, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)';
                                        }}
                                    >
                                        <TruckIcon style={{ width: 18, height: 18, flexShrink: 0 }} aria-hidden />
                                        Vincular motorista
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
                )}
            </div>

            {assignModal && (
                <ModalPortal>
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: MODAL_PORTAL_Z_INDEX,
                        background: 'rgba(2, 6, 23, .65)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                    }}
                    onClick={(e) => { if (e.target === e.currentTarget) setAssignModal(null); }}
                >
                    <div
                        role="dialog"
                        aria-labelledby="assign-driver-title"
                        style={{
                            width: '100%',
                            maxWidth: 520,
                            maxHeight: '88vh',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 18,
                            border: '1px solid rgba(253, 224, 71, 0.5)',
                            background: 'linear-gradient(165deg, #0F172A 0%, #1E293B 42%, #0F172A 100%)',
                            boxShadow: '0 24px 64px rgba(0, 0, 0, .45), 0 0 0 1px rgba(255,255,255,.04) inset',
                            overflow: 'hidden',
                            color: '#E2E8F0',
                        }}
                    >
                        <div
                            style={{
                                padding: '1rem 1.1rem',
                                borderBottom: '1px solid rgba(51, 65, 85, 0.85)',
                                background: 'linear-gradient(90deg, rgba(253,224,71,.12) 0%, transparent 55%)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                            }}
                        >
                            <div
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    background: 'linear-gradient(135deg, #FDE047 0%, #CA8A04 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 16px rgba(253, 224, 71, 0.35)',
                                    flexShrink: 0,
                                }}
                            >
                                <TruckIcon style={{ width: 24, height: 24, color: '#0F172A' }} aria-hidden />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                    id="assign-driver-title"
                                    style={{
                                        fontFamily: 'Orbitron, system-ui, sans-serif',
                                        fontSize: '0.78rem',
                                        fontWeight: 800,
                                        letterSpacing: '0.1em',
                                        color: '#F8FAFC',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Vincular motorista
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 4, lineHeight: 1.45 }}>
                                    Escolha quem conduz esta viagem planejada. O motorista será notificado após confirmar.
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAssignModal(null)}
                                aria-label="Fechar"
                                style={{
                                    flexShrink: 0,
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    border: '1px solid rgba(148, 163, 184, 0.35)',
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    color: '#CBD5E1',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background 0.15s, color 0.15s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                                    e.currentTarget.style.color = '#FCA5A5';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)';
                                    e.currentTarget.style.color = '#CBD5E1';
                                }}
                            >
                                <XMarkIcon style={{ width: 22, height: 22 }} />
                            </button>
                        </div>

                        <div style={{ padding: '1rem 1.1rem 0' }}>
                            <label htmlFor="assign-driver-search" style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                                Buscar
                            </label>
                            <div style={{ position: 'relative' }}>
                                <MagnifyingGlassIcon
                                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: '#64748B', pointerEvents: 'none' }}
                                    aria-hidden
                                />
                                <input
                                    id="assign-driver-search"
                                    placeholder="Nome, e-mail ou telefone…"
                                    value={assignModal.search}
                                    onChange={(e) => setAssignModal((prev) => prev ? { ...prev, search: e.target.value } : prev)}
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '0.65rem 0.75rem 0.65rem 2.5rem',
                                        background: 'rgba(15, 23, 42, 0.92)',
                                        color: '#F1F5F9',
                                        border: '1px solid #475569',
                                        borderRadius: 12,
                                        fontSize: '0.88rem',
                                        outline: 'none',
                                        transition: 'border-color 0.15s, box-shadow 0.15s',
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#FDE047';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(253, 224, 71, 0.2)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#475569';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                            </div>
                        </div>

                        <div
                            style={{
                                margin: '0.85rem 1.1rem 0',
                                flex: 1,
                                minHeight: 200,
                                maxHeight: 340,
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                                paddingRight: 4,
                            }}
                        >
                            {filteredDrivers.map((d) => {
                                const selected = assignModal.driverUserId === d.id;
                                const initials = String(d.name || '?')
                                    .split(/\s+/)
                                    .filter(Boolean)
                                    .map((w: string) => w[0])
                                    .slice(0, 2)
                                    .join('')
                                    .toUpperCase() || '?';
                                const contactLine = [d.email, d.phone].filter(Boolean).join(' · ') || 'Sem contacto no cadastro';
                                return (
                                    <button
                                        type="button"
                                        key={d.id}
                                        onClick={() => setAssignModal((prev) => prev ? { ...prev, driverUserId: d.id } : prev)}
                                        style={{
                                            textAlign: 'left',
                                            borderRadius: 14,
                                            border: selected ? '2px solid #FDE047' : '1px solid rgba(71, 85, 105, 0.9)',
                                            background: selected
                                                ? 'linear-gradient(90deg, rgba(253,224,71,.2) 0%, rgba(15,23,42,.75) 100%)'
                                                : 'rgba(15, 23, 42, 0.55)',
                                            color: '#F8FAFC',
                                            padding: '0.65rem 0.75rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            transition: 'border-color 0.15s, background 0.15s, transform 0.12s',
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: 12,
                                                flexShrink: 0,
                                                background: selected ? 'rgba(253, 224, 71, 0.95)' : 'rgba(51, 65, 85, 0.9)',
                                                color: selected ? '#0F172A' : '#E2E8F0',
                                                fontFamily: 'Orbitron, system-ui, sans-serif',
                                                fontWeight: 900,
                                                fontSize: '0.72rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: selected ? 'none' : '1px solid rgba(148, 163, 184, 0.35)',
                                            }}
                                        >
                                            {initials}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                <strong style={{ fontSize: '0.92rem', color: '#F8FAFC' }}>{d.name}</strong>
                                                {d.active === false && (
                                                    <span style={{ fontSize: '0.58rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(239, 68, 68, 0.2)', color: '#FCA5A5', border: '1px solid rgba(248, 113, 113, 0.4)' }}>
                                                        INATIVO
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 4, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={contactLine}>
                                                {contactLine}
                                            </div>
                                            <div style={{ fontSize: '0.6rem', color: '#64748B', marginTop: 6, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em' }}>
                                                Ref. {String(d.id).slice(0, 8)}…
                                            </div>
                                        </div>
                                        {selected ? (
                                            <CheckCircleIcon style={{ width: 26, height: 26, color: '#FDE047', flexShrink: 0 }} aria-label="Selecionado" />
                                        ) : (
                                            <UserCircleIcon style={{ width: 26, height: 26, color: '#475569', flexShrink: 0 }} aria-hidden />
                                        )}
                                    </button>
                                );
                            })}
                            {filteredDrivers.length === 0 && (
                                <div
                                    style={{
                                        color: '#94A3B8',
                                        fontSize: '0.84rem',
                                        padding: '1.5rem 1rem',
                                        textAlign: 'center',
                                        border: '1px dashed rgba(71, 85, 105, 0.8)',
                                        borderRadius: 12,
                                        background: 'rgba(15, 23, 42, 0.4)',
                                    }}
                                >
                                    Nenhum motorista corresponde à busca.
                                </div>
                            )}
                        </div>

                        <div
                            style={{
                                padding: '1rem 1.1rem',
                                borderTop: '1px solid rgba(51, 65, 85, 0.85)',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: 10,
                                flexWrap: 'wrap',
                                background: 'rgba(2, 6, 23, 0.35)',
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setAssignModal(null)}
                                style={{
                                    padding: '0.55rem 1.1rem',
                                    borderRadius: 10,
                                    border: '1px solid rgba(148, 163, 184, 0.45)',
                                    background: 'transparent',
                                    color: '#CBD5E1',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    transition: 'background 0.15s, border-color 0.15s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(148, 163, 184, 0.12)';
                                    e.currentTarget.style.borderColor = '#94A3B8';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.45)';
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={!assignModal.driverUserId || assigning}
                                onClick={confirmAssignDriver}
                                style={{
                                    padding: '0.55rem 1.25rem',
                                    borderRadius: 10,
                                    border: '1px solid rgba(15, 23, 42, 0.9)',
                                    background: !assignModal.driverUserId || assigning
                                        ? 'rgba(71, 85, 105, 0.5)'
                                        : 'linear-gradient(135deg, #FDE047 0%, #EAB308 45%, #CA8A04 100%)',
                                    color: !assignModal.driverUserId || assigning ? '#94A3B8' : '#0F172A',
                                    fontFamily: 'Orbitron, system-ui, sans-serif',
                                    fontWeight: 800,
                                    fontSize: '0.68rem',
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    cursor: !assignModal.driverUserId || assigning ? 'not-allowed' : 'pointer',
                                    boxShadow: !assignModal.driverUserId || assigning ? 'none' : '0 4px 18px rgba(253, 224, 71, 0.35)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    transition: 'transform 0.12s, box-shadow 0.12s',
                                }}
                                onMouseEnter={(e) => {
                                    if (!e.currentTarget.disabled) {
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(253, 224, 71, 0.42)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = '';
                                    e.currentTarget.style.boxShadow = !assignModal.driverUserId || assigning ? 'none' : '0 4px 18px rgba(253, 224, 71, 0.35)';
                                }}
                            >
                                <TruckIcon style={{ width: 18, height: 18 }} aria-hidden />
                                {assigning ? 'A vincular…' : 'Confirmar vínculo'}
                            </button>
                        </div>
                    </div>
                </div>
                </ModalPortal>
            )}

            {detailTrip && (
                <ModalPortal>
                    <div
                        style={{
                            position: 'fixed', inset: 0, zIndex: MODAL_PORTAL_Z_INDEX, background: 'rgba(2,6,23,.58)',
                            backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
                        }}
                        onClick={(e) => { if (e.target === e.currentTarget) setDetailTrip(null); }}
                    >
                        <div
                            style={{
                                width: 'min(980px,96vw)', maxHeight: '88vh', overflow: 'auto', borderRadius: 16,
                                border: '1px solid rgba(148,163,184,.28)', background: '#fff', boxShadow: '0 24px 64px rgba(0,0,0,.35)',
                            }}
                        >
                            <div style={{ padding: '12px 14px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg,#0F172A,#1E293B)' }}>
                                <div style={{ fontFamily: 'Orbitron', fontWeight: 900, color: '#F8FAFC', fontSize: '.95rem' }}>Rastreio Completo da Viagem #{String(detailTrip.id).slice(0, 8)}</div>
                                <button className="btn-ghost" style={{ marginLeft: 'auto', color: '#CBD5E1' }} onClick={() => setDetailTrip(null)}>Fechar</button>
                            </div>
                            <div style={{ padding: '10px 14px', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {[
                                    ['resumo', 'Resumo executivo'],
                                    ['rastreio', 'Rastreio operacional'],
                                    ['auditoria', 'Auditoria admin'],
                                ].map(([id, label]) => (
                                    <button
                                        key={id}
                                        className={detailTab === id ? 'btn-primary' : 'btn-ghost'}
                                        onClick={() => setDetailTab(id as typeof detailTab)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <div style={{ padding: '14px', display: 'grid', gap: 10 }}>
                                {detailTab === 'resumo' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
                                        {[
                                            ['Rota', `${routeFromTrip(detailTrip).origin} → ${routeFromTrip(detailTrip).destination}`],
                                            ['Motorista', detailTrip.driverUser?.name || detailTrip.driverName || '-'],
                                            ['Status', statusBadge(detailTrip.status).label],
                                            ['Aceite', decisionBadge(detailTrip.driverDecision).label],
                                            ['Saída (ida)', fmtDateTime(detailTrip.departureDate)],
                                            ['Chegada prevista', fmtDateTime(detailTrip.expectedArrivalDate)],
                                            ['Chegada real', fmtDateTime(detailTrip.actualArrivalDate)],
                                            ['Penalização', detailTrip.rejectionPenalty ? `R$ ${Number(detailTrip.rejectionPenalty).toFixed(2)}` : '-'],
                                        ].map(([k, v]) => (
                                            <div key={String(k)} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', background: '#F8FAFC' }}>
                                                <div style={{ fontSize: '.64rem', fontWeight: 800, letterSpacing: '.08em', color: '#64748B', textTransform: 'uppercase' }}>{k}</div>
                                                <div style={{ marginTop: 3, fontWeight: 700, color: '#0F172A', lineHeight: 1.35 }}>{v}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {detailTab === 'rastreio' && (
                                    <div style={{ display: 'grid', gap: 10 }}>
                                        <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px' }}>
                                            <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>Fotos comprobatórias</div>
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                <button className="btn-ghost" disabled={!detailTrip.startOdometerPhotoUrl} onClick={() => openPhoto(detailTrip.startOdometerPhotoUrl)}>📷 Hodômetro ida</button>
                                                <button className="btn-ghost" disabled={!detailTrip.endOdometerPhotoUrl} onClick={() => openPhoto(detailTrip.endOdometerPhotoUrl)}>🏁 Hodômetro volta</button>
                                            </div>
                                        </div>
                                        <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px' }}>
                                            <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>Métricas técnicas</div>
                                            <div style={{ fontSize: '.84rem', color: '#334155', lineHeight: 1.55 }}>
                                                <div><b>KM inicial:</b> {detailTrip.kmStart ?? 'n/d'}</div>
                                                <div><b>KM final:</b> {detailTrip.kmEnd ?? 'n/d'}</div>
                                                <div><b>Distância GPS:</b> {detailTrip.gpsDistanceKm != null ? `${Number(detailTrip.gpsDistanceKm).toFixed(2)} km` : 'n/d'}</div>
                                                <div><b>Origem (lat,lng):</b> {detailTrip.originLatitude ?? '-'}, {detailTrip.originLongitude ?? '-'}</div>
                                                <div><b>Destino (lat,lng):</b> {detailTrip.destinationLatitude ?? '-'}, {detailTrip.destinationLongitude ?? '-'}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {detailTab === 'auditoria' && (
                                    <div style={{ display: 'grid', gap: 10 }}>
                                        <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px' }}>
                                            <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>Trilha administrativa</div>
                                            <div style={{ fontSize: '.84rem', color: '#334155', lineHeight: 1.55 }}>
                                                <div><b>Criada em:</b> {fmtDateTime(detailTrip.createdAt)}</div>
                                                <div><b>Atualizada em:</b> {fmtDateTime(detailTrip.updatedAt)}</div>
                                                <div><b>Decisão do motorista em:</b> {fmtDateTime(detailTrip.driverDecisionAt)}</div>
                                                <div><b>Penalização aplicada em:</b> {fmtDateTime(detailTrip.rejectionPenaltyAt)}</div>
                                                <div><b>Motivo da recusa:</b> {detailTrip.driverDecisionReason || 'não informado'}</div>
                                            </div>
                                        </div>
                                        <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px' }}>
                                            <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>Notas operacionais completas</div>
                                            <div style={{ fontSize: '.82rem', color: '#475569', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{detailTrip.notes || 'Sem notas administrativas.'}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}

