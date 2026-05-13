import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    await prisma.$executeRaw`DELETE FROM "course_feedbacks"`;
    await prisma.$executeRaw`DELETE FROM "certificates"`;
    const templates = await prisma.certificateTemplate.findMany();
    for (const t of templates) {
        if (!t.key || !t.key.includes('Molde Mestre')) {
            await prisma.certificateTemplateVersion.deleteMany({ where: { templateId: t.id }});
            await prisma.certificateTemplate.delete({ where: { id: t.id } });
        }
    }
    console.log('Deleted templates');
}

main().catch(console.error).finally(() => prisma.$disconnect());
