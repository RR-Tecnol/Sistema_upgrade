import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const item = await prisma.stockItem.create({
    data: {
      nome: 'Test via API',
      categoria: 'OUTRO',
      unidade: 'un',
      quantidadeAtual: 0,
      quantidadeMinima: 5,
    }
  });
  
  const pr = await prisma.stockPurchaseRequest.create({
    data: {
      stockItemId: item.id,
      quantidade: 10,
      precoUnitario: 50,
      valorTotal: 500,
      justificativa: 'Test script',
      requestedBy: (await prisma.user.findFirst())!.id
    }
  });

  console.log("PR:", pr.id)
}
main()
