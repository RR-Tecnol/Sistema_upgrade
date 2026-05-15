import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const prs = await prisma.stockPurchaseRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 10 })
  console.log("PRs:", JSON.stringify(prs, null, 2))
}
main()
