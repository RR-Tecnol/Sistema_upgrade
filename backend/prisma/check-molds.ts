import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const templates = await prisma.certificateTemplate.findMany({ include: { versions: true } });
    console.log(JSON.stringify(templates, null, 2));
}
main().finally(()=>prisma.$disconnect());
