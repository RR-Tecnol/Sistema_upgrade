import { PrismaClient, StockItemCategory, StockMovementType, StockPurchaseRequestStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Stock Seed...');

    // 1. Get a user
    const user = await prisma.user.findFirst();
    if (!user) {
        throw new Error('Nenhum usuário encontrado no banco de dados para registrar as movimentações.');
    }
    const userId = user.id;

    // 2. Get a truck
    let truck = await prisma.truck.findFirst();
    if (!truck) {
        throw new Error('Nenhuma carreta encontrada');
    }
    
    // 3. Clear existing stock data for a clean test? (Optional, maybe just add more)
    // We will just add new ones to not destroy their real data.

    // 4. Create Stock Items
    const itemsData = [
        { nome: 'Óleo de Motor Sintético 5W40', categoria: StockItemCategory.CONSUMIVEL, unidade: 'L', preco: 45.90, min: 10, atual: 5 }, // Critical
        { nome: 'Filtro de Ar Condicionado', categoria: StockItemCategory.EQUIPAMENTO, unidade: 'Un', preco: 120.00, min: 5, atual: 20 }, // OK
        { nome: 'Pneu Continental 295/80', categoria: StockItemCategory.OUTRO, unidade: 'Un', preco: 2500.00, min: 4, atual: 4 }, // Low
        { nome: 'Papel Toalha (Fardo)', categoria: StockItemCategory.LIMPEZA, unidade: 'Fardo', preco: 35.00, min: 10, atual: 8 }, // Low
        { nome: 'Kit Cinto de Segurança', categoria: StockItemCategory.EPI, unidade: 'Kit', preco: 450.00, min: 2, atual: 1 }, // Critical
    ];

    const createdItems = [];
    for (const item of itemsData) {
        const created = await prisma.stockItem.create({
            data: {
                nome: item.nome,
                categoria: item.categoria,
                unidade: item.unidade,
                quantidadeAtual: item.atual,
                quantidadeMinima: item.min,
                precoUnitario: item.preco,
                codigoInterno: `SKU-${Math.floor(Math.random() * 10000)}`,
                active: true,
            }
        });
        createdItems.push(created);
        console.log(`📦 Created Item: ${created.nome}`);
    }

    // 5. Create Truck Stocks
    await prisma.truckStockItem.create({
        data: { truckId: truck.id, stockItemId: createdItems[0].id, quantidadeAtual: 10 }
    });
    await prisma.truckStockItem.create({
        data: { truckId: truck.id, stockItemId: createdItems[1].id, quantidadeAtual: 2 }
    });
    await prisma.truckStockItem.create({
        data: { truckId: truck.id, stockItemId: createdItems[3].id, quantidadeAtual: 5 }
    });
    console.log('🚛 Populated Truck Stock');

    // 6. Create Purchase Requests
    await prisma.stockPurchaseRequest.create({
        data: {
            stockItemId: createdItems[0].id,
            quantidade: 50,
            precoUnitario: 45.00,
            valorTotal: 2250.00,
            justificativa: 'Reposição trimestral de óleo',
            status: StockPurchaseRequestStatus.PENDENTE,
            requestedBy: userId,
            urgente: true,
            active: true
        }
    });

    await prisma.stockPurchaseRequest.create({
        data: {
            stockItemId: createdItems[4].id,
            quantidade: 10,
            precoUnitario: 450.00,
            valorTotal: 4500.00,
            justificativa: 'Renovação de EPIs',
            status: StockPurchaseRequestStatus.APROVADA,
            requestedBy: userId,
            reviewedBy: userId,
            reviewedAt: new Date(),
            active: true
        }
    });
    
    await prisma.stockPurchaseRequest.create({
        data: {
            stockItemId: createdItems[2].id,
            quantidade: 8,
            precoUnitario: 2450.00,
            valorTotal: 19600.00,
            justificativa: 'Troca de pneus frota sul',
            status: StockPurchaseRequestStatus.PENDENTE,
            requestedBy: userId,
            active: true
        }
    });
    console.log('🛒 Created Purchase Requests');

    // 7. Create Movements
    // Entrada
    await prisma.stockMovement.create({
        data: {
            type: StockMovementType.ENTRADA,
            stockItemId: createdItems[0].id,
            quantidade: 20,
            registeredBy: userId,
            toTruckId: truck.id,
        }
    });

    await prisma.stockMovement.create({
        data: {
            type: StockMovementType.ENTRADA,
            stockItemId: createdItems[1].id,
            quantidade: 5,
            registeredBy: userId,
            toTruckId: truck.id,
        }
    });

    await prisma.stockMovement.create({
        data: {
            type: StockMovementType.ENTRADA,
            stockItemId: createdItems[3].id,
            quantidade: 15,
            registeredBy: userId,
            toTruckId: truck.id,
        }
    });

    // Saída (Ação) - precisa de acaoId? Apenas nullable
    await prisma.stockMovement.create({
        data: {
            type: StockMovementType.SAIDA,
            stockItemId: createdItems[1].id,
            quantidade: 2,
            registeredBy: userId,
        }
    });

    // Ajuste
    await prisma.stockMovement.create({
        data: {
            type: StockMovementType.AJUSTE,
            stockItemId: createdItems[2].id,
            quantidade: 1,
            registeredBy: userId,
            observacao: 'Ajuste de inventário anual'
        }
    });
    console.log('↕ Created Stock Movements');

    console.log('✨ Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
