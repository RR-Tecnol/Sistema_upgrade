'use client';

import type { PreviewClassEndDateResult } from '@/lib/api/classes';

type Props = {
  preview: PreviewClassEndDateResult | null;
  loading?: boolean;
  manualEndDate?: string;
};

function fmtDate(iso: string) {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function sourceLabel(source: string) {
  if (source === 'catalog_national') return 'Catálogo nacional';
  if (source === 'catalog_state') return 'Catálogo estadual';
  if (source === 'class_occurrence') return 'Ocorrência turma';
  return source;
}

const shell: React.CSSProperties = {
  borderRadius: 14,
  border: '2px solid #BFDBFE',
  background: 'linear-gradient(180deg, #EFF6FF 0%, #F8FAFC 100%)',
  padding: '1.1rem 1.25rem',
};

export function TeachingCalendarMotorPanel({ preview, loading, manualEndDate }: Props) {
  const op = preview?.operationalSummary;

  if (loading) {
    return (
      <div style={shell}>
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#1D4ED8', fontWeight: 600 }}>Calculando motor do calendário…</p>
      </div>
    );
  }

  if (!op) {
    return (
      <div style={{ ...shell, border: '1px dashed #D1D5DB', background: '#F9FAFB' }}>
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#6B7280', lineHeight: 1.5 }}>
          Confirme o calendário letivo e informe a data de início — o término será preenchido automaticamente.
        </p>
      </div>
    );
  }

  const suggested = op.suggestedEndDate;
  const showBigDate = !!preview?.manualMismatch || (!!suggested && !manualEndDate);

  return (
    <div style={shell}>
      <div style={{ fontFamily: 'Orbitron', fontSize: '0.68rem', fontWeight: 800, color: '#1D4ED8', letterSpacing: '0.1em', marginBottom: 10 }}>
        RESUMO OPERACIONAL DO MOTOR
      </div>

      <div style={{ fontSize: '0.78rem', color: '#374151', marginBottom: 12, lineHeight: 1.5 }}>
        <p style={{ margin: '0 0 0.35rem' }}>
          <strong>{op.courseName}</strong> · UF {op.stateCode}
        </p>
        <p style={{ margin: '0 0 0.35rem' }}>
          Meta: <strong>{op.workloadHoursTarget}h</strong>
          {op.workloadScopeNote ? <span style={{ color: '#6B7280' }}> — {op.workloadScopeNote}</span> : null}
        </p>
        <p style={{ margin: '0 0 0.35rem' }}>
          <strong>{op.teachingDaysTarget}</strong> encontros letivos · <strong>{op.hoursPerSession}h</strong>/encontro · {op.weekendPolicyLabel}
        </p>
        {op.formulaLabel && (
          <p style={{ margin: 0, fontSize: '0.74rem', fontWeight: 700, color: '#1D4ED8' }}>
            {op.formulaLabel}
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        <Stat label="Letivos" value={`${op.teachingDaysInRange}/${op.teachingDaysTarget}`} />
        <Stat label="Horas" value={`${op.projectedHours}h`} />
        <Stat label="Calend." value={`${op.calendarDaysInRange}d`} />
      </div>

      {op.holidaysExcluded.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6B7280', margin: '0 0 6px' }}>
            FERIADOS / SEM AULA ({op.holidaysExcluded.length})
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.74rem', maxHeight: 110, overflowY: 'auto' }}>
            {op.holidaysExcluded.map((h) => (
              <li key={h.date}>
                {new Date(h.date + 'T12:00:00').toLocaleDateString('pt-BR')} — {h.reason} ({sourceLabel(h.source)})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        style={{
          padding: '1rem',
          borderRadius: 12,
          background: showBigDate ? '#FFFBEB' : '#ECFDF5',
          border: `2px solid ${showBigDate ? '#FCD34D' : '#6EE7B7'}`,
          textAlign: 'center',
          marginBottom: 10,
        }}
      >
        <p style={{ margin: '0 0 6px', fontSize: '0.65rem', fontWeight: 800, color: showBigDate ? '#92400E' : '#065F46' }}>
          DATA SUGERIDA PELO MOTOR
        </p>
        <p style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900 }}>{fmtDate(suggested)}</p>
        {showBigDate && manualEndDate && (
          <p style={{ fontSize: '0.75rem', color: '#B45309', marginTop: 8 }}>
            Você digitou {fmtDate(manualEndDate)} — altere a data de término se quiser outro valor.
          </p>
        )}
        {!manualEndDate && suggested && (
          <p style={{ fontSize: '0.72rem', color: '#065F46', marginTop: 8 }}>
            Data de término preenchida automaticamente pelo motor.
          </p>
        )}
      </div>

      <p style={{ margin: 0, fontSize: '0.72rem', color: '#6B7280' }}>{op.paymentNote}</p>

      {op.suggestedDiasPagamento != null && op.applyPaymentSuggestionRecommended && (
        <p style={{ marginTop: 8, fontSize: '0.74rem', fontWeight: 700, color: '#1D4ED8' }}>
          Sugestão de diárias no período: <strong>{op.suggestedDiasPagamento}</strong> dia(s) letivo(s) (opcional).
        </p>
      )}

      {op.messages.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6B7280', margin: '0 0 6px' }}>POR QUE O MOTOR CALCULOU ASSIM</p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.74rem', color: '#374151', lineHeight: 1.45 }}>
            {op.messages.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {preview?.workload?.status && preview.workload.status !== 'ok' && (
        <p role="alert" style={{ marginTop: 8, fontSize: '0.74rem', fontWeight: 600, color: preview.workload.status === 'short' ? '#991B1B' : '#92400E' }}>
          {preview.workload.message}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '0.5rem', borderRadius: 8, background: '#fff', border: '1px solid #E5E7EB', textAlign: 'center' }}>
      <div style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>{label}</div>
      <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{value}</div>
    </div>
  );
}
