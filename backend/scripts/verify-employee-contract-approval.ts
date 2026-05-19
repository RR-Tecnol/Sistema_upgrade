/**
 * Valida lógica CLT vs diária (aprovação e período de curso) sem subir servidor.
 * Uso: npm run employee-contract:verify
 */
import {
    computeCltPeriodPayment,
    computeDiariaPeriodPayment,
    computeFuncionarioPeriodPayment,
    funcionarioAcaoCustoDescricao,
    isCltContract,
} from '../src/common/employee-period-payment.util';
import { resolveBrowserViewUrl, buildStoredObjectUrl } from '../src/common/minio-browser-url.util';
import { resolveStoredMediaUrl } from '../src/common/resolve-stored-media-url.util';

const settings = {
    diasUteisReferenciaMes: 22,
    kmLimitePassagemSemanal: 200,
    valorPassagemViagem: 15,
};

function assert(cond: boolean, msg: string) {
    if (!cond) {
        console.error('FAIL:', msg);
        process.exit(1);
    }
    console.log('OK:', msg);
}

console.log('=== verify-employee-contract-approval ===\n');

assert(isCltContract('CLT'), 'isCltContract CLT');
assert(!isCltContract('FREELANCE'), 'FREELANCE não é CLT');
assert(funcionarioAcaoCustoDescricao('Maria', 'CLT') === 'CLT - Maria', 'descricao CLT');
assert(funcionarioAcaoCustoDescricao('João', 'FREELANCE') === 'Diária - João', 'descricao diária');

const diaria = computeDiariaPeriodPayment(120, 10);
assert(Math.abs(diaria.valorTotal - 1200) < 0.01, 'diária 120 x 10 dias');

const clt = computeCltPeriodPayment({
    monthlySalaryCLT: 4400,
    diasTrabalhados: 10,
    travelRuleKm: 200,
    settings,
});
assert(clt.salarioProporcional > 0, 'salário proporcional CLT');
assert(clt.valorTotal >= clt.salarioProporcional, 'total CLT inclui passagens');

const periodClt = computeFuncionarioPeriodPayment({
    contractType: 'CLT',
    valorDiaria: 0,
    diasTrabalhados: 10,
    monthlySalaryCLT: 4400,
    travelRuleKm: 200,
    settings,
});
assert(periodClt.valorTotal === clt.valorTotal, 'computeFuncionarioPeriodPayment CLT');

const periodDiaria = computeFuncionarioPeriodPayment({
    contractType: 'FREELANCE',
    valorDiaria: 120,
    diasTrabalhados: 10,
    settings,
});
assert(periodDiaria.valorTotal === 1200, 'computeFuncionarioPeriodPayment diária');

const internalMinio = 'http://minio:9000/public-uploads/anon/2026-05-18/test.jpg';
const resolved = resolveBrowserViewUrl(internalMinio);
assert(resolved != null && !resolved.includes('minio:'), 'resolveBrowserViewUrl troca host minio');

const stored = resolveStoredMediaUrl(internalMinio);
assert(stored != null && !stored.includes('minio:'), 'resolveStoredMediaUrl');

const stable = buildStoredObjectUrl('public-uploads', 'anon/x.jpg');
assert(stable.includes('public-uploads'), 'buildStoredObjectUrl');

console.log('\n✅ employee-contract:verify passou');
