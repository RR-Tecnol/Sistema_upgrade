const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const joao = await prisma.user.findFirst({
    where: { name: { contains: 'João' } },
    include: { employee: true }
  });
  console.log('Joao User:', joao?.id, joao?.name);
  if (joao) {
    const trips = await prisma.trip.findMany({
      where: { driverUserId: joao.id },
      include: { truck: true }
    });
    console.log('Trips:', JSON.stringify(trips, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
