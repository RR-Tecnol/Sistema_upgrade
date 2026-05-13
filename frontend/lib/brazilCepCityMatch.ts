/**
 * Valida cruzamento de endereços ViaCEP x cidade cadastrada (UF, município, IBGE).
 */

export type ViaCepMunicipality = {
    localidade: string;
    uf: string;
    ibge?: string | null;
};

export type CatalogCityForCepMatch = {
    name: string;
    state: string;
    ibgeCode?: string | null;
};

export function normalizeUf(uf: string): string {
    return String(uf ?? '').trim().toUpperCase();
}

export function normalizeMunicipalityName(name: string): string {
    return String(name ?? '')
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/[''`´]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function ibgeDigits(code: string | null | undefined): string {
    return String(code ?? '').replace(/\D/g, '');
}

/** Quando cidade e ViaCEP têm IBGE de 7 dígitos válidos: compara apenas por código. Caso contrário: UF obrigatória + nome igual (normalizado). */
export function viaCepMatchesCity(
    via: ViaCepMunicipality,
    city: CatalogCityForCepMatch,
): { ok: boolean; detail: string } {
    const ufCep = normalizeUf(via.uf);
    const ufCat = normalizeUf(city.state);
    const cIbge = ibgeDigits(city.ibgeCode);
    const vIbge = ibgeDigits(via.ibge);
    const hasRobustIbge = cIbge.length >= 7 && vIbge.length >= 7;
    if (hasRobustIbge) {
        if (cIbge !== vIbge) {
            return {
                ok: false,
                detail: `o CEP é do município IBGE ${vIbge}, mas a cidade selecionada no sistema é IBGE ${cIbge}`,
            };
        }
        if (ufCep !== ufCat) {
            return {
                ok: false,
                detail: `IBGE coincide, mas a UF cadastrada (${ufCat}) difere da UF do CEP (${ufCep}) — atualize o cadastro de cidades ou a seleção`,
            };
        }
        return { ok: true, detail: '' };
    }
    if (ufCep !== ufCat) {
        return {
            ok: false,
            detail: `UF do CEP (${ufCep}) não confere com a cidade selecionada (${ufCat})`,
        };
    }
    const nVia = normalizeMunicipalityName(via.localidade);
    const nCity = normalizeMunicipalityName(city.name);
    if (!nVia || !nCity) {
        return { ok: false, detail: 'município do CEP ou da cidade está vazio para validação' };
    }
    if (nVia !== nCity) {
        return {
            ok: false,
            detail: `município do ViaCEP (${via.localidade}) não é o mesmo da cidade selecionada (${city.name}); ajuste o select ou o CEP`,
        };
    }
    return { ok: true, detail: '' };
}
