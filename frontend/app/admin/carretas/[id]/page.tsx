'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { trucksApi, Truck } from '@/lib/api/trucks';
import { groupsApi } from '@/lib/api/groups';
import {
    ArrowLeftIcon,
    WrenchScrewdriverIcon,
    CheckIcon,
} from '@heroicons/react/24/outline';

const STATUS_OPTIONS = [
    { value:'AVAILABLE',   label:'Disponível',  color:'#059669' },
    { value:'IN_USE',      label:'Em Uso',      color:'#D97706' },
    { value:'MAINTENANCE', label:'Manutenção',  color:'#DC2626' },
    { value:'INACTIVE',    label:'Inativo',     color:'#6B7280' },
];

const TYPE_OPTIONS = [
    { value:'STANDARD',   label:'Padrão (1 curso)' },
    { value:'MULTICOURSE', label:'Multicurso (múltiplos cursos)' },
];

const STATE_OPTIONS = [
    { value:'MA', label:'Maranhão (MA)' },
    { value:'PI', label:'Piauí (PI)' },
];

export default function CarretaEditPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [truck, setTruck] = useState<Truck | null>(null);
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const [form, setForm] = useState({
        identifier: '',
        licensePlate: '',
        type: 'STANDARD' as 'STANDARD' | 'MULTICOURSE',
        groupId: '',
        state: 'MA',
        capacity: 16,
        roomsCount: 1,
        status: 'AVAILABLE' as 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'INACTIVE',
        modelYear: '',
        lastMaintenanceDate: '',
        nextMaintenanceDate: '',
        equipmentList: '',
        notes: '',
    });

    useEffect(() => { load(); }, [id]);

    async function load() {
        setLoading(true);
        try {
            const [t, g] = await Promise.all([
                trucksApi.getOne(id),
                groupsApi.getAll().catch(() => []),
            ]);
            setTruck(t);
            setGroups(g);
            setForm({
                identifier: t.identifier,
                licensePlate: t.licensePlate,
                type: t.type,
                groupId: t.groupId,
                state: t.state,
                capacity: t.capacity,
                roomsCount: t.roomsCount,
                status: t.status,
                modelYear: t.modelYear || '',
                lastMaintenanceDate: t.lastMaintenanceDate ? t.lastMaintenanceDate.split('T')[0] : '',
                nextMaintenanceDate: t.nextMaintenanceDate ? t.nextMaintenanceDate.split('T')[0] : '',
                equipmentList: t.equipmentList || '',
                notes: t.notes || '',
            });
        } catch {
            router.replace('/admin/carretas');
        } finally {
            setLoading(false);
        }
    }

    function set(k: string, v: any) {
        setForm(f => ({ ...f, [k]: v }));
    }

    function showToast(msg: string, type: 'success' | 'error') {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!form.identifier.trim()) { setError('Identificador é obrigatório'); return; }
        if (!form.licensePlate.trim()) { setError('Placa é obrigatória'); return; }
        if (!form.groupId) { setError('Selecione um grupo'); return; }

        setSaving(true);
        setError('');
        try {
            await trucksApi.update(id, {
                ...form,
                capacity: Number(form.capacity),
                roomsCount: Number(form.roomsCount),
                lastMaintenanceDate: form.lastMaintenanceDate || undefined,
                nextMaintenanceDate: form.nextMaintenanceDate || undefined,
                modelYear: form.modelYear || undefined,
                equipmentList: form.equipmentList || undefined,
                notes: form.notes || undefined,
            });
            showToast('Carreta atualizada com sucesso!', 'success');
            setTimeout(() => router.replace('/admin/carretas'), 1500);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Erro ao salvar carreta');
        } finally {
            setSaving(false);
        }
    }

    if (loading) return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
            <div style={{ textAlign:'center' }}>
                <div className="spinner" style={{ margin:'0 auto 1rem' }} />
                <p style={{ fontFamily:'Orbitron', fontSize:'0.7rem', letterSpacing:'0.15em', color:'var(--text-muted)' }}>CARREGANDO...</p>
            </div>
        </div>
    );

    if (!truck) return null;

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }} className="animate-fade-in">
            {/* Toast */}
            {toast && (
                <div style={{
                    position:'fixed', top:20, right:20, zIndex:9999,
                    background: toast.type === 'success' ? '#059669' : '#DC2626',
                    color:'#fff', padding:'0.75rem 1.25rem', borderRadius:10,
                    fontWeight:600, fontSize:'0.85rem', boxShadow:'0 4px 20px rgba(0,0,0,0.3)',
                }}>
                    {toast.type === 'success' ? '✓ ' : '✕ '}{toast.msg}
                </div>
            )}

            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                    <Link href="/admin/carretas" style={{
                        display:'flex', alignItems:'center', justifyContent:'center',
                        width:36, height:36, borderRadius:9,
                        background:'rgba(255,214,0,0.08)', border:'1px solid rgba(255,214,0,0.3)',
                        color:'#B89B00', textDecoration:'none',
                    }}>
                        <ArrowLeftIcon style={{ width:16, height:16 }} />
                    </Link>
                    <div>
                        <h1 className="gradient-text" style={{ fontFamily:'Orbitron', fontSize:'1.75rem', fontWeight:900, letterSpacing:'0.08em' }}>
                            {truck.identifier}
                        </h1>
                        <p style={{ color:'var(--text-muted)', fontSize:'0.82rem', marginTop:'0.15rem' }}>
                            Editar dados da carreta · Placa: {truck.licensePlate}
                        </p>
                    </div>
                </div>
                <Link href={`/admin/carretas/${id}/manutencao`} style={{
                    display:'flex', alignItems:'center', gap:6,
                    padding:'0.55rem 1.1rem', borderRadius:10,
                    background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.3)',
                    color:'#DC2626', fontWeight:700, fontSize:'0.8rem', textDecoration:'none',
                }}>
                    <WrenchScrewdriverIcon style={{ width:14, height:14 }} />
                    Manutenção
                </Link>
            </div>

            {/* Form */}
            <form onSubmit={handleSave}>
                {error && (
                    <div style={{ padding:'0.75rem 1rem', borderRadius:10, background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', fontSize:'0.82rem', fontWeight:600, marginBottom:'1rem' }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* Seção 1: Identificação */}
                <div className="glass-card" style={{ padding:'1.5rem', marginBottom:'1rem' }}>
                    <h2 style={{ fontFamily:'Orbitron', fontWeight:800, fontSize:'0.8rem', letterSpacing:'0.1em', color:'#111827', marginBottom:'1.25rem' }}>
                        🚛 IDENTIFICAÇÃO
                    </h2>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'1rem' }}>
                        <div>
                            <label className="form-label">Identificador *</label>
                            <input className="form-input" value={form.identifier} onChange={e => set('identifier', e.target.value)} placeholder="Ex: UPG-MA-001" />
                        </div>
                        <div>
                            <label className="form-label">Placa *</label>
                            <input className="form-input" value={form.licensePlate} onChange={e => set('licensePlate', e.target.value.toUpperCase())} placeholder="ABC-1234" style={{ fontFamily:'JetBrains Mono' }} />
                        </div>
                        <div>
                            <label className="form-label">Ano do Modelo</label>
                            <input className="form-input" value={form.modelYear} onChange={e => set('modelYear', e.target.value)} placeholder="2024" maxLength={4} />
                        </div>
                    </div>
                </div>

                {/* Seção 2: Configuração */}
                <div className="glass-card" style={{ padding:'1.5rem', marginBottom:'1rem' }}>
                    <h2 style={{ fontFamily:'Orbitron', fontWeight:800, fontSize:'0.8rem', letterSpacing:'0.1em', color:'#111827', marginBottom:'1.25rem' }}>
                        ⚙️ CONFIGURAÇÃO
                    </h2>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'1rem' }}>
                        <div>
                            <label className="form-label">Tipo *</label>
                            <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                                {TYPE_OPTIONS.map(opt => (
                                    <button key={opt.value} type="button" onClick={() => set('type', opt.value)}
                                        style={{
                                            padding:'0.55rem 0.85rem', borderRadius:9, cursor:'pointer', textAlign:'left',
                                            border:`1.5px solid ${form.type === opt.value ? '#FFD600' : '#E5E7EB'}`,
                                            background: form.type === opt.value ? 'rgba(255,214,0,0.1)' : 'transparent',
                                            color: form.type === opt.value ? '#B89B00' : '#374151',
                                            fontWeight:600, fontSize:'0.78rem', transition:'all 0.15s',
                                        }}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="form-label">Estado *</label>
                            <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                                {STATE_OPTIONS.map(opt => (
                                    <button key={opt.value} type="button" onClick={() => set('state', opt.value)}
                                        style={{
                                            padding:'0.55rem 0.85rem', borderRadius:9, cursor:'pointer', textAlign:'left',
                                            border:`1.5px solid ${form.state === opt.value ? '#FFD600' : '#E5E7EB'}`,
                                            background: form.state === opt.value ? 'rgba(255,214,0,0.1)' : 'transparent',
                                            color: form.state === opt.value ? '#B89B00' : '#374151',
                                            fontWeight:600, fontSize:'0.78rem', transition:'all 0.15s',
                                        }}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="form-label">Grupo *</label>
                            <select className="form-input" value={form.groupId} onChange={e => set('groupId', e.target.value)}>
                                <option value="">Selecione...</option>
                                {groups.map((g: any) => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Capacidade (vagas)</label>
                            <input className="form-input" type="number" min={1} max={50} value={form.capacity} onChange={e => set('capacity', e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Nº de Salas</label>
                            <input className="form-input" type="number" min={1} max={10} value={form.roomsCount} onChange={e => set('roomsCount', e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* Seção 3: Status */}
                <div className="glass-card" style={{ padding:'1.5rem', marginBottom:'1rem' }}>
                    <h2 style={{ fontFamily:'Orbitron', fontWeight:800, fontSize:'0.8rem', letterSpacing:'0.1em', color:'#111827', marginBottom:'1.25rem' }}>
                        📡 STATUS
                    </h2>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:'0.5rem' }}>
                        {STATUS_OPTIONS.map(opt => (
                            <button key={opt.value} type="button" onClick={() => set('status', opt.value)}
                                style={{
                                    padding:'0.65rem 1rem', borderRadius:10, cursor:'pointer',
                                    display:'flex', alignItems:'center', gap:'0.6rem',
                                    border:`1.5px solid ${form.status === opt.value ? opt.color : '#E5E7EB'}`,
                                    background: form.status === opt.value ? opt.color + '12' : 'transparent',
                                    transition:'all 0.15s',
                                }}>
                                <span style={{ width:10, height:10, borderRadius:'50%', background: opt.color, boxShadow: form.status === opt.value ? `0 0 8px ${opt.color}` : 'none' }} />
                                <span style={{ fontSize:'0.8rem', fontWeight:700, color: form.status === opt.value ? opt.color : '#374151' }}>
                                    {opt.label}
                                </span>
                                {form.status === opt.value && <CheckIcon style={{ width:14, height:14, color: opt.color, marginLeft:'auto' }} />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Seção 4: Manutenção e Notas */}
                <div className="glass-card" style={{ padding:'1.5rem', marginBottom:'1.5rem' }}>
                    <h2 style={{ fontFamily:'Orbitron', fontWeight:800, fontSize:'0.8rem', letterSpacing:'0.1em', color:'#111827', marginBottom:'1.25rem' }}>
                        🔧 MANUTENÇÃO & OBSERVAÇÕES
                    </h2>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'1rem' }}>
                        <div>
                            <label className="form-label">Última Manutenção</label>
                            <input type="date" className="form-input" value={form.lastMaintenanceDate} onChange={e => set('lastMaintenanceDate', e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Próxima Manutenção</label>
                            <input type="date" className="form-input" value={form.nextMaintenanceDate} onChange={e => set('nextMaintenanceDate', e.target.value)} />
                        </div>
                        <div style={{ gridColumn:'1 / -1' }}>
                            <label className="form-label">Lista de Equipamentos</label>
                            <textarea className="form-input" rows={2} value={form.equipmentList} onChange={e => set('equipmentList', e.target.value)} placeholder="Ex: Projetor, 16 cadeiras, 2 mesas..." style={{ resize:'vertical' }} />
                        </div>
                        <div style={{ gridColumn:'1 / -1' }}>
                            <label className="form-label">Observações</label>
                            <textarea className="form-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Notas internas sobre a carreta..." style={{ resize:'vertical' }} />
                        </div>
                    </div>
                </div>

                {/* Botões */}
                <div style={{ display:'flex', gap:'0.75rem' }}>
                    <Link href="/admin/carretas" style={{
                        flex:1, padding:'0.8rem', borderRadius:12, border:'1.5px solid #E5E7EB',
                        background:'transparent', color:'#6B7280', fontWeight:700, fontSize:'0.88rem',
                        textDecoration:'none', textAlign:'center',
                    }}>
                        Cancelar
                    </Link>
                    <button type="submit" disabled={saving} className="btn-primary"
                        style={{ flex:2, justifyContent:'center', opacity: saving ? 0.7 : 1 }}>
                        {saving
                            ? <><div className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> Salvando...</>
                            : '✓ Salvar Alterações'
                        }
                    </button>
                </div>
            </form>
        </div>
    );
}
