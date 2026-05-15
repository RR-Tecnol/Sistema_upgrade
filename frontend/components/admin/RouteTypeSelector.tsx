'use client';

/**
 * RouteTypeSelector — seletor de tipo de rota para turmas e ações.
 *
 * INTERCIDADE: a Carreta-Escola parte de uma cidade (originCity) e opera
 *              em outra cidade (destino). Exibe dois dropdowns de cidade.
 *
 * INTRAURBANA: o curso acontece dentro da mesma cidade, entre bairros/pontos.
 *              Exibe um dropdown de cidade + dois campos de texto para bairros.
 *
 * Uso:
 *   <RouteTypeSelector
 *     routeType="INTERCIDADE"
 *     originCityId={form.originCityId}
 *     cityId={form.cityId}
 *     originNeighborhood={form.originNeighborhood}
 *     destinationNeighborhood={form.destinationNeighborhood}
 *     cities={filteredCities}
 *     onChange={(patch) => setForm(f => ({ ...f, ...patch }))}
 *     errors={errors}
 *   />
 */

import { useState } from 'react';
import { MapPinIcon, ArrowRightIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { City } from '@/lib/api/cities';

export type RouteType = 'INTERCIDADE' | 'INTRAURBANA';

export interface RouteTypePatch {
    routeType?: RouteType;
    originCityId?: string;
    cityId?: string;
    originNeighborhood?: string;
    destinationNeighborhood?: string;
}

interface RouteTypeSelectorProps {
    routeType: RouteType;
    originCityId?: string;
    cityId?: string;
    originNeighborhood?: string;
    destinationNeighborhood?: string;
    cities: City[];
    onChange: (patch: RouteTypePatch) => void;
    errors?: Record<string, string>;
    /** Quando true não mostra o seletor de tipo (ex: dentro de modal compacto) */
    hideTabs?: boolean;
}

const INPUT: React.CSSProperties = {
    width: '100%', padding: '0.65rem 0.9rem', borderRadius: 10,
    border: '1.5px solid #E5E7EB', background: '#F9FAFB',
    fontSize: '0.85rem', color: '#111827', outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
};
const LABEL: React.CSSProperties = {
    display: 'block', fontSize: '0.63rem', fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: '0.1em',
    color: '#6B7280', marginBottom: '0.35rem',
};

function FocusInput({ label, required, error, style, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean; error?: string }) {
    const [f, setF] = useState(false);
    return (
        <div>
            <label style={LABEL}>{label}{required && <span style={{ color: '#FFD600', marginLeft: 3 }}>*</span>}</label>
            <input {...rest}
                style={{ ...INPUT, ...style, borderColor: f ? '#FFD600' : error ? '#FCA5A5' : '#E5E7EB', boxShadow: f ? '0 0 0 3px rgba(255,214,0,0.15)' : 'none' }}
                onFocus={() => setF(true)} onBlur={() => setF(false)}
            />
            {error && <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: '0.25rem', fontWeight: 600 }}>{error}</p>}
        </div>
    );
}

function FocusSelect({ label, required, error, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; required?: boolean; error?: string }) {
    const [f, setF] = useState(false);
    return (
        <div>
            <label style={LABEL}>{label}{required && <span style={{ color: '#FFD600', marginLeft: 3 }}>*</span>}</label>
            <select {...rest}
                style={{ ...INPUT, cursor: 'pointer', borderColor: f ? '#FFD600' : error ? '#FCA5A5' : '#E5E7EB', boxShadow: f ? '0 0 0 3px rgba(255,214,0,0.15)' : 'none' }}
                onFocus={() => setF(true)} onBlur={() => setF(false)}>
                {children}
            </select>
            {error && <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: '0.25rem', fontWeight: 600 }}>{error}</p>}
        </div>
    );
}

const ROUTE_TYPES = [
    {
        value: 'INTERCIDADE' as RouteType,
        icon: '🚌',
        label: 'Intercidade',
        desc: 'A Carreta-Escola parte de uma cidade e vai para outra',
        color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE',
    },
    {
        value: 'INTRAURBANA' as RouteType,
        icon: '🏙️',
        label: 'Intraurbana',
        desc: 'O curso acontece dentro da mesma cidade, entre bairros',
        color: '#059669', bg: '#F0FDF4', border: '#BBF7D0',
    },
];

