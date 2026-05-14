/**
 * Feriados estaduais brasileiros com data civil fixa (mês/dia).
 *
 * Fonte consolidada: calendários oficiais estaduais e Wikipedia PT «Feriados no Brasil».
 * Omitidos aqui: feriados móveis (Carnaval, Corpora Christi por UF), duplicados do calendário
 * nacional na mesma data (ex.: MG/Inconfidência 21/04 = Tiradentes), e UFs cujo único ponto
 * fixo coincide sempre com feriado nacional (ex.: MT 20/11 em vários anos já coberto como nacional na pré-carga).
 *
 * Para novos anos basta gerar datas pelo par mês/dia — não depende de API externa.
 */

export type BrazilStateHolidayTemplate = Readonly<{
  month: number;
  day: number;
  name: string;
}>;

/** Feriados civis fixos por UF (sigla ISO 3366-2:BR). Lista vazia = sem datas fixas únicas mapeadas aqui. */
export const BRAZIL_STATE_FIXED_HOLIDAYS: Readonly<Record<string, readonly BrazilStateHolidayTemplate[]>> =
  Object.freeze({
    AC: [{ month: 6, day: 15, name: 'Aniversário do Estado do Acre' }],
    AL: [{ month: 9, day: 16, name: 'Emancipação Política de Alagoas' }],
    AP: [{ month: 9, day: 13, name: 'Adesão do Amapá à Independência do Brasil' }],
    AM: [{ month: 9, day: 5, name: 'Elevação do Amazonas à categoria de província' }],
    BA: [{ month: 7, day: 2, name: 'Independência da Bahia' }],
    CE: [{ month: 3, day: 25, name: 'Data Magna do Ceará' }],
    DF: [{ month: 11, day: 30, name: 'Dia do Evangélico / Padroeira do Distrito Federal (N. Sra. da Conceição)' }],
    ES: [],
    GO: [{ month: 10, day: 28, name: 'Dia do Servidor Público estadual (Goiás)' }],
    MA: [{ month: 7, day: 28, name: 'Adesão do Maranhão à Independência do Brasil' }],
    MG: [],
    MS: [{ month: 10, day: 11, name: 'Criação do Estado de Mato Grosso do Sul' }],
    MT: [],
    PA: [{ month: 8, day: 15, name: 'Adesão do Grão-Pará à Independência do Brasil' }],
    PB: [{ month: 8, day: 5, name: 'Fundação do Estado da Paraíba' }],
    PE: [{ month: 3, day: 6, name: 'Revolução Pernambucana de 1817 (Data Magna)' }],
    PI: [{ month: 10, day: 19, name: 'Dia do Piauí' }],
    PR: [{ month: 12, day: 19, name: 'Emancipação Política do Paraná' }],
    RJ: [{ month: 1, day: 20, name: 'São Sebastião — Padroeiro do Estado do Rio de Janeiro' }],
    RN: [{ month: 8, day: 7, name: 'Dia do Rio Grande do Norte (autonomia da capitania)' }],
    RO: [{ month: 1, day: 4, name: 'Criação do Estado de Rondônia' }],
    RR: [{ month: 10, day: 5, name: 'Criação do Estado de Roraima' }],
    RS: [{ month: 9, day: 20, name: 'Revolução Farroupilha — Dia do Gaúcho' }],
    SC: [{ month: 8, day: 11, name: 'Criação da capitania de Santa Catarina' }],
    SE: [{ month: 7, day: 8, name: 'Autonomia Política de Sergipe' }],
    SP: [{ month: 7, day: 9, name: 'Revolução Constitucionalista de 1932' }],
    TO: [{ month: 10, day: 5, name: 'Autonomia do Estado do Tocantins' }],
  });

export function normalizeBrazilUf(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const u = raw.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(u)) return u;
  const two = u.slice(0, 2);
  return /^[A-Z]{2}$/.test(two) ? two : null;
}

/** Feriados estaduais fixos para um ano civil e UF. */
export function listBrazilStateHolidaysForYear(ufRaw: string | undefined | null, year: number): Array<{ date: string; name: string }> {
  const uf = normalizeBrazilUf(ufRaw);
  if (!uf || !Number.isFinite(year)) return [];
  const templates = BRAZIL_STATE_FIXED_HOLIDAYS[uf];
  if (!templates?.length) return [];
  return templates.map((t) => ({
    date: `${year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`,
    name: t.name,
  }));
}
