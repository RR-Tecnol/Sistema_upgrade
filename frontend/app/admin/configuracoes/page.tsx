'use client';

import { useState, useEffect, useRef } from 'react';
import { CameraIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api/client';
import { useAuthStore } from '@/stores/useAuthStore';
import {
    Cog6ToothIcon,
    BellIcon,
    ShieldCheckIcon,
    GlobeAltIcon,
    DocumentArrowDownIcon,
    UserCircleIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    CurrencyDollarIcon,
    MapPinIcon,
    ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { ConfiguracoesSidebarTutorial } from '@/components/admin/adminSidebarTutorials';
import { SettingRow } from '@/components/settings/SettingRow';
import AuthenticatorSettingsTotpBlock from '@/components/auth/AuthenticatorSettingsTotpBlock';
import ChangePasswordSettingsPanel from '@/components/auth/ChangePasswordSettingsPanel';
import { runAdminQuickExport, type QuickExportKey } from '@/lib/exports/adminQuickExport';
import WhatsAppConfigPanel from './whatsapp/page';

/* ── Toggle Switch ── */
function Toggle({ checked, onChange, color = '#FFD600' }: { checked: boolean; onChange: (v: boolean) => void; color?: string }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            style={{
                width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer',
                background: checked ? color : '#E5E7EB', border: 'none', transition: 'background 0.25s',
                flexShrink: 0,
            }}
        >
            <span style={{
                position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18,
                borderRadius: '50%', background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                display: 'block',
            }} />
        </button>
    );
}

/* ── Input inline ── */
function InlineInput({ value, onChange, placeholder, type = 'text', width = 200 }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; width?: number }) {
    const [focused, setFocused] = useState(false);
    return (
        <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
                width, padding: '0.45rem 0.75rem', borderRadius: 8, fontSize: '0.82rem', color: '#111827',
                border: `1.5px solid ${focused ? '#FFD600' : '#E5E7EB'}`,
                background: '#F9FAFB', outline: 'none',
                boxShadow: focused ? '0 0 0 3px rgba(255,214,0,0.15)' : 'none',
                transition: 'all 0.2s',
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
        />
    );
}

/* ── Select inline ── */
function InlineSelect({ value, onChange, options, width = 200 }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[]; width?: number }) {
    const [focused, setFocused] = useState(false);
    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{
                width, padding: '0.45rem 0.75rem', borderRadius: 8, fontSize: '0.82rem', color: '#111827',
                border: `1.5px solid ${focused ? '#FFD600' : '#E5E7EB'}`,
                background: '#F9FAFB', outline: 'none', cursor: 'pointer',
                boxShadow: focused ? '0 0 0 3px rgba(255,214,0,0.15)' : 'none',
                transition: 'all 0.2s',
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
        >
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    );
}


/* ── TabOperacional ─────────────────────────────────────────────────────── */

