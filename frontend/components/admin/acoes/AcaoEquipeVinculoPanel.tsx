'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { acoesApi, type Acao } from '@/lib/api/acoes';
import { toast } from '@/components/ui/Toast';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { AdminListPagination } from '@/components/admin/AdminListPagination';
import { ADMIN_PAGE_SIZE_CARDS } from '@/lib/api/pagination';

const EMPLOYEE_ROLES = [
    'INSTRUCTOR',
    'DRIVER',
    'COORDINATOR',
    'NURSE',
    'TECHNICIAN',
    'ADMINISTRATIVE',
    'OTHER',
] as const;

const ROLE_LABELS: Record<string, { label: string; icon: string }> = {
    INSTRUCTOR: { label: 'Instrutor', icon: '🎓' },
    DRIVER: { label: 'Motorista', icon: '🚛' },
    COORDINATOR: { label: 'Coordenador', icon: '🎯' },
    NURSE: { label: 'Enfermeiro(a)', icon: '🏥' },
    TECHNICIAN: { label: 'Técnico', icon: '🔧' },
    ADMINISTRATIVE: { label: 'Administrativo', icon: '📋' },
    OTHER: { label: 'Outros', icon: '👤' },
};

type Disponivel = {
    id: string;
    name: string;
    role: string;
    dailyCost?: number | string | null;
    contractType?: string | null;
    monthlySalaryCLT?: number | string | null;
    specialty?: string | null;
};

export type CalResumoMotor = {
    diasLetivos: number;
    diasCorridos: number;
    suggestedDiasPagamento?: number;
    formulaLabel?: string;
    aviso?: string;
    paymentNote?: string;
    workload?: { status: string; message: string } | null;
};

function fmtCurrency(v: number) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type DriverRoleEffect = {
    message: string;
    tripsWarning?: string;
    tripsGenerated?: number;
    perClass?: Array<{ classIdentifier?: string; generated: number; message: string }>;
};

function formatDriverVinculoFeedback(driver: DriverRoleEffect): string {
    const lines = [driver.message];
    if (driver.perClass?.length) {
        for (const pc of driver.perClass) {
            const id = pc.classIdentifier || 'Turma';
            lines.push(`• ${id}: ${pc.generated} viagem(ns) — ${pc.message}`);
        }
    }
    if (driver.tripsWarning) lines.push(`Aviso: ${driver.tripsWarning}`);
    return lines.join('\n');
}

function handleVinculoToast(res: {
    roleEffects?: {
        instructor?: { message: string };
        driver?: DriverRoleEffect;
    };
}) {
    const driver = res.roleEffects?.driver;
    if (driver && (driver.tripsGenerated ?? 0) === 0) {
        toast.warning(formatDriverVinculoFeedback(driver), 8000);
    } else {
        const parts: string[] = ['Funcionário vinculado ao período.'];
        if (res.roleEffects?.instructor?.message) parts.push(res.roleEffects.instructor.message);
        if (driver?.message) parts.push(formatDriverVinculoFeedback(driver));
        toast.success(parts.join(' '));
    }
}

