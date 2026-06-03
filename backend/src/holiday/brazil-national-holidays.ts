/**
 * Feriados nacionais brasileiros com data fixa ou móvel já calculada (2025–2026).
 * Usado no catálogo global (BUG-15) — independente de turma IN_PROGRESS.
 */
export type BrazilNationalHolidayEntry = Readonly<{ date: string; reason: string }>;

export const BRAZIL_NATIONAL_HOLIDAYS_2025_2026: readonly BrazilNationalHolidayEntry[] = [
  { date: '2025-01-01', reason: '🇧🇷 Ano Novo' },
  { date: '2025-03-03', reason: '🇧🇷 Carnaval (2ª feira)' },
  { date: '2025-03-04', reason: '🇧🇷 Carnaval (3ª feira)' },
  { date: '2025-04-18', reason: '🇧🇷 Sexta-feira Santa' },
  { date: '2025-04-21', reason: '🇧🇷 Tiradentes' },
  { date: '2025-05-01', reason: '🇧🇷 Dia do Trabalho' },
  { date: '2025-06-19', reason: '🇧🇷 Corpus Christi' },
  { date: '2025-09-07', reason: '🇧🇷 Independência do Brasil' },
  { date: '2025-10-12', reason: '🇧🇷 Nossa Senhora Aparecida' },
  { date: '2025-11-02', reason: '🇧🇷 Finados' },
  { date: '2025-11-15', reason: '🇧🇷 Proclamação da República' },
  { date: '2025-11-20', reason: '🇧🇷 Consciência Negra' },
  { date: '2025-12-25', reason: '🇧🇷 Natal' },
  { date: '2026-01-01', reason: '🇧🇷 Ano Novo' },
  { date: '2026-02-16', reason: '🇧🇷 Carnaval (2ª feira)' },
  { date: '2026-02-17', reason: '🇧🇷 Carnaval (3ª feira)' },
  { date: '2026-04-03', reason: '🇧🇷 Sexta-feira Santa' },
  { date: '2026-04-21', reason: '🇧🇷 Tiradentes' },
  { date: '2026-05-01', reason: '🇧🇷 Dia do Trabalho' },
  { date: '2026-06-04', reason: '🇧🇷 Corpus Christi' },
  { date: '2026-09-07', reason: '🇧🇷 Independência do Brasil' },
  { date: '2026-10-12', reason: '🇧🇷 Nossa Senhora Aparecida' },
  { date: '2026-11-02', reason: '🇧🇷 Finados' },
  { date: '2026-11-15', reason: '🇧🇷 Proclamação da República' },
  { date: '2026-11-20', reason: '🇧🇷 Consciência Negra' },
  { date: '2026-12-25', reason: '🇧🇷 Natal' },
];

export function filterNationalHolidaysByYears(
  years: number[],
): BrazilNationalHolidayEntry[] {
  const set = new Set(years);
  return BRAZIL_NATIONAL_HOLIDAYS_2025_2026.filter((h) => set.has(parseInt(h.date.slice(0, 4), 10)));
}
