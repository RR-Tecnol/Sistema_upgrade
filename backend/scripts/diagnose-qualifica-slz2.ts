/**
 * Diagnóstico: QUALIFICA-SLZ-2 → vínculos professor/motorista → portais.
 * Uso: cd backend && npx ts-node -r tsconfig-paths/register scripts/diagnose-qualifica-slz2.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MARIA_USER = '21c3d311-9147-48a5-a66b-d263df569c17';
const JOAO_USER = '5d855437-7505-42ff-a8b6-82ea4892b405';

async function main() {
    const acoes = await prisma.acao.findMany({
        where: { nome: { contains: 'QUALIFICA-SLZ', mode: 'insensitive' } },
        include: {
            turmas: {
                include: {
                    turma: {
                        include: {
                            course: { select: { id: true, name: true } },
                            city: { select: { name: true, state: true } },
                            truck: { select: { id: true, identifier: true } },
                            schedules: { where: { active: true } },
                            teachers: {
                                include: {
                                    teacher: {
                                        include: { user: { select: { id: true, name: true } } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            funcionarios: {
                include: {
                    employee: { select: { id: true, name: true, role: true, userId: true } },
                },
            },
            equipe: {
                include: { user: { select: { id: true, name: true, role: true } } },
            },
            _count: { select: { equipe: true, funcionarios: true, turmas: true } },
        },
    });

    if (!acoes.length) {
        console.log('❌ Nenhuma ação com nome contendo QUALIFICA-SLZ');
        const similar = await prisma.acao.findMany({
            where: { nome: { contains: 'SLZ', mode: 'insensitive' } },
            select: { id: true, nome: true, status: true },
            take: 10,
        });
        console.log('Ações com SLZ no nome:', similar);
        return;
    }

    for (const acao of acoes) {
        console.log('\n' + '='.repeat(72));
        console.log(`AÇÃO: ${acao.nome} (${acao.id})`);
        console.log(`Status: ${acao.status} | ${acao.dataInicio.toISOString().slice(0, 10)} → ${acao.dataFim.toISOString().slice(0, 10)}`);
        console.log(`Carreta período: ${acao.carretaId ?? '—'}`);
        console.log(`Contagens DB: equipe=${acao._count.equipe} | funcionarios=${acao._count.funcionarios} | turmas=${acao._count.turmas}`);

        console.log('\n--- Turmas vinculadas ---');
        for (const at of acao.turmas) {
            const t = at.turma;
            if (!t) continue;
            console.log(`  • ${t.classIdentifier} | status=${t.status} | course=${t.course?.name}`);
            console.log(`    truck=${t.truck?.identifier ?? 'SEM CARRETA'} | schedules ativos=${t.schedules.length}`);
            console.log(`    teachers ClassTeacher: ${t.teachers.map(ct => ct.teacher?.user?.name).filter(Boolean).join(', ') || '—'}`);
        }

        console.log('\n--- AcaoFuncionario (aba Equipe e diárias) ---');
        for (const f of acao.funcionarios) {
            console.log(
                `  • ${f.employee.name} (${f.employee.role}) userId=${f.employee.userId ?? 'SEM LOGIN'} dias=${f.diasTrabalhados}`,
            );
        }

        console.log('\n--- AcaoEquipe (contador header "X equipe") ---');
        for (const e of acao.equipe) {
            console.log(`  • ${e.user.name} (${e.funcao}) userId=${e.user.id}`);
        }

        for (const turmaLink of acao.turmas) {
            const classId = turmaLink.turmaId;
            const t = turmaLink.turma;
            if (!t) continue;

            console.log(`\n--- Viagens (Trip) turma ${t.classIdentifier} ---`);
            const trips = await prisma.trip.findMany({
                where: { classId },
                select: {
                    id: true,
                    driverUserId: true,
                    status: true,
                    departureDate: true,
                    notes: true,
                    driverName: true,
                },
                orderBy: { departureDate: 'asc' },
                take: 5,
            });
            const tripCount = await prisma.trip.count({ where: { classId } });
            console.log(`  Total trips classId=${classId}: ${tripCount}`);
            for (const tr of trips) {
                console.log(
                    `    ${tr.departureDate.toISOString().slice(0, 10)} ${tr.status} driver=${tr.driverName} (${tr.driverUserId})`,
                );
            }
            if (tripCount > 5) console.log(`    ... +${tripCount - 5} mais`);

            const joaoTrips = await prisma.trip.count({
                where: { classId, driverUserId: JOAO_USER },
            });
            console.log(`  Trips do João nesta turma: ${joaoTrips}`);
        }
    }

    console.log('\n' + '='.repeat(72));
    console.log('PORTAL PROFESSOR — Maria (dashboard filtra status IN_PROGRESS)');
    const mariaClasses = await prisma.class.findMany({
        where: { teachers: { some: { teacher: { userId: MARIA_USER } } } },
        select: {
            classIdentifier: true,
            status: true,
            course: { select: { name: true } },
        },
    });
    console.log('Turmas com ClassTeacher para Maria:', mariaClasses);
    const mariaActive = mariaClasses.filter(c => c.status === 'IN_PROGRESS');
    console.log('→ Visíveis no dashboard (IN_PROGRESS):', mariaActive);

    console.log('\nPORTAL MOTORISTA — João (todas trips driverUserId)');
    const joaoAllTrips = await prisma.trip.groupBy({
        by: ['classId', 'status'],
        where: { driverUserId: JOAO_USER },
        _count: true,
    });
    console.log(joaoAllTrips);
    const joaoClasses = await prisma.class.findMany({
        where: {
            OR: [
                { trips: { some: { driverUserId: JOAO_USER } } },
            ],
        },
        select: { classIdentifier: true, status: true },
    });
    console.log('Turmas com alguma trip do João:', joaoClasses);

    const infClass = await prisma.class.findFirst({
        where: { classIdentifier: { contains: 'INF-SLZ', mode: 'insensitive' } },
        include: { schedules: { where: { active: true } } },
    });
    const fddClass = await prisma.class.findFirst({
        where: { classIdentifier: { contains: 'FDD', mode: 'insensitive' } },
        include: { schedules: { where: { active: true } } },
    });
    console.log('\nComparativo turmas seed vs nova:');
    if (infClass) {
        console.log(`  INF: status=${infClass.status} truckId=${infClass.truckId} schedules=${infClass.schedules.length}`);
    }
    if (fddClass) {
        console.log(`  FDD: status=${fddClass.status} truckId=${fddClass.truckId} schedules=${fddClass.schedules.length}`);
    }

    console.log('\n' + '='.repeat(72));
    console.log('DUPLICATAS — funcionários / usuários com mesmo nome');
    for (const name of ['Maria Silva', 'João Batista', 'Paulo Ramos']) {
        const emps = await prisma.employee.findMany({
            where: { name: { contains: name, mode: 'insensitive' } },
            select: { id: true, name: true, userId: true, role: true, email: true },
        });
        const users = await prisma.user.findMany({
            where: { name: { contains: name, mode: 'insensitive' } },
            select: { id: true, name: true, email: true, role: true },
        });
        console.log(`\n${name}:`);
        console.log('  employees:', emps);
        console.log('  users:', users);
    }

    const fddId = fddClass?.id;
    if (fddId) {
        const ct = await prisma.classTeacher.findMany({
            where: { classId: fddId },
            include: {
                teacher: { include: { user: { select: { id: true, name: true, email: true } } } },
            },
        });
        console.log('\nClassTeacher na turma FDD:');
        for (const row of ct) {
            console.log(`  teacherId=${row.teacherId} userId=${row.teacher.userId} name=${row.teacher.user?.name} email=${row.teacher.user?.email}`);
        }
    }

    console.log('\nLogin seed vs vínculo período (Maria / João):');
    console.log(`  Seed Maria userId=${MARIA_USER} → teacher?`, await prisma.teacher.findFirst({ where: { userId: MARIA_USER }, select: { id: true } }));
    console.log(`  Seed João userId=${JOAO_USER} → trips count`, await prisma.trip.count({ where: { driverUserId: JOAO_USER } }));
    const acaoMariaUser = acoes[0]?.funcionarios.find(f => f.employee.name.includes('Maria'))?.employee.userId;
    const acaoJoaoUser = acoes[0]?.funcionarios.find(f => f.employee.name.includes('João'))?.employee.userId;
    if (acaoMariaUser) {
        console.log(`  Período Maria userId=${acaoMariaUser} → ClassTeacher FDD?`,
            fddId ? await prisma.classTeacher.count({ where: { classId: fddId, teacher: { userId: acaoMariaUser } } }) : 0);
        console.log(`  Período Maria → turmas IN_PROGRESS dashboard:`,
            await prisma.class.count({ where: { status: 'IN_PROGRESS', teachers: { some: { teacher: { userId: acaoMariaUser } } } } }));
    }
    if (acaoJoaoUser) {
        console.log(`  Período João userId=${acaoJoaoUser} → trips total`, await prisma.trip.count({ where: { driverUserId: acaoJoaoUser } }));
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