function TabOperacional() {
    // ── Cities ──
    const [cities, setCities] = useState<any[]>([]);
    const [cityForm, setCityForm] = useState({ name: '', state: 'MA', ibgeCode: '' });
    const [cityLoading, setCityLoading] = useState(false);
    const [cityAdding, setCityAdding] = useState(false);

    // ── Groups ──
    const [groups, setGroups] = useState<any[]>([]);
    const [groupForm, setGroupForm] = useState({ name: '', state: 'MA' });
    const [groupAdding, setGroupAdding] = useState(false);

    // ── Trips ──
    const [trips, setTrips] = useState<any[]>([]);
    const [tripsLoading, setTripsLoading] = useState(false);
    const [tripForm, setTripForm] = useState({ truckId: '', originCityId: '', destinationCityId: '', departureDate: '', expectedArrivalDate: '', driverName: '' });
    const [trucks, setTrucks] = useState<any[]>([]);
    const [tripAdding, setTripAdding] = useState(false);

    // ── Toast ──
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

    const SS: React.CSSProperties = { background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '1rem' };
    const ST: React.CSSProperties = { fontFamily: 'Orbitron', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.12em', color: '#B89B00', textTransform: 'uppercase', marginBottom: '0.75rem' };
    const INP: React.CSSProperties = { padding: '0.55rem 0.85rem', borderRadius: 9, border: '1.5px solid #E5E7EB', background: '#F9FAFB', fontSize: '0.82rem', outline: 'none', color: '#111827' };
    const SEL: React.CSSProperties = { ...INP, cursor: 'pointer' };

    const loadCities = async () => { setCityLoading(true); try { const r = await api.get('/cities'); setCities(r.data?.data || r.data || []); } finally { setCityLoading(false); } };
    const loadGroups = async () => { try { const r = await api.get('/groups'); setGroups(r.data?.data || r.data || []); } catch { /* silencioso */ } };
    const loadTrips = async () => { setTripsLoading(true); try { const r = await api.get('/admin/trips?limit=50'); setTrips(r.data?.data || r.data || []); } finally { setTripsLoading(false); } };
    const loadTrucks = async () => { try { const r = await api.get('/trucks?limit=100'); setTrucks(r.data?.data || r.data || []); } catch { /* silencioso */ } };

    useEffect(() => { loadCities(); loadGroups(); loadTrips(); loadTrucks(); }, []);

    const addCity = async () => {
        if (!cityForm.name.trim()) return;
        if (cityForm.state.trim().length !== 2) { showToast('❌ Informe UF com 2 letras (ex: MA, PI, PA).', false); return; }
        setCityAdding(true);
        try {
            await api.post('/cities', { name: cityForm.name.trim(), state: cityForm.state.trim().toUpperCase(), ibgeCode: cityForm.ibgeCode || undefined });
            setCityForm({ name: '', state: 'MA', ibgeCode: '' });
            showToast('✅ Cidade criada com sucesso!', true);
            loadCities();
        } catch (e: any) { showToast(`❌ ${e?.response?.data?.message || 'Erro ao criar cidade'}`, false); }
        finally { setCityAdding(false); }
    };

    const deleteCity = async (id: string, name: string) => {
        if (!confirm(`Excluir "${name}"? Isso removerá a cidade se não estiver vinculada a turmas ativas.`)) return;
        try { await api.delete(`/cities/${id}`); showToast('✅ Cidade removida!', true); loadCities(); }
        catch (e: any) { showToast(`❌ ${e?.response?.data?.message || 'Erro ao remover'}`, false); }
    };

    const addGroup = async () => {
        if (!groupForm.name.trim()) return;
        if (groupForm.state.trim().length !== 2) { showToast('❌ Informe UF com 2 letras (ex: MA, PI, PA).', false); return; }
        setGroupAdding(true);
        try {
            await api.post('/groups', { name: groupForm.name.trim(), state: groupForm.state.trim().toUpperCase() });
            setGroupForm({ name: '', state: 'MA' });
            showToast('✅ Grupo criado!', true);
            loadGroups();
        } catch (e: any) { showToast(`❌ ${e?.response?.data?.message || 'Erro ao criar grupo'}`, false); }
        finally { setGroupAdding(false); }
    };

    const deleteGroup = async (id: string, name: string) => {
        if (!confirm(`Excluir grupo "${name}"?`)) return;
        try { await api.delete(`/groups/${id}`); showToast('✅ Grupo removido!', true); loadGroups(); }
        catch (e: any) { showToast(`❌ ${e?.response?.data?.message || 'Erro ao remover'}`, false); }
    };

    const addTrip = async () => {
        if (!tripForm.truckId || !tripForm.originCityId || !tripForm.destinationCityId || !tripForm.departureDate || !tripForm.driverName) {
            showToast('❌ Preencha todos os campos obrigatórios.', false); return;
        }
        setTripAdding(true);
        try {
            await api.post('/admin/trips', { ...tripForm, expectedArrivalDate: tripForm.expectedArrivalDate || tripForm.departureDate });
            setTripForm({ truckId: '', originCityId: '', destinationCityId: '', departureDate: '', expectedArrivalDate: '', driverName: '' });
            showToast('✅ Rota criada!', true);
            loadTrips();
        } catch (e: any) { showToast(`❌ ${e?.response?.data?.message || 'Erro ao criar rota'}`, false); }
        finally { setTripAdding(false); }
    };

    const TRIP_STATUS: Record<string, { label: string; color: string }> = {
        PLANNED: { label: 'Planejada', color: '#B89B00' }, IN_TRANSIT: { label: 'Em Trânsito', color: '#059669' },
        COMPLETED: { label: 'Concluída', color: '#1D4ED8' }, CANCELLED: { label: 'Cancelada', color: '#DC2626' },
    };

    return (
        <div className="animate-fade-in">
            {toast && <div style={{ position: 'fixed', top: 80, right: 24, zIndex: 9999, padding: '12px 20px', background: toast.ok ? '#D1FAE5' : '#FEE2E2', border: `1px solid ${toast.ok ? '#6EE7B7' : '#FCA5A5'}`, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '0.85rem', fontWeight: 600, color: toast.ok ? '#065F46' : '#991B1B' }}>{toast.msg}</div>}

            {/* ── CIDADES ── */}
            <div style={SS}>
                <div style={ST}>📍 Cidades de Curso</div>
                <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '1rem' }}>Gerencie as cidades onde os cursos podem ocorrer. São usadas ao criar turmas e ações.</p>

                {/* Formulário */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'flex-end' }}>
                    <div style={{ flex: '2 1 180px' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nome da Cidade *</div>
                        <input style={{ ...INP, width: '100%', boxSizing: 'border-box' }} placeholder="Ex: São Luís" value={cityForm.name} onChange={e => setCityForm(f => ({ ...f, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addCity()} />
                    </div>
                    <div style={{ flex: '1 1 100px' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Estado *</div>
                        <input
                            style={{ ...INP, width: '100%', boxSizing: 'border-box', textTransform: 'uppercase' }}
                            maxLength={2}
                            placeholder="UF"
                            value={cityForm.state}
                            onChange={e => setCityForm(f => ({ ...f, state: e.target.value.toUpperCase() }))}
                        />
                    </div>
                    <div style={{ flex: '1 1 120px' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Código IBGE</div>
                        <input style={{ ...INP, width: '100%', boxSizing: 'border-box' }} placeholder="Opcional" value={cityForm.ibgeCode} onChange={e => setCityForm(f => ({ ...f, ibgeCode: e.target.value }))} />
                    </div>
                    <button onClick={addCity} disabled={cityAdding || !cityForm.name.trim()} style={{ padding: '0.55rem 1.1rem', borderRadius: 9, border: 'none', background: cityForm.name.trim() ? '#FFD600' : '#E5E7EB', color: cityForm.name.trim() ? '#111' : '#9CA3AF', fontWeight: 700, fontSize: '0.8rem', cursor: cityForm.name.trim() ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap', boxShadow: cityForm.name.trim() ? '0 2px 8px rgba(255,214,0,0.35)' : 'none', transition: 'all 0.2s' }}>
                        {cityAdding ? '...' : '+ Adicionar'}
                    </button>
                </div>

                {/* Lista */}
                {cityLoading ? <div style={{ color: '#9CA3AF', fontSize: '0.82rem' }}>Carregando...</div> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                        {cities.length === 0 && <div style={{ color: '#9CA3AF', fontSize: '0.8rem', gridColumn: '1/-1' }}>Nenhuma cidade cadastrada ainda.</div>}
                        {cities.map((c: any) => (
                            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.85rem', borderRadius: 9, background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: '0.8rem' }}>
                                <span><strong>{c.name}</strong> <span style={{ color: '#9CA3AF', fontSize: '0.72rem' }}>— {c.state}{c.ibgeCode ? ` · ${c.ibgeCode}` : ''}</span></span>
                                <button onClick={() => deleteCity(c.id, c.name)} title="Excluir" style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: '1rem', lineHeight: 1 }}>✕</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── GRUPOS / FROTAS ── */}
            <div style={SS}>
                <div style={ST}>🚛 Grupos / Frotas</div>
                <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '1rem' }}>Agrupe carretas por região ou finalidade. Um grupo é usado ao criar turmas e ações operacionais.</p>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'flex-end' }}>
                    <div style={{ flex: '2 1 180px' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nome do Grupo *</div>
                        <input style={{ ...INP, width: '100%', boxSizing: 'border-box' }} placeholder="Ex: Frota MA Norte" value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addGroup()} />
                    </div>
                    <div style={{ flex: '1 1 100px' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Estado *</div>
                        <input
                            style={{ ...INP, width: '100%', boxSizing: 'border-box', textTransform: 'uppercase' }}
                            maxLength={2}
                            placeholder="UF"
                            value={groupForm.state}
                            onChange={e => setGroupForm(f => ({ ...f, state: e.target.value.toUpperCase() }))}
                        />
                    </div>
                    <button onClick={addGroup} disabled={groupAdding || !groupForm.name.trim()} style={{ padding: '0.55rem 1.1rem', borderRadius: 9, border: 'none', background: groupForm.name.trim() ? '#FFD600' : '#E5E7EB', color: groupForm.name.trim() ? '#111' : '#9CA3AF', fontWeight: 700, fontSize: '0.8rem', cursor: groupForm.name.trim() ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap', boxShadow: groupForm.name.trim() ? '0 2px 8px rgba(255,214,0,0.35)' : 'none', transition: 'all 0.2s' }}>
                        {groupAdding ? '...' : '+ Criar Grupo'}
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                    {groups.length === 0 && <div style={{ color: '#9CA3AF', fontSize: '0.8rem', gridColumn: '1/-1' }}>Nenhum grupo cadastrado ainda.</div>}
                    {groups.map((g: any) => (
                        <div key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.85rem', borderRadius: 9, background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: '0.8rem' }}>
                            <span><strong>{g.name}</strong> <span style={{ color: '#9CA3AF', fontSize: '0.72rem' }}>— {g.state} · {g._count?.trucks ?? g.trucks?.length ?? 0} carretas</span></span>
                            <button onClick={() => deleteGroup(g.id, g.name)} title="Excluir" style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: '1rem', lineHeight: 1 }}>✕</button>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── ROTAS DE VIAGEM ── */}
            <div style={SS}>
                <div style={ST}>🗺️ Rotas de Viagem</div>
                <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '1rem' }}>Crie rotas personalizadas para as carretas. Origem e destino são as cidades cadastradas acima.</p>

                {/* Nova rota */}
                <div style={{ background: '#FFFDE7', borderRadius: 12, border: '1px solid #FEF08A', padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#B89B00', letterSpacing: '0.1em', marginBottom: 10 }}>➕ NOVA ROTA</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                        <div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Carreta *</div>
                            <select style={{ ...SEL, width: '100%' }} value={tripForm.truckId} onChange={e => setTripForm(f => ({ ...f, truckId: e.target.value }))}>
                                <option value="">Selecionar...</option>
                                {trucks.map((t: any) => <option key={t.id} value={t.id}>{t.identifier} — {t.licensePlate}</option>)}
                            </select>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cidade Origem *</div>
                            <select style={{ ...SEL, width: '100%' }} value={tripForm.originCityId} onChange={e => setTripForm(f => ({ ...f, originCityId: e.target.value }))}>
                                <option value="">Selecionar...</option>
                                {cities.map((c: any) => <option key={c.id} value={c.id}>{c.name} — {c.state}</option>)}
                            </select>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cidade Destino *</div>
                            <select style={{ ...SEL, width: '100%' }} value={tripForm.destinationCityId} onChange={e => setTripForm(f => ({ ...f, destinationCityId: e.target.value }))}>
                                <option value="">Selecionar...</option>
                                {cities.filter(c => c.id !== tripForm.originCityId).map((c: any) => <option key={c.id} value={c.id}>{c.name} — {c.state}</option>)}
                            </select>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Saída *</div>
                            <input type="datetime-local" style={{ ...INP, width: '100%', boxSizing: 'border-box' }} value={tripForm.departureDate} onChange={e => setTripForm(f => ({ ...f, departureDate: e.target.value }))} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Chegada Prevista</div>
                            <input type="datetime-local" style={{ ...INP, width: '100%', boxSizing: 'border-box' }} value={tripForm.expectedArrivalDate} onChange={e => setTripForm(f => ({ ...f, expectedArrivalDate: e.target.value }))} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Motorista *</div>
                            <input style={{ ...INP, width: '100%', boxSizing: 'border-box' }} placeholder="Nome do motorista" value={tripForm.driverName} onChange={e => setTripForm(f => ({ ...f, driverName: e.target.value }))} />
                        </div>
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={addTrip} disabled={tripAdding} style={{ padding: '0.6rem 1.4rem', borderRadius: 10, border: 'none', background: '#FFD600', color: '#111', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(255,214,0,0.4)', fontFamily: 'Orbitron' }}>
                            {tripAdding ? '⏳ Criando...' : '⚡ Criar Rota'}
                        </button>
                    </div>
                </div>

                {/* Histórico */}
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#6B7280', letterSpacing: '0.1em', marginBottom: 8 }}>HISTÓRICO DE ROTAS ({trips.length})</div>
                {tripsLoading ? <div style={{ color: '#9CA3AF', fontSize: '0.82rem' }}>Carregando...</div> : (
                    <div style={{ overflowX: 'auto' }}>
                        {trips.length === 0 && <div style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>Nenhuma rota cadastrada ainda.</div>}
                        {trips.length > 0 && (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                                <thead>
                                    <tr style={{ background: '#F9FAFB' }}>
                                        {['Carreta', 'Origem → Destino', 'Motorista', 'Saída', 'Status', 'Comprovante'].map(h => (
                                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {trips.slice(0, 20).map((t: any) => {
                                        const st = TRIP_STATUS[t.status] || { label: t.status, color: '#6B7280' };
                                        return (
                                            <tr key={t.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                                <td style={{ padding: '8px 12px', fontWeight: 700 }}>{t.truck?.identifier || '—'}</td>
                                                <td style={{ padding: '8px 12px' }}>{t.originCity?.name || '?'} → {t.destinationCity?.name || '?'}</td>
                                                <td style={{ padding: '8px 12px', color: '#374151' }}>{t.driverName}</td>
                                                <td style={{ padding: '8px 12px', color: '#6B7280', whiteSpace: 'nowrap' }}>{t.departureDate ? new Date(t.departureDate).toLocaleDateString('pt-BR') : '—'}</td>
                                                <td style={{ padding: '8px 12px' }}>
                                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: st.color + '18', color: st.color, border: `1px solid ${st.color}40` }}>{st.label}</span>
                                                </td>
                                                <td style={{ padding: '8px 12px' }}>
                                                    {t.endOdometerPhotoUrl ? (
                                                        <a href={t.endOdometerPhotoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: '#EFF6FF', color: '#1D4ED8', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700, textDecoration: 'none', border: '1px solid #BFDBFE' }}>
                                                            📸 Ver Foto
                                                        </a>
                                                    ) : (
                                                        <span style={{ color: '#9CA3AF', fontSize: '0.65rem' }}>—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={loadTrips} style={{ padding: '4px 12px', borderRadius: 7, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>🔄 Atualizar</button>
                </div>
            </div>
        </div>
    );
}

const TABS = [

    { id: 'geral', label: 'Geral', icon: Cog6ToothIcon },
    { id: 'notificacoes', label: 'Notificações', icon: BellIcon },
    { id: 'whatsapp', label: 'WhatsApp', icon: ChatBubbleLeftRightIcon },
    { id: 'seguranca', label: 'Segurança', icon: ShieldCheckIcon },
    { id: 'sistema', label: 'Sistema', icon: GlobeAltIcon },
    { id: 'financeiro', label: 'Financeiro', icon: CurrencyDollarIcon },
    { id: 'dados', label: 'Dados', icon: DocumentArrowDownIcon },
    { id: 'operacional', label: 'Operacional', icon: MapPinIcon },
    { id: 'perfil', label: 'Meu Perfil', icon: UserCircleIcon },
];

export default function ConfiguracoesPage() {
    const { user: authUser, token, setUser: setAuthUser } = useAuthStore();
    const [tab, setTab] = useState('geral');
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [avatarHover, setAvatarHover] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /* 2FA state (S5-02) */
    const [twoFAStep, setTwoFAStep] = useState<'idle' | 'setup' | 'disabling' | 'active'>('idle');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [totpToken, setTotpToken] = useState('');
    const [twoFALoading, setTwoFALoading] = useState(false);
    const [twoFAError, setTwoFAError] = useState('');
    const [twoFADisableToken, setTwoFADisableToken] = useState('');
    const [quickExportLoading, setQuickExportLoading] = useState<QuickExportKey | null>(null);
    const [quickExportError, setQuickExportError] = useState<string | null>(null);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPhotoError(null);
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            setPhotoError('Imagem muito grande. Máximo permitido: 2 MB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = ev => setAvatarUrl(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    /* Settings state */
    const [cfg, setCfg] = useState({
        // Geral
        nomeSistema: 'Sistema Qualifica MA & PI',
        emailContato: 'contato@qualifica.ma.gov.br',
        logoUrl: '',
        fusoHorario: 'America/Fortaleza',
        idioma: 'pt-BR',
        // Notificações
        notifEmail: true,
        notifNovaInscricao: true,
        notifFrequenciaBaixa: true,
        notifCertificado: true,
        notifSistema: false,
        limiteFrequencia: '75',
        // Segurança
        sessaoTimeout: '480',
        doisFatores: false,
        logAcesso: true,
        senhaComplexidade: 'media',
        // Sistema
        manutencao: false,
        backupAuto: true,
        intervalBackup: 'diario',
        versaoApi: '1.0.0',
        modoDebug: false,
        // Dados
        periodoRetencao: '365',
        exportFormato: 'xlsx',
        // Financeiro (S3-00)
        valorPassagemViagem: '270',
        valorDiariaPadrao: '120',
        kmLimitePassagemSemanal: '200',
        diasUteisReferenciaMes: '22',
        percentualAlertaCusto: '110',
        // Perfil
        nomeAdmin: '',
        emailAdmin: '',
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const t = new URLSearchParams(window.location.search).get('tab');
        if (t === 'seguranca') setTab('seguranca');
    }, []);

    useEffect(() => {
        // Busca /users/me para garantir que o nome real do admin é exibido
        api.get('/users/me').then(res => {
            const u = res.data;
            setUser(u);
            setCfg(c => ({
                ...c,
                nomeAdmin: u.name || '',
                emailAdmin: u.email || '',
                doisFatores: Boolean(u.twoFactorEnabled),
            }));
        }).catch(() => {
            // BUG-07: fallback usa Zustand (auth-storage), não localStorage.getItem('user') que não existe
            if (authUser) {
                setUser(authUser);
                setCfg(c => ({ ...c, nomeAdmin: authUser.name || '', emailAdmin: authUser.email || '' }));
            }
        });
        // REQ-14: Carregar configurações salvas no backend
        api.get('/settings')
            .catch(() => ({ data: {} }))
            .then((r: any) => {                const data = r.data ?? {};
                setCfg(c => ({
                    ...c,
                    nomeSistema: data.nomeSistema ?? c.nomeSistema,
                    emailContato: data.emailContato ?? c.emailContato,
                    fusoHorario: data.fusoHorario ?? c.fusoHorario,
                    idioma: data.idioma ?? c.idioma,
                    notifEmail: data.notifEmail ?? c.notifEmail,
                    notifNovaInscricao: data.notifNovaInscricao ?? c.notifNovaInscricao,
                    notifFrequenciaBaixa: data.notifFrequenciaBaixa ?? c.notifFrequenciaBaixa,
                    notifCertificado: data.notifCertificado ?? c.notifCertificado,
                    notifSistema: data.notifSistema ?? c.notifSistema,
                    limiteFrequencia: String(data.limiteFrequencia ?? c.limiteFrequencia),
                    sessaoTimeout: String(data.sessaoTimeout ?? c.sessaoTimeout),
                    logAcesso: data.logAcesso ?? c.logAcesso,
                    senhaComplexidade: data.senhaComplexidade ?? c.senhaComplexidade,
                    manutencao: data.manutencao ?? c.manutencao,
                    backupAuto: data.backupAuto ?? c.backupAuto,
                    intervalBackup: data.intervalBackup ?? c.intervalBackup,
                    modoDebug: data.modoDebug ?? c.modoDebug,
                    periodoRetencao: String(data.periodoRetencao ?? c.periodoRetencao),
                    exportFormato: data.exportFormato ?? c.exportFormato,
                    // Financeiro (S3-00)
                    valorPassagemViagem: String(data.valorPassagemViagem ?? c.valorPassagemViagem),
                    valorDiariaPadrao: String(data.valorDiariaPadrao ?? c.valorDiariaPadrao),
                    kmLimitePassagemSemanal: String(data.kmLimitePassagemSemanal ?? c.kmLimitePassagemSemanal),
                    diasUteisReferenciaMes: String(data.diasUteisReferenciaMes ?? c.diasUteisReferenciaMes),
                    percentualAlertaCusto: String(data.percentualAlertaCusto ?? c.percentualAlertaCusto),
                }));
            })
            .finally(() => setSettingsLoaded(true)); // sempre libera o botão, mesmo se erro

        // PASSO 1.3: Carregar preferências pessoais do admin
        api.get('/users/me/preferences').then(r => {
            if (r.data) {
                setCfg(c => ({
                    ...c,
                    notifEmail: r.data.notifEmail,
                    notifCertificado: r.data.notifCertificado,
                    notifNovaInscricao: r.data.notifInscricao,
                    notifFrequenciaBaixa: r.data.notifFrequencia,
                }));
            }
        }).catch(() => { /* silencioso — usa defaults */ });
    }, []);

    const set = (k: string, v: any) => setCfg(c => ({ ...c, [k]: v }));

    const handleSave = async () => {
        setSaveError(false);
        try {
            const nomeTrim = cfg.nomeAdmin?.trim();
            const requests: Promise<unknown>[] = [
                api.put('/settings', {
                    nomeSistema: cfg.nomeSistema,
                    emailContato: cfg.emailContato,
                    fusoHorario: cfg.fusoHorario,
                    idioma: cfg.idioma,
                    notifEmail: cfg.notifEmail,
                    notifNovaInscricao: cfg.notifNovaInscricao,
                    notifFrequenciaBaixa: cfg.notifFrequenciaBaixa,
                    notifCertificado: cfg.notifCertificado,
                    notifSistema: cfg.notifSistema,
                    limiteFrequencia: cfg.limiteFrequencia,
                    sessaoTimeout: cfg.sessaoTimeout,
                    logAcesso: cfg.logAcesso,
                    senhaComplexidade: cfg.senhaComplexidade,
                    manutencao: cfg.manutencao,
                    backupAuto: cfg.backupAuto,
                    intervalBackup: cfg.intervalBackup,
                    modoDebug: cfg.modoDebug,
                    periodoRetencao: cfg.periodoRetencao,
                    exportFormato: cfg.exportFormato,
                    valorPassagemViagem: parseFloat(cfg.valorPassagemViagem),
                    valorDiariaPadrao: parseFloat(cfg.valorDiariaPadrao),
                    kmLimitePassagemSemanal: parseInt(cfg.kmLimitePassagemSemanal),
                    diasUteisReferenciaMes: parseInt(cfg.diasUteisReferenciaMes),
                    percentualAlertaCusto: parseFloat(cfg.percentualAlertaCusto),
                }),
                api.patch('/users/me/preferences', {
                    notifEmail: cfg.notifEmail,
                    notifCertificado: cfg.notifCertificado,
                    notifInscricao: cfg.notifNovaInscricao,
                    notifFrequencia: cfg.notifFrequenciaBaixa,
                }),
            ];
            if (nomeTrim) {
                requests.push(api.patch('/users/me', { name: nomeTrim }));
            }
            await Promise.all(requests);
            setSaved(true);
            // BUG-07: atualiza Zustand store (fonte real de auth) — localStorage.getItem('user') não existe
            if (authUser && token) {
                const updated = { ...authUser };
                if (cfg.nomeAdmin) updated.name = cfg.nomeAdmin;
                setAuthUser(updated, token);
            }
            window.dispatchEvent(new Event('userUpdated'));
            setTimeout(() => setSaved(false), 2800);
        } catch {
            setSaveError(true);
            setTimeout(() => setSaveError(false), 3500);
        }
    };

    const handleQuickExport = async (kind: QuickExportKey) => {
        setQuickExportError(null);
        if (cfg.exportFormato !== 'xlsx') {
            setQuickExportError('A Exportação Rápida está disponível em XLSX. Ajuste o formato para Excel e tente novamente.');
            return;
        }
        setQuickExportLoading(kind);
        try {
            await runAdminQuickExport(kind, api);
        } catch (e: any) {
            setQuickExportError(e?.response?.data?.message || e?.message || 'Falha ao gerar planilha.');
        } finally {
            setQuickExportLoading(null);
        }
    };


    const SECTION_STYLE: React.CSSProperties = {
        background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB',
        padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        marginBottom: '1rem',
    };

    const SECTION_TITLE: React.CSSProperties = {
        fontFamily: 'Orbitron', fontWeight: 800, fontSize: '0.7rem',
        letterSpacing: '0.12em', color: '#B89B00',
        textTransform: 'uppercase', marginBottom: '0.1rem',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }} className="animate-fade-in">

            <AdminHeaderHero
                title="CONFIGURAÇÕES"
                subtitle="Gerencie as preferências e configurações do sistema"
                rightSlot={(
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    {saved && (
                        <div className="animate-scale-in" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', borderRadius: 9, background: '#DCFCE7', border: '1px solid #BBF7D0', color: '#059669', fontSize: '0.78rem', fontWeight: 700 }}>
                            <CheckCircleIcon style={{ width: 14, height: 14 }} />
                            Salvo com sucesso!
                        </div>
                    )}
                    {saveError && (
                        <div className="animate-scale-in" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', borderRadius: 9, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.78rem', fontWeight: 700 }}>
                            <ExclamationTriangleIcon style={{ width: 14, height: 14 }} />
                            Erro ao salvar. Tente novamente.
                        </div>
                    )}
                    <button onClick={handleSave} className="btn-primary" disabled={!settingsLoaded}>
                        {!settingsLoaded ? 'Carregando...' : 'Salvar Alterações'}
                    </button>
                    </div>
                )}
            />
            <ConfiguracoesSidebarTutorial />

            {/* ── TABS ── */}
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', padding: '0.5rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                {TABS.map(t => {
                    const Icon = t.icon;
                    const active = tab === t.id;
                    return (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.45rem',
                                padding: '0.5rem 1rem', borderRadius: 10, border: 'none', cursor: 'pointer',
                                fontSize: '0.8rem', fontWeight: active ? 700 : 500,
                                background: active ? '#FFD600' : 'transparent',
                                color: active ? '#000' : '#6B7280',
                                transition: 'all 0.2s',
                                boxShadow: active ? '0 2px 8px rgba(255,214,0,0.3)' : 'none',
                            }}
                            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; }}
                            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                            <Icon style={{ width: 15, height: 15 }} />
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* ── TAB: GERAL ── */}
            {tab === 'geral' && (
                <div className="animate-fade-in">
                    <div style={SECTION_STYLE}>
                        <div style={SECTION_TITLE}>Identidade do Sistema</div>
                        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.75rem' }}>Informações básicas do programa exibidas aos usuários</p>
                        <SettingRow label="Nome do Sistema" desc="Exibido no topo do portal e nos certificados">
                            <InlineInput value={cfg.nomeSistema} onChange={v => set('nomeSistema', v)} placeholder="Nome..." width={260} />
                        </SettingRow>
                        <SettingRow label="E-mail de Contato" desc="Usado em notificações automáticas enviadas pelo sistema">
                            <InlineInput value={cfg.emailContato} onChange={v => set('emailContato', v)} type="email" placeholder="contato@..." width={220} />
                        </SettingRow>
                        <SettingRow label="Fuso Horário" desc="Horário padrão para registros, logs e notificações">
                            <InlineSelect value={cfg.fusoHorario} onChange={v => set('fusoHorario', v)} width={200} options={[
                                { label: 'Brasília (UTC-3)', value: 'America/Sao_Paulo' },
                                { label: 'Fortaleza (UTC-3)', value: 'America/Fortaleza' },
                                { label: 'Manaus (UTC-4)', value: 'America/Manaus' },
                            ]} />
                        </SettingRow>
                        <SettingRow label="Idioma" desc="Idioma padrão da interface">
                            <InlineSelect value={cfg.idioma} onChange={v => set('idioma', v)} width={180} options={[
                                { label: 'Português (BR)', value: 'pt-BR' },
                                { label: 'English', value: 'en-US' },
                            ]} />
                        </SettingRow>
                    </div>
                </div>
            )}

            {/* ── TAB: NOTIFICAÇÕES ── */}
            {tab === 'notificacoes' && (
                <div className="animate-fade-in">
                    <div style={SECTION_STYLE}>
                        <div style={SECTION_TITLE}>Canais de Notificação</div>
                        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.75rem' }}>Configure como e quando o sistema envia alertas</p>
                        <SettingRow label="Notificações por E-mail" desc="Ativar envio de e-mails automáticos do sistema">
                            <Toggle checked={cfg.notifEmail} onChange={v => set('notifEmail', v)} />
                        </SettingRow>
                        <SettingRow label="Nova Inscrição" desc="Alertar quando um aluno se inscreve em um curso">
                            <Toggle checked={cfg.notifNovaInscricao} onChange={v => set('notifNovaInscricao', v)} />
                        </SettingRow>
                        <SettingRow label="Frequência Baixa" desc="Alertar quando frequência do aluno cai abaixo do mínimo">
                            <Toggle checked={cfg.notifFrequenciaBaixa} onChange={v => set('notifFrequenciaBaixa', v)} />
                        </SettingRow>
                        <SettingRow label="Limite de Frequência (%)" desc="Percentual mínimo de presença antes do alerta">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <input type="range" min="50" max="100" value={cfg.limiteFrequencia}
                                    onChange={e => set('limiteFrequencia', e.target.value)}
                                    style={{ width: 120, accentColor: '#FFD600' }} />
                                <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1rem', color: '#B89B00', minWidth: 40, textAlign: 'right' }}>{cfg.limiteFrequencia}%</span>
                            </div>
                        </SettingRow>
                        <SettingRow label="Certificados Emitidos" desc="Notificar quando um certificado é gerado">
                            <Toggle checked={cfg.notifCertificado} onChange={v => set('notifCertificado', v)} />
                        </SettingRow>
                        <SettingRow label="Alertas do Sistema" desc="Notificações de manutenção, backups e erros críticos">
                            <Toggle checked={cfg.notifSistema} onChange={v => set('notifSistema', v)} />
                        </SettingRow>
                    </div>
                </div>
            )}

            {/* ── TAB: SEGURANÇA ── */}
            {tab === 'seguranca' && (
                <div className="animate-fade-in">
                    <div style={SECTION_STYLE}>
                        <div style={SECTION_TITLE}>Controle de Acesso</div>
                        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.75rem' }}>Regras de sessão e autenticação dos usuários</p>
                        <SettingRow label="Timeout de Sessão (min)" desc="Tempo de inatividade antes do logout automático">
                            <InlineSelect value={cfg.sessaoTimeout} onChange={v => set('sessaoTimeout', v)} width={180} options={[
                                { label: '30 minutos', value: '30' },
                                { label: '1 hora', value: '60' },
                                { label: '4 horas', value: '240' },
                                { label: '8 horas', value: '480' },
                                { label: 'Nunca', value: '0' },
                            ]} />
                        </SettingRow>
                        <SettingRow stack label="Autenticação em 2 Fatores" desc="Proteja sua conta com código TOTP (Google Authenticator)">
                            {/* Estado: idle — 2FA desativado */}
                            {twoFAStep === 'idle' && !cfg.doisFatores && (
                                <button
                                    onClick={async () => {
                                        setTwoFAError('');
                                        setTwoFALoading(true);
                                        try {
                                            const res = await api.post('/auth/2fa/generate');
                                            const qr = res.data?.qrCodeDataUrl || res.data?.qrCode || '';
                                            if (!qr) throw new Error('QR Code não retornado pelo servidor.');
                                            setQrCodeUrl(qr);
                                            setTwoFAStep('setup');
                                        } catch (e: any) {
                                            const status = e?.response?.status;
                                            if (status === 401 || status === 403) {
                                                setTwoFAError('Sessão expirada ou sem permissão. Faça login novamente.');
                                            } else {
                                                setTwoFAError(e?.response?.data?.message || e?.message || 'Erro ao gerar QR Code');
                                            }
                                        } finally {
                                            setTwoFALoading(false);
                                        }
                                    }}
                                    disabled={twoFALoading}
                                    style={{
                                        padding: '0.45rem 1.15rem', borderRadius: 10, border: '2px solid #0F172A',
                                        background: twoFALoading ? '#E5E7EB' : '#FFD600',
                                        color: twoFALoading ? '#9CA3AF' : '#000', fontWeight: 800, fontSize: '0.82rem',
                                        cursor: twoFALoading ? 'not-allowed' : 'pointer', transition: 'all 0.18s',
                                        boxShadow: twoFALoading ? 'none' : '0 4px 12px rgba(255,214,0,0.35)',
                                    }}
                                >
                                    {twoFALoading ? 'Gerando...' : '🔐 Ativar 2FA'}
                                </button>
                            )}
                            {twoFAStep === 'idle' && !cfg.doisFatores && twoFAError && (
                                <div style={{ fontSize: '0.72rem', color: '#EF4444', width: '100%', lineHeight: 1.45 }}>
                                    {twoFAError}
                                </div>
                            )}

                            {/* Estado: setup — Mostrar QR Code */}
                            {twoFAStep === 'setup' && (
                                <AuthenticatorSettingsTotpBlock
                                    variant="setup"
                                    qrCodeUrl={qrCodeUrl}
                                    value={totpToken}
                                    onChange={setTotpToken}
                                    error={twoFAError}
                                    onCancel={() => { setTwoFAStep('idle'); setTotpToken(''); setTwoFAError(''); }}
                                    onConfirm={async () => {
                                        setTwoFAError('');
                                        setTwoFALoading(true);
                                        try {
                                            await api.post('/auth/2fa/enable', { token: totpToken });
                                            setCfg(c => ({ ...c, doisFatores: true }));
                                            setTwoFAStep('active');
                                            setTotpToken('');
                                        } catch (e: any) {
                                            setTwoFAError(e?.response?.data?.message || 'Código inválido. Tente novamente.');
                                        } finally {
                                            setTwoFALoading(false);
                                        }
                                    }}
                                    loading={twoFALoading}
                                    confirmDisabled={totpToken.length !== 6}
                                />
                            )}

                            {/* Estado: active — 2FA ativado */}
                            {(twoFAStep === 'active' || (twoFAStep === 'idle' && cfg.doisFatores)) && (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        alignItems: 'flex-start',
                                        gap: '0.75rem',
                                        width: '100%',
                                        minWidth: 0,
                                    }}
                                >
                                    <span
                                        style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: 20,
                                            background: '#DCFCE7',
                                            color: '#059669',
                                            fontWeight: 700,
                                            fontSize: '0.8rem',
                                            border: '1px solid #BBF7D0',
                                            flexShrink: 0,
                                        }}
                                    >
                                        ✓ 2FA Ativo
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => { setTwoFAStep('disabling'); setTwoFAError(''); setTwoFADisableToken(''); }}
                                        style={{
                                            padding: '0.35rem 0.8rem',
                                            borderRadius: 8,
                                            border: '1px solid #FED7AA',
                                            background: '#FFF7ED',
                                            color: '#EA580C',
                                            fontWeight: 600,
                                            fontSize: '0.78rem',
                                            cursor: 'pointer',
                                            flex: '0 1 auto',
                                            minWidth: 0,
                                        }}
                                    >
                                        Desativar
                                    </button>
                                </div>
                            )}

                            {/* Estado: disabling — confirmar desativação */}
                            {twoFAStep === 'disabling' && (
                                <AuthenticatorSettingsTotpBlock
                                    variant="disabling"
                                    value={twoFADisableToken}
                                    onChange={setTwoFADisableToken}
                                    error={twoFAError}
                                    onCancel={() => { setTwoFAStep('idle'); setTwoFAError(''); setTwoFADisableToken(''); }}
                                    onConfirm={async () => {
                                        setTwoFAError('');
                                        setTwoFALoading(true);
                                        try {
                                            await api.post('/auth/2fa/disable', { token: twoFADisableToken });
                                            setCfg(c => ({ ...c, doisFatores: false }));
                                            setTwoFAStep('idle');
                                            setTwoFADisableToken('');
                                        } catch (e: any) {
                                            setTwoFAError(e?.response?.data?.message || 'Código inválido.');
                                        } finally {
                                            setTwoFALoading(false);
                                        }
                                    }}
                                    loading={twoFALoading}
                                    confirmDisabled={twoFADisableToken.length !== 6}
                                />
                            )}
                        </SettingRow>
                        <SettingRow label="Log de Acessos" desc="Registrar data, hora e IP de todos os logins">
                            <Toggle checked={cfg.logAcesso} onChange={v => set('logAcesso', v)} color="#059669" />
                        </SettingRow>
                        <SettingRow label="Complexidade de Senha" desc="Nível mínimo exigido para senhas de usuários">
                            <InlineSelect value={cfg.senhaComplexidade} onChange={v => set('senhaComplexidade', v)} width={180} options={[
                                { label: 'Baixa (mín. 6 chars)', value: 'baixa' },
                                { label: 'Média (mín. 8 chars + número)', value: 'media' },
                                { label: 'Alta (mín. 10 chars + especial)', value: 'alta' },
                            ]} />
                        </SettingRow>
                    </div>

                    <div style={SECTION_STYLE}>
                        <div style={SECTION_TITLE}>Alterar a sua senha</div>
                        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.75rem' }}>
                            A alteração é imediata e não depende do botão &quot;Salvar Alterações&quot; do topo.
                        </p>
                        <ChangePasswordSettingsPanel />
                    </div>

                    {/* Security alert */}
                    <div style={{ padding: '0.85rem 1.1rem', borderRadius: 12, background: '#FFF7ED', border: '1px solid #FED7AA', display: 'flex', gap: '0.7rem', alignItems: 'flex-start' }}>
                        <ExclamationTriangleIcon style={{ width: 18, height: 18, color: '#EA580C', flexShrink: 0, marginTop: 1 }} />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#C2410C', marginBottom: '0.2rem' }}>Última atividade suspeita</div>
                            <div style={{ fontSize: '0.72rem', color: '#9A3412' }}>Nenhum acesso suspeito detectado nos últimos 30 dias.</div>
                        </div>
                        <span style={{ marginLeft: 'auto', padding: '0.2rem 0.65rem', borderRadius: 100, background: '#DCFCE7', color: '#059669', fontSize: '0.65rem', fontWeight: 700, border: '1px solid #BBF7D0', flexShrink: 0 }}>Sistema Seguro</span>
                    </div>
                </div>
            )}

            {/* ── TAB: SISTEMA ── */}
            {tab === 'sistema' && (
                <div className="animate-fade-in">
                    <div style={SECTION_STYLE}>
                        <div style={SECTION_TITLE}>Operação do Sistema</div>
                        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.75rem' }}>Configurações de funcionamento do servidor e API</p>
                        <SettingRow label="Modo Manutenção" desc="Bloqueia acesso de alunos e exibe mensagem de indisponibilidade">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <Toggle checked={cfg.manutencao} onChange={v => set('manutencao', v)} color="#EA580C" />
                                {cfg.manutencao && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#EA580C' }}>ATIVO</span>}
                            </div>
                        </SettingRow>
                        <SettingRow label="Backup Automático" desc="Salvar cópia do banco de dados automaticamente">
                            <Toggle checked={cfg.backupAuto} onChange={v => set('backupAuto', v)} color="#059669" />
                        </SettingRow>
                        <SettingRow label="Intervalo de Backup" desc="Frequência pretendida (persistida em ficheiro — agendamento automático exige job/cron na infraestrutura)">
                            <InlineSelect value={cfg.intervalBackup} onChange={v => set('intervalBackup', v)} width={180} options={[
                                { label: 'Diário (00:00)', value: 'diario' },
                                { label: 'Semanal (Domingo)', value: 'semanal' },
                                { label: 'Quinzenal', value: 'quinzenal' },
                                { label: 'Mensal', value: 'mensal' },
                            ]} />
                        </SettingRow>
                        <SettingRow label="Modo Debug" desc="Ativar logs detalhados no console (apenas desenvolvimento)">
                            <Toggle checked={cfg.modoDebug} onChange={v => set('modoDebug', v)} color="#7C3AED" />
                        </SettingRow>
                    </div>

                </div>
            )}


            {/* ── TAB: FINANCEIRO ── */}
            {tab === 'financeiro' && (
                <div className="animate-fade-in">
                    <div style={SECTION_STYLE}>
                        <div style={SECTION_TITLE}>Parâmetros Financeiros</div>
                        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.75rem' }}>
                            Valores usados no cálculo de custo estimado de rotas. Alterações aplicadas imediatamente.
                        </p>
                        <SettingRow label="Valor da passagem por viagem (R$)" desc="Custo de cada viagem de instrutor CLT (ida e volta)">
                            <InlineInput value={cfg.valorPassagemViagem} onChange={v => set('valorPassagemViagem', v)} type="number" placeholder="270.00" width={140} />
                        </SettingRow>
                        <SettingRow label="Diária padrão do instrutor (R$)" desc="Sugerida automaticamente ao vincular instrutor sem dailyCost cadastrado">
                            <InlineInput value={cfg.valorDiariaPadrao} onChange={v => set('valorDiariaPadrao', v)} type="number" placeholder="120.00" width={140} />
                        </SettingRow>
                        <SettingRow label="Distância limite passagem semanal (km)" desc="≤ este valor = passagem semanal · acima = passagem quinzenal">
                            <InlineInput value={cfg.kmLimitePassagemSemanal} onChange={v => set('kmLimitePassagemSemanal', v)} type="number" placeholder="200" width={120} />
                        </SettingRow>
                        <SettingRow label="Dias úteis de referência / mês" desc="Base para cálculo de salário proporcional CLT (padrão: 22)">
                            <InlineInput value={cfg.diasUteisReferenciaMes} onChange={v => set('diasUteisReferenciaMes', v)} type="number" placeholder="22" width={100} />
                        </SettingRow>
                        <SettingRow label="Alerta de custo excessivo (%)" desc="Gera notificação quando custo real ultrapassar este percentual do estimado">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <input type="range" min="100" max="200" step="5" value={cfg.percentualAlertaCusto}
                                    onChange={e => set('percentualAlertaCusto', e.target.value)}
                                    style={{ width: 120, accentColor: '#FFD600' }} />
                                <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1rem', color: '#B89B00', minWidth: 52, textAlign: 'right' }}>{cfg.percentualAlertaCusto}%</span>
                            </div>
                        </SettingRow>
                    </div>

                    <div style={{ padding: '0.85rem 1.1rem', borderRadius: 12, background: '#FFFDE7', border: '1px solid #FEF08A', display: 'flex', gap: '0.7rem', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '1.1rem' }}>💡</span>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#B89B00', marginBottom: '0.2rem' }}>Como esses parâmetros funcionam</div>
                            <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                                O custo estimado de cada Período de Cursos é calculado usando esses valores.
                                Para instrutores CLT: <strong>diárias + salário proporcional + passagens</strong>.
                                Altere e clique em &quot;Salvar Alterações&quot; para aplicar.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB: DADOS ── */}
            {tab === 'dados' && (
                <div className="animate-fade-in">
                    <div style={SECTION_STYLE}>
                        <div style={SECTION_TITLE}>Retenção e Exportação</div>
                        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.75rem' }}>Controle como os dados são armazenados e exportados</p>
                        <SettingRow label="Retenção de Logs (dias)" desc="Após este prazo, logs antigos são removidos automaticamente">
                            <InlineSelect value={cfg.periodoRetencao} onChange={v => set('periodoRetencao', v)} width={180} options={[
                                { label: '90 dias', value: '90' },
                                { label: '180 dias', value: '180' },
                                { label: '1 ano', value: '365' },
                                { label: '2 anos', value: '730' },
                                { label: 'Nunca excluir', value: '0' },
                            ]} />
                        </SettingRow>
                        <SettingRow label="Formato de Exportação" desc="Formato padrão para download de relatórios e listas">
                            <InlineSelect value={cfg.exportFormato} onChange={v => set('exportFormato', v)} width={180} options={[
                                { label: 'Excel (.xlsx)', value: 'xlsx' },
                                { label: 'CSV (.csv)', value: 'csv' },
                                { label: 'PDF (.pdf)', value: 'pdf' },
                            ]} />
                        </SettingRow>
                    </div>

                    {/* Quick export actions */}
                    <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B89B00', marginBottom: '1rem' }}>Exportação Rápida</div>
                        {quickExportError && (
                            <div style={{ marginBottom: '0.8rem', padding: '0.55rem 0.8rem', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '0.75rem', fontWeight: 600 }}>
                                {quickExportError}
                            </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                            {[
                                { key: 'students', label: 'Lista de Alunos', desc: 'Todos os alunos cadastrados', color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD' },
                                { key: 'frequency', label: 'Relatório de Frequência', desc: 'Por turma e período', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
                                { key: 'certificates', label: 'Certificados Emitidos', desc: 'Histórico completo', color: '#B89B00', bg: '#FFFDE7', border: '#FEF08A' },
                                { key: 'courses-classes', label: 'Cursos e Turmas', desc: 'Catálogo do programa', color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
                                { key: 'enrollments', label: 'Inscrições', desc: 'Por período selecionado', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
                                { key: 'trucks', label: 'Frota de Carretas', desc: 'Dados de infraestrutura', color: '#374151', bg: '#F9FAFB', border: '#E5E7EB' },
                            ].map(item => (
                                <button key={item.label}
                                    onClick={() => handleQuickExport(item.key as QuickExportKey)}
                                    disabled={quickExportLoading !== null}
                                    style={{ padding: '0.75rem 1rem', borderRadius: 10, border: `1px solid ${item.border}`, background: item.bg, cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 16px ${item.color}22`; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                                >
                                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: item.color, marginBottom: '0.2rem' }}>{item.label}</div>
                                    <div style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{item.desc}</div>
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.65rem', fontWeight: 700, color: item.color, opacity: 0.75 }}>
                                        {quickExportLoading === item.key ? '⏳ Gerando arquivo...' : `↓ Exportar ${cfg.exportFormato.toUpperCase()}`}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}


            {/* ── TAB: OPERACIONAL ── */}
            {tab === 'operacional' && <TabOperacional />}

            {/* ── TAB: PERFIL ── */}

            {tab === 'perfil' && (
                <div className="animate-fade-in">
                    {/* Avatar card with photo upload */}
                    <div style={{ background: '#FFFDE7', borderRadius: 14, border: '1px solid #FEF08A', padding: '1.25rem 1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>

                        {/* Clickable avatar */}
                        <div style={{ position: 'relative', flexShrink: 0 }}
                            onMouseEnter={() => setAvatarHover(true)}
                            onMouseLeave={() => setAvatarHover(false)}
                        >
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    width: 80, height: 80, borderRadius: 20, overflow: 'hidden', cursor: 'pointer',
                                    background: avatarUrl ? 'transparent' : '#FFD600',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.4rem', color: '#000',
                                    border: `3px solid ${avatarHover ? '#FFD600' : '#FEF08A'}`,
                                    boxShadow: avatarHover ? '0 0 0 4px rgba(255,214,0,0.25)' : 'none',
                                    transition: 'all 0.2s',
                                    flexShrink: 0,
                                }}
                            >
                                {avatarUrl
                                    ? <img src={avatarUrl} alt="Foto de perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : (cfg.nomeAdmin || 'AD').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
                                }

                                {/* Hover overlay */}
                                {avatarHover && (
                                    <div style={{
                                        position: 'absolute', inset: 0, borderRadius: 17,
                                        background: 'rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center', gap: '0.2rem',
                                    }}>
                                        <CameraIcon style={{ width: 20, height: 20, color: '#fff' }} />
                                        <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#fff', letterSpacing: '0.06em' }}>ALTERAR</span>
                                    </div>
                                )}
                            </div>

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                style={{ display: 'none' }}
                                onChange={handlePhotoChange}
                            />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111827' }}>{cfg.nomeAdmin || 'Administrador'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#B89B00', fontWeight: 700, marginTop: '0.1rem' }}>{user?.role || 'ADMIN'}</div>
                            <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '0.1rem' }}>{cfg.emailAdmin || 'Sem e-mail'}</div>

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                                <button onClick={() => fileInputRef.current?.click()}
                                    style={{ padding: '0.38rem 0.85rem', borderRadius: 8, background: '#FFD600', border: 'none', color: '#000', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', transition: 'all 0.18s' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEF08A'}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FFD600'}
                                >
                                    <CameraIcon style={{ width: 13, height: 13 }} />
                                    {avatarUrl ? 'Trocar foto' : 'Adicionar foto'}
                                </button>
                                {avatarUrl && (
                                    <button onClick={() => { setAvatarUrl(null); setPhotoError(null); }}
                                        style={{ padding: '0.38rem 0.85rem', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.18s' }}
                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEE2E2'}
                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FEF2F2'}
                                    >Remover</button>
                                )}
                                <span style={{ fontSize: '0.68rem', color: '#9CA3AF', alignSelf: 'center' }}>PNG, JPG, WebP · max 2 MB</span>
                            </div>
                            {photoError && <p style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: 600, marginTop: '0.35rem' }}>{photoError}</p>}
                            <p style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: '0.45rem', maxWidth: 420, lineHeight: 1.45 }}>
                                A foto é apenas pré-visualização neste navegador; não existe upload persistente no servidor nesta versão.
                            </p>
                        </div>
                    </div>

                    <div style={SECTION_STYLE}>
                        <div style={SECTION_TITLE}>Dados Pessoais</div>
                        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.75rem' }}>Atualize seu nome e e-mail de acesso</p>
                        <SettingRow label="Nome completo" desc="Exibido no sistema e nos certificados">
                            <InlineInput value={cfg.nomeAdmin} onChange={v => set('nomeAdmin', v)} placeholder="Seu nome..." width={240} />
                        </SettingRow>
                        <SettingRow label="E-mail de acesso" desc="Identificador de login — alteração só por outro administrador na gestão de utilizadores">
                            <span style={{ fontSize: '0.82rem', color: '#374151', fontWeight: 600 }}>{cfg.emailAdmin || '—'}</span>
                        </SettingRow>
                    </div>
                </div>
            )}

            {/* ── TAB: WHATSAPP ── */}
            {tab === 'whatsapp' && (
                <div className="animate-fade-in">
                    <WhatsAppConfigPanel />
                </div>
            )}
        </div>
    );
}
