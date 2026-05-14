'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { trucksApi, Truck } from '@/lib/api/trucks';
import { groupsApi } from '@/lib/api/groups';
import api from '@/lib/api/client';
import {
    ArrowLeftIcon,
    WrenchScrewdriverIcon,
    CheckIcon,
} from '@heroicons/react/24/outline';
import { MovimentacaoModal } from '@/components/estoque/MovimentacaoModal';
import { EstoqueQuickActionsBar } from '@/components/estoque/EstoqueQuickActionsBar';
import { TruckStockSection } from '@/components/estoque/TruckStockSection';

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
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [movOpen, setMovOpen] = useState(false);

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
            const [t, g, sRes] = await Promise.all([
                trucksApi.getOne(id),
                groupsApi.getAll().catch(() => []),
                api.get(`/truck-maintenance/truck/${id}/stats`).catch(() => null)
            ]);
            setTruck(t);
            setGroups(g);
            setStats(sRes?.data || null);
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

    const classes = Array.isArray((truck as any).classes) ? (truck as any).classes : [];
    const trips = Array.isArray((truck as any).trips) ? (truck as any).trips : [];
    const expenses = Array.isArray((truck as any).expenses) ? (truck as any).expenses : [];
    const activeClasses = classes.filter((c: any) => ['ENROLLMENT_OPEN', 'ENROLLMENT_CLOSED', 'IN_PROGRESS'].includes(c.status)).length;
    const pendingTrips = trips.filter((t: any) => ['PLANNED', 'IN_TRANSIT'].includes(t.status)).length;
    const totalExpenses = expenses.reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0);

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
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={() => setMovOpen(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                            padding: '0.55rem 1.1rem', borderRadius: 10,
                            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.4)',
                            color: '#4338CA', fontWeight: 800, fontSize: '0.8rem',
                        }}>
                        ↔ Movimentar estoque
                    </button>
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
            </div>

            <MovimentacaoModal
                open={movOpen}
                onClose={() => setMovOpen(false)}
                defaultFromTruckId={id}
                defaultType="DEVOLUCAO"
                onSuccess={() => setMovOpen(false)}
            />

            {/* Form */}
            <form onSubmit={handleSave}>
                {error && (
                    <div style={{ padding:'0.75rem 1rem', borderRadius:10, background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', fontSize:'0.82rem', fontWeight:600, marginBottom:'1rem' }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* Contexto operacional completo */}
                <div className="glass-card" style={{ padding:'1.5rem', marginBottom:'1rem' }}>
                    <h2 style={{ fontFamily:'Orbitron', fontWeight:800, fontSize:'0.8rem', letterSpacing:'0.1em', color:'#111827', marginBottom:'1rem' }}>
                        📊 CONTEXTO OPERACIONAL
                    </h2>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:'0.75rem', marginBottom:'1rem' }}>
                        {[
                            { label: 'Turmas vinculadas', value: classes.length, color: '#2563EB', bg: '#EFF6FF' },
                            { label: 'Turmas ativas', value: activeClasses, color: '#059669', bg: '#F0FDF4' },
                            { label: 'Viagens pendentes', value: pendingTrips, color: '#D97706', bg: '#FFF7ED' },
                            { label: 'Custos recentes', value: `R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: '#7C3AED', bg: '#F5F3FF' },
                        ].map((item, i) => (
                            <div key={i} style={{ border: `1px solid ${item.color}33`, borderRadius: 10, padding: '0.75rem 0.9rem', background: item.bg }}>
                                <div style={{ fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: item.color }}>{item.label}</div>
                                <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.1rem', color: item.color, marginTop: 4 }}>{item.value}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                        <div style={{ border:'1px solid #E5E7EB', borderRadius:10, padding:'0.75rem' }}>
                            <div style={{ fontSize:'0.68rem', fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6B7280', marginBottom:8 }}>Últimas Turmas</div>
                            {classes.slice(0, 4).length === 0 ? (
                                <p style={{ color:'#9CA3AF', fontSize:'0.75rem' }}>Sem turmas vinculadas.</p>
                            ) : classes.slice(0, 4).map((c: any) => (
                                <div key={c.id} style={{ display:'flex', justifyContent:'space-between', gap:8, padding:'0.35rem 0', borderBottom:'1px dashed #F3F4F6' }}>
                                    <span style={{ fontSize:'0.78rem', color:'#111827', fontWeight:600 }}>{c.classIdentifier} · {c.course?.name || 'Curso'}</span>
                                    <span style={{ fontSize:'0.72rem', color:'#6B7280' }}>{c.status}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ border:'1px solid #E5E7EB', borderRadius:10, padding:'0.75rem' }}>
                            <div style={{ fontSize:'0.68rem', fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6B7280', marginBottom:8 }}>Últimas Viagens</div>
                            {trips.slice(0, 4).length === 0 ? (
                                <p style={{ color:'#9CA3AF', fontSize:'0.75rem' }}>Sem viagens registradas.</p>
                            ) : trips.slice(0, 4).map((t: any) => (
                                <div key={t.id} style={{ display:'flex', justifyContent:'space-between', gap:8, padding:'0.35rem 0', borderBottom:'1px dashed #F3F4F6' }}>
                                    <span style={{ fontSize:'0.78rem', color:'#111827', fontWeight:600 }}>
                                        {t.originCity?.name || 'Origem'} → {t.destinationCity?.name || 'Destino'}
                                    </span>
                                    <span style={{ fontSize:'0.72rem', color:'#6B7280' }}>{t.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

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

                    {(form.status === 'MAINTENANCE' || form.status === 'INACTIVE') && (!stats || (!stats.emAndamento && !stats.agendadas)) && (
                        <div style={{ marginTop: '1rem', padding: '1rem', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, background: '#FEF3C7', borderRadius: '50%', fontSize: '1.5rem', flexShrink: 0 }}>⚠️</div>
                            <div style={{ flex: 1, minWidth: 200 }}>
                                <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#D97706', fontFamily: 'Orbitron', fontWeight: 800 }}>Status {form.status === 'INACTIVE' ? 'Inativo' : 'Em Manutenção'}, mas nenhum registro ativo</h4>
                                <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: '#B45309', lineHeight: 1.4 }}>
                                    A carreta está com status indisponível, mas não possui nenhuma Ordem de Serviço em andamento ou agendada no Controle de Manutenção.
                                </p>
                            </div>
                            <Link href={`/admin/carretas/${id}/manutencao`} style={{ padding: '0.6rem 1.2rem', background: '#D97706', color: '#fff', borderRadius: 8, fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, boxShadow: '0 4px 12px rgba(217,119,6,.3)' }}>
                                <WrenchScrewdriverIcon style={{ width: 14, height: 14 }} /> Criar Registro
                            </Link>
                        </div>
                    )}
                </div>

                {/* Seção 4: Manutenção e Notas */}
                <div className="glass-card" style={{ padding:'1.5rem', marginBottom:'1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'1.25rem', flexWrap: 'wrap', gap: 10 }}>
                        <h2 style={{ fontFamily:'Orbitron', fontWeight:800, fontSize:'0.8rem', letterSpacing:'0.1em', color:'#111827', margin: 0 }}>
                            🔧 MANUTENÇÃO & OBSERVAÇÕES
                        </h2>
                        <Link href={`/admin/carretas/${id}/manutencao`} style={{ padding: '0.45rem 0.85rem', background: '#EFF6FF', color: '#1D4ED8', borderRadius: 8, fontSize: '0.7rem', fontWeight: 700, textDecoration: 'none', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', gap: 6 }}>
                            Controle Completo →
                        </Link>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'1rem' }}>
                        <div style={{ padding: '0.85rem', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.05em' }}>Última Manutenção (Concluída)</label>
                            <div style={{ fontWeight: 800, fontFamily: form.lastMaintenanceDate ? 'Orbitron' : 'inherit', color: form.lastMaintenanceDate ? '#111827' : '#9CA3AF', fontSize: '0.85rem', marginTop: 6 }}>
                                {form.lastMaintenanceDate ? new Date(form.lastMaintenanceDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem registros'}
                            </div>
                        </div>
                        <div style={{ padding: '0.85rem', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0' }}>
                            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '.05em' }}>Próxima Manutenção (Agendada)</label>
                            <div style={{ fontWeight: 800, fontFamily: form.nextMaintenanceDate ? 'Orbitron' : 'inherit', color: form.nextMaintenanceDate ? '#059669' : '#9CA3AF', fontSize: '0.85rem', marginTop: 6 }}>
                                {form.nextMaintenanceDate ? new Date(form.nextMaintenanceDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Não agendada'}
                            </div>
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

            {/* ── Itens em estoque NESTA carreta + vínculo com última ação consumidora ── */}
            <TruckStockSection truckId={id} truckIdentifier={truck?.identifier} />

            <EstoqueQuickActionsBar currentArea="carretas" />
        </div>
    );
}
