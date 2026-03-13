import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private prisma: PrismaService) {}

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
  ) {
    // Verificar se a turma existe
    const classEntity = await this.prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classEntity) {
      throw new NotFoundException(`Turma ${classId} não encontrada`);
    }

    const holidayDate = new Date(date);
    holidayDate.setUTCHours(12, 0, 0, 0); // normalizar para meio-dia UTC

    // Verificar se já existe feriado naquela data para esta turma
    const existing = await this.prisma.classHoliday.findFirst({
      where: { classId, date: holidayDate, active: true },
    });

    if (existing) {
      throw new BadRequestException(`Já existe um registro de dia não-aula em ${date} para esta turma`);
    }

    // Registrar o feriado/imprevisto
    const holiday = await this.prisma.classHoliday.create({
      data: {
        classId,
        date: holidayDate,
        reason,
        registeredBy,
      },
    });

    // Recalcular a data de término: empurrar 1 dia útil para frente
    const newEndDate = this.nextWorkday(classEntity.endDate);

    await this.prisma.class.update({
      where: { id: classId },
      data: { endDate: newEndDate },
    });

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
  async listClassHolidays(classId: string) {
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

    // Soft Delete — não deleta fisicamente (02_LIVRO_DE_REGRAS.md §3)
    await this.prisma.classHoliday.update({
      where: { id: holidayId },
      data: { active: false },
    });

    // Reverter a data de término: voltar 1 dia útil
    const previousEndDate = new Date(holiday.class.endDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1);
    while (!this.isWorkday(previousEndDate)) {
      previousEndDate.setDate(previousEndDate.getDate() - 1);
    }

    await this.prisma.class.update({
      where: { id: holiday.classId },
      data: { endDate: previousEndDate },
    });

    return {
      message: 'Feriado removido e data de término revertida',
      newEndDate: previousEndDate,
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
}
