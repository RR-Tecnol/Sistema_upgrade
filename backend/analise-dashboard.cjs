const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    const [enrolled, approved, pending, rejected, docPending, waitlist, certCount] = await Promise.all([
        p.enrollment.count({ where: { status: 'ENROLLED' } }),
        p.enrollment.count({ where: { status: 'APPROVED' } }),
        p.enrollment.count({ where: { status: 'PENDING' } }),
        p.enrollment.count({ where: { status: 'REJECTED' } }),
        p.enrollment.count({ where: { status: 'DOCUMENT_PENDING' } }),
        p.enrollment.count({ where: { status: 'WAITLIST' } }),
        p.certificate.count(),
    ]);

    // Aprovados por mês (últimos 12 meses)
    const enrollmentsByMonth = await p.enrollment.findMany({
        where: { createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 11)) } },
        select: { createdAt: true, status: true },
    });

    const monthMap = {};
    enrollmentsByMonth.forEach(e => {
        const key = e.createdAt.getFullYear() + '-' + String(e.createdAt.getMonth() + 1).padStart(2, '0');
        if (!monthMap[key]) monthMap[key] = { total: 0, aprovados: 0 };
        monthMap[key].total++;
        // BUG-DASH-01 FIX: contar APPROVED + ENROLLED
        if (e.status === 'APPROVED' || e.status === 'ENROLLED') monthMap[key].aprovados++;
    });

    const totalAprovados = Object.values(monthMap).reduce((sum, m) => sum + m.aprovados, 0);
    const totalGeral = Object.values(monthMap).reduce((sum, m) => sum + m.total, 0);

    console.log(JSON.stringify({
        enrollment_counts: { enrolled, approved, pending, rejected, docPending, waitlist },
        certCount,
        analytics_aprovados_sum: totalAprovados,
        analytics_total_sum: totalGeral,
        taxa_calculada_pelo_backend: totalGeral > 0 ? Math.round((totalAprovados / totalGeral) * 100) : 0,
        monthMap,
    }, null, 2));

    await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
