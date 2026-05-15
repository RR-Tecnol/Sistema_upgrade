'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PencilIcon, TrashIcon, CheckIcon, XMarkIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import {
    stockApi,
    StockBudget,
    CreateStockBudgetDto,
    StockItemCategory,
    StockCategory,
    resolveCategoria,
} from '@/lib/api/stock';
import { toast } from '@/components/ui/Toast';

const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const now = new Date();

interface VerbaPanelProps {
    userRole?: string;
    /** Chamado após criar uma verba — navega para Solicitações onde o card já estará */
    onVerbaCreated?: () => void;
}

interface FormState {
    categoriaEnum: StockItemCategory | '';
    customCategoryId: string;
    ano: number;
    mes: number;
    valorTeto: string;
    observacao: string;
}

const emptyForm = (): FormState => ({
    categoriaEnum: '',
    customCategoryId: '',
    ano: now.getFullYear(),
    mes: now.getMonth() + 1,
    valorTeto: '',
    observacao: '',
});

// ── Barra de consumo ──────────────────────────────────────────────
function ConsumoBar({ consumido, teto }: { consumido: number; teto: number }) {
    const pctReal = teto > 0 ? (consumido / teto) * 100 : 0;
    const pctBar = Math.min(pctReal, 100);
    const estourou = pctReal > 100;
    const barColor = pctReal >= 100 ? '#EF4444' : pctReal >= 90 ? '#EF4444' : pctReal >= 70 ? '#F59E0B' : '#10B981';
    const fmtBR = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return (
        <div style={{ minWidth: 160 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                <span style={{ color: barColor }}>{fmtBR(consumido)}</span>
                <span style={{ color: '#94A3B8' }}>de {fmtBR(teto)}</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: '#E2E8F0', overflow: 'hidden' }}>
                <div style={{
                    height: '100%',
                    width: `${pctBar}%`,
                    background: barColor,
                    borderRadius: 99,
                    transition: 'width 0.4s ease',
                }} />
            </div>
            <p style={{ fontSize: '0.65rem', color: estourou ? '#EF4444' : '#94A3B8', marginTop: 3, fontWeight: estourou ? 700 : 400 }}>
                {pctReal.toFixed(0)}% utilizado{estourou ? ' (estourado)' : ''}
            </p>
        </div>
    );
}

// ── Picker de categoria (mesma UI do NovoInsumoWizard) ────────────
interface CategoryPickerProps {
    allCategories: StockCategory[];
    selectedEnum: StockItemCategory | '';
    selectedCustomId: string;
    onChange: (cat: StockCategory) => void;
}

