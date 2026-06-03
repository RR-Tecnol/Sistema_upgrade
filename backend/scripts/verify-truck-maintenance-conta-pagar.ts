/**
 * Validação: manutenção de carreta → ContaPagar (sem campo fornecedor inválido).
 * Uso: npm run maintenance:verify
 */
import {
    buildContaObservacoesFromMaintenance,
    mapMaintenancePaymentToContaStatus,
} from '../src/common/truck-maintenance-conta-pagar.util';
import { ContaPagarStatus } from '@prisma/client';

let passed = 0;
let failed = 0;

function assert(cond: boolean, name: string, detail?: string) {
    if (cond) {
        passed++;
        console.log(`  OK  ${name}`);
    } else {
        failed++;
        console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
    }
}

console.log('\n=== Manutenção carreta → Contas a pagar — verify ===\n');

assert(mapMaintenancePaymentToContaStatus('paga') === ContaPagarStatus.paga, 'map paga');
assert(mapMaintenancePaymentToContaStatus('pago') === ContaPagarStatus.paga, 'map pago → paga');
assert(mapMaintenancePaymentToContaStatus('pendente') === ContaPagarStatus.pendente, 'map pendente');
assert(mapMaintenancePaymentToContaStatus('vencido') === ContaPagarStatus.vencida, 'map vencido → vencida');

const obs = buildContaObservacoesFromMaintenance({
    maintenanceId: 'maint-1',
    fornecedor: 'Posto BR',
    responsavel: 'Flavio',
    observacoes: 'Troca de óleo',
});
assert(obs.includes('truckMaintenanceId:maint-1'), 'obs truckMaintenanceId');
assert(obs.includes('fornecedor=Posto BR'), 'fornecedor nas observações (não coluna)');
assert(!obs.includes('fornecedor:'), 'sem chave prisma inválida');

type MockConta = {
    id: string;
    tipo_conta: string;
    valor: number;
    status: string;
    cidade?: string | null;
    observacoes: string | null;
    active: boolean;
};

const state = { contas: [] as MockConta[] };
const prisma = {
    truckMaintenance: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({
            id: 'maint-x',
            ...data,
        }),
        update: async () => ({}),
    },
    truck: { update: async () => ({}) },
    contaPagar: {
        create: async ({ data }: { data: Omit<MockConta, 'id'> }) => {
            if ('fornecedor' in data) {
                throw new Error('Unknown arg `fornecedor` on contas_pagar.create');
            }
            const row = { id: 'conta-1', ...data, active: true };
            state.contas.push(row);
            return row;
        },
    },
};

(async () => {
    const valor = 200;
    const maintenance = await prisma.truckMaintenance.create({
        data: {
            truckId: 'truck-1',
            tipo: 'preventiva',
            titulo: 'Troca de Óleo',
            status: 'em_andamento',
            custoReal: valor,
        },
    });
    const cidade = 'São Luís — MA';
    const conta = await prisma.contaPagar.create({
        data: {
            tipo_conta: 'manutencao',
            tipo_espontaneo: 'preventiva',
            descricao: `[MANUTENÇÃO] Troca de Óleo — carreta 3`,
            valor,
            data_vencimento: new Date('2026-05-19'),
            status: mapMaintenancePaymentToContaStatus('pendente'),
            recorrente: false,
            cidade,
            observacoes: buildContaObservacoesFromMaintenance({
                maintenanceId: maintenance.id,
                fornecedor: 'Posto BR',
                responsavel: 'Flavio',
            }),
        },
    });
    assert(conta.cidade === cidade, 'conta cidade preenchida');
    assert(conta.tipo_conta === 'manutencao', 'conta tipo manutencao');
    assert(conta.valor === 200, 'conta valor 200');
    assert(conta.status === 'pendente', 'conta pendente');

    console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===\n`);
    process.exit(failed > 0 ? 1 : 0);
})();
