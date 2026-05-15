'use client';

/**
 * LocationFields — componente reutilizável para capturar local físico
 * onde uma turma ou ação ocorre. Os campos são todos opcionais para
 * deploy seguro (não quebra registos existentes).
 *
 * Uso:
 *   <LocationFields
 *     value={{ name, address, reference, latitude, longitude }}
 *     onChange={(v) => setLocation(v)}
 *     fieldPrefix="location"  // ou "local" para Acao
 *     compact={false}
 *   />
 */

import { useEffect, useState } from 'react';
import api from '@/lib/api/client';
import { viaCepMatchesCity, type CatalogCityForCepMatch } from '@/lib/brazilCepCityMatch';

export interface LocationFieldsValue {
    name?: string | null;
    address?: string | null;
    postalCode?: string | null;
    reference?: string | null;
    latitude?: number | null;
    longitude?: number | null;
}

interface LocationFieldsProps {
    value: LocationFieldsValue;
    onChange: (value: LocationFieldsValue) => void;
    /** Cidade/UF a usar como contexto na busca Nominatim, ex: "São Luís, MA, Brasil" */
    cityContext?: string;
    /** Versão compacta (1 coluna) para uso dentro de modais estreitos */
    compact?: boolean;
    /** Modo somente leitura — para visualização em detalhe */
    readOnly?: boolean;
    /** Substitui o título «LOCAL FÍSICO» — ex.: fluxo de viagens manual */
    blockTitle?: string;
    /** Linha de apoio sob o título */
    blockSubtitle?: string;
    /** Rótulo do campo CEP (padrão: “CEP (busca alternativa)” no fluxo turma) */
    cepLabel?: string;
    /** false = não exibe “(opcional, mas recomendado)” no cabeçalho */
    showOptionalHint?: boolean;
    /** true = CEP domina endereço/coordenadas e endurece validação de rota */
    strictCepMode?: boolean;
    /** cidade do select pai (nome, UF, IBGE) — cruzamento com ViaCEP em modo estrito */
    strictSelectedCity?: CatalogCityForCepMatch | null;
}

/**
 * Geocodifica endereço via backend proxy autenticado (JWT obrigatório).
 * SEGURANÇA:
 *   - Nunca chama Nominatim diretamente do browser
 *   - JWT injetado automaticamente pelo interceptor do api client
 *   - Rate limiting e sanitização feitos no backend
 *   - Apenas ADMIN e COORDINATOR têm acesso ao endpoint
 */
async function geocodeViaBackend(query: string, ufViaCep?: string): Promise<{ lat: number; lon: number; displayName: string } | null> {
    try {
        const params: { q: string; uf?: string } = { q: query };
        const u = ufViaCep?.trim().toUpperCase();
        if (u && /^[A-Z]{2}$/.test(u)) params.uf = u;
        const res = await api.get<{ lat: number | null; lng: number | null; displayName: string | null }>(
            '/cities/geocode/address',
            { params }
        );
        const d = res.data;
        if (!d.lat || !d.lng) return null;
        return { lat: d.lat, lon: d.lng, displayName: d.displayName ?? query };
    } catch {
        return null;
    }
}

/**
 * Constrói a URL segura do iframe OpenStreetMap.
 *
 * SEGURANÇA:
 *   - lat e lon são validados como números finitos antes de entrar na URL
 *   - encodeURIComponent garante que nenhum caractere especial escapa para a URL
 *   - O bounding box é calculado matematicamente — nenhuma string de usuário entra na URL
 *   - URL sempre começa com o domínio fixo — impossível injetar outro domínio
 */
