import { Injectable } from '@nestjs/common';
import { ExpenseStatus, FeedbackRewardStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface Activity {
    type: string;
    action: string;
    description: string;
    timestamp: Date;
}

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) { }

    /**
     * Intervalo financeiro inclusivo-exclusivo [start, end) em UTC,
     * e ano civil para série de inscrições quando `year` vem definido.
     */
    private periodContext(year?: number, month?: number): {
        financeBounds?: { gte: Date; lt: Date };
        financeLabel: string;
        enrollmentYear?: number;
    } {
        if (year == null) {
            return { financeLabel: 'Acumulado (sem filtro de período)' };
        }
        if (month != null && month >= 1 && month <= 12) {
            return {
                financeBounds: {
                    gte: new Date(Date.UTC(year, month - 1, 1)),
                    lt: new Date(Date.UTC(year, month, 1)),
                },
                financeLabel: `${String(month).padStart(2, '0')}/${year}`,
                enrollmentYear: year,
            };
        }
        return {
            financeBounds: {
                gte: new Date(Date.UTC(year, 0, 1)),
                lt: new Date(Date.UTC(year + 1, 0, 1)),
            },
            financeLabel: `Ano ${year}`,
            enrollmentYear: year,
        };
    }

    async getOverallStats() {
        const [
            totalCourses,
            activeCourses,
            totalStudents,
            studentsByStateRows,
            totalClasses,
            activeClasses,
            totalEnrollments,
            pendingEnrollments,
            totalAttendanceRecords,
            presentAttendanceRecords,
        ] = await Promise.all([
            // Courses
            this.prisma.course.count(),
            this.prisma.course.count({ where: { active: true } }),

            // Students
            this.prisma.student.count(),
            this.prisma.studentAddress.groupBy({
                by: ['state'],
                _count: { _all: true },
            }),

            // Classes
            this.prisma.class.count(),
            this.prisma.class.count({
                where: {
                    startDate: { lte: new Date() },
                    endDate: { gte: new Date() }
                }
            }),

            // Enrollments
            this.prisma.enrollment.count(),
            this.prisma.enrollment.count({ where: { status: { in: ['PENDING', 'DOCUMENT_PENDING'] } } }),

            // Attendance
            this.prisma.attendance.count(),
            this.prisma.attendance.count({ where: { present: true } }),
        ]);

        const attendanceRate = totalAttendanceRecords > 0
            ? Math.round((presentAttendanceRecords / totalAttendanceRecords) * 100)
            : 0;
        const studentsByState = studentsByStateRows.reduce<Record<string, number>>((acc, row) => {
            const uf = (row.state || '').toUpperCase();
            if (!uf) return acc;
            acc[uf] = row._count._all;
            return acc;
        }, {});

        return {
            courses: {
                total: totalCourses,
                active: activeCourses,
            },
            students: {
                total: totalStudents,
                byState: studentsByState,
                // Compat legado para telas antigas
                ma: studentsByState.MA || 0,
                pi: studentsByState.PI || 0,
            },
            classes: {
                total: totalClasses,
                active: activeClasses,
            },
            enrollments: {
                total: totalEnrollments,
                pending: pendingEnrollments,
            },
            attendance: {
                rate: attendanceRate,
                totalRecords: totalAttendanceRecords,
            },
        };
    }

    async getRecentActivity() {
        // Get recent enrollments
        const recentEnrollments = await this.prisma.enrollment.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                student: {
                    include: {
                        user: {
                            select: { name: true }
                        }
                    }
                },
                class: {
                    include: {
                        course: {
                            select: { name: true }
                        }
                    }
                }
            },
        });

        // Get recent classes
        const recentClasses = await this.prisma.class.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                course: {
                    select: { name: true }
                },
                city: {
                    select: { name: true, state: true }
                }
            },
        });

        const activities: Activity[] = [];

        // Add enrollment activities
        recentEnrollments.forEach(enrollment => {
            activities.push({
                type: 'enrollment',
                action: `Nova matrícula: ${enrollment.student.user.name}`,
                description: `Curso: ${enrollment.class.course.name}`,
                timestamp: enrollment.createdAt,
            });
        });

        // Add class creation activities
        recentClasses.forEach(classItem => {
            activities.push({
                type: 'class',
                action: `Turma criada: ${classItem.course.name}`,
                description: `${classItem.city.name} - ${classItem.city.state}`,
                timestamp: classItem.createdAt,
            });
        });

        // Sort by timestamp and return top 10
        return activities
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 10);
    }

    async getUpcomingClasses() {
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        return this.prisma.class.findMany({
            where: {
                startDate: {
                    gte: now,
                    lte: thirtyDaysFromNow,
                },
            },
            take: 10,
            orderBy: { startDate: 'asc' },
            include: {
                course: {
                    select: { name: true }
                },
                city: {
                    select: { name: true, state: true }
                },
                _count: {
                    select: { enrollments: true }
                }
            },
        });
    }
    async getAnalytics(year?: number, month?: number) {
        const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const ctx = this.periodContext(year, month);
        const { financeBounds } = ctx;
        /** Alinha KPI pedagógico ao mesmo intervalo das finanças (ano civil, mês ou acumulado). */
        const enrollCreatedFilter = financeBounds ? { createdAt: financeBounds } : undefined;

        // ── Inscrições (série temporal) ───────────────────────────────────────
        let enrollmentsByMonthRows: Array<{ createdAt: Date; status: string }>;
        let inscricoesPorMes: { month: string; total: number; aprovados: number }[];
        let inscricoesSerieTipo: 'mes_unico' | 'ano_civil' | 'ultimos_12_meses';

        if (year != null && month != null && financeBounds) {
            enrollmentsByMonthRows = await this.prisma.enrollment.findMany({
                where: { createdAt: financeBounds },
                select: { createdAt: true, status: true },
                orderBy: { createdAt: 'asc' },
            });
            let total = 0;
            let aprovadosCt = 0;
            enrollmentsByMonthRows.forEach(e => {
                total++;
                if (e.status === 'APPROVED' || e.status === 'ENROLLED') aprovadosCt++;
            });
            inscricoesPorMes = [{ month: MONTHS_PT[month - 1] ?? `M${month}`, total, aprovados: aprovadosCt }];
            inscricoesSerieTipo = 'mes_unico';
        } else if (ctx.enrollmentYear != null) {
            const yStart = new Date(Date.UTC(ctx.enrollmentYear, 0, 1));
            const yEnd = new Date(Date.UTC(ctx.enrollmentYear + 1, 0, 1));
            enrollmentsByMonthRows = await this.prisma.enrollment.findMany({
                where: { createdAt: { gte: yStart, lt: yEnd } },
                select: { createdAt: true, status: true },
                orderBy: { createdAt: 'asc' },
            });
            const monthMapOrdinal = Array.from({ length: 13 }, () => ({
                total: 0,
                aprovados: 0,
            }));
            enrollmentsByMonthRows.forEach(e => {
                if (e.createdAt.getUTCFullYear() === ctx.enrollmentYear) {
                    const mo = e.createdAt.getUTCMonth() + 1;
                    monthMapOrdinal[mo].total++;
                    if (e.status === 'APPROVED' || e.status === 'ENROLLED') monthMapOrdinal[mo].aprovados++;
                }
            });
            inscricoesPorMes = MONTHS_PT.map((label, idx) => ({
                month: label,
                total: monthMapOrdinal[idx + 1].total,
                aprovados: monthMapOrdinal[idx + 1].aprovados,
            }));
            inscricoesSerieTipo = 'ano_civil';
        } else {
            const now = new Date();
            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setMonth(now.getMonth() - 11);
            twelveMonthsAgo.setDate(1);
            twelveMonthsAgo.setHours(0, 0, 0, 0);
            enrollmentsByMonthRows = await this.prisma.enrollment.findMany({
                where: { createdAt: { gte: twelveMonthsAgo } },
                select: { createdAt: true, status: true },
                orderBy: { createdAt: 'asc' },
            });
            const monthMapKey = new Map<string, { total: number; aprovados: number }>();
            enrollmentsByMonthRows.forEach(e => {
                const ym = `${e.createdAt.getUTCFullYear()}-${String(e.createdAt.getUTCMonth() + 1).padStart(2, '0')}`;
                if (!monthMapKey.has(ym)) monthMapKey.set(ym, { total: 0, aprovados: 0 });
                const bk = monthMapKey.get(ym)!;
                bk.total++;
                if (e.status === 'APPROVED' || e.status === 'ENROLLED') bk.aprovados++;
            });
            inscricoesPorMes = Array.from(monthMapKey.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, val]) => {
                    const m = Number(key.split('-')[1]);
                    return { month: MONTHS_PT[m - 1] ?? key, ...val };
                });
            inscricoesSerieTipo = 'ultimos_12_meses';
        }

        const statePalette = ['#FFD600', '#0891B2', '#059669', '#7C3AED', '#EA580C', '#DC2626', '#0D9488', '#2563EB'];

        // ── Pedagógico: com período (ano/mês) usa inscrições criadas na janela; senão totais globais ──
        let alunosPorCurso: { curso: string; alunos: number; turmas: number }[];
        let distribuicaoEstado: { name: string; value: number; color: string }[];

        if (enrollCreatedFilter) {
            const enrollRows = await this.prisma.enrollment.findMany({
                where: enrollCreatedFilter,
                select: {
                    classId: true,
                    class: { select: { course: { select: { name: true } } } },
                    student: {
                        select: {
                            address: { select: { state: true } },
                        },
                    },
                },
            });
            const byCourse = new Map<string, { alunos: number; turmas: Set<string> }>();
            enrollRows.forEach(e => {
                const rawName = e.class.course.name;
                const nome = rawName.length > 18 ? `${rawName.substring(0, 18)}…` : rawName;
                if (!byCourse.has(nome)) byCourse.set(nome, { alunos: 0, turmas: new Set() });
                const bc = byCourse.get(nome)!;
                bc.alunos++;
                bc.turmas.add(e.classId);
            });
            alunosPorCurso = [...byCourse.entries()]
                .map(([curso, v]) => ({
                    curso,
                    alunos: v.alunos,
                    turmas: v.turmas.size,
                }))
                .filter(c => c.alunos > 0)
                .sort((a, b) => b.alunos - a.alunos)
                .slice(0, 15);

            const stateCount = new Map<string, number>();
            enrollRows.forEach(e => {
                const st = (e.student.address?.state || '').toUpperCase().trim();
                if (!st) return;
                stateCount.set(st, (stateCount.get(st) ?? 0) + 1);
            });
            distribuicaoEstado = [...stateCount.entries()]
                .map(([name, value], idx) => ({
                    name,
                    value,
                    color: statePalette[idx % statePalette.length],
                }))
                .filter(e => e.value > 0)
                .sort((a, b) => b.value - a.value);
        } else {
            const courseStats = await this.prisma.course.findMany({
                select: {
                    name: true,
                    _count: { select: { classes: true } },
                    classes: {
                        select: {
                            _count: { select: { enrollments: true } },
                        },
                    },
                },
                take: 10,
            });

            alunosPorCurso = courseStats
                .map(c => ({
                    curso: c.name.length > 18 ? c.name.substring(0, 18) + '…' : c.name,
                    alunos: c.classes.reduce((sum, cl) => sum + cl._count.enrollments, 0),
                    turmas: c._count.classes,
                }))
                .filter(c => c.alunos > 0)
                .sort((a, b) => b.alunos - a.alunos);

            const studentsByStateRows = await this.prisma.studentAddress.groupBy({
                by: ['state'],
                _count: { _all: true },
            });
            distribuicaoEstado = studentsByStateRows
                .map((row, idx) => ({
                    name: (row.state || '').toUpperCase(),
                    value: row._count._all,
                    color: statePalette[idx % statePalette.length],
                }))
                .filter(e => e.name && e.value > 0)
                .sort((a, b) => b.value - a.value);
        }

        const statusWhere = enrollCreatedFilter
            ? enrollCreatedFilter
            : {};
        const [pending, approved, rejected, waitlist] = await Promise.all([
            this.prisma.enrollment.count({ where: { status: 'PENDING', ...statusWhere } }),
            this.prisma.enrollment.count({ where: { status: 'APPROVED', ...statusWhere } }),
            this.prisma.enrollment.count({ where: { status: 'REJECTED', ...statusWhere } }),
            this.prisma.enrollment.count({ where: { status: 'WAITLIST', ...statusWhere } }),
        ]);

        const matriculadosOuAprovados = await this.prisma.enrollment.count({
            where: {
                status: { in: ['APPROVED', 'ENROLLED'] },
                ...statusWhere,
            },
        });

        const inscricoesCriadasNoPeriodo = await this.prisma.enrollment.count({
            where: { ...statusWhere },
        });

        const statusInscricoes = [
            { name: 'Aprovadas', value: approved, color: '#059669' },
            { name: 'Pendentes', value: pending, color: '#FBBF24' },
            { name: 'Lista Espera', value: waitlist, color: '#60A5FA' },
            { name: 'Rejeitadas', value: rejected, color: '#F87171' },
        ].filter(e => e.value > 0);

        const certificadosEmitidos = await this.prisma.certificate.count({
            where: {
                status: 'ACTIVE',
                ...(enrollCreatedFilter ? { issuedAt: financeBounds } : {}),
            },
        });

        const [totalStudents, totalCourses, totalClasses, totalEnrollmentsGlobal, totalActions] = await Promise.all([
            this.prisma.student.count(),
            this.prisma.course.count({ where: { active: true } }),
            this.prisma.class.count(),
            this.prisma.enrollment.count(),
            this.prisma.acao.count(),
        ]);

        // ── Finanças / operações — filtro opcional por período ───────────────
        const reembWhereCreated = {
            active: true,
            ...(financeBounds ? { createdAt: financeBounds } : {}),
        };

        const reembGroup = await this.prisma.reimbursement.groupBy({
            by: ['status'],
            where: reembWhereCreated,
            _count: { _all: true },
            _sum: { amount: true },
        });

        const countByExpense = (s: ExpenseStatus) =>
            reembGroup.find(r => r.status === s)?._count._all ?? 0;
        const sumByExpense = (s: ExpenseStatus) =>
            Number(reembGroup.find(r => r.status === s)?._sum.amount ?? 0);

        const valorSolicitadoNoPeriodo = reembGroup.reduce(
            (acc, r) => acc + Number(r._sum.amount ?? 0),
            0,
        );

        const valorAprovadoComRevisaoNoPeriodo = Number(
            (
                await this.prisma.reimbursement.aggregate({
                    where: {
                        active: true,
                        status: ExpenseStatus.APPROVED,
                        ...(financeBounds
                            ? { approvedAt: financeBounds }
                            : { approvedAt: { not: null } }),
                    },
                    _sum: { amount: true },
                })
            )._sum.amount ?? 0,
        );

        /** Soma apenas penalidades monetárias (professor/motorista/etc.) — para alunos `penalty` guarda %. */
        const absWhereFinancialPenalty = {
            active: true,
            ...(financeBounds ? { reviewedAt: financeBounds } : { reviewedAt: { not: null } }),
            status: 'PENALIZED' as const,
            penalty: { not: null, gt: 0 },
            user: { role: { not: UserRole.STUDENT } },
        };

        const [imprevistosRegistrados, penalAgg, feedbackConvites, feedbackSubmetidos, pixPagos, pixLotePendente] =
            await Promise.all([
                this.prisma.absence.count({
                    where: {
                        active: true,
                        ...(financeBounds ? { createdAt: financeBounds } : {}),
                    },
                }),
                this.prisma.absence.aggregate({
                    where: absWhereFinancialPenalty,
                    _count: { _all: true },
                    _sum: { penalty: true },
                }),
                this.prisma.courseFeedback.count({
                    where: {
                        active: true,
                        ...(financeBounds ? { invitedAt: financeBounds } : {}),
                    },
                }),
                this.prisma.courseFeedback.count({
                    where: {
                        active: true,
                        submittedAt: { not: null },
                        ...(financeBounds ? { submittedAt: financeBounds } : {}),
                    },
                }),
                this.prisma.courseFeedback.count({
                    where: {
                        active: true,
                        rewardStatus: FeedbackRewardStatus.PAID,
                        ...(financeBounds ? { rewardPaidAt: financeBounds } : { rewardPaidAt: { not: null } }),
                    },
                }),
                this.prisma.courseFeedback.count({
                    where: {
                        active: true,
                        status: 'APPROVED',
                        rewardStatus: FeedbackRewardStatus.PENDING,
                        sharedOnSocial: true,
                    },
                }),
            ]);

        const financeiro = {
            periodoRotulo: ctx.financeLabel,
            reembolsos: {
                solicitacoesCriadasNoPeriodo: reembGroup.reduce((a, r) => a + r._count._all, 0),
                valorTotalSolicitadoNoPeriodo: valorSolicitadoNoPeriodo,
                pendentes: countByExpense(ExpenseStatus.PENDING),
                aprovadosAindaNoFluxoDeCriacao: countByExpense(ExpenseStatus.APPROVED),
                rejeitados: countByExpense(ExpenseStatus.REJECTED),
                valorAprovadoComDataDecisaoNoPeriodo: valorAprovadoComRevisaoNoPeriodo,
            },
            imprevistos: {
                registrosNoPeriodo: imprevistosRegistrados,
                penalidadesQuantidade: penalAgg._count?._all ?? 0,
                penalidadesValorRetidoTotal: Number(penalAgg._sum?.penalty ?? 0),
            },
            feedbacksPosCurso: {
                convitesEnviadosNoPeriodo: feedbackConvites,
                submissoesNoPeriodo: feedbackSubmetidos,
                recompensasPixLiquidadasNoPeriodo: pixPagos,
                recompensaLotePixPendentes: pixLotePendente,
            },
        };

        return {
            inscricoesPorMes,
            inscricoesSerieTipo,
            anoInscricoes: ctx.enrollmentYear ?? null,
            mesInscricoes: month ?? null,
            alunosPorCurso,
            distribuicaoEstado,
            statusInscricoes,
            matriculadosOuAprovados,
            certificadosEmitidos,
            inscricoesCriadasNoPeriodo,
            resumo: {
                totalStudents,
                totalCourses,
                totalClasses,
                totalEnrollments: totalEnrollmentsGlobal,
                totalActions,
            },
            financeiro,
            geradoEm: new Date().toISOString(),
        };
    }

    /**
     * Rotas (ações) que sobrepõem o ano ou o mês civil — evita filtro só por dataInicio (ignorava ações que cruzam o ano).
     */
    async getRotasBi(estado?: string, ano?: number, mes?: number) {
        const where: Record<string, unknown> = {};
        if (estado && estado !== 'TODOS') {
            where.grupo = { state: estado };
        }
        if (ano != null && Number.isFinite(ano)) {
            let periodStart: Date;
            let periodEnd: Date;
            if (mes != null && mes >= 1 && mes <= 12) {
                periodStart = new Date(Date.UTC(ano, mes - 1, 1));
                periodEnd = new Date(Date.UTC(ano, mes, 1));
            } else {
                periodStart = new Date(Date.UTC(ano, 0, 1));
                periodEnd = new Date(Date.UTC(ano + 1, 0, 1));
            }
            where.AND = [
                { dataInicio: { lt: periodEnd } },
                { dataFim: { gte: periodStart } },
            ];
        }
        const acoes = await this.prisma.acao.findMany({
            where,
            include: {
                cidade: { select: { name: true, state: true } },
                grupo: { select: { name: true, state: true } },
                turmas: {
                    include: {
                        turma: {
                            include: {
                                _count: { select: { enrollments: true } },
                                course: { select: { name: true } },
                            },
                        },
                    },
                },
                _count: { select: { turmas: true } },
            },
            orderBy: { dataInicio: 'desc' },
        });

        const totalInscritos = acoes.reduce(
            (sum, a) => sum + a.turmas.reduce((s, t) => s + t.turma._count.enrollments, 0),
            0,
        );
        // cidadeNome é campo direto no model Acao — sem cast
        const cidades = [...new Set(
            acoes.map(a => a.cidadeNome || a.cidade?.name).filter(Boolean),
        )];

        return {
            totalRotas: acoes.length,
            cidadesBeneficiadas: cidades.length,
            totalInscritos,
            rotas: acoes.map(a => ({
                id: a.id,
                nome: a.nome,
                cidade: a.cidadeNome || a.cidade?.name,
                estado: a.grupo?.state,
                status: a.status,
                dataInicio: a.dataInicio,
                dataFim: a.dataFim,
                totalTurmas: a._count.turmas,
                totalInscritos: a.turmas.reduce((s, t) => s + t.turma._count.enrollments, 0),
            })),
        };
    }
}
