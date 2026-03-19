/**
 * seed-mega.ts — Dados ADICIONAIS para demo completo
 *
 * Adiciona ao banco (complementa seed-demo.ts + seed-final.ts):
 *   - Frequências registradas para João em T001-MA-2026 (via Attendance)
 *   - Notificações de exemplo para admin, João e Maria
 *   - Histórico de manutenção para a carreta BJK-2580
 *   - Mais feriados nacionais 2026 para T001-MA-2026
 *
 * Rodar: npx ts-node prisma/seed-mega.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Iniciando seed-mega...');

    // Buscar dados base
    const adminUser = await prisma.user.findFirst({ where: { email: 'admin@qualifica.com' } });
    const joaoUser  = await prisma.user.findFirst({ where: { email: 'joao@qualifica.com' } });
    const mariaUser = await prisma.user.findFirst({ where: { email: 'maria@qualifica.com' } });
    const turma1    = await prisma.class.findFirst({ where: { classIdentifier: 'T001-MA-2026' } });

    if (!adminUser) {
        console.error('❌ Admin não encontrado — rode seed-demo.ts primeiro!');
        process.exit(1);
    }

    // ─── 1. FREQUÊNCIAS DO JOÃO ──────────────────────────────────────────────
    if (joaoUser && turma1) {
        const joaoStudent = await prisma.student.findFirst({ where: { userId: joaoUser.id } });
        if (joaoStudent) {
            // 13 aulas nas últimas 3 semanas (lun-sex)
            const aulasDates = [
                '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06',
                '2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13',
                '2026-03-16', '2026-03-17', '2026-03-18',
            ];
            // Presença: 11 presenças / 2 faltas = 84%
            const presencas: boolean[] = [
                true, true, true, false, true,
                true, true, false, true, true,
                true, true, true,
            ];

            let created = 0;
            for (let i = 0; i < aulasDates.length; i++) {
                const dateObj = new Date(aulasDates[i] + 'T12:00:00.000Z');
                const exists = await prisma.attendance.findFirst({
                    where: { classId: turma1.id, studentId: joaoStudent.id, date: dateObj },
                });
                if (!exists) {
                    await prisma.attendance.create({
                        data: {
                            classId: turma1.id,
                            studentId: joaoStudent.id,
                            date: dateObj,
                            present: presencas[i],
                            registeredBy: adminUser.id,
                        },
                    });
                    created++;
                }
            }
            console.log(`✅ ${created} registros de frequência do João criados (11 presentes, 2 ausentes)`);
        }
    }

    // ─── 2. NOTIFICAÇÕES ─────────────────────────────────────────────────────
    // Admin
    const notifAdmin = [
        {
            userId: adminUser.id,
            type: 'ENROLLMENT_RECEIVED' as const,
            title: 'Nova inscrição recebida',
            message: 'Ana Paula Oliveira se inscreveu para Marketing Digital — Rio Branco AC.',
            channel: 'IN_APP' as const,
        },
        {
            userId: adminUser.id,
            type: 'GENERAL_ANNOUNCEMENT' as const,
            title: 'Sistema atualizado v2.1.0',
            message: 'Novidades: frequência digital, relatórios PDF e manutenção de carreta.',
            channel: 'IN_APP' as const,
            readAt: new Date(),
        },
    ];
    for (const n of notifAdmin) {
        const exists = await prisma.notification.findFirst({
            where: { userId: n.userId, title: n.title },
        });
        if (!exists) await prisma.notification.create({ data: n });
    }
    console.log('✅ Notificações admin criadas');

    // João (aluno)
    if (joaoUser) {
        const notifJoao = [
            {
                userId: joaoUser.id,
                type: 'ENROLLMENT_APPROVED' as const,
                title: 'Matrícula confirmada!',
                message: 'Sua matrícula na turma T001-MA-2026 foi confirmada. Boas vindas!',
                channel: 'IN_APP' as const,
                readAt: new Date(),
            },
            {
                userId: joaoUser.id,
                type: 'CLASS_REMINDER' as const,
                title: 'Lembrete: aula amanhã',
                message: 'Você tem Informática Básica amanhã às 08h.',
                channel: 'IN_APP' as const,
            },
        ];
        for (const n of notifJoao) {
            const exists = await prisma.notification.findFirst({ where: { userId: n.userId, title: n.title } });
            if (!exists) await prisma.notification.create({ data: n });
        }
        console.log('✅ Notificações do João criadas');
    }

    // Maria (professora)
    if (mariaUser) {
        const exists = await prisma.notification.findFirst({
            where: { userId: mariaUser.id, title: 'Nova frequência pendente' },
        });
        if (!exists) {
            await prisma.notification.create({
                data: {
                    userId: mariaUser.id,
                    type: 'GENERAL_ANNOUNCEMENT' as const,
                    title: 'Nova frequência pendente',
                    message: 'Há registros de frequência pendentes para a turma T001-MA-2026.',
                    channel: 'IN_APP' as const,
                },
            });
            console.log('✅ Notificação da Maria criada');
        }
    }

    // ─── 3. HISTÓRICO MANUTENÇÃO CARRETA (TruckMaintenance) ─────────────────
    const carreta = await prisma.truck.findFirst({ where: { licensePlate: 'BJK-2580' } });
    if (carreta) {
        const manuts = [
            {
                truckId: carreta.id,
                tipo: 'preventiva',
                titulo: 'Troca de óleo motor — 40.000 km',
                descricao: 'Shell Rimula R4 15W40 + filtro de óleo novo.',
                status: 'concluida',
                prioridade: 'media',
                custoReal: 280.00,
                dataAgendada: new Date('2026-02-10T08:00:00Z'),
                dataConclusao: new Date('2026-02-10T11:30:00Z'),
            },
            {
                truckId: carreta.id,
                tipo: 'pneu',
                titulo: 'Troca pneu traseiro esquerdo',
                descricao: 'Desgaste acima de 80% — pneu Pirelli 295/80 R22.5.',
                status: 'concluida',
                prioridade: 'alta',
                custoReal: 950.00,
                dataAgendada: new Date('2026-02-28T07:00:00Z'),
                dataConclusao: new Date('2026-02-28T14:00:00Z'),
            },
            {
                truckId: carreta.id,
                tipo: 'revisao',
                titulo: 'Revisão geral programada 50.000 km',
                descricao: 'Verificação de freios, filtros, lubrificação geral e ajuste de direção.',
                status: 'agendada',
                prioridade: 'media',
                custoEstimado: 680.00,
                dataAgendada: new Date('2026-04-15T08:00:00Z'),
            },
        ];

        for (const m of manuts) {
            const exists = await prisma.truckMaintenance.findFirst({
                where: { truckId: carreta.id, titulo: m.titulo },
            });
            if (!exists) {
                await prisma.truckMaintenance.create({
                    data: {
                        truckId: m.truckId,
                        tipo: m.tipo,
                        titulo: m.titulo,
                        descricao: m.descricao,
                        status: m.status,
                        prioridade: m.prioridade,
                        custoReal: (m as any).custoReal ?? null,
                        custoEstimado: (m as any).custoEstimado ?? null,
                        dataAgendada: m.dataAgendada,
                        dataConclusao: (m as any).dataConclusao ?? null,
                    },
                });
            }
        }
        console.log('✅ 3 registros de manutenção da carreta criados (2 concluídas + 1 agendada)');
    } else {
        console.log('ℹ️  Carreta BJK-2580 não encontrada — pulando manutenções');
    }

    // ─── 4. MAIS FERIADOS NACIONAIS 2026 ─────────────────────────────────────
    if (turma1 && adminUser) {
        const feriados2026 = [
            { date: new Date('2026-04-21T12:00:00Z'), reason: 'Feriado Nacional — Tiradentes' },
            { date: new Date('2026-05-01T12:00:00Z'), reason: 'Feriado Nacional — Dia do Trabalho' },
            { date: new Date('2026-06-04T12:00:00Z'), reason: 'Feriado Nacional — Corpus Christi' },
            { date: new Date('2026-09-07T12:00:00Z'), reason: 'Feriado Nacional — Independência do Brasil' },
            { date: new Date('2026-10-12T12:00:00Z'), reason: 'Feriado Nacional — Nossa Sra. Aparecida' },
            { date: new Date('2026-11-02T12:00:00Z'), reason: 'Feriado Nacional — Finados' },
        ];

        let feriadosCriados = 0;
        for (const f of feriados2026) {
            const exists = await prisma.classHoliday.findFirst({
                where: { classId: turma1.id, reason: f.reason },
            });
            if (!exists) {
                await prisma.classHoliday.create({
                    data: { classId: turma1.id, date: f.date, reason: f.reason, registeredBy: adminUser.id, active: true },
                });
                feriadosCriados++;
            }
        }
        console.log(`✅ ${feriadosCriados} feriados nacionais 2026 criados para T001-MA-2026`);
    }

    console.log('\n🎉 seed-mega concluído!');
    console.log('═══════════════════════════════════════════════════');
    console.log('  Frequências: 13 registros do João (84% presença)');
    console.log('  Notificações: 2 admin + 2 João + 1 Maria');
    console.log('  Manutenção: 3 registros da carreta');
    console.log('  Feriados: 6 nacionais 2026 para T001-MA-2026');
    console.log('═══════════════════════════════════════════════════');
}

main()
    .catch((e) => { console.error('❌ Erro no seed-mega:', e.message || e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
