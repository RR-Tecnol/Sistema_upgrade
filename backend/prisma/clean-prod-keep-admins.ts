/**
 * clean-prod-keep-admins.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Script de limpeza do banco de produção do Sistema Upgrade.
 *
 * PRESERVA:  Usuários com role ADMIN, IT_ADMIN (e os 3 e-mails listados)
 * APAGA:     Todos os dados de alunos, turmas, funcionários, certificados,
 *            feedbacks, reembolsos, movimentos de estoque, etc.
 * NÃO TOCA:  systemConfig, institution, apiKey
 *
 * USO:
 *   npx tsx prisma/clean-prod-keep-admins.ts
 *
 * ⚠️  IRREVERSÍVEL — garanta backup antes de executar!
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

// E-mails dos ADMs confirmados que devem ser PRESERVADOS
const ADMIN_EMAILS_TO_KEEP = [
    'joaogabrieldiniz23@gmail.com',
    'lucasjansen2022@hotmail.com',
    'robertspimenetel@gmail.com',
];

const ADMIN_ROLES_TO_KEEP = ['ADMIN', 'IT_ADMIN'];

// ─── Utilitários ─────────────────────────────────────────────────────────────

function hr() {
    console.log('─'.repeat(60));
}

async function ask(question: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

async function del(label: string, fn: () => Promise<{ count: number }>) {
    const result = await fn();
    if (result.count > 0) {
        console.log(`  ✅ ${label}: ${result.count} registro(s) removido(s)`);
    }
    return result.count;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║        LIMPEZA DO BANCO DE PRODUÇÃO — SISTEMA UPGRADE    ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');

    // ── 1. Identificar ADMs a preservar ──────────────────────────────────────
    const adminsByEmail = await prisma.user.findMany({
        where: { email: { in: ADMIN_EMAILS_TO_KEEP } },
        select: { id: true, name: true, email: true, role: true },
    });

    const adminsByRole = await prisma.user.findMany({
        where: {
            role: { in: ADMIN_ROLES_TO_KEEP as any },
            email: { notIn: ADMIN_EMAILS_TO_KEEP },
        },
        select: { id: true, name: true, email: true, role: true },
    });

    const allAdminsToKeep = [...adminsByEmail, ...adminsByRole];
    const adminIdsToKeep = allAdminsToKeep.map(u => u.id);

    // Total de usuários não-ADM que serão deletados
    const totalUsers = await prisma.user.count();
    const totalToDelete = totalUsers - allAdminsToKeep.length;

    console.log('📋 USUÁRIOS QUE SERÃO PRESERVADOS:');
    hr();
    for (const u of allAdminsToKeep) {
        const marker = ADMIN_EMAILS_TO_KEEP.includes(u.email) ? '⭐' : '🔐';
        console.log(`  ${marker} ${u.name} (${u.email}) — ${u.role}`);
    }

    if (adminsByEmail.length < ADMIN_EMAILS_TO_KEEP.length) {
        console.log('');
        console.log('⚠️  ATENÇÃO: Nem todos os e-mails foram encontrados no banco:');
        const foundEmails = adminsByEmail.map(u => u.email);
        for (const email of ADMIN_EMAILS_TO_KEEP) {
            if (!foundEmails.includes(email)) {
                console.log(`  ❌ Não encontrado: ${email}`);
            }
        }
    }

    hr();
    console.log('');
    console.log('🗑️  O QUE SERÁ APAGADO:');
    console.log(`  • Todos os ${totalToDelete} usuário(s) não-ADM`);
    console.log('  • Alunos, inscrições, frequências, certificados');
    console.log('  • Feedbacks, reembolsos, imprevistos');
    console.log('  • Turmas, cursos, grupos, cidades, carretas, viagens');
    console.log('  • Estoque e movimentações financeiras');
    console.log('  • Tokens de cadastro de funcionários');
    console.log('  • Notificações e refresh tokens');
    console.log('');
    console.log('✅ O QUE NÃO SERÁ TOCADO:');
    console.log('  • Os ADMs listados acima');
    console.log('  • Configurações do sistema (systemConfig, institution, apiKey)');
    console.log('');

    hr();
    const confirm = await ask('⚠️  OPERAÇÃO IRREVERSÍVEL. Digite CONFIRMAR para prosseguir: ');
    if (confirm.trim() !== 'CONFIRMAR') {
        console.log('');
        console.log('❌ Operação cancelada pelo usuário.');
        await prisma.$disconnect();
        process.exit(0);
    }

    console.log('');
    console.log('🚀 Iniciando limpeza...');
    hr();

    let totalDeleted = 0;

    // ── 2. Dados dependentes (sem FK para cima) ───────────────────────────────

    // Notificações
    totalDeleted += await del('Notifications', () => prisma.notification.deleteMany({
        where: { userId: { notIn: adminIdsToKeep } },
    }));

    // Refresh tokens
    totalDeleted += await del('RefreshTokens', () => prisma.refreshToken.deleteMany({
        where: { userId: { notIn: adminIdsToKeep } },
    }));

    // Audit logs de usuários não-ADM
    totalDeleted += await del('AuditLogs (non-admin)', () => prisma.auditLog.deleteMany({
        where: { userId: { notIn: adminIdsToKeep } },
    }));

    // ── 3. CourseFeedback e Certificates ─────────────────────────────────────

    // Apagar feedbacks (depende de certificate, student, class)
    totalDeleted += await del('CourseFeedbacks', () => prisma.courseFeedback.deleteMany({}));

    // Apagar certificados
    totalDeleted += await del('Certificates', () => prisma.certificate.deleteMany({}));

    // ── 4. Attendance e Enrollment ────────────────────────────────────────────

    totalDeleted += await del('AttendanceJustifications', () =>
        (prisma as any).attendanceJustification?.deleteMany({}).catch(() => ({ count: 0 })) ?? Promise.resolve({ count: 0 })
    );

    totalDeleted += await del('Attendances', () => prisma.attendance.deleteMany({}));

    totalDeleted += await del('EnrollmentDocuments', () =>
        (prisma as any).enrollmentDocument?.deleteMany({}).catch(() => ({ count: 0 })) ?? Promise.resolve({ count: 0 })
    );

    totalDeleted += await del('EnrollmentConsents', () => prisma.enrollmentConsent.deleteMany({}));

    totalDeleted += await del('StudentLegalConsents', () => prisma.studentLegalConsent.deleteMany({}));

    totalDeleted += await del('Enrollments', () => prisma.enrollment.deleteMany({}));

    // ── 5. Reimbursement / Absence ────────────────────────────────────────────

    totalDeleted += await del('Reimbursements', () => prisma.reimbursement.deleteMany({}));

    totalDeleted += await del('Absences', () => prisma.absence.deleteMany({}));

    // ── 6. Student e dados relacionados ──────────────────────────────────────

    totalDeleted += await del('StudentProfessionals', () => prisma.studentProfessional.deleteMany({}));
    totalDeleted += await del('StudentSocioeconomics', () => prisma.studentSocioeconomic.deleteMany({}));
    totalDeleted += await del('StudentAddresses', () => prisma.studentAddress.deleteMany({}));
    totalDeleted += await del('StudentContacts', () => prisma.studentContact.deleteMany({}));
    totalDeleted += await del('Students', () => prisma.student.deleteMany({}));

    // ── 7. Employee / Teacher / Driver tokens ────────────────────────────────

    totalDeleted += await del('EmployeeRegistrationRequests', () =>
        (prisma as any).employeeRegistrationRequest?.deleteMany({}).catch(() => ({ count: 0 })) ?? Promise.resolve({ count: 0 })
    );

    totalDeleted += await del('EmployeeRegistrationTokens', () =>
        (prisma as any).employeeRegistrationToken?.deleteMany({}).catch(() => ({ count: 0 })) ?? Promise.resolve({ count: 0 })
    );

    totalDeleted += await del('Teachers', () =>
        (prisma as any).teacher?.deleteMany({}).catch(() => ({ count: 0 })) ?? Promise.resolve({ count: 0 })
    );

    totalDeleted += await del('Employees', () =>
        (prisma as any).employee?.deleteMany({
            where: { userId: { notIn: adminIdsToKeep } },
        }).catch(() => ({ count: 0 })) ?? Promise.resolve({ count: 0 })
    );

    // ── 8. Classes e Courses ─────────────────────────────────────────────────

    totalDeleted += await del('ClassSchedules', () =>
        (prisma as any).classSchedule?.deleteMany({}).catch(() => ({ count: 0 })) ?? Promise.resolve({ count: 0 })
    );

    totalDeleted += await del('Classes', () => prisma.class.deleteMany({}));

    totalDeleted += await del('Courses', () => prisma.course.deleteMany({}));

    // ── 9. Stock / Estoque ────────────────────────────────────────────────────

    totalDeleted += await del('StockPurchaseRequests', () =>
        (prisma as any).stockPurchaseRequest?.deleteMany({}).catch(() => ({ count: 0 })) ?? Promise.resolve({ count: 0 })
    );

    totalDeleted += await del('StockMovements', () =>
        (prisma as any).stockMovement?.deleteMany({}).catch(() => ({ count: 0 })) ?? Promise.resolve({ count: 0 })
    );

    totalDeleted += await del('TruckStockItems', () =>
        (prisma as any).truckStockItem?.deleteMany({}).catch(() => ({ count: 0 })) ?? Promise.resolve({ count: 0 })
    );

    totalDeleted += await del('StockItems', () =>
        (prisma as any).stockItem?.deleteMany({}).catch(() => ({ count: 0 })) ?? Promise.resolve({ count: 0 })
    );

    // ── 10. Financeiro ────────────────────────────────────────────────────────

    totalDeleted += await del('ContasPagar', () => prisma.contaPagar.deleteMany({}));

    totalDeleted += await del('Expenses', () =>
        (prisma as any).expense?.deleteMany({}).catch(() => ({ count: 0 })) ?? Promise.resolve({ count: 0 })
    );

    // ── 11. Trips / Trucks / Maintenance ─────────────────────────────────────

    totalDeleted += await del('DriverLocations', () =>
        (prisma as any).driverLocation?.deleteMany({}).catch(() => ({ count: 0 })) ?? Promise.resolve({ count: 0 })
    );

    totalDeleted += await del('Trips', () => prisma.trip.deleteMany({}));

    totalDeleted += await del('TruckMaintenances', () =>
        (prisma as any).truckMaintenance?.deleteMany({}).catch(() => ({ count: 0 })) ?? Promise.resolve({ count: 0 })
    );

    totalDeleted += await del('Trucks', () => prisma.truck.deleteMany({}));

    // ── 12. Ações / Groups / Cities ───────────────────────────────────────────

    totalDeleted += await del('Acoes', () => (prisma as any).acao?.deleteMany({}).catch(() => ({ count: 0 })) ?? Promise.resolve({ count: 0 }));

    totalDeleted += await del('Groups', () => prisma.group.deleteMany({}));

    totalDeleted += await del('Cities', () => prisma.city.deleteMany({}));

    // ── 13. Usuários não-ADM ──────────────────────────────────────────────────

    totalDeleted += await del('Users (non-admin)', () => prisma.user.deleteMany({
        where: { id: { notIn: adminIdsToKeep } },
    }));

    // ── 14. Resumo ────────────────────────────────────────────────────────────

    hr();
    console.log('');
    console.log(`🎉 Limpeza concluída! Total de registros removidos: ${totalDeleted}`);
    console.log('');
    console.log('📋 Usuários preservados no banco:');
    const remaining = await prisma.user.findMany({
        select: { name: true, email: true, role: true },
    });
    for (const u of remaining) {
        console.log(`  ✅ ${u.name} (${u.email}) — ${u.role}`);
    }
    console.log('');
    console.log('➡️  Próximo passo: npm run seed:prod  (se quiser recriar o IT_ADMIN padrão)');
    console.log('');

    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error('❌ Erro durante limpeza:', e);
    await prisma.$disconnect();
    process.exit(1);
});
