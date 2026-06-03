import api from './client';

export type RegisterAcaoHolidaysPayload = {
  dates: string[];
  reason: string;
  turmaId?: string;
};

export type RegisterAcaoHolidaysResult = {
  acaoId: string;
  classId: string;
  previousEndDate?: string;
  newEndDate?: string;
  calendarDaysExtended?: number;
  teachingDaysTarget?: number;
  paymentSuggestionUnchanged?: number;
  formulaLabel?: string;
  message?: string;
};

export const holidayApi = {
  registerAcaoHolidays: (acaoId: string, data: RegisterAcaoHolidaysPayload) =>
    api.post<RegisterAcaoHolidaysResult>(`/holiday/acao/${acaoId}`, data).then((r) => r.data),
};
