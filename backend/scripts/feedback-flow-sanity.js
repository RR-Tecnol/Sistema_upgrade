/**
 * Verificação rápida do fluxo de feedback (sem HTTP):
 * - migrações aplicadas
 * - contagens por status (incl. CONTENT_APPROVED)
 *
 * Uso: na pasta backend → node scripts/feedback-flow-sanity.js
 */
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

async function main() {
    try {
        execSync('npx prisma migrate status', { stdio: 'pipe' });
    } catch (e) {
        const out = e.stdout?.toString() || e.stderr?.toString() || String(e);
        if (out.includes('Following migration have not yet been applied')) {
            console.error('\n❌ Há migrações pendentes. Execute:\n   npx prisma migrate deploy\n');
            process.exit(1);
        }
        throw e;
    }

    const prisma = new PrismaClient();
    try {
        const statuses = ['PENDING_STUDENT_RESPONSE', 'SUBMITTED', 'CONTENT_APPROVED', 'APPROVED', 'REJECTED', 'REVERTED', 'EXPIRED'];
        const counts = {};
        for (const s of statuses) {
            counts[s] = await prisma.courseFeedback.count({ where: { active: true, status: s } });
        }
        const awaitingTriagem = counts.SUBMITTED;
        const awaitingPix = counts.CONTENT_APPROVED;
        console.log('\n✓ Prisma: migrações OK (migrate status sem pendências reportadas).\n');
        console.log('CourseFeedback por status:', counts);
        console.log('\nReferência manual E2E:');
        console.log('  Aluno: /student/feedback — preencher wizard até SUBMITTED (requer convite PENDING).');
        console.log('  Admin: /admin/feedbacks — aceitar triagem (SUBMITTED → CONTENT_APPROVED), depois Aprovar PIX.');
        console.log(`  Agora: ${awaitingTriagem} aguardando triagem, ${awaitingPix} aguardando confirmação PIX.\n`);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
