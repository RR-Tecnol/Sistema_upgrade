'use client';

import { WIZARD_INPUT, WIZARD_LABEL, WIZARD_SEC_TITLE } from './acao-wizard-styles';
import type { AcaoWizardFormState } from './acao-wizard-types';

export function AcaoWizardStepLogistics({
    form,
    setForm,
}: {
    form: AcaoWizardFormState;
    setForm: React.Dispatch<React.SetStateAction<AcaoWizardFormState>>;
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={WIZARD_SEC_TITLE}>⛽ Logística estimada</div>
            <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: 0, lineHeight: 1.45 }}>
                Valores para custo de deslocamento na Visão Geral. Turmas, motoristas e equipe com diária são vinculados no
                dashboard do período após a criação.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                    <label style={WIZARD_LABEL}>Distância (km)</label>
                    <input
                        type="number"
                        step="0.1"
                        placeholder="350"
                        style={WIZARD_INPUT}
                        value={form.distanciaKm}
                        onChange={e => setForm(f => ({ ...f, distanciaKm: e.target.value }))}
                    />
                </div>
                <div>
                    <label style={WIZARD_LABEL}>Combustível (R$/L)</label>
                    <input
                        type="number"
                        step="0.01"
                        placeholder="6.50"
                        style={WIZARD_INPUT}
                        value={form.precoCombustivelL}
                        onChange={e => setForm(f => ({ ...f, precoCombustivelL: e.target.value }))}
                    />
                </div>
                <div>
                    <label style={WIZARD_LABEL}>Autonomia (km/L)</label>
                    <input
                        type="number"
                        step="0.1"
                        placeholder="4.0"
                        style={WIZARD_INPUT}
                        value={form.autonomiaKmL}
                        onChange={e => setForm(f => ({ ...f, autonomiaKmL: e.target.value }))}
                    />
                </div>
            </div>
        </div>
    );
}
