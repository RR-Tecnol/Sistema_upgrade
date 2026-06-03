import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsSenderService } from '../notifications/notifications-sender.service';
import { listBrazilStateHolidaysForYear, normalizeBrazilUf, BRAZIL_STATE_FIXED_HOLIDAYS } from './brazil-state-holidays';
import { filterNationalHolidaysByYears } from './brazil-national-holidays';
import type { PreloadNationalCatalogDto } from './dto/preload-national-catalog.dto';
import type { PreloadStateHolidaysDto } from './dto/preload-state-holidays.dto';
import { CoursesService } from '../courses/courses.service';
import { recalculateClassEndDateMotor } from '../common/class-teaching-end-date.helper';
import { syncTurmaLinkedToAcao } from '../common/academic-ecosystem-sync.util';
import { paymentSuggestionAfterCalendarExtension } from '../common/payment-days-suggestion.util';
import type { RegisterAcaoHolidaysDto } from './dto/register-acao-holidays.dto';

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
    private coursesService: CoursesService,
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

  private async stateConfigForClass(classId: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        course: {
          select: {
            id: true,
            durationDaysMA: true,
            durationDaysPI: true,
            availableInMA: true,
            availableInPI: true,
            workloadHours: true,
          },
        },
      },
    });
    if (!cls?.course) return null;
    return this.coursesService.getCourseStateConfig(cls.course);
  }

  private async syncLinkedAcoesForClass(classId: string) {
    const links = await this.prisma.acaoTurma.findMany({
      where: { turmaId: classId },
      select: { acaoId: true },
    });
    for (const link of links) {
      await syncTurmaLinkedToAcao(this.prisma, link.acaoId, classId);
    }
  }

  /**
   * Registra dia sem aula e recalcula término com motor N (horas÷turno), mantendo N encontros letivos.
   */
  async registerClassHoliday(
    classId: string,
    date: string,
    reason: string,
    registeredBy: string,
    registrarRole: string,
    acaoId?: string,
  ) {
    const classEntity = await this.prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classEntity) {
      throw new NotFoundException(`Turma ${classId} não encontrada`);
    }

    await this.ensureHolidayClassAccess(classId, registeredBy, registrarRole, 'write');

    const holidayDate = new Date(date);
    holidayDate.setUTCHours(12, 0, 0, 0);

    const existing = await this.prisma.classHoliday.findFirst({
      where: { classId, date: holidayDate, active: true },
    });

    if (existing) {
      throw new BadRequestException(`Já existe um registro de dia não-aula em ${date} para esta turma`);
    }

    const endSnapshot = new Date(classEntity.endDate);

    const holiday = await this.prisma.classHoliday.create({
      data: {
        classId,
        acaoId: acaoId ?? null,
        date: holidayDate,
        reason,
        registeredBy,
        endDateBeforePush: endSnapshot,
      },
    });

    const stateConfig = await this.stateConfigForClass(classId);
    const motor = await recalculateClassEndDateMotor(this.prisma, classId, stateConfig);
    await this.syncLinkedAcoesForClass(classId);

    await this.notifyStakeholdersEndDateShift(classId, motor.previousEndDate, motor.newEndDate);

    const calendarDaysExtended = Math.max(
      0,
      Math.floor(
        (motor.newEndDate.getTime() - motor.previousEndDate.getTime()) / 86400000,
      ),
    );

    const payment = paymentSuggestionAfterCalendarExtension(motor.teachingDaysTarget, motor.teachingDaysTarget);

    return {
      holiday,
      previousEndDate: motor.previousEndDate,
      newEndDate: motor.newEndDate,
      calendarDaysExtended,
      teachingDaysTarget: motor.teachingDaysTarget,
      paymentSuggestionUnchanged: payment.suggestedDiasPagamento,
      formulaLabel: motor.formulaLabel,
      message:
        `Ocorrência em ${date} — calendário ${calendarDaysExtended > 0 ? `+${calendarDaysExtended} dia(s) ` : ''}` +
        `para manter ${motor.teachingDaysTarget} encontros letivos (${motor.formulaLabel}). ` +
        `Diárias sugeridas: ${payment.suggestedDiasPagamento} (inalteradas).`,
    };
  }

  /** Registra ocorrências no período de curso (turma vinculada). */
  async registerAcaoHolidays(
    acaoId: string,
    dto: RegisterAcaoHolidaysDto,
    registeredBy: string,
    registrarRole: string,
  ) {
    const acao = await this.prisma.acao.findUnique({
      where: { id: acaoId },
      include: { turmas: { select: { turmaId: true } } },
    });
    if (!acao) throw new NotFoundException('Período não encontrado');
    if (!acao.turmas.length) {
      throw new BadRequestException('Vincule uma turma ao período antes de registrar ocorrências.');
    }

    let classId = dto.turmaId;
    if (classId) {
      const linked = acao.turmas.some((t) => t.turmaId === classId);
      if (!linked) throw new BadRequestException('Turma não está vinculada a este período.');
    } else {
      if (acao.turmas.length > 1) {
        throw new BadRequestException('Informe turmaId — o período tem mais de uma turma vinculada.');
      }
      classId = acao.turmas[0].turmaId;
    }

    const results: Array<Awaited<ReturnType<HolidayService['registerClassHoliday']>>> = [];
    let lastResult: (typeof results)[number] | null = null;
    for (const d of dto.dates) {
      lastResult = await this.registerClassHoliday(
        classId!,
        d,
        dto.reason,
        registeredBy,
        registrarRole,
        acaoId,
      );
      results.push(lastResult);
    }

    return {
      acaoId,
      classId,
      holidays: results.map((r) => r.holiday),
      previousEndDate: results[0]?.previousEndDate,
      newEndDate: lastResult?.newEndDate,
      calendarDaysExtended: lastResult?.calendarDaysExtended ?? 0,
      teachingDaysTarget: lastResult?.teachingDaysTarget,
      paymentSuggestionUnchanged: lastResult?.paymentSuggestionUnchanged,
      formulaLabel: lastResult?.formulaLabel,
      message: lastResult?.message,
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

    await this.prisma.classHoliday.update({
      where: { id: holidayId },
      data: { active: false },
    });

    const stateConfig = await this.stateConfigForClass(holiday.classId);
    const motor = await recalculateClassEndDateMotor(this.prisma, holiday.classId, stateConfig);
    await this.syncLinkedAcoesForClass(holiday.classId);

    await this.notifyStakeholdersEndDateShift(
      holiday.classId,
      endBeforeRemove,
      motor.newEndDate,
    );

    return {
      message: 'Ocorrência removida; data de término recalculada pelo motor letivo',
      newEndDate: motor.newEndDate,
      teachingDaysTarget: motor.teachingDaysTarget,
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
  private assertCatalogAdmin(registrarRole: string): void {
    if (!['ADMIN', 'COORDINATOR'].includes(registrarRole)) {
      throw new ForbiddenException('Apenas administrador ou coordenador pode gerir o catálogo de feriados.');
    }
  }

  private resolveYears(yearsInput?: number[]): number[] {
    const defaultYears = [new Date().getFullYear(), new Date().getFullYear() + 1];
    const rawYears = yearsInput?.length ? yearsInput : defaultYears;
    const years = [...new Set(rawYears)]
      .filter((y) => Number.isInteger(y) && y >= 2000 && y <= 2100)
      .sort((a, b) => a - b);
    if (!years.length) {
      throw new BadRequestException('Informe pelo menos um ano válido (2000–2100).');
    }
    return years;
  }

  private holidayDateUtc(iso: string): Date {
    const d = new Date(iso);
    d.setUTCHours(12, 0, 0, 0);
    return d;
  }

  /** BUG-15: catálogo global — lista feriados do sistema (sem turma). */
  async listCatalog(_viewerId: string, viewerRole: string) {
    this.assertCatalogAdmin(viewerRole);
    const rows = await this.prisma.globalHoliday.findMany({
      where: { active: true },
      orderBy: [{ date: 'asc' }, { scope: 'asc' }, { stateCode: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      reason: r.reason,
      scope: r.scope,
      stateCode: r.stateCode || null,
      source: 'catalog' as const,
      active: r.active,
      createdAt: r.createdAt,
    }));
  }

  async removeCatalogHoliday(holidayId: string, viewerRole: string) {
    this.assertCatalogAdmin(viewerRole);
    const row = await this.prisma.globalHoliday.findUnique({ where: { id: holidayId } });
    if (!row) throw new NotFoundException(`Feriado de catálogo ${holidayId} não encontrado`);
    await this.prisma.globalHoliday.update({
      where: { id: holidayId },
      data: { active: false },
    });
    return { message: 'Feriado removido do catálogo global' };
  }

  private async upsertCatalogHoliday(
    registeredBy: string,
    scope: 'NATIONAL' | 'STATE',
    dateIso: string,
    reason: string,
    stateCode = '',
  ): Promise<'ok' | 'skip'> {
    const date = this.holidayDateUtc(dateIso);
    const uf = scope === 'STATE' ? (normalizeBrazilUf(stateCode) || '') : '';
    try {
      await this.prisma.globalHoliday.upsert({
        where: {
          date_scope_stateCode: {
            date,
            scope,
            stateCode: uf,
          },
        },
        create: {
          date,
          reason,
          scope,
          stateCode: uf,
          registeredBy,
        },
        update: {
          reason,
          active: true,
          registeredBy,
        },
      });
      return 'ok';
    } catch {
      return 'skip';
    }
  }

  /**
   * BUG-15: pré-carga nacional no catálogo global (não exige turma IN_PROGRESS).
   */
  async preloadNationalCatalog(
    registeredBy: string,
    registrarRole: string,
    dto?: PreloadNationalCatalogDto,
  ): Promise<{ ok: number; skip: number; applyToActiveClasses: boolean; classesProcessed: number }> {
    this.assertCatalogAdmin(registrarRole);
    const years = this.resolveYears(dto?.years);
    const entries = filterNationalHolidaysByYears(years);

    let ok = 0;
    let skip = 0;
    for (const h of entries) {
      const r = await this.upsertCatalogHoliday(registeredBy, 'NATIONAL', h.date, h.reason);
      if (r === 'ok') ok++;
      else skip++;
    }

    let classesProcessed = 0;
    if (dto?.applyToActiveClasses) {
      const applied = await this.applyNationalCatalogToActiveClasses(registeredBy, registrarRole, entries);
      ok += applied.ok;
      skip += applied.skip;
      classesProcessed = applied.classesProcessed;
    }

    return {
      ok,
      skip,
      applyToActiveClasses: !!dto?.applyToActiveClasses,
      classesProcessed,
    };
  }

  private async applyNationalCatalogToActiveClasses(
    registeredBy: string,
    registrarRole: string,
    entries: Array<{ date: string; reason: string }>,
  ): Promise<{ ok: number; skip: number; classesProcessed: number }> {
    const classes = await this.prisma.class.findMany({
      where: { status: 'IN_PROGRESS' },
      select: { id: true },
    });
    let ok = 0;
    let skip = 0;
    for (const cls of classes) {
      for (const h of entries) {
        try {
          await this.registerClassHoliday(cls.id, h.date, h.reason, registeredBy, registrarRole);
          ok++;
        } catch {
          skip++;
        }
      }
    }
    return { ok, skip, classesProcessed: classes.length };
  }

  /**
   * BUG-15: pré-carga estadual no catálogo (UF opcional; não exige turma).
   */
  async preloadStateCatalog(
    registeredBy: string,
    registrarRole: string,
    dto?: PreloadStateHolidaysDto,
  ): Promise<{ ok: number; skip: number; statesProcessed: number; applyToActiveClasses: boolean; classesProcessed: number }> {
    this.assertCatalogAdmin(registrarRole);
    const years = this.resolveYears(dto?.years);

    const ufsRaw = dto?.states?.length
      ? dto.states.map((s) => normalizeBrazilUf(s)).filter((u): u is string => !!u)
      : Object.keys(BRAZIL_STATE_FIXED_HOLIDAYS);
    const ufs = [...new Set(ufsRaw)];

    let ok = 0;
    let skip = 0;
    const holidaysFlat: Array<{ date: string; name: string; uf: string }> = [];

    for (const uf of ufs) {
      for (const y of years) {
        for (const h of listBrazilStateHolidaysForYear(uf, y)) {
          holidaysFlat.push({ ...h, uf });
        }
      }
    }

    for (const h of holidaysFlat) {
      const reason = `[LOCAL] 📍 Feriado estadual (${h.uf}) — ${h.name}`;
      const r = await this.upsertCatalogHoliday(registeredBy, 'STATE', h.date, reason, h.uf);
      if (r === 'ok') ok++;
      else skip++;
    }

    let classesProcessed = 0;
    if (dto?.applyToActiveClasses) {
      const applied = await this.preloadStateHolidaysForActiveClasses(registeredBy, registrarRole, {
        years: dto.years,
        states: dto.states,
        applyToActiveClasses: true,
      });
      ok += applied.ok;
      skip += applied.skip;
      classesProcessed = applied.classesProcessed;
    }

    return {
      ok,
      skip,
      statesProcessed: ufs.length,
      applyToActiveClasses: !!dto?.applyToActiveClasses,
      classesProcessed,
    };
  }

  /**
   * Registra feriados estaduais nas turmas IN_PROGRESS (opcional após catálogo).
   */
  async preloadStateHolidaysForActiveClasses(
    registeredBy: string,
    registrarRole: string,
    dto?: PreloadStateHolidaysDto,
  ): Promise<{ ok: number; skip: number; classesProcessed: number }> {
    this.assertCatalogAdmin(registrarRole);

    const years = this.resolveYears(dto?.years);

    const classes = await this.prisma.class.findMany({
      where: { status: 'IN_PROGRESS' },
      include: { city: true },
    });

    let ok = 0;
    let skip = 0;

    const filterUfs = dto?.states?.length
      ? new Set(
          dto.states.map((s) => normalizeBrazilUf(s)).filter((u): u is string => !!u),
        )
      : null;

    for (const cls of classes) {
      const uf = normalizeBrazilUf(cls.city?.state);
      if (!uf) continue;
      if (filterUfs && !filterUfs.has(uf)) continue;

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
