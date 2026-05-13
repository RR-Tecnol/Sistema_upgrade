/**
 * reset-db.ts — Limpa TODAS as tabelas em ordem segura (respeita FK)
 * Execute: npx tsx prisma/reset-db.ts
 */
import { PrismaClient } from '@prisma/client';
import process from 'process';
const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  RESET DO BANCO — apagando todos os dados...');

    // Ordem: filhos antes dos pais (respeita FK constraints)
    await prisma.auditLog.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.userPreferences.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.dataDeletionRequest.deleteMany();
    await prisma.apiKey.deleteMany();

    await prisma.teacherCheckin.deleteMany();
    await prisma.employeeAttendance.deleteMany();
    await prisma.absence.deleteMany();
    await prisma.reimbursement.deleteMany();

    await prisma.driverLocation.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.trip.deleteMany();

    await prisma.truckMaintenance.deleteMany();

    await prisma.attendanceJustification.deleteMany();
    await prisma.attendance.deleteMany();

    try { await (prisma as any).courseFeedback.deleteMany(); } catch {}
    await prisma.certificate.deleteMany();
    await prisma.enrollmentDocument.deleteMany();
    await prisma.enrollmentConsent.deleteMany();
    await prisma.enrollment.deleteMany();

    await prisma.classHoliday.deleteMany();
    await prisma.classTeacher.deleteMany();
    await prisma.classSchedule.deleteMany().catch(() => {});
    await prisma.materialComment.deleteMany().catch(() => {});
    await prisma.material.deleteMany();
    await prisma.class.deleteMany();

    await prisma.acaoCusto.deleteMany();
    await prisma.acaoEquipe.deleteMany();
    await prisma.acaoFuncionario.deleteMany();
    await prisma.acaoTurma.deleteMany();
    await prisma.acao.deleteMany();
    await prisma.contaPagar.deleteMany();

    await prisma.studentProfessional.deleteMany();
    await prisma.studentSocioeconomic.deleteMany();
    await prisma.studentAddress.deleteMany();
    await prisma.studentContact.deleteMany();
    await prisma.student.deleteMany();

    await prisma.teacherCourse.deleteMany().catch(() => {});
    await prisma.teacher.deleteMany();

    await prisma.employee.deleteMany();

    await prisma.certificateTemplateVersion.deleteMany().catch(() => {});
    await prisma.certificateTemplate.deleteMany().catch(() => {});

    // Tokens e solicitações de cadastro de funcionários (FK para User)
    try { await (prisma as any).employeeRegistrationRequest.deleteMany(); } catch {}
    try { await (prisma as any).employeeRegistrationToken.deleteMany(); } catch {}

    await prisma.user.deleteMany();

    await prisma.truck.deleteMany();
    await prisma.courseModule.deleteMany().catch(() => {});
    await prisma.course.deleteMany();
    await prisma.city.deleteMany();
    await prisma.group.deleteMany();
    await prisma.institution.deleteMany();
    await prisma.systemConfig.deleteMany().catch(() => {});

    console.log('✅ Banco limpo! Agora rode: npx tsx prisma/seed-full.ts');
}

main()
    .catch(e => { console.error('❌', e?.message ?? e); process.exit(1); })
    .finally(() => prisma.$disconnect());
