/**
 * Diagnóstico / reparo: motorista ↔ período ↔ viagens.
 *
 * Uso:
 *   cd backend && npx ts-node -r tsconfig-paths/register scripts/diagnose-driver-period.ts \
 *     --email joao.motorista@qualifica.com --periodo QUALIFICA-SLZ
 *
 *   ... --repair   # ensureClassScheduleFromPolicy + syncDriverForEmployeeOnAcao
 */
import { PrismaClient, EmployeeRole } from '@prisma/client';
import { weekdaysFromClass, ensureClassScheduleFromPolicy } from '../src/common/class-schedule-from-policy.util';
import { startOfUTCDay } from '../src/common/class-teaching-days.util';
import { syncDriverForEmployeeOnAcao } from '../src/common/academic-ecosystem-sync.util';
import { TripsService } from '../src/trips/trips.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { NotificationsSenderService } from '../src/notifications/notifications-sender.service';
import { MinioService } from '../src/reimbursement/minio.service';

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : undefined;
}

const repair = process.argv.includes('--repair');

async function main() {
    const email = arg('--email');
    const periodoNome = arg('--periodo') || 'QUALIFICA-SLZ';

    if (!email) {
        console.error('Informe --email <motorista@qualifica.com>');
        process.exit(1);
    }

    const user = await prisma.user.findFirst({
        where: { email, role: 'DRIVER' },
    });
    if (!user) {
        console.error('Usuário DRIVER não encontrado:', email);
        process.exit(1);
    }
    console.log('Motorista:', user.name, user.id, user.email);

    const acao = await prisma.acao.findFirst({
        where: { nome: { contains: periodoNome, mode: 'insensitive' } },
        include: {
            turmas: {
                include: {
                    turma: {
                        select: {
                            id: true,
                            classIdentifier: true,
                            status: true,
                            truckId: true,
                            cityId: true,
                            originCityId: true,
                            startDate: true,
                            endDate: true,
                            weekendPolicy: true,
                            schedules: { where: { active: true } },
                        },
                    },
                },
            },
            funcionarios: {
                include: { employee: { select: { id: true, name: true, role: true, userId: true } } },
            },
        },
    });
    if (!acao) {
        console.error('Período não encontrado:', periodoNome);
        process.exit(1);
    }
    console.log('\nPeríodo:', acao.nome, acao.id);
    console.log('Carreta período:', acao.carretaId ?? '—');
    console.log('Origem rota (período):', acao.originCidadeId ?? '— (defina no período ou na turma)');

    const vinculo = acao.funcionarios.find(f => f.employee.userId === user.id);
    console.log(
        'AcaoFuncionario:',
        vinculo ? `SIM (${vinculo.employee.name})` : 'NÃO — vincule na aba Equipe',
    );

    console.log('\n--- Turmas do período ---');
    for (const at of acao.turmas) {
        const t = at.turma;
        if (!t) continue;
        const weekdays = weekdaysFromClass(t);
        const startDay = startOfUTCDay(new Date(t.startDate ?? acao.dataInicio));
        const endDay = startOfUTCDay(new Date(t.endDate ?? acao.dataFim));
        const rangeEnd = new Date(endDay);
        rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);
        const plannedInRange = await prisma.trip.findMany({
            where: {
                classId: t.id,
                driverUserId: user.id,
                status: 'PLANNED',
                departureDate: { gte: startDay, lt: rangeEnd },
            },
            select: { id: true, notes: true, departureDate: true, originCityId: true, destinationCityId: true },
            orderBy: { departureDate: 'asc' },
        });
        const trips = await prisma.trip.count({
            where: { classId: t.id, driverUserId: user.id },
        });
        const warnExtra =
            plannedInRange.length > 2
                ? ` ⚠ esperado ≤2 PLANNED (ida+volta), tem ${plannedInRange.length}`
                : '';
        console.log(
            `  ${t.classIdentifier} | status=${t.status} | truck=${t.truckId ? 'OK' : 'SEM'} | schedules DB=${t.schedules.length} | weekdays=${[...weekdays].join(',')} | trips=${trips} | PLANNED no período=${plannedInRange.length}${warnExtra}`,
        );
        for (const tr of plannedInRange) {
            const d = tr.departureDate.toISOString().slice(0, 10);
            console.log(`      · ${d} ${tr.notes ?? '(sem nota)'}`);
        }
    }

    const tripsTotal = await prisma.trip.count({ where: { driverUserId: user.id } });
    console.log('\nTotal trips motorista (todas turmas):', tripsTotal);

    if (repair) {
        console.log('\n--- REPAIR ---');
        const prismaSvc = prisma as unknown as PrismaService;
        const tripsService = new TripsService(
            prismaSvc,
            {} as NotificationsSenderService,
            {} as MinioService,
        );

        for (const at of acao.turmas) {
            if (at.turma) {
                const r = await ensureClassScheduleFromPolicy(prismaSvc, at.turma.id);
                console.log(`  schedule ${at.turma.classIdentifier}: +${r.created} (${r.weekdays.join(',')})`);
            }
        }

        if (!vinculo) {
            console.log('Sem vínculo AcaoFuncionario — repair de viagens ignorado.');
        } else {
            const sync = await syncDriverForEmployeeOnAcao(prismaSvc, tripsService, acao.id, user.id);
            console.log('Sync:', sync.message);
            if (sync.perClass?.length) {
                for (const pc of sync.perClass) {
                    console.log(`  • ${pc.classIdentifier || pc.classId}: ${pc.generated} — ${pc.message}`);
                }
            }
        }

        const after = await prisma.trip.count({ where: { driverUserId: user.id } });
        console.log('Trips após repair:', after);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
