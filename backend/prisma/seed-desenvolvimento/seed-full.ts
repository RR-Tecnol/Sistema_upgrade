/**
 * seed-full.ts — SEED UNIFICADO v2
 * ─────────────────────────────────────────────────────────────────────────────
 * Cobre 100% das abas do sistema:
 *   Admin: Dashboard, Turmas, Alunos, Cursos, Inscrições, Frequência, Funcionários,
 *          Certificados, Carretas, Imprevistos, Reembolsos, Contas a Pagar,
 *          Feedbacks, Feriados, Histórico, Grupos, Configurações
 *   Aluno: Dashboard, Inscrições, Turmas, Frequência, Certificados, Feedback,
 *          Notificações, Imprevistos, Perfil, Hunter Profile
 *   Professor: Dashboard, Frequência, Histórico, Imprevistos, Reembolsos
 *   Motorista: Dashboard, Viagens, Rota, Veículo, Manutenção, Reembolsos, Imprevistos
 *
 * Execute:          npx tsx prisma/seed-full.ts
 * Refresh GPS:      npx tsx prisma/seed-full.ts --refresh-drivers
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CREDENCIAIS GERADAS:
 *   admin@qualifica.com            / RR@@Upgrade  (ADMIN)
 *   maria.silva@qualifica.com      / RR@@Upgrade  (TEACHER)
 *   carlos.mendes@qualifica.com    / RR@@Upgrade  (TEACHER)
 *   joao.motorista@qualifica.com   / RR@@Upgrade  (DRIVER)
 *   davi.martins@qualifica.com     / RR@@Upgrade  (STUDENT - dados completos)
 *   ana.lima@qualifica.com         / RR@@Upgrade  (STUDENT)
 *   pedro.santos@qualifica.com     / RR@@Upgrade  (STUDENT — 3 matrículas demo + 2 certificados ACTIVE após M3b)
 *   [+ 10 motoristas demo GPS]
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { PrismaClient } from '@prisma/client';
import process from 'node:process';
import { seedInfra } from './s1-infra';
import { seedPessoas } from './s2-pessoas';
import { seedOperacional } from './s3-operacional';
import { seedRastreamento, refreshDriverTimestamps } from './s4-rastreamento';
import { seedCertificateTemplatesAndPedroCerts } from './s5-certificados-demo';

const prisma = new PrismaClient();

async function main() {
    // ── Flag: só atualiza timestamps dos motoristas demo ─────────────────────
    if (process.argv.includes('--refresh-drivers')) {
        await refreshDriverTimestamps(prisma);
        return;
    }

    console.log('\n🚀 SEED UNIFICADO v2 — iniciando...');
    console.log('═'.repeat(60));

    // M1 — Infraestrutura base
    const infra = await seedInfra(prisma).catch(e => { console.error('❌ M1:', e?.message); throw e; });

    // M2 — Pessoas (professores, motorista, alunos)
    const pessoas = await seedPessoas(prisma, infra).catch(e => { console.error('❌ M2:', e?.message); throw e; });

    // M3 — Operacional (turmas, inscrições, frequências, certs, materiais, etc.)
    await seedOperacional(prisma, { ...infra, ...pessoas }).catch(e => { console.error('❌ M3:', e?.message); throw e; });

    // M3b — Modelos de certificado (molde MA/PI + 3 cursos) + 2 certificados ACTIVE para Pedro
    await seedCertificateTemplatesAndPedroCerts(prisma, {
        adminUser: infra.adminUser,
        courseMap: infra.courseMap,
        studentMap: pessoas.studentMap,
        mariaTeacherId: pessoas.mariaTeacher.id,
    }).catch(e => { console.error('❌ M3b:', e?.message); throw e; });

    // M4 — Rastreamento GPS
    await seedRastreamento(prisma, { truck1: infra.truck1, truck2: infra.truck2 }).catch(e => { console.error('❌ M4:', e?.message); throw e; });

    // ── Importar modelos de certificado (PDF em public/) ─────────────────────
    try {
        const { CertificateTemplateService } = await import('../../src/certificates/certificate-template.service');
        const svc = new CertificateTemplateService(prisma as any);
        const r = await svc.importFromPublicPdfs({ id: infra.adminUser.id, role: 'ADMIN' });
        console.log(`\n  ✅ Modelos de cert: ${r.imported} importados, ${r.skipped} sem alteração`);
    } catch (e: any) {
        console.warn('  ⚠️  Importação de modelos PDF ignorada:', e?.message);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('🎉 SEED CONCLUÍDO!\n');
    console.log('🔑 Credenciais de acesso:');
    console.log('   admin@qualifica.com           → ADMIN   (senha: RR@@Upgrade)');
    console.log('   maria.silva@qualifica.com     → TEACHER (senha: RR@@Upgrade)');
    console.log('   carlos.mendes@qualifica.com   → TEACHER (senha: RR@@Upgrade)');
    console.log('   joao.motorista@qualifica.com  → DRIVER  (senha: RR@@Upgrade)');
    console.log('   davi.martins@qualifica.com    → STUDENT (senha: RR@@Upgrade)');
    console.log('   ana.lima@qualifica.com        → STUDENT (senha: RR@@Upgrade)');
    console.log('   pedro.santos@qualifica.com    → STUDENT (senha: RR@@Upgrade)');
    console.log('\n🚛 Motoristas demo GPS (rastreamento):');
    console.log('   carlos.souza.demo@qualifica.com  → ONLINE  45% SLZ→TER');
    console.log('   marina.costa.demo@qualifica.com  → ONLINE  88% CAX→SLZ arriving_soon');
    console.log('   paulo.ramos.demo@qualifica.com   → ONLINE   8% BAR→TER iniciando');
    console.log('   diego.alves.demo@qualifica.com   → ONLINE  35% IMP→SLZ');
    console.log('   ana.lima.demo@qualifica.com      → STOPPED 30% TER→FLO long_stop');
    console.log('   fabio.nunes.demo@qualifica.com   → STOPPED 50% RBR→SNG');
    console.log('   roberto.freitas.demo@qualifica.com → OFFLINE 60% SNG→RBR no_signal');
    console.log('   lea.santos.demo@qualifica.com    → OFFLINE 75% SLZ→BAC');
    console.log('   tania.melo.demo@qualifica.com    → COMPLETED TER→PAR');
    console.log('   jonas.pires.demo@qualifica.com   → COMPLETED FLO→PIC');
    console.log('\n⏰ Antes de demonstrar o mapa de rastreamento, rode:');
    console.log('   npx tsx prisma/seed-desenvolvimento/seed-full.ts --refresh-drivers');
    console.log('═'.repeat(60) + '\n');
}

main()
    .catch(e => { console.error('❌ Erro fatal:', e?.message ?? e); process.exit(1); })
    .finally(() => prisma.$disconnect());
