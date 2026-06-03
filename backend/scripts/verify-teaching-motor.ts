/**
 * Validação do motor letivo (horas → N encontros → fim → pagamento).
 * Uso: npm run motor:verify
 */
import { ClassWeekendPolicy } from '@prisma/client';
import { hoursBetweenTimes, auditCourseWorkload } from '../src/common/course-workload-audit.util';
import { resolveTeachingDaysTarget } from '../src/common/teaching-days-target.util';
import { startOfUTCDay } from '../src/common/class-teaching-days.util';
import {
  calcularDataFimPorDiasLetivos,
  calendarDateKey,
  countTeachingDaysBetween,
  isTeachingDay,
  parseIsoDateOnly,
  toDateStrLocal,
  type TeachingDayParams,
} from '../src/common/teaching-calendar.util';
import { suggestPaymentDaysFromWorkload } from '../src/common/payment-days-suggestion.util';

let passed = 0;
let failed = 0;

function assert(cond: boolean, name: string, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  OK  ${name}`);
  } else {
    failed++;
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function weekdaysParams(holidayKeys: string[] = []): TeachingDayParams {
  return {
    weekendPolicy: ClassWeekendPolicy.WEEKDAYS_ONLY,
    scheduleDays: [1, 2, 3, 4, 5],
    holidayDateKeys: new Set(holidayKeys),
    extraWeekendDateKeys: new Set(),
  };
}

console.log('\n=== Motor letivo — verify ===\n');

// T1
const t1 = resolveTeachingDaysTarget({
  workloadHours: 60,
  startTime: '07:00',
  endTime: '12:00',
});
assert(t1.hoursPerSession === 5, 'T1 hoursPerSession=5', `got ${t1.hoursPerSession}`);
assert(t1.target === 12, 'T1 N=12 (60÷5)', `got ${t1.target}`);

// T1b
const t1b = resolveTeachingDaysTarget({
  workloadHours: 60,
  startTime: '06:00',
  endTime: '12:00',
});
assert(t1b.hoursPerSession === 6, 'T1b hoursPerSession=6');
assert(t1b.target === 10, 'T1b N=10 (60÷6)');

// T2
const startT2 = parseIsoDateOnly('2026-05-19');
const n12 = 12;
const r2 = calcularDataFimPorDiasLetivos(startT2, n12, weekdaysParams());
const letivosT2 = countTeachingDaysBetween(startT2, r2.endDate, weekdaysParams());
assert(letivosT2 === 12, 'T2 endDate has 12 teaching days', `got ${letivosT2}`);

// T3
const midHoliday = toDateStrLocal(new Date('2026-05-26T12:00:00'));
const r3 = calcularDataFimPorDiasLetivos(startT2, n12, weekdaysParams([midHoliday]));
assert(r3.endDate.getTime() > r2.endDate.getTime(), 'T3 holiday extends endDate');
const letivosT3 = countTeachingDaysBetween(startT2, r3.endDate, weekdaysParams([midHoliday]));
assert(letivosT3 === 12, 'T3 still 12 teaching days in range', `got ${letivosT3}`);

// T4
const feriado = '2026-06-01';
const startT4 = parseIsoDateOnly('2026-05-25');
const endT4 = parseIsoDateOnly('2026-06-05');
const p4 = weekdaysParams([feriado]);
const c4 = countTeachingDaysBetween(startT4, endT4, p4);
const c4no = countTeachingDaysBetween(startT4, endT4, weekdaysParams());
assert(c4 < c4no, 'T4 holiday excluded from count', `${c4} vs ${c4no}`);

// T5
const wl5 = auditCourseWorkload({
  workloadHours: 60,
  startDate: startT2,
  endDate: r2.endDate,
  startTime: '07:00',
  endTime: '12:00',
  teachingParams: weekdaysParams(),
});
const pay5 = suggestPaymentDaysFromWorkload(14, wl5, 12);
assert(pay5.suggestedDiasPagamento === 12, 'T5 payment cap min(14,12)=12', `got ${pay5.suggestedDiasPagamento}`);

// T6
const t6 = resolveTeachingDaysTarget({
  workloadHours: 60,
  startTime: '07:00',
  endTime: '12:00',
  override: 8,
});
assert(t6.source === 'override' && t6.target === 8, 'T6 override N=8');

// T7
const shortEnd = parseIsoDateOnly('2026-05-22');
const wl7 = auditCourseWorkload({
  workloadHours: 60,
  startDate: startT2,
  endDate: shortEnd,
  startTime: '07:00',
  endTime: '12:00',
  teachingParams: weekdaysParams(),
});
assert(wl7?.status === 'short', 'T7 workload short', wl7?.status);

// T8 — feriado do catálogo (Date UTC meia-noite) exclui o dia civil correto (ex. Corpus Christi MA)
const corpusDb = startOfUTCDay(new Date('2026-06-04T00:00:00.000Z'));
const corpusKey = calendarDateKey(corpusDb);
assert(corpusKey === '2026-06-04', 'T8 corpus key 2026-06-04', corpusKey);
const startMay29 = parseIsoDateOnly('2026-05-29');
const p8 = weekdaysParams([corpusKey]);
assert(!isTeachingDay(parseIsoDateOnly('2026-06-04'), p8), 'T8 04/06 não é letivo com feriado');
const r8no = calcularDataFimPorDiasLetivos(startMay29, 20, weekdaysParams());
const r8 = calcularDataFimPorDiasLetivos(startMay29, 20, p8);
assert(r8.endDate.getTime() > r8no.endDate.getTime(), 'T8 feriado alonga término (20 encontros)');
assert(countTeachingDaysBetween(startMay29, r8.endDate, p8) === 20, 'T8 ainda 20 letivos no intervalo');

console.log(`\n--- ${passed} passed, ${failed} failed ---\n`);
if (failed > 0) process.exit(1);
