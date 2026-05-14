import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

/**
 * MailScheduler — rotinas automáticas de email do Sistema Upgrade.
 *
 * Todos os jobs usam try/catch: falha em um email nunca para o lote.
 * O sistema funciona normalmente mesmo se a Brevo estiver offline.
 *
 * Horários (UTC — servidor Hostinger):
 *  - 08:00 UTC (05:00 BRT) → Lembrete de aula do dia seguinte
 *  - 18:00 UTC (15:00 BRT) → Alerta de faltas do dia
 *  - 19:00 UTC (16:00 BRT) → Alertas de manutenção
 *  - Sextas 18:00 UTC      → Resumo semanal para admins
 */
@Injectable()
export class MailScheduler {
    private readonly logger = new Logger(MailScheduler.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly mail: MailService,
    ) {}

    // ══════════════════════════════════════════════════════════════════════════
    // 1. LEMBRETE DE AULA — diário às 08:00 UTC
    //    Busca turmas em andamento e avisa alunos matriculados.
    //    (ClassSchedule usa weekday 0-6, não date — buscamos pelo dia da semana
    //     de amanhã e verificamos se a turma está ativa)
    // ══════════════════════════════════════════════════════════════════════════
    @Cron('0 8 * * *', { name: 'lembrete-aula' })
    async sendClassReminders() {
        this.logger.log('[CRON] Iniciando: Lembretes de aula');

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const weekday = tomorrow.getDay(); // 0=Dom, 1=Seg ... 6=Sab

        const tomorrowStr = tomorrow.toLocaleDateString('pt-BR', {
            weekday: 'long', day: '2-digit', month: 'long',
        });

        try {
            // Turmas com aula no dia da semana de amanhã e que estão em andamento
            const classes = await this.prisma.class.findMany({
                where: {
                    status: 'IN_PROGRESS',
                    schedules: { some: { weekday, active: true } },
                },
                include: {
                    course: { select: { name: true } },
                    enrollments: {
                        where: { status: 'ENROLLED' },
                        include: {
                            student: {
                                include: {
                                    user:    { select: { name: true, email: true } },
                                    contact: { select: { email: true } },
                                },
                            },
                        },
                    },
                },
                take: 30,
            });

            let sent = 0;
            for (const cls of classes) {
                const courseName = cls.course?.name ?? 'Curso';
                const timeStr    = `${cls.startTime} – ${cls.endTime}`;

                for (const enrollment of cls.enrollments) {
                    const email = (enrollment.student as any)?.contact?.email
                               ?? enrollment.student?.user?.email;
                    const name  = enrollment.student?.user?.name;
                    if (!email || !name) continue;

                    try {
                        await this.mail.sendClassReminder(email, name, courseName, tomorrowStr, timeStr);
                        sent++;
                    } catch { /* nunca para o lote */ }
                }
            }
            this.logger.log(`[CRON] Lembretes de aula: ${sent} emails enviados`);
        } catch (err) {
            this.logger.error(`[CRON] Erro no lembrete de aula: ${err}`);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 2. ALERTA DE FALTAS — diário às 18:00 UTC
    //    Usa o modelo Attendance (presente=false) registrado hoje.
    // ══════════════════════════════════════════════════════════════════════════
    @Cron('0 18 * * *', { name: 'alerta-faltas' })
    async sendAbsenceAlerts() {
        this.logger.log('[CRON] Iniciando: Alertas de faltas');

        const today = new Date();
        const start = new Date(today); start.setHours(0, 0, 0, 0);
        const end   = new Date(today); end.setHours(23, 59, 59, 999);

        try {
            const attendances = await this.prisma.attendance.findMany({
                where: {
                    date:      { gte: start, lte: end },
                    present:   false,
                    justified: false,
                },
                include: {
                    class: {
                        include: { course: { select: { name: true } } },
                    },
                    student: {
                        include: {
                            user:    { select: { name: true, email: true } },
                            contact: { select: { email: true } },
                            // contar total de faltas não justificadas
                            attendances: {
                                where: { present: false, justified: false },
                                select: { id: true },
                            },
                        },
                    },
                },
                take: 500,
            });

            // Conta total de aulas de cada turma (schedules * duração aproximada)
            const classIds = [...new Set(attendances.map(a => a.classId))];
            const scheduleCounts: Record<string, number> = {};
            for (const cid of classIds) {
                scheduleCounts[cid] = await this.prisma.attendance.count({
                    where: { classId: cid },
                });
            }

            let sent = 0;
            for (const att of attendances) {
                const email = (att.student as any)?.contact?.email
                           ?? att.student?.user?.email;
                const name  = att.student?.user?.name;
                if (!email || !name) continue;

                const courseName    = att.class?.course?.name ?? 'Curso';
                const totalAbsences = att.student.attendances.length;
                const totalClasses  = scheduleCounts[att.classId] ?? 0;

                try {
                    await this.mail.sendAbsenceAlert(email, name, courseName, totalAbsences, totalClasses);
                    sent++;
                } catch { /* nunca para o lote */ }
            }
            this.logger.log(`[CRON] Alertas de faltas: ${sent} emails enviados`);
        } catch (err) {
            this.logger.error(`[CRON] Erro no alerta de faltas: ${err}`);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 3. ALERTA DE MANUTENÇÃO — diário às 19:00 UTC
    //    TruckMaintenance usa dataAgendada, status (string) e tipo (string pt-BR)
    // ══════════════════════════════════════════════════════════════════════════
    @Cron('0 19 * * *', { name: 'alerta-manutencao' })
    async sendMaintenanceAlerts() {
        this.logger.log('[CRON] Iniciando: Alertas de manutenção');

        const today   = new Date();
        const in7days = new Date(); in7days.setDate(today.getDate() + 7);

        try {
            const maintenances = await this.prisma.truckMaintenance.findMany({
                where: {
                    dataAgendada: { not: null, lte: in7days },
                    status: { notIn: ['concluida', 'cancelada'] },
                },
                include: {
                    truck: { select: { licensePlate: true, identifier: true } },
                },
                take: 50,
            });

            if (maintenances.length === 0) {
                this.logger.log('[CRON] Nenhuma manutenção pendente ou vencendo');
                return;
            }

            const admins = await this.prisma.user.findMany({
                where: { role: 'ADMIN', active: true },
                select: { name: true, email: true },
                take: 20,
            });

            const items = maintenances.map(m => ({
                plate:       m.truck?.licensePlate ?? 'N/D',
                model:       m.truck?.identifier   ?? 'N/D',
                type:        m.tipo,
                nextDueDate: m.dataAgendada
                    ? new Date(m.dataAgendada).toLocaleDateString('pt-BR')
                    : 'Não definido',
                overdue: m.dataAgendada ? new Date(m.dataAgendada) < today : false,
            }));

            for (const admin of admins) {
                if (!admin.email) continue;
                try {
                    await this.mail.sendMaintenanceAlert(admin.email, admin.name, items);
                } catch { /* nunca para o lote */ }
            }
            this.logger.log(`[CRON] Manutenção: ${maintenances.length} veículo(s), ${admins.length} admin(s) notificado(s)`);
        } catch (err) {
            this.logger.error(`[CRON] Erro no alerta de manutenção: ${err}`);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 4. RESUMO SEMANAL — toda sexta às 18:00 UTC
    // ══════════════════════════════════════════════════════════════════════════
    @Cron('0 18 * * 5', { name: 'resumo-semanal' })
    async sendWeeklySummary() {
        this.logger.log('[CRON] Iniciando: Resumo semanal');

        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);

        try {
            const [newEnrollments, newCertificates, pendingReimbursements, activeClasses] =
                await Promise.all([
                    this.prisma.enrollment.count({
                        where: { createdAt: { gte: weekAgo } },
                    }),
                    this.prisma.certificate.count({
                        where: { issuedAt: { gte: weekAgo } },
                    }),
                    this.prisma.reimbursement.count({
                        where: { status: 'PENDING' },
                    }),
                    this.prisma.class.count({
                        where: { status: 'IN_PROGRESS' },
                    }),
                ]);

            const admins = await this.prisma.user.findMany({
                where: { role: 'ADMIN', active: true },
                select: { name: true, email: true },
                take: 20,
            });

            const weekStart = weekAgo.toLocaleDateString('pt-BR');
            const weekEnd   = new Date().toLocaleDateString('pt-BR');

            for (const admin of admins) {
                if (!admin.email) continue;
                try {
                    await this.mail.sendWeeklySummary(admin.email, admin.name, {
                        newEnrollments, newCertificates,
                        pendingReimbursements, activeClasses,
                        weekStart, weekEnd,
                    });
                } catch { /* nunca para o lote */ }
            }
            this.logger.log(`[CRON] Resumo semanal: enviado para ${admins.length} admin(s)`);
        } catch (err) {
            this.logger.error(`[CRON] Erro no resumo semanal: ${err}`);
        }
    }
}