export function RouteTypeSelector({
    routeType,
    originCityId,
    cityId,
    originNeighborhood,
    destinationNeighborhood,
    cities,
    onChange,
    errors = {},
    hideTabs = false,
}: RouteTypeSelectorProps) {
    const originCity = cities.find(c => c.id === originCityId);
    const destCity = cities.find(c => c.id === cityId);

    const handleTypeChange = (newType: RouteType) => {
        // ao trocar tipo, limpar campos do tipo anterior
        onChange({
            routeType: newType,
            originCityId: undefined,
            cityId: undefined,
            originNeighborhood: undefined,
            destinationNeighborhood: undefined,
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* ── Seletor de tipo ── */}
            {!hideTabs && (
                <div>
                    <label style={LABEL}>Tipo de Deslocamento <span style={{ color: '#FFD600' }}>*</span></label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                        {ROUTE_TYPES.map(rt => {
                            const sel = routeType === rt.value;
                            return (
                                <button
                                    key={rt.value}
                                    type="button"
                                    onClick={() => handleTypeChange(rt.value)}
                                    style={{
                                        textAlign: 'left', padding: '0.9rem 1rem', borderRadius: 12,
                                        border: `2px solid ${sel ? rt.border : '#E5E7EB'}`,
                                        background: sel ? rt.bg : '#F9FAFB',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                        boxShadow: sel ? `0 3px 12px ${rt.color}20` : 'none',
                                        transform: sel ? 'scale(1.01)' : 'scale(1)',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '1.15rem' }}>{rt.icon}</span>
                                            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: sel ? rt.color : '#374151' }}>{rt.label}</span>
                                        </div>
                                        {sel && <CheckCircleIcon style={{ width: 16, height: 16, color: rt.color }} />}
                                    </div>
                                    <p style={{ fontSize: '0.72rem', color: sel ? rt.color : '#9CA3AF', margin: 0, lineHeight: 1.4 }}>{rt.desc}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Campos INTERCIDADE ── */}
            {routeType === 'INTERCIDADE' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.5rem', alignItems: 'end' }}>
                        <FocusSelect
                            label="Cidade de Origem"
                            required
                            error={errors.originCityId}
                            value={originCityId || ''}
                            onChange={e => onChange({ originCityId: e.target.value || undefined })}
                        >
                            <option value="">Selecione a cidade de origem...</option>
                            {cities.map(c => (
                                <option key={c.id} value={c.id} disabled={c.id === cityId}>
                                    {c.name} — {c.state}
                                </option>
                            ))}
                        </FocusSelect>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '0.1rem' }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F3F4F6', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ArrowRightIcon style={{ width: 16, height: 16, color: '#9CA3AF' }} />
                            </div>
                        </div>

                        <FocusSelect
                            label="Cidade de Destino"
                            required
                            error={errors.cityId}
                            value={cityId || ''}
                            onChange={e => onChange({ cityId: e.target.value || undefined })}
                        >
                            <option value="">Selecione a cidade de destino...</option>
                            {cities.map(c => (
                                <option key={c.id} value={c.id} disabled={c.id === originCityId}>
                                    {c.name} — {c.state}
                                </option>
                            ))}
                        </FocusSelect>
                    </div>

                    {/* Preview da rota intercidade */}
                    {(originCity || destCity) && (
                        <div className="animate-fade-in" style={{ padding: '0.75rem 1rem', borderRadius: 10, background: 'linear-gradient(135deg, #EFF6FF, #F0FDF4)', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <MapPinIcon style={{ width: 16, height: 16, color: '#1D4ED8', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1E40AF' }}>
                                {originCity ? `${originCity.name} — ${originCity.state}` : '...'}
                            </span>
                            <ArrowRightIcon style={{ width: 14, height: 14, color: '#9CA3AF', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#065F46' }}>
                                {destCity ? `${destCity.name} — ${destCity.state}` : '...'}
                            </span>
                            {originCity && destCity && originCity.id !== destCity.id && (
                                <span style={{ marginLeft: 'auto', padding: '0.2rem 0.65rem', borderRadius: 100, background: '#DCFCE7', color: '#059669', fontSize: '0.65rem', fontWeight: 800, border: '1px solid #BBF7D0' }}>
                                    Rota válida ✓
                                </span>
                            )}
                            {originCity && destCity && originCity.id === destCity.id && (
                                <span style={{ marginLeft: 'auto', padding: '0.2rem 0.65rem', borderRadius: 100, background: '#FEF2F2', color: '#DC2626', fontSize: '0.65rem', fontWeight: 800, border: '1px solid #FECACA' }}>
                                    Origem = Destino ✗
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Campos INTRAURBANA ── */}
            {routeType === 'INTRAURBANA' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <FocusSelect
                        label="Cidade"
                        required
                        error={errors.cityId}
                        value={cityId || ''}
                        onChange={e => onChange({ cityId: e.target.value || undefined })}
                    >
                        <option value="">Selecione a cidade...</option>
                        {cities.map(c => (
                            <option key={c.id} value={c.id}>{c.name} — {c.state}</option>
                        ))}
                    </FocusSelect>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.5rem', alignItems: 'end' }}>
                        <FocusInput
                            label="Bairro / Ponto de Origem"
                            required
                            placeholder="Ex: Alto do Calhau"
                            value={originNeighborhood || ''}
                            error={errors.originNeighborhood}
                            onChange={e => onChange({ originNeighborhood: e.target.value || undefined })}
                            maxLength={150}
                        />

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '0.1rem' }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ArrowRightIcon style={{ width: 16, height: 16, color: '#059669' }} />
                            </div>
                        </div>

                        <FocusInput
                            label="Bairro / Ponto de Destino"
                            required
                            placeholder="Ex: Forquilha"
                            value={destinationNeighborhood || ''}
                            error={errors.destinationNeighborhood}
                            onChange={e => onChange({ destinationNeighborhood: e.target.value || undefined })}
                            maxLength={150}
                        />
                    </div>

                    {/* Preview da rota intraurbana */}
                    {(originNeighborhood || destinationNeighborhood || destCity) && (
                        <div className="animate-fade-in" style={{ padding: '0.75rem 1rem', borderRadius: 10, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <BuildingOffice2Icon style={{ width: 16, height: 16, color: '#059669', flexShrink: 0 }} />
                            {destCity && (
                                <span style={{ fontSize: '0.75rem', color: '#065F46', fontWeight: 700 }}>
                                    {destCity.name} — {destCity.state}
                                </span>
                            )}
                            {destCity && (originNeighborhood || destinationNeighborhood) && (
                                <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>·</span>
                            )}
                            {originNeighborhood && (
                                <span style={{ fontSize: '0.75rem', color: '#1E40AF', fontWeight: 700 }}>{originNeighborhood}</span>
                            )}
                            {originNeighborhood && destinationNeighborhood && (
                                <ArrowRightIcon style={{ width: 12, height: 12, color: '#9CA3AF', flexShrink: 0 }} />
                            )}
                            {destinationNeighborhood && (
                                <span style={{ fontSize: '0.75rem', color: '#065F46', fontWeight: 700 }}>{destinationNeighborhood}</span>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
