import { Injectable } from '@nestjs/common';
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

    async getOverallStats() {
        const [
            totalCourses,
            activeCourses,
            totalStudents,
            studentsMA,
            studentsPI,
            totalClasses,
            activeClasses,
            totalEnrollments,
            pendingEnrollments,
        ] = await Promise.all([
            // Courses
            this.prisma.course.count(),
            this.prisma.course.count({ where: { active: true } }),

            // Students
            this.prisma.student.count(),
            this.prisma.student.count({
                where: {
                    address: { state: 'MA' }
                }
            }),
            this.prisma.student.count({
                where: {
                    address: { state: 'PI' }
                }
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
            this.prisma.enrollment.count({ where: { status: { in: ['ENROLLED', 'DOCUMENT_PENDING'] } } }),
        ]);

        return {
            courses: {
                total: totalCourses,
                active: activeCourses,
            },
            students: {
                total: totalStudents,
                ma: studentsMA,
                pi: studentsPI,
            },
            classes: {
                total: totalClasses,
                active: activeClasses,
            },
            enrollments: {
                total: totalEnrollments,
                pending: pendingEnrollments,
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
    async getAnalytics() {
        const now = new Date();
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(now.getMonth() - 11);
        twelveMonthsAgo.setDate(1);
        twelveMonthsAgo.setHours(0, 0, 0, 0);

        // 1. Inscrições por mês (últimos 12 meses)
        const enrollmentsByMonth = await this.prisma.enrollment.findMany({
            where: { createdAt: { gte: twelveMonthsAgo } },
            select: { createdAt: true, status: true },
            orderBy: { createdAt: 'asc' },
        });

        const monthMap: Record<string, { total: number; aprovados: number }> = {};
        enrollmentsByMonth.forEach(e => {
            const key = `${e.createdAt.getFullYear()}-${String(e.createdAt.getMonth() + 1).padStart(2, '0')}`;
            if (!monthMap[key]) monthMap[key] = { total: 0, aprovados: 0 };
            monthMap[key].total++;
            if (e.status === 'APPROVED') monthMap[key].aprovados++;
        });

        const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const inscricoesPorMes = Object.entries(monthMap).map(([key, val]) => {
            const [, m] = key.split('-');
            return { month: MONTHS_PT[parseInt(m) - 1], ...val };
        });

        // 2. Alunos por curso (top 10)
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

        const alunosPorCurso = courseStats
            .map(c => ({
                curso: c.name.length > 18 ? c.name.substring(0, 18) + '…' : c.name,
                alunos: c.classes.reduce((sum, cl) => sum + cl._count.enrollments, 0),
                turmas: c._count.classes,
            }))
            .filter(c => c.alunos > 0)
            .sort((a, b) => b.alunos - a.alunos);

        // 3. Distribuição por estado
        const [studentsMA, studentsPI, studentsOther] = await Promise.all([
            this.prisma.student.count({ where: { address: { state: 'MA' } } }),
            this.prisma.student.count({ where: { address: { state: 'PI' } } }),
            this.prisma.student.count({ where: { NOT: { address: { state: { in: ['MA', 'PI'] } } } } }),
        ]);
        const distribuicaoEstado = [
            { name: 'Maranhão', value: studentsMA, color: '#FFD600' },
            { name: 'Piauí', value: studentsPI, color: '#0891B2' },
            { name: 'Outros', value: studentsOther, color: '#7C3AED' },
        ].filter(e => e.value > 0);

        // 4. Status das inscrições
        const [pending, approved, rejected, waitlist] = await Promise.all([
            this.prisma.enrollment.count({ where: { status: 'PENDING' } }),
            this.prisma.enrollment.count({ where: { status: 'APPROVED' } }),
            this.prisma.enrollment.count({ where: { status: 'REJECTED' } }),
            this.prisma.enrollment.count({ where: { status: 'WAITLIST' } }),
        ]);
        const statusInscricoes = [
            { name: 'Aprovadas', value: approved, color: '#059669' },
            { name: 'Pendentes', value: pending, color: '#FBBF24' },
            { name: 'Lista Espera', value: waitlist, color: '#60A5FA' },
            { name: 'Rejeitadas', value: rejected, color: '#F87171' },
        ].filter(e => e.value > 0);

        // 5. Resumo geral real
        const [totalStudents, totalCourses, totalClasses, totalEnrollments, totalActions] = await Promise.all([
            this.prisma.student.count(),
            this.prisma.course.count({ where: { active: true } }),
            this.prisma.class.count(),
            this.prisma.enrollment.count(),
            this.prisma.acao.count(),
        ]);

        return {
            inscricoesPorMes,
            alunosPorCurso,
            distribuicaoEstado,
            statusInscricoes,
            resumo: { totalStudents, totalCourses, totalClasses, totalEnrollments, totalActions },
        };
    }

    async getRotasBi(estado?: string, ano?: number) {
        const where: any = {};
        if (estado && estado !== 'TODOS') {
            where.grupo = { state: estado };
        }
        if (ano) {
            where.dataInicio = {
                gte: new Date(`${ano}-01-01`),
                lte: new Date(`${ano}-12-31`),
            };
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
        const cidades = [...new Set(
            acoes.map(a => (a as any).cidadeNome || a.cidade?.name).filter(Boolean),
        )];

        return {
            totalRotas: acoes.length,
            cidadesBeneficiadas: cidades.length,
            totalInscritos,
            rotas: acoes.map(a => ({
                id: a.id,
                nome: a.nome,
                cidade: (a as any).cidadeNome || a.cidade?.name,
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
