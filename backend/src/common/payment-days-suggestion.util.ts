import type { CourseWorkloadAudit } from './course-workload-audit.util';

export type PaymentDaysSuggestion = {
  suggestedDiasPagamento: number;
  diasLetivosEfetivos: number;
  teachingDaysTarget: number | null;
  paymentAdjustmentNote: string;
  applySuggestionRecommended: boolean;
  /** Intervalo calendário maior que o contrato; diárias já limitadas ao teto N. */
  cappedByContract?: boolean;
};

/** Diárias limitadas ao contrato (N encontros), embora o calendário do período tenha mais dias letivos. */
export function isPaymentCappedByContract(
  diasLetivos: number,
  suggested: number,
  teachingDaysTarget?: number | null,
): boolean {
  return (
    teachingDaysTarget != null &&
    teachingDaysTarget > 0 &&
    suggested <= teachingDaysTarget &&
    diasLetivos > suggested
  );
}

/**
 * Sugere dias de diária: min(dias letivos no intervalo, N encontros do contrato).
 * Admin sempre pode sobrescrever — retorno é orientação, não bloqueio.
 */
export function suggestPaymentDaysFromWorkload(
  diasLetivos: number,
  workload: CourseWorkloadAudit | null,
  teachingDaysTarget?: number | null,
): PaymentDaysSuggestion {
  const dias = Math.max(1, Math.floor(diasLetivos));
  const N =
    teachingDaysTarget != null && Number.isFinite(teachingDaysTarget) && teachingDaysTarget > 0
      ? Math.floor(teachingDaysTarget)
      : workload && workload.hoursPerSession > 0
        ? Math.max(1, Math.ceil(workload.targetHours / workload.hoursPerSession))
        : null;

  const cap = (raw: number) => (N != null ? Math.min(raw, N) : raw);

  if (!workload || workload.hoursPerSession <= 0) {
    const suggested = cap(dias);
    return {
      suggestedDiasPagamento: suggested,
      diasLetivosEfetivos: dias,
      teachingDaysTarget: N,
      paymentAdjustmentNote:
        N != null
          ? `Pagamento por diária: ${suggested} dia(s) sugerido(s) (contrato: ${N} encontros; ${dias} letivo(s) no intervalo). Feriados/ocorrências não contam como dia pago.`
          : 'Pagamento por diária: cada dia letivo no intervalo conta 1× a diária (não divide por horas do turno).',
      applySuggestionRecommended: N != null && suggested < dias,
    };
  }

  const contractNote =
    N != null
      ? ` Contrato: ${N} encontro(s) (${workload.targetHours}h ÷ ${workload.hoursPerSession}h).`
      : '';

  if (workload.status === 'surplus') {
    const suggested = cap(dias);
    const cappedByContract = isPaymentCappedByContract(dias, suggested, N);
    return {
      suggestedDiasPagamento: suggested,
      diasLetivosEfetivos: dias,
      teachingDaysTarget: N,
      cappedByContract,
      paymentAdjustmentNote: cappedByContract
        ? `Calendário do período: ${dias} dia(s) letivo(s) no intervalo (feriados já descontados). ` +
          `Pagamento de diárias: ${suggested} dia(s) — teto do contrato (${N} encontro(s), ${workload.targetHours}h).`
        : `O intervalo tem ${dias} dia(s) letivo(s) × ${workload.hoursPerSession}h = ${workload.projectedHours}h, acima da meta de ${workload.targetHours}h.${contractNote} ` +
          `Sugestão: ${suggested} dia(s) de diária.`,
      applySuggestionRecommended: cappedByContract ? false : suggested < dias,
    };
  }

  if (workload.status === 'short') {
    const suggested = cap(dias);
    return {
      suggestedDiasPagamento: suggested,
      diasLetivosEfetivos: dias,
      teachingDaysTarget: N,
      paymentAdjustmentNote:
        `Meta de ${workload.targetHours}h não atingida: ${workload.projectedHours}h previstas em ${dias} dia(s) letivo(s) no intervalo.${contractNote} ` +
        `Diárias refletem dias efetivos de aula; ajuste datas ou turno se o pagamento deve cobrir a meta.`,
      applySuggestionRecommended: false,
    };
  }

  const suggested = cap(dias);
  return {
    suggestedDiasPagamento: suggested,
    diasLetivosEfetivos: dias,
    teachingDaysTarget: N,
    paymentAdjustmentNote:
      `${dias} dia(s) letivo(s) no período — ${workload.projectedHours}h previstas (${workload.targetHours}h meta).${contractNote} ` +
      `Sugestão: ${suggested} diária(s). Pagamento = diária × dias letivos (feriado não paga).`,
    applySuggestionRecommended: N != null && suggested < dias,
  };
}

/** Após ocorrência que alongou o calendário: diárias sugeridas permanecem no teto N. */
export function paymentSuggestionAfterCalendarExtension(
  teachingDaysTarget: number,
  diasLetivosInRange: number,
): PaymentDaysSuggestion {
  const N = Math.max(1, Math.floor(teachingDaysTarget));
  const dias = Math.max(1, Math.floor(diasLetivosInRange));
  const suggested = Math.min(dias, N);
  return {
    suggestedDiasPagamento: suggested,
    diasLetivosEfetivos: dias,
    teachingDaysTarget: N,
    paymentAdjustmentNote:
      `Extensão do calendário para manter ${N} encontros letivos — diárias sugeridas permanecem em ${N} (não aumentam automaticamente).`,
    applySuggestionRecommended: dias > N,
  };
}
