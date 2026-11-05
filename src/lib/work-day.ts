const SAO_PAULO = "America/Sao_Paulo";

/** Início do dia de trabalho: 08h de Brasília. */
export const WORK_DAY_HOUR = 8;

export function calendarDay(date: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addDays(day: string, days: number) {
  const date = new Date(`${day}T12:00:00-03:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return calendarDay(date);
}

function hourInSaoPaulo(date: Date) {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: SAO_PAULO,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(date),
  );
}

/** Dia de trabalho atual: antes das 08h ainda é o dia anterior. */
export function currentWorkDay(now: Date = new Date()) {
  const day = calendarDay(now);
  return hourInSaoPaulo(now) < WORK_DAY_HOUR ? addDays(day, -1) : day;
}

/**
 * Recorte [from 08:00, to+1 08:00). Uma ocorrência que atravessa as 08h
 * aparece no dia em que começou e no dia seguinte.
 */
export function workDayRange(from?: string, to?: string) {
  const today = currentWorkDay();
  const startDay = from || today;
  const endDay = to || startDay;
  return {
    from: new Date(`${startDay}T08:00:00.000-03:00`),
    to: new Date(`${addDays(endDay, 1)}T08:00:00.000-03:00`),
    fromDay: startDay,
    toDay: endDay,
  };
}

export function episodeOverlapsRange(
  startedAt: Date,
  effectiveEnd: Date,
  rangeFrom: Date,
  rangeTo: Date,
) {
  return startedAt < rangeTo && effectiveEnd > rangeFrom;
}