function buildOsmEmbedUrl(lat: number, lon: number): string | null {
    // Validação rigorosa: apenas números finitos dentro de limites geográficos válidos
    if (
        typeof lat !== 'number' || typeof lon !== 'number' ||
        !isFinite(lat) || !isFinite(lon) ||
        lat < -90 || lat > 90 || lon < -180 || lon > 180
    ) {
        return null;
    }
    // Bounding box de ~500m ao redor do ponto (delta ~0.005°)
    const delta = 0.005;
    const bbox = [
        (lon - delta).toFixed(6),
        (lat - delta).toFixed(6),
        (lon + delta).toFixed(6),
        (lat + delta).toFixed(6),
    ].join(',');
    // toFixed(6) já garante formato numérico seguro — sem caracteres especiais
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(6)},${lon.toFixed(6)}`;
}

export function LocationFields({
    value,
    onChange,
    cityContext,
    compact = false,
    readOnly = false,
    blockTitle,
    blockSubtitle,
    cepLabel,
    showOptionalHint = true,
    strictCepMode = false,
    strictSelectedCity = null,
}: LocationFieldsProps) {
    const [searching, setSearching] = useState(false);
    const [searchingByCep, setSearchingByCep] = useState(false);
    const [cepInput, setCepInput] = useState(value.postalCode ?? '');
    const [searchMessage, setSearchMessage] = useState<string | null>(null);

    useEffect(() => {
        setCepInput(value.postalCode ?? '');
    }, [value.postalCode]);

    const updateField = (key: keyof LocationFieldsValue, val: string | number | null) => {
        onChange({ ...value, [key]: val });
    };

    const handleSearchCoords = async () => {
        const baseQuery = [value.address, value.name, cityContext].filter(Boolean).join(', ');
        if (!baseQuery.trim()) {
            setSearchMessage('Preencha o endereço ou o nome do local antes de buscar.');
            return;
        }
        setSearching(true);
        setSearchMessage(null);
        const result = await geocodeViaBackend(baseQuery);
        setSearching(false);
        if (!result) {
            setSearchMessage('Não foi possível encontrar coordenadas. Tente endereço mais específico.');
            return;
        }
        onChange({
            ...value,
            latitude: result.lat,
            longitude: result.lon,
        });
        setSearchMessage(`Coordenadas encontradas: ${result.displayName.slice(0, 80)}${result.displayName.length > 80 ? '…' : ''}`);
    };

    const normalizeCep = (raw: string) => raw.replace(/\D/g, '').slice(0, 8);
    const formatCep = (raw: string) => {
        const digits = normalizeCep(raw);
        if (digits.length <= 5) return digits;
        return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    };

    const handleSearchByCep = async () => {
        const cepDigits = normalizeCep(cepInput);
        if (cepDigits.length !== 8) {
            setSearchMessage('CEP inválido. Use 8 dígitos (ex.: 65000-000).');
            return;
        }

        if (strictCepMode) {
            if (!strictSelectedCity?.name?.trim() || !strictSelectedCity?.state?.trim()) {
                setSearchMessage('INVÁLIDO: selecione a cidade (origem ou destino) no formulário antes de buscar pelo CEP.');
                return;
            }
        }

        setSearchingByCep(true);
        setSearchMessage(null);
        try {
            const viaCepRes = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
            const viaCepData = await viaCepRes.json();
            if (!viaCepRes.ok || viaCepData?.erro) {
                setSearchMessage('CEP não encontrado. Verifique e tente novamente.');
                return;
            }

            if (strictCepMode && strictSelectedCity) {
                const match = viaCepMatchesCity(
                    {
                        localidade: String(viaCepData.localidade ?? ''),
                        uf: String(viaCepData.uf ?? ''),
                        ibge: viaCepData.ibge != null ? String(viaCepData.ibge) : '',
                    },
                    strictSelectedCity,
                );
                if (!match.ok) {
                    setSearchMessage(`INVÁLIDO: CEP pertence a outro município/UF — ${match.detail}.`);
                    return;
                }
            }

            const parts = [
                viaCepData.logradouro,
                viaCepData.bairro,
                viaCepData.localidade,
                viaCepData.uf,
                'Brasil',
            ].filter(Boolean);
            const addressFromCep = parts.join(', ');
            const result = await geocodeViaBackend(addressFromCep, viaCepData.uf);

            if (!result) {
                onChange({
                    ...value,
                    // Em modo estrito, sempre mantém endereço canônico do CEP para evitar desvio.
                    address: strictCepMode ? addressFromCep : (value.address ?? addressFromCep),
                    postalCode: cepDigits,
                    latitude: strictCepMode ? null : value.latitude ?? null,
                    longitude: strictCepMode ? null : value.longitude ?? null,
                });
                setSearchMessage(
                    strictCepMode
                        ? 'CEP encontrado, mas não foi possível validar coordenadas automáticas. Não será permitido salvar rota até corrigir o CEP.'
                        : 'CEP encontrado. Endereço preenchido, mas não foi possível achar coordenadas automáticas.',
                );
                return;
            }

            onChange({
                ...value,
                // Em modo estrito, endereço e GPS sempre seguem o CEP consultado.
                address: strictCepMode ? addressFromCep : (value.address ?? addressFromCep),
                postalCode: cepDigits,
                latitude: result.lat,
                longitude: result.lon,
            });
            setSearchMessage(
                strictCepMode
                    ? `CEP validado. Coordenadas travadas pelo CEP: ${result.displayName.slice(0, 80)}${result.displayName.length > 80 ? '…' : ''}`
                    : `CEP encontrado e coordenadas preenchidas: ${result.displayName.slice(0, 80)}${result.displayName.length > 80 ? '…' : ''}`,
            );
        } catch {
            setSearchMessage('Falha ao consultar CEP. Tente novamente em instantes.');
        } finally {
            setSearchingByCep(false);
        }
    };

    const inputBaseStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.6rem 0.75rem',
        border: '1.5px solid #E5E7EB',
        borderRadius: 8,
        fontSize: '0.85rem',
        fontFamily: 'inherit',
        background: readOnly ? '#F9FAFB' : '#FFFFFF',
        color: '#111827',
        transition: 'border-color 0.15s',
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.06em',
        color: '#6B7280',
        marginBottom: 4,
        fontFamily: 'Orbitron, sans-serif',
    };

    return (
        <div style={{
            background: 'rgba(255, 251, 235, 0.5)',
            border: '1px solid rgba(255, 214, 0, 0.35)',
            borderRadius: 12,
            padding: '1rem 1.1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '1rem' }}>📍</span>
                <span style={{
                    fontFamily: 'Orbitron, sans-serif',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    color: '#0F172A',
                }}>
                    {blockTitle ?? 'LOCAL FÍSICO'}
                    {readOnly || !showOptionalHint ? '' : ' (opcional, mas recomendado)'}
                </span>
            </div>
            {blockSubtitle && !readOnly && (
                <div style={{ fontSize: '0.74rem', color: '#78716C', lineHeight: 1.45, marginTop: -4, marginBottom: 2 }}>
                    {blockSubtitle}
                </div>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '0.75rem',
            }}>
                <div>
                    <label style={labelStyle}>Nome do local</label>
                    <input
                        type="text"
                        placeholder="Ex: Escola Municipal Castro Alves"
                        value={value.name ?? ''}
                        onChange={(e) => updateField('name', e.target.value || null)}
                        readOnly={readOnly}
                        style={inputBaseStyle}
                        maxLength={200}
                    />
                </div>

                <div>
                    <label style={labelStyle}>Endereço</label>
                    <input
                        type="text"
                        placeholder="Ex: Rua das Flores, 123 - Centro"
                        value={value.address ?? ''}
                        onChange={(e) => updateField('address', e.target.value || null)}
                        readOnly={readOnly}
                        style={inputBaseStyle}
                        maxLength={300}
                    />
                </div>
            </div>

            <div>
                <label style={labelStyle}>Ponto de referência</label>
                <input
                    type="text"
                    placeholder="Ex: Próximo ao mercado, portão azul"
                    value={value.reference ?? ''}
                    onChange={(e) => updateField('reference', e.target.value || null)}
                    readOnly={readOnly}
                    style={inputBaseStyle}
                    maxLength={300}
                />
            </div>

            {!readOnly && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: compact ? '1fr' : 'minmax(180px, 240px) auto',
                    gap: '0.6rem',
                    alignItems: 'end',
                }}>
                    <div>
                        <label style={labelStyle}>{cepLabel ?? 'CEP (busca alternativa)'}</label>
                        <input
                            type="text"
                            placeholder="00000-000"
                            value={formatCep(cepInput)}
                            onChange={(e) => setCepInput(formatCep(e.target.value))}
                            style={{ ...inputBaseStyle, fontFamily: 'monospace', fontSize: '0.8rem' }}
                            maxLength={9}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleSearchByCep}
                        disabled={searchingByCep}
                        style={{
                            padding: '0.6rem 1rem',
                            borderRadius: 8,
                            border: 'none',
                            background: searchingByCep ? '#FDE68A' : 'linear-gradient(180deg, #FDE047 0%, #F59E0B 100%)',
                            color: '#000',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            cursor: searchingByCep ? 'wait' : 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
                            opacity: searchingByCep ? 0.85 : 1,
                            fontFamily: 'inherit',
                        }}
                        title="Buscar endereço e coordenadas usando CEP"
                    >
                        {searchingByCep ? '📮 Buscando CEP...' : '📮 Buscar por CEP'}
                    </button>
                </div>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns: compact ? '1fr' : 'repeat(2, 1fr) auto',
                gap: '0.6rem',
                alignItems: 'end',
            }}>
                <div>
                    <label style={labelStyle}>Latitude</label>
                    <input
                        type="number"
                        step="any"
                        placeholder="-2.5307"
                        value={value.latitude ?? ''}
                        onChange={(e) => updateField('latitude', e.target.value === '' ? null : Number(e.target.value))}
                        readOnly={readOnly || strictCepMode}
                        style={{ ...inputBaseStyle, fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                </div>
                <div>
                    <label style={labelStyle}>Longitude</label>
                    <input
                        type="number"
                        step="any"
                        placeholder="-44.3068"
                        value={value.longitude ?? ''}
                        onChange={(e) => updateField('longitude', e.target.value === '' ? null : Number(e.target.value))}
                        readOnly={readOnly || strictCepMode}
                        style={{ ...inputBaseStyle, fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                </div>
                {!readOnly && (
                    <button
                        type="button"
                        onClick={handleSearchCoords}
                        disabled={searching || strictCepMode}
                        style={{
                            padding: '0.6rem 1rem',
                            borderRadius: 8,
                            border: 'none',
                            background: searching ? '#FCD34D' : 'linear-gradient(180deg, #FFD600 0%, #F59E0B 100%)',
                            color: '#000',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            cursor: searching ? 'wait' : 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 8px rgba(255,214,0,0.3)',
                            opacity: searching ? 0.85 : 1,
                            fontFamily: 'inherit',
                        }}
                        title={strictCepMode ? 'Modo estrito: coordenadas são definidas pelo CEP' : 'Buscar coordenadas via OpenStreetMap a partir do endereço'}
                    >
                        {strictCepMode ? '🔒 Coordenadas via CEP' : (searching ? '🔍 Buscando...' : '🔍 Buscar coordenadas')}
                    </button>
                )}
            </div>

            {searchMessage && (
                <div style={{
                    fontSize: '0.75rem',
                    color:
                        searchMessage.startsWith('INVÁLIDO:') ||
                        searchMessage.startsWith('Não') ||
                        searchMessage.startsWith('Preencha')
                            ? '#B91C1C'
                            : '#047857',
                    background:
                        searchMessage.startsWith('INVÁLIDO:') ||
                        searchMessage.startsWith('Não') ||
                        searchMessage.startsWith('Preencha')
                            ? '#FEE2E2'
                            : '#D1FAE5',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 6,
                    lineHeight: 1.5,
                }}>
                    {searchMessage}
                </div>
            )}

            {/* ── Preview do mapa (iframe OSM) — só aparece com coordenadas válidas ── */}
            {typeof value.latitude === 'number' && typeof value.longitude === 'number' &&
                isFinite(value.latitude) && isFinite(value.longitude) && (() => {
                    const embedUrl = buildOsmEmbedUrl(value.latitude!, value.longitude!);
                    if (!embedUrl) return null;
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {/*
                             * SEGURANÇA DO IFRAME:
                             * - sandbox="allow-scripts"  → apenas scripts mínimos do mapa (pan/zoom)
                             *                              bloqueia: formulários, popups, navegação,
                             *                              acesso ao DOM pai, downloads automáticos
                             * - referrerpolicy="no-referrer" → OSM não recebe a URL do sistema
                             * - loading="lazy"            → carrega apenas quando visível (performance)
                             * - title                     → acessibilidade (leitores de tela)
                             * - src via buildOsmEmbedUrl  → URL construída só com números validados,
                             *                              domínio fixo, nunca string de usuário
                             */}
                            <iframe
                                src={embedUrl}
                                sandbox="allow-scripts"
                                referrerPolicy="no-referrer"
                                loading="lazy"
                                title="Prévia do local no OpenStreetMap"
                                style={{
                                    width: '100%',
                                    height: 200,
                                    border: 'none',
                                    borderRadius: 8,
                                    display: 'block',
                                }}
                                aria-label="Mapa mostrando o local selecionado"
                            />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>
                                    © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: '#9CA3AF' }}>OpenStreetMap</a> contributors
                                </span>
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${value.latitude},${value.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ fontSize: '0.72rem', color: '#2563EB', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                    🗺️ Verificar no Google Maps →
                                </a>
                            </div>
                        </div>
                    );
                })()
            }
        </div>
    );
}
