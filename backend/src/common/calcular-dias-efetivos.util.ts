/**
 * calcular-dias-efetivos.util.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Utilitário centralizado para contar dias de trabalho/aula considerando a
 * ClassWeekendPolicy da turma.
 *
 * Valores do enum ClassWeekendPolicy (schema.prisma):
 *  - FOLLOW_SCHEDULE   → conta apenas os dias-da-semana que a turma tem aula
 *                        (requer array de dia-da-semana da turma; sem ele
 *                        trata como WEEKDAYS_ONLY — seg-sex)
 *  - WEEKDAYS_ONLY     → seg-sex, excluindo os feriados recebidos
 *  - ALL_WEEKENDS      → todos os dias corridos, excluindo feriados
 *  - SELECT_WEEKENDS   → dias úteis + datas extras (weekendExtraDates)
 */

import { ClassWeekendPolicy } from '@prisma/client';
import {
  countTeachingDaysBetween,
  parseIsoDateOnly,
  toDateStrLocal,
} from './teaching-calendar.util';

/**
 * Conta dias efetivos entre dataInicio e dataFim (ambos inclusivos).
 *
 * @param dataInicio   Data de início (inclusive)
 * @param dataFim      Data de término (inclusive)
 * @param policy       Política de fins de semana da turma vinculada
 * @param scheduleDays Array de dias da semana em que a turma tem aula
 *                     (0=Dom … 6=Sáb). Usado apenas para FOLLOW_SCHEDULE.
 * @param holidays     Array de Dates a excluir (feriados da turma).
 * @param extraWeekendDates Datas extras que contam mesmo sendo sáb/dom
 *                         (apenas para SELECT_WEEKENDS).
 */
export function calcularDiasEfetivos(
    dataInicio: Date,
    dataFim: Date,
    policy: ClassWeekendPolicy = ClassWeekendPolicy.WEEKDAYS_ONLY,
    scheduleDays: number[] = [],
    holidays: Date[] = [],
    extraWeekendDates: Date[] = [],
): number {
    if (dataFim < dataInicio) return 0;

    const holidayStrs = new Set(holidays.map((d) => toDateStrLocal(d)));
    const extraStrs = new Set(extraWeekendDates.map((d) => toDateStrLocal(d)));

    const count = countTeachingDaysBetween(
        parseIsoDateOnly(toDateStrLocal(dataInicio)),
        parseIsoDateOnly(toDateStrLocal(dataFim)),
        {
            weekendPolicy: policy,
            scheduleDays,
            holidayDateKeys: holidayStrs,
            extraWeekendDateKeys: extraStrs,
        },
    );

    return Math.max(1, count);
}
