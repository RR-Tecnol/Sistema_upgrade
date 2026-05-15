import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugBudget(budgetId: string) {
    const budget = await prisma.stockBudget.findUnique({
        where: { id: budgetId },
        include: { categoriaCustom: true }
    });

    if (!budget) {
        console.log('Budget not found');
        return;
    }

    console.log(`Checking Budget: ${budget.categoriaEnum || budget.categoriaCustom?.nome} (${budget.mes}/${budget.ano})`);
    console.log(`Teto: ${budget.valorTeto}`);

    const prsLinked = await prisma.stockPurchaseRequest.findMany({
        where: { stockBudgetId: budget.id, active: true, status: { in: ['PENDENTE', 'APROVADA', 'RECEBIDA'] } },
        select: { id: true, status: true, valorTotal: true, stockItemId: true }
    });

    console.log('\n--- Linked PRs ---');
    let sumLinked = 0;
    prsLinked.forEach(pr => {
        console.log(`PR ${pr.id.slice(0,8)} | Status: ${pr.status} | Valor: ${pr.valorTotal}`);
        sumLinked += Number(pr.valorTotal);
    });
    console.log(`Total Linked: ${sumLinked}`);

    const movementsUnlinked = await prisma.stockMovement.findMany({
        where: {
            type: 'ENTRADA',
            toTruckId: { not: null },
            createdAt: {
                gte: new Date(budget.ano, budget.mes - 1, 1),
                lt: new Date(budget.ano, budget.mes, 1),
            },
            stockItem: budget.categoriaEnum 
                ? { categoria: budget.categoriaEnum }
                : { customCategoryId: budget.categoriaCustomId ?? undefined },
            OR: [
                { purchaseRequestId: null },
                { purchaseRequest: { stockBudgetId: null } }
            ]
        },
        include: { stockItem: true, purchaseRequest: true }
    });

    console.log('\n--- Unlinked Movements ---');
    let sumUnlinked = 0;
    movementsUnlinked.forEach(m => {
        const preco = m.stockItem?.precoUnitario ? Number(m.stockItem.precoUnitario) : 0;
        const val = Number(m.quantidade) * preco;
        console.log(`Mov ${m.id.slice(0,8)} | Qtd: ${m.quantidade} | Preco: ${preco} | Val: ${val} | PR: ${m.purchaseRequestId?.slice(0,8) || 'NONE'}`);
        sumUnlinked += val;
    });
    console.log(`Total Unlinked: ${sumUnlinked}`);
    
    console.log(`\nGRAND TOTAL: ${sumLinked + sumUnlinked}`);
}

// Find the Água budget for May 2026
async function run() {
    const budget = await prisma.stockBudget.findFirst({
        where: { ano: 2026, mes: 5, categoriaCustom: { nome: { contains: 'Água', mode: 'insensitive' } } }
    });
    if (budget) {
        await debugBudget(budget.id);
    } else {
        console.log('No Água budget found for May 2026');
    }
    await prisma.$disconnect();
}

run();
