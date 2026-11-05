const VIGENCIA_TIME_ZONE = "America/Sao_Paulo";

function pad(value: string) {
  return value.padStart(2, "0");
}

export function saoPauloDateParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: VIGENCIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: read("year"),
    month: pad(read("month")),
    day: pad(read("day")),
  };
}

export function toDateInputValue(value?: string | Date | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const { year, month, day } = saoPauloDateParts(date);
  return `${year}-${month}-${day}`;
}

function dayOnVigenciaCalendar(value: unknown) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00.000-03:00`);
}

export function endOfVigenciaDay(value: Date) {
  const { year, month, day } = saoPauloDateParts(value);
  return new Date(`${year}-${month}-${day}T23:59:59.999-03:00`);
}

export function startOfVigenciaDay(value: Date) {
  const { year, month, day } = saoPauloDateParts(value);
  return new Date(`${year}-${month}-${day}T00:00:00.000-03:00`);
}

export function snapVigenciaEnd(value: unknown) {
  if (value === "" || value == null) return undefined;
  const day = dayOnVigenciaCalendar(value);
  return day ? endOfVigenciaDay(day) : value;
}

export function snapVigenciaStart(value: unknown) {
  if (value === "" || value == null) return undefined;
  const day = dayOnVigenciaCalendar(value);
  return day ? startOfVigenciaDay(day) : value;
}

export function vigenciaEnded(value: string | Date, now = new Date()) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return false;
  return endOfVigenciaDay(date).getTime() <= now.getTime();
}
