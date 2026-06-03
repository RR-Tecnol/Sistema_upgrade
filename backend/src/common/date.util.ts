/**
 * parseLocalDate — converte uma string "YYYY-MM-DD" para Date sem desvio de fuso horário.
 *
 * PROBLEMA: `new Date("2026-05-27")` interpreta como meia-noite UTC.
 * Em Brasília (UTC-3) isso vira 2026-05-26T21:00:00 — um dia ANTES.
 *
 * SOLUÇÃO: forçar meio-dia UTC (12:00:00Z) para que, em qualquer fuso do Brasil,
 * a data ainda seja o mesmo dia calendário.
 *
 * Se o valor já for um objeto Date, retorna como está.
 * Se for undefined/null, retorna a data atual (meio-dia UTC).
 */
export function parseLocalDate(value: string | Date | undefined | null): Date {
  if (!value) {
    // Data atual → meio-dia UTC garante que é o mesmo dia em BRT (UTC-3)
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0));
  }

  if (value instanceof Date) {
    return value;
  }

  // Extrai somente a parte YYYY-MM-DD caso venha com horário ("2026-05-27T10:00:00")
  const datePart = (value as string).slice(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);

  if (!year || !month || !day) {
    // Fallback seguro: meio-dia UTC de hoje
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0));
  }

  // Meio-dia UTC → mesma data calendário em qualquer fuso do Brasil
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

/**
 * todayLocalDate — retorna hoje ao meio-dia UTC (sem desvio de fuso).
 */
export function todayLocalDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0));
}