export function AcaoEquipeVinculoPanel({
    acao,
    calResumo,
    diasSugeridos,
    onUpdate,
}: {
    acao: Acao;
    calResumo: CalResumoMotor | null;
    diasSugeridos: number;
    onUpdate: () => void;
}) {
    const [search, setSearch] = useState('');
    const [searchDebounced, setSearchDebounced] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<Disponivel[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [modalOpen, setModalOpen] = useState(false);
    const [selected, setSelected] = useState<Disponivel | null>(null);
    const [valorDiaria, setValorDiaria] = useState('');
    const [diasTrabalhados, setDiasTrabalhados] = useState(String(diasSugeridos));
    const [submitting, setSubmitting] = useState(false);
    const [selectedTurmaIds, setSelectedTurmaIds] = useState<string[]>([]);
    const [instructorNote, setInstructorNote] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const previewSeqRef = useRef(0);

    const turmasPeriodo = (acao.turmas || []).filter(at => at.turma && at.turma.status !== 'CANCELLED');
    const turmasSelecionadasKey = [...selectedTurmaIds].sort().join(',');

    useEffect(() => {
        const t = setTimeout(() => setSearchDebounced(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        setPage(1);
    }, [searchDebounced, roleFilter]);

    useEffect(() => {
        if (modalOpen && selected?.role === 'INSTRUCTOR') return;
        setDiasTrabalhados(String(diasSugeridos));
    }, [diasSugeridos, modalOpen, selected?.role]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await acoesApi.listFuncionariosDisponiveis(acao.id, {
                search: searchDebounced || undefined,
                role: roleFilter || undefined,
                page,
                limit: ADMIN_PAGE_SIZE_CARDS,
            });
            setRows(res.employees || []);
            setTotalPages(res.totalPages ?? 1);
            setTotal(res.total ?? 0);
        } catch {
            setRows([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [acao.id, searchDebounced, roleFilter, page]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!modalOpen || selected?.role !== 'INSTRUCTOR') return;

        if (!turmasSelecionadasKey) {
            setDiasTrabalhados('');
            setInstructorNote('Selecione ao menos uma turma.');
            setPreviewLoading(false);
            return;
        }

        const classIds = turmasSelecionadasKey.split(',').filter(Boolean);
        const seq = ++previewSeqRef.current;
        setDiasTrabalhados('');
        setInstructorNote('Calculando dias pelo curso da turma…');
        setPreviewLoading(true);
        acoesApi
            .previewInstructorDias(acao.id, classIds)
            .then(prev => {
                if (seq !== previewSeqRef.current) return;
                setDiasTrabalhados(String(prev.suggestedDiasPagamento));
                setInstructorNote(prev.note);
            })
            .catch(() => {
                if (seq !== previewSeqRef.current) return;
                setDiasTrabalhados('');
                setInstructorNote('Não foi possível calcular os dias para a(s) turma(s) selecionada(s).');
            })
            .finally(() => {
                if (seq !== previewSeqRef.current) return;
                setPreviewLoading(false);
            });
    }, [modalOpen, selected?.role, turmasSelecionadasKey, acao.id]);

    const isCltEmp = (emp: Disponivel) => String(emp.contractType || '').toUpperCase() === 'CLT';

    const openModal = (emp: Disponivel) => {
        previewSeqRef.current += 1;
        setSelected(emp);
        if (isCltEmp(emp)) {
            const sal = emp.monthlySalaryCLT != null ? Number(emp.monthlySalaryCLT) : 0;
            setValorDiaria(sal > 0 ? sal.toFixed(2) : '');
        } else {
            const dc = emp.dailyCost != null ? Number(emp.dailyCost) : 0;
            setValorDiaria(dc > 0 ? dc.toFixed(2) : '');
        }
        if (emp.role === 'INSTRUCTOR') {
            setSelectedTurmaIds([]);
            setInstructorNote('Selecione ao menos uma turma.');
            setDiasTrabalhados('');
        } else {
            setSelectedTurmaIds([]);
            setInstructorNote(null);
            setDiasTrabalhados(String(diasSugeridos));
        }
        setModalOpen(true);
    };

    const toggleTurma = (turmaId: string) => {
        setSelectedTurmaIds(prev =>
            prev.includes(turmaId) ? prev.filter(id => id !== turmaId) : [...prev, turmaId],
        );
    };

    const submitVinculo = async () => {
        if (!selected || submitting) return;
        const clt = isCltEmp(selected);
        const vd = Number(valorDiaria);
        const dias = Number(diasTrabalhados);
        if (!clt && (!vd || vd <= 0)) {
            toast.error('Informe o valor da diária.');
            return;
        }
        if (clt && (!selected.monthlySalaryCLT || Number(selected.monthlySalaryCLT) <= 0)) {
            toast.error('Funcionário CLT sem salário mensal cadastrado.');
            return;
        }
        if (!dias || dias < 1) {
            toast.error('Informe a quantidade de dias.');
            return;
        }
        if (selected.role === 'INSTRUCTOR' && !selectedTurmaIds.length) {
            toast.error('Selecione a(s) turma(s) em que o instrutor atuará.');
            return;
        }
        setSubmitting(true);
        try {
            const defaultDias =
                selected.role === 'INSTRUCTOR'
                    ? Number(diasTrabalhados)
                    : diasSugeridos;
            const payload: {
                employeeId: string;
                valorDiaria?: number;
                diasTrabalhados?: number;
                classIds?: string[];
            } = {
                employeeId: selected.id,
            };
            if (!clt) payload.valorDiaria = vd;
            if (selected.role === 'INSTRUCTOR') {
                payload.classIds = selectedTurmaIds;
            }
            if (dias !== defaultDias) payload.diasTrabalhados = dias;

            const res = await acoesApi.addFuncionario(acao.id, payload);
            handleVinculoToast(res);
            previewSeqRef.current += 1;
            setModalOpen(false);
            setSelected(null);
            setSelectedTurmaIds([]);
            setInstructorNote(null);
            onUpdate();
            load();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Não foi possível vincular.');
        } finally {
            setSubmitting(false);
        }
    };

    const temTurmas = (acao.turmas?.length ?? 0) > 0;
    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.65rem 0.9rem',
        borderRadius: 9,
        border: '1.5px solid #E5E7EB',
        background: '#F9FAFB',
        fontSize: '0.85rem',
    };

    return (
        <div
            style={{
                borderRadius: 16,
                overflow: 'hidden',
                border: '1px solid #E5E7EB',
                background: '#fff',
            }}
        >
            <div
                style={{
                    padding: '12px 18px',
                    background: '#FFFDE7',
                    borderBottom: '1px solid #FEF08A',
                }}
            >
                <div
                    style={{
                        fontFamily: 'Orbitron',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: '#92400E',
                        letterSpacing: '0.1em',
                    }}
                >
                    MONTAR EQUIPE DO PERÍODO
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#6B7280', lineHeight: 1.45 }}>
                    Busque no cadastro de funcionários. Ao vincular, cria o card de diária; instrutores entram nas turmas
                    automaticamente; motoristas recebem a carreta do período e as viagens são geradas quando há turmas
                    vinculadas — o motorista vê a agenda no portal.
                </p>
            </div>

            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {!temTurmas && (
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#B45309' }}>
                        Vincule pelo menos uma turma na aba Turmas antes de adicionar pessoas.
                    </p>
                )}

                <style>{`.acv-filter-grid{display:grid;grid-template-columns:1fr 180px;gap:10px}@media(max-width:640px){.acv-filter-grid{grid-template-columns:1fr}}`}</style>
                <div className="acv-filter-grid">
                    <input
                        style={inputStyle}
                        placeholder="Buscar por nome, e-mail ou especialidade…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        disabled={!temTurmas}
                    />
                    <select
                        style={{ ...inputStyle, cursor: 'pointer' }}
                        value={roleFilter}
                        onChange={e => setRoleFilter(e.target.value)}
                        disabled={!temTurmas}
                    >
                        <option value="">Todos os tipos</option>
                        {EMPLOYEE_ROLES.map(r => (
                            <option key={r} value={r}>
                                {ROLE_LABELS[r]?.icon} {ROLE_LABELS[r]?.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid #F3F4F6', borderRadius: 10 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                            <tr style={{ background: '#F9FAFB', textAlign: 'left' }}>
                                <th style={{ padding: '10px 12px' }}>Nome</th>
                                <th style={{ padding: '10px 12px' }}>Tipo</th>
                                <th style={{ padding: '10px 12px' }}>Diária cadastro</th>
                                <th style={{ padding: '10px 12px', width: 100 }} />
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#9CA3AF' }}>
                                        Carregando…
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#9CA3AF' }}>
                                        Nenhum funcionário disponível.{' '}
                                        <Link href="/admin/funcionarios" style={{ color: '#B45309', fontWeight: 600 }}>
                                            Cadastrar em Funcionários
                                        </Link>
                                    </td>
                                </tr>
                            ) : (
                                rows.map(emp => {
                                    const cfg = ROLE_LABELS[emp.role] || ROLE_LABELS.OTHER;
                                    return (
                                        <tr key={emp.id} style={{ borderTop: '1px solid #F3F4F6' }}>
                                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>{emp.name}</td>
                                            <td style={{ padding: '10px 12px' }}>
                                                {cfg.icon} {cfg.label}
                                            </td>
                                            <td style={{ padding: '10px 12px' }}>
                                                {emp.dailyCost != null ? fmtCurrency(Number(emp.dailyCost)) : '—'}
                                            </td>
                                            <td style={{ padding: '10px 12px' }}>
                                                <button
                                                    type="button"
                                                    className="btn-primary"
                                                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                                                    disabled={!temTurmas}
                                                    onClick={() => openModal(emp)}
                                                >
                                                    Vincular
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <AdminListPagination
                    page={page}
                    totalPages={totalPages}
                    total={total}
                    loading={loading}
                    onPageChange={setPage}
                    itemLabel="disponível(is)"
                />
            </div>

            {modalOpen && selected && (
                <ModalPortal>
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.45)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10000,
                            padding: 16,
                        }}
                        onClick={() => !submitting && setModalOpen(false)}
                    >
                        <div
                            style={{
                                background: '#fff',
                                borderRadius: 14,
                                padding: 24,
                                maxWidth: 520,
                                width: '100%',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 style={{ margin: '0 0 8px', fontFamily: 'Orbitron', fontSize: '0.9rem' }}>
                                Vincular ao período
                            </h3>
                            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#374151' }}>
                                <strong>{selected.name}</strong> — {ROLE_LABELS[selected.role]?.label}
                            </p>

                            {selected.role === 'INSTRUCTOR' ? (
                                <div style={{ marginBottom: 14, padding: 12, borderRadius: 8, border: '1px solid #FDE68A', background: '#FFFBEB' }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E', marginBottom: 8 }}>Turmas do período (carga horária por curso)</div>
                                    {turmasPeriodo.length === 0 ? (
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#B45309' }}>Nenhuma turma vinculada — use a aba Turmas primeiro.</p>
                                    ) : turmasPeriodo.map(at => {
                                        const t = at.turma!;
                                        const wh = (t.course as { workloadHours?: number } | undefined)?.workloadHours;
                                        return (
                                            <label key={at.turmaId} style={{ display: 'flex', gap: 8, fontSize: '0.78rem', marginBottom: 6, cursor: 'pointer' }}>
                                                <input type="checkbox" checked={selectedTurmaIds.includes(at.turmaId)} onChange={() => toggleTurma(at.turmaId)} />
                                                <span><strong>{t.classIdentifier}</strong>{t.course?.name ? ` — ${t.course.name}` : ''}{wh != null ? ` (${wh}h)` : ''}</span>
                                            </label>
                                        );
                                    })}
                                    {instructorNote || previewLoading ? (
                                        <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: '#1E3A8A' }}>{previewLoading ? 'Calculando dias pelo curso…' : instructorNote}</p>
                                    ) : null}
                                </div>
                            ) : calResumo ? (
                                <div
                                    style={{
                                        marginBottom: 14,
                                        padding: 10,
                                        borderRadius: 8,
                                        background: '#EFF6FF',
                                        fontSize: '0.75rem',
                                        color: '#1E3A8A',
                                    }}
                                >
                                    Motor do período: <strong>{diasSugeridos}</strong> dia(s) sugerido(s)
                                    {calResumo.formulaLabel ? ` · ${calResumo.formulaLabel}` : ''}
                                    {calResumo.aviso ? <div style={{ marginTop: 6, color: '#92400E' }}>{calResumo.aviso}</div> : null}
                                </div>
                            ) : null}

                            <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
                                {selected && isCltEmp(selected) ? (
                                    <div style={{ padding: 10, borderRadius: 8, background: '#EDE9FE', fontSize: '0.75rem', color: '#5B21B6' }}>
                                        <strong>CLT</strong> — salário mensal R${' '}
                                        {selected.monthlySalaryCLT != null
                                            ? fmtCurrency(Number(selected.monthlySalaryCLT))
                                            : 'não definido'}
                                        . O custo no período será proporcional + passagens (conforme dias).
                                    </div>
                                ) : (
                                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280' }}>
                                        Diária (R$)
                                        <input
                                            type="number"
                                            step="0.01"
                                            style={{ ...inputStyle, marginTop: 4 }}
                                            value={valorDiaria}
                                            onChange={e => setValorDiaria(e.target.value)}
                                        />
                                    </label>
                                )}
                                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280' }}>
                                    {selected.role === 'INSTRUCTOR'
                                        ? 'Dias (pelo curso da turma selecionada)'
                                        : 'Dias (motor do período)'}
                                    <input
                                        type="number"
                                        min={1}
                                        style={{ ...inputStyle, marginTop: 4 }}
                                        value={diasTrabalhados}
                                        placeholder={
                                            selected.role === 'INSTRUCTOR' && !selectedTurmaIds.length
                                                ? 'Selecione a turma'
                                                : undefined
                                        }
                                        disabled={selected.role === 'INSTRUCTOR' && !selectedTurmaIds.length}
                                        onChange={e => setDiasTrabalhados(e.target.value)}
                                    />
                                </label>
                            </div>

                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn-secondary" disabled={submitting} onClick={() => setModalOpen(false)}>
                                    Cancelar
                                </button>
                                <button type="button" className="btn-primary" disabled={submitting} onClick={submitVinculo}>
                                    {submitting ? 'Vinculando…' : 'Confirmar vínculo'}
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}
