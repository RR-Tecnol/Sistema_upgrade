'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trucksApi, CreateTruckDto } from '@/lib/api/trucks';
import { groupsApi, Group } from '@/lib/api/groups';
import {
    TruckIcon,
    IdentificationIcon,
    WrenchScrewdriverIcon,
    DocumentTextIcon,
    ChevronLeftIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

type Step = 1 | 2 | 3;

const STEPS = [
    { n: 1 as Step, label: 'Identificação', icon: IdentificationIcon },
    { n: 2 as Step, label: 'Configuração', icon: WrenchScrewdriverIcon },
    { n: 3 as Step, label: 'Observações', icon: DocumentTextIcon },
];

const STATUS_OPTIONS = [
    { value: 'AVAILABLE', label: 'Disponível', color: '#059669', bg: '#DCFCE7', border: '#BBF7D0' },
    { value: 'IN_USE', label: 'Em Uso', color: '#0891B2', bg: '#E0F2FE', border: '#BAE6FD' },
    { value: 'MAINTENANCE', label: 'Manutenção', color: '#EA580C', bg: '#FEF3C7', border: '#FDE68A' },
    { value: 'INACTIVE', label: 'Inativo', color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
];

const INPUT_STYLE: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 0.9rem',
    borderRadius: 10,
    border: '1.5px solid #E5E7EB',
    background: '#F9FAFB',
    fontSize: '0.85rem',
    color: '#111827',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
};

const LABEL_STYLE: React.CSSProperties = {
    display: 'block',
    fontSize: '0.65rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#6B7280',
    marginBottom: '0.4rem',
};

function FormInput({ label, required, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean }) {
    const [focused, setFocused] = useState(false);
    return (
        <div>
            <label style={LABEL_STYLE}>{label}{required && <span style={{ color: '#FFD600', marginLeft: 3 }}>*</span>}</label>
            <input
                {...props}
                style={{ ...INPUT_STYLE, borderColor: focused ? '#FFD600' : '#E5E7EB', boxShadow: focused ? '0 0 0 3px rgba(255,214,0,0.15)' : 'none' }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
        </div>
    );
}

function FormSelect({ label, required, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; required?: boolean }) {
    const [focused, setFocused] = useState(false);
    return (
        <div>
            <label style={LABEL_STYLE}>{label}{required && <span style={{ color: '#FFD600', marginLeft: 3 }}>*</span>}</label>
            <select
                {...props}
                style={{ ...INPUT_STYLE, cursor: 'pointer', borderColor: focused ? '#FFD600' : '#E5E7EB', boxShadow: focused ? '0 0 0 3px rgba(255,214,0,0.15)' : 'none' }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            >
                {children}
            </select>
        </div>
    );
}

function FormTextarea({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
    const [focused, setFocused] = useState(false);
    return (
        <div>
            <label style={LABEL_STYLE}>{label}</label>
            <textarea
                {...props}
                style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 90, borderColor: focused ? '#FFD600' : '#E5E7EB', boxShadow: focused ? '0 0 0 3px rgba(255,214,0,0.15)' : 'none' }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
        </div>
    );
}

export default function NovaCarretaPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>(1);
    const [groups, setGroups] = useState<Group[]>([]);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    const [form, setForm] = useState<CreateTruckDto & { notes: string; equipmentList: string; lastMaintenanceDate: string; nextMaintenanceDate: string }>({
        identifier: '',
        licensePlate: '',
        type: 'STANDARD',
        groupId: '',
        state: 'MA',
        capacity: 30,
        roomsCount: 1,
        status: 'AVAILABLE',
        modelYear: new Date().getFullYear().toString(),
        notes: '',
        equipmentList: '',
        lastMaintenanceDate: '',
        nextMaintenanceDate: '',
    });

    useEffect(() => {
        groupsApi.getAll().then(setGroups).catch(() => { });
    }, []);

    const set = (field: string, value: any) => {
        setForm(f => ({ ...f, [field]: value }));
        setErrors(e => { const n = { ...e }; delete n[field]; return n; });
    };

    const validateStep1 = () => {
        const e: Record<string, string> = {};
        if (!form.identifier.trim()) e.identifier = 'Identificador obrigatório';
        if (!form.licensePlate.trim()) e.licensePlate = 'Placa obrigatória';
        else if (form.licensePlate.trim().length < 7) e.licensePlate = 'Placa deve ter ao menos 7 caracteres (ex: ABC-1234)';
        if (!form.groupId) e.groupId = 'Grupo obrigatório';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const validateStep2 = () => {
        const e: Record<string, string> = {};
        if (!form.capacity || form.capacity < 1) e.capacity = 'Capacidade inválida';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const nextStep = () => {
        if (step === 1 && !validateStep1()) return;
        if (step === 2 && !validateStep2()) return;
        setStep(s => (s < 3 ? (s + 1) as Step : s));
    };

    const handleSubmit = async () => {
        setSubmitError(null);
        setSaving(true);
        try {
            const payload: CreateTruckDto = {
                identifier: form.identifier,
                licensePlate: form.licensePlate,
                type: form.type,
                groupId: form.groupId,
                state: form.state,
                capacity: Number(form.capacity),
                roomsCount: Number(form.roomsCount),
                status: form.status as any,
                modelYear: form.modelYear || undefined,
                notes: form.notes || undefined,
                equipmentList: form.equipmentList || undefined,
                lastMaintenanceDate: form.lastMaintenanceDate || undefined,
                nextMaintenanceDate: form.nextMaintenanceDate || undefined,
            };

            await trucksApi.create(payload);
            setSuccess(true);
            setTimeout(() => router.push('/admin/carretas'), 1800);
        } catch (err: any) {
            const msg =
                err?.response?.data?.message ||
                (Array.isArray(err?.response?.data?.message)
                    ? err.response.data.message.join('; ')
                    : null) ||
                err?.message ||
                'Erro ao cadastrar carreta. Verifique os dados e tente novamente.';
            setSubmitError(Array.isArray(msg) ? msg.join('; ') : msg);
        } finally {
            setSaving(false);
        }
    };

    const selectedGroup = groups.find(g => g.id === form.groupId);

    /* ── SUCCESS ── */
    if (success) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div className="animate-scale-in" style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#DCFCE7', border: '2px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                    <CheckCircleIcon style={{ width: 36, height: 36, color: '#059669' }} />
                </div>
                <h2 style={{ fontFamily: 'Orbitron', fontSize: '1.1rem', fontWeight: 900, color: '#111827', marginBottom: '0.5rem' }}>CARRETA CADASTRADA!</h2>
                <p style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>Redirecionando para a frota...</p>
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 780, margin: '0 auto' }} className="animate-fade-in">

            {/* ── HEADER ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Link href="/admin/carretas"
                    style={{ width: 36, height: 36, borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', transition: 'all 0.18s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FFFDE7'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                >
                    <ChevronLeftIcon style={{ width: 16, height: 16, color: '#6B7280' }} />
                </Link>
                <div>
                    <h1 className="gradient-text" style={{ fontFamily: 'Orbitron', fontSize: '1.6rem', fontWeight: 900, letterSpacing: '0.08em' }}>NOVA CARRETA</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>Cadastre uma nova unidade móvel na frota</p>
                </div>
            </div>

            {/* ── STEP PROGRESS ── */}
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', padding: '1rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '0' }}>
                {STEPS.map((s, i) => {
                    const active = step === s.n;
                    const done = step > s.n;
                    const Icon = s.icon;
                    return (
                        <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1 }}>
                                <div style={{
                                    width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.3s',
                                    background: done ? '#059669' : active ? '#FFD600' : '#F3F4F6',
                                    border: `2px solid ${done ? '#059669' : active ? '#FFD600' : '#E5E7EB'}`,
                                }}>
                                    {done
                                        ? <CheckCircleIcon style={{ width: 16, height: 16, color: '#fff' }} />
                                        : <Icon style={{ width: 16, height: 16, color: active ? '#000' : '#9CA3AF' }} />
                                    }
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: active ? '#B89B00' : done ? '#059669' : '#9CA3AF' }}>
                                        Etapa {s.n}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: active ? '#111827' : done ? '#374151' : '#9CA3AF' }}>{s.label}</div>
                                </div>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div style={{ flex: 1, height: 2, background: done ? '#059669' : '#E5E7EB', borderRadius: 2, margin: '0 0.75rem', transition: 'background 0.3s' }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── FORM CARD ── */}
            <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                {/* Section header */}
                <div style={{ padding: '0.9rem 1.5rem', background: '#FFFDE7', borderBottom: '2px solid #FEF08A', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {(() => {
                        const s = STEPS[step - 1];
                        const Icon = s.icon;
                        return <>
                            <Icon style={{ width: 16, height: 16, color: '#B89B00' }} />
                            <span style={{ fontFamily: 'Orbitron', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.08em', color: '#B89B00' }}>
                                {STEPS[step - 1].label.toUpperCase()}
                            </span>
                        </>;
                    })()}
                </div>

                <div style={{ padding: '1.5rem' }}>
                    {/* ── STEP 1: IDENTIFICAÇÃO ── */}
                    {step === 1 && (
                        <div style={{ display: 'grid', gap: '1.1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <FormInput
                                        label="Identificador"
                                        required
                                        placeholder="Ex: Carreta 01 MA"
                                        value={form.identifier}
                                        onChange={e => set('identifier', e.target.value)}
                                    />
                                    {errors.identifier && <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: '0.25rem' }}>{errors.identifier}</p>}
                                </div>
                                <div>
                                    <FormInput
                                        label="Placa"
                                        required
                                        placeholder="ABC-1234"
                                        value={form.licensePlate}
                                        onChange={e => set('licensePlate', e.target.value.toUpperCase())}
                                        maxLength={8}
                                        style={{ ...INPUT_STYLE, fontFamily: 'JetBrains Mono', letterSpacing: '0.12em' }}
                                    />
                                    {errors.licensePlate && <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: '0.25rem' }}>{errors.licensePlate}</p>}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <FormSelect label="Grupo" required value={form.groupId} onChange={e => { set('groupId', e.target.value); const g = groups.find(g => g.id === e.target.value); if (g) set('state', g.state); }}>
                                        <option value="">Selecione o grupo...</option>
                                        {groups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name} — {g.state}</option>
                                        ))}
                                    </FormSelect>
                                    {errors.groupId && <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: '0.25rem' }}>{errors.groupId}</p>}
                                </div>
                                <FormSelect label="Estado" required value={form.state} onChange={e => set('state', e.target.value)}>
                                    <option value="MA">Maranhão (MA)</option>
                                    <option value="PI">Piauí (PI)</option>
                                </FormSelect>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <FormSelect label="Tipo de Carreta" required value={form.type} onChange={e => set('type', e.target.value)}>
                                    <option value="STANDARD">Padrão</option>
                                    <option value="MULTICOURSE">Multicurso</option>
                                </FormSelect>
                                <FormInput
                                    label="Ano do Modelo"
                                    type="number"
                                    min="2000"
                                    max="2030"
                                    value={form.modelYear}
                                    onChange={e => set('modelYear', e.target.value)}
                                    placeholder="Ex: 2024"
                                />
                            </div>

                            {/* Preview badge */}
                            {(form.identifier || form.licensePlate) && (
                                <div style={{ padding: '0.85rem 1rem', borderRadius: 10, background: '#F9FAFB', border: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFFDE7', border: '1.5px solid #FEF08A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <TruckIcon style={{ width: 17, height: 17, color: '#B89B00' }} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>{form.identifier || '—'}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono' }}>
                                            {form.licensePlate || 'Placa'} · {selectedGroup?.name || 'Grupo'} · {form.state} · {form.type === 'MULTICOURSE' ? 'Multicurso' : 'Padrão'}
                                        </div>
                                    </div>
                                    <span style={{ marginLeft: 'auto', padding: '0.2rem 0.6rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, background: '#F0F9FF', color: '#0891B2', border: '1px solid #BAE6FD' }}>Preview</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── STEP 2: CONFIGURAÇÃO ── */}
                    {step === 2 && (
                        <div style={{ display: 'grid', gap: '1.1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <FormInput
                                        label="Capacidade (pessoas)"
                                        required
                                        type="number"
                                        min="1"
                                        max="200"
                                        value={form.capacity}
                                        onChange={e => set('capacity', Number(e.target.value))}
                                    />
                                    {errors.capacity && <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: '0.25rem' }}>{errors.capacity}</p>}
                                </div>
                                <FormInput
                                    label="Número de Salas"
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={form.roomsCount}
                                    onChange={e => set('roomsCount', Number(e.target.value))}
                                />
                            </div>

                            {/* Status selector — visually rich */}
                            <div>
                                <label style={LABEL_STYLE}>Status Inicial<span style={{ color: '#FFD600', marginLeft: 3 }}>*</span></label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
                                    {STATUS_OPTIONS.map(s => (
                                        <button key={s.value} type="button"
                                            onClick={() => set('status', s.value)}
                                            style={{
                                                padding: '0.65rem 0.85rem', borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s',
                                                background: form.status === s.value ? s.bg : '#F9FAFB',
                                                border: `1.5px solid ${form.status === s.value ? s.border : '#E5E7EB'}`,
                                                display: 'flex', alignItems: 'center', gap: '0.6rem',
                                            }}>
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: form.status === s.value ? s.color : '#D1D5DB', flexShrink: 0 }} />
                                            <span style={{ fontSize: '0.8rem', fontWeight: form.status === s.value ? 700 : 500, color: form.status === s.value ? s.color : '#6B7280' }}>{s.label}</span>
                                            {form.status === s.value && <CheckCircleIcon style={{ width: 14, height: 14, color: s.color, marginLeft: 'auto' }} />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <FormInput
                                    label="Última Manutenção"
                                    type="date"
                                    value={form.lastMaintenanceDate}
                                    onChange={e => set('lastMaintenanceDate', e.target.value)}
                                />
                                <FormInput
                                    label="Próxima Manutenção"
                                    type="date"
                                    value={form.nextMaintenanceDate}
                                    onChange={e => set('nextMaintenanceDate', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* ── STEP 3: OBSERVAÇÕES ── */}
                    {step === 3 && (
                        <div style={{ display: 'grid', gap: '1.1rem' }}>
                            <FormTextarea
                                label="Lista de Equipamentos"
                                placeholder="Liste os equipamentos presentes na carreta (um por linha ou separados por vírgula)..."
                                value={form.equipmentList}
                                onChange={e => set('equipmentList', (e.target as HTMLTextAreaElement).value)}
                                rows={4}
                            />
                            <FormTextarea
                                label="Observações Gerais"
                                placeholder="Informações adicionais sobre a carreta, condições, particularidades..."
                                value={form.notes}
                                onChange={e => set('notes', (e.target as HTMLTextAreaElement).value)}
                                rows={4}
                            />

                            {/* Summary review */}
                            <div style={{ padding: '1rem 1.25rem', borderRadius: 12, background: '#FFFDE7', border: '1px solid #FEF08A' }}>
                                <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B89B00', marginBottom: '0.75rem' }}>Resumo do Cadastro</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
                                    {[
                                        ['Identificador', form.identifier],
                                        ['Placa', form.licensePlate],
                                        ['Grupo', selectedGroup?.name || '—'],
                                        ['Estado', form.state],
                                        ['Tipo', form.type === 'MULTICOURSE' ? 'Multicurso' : 'Padrão'],
                                        ['Capacidade', `${form.capacity} pessoas`],
                                        ['Salas', String(form.roomsCount)],
                                        ['Status', STATUS_OPTIONS.find(s => s.value === form.status)?.label || '—'],
                                    ].map(([k, v]) => (
                                        <div key={k} style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                                            <span style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 700, minWidth: 80 }}>{k}</span>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── ERROR BANNER ── */}
                {submitError && (
                    <div style={{ margin: '0 1.5rem 1rem', padding: '0.75rem 1rem', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                        <span style={{ color: '#DC2626', fontSize: '1rem', flexShrink: 0 }}>✕</span>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#DC2626', marginBottom: '0.15rem' }}>Erro ao cadastrar</div>
                            <div style={{ fontSize: '0.75rem', color: '#991B1B' }}>{submitError}</div>
                        </div>
                        <button onClick={() => setSubmitError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: '1.1rem', lineHeight: 1 }}>×</button>
                    </div>
                )}

                {/* ── FOOTER ACTIONS ── */}
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFAFA' }}>
                    <button
                        onClick={() => step > 1 ? setStep(s => (s - 1) as Step) : router.push('/admin/carretas')}
                        style={{ padding: '0.6rem 1.25rem', borderRadius: 10, background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.18s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#E5E7EB'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#F3F4F6'}
                    >
                        {step === 1 ? 'Cancelar' : 'Voltar'}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {STEPS.map(s => (
                            <div key={s.n} style={{ width: s.n === step ? 20 : 7, height: 7, borderRadius: 4, background: s.n === step ? '#FFD600' : s.n < step ? '#059669' : '#E5E7EB', transition: 'all 0.3s' }} />
                        ))}
                    </div>

                    {step < 3 ? (
                        <button onClick={nextStep}
                            className="btn-primary"
                            style={{ minWidth: 120 }}>
                            Próxima Etapa
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="btn-primary"
                            style={{ minWidth: 140, opacity: saving ? 0.7 : 1 }}>
                            {saving ? 'Cadastrando...' : 'Cadastrar Carreta'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