function CategoryPicker({ allCategories, selectedEnum, selectedCustomId, onChange }: CategoryPickerProps) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
            {allCategories.map(c => {
                const isSelected = c.isDefault
                    ? (!selectedCustomId && selectedEnum === c.defaultEnum)
                    : selectedCustomId === c.id;
                const color = c.color;
                return (
                    <button
                        key={c.id}
                        type="button"
                        onClick={() => onChange(c)}
                        style={{
                            padding: '0.65rem 0.75rem',
                            borderRadius: 10,
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.18s',
                            background: isSelected ? `${color}12` : '#F9FAFB',
                            border: `1.5px solid ${isSelected ? color : '#E5E7EB'}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        <span style={{ fontSize: '1rem' }}>{c.icon}</span>
                        <span style={{
                            fontSize: '0.78rem',
                            fontWeight: isSelected ? 800 : 600,
                            color: isSelected ? color : '#6B7280',
                            flex: 1,
                        }}>
                            {c.nome}
                        </span>
                        {!c.isDefault && (
                            <span style={{
                                fontSize: '0.55rem', fontWeight: 700,
                                background: color, color: '#fff',
                                padding: '1px 5px', borderRadius: 6,
                                flexShrink: 0,
                            }}>
                                CUSTOM
                            </span>
                        )}
                        {isSelected && (
                            <span style={{ fontSize: '0.9rem', color, marginLeft: 'auto', flexShrink: 0 }}>✓</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export function VerbaPanel({ userRole, onVerbaCreated }: VerbaPanelProps) {
    const router = useRouter();
    const canWrite = ['ADMIN', 'IT_ADMIN'].includes(userRole ?? '');

    const [budgets, setBudgets] = useState<StockBudget[]>([]);
    const [allCategories, setAllCategories] = useState<StockCategory[]>([]);
    const [loading, setLoading] = useState(false);

    const [filterAno, setFilterAno] = useState(now.getFullYear());
    const [filterMes, setFilterMes] = useState(now.getMonth() + 1);

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm());
    const [saving, setSaving] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editVal, setEditVal] = useState('');
    const [editObs, setEditObs] = useState('');
    const [editSaving, setEditSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [data, cats] = await Promise.all([
                stockApi.budgets.list({ ano: filterAno, mes: filterMes }),
                allCategories.length === 0 ? stockApi.categories.list() : Promise.resolve(allCategories),
            ]);
            setBudgets(data);
            if (allCategories.length === 0) setAllCategories(cats);
        } catch {
            toast.error('Erro ao carregar verbas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [filterAno, filterMes]);

    // Resolve visual de uma categoria a partir de um budget
    const resolveCat = (b: StockBudget) => {
        const res = resolveCategoria(b);
        return { ...res, enumVal: b.categoriaEnum };
    };

    const handleCategorySelect = (cat: StockCategory) => {
        if (cat.isDefault) {
            setForm(f => ({ ...f, categoriaEnum: (cat.defaultEnum ?? 'OUTRO') as StockItemCategory, customCategoryId: '' }));
        } else {
            setForm(f => ({ ...f, categoriaEnum: '', customCategoryId: cat.id }));
        }
    };

    const handleCreate = async () => {
        if (!form.categoriaEnum && !form.customCategoryId) {
            toast.error('Selecione uma categoria');
            return;
        }
        const val = parseFloat(form.valorTeto);
        if (isNaN(val) || val <= 0) { toast.error('Informe um valor teto válido'); return; }
        setSaving(true);
        try {
            const dto: CreateStockBudgetDto = {
                ...(form.categoriaEnum ? { categoriaEnum: form.categoriaEnum } : {}),
                ...(form.customCategoryId ? { categoriaCustomId: form.customCategoryId } : {}),
                ano: form.ano,
                mes: form.mes,
                valorTeto: val,
                observacao: form.observacao || undefined,
            };
            await stockApi.budgets.create(dto);
            await load();
            setShowForm(false);
            setForm(emptyForm());
            toast.success('Verba criada! A solicitação foi gerada automaticamente em "Solicitações".');
            onVerbaCreated?.();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Erro ao criar verba');
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (b: StockBudget) => {
        setEditingId(b.id);
        setEditVal(String(Number(b.valorTeto)));
        setEditObs(b.observacao ?? '');
    };

    const saveEdit = async (b: StockBudget) => {
        const val = parseFloat(editVal);
        if (isNaN(val) || val <= 0) { toast.error('Valor inválido'); return; }
        setEditSaving(true);
        try {
            const updated = await stockApi.budgets.update(b.id, { valorTeto: val, observacao: editObs || undefined });
            setBudgets(prev => prev.map(x => x.id === b.id ? { ...x, valorTeto: updated.valorTeto } : x));
            setEditingId(null);
            toast.success('Verba atualizada');
        } catch {
            toast.error('Erro ao atualizar verba');
        } finally {
            setEditSaving(false);
        }
    };

    const confirmDelete = async (id: string) => {
        try {
            await stockApi.budgets.delete(id);
            setBudgets(prev => prev.filter(x => x.id !== id));
            setDeletingId(null);
            toast.success('Verba removida');
        } catch {
            toast.error('Erro ao remover verba');
        }
    };

    const goToSolicitacoes = (b: StockBudget) => {
        const cat = b.categoriaEnum ?? '';
        const params = new URLSearchParams({ tab: 'solicitacoes' });
        if (cat) params.set('categoria', cat);
        router.push(`/admin/estoque?${params.toString()}`);
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '9px 12px',
        borderRadius: 10,
        border: '1.5px solid #E2E8F0',
        background: '#FFFFFF',
        fontSize: '0.85rem',
        color: '#0F172A',
        fontWeight: 600,
        outline: 'none',
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '0.62rem',
        fontWeight: 800,
        color: '#B89B00',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        display: 'block',
        marginBottom: 4,
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Header ── */}
            <div style={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #FFFDF5 50%, #F8FAFC 100%)',
                borderRadius: 14,
                border: '1.5px solid #E5D88A55',
                boxShadow: '0 2px 12px rgba(184,155,0,0.06)',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
            }}>
                <div>
                    <p style={{ margin: 0, fontWeight: 800, color: '#0F172A', fontSize: '1rem' }}>
                        💰 Verbas Mensais por Categoria
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                        Teto de distribuição por categoria/mês. Transferências para as carretas consomem a verba automaticamente.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                        value={filterMes}
                        onChange={e => setFilterMes(Number(e.target.value))}
                        style={{ ...inputStyle, width: 130 }}
                    >
                        {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                    <select
                        value={filterAno}
                        onChange={e => setFilterAno(Number(e.target.value))}
                        style={{ ...inputStyle, width: 90 }}
                    >
                        {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    {canWrite && (
                        <button
                            onClick={() => { setShowForm(v => !v); setForm(emptyForm()); }}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '9px 18px', borderRadius: 10,
                                background: 'linear-gradient(135deg, #FFD600 0%, #E5B800 100%)',
                                color: '#0F172A', fontWeight: 800, fontSize: '0.8rem',
                                border: 'none', cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(255,214,0,0.3)',
                                fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.04em',
                            }}
                        >
                            + NOVA VERBA
                        </button>
                    )}
                </div>
            </div>

            {/* ── Formulário novo ── */}
            {showForm && canWrite && (
                <div style={{
                    background: '#FFFDF5',
                    borderRadius: 14,
                    border: '1.5px solid #FFD60060',
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                }}>
                    <p style={{ margin: 0, fontWeight: 800, color: '#B89B00', fontSize: '0.85rem', fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.05em' }}>
                        NOVA VERBA MENSAL
                    </p>

                    {/* Categoria — cards iguais ao wizard */}
                    <div>
                        <label style={labelStyle}>Categoria <span style={{ color: '#EF4444' }}>*</span></label>
                        <CategoryPicker
                            allCategories={allCategories}
                            selectedEnum={form.categoriaEnum}
                            selectedCustomId={form.customCategoryId}
                            onChange={handleCategorySelect}
                        />
                        {!form.categoriaEnum && !form.customCategoryId && (
                            <p style={{ fontSize: '0.7rem', color: '#EF4444', marginTop: 6, fontWeight: 600 }}>
                                Selecione uma categoria
                            </p>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                        <div>
                            <label style={labelStyle}>Mês</label>
                            <select value={form.mes} onChange={e => setForm(f => ({ ...f, mes: Number(e.target.value) }))} style={inputStyle}>
                                {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Ano</label>
                            <select value={form.ano} onChange={e => setForm(f => ({ ...f, ano: Number(e.target.value) }))} style={inputStyle}>
                                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Teto (R$) <span style={{ color: '#EF4444' }}>*</span></label>
                            <input
                                type="number" min="0.01" step="0.01" placeholder="Ex: 1500,00"
                                value={form.valorTeto}
                                onChange={e => setForm(f => ({ ...f, valorTeto: e.target.value }))}
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Observação (opcional)</label>
                            <input
                                type="text" placeholder="Nota sobre este teto..."
                                value={form.observacao}
                                onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={handleCreate}
                            disabled={saving}
                            style={{
                                padding: '9px 20px', borderRadius: 10,
                                background: saving ? '#E2E8F0' : '#10B981',
                                color: 'white', fontWeight: 700, border: 'none',
                                cursor: saving ? 'not-allowed' : 'pointer',
                                fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6,
                            }}
                        >
                            <CheckIcon width={15} height={15} />
                            {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                            onClick={() => setShowForm(false)}
                            style={{
                                padding: '9px 20px', borderRadius: 10,
                                background: 'white', border: '1.5px solid #E2E8F0',
                                color: '#64748B', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
                            }}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* ── Tabela ── */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⏳</div>
                    <p style={{ fontWeight: 600 }}>Carregando...</p>
                </div>
            ) : budgets.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '48px 0',
                    background: '#F8FAFC', borderRadius: 14, border: '1.5px dashed #E2E8F0',
                }}>
                    <div style={{ fontSize: '3rem', opacity: 0.4, marginBottom: 12 }}>💰</div>
                    <p style={{ color: '#64748B', fontWeight: 700, fontSize: '0.95rem' }}>
                        Nenhuma verba para {MESES[filterMes - 1]}/{filterAno}.
                    </p>
                    <p style={{ color: '#94A3B8', fontSize: '0.8rem', marginTop: 6 }}>
                        Sem verba definida, distribuições para as carretas são feitas sem limite de valor.
                    </p>
                </div>
            ) : (
                <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                            <tr>
                                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: 700, fontSize: '0.8rem' }}>Categoria</th>
                                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: 700, fontSize: '0.8rem' }}>Período</th>
                                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: 700, fontSize: '0.8rem', minWidth: 200 }}>Consumo / Teto</th>
                                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: 700, fontSize: '0.8rem' }}>Observação</th>
                                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: 700, fontSize: '0.8rem', textAlign: 'center' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {budgets.map((b, index) => {
                                const { icon, label, color } = resolveCat(b);
                                const isEditing = editingId === b.id;
                                const isDeleting = deletingId === b.id;
                                // Teto exibido = teto interno + PRs pré-verba (gastos da mesma cat/mês
                                // sem stockBudgetId que ocorreram antes desta verba). Edit form continua usando b.valorTeto puro.
                                const tetoInterno = Number(b.valorTeto);
                                const preVerba = Number(b.valorPreVerba ?? 0);
                                const teto = tetoInterno + preVerba;
                                const consumido = b.valorConsumido ?? 0;
                                const pct = teto > 0 ? (consumido / teto) * 100 : 0;
                                const estourou = pct > 100;

                                return (
                                    <tr
                                        key={b.id}
                                        style={{
                                            borderBottom: index === budgets.length - 1 ? 'none' : '1px solid #F1F5F9',
                                            backgroundColor: isDeleting ? 'rgba(239,68,68,0.04)' : estourou ? 'rgba(239,68,68,0.06)' : pct >= 90 ? 'rgba(239,68,68,0.03)' : 'transparent',
                                        }}
                                    >
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{
                                                padding: '4px 8px', borderRadius: 6,
                                                fontSize: '0.75rem', fontWeight: 700,
                                                backgroundColor: `${color}20`, color,
                                                border: `1px solid ${color}40`,
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {icon} {label}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 16px', color: '#64748B', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                            {MESES[b.mes - 1]}/{b.ano}
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            {isEditing ? (
                                                <input
                                                    type="number" min="0.01" step="0.01"
                                                    value={editVal}
                                                    onChange={e => setEditVal(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(b); if (e.key === 'Escape') setEditingId(null); }}
                                                    autoFocus
                                                    style={{
                                                        width: 110, padding: '4px 8px',
                                                        border: '2px solid #FFD600', borderRadius: 6,
                                                        fontSize: '0.85rem', fontWeight: 700,
                                                        textAlign: 'right', outline: 'none', color: '#0F172A',
                                                    }}
                                                />
                                            ) : (
                                                <ConsumoBar consumido={consumido} teto={teto} />
                                            )}
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            {isEditing ? (
                                                <input
                                                    type="text" value={editObs}
                                                    onChange={e => setEditObs(e.target.value)}
                                                    placeholder="Observação..."
                                                    style={{ width: '100%', padding: '4px 8px', border: '1.5px solid #E2E8F0', borderRadius: 6, fontSize: '0.8rem', outline: 'none' }}
                                                />
                                            ) : (
                                                <span style={{ color: '#64748B', fontSize: '0.8rem' }}>{b.observacao || '—'}</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                            {isDeleting ? (
                                                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.72rem', color: '#EF4444', fontWeight: 700 }}>Confirmar?</span>
                                                    <button onClick={() => confirmDelete(b.id)} style={{ background: '#EF4444', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: 'white', fontWeight: 700, fontSize: '0.72rem' }}>Sim</button>
                                                    <button onClick={() => setDeletingId(null)} style={{ background: '#E2E8F0', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#64748B', fontWeight: 700, fontSize: '0.72rem' }}>Não</button>
                                                </div>
                                            ) : isEditing ? (
                                                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                                    <button onClick={() => saveEdit(b)} disabled={editSaving} title="Salvar" style={{ background: '#10B981', border: 'none', borderRadius: 6, padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'white', opacity: editSaving ? 0.6 : 1 }}>
                                                        <CheckIcon width={14} height={14} />
                                                    </button>
                                                    <button onClick={() => setEditingId(null)} title="Cancelar" style={{ background: '#E2E8F0', border: 'none', borderRadius: 6, padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748B' }}>
                                                        <XMarkIcon width={14} height={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                                    {/* Ver solicitações desta categoria — azul */}
                                                    <button
                                                        onClick={() => goToSolicitacoes(b)}
                                                        title="Ver solicitações desta categoria"
                                                        style={{
                                                            background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 9,
                                                            padding: '9px 11px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#2563EB',
                                                            transition: 'all 0.18s',
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.background = '#DBEAFE'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(37,99,235,0.18)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#BFDBFE'; e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                                                    >
                                                        <ArrowTopRightOnSquareIcon width={18} height={18} />
                                                    </button>
                                                    {canWrite && (
                                                        <>
                                                            <button
                                                                onClick={() => startEdit(b)}
                                                                title="Editar teto"
                                                                style={{
                                                                    background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 9,
                                                                    padding: '9px 11px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#B89B00',
                                                                    transition: 'all 0.18s',
                                                                }}
                                                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#FFD600'; e.currentTarget.style.background = '#FEF3C7'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(184,155,0,0.20)'; }}
                                                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#FDE68A'; e.currentTarget.style.background = '#FFFBEB'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                                                            >
                                                                <PencilIcon width={18} height={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => setDeletingId(b.id)}
                                                                title="Remover"
                                                                style={{
                                                                    background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 9,
                                                                    padding: '9px 11px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#DC2626',
                                                                    transition: 'all 0.18s',
                                                                }}
                                                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#EF4444'; e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(220,38,38,0.20)'; }}
                                                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#FECACA'; e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                                                            >
                                                                <TrashIcon width={18} height={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Info ── */}
            <div style={{
                padding: '14px 18px', background: '#FFFBEB', borderRadius: 10,
                border: '1px solid #FDE68A', fontSize: '0.78rem', color: '#92400E',
                fontWeight: 600, display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>ℹ️</span>
                <span>
                    A verba é verificada automaticamente ao <strong>realizar movimentações para as carretas</strong>.
                    O consumo mostrado reflete o valor total dos insumos <strong>distribuídos para as carretas</strong> no período.
                    Clique em <ArrowTopRightOnSquareIcon style={{ display: 'inline', width: 12, height: 12, verticalAlign: 'middle' }} /> para ver as solicitações relacionadas.
                </span>
            </div>
        </div>
    );
}
