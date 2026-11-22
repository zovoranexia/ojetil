/**
 * Asia/Dili time helpers. Timor-Leste is UTC+09:00 with no daylight saving,
 * so a fixed offset is exact. All timestamps are stored in UTC (timestamptz).
 */
export const APP_TIME_ZONE = "Asia/Dili";
const DILI_OFFSET_HOURS = 9;

/** Build a UTC Date from a Díli wall-clock time (month is 1-based). */
export function diliDateTime(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hour - DILI_OFFSET_HOURS, minute));
}

/** Calendar parts of `date` as seen on a clock in Díli. */
export function diliParts(date: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const shifted = new Date(date.getTime() + DILI_OFFSET_HOURS * 3_600_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

/** The current year in Díli (used for tracking codes such as OJT-2026-0042). */
export function currentDiliYear(now: Date = new Date()): number {
  return diliParts(now).year;
}

/** A Díli wall-clock time `days` from `from`, at the given hour/minute. */
export function diliDaysFromNow(days: number, hour: number, minute = 0, from: Date = new Date()): Date {
  const today = diliParts(from);
  return diliDateTime(today.year, today.month, today.day + days, hour, minute);
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Date → value for <input type="datetime-local"> expressed in Díli time ("2026-12-05T09:00"). */
export function toDiliLocalInput(date: Date | null | undefined): string {
  if (!date) return "";
  const p = diliParts(date);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`;
}

/** Inverse of toDiliLocalInput: interprets the wall-clock value as Díli time. Null if malformed. */
export function fromDiliLocalInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
  const date = diliDateTime(y, mo, d, h, mi);
  return toDiliLocalInput(date) === value ? date : null; // rejects 2026-02-30T10:00 etc.
}
