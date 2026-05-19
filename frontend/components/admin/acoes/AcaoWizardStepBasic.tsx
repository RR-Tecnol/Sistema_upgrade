'use client';

import type { AcaoStatus } from '@/lib/api/acoes';
import { WIZARD_INPUT, WIZARD_LABEL, WIZARD_SEC_TITLE } from './acao-wizard-styles';
import type { AcaoWizardFormState } from './acao-wizard-types';

type GroupRow = { id: string; name: string; state: string };

export function AcaoWizardStepBasic({
    form,
    setForm,
    grupos,
}: {
    form: AcaoWizardFormState;
    setForm: React.Dispatch<React.SetStateAction<AcaoWizardFormState>>;
    grupos: GroupRow[];
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={WIZARD_SEC_TITLE}>📋 Contexto operacional</div>
            <p
                style={{
                    margin: 0,
                    padding: '10px 12px',
                    borderRadius: 8,
                    fontSize: '0.78rem',
                    lineHeight: 1.45,
                    color: '#1E40AF',
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                }}
            >
                Após criar, abra o card do período para vincular <strong>turmas</strong>, <strong>professores/motoristas</strong> e{' '}
                <strong>funcionários</strong> (diárias). Turmas novas são cadastradas em Admin → Turmas.
            </p>
            <div style={{ display: 'grid', gap: 12 }}>
                <div>
                    <label style={WIZARD_LABEL}>Nome do período *</label>
                    <input
                        style={WIZARD_INPUT}
                        placeholder="Ex: Qualifica São Luís — Maio 2026"
                        value={form.nome}
                        onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                        required
                    />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                        <label style={WIZARD_LABEL}>Status</label>
                        <select
                            style={{ ...WIZARD_INPUT, cursor: 'pointer' }}
                            value={form.status}
                            onChange={e => setForm(f => ({ ...f, status: e.target.value as AcaoStatus }))}
                        >
                            <option value="PLANEJADA">Planejada</option>
                            <option value="EM_ANDAMENTO">Em andamento</option>
                            <option value="CONCLUIDA">Concluída</option>
                            <option value="CANCELADA">Cancelada</option>
                        </select>
                    </div>
                    <div>
                        <label style={WIZARD_LABEL}>Grupo *</label>
                        <select
                            style={{ ...WIZARD_INPUT, cursor: 'pointer' }}
                            value={form.grupoId}
                            onChange={e => setForm(f => ({ ...f, grupoId: e.target.value }))}
                            required
                        >
                            <option value="">Selecione o grupo</option>
                            {grupos.map(g => (
                                <option key={g.id} value={g.id}>
                                    {g.name} — {g.state}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <label
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: '#F9FAFB',
                        border: '1px solid #E5E7EB',
                        cursor: 'pointer',
                        fontSize: '0.83rem',
                    }}
                >
                    <input
                        type="checkbox"
                        checked={form.permitirInscricoes}
                        onChange={e => setForm(f => ({ ...f, permitirInscricoes: e.target.checked }))}
                        style={{ accentColor: '#FFD600' }}
                    />
                    Permitir inscrições online neste período
                </label>
            </div>
        </div>
    );
}
