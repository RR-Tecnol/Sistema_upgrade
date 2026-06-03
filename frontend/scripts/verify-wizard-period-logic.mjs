/**
 * Validação rápida da lógica do wizard (sem Jest).
 * node frontend/scripts/verify-wizard-period-logic.mjs
 */
import assert from 'node:assert/strict';

function toIsoDateOnly(value) {
    if (typeof value === 'string') return value.slice(0, 10);
    return value.toISOString().slice(0, 10);
}

function buildPeriodHydrationFromLinkedTurmas(turmas) {
    if (turmas.length === 0) return null;
    const first = turmas[0];
    const city = first.city;
    const starts = turmas.map(t => toIsoDateOnly(t.startDate));
    const ends = turmas.map(t => toIsoDateOnly(t.endDate));
    return {
        dataInicio: starts.sort()[0],
        dataFim: ends.sort().reverse()[0],
        cidadeId: city?.id || first.cityId,
    };
}

const turmaA = { startDate: '2026-05-29', endDate: '2026-06-16', cityId: 'c1', city: { id: 'c1' } };
const turmaB = { startDate: '2026-05-29', endDate: '2026-07-20', cityId: 'c1', city: { id: 'c1' } };

const h = buildPeriodHydrationFromLinkedTurmas([turmaA, turmaB]);
assert.equal(h.dataInicio, '2026-05-29');
assert.equal(h.dataFim, '2026-07-20');
console.log('✅ verify-wizard-period-logic OK');
