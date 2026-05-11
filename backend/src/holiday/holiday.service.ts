import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsSenderService } from '../notifications/notifications-sender.service';
import { listBrazilStateHolidaysForYear, normalizeBrazilUf } from './brazil-state-holidays';

/**
 * HolidayService — REQ-08
 *
 * Gerencia feriados e imprevistos que afetam o cronograma de turmas.
 *
 * REGRA DA REUNIÃO (00:29:30 — 00:31:13):
 * "Era para terminar dia 12, vai terminar dia 13 agora, porque os dias
 * tudinho pra frente vai ter uma alteração." — Ronaldo Ribeiro
 *
 * Quando um dia de aula é cancelado (feriado ou imprevisto), o sistema
 * empurra automaticamente a data de término para o próximo dia útil.
 *
 * Feriados nacionais fixos brasileiros 2025/2026 incluídos.
 * Feriados municipais são configuráveis pelo admin via SystemConfig.
 */
@Injectable()
export class HolidayService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsGateway,
    private notificationsSender: NotificationsSenderService,
  ) {}

  // ============================================================
  // LISTA DE FERIADOS NACIONAIS FIXOS — BRASIL
  // ============================================================
  private readonly NATIONAL_HOLIDAYS: Array<{ month: number; day: number; name: string }> = [
    { month: 1,  day: 1,  name: 'Confraternização Universal (Ano Novo)' },
    { month: 4,  day: 21, name: 'Tiradentes' },
    { month: 5,  day: 1,  name: 'Dia do Trabalho' },
    { month: 9,  day: 7,  name: 'Independência do Brasil' },
    { month: 10, day: 12, name: 'Nossa Senhora Aparecida' },
    { month: 11, day: 2,  name: 'Finados' },
    { month: 11, day: 15, name: 'Proclamação da República' },
    { month: 12, day: 25, name: 'Natal' },
  ];

  /**
   * Verifica se uma data é feriado nacional
   */
  isNationalHoliday(date: Date): boolean {
    return this.NATIONAL_HOLIDAYS.some(
      h => h.month === date.getMonth() + 1 && h.day === date.getDate()
    );
  }

  /**
   * Verifica se uma data é dia útil (segunda a sexta, não feriado nacional)
   */
  isWorkday(date: Date): boolean {
    const dayOfWeek = date.getDay(); // 0=Dom, 6=Sáb
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    if (this.isNationalHoliday(date)) return false;
    return true;
  }

  /**
   * Retorna o próximo dia útil a partir de uma data (exclusive)
   */
  nextWorkday(date: Date): Date {
    const next = new Date(date);
    do {
      next.setDate(next.getDate() + 1);
    } while (!this.isWorkday(next));
    return next;
  }

  /**
   * IDOR: STUDENT só lê feriados da própria turma; TEACHER só registra/lê onde lecciona.
   */
  private async ensureHolidayClassAccess(classId: string, userId: string, role: string, intent: 'read' | 'write'): Promise<void> {
    if (['ADMIN', 'COORDINATOR'].includes(role)) return;

    if (role === 'TEACHER') {
      const t = await this.prisma.teacher.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!t?.id) throw new ForbiddenException('Professor não encontrado.');
      const link = await this.prisma.classTeacher.findFirst({
        where: { classId, teacherId: t.id },
      });
      if (!link) {
        throw new ForbiddenException('Não pode registar nem consultar feriados desta turma.');
      }
      return;
    }

    if (role === 'STUDENT') {
      if (intent === 'write') {
        throw new ForbiddenException('Alunos apenas consultam feriados da própria turma.');
      }
      const st = await this.prisma.student.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!st?.id) throw new ForbiddenException('Aluno não encontrado.');
      const enr = await this.prisma.enrollment.findFirst({
        where: {
          classId,
          studentId: st.id,
          status: { in: ['APPROVED', 'ENROLLED', 'DOCUMENT_PENDING'] },
        },
      });
      if (!enr) {
        throw new ForbiddenException('Turma não pertence ao seu percurso de matrículas.');
      }
      return;
    }

    throw new ForbiddenException('Perfil não autorizado para feriados de turma.');
  }

  private isoDayUtc(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  /** UX-16 — professores (turma) + alunos matriculados quando `endDate` muda. */
  private async notifyStakeholdersEndDateShift(
    classId: string,
    oldEnd: Date,
    newEnd: Date,
  ): Promise<void> {
    if (oldEnd.getTime() === newEnd.getTime()) return;

    const klass = await this.prisma.class.findUnique({
      where: { id: classId },
      select: {
        classIdentifier: true,
        course: { select: { name: true } },
      },
    });
    if (!klass?.course?.name) return;

    const label = `${klass.course.name} (${klass.classIdentifier})`;
    const prevStr = this.isoDayUtc(oldEnd);
    const nextStr = this.isoDayUtc(newEnd);

    const [cts, ens] = await Promise.all([
      this.prisma.classTeacher.findMany({
        where: { classId },
        select: { teacher: { select: { userId: true } } },
      }),
      this.prisma.enrollment.findMany({
        where: {
          classId,
          status: { in: ['APPROVED', 'ENROLLED'] },
        },
        select: { student: { select: { userId: true } } },
      }),
    ]);

    const teacherIds = [...new Set(cts.map(c => c.teacher.userId))];
    const studentIds = [...new Set(ens.map(e => e.student.userId))];
    const seen = new Set<string>();

    const notifyOne = async (userId: string, link: string) => {
      if (seen.has(userId)) return;
      seen.add(userId);
      try {
        const notificationId = await this.notificationsSender
          .classEndDateChanged(userId, label, prevStr, nextStr, link)
          .catch(() => undefined as string | undefined);

        this.notifications.notifyUser(userId, 'turma_termino_alterado', {
          classId,
          previousEndDate: prevStr,
          newEndDate: nextStr,
          courseLabel: label,
          timestamp: new Date().toISOString(),
          ...(notificationId ? { notificationId } : {}),
        });
      } catch {
        /* WS / persistência não bloqueiam feriado */
      }
    };

    for (const uid of teacherIds) {
      await notifyOne(uid, `/teacher/frequencia/${classId}`);
    }
    for (const uid of studentIds) {
      await notifyOne(uid, `/student/classes/${classId}`);
    }
  }

  /**
   * Registra um feriado/imprevisto em uma turma e recalcula a data de término.
   *
   * REQ-08: Ao registrar um dia não-aula, o sistema empurra automaticamente
   * a data de término e todos os dias subsequentes por 1 dia útil.
   */
  async registerClassHoliday(
    classId: string,
    date: string,
    reason: string,
    registeredBy: string,
    registrarRole: string,
  ) {
    const classEntity = await this.prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classEntity) {
      throw new NotFoundException(`Turma ${classId} não encontrada`);
    }

    await this.ensureHolidayClassAccess(classId, registeredBy, registrarRole, 'write');

    const holidayDate = new Date(date);
    holidayDate.setUTCHours(12, 0, 0, 0); // normalizar para meio-dia UTC

    // Verificar se já existe feriado naquela data para esta turma
    const existing = await this.prisma.classHoliday.findFirst({
      where: { classId, date: holidayDate, active: true },
    });

    if (existing) {
      throw new BadRequestException(`Já existe um registro de dia não-aula em ${date} para esta turma`);
    }

    const endSnapshot = new Date(classEntity.endDate);

    // Registrar o feriado/imprevisto (UX-15: guardar endDate antes do empurrão)
    const holiday = await this.prisma.classHoliday.create({
      data: {
        classId,
        date: holidayDate,
        reason,
        registeredBy,
        endDateBeforePush: endSnapshot,
      },
    });

    // Recalcular a data de término: empurrar 1 dia útil para frente
    const newEndDate = this.nextWorkday(classEntity.endDate);

    await this.prisma.class.update({
      where: { id: classId },
      data: { endDate: newEndDate },
    });

    await this.notifyStakeholdersEndDateShift(classId, classEntity.endDate, newEndDate);

    return {
      holiday,
      previousEndDate: classEntity.endDate,
      newEndDate,
      message: `Data de término atualizada de ${classEntity.endDate.toISOString().slice(0, 10)} para ${newEndDate.toISOString().slice(0, 10)}`,
    };
  }

  /**
   * Lista todos os feriados/imprevistos de uma turma (ativos)
   */
  async listClassHolidays(classId: string, viewerId: string, viewerRole: string) {
    await this.ensureHolidayClassAccess(classId, viewerId, viewerRole, 'read');

    return this.prisma.classHoliday.findMany({
      where: { classId, active: true },
      orderBy: { date: 'asc' },
    });
  }

  /**
   * Remove (Soft Delete) um feriado registrado — corrige a data de término
   */
  async removeClassHoliday(holidayId: string) {
    const holiday = await this.prisma.classHoliday.findUnique({
      where: { id: holidayId },
      include: { class: true },
    });

    if (!holiday) {
      throw new NotFoundException(`Feriado ${holidayId} não encontrado`);
    }

    const endBeforeRemove = new Date(holiday.class.endDate);

    let restoredEnd: Date;
    if (holiday.endDateBeforePush) {
      restoredEnd = new Date(holiday.endDateBeforePush);
    } else {
      // Linhas antigas sem snapshot — mantém comportamento anterior (retrocesso por dia útil)
      restoredEnd = new Date(holiday.class.endDate);
      restoredEnd.setDate(restoredEnd.getDate() - 1);
      while (!this.isWorkday(restoredEnd)) {
        restoredEnd.setDate(restoredEnd.getDate() - 1);
      }
    }

    // Soft Delete — não deleta fisicamente (02_LIVRO_DE_REGRAS.md §3)
    await this.prisma.classHoliday.update({
      where: { id: holidayId },
      data: { active: false },
    });

    await this.prisma.class.update({
      where: { id: holiday.classId },
      data: { endDate: restoredEnd },
    });

    await this.notifyStakeholdersEndDateShift(holiday.classId, endBeforeRemove, restoredEnd);

    return {
      message: 'Feriado removido e data de término revertida',
      newEndDate: restoredEnd,
    };
  }

  /**
   * Lista feriados nacionais de um ano (para uso no frontend — calendário)
   */
  getNationalHolidays(year: number): Array<{ date: string; name: string }> {
    return this.NATIONAL_HOLIDAYS.map(h => ({
      date: `${year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`,
      name: h.name,
    }));
  }

  /**
   * Feriados estaduais com data fixa para uma UF e ano (calendário / integrações).
   */
  getStateHolidaysForYear(uf: string, year: number): Array<{ date: string; name: string }> {
    return listBrazilStateHolidaysForYear(uf, year);
  }

  /**
   * Registra feriados estaduais automáticos em todas as turmas IN_PROGRESS,
   * usando o estado (`City.state`) da cidade da turma.
   */
  async preloadStateHolidaysForActiveClasses(
    registeredBy: string,
    registrarRole: string,
    yearsInput?: number[],
  ): Promise<{ ok: number; skip: number; classesProcessed: number }> {
    if (!['ADMIN', 'COORDINATOR'].includes(registrarRole)) {
      throw new ForbiddenException('Apenas administrador ou coordenador pode pré-carregar feriados estaduais.');
    }

    const defaultYears = [new Date().getFullYear(), new Date().getFullYear() + 1];
    const rawYears = yearsInput?.length ? yearsInput : defaultYears;
    const years = [...new Set(rawYears)].filter((y) => Number.isInteger(y) && y >= 2000 && y <= 2100).sort((a, b) => a - b);
    if (!years.length) {
      throw new BadRequestException('Informe pelo menos um ano válido (2000–2100).');
    }

    const classes = await this.prisma.class.findMany({
      where: { status: 'IN_PROGRESS' },
      include: { city: true },
    });

    let ok = 0;
    let skip = 0;

    for (const cls of classes) {
      const uf = normalizeBrazilUf(cls.city?.state);
      if (!uf) continue;

      const holidaysFlat: Array<{ date: string; name: string }> = [];
      for (const y of years) {
        holidaysFlat.push(...listBrazilStateHolidaysForYear(uf, y));
      }
      if (!holidaysFlat.length) continue;

      for (const h of holidaysFlat) {
        try {
          await this.registerClassHoliday(
            cls.id,
            h.date,
            `[LOCAL] 📍 Feriado estadual (${uf}) — ${h.name}`,
            registeredBy,
            registrarRole,
          );
          ok += 1;
        } catch {
          skip += 1;
        }
      }
    }

    return { ok, skip, classesProcessed: classes.length };
  }
}
